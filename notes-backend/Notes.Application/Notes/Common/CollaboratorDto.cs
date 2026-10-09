using System;

namespace Notes.Application.Notes.Common;

public class CollaboratorDto
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsOwner { get; set; }
}
