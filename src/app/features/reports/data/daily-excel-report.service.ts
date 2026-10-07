import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';

export interface DailyExcelBranch { id: string; name: string; }
export interface DailyExcelProduct { id: string; name: string; subProducts?: DailyExcelProduct[]; }

export interface DailyExcelReportRequest {
  column: string;
  branches: DailyExcelBranch[];
  products: DailyExcelProduct[];
  startDate: string;
  endDate: string;
  getLastEntryDate(branchId: string): Date | null;
  formatDate(date: Date): string;
  getValue(branchId: string, productId: string): string | number | null | undefined;
}

/**
 * Downloads the currently displayed daily report as an Excel workbook.
 *
 * Authorization: administrator dashboard only. It consumes the in-memory report and
 * writes a file in the browser; it does not read or change Firestore or local storage.
 */
@Injectable({ providedIn: 'root' })
export class DailyExcelReportService {
  export(request: DailyExcelReportRequest): void {
    const rows: Array<Array<string | number | null | undefined>> = [];
    rows.push([request.column]);
    rows.push(['', 'تاريخ آخر إدخال', ...request.branches.map(branch => {
      const date = request.getLastEntryDate(branch.id);
      return date ? request.formatDate(date) : 'لا يوجد';
    })]);
    rows.push(['#', 'المنتج', ...request.branches.map(branch => branch.name)]);

    const mainOnlyColumns = new Set(['transfer', 'recieved', 'closeStock']);
    request.products.forEach((product, index) => {
      const visibleProducts = mainOnlyColumns.has(request.column) || !product.subProducts?.length
        ? [{ id: product.id, name: product.name, index: index + 1 }]
        : product.subProducts.map(subProduct => ({ id: subProduct.id, name: subProduct.name, index: '' }));
      for (const item of visibleProducts) {
        rows.push([item.index, item.name, ...request.branches.map(branch => request.getValue(branch.id, item.id))]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 30 }, ...Array(request.branches.length).fill({ wch: 15 })];
    worksheet['!rows'] = [{ hpx: 30 }, { hpx: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Report');
    XLSX.writeFile(workbook, `${request.startDate}_${request.endDate}_Daily.xlsx`);
  }
}
