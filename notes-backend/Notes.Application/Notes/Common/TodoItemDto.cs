using System;

namespace Notes.Application.Notes.Common;

public class TodoItemDto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;
    public int OrderIndex { get; set; } = 0;
}
