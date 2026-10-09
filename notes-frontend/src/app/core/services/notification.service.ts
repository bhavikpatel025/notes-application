import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationDto, NotificationListDto, NotificationType } from '../../shared/models/notification.model';
import { SignalRService } from './signalr.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private signalRService = inject(SignalRService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  private apiUrl = `${environment.apiUrl}/Notifications`;

  public notifications = signal<NotificationDto[]>([]);
  public unreadCount = signal<number>(0);
  public openNoteFromNotification$ = new Subject<string>(); // Emits noteId to open note dialog

  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load initial notifications if authenticated
    if (this.authService.currentUser()) {
      this.fetchNotifications();
    }

    // Subscribe to live SignalR notifications
    this.signalRService.notificationReceived$.subscribe((notif: NotificationDto) => {
      this.handleIncomingNotification(notif);
    });

    // Request browser notification permission
    this.requestBrowserPermission();
  }

  public fetchNotifications(): void {
    if (!this.authService.getToken()) return;

    this.http.get<NotificationListDto>(this.apiUrl).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications || []);
        this.unreadCount.set(res.unreadCount || 0);
      },
      error: (err) => {
        console.error('[NotificationService] Error fetching notifications:', err);
      }
    });
  }

  private handleIncomingNotification(notif: NotificationDto): void {
    // 1. Update local signal state
    const currentList = this.notifications();
    // Avoid duplicate
    if (!currentList.some(n => n.id === notif.id)) {
      this.notifications.set([notif, ...currentList]);
      if (!notif.isRead) {
        this.unreadCount.update(c => c + 1);
      }
    }

    // 2. Play subtle audio chime
    this.playNotificationChime();

    // 3. Show In-App Toast
    const toastTitle = notif.title || 'Notification';
    this.toastService.show({
      message: `${notif.type === NotificationType.Reminder ? '⏰ ' : '🔔 '}${toastTitle}: ${notif.message}`,
      actionLabel: notif.noteId ? 'View' : undefined,
      action: notif.noteId ? () => {
        this.markAsRead(notif.id);
        if (notif.noteId) {
          this.openNoteFromNotification$.next(notif.noteId);
        }
      } : undefined
    }, 7000);

    // 4. Native Browser Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotif = new Notification(notif.title, {
          body: notif.message,
          icon: '/favicon.ico',
          tag: notif.id
        });

        browserNotif.onclick = () => {
          window.focus();
          if (notif.noteId) {
            this.markAsRead(notif.id);
            this.openNoteFromNotification$.next(notif.noteId);
          }
        };
      } catch (e) {
        console.warn('Browser notification error', e);
      }
    }
  }

  public markAsRead(id: string): void {
    const item = this.notifications().find(n => n.id === id);
    if (!item || item.isRead) return;

    // Optimistic UI update
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
    this.unreadCount.update(c => Math.max(0, c - 1));

    this.http.put(`${this.apiUrl}/${id}/read`, {}).subscribe({
      error: (err) => console.error('[NotificationService] Error marking as read:', err)
    });
  }

  public markAllAsRead(): void {
    if (this.unreadCount() === 0) return;

    // Optimistic UI update
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.unreadCount.set(0);

    this.http.put(`${this.apiUrl}/read-all`, {}).subscribe({
      error: (err) => console.error('[NotificationService] Error marking all as read:', err)
    });
  }

  public deleteNotification(id: string): void {
    const item = this.notifications().find(n => n.id === id);
    const wasUnread = item && !item.isRead;

    // Optimistic UI update
    this.notifications.update(list => list.filter(n => n.id !== id));
    if (wasUnread) {
      this.unreadCount.update(c => Math.max(0, c - 1));
    }

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      error: (err) => console.error('[NotificationService] Error deleting notification:', err)
    });
  }

  public clearAll(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);

    this.http.delete(`${this.apiUrl}/clear-all`).subscribe({
      error: (err) => console.error('[NotificationService] Error clearing notifications:', err)
    });
  }

  private requestBrowserPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  private playNotificationChime(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // Bell chime note 1 (E5 - 659.25Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Bell chime note 2 (B5 - 987.77Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio chime playback error', e);
    }
  }
}
