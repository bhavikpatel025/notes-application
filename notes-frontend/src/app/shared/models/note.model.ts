export interface NoteDto {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
  orderIndex: number;
  labels: { id: string, name: string }[];
  labelIds?: string[];
  imageUrls?: string[];
}
