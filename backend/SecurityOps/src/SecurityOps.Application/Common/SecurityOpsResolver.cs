using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;
using SecurityOps.Domain.Enums;

namespace SecurityOps.Application.Common;

internal static class SecurityOpsResolver
{
    public static async Task<SecurityStaff?> ResolveStaffByNameOrBadgeAsync(
        IApplicationDbContext db,
        string? nameOrBadge,
        CancellationToken cancellationToken)
    {
        var q = (nameOrBadge ?? "").Trim();
        if (q.Length == 0) return null;

        var exact = await db.SecurityStaff.AsNoTracking()
            .Where(s => s.IsActive && (s.Name == q || s.BadgeNumber == q))
            .FirstOrDefaultAsync(cancellationToken);
        if (exact is not null) return exact;

        var needle = q.ToLowerInvariant();
        return await db.SecurityStaff.AsNoTracking()
            .Where(s => s.IsActive && s.Name.ToLower().Contains(needle))
            .OrderBy(s => s.Name.Length)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static async Task<SecurityStaff> ResolveRecorderStaffAsync(
        IApplicationDbContext db,
        SecurityStaff? patrolStaff,
        CancellationToken cancellationToken)
    {
        if (patrolStaff is not null) return patrolStaff;

        var supervisor = await db.SecurityStaff.AsNoTracking()
            .Where(s => s.IsActive && (
                s.Role == "SECURITY_SUPERVISOR" ||
                s.Role == "SUPERVISOR" ||
                s.Role == "ADMIN" ||
                s.Role == "SUPER_ADMIN"))
            .OrderBy(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (supervisor is not null) return supervisor;

        var any = await db.SecurityStaff.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (any is null)
            throw new InvalidOperationException("No security staff in roster. Add staff before logging patrols.");

        return any;
    }

    public static async Task<SecurityShift> GetOrCreateDayShiftAsync(
        IApplicationDbContext db,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var existing = await db.SecurityShifts
            .FirstOrDefaultAsync(
                s => s.ShiftDate == date && s.ShiftType == ShiftTypes.Day,
                cancellationToken);
        if (existing is not null) return existing;

        var shift = new SecurityShift
        {
            ShiftDate = date,
            ShiftType = ShiftTypes.Day,
            Status = "PLANNED",
        };
        db.SecurityShifts.Add(shift);
        await db.SaveChangesAsync(cancellationToken);
        return shift;
    }

    public static async Task<Guid?> ResolveLocationIdAsync(
        IApplicationDbContext db,
        string? locationName,
        CancellationToken cancellationToken)
    {
        var name = (locationName ?? "").Trim();
        if (name.Length == 0) return null;

        var exactName = name.ToLowerInvariant();
        var loc = await db.SecurityLocations.AsNoTracking()
            .Where(l => l.IsActive && l.Name.ToLower() == exactName)
            .Select(l => l.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (loc != Guid.Empty) return loc;

        loc = await db.SecurityLocations.AsNoTracking()
            .Where(l => l.IsActive && l.Name.ToLower().Contains(exactName))
            .Select(l => l.Id)
            .FirstOrDefaultAsync(cancellationToken);
        return loc == Guid.Empty ? null : loc;
    }
}
