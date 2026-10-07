import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Legacy daily row shape, isolated until the inventory model migration is complete.
 * Its dynamic fields are retained here because the existing Firestore documents
 * contain different fields for parent and child products.
 */
export type DailyOrderTableRow = any;

/** Explicit contract between the daily table and its page coordinator. */
export interface DailyOrderTableFacade {
  branch: unknown;
  combinedData: DailyOrderTableRow[];
  selectedDate: string;
  isReadDailyMode: boolean;
  isPositiveNumber(value: unknown): boolean;
  isDisabledDailyField(): boolean;
  isItemLocked(productId: string): boolean;
  isColumnLocked(itemId: string, columnName: string, currentDate: string): boolean;
  onQuantityChange(
    field: string,
    item: DailyOrderTableRow,
    rowIndex: number,
    subProduct?: unknown,
    isUser?: boolean
  ): void;
}

/**
 * Presentation boundary for the legacy daily inventory table.
 *
 * The supplied facade retains the existing quantity calculations, lock checks,
 * and draft-update tracking. Its explicit contract prevents the table from
 * depending on arbitrary properties of the page component.
 */
@Component({
  selector: 'app-branch-daily-order-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-daily-order-table.component.html',
  styleUrl: '../../../../branch/branch.component.css'
})
export class BranchDailyOrderTableComponent {
  @Input({ required: true }) context!: DailyOrderTableFacade;
}
