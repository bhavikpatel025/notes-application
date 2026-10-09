using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.RevokePublicLink;

public class RevokePublicLinkCommandHandler : IRequestHandler<RevokePublicLinkCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;

    public RevokePublicLinkCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<NoteDto> Handle(RevokePublicLinkCommand request, CancellationToken cancellationToken)
    {
        var note = await _context.Notes
            .Include(n => n.User)
            .Include(n => n.Labels)
            .Include(n => n.TodoItems)
            .Include(n => n.Collaborators)
                .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(n => n.Id == request.NoteId, cancellationToken);

        if (note == null)
        {
            throw new KeyNotFoundException("Note not found.");
        }

        bool isOwner = note.UserId == request.UserId;
        bool isCollaborator = note.Collaborators.Any(c => c.UserId == request.UserId);

        if (!isOwner && !isCollaborator)
        {
            throw new UnauthorizedAccessException("You are not authorized to modify public sharing for this note.");
        }

        note.IsPublic = false;
        note.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.IsLocked ? string.Empty : note.Content,
            Color = note.Color,
            Type = note.Type,
            ReminderDateTime = note.ReminderDateTime,
            ReminderRepeat = note.ReminderRepeat,
            ImageUrls = note.IsLocked ? new List<string>() : (note.ImageUrls ?? new List<string>()),
            IsPinned = note.IsPinned,
            IsArchived = note.IsArchived,
            IsTrashed = note.IsTrashed,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            OrderIndex = note.OrderIndex,
            Labels = note.Labels.Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList(),
            TodoItems = note.IsLocked 
                ? new List<TodoItemDto>() 
                : note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
                {
                    Id = t.Id,
                    Text = t.Text,
                    IsCompleted = t.IsCompleted,
                    OrderIndex = t.OrderIndex
                }).ToList(),
            OwnerId = note.UserId,
            OwnerEmail = note.User != null ? note.User.Email ?? "" : "",
            OwnerName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? (note.User.Email ?? "") : note.User.FullName) : "",
            IsOwner = isOwner,
            IsPendingAcceptance = false,
            IsLocked = note.IsLocked,
            IsPublic = note.IsPublic,
            PublicSlug = note.PublicSlug,
            PublicViewCount = note.PublicViewCount,
            Collaborators = note.Collaborators.Select(c => new CollaboratorDto
            {
                UserId = c.UserId,
                Email = c.User != null ? c.User.Email ?? "" : "",
                FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                IsOwner = false
            }).ToList()
        };
    }
}
