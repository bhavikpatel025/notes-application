using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Notes.Application.Interfaces;
using Notes.Application.Notifications.Common;
using Notes.Application.Notes.Common;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Infrastructure.Persistence;

namespace Notes.Api.BackgroundJobs;

public class ReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReminderBackgroundService> _logger;

    public ReminderBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<ReminderBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Reminder Background Service is running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDueRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred processing due note reminders.");
            }

            // Check every 20 seconds
            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);
        }
    }

    private async Task ProcessDueRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INoteNotificationService>();

        var now = DateTime.UtcNow;

        var dueNotes = await dbContext.Notes
            .Include(n => n.Collaborators)
                .ThenInclude(c => c.User)
            .Include(n => n.User)
            .Include(n => n.Labels)
            .Include(n => n.TodoItems)
            .Where(n => !n.IsTrashed 
                     && n.ReminderDateTime != null 
                     && n.ReminderDateTime <= now 
                     && (!n.IsReminderFired || (n.ReminderRepeat != null && n.ReminderRepeat != ReminderRepeat.None)))
            .ToListAsync(cancellationToken);

        if (dueNotes.Count == 0) return;

        var updatedNotesToBroadcast = new List<(NoteDto dto, List<string> recipientIds)>();

        foreach (var note in dueNotes)
        {
            var noteTitle = string.IsNullOrWhiteSpace(note.Title) ? "Note Reminder" : $"Reminder: {note.Title}";
            var notePreview = string.IsNullOrWhiteSpace(note.Content) 
                ? "You have a scheduled reminder." 
                : (note.Content.Length > 100 ? note.Content.Substring(0, 97) + "..." : note.Content);

            // Recipients: Note Owner + all Collaborators
            var recipientUserIds = new HashSet<string> { note.UserId };
            if (note.Collaborators != null)
            {
                foreach (var collab in note.Collaborators)
                {
                    recipientUserIds.Add(collab.UserId);
                }
            }

            foreach (var userId in recipientUserIds)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    SenderId = "system",
                    SenderEmail = "system@keepnotes.local",
                    SenderName = "Reminder",
                    NoteId = note.Id,
                    Title = noteTitle,
                    Message = notePreview,
                    Type = NotificationType.Reminder,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.Notifications.Add(notification);

                var notifDto = new NotificationDto
                {
                    Id = notification.Id,
                    UserId = notification.UserId,
                    SenderId = notification.SenderId,
                    SenderEmail = notification.SenderEmail,
                    SenderName = notification.SenderName,
                    NoteId = notification.NoteId,
                    Title = notification.Title,
                    Message = notification.Message,
                    Type = notification.Type,
                    IsRead = notification.IsRead,
                    CreatedAt = notification.CreatedAt
                };

                // Push live WebSocket event to the specific user
                await notificationService.NotifyNotificationCreatedAsync(notifDto, userId);
            }

            // Handle repeat logic or mark as fired
            if (note.ReminderRepeat.HasValue && note.ReminderRepeat.Value != ReminderRepeat.None)
            {
                while (note.ReminderDateTime <= now)
                {
                    note.ReminderDateTime = note.ReminderRepeat.Value switch
                    {
                        ReminderRepeat.Daily => note.ReminderDateTime.Value.AddDays(1),
                        ReminderRepeat.Weekly => note.ReminderDateTime.Value.AddDays(7),
                        ReminderRepeat.Monthly => note.ReminderDateTime.Value.AddMonths(1),
                        ReminderRepeat.Yearly => note.ReminderDateTime.Value.AddYears(1),
                        _ => note.ReminderDateTime
                    };
                }
                note.IsReminderFired = false;
            }
            else
            {
                note.IsReminderFired = true;
            }

            var allInvolvedUserIds = (note.Collaborators ?? new List<NoteCollaborator>()).Select(c => c.UserId).Concat(new[] { note.UserId }).Distinct().ToList();
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
                Labels = (note.Labels ?? new List<Label>()).Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList(),
                TodoItems = note.IsLocked 
                    ? new List<TodoItemDto>() 
                    : (note.TodoItems ?? new List<TodoItem>()).OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
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
                Collaborators = (note.Collaborators ?? new List<NoteCollaborator>()).Select(c => new CollaboratorDto
                {
                    UserId = c.UserId,
                    Email = c.User != null ? c.User.Email ?? "" : "",
                    FullName = c.User != null ? (string.IsNullOrWhiteSpace(c.User.FullName) ? (c.User.Email ?? "") : c.User.FullName) : "",
                    IsOwner = false
                }).ToList()
            };

            updatedNotesToBroadcast.Add((noteDto, allInvolvedUserIds));
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Broadcast real-time note update to clients so chips update immediately
        foreach (var item in updatedNotesToBroadcast)
        {
            await notificationService.NotifyNoteUpdatedAsync(item.dto, item.recipientIds);
        }
    }
}
