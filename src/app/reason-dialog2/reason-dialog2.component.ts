import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-reason-dialog2',
  templateUrl: './reason-dialog2.component.html',
  styleUrls: ['./reason-dialog2.component.css']
})
export class ReasonDialogComponent2 {
  provider: string = '';

  isRecieved = false

  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  @ViewChild('reasonInput2') reasonInput2!: ElementRef;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.reasonInput2.nativeElement.focus();
    });
  }
  confirm() {
    this.onConfirm.emit("تم الاستلام من المورد: " + this.provider);
  }

  cancel() {
    this.onCancel.emit();
  }
}
