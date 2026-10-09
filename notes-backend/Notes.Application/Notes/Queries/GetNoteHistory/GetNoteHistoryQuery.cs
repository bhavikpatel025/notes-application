using MediatR;
using Notes.Application.Notes.Common;
using System;
using System.Collections.Generic;

namespace Notes.Application.Notes.Queries.GetNoteHistory
{
    public class GetNoteHistoryQuery : IRequest<List<NoteHistoryDto>>
    {
        public Guid NoteId { get; set; }
        public string UserId { get; set; } = string.Empty;
    }
}
