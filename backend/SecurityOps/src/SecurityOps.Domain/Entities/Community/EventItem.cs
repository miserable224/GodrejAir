namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// Society event (mapped to public.events).
/// "Event" is a reserved-ish name in .NET, so the entity is called EventItem.
/// </summary>
public class EventItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SocietyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Venue { get; set; }
    public DateTime StartDatetime { get; set; }
    public DateTime EndDatetime { get; set; }
    public string? OrganizerName { get; set; }
    public string? OrganizerContact { get; set; }
    public int? MaxParticipants { get; set; }
    public bool RegistrationRequired { get; set; }
    public string? RegistrationLink { get; set; }
    public decimal EntryFee { get; set; }
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = "active";
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}
