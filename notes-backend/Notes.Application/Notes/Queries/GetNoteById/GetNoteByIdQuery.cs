using System;
using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Queries.GetNoteById;

public class GetNoteByIdQuery : IRequest<NoteDto?>
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
}
