using System;
using System.Collections.Generic;

namespace Notes.Application.Notes.Common
{
    public class NoteHistoryDto
    {
        public Guid Id { get; set; }
        public Guid NoteId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int Type { get; set; } = 0;
        public List<TodoItemDto> TodoItems { get; set; } = new();
        public List<string> ImageUrls { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public string AuthorName { get; set; } = string.Empty;
    }
}
