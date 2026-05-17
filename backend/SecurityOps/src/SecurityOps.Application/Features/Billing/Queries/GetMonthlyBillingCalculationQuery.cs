using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Billing.Queries;

public record GetMonthlyBillingCalculationQuery(string Month) : IRequest<BillingCalculationResponse>;

public class GetMonthlyBillingCalculationQueryHandler : IRequestHandler<GetMonthlyBillingCalculationQuery, BillingCalculationResponse>
{
    private readonly IApplicationDbContext _context;

    public GetMonthlyBillingCalculationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BillingCalculationResponse> Handle(GetMonthlyBillingCalculationQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Month) ||
            !DateTime.TryParseExact(request.Month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            return BillingCalculationResponse.Empty(request.Month ?? "", "Invalid month. Use format yyyy-MM (e.g. 2026-05).");
        }

        SecurityVendorContract? activeContract;
        try
        {
            activeContract = await _context.SecurityVendorContracts
                .Include(x => x.RoleRates)
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return BillingCalculationResponse.Empty(
                request.Month,
                "Could not load vendor contract (check DB columns match the API). " + ex.Message);
        }

        if (activeContract == null)
            return BillingCalculationResponse.Empty(request.Month, "No active vendor contract. Configure one in security_vendor_contracts.");

        var startDate = DateTime.Parse(request.Month + "-01", CultureInfo.InvariantCulture);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        List<SecurityDailyAttendanceSummary> dailySummaries;
        try
        {
            dailySummaries = await _context.SecurityDailyAttendanceSummaries
                .Where(x => x.Date >= startDate && x.Date <= endDate)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return BillingCalculationResponse.Empty(
                request.Month,
                "Could not load attendance summaries. " + ex.Message);
        }

        List<SanctionedStrengthByRole> strengthsByRole;
        try
        {
            var strengthRows = await _context.SecuritySanctionedStrengths
                .AsNoTracking()
                .ToListAsync(cancellationToken);
            strengthsByRole = SanctionedStrengthAggregation.AggregateByRole(strengthRows);
        }
        catch (Exception ex)
        {
            return BillingCalculationResponse.Empty(
                request.Month,
                "Could not load sanctioned strength. " + ex.Message);
        }

        // 1. Calculate Base Amount (Sanctioned Strength * Monthly Rate)
        decimal grossBase = 0;
        var billingItems = new List<BillingItemPreviewDto>();
        var rates = activeContract.RoleRates.ToList();

        foreach (var strength in strengthsByRole)
        {
            var rate = ResolveRateForDeploymentRole(rates, strength.RoleName);
            if (rate == null) continue;

            var (perPaxMonthly, fromDailyFallback) = EffectivePerPaxMonthly(rate, startDate);
            decimal amount = strength.TotalExpected * perPaxMonthly;
            grossBase += amount;

            var basis = fromDailyFallback ? "daily×days" : "monthly";
            billingItems.Add(new BillingItemPreviewDto
            {
                Description = $"{strength.RoleName} ({strength.TotalExpected} pax, {basis})",
                Amount = amount,
                IsDeduction = false
            });
        }

        // 2. Shortage Deductions
        decimal totalShortageDeduction = dailySummaries.Sum(x => x.ShortagePenalty);
        int totalShortageCount = dailySummaries.Sum(x => x.ShortageCount);
        int totalRequiredCount = dailySummaries.Sum(x => x.RequiredCount);

        billingItems.Add(new BillingItemPreviewDto 
        { 
            Description = $"Shortage Deductions ({totalShortageCount} shifts)", 
            Amount = totalShortageDeduction, 
            IsDeduction = true 
        });

        // 3. High shortage penalty — deferred (no DB column yet); net still subtracts shortage deductions only.
        decimal highShortagePenalty = 0;
        decimal shortagePercentage = totalRequiredCount > 0 ? (decimal)totalShortageCount / totalRequiredCount * 100 : 0;

        decimal netBeforeTax = grossBase - totalShortageDeduction - highShortagePenalty;
        decimal serviceCharge = netBeforeTax * (activeContract.ServiceChargePercentage / 100);
        decimal taxableAmount = netBeforeTax + serviceCharge;
        decimal gst = taxableAmount * (activeContract.GstPercentage / 100);
        decimal grandTotal = taxableAmount + gst;

        string? zeroHint = null;
        if (grossBase == 0)
        {
            if (strengthsByRole.Count == 0)
                zeroHint = "No sanctioned strength rows in security_sanctioned_strength.";
            else if (rates.Count == 0)
                zeroHint = "No role rates on the active contract.";
            else if (!strengthsByRole.Any(s => s.TotalExpected > 0))
                zeroHint =
                    "Every sanctioned strength row has 0 required_count. Check role / shift_type rows on security_sanctioned_strength.";
            else if (strengthsByRole.All(s => ResolveRateForDeploymentRole(rates, s.RoleName) == null))
            {
                var sNames = string.Join(", ", strengthsByRole.Select(x => x.RoleName.Trim()).Distinct().Take(6));
                var rNames = string.Join(", ", rates.Select(x => x.RoleName.Trim()).Distinct().Take(6));
                zeroHint = $"No role rate matches strength role_name. Strength: [{sNames}]. Rates: [{rNames}]. Names must align (spacing/case ignored).";
            }
            else
                zeroHint =
                    "Rates match but amount is ₹0: set monthly_rate or daily_rate on security_role_rates (both were 0 for matched roles).";
        }

