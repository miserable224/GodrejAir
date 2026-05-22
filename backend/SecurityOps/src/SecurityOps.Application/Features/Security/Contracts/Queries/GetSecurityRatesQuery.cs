using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Contracts.Queries;

public record GetSecurityRatesQuery : IRequest<List<RoleRateDto>>;

public class GetSecurityRatesQueryHandler : IRequestHandler<GetSecurityRatesQuery, List<RoleRateDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetSecurityRatesQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<RoleRateDto>> Handle(GetSecurityRatesQuery request, CancellationToken cancellationToken)
    {
        var activeContract = await _context.SecurityVendorContracts
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeContract == Guid.Empty) return new List<RoleRateDto>();

        return await _context.SecurityRoleRates
            .Where(x => x.ContractId == activeContract)
            .ProjectTo<RoleRateDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}

public class RoleRateDto
{
    public Guid Id { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public decimal DailyRate { get; set; }
    public decimal MonthlyRate { get; set; }
    public string ShiftDuration { get; set; } = string.Empty;
}
