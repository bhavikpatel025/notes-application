using System;
using System.Security.Claims;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Notifications.Commands.ClearAllNotifications;
using Notes.Application.Notifications.Commands.DeleteNotification;
using Notes.Application.Notifications.Commands.MarkAllNotificationsRead;
using Notes.Application.Notifications.Commands.MarkNotificationRead;
using Notes.Application.Notifications.Common;
using Notes.Application.Notifications.Queries.GetNotifications;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();

    [HttpGet]
    public async Task<ActionResult<NotificationListDto>> GetNotifications([FromQuery] int limit = 50)
    {
        var result = await _mediator.Send(new GetNotificationsQuery(GetUserId(), limit));
        return Ok(result);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var success = await _mediator.Send(new MarkNotificationReadCommand(id, GetUserId()));
        if (!success) return NotFound();
        return Ok(new { success = true });
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var success = await _mediator.Send(new MarkAllNotificationsReadCommand(GetUserId()));
        return Ok(new { success });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(Guid id)
    {
        var success = await _mediator.Send(new DeleteNotificationCommand(id, GetUserId()));
        if (!success) return NotFound();
        return Ok(new { success = true });
    }

    [HttpDelete("clear-all")]
    public async Task<IActionResult> ClearAll()
    {
        var success = await _mediator.Send(new ClearAllNotificationsCommand(GetUserId()));
        return Ok(new { success });
    }
}
