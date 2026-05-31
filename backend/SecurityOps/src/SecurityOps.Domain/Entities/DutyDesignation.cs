using SecurityOps.Domain;

namespace SecurityOps.Domain.Entities;

/// <summary>Configurable check-in designation titles per ops module.</summary>
public class DutyDesignation : AuditableEntity
{
    /// <summary><see cref="DeploymentModules.Security"/> or <see cref="DeploymentModules.Housekeeping"/>.</summary>
    public string Module { get; set; } = DeploymentModules.Security;

    public string Title { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;
}
