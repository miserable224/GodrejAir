using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Designations;
using SecurityOps.Domain;

namespace SecurityOps.Api.Controllers.Housekeeping;

/// <summary>Housekeeping duty designations — same handlers as Security (shared DB table).</summary>
[ApiController]
[Route("api/housekeeping/designations")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class HousekeepingDesignationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public HousekeepingDesignationsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("seed-defaults")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> SeedDefaults(CancellationToken cancellationToken)
    {
        var count = await _mediator.Send(
            new EnsureDefaultDesignationsCommand(DeploymentModules.Housekeeping),
            cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { seeded = count }));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<DesignationResponse>>>> List(
        [FromQuery] bool? active,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetDesignationListQuery(DeploymentModules.Housekeeping, active, paged.Page, paged.PageSize),
            cancellationToken);
        return Ok(ApiResponse<PagedResult<DesignationResponse>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<DesignationResponse>>> Create(
        [FromBody] HousekeepingCreateDesignationRequest body,
        CancellationToken cancellationToken)
    {
        var payload = new CreateDesignationRequest(DeploymentModules.Housekeeping, body.Title);
        var created = await _mediator.Send(new CreateDesignationCommand(payload), cancellationToken);
        return Ok(ApiResponse<DesignationResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<DesignationResponse>>> Update(
        Guid id,
        [FromBody] UpdateDesignationRequest body,
        CancellationToken cancellationToken)
    {
        var payload = body with { Module = DeploymentModules.Housekeeping };
        var updated = await _mediator.Send(new UpdateDesignationCommand(id, payload), cancellationToken);
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
