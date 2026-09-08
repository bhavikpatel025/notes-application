using MediatR;
using Notes.Application.Auth.Common;

namespace Notes.Application.Auth.Commands.GoogleLogin;

public record GoogleLoginCommand(string IdToken) : IRequest<AuthResultDto>;
