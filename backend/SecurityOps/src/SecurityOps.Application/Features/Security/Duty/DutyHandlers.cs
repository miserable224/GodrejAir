using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;
namespace SecurityOps.Application.Features.Duty;

public sealed record CheckInDutyCommand(CheckInDutyRequest Body) : IRequest<DutySessionResponse>;

public sealed class CheckInDutyCommandHandler : IRequestHandler<CheckInDutyCommand, DutySessionResponse>
{
    private readonly IApplicationDbContext _db;

    public CheckInDutyCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<DutySessionResponse> Handle(CheckInDutyCommand request, CancellationToken cancellationToken)
    {
        var body = request.Body;
        var staffName = body.StaffName.Trim();
        var locationName = body.LocationName.Trim();

        var staff = await SecurityOpsResolver.GetOrCreateStaffByNameAsync(_db, staffName, cancellationToken);
        var locationId = await SecurityOpsResolver.ResolveLocationIdAsync(_db, locationName, cancellationToken);

        var openForStaff = await _db.SecurityDutySessions
            .Where(s => s.Status == DutySessionStatuses.Open &&
                        (s.StaffId == staff.Id ||
                         (s.StaffId == null && s.StaffName.ToLower() == staffName.ToLower())))
            .OrderByDescending(s => s.EntryAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (openForStaff is not null)
        {
            throw new InvalidOperationException(
                $"Already checked in at {openForStaff.LocationName} since {openForStaff.EntryAt:HH:mm}. Check out first.");
        }

        var fallbackUtc = body.EntryAt == default ? DateTime.UtcNow : UtcDates.ToUtc(body.EntryAt);
        var entryCaptured = UtcDates.ToUtc(body.CapturedAt);
        var entryAt = entryCaptured ?? fallbackUtc;
        var entryPhoto = body.PhotoUrls.FirstOrDefault(u => !string.IsNullOrWhiteSpace(u))?.Trim();
        var entryShift = DutyShiftInference.InferShiftType(entryAt);

        var session = new SecurityDutySession
        {
            StaffId = staff.Id,
            StaffName = staff.Name,
            LocationName = locationName,
            LocationId = locationId,
            Designation = string.IsNullOrWhiteSpace(body.Designation) ? staff.Role : body.Designation.Trim(),
            Status = DutySessionStatuses.Open,
            EntryAt = entryAt,
            EntryShift = entryShift,
            EntryPhotoUrl = entryPhoto,
            EntryLatitude = body.Latitude,
            EntryLongitude = body.Longitude,
            EntryAccuracyMeters = body.AccuracyMeters,
            EntryCapturedAt = entryCaptured ?? entryAt,
        };

        _db.SecurityDutySessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);

        return DutySessionMapper.Map(session);
    }
}

public sealed class CheckInDutyCommandValidator : AbstractValidator<CheckInDutyCommand>
{
    public CheckInDutyCommandValidator()
    {
        RuleFor(x => x.Body.StaffName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Body.LocationName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Body.PhotoUrls).NotEmpty().WithMessage("Check-in photo is required.");
        RuleForEach(x => x.Body.PhotoUrls).Must(u => !string.IsNullOrWhiteSpace(u));
    }
}

public sealed record CheckOutDutyCommand(Guid SessionId, CheckOutDutyRequest Body) : IRequest<DutySessionResponse>;

public sealed class CheckOutDutyCommandHandler : IRequestHandler<CheckOutDutyCommand, DutySessionResponse>
{
    private readonly IApplicationDbContext _db;

    public CheckOutDutyCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<DutySessionResponse> Handle(CheckOutDutyCommand request, CancellationToken cancellationToken)
    {
        var session = await _db.SecurityDutySessions
            .FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);

        if (session is null)
            throw new InvalidOperationException("Duty session not found.");

        if (session.Status != DutySessionStatuses.Open)
            throw new InvalidOperationException("This duty session is already checked out.");

        var body = request.Body;
        var fallbackExit = body.ExitAt == default ? DateTime.UtcNow : UtcDates.ToUtc(body.ExitAt);
        var exitCaptured = UtcDates.ToUtc(body.CapturedAt);
        var exitAt = exitCaptured ?? fallbackExit;
        if (exitAt < session.EntryAt)
            throw new InvalidOperationException("Check-out time cannot be before check-in.");

        session.Status = DutySessionStatuses.Completed;
        session.ExitAt = exitAt;
        session.ExitShift = DutyShiftInference.InferShiftType(exitAt);
        session.ExitPhotoUrl = body.PhotoUrls?.FirstOrDefault(u => !string.IsNullOrWhiteSpace(u))?.Trim();
        session.ExitLatitude = body.Latitude;
        session.ExitLongitude = body.Longitude;
        session.ExitAccuracyMeters = body.AccuracyMeters;
        session.ExitCapturedAt = exitCaptured ?? exitAt;
        session.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return DutySessionMapper.Map(session);
    }
}

public sealed record GetOnDutySessionsQuery : IRequest<IReadOnlyList<DutySessionResponse>>;

public sealed class GetOnDutySessionsQueryHandler : IRequestHandler<GetOnDutySessionsQuery, IReadOnlyList<DutySessionResponse>>
{
    private readonly IApplicationDbContext _db;

