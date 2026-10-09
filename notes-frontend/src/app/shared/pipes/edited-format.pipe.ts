import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'editedFormat',
  standalone: true
})
export class EditedFormatPipe implements PipeTransform {
  transform(updatedAt?: string | null, createdAt?: string | null): string {
    const timeStr = updatedAt || createdAt;
    if (!timeStr) return '';

    let parseable = timeStr;
    if (typeof parseable === 'string' && !parseable.endsWith('Z') && !parseable.includes('+')) {
      parseable += 'Z';
    }
    const date = new Date(parseable);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today: "Edited 1:41 PM"
      const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `Edited ${timeString}`;
    } else if (diffDays === 1) {
      // Yesterday: "Edited yesterday"
      return 'Edited yesterday';
    } else {
      const isCurrentYear = date.getFullYear() === now.getFullYear();
      const dateString = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      });
      return `Edited ${dateString}`;
    }
  }
}
