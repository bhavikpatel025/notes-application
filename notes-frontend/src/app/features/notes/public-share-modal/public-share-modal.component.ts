import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteDto } from '../../../shared/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-public-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-share-modal.component.html',
  styleUrls: ['./public-share-modal.component.scss']
})
export class PublicShareModalComponent implements OnInit {
  @Input({ required: true }) note!: NoteDto;
  @Output() close = new EventEmitter<void>();
  @Output() noteUpdated = new EventEmitter<NoteDto>();

  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  isPublic: boolean = false;
  isBusy: boolean = false;
  copied: boolean = false;

  get publicUrl(): string {
    if (!this.note.publicSlug) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/p/${this.note.publicSlug}`;
    }
    return `/p/${this.note.publicSlug}`;
  }

  ngOnInit(): void {
    this.isPublic = !!this.note.isPublic;
  }

  onTogglePublic(event: Event): void {
    const input = event.target as HTMLInputElement;
    const shouldEnable = input.checked;

    this.isBusy = true;
    if (shouldEnable) {
      this.noteService.generatePublicLink(this.note.id).subscribe({
        next: (updatedNote) => {
          this.isBusy = false;
          this.note = updatedNote;
          this.isPublic = true;
          this.noteUpdated.emit(updatedNote);
          this.toastService.show({ message: 'Public link created' });
        },
        error: (err) => {
          this.isBusy = false;
          input.checked = false;
          this.isPublic = false;
          this.toastService.show({ message: err.error?.message || 'Failed to create public link' });
        }
      });
    } else {
      this.noteService.revokePublicLink(this.note.id).subscribe({
        next: (updatedNote) => {
          this.isBusy = false;
          this.note = updatedNote;
          this.isPublic = false;
          this.noteUpdated.emit(updatedNote);
          this.toastService.show({ message: 'Public link revoked' });
        },
        error: (err) => {
          this.isBusy = false;
          input.checked = true;
          this.isPublic = true;
          this.toastService.show({ message: err.error?.message || 'Failed to revoke public link' });
        }
      });
    }
  }

  copyLink(): void {
    if (!this.publicUrl) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.publicUrl).then(() => {
        this.copied = true;
        this.toastService.show({ message: 'Link copied to clipboard!' });
        setTimeout(() => this.copied = false, 2500);
      });
    }
  }

  openLink(): void {
    if (this.publicUrl) {
      window.open(this.publicUrl, '_blank');
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
