using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Designations;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/designations")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class DutyDesignationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DutyDesignationsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("seed-defaults")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> SeedDefaults(
        [FromQuery] string module,
        CancellationToken cancellationToken)
    {
        var count = await _mediator.Send(new EnsureDefaultDesignationsCommand(module), cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { seeded = count }));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<DesignationResponse>>>> List(
        [FromQuery] string module,
        [FromQuery] bool? active,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetDesignationListQuery(module, active, paged.Page, paged.PageSize),
            cancellationToken);
        return Ok(ApiResponse<PagedResult<DesignationResponse>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<DesignationResponse>>> Create(
        [FromBody] CreateDesignationRequest body,
        CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateDesignationCommand(body), cancellationToken);
        return CreatedAtAction(nameof(List), ApiResponse<DesignationResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<DesignationResponse>>> Update(
        Guid id,
        [FromBody] UpdateDesignationRequest body,
        CancellationToken cancellationToken)
    {
        var updated = await _mediator.Send(new UpdateDesignationCommand(id, body), cancellationToken);
        return updated is null
            ? NotFound(ApiResponse<DesignationResponse>.Fail("Designation not found."))
            : Ok(ApiResponse<DesignationResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeleteDesignationCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Designation not found."));
    }
}
