using SecurityOps.Domain.Enums;

namespace SecurityOps.Domain.Entities;

public class SecurityShift : AuditableEntity
{
    public DateOnly ShiftDate { get; set; }
    /// <summary>DAY | NIGHT</summary>
    public string ShiftType { get; set; } = ShiftTypes.Day;
    public Guid? SupervisorId { get; set; }
    public SecurityStaff? Supervisor { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "PLANNED";

    public ICollection<SecurityShiftDeployment> Deployments { get; set; } = new List<SecurityShiftDeployment>();
    public ICollection<PatrolLog> PatrolLogs { get; set; } = new List<PatrolLog>();
}
