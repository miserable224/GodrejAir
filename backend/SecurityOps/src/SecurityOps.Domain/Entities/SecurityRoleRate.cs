using System;

namespace SecurityOps.Domain.Entities;

public class SecurityRoleRate : AuditableEntity
{
    public Guid ContractId { get; set; }
    public string RoleName { get; set; } = string.Empty; // e.g. "Security Guard", "Supervisor"
    public decimal DailyRate { get; set; }
    public decimal MonthlyRate { get; set; }
    public string ShiftDuration { get; set; } = "12 Hours";
    
    public SecurityVendorContract? Contract { get; set; }
}
