using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;

namespace Notes.Application.Notes.Commands.DeleteNote;

public class DeleteNoteCommandHandler : IRequestHandler<DeleteNoteCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IImageUploadService _imageUploadService;
    private readonly INoteNotificationService _notificationService;

    public DeleteNoteCommandHandler(
        IApplicationDbContext context, 
        IImageUploadService imageUploadService,
        INoteNotificationService notificationService)
    {
        _context = context;
        _imageUploadService = imageUploadService;
        _notificationService = notificationService;
    }

    public async Task<bool> Handle(DeleteNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _context.Notes
            .Include(n => n.Collaborators)
            .FirstOrDefaultAsync(n => n.Id == request.Id && n.UserId == request.UserId, cancellationToken);

        if (note == null)
            return false;

        var affectedUserIds = note.Collaborators.Select(c => c.UserId).Concat(new[] { note.UserId }).Distinct().ToList();

        if (note.ImageUrls != null && note.ImageUrls.Count > 0)
        {
            await _imageUploadService.DeleteImagesAsync(note.ImageUrls);
        }

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync(cancellationToken);

        await _notificationService.NotifyNoteDeletedAsync(note.Id, affectedUserIds);

        return true;
    }
}
