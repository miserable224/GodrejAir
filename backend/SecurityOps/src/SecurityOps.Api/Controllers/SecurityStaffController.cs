using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Staff;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security/staff")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityStaffController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityStaffController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<StaffResponse>>>> List(
        [FromQuery] string? role,
        [FromQuery] bool? active,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetStaffListQuery(role, active, paged.Page, paged.PageSize), cancellationToken);
        return Ok(ApiResponse<PagedResult<StaffResponse>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _mediator.Send(new GetStaffByIdQuery(id), cancellationToken);
        return item is null
            ? NotFound(ApiResponse<StaffResponse>.Fail("Staff not found."))
            : Ok(ApiResponse<StaffResponse>.Ok(item));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> Create([FromBody] CreateStaffRequest body, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateStaffCommand(body), cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<StaffResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<StaffResponse>>> Update(Guid id, [FromBody] UpdateStaffRequest body, CancellationToken cancellationToken)
    {
        var updated = await _mediator.Send(new UpdateStaffCommand(id, body), cancellationToken);
        return updated is null
            ? NotFound(ApiResponse<StaffResponse>.Fail("Staff not found."))
            : Ok(ApiResponse<StaffResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeleteStaffCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Staff not found."));
    }
}
