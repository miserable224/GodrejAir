using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Housekeeping.Queries;

namespace HousekeepingOps.Api.Controllers;

[ApiController]
[Route("api/housekeeping")]
[Tags("Housekeeping")]
[Authorize(Roles = "SUPER_ADMIN,ADMIN,SECURITY_SUPERVISOR,SUPERVISOR,FM,AFM")]
public sealed class HousekeepingDashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public HousekeepingDashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<HousekeepingDashboardDto>>> GetDashboard(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] string? label,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetHousekeepingDashboardQuery(from, to, label), cancellationToken);
        if (!string.IsNullOrEmpty(result.Message) && result.Roles.Count == 0)
            return BadRequest(ApiResponse<HousekeepingDashboardDto>.Fail(result.Message));
        return Ok(ApiResponse<HousekeepingDashboardDto>.Ok(result));
    }
}
