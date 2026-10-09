using System;
using System.Threading.Tasks;

namespace Notes.Application.Interfaces;

public interface IEmailNotificationService
{
    Task SendCollaborationInviteEmailAsync(string recipientEmail, string ownerName, string ownerEmail, string noteTitle, Guid noteId);
    Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string resetUrl);
}