        return new BillingCalculationResponse
        {
            Month = request.Month,
            GrossBase = grossBase,
            TotalShortageDeduction = totalShortageDeduction,
            HighShortagePenalty = highShortagePenalty,
            ShortagePercentage = shortagePercentage,
            NetBeforeTax = netBeforeTax,
            ServiceCharge = serviceCharge,
            Gst = gst,
            GrandTotal = grandTotal,
            Items = billingItems,
            Message = zeroHint,
        };
    }

    /// <summary>
    /// Maps roster / sanctioned labels (e.g. "Tower Guards", "Main Gate Guard") to contract rate rows.
    /// Tower and main-gate posts use the SECURITY_GUARD tier unless a more specific label matches.
    /// </summary>
    private static SecurityRoleRate? ResolveRateForDeploymentRole(IReadOnlyList<SecurityRoleRate> rates, string deploymentRoleName)
    {
        var exact = FindRateForRole(rates, deploymentRoleName);
        if (exact != null) return exact;

        var key = NormalizeRole(deploymentRoleName);
        if (key.Length == 0) return null;

        if (key.Contains("LADY", StringComparison.Ordinal))
            return FindRateForContractRoleKey(rates, "LADY_GUARD");

        if (key.Contains("SECURITY", StringComparison.Ordinal) && key.Contains("OFFICER", StringComparison.Ordinal))
            return FindRateForContractRoleKey(rates, "SECURITY_OFFICER");

        if (key.Contains("HEAD", StringComparison.Ordinal) && key.Contains("GUARD", StringComparison.Ordinal))
            return FindRateForContractRoleKey(rates, "HEAD_GUARD");

        if (key.Contains("SUPERVISOR", StringComparison.Ordinal))
            return FindRateForContractRoleKey(rates, "SUPERVISOR");

        if (key.Contains("TOWER", StringComparison.Ordinal) ||
            key.Contains("MAIN GATE", StringComparison.Ordinal) ||
            key.Contains(" GATE", StringComparison.Ordinal) ||
            key.StartsWith("GATE ", StringComparison.Ordinal) ||
            key.Contains("PATROL", StringComparison.Ordinal) ||
            key.Contains("PERIMETER", StringComparison.Ordinal) ||
            key.Contains("GUARDS", StringComparison.Ordinal) ||
            key.EndsWith(" GUARD", StringComparison.Ordinal) ||
            key.EndsWith("GUARD", StringComparison.Ordinal))
            return FindRateForContractRoleKey(rates, "SECURITY_GUARD");

        return null;
    }

    private static SecurityRoleRate? FindRateForContractRoleKey(IReadOnlyList<SecurityRoleRate> rates, string contractRoleKey) =>
        rates.FirstOrDefault(x =>
            string.Equals(NormalizeRole(x.RoleName), NormalizeRole(contractRoleKey), StringComparison.Ordinal));

    private static SecurityRoleRate? FindRateForRole(IReadOnlyList<SecurityRoleRate> rates, string roleName)
    {
        var key = NormalizeRole(roleName);
        if (key.Length == 0) return null;
        return rates.FirstOrDefault(x =>
            string.Equals(NormalizeRole(x.RoleName), key, StringComparison.Ordinal));
    }

    /// <summary>Trim + case-fold + collapse internal whitespace (role labels often drift).</summary>
    private static string NormalizeRole(string? roleName)
    {
        var s = (roleName ?? string.Empty).Trim();
        if (s.Length == 0) return string.Empty;
        var parts = s.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts).ToUpperInvariant();
    }

    /// <summary>Prefer monthly_rate; if zero, approximate month from daily_rate × calendar days.</summary>
    private static (decimal perPaxMonthly, bool fromDailyFallback) EffectivePerPaxMonthly(SecurityRoleRate rate, DateTime monthStart)
    {
        if (rate.MonthlyRate > 0m)
            return (rate.MonthlyRate, false);
        var days = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
        if (rate.DailyRate > 0m && days > 0)
            return (rate.DailyRate * days, true);
        return (0m, false);
    }
}

public class BillingCalculationResponse
{
    public string Month { get; set; } = string.Empty;
    /// <summary>Null when successful; otherwise explains why totals are zero.</summary>
    public string? Message { get; set; }
    public decimal GrossBase { get; set; }
    public decimal TotalShortageDeduction { get; set; }
    public decimal HighShortagePenalty { get; set; }
    public decimal ShortagePercentage { get; set; }
    public decimal NetBeforeTax { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal Gst { get; set; }
    public decimal GrandTotal { get; set; }
    public List<BillingItemPreviewDto> Items { get; set; } = new();

    public static BillingCalculationResponse Empty(string month, string message) =>
        new()
        {
            Month = month,
            Message = message,
            Items = new List<BillingItemPreviewDto>
            {
                new() { Description = message, Amount = 0, IsDeduction = false },
            },
        };
}

public class BillingItemPreviewDto
{
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsDeduction { get; set; }
}
