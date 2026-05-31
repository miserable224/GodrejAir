using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Designations;

internal static class DesignationSeeder
{
    public static async Task<int> EnsureDefaultsAsync(
        IApplicationDbContext db,
        string module,
        CancellationToken cancellationToken)
    {
        var normalized = DesignationModuleRules.Normalize(module);
        var existingTitles = await db.DutyDesignations
            .Where(x => x.Module == normalized)
            .Select(x => x.Title.ToLower())
            .ToListAsync(cancellationToken);
        var existing = new HashSet<string>(existingTitles);

        var added = 0;
        foreach (var (title, sortOrder) in DesignationDefaults.ForModule(normalized))
        {
            var key = title.ToLower();
            if (existing.Contains(key)) continue;

            db.DutyDesignations.Add(new DutyDesignation
            {
                Module = normalized,
                Title = title,
                SortOrder = sortOrder,
                IsActive = true,
            });
            existing.Add(key);
            added++;
        }

        if (added > 0)
            await db.SaveChangesAsync(cancellationToken);

        return added;
    }
}
