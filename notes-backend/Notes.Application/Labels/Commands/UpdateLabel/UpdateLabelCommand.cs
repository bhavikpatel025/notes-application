using MediatR;
namespace Notes.Application.Labels.Commands.UpdateLabel;
public class UpdateLabelCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}
