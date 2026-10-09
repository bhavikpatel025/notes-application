import { Component, Input, Output, EventEmitter, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteDto, CollaboratorDto } from '../../../shared/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-collaborators-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './collaborators-modal.component.html',
  styleUrls: ['./collaborators-modal.component.scss']
})
export class CollaboratorsModalComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) note!: NoteDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() collaboratorsUpdated = new EventEmitter<NoteDto>();

  @ViewChild('emailInput') emailInputRef?: ElementRef<HTMLInputElement>;

  private noteService = inject(NoteService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  public ownerName = '';
  public ownerEmail = '';
  public collaborators: CollaboratorDto[] = [];
  public isOwner = true;
  public currentUserId = '';
  public newEmail = '';
  public isBusy = false;
  public errorMessage = '';

  private readonly avatarColors = [
    '#e8710a', '#1a73e8', '#129eaf', '#9334e6', 
    '#d93025', '#188038', '#f29900', '#e52592', '#5f6368'
  ];

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    this.currentUserId = currentUser?.userId || '';

    this.ownerEmail = this.note.ownerEmail || (this.note.isOwner ? (currentUser?.email || '') : '');
    this.ownerName = this.note.ownerName || (this.note.isOwner ? (currentUser?.fullName || currentUser?.email || '') : '');

    // If ownerEmail is still not set and this is the current user's note
    if (!this.ownerEmail && (this.note.isOwner ?? true)) {
      this.ownerEmail = currentUser?.email || '';
      this.ownerName = currentUser?.fullName || currentUser?.email || 'Owner';
    }

    this.isOwner = this.note.isOwner ?? (this.note.ownerId === this.currentUserId || !this.note.ownerId);
    this.collaborators = this.note.collaborators ? [...this.note.collaborators] : [];
  }

  ngAfterViewInit(): void {
    if (this.isOwner && this.emailInputRef) {
      setTimeout(() => {
        this.emailInputRef?.nativeElement.focus();
      }, 100);
    }
  }

  public getInitial(nameOrEmail: string): string {
    if (!nameOrEmail) return '?';
    return nameOrEmail.trim().charAt(0).toUpperCase();
  }

  public getAvatarBgColor(str: string): string {
    if (!str) return this.avatarColors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.avatarColors.length;
    return this.avatarColors[index];
  }

  public canRemove(c: CollaboratorDto): boolean {
    return this.isOwner || c.userId === this.currentUserId;
  }

  public clearError(): void {
    this.errorMessage = '';
  }

  public addCollaborator(closeAfterAdd = false): void {
    const email = this.newEmail.trim().toLowerCase();
    if (!email) {
      if (closeAfterAdd) {
        this.closeModal.emit();
      }
      return;
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    if (email === this.ownerEmail.toLowerCase()) {
      this.errorMessage = 'You cannot add the owner as a collaborator.';
      return;
    }

    if (this.collaborators.some(c => c.email.toLowerCase() === email)) {
      this.errorMessage = 'This user is already a collaborator.';
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';

    this.noteService.addCollaborator(this.note.id, email).subscribe({
      next: (updatedNote) => {
        this.isBusy = false;
        this.newEmail = '';
        this.collaborators = updatedNote.collaborators ? [...updatedNote.collaborators] : [];
        this.collaboratorsUpdated.emit(updatedNote);
        this.toastService.show({ message: `Collaborator added (${email})` }, 3000);
        if (closeAfterAdd) {
          this.closeModal.emit();
        }
      },
      error: (err) => {
        this.isBusy = false;
        const msg = err.error?.message || err.error || 'Failed to add collaborator. Ensure the email is registered.';
        this.errorMessage = typeof msg === 'string' ? msg : 'Failed to add collaborator.';
      }
    });
  }

  public removeCollaborator(c: CollaboratorDto, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.isBusy = true;
    this.errorMessage = '';

    this.noteService.removeCollaborator(this.note.id, c.userId).subscribe({
      next: (updatedNote) => {
        this.isBusy = false;
        if (c.userId === this.currentUserId) {
          // Self removed (left note)
          this.toastService.show({ message: 'You left the note' }, 3000);
          this.closeModal.emit();
        } else if (updatedNote) {
          this.collaborators = updatedNote.collaborators ? [...updatedNote.collaborators] : [];
          this.collaboratorsUpdated.emit(updatedNote);
          this.toastService.show({ message: `Removed collaborator (${c.email})` }, 3000);
        }
      },
      error: (err) => {
        this.isBusy = false;
        const msg = err.error?.message || err.error || 'Failed to remove collaborator.';
        this.errorMessage = typeof msg === 'string' ? msg : 'Failed to remove collaborator.';
      }
    });
  }

  public onSave(): void {
    if (this.newEmail.trim()) {
      this.addCollaborator(true);
    } else {
      this.closeModal.emit();
    }
  }

  public onCancel(): void {
    this.closeModal.emit();
  }

  public onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  public onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
