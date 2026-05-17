using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Reports.Queries;
using System.Threading.Tasks;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security/dashboard")]
public class SecurityDashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityDashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("monthly")]
    public async Task<ActionResult<ApiResponse<MonthlyDashboardDto>>> GetMonthlyDashboard([FromQuery] string month)
    {
        var result = await _mediator.Send(new GetMonthlyDashboardQuery(month));
        return Ok(ApiResponse<MonthlyDashboardDto>.Ok(result));
    }
}
