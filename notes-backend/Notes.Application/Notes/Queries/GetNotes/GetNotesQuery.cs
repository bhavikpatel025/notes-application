using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Queries.GetNotes;

public class GetNotesQuery : IRequest<List<NoteDto>>
{
    public string UserId { get; set; } = string.Empty;
}
