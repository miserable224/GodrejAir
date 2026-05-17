using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Infrastructure.Storage;

public sealed class LocalSecurityPhotoStorage : ISecurityPhotoStorage
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    };

    private readonly IWebHostEnvironment _env;
    private readonly ILogger<LocalSecurityPhotoStorage> _logger;

    public LocalSecurityPhotoStorage(IWebHostEnvironment env, ILogger<LocalSecurityPhotoStorage> logger)
    {
        _env = env;
        _logger = logger;
    }

    public async Task<string> SaveAsync(
        Stream content,
        string contentType,
        string? originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (!AllowedContentTypes.Contains(contentType))
            throw new InvalidOperationException($"Unsupported image type: {contentType}");

        var ext = ExtensionFor(contentType, originalFileName);
        var folder = Path.Combine("uploads", "security", DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"));
        var root = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
            root = Path.Combine(_env.ContentRootPath, "wwwroot");

        var absoluteDir = Path.Combine(root, folder);
        Directory.CreateDirectory(absoluteDir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var absolutePath = Path.Combine(absoluteDir, fileName);

        await using var fs = new FileStream(absolutePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fs, cancellationToken);

        var relativeUrl = "/" + Path.Combine(folder, fileName).Replace('\\', '/');
        _logger.LogInformation("Saved security photo to {Path}", relativeUrl);
        return relativeUrl;
    }

    private static string ExtensionFor(string contentType, string? originalFileName)
    {
        if (!string.IsNullOrWhiteSpace(originalFileName))
        {
            var ext = Path.GetExtension(originalFileName);
            if (!string.IsNullOrWhiteSpace(ext) && ext.Length <= 5)
                return ext.ToLowerInvariant();
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/heic" or "image/heif" => ".heic",
            _ => ".jpg",
        };
    }
}
