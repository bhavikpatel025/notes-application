using System;
using System.Collections.Generic;
using MediatR;
using Notes.Application.Notes.Common;
using Notes.Domain.Enums;

namespace Notes.Application.Notes.Commands.UpdateNote;

public class UpdateNoteCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public NoteType? Type { get; set; }
    public DateTime? ReminderDateTime { get; set; }
    public ReminderRepeat? ReminderRepeat { get; set; }
    public bool ClearReminder { get; set; } = false;
    public List<string>? ImageUrls { get; set; }
    public string UserId { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public bool IsArchived { get; set; }
    public bool IsTrashed { get; set; }
    public int OrderIndex { get; set; }
    public List<Guid>? LabelIds { get; set; }
    public List<TodoItemDto>? TodoItems { get; set; }
}
