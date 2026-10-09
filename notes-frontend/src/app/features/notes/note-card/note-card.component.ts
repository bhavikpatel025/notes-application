import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NoteDto, TodoItemDto, CollaboratorDto } from '../../../shared/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { ReminderFormatPipe } from '../../../shared/pipes/reminder-format.pipe';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { ReminderPopupComponent, ReminderResult } from '../reminder-popup/reminder-popup.component';
import { LabelDto } from '../../../shared/models/label.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [DatePipe, HighlightPipe, ReminderFormatPipe, LabelSelectionPopupComponent, ReminderPopupComponent],
  templateUrl: './note-card.component.html',
  styleUrl: './note-card.component.scss'
})
export class NoteCardComponent {
  @Input({ required: true }) note!: NoteDto;
  @Input() isTrashView = false;
  @Input() searchQuery: string = '';
  @Output() delete = new EventEmitter<string>();
  @Output() togglePin = new EventEmitter<NoteDto>();
  @Output() toggleArchive = new EventEmitter<NoteDto>();
  @Output() versionHistory = new EventEmitter<NoteDto>();
  @Output() openCollaborators = new EventEmitter<NoteDto>();
  @Output() requestLock = new EventEmitter<{ note: NoteDto, mode: 'lock' | 'unlock' | 'remove-lock' }>();
  @Output() openPublicShare = new EventEmitter<NoteDto>();
  @Output() openDrawing = new EventEmitter<NoteDto>();
  
  private elementRef = inject(ElementRef);
  private noteService = inject(NoteService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  
  @Output() labelClick = new EventEmitter<string>();

  showColorPalette = false;
  showLabelPopup = false;
  showMoreMenu = false;
  showReminderPopup = false;
  showCompleted = true;
  showHideCheckboxesModal = false;
  openDirection: 'up' | 'down' = 'up';
  openHorizontalDirection: 'left' | 'right' = 'left';
  
  colors = [
    { name: 'Default', value: '#FFFFFF', isDefault: true },
    { name: 'Red', value: 'var(--gk-note-red)' },
    { name: 'Orange', value: 'var(--gk-note-orange)' },
    { name: 'Yellow', value: 'var(--gk-note-yellow)' },
    { name: 'Green', value: 'var(--gk-note-green)' },
    { name: 'Teal', value: 'var(--gk-note-teal)' },
    { name: 'Blue', value: 'var(--gk-note-blue)' },
    { name: 'Dark blue', value: 'var(--gk-note-darkblue)' },
    { name: 'Purple', value: 'var(--gk-note-purple)' },
    { name: 'Pink', value: 'var(--gk-note-pink)' },
    { name: 'Brown', value: 'var(--gk-note-brown)' },
    { name: 'Gray', value: 'var(--gk-note-gray)' }
  ];

  private updateOpenDirection(event: Event, estimatedHeight = 300, estimatedWidth = 220, defaultHorizontal: 'left' | 'right' = 'right', anchorSelector?: string) {
    let target: HTMLElement | null = null;
    if (anchorSelector) {
      target = this.elementRef.nativeElement.querySelector(anchorSelector);
    }
    if (!target) {
      target = (event.target as HTMLElement).closest('.icon-btn, .reminder-chip, .more-container, .palette-container, .reminder-container, button') || (event.target as HTMLElement);
    }
    const rect = target.getBoundingClientRect();
    
    // Vertical direction: Buffer for navbar (70px) and bottom padding (20px)
    const spaceAbove = rect.top - 70;
    const spaceBelow = window.innerHeight - rect.bottom - 20;

    // In note cards, toolbar is at the bottom, so preferred direction is 'up' (bottom: 100%)
    // Only open 'down' if space above is insufficient (< estimatedHeight) AND space below is greater than space above
    if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
      this.openDirection = 'down';
    } else {
      this.openDirection = 'up';
    }

    // Horizontal direction:
    if (defaultHorizontal === 'right') {
      if (rect.left < (estimatedWidth - 40)) {
        this.openHorizontalDirection = 'left';
      } else {
        this.openHorizontalDirection = 'right';
      }
    } else {
      if (window.innerWidth - rect.left < estimatedWidth) {
        this.openHorizontalDirection = 'right';
      } else {
        this.openHorizontalDirection = 'left';
      }
    }
  }

