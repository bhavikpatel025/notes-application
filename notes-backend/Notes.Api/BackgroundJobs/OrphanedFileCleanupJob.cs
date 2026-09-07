using Microsoft.EntityFrameworkCore;
using Notes.Infrastructure.Persistence;

namespace Notes.Api.BackgroundJobs;

public class OrphanedFileCleanupJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<OrphanedFileCleanupJob> _logger;

    public OrphanedFileCleanupJob(
        IServiceProvider serviceProvider, 
        IWebHostEnvironment environment,
        ILogger<OrphanedFileCleanupJob> logger)
    {
        _serviceProvider = serviceProvider;
        _environment = environment;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Orphaned File Cleanup Job started.");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupOrphanedFilesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing Orphaned File Cleanup Job.");
            }

            // Wait 24 hours before running again
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task CleanupOrphanedFilesAsync()
    {
        // Cleanup is disabled as files are now hosted on Cloudinary
        // var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        // if (!Directory.Exists(uploadsFolder)) return;

        // var allFiles = Directory.GetFiles(uploadsFolder);
        // if (allFiles.Length == 0) return;

        // using var scope = _serviceProvider.CreateScope();
        // var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // var notesWithImages = await dbContext.Notes
        //     .Where(n => n.ImageUrls != null)
        //     .Select(n => n.ImageUrls)
        //     .ToListAsync();

        // var activeImageUrls = notesWithImages
        //     .Where(urls => urls != null)
        //     .SelectMany(urls => urls!)
        //     .Select(url => Path.GetFileName(url))
        //     .ToHashSet();

        // int deletedCount = 0;
        // foreach (var filePath in allFiles)
        // {
        //     var fileName = Path.GetFileName(filePath);
        //     var fileInfo = new FileInfo(filePath);

        //     if (!activeImageUrls.Contains(fileName) && fileInfo.CreationTimeUtc < DateTime.UtcNow.AddHours(-24))
        //     {
        //         try
        //         {
        //             File.Delete(filePath);
        //             deletedCount++;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogWarning(ex, $"Failed to delete orphaned file: {filePath}");
        //         }
        //     }
        // }

        // _logger.LogInformation($"Orphaned File Cleanup Job finished. Deleted {deletedCount} files.");
        
        await Task.CompletedTask;
    }
}
