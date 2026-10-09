using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;
using Notes.Domain.Entities;

using Microsoft.Extensions.Logging;

namespace Notes.Application.Notes.Commands.AddCollaborator;

public class AddCollaboratorCommandHandler : IRequestHandler<AddCollaboratorCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private readonly INoteNotificationService _notificationService;
    private readonly IEmailNotificationService _emailService;
    private readonly ILogger<AddCollaboratorCommandHandler> _logger;

    public AddCollaboratorCommandHandler(
        IApplicationDbContext context, 
        INoteNotificationService notificationService,
        IEmailNotificationService emailService,
        ILogger<AddCollaboratorCommandHandler> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<NoteDto> Handle(AddCollaboratorCommand request, CancellationToken cancellationToken)
    {
        var cleanEmail = request.Email.Trim().ToLowerInvariant();

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

        // Only note owner can add collaborators
        if (note.UserId != request.CurrentUserId)
        {
            throw new UnauthorizedAccessException("Only the owner can add collaborators to this note.");
        }

        var targetUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail, cancellationToken);

        if (targetUser == null)
        {
            throw new InvalidOperationException($"No registered account found with email '{request.Email}'.");
        }

        if (targetUser.Id == note.UserId)
        {
            throw new InvalidOperationException("You cannot add yourself as a collaborator.");
        }

        if (note.Collaborators.Any(c => c.UserId == targetUser.Id))
        {
            throw new InvalidOperationException("This user is already a collaborator on this note.");
        }

        var newCollaborator = new NoteCollaborator
        {
            Id = Guid.NewGuid(),
            NoteId = note.Id,
            UserId = targetUser.Id,
            User = targetUser,
            CreatedAt = DateTime.UtcNow
        };

        _context.NoteCollaborators.Add(newCollaborator);
        note.Collaborators.Add(newCollaborator);

        // Create and persist Collaboration Notification to targetUser
        var senderName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? note.User.Email ?? "Someone" : note.User.FullName) : "Someone";
        var senderEmail = note.User?.Email ?? "";
        var noteTitle = string.IsNullOrWhiteSpace(note.Title) ? "Untitled note" : note.Title;

        var collabNotification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = targetUser.Id,
            SenderId = note.UserId,
            SenderEmail = senderEmail,
            SenderName = senderName,
            NoteId = note.Id,
            Title = "Note shared with you",
            Message = $"{senderName} shared a note \"{noteTitle}\" with you.",
            Type = Domain.Enums.NotificationType.CollaboratorAdded,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(collabNotification);
        await _context.SaveChangesAsync(cancellationToken);

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
            IsOwner = true,
            Collaborators = note.Collaborators.Select(c => new CollaboratorDto
            {
                UserId = c.UserId,
                Email = c.User != null ? c.User.Email ?? "" : (c.UserId == targetUser.Id ? targetUser.Email ?? "" : ""),
                FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : (c.UserId == targetUser.Id ? (string.IsNullOrWhiteSpace(targetUser.FullName) ? targetUser.Email ?? "" : targetUser.FullName) : ""),
                IsOwner = false
            }).ToList()
        };

        // Real-Time SignalR Broadcast
        // 1. Send NoteCreated to the new collaborator
        await _notificationService.NotifyNoteCreatedAsync(new NoteDto
        {
            Id = noteDto.Id,
            Title = noteDto.Title,
            Content = noteDto.Content,
            Color = noteDto.Color,
            Type = noteDto.Type,
            ReminderDateTime = noteDto.ReminderDateTime,
            ReminderRepeat = noteDto.ReminderRepeat,
            ImageUrls = noteDto.ImageUrls,
            IsPinned = noteDto.IsPinned,
            IsArchived = noteDto.IsArchived,
            IsTrashed = noteDto.IsTrashed,
            CreatedAt = noteDto.CreatedAt,
            UpdatedAt = noteDto.UpdatedAt,
            OrderIndex = noteDto.OrderIndex,
            Labels = noteDto.Labels,
            TodoItems = noteDto.TodoItems,
            OwnerId = noteDto.OwnerId,
            OwnerEmail = noteDto.OwnerEmail,
            OwnerName = noteDto.OwnerName,
            IsOwner = false,
            IsPendingAcceptance = true,
            Collaborators = noteDto.Collaborators
        }, new[] { targetUser.Id });

        // 2. Send NoteUpdated to owner and other existing collaborators
        var otherUserIds = note.Collaborators.Where(c => c.UserId != targetUser.Id).Select(c => c.UserId).Concat(new[] { note.UserId });
        await _notificationService.NotifyNoteUpdatedAsync(noteDto, otherUserIds);

        // 3. Push live notification to targetUser
        await _notificationService.NotifyNotificationCreatedAsync(new Notifications.Common.NotificationDto
        {
            Id = collabNotification.Id,
            UserId = collabNotification.UserId,
            SenderId = collabNotification.SenderId,
            SenderEmail = collabNotification.SenderEmail,
            SenderName = collabNotification.SenderName,
            NoteId = collabNotification.NoteId,
            Title = collabNotification.Title,
            Message = collabNotification.Message,
            Type = collabNotification.Type,
            IsRead = collabNotification.IsRead,
            CreatedAt = collabNotification.CreatedAt
        }, targetUser.Id);

        // 4. Dispatch real email notification via SMTP in background
        if (!string.IsNullOrWhiteSpace(targetUser.Email))
        {
            var recipient = targetUser.Email;
            var ownerDisplayName = senderName;
            var ownerMail = senderEmail;
            var currentNoteTitle = noteTitle;
            var currentNoteId = note.Id;

            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendCollaborationInviteEmailAsync(
                        recipientEmail: recipient,
                        ownerName: ownerDisplayName,
                        ownerEmail: ownerMail,
                        noteTitle: currentNoteTitle,
                        noteId: currentNoteId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send collaboration invite email to {Recipient}", recipient);
                }
            });
        }

        return noteDto;
    }
}
