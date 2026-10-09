import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NoteDto } from '../../shared/models/note.model';
import { NotificationDto } from '../../shared/models/notification.model';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private authService = inject(AuthService);
  private hubConnection: signalR.HubConnection | null = null;

  public noteCreated$ = new Subject<NoteDto>();
  public noteUpdated$ = new Subject<NoteDto>();
  public noteDeleted$ = new Subject<string>();
  public notificationReceived$ = new Subject<NotificationDto>();

  public startConnection(): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const hubBaseUrl = environment.apiUrl.replace('/api', '');
    const hubUrl = `${hubBaseUrl}/hubs/notes`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.authService.getToken() || '',
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('[SignalR] Connected successfully to NotesHub');
        this.registerHandlers();
      })
      .catch((err) => {
        console.error('[SignalR] Error establishing connection:', err);
      });

    this.hubConnection.onreconnecting((error) => {
      console.warn('[SignalR] Reconnecting to NotesHub...', error);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected to NotesHub. Connection ID:', connectionId);
    });

    this.hubConnection.onclose((error) => {
      console.warn('[SignalR] Connection closed.', error);
    });
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.off('NoteCreated');
    this.hubConnection.off('NoteUpdated');
    this.hubConnection.off('NoteDeleted');
    this.hubConnection.off('ReceiveNotification');

    this.hubConnection.on('NoteCreated', (note: NoteDto) => {
      console.log('[SignalR] Received NoteCreated:', note);
      this.noteCreated$.next(note);
    });

    this.hubConnection.on('NoteUpdated', (note: NoteDto) => {
      console.log('[SignalR] Received NoteUpdated:', note);
      this.noteUpdated$.next(note);
    });

    this.hubConnection.on('NoteDeleted', (noteId: string) => {
      console.log('[SignalR] Received NoteDeleted:', noteId);
      this.noteDeleted$.next(noteId);
    });

    this.hubConnection.on('ReceiveNotification', (notification: NotificationDto) => {
      console.log('[SignalR] Received ReceiveNotification:', notification);
      this.notificationReceived$.next(notification);
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        console.log('[SignalR] Disconnected from NotesHub');
        this.hubConnection = null;
      }).catch(err => console.error('[SignalR] Error stopping connection:', err));
    }
  }
}
