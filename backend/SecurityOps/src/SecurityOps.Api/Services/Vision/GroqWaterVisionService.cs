using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SecurityOps.Api.Services.Chat;

namespace SecurityOps.Api.Services.Vision;

/// <summary>
/// Implementation of <see cref="ILlmWaterVisionService"/> using any
/// OpenAI-compatible vision endpoint (Groq Llama 4 Scout/Maverick,
/// OpenAI GPT-4o, etc.). Re-uses the OpenAI options bag.
/// </summary>
public sealed class GroqWaterVisionService : ILlmWaterVisionService
{
    private const string Prompt =
        "You are a meticulous water-tanker delivery audit assistant. "
        + "I will show you one or more photographs taken during a tanker delivery. "
        + "Each photo is exactly ONE of the following four types:\n"
        + "  • starting_meter — analog or digital water meter showing the reading BEFORE filling. "
          + "Usually a 5–7 digit cumulative count (e.g. 12345 or 01234.6 m³).\n"
        + "  • ending_meter — water meter AFTER filling. Numerically GREATER than starting_meter.\n"
        + "  • tds — a HAND-HELD TDS / EC / PPM pen-style meter with a small LCD digital display "
          + "showing a 2–4 digit value (typically 50–800). Often labelled 'TDS' or 'ppm' or 'µS'. "
          + "Has a HOLD/ON button. Looks like a pen or stick with a screen.\n"
        + "  • vehicle_number — Indian-style number plate on the tanker (e.g. KA53JR1035, KA-01-AB-1234).\n\n"
        + "TASK: For EACH photo I send (and ONLY for those photos, in the order I send them), output:\n"
        + "  - type:      one of starting_meter | ending_meter | tds | vehicle_number | unknown\n"
        + "  - value:     the literal reading you see (digits only for meters/TDS; "
          + "uppercase alphanumeric with NO spaces/dashes for vehicle plates, e.g. \"KA53JR1035\")\n"
        + "  - confidence: 0.0 – 1.0 (how certain you are about the type AND value)\n"
        + "  - raw_text:   short description of what's in the image\n\n"
        + "CRITICAL RULES — read carefully:\n"
        + "  1. NEVER invent or hallucinate fields. If you only see a TDS meter, return only ONE item "
            + "with type='tds'. Do NOT also output a starting_meter or vehicle_number unless those are "
            + "literally visible in the same image.\n"
        + "  2. The number of objects in your `photos` array MUST equal the number of input images. "
            + "If I send 1 image, return exactly 1 item.\n"
        + "  3. Read digits VERY carefully. Look at the LCD segments. A '4' has an open top; an '8' has "
            + "two closed loops; a '1' has no horizontal segments. Re-check before answering.\n"
        + "  4. IGNORE all watermarks, geo-tags, timestamps, addresses, GPS coordinates and any overlay "
            + "text burned onto the photo by a camera app. Read ONLY the numbers shown on the physical "
            + "device's display (meter dial, TDS LCD, or number plate).\n"
        + "  5. A 3-digit reading on a hand-held pen-style LCD is ALWAYS tds, NEVER a meter.\n"
        + "  6. A 5+ digit cumulative count on a wall-mounted mechanical/digital dial is a meter.\n"
        + "  7. If you see two meter photos in the same request, the LARGER reading is ending_meter.\n"
        + "  8. Vehicle numbers always contain 2 letters + digits + 1–3 letters + digits.\n"
        + "  9. If a photo is blurry, partially out of frame, the display is dark/off, or you genuinely "
            + "can't tell what device or reading it is, use type='unknown', value=null, "
            + "and confidence < 0.4 — do NOT guess.\n"
        + " 10. If you are not at least 70% sure of the EXACT digits, set confidence < 0.7 and still "
            + "give your best guess in `value`. The user will manually verify low-confidence reads.\n\n"
        + "RESPONSE FORMAT: a single JSON object with key `photos` whose value is an array, "
        + "one element per input photo in the same order. NO markdown, NO commentary, JSON ONLY:\n"
        + "{\n"
        + "  \"photos\": [\n"
        + "    {\"index\": 0, \"type\": \"starting_meter\", \"value\": \"12345\", \"confidence\": 0.92, \"raw_text\": \"mechanical meter at 12345\"}\n"
        + "  ]\n"
        + "}";

    private readonly HttpClient _http;
    private readonly OpenAiOptions _opts;
    private readonly ILogger<GroqWaterVisionService> _log;

    public GroqWaterVisionService(
        HttpClient http,
        IOptions<OpenAiOptions> opts,
        ILogger<GroqWaterVisionService> log)
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

