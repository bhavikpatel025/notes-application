using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Notes.Application.Interfaces;

public interface IImageUploadService
{
    Task<string> UploadImageAsync(Stream imageStream, string fileName);
    Task<bool> DeleteImageAsync(string imageUrl);
    Task DeleteImagesAsync(IEnumerable<string> imageUrls);
}
