using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using System.Linq;

namespace Notes.Application.Notifications.Commands.MarkAllNotificationsRead;

public record MarkAllNotificationsReadCommand(string UserId) : IRequest<bool>;

public class MarkAllNotificationsReadCommandHandler : IRequestHandler<MarkAllNotificationsReadCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public MarkAllNotificationsReadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == request.UserId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unreadNotifications.Count == 0) return true;

        foreach (var notif in unreadNotifications)
        {
            notif.IsRead = true;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
