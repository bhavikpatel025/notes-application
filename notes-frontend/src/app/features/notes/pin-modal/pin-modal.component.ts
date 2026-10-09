import { Component, Input, Output, EventEmitter, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteDto } from '../../../shared/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-pin-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pin-modal.component.html',
  styleUrls: ['./pin-modal.component.scss']
})
export class PinModalComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) note!: NoteDto;
  @Input({ required: true }) mode: 'lock' | 'unlock' | 'remove-lock' = 'unlock';

  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<NoteDto>();

  @ViewChild('pinInput') pinInputRef?: ElementRef<HTMLInputElement>;

  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  pin: string = '';
  confirmPin: string = '';
  errorMessage: string = '';
  isBusy: boolean = false;
  showPin: boolean = false;

  get title(): string {
    switch (this.mode) {
      case 'lock':
        return 'Lock note with PIN';
      case 'unlock':
        return 'Enter PIN to unlock';
      case 'remove-lock':
        return 'Remove lock from note';
    }
  }

  get subtitle(): string {
    switch (this.mode) {
      case 'lock':
        return 'Choose a PIN of at least 4 digits to secure this note.';
      case 'unlock':
        return 'This note is protected with AES-256 encryption.';
      case 'remove-lock':
        return 'Enter the current PIN to permanently decrypt and unlock this note.';
    }
  }

  get submitButtonLabel(): string {
    switch (this.mode) {
      case 'lock':
        return 'Lock note';
      case 'unlock':
        return 'Unlock';
      case 'remove-lock':
        return 'Remove lock';
    }
  }

  ngOnInit(): void {
    this.errorMessage = '';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.pinInputRef?.nativeElement.focus();
    }, 100);
  }

  onPinKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    const cleanPin = this.pin.trim();

    if (!cleanPin || cleanPin.length < 4) {
      this.errorMessage = 'PIN must be at least 4 digits.';
      return;
    }

    if (this.mode === 'lock') {
      if (cleanPin !== this.confirmPin.trim()) {
        this.errorMessage = 'PINs do not match. Please try again.';
        return;
      }

      this.isBusy = true;
      this.noteService.lockNote(this.note.id, cleanPin).subscribe({
        next: (lockedNote) => {
          this.isBusy = false;
          this.toastService.show({ message: 'Note locked securely' });
          this.success.emit(lockedNote);
          this.close.emit();
        },
        error: (err) => {
          this.isBusy = false;
          this.errorMessage = err.error?.message || 'Failed to lock note. Please try again.';
        }
      });
    } else if (this.mode === 'unlock') {
      this.isBusy = true;
      this.noteService.unlockNote(this.note.id, cleanPin).subscribe({
        next: (decryptedNote) => {
          this.isBusy = false;
          this.success.emit(decryptedNote);
          this.close.emit();
        },
        error: (err) => {
          this.isBusy = false;
          this.errorMessage = err.error?.message || 'Incorrect PIN. Try again.';
          this.pin = '';
          this.pinInputRef?.nativeElement.focus();
        }
      });
    } else if (this.mode === 'remove-lock') {
      this.isBusy = true;
      this.noteService.removeNoteLock(this.note.id, cleanPin).subscribe({
        next: (unlockedNote) => {
          this.isBusy = false;
          this.toastService.show({ message: 'Lock removed successfully' });
          this.success.emit(unlockedNote);
          this.close.emit();
        },
        error: (err) => {
          this.isBusy = false;
          this.errorMessage = err.error?.message || 'Incorrect PIN. Try again.';
          this.pin = '';
          this.pinInputRef?.nativeElement.focus();
        }
      });
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
