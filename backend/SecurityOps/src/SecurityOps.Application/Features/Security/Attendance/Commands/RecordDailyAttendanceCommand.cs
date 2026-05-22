using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;
using System.Linq;

namespace SecurityOps.Application.Features.Attendance.Commands;

public record RecordDailyAttendanceCommand : IRequest<Guid>
{
    public string Module { get; set; } = DeploymentModules.Security;

    public DateTime Date { get; set; }
    public List<AttendanceEntryDto> Entries { get; set; } = new();
    /// <summary>Legacy single log (still supported).</summary>
    public DeploymentContextDto? DeploymentContext { get; set; }
    /// <summary>Multiple staff deployment logs in one request.</summary>
    public List<DeploymentContextDto> DeploymentContexts { get; set; } = new();
}

public record AttendanceEntryDto
{
    public string RoleName { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public int DeployedCount { get; set; }
}

public record DeploymentContextDto
{
    public string Designation { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public List<string> PhotoUrls { get; set; } = new();
    public double? PhotoLatitude { get; set; }
    public double? PhotoLongitude { get; set; }
    public double? PhotoAccuracyMeters { get; set; }
    public DateTime? PhotoCapturedAt { get; set; }
}

public class RecordDailyAttendanceCommandHandler : IRequestHandler<RecordDailyAttendanceCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public RecordDailyAttendanceCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<Guid> Handle(RecordDailyAttendanceCommand request, CancellationToken cancellationToken)
    {
        var activeContract = await _context.SecurityVendorContracts
            .Include(x => x.RoleRates)
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeContract == null) throw new InvalidOperationException("No active contract found");

        var strengthRows = await _context.SecuritySanctionedStrengths
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var strengthsByRole = SanctionedStrengthAggregation.AggregateByRole(strengthRows);

        var (attendanceDate, attendanceDateEnd) = UtcDates.UtcDayRange(request.Date);

        // Total deployment (headcount) and individual deployment (staff photo log) are separate forms.
        // Only replace daily summaries when explicit attendance entries are posted.
        if (request.Entries.Count > 0)
        {
            var existing = await _context.SecurityDailyAttendanceSummaries
                .Where(x => x.Date >= attendanceDate && x.Date < attendanceDateEnd)
                .ToListAsync(cancellationToken);

            if (existing.Count > 0)
                _context.SecurityDailyAttendanceSummaries.RemoveRange(existing);

            foreach (var entry in request.Entries)
            {
                var strength = SanctionedStrengthAggregation.FindByRole(strengthsByRole, entry.RoleName);

                var rate = activeContract.RoleRates
                    .FirstOrDefault(x => string.Equals(x.RoleName, entry.RoleName, StringComparison.OrdinalIgnoreCase));

                if (strength == null || rate == null) continue;

                int required = SanctionedStrengthAggregation.RequiredForShift(strength, entry.ShiftName);
                var deployed = entry.DeployedCount;
                var shortage = Math.Max(0, required - deployed);

                var summary = new SecurityDailyAttendanceSummary
                {
                    Date = attendanceDate,
                    RoleName = entry.RoleName.Trim(),
                    ShiftName = AttendanceShiftMapping.ToDbShiftType(entry.ShiftName),
                    RequiredCount = required,
                    DeployedCount = deployed,
                    ShortageCount = shortage,
                    DailyRate = rate.DailyRate,
                    ShortagePenalty = shortage * rate.DailyRate,
                };

                _context.SecurityDailyAttendanceSummaries.Add(summary);
            }
        }

        var deploymentContexts = request.DeploymentContexts.Count > 0
            ? request.DeploymentContexts
            : request.DeploymentContext is not null
                ? new List<DeploymentContextDto> { request.DeploymentContext }
                : new List<DeploymentContextDto>();

        Guid deploymentLogId = Guid.Empty;
        foreach (var ctx in deploymentContexts)
        {
            if (string.IsNullOrWhiteSpace(ctx.StaffName) || string.IsNullOrWhiteSpace(ctx.Location))
                continue;

            var staff = await SecurityOpsResolver.ResolveStaffByNameOrBadgeAsync(_context, ctx.StaffName, cancellationToken);
            var locationId = await SecurityOpsResolver.ResolveLocationIdAsync(_context, ctx.Location, cancellationToken);

            var log = new SecurityDeploymentLog
            {
                Module = string.IsNullOrWhiteSpace(request.Module)
                    ? DeploymentModules.Security
                    : request.Module.Trim().ToLowerInvariant(),
                LogDate = attendanceDate,
                Designation = string.IsNullOrWhiteSpace(ctx.Designation) ? null : ctx.Designation.Trim(),
                StaffName = ctx.StaffName.Trim(),
                LocationName = ctx.Location.Trim(),
                StaffId = staff?.Id,
                LocationId = locationId,
                Latitude = ctx.PhotoLatitude,
                Longitude = ctx.PhotoLongitude,
                AccuracyMeters = ctx.PhotoAccuracyMeters,
                PhotoCapturedAt = UtcDates.ToUtc(ctx.PhotoCapturedAt),
            };
            _context.SecurityDeploymentLogs.Add(log);

            var order = 0;
            foreach (var url in ctx.PhotoUrls.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct())
            {
                _context.SecurityDeploymentPhotos.Add(new SecurityDeploymentPhoto
                {
                    DeploymentLog = log,
                    PhotoUrl = url.Trim(),
                    DisplayOrder = order++,
                });
            }

            deploymentLogId = log.Id;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return deploymentLogId == Guid.Empty ? Guid.NewGuid() : deploymentLogId;
    }
}
