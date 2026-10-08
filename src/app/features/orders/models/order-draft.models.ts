export type OrderDraftField =
  | 'qnt'
  | 'qntF'
  | 'status'
  | 'qntNotRequirement'
  | 'isCashEnabled'
  | 'cashValue'
  | 'note';

export interface OrderDraftRow {
  rowId: string;
  qnt?: unknown;
  qntF?: unknown;
  status?: unknown;
  qntNotRequirement?: unknown;
  isCashEnabled?: unknown;
  cashValue?: unknown;
  note?: unknown;
  lockedFields?: OrderDraftField[];
}

export interface BranchOrderDraft {
  schemaVersion: 1;
  branchId: string;
  typeId: string;
  orderDateKey: string;
  rows: OrderDraftRow[];
  savedAt: string;
}

export interface OrderDraftIdentity {
  branchId: string;
  typeId: string;
  orderDateKey: string;
}
