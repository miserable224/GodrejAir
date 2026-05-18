namespace SecurityOps.Domain.Entities;

public class HkVendorContract : AuditableEntity
{
    public string VendorName { get; set; } = string.Empty;
    public string ContractNumber { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal ServiceChargePercentage { get; set; } = 8m;
    public decimal GstPercentage { get; set; } = 18m;
    public bool IsActive { get; set; } = true;

    public ICollection<HkContractRate> RoleRates { get; set; } = new List<HkContractRate>();
}
