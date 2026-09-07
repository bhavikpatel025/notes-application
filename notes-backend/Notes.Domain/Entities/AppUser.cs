using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace Notes.Domain.Entities
{
    public class AppUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;
        public ICollection<Note> Notes { get; set; } = new List<Note>();
    }
}
