using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Patrols;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/patrols")]
[Authorize(Roles = AppRoles.AllStaff)]
public sealed class SecurityPatrolsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityPatrolsController(IMediator mediator) => _mediator = mediator;

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PatrolResponse>>> Create([FromBody] CreatePatrolRequest body, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreatePatrolCommand(body), cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<PatrolResponse>.Ok(created));
    }

    /// <summary>Mobile patrol log — staff name, optional location text, uploaded photo URLs.</summary>
    [HttpPost("mobile")]
    public async Task<ActionResult<ApiResponse<PatrolResponse>>> CreateMobile(
        [FromBody] CreateMobilePatrolRequest body,
        CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateMobilePatrolCommand(body), cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ApiResponse<PatrolResponse>.Ok(created));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PatrolResponse>>>> List(
        [FromQuery] DateOnly? date,
        [FromQuery] string? month,
        [FromQuery] string? shiftType,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetPatrolsQuery(date, month, shiftType, paged.Page, paged.PageSize),
            cancellationToken);
        return Ok(ApiResponse<PagedResult<PatrolResponse>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PatrolResponse>>> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _mediator.Send(new GetPatrolByIdQuery(id), cancellationToken);
        return item is null
            ? NotFound(ApiResponse<PatrolResponse>.Fail("Patrol not found."))
            : Ok(ApiResponse<PatrolResponse>.Ok(item));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.AdminOrSupervisor)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeletePatrolCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Patrol not found."));
    }
}
