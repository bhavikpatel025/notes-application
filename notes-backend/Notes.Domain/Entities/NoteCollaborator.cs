using System;

namespace Notes.Domain.Entities
{
    public class NoteCollaborator
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid NoteId { get; set; }
        public Note Note { get; set; } = null!;

        public string UserId { get; set; } = string.Empty;
        public AppUser User { get; set; } = null!;

        public bool IsAccepted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
