import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LabelService } from '../../../core/services/label.service';
import { LabelDto } from '../../../shared/models/label.model';

@Component({
  selector: 'app-label-selection-popup',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './label-selection-popup.component.html',
  styleUrl: './label-selection-popup.component.scss'
})
export class LabelSelectionPopupComponent {
  @Input() selectedLabels: LabelDto[] = [];
  @Output() labelsChanged = new EventEmitter<LabelDto[]>();
  @Output() closePopup = new EventEmitter<void>();
  
  labelService = inject(LabelService);

  searchQuery = signal('');

  filteredLabels = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allLabels = this.labelService.labels();
    if (!query) return allLabels;
    return allLabels.filter(l => l.name.toLowerCase().includes(query));
  });

  showCreateOption = computed(() => {
    const query = this.searchQuery().trim();
    if (!query) return false;
    // Don't show if exact match exists
    return !this.labelService.labels().some(l => l.name.toLowerCase() === query.toLowerCase());
  });

  hasLabel(label: LabelDto): boolean {
    return this.selectedLabels.some(l => l.id === label.id);
  }

  toggleLabel(label: LabelDto, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const isSelected = this.hasLabel(label);
    let newSelection = [...this.selectedLabels];
    
    if (isSelected) {
      newSelection = newSelection.filter(l => l.id !== label.id);
    } else {
      newSelection.push(label);
    }
    
    this.selectedLabels = newSelection;
    this.labelsChanged.emit(this.selectedLabels);
  }

  createAndSelectLabel(event?: Event) {
    if (event) event.stopPropagation();
    
    const name = this.searchQuery().trim();
    if (!name) return;

    this.labelService.createLabel(name).subscribe(newLabel => {
      this.searchQuery.set('');
      this.toggleLabel(newLabel);
    });
  }

  onClose(event: Event) {
    event.stopPropagation();
    this.closePopup.emit();
  }
}
