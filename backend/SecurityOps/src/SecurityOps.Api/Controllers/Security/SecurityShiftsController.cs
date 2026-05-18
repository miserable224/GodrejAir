using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Shifts;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/shifts")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityShiftsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityShiftsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ShiftResponse>>>> List(
        [FromQuery] DateOnly? date,
        [FromQuery] string? month,
        [FromQuery] string? shiftType,
        [FromQuery] Guid? supervisorId,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetShiftsQuery(date, month, shiftType, supervisorId, paged.Page, paged.PageSize),
            cancellationToken);
        return Ok(ApiResponse<PagedResult<ShiftResponse>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ShiftResponse>>> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _mediator.Send(new GetShiftByIdQuery(id), cancellationToken);
        return item is null
            ? NotFound(ApiResponse<ShiftResponse>.Fail("Shift not found."))
            : Ok(ApiResponse<ShiftResponse>.Ok(item));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<ShiftResponse>>> Create([FromBody] CreateShiftRequest body, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateShiftCommand(body), cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<ShiftResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<ShiftResponse>>> Update(Guid id, [FromBody] UpdateShiftRequest body, CancellationToken cancellationToken)
    {
        var updated = await _mediator.Send(new UpdateShiftCommand(id, body), cancellationToken);
        return updated is null
            ? NotFound(ApiResponse<ShiftResponse>.Fail("Shift not found."))
            : Ok(ApiResponse<ShiftResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeleteShiftCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Shift not found."));
    }
}
