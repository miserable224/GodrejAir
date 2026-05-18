using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Reports.Queries;

public record GetRoleShortagesReportQuery(string Month) : IRequest<List<RoleShortageReportDto>>;

public class GetRoleShortagesReportQueryHandler : IRequestHandler<GetRoleShortagesReportQuery, List<RoleShortageReportDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRoleShortagesReportQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RoleShortageReportDto>> Handle(GetRoleShortagesReportQuery request, CancellationToken cancellationToken)
    {
        var startDate = DateTime.Parse(request.Month + "-01");
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var data = await _context.SecurityDailyAttendanceSummaries
            .Where(x => x.Date >= startDate && x.Date <= endDate)
            .GroupBy(x => x.RoleName)
            .Select(g => new RoleShortageReportDto
            {
                RoleName = g.Key,
                TotalShortages = g.Sum(x => x.ShortageCount),
                TotalPenalty = g.Sum(x => x.ShortagePenalty),
                ShortageDays = g.Count(x => x.ShortageCount > 0)
            })
            .ToListAsync(cancellationToken);

        return data;
    }
}

public class RoleShortageReportDto
{
    public string RoleName { get; set; } = string.Empty;
    public int TotalShortages { get; set; }
    public decimal TotalPenalty { get; set; }
    public int ShortageDays { get; set; }
}
