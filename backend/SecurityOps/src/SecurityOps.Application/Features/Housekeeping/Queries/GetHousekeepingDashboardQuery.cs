using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Housekeeping.Queries;

public record GetHousekeepingDashboardQuery(string From, string To, string? Label)
    : IRequest<HousekeepingDashboardDto>;

public class GetHousekeepingDashboardQueryHandler
    : IRequestHandler<GetHousekeepingDashboardQuery, HousekeepingDashboardDto>
{
    private readonly IApplicationDbContext _context;

    private static readonly List<(string Code, string Name, decimal Monthly, int S1, int S2)> FallbackRates =
    [
        ("HK_SUPERVISOR", "Housekeeping Supervisor", 22400m, 1, 1),
        ("HK_STAFF", "Housekeeping Staff", 14850m, 12, 12),
        ("HK_GARDENER", "Gardener", 18200m, 2, 1),
        ("HK_ELECTRICIAN", "Electrician", 20500m, 2, 2),
        ("HK_PLUMBER", "Plumber", 19800m, 2, 2),
        ("HK_STP_OPERATOR", "STP/WTP/Pool Operator", 21200m, 2, 2),
    ];

    public GetHousekeepingDashboardQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<HousekeepingDashboardDto> Handle(
        GetHousekeepingDashboardQuery request,
        CancellationToken cancellationToken)
    {
        if (!DateTime.TryParse(request.From, CultureInfo.InvariantCulture, out var fromDate) ||
            !DateTime.TryParse(request.To, CultureInfo.InvariantCulture, out var toDate))
        {
            return HousekeepingDashboardDto.Invalid("Invalid date range.");
        }

        fromDate = UtcDates.ToUtcDate(fromDate);
        toDate = UtcDates.ToUtcDate(toDate);
        if (toDate < fromDate)
            return HousekeepingDashboardDto.Invalid("End date must be on or after start date.");

        var rangeEnd = toDate.AddDays(1);
        var rates = await LoadContractRatesAsync(cancellationToken);
        var roleMatchers = rates
            .Select(r => (Rate: r, Key: NormalizeKey(r.RoleName)))
            .ToList();

        var logs = await _context.SecurityDeploymentLogs
            .AsNoTracking()
            .Where(l =>
                l.LogDate >= fromDate &&
                l.LogDate < rangeEnd &&
                l.Module == DeploymentModules.Housekeeping)
            .ToListAsync(cancellationToken);

        var hkLogs = logs;

        var dates = EnumerateDates(fromDate, toDate);
        var dayCount = Math.Max(1, dates.Count);

        var roleRows = new List<HkRoleRowDto>();
        foreach (var rate in rates)
        {
            var expected = Math.Max(rate.Shift1Sanctioned, rate.Shift2Sanctioned);
            var s1Samples = new List<int>();
            var s2Samples = new List<int>();

            foreach (var day in dates)
            {
                var dayEnd = day.AddDays(1);
                var dayCountForRole = hkLogs.Count(l =>
                    l.LogDate >= day && l.LogDate < dayEnd &&
                    RoleKey(l.Designation) == NormalizeKey(rate.RoleName));

                var (s1, s2) = SplitDeployed(dayCountForRole, expected);
                s1Samples.Add(s1);
                s2Samples.Add(s2);
            }

            var actualS1 = s1Samples.Count > 0 ? (int)Math.Round(s1Samples.Average()) : 0;
            var actualS2 = s2Samples.Count > 0 ? (int)Math.Round(s2Samples.Average()) : 0;

            roleRows.Add(new HkRoleRowDto
            {
                RoleCode = rate.RoleCode,
                Role = rate.RoleName,
                Expected = expected,
                ActualS1 = actualS1,
                ActualS2 = actualS2,
                DeploymentCount = hkLogs.Count(l => RoleKey(l.Designation) == NormalizeKey(rate.RoleName)),
            });
        }

        var totalDeployed = roleRows.Sum(r => r.ActualS1 + r.ActualS2);
        var totalRequired = roleRows.Sum(r => r.Expected * 2);
        var totalShortage = Math.Max(0, totalRequired - totalDeployed);
        var estimatedWages = EstimateWages(roleRows, rates, dayCount);

        return new HousekeepingDashboardDto
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

    private async Task<List<HkRateRow>> LoadContractRatesAsync(CancellationToken cancellationToken)
    {
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
                return contract.RoleRates
                    .Where(r => r.IsActive)
                    .Select(r => new HkRateRow(
                        r.RoleCode,
                        r.RoleName,
                        r.MonthlyRate,
                        r.Shift1Sanctioned,
                        r.Shift2Sanctioned))
                    .ToList();
            }
        }
        catch
        {
            // Tables may not exist until migration 015 is applied.
        }

        return FallbackRates
            .Select(r => new HkRateRow(r.Code, r.Name, r.Monthly, r.S1, r.S2))
            .ToList();
    }

    private static bool MatchesHkRole(string? designation, List<(HkRateRow Rate, string Key)> matchers)
    {
        var key = RoleKey(designation);
        if (string.IsNullOrEmpty(key)) return false;
        return matchers.Any(m => m.Key == key || key.Contains(m.Key) || m.Key.Contains(key));
    }

    private static (int S1, int S2) SplitDeployed(int count, int expectedPerShift)
    {
        var s1 = 0;
        var s2 = 0;
        for (var i = 0; i < count; i++)
        {
            if (s1 < expectedPerShift) s1++;
            else if (s2 < expectedPerShift) s2++;
            else s1++;
        }
        return (s1, s2);
    }

    private static decimal EstimateWages(List<HkRoleRowDto> rows, List<HkRateRow> rates, int dayCount)
    {
        var dim = DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month);
        decimal total = 0;
        foreach (var row in rows)
        {
            var rate = rates.FirstOrDefault(r => NormalizeKey(r.RoleName) == NormalizeKey(row.Role));
            if (rate is null || rate.MonthlyRate <= 0) continue;
            var perShift = rate.MonthlyRate / (2m * dim);
            var present = row.ActualS1 + row.ActualS2;
            if (present <= 0) present = (row.Expected * 2);
            total += present * perShift * dayCount;
        }
        return total;
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

    private sealed record HkRateRow(string RoleCode, string RoleName, decimal MonthlyRate, int Shift1Sanctioned, int Shift2Sanctioned);
}

public class HousekeepingDashboardDto
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
    public List<HkRoleRowDto> Roles { get; set; } = new();

    public static HousekeepingDashboardDto Invalid(string message) => new() { Message = message };
}

public class HkRoleRowDto
{
    public string RoleCode { get; set; } = "";
    public string Role { get; set; } = "";
    public int Expected { get; set; }
    public int ActualS1 { get; set; }
    public int ActualS2 { get; set; }
    public int DeploymentCount { get; set; }
}
