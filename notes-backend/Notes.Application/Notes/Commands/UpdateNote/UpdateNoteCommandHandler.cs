using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Notes.Application.Notes.Commands.UpdateNote;

public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IImageUploadService _imageUploadService;
    private readonly INoteNotificationService _notificationService;

    public UpdateNoteCommandHandler(
        IApplicationDbContext context, 
        IImageUploadService imageUploadService,
        INoteNotificationService notificationService)
    {
        _context = context;
        _imageUploadService = imageUploadService;
        _notificationService = notificationService;
    }

    public async Task<bool> Handle(UpdateNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _context.Notes
            .Include(n => n.User)
            .Include(n => n.Labels)
            .Include(n => n.TodoItems)
            .Include(n => n.Collaborators)
                .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(n => n.Id == request.Id && (n.UserId == request.UserId || n.Collaborators.Any(c => c.UserId == request.UserId)), cancellationToken);

        if (note == null)
            return false;

        bool isContentModified = false;

        // Clean up removed images from Cloudinary if ImageUrls is provided in the update
        if (request.ImageUrls != null)
        {
            var oldImages = note.ImageUrls ?? new List<string>();
            var removedImages = oldImages.Except(request.ImageUrls).ToList();

            if (removedImages.Any())
            {
                await _imageUploadService.DeleteImagesAsync(removedImages);
            }

            if (!oldImages.SequenceEqual(request.ImageUrls))
            {
                note.ImageUrls = request.ImageUrls;
                isContentModified = true;
            }
        }

        if (request.Title != null && request.Title != note.Title)
        {
            note.Title = request.Title;
            isContentModified = true;
        }

        // If note is locked, preserve ciphertext content and do not overwrite with empty/masked content
        if (!note.IsLocked)
        {
            if (request.Content != null && request.Content != note.Content)
            {
                note.Content = request.Content;
                isContentModified = true;
            }

            // Concurrency-safe synchronization for TodoItems
            if (request.TodoItems != null)
            {
                var requestItemIds = request.TodoItems
                    .Where(t => t.Id != Guid.Empty)
                    .Select(t => t.Id)
                    .ToHashSet();

                // 1. Remove items that are no longer present in the request
                var itemsToRemove = note.TodoItems.Where(t => !requestItemIds.Contains(t.Id)).ToList();
                if (itemsToRemove.Any())
                {
                    isContentModified = true;
                }
                foreach (var item in itemsToRemove)
                {
                    _context.TodoItems.Remove(item);
                    note.TodoItems.Remove(item);
                }

                // 2. Update existing items or add brand new ones
                int index = 0;
                foreach (var itemDto in request.TodoItems)
                {
                    var existingItem = (itemDto.Id != Guid.Empty) 
                        ? note.TodoItems.FirstOrDefault(t => t.Id == itemDto.Id) 
                        : null;

                    if (existingItem != null)
                    {
                        if (existingItem.Text != (itemDto.Text ?? string.Empty) ||
                            existingItem.IsCompleted != itemDto.IsCompleted ||
                            existingItem.OrderIndex != index)
                        {
                            isContentModified = true;
                        }
                        existingItem.Text = itemDto.Text ?? string.Empty;
                        existingItem.IsCompleted = itemDto.IsCompleted;
                        existingItem.OrderIndex = index++;
                    }
                    else
                    {
                        isContentModified = true;
                        var newItem = new TodoItem
                        {
                            Id = Guid.NewGuid(),
                            NoteId = note.Id,
                            Text = itemDto.Text ?? string.Empty,
                            IsCompleted = itemDto.IsCompleted,
                            OrderIndex = index++
                        };
                        _context.TodoItems.Add(newItem);
                    }
                }
            }
        }

        if (!string.IsNullOrEmpty(request.Color) && request.Color != note.Color)
        {
            note.Color = request.Color;
            isContentModified = true;
        }

        if (request.Type.HasValue && request.Type.Value != note.Type)
        {
            note.Type = request.Type.Value;
            isContentModified = true;
        }

        if (request.ClearReminder)
        {
            if (note.ReminderDateTime.HasValue || note.ReminderRepeat.HasValue)
            {
                isContentModified = true;
            }
            note.ReminderDateTime = null;
            note.ReminderRepeat = null;
            note.IsReminderFired = false;
        }
        else if (request.ReminderDateTime.HasValue)
        {
            var newReminderUtc = DateTime.SpecifyKind(request.ReminderDateTime.Value, DateTimeKind.Utc);

            // If recurring, automatically roll forward past the current time
            if (request.ReminderRepeat.HasValue && request.ReminderRepeat.Value != ReminderRepeat.None)
            {
                while (newReminderUtc <= DateTime.UtcNow)
                {
                    newReminderUtc = request.ReminderRepeat.Value switch
                    {
                        ReminderRepeat.Daily => newReminderUtc.AddDays(1),
                        ReminderRepeat.Weekly => newReminderUtc.AddDays(7),
                        ReminderRepeat.Monthly => newReminderUtc.AddMonths(1),
                        ReminderRepeat.Yearly => newReminderUtc.AddYears(1),
                        _ => newReminderUtc
                    };
                }
            }

            bool reminderChanged = !note.ReminderDateTime.HasValue || Math.Abs((note.ReminderDateTime.Value - newReminderUtc).TotalSeconds) > 1 || note.ReminderRepeat != request.ReminderRepeat;

            if (reminderChanged)
            {
                note.ReminderDateTime = newReminderUtc;
                note.ReminderRepeat = request.ReminderRepeat;
                // Newly set or updated reminder must not be flagged as fired yet
                note.IsReminderFired = false;
                isContentModified = true;
            }
        }

        note.IsPinned = request.IsPinned;
        note.IsArchived = request.IsArchived;
        
        // Only note owner can trash a note
        if (note.UserId == request.UserId)
        {
            note.IsTrashed = request.IsTrashed;
        }

        note.OrderIndex = request.OrderIndex;

        // Concurrency-safe synchronization for Labels
        if (request.LabelIds != null)
        {
            var currentLabelIds = note.Labels.Select(l => l.Id).ToHashSet();
            var targetLabelIds = request.LabelIds.ToHashSet();

            // Remove unselected labels
            var labelsToRemove = note.Labels.Where(l => !targetLabelIds.Contains(l.Id)).ToList();
            if (labelsToRemove.Any())
            {
                isContentModified = true;
            }
            foreach (var l in labelsToRemove)
            {
                note.Labels.Remove(l);
            }

            // Add newly selected labels
            var labelIdsToAdd = targetLabelIds.Where(id => !currentLabelIds.Contains(id)).ToList();
            if (labelIdsToAdd.Any())
            {
                isContentModified = true;
                var newLabels = await _context.Labels
                    .Where(l => labelIdsToAdd.Contains(l.Id) && l.UserId == request.UserId)
                    .ToListAsync(cancellationToken);
                
                foreach (var l in newLabels)
                {
                    note.Labels.Add(l);
                }
            }
        }

        if (isContentModified)
        {
            note.UpdatedAt = DateTime.UtcNow;

            // Record version history snapshot
            var historyTodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
            {
                Id = t.Id,
                Text = t.Text,
                IsCompleted = t.IsCompleted,
                OrderIndex = t.OrderIndex
            }).ToList();

            var newHistory = new NoteHistory
            {
                Id = Guid.NewGuid(),
                NoteId = note.Id,
                UserId = note.UserId,
                Title = note.Title,
                Content = note.Content,
                Type = note.Type,
                TodoItemsJson = System.Text.Json.JsonSerializer.Serialize(historyTodoItems),
                ImageUrls = note.ImageUrls != null ? new List<string>(note.ImageUrls) : new List<string>(),
                CreatedAt = note.UpdatedAt
            };
            _context.NoteHistories.Add(newHistory);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Broadcast real-time update to owner and all collaborators
        var allInvolvedUserIds = note.Collaborators.Select(c => c.UserId).Concat(new[] { note.UserId }).Distinct().ToList();
        
        var noteDto = new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.IsLocked ? "" : note.Content,
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

        await _notificationService.NotifyNoteUpdatedAsync(noteDto, allInvolvedUserIds);

        return true;
    }
}
