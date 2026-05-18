using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Reports;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/reports")]
[Authorize(Roles = AppRoles.AdminOrSupervisor)]
public sealed class SecurityReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityReportsController(IMediator mediator) => _mediator = mediator;

    [HttpGet("daily-manpower")]
    public async Task<ActionResult<ApiResponse<DailyManpowerReport>>> DailyManpower(
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var report = await _mediator.Send(new GetDailyManpowerReportQuery(d), cancellationToken);
        return Ok(ApiResponse<DailyManpowerReport>.Ok(report));
    }

    [HttpGet("monthly-shortage")]
    public async Task<ActionResult<ApiResponse<MonthlyShortageReport>>> MonthlyShortage(
        [FromQuery] string? month,
        CancellationToken cancellationToken)
    {
        var m = month ?? DateTime.UtcNow.ToString("yyyy-MM");
        var report = await _mediator.Send(new GetMonthlyShortageReportQuery(m), cancellationToken);
        return Ok(ApiResponse<MonthlyShortageReport>.Ok(report));
    }

    [HttpGet("patrol-compliance")]
    public async Task<ActionResult<ApiResponse<PatrolComplianceReport>>> PatrolCompliance(
        [FromQuery] string? month,
        CancellationToken cancellationToken)
    {
        var m = month ?? DateTime.UtcNow.ToString("yyyy-MM");
        var report = await _mediator.Send(new GetPatrolComplianceReportQuery(m), cancellationToken);
        return Ok(ApiResponse<PatrolComplianceReport>.Ok(report));
    }

    [HttpGet("attendance")]
    public async Task<ActionResult<ApiResponse<AttendanceReport>>> Attendance(
        [FromQuery] string? month,
        CancellationToken cancellationToken)
    {
        var m = month ?? DateTime.UtcNow.ToString("yyyy-MM");
        var report = await _mediator.Send(new GetAttendanceReportQuery(m), cancellationToken);
        return Ok(ApiResponse<AttendanceReport>.Ok(report));
    }

    [HttpGet("role-shortages")]
    public async Task<ActionResult<List<SecurityOps.Application.Features.Reports.Queries.RoleShortageReportDto>>> GetRoleShortages([FromQuery] string month)
    {
        return Ok(await _mediator.Send(new SecurityOps.Application.Features.Reports.Queries.GetRoleShortagesReportQuery(month)));
    }
}
