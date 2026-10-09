using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, bool>
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IEmailNotificationService _emailService;
    private readonly IConfiguration _configuration;

    public ForgotPasswordCommandHandler(
        UserManager<AppUser> userManager,
        IEmailNotificationService emailService,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<bool> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return true;
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(normalizedEmail);

        // Security best practice: If user doesn't exist, return true silently to prevent email enumeration
        if (user == null)
        {
            return true;
        }

        // Generate Identity password reset token
        var rawToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));
        var encodedEmail = Uri.EscapeDataString(user.Email ?? normalizedEmail);

        var clientBaseUrl = _configuration["AllowedOrigins:0"] ?? "http://localhost:4200";
        var resetUrl = $"{clientBaseUrl.TrimEnd('/')}/reset-password?email={encodedEmail}&token={encodedToken}";

        var displayName = string.IsNullOrWhiteSpace(user.FullName) ? user.UserName ?? user.Email : user.FullName;

        await _emailService.SendPasswordResetEmailAsync(user.Email ?? normalizedEmail, displayName ?? "User", resetUrl);

        return true;
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
