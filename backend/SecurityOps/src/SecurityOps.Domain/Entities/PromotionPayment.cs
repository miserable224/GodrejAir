namespace SecurityOps.Domain.Entities;

public class PromotionPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PromotionId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMode { get; set; }
    public string? PaymentReferenceNumber { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Promotion? Promotion { get; set; }
}
