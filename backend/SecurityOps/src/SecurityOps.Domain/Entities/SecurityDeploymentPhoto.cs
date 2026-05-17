namespace SecurityOps.Domain.Entities;

public class SecurityDeploymentPhoto : AuditableEntity
{
    public Guid DeploymentLogId { get; set; }
    public SecurityDeploymentLog DeploymentLog { get; set; } = null!;
    public string PhotoUrl { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
