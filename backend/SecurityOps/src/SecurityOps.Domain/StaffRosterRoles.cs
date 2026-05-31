namespace SecurityOps.Domain;

/// <summary>Allowed values for security_staff.role (security + housekeeping roster).</summary>
public static class StaffRosterRoles
{
    public static readonly string[] Security =
    [
        "SECURITY_GUARD",
        "SUPERVISOR",
        "SECURITY_OFFICER",
        "ADMIN",
    ];

    public static readonly string[] Housekeeping =
    [
        "HOUSEKEEPING",
        "HK_SUPERVISOR",
        "HK_STAFF",
        "CLEANER",
    ];

    public static readonly string[] All =
    [
        ..Security,
        ..Housekeeping,
    ];

    public static bool IsAllowed(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        var key = role.Trim().ToUpperInvariant();
        return All.Any(r => r == key);
    }
}
