import { Injectable } from '@angular/core';
import { collection, doc, Firestore, Timestamp, WriteBatch } from 'firebase/firestore';

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

  /** Queues the report-date marker and all report rows in the supplied batch. */
  queueDailyReports(batch: WriteBatch, database: Firestore, branchId: string, typeId: string, date: Timestamp | undefined, rows: DailyReportDraftRow[]): void {
    batch.set(doc(collection(database, 'dailyReportsDates')), { branchId, typeId, date, createdAt: Timestamp.now() });
    rows.forEach(item => {
      const { productName, ...report } = item;
      batch.set(doc(collection(database, 'dailyReports')), { ...report, branchId, typeId, date, createdAt: Timestamp.now() });
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
