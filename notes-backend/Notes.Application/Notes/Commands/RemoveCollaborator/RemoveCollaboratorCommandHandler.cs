using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.RemoveCollaborator;

public class RemoveCollaboratorCommandHandler : IRequestHandler<RemoveCollaboratorCommand, NoteDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly INoteNotificationService _notificationService;

    public RemoveCollaboratorCommandHandler(IApplicationDbContext context, INoteNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<NoteDto?> Handle(RemoveCollaboratorCommand request, CancellationToken cancellationToken)
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

        bool isOwner = note.UserId == request.CurrentUserId;
        bool isSelf = request.CollaboratorUserId == request.CurrentUserId;

        // Only owner can remove someone else, or collaborator can remove themselves
        if (!isOwner && !isSelf)
        {
            throw new UnauthorizedAccessException("You are not authorized to remove collaborators from this note.");
        }

        var collaborator = note.Collaborators.FirstOrDefault(c => c.UserId == request.CollaboratorUserId);
        if (collaborator == null)
        {
            throw new InvalidOperationException("Collaborator not found on this note.");
        }

        _context.NoteCollaborators.Remove(collaborator);
        await _context.SaveChangesAsync(cancellationToken);

        note.Collaborators.Remove(collaborator);

        var noteDto = new NoteDto
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
            Collaborators = note.Collaborators.Select(c => new CollaboratorDto
            {
                UserId = c.UserId,
                Email = c.User != null ? c.User.Email ?? "" : "",
                FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                IsOwner = false
            }).ToList()
        };

        // Real-Time SignalR Broadcast
        // 1. Inform the removed user that note is deleted/removed for them
        await _notificationService.NotifyNoteDeletedAsync(note.Id, new[] { request.CollaboratorUserId });

        // 2. Inform the owner and remaining collaborators of the update
        var remainingUserIds = note.Collaborators.Select(c => c.UserId).Concat(new[] { note.UserId });
        await _notificationService.NotifyNoteUpdatedAsync(noteDto, remainingUserIds);

        return isSelf ? null : noteDto;
    }
}
