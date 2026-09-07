using System;

namespace Notes.Domain.Entities
{
    public class Note
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Color { get; set; } = "#FFFFFF";
        public bool IsPinned { get; set; } = false;
        public bool IsArchived { get; set; } = false;
        public bool IsTrashed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int OrderIndex { get; set; } = 0;
        
        // Foreign Key to IdentityUser
        public string UserId { get; set; } = string.Empty;
        public AppUser? User { get; set; }

        public List<string>? ImageUrls { get; set; } = new();

        public List<Label> Labels { get; set; } = new();
    }
}
