using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Security.Dashboard;

public record GetSecurityOpsDashboardQuery(string From, string To, string? Label)
    : IRequest<SecurityOpsDashboardDto>;

public class GetSecurityOpsDashboardQueryHandler
    : IRequestHandler<GetSecurityOpsDashboardQuery, SecurityOpsDashboardDto>
{
    private readonly IApplicationDbContext _context;

    private static readonly List<SecDisplayRole> DisplayRoles =
    [
        new("Security Supervisor", 2, 2, k => k.Contains("SUPERVISOR")),
        new("Main Gate Guard", 6, 6, k => k.Contains("MAIN GATE") || (k.Contains("GATE") && !k.Contains("TOWER"))),
        new("Tower Guards", 8, 8, k => k.Contains("TOWER")),
        new("Lady Guards", 2, 2, k => k.Contains("LADY")),
    ];

    private static readonly List<(string Code, string Name)> HkRoleNames =
    [
        ("HK_SUPERVISOR", "Housekeeping Supervisor"),
        ("HK_STAFF", "Housekeeping Staff"),
        ("HK_GARDENER", "Gardener"),
        ("HK_ELECTRICIAN", "Electrician"),
        ("HK_PLUMBER", "Plumber"),
        ("HK_STP_OPERATOR", "STP/WTP/Pool Operator"),
    ];

    public GetSecurityOpsDashboardQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<SecurityOpsDashboardDto> Handle(
        GetSecurityOpsDashboardQuery request,
        CancellationToken cancellationToken)
    {
        if (!DateTime.TryParse(request.From, CultureInfo.InvariantCulture, out var fromDate) ||
            !DateTime.TryParse(request.To, CultureInfo.InvariantCulture, out var toDate))
        {
            return SecurityOpsDashboardDto.Invalid("Invalid date range.");
        }

        fromDate = UtcDates.ToUtcDate(fromDate);
        toDate = UtcDates.ToUtcDate(toDate);
        if (toDate < fromDate)
            return SecurityOpsDashboardDto.Invalid("End date must be on or after start date.");

        var rangeEnd = toDate.AddDays(1);
        var hkMatchers = await LoadHkRoleMatchersAsync(cancellationToken);
        var rates = await LoadSecurityRatesAsync(cancellationToken);
        var strengthByRole = await LoadSanctionedStrengthAsync(cancellationToken);

        var logs = await _context.SecurityDeploymentLogs
            .AsNoTracking()
            .Where(l =>
                l.LogDate >= fromDate &&
                l.LogDate < rangeEnd &&
                l.Module == DeploymentModules.Security)
            .ToListAsync(cancellationToken);

        var secLogs = logs;
        var dates = EnumerateDates(fromDate, toDate);
        var dayCount = Math.Max(1, dates.Count);

        var roleRows = new List<SecRoleRowDto>();
        foreach (var def in DisplayRoles)
        {
            ApplyStrengthOverride(def, strengthByRole);

            var s1Samples = new List<int>();
            var s2Samples = new List<int>();

            foreach (var day in dates)
            {
                var dayEnd = day.AddDays(1);
                var dayCountForRole = secLogs.Count(l =>
                    l.LogDate >= day && l.LogDate < dayEnd && def.Matches(RoleKey(l.Designation)));

                var (s1, s2) = SplitDeployed(dayCountForRole, def.ExpectedS1, def.ExpectedS2);
                s1Samples.Add(s1);
                s2Samples.Add(s2);
            }

            var actualS1 = s1Samples.Count > 0 ? (int)Math.Round(s1Samples.Average()) : 0;
            var actualS2 = s2Samples.Count > 0 ? (int)Math.Round(s2Samples.Average()) : 0;

            roleRows.Add(new SecRoleRowDto
            {
                Role = def.Role,
                Expected = Math.Max(def.ExpectedS1, def.ExpectedS2),
                ActualS1 = actualS1,
                ActualS2 = actualS2,
                DeploymentCount = secLogs.Count(l => def.Matches(RoleKey(l.Designation))),
            });
        }

        var totalDeployed = roleRows.Sum(r => r.ActualS1 + r.ActualS2);
        var totalRequired = roleRows.Sum(r => r.Expected * 2);
        var totalShortage = Math.Max(0, totalRequired - totalDeployed);
        var estimatedWages = EstimateWages(roleRows, rates, dayCount);

        return new SecurityOpsDashboardDto
        {
            PeriodLabel = request.Label ?? $"{fromDate:dd MMM} – {toDate:dd MMM yyyy}",
            From = fromDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            To = toDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            DayCount = dayCount,
            TotalDeployed = totalDeployed,
            TotalRequired = totalRequired,
            TotalShortage = totalShortage,
            EstimatedWages = Math.Round(estimatedWages, 0),
            Roles = roleRows,
        };
    }

    private static void ApplyStrengthOverride(SecDisplayRole def, Dictionary<string, (int S1, int S2)> strengthByRole)
    {
        var contractKey = def.Role switch
        {
            "Security Supervisor" => "SUPERVISOR",
            "Lady Guards" => "LADY_GUARD",
            "Main Gate Guard" or "Tower Guards" => "SECURITY_GUARD",
            _ => null,
        };

        if (contractKey is null || !strengthByRole.TryGetValue(NormalizeKey(contractKey), out var counts))
            return;

        if (def.Role is "Main Gate Guard" or "Tower Guards")
        {
            // Split SECURITY_GUARD strength across gate and tower when both use the same contract key.
            var halfS1 = Math.Max(1, counts.S1 / 2);
            var halfS2 = Math.Max(1, counts.S2 / 2);
            if (def.Role == "Main Gate Guard")
            {
                def.ExpectedS1 = halfS1;
                def.ExpectedS2 = halfS2;
            }
            else
            {
                def.ExpectedS1 = Math.Max(0, counts.S1 - halfS1);
                def.ExpectedS2 = Math.Max(0, counts.S2 - halfS2);
            }
            return;
        }

        def.ExpectedS1 = Math.Max(def.ExpectedS1, counts.S1);
        def.ExpectedS2 = Math.Max(def.ExpectedS2, counts.S2);
    }

    private async Task<Dictionary<string, (int S1, int S2)>> LoadSanctionedStrengthAsync(CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _context.SecuritySanctionedStrengths.AsNoTracking().ToListAsync(cancellationToken);
            return SanctionedStrengthAggregation.AggregateByRole(rows)
                .ToDictionary(
                    s => NormalizeKey(s.RoleName),
                    s => (s.Shift1Count, s.Shift2Count),
                    StringComparer.Ordinal);
        }
        catch
        {
            return new Dictionary<string, (int, int)>(StringComparer.Ordinal);
        }
    }

    private async Task<List<SecurityRoleRate>> LoadSecurityRatesAsync(CancellationToken cancellationToken)
    {
        try
        {
            var contract = await _context.SecurityVendorContracts
                .AsNoTracking()
                .Include(c => c.RoleRates)
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            return contract?.RoleRates?.ToList() ?? new List<SecurityRoleRate>();
        }
        catch
        {
            return new List<SecurityRoleRate>();
        }
    }

    private async Task<List<string>> LoadHkRoleMatchersAsync(CancellationToken cancellationToken)
    {
        var keys = new List<string>();
        try
        {
            var contract = await _context.HkVendorContracts
                .AsNoTracking()
                .Include(c => c.RoleRates)
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (contract?.RoleRates?.Count > 0)
            {
                foreach (var r in contract.RoleRates.Where(x => x.IsActive))
                {
                    keys.Add(NormalizeKey(r.RoleName));
                    keys.Add(NormalizeKey(r.RoleCode));
                }
                return keys;
            }
        }
        catch
        {
            /* migration may be pending */
        }

        foreach (var (_, name) in HkRoleNames)
            keys.Add(NormalizeKey(name));

        return keys;
    }

    private static bool IsHousekeepingDesignation(string? designation, List<string> hkKeys)
    {
        var key = RoleKey(designation);
        if (string.IsNullOrEmpty(key)) return false;
        return hkKeys.Any(h => h == key || key.Contains(h) || h.Contains(key));
    }

    private static decimal EstimateWages(List<SecRoleRowDto> rows, List<SecurityRoleRate> rates, int dayCount)
    {
        var dim = DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month);
        decimal total = 0;

        foreach (var row in rows)
        {
            var rate = ResolveRateForDeploymentRole(rates, row.Role);
            if (rate is null) continue;

            var monthly = rate.MonthlyRate > 0
                ? rate.MonthlyRate
                : rate.DailyRate * dim;
            if (monthly <= 0) continue;

            var perShift = monthly / (2m * dim);
            var present = row.ActualS1 + row.ActualS2;
            if (present <= 0) present = row.Expected * 2;
            total += present * perShift * dayCount;
        }

        return total;
    }

    private static SecurityRoleRate? ResolveRateForDeploymentRole(IReadOnlyList<SecurityRoleRate> rates, string deploymentRoleName)
    {
        var key = NormalizeKey(deploymentRoleName);
        if (key.Length == 0) return null;

        var exact = rates.FirstOrDefault(x => NormalizeKey(x.RoleName) == key);
        if (exact != null) return exact;

        if (key.Contains("LADY"))
            return rates.FirstOrDefault(x => NormalizeKey(x.RoleName) == "LADY_GUARD");
        if (key.Contains("SUPERVISOR"))
            return rates.FirstOrDefault(x => NormalizeKey(x.RoleName) == "SUPERVISOR");
        if (key.Contains("TOWER") || key.Contains("GATE") || key.Contains("GUARD"))
            return rates.FirstOrDefault(x => NormalizeKey(x.RoleName) == "SECURITY_GUARD");

        return null;
    }

    private static (int S1, int S2) SplitDeployed(int count, int expectedS1, int expectedS2)
    {
        var s1 = 0;
        var s2 = 0;
        for (var i = 0; i < count; i++)
        {
            if (s1 < expectedS1) s1++;
            else if (s2 < expectedS2) s2++;
            else s1++;
        }
        return (s1, s2);
    }

    private static List<DateTime> EnumerateDates(DateTime from, DateTime to)
    {
        var list = new List<DateTime>();
        var cur = UtcDates.ToUtcDate(from);
        var end = UtcDates.ToUtcDate(to);
        while (cur <= end && list.Count < 31)
        {
            list.Add(cur);
            cur = cur.AddDays(1);
        }
        return list;
    }

    private static string NormalizeKey(string? s) =>
        string.Join(' ', (s ?? "").Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private static string RoleKey(string? designation) => NormalizeKey(designation);

    private sealed class SecDisplayRole(string role, int expectedS1, int expectedS2, Func<string, bool> matcher)
    {
        public string Role { get; } = role;
        public int ExpectedS1 { get; set; } = expectedS1;
        public int ExpectedS2 { get; set; } = expectedS2;
        private readonly Func<string, bool> _matcher = matcher;

        public bool Matches(string key) => !string.IsNullOrEmpty(key) && _matcher(key);
    }
}

public class SecurityOpsDashboardDto
{
    public string PeriodLabel { get; set; } = "";
    public string From { get; set; } = "";
    public string To { get; set; } = "";
    public int DayCount { get; set; }
    public int TotalDeployed { get; set; }
    public int TotalRequired { get; set; }
    public int TotalShortage { get; set; }
    public decimal EstimatedWages { get; set; }
    public string? Message { get; set; }
    public List<SecRoleRowDto> Roles { get; set; } = new();

    public static SecurityOpsDashboardDto Invalid(string message) => new() { Message = message };
}

public class SecRoleRowDto
{
    public string Role { get; set; } = "";
    public int Expected { get; set; }
    public int ActualS1 { get; set; }
    public int ActualS2 { get; set; }
    public int DeploymentCount { get; set; }
}
