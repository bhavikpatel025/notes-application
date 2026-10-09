using System;

namespace Notes.Domain.Entities;

public class TodoItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NoteId { get; set; }
    public Note? Note { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;
    public int OrderIndex { get; set; } = 0;
}
