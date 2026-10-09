using System;
using Notes.Domain.Enums;

namespace Notes.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // Recipient User
    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    // Sender / Trigger Actor (if applicable)
    public string SenderId { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;

    // Associated Note (if any)
    public Guid? NoteId { get; set; }
    public Note? Note { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.Reminder;
    
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
