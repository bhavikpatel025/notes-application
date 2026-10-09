using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Commands.LockNote;

public class LockedNotePayload
{
    public string Content { get; set; } = string.Empty;
    public List<TodoItemDto> TodoItems { get; set; } = new();
}

public class LockNoteCommandHandler : IRequestHandler<LockNoteCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly INoteNotificationService _notificationService;

    public LockNoteCommandHandler(
        IApplicationDbContext context,
        IEncryptionService encryptionService,
        INoteNotificationService notificationService)
    {
        _context = context;
        _encryptionService = encryptionService;
        _notificationService = notificationService;
    }

    public async Task<NoteDto> Handle(LockNoteCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Pin) || request.Pin.Length < 4)
        {
            throw new ArgumentException("PIN must be at least 4 digits.");
        }

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
            throw new UnauthorizedAccessException("You are not authorized to lock this note.");
        }

        // Package content and checklist items
        var payload = new LockedNotePayload
        {
            Content = note.Content,
            TodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
            {
                Id = t.Id,
                Text = t.Text,
                IsCompleted = t.IsCompleted,
                OrderIndex = t.OrderIndex
            }).ToList()
        };

        var json = JsonSerializer.Serialize(payload);

        // Generate salt & hash PIN
        var salt = _encryptionService.GenerateSalt();
        var pinHash = _encryptionService.HashPin(request.Pin, salt);
        var cipherText = _encryptionService.Encrypt(json, request.Pin, salt);

        // Remove plaintext TodoItems from DB while note is locked
        if (note.TodoItems.Any())
        {
            _context.TodoItems.RemoveRange(note.TodoItems);
            note.TodoItems.Clear();
        }

        note.Content = cipherText;
        note.IsLocked = true;
        note.PinSalt = salt;
        note.PinHash = pinHash;
        note.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var noteDto = new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = string.Empty, // Mask content
            Color = note.Color,
            Type = note.Type,
            ReminderDateTime = note.ReminderDateTime,
            ReminderRepeat = note.ReminderRepeat,
            ImageUrls = new List<string>(), // Mask images
            IsPinned = note.IsPinned,
            IsArchived = note.IsArchived,
            IsTrashed = note.IsTrashed,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            OrderIndex = note.OrderIndex,
            Labels = note.Labels.Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList(),
            TodoItems = new List<TodoItemDto>(), // Mask checklist
            OwnerId = note.UserId,
            OwnerEmail = note.User != null ? note.User.Email ?? "" : "",
            OwnerName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? (note.User.Email ?? "") : note.User.FullName) : "",
            IsOwner = isOwner,
            IsPendingAcceptance = false,
            IsLocked = true,
            Collaborators = note.Collaborators.Select(c => new CollaboratorDto
            {
                UserId = c.UserId,
                Email = c.User != null ? c.User.Email ?? "" : "",
                FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                IsOwner = false
            }).ToList()
        };

        // Real-Time SignalR Broadcast to all viewers
        var allUserIds = note.Collaborators.Select(c => c.UserId).Concat(new[] { note.UserId });
        await _notificationService.NotifyNoteUpdatedAsync(noteDto, allUserIds);

        return noteDto;
    }
}
