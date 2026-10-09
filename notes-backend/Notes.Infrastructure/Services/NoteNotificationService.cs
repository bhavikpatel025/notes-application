using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;
using Notes.Application.Notifications.Common;
using Notes.Infrastructure.Hubs;

namespace Notes.Infrastructure.Services;

public class NoteNotificationService : INoteNotificationService
{
    private readonly IHubContext<NotesHub> _hubContext;

    public NoteNotificationService(IHubContext<NotesHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyNoteCreatedAsync(NoteDto note, IEnumerable<string> targetUserIds)
    {
        var userIds = targetUserIds.Distinct().ToList();
        if (userIds.Count == 0) return;

        await _hubContext.Clients.Users(userIds).SendAsync("NoteCreated", note);
    }

    public async Task NotifyNoteUpdatedAsync(NoteDto note, IEnumerable<string> targetUserIds)
    {
        var userIds = targetUserIds.Distinct().ToList();
        if (userIds.Count == 0) return;

        await _hubContext.Clients.Users(userIds).SendAsync("NoteUpdated", note);
    }

    public async Task NotifyNoteDeletedAsync(Guid noteId, IEnumerable<string> targetUserIds)
    {
        var userIds = targetUserIds.Distinct().ToList();
        if (userIds.Count == 0) return;

        await _hubContext.Clients.Users(userIds).SendAsync("NoteDeleted", noteId);
    }

    public async Task NotifyNotificationCreatedAsync(NotificationDto notification, string targetUserId)
    {
        if (string.IsNullOrWhiteSpace(targetUserId)) return;

        await _hubContext.Clients.User(targetUserId).SendAsync("ReceiveNotification", notification);
    }
}
