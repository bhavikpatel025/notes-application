using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Notes.Domain.Entities;

namespace Notes.Application.Auth.Queries.HasPassword;

public class HasPasswordQueryHandler : IRequestHandler<HasPasswordQuery, bool>
{
    private readonly UserManager<AppUser> _userManager;

    public HasPasswordQueryHandler(UserManager<AppUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<bool> Handle(HasPasswordQuery request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            return false;
        }

        return await _userManager.HasPasswordAsync(user);
    }
}
