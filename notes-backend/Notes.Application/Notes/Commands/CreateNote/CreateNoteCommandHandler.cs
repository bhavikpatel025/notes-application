using MediatR;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Notes.Commands.CreateNote;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, NoteDto>
{
    private readonly IApplicationDbContext _context;

    public CreateNoteCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<NoteDto> Handle(CreateNoteCommand request, CancellationToken cancellationToken)
    {
        var note = new Note
        {
            UserId = request.UserId,
            Title = request.Title ?? string.Empty,
            Content = request.Content ?? string.Empty,
            Color = request.Color ?? "#FFFFFF",
            ImageUrls = request.ImageUrls ?? new List<string>(),
            IsPinned = request.IsPinned,
            IsArchived = request.IsArchived,
            IsTrashed = request.IsTrashed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.LabelIds != null && request.LabelIds.Any())
        {
            var labels = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(_context.Labels.Where(l => request.LabelIds.Contains(l.Id) && l.UserId == request.UserId), cancellationToken);
            note.Labels.AddRange(labels);
        }

        _context.Notes.Add(note);
        await _context.SaveChangesAsync(cancellationToken);

        return new NoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            Color = note.Color,
            ImageUrls = note.ImageUrls,
            IsPinned = note.IsPinned,
            IsArchived = note.IsArchived,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            Labels = note.Labels.Select(l => new LabelDto { Id = l.Id, Name = l.Name }).ToList()
        };
    }
}
