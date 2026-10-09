using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notifications.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Notes.Application.Notifications.Queries.GetNotifications;

public record GetNotificationsQuery(string UserId, int Limit = 50) : IRequest<NotificationListDto>;

public class GetNotificationsQueryHandler : IRequestHandler<GetNotificationsQuery, NotificationListDto>
{
    private readonly IApplicationDbContext _context;

    public GetNotificationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<NotificationListDto> Handle(GetNotificationsQuery request, CancellationToken cancellationToken)
    {
        var notifications = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == request.UserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(request.Limit)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                UserId = n.UserId,
                SenderId = n.SenderId,
                SenderEmail = n.SenderEmail,
                SenderName = n.SenderName,
                NoteId = n.NoteId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var unreadCount = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == request.UserId && !n.IsRead)
            .CountAsync(cancellationToken);

        return new NotificationListDto
        {
            Notifications = notifications,
            UnreadCount = unreadCount
        };
    }
}
