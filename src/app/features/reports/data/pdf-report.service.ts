import { Injectable } from '@angular/core';
import { PdfService } from '../../../pdf.service';

export interface PdfReportRequest {
  rows: unknown[][];
  date: string;
  branchName: string;
  typeName: string;
  isMonthly: boolean;
}

/**
 * Exports the current branch report as a browser PDF.
 *
 * Authorization: administrator dashboard only. It uses only the current in-memory
 * report and does not read or write Firestore or local storage.
 */
@Injectable({ providedIn: 'root' })
export class PdfReportService {
  constructor(private readonly pdf: PdfService) {}

  exportBranchReport(request: PdfReportRequest): void {
    this.pdf.export(request.rows, false, request.date, request.branchName, request.typeName, request.isMonthly);
  }
}
