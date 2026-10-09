import { TodoItemDto } from './note.model';

export interface NoteHistoryDto {
  id: string;
  noteId: string;
  title: string;
  content: string;
  type: number;
  todoItems: TodoItemDto[];
  imageUrls: string[];
  createdAt: string;
  authorName: string;
}
