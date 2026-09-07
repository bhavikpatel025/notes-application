using System;
using System.Collections.Generic;

namespace Notes.Domain.Entities
{
    public class Label
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        
        public string UserId { get; set; } = string.Empty;
        public AppUser? User { get; set; }

        public List<Note> Notes { get; set; } = new();
    }
}
