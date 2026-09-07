using MediatR;
using System.IO;

namespace Notes.Application.Images.Commands.UploadImage;

public class UploadImageCommand : IRequest<string>
{
    public Stream ContentStream { get; set; } = Stream.Null;
    public string FileName { get; set; } = string.Empty;
}
