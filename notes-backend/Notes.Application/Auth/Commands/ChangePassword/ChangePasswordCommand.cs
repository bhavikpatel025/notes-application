using MediatR;

namespace Notes.Application.Auth.Commands.ChangePassword;

public record ChangePasswordCommand(string UserId, string CurrentPassword, string NewPassword) : IRequest<bool>;
