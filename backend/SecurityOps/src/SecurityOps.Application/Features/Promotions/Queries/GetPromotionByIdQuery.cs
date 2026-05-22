using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record GetPromotionByIdQuery(Guid Id) : IRequest<PromotionDetailDto?>;

public sealed class GetPromotionByIdQueryHandler : IRequestHandler<GetPromotionByIdQuery, PromotionDetailDto?>
{
    private readonly IApplicationDbContext _db;

    public GetPromotionByIdQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PromotionDetailDto?> Handle(GetPromotionByIdQuery request, CancellationToken ct)
    {
        var p = await _db.Promotions
            .AsNoTracking()
            .Include(x => x.PromotionType)
            .Include(x => x.Vendor)
            .Include(x => x.BoardMember)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct);

        if (p is null) return null;

        var payments = await _db.PromotionPayments
            .AsNoTracking()
            .Where(pp => pp.PromotionId == p.Id)
            .OrderByDescending(pp => pp.PaymentDate)
            .ToListAsync(ct);

        var collected = payments.Sum(pp => pp.Amount);

        return new PromotionDetailDto(
            p.Id,
            p.PromotionTypeId,
            p.PromotionType?.TypeName ?? "",
            p.VendorId,
            p.Vendor?.VendorName ?? "",
            p.BoardMemberId,
            p.BoardMember?.Name,
            p.PromotionTitle,
            p.Quantity,
            p.UnitPrice,
            p.SubtotalAmount,
            p.GstPercentage,
            p.GstAmount,
            p.TotalAmount,
            collected,
            p.TotalAmount - collected,
            p.PaymentStatus,
            p.PromotionStatus,
            p.StartDate,
            p.EndDate,
            p.Notes,
            p.CreatedAt,
            p.UpdatedAt,
            payments.Select(PromotionMapping.ToDto).ToList());
    }
}
