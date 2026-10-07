import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Presentation-only toolbar for the administrator dashboard.
 * It emits user intent and does not access Firestore, storage, or authentication.
 */
@Component({
  selector: 'app-dashboard-toolbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-toolbar.component.html'
})
export class DashboardToolbarComponent {
  @Input({ required: true }) version = '';
  @Output() readonly logoutRequested = new EventEmitter<void>();
  @Output() readonly resetRequested = new EventEmitter<void>();
}
