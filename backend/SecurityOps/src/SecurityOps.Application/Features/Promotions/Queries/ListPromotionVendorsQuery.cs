using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record ListPromotionVendorsQuery : IRequest<IReadOnlyList<VendorOptionDto>>;

public sealed class ListPromotionVendorsQueryHandler
    : IRequestHandler<ListPromotionVendorsQuery, IReadOnlyList<VendorOptionDto>>
{
    private readonly IApplicationDbContext _db;

    public ListPromotionVendorsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<VendorOptionDto>> Handle(ListPromotionVendorsQuery request, CancellationToken ct) =>
        await _db.PromotionVendors
            .AsNoTracking()
            .Where(v => v.IsActive)
            .OrderBy(v => v.VendorName)
            .Select(v => new VendorOptionDto(v.Id, v.VendorName, v.ContactPerson, v.Phone))
            .ToListAsync(ct);
}
