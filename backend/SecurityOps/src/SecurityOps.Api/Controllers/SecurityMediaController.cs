using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security/media")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityMediaController : ControllerBase
{
    private const long MaxBytes = 10 * 1024 * 1024;
    private readonly ISecurityPhotoStorage _storage;

    public SecurityMediaController(ISecurityPhotoStorage storage) => _storage = storage;

    [HttpPost("upload")]
    [RequestSizeLimit(MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxBytes)]
    public async Task<ActionResult<ApiResponse<UploadPhotoResponse>>> Upload(
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<UploadPhotoResponse>.Fail("Photo file is required."));

        if (file.Length > MaxBytes)
            return BadRequest(ApiResponse<UploadPhotoResponse>.Fail("Photo must be 10 MB or smaller."));

        var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType;
        await using var stream = file.OpenReadStream();
        var relativePath = await _storage.SaveAsync(stream, contentType, file.FileName, cancellationToken);
        var url = $"{Request.Scheme}://{Request.Host}{relativePath}";
        return Ok(ApiResponse<UploadPhotoResponse>.Ok(new UploadPhotoResponse(url, relativePath)));
    }
}

public sealed record UploadPhotoResponse(string Url, string Path);
