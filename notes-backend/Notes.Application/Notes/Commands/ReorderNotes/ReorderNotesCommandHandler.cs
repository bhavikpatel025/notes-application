using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Notes.Application.Notes.Commands.ReorderNotes
{
    public class ReorderNotesCommandHandler : IRequestHandler<ReorderNotesCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public ReorderNotesCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(ReorderNotesCommand request, CancellationToken cancellationToken)
        {
            var noteIds = request.NoteOrders.Select(n => n.Id).ToList();
            
            var notesToUpdate = await _context.Notes
                .Where(n => n.UserId == request.UserId && noteIds.Contains(n.Id))
                .ToListAsync(cancellationToken);

            if (!notesToUpdate.Any()) return false;

            foreach (var note in notesToUpdate)
            {
                var newOrder = request.NoteOrders.First(n => n.Id == note.Id).OrderIndex;
                note.OrderIndex = newOrder;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
