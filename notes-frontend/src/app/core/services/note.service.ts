import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NoteDto, PublicNoteDto } from '../../shared/models/note.model';
import { NoteHistoryDto } from '../../shared/models/note-history.model';
import { ToastService } from './toast.service';
import { tap, Observable, map } from 'rxjs';

import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private signalRService = inject(SignalRService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/Notes`;
  
  // Private signal for source of truth
  private notesSignal = signal<NoteDto[]>([]);

  // Public readonly signals for the UI to bind to
  public readonly allNotes = this.notesSignal.asReadonly();
  public readonly pinnedNotes = computed(() => this.notesSignal().filter(n => n.isPinned && !n.isArchived && !n.isTrashed));
  public readonly unpinnedNotes = computed(() => this.notesSignal().filter(n => !n.isPinned && !n.isArchived && !n.isTrashed));
  public readonly archivedNotes = computed(() => this.notesSignal().filter(n => n.isArchived && !n.isTrashed));
  public readonly trashedNotes = computed(() => this.notesSignal().filter(n => n.isTrashed));
  public readonly reminderNotes = computed(() => this.notesSignal().filter(n => n.reminderDateTime && !n.isArchived && !n.isTrashed));

  // Search state
  public readonly searchQuery = signal<string>('');
  public readonly labelFilter = signal<string | null>(null);

  private matchesFilters(note: NoteDto): boolean {
    const query = this.searchQuery();
    const lowerQuery = query ? query.toLowerCase().trim() : '';
    const label = this.labelFilter();

    let matchesSearch = true;
    if (lowerQuery) {
      const matchesTitle = note.title?.toLowerCase().includes(lowerQuery) || false;
      const matchesContent = note.content?.toLowerCase().includes(lowerQuery) || false;
      const matchesLabelName = note.labels?.some(l => l.name?.toLowerCase().includes(lowerQuery)) || false;
      const matchesTodoItem = note.todoItems?.some(t => t.text?.toLowerCase().includes(lowerQuery)) || false;

      matchesSearch = matchesTitle || matchesContent || matchesLabelName || matchesTodoItem;
    }

    let matchesLabel = true;
    if (label) {
      matchesLabel = note.labels?.some(l => l.name === label) || false;
    }

    return matchesSearch && matchesLabel;
  }

  public readonly searchPinnedNotes = computed(() => 
    this.pinnedNotes().filter(n => this.matchesFilters(n))
  );
  
  public readonly searchUnpinnedNotes = computed(() => 
    this.unpinnedNotes().filter(n => this.matchesFilters(n))
  );
  
  public readonly searchArchivedNotes = computed(() => 
    this.archivedNotes().filter(n => this.matchesFilters(n))
  );

  public readonly searchReminderNotes = computed(() => 
    this.reminderNotes().filter(n => this.matchesFilters(n))
  );

  constructor() {
    this.initSignalRListeners();
  }

  private initSignalRListeners(): void {
    this.signalRService.noteCreated$.subscribe(note => {
      const resolved = this.resolveNoteImages(note);
      this.notesSignal.update(notes => {
        if (notes.some(n => n.id === resolved.id)) {
          return notes.map(n => n.id === resolved.id ? resolved : n);
        }
        return [resolved, ...notes];
      });
    });

    this.signalRService.noteUpdated$.subscribe(note => {
      const resolved = this.resolveNoteImages(note);
      this.notesSignal.update(notes => {
        if (notes.some(n => n.id === resolved.id)) {
          return notes.map(n => n.id === resolved.id ? resolved : n);
        }
        return [resolved, ...notes];
      });
    });

    this.signalRService.noteDeleted$.subscribe(noteId => {
      this.notesSignal.update(notes => notes.filter(n => n.id !== noteId));
    });
  }

  private resolveNoteImages(note: NoteDto): NoteDto {
    if (note.imageUrls) {
      const serverUrl = environment.apiUrl.replace('/api', '');
      note.imageUrls = note.imageUrls.map(url => url.startsWith('/') ? serverUrl + url : url);
    }
    return note;
  }

  loadNotes() {
    this.signalRService.startConnection();

    this.http.get<NoteDto[]>(this.apiUrl).pipe(
      map(notes => notes.map(n => this.resolveNoteImages(n)))
    ).subscribe({
      next: (notes) => this.notesSignal.set(notes),
      error: (err) => console.error('Failed to load notes', err)
    });
  }

  createNote(note: Partial<NoteDto>) {
    if (note.labels) {
      note.labelIds = note.labels.map(l => l.id);
    }
    return this.http.post<NoteDto>(this.apiUrl, note).pipe(
      map(newNote => this.resolveNoteImages(newNote)),
      tap((newNote) => {
        this.notesSignal.update(notes => {
          if (notes.some(n => n.id === newNote.id)) {
            return notes.map(n => n.id === newNote.id ? newNote : n);
          }
          return [newNote, ...notes];
        });
      })
    );
  }

  updateNote(id: string, note: Partial<NoteDto>) {
    const payload = { ...note, id };
    if (payload.labels) {
      payload.labelIds = payload.labels.map(l => l.id);
    }
    const noteWithResolvedImages = this.resolveNoteImages(payload as NoteDto);
    const nowIso = new Date().toISOString();
    return this.http.put(`${this.apiUrl}/${id}`, payload).pipe(
      tap(() => {
        this.notesSignal.update(notes => 
          notes.map(n => n.id === id ? { ...n, ...noteWithResolvedImages, updatedAt: nowIso } as NoteDto : n)
        );
      })
    );
  }

  addCollaborator(noteId: string, email: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${noteId}/collaborators`, { email }).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === noteId ? updatedNote : n)
        );
      })
    );
  }

  acceptSharedNote(id: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${id}/accept-shared`, {}).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === id ? updatedNote : n)
        );
      })
    );
  }

  removeCollaborator(noteId: string, collaboratorUserId: string): Observable<NoteDto | null> {
    return this.http.delete<NoteDto | null>(`${this.apiUrl}/${noteId}/collaborators/${collaboratorUserId}`).pipe(
      map(res => res ? this.resolveNoteImages(res) : null),
      tap(updatedNote => {
        const currentUserId = this.authService.currentUser()?.userId;
        if (collaboratorUserId === currentUserId) {
          this.notesSignal.update(notes => notes.filter(n => n.id !== noteId));
        } else if (updatedNote) {
          this.notesSignal.update(notes =>
            notes.map(n => n.id === noteId ? updatedNote : n)
          );
        }
      })
    );
  }

  lockNote(id: string, pin: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${id}/lock`, { pin }).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === id ? updatedNote : n)
        );
      })
    );
  }

  unlockNote(id: string, pin: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${id}/unlock`, { pin }).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote))
    );
  }

  removeNoteLock(id: string, pin: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${id}/remove-lock`, { pin }).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === id ? updatedNote : n)
        );
      })
    );
  }

  generatePublicLink(id: string): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiUrl}/${id}/public-link`, {}).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === id ? updatedNote : n)
        );
      })
    );
  }

  revokePublicLink(id: string): Observable<NoteDto> {
    return this.http.delete<NoteDto>(`${this.apiUrl}/${id}/public-link`).pipe(
      map(updatedNote => this.resolveNoteImages(updatedNote)),
      tap(updatedNote => {
        this.notesSignal.update(notes =>
          notes.map(n => n.id === id ? updatedNote : n)
        );
      })
    );
  }

  getPublicNoteBySlug(slug: string, isUniqueView: boolean = true): Observable<PublicNoteDto> {
    return this.http.get<PublicNoteDto>(`${this.apiUrl}/public/${slug}?isUniqueView=${isUniqueView}`).pipe(
      map(note => {
        if (note.imageUrls && note.imageUrls.length > 0) {
          note.imageUrls = note.imageUrls.map(url => {
            if (url.startsWith('/')) {
              return environment.apiUrl.replace('/api', '') + url;
            }
            return url;
          });
        }
        return note;
      })
    );
  }

  reorderNotes(noteOrders: { id: string, orderIndex: number }[]) {
    return this.http.put(`${this.apiUrl}/reorder`, noteOrders).pipe(
      tap(() => {
        // Optimistically update the signals
        this.notesSignal.update(notes => {
          return notes.map(n => {
            const newOrder = noteOrders.find(o => o.id === n.id);
            if (newOrder) {
              return { ...n, orderIndex: newOrder.orderIndex };
            }
            return n;
          }).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        });
      })
    );
  }

  deleteNote(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.notesSignal.update(notes => notes.filter(n => n.id !== id));
      })
    );
  }

  emptyTrash() {
    return this.http.delete(`${this.apiUrl}/empty-trash`).pipe(
      tap(() => {
        this.notesSignal.update(notes => notes.filter(n => !n.isTrashed));
      })
    );
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/Images/upload`, formData).pipe(
      map(res => {
        if (res.url.startsWith('/')) {
          res.url = environment.apiUrl.replace('/api', '') + res.url;
        }
        return res;
      })
    );
  }

  updateLabelInNotes(labelId: string, newName: string) {
    this.notesSignal.update(notes => notes.map(note => {
      if (note.labels && note.labels.some(l => l.id === labelId)) {
        return {
          ...note,
          labels: note.labels.map(l => l.id === labelId ? { ...l, name: newName } : l)
        } as NoteDto;
      }
      return note;
    }));
  }

  getNoteHistory(noteId: string): Observable<NoteHistoryDto[]> {
    return this.http.get<NoteHistoryDto[]>(`${this.apiUrl}/${noteId}/history`);
  }

  copyToGoogleDocs(note: Partial<NoteDto>) {
    // 1. Show immediate progress toast
    this.toastService.show({
      message: 'Copying to Google Docs...'
    }, 1200);

    // 2. Prepare rich HTML and plain text for clipboard
    const title = (note.title || '').trim();
    let plainText = '';
    let htmlContent = '';

    if (title) {
      plainText += `${title}\n\n`;
      htmlContent += `<h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 12px; color: #202124;">${this.escapeHtml(title)}</h1>`;
    }

    if (note.type === 1 && note.todoItems && note.todoItems.length > 0) {
      htmlContent += '<ul style="list-style-type: none; padding-left: 0; margin-top: 8px;">';
      note.todoItems.forEach(item => {
        const symbol = item.isCompleted ? '☑' : '☐';
        plainText += `${symbol} ${item.text}\n`;
        const strikeStyle = item.isCompleted ? 'text-decoration: line-through; color: #5f6368;' : 'color: #202124;';
        htmlContent += `<li style="margin-bottom: 6px; font-size: 11pt; ${strikeStyle}">${symbol}&nbsp; ${this.escapeHtml(item.text)}</li>`;
      });
      htmlContent += '</ul>';
    } else if (note.content) {
      plainText += `${note.content}\n`;
      htmlContent += `<p style="font-size: 11pt; line-height: 1.5; color: #202124; white-space: pre-wrap;">${this.escapeHtml(note.content).replace(/\n/g, '<br>')}</p>`;
    }

    if (note.imageUrls && note.imageUrls.length > 0) {
      plainText += `\nImages:\n` + note.imageUrls.join('\n') + '\n';
      note.imageUrls.forEach(img => {
        htmlContent += `<div style="margin-top: 12px;"><img src="${img}" style="max-width: 100%; height: auto;" /></div>`;
      });
    }

    if (note.labels && note.labels.length > 0) {
      const labelNames = note.labels.map(l => l.name).join(', ');
      plainText += `\nLabels: ${labelNames}\n`;
      htmlContent += `<p style="margin-top: 14px; font-size: 10pt; color: #5f6368; font-style: italic;">Labels: ${this.escapeHtml(labelNames)}</p>`;
    }

    // Modern Clipboard API with rich HTML and plain text
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      if (typeof ClipboardItem !== 'undefined') {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob
          })
        ]).catch(() => {
          navigator.clipboard.writeText(plainText);
        });
      } else {
        navigator.clipboard.writeText(plainText);
      }
    }

    // 3. Show clear Option A instruction toast with action to open docs.new
    setTimeout(() => {
      this.toastService.show({
        message: 'Copied to clipboard! Press Ctrl+V in the new Doc',
        actionLabel: 'Open Doc',
        action: () => {
          window.open('https://docs.new', '_blank');
        }
      }, 9000);
    }, 1100);
  }

  getNoteById(id: string): Observable<NoteDto> {
    return this.http.get<NoteDto>(`${this.apiUrl}/${id}`).pipe(
      map(n => this.resolveNoteImages(n))
    );
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
