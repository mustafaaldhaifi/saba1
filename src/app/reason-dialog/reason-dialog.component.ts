import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports:[FormsModule],
  selector: 'app-reason-dialog',
  templateUrl: './reason-dialog.component.html',
  styleUrls: ['./reason-dialog.component.css']
})
export class ReasonDialogComponent {
  reason: string = '';
  
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  confirm() {
    this.onConfirm.emit(this.reason);
  }

  cancel() {
    this.onCancel.emit();
  }
}
