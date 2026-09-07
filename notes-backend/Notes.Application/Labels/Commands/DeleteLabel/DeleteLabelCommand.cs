using MediatR;
namespace Notes.Application.Labels.Commands.DeleteLabel;
public class DeleteLabelCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
}
