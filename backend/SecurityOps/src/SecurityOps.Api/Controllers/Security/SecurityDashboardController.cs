using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Reports.Queries;
using SecurityOps.Application.Features.Security.Dashboard;

namespace SecurityOps.Api.Controllers.Security;

/// <summary>Security module — dashboard &amp; period summaries.</summary>
[ApiController]
[Route("api/security/dashboard")]
[Tags("Security")]
public class SecurityDashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityDashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet("monthly")]
    public async Task<ActionResult<ApiResponse<MonthlyDashboardDto>>> GetMonthlyDashboard([FromQuery] string month)
    {
        var result = await _mediator.Send(new GetMonthlyDashboardQuery(month));
        return Ok(ApiResponse<MonthlyDashboardDto>.Ok(result));
    }

    /// <summary>Deployment summary for a date range (today / week / month / custom).</summary>
    [HttpGet("period")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<SecurityOpsDashboardDto>>> GetPeriodDashboard(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] string? label,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetSecurityOpsDashboardQuery(from, to, label), cancellationToken);
        if (!string.IsNullOrEmpty(result.Message) && result.Roles.Count == 0)
            return BadRequest(ApiResponse<SecurityOpsDashboardDto>.Fail(result.Message));
        return Ok(ApiResponse<SecurityOpsDashboardDto>.Ok(result));
    }
}
