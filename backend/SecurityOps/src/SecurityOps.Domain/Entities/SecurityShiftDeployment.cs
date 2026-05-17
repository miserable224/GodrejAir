namespace SecurityOps.Domain.Entities;

public class SecurityShiftDeployment : AuditableEntity
{
    public Guid ShiftId { get; set; }
    public SecurityShift Shift { get; set; } = null!;
    public Guid StaffId { get; set; }
    public SecurityStaff Staff { get; set; } = null!;
    public Guid LocationId { get; set; }
    public SecurityLocation Location { get; set; } = null!;
    /// <summary>Business rule: mandatory last guard for DAY; optional for NIGHT.</summary>
    public bool IsLastGuard { get; set; }
}
