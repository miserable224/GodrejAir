using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Common;

public sealed record SanctionedStrengthByRole(
    string RoleName,
    int Shift1Count,
    int Shift2Count,
    int Shift3Count,
    int GeneralShiftCount,
    int RelieverCount)
{
    public int TotalExpected => Shift1Count + Shift2Count + Shift3Count + GeneralShiftCount + RelieverCount;
}

public static class SanctionedStrengthAggregation
{
    public static List<SanctionedStrengthByRole> AggregateByRole(IEnumerable<SecuritySanctionedStrength> rows)
    {
        var map = new Dictionary<string, (int S1, int S2, int S3, int Gnl, int Rel)>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var role = row.RoleName?.Trim() ?? string.Empty;
            if (role.Length == 0) continue;

            if (!map.TryGetValue(role, out var counts))
                counts = (0, 0, 0, 0, 0);

            counts = ApplyShift(counts, row.ShiftType, row.RequiredCount);
            map[role] = counts;
        }

        return map
            .Select(kv => new SanctionedStrengthByRole(
                kv.Key,
                kv.Value.S1,
                kv.Value.S2,
                kv.Value.S3,
                kv.Value.Gnl,
                kv.Value.Rel))
            .OrderBy(x => x.RoleName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static int RequiredForShift(SanctionedStrengthByRole? strength, string shiftName) =>
        strength is null
            ? 0
            : shiftName switch
            {
                "Shift1" => strength.Shift1Count,
                "Shift2" => strength.Shift2Count,
                "Shift3" => strength.Shift3Count,
                "Gnl" => strength.GeneralShiftCount,
                "Reliever" => strength.RelieverCount,
                _ => 0,
            };

    public static SanctionedStrengthByRole? FindByRole(
        IEnumerable<SanctionedStrengthByRole> aggregated,
        string roleName)
    {
        var key = NormalizeRole(roleName);
        if (key.Length == 0) return null;
        return aggregated.FirstOrDefault(x => NormalizeRole(x.RoleName) == key);
    }

    private static (int S1, int S2, int S3, int Gnl, int Rel) ApplyShift(
        (int S1, int S2, int S3, int Gnl, int Rel) counts,
        string? shiftType,
        int required)
    {
        return NormalizeShift(shiftType) switch
        {
            "DAY" or "SHIFT1" or "S1" => (required, counts.S2, counts.S3, counts.Gnl, counts.Rel),
            "NIGHT" or "SHIFT2" or "S2" => (counts.S1, required, counts.S3, counts.Gnl, counts.Rel),
            "SHIFT3" or "S3" => (counts.S1, counts.S2, required, counts.Gnl, counts.Rel),
            "GNL" or "GENERAL" => (counts.S1, counts.S2, counts.S3, required, counts.Rel),
            "RELIEVER" or "REL" => (counts.S1, counts.S2, counts.S3, counts.Gnl, required),
            _ => counts,
        };
    }

    private static string NormalizeShift(string? shiftType) =>
        (shiftType ?? string.Empty).Trim().ToUpperInvariant();

    private static string NormalizeRole(string? role) =>
        (role ?? string.Empty).Trim().ToUpperInvariant();
}
