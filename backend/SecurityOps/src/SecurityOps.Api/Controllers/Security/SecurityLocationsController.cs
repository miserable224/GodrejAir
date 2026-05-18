using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Locations;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/locations")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityLocationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityLocationsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<LocationResponse>>>> List([FromQuery] PagedRequest paged, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetLocationsQuery(paged.Page, paged.PageSize), cancellationToken);
        return Ok(ApiResponse<PagedResult<LocationResponse>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<LocationResponse>>> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _mediator.Send(new GetLocationByIdQuery(id), cancellationToken);
        return item is null
            ? NotFound(ApiResponse<LocationResponse>.Fail("Location not found."))
            : Ok(ApiResponse<LocationResponse>.Ok(item));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<LocationResponse>>> Create([FromBody] CreateLocationRequest body, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateLocationCommand(body), cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<LocationResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<LocationResponse>>> Update(Guid id, [FromBody] UpdateLocationRequest body, CancellationToken cancellationToken)
    {
        var updated = await _mediator.Send(new UpdateLocationCommand(id, body), cancellationToken);
        return updated is null
            ? NotFound(ApiResponse<LocationResponse>.Fail("Location not found."))
            : Ok(ApiResponse<LocationResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeleteLocationCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Location not found."));
    }
}
