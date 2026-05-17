namespace SecurityOps.Domain.Entities;

public class PatrolPhoto : AuditableEntity
{
    public Guid PatrolLogId { get; set; }
    public PatrolLog PatrolLog { get; set; } = null!;
    public string PhotoUrl { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
