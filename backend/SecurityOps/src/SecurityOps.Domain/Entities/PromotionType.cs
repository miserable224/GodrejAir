namespace SecurityOps.Domain.Entities;

public class PromotionType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TypeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
