namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// A conversation thread between a resident and the concierge chatbot.
/// Multiple messages belong to one session.
/// </summary>
public class ChatSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Stable identity of the user (JWT `sub` / NameIdentifier).</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Optional human-readable title (LLM-generated from first turn).</summary>
    public string? Title { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastAt { get; set; } = DateTime.UtcNow;
}
