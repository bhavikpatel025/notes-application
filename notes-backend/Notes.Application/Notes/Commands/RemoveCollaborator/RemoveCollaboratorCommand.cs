using System;
using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.RemoveCollaborator;

public class RemoveCollaboratorCommand : IRequest<NoteDto?>
{
    public Guid NoteId { get; set; }
    public string CurrentUserId { get; set; } = string.Empty;
    public string CollaboratorUserId { get; set; } = string.Empty;
}
