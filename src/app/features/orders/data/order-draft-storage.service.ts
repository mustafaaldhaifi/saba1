import { Injectable } from '@angular/core';
import { BranchOrderDraft, OrderDraftField, OrderDraftIdentity, OrderDraftRow } from '../models/order-draft.models';

type EditableOrderRow = Record<string, unknown>;

/** Stores unfinished non-daily branch orders in this browser only. */
@Injectable({ providedIn: 'root' })
export class OrderDraftStorageService {
  private readonly prefix = 'branch-order-draft:v1:';
  private readonly maximumAgeMs = 60 * 24 * 60 * 60 * 1000;

  buildDateKey(value: unknown): string {
    if (value instanceof Date) return this.localDateKey(value);
    if (value && typeof value === 'object') {
      const timestamp = value as { toDate?: () => Date };
      if (typeof timestamp.toDate === 'function') {
        return this.localDateKey(timestamp.toDate());
      }
    }
    return String(value ?? 'no-date');
  }

  save(
    identity: OrderDraftIdentity,
    rows: EditableOrderRow[],
    lockedFieldsByRow: ReadonlyMap<string, readonly OrderDraftField[]> = new Map()
  ): BranchOrderDraft | null {
    if (!this.isAvailable() || identity.typeId === '5') return null;
    const draft: BranchOrderDraft = {
      schemaVersion: 1,
      ...identity,
      rows: rows
        .map(row => this.pickEditableFields(row, lockedFieldsByRow.get(this.rowId(row)) ?? []))
        .filter((row): row is OrderDraftRow => row !== null),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(this.key(identity), JSON.stringify(draft));
    return draft;
  }

  restore(identity: OrderDraftIdentity, rows: EditableOrderRow[]): BranchOrderDraft | null {
    const draft = this.read(identity);
    if (!draft) return null;
    const byId = new Map(draft.rows.map(row => [row.rowId, row]));
    for (const row of rows) {
      const saved = byId.get(this.rowId(row));
      if (!saved) continue;
      const { rowId: _rowId, lockedFields: _lockedFields, ...fields } = saved;
      Object.assign(row, fields);
    }
    return draft;
  }

  remove(identity: OrderDraftIdentity): void {
    if (!this.isAvailable()) return;
    localStorage.removeItem(this.key(identity));
  }

  private read(identity: OrderDraftIdentity): BranchOrderDraft | null {
    if (!this.isAvailable() || identity.typeId === '5') return null;
    try {
      const raw = localStorage.getItem(this.key(identity));
      if (!raw) return null;
      const draft = JSON.parse(raw) as BranchOrderDraft;
      if (draft.schemaVersion !== 1 || Date.now() - new Date(draft.savedAt).getTime() > this.maximumAgeMs) {
        this.remove(identity);
        return null;
      }
      return draft;
    } catch {
      this.remove(identity);
      return null;
    }
  }

  private pickEditableFields(row: EditableOrderRow, lockedFields: readonly OrderDraftField[]): OrderDraftRow | null {
    const rowId = this.rowId(row);
    if (!rowId) return null;
    return {
      rowId,
      qnt: row['qnt'],
      qntF: row['qntF'],
      status: row['status'],
      qntNotRequirement: row['qntNotRequirement'],
      isCashEnabled: row['isCashEnabled'],
      cashValue: row['cashValue'],
      note: row['note'],
      lockedFields: [...lockedFields]
    };
  }

  private rowId(row: EditableOrderRow): string {
    return String(row['productId'] ?? row['id'] ?? '');
  }

  private key(identity: OrderDraftIdentity): string {
    return `${this.prefix}${identity.branchId}:${identity.typeId}:${identity.orderDateKey}`;
  }

  private localDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
