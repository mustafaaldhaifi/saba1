import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Timestamp contract used by the branch date controls. */
export interface BranchDateTimestamp {
  seconds: number;
  toDate(): Date;
}

/** Existing branch order exposed in the date selector. */
export interface BranchOrderDateOption {
  createdAt: BranchDateTimestamp;
}

/**
 * Shows the date-based actions for a branch without owning their business logic.
 *
 * The page receives every emitted event and remains the sole place that reads,
 * creates, or exports branch order data.
 */
@Component({
  selector: 'app-branch-date-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-date-actions.component.html'
})
export class BranchDateActionsComponent {
  @Input() orderDates: BranchOrderDateOption[] = [];
  @Input() allowedNewOrderDates: BranchOrderDateOption[] = [];
  @Input() selectedDate: BranchDateTimestamp | null = null;

  @Output() readonly dateSelected = new EventEmitter<BranchOrderDateOption>();
  @Output() readonly exportRequested = new EventEmitter<void>();
  @Output() readonly newOrderRequested = new EventEmitter<BranchDateTimestamp>();

  isSelected(date: BranchDateTimestamp): boolean {
    return this.selectedDate?.seconds === date.seconds;
  }
}
