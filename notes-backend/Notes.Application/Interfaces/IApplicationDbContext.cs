using Microsoft.EntityFrameworkCore;
using Notes.Domain.Entities;

namespace Notes.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Note> Notes { get; }
    DbSet<Label> Labels { get; }
    DbSet<TodoItem> TodoItems { get; }
    DbSet<NoteHistory> NoteHistories { get; }
    DbSet<NoteCollaborator> NoteCollaborators { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<AppUser> Users { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
