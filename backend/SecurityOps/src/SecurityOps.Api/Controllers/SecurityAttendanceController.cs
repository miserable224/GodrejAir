using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Attendance.Commands;
using SecurityOps.Application.Features.Attendance.Queries;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security/attendance")]
[Authorize(Roles = AppRoles.AllStaff)]
public class SecurityAttendanceController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityAttendanceController(IMediator mediator) => _mediator = mediator;

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

    [HttpGet("daily-summary")]
    public async Task<ActionResult<DailyAttendanceSummaryResponse>> GetDailySummary(
        [FromQuery] DateTime date,
        CancellationToken cancellationToken)
    {
        return Ok(await _mediator.Send(new GetDailyAttendanceSummaryQuery(UtcDates.ToUtcDate(date)), cancellationToken));
    }
}
