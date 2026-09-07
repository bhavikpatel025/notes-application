using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
namespace Notes.Application.Labels.Commands.UpdateLabel;
public class UpdateLabelCommandHandler : IRequestHandler<UpdateLabelCommand, bool>
{
    private readonly IApplicationDbContext _context;
    public UpdateLabelCommandHandler(IApplicationDbContext context) => _context = context;
    public async Task<bool> Handle(UpdateLabelCommand request, CancellationToken cancellationToken)
    {
        var label = await _context.Labels.FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == request.UserId, cancellationToken);
        if (label == null) return false;
        label.Name = request.Name;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
