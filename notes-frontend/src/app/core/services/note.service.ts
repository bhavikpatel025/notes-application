import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NoteDto } from '../../shared/models/note.model';
import { tap, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private apiUrl = `${environment.apiUrl}/Notes`;
  
  // Private signal for source of truth
  private notesSignal = signal<NoteDto[]>([]);

  // Public readonly signals for the UI to bind to
  public readonly allNotes = this.notesSignal.asReadonly();
  public readonly pinnedNotes = computed(() => this.notesSignal().filter(n => n.isPinned && !n.isArchived && !n.isTrashed));
  public readonly unpinnedNotes = computed(() => this.notesSignal().filter(n => !n.isPinned && !n.isArchived && !n.isTrashed));
  public readonly archivedNotes = computed(() => this.notesSignal().filter(n => n.isArchived && !n.isTrashed));
  public readonly trashedNotes = computed(() => this.notesSignal().filter(n => n.isTrashed));

  // Search state
  public readonly searchQuery = signal<string>('');
  public readonly labelFilter = signal<string | null>(null);

  private matchesFilters(note: NoteDto): boolean {
    const query = this.searchQuery();
    const lowerQuery = query ? query.toLowerCase() : '';
    const label = this.labelFilter();

    let matchesSearch = true;
    if (lowerQuery) {
      matchesSearch = (note.title?.toLowerCase().includes(lowerQuery) || false) || 
                      (note.content?.toLowerCase().includes(lowerQuery) || false);
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

  constructor(private http: HttpClient) {}

  private resolveNoteImages(note: NoteDto): NoteDto {
    if (note.imageUrls) {
      const serverUrl = environment.apiUrl.replace('/api', '');
      note.imageUrls = note.imageUrls.map(url => url.startsWith('/') ? serverUrl + url : url);
    }
    return note;
  }

  loadNotes() {
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
        this.notesSignal.update(notes => [newNote, ...notes]);
      })
    );
  }

  updateNote(id: string, note: Partial<NoteDto>) {
    if (note.labels) {
      note.labelIds = note.labels.map(l => l.id);
    }
    const noteWithResolvedImages = this.resolveNoteImages(note as NoteDto);
    return this.http.put(`${this.apiUrl}/${id}`, note).pipe(
      tap(() => {
        this.notesSignal.update(notes => 
          notes.map(n => n.id === id ? { ...n, ...noteWithResolvedImages } as NoteDto : n)
        );
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
}
