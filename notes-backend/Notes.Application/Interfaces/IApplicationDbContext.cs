using Microsoft.EntityFrameworkCore;
using Notes.Domain.Entities;

namespace Notes.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Note> Notes { get; }
    DbSet<Label> Labels { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
