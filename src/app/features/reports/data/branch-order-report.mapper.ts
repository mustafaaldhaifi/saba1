import { PdfTableRow } from './report.models';

/**
 * Prepares branch-order rows for PDF rendering.
 *
 * Non-monthly reports omit rows whose requested quantity (the fourth cell in the
 * established report layout) is empty or zero. The function is pure.
 */
export function prepareBranchOrderRows(rows: PdfTableRow[], isMonthly: boolean): PdfTableRow[] {
  if (isMonthly) return rows;
  return rows.filter(row => {
    const requestedQuantity = row[3];
    return requestedQuantity !== null && requestedQuantity !== undefined && requestedQuantity !== '' && Number(requestedQuantity) !== 0;
  });
}
