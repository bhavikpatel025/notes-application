export enum NotificationType {
  Reminder = 1,
  CollaboratorAdded = 2,
  CollaboratorRemoved = 3,
  CollaboratorLeft = 4,
  NoteUpdated = 5
}

export interface NotificationDto {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  noteId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListDto {
  notifications: NotificationDto[];
  unreadCount: number;
}
