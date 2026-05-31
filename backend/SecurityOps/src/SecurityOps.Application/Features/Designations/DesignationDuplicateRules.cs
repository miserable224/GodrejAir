using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Designations;

internal static class DesignationDuplicateRules
{
    public static string NormalizeTitle(string title) => title.Trim().ToLowerInvariant();

    /// <summary>
    /// True when another active designation in the module already uses this title.
    /// Inactive rows with the same title are removed so titles can be reused after delete.
    /// </summary>
    public static async Task EnsureTitleAvailableAsync(
        IApplicationDbContext db,
        string module,
        string title,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var key = NormalizeTitle(title);
        var rows = await db.DutyDesignations
            .Where(x => x.Module == module)
            .ToListAsync(cancellationToken);

        foreach (var inactive in rows.Where(x =>
                     !x.IsActive
                     && (!excludeId.HasValue || x.Id != excludeId.Value)
                     && NormalizeTitle(x.Title) == key))
        {
            db.DutyDesignations.Remove(inactive);
        }

        var activeDuplicate = rows.Any(x =>
            x.IsActive
            && (!excludeId.HasValue || x.Id != excludeId.Value)
            && NormalizeTitle(x.Title) == key);

        if (activeDuplicate)
        {
            var existing = rows.First(x =>
                x.IsActive
                && (!excludeId.HasValue || x.Id != excludeId.Value)
                && NormalizeTitle(x.Title) == key);
            throw new InvalidOperationException(
                $"\"{existing.Title}\" already exists. Select it in the list and use edit (pencil) to change it, or remove it first.");
        }
    }
}
