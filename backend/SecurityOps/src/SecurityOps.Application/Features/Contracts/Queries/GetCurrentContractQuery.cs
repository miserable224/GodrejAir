using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Contracts.Queries;

public record GetCurrentContractQuery : IRequest<ContractDto?>;

public class GetCurrentContractQueryHandler : IRequestHandler<GetCurrentContractQuery, ContractDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetCurrentContractQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ContractDto?> Handle(GetCurrentContractQuery request, CancellationToken cancellationToken)
    {
        return await _context.SecurityVendorContracts
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ProjectTo<ContractDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);
    }
}

public class ContractDto
{
    public Guid Id { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string ContractNumber { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal ServiceChargePercentage { get; set; }
    public decimal GstPercentage { get; set; }
    public decimal ShortageThresholdPercentage { get; set; }
    public decimal HighShortagePenaltyPercentage { get; set; }
}
