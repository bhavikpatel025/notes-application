using MediatR;
using Notes.Application.Auth.Common;

namespace Notes.Application.Auth.Queries.LoginUser;

public class LoginUserQuery : IRequest<AuthResultDto>
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
