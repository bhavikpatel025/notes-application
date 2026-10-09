using System;
using System.Collections.Generic;
using Notes.Domain.Enums;

namespace Notes.Domain.Entities
{
    public class NoteHistory
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid NoteId { get; set; }
        public Note? Note { get; set; }

        public string UserId { get; set; } = string.Empty;
        public AppUser? User { get; set; }

        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public NoteType Type { get; set; } = NoteType.Regular;

        // Serialized JSON of checklist items at this version
        public string? TodoItemsJson { get; set; }

        public List<string>? ImageUrls { get; set; } = new();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
