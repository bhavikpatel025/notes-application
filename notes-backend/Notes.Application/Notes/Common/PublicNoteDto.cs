using System;
using System.Collections.Generic;
using Notes.Domain.Enums;

namespace Notes.Application.Notes.Common;

public class PublicNoteDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = "#FFFFFF";
    public NoteType Type { get; set; } = NoteType.Regular;
    public List<string> ImageUrls { get; set; } = new();
    public List<TodoItemDto> TodoItems { get; set; } = new();
    public string OwnerName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int PublicViewCount { get; set; }
    public string PublicSlug { get; set; } = string.Empty;
}
