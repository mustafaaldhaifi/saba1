import { Injectable } from '@angular/core';
import { PdfService } from '../../../pdf.service';
import { BranchOrderPdfReport } from './report.models';

export interface PdfReportRequest extends BranchOrderPdfReport {
  /** Branch pages use their existing compact PDF layout; dashboard keeps the default layout. */
  isBranchLayout?: boolean;
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
    this.pdf.export(
      request.rows,
      request.isBranchLayout ?? false,
      request.date,
      request.branchName,
      request.typeName,
      request.isMonthly
    );
  }
}
