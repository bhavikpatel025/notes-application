import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteDto } from '../../../shared/models/note.model';
import { NoteHistoryDto } from '../../../shared/models/note-history.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-modal.component.html',
  styleUrl: './version-history-modal.component.scss'
})
export class VersionHistoryModalComponent implements OnInit {
  @Input({ required: true }) note!: NoteDto;
  @Output() close = new EventEmitter<void>();

  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  histories: NoteHistoryDto[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit() {
    if (!this.note?.id) {
      this.isLoading = false;
      return;
    }

    this.noteService.getNoteHistory(this.note.id).subscribe({
      next: (res) => {
        this.histories = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch note history', err);
        this.errorMessage = 'Failed to load version history';
        this.isLoading = false;
      }
    });
  }

  formatVersionDate(dateStr: string): string {
    if (!dateStr) return '';
    let parseable = dateStr;
    if (typeof parseable === 'string' && !parseable.endsWith('Z') && !parseable.includes('+')) {
      parseable += 'Z';
    }
    const d = new Date(parseable);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const isCurrentYear = d.getFullYear() === now.getFullYear();

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isCurrentYear ? undefined : 'numeric'
    });

    const timePart = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${datePart}, ${timePart}`;
  }

  downloadVersion(version: NoteHistoryDto) {
    let parseable = version.createdAt;
    if (typeof parseable === 'string' && !parseable.endsWith('Z') && !parseable.includes('+')) {
      parseable += 'Z';
    }
    const d = new Date(parseable);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    const dateFormatted = `${year}-${month}-${day}_${hoursStr}-${minutes}_${ampm}`;
    const rawTitle = (version.title || this.note.title || 'Untitled_Note').trim();
    const cleanTitle = rawTitle.replace(/[\/\\?%*:|"<> ]/g, '-');
    const filename = `${cleanTitle}_${dateFormatted}.html`;

    const escape = (str: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let bodyHtml = '';
    if (version.title) {
      bodyHtml += `<h1 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #202124;">${escape(version.title)}</h1>`;
    }

    if (version.type === 1 && version.todoItems && version.todoItems.length > 0) {
      bodyHtml += '<div style="margin-top: 12px;">';
      version.todoItems.forEach(item => {
        const isDone = item.isCompleted;
        const symbol = isDone ? '&#9745;' : '&#9744;';
        const strike = isDone ? 'text-decoration: line-through; color: #5f6368;' : 'color: #202124;';
        bodyHtml += `<div style="display: flex; align-items: center; margin-bottom: 8px; font-size: 15px; ${strike}"><span style="margin-right: 8px; font-size: 16px;">${symbol}</span><span>${escape(item.text)}</span></div>`;
      });
      bodyHtml += '</div>';
    } else if (version.content) {
      bodyHtml += `<p style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #202124;">${escape(version.content)}</p>`;
    }

    if (version.imageUrls && version.imageUrls.length > 0) {
      bodyHtml += '<div style="margin-top: 16px;">';
      version.imageUrls.forEach(url => {
        bodyHtml += `<div style="margin-bottom: 12px;"><img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Image" /></div>`;
      });
      bodyHtml += '</div>';
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(version.title || 'Note')}</title>
  <style>
    body { font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 32px; max-width: 720px; margin: 0 auto; color: #202124; }
    .version-meta { font-size: 12px; color: #5f6368; margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  ${bodyHtml}
  <div class="version-meta">
    Snapshot from: ${d.toLocaleString()} &bull; ${escape(version.authorName)}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toastService.show({ message: `Downloaded ${filename}` }, 3000);
  }

  onModalClick(event: Event) {
    event.stopPropagation();
  }

  onOverlayClick(event: Event) {
    event.stopPropagation();
    this.close.emit();
  }

  onCloseClick(event: Event) {
    event.stopPropagation();
    this.close.emit();
  }
}
