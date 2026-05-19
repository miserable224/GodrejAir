using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Attendance.Commands;
using SecurityOps.Domain;

namespace SecurityOps.Api.Controllers.Housekeeping;

[ApiController]
[Route("api/housekeeping/deployments")]
[Tags("Housekeeping")]
[Authorize(Roles = "SUPER_ADMIN,ADMIN,SECURITY_SUPERVISOR,SUPERVISOR,FM,AFM")]
public sealed class HousekeepingDeploymentsController : ControllerBase
{
    private const long BulkMaxBytes = 50 * 1024 * 1024;
    private readonly IMediator _mediator;
    private readonly ISecurityPhotoStorage _photoStorage;

    public HousekeepingDeploymentsController(IMediator mediator, ISecurityPhotoStorage photoStorage)
    {
        _mediator = mediator;
        _photoStorage = photoStorage;
    }

    [HttpPost("bulk")]
    [RequestSizeLimit(BulkMaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = BulkMaxBytes)]
    public async Task<ActionResult<ApiResponse<int>>> BulkDeployments(
        [FromForm] DateTime date,
        [FromForm] string entries,
        [FromForm] List<IFormFile>? photos,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(entries))
            return BadRequest(ApiResponse<int>.Fail("Entries JSON is required."));

        List<BulkDeploymentLogEntryDto>? items;
        try
        {
            items = JsonSerializer.Deserialize<List<BulkDeploymentLogEntryDto>>(
                entries,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return BadRequest(ApiResponse<int>.Fail("Invalid entries JSON."));
        }

        if (items is null || items.Count == 0)
            return BadRequest(ApiResponse<int>.Fail("At least one deployment entry is required."));

        photos ??= new List<IFormFile>();
        if (photos.Count != items.Count)
            return BadRequest(ApiResponse<int>.Fail("Photo count must match entry count."));

        var deploymentContexts = new List<DeploymentContextDto>(items.Count);
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var file = photos[i];
            if (file.Length == 0)
                return BadRequest(ApiResponse<int>.Fail($"Photo {i + 1} is empty."));

            var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType;
            await using var stream = file.OpenReadStream();
            var relativePath = await _photoStorage.SaveAsync(stream, contentType, file.FileName, cancellationToken);
            var photoUrl = $"{Request.Scheme}://{Request.Host}{relativePath}";

            deploymentContexts.Add(new DeploymentContextDto
            {
                Designation = item.Designation,
                StaffName = item.StaffName,
                Location = item.Location,
                PhotoUrls = new List<string> { photoUrl },
                PhotoLatitude = item.PhotoLatitude,
                PhotoLongitude = item.PhotoLongitude,
                PhotoAccuracyMeters = item.PhotoAccuracyMeters,
                PhotoCapturedAt = item.PhotoCapturedAt,
            });
        }

        var command = new RecordDailyAttendanceCommand
        {
            Module = DeploymentModules.Housekeeping,
            Date = UtcDates.ToUtcDate(date),
            Entries = new List<AttendanceEntryDto>(),
            DeploymentContexts = deploymentContexts,
        };

        await _mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<int>.Ok(deploymentContexts.Count));
    }
}
