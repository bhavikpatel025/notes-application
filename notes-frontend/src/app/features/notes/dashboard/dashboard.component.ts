import { Component, inject, OnInit, HostListener, ElementRef, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NoteService } from '../../../core/services/note.service';
import { LabelService } from '../../../core/services/label.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { NoteCardComponent } from '../note-card/note-card.component';
import { NoteDialogComponent } from '../note-dialog/note-dialog.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { NoteDto, TodoItemDto } from '../../../shared/models/note.model';
import { LabelDto } from '../../../shared/models/label.model';
import { TextFieldModule } from '@angular/cdk/text-field';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { EditLabelsModalComponent } from '../edit-labels-modal/edit-labels-modal.component';
import { ReminderPopupComponent, ReminderResult } from '../reminder-popup/reminder-popup.component';
import { ReminderFormatPipe } from '../../../shared/pipes/reminder-format.pipe';
import { ReminderNotificationService } from '../../../core/services/reminder-notification.service';
import { VersionHistoryModalComponent } from '../version-history-modal/version-history-modal.component';
import { CollaboratorsModalComponent } from '../collaborators-modal/collaborators-modal.component';
import { SignalRService } from '../../../core/services/signalr.service';

import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDto } from '../../../shared/models/notification.model';
import { PinModalComponent } from '../pin-modal/pin-modal.component';
import { PublicShareModalComponent } from '../public-share-modal/public-share-modal.component';
import { DrawingCanvasComponent } from '../drawing-canvas/drawing-canvas.component';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';
import { DeleteAccountModalComponent } from '../delete-account-modal/delete-account-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NoteCardComponent, NoteDialogComponent, ToastComponent, ReactiveFormsModule, FormsModule, UpperCasePipe, DragDropModule, EditLabelsModalComponent, TextFieldModule, LabelSelectionPopupComponent, ReminderPopupComponent, ReminderFormatPipe, TimeAgoPipe, VersionHistoryModalComponent, CollaboratorsModalComponent, PinModalComponent, PublicShareModalComponent, DrawingCanvasComponent, ChangePasswordModalComponent, DeleteAccountModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  noteService = inject(NoteService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  labelService = inject(LabelService);
  reminderNotificationService = inject(ReminderNotificationService);
  signalRService = inject(SignalRService);
  notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);
  
  // State
  noteForm: FormGroup;
  isExpanded = false;
  selectedNote: NoteDto | null = null;
  versionHistoryNote: NoteDto | null = null;
  collaboratorsNote: NoteDto | null = null;
  sharedPromptNote: NoteDto | null = null;
  pinModalData: { note: NoteDto; mode: 'lock' | 'unlock' | 'remove-lock' } | null = null;
  publicShareNote: NoteDto | null = null;
  drawingTarget: { note?: NoteDto; isNewNote: boolean } | null = null;
  currentView: 'notes' | 'archive' | 'trash' | 'reminders' | string = 'notes';
  isDarkMode = signal(true);
  showSettingsMenu = false;
  showProfileMenu = false;
  showSettingsSubmenu = false;
  showChangePasswordModal = false;
  showDeleteAccountModal = false;
  showNotificationMenu = false;
  showEmptyTrashModal = false;
  showEditLabelsModal = false;
  showCreatorColorPalette = false;
  showCreatorMoreMenu = false;
  showCreatorLabelPopup = false;
  showCreatorReminderPopup = false;
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  isMobileSearchActive = false;

  // Creator Reminder State
  creatorReminderDateTime: string | null = null;
  creatorReminderRepeat: number | null = null;

  // Checklist State in Note Creator
  isCreatorChecklist = false;
  creatorTodoItems: TodoItemDto[] = [];
  newCreatorTodoText = '';
  showCreatorCompleted = true;
  showCreatorHideCheckboxesModal = false;

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

  constructor() {
    this.noteForm = this.fb.group({
      title: [''],
      content: [''],
      color: ['#FFFFFF'],
      imageUrls: [[]],
      labels: [[]]
    });

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.isDarkMode.set(false);
      document.body.classList.add('light-theme');
    }
  }

  ngOnInit(): void {
    this.noteService.loadNotes();
    this.labelService.loadLabels().subscribe();
    this.reminderNotificationService.init();

    this.signalRService.noteUpdated$.subscribe(updatedNote => {
      if (this.selectedNote && this.selectedNote.id === updatedNote.id) {
        this.selectedNote = { ...this.selectedNote, ...updatedNote };
      }
    });

    this.signalRService.noteDeleted$.subscribe(deletedNoteId => {
      if (this.selectedNote && this.selectedNote.id === deletedNoteId) {
        this.selectedNote = null;
        this.toastService.show({ message: 'The note was deleted or you were removed as a collaborator' }, 4000);
      }
    });

    this.notificationService.openNoteFromNotification$.subscribe((noteId: string) => {
      const note = this.noteService.allNotes().find(n => n.id === noteId);
      if (note) {
        if (note.isLocked) {
          this.openPinModal(note, 'unlock');
        } else {
          this.selectedNote = note;
        }
      } else {
        this.noteService.getNoteById(noteId).subscribe({
          next: (n) => {
            if (n.isLocked) {
              this.openPinModal(n, 'unlock');
            } else {
              this.selectedNote = n;
            }
          },
          error: () => this.toastService.show({ message: 'Note not found or deleted' })
        });
      }
    });

    // Deep link query param handler (from Email invite / notifications)
    this.route.queryParams.subscribe(params => {
      const sharedNoteId = params['openSharedNoteId'];
      if (sharedNoteId) {
        this.handleDeepLinkedSharedNote(sharedNoteId);
      }
    });
  }

  get uncompletedCreatorTodoItems(): TodoItemDto[] {
    return this.creatorTodoItems.filter(t => !t.isCompleted);
  }

  get completedCreatorTodoItems(): TodoItemDto[] {
    return this.creatorTodoItems.filter(t => t.isCompleted);
  }

  expandFormAsChecklist() {
    this.isExpanded = true;
    this.isCreatorChecklist = true;
    this.creatorTodoItems = [];
    this.newCreatorTodoText = '';
  }

  uncheckAllCreatorItems() {
    this.creatorTodoItems = this.creatorTodoItems.map(t => ({ ...t, isCompleted: false }));
    this.showCreatorMoreMenu = false;
  }

  deleteCheckedCreatorItems() {
    this.creatorTodoItems = this.creatorTodoItems.filter(t => !t.isCompleted);
    this.showCreatorMoreMenu = false;
  }

  onCreatorHideCheckboxesClick() {
    this.showCreatorMoreMenu = false;
    if (this.completedCreatorTodoItems.length > 0) {
      this.showCreatorHideCheckboxesModal = true;
    } else {
      this.convertCreatorChecklistOrText(false);
    }
  }

  confirmCreatorHideCheckboxes(deleteChecked: boolean) {
    this.showCreatorHideCheckboxesModal = false;
    this.convertCreatorChecklistOrText(deleteChecked);
  }

  cancelCreatorHideCheckboxes() {
    this.showCreatorHideCheckboxesModal = false;
  }

  convertCreatorChecklistOrText(deleteChecked: boolean) {
    if (this.isCreatorChecklist) {
      let items = this.creatorTodoItems;
      if (deleteChecked) {
        items = items.filter(t => !t.isCompleted);
      }
      const text = items.map(t => t.text).join('\n');
      this.noteForm.patchValue({ content: text });
      this.creatorTodoItems = [];
      this.isCreatorChecklist = false;
    } else {
      const text = this.noteForm.get('content')?.value || '';
      if (text.trim()) {
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        this.creatorTodoItems = lines.map((line: string, index: number) => ({
          text: line.trim(),
          isCompleted: false,
          orderIndex: index
        }));
        this.noteForm.patchValue({ content: '' });
      }
      this.isCreatorChecklist = true;
    }
    this.showCreatorMoreMenu = false;
  }

  addCreatorTodoItem() {
    if (!this.newCreatorTodoText.trim()) return;
    this.creatorTodoItems.push({
      text: this.newCreatorTodoText.trim(),
      isCompleted: false,
      orderIndex: this.creatorTodoItems.length
    });
    this.newCreatorTodoText = '';
  }

  onNewCreatorTodoKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCreatorTodoItem();
    }
  }

  onCreatorTodoItemKeydown(event: KeyboardEvent, item: TodoItemDto, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = this.creatorTodoItems.indexOf(item) + 1;
      this.creatorTodoItems.splice(nextIndex, 0, {
        text: '',
        isCompleted: false,
        orderIndex: nextIndex
      });
      setTimeout(() => {
        const inputs = this.elementRef.nativeElement.querySelectorAll('.creator-todo-input');
        if (inputs && inputs[nextIndex]) {
          (inputs[nextIndex] as HTMLInputElement).focus();
        }
      }, 50);
    } else if (event.key === 'Backspace' && (!item.text || item.text.length === 0)) {
      event.preventDefault();
      this.removeCreatorTodoItem(item);
    }
  }

  toggleCreatorTodoItem(item: TodoItemDto) {
    item.isCompleted = !item.isCompleted;
  }

  removeCreatorTodoItem(item: TodoItemDto) {
    this.creatorTodoItems = this.creatorTodoItems.filter(t => t !== item);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    // 1. Close Notification Menu
    if (this.showNotificationMenu && !target.closest('.notification-menu-container')) {
      this.showNotificationMenu = false;
    }

    // 2. Close Settings Menu
    if (this.showSettingsMenu && !target.closest('.settings-menu-container')) {
      this.showSettingsMenu = false;
    }

    // 3. Close Profile Menu
    if (this.showProfileMenu && !target.closest('.profile-menu-container')) {
      this.showProfileMenu = false;
    }

    // 4. Auto-save and close Note Creator when clicking outside
    if (this.isExpanded && !target.closest('.note-creator') && !target.closest('.modal-overlay') && !target.closest('.collaborator-modal-overlay') && !target.closest('.custom-datepicker-popup') && !target.closest('.custom-timepicker-popup')) {
      this.closeForm();
    }

    // 5. Close Note Creator Color Palette
    if (this.showCreatorColorPalette && !target.closest('.palette-container') && !target.closest('.color-palette-menu')) {
      this.showCreatorColorPalette = false;
    }

    // 6. Close Note Creator More Menu & Label Popup
    if (this.showCreatorMoreMenu && !target.closest('.creator-more-container') && !target.closest('.more-menu')) {
      this.showCreatorMoreMenu = false;
    }
    if (this.showCreatorLabelPopup && !target.closest('.creator-more-container') && !target.closest('.label-popup-container')) {
      this.showCreatorLabelPopup = false;
    }

    // 7. Close Note Creator Reminder Popup
    if (this.showCreatorReminderPopup && !target.closest('.creator-reminder-container') && !target.closest('.reminder-popup-container') && !target.closest('.reminder-chip')) {
      this.showCreatorReminderPopup = false;
    }
  }

  @HostListener('document:closeMenus')
  onCloseMenus() {
    this.showCreatorColorPalette = false;
    this.showCreatorMoreMenu = false;
    this.showCreatorLabelPopup = false;
    this.showCreatorReminderPopup = false;
  }

  toggleCreatorReminderPopup(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showCreatorReminderPopup;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showCreatorReminderPopup = !wasOpen;
  }

  openCreatorReminderFromChip(event: Event) {
    event.stopPropagation();
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showCreatorReminderPopup = true;
  }

  onCreatorReminderSet(result: ReminderResult) {
    this.creatorReminderDateTime = result.reminderDateTime;
    this.creatorReminderRepeat = result.reminderRepeat;
    this.showCreatorReminderPopup = false;
    this.isExpanded = true;
  }

  removeCreatorReminder(event?: Event) {
    if (event) event.stopPropagation();
    this.creatorReminderDateTime = null;
    this.creatorReminderRepeat = null;
    this.showCreatorReminderPopup = false;
  }

  toggleCreatorColorPalette(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showCreatorColorPalette;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showCreatorColorPalette = !wasOpen;
  }

  toggleCreatorMoreMenu(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showCreatorMoreMenu;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showCreatorMoreMenu = !wasOpen;
  }

  openCreatorLabelPopup(event: Event) {
    event.stopPropagation();
    this.showCreatorMoreMenu = false;
    this.showCreatorLabelPopup = true;
  }

  onCreatorLabelsChanged(labels: LabelDto[]) {
    this.noteForm.patchValue({ labels });
  }

  removeCreatorLabel(labelId: string, event: Event) {
    event.stopPropagation();
    const currentLabels: LabelDto[] = this.noteForm.get('labels')?.value || [];
    this.noteForm.patchValue({ 
      labels: currentLabels.filter(l => l.id !== labelId) 
    });
  }

  changeCreatorColor(colorValue: string, event: Event) {
    event.stopPropagation();
    this.noteForm.patchValue({ color: colorValue });
    this.showCreatorColorPalette = false;
  }

  expandForm() {
    this.isExpanded = true;
  }

  closeForm() {
    if (this.newCreatorTodoText.trim()) {
      this.addCreatorTodoItem();
    }

    const title = (this.noteForm.get('title')?.value || '').trim();
    const content = (this.noteForm.get('content')?.value || '').trim();
    const images = this.noteForm.get('imageUrls')?.value || [];
    const labels = this.noteForm.get('labels')?.value || [];
    
    if (title || content || images.length > 0 || this.creatorTodoItems.length > 0 || this.creatorReminderDateTime || labels.length > 0) {
      this.createNote();
    }
    this.isExpanded = false;
    this.isCreatorChecklist = false;
    this.creatorTodoItems = [];
    this.newCreatorTodoText = '';
    this.creatorReminderDateTime = null;
    this.creatorReminderRepeat = null;
    this.showCreatorColorPalette = false;
    this.showCreatorMoreMenu = false;
    this.showCreatorLabelPopup = false;
    this.showCreatorReminderPopup = false;
    this.noteForm.reset({ title: '', content: '', color: '#FFFFFF', imageUrls: [], labels: [] });
  }

  triggerFileInput(fileInput: HTMLInputElement, event: Event) {
    event.stopPropagation();
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const currentImages: string[] = this.noteForm.get('imageUrls')?.value || [];
    
    // Check limit
    if (currentImages.length + input.files.length > 5) {
      this.toastService.show({ message: "Can’t upload this file. Maximum 5 images allowed per note." });
      return;
    }

    // Since we want to upload multiple files and keep UI responsive, we process them one by one
    Array.from(input.files).forEach(file => {
      this.noteService.uploadImage(file).subscribe({
        next: (res) => {
          const images = this.noteForm.get('imageUrls')?.value || [];
          this.noteForm.patchValue({ imageUrls: [...images, res.url] });
          // Ensure form stays expanded
          this.isExpanded = true;
        },
        error: (err) => {
          const msg = err.error?.message || "Can’t upload this file. We accept GIF, JPEG, JPG, PNG files less than 10MB and 25 megapixels.";
          this.toastService.show({ message: msg });
        }
      });
    });

    // Reset input so the same file can be selected again
    input.value = '';
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    const currentImages: string[] = this.noteForm.get('imageUrls')?.value || [];
    currentImages.splice(index, 1);
    this.noteForm.patchValue({ imageUrls: currentImages });
  }

  createNote() {
    if (this.noteForm.invalid) return;
    const noteData = { ...this.noteForm.value };
    noteData.title = noteData.title || '';
    noteData.content = noteData.content || '';
    noteData.type = this.isCreatorChecklist ? 1 : 0;
    noteData.todoItems = this.isCreatorChecklist ? this.creatorTodoItems : [];
    noteData.reminderDateTime = this.creatorReminderDateTime;
    noteData.reminderRepeat = this.creatorReminderRepeat;
    
    if (this.isLabelView) {
      const currentLabelName = this.currentView;
      const currentLabel = this.labelService.labels().find((l: LabelDto) => l.name === currentLabelName);
      if (currentLabel) {
        // Only append if it's not already in the array
        if (!noteData.labels) noteData.labels = [];
        if (!noteData.labels.some((l: LabelDto) => l.id === currentLabel.id)) {
          noteData.labels.push(currentLabel);
        }
      }
    }
    
    this.noteService.createNote(noteData).subscribe();
  }

  onDeleteNote(id: string) {
    this.noteService.deleteNote(id).subscribe();
  }

  onUpdateNote(updatedNote: NoteDto) {
    // Find original note to allow Undo
    const originalNote = this.noteService.allNotes().find(n => n.id === updatedNote.id);
    
    // Call the API to update
    this.noteService.updateNote(updatedNote.id, updatedNote).subscribe();

    if (originalNote) {
      let msg = '';
      if (updatedNote.isTrashed && !originalNote.isTrashed) {
        msg = 'Note trashed';
      } else if (updatedNote.isArchived && !originalNote.isArchived) {
        msg = 'Note archived';
      } else if (!updatedNote.isArchived && originalNote.isArchived) {
        msg = 'Note unarchived';
      }
      
      if (msg) {
        // We inject ToastService dynamically or via constructor
        this.toastService.show({
          message: msg,
          actionLabel: 'Undo',
          action: () => {
            // Revert back using originalNote state
            this.noteService.updateNote(originalNote.id, originalNote).subscribe();
          }
        });
      }
    }
  }

  // Trash Logic
  confirmEmptyTrash() {
    this.noteService.emptyTrash().subscribe({
      next: () => {
        this.showEmptyTrashModal = false;
      }
    });
  }

  // Dialog methods
  onNoteCardClick(note: NoteDto) {
    if (note.isPendingAcceptance) {
      this.sharedPromptNote = note;
    } else if (note.isLocked) {
      this.openPinModal(note, 'unlock');
    } else {
      this.openNoteDialog(note);
    }
  }

  closeSharedPromptModal() {
    this.sharedPromptNote = null;
  }

  onAcceptSharedNote(note: NoteDto) {
    this.noteService.acceptSharedNote(note.id).subscribe({
      next: (acceptedNote) => {
        this.sharedPromptNote = null;
        this.openNoteDialog(acceptedNote);
      },
      error: () => {
        this.toastService.show({ message: 'Failed to open note' });
      }
    });
  }

  onDeclineSharedNote(note: NoteDto) {
    const currentUserId = this.authService.currentUser()?.userId;
    if (!currentUserId) return;

    this.noteService.removeCollaborator(note.id, currentUserId).subscribe({
      next: () => {
        this.sharedPromptNote = null;
        this.toastService.show({ message: 'Note deleted' });
      },
      error: () => {
        this.toastService.show({ message: 'Failed to delete note' });
      }
    });
  }

  handleDeepLinkedSharedNote(noteId: string) {
    // Clear the query parameter from URL to prevent re-opening on page refresh
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openSharedNoteId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    const checkAndOpen = (note: NoteDto) => {
      if (note.isPendingAcceptance) {
        this.sharedPromptNote = note;
      } else if (note.isLocked) {
        this.openPinModal(note, 'unlock');
      } else {
        this.selectedNote = note;
      }
    };

    const existingNote = this.noteService.allNotes().find(n => n.id === noteId);
    if (existingNote) {
      checkAndOpen(existingNote);
    } else {
      this.noteService.getNoteById(noteId).subscribe({
        next: (n) => checkAndOpen(n),
        error: () => this.toastService.show({ message: 'Shared note not found or deleted' })
      });
    }
  }

  openPinModal(note: NoteDto, mode: 'lock' | 'unlock' | 'remove-lock') {
    this.pinModalData = { note, mode };
  }

  closePinModal() {
    this.pinModalData = null;
  }

  onPinSuccess(updatedNote: NoteDto) {
    const mode = this.pinModalData?.mode;
    this.pinModalData = null;

    if (mode === 'unlock') {
      this.openNoteDialog(updatedNote);
    } else if (mode === 'lock') {
      if (this.selectedNote && this.selectedNote.id === updatedNote.id) {
        this.selectedNote = null;
      }
    } else if (mode === 'remove-lock') {
      if (this.selectedNote && this.selectedNote.id === updatedNote.id) {
        this.selectedNote = { ...this.selectedNote, ...updatedNote };
      }
    }
  }

  openNoteDialog(note: NoteDto) {
    this.selectedNote = note;
  }

  closeNoteDialog() {
    this.selectedNote = null;
  }

  openVersionHistory(note: NoteDto) {
    this.versionHistoryNote = note;
  }

  closeVersionHistory() {
    this.versionHistoryNote = null;
  }

  openCollaborators(note: NoteDto) {
    this.collaboratorsNote = note;
  }

  closeCollaborators() {
    this.collaboratorsNote = null;
  }

  onCollaboratorsUpdated(updatedNote: NoteDto) {
    if (this.collaboratorsNote && this.collaboratorsNote.id === updatedNote.id) {
      this.collaboratorsNote = { ...this.collaboratorsNote, ...updatedNote };
    }
  }

  openPublicShareModal(note: NoteDto) {
    this.publicShareNote = note;
  }

  onPublicShareUpdated(updatedNote: NoteDto) {
    this.publicShareNote = updatedNote;
    if (this.selectedNote && this.selectedNote.id === updatedNote.id) {
      this.selectedNote = { ...this.selectedNote, ...updatedNote };
    }
  }

  openDrawingForNewNote(): void {
    this.drawingTarget = { isNewNote: true };
  }

  openDrawingForNote(note: NoteDto): void {
    this.drawingTarget = { note, isNewNote: false };
  }

  closeDrawing(): void {
    this.drawingTarget = null;
  }

  onDrawingSaved(imageUrl: string): void {
    if (this.drawingTarget?.isNewNote) {
      // Add to creator form
      this.isExpanded = true;
      const currentImages = this.noteForm.get('imageUrls')?.value || [];
      this.noteForm.patchValue({ imageUrls: [...currentImages, imageUrl] });
    } else if (this.drawingTarget?.note) {
      const note = this.drawingTarget.note;
      const updatedImages = [...(note.imageUrls || []), imageUrl];
      this.noteService.updateNote(note.id, { imageUrls: updatedImages }).subscribe();
      if (this.selectedNote && this.selectedNote.id === note.id) {
        this.selectedNote = { ...this.selectedNote, imageUrls: updatedImages };
      }
    }
    this.drawingTarget = null;
  }

  onSaveDialog(updatedNote: Partial<NoteDto>) {
    if (updatedNote.id) {
      // Find original note to allow Undo
      const originalNote = this.noteService.allNotes().find(n => n.id === updatedNote.id);
      
      this.noteService.updateNote(updatedNote.id, updatedNote).subscribe();
      
      if (originalNote) {
        let msg = '';
        if (updatedNote.isArchived !== undefined && updatedNote.isArchived && !originalNote.isArchived) {
          msg = 'Note archived';
        } else if (updatedNote.isArchived !== undefined && !updatedNote.isArchived && originalNote.isArchived) {
          msg = 'Note unarchived';
        }
        
        if (msg) {
          this.toastService.show({
            message: msg,
            actionLabel: 'Undo',
            action: () => {
              this.noteService.updateNote(originalNote.id, originalNote).subscribe();
            }
          });
        }
      }
    }
  }

  // Views & Menus
  get isLabelView(): boolean {
    return this.currentView !== 'notes' && this.currentView !== 'archive' && this.currentView !== 'trash' && this.currentView !== 'reminders';
  }

  setView(view: 'notes' | 'archive' | 'trash' | 'reminders' | string) {
    this.currentView = view;
    if (view === 'notes' || view === 'archive' || view === 'trash' || view === 'reminders') {
      this.noteService.labelFilter.set(null);
    } else {
      this.noteService.labelFilter.set(view);
    }
    this.isMobileSidebarOpen = false; // Auto close on mobile navigation
  }
  
  // Drag and Drop
  drop(event: CdkDragDrop<NoteDto[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Since signals return readonly arrays, we create a mutable copy
    const items = [...event.container.data];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Re-calculate order indices based on their new visual position.
    // The top item gets the highest index or lowest index?
    // In our backend we used `.OrderBy(n => n.OrderIndex)`. So smaller OrderIndex comes first.
    // Let's just assign indices 1 to N to the list.
    const noteOrders = items.map((note, index) => ({
      id: note.id,
      orderIndex: index
    }));

    // Send to backend
    this.noteService.reorderNotes(noteOrders).subscribe();
  }

  toggleNotificationMenu() {
    this.showNotificationMenu = !this.showNotificationMenu;
    this.showSettingsMenu = false;
    this.showProfileMenu = false;
    if (this.showNotificationMenu) {
      this.notificationService.fetchNotifications();
    }
  }

  onNotificationClick(notif: NotificationDto) {
    this.notificationService.markAsRead(notif.id);
    this.showNotificationMenu = false;
    if (notif.noteId) {
      const note = this.noteService.allNotes().find(n => n.id === notif.noteId);
      if (note) {
        this.selectedNote = note;
      } else {
        this.noteService.getNoteById(notif.noteId).subscribe({
          next: (n) => this.selectedNote = n,
          error: () => this.toastService.show({ message: 'Note not found or you no longer have access' })
        });
      }
    }
  }

  markNotificationAsRead(notif: NotificationDto, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(notif.id);
  }

  markAllNotificationsAsRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotificationItem(notif: NotificationDto, event: Event) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notif.id);
  }

  clearAllNotificationsList() {
    this.notificationService.clearAll();
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    if (this.isDarkMode()) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
    this.showSettingsMenu = false;
    this.showProfileMenu = false;
  }

  toggleSettingsMenu() {
    this.showSettingsMenu = !this.showSettingsMenu;
    this.showProfileMenu = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showSettingsMenu = false;
    if (!this.showProfileMenu) {
      this.showSettingsSubmenu = false;
    }
  }

  toggleSettingsSubmenu(event: MouseEvent) {
    event.stopPropagation();
    this.showSettingsSubmenu = !this.showSettingsSubmenu;
  }

  openChangePasswordModal() {
    this.showProfileMenu = false;
    this.showSettingsSubmenu = false;
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
  }

  openDeleteAccountModal() {
    this.showProfileMenu = false;
    this.showSettingsSubmenu = false;
    this.showDeleteAccountModal = true;
  }

  closeDeleteAccountModal() {
    this.showDeleteAccountModal = false;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.noteService.searchQuery.set(input.value);
  }

  onSearchFocus() {
    if (window.innerWidth <= 768) {
      this.isMobileSearchActive = true;
    }
  }

  closeMobileSearch() {
    this.isMobileSearchActive = false;
    this.clearSearch();
  }

  clearSearch() {
    this.noteService.searchQuery.set('');
    // Optionally focus the search input here if we query viewchild
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    } else {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) {
      this.isMobileSidebarOpen = false;
    }
  }

  logout() {
    this.authService.logout();
  }
}
