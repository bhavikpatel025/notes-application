using MediatR;

namespace Notes.Application.Notes.Commands.DeleteNote;

public class DeleteNoteCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
}
