using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Google.Apis.Auth;
using Notes.Application.Auth.Common;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Commands.GoogleLogin;

public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, AuthResultDto>
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;

    public GoogleLoginCommandHandler(
        UserManager<AppUser> userManager,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
    }

    public async Task<AuthResultDto> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        var clientId = _configuration["Google:ClientId"];
        
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new List<string> { clientId! }
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            // Validates signature, expiration, and Audience (Client ID)
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch (InvalidJwtException)
        {
            throw new Exception("Invalid Google token.");
        }

        if (string.IsNullOrEmpty(payload.Email))
        {
            throw new Exception("Email not found in Google token.");
        }

        var user = await _userManager.FindByEmailAsync(payload.Email);

        // If user doesn't exist, create them
        if (user == null)
        {
            user = new AppUser
            {
                UserName = payload.Email,
                Email = payload.Email,
                FullName = payload.Name ?? payload.Email.Split('@')[0]
            };

            // Create user without a password (since they log in via Google)
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new Exception($"Failed to create user account: {errors}");
            }
        }

        // Generate our application's JWT token
        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResultDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email!,
            FullName = user.FullName!
        };
    }
}
