import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { DashboardOrderType } from '../../data/dashboard-types.service';

export interface DashboardDateFilter { createdAt: Timestamp; count?: number; }

/** Presentation-only city, type, date, and search controls for the dashboard. */
@Component({
  selector: 'app-dashboard-filters', standalone: true,
  imports: [CommonModule, FormsModule], templateUrl: './dashboard-filters.component.html'
})
export class DashboardFiltersComponent {
  @Input({ required: true }) selectedCity = '';
  @Input({ required: true }) types: DashboardOrderType[] = [];
  @Input() selectedType: DashboardOrderType | null = null;
  @Input() dates: DashboardDateFilter[] = [];
  @Input() selectedDate: DashboardDateFilter | null = null;
  @Input() branchName = '';
  @Input() canSearch = false;
  @Output() readonly cityChanged = new EventEmitter<string>();
  @Output() readonly typeChanged = new EventEmitter<DashboardOrderType>();
  @Output() readonly dateChanged = new EventEmitter<DashboardDateFilter>();
  @Output() readonly searchRequested = new EventEmitter<void>();
}
