using Notes.Domain.Entities;

namespace Notes.Application.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(AppUser user);
}
