using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record GetPromotionDashboardQuery : IRequest<PromotionDashboardDto>;

public sealed class GetPromotionDashboardQueryHandler : IRequestHandler<GetPromotionDashboardQuery, PromotionDashboardDto>
{
    private readonly IApplicationDbContext _db;

    public GetPromotionDashboardQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PromotionDashboardDto> Handle(GetPromotionDashboardQuery request, CancellationToken ct)
    {
        var statusCounts = await _db.Promotions
            .AsNoTracking()
            .GroupBy(p => p.PromotionStatus)
            .Select(g => new PromotionStatusCountDto(g.Key, g.Count()))
            .ToListAsync(ct);

        var totalRevenue = await _db.Promotions.AsNoTracking().SumAsync(p => p.TotalAmount, ct);
        var totalCollected = await _db.PromotionPayments.AsNoTracking().SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        var active = statusCounts.FirstOrDefault(s => s.Status == "Active")?.Count ?? 0;
        var upcoming = statusCounts.FirstOrDefault(s => s.Status == "Upcoming")?.Count ?? 0;
        var expired = statusCounts.FirstOrDefault(s => s.Status == "Expired")?.Count ?? 0;
        var total = statusCounts.Sum(s => s.Count);

        var recent = await _db.Promotions
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Take(10)
            .ToListItemDtos(_db)
            .ToListAsync(ct);

        return new PromotionDashboardDto(
            total,
            active,
            upcoming,
            expired,
            totalRevenue,
            totalCollected,
            totalRevenue - totalCollected,
            statusCounts,
            recent);
    }
}
