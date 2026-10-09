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

namespace Notes.Application.Notes.Commands.UnlockNote;

public class UnlockNoteCommandHandler : IRequestHandler<UnlockNoteCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public UnlockNoteCommandHandler(
        IApplicationDbContext context,
        IEncryptionService encryptionService)
    {
        _context = context;
        _encryptionService = encryptionService;
    }

    public async Task<NoteDto> Handle(UnlockNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _context.Notes
            .Include(n => n.User)
            .Include(n => n.Labels)
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
            throw new UnauthorizedAccessException("You are not authorized to access this note.");
        }

        if (!note.IsLocked)
        {
            // Not locked, return normally
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
                IsLocked = false,
                Collaborators = note.Collaborators.Select(c => new CollaboratorDto
                {
                    UserId = c.UserId,
                    Email = c.User != null ? c.User.Email ?? "" : "",
                    FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                    IsOwner = false
                }).ToList()
            };
        }

        if (string.IsNullOrWhiteSpace(note.PinSalt) || string.IsNullOrWhiteSpace(note.PinHash))
        {
            throw new InvalidOperationException("Note lock data is corrupted.");
        }

        // Verify PIN
        bool isValid = _encryptionService.VerifyPin(request.Pin, note.PinSalt, note.PinHash);
        if (!isValid)
        {
            throw new ArgumentException("Incorrect PIN.");
        }

        // Decrypt content
        string decryptedJson;
        try
        {
            decryptedJson = _encryptionService.Decrypt(note.Content, request.Pin, note.PinSalt);
        }
        catch (Exception)
        {
            throw new ArgumentException("Incorrect PIN or unable to decrypt note.");
        }

        string decryptedContent = decryptedJson;
        var decryptedTodoItems = new List<TodoItemDto>();

        try
        {
            var payload = JsonSerializer.Deserialize<LockedNotePayload>(decryptedJson);
            if (payload != null)
            {
                decryptedContent = payload.Content;
                decryptedTodoItems = payload.TodoItems ?? new List<TodoItemDto>();
            }
        }
        catch
        {
            // Plaintext fallback
        }

        return new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = decryptedContent,
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
            TodoItems = decryptedTodoItems,
            OwnerId = note.UserId,
            OwnerEmail = note.User != null ? note.User.Email ?? "" : "",
            OwnerName = note.User != null ? (string.IsNullOrWhiteSpace(note.User.FullName) ? (note.User.Email ?? "") : note.User.FullName) : "",
            IsOwner = isOwner,
            IsPendingAcceptance = false,
            IsLocked = true, // Still marked as locked in DB, but returned decrypted for this session
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
