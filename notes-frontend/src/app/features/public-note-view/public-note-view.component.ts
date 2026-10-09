import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NoteService } from '../../core/services/note.service';
import { PublicNoteDto } from '../../shared/models/note.model';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-public-note-view',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ToastComponent],
  templateUrl: './public-note-view.component.html',
  styleUrls: ['./public-note-view.component.scss']
})
export class PublicNoteViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  slug: string = '';
  note: PublicNoteDto | null = null;
  isLoading: boolean = true;
  hasError: boolean = false;
  isDarkMode = signal(true);
  copied: boolean = false;

  ngOnInit(): void {
    // Check saved theme
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        this.isDarkMode.set(false);
        document.body.classList.add('light-theme');
      }
    }

    this.route.params.subscribe(params => {
      this.slug = params['slug'];
      if (this.slug) {
        this.loadPublicNote(this.slug);
      } else {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  loadPublicNote(slug: string): void {
    this.isLoading = true;
    this.hasError = false;

    // Check if this browser has already viewed this public note
    let viewedNotes: string[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        viewedNotes = JSON.parse(localStorage.getItem('keep_viewed_public_notes') || '[]');
      } catch {
        viewedNotes = [];
      }
    }

    const hasAlreadyViewed = Array.isArray(viewedNotes) && viewedNotes.includes(slug);
    const isUniqueView = !hasAlreadyViewed;

    this.noteService.getPublicNoteBySlug(slug, isUniqueView).subscribe({
      next: (data) => {
        this.note = data;
        this.isLoading = false;

        // Remember this note on this device forever so future visits/refreshes do not re-count
        if (isUniqueView && typeof localStorage !== 'undefined') {
          try {
            if (!viewedNotes.includes(slug)) {
              viewedNotes.push(slug);
            }
            localStorage.setItem('keep_viewed_public_notes', JSON.stringify(viewedNotes));
          } catch {}
        }
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  toggleTheme(): void {
    const nextDark = !this.isDarkMode();
    this.isDarkMode.set(nextDark);
    if (typeof document !== 'undefined') {
      if (nextDark) {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      }
    }
  }

  copyContent(): void {
    if (!this.note) return;

    let textToCopy = '';
    if (this.note.title) {
      textToCopy += this.note.title + '\n\n';
    }

    if (this.note.type === 1 && this.note.todoItems && this.note.todoItems.length > 0) {
      this.note.todoItems.forEach(item => {
        textToCopy += (item.isCompleted ? '☑ ' : '☐ ') + item.text + '\n';
      });
    } else if (this.note.content) {
      textToCopy += this.note.content;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copied = true;
        this.toastService.show({ message: 'Content copied to clipboard!' });
        setTimeout(() => this.copied = false, 2500);
      });
    }
  }

  printNote(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  get completedTodosCount(): number {
    return this.note?.todoItems?.filter(t => t.isCompleted).length || 0;
  }

  getInitial(name: string): string {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  }
}
