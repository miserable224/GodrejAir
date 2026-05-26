namespace SecurityOps.Application.Common.Interfaces;

/// <summary>
/// Persists the four audit photos that accompany every water-tanker delivery.
/// Returns a public URL (relative path served by <c>app.UseStaticFiles()</c>)
/// plus the local storage path for housekeeping.
/// </summary>
public interface IWaterPhotoStorage
{
    Task<WaterPhotoStorageResult> SaveAsync(
        Stream content,
        string contentType,
        string? originalFileName,
        CancellationToken cancellationToken = default);
}

public sealed record WaterPhotoStorageResult(
    string PublicUrl,
    string StoragePath,
    int SizeBytes);
