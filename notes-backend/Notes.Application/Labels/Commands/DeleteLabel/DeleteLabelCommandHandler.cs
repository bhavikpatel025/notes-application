using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
namespace Notes.Application.Labels.Commands.DeleteLabel;
public class DeleteLabelCommandHandler : IRequestHandler<DeleteLabelCommand, bool>
{
    private readonly IApplicationDbContext _context;
    public DeleteLabelCommandHandler(IApplicationDbContext context) => _context = context;
    public async Task<bool> Handle(DeleteLabelCommand request, CancellationToken cancellationToken)
    {
        var label = await _context.Labels.FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == request.UserId, cancellationToken);
        if (label == null) return false;
        _context.Labels.Remove(label);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
