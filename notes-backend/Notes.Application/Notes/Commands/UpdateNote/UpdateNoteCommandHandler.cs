using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;

namespace Notes.Application.Notes.Commands.UpdateNote;

public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateNoteCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _context.Notes
            .Include(n => n.Labels)
            .FirstOrDefaultAsync(n => n.Id == request.Id && n.UserId == request.UserId, cancellationToken);

        if (note == null)
            return false;

        note.Title = request.Title ?? string.Empty;
        note.Content = request.Content ?? string.Empty;
        note.Color = request.Color ?? "#FFFFFF";
        note.ImageUrls = request.ImageUrls ?? new List<string>();
        note.IsPinned = request.IsPinned;
        note.IsArchived = request.IsArchived;
        note.IsTrashed = request.IsTrashed;
        note.UpdatedAt = DateTime.UtcNow;
        note.OrderIndex = request.OrderIndex;

        if (request.LabelIds != null)
        {
            var labels = await _context.Labels
                .Where(l => request.LabelIds.Contains(l.Id) && l.UserId == request.UserId)
                .ToListAsync(cancellationToken);
            
            note.Labels.Clear();
            note.Labels.AddRange(labels);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
