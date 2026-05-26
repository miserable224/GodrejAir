namespace SecurityOps.Domain.Entities.Community;

/// <summary>
/// One turn within a <see cref="ChatSession"/>.
/// Roles follow OpenAI conventions: user, assistant, tool, system.
/// </summary>
public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;

    /// <summary>Populated for role='tool' to record which function was invoked.</summary>
    public string? ToolName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
