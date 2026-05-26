namespace SecurityOps.Domain.Entities.Water;

/// <summary>
/// One audit photo attached to a <see cref="WaterRecord"/>. The bytes live on
/// the API server's static file store; only the URL + LLM-extracted metadata
/// are persisted in the DB row.
/// </summary>
public class WaterRecordPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecordId { get; set; }

    /// <summary>starting_meter | ending_meter | tds | vehicle_number | unknown</summary>
    public string PhotoType { get; set; } = "unknown";

    /// <summary>Relative URL like /uploads/water/2026/05/abc.jpg (served by wwwroot).</summary>
    public string PhotoUrl { get; set; } = string.Empty;

    public string? StoragePath { get; set; }
    public string? DetectedValue { get; set; }
    public decimal? ScanConfidence { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime? CapturedAt { get; set; }
    public string? MimeType { get; set; }
    public int? SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
