using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace SecurityOps.Api.Services.Chat;

public sealed class OpenAiOptions
{
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string Model { get; set; } = "gpt-4o-mini";
    public int MaxToolHops { get; set; } = 4;
    public double Temperature { get; set; } = 0.2;
    public string? SystemPrompt { get; set; }
}

/// <summary>
/// Calls any OpenAI-compatible Chat Completions endpoint with function calling.
/// Falls back to disabled if no API key is configured (in which case
/// <see cref="ILlmChatService.IsEnabled"/> is false and the caller should
/// use the rule-based pipeline).
/// </summary>
public sealed class OpenAiChatService : ILlmChatService
{
    private const string DefaultSystemPrompt =
        "You are the friendly concierge for Godrej Air residential society. "
        + "You answer in conversational English. "
        + "Use the provided tools to fetch live data about classes, events, and society vendors. "
        + "Never make up class names, dates, prices, or phone numbers — only use values returned by tools. "
        + "If the user asks something outside the tools' scope (e.g. maintenance, parking, complaints), "
        + "politely say it isn't supported yet and suggest classes/events/vendors.\n\n"
        + "When the user asks about a SPECIFIC class by name (e.g. \"yoga\", \"boxing\"), "
        + "call get_classes with the `class_name` parameter — do NOT rely on `date` for that. "
        + "If the tool returns an empty items array, that class does not exist in the society — "
        + "reply politely (\"Sorry, there is no boxing class in the society right now\") and "
        + "suggest visiting the full list of available classes.\n\n"
        + "IMPORTANT — keep replies SHORT (a single headline sentence). "
        + "The app already renders a rich card below your reply with trainer, schedule, fees, "
        + "venue, and age group, so DO NOT duplicate those details in the text. Examples:\n"
        + "  • If class runs today: \"✅ Yes — Yoga is on today!\"\n"
        + "  • If class doesn't run today: \"ℹ️ Piano isn't on today. Next session: Wednesday.\"\n"
        + "  • If listing many classes for a date: \"Today · 3 classes\"\n"
        + "  • If unknown class: a polite one-line apology + the available list.\n"
        + "For events and vendors, keep replies to a one-line headline too — let the cards carry the details. "
        + "Never dump raw JSON.";

    private readonly HttpClient _http;
    private readonly OpenAiOptions _opts;
    private readonly ILogger<OpenAiChatService> _log;

