namespace SecurityOps.Domain.Entities;

public class Promotion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PromotionTypeId { get; set; }
    public Guid? InventoryId { get; set; }
    public Guid VendorId { get; set; }
    public Guid? BoardMemberId { get; set; }
    public string? PromotionTitle { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal SubtotalAmount { get; set; }
    public decimal GstPercentage { get; set; } = 18m;
    public decimal GstAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public string PromotionStatus { get; set; } = "Upcoming";
    public string? Notes { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public PromotionType? PromotionType { get; set; }
    public PromotionVendor? Vendor { get; set; }
    public BoardMember? BoardMember { get; set; }
}
