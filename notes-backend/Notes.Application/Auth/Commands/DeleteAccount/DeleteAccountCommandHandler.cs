using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Commands.DeleteAccount;

public class DeleteAccountCommandHandler : IRequestHandler<DeleteAccountCommand, bool>
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IApplicationDbContext _context;

    public DeleteAccountCommandHandler(UserManager<AppUser> userManager, IApplicationDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    public async Task<bool> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            throw new ArgumentException("User ID is required.");
        }

        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        var hasPassword = await _userManager.HasPasswordAsync(user);
        if (hasPassword)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new ArgumentException("Please enter your current password to confirm account deletion.");
            }

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
            {
                throw new InvalidOperationException("Incorrect password.");
            }
        }
        else
        {
            // For OAuth / Google users who don't have a local password
            var confirmText = request.ConfirmationText?.Trim();
            var email = user.Email?.Trim();

            if (string.IsNullOrWhiteSpace(confirmText) ||
                (!confirmText.Equals("DELETE", StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(confirmText, email, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("Please type 'DELETE' or your email to confirm deletion.");
            }
        }

        // 1. Remove collaborations where this user was a collaborator
        var externalCollaborations = _context.NoteCollaborators.Where(c => c.UserId == request.UserId);
        _context.NoteCollaborators.RemoveRange(externalCollaborations);

        // 2. Remove user notifications
        var notifications = _context.Notifications.Where(n => n.UserId == request.UserId);
        _context.Notifications.RemoveRange(notifications);

        // 3. Remove user's owned notes and all their cascade relations
        var userNotes = await _context.Notes
            .Include(n => n.TodoItems)
            .Include(n => n.Histories)
            .Include(n => n.Collaborators)
            .Include(n => n.Labels)
            .Where(n => n.UserId == request.UserId)
            .ToListAsync(cancellationToken);

        if (userNotes.Any())
        {
            _context.Notes.RemoveRange(userNotes);
        }

        // 4. Remove user's custom labels
        var labels = _context.Labels.Where(l => l.UserId == request.UserId);
        _context.Labels.RemoveRange(labels);

        // Save cascade removals before deleting identity user
        await _context.SaveChangesAsync(cancellationToken);

        // 5. Delete user from ASP.NET Identity
        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException(errors);
        }

        return true;
    }
}
