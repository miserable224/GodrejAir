using System;
using System.Collections.Generic;

namespace SecurityOps.Domain.Entities;

public class SecurityMonthlyBilling : AuditableEntity
{
    public Guid ContractId { get; set; }
    public string BillingMonth { get; set; } = string.Empty; // "2026-05"
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public decimal GrossServiceAmount { get; set; } // Sum of all deployed * daily_rate or monthly_total
    public decimal TotalShortageDeduction { get; set; } // Sum of individual daily shortages
    public decimal HighShortagePenalty { get; set; } // Extra 30% if applicable
    
    public decimal NetBeforeTax { get; set; }
    public decimal ServiceChargeAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal GrandTotal { get; set; }
    
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, PAID
    public string? InvoiceNumber { get; set; }

    public SecurityVendorContract? Contract { get; set; }
    public ICollection<SecurityMonthlyBillingItem> Items { get; set; } = new List<SecurityMonthlyBillingItem>();
}
