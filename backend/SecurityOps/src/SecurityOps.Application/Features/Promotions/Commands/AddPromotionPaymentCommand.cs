using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;
using static SecurityOps.Application.Features.Promotions.PromotionMapping;

namespace SecurityOps.Application.Features.Promotions.Commands;

public sealed record AddPromotionPaymentCommand(Guid PromotionId, AddPromotionPaymentRequest Body)
    : IRequest<PromotionPaymentDto?>;

public sealed class AddPromotionPaymentCommandHandler
    : IRequestHandler<AddPromotionPaymentCommand, PromotionPaymentDto?>
{
    private readonly IApplicationDbContext _db;

    public AddPromotionPaymentCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<PromotionPaymentDto?> Handle(AddPromotionPaymentCommand request, CancellationToken ct)
    {
        var exists = await _db.Promotions.AnyAsync(p => p.Id == request.PromotionId, ct);
        if (!exists) return null;

        var body = request.Body;
        if (body.Amount <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        var payment = new PromotionPayment
        {
            Id = Guid.NewGuid(),
            PromotionId = request.PromotionId,
            PaymentDate = body.PaymentDate,
            Amount = body.Amount,
            PaymentMode = body.PaymentMode,
            PaymentReferenceNumber = body.PaymentReferenceNumber,
            ReceiptUrl = body.ReceiptUrl,
            Notes = body.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _db.PromotionPayments.Add(payment);
        await _db.SaveChangesAsync(ct);

        return payment.ToDto();
    }
}
