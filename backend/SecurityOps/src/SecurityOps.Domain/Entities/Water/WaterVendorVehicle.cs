namespace SecurityOps.Domain.Entities.Water;

/// <summary>Registration plate linked to a tanker vendor (water_vendor_vehicles).</summary>
public class WaterVendorVehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VendorId { get; set; }
    public string VehicleNo { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeactivatedAt { get; set; }

    public WaterVendor? Vendor { get; set; }
}
