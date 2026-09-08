using MediatR;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Auth.Commands.RegisterUser;
using Notes.Application.Auth.Queries.LoginUser;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
    {
        try
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginUserQuery query)
    {
        try
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
    }

    public class GoogleLoginRequest
    {
        public required string IdToken { get; set; }
    }

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        try
        {
            var command = new Notes.Application.Auth.Commands.GoogleLogin.GoogleLoginCommand(request.IdToken);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
    }
}
