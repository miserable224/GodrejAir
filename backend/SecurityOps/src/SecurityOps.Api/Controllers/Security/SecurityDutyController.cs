using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Duty;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/duty")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityDutyController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityDutyController(IMediator mediator) => _mediator = mediator;

    /// <summary>Deploy probe — returns 200 when duty routes are live (no auth).</summary>
    [HttpGet("ping")]
    [AllowAnonymous]
    public ActionResult<ApiResponse<object>> Ping() =>
        Ok(ApiResponse<object>.Ok(new { duty = true, routes = new[] { "check-in", "check-out", "sessions", "on-duty", "open" } }));

    [HttpPost("check-in")]
    public async Task<ActionResult<ApiResponse<DutySessionResponse>>> CheckIn(
        [FromBody] CheckInDutyRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _mediator.Send(new CheckInDutyCommand(body), cancellationToken);
            return Ok(ApiResponse<DutySessionResponse>.Ok(created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<DutySessionResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("{sessionId:guid}/check-out")]
    public async Task<ActionResult<ApiResponse<DutySessionResponse>>> CheckOut(
        Guid sessionId,
        [FromBody] CheckOutDutyRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _mediator.Send(new CheckOutDutyCommand(sessionId, body), cancellationToken);
            return Ok(ApiResponse<DutySessionResponse>.Ok(updated));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<DutySessionResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("on-duty")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DutySessionResponse>>>> OnDuty(
        CancellationToken cancellationToken)
    {
        var list = await _mediator.Send(new GetOnDutySessionsQuery(), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DutySessionResponse>>.Ok(list));
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DutySessionResponse>>>> Sessions(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? staffName,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var list = await _mediator.Send(
            new GetDutySessionsQuery(
                date.HasValue ? UtcDates.ToUtcDate(date.Value) : null,
                from.HasValue ? UtcDates.ToUtcDate(from.Value) : null,
                to.HasValue ? UtcDates.ToUtcDate(to.Value) : null,
                staffName,
                status),
            cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DutySessionResponse>>.Ok(list));
    }

    [HttpGet("open")]
    public async Task<ActionResult<ApiResponse<DutySessionResponse?>>> OpenForStaff(
        [FromQuery] string staffName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(staffName))
            return BadRequest(ApiResponse<DutySessionResponse?>.Fail("staffName is required."));

        var session = await _mediator.Send(new GetOpenDutySessionForStaffQuery(staffName), cancellationToken);
        return Ok(ApiResponse<DutySessionResponse?>.Ok(session));
    }
}
