using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Commands;

public sealed record UpdatePromotionCommand(Guid Id, UpdatePromotionRequest Body) : IRequest<PromotionDetailDto?>;

public sealed class UpdatePromotionCommandHandler : IRequestHandler<UpdatePromotionCommand, PromotionDetailDto?>
{
    private static readonly HashSet<string> PaymentStatuses = new(StringComparer.Ordinal)
        { "Pending", "Partial", "Paid" };

    private static readonly HashSet<string> PromotionStatuses = new(StringComparer.Ordinal)
        { "Upcoming", "Active", "Expired", "Cancelled" };

    private readonly IApplicationDbContext _db;
    private readonly IMediator _mediator;

    public UpdatePromotionCommandHandler(IApplicationDbContext db, IMediator mediator)
    {
        _db = db;
        _mediator = mediator;
    }

    public async Task<PromotionDetailDto?> Handle(UpdatePromotionCommand request, CancellationToken ct)
    {
        var p = await _db.Promotions.FirstOrDefaultAsync(x => x.Id == request.Id, ct);
        if (p is null) return null;

        var body = request.Body;

        if (body.PromotionTypeId is { } typeId)
        {
            var ok = await _db.PromotionTypes.AnyAsync(t => t.Id == typeId && t.IsActive, ct);
            if (!ok) throw new InvalidOperationException("Invalid promotion type.");
            p.PromotionTypeId = typeId;
        }

        if (body.VendorId is { } vendorId)
        {
            var ok = await _db.PromotionVendors.AnyAsync(v => v.Id == vendorId && v.IsActive, ct);
            if (!ok) throw new InvalidOperationException("Invalid vendor.");
            p.VendorId = vendorId;
        }

        if (body.BoardMemberId.HasValue)
            p.BoardMemberId = body.BoardMemberId == Guid.Empty ? null : body.BoardMemberId;

        if (body.PromotionTitle is not null)
            p.PromotionTitle = string.IsNullOrWhiteSpace(body.PromotionTitle) ? null : body.PromotionTitle.Trim();

        if (body.Quantity is { } qty)
        {
            if (qty <= 0) throw new InvalidOperationException("Quantity must be greater than zero.");
            p.Quantity = qty;
        }

        if (body.UnitPrice is { } price)
        {
            if (price < 0) throw new InvalidOperationException("Price cannot be negative.");
            p.UnitPrice = price;
        }

        if (body.StartDate is { } start) p.StartDate = start;
        if (body.EndDate is { } end) p.EndDate = end;
        if (p.EndDate < p.StartDate)
            throw new InvalidOperationException("End date must be on or after start date.");

        if (body.PaymentStatus is not null)
        {
            if (!PaymentStatuses.Contains(body.PaymentStatus))
                throw new InvalidOperationException("Invalid payment status.");
            p.PaymentStatus = body.PaymentStatus;
        }

        if (body.PromotionStatus is not null)
        {
            if (!PromotionStatuses.Contains(body.PromotionStatus))
                throw new InvalidOperationException("Invalid promotion status.");
            p.PromotionStatus = body.PromotionStatus;
        }

        if (body.Notes is not null)
            p.Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim();

        if (body.Quantity.HasValue || body.UnitPrice.HasValue)
        {
            var (subtotal, gst, total) = PromotionAmounts.Calculate(p.Quantity, p.UnitPrice);
            p.SubtotalAmount = subtotal;
            p.GstPercentage = PromotionAmounts.GstPercentage;
            p.GstAmount = gst;
            p.TotalAmount = total;
        }

        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return await _mediator.Send(new Queries.GetPromotionByIdQuery(p.Id), ct);
    }
}