    public GetOnDutySessionsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<DutySessionResponse>> Handle(
        GetOnDutySessionsQuery request,
        CancellationToken cancellationToken)
    {
        var rows = await _db.SecurityDutySessions.AsNoTracking()
            .Where(s => s.Status == DutySessionStatuses.Open)
            .OrderByDescending(s => s.EntryAt)
            .ToListAsync(cancellationToken);

        return rows.Select(DutySessionMapper.Map).ToList();
    }
}

public sealed record GetDutySessionsQuery(
    DateTime? Date,
    DateTime? From,
    DateTime? To,
    string? StaffName,
    string? Status)
    : IRequest<IReadOnlyList<DutySessionResponse>>;

public sealed class GetDutySessionsQueryHandler : IRequestHandler<GetDutySessionsQuery, IReadOnlyList<DutySessionResponse>>
{
    private readonly IApplicationDbContext _db;

    public GetDutySessionsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<DutySessionResponse>> Handle(
        GetDutySessionsQuery request,
        CancellationToken cancellationToken)
    {
        var q = _db.SecurityDutySessions.AsNoTracking().AsQueryable();

        if (request.From is not null && request.To is not null)
        {
            var rangeStart = UtcDates.ToUtcDate(request.From.Value);
            var rangeEnd = UtcDates.ToUtcDate(request.To.Value).AddDays(1);
            q = q.Where(s => s.EntryAt >= rangeStart && s.EntryAt < rangeEnd);
        }
        else if (request.Date is not null)
        {
            var (start, end) = UtcDates.UtcDayRange(request.Date.Value);
            q = q.Where(s => s.EntryAt >= start && s.EntryAt < end);
        }

        if (!string.IsNullOrWhiteSpace(request.StaffName))
        {
            var needle = request.StaffName.Trim().ToLowerInvariant();
            q = q.Where(s => s.StaffName.ToLower().Contains(needle));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim().ToLowerInvariant();
            q = q.Where(s => s.Status == status);
        }

        var rows = await q.OrderByDescending(s => s.EntryAt).Take(200).ToListAsync(cancellationToken);
        return rows.Select(DutySessionMapper.Map).ToList();
    }
}

public sealed record GetOpenDutySessionForStaffQuery(string StaffName) : IRequest<DutySessionResponse?>;

public sealed class GetOpenDutySessionForStaffQueryHandler
    : IRequestHandler<GetOpenDutySessionForStaffQuery, DutySessionResponse?>
{
    private readonly IApplicationDbContext _db;

    public GetOpenDutySessionForStaffQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<DutySessionResponse?> Handle(
        GetOpenDutySessionForStaffQuery request,
        CancellationToken cancellationToken)
    {
        var name = request.StaffName.Trim();
        if (name.Length == 0) return null;

        var staff = await SecurityOpsResolver.ResolveStaffByNameOrBadgeAsync(_db, name, cancellationToken);
        var needle = name.ToLowerInvariant();

        var session = await _db.SecurityDutySessions.AsNoTracking()
            .Where(s => s.Status == DutySessionStatuses.Open &&
                        (staff != null && s.StaffId == staff.Id ||
                         s.StaffName.ToLower() == needle))
            .OrderByDescending(s => s.EntryAt)
            .FirstOrDefaultAsync(cancellationToken);

        return session is null ? null : DutySessionMapper.Map(session);
    }
}

internal static class DutySessionMapper
{
    public static DutySessionResponse Map(SecurityDutySession s) =>
        new(
            s.Id,
            s.StaffId,
            s.StaffName,
            s.LocationId,
            s.LocationName,
            s.Designation,
            s.Status,
            s.EntryAt,
            s.ExitAt,
            s.EntryPhotoUrl,
            s.ExitPhotoUrl,
            s.EntryLatitude,
            s.EntryLongitude,
            s.ExitLatitude,
            s.ExitLongitude,
            DutyDuration.Minutes(s),
            DutyDuration.Hours(s),
            DutyDuration.Label(s),
            s.EntryShift,
            s.ExitShift,
            DutyShiftInference.DisplayName(s.EntryShift),
            DutyShiftInference.DisplayName(s.ExitShift),
            s.EntryCapturedAt,
            s.ExitCapturedAt);

}

/// <summary>Presence duration from check-in to check-out, or elapsed time if still on duty.</summary>
internal static class DutyDuration
{
    public static int Minutes(SecurityDutySession s)
    {
        var end = s.ExitAt ?? DateTime.UtcNow;
        var mins = (int)Math.Round((end - s.EntryAt).TotalMinutes);
        return Math.Max(0, mins);
    }

    public static decimal Hours(SecurityDutySession s) =>
        Math.Round(Minutes(s) / 60.0m, 1);

    public static string Label(SecurityDutySession s)
    {
        var mins = Minutes(s);
        var h = mins / 60;
        var m = mins % 60;
        var core = h > 0
            ? m > 0 ? $"{h}h {m}m" : $"{h}h"
            : $"{m}m";
        return s.ExitAt is null ? $"{core} · on duty" : core;
    }
}
