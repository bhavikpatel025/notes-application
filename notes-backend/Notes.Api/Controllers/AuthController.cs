using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Auth.Commands.ChangePassword;
using Notes.Application.Auth.Commands.DeleteAccount;
using Notes.Application.Auth.Commands.ForgotPassword;
using Notes.Application.Auth.Commands.RegisterUser;
using Notes.Application.Auth.Commands.ResetPassword;
using Notes.Application.Auth.Queries.HasPassword;
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

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordCommand command)
    {
        try
        {
            await _mediator.Send(command);
            return Ok(new { Message = "If your email is registered with us, a password reset link has been sent." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordCommand command)
    {
        try
        {
            await _mediator.Send(command);
            return Ok(new { Message = "Your password has been successfully reset. You can now sign in with your new password." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { Message = "Unauthorized access." });
            }

            var command = new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword);
            await _mediator.Send(command);
            return Ok(new { Message = "Password changed successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("has-password")]
    public async Task<IActionResult> HasPassword()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { Message = "Unauthorized access." });
            }

            var result = await _mediator.Send(new HasPasswordQuery(userId));
            return Ok(new { HasPassword = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    public class DeleteAccountRequest
    {
        public string? Password { get; set; }
        public string? ConfirmationText { get; set; }
    }

    [Authorize]
    [HttpPost("delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { Message = "Unauthorized access." });
            }

            var command = new DeleteAccountCommand(userId, request.Password, request.ConfirmationText);
            await _mediator.Send(command);
            return Ok(new { Message = "Your account and data have been permanently deleted." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}
