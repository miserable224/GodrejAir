namespace SecurityOps.Domain.Entities;

/// <summary>security_staff — adjust properties if your Supabase columns differ.</summary>
public class SecurityStaff : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? BadgeNumber { get; set; }
    /// <summary>ADMIN | SUPERVISOR | SECURITY_GUARD (or your role strings).</summary>
    public string Role { get; set; } = "SECURITY_GUARD";
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<SecurityShift> SupervisedShifts { get; set; } = new List<SecurityShift>();
    public ICollection<SecurityShiftDeployment> Deployments { get; set; } = new List<SecurityShiftDeployment>();
    public ICollection<PatrolLogStaff> PatrolParticipations { get; set; } = new List<PatrolLogStaff>();
    public ICollection<PatrolLog> RecordedPatrols { get; set; } = new List<PatrolLog>();
}
