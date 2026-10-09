using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using System.Linq;

namespace Notes.Application.Notes.Commands.EmptyTrash;

public class EmptyTrashCommandHandler : IRequestHandler<EmptyTrashCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IImageUploadService _imageUploadService;

    public EmptyTrashCommandHandler(IApplicationDbContext context, IImageUploadService imageUploadService)
    {
        _context = context;
        _imageUploadService = imageUploadService;
    }

    public async Task<bool> Handle(EmptyTrashCommand request, CancellationToken cancellationToken)
    {
        var trashedNotes = await _context.Notes
            .Where(n => n.UserId == request.UserId && n.IsTrashed)
            .ToListAsync(cancellationToken);

        if (!trashedNotes.Any())
            return true;

        var allImages = trashedNotes
            .Where(n => n.ImageUrls != null)
            .SelectMany(n => n.ImageUrls!)
            .ToList();

        if (allImages.Any())
        {
            await _imageUploadService.DeleteImagesAsync(allImages);
        }

        _context.Notes.RemoveRange(trashedNotes);
        await _context.SaveChangesAsync(cancellationToken);
        
        return true;
    }
}
