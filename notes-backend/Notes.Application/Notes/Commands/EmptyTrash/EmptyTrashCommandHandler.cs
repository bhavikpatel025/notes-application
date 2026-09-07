using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;

namespace Notes.Application.Notes.Commands.EmptyTrash;

public class EmptyTrashCommandHandler : IRequestHandler<EmptyTrashCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public EmptyTrashCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(EmptyTrashCommand request, CancellationToken cancellationToken)
    {
        var trashedNotes = await _context.Notes
            .Where(n => n.UserId == request.UserId && n.IsTrashed)
            .ToListAsync(cancellationToken);

        if (!trashedNotes.Any())
            return true;

        _context.Notes.RemoveRange(trashedNotes);
        await _context.SaveChangesAsync(cancellationToken);
        
        return true;
    }
}
