namespace SecurityOps.Api.Services.Vision;

/// <summary>
/// Multimodal water-photo analyser. Sends one or more base64-encoded photos
/// to a vision-capable LLM (Llama 4 Scout via Groq) which classifies each
/// photo as starting_meter | ending_meter | tds | vehicle_number
/// and extracts the numeric / textual value in a single call.
/// </summary>
public interface ILlmWaterVisionService
{
    bool IsEnabled { get; }

    Task<WaterAnalysisResult?> AnalyzePhotosAsync(
        IReadOnlyList<WaterPhotoInput> photos,
        WaterAnalysisContext context,
        CancellationToken ct = default);
}

public sealed record WaterPhotoInput(
    string Base64,
    string? MimeType = "image/jpeg");

/// <summary>Hints that help the LLM disambiguate (e.g. when the user has
/// already filled some fields manually).</summary>
public sealed record WaterAnalysisContext(
    bool OpeningFilled,
    bool ClosingFilled,
    bool TdsFilled,
    bool VehicleFilled);

public sealed record WaterAnalysisResult(
    IReadOnlyList<WaterPhotoAnalysis> Items,
    string Model,
    double? Consumption,
    bool NeedsReview);

public sealed record WaterPhotoAnalysis(
    int Index,
    string Type,        // 'starting_meter' | 'ending_meter' | 'tds' | 'vehicle_number' | 'unknown'
    string? Value,
    double Confidence,
    string? RawText);
