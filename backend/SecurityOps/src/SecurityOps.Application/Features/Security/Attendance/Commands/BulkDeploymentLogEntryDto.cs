namespace SecurityOps.Application.Features.Attendance.Commands;

/// <summary>Metadata for one queued security deployment (photo uploaded separately in multipart).</summary>
public sealed class BulkDeploymentLogEntryDto
{
    public string Designation { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double? PhotoLatitude { get; set; }
    public double? PhotoLongitude { get; set; }
    public double? PhotoAccuracyMeters { get; set; }
    public DateTime? PhotoCapturedAt { get; set; }
}
