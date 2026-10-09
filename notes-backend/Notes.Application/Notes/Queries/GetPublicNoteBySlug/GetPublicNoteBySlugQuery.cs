using MediatR;
using Notes.Application.Notes.Common;

namespace Notes.Application.Notes.Queries.GetPublicNoteBySlug;

public class GetPublicNoteBySlugQuery : IRequest<PublicNoteDto?>
{
    public string Slug { get; set; } = string.Empty;
    public bool IsUniqueView { get; set; } = true;
    public string CurrentUserId { get; set; } = string.Empty;

    public GetPublicNoteBySlugQuery(string slug, bool isUniqueView = true, string currentUserId = "")
    {
        Slug = slug;
        IsUniqueView = isUniqueView;
        CurrentUserId = currentUserId;
    }
}
