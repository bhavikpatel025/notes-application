using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Notes.Application.Notes.Common;
using Notes.Application.Notifications.Common;

namespace Notes.Application.Interfaces;

public interface INoteNotificationService
{
    Task NotifyNoteCreatedAsync(NoteDto note, IEnumerable<string> targetUserIds);
    Task NotifyNoteUpdatedAsync(NoteDto note, IEnumerable<string> targetUserIds);
    Task NotifyNoteDeletedAsync(Guid noteId, IEnumerable<string> targetUserIds);
    Task NotifyNotificationCreatedAsync(NotificationDto notification, string targetUserId);
}
