using System;
using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.RemoveNoteLock;

public class RemoveNoteLockCommand : IRequest<NoteDto>
{
    public Guid NoteId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
}
