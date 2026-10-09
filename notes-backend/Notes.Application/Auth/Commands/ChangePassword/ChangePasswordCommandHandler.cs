using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Commands.ChangePassword;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, bool>
{
    private readonly UserManager<AppUser> _userManager;

    public ChangePasswordCommandHandler(UserManager<AppUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            throw new ArgumentException("User ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("New password is required.");
        }

        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        var hasPassword = await _userManager.HasPasswordAsync(user);

        IdentityResult result;
        if (!hasPassword)
        {
            // For OAuth (e.g., Google) users who have never set a local password yet
            result = await _userManager.AddPasswordAsync(user, request.NewPassword);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                throw new ArgumentException("Current password is required.");
            }

            if (request.CurrentPassword == request.NewPassword)
            {
                throw new InvalidOperationException("New password cannot be the same as your current password.");
            }

            result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        }

        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException(errors);
        }

        await _userManager.UpdateSecurityStampAsync(user);

        return true;
    }
}
