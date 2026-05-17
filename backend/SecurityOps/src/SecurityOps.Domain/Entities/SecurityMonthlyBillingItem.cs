using System;

namespace SecurityOps.Domain.Entities;

public class SecurityMonthlyBillingItem : AuditableEntity
{
    public Guid BillingId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; // e.g. "Monthly Fixed" or "Shortage Deduction"
    public decimal Amount { get; set; }
    public bool IsDeduction { get; set; }

    public SecurityMonthlyBilling? Billing { get; set; }
}
