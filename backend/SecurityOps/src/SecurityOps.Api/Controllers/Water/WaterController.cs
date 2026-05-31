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
        [FromQuery] bool includeInactiveVehicles = false,
        CancellationToken ct = default)
    {
        var raw = await _db.WaterVendors.AsNoTracking()
            .OrderBy(v => v.Name)
            .Select(v => new
            {
                v.Id, v.Name, v.ContactNumber, v.Address,
                v.TankerCapacityKl, v.CreatedAt,
            })
            .ToListAsync(ct);

        var vendorIds = raw.Select(v => v.Id).ToList();
        var vehicleQuery = _db.WaterVendorVehicles.AsNoTracking()
            .Where(v => vendorIds.Contains(v.VendorId));
        if (!includeInactiveVehicles)
            vehicleQuery = vehicleQuery.Where(v => v.IsActive);

        var vehicleRows = await vehicleQuery
            .OrderBy(v => v.VehicleNo)
            .Select(v => new
            {
                v.Id, v.VendorId, v.VehicleNo, v.IsActive, v.Notes, v.CreatedAt, v.DeactivatedAt,
            })
            .ToListAsync(ct);

        var vehiclesByVendor = vehicleRows
            .GroupBy(v => v.VendorId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rows = raw.Select(v =>
        {
            vehiclesByVendor.TryGetValue(v.Id, out var fleet);
            var vehicles = (fleet ?? new())
                .Select(p => new WaterVendorVehicleDto(
                    p.Id, p.VehicleNo, p.IsActive, p.Notes, p.CreatedAt, p.DeactivatedAt))
                .ToList();
            return ToVendorDto(v.Id, v.Name, v.ContactNumber, v.Address, v.TankerCapacityKl, v.CreatedAt, vehicles);
        }).ToList();

        return Ok(ApiResponse<IReadOnlyList<WaterVendorDto>>.Ok(rows));
    }

    [HttpPost("vendors")]
    public async Task<ActionResult<ApiResponse<WaterVendorDto>>> CreateVendor(
        [FromBody] CreateWaterVendorRequest? req,
        CancellationToken ct = default)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(ApiResponse<WaterVendorDto>.Fail("Vendor name is required."));

        var plates = CollectVehicleNos(req.VehicleNos, req.VehicleNo);
        var v = new WaterVendor
        {
            Name = req.Name.Trim(),
            ContactNumber = req.ContactNumber?.Trim(),
            Address = req.Address?.Trim(),
            VehicleNo = plates.Count > 0 ? plates[0] : null,
            TankerCapacityKl = req.TankerCapacityKl is > 0 ? req.TankerCapacityKl.Value : 6m,
            CreatedAt = DateTime.UtcNow,
        };
        _db.WaterVendors.Add(v);
        await _db.SaveChangesAsync(ct);

        await AddVendorVehiclesAsync(v.Id, plates, ct);
        var fleet = await LoadVendorVehicleDtosAsync(v.Id, activeOnly: true, ct);
        return Ok(ApiResponse<WaterVendorDto>.Ok(ToVendorDto(v, fleet)));
    }

    [HttpPost("vendors/{vendorId:guid}/vehicles")]
    public async Task<ActionResult<ApiResponse<WaterVendorVehicleDto>>> AddVendorVehicle(
        Guid vendorId,
        [FromBody] AddWaterVendorVehicleRequest? req,
        CancellationToken ct = default)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.VehicleNo))
            return BadRequest(ApiResponse<WaterVendorVehicleDto>.Fail("Vehicle number is required."));

        var exists = await _db.WaterVendors.AsNoTracking().AnyAsync(v => v.Id == vendorId, ct);
        if (!exists)
            return NotFound(ApiResponse<WaterVendorVehicleDto>.Fail("Vendor not found."));

        var plate = NormalizeVehicleNo(req.VehicleNo);
        if (plate is null)
            return BadRequest(ApiResponse<WaterVendorVehicleDto>.Fail("Invalid vehicle number."));

        var duplicate = await _db.WaterVendorVehicles.AsNoTracking()
            .AnyAsync(v => v.VendorId == vendorId && v.VehicleNo == plate, ct);
        if (duplicate)
            return BadRequest(ApiResponse<WaterVendorVehicleDto>.Fail("This plate is already registered for this vendor."));

        var row = new WaterVendorVehicle
        {
            VendorId = vendorId,
            VehicleNo = plate,
            IsActive = true,
            Notes = req.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        _db.WaterVendorVehicles.Add(row);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<WaterVendorVehicleDto>.Ok(ToVehicleDto(row)));
    }

    [HttpPatch("vendors/{vendorId:guid}/vehicles/{vehicleId:guid}")]
    public async Task<ActionResult<ApiResponse<WaterVendorVehicleDto>>> UpdateVendorVehicle(
        Guid vendorId,
        Guid vehicleId,
        [FromBody] UpdateWaterVendorVehicleRequest? req,
        CancellationToken ct = default)
    {
        var row = await _db.WaterVendorVehicles
            .FirstOrDefaultAsync(v => v.Id == vehicleId && v.VendorId == vendorId, ct);
        if (row is null)
            return NotFound(ApiResponse<WaterVendorVehicleDto>.Fail("Vehicle not found for this vendor."));

        if (req?.IsActive == false && row.IsActive)
        {
            row.IsActive = false;
            row.DeactivatedAt = DateTime.UtcNow;
        }
        else if (req?.IsActive == true && !row.IsActive)
        {
            row.IsActive = true;
            row.DeactivatedAt = null;
        }

        if (!string.IsNullOrWhiteSpace(req?.VehicleNo))
        {
            var plate = NormalizeVehicleNo(req.VehicleNo);
            if (plate is null)
                return BadRequest(ApiResponse<WaterVendorVehicleDto>.Fail("Invalid vehicle number."));
            var duplicate = await _db.WaterVendorVehicles.AsNoTracking()
                .AnyAsync(v => v.VendorId == vendorId && v.VehicleNo == plate && v.Id != vehicleId, ct);
            if (duplicate)
                return BadRequest(ApiResponse<WaterVendorVehicleDto>.Fail("Another row already uses this plate."));
            row.VehicleNo = plate;
        }

        if (req?.Notes != null)
            row.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<WaterVendorVehicleDto>.Ok(ToVehicleDto(row)));
    }

    // ── RECORDS ─────────────────────────────────────────────────────────────

    [HttpGet("records")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WaterRecordDto>>>> ListRecords(
        [FromQuery] int days = 30,
        [FromQuery] int limit = 200,
        [FromQuery] bool includePhotos = false,
        CancellationToken ct = default)
    {
        if (days <= 0 || days > 365) days = 30;
        if (limit <= 0 || limit > 500) limit = 200;
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
        var origin = $"{Request.Scheme}://{Request.Host.Value}";

        Dictionary<Guid, IReadOnlyList<WaterRecordPhotoDto>>? photosByRecord = null;
        Dictionary<Guid, int>? photoCountByRecord = null;

        if (includePhotos && recordIds.Count > 0)
        {
            var photoRows = await _db.WaterRecordPhotos.AsNoTracking()
                .Where(p => recordIds.Contains(p.RecordId))
                .OrderBy(p => p.CapturedAt ?? p.CreatedAt)
                .ToListAsync(ct);

            photosByRecord = photoRows
                .GroupBy(p => p.RecordId)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<WaterRecordPhotoDto>)g
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
                        .ToList());
        }
        else if (recordIds.Count > 0)
        {
            var counts = await _db.WaterRecordPhotos.AsNoTracking()
                .Where(p => recordIds.Contains(p.RecordId))
                .GroupBy(p => p.RecordId)
                .Select(g => new { RecordId = g.Key, Count = g.Count() })
                .ToListAsync(ct);
            photoCountByRecord = counts.ToDictionary(x => x.RecordId, x => x.Count);
        }

        var rows = raw.Select(r =>
        {
            IReadOnlyList<WaterRecordPhotoDto>? photos = null;
            var photoCount = 0;

            if (photosByRecord != null)
            {
                if (photosByRecord.TryGetValue(r.Id, out var list))
                {
                    photos = list;
                    photoCount = list.Count;
                }
            }
            else if (photoCountByRecord != null)
            {
                photoCountByRecord.TryGetValue(r.Id, out photoCount);
            }

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
                Photos: photos,
                PhotoCount: photoCount);
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
            Photos: photoDtos,
            PhotoCount: photoDtos.Count);

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
    private static WaterVendorDto ToVendorDto(
        Guid id,
        string name,
        string? contact,
        string? address,
        decimal capacityKl,
        DateTime createdAt,
        IReadOnlyList<WaterVendorVehicleDto> vehicles) =>
        new(
            id,
            name,
            contact,
            address,
            capacityKl,
            createdAt,
            vehicles,
            vehicles.FirstOrDefault(v => v.IsActive)?.VehicleNo
                ?? vehicles.FirstOrDefault()?.VehicleNo);

    private static WaterVendorDto ToVendorDto(WaterVendor v, IReadOnlyList<WaterVendorVehicleDto> vehicles) =>
        ToVendorDto(v.Id, v.Name, v.ContactNumber, v.Address, v.TankerCapacityKl, v.CreatedAt, vehicles);

    private static WaterVendorVehicleDto ToVehicleDto(WaterVendorVehicle v) =>
        new(v.Id, v.VehicleNo, v.IsActive, v.Notes, v.CreatedAt, v.DeactivatedAt);

    private async Task AddVendorVehiclesAsync(
        Guid vendorId,
        IReadOnlyList<string> plates,
        CancellationToken ct)
    {
        var added = false;
        foreach (var plate in plates)
        {
            var exists = await _db.WaterVendorVehicles.AsNoTracking()
                .AnyAsync(v => v.VendorId == vendorId && v.VehicleNo == plate, ct);
            if (exists) continue;

            _db.WaterVendorVehicles.Add(new WaterVendorVehicle
            {
                VendorId = vendorId,
                VehicleNo = plate,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            });
            added = true;
        }

        if (added)
            await _db.SaveChangesAsync(ct);
    }

    private async Task<IReadOnlyList<WaterVendorVehicleDto>> LoadVendorVehicleDtosAsync(
        Guid vendorId,
        bool activeOnly,
        CancellationToken ct)
    {
        var q = _db.WaterVendorVehicles.AsNoTracking().Where(v => v.VendorId == vendorId);
        if (activeOnly)
            q = q.Where(v => v.IsActive);
        return await q
            .OrderBy(v => v.VehicleNo)
            .Select(v => new WaterVendorVehicleDto(
                v.Id, v.VehicleNo, v.IsActive, v.Notes, v.CreatedAt, v.DeactivatedAt))
            .ToListAsync(ct);
    }

    private static List<string> CollectVehicleNos(IReadOnlyList<string>? many, string? single)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var list = new List<string>();
        void Add(string? raw)
        {
            var plate = NormalizeVehicleNo(raw);
            if (plate is null || !set.Add(plate)) return;
            list.Add(plate);
        }

        if (many is { Count: > 0 })
        {
            foreach (var p in many)
                Add(p);
        }

        Add(single);
        return list;
    }

    private static string? NormalizeVehicleNo(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var plate = raw.Trim().ToUpperInvariant();
        plate = string.Concat(plate.Where(c => !char.IsWhiteSpace(c) && c != '-'));
        return plate.Length < 4 ? null : plate;
    }

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
        decimal TankerCapacityKl,
        DateTime CreatedAt,
        IReadOnlyList<WaterVendorVehicleDto> Vehicles,
        /// <summary>First active plate — convenience for older clients.</summary>
        string? VehicleNo = null);

    public sealed record WaterVendorVehicleDto(
        Guid Id,
        string VehicleNo,
        bool IsActive,
        string? Notes,
        DateTime CreatedAt,
        DateTime? DeactivatedAt);

    public sealed record CreateWaterVendorRequest(
        string Name,
        string? ContactNumber,
        string? Address,
        string? VehicleNo,
        IReadOnlyList<string>? VehicleNos = null,
        decimal? TankerCapacityKl = null);

    public sealed record AddWaterVendorVehicleRequest(string VehicleNo, string? Notes = null);

    public sealed record UpdateWaterVendorVehicleRequest(
        string? VehicleNo = null,
        bool? IsActive = null,
        string? Notes = null);

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
        IReadOnlyList<WaterRecordPhotoDto>? Photos = null,
        int PhotoCount = 0);

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
