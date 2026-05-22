using SecurityOps.Domain;

namespace SecurityOps.Domain.Entities;

/// <summary>One security guard stint at a post — check-in (entry) and check-out (exit).</summary>
public class SecurityDutySession : AuditableEntity
{
    public string StaffName { get; set; } = string.Empty;
    public Guid? StaffId { get; set; }
    public SecurityStaff? Staff { get; set; }

    public string LocationName { get; set; } = string.Empty;
    public Guid? LocationId { get; set; }
    public SecurityLocation? Location { get; set; }

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

    /// <summary>DAY or NIGHT — inferred from entry photo time (IST).</summary>
    public string? EntryShift { get; set; }
    /// <summary>DAY or NIGHT — inferred from exit photo time (IST).</summary>
    public string? ExitShift { get; set; }
}
