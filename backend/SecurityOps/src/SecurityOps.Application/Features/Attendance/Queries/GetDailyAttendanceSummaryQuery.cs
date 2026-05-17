using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Attendance.Queries;

public record GetDailyAttendanceSummaryQuery(DateTime Date) : IRequest<DailyAttendanceSummaryResponse>;

public class GetDailyAttendanceSummaryQueryHandler : IRequestHandler<GetDailyAttendanceSummaryQuery, DailyAttendanceSummaryResponse>
{
    private readonly IApplicationDbContext _context;

    public GetDailyAttendanceSummaryQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<DailyAttendanceSummaryResponse> Handle(
        GetDailyAttendanceSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var (dayStart, dayEnd) = UtcDates.UtcDayRange(request.Date);

        var entries = await _context.SecurityDailyAttendanceSummaries
            .Where(x => x.Date >= dayStart && x.Date < dayEnd)
            .ToListAsync(cancellationToken);

        return new DailyAttendanceSummaryResponse
        {
            Date = dayStart,
            TotalRequired = entries.Sum(x => x.RequiredCount),
            TotalDeployed = entries.Sum(x => x.DeployedCount),
            TotalShortage = entries.Sum(x => x.ShortageCount),
            TotalPenalty = entries.Sum(x => x.ShortagePenalty),
            Roles = entries.GroupBy(x => x.RoleName)
                .Select(g => new RoleSummaryDto
                {
                    RoleName = g.Key,
                    Required = g.Sum(x => x.RequiredCount),
                    Deployed = g.Sum(x => x.DeployedCount),
                    Shortage = g.Sum(x => x.ShortageCount),
                    Penalty = g.Sum(x => x.ShortagePenalty),
                }).ToList(),
        };
    }
}

public class DailyAttendanceSummaryResponse
{
    public DateTime Date { get; set; }
    public int TotalRequired { get; set; }
    public int TotalDeployed { get; set; }
    public int TotalShortage { get; set; }
    public decimal TotalPenalty { get; set; }
    public List<RoleSummaryDto> Roles { get; set; } = new();
}

public class RoleSummaryDto
{
    public string RoleName { get; set; } = string.Empty;
    public int Required { get; set; }
    public int Deployed { get; set; }
    public int Shortage { get; set; }
    public decimal Penalty { get; set; }
}