    public async Task<WaterAnalysisResult?> AnalyzePhotosAsync(
        IReadOnlyList<WaterPhotoInput> photos,
        WaterAnalysisContext context,
        CancellationToken ct = default)
    {
        if (!IsEnabled || photos.Count == 0) return null;

        // Build the multimodal user message: text prompt + N image_url parts.
        var content = new List<object>(photos.Count + 1)
        {
            new Dictionary<string, object?>
            {
                ["type"] = "text",
                ["text"] = Prompt + "\n\nContext for disambiguation:\n"
                           + $"  • starting_meter already filled: {context.OpeningFilled}\n"
                           + $"  • ending_meter already filled: {context.ClosingFilled}\n"
                           + $"  • tds already filled: {context.TdsFilled}\n"
                           + $"  • vehicle_number already filled: {context.VehicleFilled}\n"
                           + $"  • number of photos in this request: {photos.Count}",
            },
        };

        for (var i = 0; i < photos.Count; i++)
        {
            var p = photos[i];
            var mime = string.IsNullOrWhiteSpace(p.MimeType) ? "image/jpeg" : p.MimeType;
            content.Add(new Dictionary<string, object?>
            {
                ["type"] = "image_url",
                ["image_url"] = new Dictionary<string, object?>
                {
                    ["url"] = $"data:{mime};base64,{p.Base64}",
                },
            });
        }

        var body = new Dictionary<string, object?>
        {
            ["model"] = _opts.Model,
            ["temperature"] = 0.1,
            ["response_format"] = new Dictionary<string, object?> { ["type"] = "json_object" },
            ["messages"] = new object[]
            {
                new Dictionary<string, object?>
                {
                    ["role"] = "user",
                    ["content"] = content,
                },
            },
        };

        string? raw;
        try
        {
            raw = await PostAsync("/chat/completions", body, ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Water vision LLM call failed");
            return null;
        }
        if (raw is null) return null;

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var msg = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
            var jsonText = msg.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
                ? c.GetString() ?? string.Empty
                : string.Empty;
            if (string.IsNullOrWhiteSpace(jsonText)) return null;

            using var inner = JsonDocument.Parse(jsonText);
            if (!inner.RootElement.TryGetProperty("photos", out var photosEl)
                || photosEl.ValueKind != JsonValueKind.Array)
                return null;

            var items = new List<WaterPhotoAnalysis>();
            var idx = 0;
            foreach (var p in photosEl.EnumerateArray())
            {
                var type = (p.TryGetProperty("type", out var t) ? t.GetString() : null) ?? "unknown";
                var value = p.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.String
                    ? v.GetString() : null;
                var confidence = p.TryGetProperty("confidence", out var cf) && cf.ValueKind == JsonValueKind.Number
                    ? cf.GetDouble() : 0.0;
                var rawText = p.TryGetProperty("raw_text", out var rt) && rt.ValueKind == JsonValueKind.String
                    ? rt.GetString() : null;
                items.Add(new WaterPhotoAnalysis(
                    Index: p.TryGetProperty("index", out var ix) && ix.ValueKind == JsonValueKind.Number
                        ? ix.GetInt32() : idx,
                    Type: NormaliseType(type),
                    Value: NormaliseValue(type, value),
                    Confidence: Math.Clamp(confidence, 0.0, 1.0),
                    RawText: rawText));
                idx++;
            }

            // Derived: if we have both meters, compute consumption.
            double? consumption = null;
            var startStr = items.FirstOrDefault(i => i.Type == "starting_meter")?.Value;
            var endStr = items.FirstOrDefault(i => i.Type == "ending_meter")?.Value;
            if (double.TryParse(startStr, out var s) && double.TryParse(endStr, out var e) && e > s)
                consumption = Math.Round(e - s, 2);

            var needsReview = items.Any(i => i.Confidence < 0.7) || items.Any(i => i.Type == "unknown");

            return new WaterAnalysisResult(items, _opts.Model, consumption, needsReview);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Failed to parse water vision response");
            return null;
        }
    }

    private static string NormaliseType(string raw) => raw.ToLowerInvariant().Trim() switch
    {
        "starting_meter" or "start_meter" or "opening_meter" or "opening" => "starting_meter",
        "ending_meter" or "end_meter" or "closing_meter" or "closing" => "ending_meter",
        "tds" or "ppm" or "ec" => "tds",
        "vehicle_number" or "vehicle" or "plate" or "number_plate" => "vehicle_number",
        _ => "unknown",
    };

    private static string? NormaliseValue(string type, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        switch (type.ToLowerInvariant())
        {
            case "vehicle_number":
            case "vehicle":
            case "plate":
                // Strip dashes/spaces and uppercase
                return new string(v.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
            default:
                // Keep digits and decimal point for meters/tds
                var keep = new string(v.Where(ch => char.IsDigit(ch) || ch == '.').ToArray());
                return string.IsNullOrEmpty(keep) ? null : keep;
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
            _log.LogWarning("Water vision LLM {Status}: {Body}", (int)resp.StatusCode, text);
            return null;
        }
        return text;
    }
}
