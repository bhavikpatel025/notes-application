using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.GeneratePublicLink;

public class GeneratePublicLinkCommandHandler : IRequestHandler<GeneratePublicLinkCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private const string SlugCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public GeneratePublicLinkCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<NoteDto> Handle(GeneratePublicLinkCommand request, CancellationToken cancellationToken)
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
            throw new UnauthorizedAccessException("You are not authorized to share this note.");
        }

        if (note.IsLocked)
        {
            throw new InvalidOperationException("Locked notes cannot be shared publicly. Please remove the lock first.");
        }

        if (note.IsTrashed)
        {
            throw new InvalidOperationException("Cannot generate a public link for a trashed note.");
        }

        if (string.IsNullOrWhiteSpace(note.PublicSlug))
        {
            string slug;
            do
            {
                slug = GenerateRandomSlug(10);
            } while (await _context.Notes.AnyAsync(n => n.PublicSlug == slug, cancellationToken));

            note.PublicSlug = slug;
        }

        note.IsPublic = true;
        note.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            Color = note.Color,
            Type = note.Type,
            ReminderDateTime = note.ReminderDateTime,
            ReminderRepeat = note.ReminderRepeat,
            ImageUrls = note.ImageUrls ?? new List<string>(),
            IsPinned = note.IsPinned,
            IsArchived = note.IsArchived,
            IsTrashed = note.IsTrashed,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            OrderIndex = note.OrderIndex,
            Labels = note.Labels.Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList(),
            TodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
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

    private static string GenerateRandomSlug(int length)
    {
        var chars = new char[length];
        var bytes = RandomNumberGenerator.GetBytes(length);
        for (int i = 0; i < length; i++)
        {
            chars[i] = SlugCharacters[bytes[i] % SlugCharacters.Length];
        }
        return new string(chars);
    }
}
