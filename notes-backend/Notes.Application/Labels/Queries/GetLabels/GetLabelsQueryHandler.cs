using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;
namespace Notes.Application.Labels.Queries.GetLabels;
public class GetLabelsQueryHandler : IRequestHandler<GetLabelsQuery, List<LabelDto>>
{
    private readonly IApplicationDbContext _context;
    public GetLabelsQueryHandler(IApplicationDbContext context) => _context = context;
    public async Task<List<LabelDto>> Handle(GetLabelsQuery request, CancellationToken cancellationToken)
    {
        return await _context.Labels
            .Where(l => l.UserId == request.UserId)
            .OrderBy(l => l.Name)
            .Select(l => new LabelDto { Id = l.Id, Name = l.Name })
            .ToListAsync(cancellationToken);
    }
}
