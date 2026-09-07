import { Component, inject, OnInit, HostListener, ElementRef, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NoteService } from '../../../core/services/note.service';
import { LabelService } from '../../../core/services/label.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { NoteCardComponent } from '../note-card/note-card.component';
import { NoteDialogComponent } from '../note-dialog/note-dialog.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoteDto } from '../../../shared/models/note.model';
import { LabelDto } from '../../../shared/models/label.model';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { TextFieldModule } from '@angular/cdk/text-field';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { EditLabelsModalComponent } from '../edit-labels-modal/edit-labels-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NoteCardComponent, NoteDialogComponent, ToastComponent, ReactiveFormsModule, UpperCasePipe, DragDropModule, HighlightPipe, EditLabelsModalComponent, TextFieldModule, LabelSelectionPopupComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  noteService = inject(NoteService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  labelService = inject(LabelService);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);
  
  // State
  noteForm: FormGroup;
  isExpanded = false;
  selectedNote: NoteDto | null = null;
  currentView: 'notes' | 'archive' | 'trash' | string = 'notes';
  isDarkMode = signal(true);
  showSettingsMenu = false;
  showProfileMenu = false;
  showEmptyTrashModal = false;
  showEditLabelsModal = false;
  showCreatorColorPalette = false;
  showCreatorMoreMenu = false;
  showCreatorLabelPopup = false;
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  isMobileSearchActive = false;

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
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.showSettingsMenu && !target.closest('.nav-actions')) {
      this.showSettingsMenu = false;
    }
    if (this.showProfileMenu && !target.closest('.nav-actions')) {
      this.showProfileMenu = false;
    }
    if (this.isExpanded && !this.elementRef.nativeElement.querySelector('.note-creator')?.contains(target)) {
      this.closeForm();
    }
    if (this.showCreatorColorPalette && !this.elementRef.nativeElement.querySelector('.palette-container')?.contains(target)) {
      this.showCreatorColorPalette = false;
    }
    if (this.showCreatorMoreMenu && !this.elementRef.nativeElement.querySelector('.creator-more-container')?.contains(target)) {
      this.showCreatorMoreMenu = false;
      this.showCreatorLabelPopup = false;
    }
  }

  @HostListener('document:closeMenus')
  onCloseMenus() {
    this.showCreatorColorPalette = false;
    this.showCreatorMoreMenu = false;
    this.showCreatorLabelPopup = false;
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
    const title = this.noteForm.get('title')?.value || '';
    const content = this.noteForm.get('content')?.value || '';
    const images = this.noteForm.get('imageUrls')?.value || [];
    
    if (title || content || images.length > 0) {
      this.createNote();
    }
    this.isExpanded = false;
    this.noteForm.reset({ title: '', content: '', color: '#FFFFFF', imageUrls: [] });
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
    const noteData = this.noteForm.value;
    noteData.title = noteData.title || '';
    noteData.content = noteData.content || '';
    
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
  openNoteDialog(note: NoteDto) {
    this.selectedNote = note;
  }

  closeNoteDialog() {
    this.selectedNote = null;
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
    return this.currentView !== 'notes' && this.currentView !== 'archive' && this.currentView !== 'trash';
  }

  setView(view: 'notes' | 'archive' | 'trash' | string) {
    this.currentView = view;
    if (view === 'notes' || view === 'archive' || view === 'trash') {
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
  }

  toggleSettingsMenu() {
    this.showSettingsMenu = !this.showSettingsMenu;
    this.showProfileMenu = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showSettingsMenu = false;
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

  // Handle Dropdown Menus and Note Creator Auto-Save in the first onClickOutside

  logout() {
    this.authService.logout();
  }
}
