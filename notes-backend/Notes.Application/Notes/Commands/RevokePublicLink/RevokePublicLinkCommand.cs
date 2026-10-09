using System;
using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.RevokePublicLink;

public class RevokePublicLinkCommand : IRequest<NoteDto>
{
    public Guid NoteId { get; set; }
    public string UserId { get; set; } = string.Empty;
}
