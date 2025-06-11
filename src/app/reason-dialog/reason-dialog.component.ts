import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-reason-dialog',
  templateUrl: './reason-dialog.component.html',
  styleUrls: ['./reason-dialog.component.css']
})
export class ReasonDialogComponent {
  reason: string = '';

  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  @ViewChild('reasonInput') reasonInput!: ElementRef;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.reasonInput.nativeElement.focus();
    });
  }
  confirm() {
    this.onConfirm.emit(this.reason);
  }

  cancel() {
    this.onCancel.emit();
  }
}
