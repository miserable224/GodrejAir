namespace SecurityOps.Domain.Entities;

public class PatrolLogStaff : AuditableEntity
{
    public Guid PatrolLogId { get; set; }
    public PatrolLog PatrolLog { get; set; } = null!;
    public Guid StaffId { get; set; }
    public SecurityStaff Staff { get; set; } = null!;
}
