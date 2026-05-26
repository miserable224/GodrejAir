namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// A piece of long-term per-resident memory the chatbot can rely on across sessions.
/// Examples: flat_number, dietary, kids_ages, languages, preferred_vendor.
/// </summary>
public class ResidentFact
{
    /// <summary>JWT sub / user id (string for portability with non-uuid auth providers).</summary>
    public string UserId { get; set; } = string.Empty;
    public string FactKey { get; set; } = string.Empty;
    public string FactValue { get; set; } = string.Empty;

    /// <summary>'self_declared' | 'derived' | 'admin'.</summary>
    public string Source { get; set; } = "self_declared";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
