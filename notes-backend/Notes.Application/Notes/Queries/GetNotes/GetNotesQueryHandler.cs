using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;

namespace Notes.Application.Notes.Queries.GetNotes;

public class GetNotesQueryHandler : IRequestHandler<GetNotesQuery, List<NoteDto>>
{
    private readonly IApplicationDbContext _context;

    public GetNotesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<NoteDto>> Handle(GetNotesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Notes
            .Where(n => n.UserId == request.UserId)
            .OrderBy(n => n.OrderIndex)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n => new NoteDto
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                Color = n.Color,
                ImageUrls = n.ImageUrls ?? new List<string>(),
                IsPinned = n.IsPinned,
                IsArchived = n.IsArchived,
                IsTrashed = n.IsTrashed,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt,
                OrderIndex = n.OrderIndex,
                Labels = n.Labels.Select(l => new LabelDto
                {
                    Id = l.Id,
                    Name = l.Name
                }).ToList()
            })
            .ToListAsync(cancellationToken);
    }
}
