namespace SecurityOps.Domain.Entities;

public class SecurityDailyAttendanceSummary : AuditableEntity
{
    public DateTime Date { get; set; }
    public string RoleName { get; set; } = string.Empty;
    /// <summary>Stored as shift_type in DB (e.g. DAY, NIGHT).</summary>
    public string ShiftName { get; set; } = string.Empty;
    public int RequiredCount { get; set; }
    public int DeployedCount { get; set; }
    public int ShortageCount { get; set; }
    public decimal DailyRate { get; set; }
    public decimal ShortagePenalty { get; set; }
}
