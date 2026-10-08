import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Presentation-only actions below the regular branch order table.
 *
 * It decides which action is visible from inputs but delegates every write to
 * the parent component, preserving the existing business rules there.
 */
@Component({
  selector: 'app-branch-order-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-order-actions.component.html'
})
export class BranchOrderActionsComponent {
  @Input() hasEmptyProduct = false;
  @Input() isAddingOrder = false;
  @Input() isOrderComplete = false;
  @Input() isLoading = false;
  @Input() isPreSent = false;
  @Input() hasUpdates = false;
  @Input() canSaveUpdates = false;
  @Input() canSaveDraft = false;
  @Input() isDraftSaved = false;

  @Output() readonly saveNewProductsRequested = new EventEmitter<void>();
  @Output() readonly sendOrderRequested = new EventEmitter<void>();
  @Output() readonly saveUpdatesRequested = new EventEmitter<void>();
  @Output() readonly saveDraftRequested = new EventEmitter<void>();
}
