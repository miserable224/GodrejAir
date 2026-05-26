using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Domain.Entities.Water;

namespace SecurityOps.Api.Controllers.Water;

/// <summary>
/// Water-tanker module — vendors + delivery records.
/// Backed by <c>water_vendors</c> and <c>water_records</c> tables defined in
/// <c>supabase/migrations/001_init.sql</c>.
/// </summary>
[ApiController]
[Route("api/water")]
[Tags("Water")]
[Authorize(Roles = AppRoles.AllAuthenticated)]
public sealed class WaterController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly IWaterPhotoStorage _photoStorage;
    private readonly ILogger<WaterController> _log;

    public WaterController(
        IApplicationDbContext db,
        IWaterPhotoStorage photoStorage,
        ILogger<WaterController> log)
    {
        _db = db;
        _photoStorage = photoStorage;
        _log = log;
    }

    // ── VENDORS ─────────────────────────────────────────────────────────────

    [HttpGet("vendors")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WaterVendorDto>>>> ListVendors(
        CancellationToken ct = default)
    {
        var raw = await _db.WaterVendors.AsNoTracking()
            .OrderBy(v => v.Name)
            .Select(v => new
            {
                v.Id, v.Name, v.ContactNumber, v.Address, v.VehicleNo,
                v.TankerCapacityKl, v.CreatedAt,
            })
            .ToListAsync(ct);

        var rows = raw
            .Select(v => new WaterVendorDto(
                v.Id, v.Name, v.ContactNumber, v.Address, v.VehicleNo,
                v.TankerCapacityKl, v.CreatedAt))
            .ToList();

        return Ok(ApiResponse<IReadOnlyList<WaterVendorDto>>.Ok(rows));
    }

    [HttpPost("vendors")]
    public async Task<ActionResult<ApiResponse<WaterVendorDto>>> CreateVendor(
        [FromBody] CreateWaterVendorRequest? req,
        CancellationToken ct = default)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(ApiResponse<WaterVendorDto>.Fail("Vendor name is required."));

        var v = new WaterVendor
        {
            Name = req.Name.Trim(),
            ContactNumber = req.ContactNumber?.Trim(),
            Address = req.Address?.Trim(),
            VehicleNo = req.VehicleNo?.Trim().ToUpperInvariant(),
            TankerCapacityKl = req.TankerCapacityKl is > 0 ? req.TankerCapacityKl.Value : 6m,
            CreatedAt = DateTime.UtcNow,
        };
        _db.WaterVendors.Add(v);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<WaterVendorDto>.Ok(new WaterVendorDto(
            v.Id, v.Name, v.ContactNumber, v.Address, v.VehicleNo,
            v.TankerCapacityKl, v.CreatedAt)));
    }

    // ── RECORDS ─────────────────────────────────────────────────────────────

    [HttpGet("records")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WaterRecordDto>>>> ListRecords(
        [FromQuery] int days = 30,
        [FromQuery] int limit = 200,
        CancellationToken ct = default)
    {
        if (days <= 0 || days > 365) days = 30;
        if (limit <= 0 || limit > 1000) limit = 200;
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

        var raw = await _db.WaterRecords.AsNoTracking()
            .Where(r => r.Date >= since)
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .Take(limit)
            .Select(r => new
            {
                r.Id, r.Date, r.Source, r.SourceType, r.VehicleNo,
                r.OpeningMeter, r.ClosingMeter, r.Tds, r.Load, r.TankLevelKl,
                r.VendorId, r.Notes, r.ReceiptUrl, r.CreatedAt, r.CreatedBy,
            })
            .ToListAsync(ct);

        var recordIds = raw.Select(r => r.Id).ToList();
        var photoRows = await _db.WaterRecordPhotos.AsNoTracking()
            .Where(p => recordIds.Contains(p.RecordId))
            .OrderBy(p => p.CapturedAt ?? p.CreatedAt)
            .Select(p => new
            {
                p.Id, p.RecordId, p.PhotoType, p.PhotoUrl, p.DetectedValue,
                p.ScanConfidence, p.Latitude, p.Longitude, p.CapturedAt,
                p.MimeType, p.SizeBytes,
            })
            .ToListAsync(ct);

        var photosByRecord = photoRows
            .GroupBy(p => p.RecordId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var origin = $"{Request.Scheme}://{Request.Host.Value}";

        var rows = raw.Select(r =>
        {
            photosByRecord.TryGetValue(r.Id, out var ps);
            var photos = (ps ?? new())
                .Select(p => new WaterRecordPhotoDto(
                    Id: p.Id,
                    PhotoType: p.PhotoType,
                    Url: AbsoluteUrl(origin, p.PhotoUrl),
                    DetectedValue: p.DetectedValue,
                    ScanConfidence: p.ScanConfidence,
                    Latitude: p.Latitude,
                    Longitude: p.Longitude,
                    CapturedAt: p.CapturedAt,
                    MimeType: p.MimeType,
                    SizeBytes: p.SizeBytes))
                .ToList();
            return new WaterRecordDto(
                Id: r.Id,
                Date: r.Date.ToString("yyyy-MM-dd"),
                Time: r.CreatedAt.ToLocalTime().ToString("hh:mm tt", CultureInfo.InvariantCulture),
                Source: r.Source,
                SourceType: r.SourceType,
                VehicleNo: r.VehicleNo,
                OpeningMeter: r.OpeningMeter,
                ClosingMeter: r.ClosingMeter,
                Tds: r.Tds,
                Load: r.Load,
                TankLevelKl: r.TankLevelKl,
                VendorId: r.VendorId,
                Notes: r.Notes,
                ReceiptUrl: r.ReceiptUrl,
                CreatedAt: r.CreatedAt,
                Photos: photos);
        }).ToList();

        return Ok(ApiResponse<IReadOnlyList<WaterRecordDto>>.Ok(rows));
    }

    [HttpGet("records/{id:guid}/photos")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WaterRecordPhotoDto>>>> ListRecordPhotos(
        Guid id,
        CancellationToken ct = default)
    {
        var rows = await _db.WaterRecordPhotos.AsNoTracking()
            .Where(p => p.RecordId == id)
            .OrderBy(p => p.CapturedAt ?? p.CreatedAt)
            .ToListAsync(ct);

        var origin = $"{Request.Scheme}://{Request.Host.Value}";
        var dtos = rows.Select(p => new WaterRecordPhotoDto(
            Id: p.Id,
            PhotoType: p.PhotoType,
            Url: AbsoluteUrl(origin, p.PhotoUrl),
            DetectedValue: p.DetectedValue,
            ScanConfidence: p.ScanConfidence,
            Latitude: p.Latitude,
            Longitude: p.Longitude,
            CapturedAt: p.CapturedAt,
            MimeType: p.MimeType,
            SizeBytes: p.SizeBytes)).ToList();

        return Ok(ApiResponse<IReadOnlyList<WaterRecordPhotoDto>>.Ok(dtos));
    }

    private static string AbsoluteUrl(string origin, string urlOrPath)
    {
        if (string.IsNullOrWhiteSpace(urlOrPath)) return urlOrPath;
        if (urlOrPath.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || urlOrPath.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return urlOrPath;
        return $"{origin}{(urlOrPath.StartsWith('/') ? "" : "/")}{urlOrPath}";
    }

    [HttpPost("records")]
    public async Task<ActionResult<ApiResponse<WaterRecordDto>>> CreateRecord(
        [FromBody] CreateWaterRecordRequest? req,
        CancellationToken ct = default)
    {
        if (req is null)
            return BadRequest(ApiResponse<WaterRecordDto>.Fail("Body is required."));

        var dateOnly = ParseDate(req.Date);
        if (dateOnly is null)
            return BadRequest(ApiResponse<WaterRecordDto>.Fail(
                "Date is required (formats accepted: YYYY-MM-DD, DD/MM/YY, DD/MM/YYYY)."));

        if (string.IsNullOrWhiteSpace(req.VehicleNo)
            && string.IsNullOrWhiteSpace(req.OpeningMeter)
            && string.IsNullOrWhiteSpace(req.ClosingMeter)
            && string.IsNullOrWhiteSpace(req.Tds))
        {
            return BadRequest(ApiResponse<WaterRecordDto>.Fail(
                "At least one of vehicleNo, openingMeter, closingMeter, or tds is required."));
        }

        // VendorId arrives as a free-form string so we can tolerate "", null,
        // and legacy local-state ids like "v-001" that don't parse to a Guid.
        Guid? vendorId = null;
        if (!string.IsNullOrWhiteSpace(req.VendorId) && Guid.TryParse(req.VendorId, out var parsedVid))
        {
            var exists = await _db.WaterVendors.AsNoTracking()
                .AnyAsync(v => v.Id == parsedVid, ct);
            if (exists) vendorId = parsedVid;
        }

        decimal? tankLevel = null;
        if (!string.IsNullOrWhiteSpace(req.TankLevelKl)
            && decimal.TryParse(req.TankLevelKl, NumberStyles.Any, CultureInfo.InvariantCulture, out var tl))
        {
            tankLevel = tl;
        }

        var entity = new WaterRecord
        {
            Date = dateOnly.Value,
            Source = req.Source?.Trim(),
            SourceType = string.IsNullOrWhiteSpace(req.SourceType) ? "tanker" : req.SourceType!.Trim(),
            VehicleNo = req.VehicleNo?.Trim().ToUpperInvariant(),
            OpeningMeter = req.OpeningMeter?.Trim(),
            ClosingMeter = req.ClosingMeter?.Trim(),
            Tds = req.Tds?.Trim(),
            Load = req.Load?.Trim(),
            TankLevelKl = tankLevel,
            VendorId = vendorId,
            Notes = req.Notes?.Trim(),
            ReceiptUrl = req.ReceiptUrl?.Trim(),
            CreatedAt = DateTime.UtcNow,
            // Leave CreatedBy null — water_records.created_by FKs to profiles(id),
            // which is a Supabase auth table our JWT users may not exist in.
            CreatedBy = null,
        };

        _db.WaterRecords.Add(entity);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to save water record");
            return StatusCode(500, ApiResponse<WaterRecordDto>.Fail(
                "Failed to save water record: " + ex.GetBaseException().Message));
        }

        // Persist the up-to-4 audit photos (if the client sent them). We do
        // this AFTER the record is inserted so the FK is valid. Failures here
        // are non-fatal — the record itself is already saved.
        var savedPhotos = new List<WaterRecordPhoto>();
        if (req.Photos is { Count: > 0 })
        {
            foreach (var p in req.Photos)
            {
                if (p is null || string.IsNullOrWhiteSpace(p.Base64)) continue;
                try
                {
                    byte[] bytes;
                    try
                    {
                        bytes = Convert.FromBase64String(p.Base64);
                    }
                    catch (FormatException)
                    {
                        _log.LogWarning("Skipping water photo with invalid base64");
                        continue;
                    }

                    var mime = string.IsNullOrWhiteSpace(p.MimeType) ? "image/jpeg" : p.MimeType!;
                    using var ms = new MemoryStream(bytes);
                    var stored = await _photoStorage.SaveAsync(ms, mime, null, ct);

                    var photo = new WaterRecordPhoto
                    {
                        RecordId = entity.Id,
                        PhotoType = NormalisePhotoType(p.PhotoType),
                        PhotoUrl = stored.PublicUrl,
                        StoragePath = stored.StoragePath,
                        DetectedValue = p.DetectedValue,
                        ScanConfidence = p.ScanConfidence,
                        Latitude = p.Latitude,
                        Longitude = p.Longitude,
                        CapturedAt = ParseTimestamp(p.CapturedAt),
                        MimeType = mime,
                        SizeBytes = stored.SizeBytes,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.WaterRecordPhotos.Add(photo);
                    savedPhotos.Add(photo);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Failed to persist one water photo (record {RecordId})", entity.Id);
                }
            }

            if (savedPhotos.Count > 0)
            {
                try
                {
                    await _db.SaveChangesAsync(ct);
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Failed to save water_record_photos rows for record {RecordId}", entity.Id);
                }
            }
        }

        var origin = $"{Request.Scheme}://{Request.Host.Value}";
        var photoDtos = savedPhotos.Select(p => new WaterRecordPhotoDto(
            Id: p.Id,
            PhotoType: p.PhotoType,
            Url: AbsoluteUrl(origin, p.PhotoUrl),
            DetectedValue: p.DetectedValue,
            ScanConfidence: p.ScanConfidence,
            Latitude: p.Latitude,
            Longitude: p.Longitude,
            CapturedAt: p.CapturedAt,
            MimeType: p.MimeType,
            SizeBytes: p.SizeBytes)).ToList();

        var dto = new WaterRecordDto(
            Id: entity.Id,
            Date: entity.Date.ToString("yyyy-MM-dd"),
            Time: entity.CreatedAt.ToLocalTime().ToString("hh:mm tt", CultureInfo.InvariantCulture),
            Source: entity.Source,
            SourceType: entity.SourceType,
            VehicleNo: entity.VehicleNo,
            OpeningMeter: entity.OpeningMeter,
            ClosingMeter: entity.ClosingMeter,
            Tds: entity.Tds,
            Load: entity.Load,
            TankLevelKl: entity.TankLevelKl,
            VendorId: entity.VendorId,
            Notes: entity.Notes,
            ReceiptUrl: entity.ReceiptUrl,
            CreatedAt: entity.CreatedAt,
            Photos: photoDtos);

        return Ok(ApiResponse<WaterRecordDto>.Ok(dto));
    }

    private static string NormalisePhotoType(string? type) => (type ?? "").ToLowerInvariant().Trim() switch
    {
        "starting_meter" or "opening_meter" or "opening" => "starting_meter",
        "ending_meter" or "closing_meter" or "closing" => "ending_meter",
        "tds" => "tds",
        "vehicle_number" or "vehicle" or "plate" => "vehicle_number",
        _ => "unknown",
    };

    private static DateTime? ParseTimestamp(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return dt.ToUniversalTime();
        return null;
    }

    /// <summary>Accepts YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY, and DD-MM-YYYY.</summary>
    private static DateOnly? ParseDate(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "dd/MM/yy", "dd-MM-yyyy", "MM/dd/yyyy" };
        if (DateOnly.TryParseExact(input.Trim(), formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var d))
            return d;
        if (DateOnly.TryParse(input.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var d2))
            return d2;
        return null;
    }

    // ── DTOs ────────────────────────────────────────────────────────────────

    public sealed record WaterVendorDto(
        Guid Id,
        string Name,
        string? ContactNumber,
        string? Address,
        string? VehicleNo,
        decimal TankerCapacityKl,
        DateTime CreatedAt);

    public sealed record CreateWaterVendorRequest(
        string Name,
        string? ContactNumber,
        string? Address,
        string? VehicleNo,
        decimal? TankerCapacityKl = null);

    public sealed record WaterRecordDto(
        Guid Id,
        string Date,
        string Time,
        string? Source,
        string? SourceType,
        string? VehicleNo,
        string? OpeningMeter,
        string? ClosingMeter,
        string? Tds,
        string? Load,
        decimal? TankLevelKl,
        Guid? VendorId,
        string? Notes,
        string? ReceiptUrl,
        DateTime CreatedAt,
        IReadOnlyList<WaterRecordPhotoDto>? Photos = null);

    public sealed record WaterRecordPhotoDto(
        Guid Id,
        string PhotoType,
        string Url,
        string? DetectedValue,
        decimal? ScanConfidence,
        decimal? Latitude,
        decimal? Longitude,
        DateTime? CapturedAt,
        string? MimeType,
        int? SizeBytes);

    public sealed record CreateWaterRecordRequest(
        string? Date,
        string? Time,
        string? Source,
        string? SourceType,
        string? VehicleNo,
        string? OpeningMeter,
        string? ClosingMeter,
        string? Tds,
        string? Load,
        string? TankLevelKl,
        // Accept as string so "", null, "v-001" don't blow up model binding.
        string? VendorId,
        string? Notes,
        string? ReceiptUrl,
        IReadOnlyList<CreateWaterPhotoInput?>? Photos = null);

    public sealed record CreateWaterPhotoInput(
        string? Base64,
        string? MimeType,
        string? PhotoType,
        string? DetectedValue,
        decimal? ScanConfidence,
        decimal? Latitude,
        decimal? Longitude,
        // ISO 8601 string ("2026-05-26T15:54:59Z"). Stored as UTC.
        string? CapturedAt);
}
