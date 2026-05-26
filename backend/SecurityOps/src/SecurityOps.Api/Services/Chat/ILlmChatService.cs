using System.Text.Json;

namespace SecurityOps.Api.Services.Chat;

/// <summary>
/// Provider-agnostic LLM chat orchestrator with tool calling.
/// Backed by any OpenAI-compatible API (OpenAI, Groq, Together, Ollama, etc.).
/// </summary>
public interface ILlmChatService
{
    /// <summary>Whether the service has been configured with a usable endpoint.</summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Run a chat turn. The model may invoke one or more tools; the supplied
    /// <paramref name="executor"/> is called for each tool selection and its
    /// JSON output is fed back to the model until it produces a final reply.
    /// </summary>
    /// <param name="userMessage">Latest user input.</param>
    /// <param name="tools">Tool catalog the model is allowed to invoke.</param>
    /// <param name="executor">Callback that runs the chosen tool.</param>
    /// <param name="priorHistory">
    /// Optional ordered list of prior turns (user/assistant) replayed before
    /// <paramref name="userMessage"/>. Enables multi-turn dialogue.
    /// </param>
    /// <param name="systemPromptOverride">
    /// Optional system prompt to use instead of the default. Useful for
    /// injecting per-user resident facts.
    /// </param>
    Task<LlmChatReply?> ChatAsync(
        string userMessage,
        IReadOnlyList<ChatToolDef> tools,
        ChatToolExecutor executor,
        IReadOnlyList<PriorTurn>? priorHistory = null,
        string? systemPromptOverride = null,
        CancellationToken ct = default);
}

public delegate Task<string> ChatToolExecutor(string toolName, JsonElement args, CancellationToken ct);

public sealed record ChatToolDef(string Name, string Description, object ParametersSchema);

/// <summary>A simplified prior turn (only user + assistant text are persisted/replayed).</summary>
public sealed record PriorTurn(string Role, string Content);

public sealed record LlmChatReply(
    string ReplyText,
    string? Intent,
    object? Data,
    IReadOnlyList<string>? Suggestions);
