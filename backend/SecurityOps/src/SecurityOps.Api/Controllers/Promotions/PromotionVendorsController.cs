using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Promotions;
using SecurityOps.Application.Features.Promotions.Queries;

namespace SecurityOps.Api.Controllers.Promotions;

[ApiController]
[Route("api/vendors")]
[Tags("Promotions")]
[Authorize(Roles = "SUPER_ADMIN,ADMIN,SECURITY_SUPERVISOR,SUPERVISOR,FM,AFM")]
public sealed class PromotionVendorsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PromotionVendorsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VendorOptionDto>>>> List(CancellationToken ct)
    {
        var rows = await _mediator.Send(new ListPromotionVendorsQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<VendorOptionDto>>.Ok(rows));
    }
}
