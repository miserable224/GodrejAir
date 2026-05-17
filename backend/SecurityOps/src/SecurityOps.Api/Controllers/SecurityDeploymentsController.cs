using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Application.Features.Deployments;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security/deployments")]
[Authorize(Roles = AppRoles.AdminOrSupervisor)]
public sealed class SecurityDeploymentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityDeploymentsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("bulk")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DeploymentResponse>>>> Bulk(
        [FromBody] BulkDeploymentRequest body,
        CancellationToken cancellationToken)
    {
        var list = await _mediator.Send(new BulkReplaceDeploymentsCommand(body), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DeploymentResponse>>.Ok(list));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<DeploymentResponse>>>> List(
        [FromQuery] Guid? shiftId,
        [FromQuery] DateOnly? date,
        [FromQuery] PagedRequest paged,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetDeploymentsQuery(shiftId, date, paged.Page, paged.PageSize),
            cancellationToken);
        return Ok(ApiResponse<PagedResult<DeploymentResponse>>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _mediator.Send(new DeleteDeploymentCommand(id), cancellationToken);
        return ok
            ? Ok(ApiResponse<object>.Ok(new { id }))
            : NotFound(ApiResponse<object>.Fail("Deployment not found."));
    }
}
