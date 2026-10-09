import { Injectable, inject } from '@angular/core';
import { NoteService } from './note.service';
import { ToastService } from './toast.service';
import { NoteDto } from '../../shared/models/note.model';

@Injectable({
  providedIn: 'root'
})
export class ReminderNotificationService {
  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  private intervalId: any = null;
  private triggeredReminders = new Set<string>();

  init() {
    this.requestPermission();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  private checkReminders() {
    const notes = this.noteService.reminderNotes();
    if (!notes || notes.length === 0) return;

    const now = Date.now();

    notes.forEach(note => {
      if (!note.reminderDateTime) return;

      const reminderTime = new Date(note.reminderDateTime).getTime();
      if (isNaN(reminderTime)) return;

      // Key format: noteId + timestamp
      const reminderKey = `${note.id}_${note.reminderDateTime}`;

      // Trigger if reminder time has arrived/passed and hasn't been fired (within 48 hours window)
      if (reminderTime <= now && (now - reminderTime) < 48 * 60 * 60 * 1000) {
        if (!this.triggeredReminders.has(reminderKey)) {
          this.triggeredReminders.add(reminderKey);
          console.log(`[ReminderService] 🔔 Reminder triggered for note: "${note.title || 'Untitled'}" at ${new Date().toLocaleTimeString()}`);
          this.fireReminderNotification(note);
        }
      } else if (reminderTime <= now && note.reminderRepeat && note.reminderRepeat > 0) {
        // If a recurring reminder is farther in the past, roll it forward to future
        this.handleRecurringReminder(note);
      }
    });
  }

  private fireReminderNotification(note: NoteDto) {
    const title = note.title || 'Note Reminder';
    const content = note.content || (note.todoItems && note.todoItems.length > 0 ? note.todoItems.map(t => t.text).filter(Boolean).join(', ') : 'You have an upcoming reminder.');

    // 1. Play melodic notification sound chime
    this.playReminderChime();

    // 2. Show in-app Toast
    this.toastService.show({
      message: `⏰ Reminder: ${title}`,
      actionLabel: 'View'
    }, 8000);

    // 3. Show System / Browser Native Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: content,
          icon: '/favicon.ico',
          tag: note.id
        });

        notif.onclick = () => {
          window.focus();
        };
      } catch (e) {
        console.warn('Browser notification failed', e);
      }
    }

    // 4. Handle recurring reminder if repeat is enabled
    if (note.reminderRepeat && note.reminderRepeat > 0) {
      this.handleRecurringReminder(note);
    }
  }

  private handleRecurringReminder(note: NoteDto) {
    if (!note.reminderDateTime) return;
    const nextDt = new Date(note.reminderDateTime);

    while (nextDt.getTime() <= Date.now()) {
      switch (note.reminderRepeat) {
        case 1: // Daily
          nextDt.setDate(nextDt.getDate() + 1);
          break;
        case 2: // Weekly
          nextDt.setDate(nextDt.getDate() + 7);
          break;
        case 3: // Monthly
          nextDt.setMonth(nextDt.getMonth() + 1);
          break;
        case 4: // Yearly
          nextDt.setFullYear(nextDt.getFullYear() + 1);
          break;
        default:
          return;
      }
    }

    this.noteService.updateNote(note.id, {
      ...note,
      reminderDateTime: nextDt.toISOString()
    }).subscribe();
  }

  private playReminderChime() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // First note (D5 - 587.33Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Second note (A5 - 880Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.18);
      gain2.gain.setValueAtTime(0.25, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio chime playback error', e);
    }
  }
}
