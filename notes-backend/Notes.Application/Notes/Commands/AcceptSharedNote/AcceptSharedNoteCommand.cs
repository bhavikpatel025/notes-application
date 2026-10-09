using MediatR;
using Notes.Application.Notes.Common;
using System;

namespace Notes.Application.Notes.Commands.AcceptSharedNote;

public record AcceptSharedNoteCommand(Guid NoteId, string CurrentUserId) : IRequest<NoteDto>;
