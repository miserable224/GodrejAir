using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record ListPromotionsQuery(int Limit = 200) : IRequest<IReadOnlyList<PromotionListItemDto>>;

public sealed class ListPromotionsQueryHandler : IRequestHandler<ListPromotionsQuery, IReadOnlyList<PromotionListItemDto>>
{
    private readonly IApplicationDbContext _db;

    public ListPromotionsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<PromotionListItemDto>> Handle(ListPromotionsQuery request, CancellationToken ct)
    {
        var limit = Math.Clamp(request.Limit, 1, 500);
        return await _db.Promotions
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListItemDtos(_db)
            .ToListAsync(ct);
    }
}
