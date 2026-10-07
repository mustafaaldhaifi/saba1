/** A printable cell in the branch-order PDF table. */
export type PdfTableCell = string | number | null | undefined;

/** A printable row in the branch-order PDF table. */
export type PdfTableRow = PdfTableCell[];

/** The input required to create a branch-order PDF. */
export interface BranchOrderPdfReport {
  rows: PdfTableRow[];
  date: string;
  branchName: string;
  typeName: string;
  isMonthly: boolean;
}
