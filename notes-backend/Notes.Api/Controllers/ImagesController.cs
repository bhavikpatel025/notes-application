using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;

namespace Notes.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImagesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

    public ImagesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Can’t upload this file. We accept GIF, JPEG, JPG, PNG files less than 10MB and 25 megapixels." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !_allowedExtensions.Contains(extension))
            return BadRequest(new { message = "Can’t upload this file. We accept GIF, JPEG, JPG, PNG files less than 10MB and 25 megapixels." });

        try
        {
            using var stream = file.OpenReadStream();
            var command = new Notes.Application.Images.Commands.UploadImage.UploadImageCommand
            {
                ContentStream = stream,
                FileName = file.FileName
            };

            var url = await _mediator.Send(command);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while uploading the file.", details = ex.Message });
        }
    }
}
