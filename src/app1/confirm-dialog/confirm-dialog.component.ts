import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-reason-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class AlertDialogComponent {
  @Input() text: string = '';



  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();
  @ViewChild('focusText') focusText!: ElementRef;

  ngAfterViewInit(): void {
    // تأخير بسيط لضمان جاهزية العنصر
    setTimeout(() => {
      this.focusText.nativeElement.focus();
    });
  }
  confirm() {
    this.onConfirm.emit();
  }
}
