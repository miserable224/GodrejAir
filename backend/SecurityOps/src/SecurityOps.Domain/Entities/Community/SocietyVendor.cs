namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// Society-facing vendor: fruit cart, milk vendor, dhobi, etc.
/// Mapped to public.society_vendors (the table created by 023 — formerly named "vendors",
/// which clashed with the promotions module's vendors table).
/// </summary>
public class SocietyVendor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SocietyId { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WhatsappNumber { get; set; }
    public string? StallName { get; set; }
    public string? StallLocation { get; set; }
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public TimeOnly? AvailableFrom { get; set; }
    public TimeOnly? AvailableTo { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ImageUrl { get; set; }
    public bool Verified { get; set; }
    public decimal? Rating { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}
