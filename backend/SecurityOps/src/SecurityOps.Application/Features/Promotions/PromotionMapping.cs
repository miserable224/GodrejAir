using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Promotions;

internal static class PromotionMapping
{
    public static IQueryable<PromotionListItemDto> ToListItemDtos(this IQueryable<Promotion> query, IApplicationDbContext db) =>
        from p in query
        let collected = db.PromotionPayments
            .Where(pp => pp.PromotionId == p.Id)
            .Sum(pp => (decimal?)pp.Amount) ?? 0m
        select new PromotionListItemDto(
            p.Id,
            p.PromotionTitle,
            p.PromotionType != null ? p.PromotionType.TypeName : "",
            p.Vendor != null ? p.Vendor.VendorName : "",
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
            p.CreatedAt);

    public static PromotionPaymentDto ToDto(this PromotionPayment p) =>
        new(
            p.Id,
            p.PaymentDate,
            p.Amount,
            p.PaymentMode,
            p.PaymentReferenceNumber,
            p.ReceiptUrl,
            p.Notes,
            p.CreatedAt);
}
