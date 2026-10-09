import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value?: string | Date | null): string {
    if (!value) return '';

    let parseable = value;
    if (typeof parseable === 'string' && !parseable.endsWith('Z') && !parseable.includes('+')) {
      parseable += 'Z';
    }
    const date = new Date(parseable);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (elapsedSeconds < 30) {
      return 'Just now';
    } else if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s ago`;
    } else if (elapsedSeconds < 3600) {
      const minutes = Math.floor(elapsedSeconds / 60);
      return `${minutes}m ago`;
    } else if (elapsedSeconds < 86400) {
      const hours = Math.floor(elapsedSeconds / 3600);
      return `${hours}h ago`;
    } else if (elapsedSeconds < 172800) {
      return 'Yesterday';
    } else {
      const days = Math.floor(elapsedSeconds / 86400);
      if (days < 7) {
        return `${days}d ago`;
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
}
