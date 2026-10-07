import { Injectable } from '@angular/core';
import { PdfService } from '../../../pdf.service';
import { BranchOrderPdfReport } from './report.models';

export type PdfReportRequest = BranchOrderPdfReport;

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
