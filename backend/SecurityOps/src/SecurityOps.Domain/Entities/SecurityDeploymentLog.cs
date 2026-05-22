using SecurityOps.Domain;

namespace SecurityOps.Domain.Entities;

public class SecurityDeploymentLog : AuditableEntity
{
    /// <summary>security | housekeeping — which API owns this row.</summary>
    public string Module { get; set; } = DeploymentModules.Security;

    public DateTime LogDate { get; set; }
    public string? Designation { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public Guid? StaffId { get; set; }
    public SecurityStaff? Staff { get; set; }
    public Guid? LocationId { get; set; }
    public SecurityLocation? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime? PhotoCapturedAt { get; set; }

    public ICollection<SecurityDeploymentPhoto> Photos { get; set; } = new List<SecurityDeploymentPhoto>();
}
