using System;
using System.Collections.Generic;
using MediatR;
using Notes.Application.Notes.Common;
using Notes.Domain.Enums;

namespace Notes.Application.Notes.Commands.CreateNote;

public class CreateNoteCommand : IRequest<NoteDto>
{
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = "#FFFFFF";
    public NoteType Type { get; set; } = NoteType.Regular;
    public DateTime? ReminderDateTime { get; set; }
    public ReminderRepeat? ReminderRepeat { get; set; }
    public List<string> ImageUrls { get; set; } = new();
    public bool IsPinned { get; set; } = false;
    public bool IsArchived { get; set; } = false;
    public bool IsTrashed { get; set; } = false;
    public List<Guid>? LabelIds { get; set; } = new();
    public List<TodoItemDto>? TodoItems { get; set; } = new();
}
