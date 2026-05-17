using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Contracts.Queries;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SecurityOps.Api.Controllers;

[ApiController]
[Route("api/security")]
public class SecurityContractsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SecurityContractsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("contracts/current")]
    public async Task<ActionResult<ApiResponse<ContractDto>>> GetCurrentContract()
    {
        var result = await _mediator.Send(new GetCurrentContractQuery());
        if (result == null) return NotFound(ApiResponse<ContractDto>.Fail("No active contract found."));
        return Ok(ApiResponse<ContractDto>.Ok(result));
    }

    [HttpGet("rates")]
    public async Task<ActionResult<ApiResponse<List<RoleRateDto>>>> GetRates()
    {
        var result = await _mediator.Send(new GetSecurityRatesQuery());
        return Ok(ApiResponse<List<RoleRateDto>>.Ok(result));
    }

    [HttpGet("sanctioned-strength")]
    public async Task<ActionResult<ApiResponse<List<SanctionedStrengthDto>>>> GetSanctionedStrength()
    {
        var result = await _mediator.Send(new GetSanctionedStrengthQuery());
        return Ok(ApiResponse<List<SanctionedStrengthDto>>.Ok(result));
    }
}
