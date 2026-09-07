using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Notes.Application.Labels.Commands.CreateLabel;
using Notes.Application.Labels.Commands.UpdateLabel;
using Notes.Application.Labels.Commands.DeleteLabel;
using Notes.Application.Labels.Queries.GetLabels;
using Notes.Application.Notes.Common;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LabelsController : ControllerBase
{
    private readonly IMediator _mediator;
    public LabelsController(IMediator mediator) => _mediator = mediator;
    
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();

    [HttpGet]
    public async Task<ActionResult<List<LabelDto>>> GetLabels()
    {
        return await _mediator.Send(new GetLabelsQuery { UserId = GetUserId() });
    }

    [HttpPost]
    public async Task<ActionResult<LabelDto>> CreateLabel([FromBody] CreateLabelCommand command)
    {
        command.UserId = GetUserId();
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLabel(Guid id, [FromBody] UpdateLabelCommand command)
    {
        if (id != command.Id) return BadRequest();
        command.UserId = GetUserId();
        var success = await _mediator.Send(command);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLabel(Guid id)
    {
        var command = new DeleteLabelCommand { Id = id, UserId = GetUserId() };
        var success = await _mediator.Send(command);
        if (!success) return NotFound();
        return NoContent();
    }
}
