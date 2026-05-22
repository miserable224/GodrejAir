using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Contracts.Queries;

public record GetSanctionedStrengthQuery : IRequest<List<SanctionedStrengthDto>>;

public class GetSanctionedStrengthQueryHandler : IRequestHandler<GetSanctionedStrengthQuery, List<SanctionedStrengthDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSanctionedStrengthQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SanctionedStrengthDto>> Handle(GetSanctionedStrengthQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _context.SecuritySanctionedStrengths
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            return SanctionedStrengthAggregation.AggregateByRole(rows)
                .Select(s => new SanctionedStrengthDto
                {
                    Id = Guid.Empty,
                    RoleName = s.RoleName,
                    Shift1Count = s.Shift1Count,
                    Shift2Count = s.Shift2Count,
                    Shift3Count = s.Shift3Count,
                    GeneralShiftCount = s.GeneralShiftCount,
                    RelieverCount = s.RelieverCount,
                    TotalExpected = s.TotalExpected,
                })
                .ToList();
        }
        catch (Exception)
        {
            return new List<SanctionedStrengthDto>();
        }
    }
}

public class SanctionedStrengthDto
{
    public Guid Id { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int Shift1Count { get; set; }
    public int Shift2Count { get; set; }
    public int Shift3Count { get; set; }
    public int GeneralShiftCount { get; set; }
    public int RelieverCount { get; set; }
    public int TotalExpected { get; set; }
}
