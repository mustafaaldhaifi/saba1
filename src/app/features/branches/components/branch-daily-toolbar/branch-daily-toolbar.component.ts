import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Export status and grouped dates for a daily-report period. */
export interface BranchDailyReportGroup {
  fullyFilled: boolean;
  hasBeenExported: boolean;
  hasBeenExportedNotes: boolean;
  dates: string[];
}

/**
 * Daily-report controls for a branch.
 *
 * This component renders controls only. All exports, persistence, and date
 * loading are emitted back to the branch page so existing business behavior is
 * preserved while the daily table is refactored separately.
 */
@Component({
  selector: 'app-branch-daily-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-daily-toolbar.component.html'
})
export class BranchDailyToolbarComponent {
  @Input() dates: Date[] = [];
  @Input() selectedDate: Date | undefined;
  @Input() branchName = '';
  @Input() reportGroups: Record<string, BranchDailyReportGroup> = {};
  @Input() hasDailyReports = false;
  @Input() hasUnsavedChanges = false;

  @Output() readonly dateChanged = new EventEmitter<Date>();
  @Output() readonly exportAllRequested = new EventEmitter<BranchDailyReportGroupEvent>();
  @Output() readonly exportAllNotesRequested = new EventEmitter<BranchDailyReportGroupEvent>();
  @Output() readonly exportCurrentRequested = new EventEmitter<void>();
  @Output() readonly saveChangesRequested = new EventEmitter<void>();
}

export interface BranchDailyReportGroupEvent {
  key: string;
  dates: string[];
}
