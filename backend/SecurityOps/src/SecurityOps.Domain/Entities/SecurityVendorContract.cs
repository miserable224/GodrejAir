using System;
using System.Collections.Generic;

namespace SecurityOps.Domain.Entities;

public class SecurityVendorContract : AuditableEntity
{
    public string VendorName { get; set; } = string.Empty;
    public string ContractNumber { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal ServiceChargePercentage { get; set; } = 8.0m;
    public decimal GstPercentage { get; set; } = 18.0m;
    public decimal ShortageThresholdPercentage { get; set; } = 5.0m; // If total shortages > 5%, apply 30% extra penalty
    public decimal HighShortagePenaltyPercentage { get; set; } = 30.0m;

    public ICollection<SecurityRoleRate> RoleRates { get; set; } = new List<SecurityRoleRate>();
}
