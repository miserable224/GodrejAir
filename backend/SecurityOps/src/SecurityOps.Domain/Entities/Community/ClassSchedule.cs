namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// Recurring schedule slot for a class (mapped to public.class_schedules).
/// day_of_week: 0 = Sunday, 6 = Saturday (Postgres DOW).
/// </summary>
public class ClassSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassId { get; set; }
    public short DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool Recurring { get; set; } = true;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ClassDef? Class { get; set; }
}
