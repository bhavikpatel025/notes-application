import { Component, EventEmitter, Input, OnInit, Output, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReminderNotificationService } from '../../../core/services/reminder-notification.service';

export interface ReminderResult {
  reminderDateTime: string;
  reminderRepeat: number; // 0 = None, 1 = Daily, 2 = Weekly, 3 = Monthly, 4 = Yearly
}

@Component({
  selector: 'app-reminder-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reminder-popup.component.html',
  styleUrl: './reminder-popup.component.scss'
})
export class ReminderPopupComponent implements OnInit {
  @Input() currentReminderDateTime?: string | null;
  @Input() currentReminderRepeat?: number | null;
  @Output() reminderSet = new EventEmitter<ReminderResult>();
  @Output() reminderDeleted = new EventEmitter<void>();
  @Output() closePopup = new EventEmitter<void>();

  private elementRef = inject(ElementRef);
  private reminderNotificationService = inject(ReminderNotificationService);

  isCustomView = false;

  // Custom Form Fields
  selectedDate = ''; // YYYY-MM-DD
  selectedTimeType = 'custom'; // 'morning' | 'afternoon' | 'evening' | 'night' | 'custom'
  customTime = '08:00';
  selectedRepeat = 0; // 0: None, 1: Daily, 2: Weekly, 3: Monthly, 4: Yearly

  // Dynamic Preset Labels
  laterTodayTime = '6:00 PM';
  tomorrowTime = 'Tomorrow, 8:00 AM';
  nextWeekTime = 'Mon, 8:00 AM';

  ngOnInit() {
    this.calculatePresets();

    if (this.currentReminderDateTime) {
      const dt = new Date(this.currentReminderDateTime);
      this.selectedDate = this.formatDateInput(dt);
      
      const hours = dt.getHours();
      const minutes = dt.getMinutes();
      const timeStr = `${this.padZero(hours)}:${this.padZero(minutes)}`;
      this.customTime = timeStr;

      if (hours === 8 && minutes === 0) this.selectedTimeType = 'morning';
      else if (hours === 13 && minutes === 0) this.selectedTimeType = 'afternoon';
      else if (hours === 18 && minutes === 0) this.selectedTimeType = 'evening';
      else if (hours === 20 && minutes === 0) this.selectedTimeType = 'night';
      else this.selectedTimeType = 'custom';

      this.selectedRepeat = this.currentReminderRepeat || 0;
    } else {
      const today = new Date();
      this.selectedDate = this.formatDateInput(today);
      this.selectedTimeType = 'custom';
      const hours = today.getHours();
      const minutes = today.getMinutes();
      this.customTime = `${this.padZero(hours)}:${this.padZero(minutes)}`;
      this.selectedRepeat = 0;
    }
  }

  calculatePresets() {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 17) {
      this.laterTodayTime = '6:00 PM';
    } else if (currentHour < 19) {
      this.laterTodayTime = '8:00 PM';
    } else {
      this.laterTodayTime = '9:00 PM';
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.tomorrowTime = '8:00 AM';

    // Next Monday
    const nextMon = new Date();
    const day = nextMon.getDay();
    const diff = (8 - day) % 7 || 7; // days until next Monday
    nextMon.setDate(nextMon.getDate() + diff);
    const dayName = nextMon.toLocaleDateString('en-US', { weekday: 'short' });
    this.nextWeekTime = `${dayName}, 8:00 AM`;
  }

  selectLaterToday(event: Event) {
    event.stopPropagation();
    this.reminderNotificationService.requestPermission();
    const now = new Date();
    let targetHour = 18;
    if (now.getHours() >= 17 && now.getHours() < 19) targetHour = 20;
    else if (now.getHours() >= 19) targetHour = 21;

    now.setHours(targetHour, 0, 0, 0);
    this.reminderSet.emit({
      reminderDateTime: now.toISOString(),
      reminderRepeat: 0
    });
    this.closePopup.emit();
  }

  selectTomorrow(event: Event) {
    event.stopPropagation();
    this.reminderNotificationService.requestPermission();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    this.reminderSet.emit({
      reminderDateTime: tomorrow.toISOString(),
      reminderRepeat: 0
    });
    this.closePopup.emit();
  }

  selectNextWeek(event: Event) {
    event.stopPropagation();
    this.reminderNotificationService.requestPermission();
    const nextMon = new Date();
    const day = nextMon.getDay();
    const diff = (8 - day) % 7 || 7;
    nextMon.setDate(nextMon.getDate() + diff);
    nextMon.setHours(8, 0, 0, 0);

    this.reminderSet.emit({
      reminderDateTime: nextMon.toISOString(),
      reminderRepeat: 0
    });
    this.closePopup.emit();
  }

  switchToCustom(event: Event) {
    event.stopPropagation();
    this.isCustomView = true;
  }

  switchBackToPresets(event: Event) {
    event.stopPropagation();
    this.isCustomView = false;
  }

  saveCustomReminder(event: Event) {
    event.stopPropagation();
    this.reminderNotificationService.requestPermission();
    if (!this.selectedDate) return;

    let timeString = '08:00';
    if (this.selectedTimeType === 'morning') timeString = '08:00';
    else if (this.selectedTimeType === 'afternoon') timeString = '13:00';
    else if (this.selectedTimeType === 'evening') timeString = '18:00';
    else if (this.selectedTimeType === 'night') timeString = '20:00';
    else if (this.selectedTimeType === 'custom') timeString = this.customTime || '08:00';

    const [hours, minutes] = timeString.split(':').map(Number);
    const [year, month, day] = this.selectedDate.split('-').map(Number);

    let reminderDate = new Date(year, month - 1, day, hours, minutes, 0);

    const repeat = Number(this.selectedRepeat);
    // If recurring and user picked past date/time, automatically roll forward to next upcoming occurrence
    if (repeat > 0) {
      const now = new Date();
      while (reminderDate.getTime() <= now.getTime()) {
        switch (repeat) {
          case 1: // Daily
            reminderDate.setDate(reminderDate.getDate() + 1);
            break;
          case 2: // Weekly
            reminderDate.setDate(reminderDate.getDate() + 7);
            break;
          case 3: // Monthly
            reminderDate.setMonth(reminderDate.getMonth() + 1);
            break;
          case 4: // Yearly
            reminderDate.setFullYear(reminderDate.getFullYear() + 1);
            break;
        }
      }
    }

    this.reminderSet.emit({
      reminderDateTime: reminderDate.toISOString(),
      reminderRepeat: repeat
    });
    this.closePopup.emit();
  }

  deleteReminder(event: Event) {
    event.stopPropagation();
    this.reminderDeleted.emit();
    this.closePopup.emit();
  }

  private formatDateInput(d: Date): string {
    const year = d.getFullYear();
    const month = this.padZero(d.getMonth() + 1);
    const day = this.padZero(d.getDate());
    return `${year}-${month}-${day}`;
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }
}
