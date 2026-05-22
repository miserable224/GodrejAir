using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Enums;

namespace SecurityOps.Application.Features.Reports;

/// <summary>Heuristic staffing targets until a dedicated policy table exists.</summary>
internal static class SecurityOpsReportingRules
{
    public const int RequiredGuardsDayShift = 6;
    public const int RequiredGuardsNightShift = 5;
    public const int ExpectedPatrolsPerShift = 5;
}

public sealed record GetDailyManpowerReportQuery(DateOnly Date) : IRequest<DailyManpowerReport>;

public sealed class GetDailyManpowerReportQueryHandler : IRequestHandler<GetDailyManpowerReportQuery, DailyManpowerReport>
{
    private readonly IApplicationDbContext _db;
    public GetDailyManpowerReportQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<DailyManpowerReport> Handle(GetDailyManpowerReportQuery request, CancellationToken cancellationToken)
    {
        var shifts = await _db.SecurityShifts.AsNoTracking()
            .Where(x => x.ShiftDate == request.Date)
            .ToListAsync(cancellationToken);

        var required = shifts.Sum(s =>
            string.Equals(s.ShiftType, ShiftTypes.Day, StringComparison.OrdinalIgnoreCase)
                ? SecurityOpsReportingRules.RequiredGuardsDayShift
                : SecurityOpsReportingRules.RequiredGuardsNightShift);

        var shiftIds = shifts.Select(s => s.Id).ToList();
        var deployed = shiftIds.Count == 0
            ? 0
            : await _db.SecurityShiftDeployments.AsNoTracking().CountAsync(x => shiftIds.Contains(x.ShiftId), cancellationToken);

        var shortage = Math.Max(0, required - deployed);
        return new DailyManpowerReport(request.Date, required, deployed, shortage);
    }
}

public sealed record GetMonthlyShortageReportQuery(string Month) : IRequest<MonthlyShortageReport>;

public sealed class GetMonthlyShortageReportQueryHandler : IRequestHandler<GetMonthlyShortageReportQuery, MonthlyShortageReport>
{
    private readonly IApplicationDbContext _db;
    public GetMonthlyShortageReportQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<MonthlyShortageReport> Handle(GetMonthlyShortageReportQuery request, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParse(request.Month + "-01", out var first))
            first = DateOnly.FromDateTime(DateTime.UtcNow);

        var y = first.Year;
        var m = first.Month;

        var totalShifts = await _db.SecurityShifts.AsNoTracking()
            .CountAsync(x => x.ShiftDate.Year == y && x.ShiftDate.Month == m, cancellationToken);

        var totalPatrols = await _db.PatrolLogs.AsNoTracking()
            .CountAsync(x => x.PatrolTime.Year == y && x.PatrolTime.Month == m, cancellationToken);

        var expectedPatrols = totalShifts * SecurityOpsReportingRules.ExpectedPatrolsPerShift;
        var compliance = expectedPatrols == 0
            ? 100m
            : Math.Round(Math.Min(100m, totalPatrols * 100m / expectedPatrols), 2);

        return new MonthlyShortageReport(request.Month, totalShifts, totalPatrols, compliance);
    }
}

public sealed record GetPatrolComplianceReportQuery(string Month) : IRequest<PatrolComplianceReport>;

public sealed class GetPatrolComplianceReportQueryHandler : IRequestHandler<GetPatrolComplianceReportQuery, PatrolComplianceReport>
{
    private readonly IApplicationDbContext _db;
    public GetPatrolComplianceReportQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PatrolComplianceReport> Handle(GetPatrolComplianceReportQuery request, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParse(request.Month + "-01", out var first))
            first = DateOnly.FromDateTime(DateTime.UtcNow);

        var y = first.Year;
        var m = first.Month;

        var shiftCount = await _db.SecurityShifts.AsNoTracking()
            .CountAsync(x => x.ShiftDate.Year == y && x.ShiftDate.Month == m, cancellationToken);

        var expectedPatrols = shiftCount * SecurityOpsReportingRules.ExpectedPatrolsPerShift;
        var completedPatrols = await _db.PatrolLogs.AsNoTracking()
            .CountAsync(x => x.PatrolTime.Year == y && x.PatrolTime.Month == m, cancellationToken);

        var missed = Math.Max(0, expectedPatrols - completedPatrols);
        return new PatrolComplianceReport(expectedPatrols, completedPatrols, missed);
    }
}

public sealed record GetAttendanceReportQuery(string Month) : IRequest<AttendanceReport>;

public sealed class GetAttendanceReportQueryHandler : IRequestHandler<GetAttendanceReportQuery, AttendanceReport>
{
    private readonly IApplicationDbContext _db;
    public GetAttendanceReportQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<AttendanceReport> Handle(GetAttendanceReportQuery request, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParse(request.Month + "-01", out var first))
            first = DateOnly.FromDateTime(DateTime.UtcNow);

        var y = first.Year;
        var m = first.Month;

        var shiftIds = await _db.SecurityShifts.AsNoTracking()
            .Where(s => s.ShiftDate.Year == y && s.ShiftDate.Month == m)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var patrolCounts = await _db.PatrolLogStaff.AsNoTracking()
            .Where(x => x.PatrolLog!.PatrolTime.Year == y && x.PatrolLog.PatrolTime.Month == m)
            .GroupBy(x => x.StaffId)
            .Select(g => new { StaffId = g.Key, C = g.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.C, cancellationToken);

        var deploymentCounts = shiftIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _db.SecurityShiftDeployments.AsNoTracking()
                .Where(d => shiftIds.Contains(d.ShiftId))
                .GroupBy(d => d.StaffId)
                .Select(g => new { StaffId = g.Key, C = g.Count() })
                .ToDictionaryAsync(x => x.StaffId, x => x.C, cancellationToken);

        var staffIds = patrolCounts.Keys.Union(deploymentCounts.Keys).Distinct().ToList();
        var names = await _db.SecurityStaff.AsNoTracking()
            .Where(s => staffIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name, cancellationToken);

        var items = staffIds
            .Select(id => new AttendanceReportItem(
                id,
                names.GetValueOrDefault(id) ?? "",
                patrolCounts.GetValueOrDefault(id),
                deploymentCounts.GetValueOrDefault(id)))
            .OrderByDescending(i => i.PatrolCount)
            .ToList();

        return new AttendanceReport(items);
    }
}
