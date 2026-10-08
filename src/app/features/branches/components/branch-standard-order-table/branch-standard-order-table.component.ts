import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Event carrying a displayed row and its index. */
export interface BranchOrderRowEvent {
  index: number;
  item: any;
  domEvent?: Event;
}

/**
 * Renders the non-daily branch order table.
 *
 * Quantity validation, status policy, and persistence intentionally remain in
 * the page for now. This component mutates the shared draft rows through
 * ngModel and reports each user interaction to the parent.
 */
@Component({
  selector: 'app-branch-standard-order-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-standard-order-table.component.html',
  styleUrl: '../../../../branch/branch.component.css'
})
export class BranchStandardOrderTableComponent {
  @Input() rows: any[] = [];
  @Input() hasBranch = false;
  @Input() orderTypeId = '';
  @Input() monthlyTypeId = '';
  @Input() weightTypeId = '';
  @Input() canEditQuantities = false;
  @Input() isPreSent = false;
  @Input() isFieldDisabled = false;
  @Input() isDropDownDisabled = false;
  @Input() selectedOrderStatus = '';
  @Input() isDraftFieldLocked: (item: any, field: string) => boolean = () => false;
  @Input() isAddedItem: (item: any) => boolean = () => false;
  @Input() statusColor: (status: string) => string = () => '';

  @Output() readonly availableQuantityChanged = new EventEmitter<any>();
  @Output() readonly requestedQuantityChanged = new EventEmitter<BranchOrderRowEvent>();
  @Output() readonly statusChanged = new EventEmitter<any>();
  @Output() readonly unmatchedQuantityChanged = new EventEmitter<BranchOrderRowEvent>();
  @Output() readonly cashToggled = new EventEmitter<BranchOrderRowEvent>();
  @Output() readonly cashValueChanged = new EventEmitter<BranchOrderRowEvent>();

  get showsRequestedQuantity(): boolean {
    return this.orderTypeId !== this.monthlyTypeId;
  }

  get isWeightOrder(): boolean {
    return this.orderTypeId === this.weightTypeId;
  }

  canEdit(item: any): boolean {
    return item.id === -1 || this.canEditQuantities;
  }
}
