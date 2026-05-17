namespace SecurityOps.Application.Common.Interfaces;

public interface ISecurityPhotoStorage
{
    /// <summary>Saves an image stream and returns a public URL path (absolute when baseUrl is provided).</summary>
    Task<string> SaveAsync(Stream content, string contentType, string? originalFileName, CancellationToken cancellationToken = default);
}
