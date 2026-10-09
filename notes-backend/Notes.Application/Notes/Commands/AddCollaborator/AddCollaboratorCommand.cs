using System;
using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.AddCollaborator;

public class AddCollaboratorCommand : IRequest<NoteDto>
{
    public Guid NoteId { get; set; }
    public string CurrentUserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
