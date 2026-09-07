using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Labels.Commands.CreateLabel;

public class CreateLabelCommand : IRequest<LabelDto>
{
    public string Name { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}