  onLabelClick(labelName: string, event: Event) {
    event.stopPropagation();
    this.labelClick.emit(labelName);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.showColorPalette && !this.elementRef.nativeElement.querySelector('.palette-container')?.contains(target)) {
      this.showColorPalette = false;
    }
    if (this.showMoreMenu && !this.elementRef.nativeElement.querySelector('.more-container')?.contains(target)) {
      this.showMoreMenu = false;
    }
    if (this.showLabelPopup && !this.elementRef.nativeElement.querySelector('.label-popup-container')?.contains(target) && !this.elementRef.nativeElement.querySelector('.more-container')?.contains(target)) {
      this.showLabelPopup = false;
    }
    if (this.showReminderPopup && !this.elementRef.nativeElement.querySelector('.reminder-container')?.contains(target) && !target.closest('.reminder-chip')) {
      this.showReminderPopup = false;
    }
  }

  @HostListener('document:closeMenus')
  onCloseMenus() {
    this.showColorPalette = false;
    this.showMoreMenu = false;
    this.showLabelPopup = false;
    this.showReminderPopup = false;
  }

  toggleReminderPopup(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 340, 290, 'left', '.reminder-container');
    const wasOpen = this.showReminderPopup;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showReminderPopup = !wasOpen;
  }

  openReminderFromChip(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 340, 290, 'left', '.reminder-chip');
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showReminderPopup = true;
  }

  onReminderSet(result: ReminderResult) {
    this.showReminderPopup = false;
    this.togglePin.emit({
      ...this.note,
      reminderDateTime: result.reminderDateTime,
      reminderRepeat: result.reminderRepeat
    });
    this.toastService.show({ message: 'Reminder set' });
  }

  removeReminder(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showReminderPopup = false;
    this.togglePin.emit({
      ...this.note,
      reminderDateTime: null,
      reminderRepeat: null,
      clearReminder: true
    });
    this.toastService.show({ message: 'Reminder deleted' });
  }

  toggleColorPalette(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 160, 280, 'left', '.palette-container');
    const wasOpen = this.showColorPalette;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showColorPalette = !wasOpen;
  }

  toggleMoreMenu(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 260, 180, 'right', '.more-container');
    const wasOpen = this.showMoreMenu;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showMoreMenu = !wasOpen;
  }

  openLabelPopup(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 280, 230, 'right', '.more-container');
    this.showMoreMenu = false;
    this.showLabelPopup = true;
  }

  onMakeCopy(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;

    const copyData: Partial<NoteDto> = {
      title: this.note.title || '',
      content: this.note.content || '',
      color: this.note.color || '#FFFFFF',
      type: this.note.type || 0,
      todoItems: this.note.todoItems ? this.note.todoItems.map(item => ({
        text: item.text,
        isCompleted: item.isCompleted,
        orderIndex: item.orderIndex
      })) : [],
      imageUrls: this.note.imageUrls ? [...this.note.imageUrls] : [],
      labels: this.note.labels ? [...this.note.labels] : [],
      labelIds: this.note.labels ? this.note.labels.map(l => l.id) : [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      reminderDateTime: null,
      reminderRepeat: null
    };

    this.noteService.createNote(copyData).subscribe({
      next: (createdNote) => {
        this.toastService.show({
          message: 'Note copied',
          actionLabel: 'Undo',
          action: () => {
            this.noteService.deleteNote(createdNote.id).subscribe();
          }
        });
      },
      error: (err) => {
        console.error('Failed to copy note', err);
      }
    });
  }

  onCopyToGoogleDocs(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.noteService.copyToGoogleDocs(this.note);
  }

  openVersionHistory(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.versionHistory.emit(this.note);
  }

  onLabelsChanged(labels: LabelDto[]) {
    this.togglePin.emit({ ...this.note, labels });
  }

  removeLabel(labelId: string, event: Event) {
    event.stopPropagation();
    const labels = (this.note.labels || []).filter(l => l.id !== labelId);
    this.togglePin.emit({ ...this.note, labels });
  }

  changeColor(colorValue: string, event: Event) {
    event.stopPropagation();
    this.showColorPalette = false;
    if (this.note.color !== colorValue) {
      this.togglePin.emit({
        ...this.note,
        color: colorValue
      });
    }
  }

  onDelete(event: Event) {
    event.stopPropagation();
    if (this.isTrashView) {
      // Hard delete
      this.delete.emit(this.note.id);
    } else {
      // Soft delete (Move to Trash)
      this.toggleArchive.emit({ 
        ...this.note, 
        isTrashed: true,
        isPinned: false
      });
    }
  }

  onRemoveMyself(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    const currentUserId = this.authService.currentUser()?.userId;
    if (!currentUserId) return;

    this.noteService.removeCollaborator(this.note.id, currentUserId).subscribe({
      next: () => {
        this.toastService.show({ message: 'Removed from note' }, 3000);
      },
      error: () => {
        this.toastService.show({ message: 'Failed to remove from note' }, 3000);
      }
    });
  }

  onRestore(event: Event) {
    event.stopPropagation();
    this.toggleArchive.emit({ 
      ...this.note, 
      isTrashed: false 
    });
  }

  onPin(event: Event) {
    event.stopPropagation();
    const isPinning = !this.note.isPinned;
    this.togglePin.emit({ 
      ...this.note, 
      isPinned: isPinning,
      isArchived: isPinning ? false : this.note.isArchived
    });
  }

  onArchive(event: Event) {
    event.stopPropagation();
    const isArchiving = !this.note.isArchived;
    
    this.toggleArchive.emit({ 
      ...this.note, 
      isArchived: isArchiving,
      isPinned: isArchiving ? false : this.note.isPinned
    });
  }

  triggerFileInput(fileInput: HTMLInputElement, event: Event) {
    event.stopPropagation();
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const currentImages = this.note.imageUrls || [];
    
    // Check limit
    if (currentImages.length + input.files.length > 5) {
      this.toastService.show({ message: "Can’t upload this file. Maximum 5 images allowed per note." });
      return;
    }

    Array.from(input.files).forEach(file => {
      this.noteService.uploadImage(file).subscribe({
        next: (res) => {
          const updatedNote = { ...this.note, imageUrls: [...(this.note.imageUrls || []), res.url] };
          this.togglePin.emit(updatedNote);
        },
        error: (err) => {
          const msg = err.error?.message || "Can’t upload this file. We accept GIF, JPEG, JPG, PNG files less than 10MB and 25 megapixels.";
          this.toastService.show({ message: msg });
        }
      });
    });

    input.value = '';
  }

  get isChecklist(): boolean {
    return this.note.type === 1 || (this.note.todoItems && this.note.todoItems.length > 0) || false;
  }

  get uncompletedTodoItems(): TodoItemDto[] {
    return (this.note.todoItems || []).filter(t => !t.isCompleted);
  }

  get completedTodoItems(): TodoItemDto[] {
    return (this.note.todoItems || []).filter(t => t.isCompleted);
  }

  get completedTodoItemsCount(): number {
    return this.completedTodoItems.length;
  }

  toggleCompletedSection(event: Event) {
    event.stopPropagation();
    this.showCompleted = !this.showCompleted;
  }

  toggleTodoItem(item: TodoItemDto, event: Event) {
    event.stopPropagation();
    if (this.isTrashView) return;
    const updatedTodoItems = (this.note.todoItems || []).map(t => 
      (t.id && t.id === item.id) || (t.text === item.text && t.orderIndex === item.orderIndex)
        ? { ...t, isCompleted: !t.isCompleted } 
        : t
    );
    this.togglePin.emit({
      ...this.note,
      todoItems: updatedTodoItems
    });
  }

  uncheckAllItems(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    const updatedTodoItems = (this.note.todoItems || []).map(t => ({ ...t, isCompleted: false }));
    this.togglePin.emit({
      ...this.note,
      todoItems: updatedTodoItems
    });
  }

  deleteCheckedItems(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    const updatedTodoItems = (this.note.todoItems || []).filter(t => !t.isCompleted);
    this.togglePin.emit({
      ...this.note,
      todoItems: updatedTodoItems
    });
  }

  onHideCheckboxesClick(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    if (this.completedTodoItemsCount > 0) {
      this.showHideCheckboxesModal = true;
    } else {
      this.convertToChecklistOrText(false);
    }
  }

  confirmHideCheckboxes(deleteChecked: boolean, event: Event) {
    event.stopPropagation();
    this.showHideCheckboxesModal = false;
    this.convertToChecklistOrText(deleteChecked);
  }

  cancelHideCheckboxes(event: Event) {
    event.stopPropagation();
    this.showHideCheckboxesModal = false;
  }

  convertToChecklistOrText(deleteChecked: boolean) {
    if (this.isChecklist) {
      let items = this.note.todoItems || [];
      if (deleteChecked) {
        items = items.filter(t => !t.isCompleted);
      }
      const text = items.map(t => t.text).join('\n');
      this.togglePin.emit({
        ...this.note,
        type: 0,
        content: text,
        todoItems: []
      });
    } else {
      const text = this.note.content || '';
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const items = lines.map((line, index) => ({
        text: line.trim(),
        isCompleted: false,
        orderIndex: index
      }));
      this.togglePin.emit({
        ...this.note,
        type: 1,
        content: '',
        todoItems: items
      });
    }
  }

  get currentUserId(): string | undefined {
    return this.authService.currentUser()?.userId;
  }

  get currentUserEmail(): string | undefined {
    return this.authService.currentUser()?.email?.toLowerCase();
  }

  get otherCollaborators(): CollaboratorDto[] {
    if (!this.note?.collaborators) return [];
    const myId = this.currentUserId;
    const myEmail = this.currentUserEmail;
    return this.note.collaborators.filter(c => {
      if (myId && c.userId === myId) return false;
      if (myEmail && c.email?.toLowerCase() === myEmail) return false;
      return true;
    });
  }

  get shouldShowOwnerAvatar(): boolean {
    if (!this.note || this.note.isOwner) return false;
    if (!this.note.ownerEmail) return false;
    const myId = this.currentUserId;
    const myEmail = this.currentUserEmail;
    if (myId && this.note.ownerId === myId) return false;
    if (myEmail && this.note.ownerEmail.toLowerCase() === myEmail) return false;
    return true;
  }

  get hasVisibleAvatars(): boolean {
    return this.shouldShowOwnerAvatar || this.otherCollaborators.length > 0;
  }

  openCollaboratorsModal(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.showColorPalette = false;
    this.showReminderPopup = false;
    this.showLabelPopup = false;
    this.openCollaborators.emit(this.note);
  }

  getInitial(nameOrEmail?: string): string {
    if (!nameOrEmail) return '?';
    return nameOrEmail.trim().charAt(0).toUpperCase();
  }

  getAvatarBgColor(str?: string): string {
    if (!str) return '#5f6368';
    const avatarColors = [
      '#e8710a', '#1a73e8', '#129eaf', '#9334e6', 
      '#d93025', '#188038', '#f29900', '#e52592', '#5f6368'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  }

  onTriggerLock(event: Event): void {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.requestLock.emit({ note: this.note, mode: 'lock' });
  }

  onTriggerRemoveLock(event: Event): void {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.requestLock.emit({ note: this.note, mode: 'remove-lock' });
  }

  onOpenPublicShare(event: Event): void {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.openPublicShare.emit(this.note);
  }

  onOpenDrawing(event: Event): void {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.openDrawing.emit(this.note);
  }
}
