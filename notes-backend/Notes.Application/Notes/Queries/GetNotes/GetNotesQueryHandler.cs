using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;
using System.Linq;

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
            .Where(n => n.UserId == request.UserId || n.Collaborators.Any(c => c.UserId == request.UserId))
            .OrderBy(n => n.OrderIndex)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n => new NoteDto
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.IsLocked ? string.Empty : n.Content,
                Color = n.Color,
                Type = n.Type,
                ReminderDateTime = n.ReminderDateTime,
                ReminderRepeat = n.ReminderRepeat,
                ImageUrls = n.IsLocked ? new List<string>() : (n.ImageUrls ?? new List<string>()),
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
                }).ToList(),
                TodoItems = n.IsLocked ? new List<TodoItemDto>() : n.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
                {
                    Id = t.Id,
                    Text = t.Text,
                    IsCompleted = t.IsCompleted,
                    OrderIndex = t.OrderIndex
                }).ToList(),
                OwnerId = n.UserId,
                OwnerEmail = n.User != null ? n.User.Email ?? "" : "",
                OwnerName = n.User != null ? (string.IsNullOrWhiteSpace(n.User.FullName) ? (n.User.Email ?? "") : n.User.FullName) : "",
                IsOwner = n.UserId == request.UserId,
                IsPendingAcceptance = n.UserId != request.UserId && n.Collaborators.Any(c => c.UserId == request.UserId && !c.IsAccepted),
                IsLocked = n.IsLocked,
                IsPublic = n.IsPublic,
                PublicSlug = n.PublicSlug,
                PublicViewCount = n.PublicViewCount,
                Collaborators = n.Collaborators.Select(c => new CollaboratorDto
                {
                    UserId = c.UserId,
                    Email = c.User != null ? c.User.Email ?? "" : "",
                    FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                    IsOwner = false
                }).ToList()
            })
            .ToListAsync(cancellationToken);
    }
}
