using MediatR;

namespace Notes.Application.Notes.Commands.EmptyTrash;

public class EmptyTrashCommand : IRequest<bool>
{
    public string UserId { get; set; } = string.Empty;
}
