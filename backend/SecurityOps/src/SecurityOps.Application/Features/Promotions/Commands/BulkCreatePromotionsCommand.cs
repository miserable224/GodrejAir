using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Promotions.Commands;

public sealed record BulkCreatePromotionsCommand(IReadOnlyList<PromotionCreateItemDto> Items)
    : IRequest<int>;

public sealed class BulkCreatePromotionsCommandHandler : IRequestHandler<BulkCreatePromotionsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public BulkCreatePromotionsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(BulkCreatePromotionsCommand request, CancellationToken ct)
    {
        if (request.Items.Count == 0)
            throw new InvalidOperationException("Add at least one promotion.");

        var defaultVendorId = await _db.PromotionVendors
            .AsNoTracking()
            .Where(v => v.IsActive)
            .OrderBy(v => v.VendorName)
            .Select(v => v.Id)
            .FirstOrDefaultAsync(ct);

        if (defaultVendorId == Guid.Empty)
            throw new InvalidOperationException("Add at least one vendor before saving promotions.");

        var typeIds = request.Items.Select(i => i.PromotionTypeId).Distinct().ToList();
        var validTypeIds = await _db.PromotionTypes
            .AsNoTracking()
            .Where(t => typeIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(ct);

        var activeVendorIds = (await _db.PromotionVendors
            .AsNoTracking()
            .Where(v => v.IsActive)
            .Select(v => v.Id)
            .ToListAsync(ct)).ToHashSet();

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var defaultEnd = today.AddMonths(1);
        var entities = new List<Promotion>(request.Items.Count);

        foreach (var item in request.Items)
        {
            if (!validTypeIds.Contains(item.PromotionTypeId))
                throw new InvalidOperationException("Invalid promotion type.");

            if (item.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            if (item.UnitPrice < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            var vendorId = item.VendorId ?? defaultVendorId;
            if (!activeVendorIds.Contains(vendorId))
                throw new InvalidOperationException("Invalid vendor.");

            var start = item.StartDate ?? today;
            var end = item.EndDate ?? defaultEnd;
            if (end < start)
                throw new InvalidOperationException("End date must be on or after start date.");

            var (subtotal, gstAmount, total) = PromotionAmounts.Calculate(item.Quantity, item.UnitPrice);

            entities.Add(new Promotion
            {
                Id = Guid.NewGuid(),
                PromotionTypeId = item.PromotionTypeId,
                VendorId = vendorId,
                BoardMemberId = item.BoardMemberId,
                PromotionTitle = string.IsNullOrWhiteSpace(item.PromotionTitle)
                    ? null
                    : item.PromotionTitle.Trim(),
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                SubtotalAmount = subtotal,
                GstPercentage = PromotionAmounts.GstPercentage,
                GstAmount = gstAmount,
                TotalAmount = total,
                StartDate = start,
                EndDate = end,
                PaymentStatus = "Pending",
                PromotionStatus = "Upcoming",
                Notes = item.Notes,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        _db.Promotions.AddRange(entities);
        await _db.SaveChangesAsync(ct);
        return entities.Count;
    }
}
