import { Injectable } from '@angular/core';
import { doc, Firestore, Timestamp, WriteBatch } from 'firebase/firestore';

/** Isolated legacy row shape until parent and child product documents are normalized. */
export type DailyReportDraftRow = any;

/** Prepares and queues daily-report transaction data without committing the batch. */
@Injectable({ providedIn: 'root' })
export class DailyReportTransactionService {
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
