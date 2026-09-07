using MediatR;
using Notes.Application.Auth.Common;

namespace Notes.Application.Auth.Commands.RegisterUser;

public class RegisterUserCommand : IRequest<AuthResultDto>
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
