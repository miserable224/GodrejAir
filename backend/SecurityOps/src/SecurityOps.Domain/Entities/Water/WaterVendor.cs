namespace SecurityOps.Domain.Entities.Water;

/// <summary>Tanker vendor (water_vendors table).</summary>
public class WaterVendor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? Address { get; set; }

    /// <summary>Deprecated — use <see cref="Vehicles"/>. Mirrored column on water_vendors.</summary>
    public string? VehicleNo { get; set; }

    public ICollection<WaterVendorVehicle> Vehicles { get; set; } = new List<WaterVendorVehicle>();

    /// <summary>
    /// Declared tanker capacity in kilolitres. Used to compute the "Declared KL"
    /// and "Declared cost" columns in the vendor cost summary card.
    /// </summary>
    public decimal TankerCapacityKl { get; set; } = 6m;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
