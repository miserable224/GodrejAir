using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Api.Auth;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Domain.Entities.Community;

namespace SecurityOps.Api.Controllers.Community;

/// <summary>Community — events, classes &amp; vendors (resident-facing data).</summary>
[ApiController]
[Route("api/community")]
[Tags("Community")]
[Authorize(Roles = AppRoles.AllAuthenticated)]
public sealed class CommunityController : ControllerBase
{
    private readonly IApplicationDbContext _db;

    public CommunityController(IApplicationDbContext db) => _db = db;

    // ── EVENTS ──────────────────────────────────────────────────────────────

    [HttpGet("events")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EventDto>>>> ListEvents(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? category,
        CancellationToken ct = default)
    {
        var (fromUtc, toUtc) = ResolveDateRange(from, to, defaultDays: 14);

        var q = _db.Events.AsNoTracking()
            .Where(e => e.Active && e.DeletedAt == null)
            .Where(e => e.StartDatetime < toUtc && e.EndDatetime >= fromUtc);

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(e => e.Category.ToLower() == category.Trim().ToLower());

        var raw = await q.OrderBy(e => e.StartDatetime)
            .Select(e => new
            {
                e.Id, e.Title, e.Description, e.Category, e.Venue,
                e.StartDatetime, e.EndDatetime, e.OrganizerName, e.OrganizerContact,
                e.RegistrationRequired, e.RegistrationLink, e.EntryFee, e.ImageUrl,
            })
            .ToListAsync(ct);

        var rows = raw.Select(e => new EventDto(
            e.Id, e.Title, e.Description, e.Category, e.Venue,
            e.StartDatetime, e.EndDatetime, e.OrganizerName, e.OrganizerContact,
            e.RegistrationRequired, e.RegistrationLink, e.EntryFee, e.ImageUrl)).ToList();

        return Ok(ApiResponse<IReadOnlyList<EventDto>>.Ok(rows));
    }

    // ── CLASSES ─────────────────────────────────────────────────────────────

    /// <summary>Classes scheduled on a given date (defaults to today). Order-of-day from schedules.</summary>
    [HttpGet("classes")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ClassSessionDto>>>> ListClasses(
        [FromQuery] string? date,
        [FromQuery] string? category,
        CancellationToken ct = default)
    {
        var target = ParseDate(date) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dow = (short)target.DayOfWeek;

        var q =
            from s in _db.ClassSchedules.AsNoTracking()
            join c in _db.Classes.AsNoTracking() on s.ClassId equals c.Id
            where c.Active && c.DeletedAt == null
                  && s.Status == "active"
                  && s.DayOfWeek == dow
                  && (s.StartDate == null || s.StartDate <= target)
                  && (s.EndDate == null || s.EndDate >= target)
            select new
            {
                ClassId = c.Id,
                ScheduleId = s.Id,
                c.ClassName,
                c.Category,
                c.InstructorName,
                c.Venue,
                c.AgeGroup,
                c.FeeMonthly,
                s.StartTime,
                s.EndTime,
            };

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(x => x.Category.ToLower() == category.Trim().ToLower());

        var raw = await q.OrderBy(x => x.StartTime).ToListAsync(ct);
        var rows = raw.Select(x => new ClassSessionDto(
            x.ClassId, x.ScheduleId, x.ClassName, x.Category, x.InstructorName,
            x.Venue, x.AgeGroup, x.FeeMonthly,
            x.StartTime, x.EndTime, target)).ToList();

        return Ok(ApiResponse<IReadOnlyList<ClassSessionDto>>.Ok(rows));
    }

    /// <summary>All sessions across the next N days (default 7).</summary>
    [HttpGet("classes/upcoming")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ClassSessionDto>>>> UpcomingClasses(
        [FromQuery] int days = 7,
        CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 30);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var window = Enumerable.Range(0, days).Select(today.AddDays).ToList();

        var classes = await _db.Classes.AsNoTracking()
            .Where(c => c.Active && c.DeletedAt == null)
            .Join(_db.ClassSchedules.AsNoTracking().Where(s => s.Status == "active"),
                  c => c.Id, s => s.ClassId,
                  (c, s) => new { c, s })
            .ToListAsync(ct);

        var sessions = new List<ClassSessionDto>();
        foreach (var pair in classes)
        {
            foreach (var d in window)
            {
                if ((short)d.DayOfWeek != pair.s.DayOfWeek) continue;
                if (pair.s.StartDate is { } sd && sd > d) continue;
                if (pair.s.EndDate is { } ed && ed < d) continue;
                sessions.Add(new ClassSessionDto(
                    pair.c.Id, pair.s.Id, pair.c.ClassName, pair.c.Category, pair.c.InstructorName,
                    pair.c.Venue, pair.c.AgeGroup, pair.c.FeeMonthly,
                    pair.s.StartTime, pair.s.EndTime, d));
            }
        }

        var ordered = sessions
            .OrderBy(x => x.Date).ThenBy(x => x.StartTime)
            .ToList();

        return Ok(ApiResponse<IReadOnlyList<ClassSessionDto>>.Ok(ordered));
    }

    // ── VENDORS ─────────────────────────────────────────────────────────────

    /// <summary>Society vendors available on a date (fruit cart, milk, dhobi, etc.).</summary>
    [HttpGet("vendors")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SocietyVendorDto>>>> ListVendors(
        [FromQuery] string? date,
        [FromQuery] string? category,
        CancellationToken ct = default)
    {
        var target = ParseDate(date) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dayName = target.DayOfWeek.ToString().ToLowerInvariant();

        var q = _db.SocietyVendors.AsNoTracking()
            .Where(v => v.Active && v.DeletedAt == null)
            .Where(v => v.StartDate == null || v.StartDate <= target)
            .Where(v => v.EndDate == null || v.EndDate >= target);

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(v => v.Category.ToLower() == category.Trim().ToLower());

        var rows = await q.ToListAsync(ct);

        // available_days is a free-form text[]. Match case-insensitive contains for day name or short form.
        bool MatchesDay(string[]? days, string dn)
        {
            if (days is null || days.Length == 0) return true;
            return days.Any(d =>
                d.Equals(dn, StringComparison.OrdinalIgnoreCase) ||
                d.StartsWith(dn[..3], StringComparison.OrdinalIgnoreCase));
        }

        var filtered = rows
            .Where(v => MatchesDay(v.AvailableDays, dayName))
            .Select(v => new SocietyVendorDto(
                v.Id, v.VendorName, v.Category, v.Description,
                v.PhoneNumber, v.WhatsappNumber, v.StallName, v.StallLocation,
                v.AvailableDays, v.AvailableFrom, v.AvailableTo,
                v.Verified, v.Rating, target))
            .OrderBy(v => v.AvailableFrom ?? TimeOnly.MinValue)
            .ToList();

        return Ok(ApiResponse<IReadOnlyList<SocietyVendorDto>>.Ok(filtered));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private static (DateTime fromUtc, DateTime toUtc) ResolveDateRange(string? from, string? to, int defaultDays)
    {
        var fromDate = ParseDate(from) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = ParseDate(to) ?? fromDate.AddDays(defaultDays);
        if (toDate < fromDate) toDate = fromDate.AddDays(defaultDays);

        var fromUtc = new DateTime(fromDate.Year, fromDate.Month, fromDate.Day, 0, 0, 0, DateTimeKind.Utc);
        var toUtc = new DateTime(toDate.Year, toDate.Month, toDate.Day, 23, 59, 59, DateTimeKind.Utc);
        return (fromUtc, toUtc);
    }

    /// <summary>Accepts "today", "tomorrow", ISO yyyy-MM-dd, or dd/MM/yyyy.</summary>
    public static DateOnly? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim().ToLowerInvariant();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return trimmed switch
        {
            "today" => today,
            "tomorrow" => today.AddDays(1),
            "yesterday" => today.AddDays(-1),
            _ when DateOnly.TryParse(trimmed, out var iso) => iso,
            _ when DateOnly.TryParseExact(trimmed, "dd/MM/yyyy", null,
                System.Globalization.DateTimeStyles.None, out var dmy) => dmy,
            _ when DateOnly.TryParseExact(trimmed, "dd/MM/yy", null,
                System.Globalization.DateTimeStyles.None, out var dmy2) => dmy2,
            _ => null,
        };
    }

    // ── DTOs ────────────────────────────────────────────────────────────────

    public sealed record EventDto(
        Guid Id, string Title, string? Description, string Category, string? Venue,
        DateTime StartDatetime, DateTime EndDatetime,
        string? OrganizerName, string? OrganizerContact,
        bool RegistrationRequired, string? RegistrationLink, decimal EntryFee, string? ImageUrl);

    public sealed record ClassSessionDto(
        Guid ClassId, Guid ScheduleId, string ClassName, string Category,
        string InstructorName, string? Venue, string? AgeGroup, decimal FeeMonthly,
        TimeOnly StartTime, TimeOnly EndTime, DateOnly Date);

    public sealed record SocietyVendorDto(
        Guid Id, string VendorName, string Category, string? Description,
        string? PhoneNumber, string? WhatsappNumber, string? StallName, string? StallLocation,
        string[] AvailableDays, TimeOnly? AvailableFrom, TimeOnly? AvailableTo,
        bool Verified, decimal? Rating, DateOnly Date);
}
