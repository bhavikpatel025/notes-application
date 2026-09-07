import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { LabelService } from '../../../core/services/label.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LabelDto } from '../../../shared/models/label.model';
import { NoteService } from '../../../core/services/note.service';

@Component({
  selector: 'app-edit-labels-modal',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './edit-labels-modal.component.html',
  styleUrl: './edit-labels-modal.component.scss'
})
export class EditLabelsModalComponent {
  @Output() close = new EventEmitter<void>();
  labelService = inject(LabelService);
  noteService = inject(NoteService);

  newLabelName = '';
  editingLabelId = signal<string | null>(null);
  editLabelName = '';

  closeModal() {
    this.close.emit();
  }

  createLabel() {
    if (this.newLabelName.trim()) {
      this.labelService.createLabel(this.newLabelName.trim()).subscribe(() => {
        this.newLabelName = '';
      });
    }
  }

  startEdit(label: LabelDto) {
    this.editingLabelId.set(label.id);
    this.editLabelName = label.name;
  }

  cancelEdit() {
    this.editingLabelId.set(null);
    this.editLabelName = '';
  }

  saveEdit(labelId: string) {
    if (this.editLabelName.trim()) {
      this.labelService.updateLabel(labelId, this.editLabelName.trim()).subscribe(() => {
        this.editingLabelId.set(null);
        this.noteService.updateLabelInNotes(labelId, this.editLabelName.trim());
      });
    }
  }

  deleteLabel(labelId: string) {
    this.labelService.deleteLabel(labelId).subscribe();
  }
}
