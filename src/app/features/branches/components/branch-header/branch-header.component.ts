import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** The minimum order-type data needed by the branch page header. */
export interface BranchHeaderOrderType {
  id: string;
  name: string;
}

/**
 * Presentation-only header for the branch screen.
 *
 * It owns no branch data and performs no writes. The page remains responsible
 * for loading the available types and reacting to the user's selection.
 */
@Component({
  selector: 'app-branch-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-header.component.html'
})
export class BranchHeaderComponent {
  @Input({ required: true }) version = '';
  @Input() types: BranchHeaderOrderType[] = [];
  @Input() selectedType: BranchHeaderOrderType | null = null;

  @Output() readonly logoutRequested = new EventEmitter<void>();
  @Output() readonly typeChanged = new EventEmitter<BranchHeaderOrderType>();
}
