using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Attendance.Commands;
using SecurityOps.Domain;
using SecurityOps.Application.Features.Attendance.Queries;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/attendance")]
[Authorize(Roles = AppRoles.AllStaff)]
public class SecurityAttendanceController : ControllerBase
{
    private const long BulkMaxBytes = 50 * 1024 * 1024;
    private readonly IMediator _mediator;
    private readonly ISecurityPhotoStorage _photoStorage;

    public SecurityAttendanceController(IMediator mediator, ISecurityPhotoStorage photoStorage)
    {
        _mediator = mediator;
        _photoStorage = photoStorage;
    }

    [HttpPost("daily-entry")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<Guid>>> RecordDailyAttendance(
        [FromBody] RecordDailyAttendanceCommand command,
        CancellationToken cancellationToken)
    {
        command.Date = UtcDates.ToUtcDate(command.Date);
        var id = await _mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<Guid>.Ok(id));
    }

    /// <summary>
    /// Save multiple security deployment logs in one request (metadata JSON + photos in order).
    /// </summary>
    [HttpPost("bulk-deployment-logs")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    [RequestSizeLimit(BulkMaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = BulkMaxBytes)]
    public async Task<ActionResult<ApiResponse<int>>> BulkDeploymentLogs(
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
            Module = DeploymentModules.Security,
            Date = UtcDates.ToUtcDate(date),
            Entries = new List<AttendanceEntryDto>(),
            DeploymentContexts = deploymentContexts,
        };

        await _mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<int>.Ok(deploymentContexts.Count));
    }

    [HttpGet("daily-summary")]
    public async Task<ActionResult<DailyAttendanceSummaryResponse>> GetDailySummary(
        [FromQuery] DateTime date,
        CancellationToken cancellationToken)
    {
        return Ok(await _mediator.Send(new GetDailyAttendanceSummaryQuery(UtcDates.ToUtcDate(date)), cancellationToken));
    }
}
