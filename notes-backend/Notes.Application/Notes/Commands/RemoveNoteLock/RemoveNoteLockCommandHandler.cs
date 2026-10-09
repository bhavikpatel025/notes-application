using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Commands.LockNote;
using Notes.Application.Notes.Common;
using Notes.Domain.Entities;

namespace Notes.Application.Notes.Commands.RemoveNoteLock;

public class RemoveNoteLockCommandHandler : IRequestHandler<RemoveNoteLockCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly INoteNotificationService _notificationService;

    public RemoveNoteLockCommandHandler(
        IApplicationDbContext context,
        IEncryptionService encryptionService,
        INoteNotificationService notificationService)
    {
        _context = context;
        _encryptionService = encryptionService;
        _notificationService = notificationService;
    }

    public async Task<NoteDto> Handle(RemoveNoteLockCommand request, CancellationToken cancellationToken)
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
            throw new UnauthorizedAccessException("You are not authorized to remove the lock on this note.");
        }

        if (!note.IsLocked)
        {
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
                TodoItems = note.TodoItems.Select(t => new TodoItemDto { Id = t.Id, Text = t.Text, IsCompleted = t.IsCompleted, OrderIndex = t.OrderIndex }).ToList(),
                OwnerId = note.UserId,
                OwnerEmail = note.User != null ? note.User.Email ?? "" : "",
                OwnerName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? (note.User.Email ?? "") : note.User.FullName) : "",
                IsOwner = isOwner,
                IsLocked = false
            };
        }

        // Verify PIN
        bool isValid = _encryptionService.VerifyPin(request.Pin, note.PinSalt!, note.PinHash!);
        if (!isValid)
        {
            throw new ArgumentException("Incorrect PIN.");
        }

        // Decrypt
        string decryptedJson;
        try
        {
            decryptedJson = _encryptionService.Decrypt(note.Content, request.Pin, note.PinSalt!);
        }
        catch (Exception)
        {
            throw new ArgumentException("Incorrect PIN or unable to decrypt note.");
        }
        string finalContent = decryptedJson;
        var restoredItems = new List<TodoItemDto>();

        try
        {
            var payload = JsonSerializer.Deserialize<LockedNotePayload>(decryptedJson);
            if (payload != null)
            {
                finalContent = payload.Content;
                if (payload.TodoItems != null && payload.TodoItems.Any())
                {
                    foreach (var itemDto in payload.TodoItems)
                    {
                        var todoEntity = new TodoItem
                        {
                            Id = Guid.NewGuid(),
                            NoteId = note.Id,
                            Text = itemDto.Text,
                            IsCompleted = itemDto.IsCompleted,
                            OrderIndex = itemDto.OrderIndex
                        };
                        _context.TodoItems.Add(todoEntity);
                        restoredItems.Add(new TodoItemDto
                        {
                            Id = todoEntity.Id,
                            Text = todoEntity.Text,
                            IsCompleted = todoEntity.IsCompleted,
                            OrderIndex = todoEntity.OrderIndex
                        });
                    }
                }
            }
        }
        catch
        {
            // Plaintext fallback
        }

        note.Content = finalContent;
        note.IsLocked = false;
        note.PinHash = null;
        note.PinSalt = null;
        note.UpdatedAt = DateTime.UtcNow;

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
            TodoItems = restoredItems,
            OwnerId = note.UserId,
            OwnerEmail = note.User != null ? note.User.Email ?? "" : "",
            OwnerName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? (note.User.Email ?? "") : note.User.FullName) : "",
            IsOwner = isOwner,
            IsPendingAcceptance = false,
            IsLocked = false,
            Collaborators = note.Collaborators.Select(c => new CollaboratorDto
            {
                UserId = c.UserId,
                Email = c.User != null ? c.User.Email ?? "" : "",
                FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                IsOwner = false
            }).ToList()
        };

        // Real-Time SignalR Broadcast
        var allUserIds = note.Collaborators.Select(c => c.UserId).Concat(new[] { note.UserId });
        await _notificationService.NotifyNoteUpdatedAsync(noteDto, allUserIds);

        return noteDto;
    }
}
