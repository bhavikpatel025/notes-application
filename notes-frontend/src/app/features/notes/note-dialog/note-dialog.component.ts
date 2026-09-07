import { Component, EventEmitter, Input, Output, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { NoteDto } from '../../../shared/models/note.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';
import { LabelSelectionPopupComponent } from '../label-selection-popup/label-selection-popup.component';
import { LabelDto } from '../../../shared/models/label.model';
import { TextFieldModule } from '@angular/cdk/text-field';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';

@Component({
  selector: 'app-note-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, HighlightPipe, LabelSelectionPopupComponent, TextFieldModule],
  templateUrl: './note-dialog.component.html',
  styleUrl: './note-dialog.component.scss'
})
export class NoteDialogComponent implements OnInit {
  @Input({ required: true }) note!: NoteDto;
  @Output() closeDialog = new EventEmitter<void>();
  @Output() saveNote = new EventEmitter<Partial<NoteDto>>();

  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);
  editForm!: FormGroup;
  showDialogColorPalette = false;
  showMoreMenu = false;
  showLabelPopup = false;

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

  ngOnInit() {
    this.editForm = this.fb.group({
      title: [this.note.title],
      content: [this.note.content],
      color: [this.note.color || '#FFFFFF'],
      imageUrls: [this.note.imageUrls ? [...this.note.imageUrls] : []],
      isArchived: [this.note.isArchived]
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.showDialogColorPalette && !this.elementRef.nativeElement.querySelector('.palette-container')?.contains(target)) {
      this.showDialogColorPalette = false;
    }
    if (this.showMoreMenu && !this.elementRef.nativeElement.querySelector('.more-container')?.contains(target)) {
      this.showMoreMenu = false;
      this.showLabelPopup = false;
    }
  }

  @HostListener('document:closeMenus')
  onCloseMenus() {
    this.showDialogColorPalette = false;
    this.showMoreMenu = false;
    this.showLabelPopup = false;
  }

  toggleDialogColorPalette(event: Event) {
    event.stopPropagation();
    const wasOpen = this.showDialogColorPalette;
    document.dispatchEvent(new CustomEvent('closeMenus'));
    this.showDialogColorPalette = !wasOpen;
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
    this.note.labels = labels;
  }

  removeLabel(labelId: string, event: Event) {
    event.stopPropagation();
    this.note.labels = (this.note.labels || []).filter(l => l.id !== labelId);
  }

  onClose() {
    // Only save if something changed
    const updatedValues = this.editForm.value;
    if (
      updatedValues.title !== this.note.title ||
      updatedValues.content !== this.note.content ||
      updatedValues.color !== this.note.color ||
      updatedValues.isArchived !== this.note.isArchived ||
      JSON.stringify(updatedValues.imageUrls) !== JSON.stringify(this.note.imageUrls)
    ) {
      this.saveNote.emit({ id: this.note.id, ...updatedValues });
    }
    this.closeDialog.emit();
  }

  onArchive() {
    const current = this.editForm.get('isArchived')?.value;
    this.editForm.patchValue({ isArchived: !current });
    this.onClose(); // Automatically save and close when archiving
  }

  onDelete() {
    this.saveNote.emit({ id: this.note.id, isTrashed: true, isPinned: false });
    this.closeDialog.emit();
  }

  changeColor(colorValue: string, event: Event) {
    event.stopPropagation();
    this.editForm.patchValue({ color: colorValue });
    this.showDialogColorPalette = false;
  }

  // Prevent closing when clicking inside the modal
  onModalClick(event: Event) {
    event.stopPropagation();
  }

  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

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
  }
}
