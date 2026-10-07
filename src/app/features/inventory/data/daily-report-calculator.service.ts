import { Injectable } from '@angular/core';

/** Calculates the closing stock for a daily inventory row without side effects. */
@Injectable({ providedIn: 'root' })
export class DailyReportCalculatorService {
  calculateClosingStock(report: any, openingStock?: any, unit = 1): number {
    const opening = Number((openingStock ?? report)?.openingStockQnt ?? 0);
    const received = Number(report?.recieved ?? 0);
    const transfer = Number(report?.transfer ?? 0);
    const directTransfer = Number(report?.directTransfer ?? 0);
    const values = (key: string) => Array.isArray(report?.products)
      ? report.products.reduce((sum: number, row: any) => sum + Number(row[key] ?? 0), 0)
      : Number(report?.[key] ?? 0);

    return opening + (received * unit) + values('add') + values('canceled')
      - values('sales') - values('staffMeal') - transfer - directTransfer
      - values('freeIncrease') - values('dameged');
  }
}
