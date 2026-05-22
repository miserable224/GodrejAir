using SecurityOps.Domain;

namespace SecurityOps.Domain.Entities;

/// <summary>One housekeeping staff stint — check-in and check-out with photo.</summary>
public class HousekeepingDutySession : AuditableEntity
{
    public string StaffName { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public string? Designation { get; set; }
    public string Status { get; set; } = DutySessionStatuses.Open;

    public DateTime EntryAt { get; set; }
    public DateTime? ExitAt { get; set; }

    public string? EntryPhotoUrl { get; set; }
    public string? ExitPhotoUrl { get; set; }

    public double? EntryLatitude { get; set; }
    public double? EntryLongitude { get; set; }
    public double? EntryAccuracyMeters { get; set; }
    public double? ExitLatitude { get; set; }
    public double? ExitLongitude { get; set; }
    public double? ExitAccuracyMeters { get; set; }
    public DateTime? EntryCapturedAt { get; set; }
    public DateTime? ExitCapturedAt { get; set; }

    public string? EntryShift { get; set; }
    public string? ExitShift { get; set; }
}
