using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Notes.Commands.CreateNote;
using Notes.Application.Notes.Commands.DeleteNote;
using Notes.Application.Notes.Commands.UpdateNote;
using Notes.Application.Notes.Queries.GetNotes;
using Notes.Application.Notes.Commands.ReorderNotes;
using System.Security.Claims;

namespace Notes.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotes()
    {
        var query = new GetNotesQuery { UserId = GetUserId() };
        var notes = await _mediator.Send(query);
        return Ok(notes);
    }

    [HttpPost]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteCommand command)
    {
        command.UserId = GetUserId();
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetNotes), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(Guid id, [FromBody] UpdateNoteCommand command)
    {
        if (id != command.Id)
            return BadRequest("ID mismatch");

        command.UserId = GetUserId();
        var result = await _mediator.Send(command);

        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var result = await _mediator.Send(new DeleteNoteCommand { Id = id, UserId = userId });
        if (!result) return NotFound();

        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<ActionResult> ReorderNotes([FromBody] List<NoteOrderDto> noteOrders)
    {
        var userId = GetUserId();
        var command = new ReorderNotesCommand
        {
            UserId = userId,
            NoteOrders = noteOrders
        };
        
        var result = await _mediator.Send(command);
        if (!result) return BadRequest();
        
        return NoContent();
    }

    [HttpDelete("empty-trash")]
    public async Task<IActionResult> EmptyTrash()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var result = await _mediator.Send(new Notes.Application.Notes.Commands.EmptyTrash.EmptyTrashCommand { UserId = userId });
        
        return NoContent();
    }
}
