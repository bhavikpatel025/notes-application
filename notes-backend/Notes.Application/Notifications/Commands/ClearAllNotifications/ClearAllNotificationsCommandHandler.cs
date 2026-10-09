using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using System.Linq;

namespace Notes.Application.Notifications.Commands.ClearAllNotifications;

public record ClearAllNotificationsCommand(string UserId) : IRequest<bool>;

public class ClearAllNotificationsCommandHandler : IRequestHandler<ClearAllNotificationsCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ClearAllNotificationsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ClearAllNotificationsCommand request, CancellationToken cancellationToken)
    {
        var allNotifications = await _context.Notifications
            .Where(n => n.UserId == request.UserId)
            .ToListAsync(cancellationToken);

        if (allNotifications.Count == 0) return true;

        _context.Notifications.RemoveRange(allNotifications);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
