namespace SecurityOps.Domain.Entities;

public class SecurityLocation : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<SecurityShiftDeployment> Deployments { get; set; } = new List<SecurityShiftDeployment>();
}