    public OpenAiChatService(
        HttpClient http,
        IOptions<OpenAiOptions> opts,
        ILogger<OpenAiChatService> log)
    {
        _http = http;
        _opts = opts.Value;
        _log = log;

        if (!string.IsNullOrWhiteSpace(_opts.ApiKey))
        {
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _opts.ApiKey);
        }
    }

    public bool IsEnabled => !string.IsNullOrWhiteSpace(_opts.ApiKey);

    public async Task<LlmChatReply?> ChatAsync(
        string userMessage,
        IReadOnlyList<ChatToolDef> tools,
        ChatToolExecutor executor,
        IReadOnlyList<PriorTurn>? priorHistory = null,
        string? systemPromptOverride = null,
        CancellationToken ct = default)
    {
        if (!IsEnabled) return null;

        var systemPrompt = systemPromptOverride
                           ?? _opts.SystemPrompt
                           ?? DefaultSystemPrompt;

        var messages = new List<Dictionary<string, object?>>
        {
            new() { ["role"] = "system", ["content"] = systemPrompt },
        };

        // Replay prior turns so the model has context (multi-turn dialogue).
        if (priorHistory is { Count: > 0 })
        {
            foreach (var turn in priorHistory)
            {
                if (string.IsNullOrWhiteSpace(turn.Content)) continue;
                // Only user/assistant roles are safe to replay (tool turns must include
                // matching tool_call ids, which we don't reconstruct from storage).
                var role = turn.Role == "assistant" ? "assistant" : "user";
                messages.Add(new()
                {
                    ["role"] = role,
                    ["content"] = turn.Content,
                });
            }
        }

        messages.Add(new() { ["role"] = "user", ["content"] = userMessage });

        var toolDefs = tools.Select(t => new Dictionary<string, object?>
        {
            ["type"] = "function",
            ["function"] = new Dictionary<string, object?>
            {
                ["name"] = t.Name,
                ["description"] = t.Description,
                ["parameters"] = t.ParametersSchema,
            },
        }).Cast<object>().ToList();

        try
        {
            string? finalIntent = null;
            object? finalData = null;

            for (var hop = 0; hop < Math.Max(1, _opts.MaxToolHops); hop++)
            {
                var body = new Dictionary<string, object?>
                {
                    ["model"] = _opts.Model,
                    ["messages"] = messages,
                    ["tools"] = toolDefs,
                    ["temperature"] = _opts.Temperature,
                };

                var resp = await PostAsync("/chat/completions", body, ct);
                if (resp is null)
                {
                    _log.LogWarning("LLM returned no payload at hop {Hop}", hop);
                    return null;
                }

                using var doc = JsonDocument.Parse(resp);
                var choice = doc.RootElement.GetProperty("choices")[0];
                var msg = choice.GetProperty("message");

                if (msg.TryGetProperty("tool_calls", out var toolCalls)
                    && toolCalls.ValueKind == JsonValueKind.Array
                    && toolCalls.GetArrayLength() > 0)
                {
                    // Replay the assistant turn (must include tool_calls verbatim for the API)
                    var assistantTurn = new Dictionary<string, object?>
                    {
                        ["role"] = "assistant",
                        ["content"] = msg.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
                            ? c.GetString()
                            : null,
                        ["tool_calls"] = JsonSerializer.Deserialize<object>(toolCalls.GetRawText()),
                    };
                    messages.Add(assistantTurn);

                    foreach (var call in toolCalls.EnumerateArray())
                    {
                        var callId = call.GetProperty("id").GetString() ?? Guid.NewGuid().ToString("N");
                        var fn = call.GetProperty("function");
                        var name = fn.GetProperty("name").GetString() ?? "";
                        var argsRaw = fn.GetProperty("arguments").GetString() ?? "{}";

                        finalIntent ??= name;

                        JsonElement args;
                        try
                        {
                            using var argDoc = JsonDocument.Parse(argsRaw);
                            args = argDoc.RootElement.Clone();
                        }
                        catch
                        {
                            args = JsonDocument.Parse("{}").RootElement.Clone();
                        }

                        string toolResult;
                        try
                        {
                            toolResult = await executor(name, args, ct);
                        }
                        catch (Exception ex)
                        {
                            _log.LogWarning(ex, "Tool {Name} failed", name);
                            toolResult = JsonSerializer.Serialize(new { error = ex.Message });
                        }

                        try
                        {
                            using var resultDoc = JsonDocument.Parse(toolResult);
                            finalData = JsonSerializer.Deserialize<object>(toolResult);
                        }
                        catch { /* tool result wasn't JSON — fine */ }

                        messages.Add(new Dictionary<string, object?>
                        {
                            ["role"] = "tool",
                            ["tool_call_id"] = callId,
                            ["name"] = name,
                            ["content"] = toolResult,
                        });
                    }
                    continue;
                }

                var finalText = msg.TryGetProperty("content", out var content)
                    && content.ValueKind == JsonValueKind.String
                    ? (content.GetString() ?? string.Empty).Trim()
                    : string.Empty;

                return new LlmChatReply(
                    ReplyText: string.IsNullOrWhiteSpace(finalText)
                        ? "I couldn't generate a response — please rephrase."
                        : finalText,
                    Intent: finalIntent ?? "chat",
                    Data: finalData,
                    Suggestions: null);
            }

            _log.LogWarning("LLM exceeded max tool hops ({Hops})", _opts.MaxToolHops);
            return null;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "LLM chat failed; falling back to rule-based parser");
            return null;
        }
    }

    private async Task<string?> PostAsync(string path, object body, CancellationToken ct)
    {
        var url = _opts.BaseUrl.TrimEnd('/') + path;
        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        });
        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        using var resp = await _http.SendAsync(req, ct);
        var text = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
        {
            _log.LogWarning("LLM {Status}: {Body}", (int)resp.StatusCode, text);
            return null;
        }
        return text;
    }
}
