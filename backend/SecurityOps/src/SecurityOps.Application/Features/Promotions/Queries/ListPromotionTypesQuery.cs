using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record ListPromotionTypesQuery : IRequest<IReadOnlyList<LookupDto>>;

public sealed class ListPromotionTypesQueryHandler : IRequestHandler<ListPromotionTypesQuery, IReadOnlyList<LookupDto>>
{
    private readonly IApplicationDbContext _db;

    public ListPromotionTypesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<LookupDto>> Handle(ListPromotionTypesQuery request, CancellationToken ct) =>
        await _db.PromotionTypes
            .AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.TypeName)
            .Select(t => new LookupDto(t.Id, t.TypeName))
            .ToListAsync(ct);
}
