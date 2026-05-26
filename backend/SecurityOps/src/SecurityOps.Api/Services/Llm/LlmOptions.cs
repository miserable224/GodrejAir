namespace SecurityOps.Api.Services.Llm;

/// <summary>
/// Shared options for any OpenAI-protocol-compatible LLM provider
/// (Groq, OpenAI, Together, Ollama, etc.). The wire shape is identical —
/// only BaseUrl, Model, and ApiKey change between providers.
///
/// Bound from the "Llm" configuration section, with the env vars
/// LLM_API_KEY / LLM_BASE_URL / LLM_MODEL taking precedence over the
/// JSON values. Legacy OPENAI_* env vars are accepted as a fallback so
/// existing deployments keep working without env-var changes.
/// </summary>
public sealed class LlmOptions
{
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string Model { get; set; } = "gpt-4o-mini";
    public int MaxToolHops { get; set; } = 4;
    public double Temperature { get; set; } = 0.2;
    public string? SystemPrompt { get; set; }
}
