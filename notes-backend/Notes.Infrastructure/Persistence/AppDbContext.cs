using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence
{
    public class AppDbContext : IdentityDbContext<AppUser>, IApplicationDbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Note> Notes { get; set; }
        public DbSet<Label> Labels { get; set; }
        public DbSet<TodoItem> TodoItems { get; set; }
        public DbSet<NoteHistory> NoteHistories { get; set; }
        public DbSet<NoteCollaborator> NoteCollaborators { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            builder.Entity<Note>()
                .HasMany(n => n.TodoItems)
                .WithOne(t => t.Note)
                .HasForeignKey(t => t.NoteId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Note>()
                .HasMany(n => n.Histories)
                .WithOne(h => h.Note)
                .HasForeignKey(h => h.NoteId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<NoteCollaborator>()
                .HasOne(c => c.Note)
                .WithMany(n => n.Collaborators)
                .HasForeignKey(c => c.NoteId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<NoteCollaborator>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<NoteCollaborator>()
                .HasIndex(c => new { c.NoteId, c.UserId })
                .IsUnique();

            builder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Notification>()
                .HasOne(n => n.Note)
                .WithMany()
                .HasForeignKey(n => n.NoteId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Note>()
                .HasIndex(n => n.PublicSlug)
                .IsUnique();
        }
    }
}
