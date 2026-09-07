using MediatR;
using Notes.Application.Notes.Common;
namespace Notes.Application.Labels.Queries.GetLabels;
public class GetLabelsQuery : IRequest<List<LabelDto>>
{
    public string UserId { get; set; } = string.Empty;
}
