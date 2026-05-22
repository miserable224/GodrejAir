namespace SecurityOps.Domain.Entities;

public class PromotionDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PromotionId { get; set; }
    public string? FileName { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string? DocumentType { get; set; }
    public Guid? UploadedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Promotion? Promotion { get; set; }
}
