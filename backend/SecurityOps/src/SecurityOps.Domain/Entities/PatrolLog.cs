namespace SecurityOps.Domain.Entities;

public class PatrolLog : AuditableEntity
{
    public Guid ShiftId { get; set; }
    public SecurityShift Shift { get; set; } = null!;
    public Guid RecordedBy { get; set; }
    public SecurityStaff Recorder { get; set; } = null!;
    public DateTime PatrolTime { get; set; }
    public string PatrolType { get; set; } = "REGULAR";
    public string? Remarks { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public ICollection<PatrolLogStaff> Staff { get; set; } = new List<PatrolLogStaff>();
    public ICollection<PatrolPhoto> Photos { get; set; } = new List<PatrolPhoto>();
}
