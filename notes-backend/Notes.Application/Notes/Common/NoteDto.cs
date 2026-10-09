using System;
using System.Collections.Generic;
using Notes.Domain.Enums;

namespace Notes.Application.Notes.Common;

public class NoteDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = "#FFFFFF";
    public bool IsPinned { get; set; }
    public bool IsArchived { get; set; }
    public bool IsTrashed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int OrderIndex { get; set; }
    public NoteType Type { get; set; } = NoteType.Regular;
    public DateTime? ReminderDateTime { get; set; }
    public ReminderRepeat? ReminderRepeat { get; set; }
    public List<string> ImageUrls { get; set; } = new();
    public List<LabelDto> Labels { get; set; } = new();
    public List<TodoItemDto> TodoItems { get; set; } = new();

    // Collaboration fields
    public string OwnerId { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public bool IsOwner { get; set; } = true;
    public bool IsPendingAcceptance { get; set; } = false;
    public bool IsLocked { get; set; } = false;
    public bool IsPublic { get; set; } = false;
    public string? PublicSlug { get; set; }
    public int PublicViewCount { get; set; } = 0;
    public List<CollaboratorDto> Collaborators { get; set; } = new();
}
