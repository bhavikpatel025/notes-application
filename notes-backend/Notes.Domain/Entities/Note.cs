using System;
using System.Collections.Generic;
using Notes.Domain.Enums;

namespace Notes.Domain.Entities
{
    public class Note
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Color { get; set; } = "#FFFFFF";
        public bool IsPinned { get; set; } = false;
        public bool IsArchived { get; set; } = false;
        public bool IsTrashed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int OrderIndex { get; set; } = 0;
        
        public NoteType Type { get; set; } = NoteType.Regular;

        public DateTime? ReminderDateTime { get; set; }
        public ReminderRepeat? ReminderRepeat { get; set; }
        public bool IsReminderFired { get; set; } = false;

        // Foreign Key to IdentityUser
        public string UserId { get; set; } = string.Empty;
        public AppUser? User { get; set; }

        public List<string>? ImageUrls { get; set; } = new();

        public List<Label> Labels { get; set; } = new();
        public List<TodoItem> TodoItems { get; set; } = new();
        public List<NoteHistory> Histories { get; set; } = new();
        public List<NoteCollaborator> Collaborators { get; set; } = new();

        // Vault / Password Protection
        public bool IsLocked { get; set; } = false;
        public string? PinHash { get; set; }
        public string? PinSalt { get; set; }

        // Public Shareable Link
        public bool IsPublic { get; set; } = false;
        public string? PublicSlug { get; set; }
        public int PublicViewCount { get; set; } = 0;
    }
}
