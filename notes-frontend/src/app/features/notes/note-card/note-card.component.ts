import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { NoteDto } from '../../../shared/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';
import { DatePipe, NgClass } from '@angular/common';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { LabelDto } from '../../../shared/models/label.model';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [DatePipe, NgClass, HighlightPipe, LabelSelectionPopupComponent],
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
  
  private elementRef = inject(ElementRef);
  private noteService = inject(NoteService);
  private toastService = inject(ToastService);
  
  @Output() labelClick = new EventEmitter<string>();

  showColorPalette = false;
  showLabelPopup = false;
  showMoreMenu = false;
  
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
      this.showLabelPopup = false;
    }
  }

  @HostListener('document:closeMenus')
  onCloseMenus() {
    this.showColorPalette = false;
    this.showMoreMenu = false;
    this.showLabelPopup = false;
  }

  toggleColorPalette(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showColorPalette;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showColorPalette = !wasOpen;
  }

  toggleMoreMenu(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showMoreMenu;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showMoreMenu = !wasOpen;
  }

  openLabelPopup(event: Event) {
    event.stopPropagation();
    this.showMoreMenu = false;
    this.showLabelPopup = true;
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
      // Reusing toggleArchive output as a generic update mechanism, or we can emit a separate update.
      // Wait, toggleArchive emits NoteDto. This is generic enough.
      // A better name would be 'update' but let's reuse what we have or just emit an update.
      // Wait, the parent binds `(togglePin)="onUpdateNote($event)"` and `(toggleArchive)="onUpdateNote($event)"`
      // I can just emit using `togglePin` since it calls `onUpdateNote`.
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
          // We can just emit the update to let the parent handle the save
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
}
