import { Injectable } from '@angular/core';
import { collection, doc, Firestore, runTransaction, serverTimestamp, Timestamp, WriteBatch } from 'firebase/firestore';

/** Isolated legacy row shape until parent and child product documents are normalized. */
export type DailyReportDraftRow = any;

/** Prepares and queues daily-report transaction data without committing the batch. */
@Injectable({ providedIn: 'root' })
export class DailyReportTransactionService {
  /** Queues both cache-invalidation markers written after a daily report save. */
  queueUpdateMarkers(batch: WriteBatch, database: Firestore, branchId: string, typeId: string, updateId: string, reportDate: Timestamp | undefined): void {
    batch.update(doc(database, 'dailyReportsUpdates', updateId), { updatedAt: Timestamp.now() });
    batch.set(doc(database, 'latestReportUpdate', `${branchId}_${typeId}`), {
      branchId,
      typeId,
      updatedAt: reportDate
    }, { merge: true });
  }

  /**
   * Queues the report-date marker and report rows in the same save batch.
   * 1. Use a stable marker ID so deadline enforcement can recheck a concurrent save.
   * 2. Queue all inventory rows for the selected report date.
   */
  queueDailyReports(batch: WriteBatch, database: Firestore, branchId: string, typeId: string, date: Timestamp | undefined, rows: DailyReportDraftRow[]): void {
    // STEP 1: Saudi report dates use UTC+3 throughout the existing branch workflow.
    const reportDate = new Date((date?.toMillis() ?? Date.now()) + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    batch.set(doc(database, 'dailyReportsDates', `${branchId}_${typeId}_${reportDate}`),
      { branchId, typeId, date, createdAt: serverTimestamp() });
    // STEP 2: The report marker exists only if every row saves successfully.
    rows.forEach(item => {
      const { productName, ...report } = item;
      batch.set(doc(collection(database, 'dailyReports')), { ...report, branchId, typeId, date, createdAt: Timestamp.now() });
    });
  }

  /**
   * Consume a daily-inventory attempt after its report was saved successfully.
   * 1. Verify the active or just-expired attempt and its source ban.
   * 2. Confirm the server-stored report predates the attempt expiry.
   * 3. Mark the attempt used and clear only the matching restored ban.
   */
  async consumeDailyInventoryAttempt(database: Firestore, branchId: string, reportDate: string): Promise<void> {
    // STEP 1: Other ban types and cancelled attempts must stay untouched.
    const attemptRef = doc(database, 'banAttempts', branchId);
    const branchRef = doc(database, 'branches', branchId);
    const reportRef = doc(database, 'dailyReportsDates', `${branchId}_5_${reportDate}`);
    await runTransaction(database, async transaction => {
      const [attempt, branch, report] = await Promise.all([
        transaction.get(attemptRef), transaction.get(branchRef), transaction.get(reportRef)
      ]);
      const data = attempt.data();
      if (!['active', 'expired'].includes(data?.['status']) || !report.exists()) return;
      const sourceBanId = data?.['sourceBanId'];
      if (typeof sourceBanId !== 'string' || !sourceBanId) return;
      const source = await transaction.get(doc(database, 'bansHistory', sourceBanId));
      if (source.data()?.['banItemId'] !== 'daily_inventory' ||
          !String(source.data()?.['message'] ?? '').includes(`بتاريخ ${reportDate}`)) return;
      // STEP 2: A report submitted after the granted expiry cannot release the branch.
      const savedAt = report.data()['createdAt']?.toMillis?.();
      const expiresAt = data?.['expiresAt']?.toMillis?.();
      if (!savedAt || !expiresAt || savedAt > expiresAt) return;
      // STEP 3: A concurrent expiry may already have restored the same ban.
      transaction.update(attemptRef, { status: 'used', closedAt: serverTimestamp() });
      if (branch.data()?.['ban'] === source.data()?.['message']) transaction.update(branchRef, { ban: null });
    });
  }

  /** Separates opening-stock rows into creates and updates for the save batch. */
  prepareOpeningStockChanges(rows: DailyReportDraftRow[], branchId: string, typeId: string): { toCreate: DailyReportDraftRow[]; toUpdate: DailyReportDraftRow[] } {
    const toCreate: DailyReportDraftRow[] = [];
    const toUpdate: DailyReportDraftRow[] = [];
    rows.forEach(item => {
      if (item.openingStockId === -1) {
        toCreate.push({ branchId, productId: item.productId, openingStockQnt: item.closeStock, typeId, createdAt: Timestamp.now() });
      } else {
        toUpdate.push(item);
      }
    });
    return { toCreate, toUpdate };
  }

  flattenForSave(groups: DailyReportDraftRow[]): DailyReportDraftRow[] {
    const rows: DailyReportDraftRow[] = [];
    groups.forEach(group => {
      if (group.products?.length) {
        rows.push(...group.products);
        delete group.products;
      }
      rows.push(group);
    });
    return rows.map(row => {
      Object.keys(row).forEach(key => {
        if (row[key] === undefined || row[key] === null) delete row[key];
      });
      return row;
    });
  }

  queueMonthlySummaries(batch: WriteBatch, database: Firestore, branchId: string, rows: DailyReportDraftRow[], date: Date): void {
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const day = String(date.getDate()).padStart(2, '0');
    rows.forEach(item => batch.set(doc(database, 'product_monthly_summaries', `${branchId}_${month}_${item.productId}`), {
      branchId, productId: item.productId, month,
      [`days.${day}`]: { openingStock: Number(item.openingStockQnt || 0), received: Number(item.recieved || 0), add: Number(item.add || 0), sales: Number(item.sales || 0), staffMeal: Number(item.staffMeal || 0), transfer: Number(item.transfer || 0), directTransfer: Number(item.directTransfer || item.directTransfere || 0), damaged: Number(item.dameged || 0), canceled: Number(item.canceled || 0), freeIncrease: Number(item.freeIncrease || 0), closeStock: Number(item.closeStock || 0) },
      updatedAt: Timestamp.now()
    }, { merge: true }));
  }
}
