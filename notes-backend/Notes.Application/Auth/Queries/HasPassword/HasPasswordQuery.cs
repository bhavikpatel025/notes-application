using MediatR;

namespace Notes.Application.Auth.Queries.HasPassword;

public record HasPasswordQuery(string UserId) : IRequest<bool>;
