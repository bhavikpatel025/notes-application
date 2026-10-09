using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Notes.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Notes.Infrastructure.Services;

public class CloudinaryImageUploadService : IImageUploadService
{
    private readonly Cloudinary _cloudinary;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CloudinaryImageUploadService> _logger;

    public CloudinaryImageUploadService(
        IConfiguration configuration, 
        IWebHostEnvironment environment,
        ILogger<CloudinaryImageUploadService> logger)
    {
        _environment = environment;
        _logger = logger;

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

    public async Task<bool> DeleteImageAsync(string imageUrl)
    {
        var publicId = ExtractPublicId(imageUrl);
        if (string.IsNullOrWhiteSpace(publicId))
        {
            _logger.LogWarning("Could not extract Cloudinary public ID from URL: {ImageUrl}", imageUrl);
            return false;
        }

        try
        {
            var deleteParams = new DeletionParams(publicId)
            {
                ResourceType = ResourceType.Image
            };
            var result = await _cloudinary.DestroyAsync(deleteParams);
            
            if (result.Result == "ok" || result.Result == "not found")
            {
                _logger.LogInformation("Successfully deleted Cloudinary image: {PublicId}", publicId);
                return true;
            }

            _logger.LogWarning("Failed to delete Cloudinary image: {PublicId}, Result: {Result}", publicId, result.Result);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Cloudinary image: {PublicId}", publicId);
            return false;
        }
    }

    public async Task DeleteImagesAsync(IEnumerable<string> imageUrls)
    {
        if (imageUrls == null) return;

        foreach (var url in imageUrls)
        {
            if (!string.IsNullOrWhiteSpace(url))
            {
                await DeleteImageAsync(url);
            }
        }
    }

    public static string? ExtractPublicId(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl) || !imageUrl.Contains("cloudinary.com", StringComparison.OrdinalIgnoreCase))
            return null;

        try
        {
            var uri = new Uri(imageUrl);
            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

            // Locate 'upload' segment
            int uploadIndex = Array.FindIndex(segments, s => string.Equals(s, "upload", StringComparison.OrdinalIgnoreCase));
            if (uploadIndex == -1 || uploadIndex >= segments.Length - 1)
                return null;

            int startIndex = uploadIndex + 1;
            // Skip Cloudinary transformation segment or version tag (e.g. v1727781234)
            while (startIndex < segments.Length && (Regex.IsMatch(segments[startIndex], @"^v\d+$") || segments[startIndex].Contains(',')))
            {
                startIndex++;
            }

            if (startIndex >= segments.Length)
                return null;

            var publicIdWithExtension = string.Join("/", segments.Skip(startIndex));
            int lastDotIndex = publicIdWithExtension.LastIndexOf('.');
            return lastDotIndex > 0 ? publicIdWithExtension.Substring(0, lastDotIndex) : publicIdWithExtension;
        }
        catch
        {
            return null;
        }
    }
}
