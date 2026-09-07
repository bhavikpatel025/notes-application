using MediatR;
using System;
using System.Collections.Generic;

namespace Notes.Application.Notes.Commands.ReorderNotes
{
    public class NoteOrderDto
    {
        public Guid Id { get; set; }
        public int OrderIndex { get; set; }
    }

    public class ReorderNotesCommand : IRequest<bool>
    {
        public string UserId { get; set; } = string.Empty;
        public List<NoteOrderDto> NoteOrders { get; set; } = new();
    }
}
