using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Notes.Application.Interfaces;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Notes.Infrastructure.Services;

public class CloudinaryImageUploadService : IImageUploadService
{
    private readonly Cloudinary _cloudinary;
    private readonly IWebHostEnvironment _environment;

    public CloudinaryImageUploadService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _environment = environment;

        var cloudinaryUrl = configuration["Cloudinary:Url"];
        if (string.IsNullOrEmpty(cloudinaryUrl))
        {
            throw new ArgumentNullException("Cloudinary:Url", "Cloudinary URL configuration is missing.");
        }

        _cloudinary = new Cloudinary(cloudinaryUrl);
        _cloudinary.Api.Secure = true;
    }

    public async Task<string> UploadImageAsync(Stream imageStream, string fileName)
    {
        var folder = _environment.IsDevelopment() ? "Notes_local" : "notes_live";

        var uploadParams = new ImageUploadParams()
        {
            File = new FileDescription(fileName, imageStream),
            Folder = folder,
            UseFilename = true,
            UniqueFilename = true
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
        }

        return uploadResult.SecureUrl.ToString();
    }
}
