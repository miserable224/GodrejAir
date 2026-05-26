namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// Society class definition (mapped to public.classes).
/// "Class" is a reserved word so the entity is called ClassDef.
/// </summary>
public class ClassDef
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SocietyId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public string? InstructorPhone { get; set; }
    public string? InstructorEmail { get; set; }
    public string? Venue { get; set; }
    public int? Capacity { get; set; }
    public string? AgeGroup { get; set; }
    public decimal FeeMonthly { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<ClassSchedule> Schedules { get; set; } = new List<ClassSchedule>();
}
