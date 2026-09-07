using MediatR;
using Notes.Application.Interfaces;
using System.Threading;
using System.Threading.Tasks;

namespace Notes.Application.Images.Commands.UploadImage;

public class UploadImageCommandHandler : IRequestHandler<UploadImageCommand, string>
{
    private readonly IImageUploadService _imageUploadService;

    public UploadImageCommandHandler(IImageUploadService imageUploadService)
    {
        _imageUploadService = imageUploadService;
    }

    public async Task<string> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        return await _imageUploadService.UploadImageAsync(request.ContentStream, request.FileName);
    }
}
