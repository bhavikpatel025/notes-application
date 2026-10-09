using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Notes.Commands.CreateNote;
using Notes.Application.Notes.Commands.DeleteNote;
using Notes.Application.Notes.Commands.UpdateNote;
using Notes.Application.Notes.Queries.GetNotes;
using Notes.Application.Notes.Queries.GetNoteById;
using Notes.Application.Notes.Commands.ReorderNotes;
using Notes.Application.Notes.Commands.EmptyTrash;
using Notes.Application.Notes.Queries.GetNoteHistory;
using Notes.Application.Notes.Commands.AddCollaborator;
using Notes.Application.Notes.Commands.RemoveCollaborator;
using Notes.Application.Notes.Commands.AcceptSharedNote;
using Notes.Application.Notes.Commands.LockNote;
using Notes.Application.Notes.Commands.UnlockNote;
using Notes.Application.Notes.Commands.RemoveNoteLock;
using Notes.Application.Notes.Commands.GeneratePublicLink;
using Notes.Application.Notes.Commands.RevokePublicLink;
using Notes.Application.Notes.Queries.GetPublicNoteBySlug;
using System.Security.Claims;

namespace Notes.Api.Controllers;

public class AddCollaboratorRequest
{
    public string Email { get; set; } = string.Empty;
}

public class NotePinRequest
{
    public string Pin { get; set; } = string.Empty;
}

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetNoteById(Guid id)
    {
        var query = new GetNoteByIdQuery { Id = id, UserId = GetUserId() };
        var note = await _mediator.Send(query);
        if (note == null)
            return NotFound(new { message = "Note not found" });

        return Ok(note);
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

        var result = await _mediator.Send(new EmptyTrashCommand { UserId = userId });
        
        return NoContent();
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetNoteHistory(Guid id)
    {
        var userId = GetUserId();
        var query = new GetNoteHistoryQuery
        {
            NoteId = id,
            UserId = userId
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPost("{id}/collaborators")]
    public async Task<IActionResult> AddCollaborator(Guid id, [FromBody] AddCollaboratorRequest request)
    {
        try
        {
            var userId = GetUserId();
            var command = new AddCollaboratorCommand
            {
                NoteId = id,
                Email = request.Email,
                CurrentUserId = userId
            };

            var updatedNote = await _mediator.Send(command);
            return Ok(updatedNote);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/collaborators/{collaboratorUserId}")]
    public async Task<IActionResult> RemoveCollaborator(Guid id, string collaboratorUserId)
    {
        try
        {
            var userId = GetUserId();
            var command = new RemoveCollaboratorCommand
            {
                NoteId = id,
                CollaboratorUserId = collaboratorUserId,
                CurrentUserId = userId
            };

            var updatedNote = await _mediator.Send(command);
            return Ok(updatedNote);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/accept-shared")]
    public async Task<IActionResult> AcceptSharedNote(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var command = new AcceptSharedNoteCommand(id, userId);
            var updatedNote = await _mediator.Send(command);
            return Ok(updatedNote);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/lock")]
    public async Task<IActionResult> LockNote(Guid id, [FromBody] NotePinRequest request)
    {
        try
        {
            var userId = GetUserId();
            var command = new LockNoteCommand
            {
                NoteId = id,
                UserId = userId,
                Pin = request.Pin
            };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/unlock")]
    public async Task<IActionResult> UnlockNote(Guid id, [FromBody] NotePinRequest request)
    {
        try
        {
            var userId = GetUserId();
            var command = new UnlockNoteCommand
            {
                NoteId = id,
                UserId = userId,
                Pin = request.Pin
            };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/remove-lock")]
    public async Task<IActionResult> RemoveNoteLock(Guid id, [FromBody] NotePinRequest request)
    {
        try
        {
            var userId = GetUserId();
            var command = new RemoveNoteLockCommand
            {
                NoteId = id,
                UserId = userId,
                Pin = request.Pin
            };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/public-link")]
    public async Task<IActionResult> GeneratePublicLink(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var command = new GeneratePublicLinkCommand
            {
                NoteId = id,
                UserId = userId
            };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/public-link")]
    public async Task<IActionResult> RevokePublicLink(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var command = new RevokePublicLinkCommand
            {
                NoteId = id,
                UserId = userId
            };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("public/{slug}")]
    public async Task<IActionResult> GetPublicNoteBySlug(string slug, [FromQuery] bool isUniqueView = true)
    {
        var currentUserId = GetUserId();
        var result = await _mediator.Send(new GetPublicNoteBySlugQuery(slug, isUniqueView, currentUserId));
        if (result == null)
        {
            return NotFound(new { message = "Note not found or public sharing has been disabled." });
        }
        return Ok(result);
    }
}
