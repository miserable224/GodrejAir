namespace SecurityOps.Domain.Entities;

public class HkContractRate : AuditableEntity
{
    public Guid ContractId { get; set; }
    public HkVendorContract Contract { get; set; } = null!;
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public decimal MonthlyRate { get; set; }
    public int HeadcountSanctioned { get; set; }
    public string? ShiftTimings { get; set; }
    public string SkillType { get; set; } = "Skilled";
    public int Shift1Sanctioned { get; set; }
    public int Shift2Sanctioned { get; set; }
    public bool IsActive { get; set; } = true;
}
