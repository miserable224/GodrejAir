using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Billing.Commands;
using SecurityOps.Application.Features.Billing.Queries;
using System;
using System.Threading.Tasks;

namespace SecurityOps.Api.Controllers.Security;

[ApiController]
[Route("api/security/billing")]
public class SecurityBillingController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityBillingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("monthly-calculation")]
    public async Task<ActionResult<ApiResponse<BillingCalculationResponse>>> GetMonthlyCalculation([FromQuery] string month)
    {
        var result = await _mediator.Send(new GetMonthlyBillingCalculationQuery(month));
        return Ok(ApiResponse<BillingCalculationResponse>.Ok(result));
    }

    [HttpPost("generate")]
    public async Task<ActionResult<Guid>> GenerateInvoice([FromBody] GenerateMonthlyBillingCommand command)
    {
        return Ok(await _mediator.Send(command));
    }
}
