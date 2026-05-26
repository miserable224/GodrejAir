using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Api.Auth;
using SecurityOps.Api.Services.Vision;
using SecurityOps.Application.Common.Models;

namespace SecurityOps.Api.Controllers.Water;

/// <summary>
/// LLM-powered analysis of water-tanker delivery photos.
/// Sends 1–N base64 images to a multimodal LLM (Llama 4 Scout via Groq)
/// which classifies each as starting_meter | ending_meter | tds |
/// vehicle_number and extracts the reading. Replaces the previous
/// Google Vision OCR + regex pipeline.
/// </summary>
[ApiController]
[Route("api/water")]
[Tags("Water")]
[Authorize(Roles = AppRoles.AllAuthenticated)]
public sealed class WaterVisionController : ControllerBase
{
    private readonly ILlmWaterVisionService _vision;
    private readonly ILogger<WaterVisionController> _log;

    public WaterVisionController(ILlmWaterVisionService vision, ILogger<WaterVisionController> log)
    {
        _vision = vision;
        _log = log;
    }

    /// <summary>Health probe — exposes whether the LLM vision service is configured.</summary>
    [HttpGet("vision/status")]
    public ActionResult<object> Status() =>
        Ok(new { enabled = _vision.IsEnabled });

    [HttpPost("analyze-photos")]
    public async Task<ActionResult<ApiResponse<WaterAnalysisResult>>> AnalyzePhotos(
        [FromBody] WaterAnalyzePhotosRequest? request,
        CancellationToken ct)
    {
        if (request?.Photos is null || request.Photos.Count == 0)
            return BadRequest(ApiResponse<WaterAnalysisResult>.Fail("At least one photo is required."));
        if (request.Photos.Count > 8)
            return BadRequest(ApiResponse<WaterAnalysisResult>.Fail("Maximum 8 photos per request."));
        if (!_vision.IsEnabled)
            return StatusCode(503, ApiResponse<WaterAnalysisResult>.Fail("Vision LLM is not configured on the server."));

        var photos = request.Photos
            .Where(p => !string.IsNullOrWhiteSpace(p?.Base64))
            .Select(p => new WaterPhotoInput(p!.Base64!, p.MimeType ?? "image/jpeg"))
            .ToList();
        if (photos.Count == 0)
            return BadRequest(ApiResponse<WaterAnalysisResult>.Fail("All photos were empty."));

        var context = new WaterAnalysisContext(
            OpeningFilled: request.OpeningFilled ?? false,
            ClosingFilled: request.ClosingFilled ?? false,
            TdsFilled: request.TdsFilled ?? false,
            VehicleFilled: request.VehicleFilled ?? false);

        try
        {
            var result = await _vision.AnalyzePhotosAsync(photos, context, ct);
            if (result is null)
                return StatusCode(502,
                    ApiResponse<WaterAnalysisResult>.Fail("Vision LLM returned no usable result."));
            return Ok(ApiResponse<WaterAnalysisResult>.Ok(result));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Water vision analysis failed");
            return StatusCode(500,
                ApiResponse<WaterAnalysisResult>.Fail("Internal error during analysis."));
        }
    }

    public sealed record WaterAnalyzePhotosRequest(
        IReadOnlyList<WaterAnalyzePhotoInput?> Photos,
        bool? OpeningFilled,
        bool? ClosingFilled,
        bool? TdsFilled,
        bool? VehicleFilled);

    public sealed record WaterAnalyzePhotoInput(string? Base64, string? MimeType);
}
