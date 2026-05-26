namespace SecurityOps.Domain.Entities.Water;

/// <summary>
/// One water-tanker delivery / Kaveri fill (water_records table).
/// String columns reflect the existing schema in supabase/migrations/001_init.sql
/// — meter readings are stored as text to preserve leading zeros on dial-style
/// meters, and load is text for the same reason.
/// </summary>
public class WaterRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly Date { get; set; }
    public string? Source { get; set; }
    public string? SourceType { get; set; }
    public string? VehicleNo { get; set; }
    public string? OpeningMeter { get; set; }
    public string? ClosingMeter { get; set; }
    public string? Tds { get; set; }
    public string? Load { get; set; }
    public decimal? TankLevelKl { get; set; }
    public Guid? VendorId { get; set; }
    public string? Notes { get; set; }
    public string? ReceiptUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
}
