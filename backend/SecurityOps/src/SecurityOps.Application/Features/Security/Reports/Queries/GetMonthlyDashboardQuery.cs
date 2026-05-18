using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Reports.Queries;

public record GetMonthlyDashboardQuery(string Month) : IRequest<MonthlyDashboardDto>;

public class GetMonthlyDashboardQueryHandler : IRequestHandler<GetMonthlyDashboardQuery, MonthlyDashboardDto>
{
    private readonly IApplicationDbContext _context;

    public GetMonthlyDashboardQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<MonthlyDashboardDto> Handle(GetMonthlyDashboardQuery request, CancellationToken cancellationToken)
    {
        var startDate = DateTime.Parse(request.Month + "-01");
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var summaries = await _context.SecurityDailyAttendanceSummaries
            .Where(x => x.Date >= startDate && x.Date <= endDate)
            .ToListAsync(cancellationToken);

        var billing = await _context.SecurityMonthlyBillings
            .FirstOrDefaultAsync(x => x.BillingMonth == request.Month, cancellationToken);

        return new MonthlyDashboardDto
        {
            Month = request.Month,
            AttendanceTrend = summaries.GroupBy(x => x.Date)
                .Select(g => new DailyTrendDto 
                { 
                    Date = g.Key, 
                    Shortages = g.Sum(x => x.ShortageCount) 
                }).OrderBy(x => x.Date).ToList(),
            OverallShortagePercentage = summaries.Sum(x => x.RequiredCount) > 0 
                ? (decimal)summaries.Sum(x => x.ShortageCount) / summaries.Sum(x => x.RequiredCount) * 100 
                : 0,
            BillingStatus = billing?.Status ?? "NOT_GENERATED",
            CurrentGrandTotal = billing?.GrandTotal ?? 0
        };
    }
}

public class MonthlyDashboardDto
{
    public string Month { get; set; } = string.Empty;
    public List<DailyTrendDto> AttendanceTrend { get; set; } = new();
    public decimal OverallShortagePercentage { get; set; }
    public string BillingStatus { get; set; } = string.Empty;
    public decimal CurrentGrandTotal { get; set; }
}

public class DailyTrendDto
{
    public DateTime Date { get; set; }
    public int Shortages { get; set; }
}
