import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BranchDateTimestamp } from '../branch-date-actions/branch-date-actions.component';

/** Displays the currently selected order date and branch name. */
@Component({
  selector: 'app-branch-order-context',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-order-context.component.html'
})
export class BranchOrderContextComponent {
  @Input() selectedDate: BranchDateTimestamp | null = null;
  @Input() branchName = '';
}
