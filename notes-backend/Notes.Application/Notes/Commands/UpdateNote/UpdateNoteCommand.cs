using MediatR;

namespace Notes.Application.Notes.Commands.UpdateNote;

public class UpdateNoteCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public List<string> ImageUrls { get; set; } = new();
    public string UserId { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public bool IsArchived { get; set; }
    public bool IsTrashed { get; set; }
    public int OrderIndex { get; set; }
    public List<Guid>? LabelIds { get; set; }
}
