export interface TodoItemDto {
  id?: string;
  text: string;
  isCompleted: boolean;
  orderIndex?: number;
}

export interface CollaboratorDto {
  userId: string;
  email: string;
  fullName: string;
  isOwner?: boolean;
}

export interface NoteDto {
  id: string;
  title: string;
  content: string;
  color: string;
  type?: number; // 0 = Regular, 1 = Checklist
  reminderDateTime?: string | null;
  reminderRepeat?: number | null; // 0 = None, 1 = Daily, 2 = Weekly, 3 = Monthly, 4 = Yearly
  clearReminder?: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
  orderIndex: number;
  labels: { id: string, name: string }[];
  labelIds?: string[];
  imageUrls?: string[];
  todoItems?: TodoItemDto[];
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  isOwner?: boolean;
  isPendingAcceptance?: boolean;
  isLocked?: boolean;
  isPublic?: boolean;
  publicSlug?: string;
  publicViewCount?: number;
  collaborators?: CollaboratorDto[];
}

export interface PublicNoteDto {
  id: string;
  title: string;
  content: string;
  color: string;
  type?: number;
  imageUrls?: string[];
  todoItems?: TodoItemDto[];
  ownerName: string;
  createdAt: string;
  updatedAt?: string;
  publicViewCount: number;
  publicSlug: string;
}
