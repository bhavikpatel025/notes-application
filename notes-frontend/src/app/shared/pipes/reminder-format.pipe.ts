import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reminderFormat',
  standalone: true
})
export class ReminderFormatPipe implements PipeTransform {
  transform(dateTimeStr?: string | null, repeat?: number | null): string {
    if (!dateTimeStr) return '';

    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let datePrefix = '';
    if (diffDays === 0) {
      datePrefix = 'Today';
    } else if (diffDays === 1) {
      datePrefix = 'Tomorrow';
    } else if (diffDays === -1) {
      datePrefix = 'Yesterday';
    } else if (diffDays > 1 && diffDays < 7) {
      datePrefix = date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      const isCurrentYear = date.getFullYear() === now.getFullYear();
      datePrefix = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      });
    }

    let repeatSuffix = '';
    if (repeat === 1) repeatSuffix = ', Daily';
    else if (repeat === 2) repeatSuffix = ', Weekly';
    else if (repeat === 3) repeatSuffix = ', Monthly';
    else if (repeat === 4) repeatSuffix = ', Yearly';

    return `${datePrefix}, ${timeString}${repeatSuffix}`;
  }
}
