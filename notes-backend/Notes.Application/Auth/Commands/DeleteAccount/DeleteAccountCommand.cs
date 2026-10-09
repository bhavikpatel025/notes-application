using MediatR;

namespace Notes.Application.Auth.Commands.DeleteAccount;

public record DeleteAccountCommand(string UserId, string? Password, string? ConfirmationText) : IRequest<bool>;
