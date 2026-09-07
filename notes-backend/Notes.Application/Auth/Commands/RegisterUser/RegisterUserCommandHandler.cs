using MediatR;
using Microsoft.AspNetCore.Identity;
using Notes.Application.Auth.Common;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Commands.RegisterUser;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, AuthResultDto>
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public RegisterUserCommandHandler(UserManager<AppUser> userManager, IJwtTokenGenerator jwtTokenGenerator)
    {
        _userManager = userManager;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResultDto> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception($"User registration failed: {errors}");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResultDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName
        };
    }
}
