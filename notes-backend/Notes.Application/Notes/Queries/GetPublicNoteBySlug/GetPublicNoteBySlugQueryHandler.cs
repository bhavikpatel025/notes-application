using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Queries.GetPublicNoteBySlug;

public class GetPublicNoteBySlugQueryHandler : IRequestHandler<GetPublicNoteBySlugQuery, PublicNoteDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPublicNoteBySlugQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicNoteDto?> Handle(GetPublicNoteBySlugQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Slug))
        {
            return null;
        }

        var note = await _context.Notes
            .Include(n => n.User)
            .Include(n => n.TodoItems)
            .FirstOrDefaultAsync(n => n.PublicSlug == request.Slug && n.IsPublic && !n.IsTrashed && !n.IsLocked, cancellationToken);

        if (note == null)
        {
            return null;
        }

        // Check if caller is the Note's owner
        bool isOwner = !string.IsNullOrEmpty(request.CurrentUserId) && note.UserId == request.CurrentUserId;

        // Only increment public view count for genuine first-time unique views (never for owner)
        if (request.IsUniqueView && !isOwner)
        {
            note.PublicViewCount += 1;
            await _context.SaveChangesAsync(cancellationToken);
        }

        string authorName = "Anonymous";
        if (note.User != null)
        {
            authorName = !string.IsNullOrWhiteSpace(note.User.FullName)
                ? note.User.FullName
                : (note.User.Email?.Split('@')[0] ?? "Anonymous");
        }

        return new PublicNoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            Color = note.Color,
            Type = note.Type,
            ImageUrls = note.ImageUrls ?? new List<string>(),
            TodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
            {
                Id = t.Id,
                Text = t.Text,
                IsCompleted = t.IsCompleted,
                OrderIndex = t.OrderIndex
            }).ToList(),
            OwnerName = authorName,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            PublicViewCount = note.PublicViewCount,
            PublicSlug = note.PublicSlug ?? string.Empty
        };
    }
}
