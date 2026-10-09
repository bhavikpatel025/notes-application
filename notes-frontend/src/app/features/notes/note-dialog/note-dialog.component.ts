import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, inject, HostListener, ElementRef } from '@angular/core';
import { NoteDto, TodoItemDto, CollaboratorDto } from '../../../shared/models/note.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { ReminderPopupComponent, ReminderResult } from '../reminder-popup/reminder-popup.component';
import { ReminderFormatPipe } from '../../../shared/pipes/reminder-format.pipe';
import { EditedFormatPipe } from '../../../shared/pipes/edited-format.pipe';
import { LabelDto } from '../../../shared/models/label.model';
import { TextFieldModule } from '@angular/cdk/text-field';
import { VersionHistoryModalComponent } from '../version-history-modal/version-history-modal.component';
import { CollaboratorsModalComponent } from '../collaborators-modal/collaborators-modal.component';
import { AuthService } from '../../../core/services/auth.service';

export interface NoteEditorState {
  title: string;
  content: string;
  color: string;
  isArchived: boolean;
  isChecklist: boolean;
  todoItems: TodoItemDto[];
  imageUrls: string[];
  labels: LabelDto[];
  reminderDateTime: string | null;
  reminderRepeat: number | null;
  clearReminder: boolean;
}

@Component({
  selector: 'app-note-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, LabelSelectionPopupComponent, ReminderPopupComponent, ReminderFormatPipe, EditedFormatPipe, TextFieldModule, VersionHistoryModalComponent, CollaboratorsModalComponent],
  templateUrl: './note-dialog.component.html',
  styleUrl: './note-dialog.component.scss'
})
export class NoteDialogComponent implements OnInit, OnChanges {
  @Input({ required: true }) note!: NoteDto;
  @Output() closeDialog = new EventEmitter<void>();
  @Output() saveNote = new EventEmitter<Partial<NoteDto>>();
  @Output() requestLock = new EventEmitter<{ note: NoteDto, mode: 'lock' | 'unlock' | 'remove-lock' }>();
  @Output() openPublicShare = new EventEmitter<NoteDto>();
  @Output() openDrawing = new EventEmitter<NoteDto>();

  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);
  private noteService = inject(NoteService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  editForm!: FormGroup;
  showDialogColorPalette = false;
  showMoreMenu = false;
  showLabelPopup = false;
  showReminderPopup = false;
  showVersionHistoryModal = false;
  showCollaboratorsModal = false;
  openDirection: 'up' | 'down' = 'up';
  openHorizontalDirection: 'left' | 'right' = 'left';

  // Undo / Redo History Stack
  undoStack: NoteEditorState[] = [];
  redoStack: NoteEditorState[] = [];
  private initialSnapshot!: NoteEditorState;
  private isPerformingUndoRedo = false;
  private debounceTimer: any = null;

  // Reminder State
  reminderDateTime: string | null = null;
  reminderRepeat: number | null = null;
  clearReminder = false;

  // Checklist state
  isChecklist = false;
  todoItems: TodoItemDto[] = [];
  newTodoText = '';
  showCompleted = true;
  showHideCheckboxesModal = false;

  // Real-time Edited Timestamp state
  currentUpdatedAt: string = '';

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

  private updateOpenDirection(event: Event, estimatedHeight = 300, estimatedWidth = 220, defaultHorizontal: 'left' | 'right' = 'left') {
    const target = (event.target as HTMLElement).closest('.icon-btn, .reminder-chip, .more-container, .palette-container, .reminder-container, button') || (event.target as HTMLElement);
    const rect = target.getBoundingClientRect();
    
    // Vertical direction: Prefer 'up' since toolbar is at bottom of modal
    const spaceAbove = rect.top - 70;
    const spaceBelow = window.innerHeight - rect.bottom - 10;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && !changes['note'].firstChange) {
      if (this.editForm && this.note.imageUrls) {
        this.editForm.patchValue({ imageUrls: [...this.note.imageUrls] }, { emitEvent: false });
      }
    }
  }

  ngOnInit() {
    this.isChecklist = this.note.type === 1 || (this.note.todoItems && this.note.todoItems.length > 0) || false;
    this.todoItems = this.note.todoItems ? JSON.parse(JSON.stringify(this.note.todoItems)) : [];
    this.reminderDateTime = this.note.reminderDateTime || null;
    this.reminderRepeat = this.note.reminderRepeat || 0;
    this.clearReminder = false;
    this.currentUpdatedAt = this.note.updatedAt || this.note.createdAt || new Date().toISOString();

    this.editForm = this.fb.group({
      title: [this.note.title || ''],
      content: [this.note.content || ''],
      color: [this.note.color || '#FFFFFF'],
      imageUrls: [this.note.imageUrls ? [...this.note.imageUrls] : []],
      isArchived: [this.note.isArchived]
    });

    // Capture initial state snapshot for undo/redo and dirty-checking
    this.initialSnapshot = this.getCurrentSnapshot();
    this.undoStack = [this.initialSnapshot];
    this.redoStack = [];

    this.editForm.valueChanges.subscribe(() => {
      if (!this.isPerformingUndoRedo) {
        this.pushState(false);
      }
    });
  }

  get hasChanges(): boolean {
    if (!this.initialSnapshot) return false;
    return !this.isStateEqual(this.initialSnapshot, this.getCurrentSnapshot());
  }

  get canUndo(): boolean {
    if (this.undoStack.length > 1) return true;
    if (this.undoStack.length === 1) {
      const current = this.getCurrentSnapshot();
      return !this.isStateEqual(this.undoStack[0], current);
    }
    return false;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private getCurrentSnapshot(): NoteEditorState {
    return {
      title: this.editForm?.get('title')?.value || '',
      content: this.editForm?.get('content')?.value || '',
      color: this.editForm?.get('color')?.value || '#FFFFFF',
      isArchived: !!this.editForm?.get('isArchived')?.value,
      isChecklist: this.isChecklist,
      todoItems: JSON.parse(JSON.stringify(this.todoItems || [])),
      imageUrls: [...(this.editForm?.get('imageUrls')?.value || [])],
      labels: [...(this.note.labels || [])],
      reminderDateTime: this.reminderDateTime,
      reminderRepeat: this.reminderRepeat,
      clearReminder: this.clearReminder
    };
  }

  private isStateEqual(a: NoteEditorState, b: NoteEditorState): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  pushState(immediate = false) {
    if (this.isPerformingUndoRedo) return;

    const takeSnapshot = () => {
      const current = this.getCurrentSnapshot();
      const last = this.undoStack[this.undoStack.length - 1];
      if (!last || !this.isStateEqual(last, current)) {
        this.undoStack.push(current);
        this.redoStack = []; // Reset redo on new change
        this.markAsEdited();
      }
    };

    if (immediate) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      takeSnapshot();
    } else {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        takeSnapshot();
        this.debounceTimer = null;
      }, 350);
    }
  }

  undo() {
    if (!this.canUndo) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      const current = this.getCurrentSnapshot();
      const last = this.undoStack[this.undoStack.length - 1];
      if (!last || !this.isStateEqual(last, current)) {
        this.undoStack.push(current);
      }
    }

    if (this.undoStack.length <= 1) return;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    this.applyState(previous);
  }

  redo() {
    if (!this.canRedo) return;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.applyState(next);
  }

  private applyState(state: NoteEditorState) {
    this.isPerformingUndoRedo = true;

    this.isChecklist = state.isChecklist;
    this.todoItems = JSON.parse(JSON.stringify(state.todoItems || []));
    this.reminderDateTime = state.reminderDateTime;
    this.reminderRepeat = state.reminderRepeat;
    this.clearReminder = state.clearReminder;
    this.note.labels = [...(state.labels || [])];

    this.editForm.patchValue({
      title: state.title,
      content: state.content,
      color: state.color,
      isArchived: state.isArchived,
      imageUrls: [...state.imageUrls]
    }, { emitEvent: false });

    if (this.initialSnapshot && this.isStateEqual(state, this.initialSnapshot)) {
      this.currentUpdatedAt = this.note.updatedAt || this.note.createdAt || new Date().toISOString();
    } else {
      this.markAsEdited();
    }

    setTimeout(() => {
      this.isPerformingUndoRedo = false;
    }, 0);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.showVersionHistoryModal || this.showHideCheckboxesModal) return;

    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    if (isCtrlOrCmd) {
      if (event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          event.preventDefault();
          this.redo();
        } else {
          event.preventDefault();
          this.undo();
        }
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        this.redo();
      }
    }
  }

  markAsEdited() {
    this.currentUpdatedAt = new Date().toISOString();
  }

  getCreatedTooltip(): string {
    const timeStr = this.note.createdAt || this.note.updatedAt;
    if (!timeStr) return '';
    let parseable = timeStr;
    if (typeof parseable === 'string' && !parseable.endsWith('Z') && !parseable.includes('+')) {
      parseable += 'Z';
    }
    const date = new Date(parseable);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isCurrentYear ? undefined : 'numeric'
    });

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `Created ${formattedDate}, ${formattedTime}`;
  }

  get uncompletedTodoItems(): TodoItemDto[] {
    return this.todoItems.filter(t => !t.isCompleted);
  }

  get completedTodoItems(): TodoItemDto[] {
    return this.todoItems.filter(t => t.isCompleted);
  }

  uncheckAllItems() {
    this.todoItems = this.todoItems.map(t => ({ ...t, isCompleted: false }));
    this.showMoreMenu = false;
    this.pushState(true);
  }

  deleteCheckedItems() {
    this.todoItems = this.todoItems.filter(t => !t.isCompleted);
    this.showMoreMenu = false;
    this.pushState(true);
  }

  onHideCheckboxesClick() {
    this.showMoreMenu = false;
    if (this.completedTodoItems.length > 0) {
      this.showHideCheckboxesModal = true;
    } else {
      this.convertToChecklistOrText(false);
    }
  }

  confirmHideCheckboxes(deleteChecked: boolean) {
    this.showHideCheckboxesModal = false;
    this.convertToChecklistOrText(deleteChecked);
  }

  cancelHideCheckboxes() {
    this.showHideCheckboxesModal = false;
  }

  convertToChecklistOrText(deleteChecked: boolean) {
    if (this.isChecklist) {
      // Converting checklist to text
      let items = this.todoItems;
      if (deleteChecked) {
        items = items.filter(t => !t.isCompleted);
      }
      const text = items.map(t => t.text).join('\n');
      this.editForm.patchValue({ content: text }, { emitEvent: false });
      this.todoItems = [];
      this.isChecklist = false;
    } else {
      // Converting text to checklist
      const text = this.editForm.get('content')?.value || '';
      if (text.trim()) {
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        this.todoItems = lines.map((line: string, index: number) => ({
          text: line.trim(),
          isCompleted: false,
          orderIndex: index
        }));
        this.editForm.patchValue({ content: '' }, { emitEvent: false });
      }
      this.isChecklist = true;
    }
    this.showMoreMenu = false;
    this.pushState(true);
  }

  addTodoItem() {
    if (!this.newTodoText.trim()) return;
    this.todoItems.push({
      text: this.newTodoText.trim(),
      isCompleted: false,
      orderIndex: this.todoItems.length
    });
    this.newTodoText = '';
    this.pushState(true);
  }

  onNewTodoKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTodoItem();
    }
  }

  onTodoItemKeydown(event: KeyboardEvent, item: TodoItemDto, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Focus on new todo input or insert next item
      const nextIndex = this.todoItems.indexOf(item) + 1;
      this.todoItems.splice(nextIndex, 0, {
        text: '',
        isCompleted: false,
        orderIndex: nextIndex
      });
      this.pushState(true);
      setTimeout(() => {
        const inputs = this.elementRef.nativeElement.querySelectorAll('.todo-item-input');
        if (inputs && inputs[nextIndex]) {
          (inputs[nextIndex] as HTMLInputElement).focus();
        }
      }, 50);
    } else if (event.key === 'Backspace' && (!item.text || item.text.length === 0)) {
      event.preventDefault();
      this.removeTodoItem(item);
    }
  }

  toggleTodoItem(item: TodoItemDto) {
    item.isCompleted = !item.isCompleted;
    this.pushState(true);
  }

  removeTodoItem(item: TodoItemDto) {
    this.todoItems = this.todoItems.filter(t => t !== item);
    this.pushState(true);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.showDialogColorPalette && !this.elementRef.nativeElement.querySelector('.palette-container')?.contains(target)) {
      this.showDialogColorPalette = false;
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
    this.showDialogColorPalette = false;
    this.showMoreMenu = false;
    this.showLabelPopup = false;
    this.showReminderPopup = false;
  }

  toggleReminderPopup(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 320, 290, 'left');
    const wasOpen = this.showReminderPopup;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showReminderPopup = !wasOpen;
  }

  openReminderFromChip(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 320, 290, 'left');
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showReminderPopup = true;
  }

  onReminderSet(result: ReminderResult) {
    this.reminderDateTime = result.reminderDateTime;
    this.reminderRepeat = result.reminderRepeat;
    this.clearReminder = false;
    this.showReminderPopup = false;
    this.pushState(true);
  }

  removeReminder(event?: Event) {
    if (event) event.stopPropagation();
    this.reminderDateTime = null;
    this.reminderRepeat = null;
    this.clearReminder = true;
    this.showReminderPopup = false;
    this.pushState(true);
  }

  toggleDialogColorPalette(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 150, 280, 'left');
    const wasOpen = this.showDialogColorPalette;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showDialogColorPalette = !wasOpen;
  }

  toggleMoreMenu(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 250, 180, 'right');
    const wasOpen = this.showMoreMenu;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showMoreMenu = !wasOpen;
  }

  openLabelPopup(event: Event) {
    event.stopPropagation();
    this.updateOpenDirection(event, 260, 225, 'right');
    this.showMoreMenu = false;
    this.showLabelPopup = true;
  }

  onMakeCopy(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;

    const copyData: Partial<NoteDto> = {
      title: this.editForm.value.title || '',
      content: this.editForm.value.content || '',
      color: this.editForm.value.color || '#FFFFFF',
      type: this.isChecklist ? 1 : 0,
      todoItems: this.isChecklist ? this.todoItems.map(item => ({
        text: item.text,
        isCompleted: item.isCompleted,
        orderIndex: item.orderIndex
      })) : [],
      imageUrls: this.editForm.value.imageUrls ? [...this.editForm.value.imageUrls] : [],
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

    // Close the dialog after copying
    this.closeDialog.emit();
  }

  onCopyToGoogleDocs(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;

    const currentNoteData: Partial<NoteDto> = {
      title: this.editForm.value.title || '',
      content: this.editForm.value.content || '',
      color: this.editForm.value.color || '#FFFFFF',
      type: this.isChecklist ? 1 : 0,
      todoItems: this.isChecklist ? this.todoItems : [],
      imageUrls: this.editForm.value.imageUrls || [],
      labels: this.note.labels || []
    };

    this.noteService.copyToGoogleDocs(currentNoteData);
  }

  openVersionHistory(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.showVersionHistoryModal = true;
  }

  onLabelsChanged(labels: LabelDto[]) {
    this.note.labels = labels;
    this.pushState(true);
  }

  removeLabel(labelId: string, event: Event) {
    event.stopPropagation();
    this.note.labels = (this.note.labels || []).filter(l => l.id !== labelId);
    this.pushState(true);
  }

  onClose() {
    // If user was typing a new todo item without pressing enter, save it
    if (this.newTodoText.trim()) {
      this.addTodoItem();
    }

    if (this.hasChanges) {
      const updatedValues = this.editForm.value;
      const labelIds = (this.note.labels || []).map(l => l.id);

      this.saveNote.emit({
        id: this.note.id,
        ...updatedValues,
        type: this.isChecklist ? 1 : 0,
        reminderDateTime: this.reminderDateTime,
        reminderRepeat: this.reminderRepeat,
        clearReminder: this.clearReminder,
        todoItems: this.isChecklist ? this.todoItems : [],
        labels: this.note.labels,
        labelIds: labelIds
      });
    }

    this.closeDialog.emit();
  }

  onArchive() {
    const current = this.editForm.get('isArchived')?.value;
    this.editForm.patchValue({ isArchived: !current });
    this.markAsEdited();
    this.onClose(); // Automatically save and close when archiving
  }

  onDelete() {
    const labelIds = (this.note.labels || []).map(l => l.id);
    this.saveNote.emit({
      ...this.note,
      ...this.editForm.value,
      type: this.isChecklist ? 1 : 0,
      todoItems: this.isChecklist ? this.todoItems : [],
      labelIds: labelIds,
      isTrashed: true,
      isPinned: false
    });
    this.closeDialog.emit();
  }

  onRemoveMyself() {
    const currentUserId = this.authService.currentUser()?.userId;
    if (!currentUserId) return;

    this.noteService.removeCollaborator(this.note.id, currentUserId).subscribe({
      next: () => {
        this.toastService.show({ message: 'Removed from note' }, 3000);
        this.closeDialog.emit();
      },
      error: () => {
        this.toastService.show({ message: 'Failed to remove from note' }, 3000);
      }
    });
  }

  changeColor(colorValue: string, event: Event) {
    event.stopPropagation();
    this.editForm.patchValue({ color: colorValue });
    this.showDialogColorPalette = false;
    this.pushState(true);
  }

  // Prevent closing when clicking inside the modal
  onModalClick(event: Event) {
    event.stopPropagation();
  }

  triggerFileInput(fileInput: HTMLInputElement, event: Event) {
    event.stopPropagation();
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const currentImages: string[] = this.editForm.get('imageUrls')?.value || [];
    
    // Check limit
    if (currentImages.length + input.files.length > 5) {
      this.toastService.show({ message: "Can’t upload this file. Maximum 5 images allowed per note." });
      return;
    }

    Array.from(input.files).forEach(file => {
      this.noteService.uploadImage(file).subscribe({
        next: (res) => {
          const images = this.editForm.get('imageUrls')?.value || [];
          this.editForm.patchValue({ imageUrls: [...images, res.url] });
          this.pushState(true);
        },
        error: (err) => {
          const msg = err.error?.message || "Can’t upload this file. We accept GIF, JPEG, JPG, PNG files less than 10MB and 25 megapixels.";
          this.toastService.show({ message: msg });
        }
      });
    });

    input.value = '';
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    const currentImages: string[] = [...(this.editForm.get('imageUrls')?.value || [])];
    currentImages.splice(index, 1);
    this.editForm.patchValue({ imageUrls: currentImages });
    this.pushState(true);
  }

  openCollaboratorsModal(event?: Event) {
    if (event) event.stopPropagation();
    this.showMoreMenu = false;
    this.showDialogColorPalette = false;
    this.showReminderPopup = false;
    this.showLabelPopup = false;
    this.showCollaboratorsModal = true;
  }

  onCollaboratorsUpdated(updatedNote: NoteDto) {
    this.note = { ...this.note, ...updatedNote };
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

  onTriggerLock(): void {
    this.showMoreMenu = false;
    this.requestLock.emit({ note: this.note, mode: 'lock' });
  }

  onTriggerRemoveLock(): void {
    this.showMoreMenu = false;
    this.requestLock.emit({ note: this.note, mode: 'remove-lock' });
  }

  onOpenPublicShare(): void {
    this.showMoreMenu = false;
    this.openPublicShare.emit(this.note);
  }

  onOpenDrawing(): void {
    this.showMoreMenu = false;
    this.openDrawing.emit(this.note);
  }
}
