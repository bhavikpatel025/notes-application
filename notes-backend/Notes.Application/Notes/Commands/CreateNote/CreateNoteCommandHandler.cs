using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;
using Notes.Domain.Enums;

namespace Notes.Application.Notes.Commands.CreateNote;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;
    private readonly INoteNotificationService _notificationService;

    public CreateNoteCommandHandler(IApplicationDbContext context, INoteNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<NoteDto> Handle(CreateNoteCommand request, CancellationToken cancellationToken)
    {
        DateTime? reminderUtc = request.ReminderDateTime.HasValue
            ? DateTime.SpecifyKind(request.ReminderDateTime.Value, DateTimeKind.Utc)
            : null;

        if (reminderUtc.HasValue && request.ReminderRepeat.HasValue && request.ReminderRepeat.Value != ReminderRepeat.None)
        {
            while (reminderUtc.Value <= DateTime.UtcNow)
            {
                reminderUtc = request.ReminderRepeat.Value switch
                {
                    ReminderRepeat.Daily => reminderUtc.Value.AddDays(1),
                    ReminderRepeat.Weekly => reminderUtc.Value.AddDays(7),
                    ReminderRepeat.Monthly => reminderUtc.Value.AddMonths(1),
                    ReminderRepeat.Yearly => reminderUtc.Value.AddYears(1),
                    _ => reminderUtc.Value
                };
            }
        }

        var note = new Note
        {
            UserId = request.UserId,
            Title = request.Title ?? string.Empty,
            Content = request.Content ?? string.Empty,
            Color = request.Color ?? "#FFFFFF",
            Type = request.Type,
            ReminderDateTime = reminderUtc,
            ReminderRepeat = request.ReminderRepeat,
            IsReminderFired = false,
            ImageUrls = request.ImageUrls ?? new List<string>(),
            IsPinned = request.IsPinned,
            IsArchived = request.IsArchived,
            IsTrashed = request.IsTrashed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.TodoItems != null && request.TodoItems.Any())
        {
            int index = 0;
            foreach (var item in request.TodoItems)
            {
                note.TodoItems.Add(new TodoItem
                {
                    Id = Guid.NewGuid(),
                    NoteId = note.Id,
                    Text = item.Text ?? string.Empty,
                    IsCompleted = item.IsCompleted,
                    OrderIndex = index++
                });
            }
        }

        if (request.LabelIds != null && request.LabelIds.Any())
        {
            var labels = await _context.Labels
                .Where(l => request.LabelIds.Contains(l.Id) && l.UserId == request.UserId)
                .ToListAsync(cancellationToken);
            note.Labels.AddRange(labels);
        }

        _context.Notes.Add(note);

        var initialTodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
        {
            Id = t.Id,
            Text = t.Text,
            IsCompleted = t.IsCompleted,
            OrderIndex = t.OrderIndex
        }).ToList();

        var initialHistory = new NoteHistory
        {
            Id = Guid.NewGuid(),
            NoteId = note.Id,
            UserId = note.UserId,
            Title = note.Title,
            Content = note.Content,
            Type = note.Type,
            TodoItemsJson = System.Text.Json.JsonSerializer.Serialize(initialTodoItems),
            ImageUrls = note.ImageUrls != null ? new List<string>(note.ImageUrls) : new List<string>(),
            CreatedAt = note.CreatedAt
        };
        _context.NoteHistories.Add(initialHistory);

        await _context.SaveChangesAsync(cancellationToken);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        var noteDto = new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            Color = note.Color,
            Type = note.Type,
            ReminderDateTime = note.ReminderDateTime,
            ReminderRepeat = note.ReminderRepeat,
            ImageUrls = note.ImageUrls,
            IsPinned = note.IsPinned,
            IsArchived = note.IsArchived,
            IsTrashed = note.IsTrashed,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            Labels = note.Labels.Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList(),
            TodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
            {
                Id = t.Id,
                Text = t.Text,
                IsCompleted = t.IsCompleted,
                OrderIndex = t.OrderIndex
            }).ToList(),
            OwnerId = note.UserId,
            OwnerEmail = user != null ? user.Email ?? "" : "",
            OwnerName = user != null ? (string.IsNullOrWhiteSpace(user.FullName) ? user.Email ?? "" : user.FullName) : "",
            IsOwner = true,
            Collaborators = new List<CollaboratorDto>()
        };

        await _notificationService.NotifyNoteCreatedAsync(noteDto, new[] { note.UserId });

        return noteDto;
    }
}
