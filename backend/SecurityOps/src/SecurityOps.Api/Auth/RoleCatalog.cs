namespace SecurityOps.Api.Auth;

public static class RoleCatalog
{
    public static readonly IReadOnlyList<RoleInfo> All =
    [
        // Society
        new(AppRoles.Resident, "Resident", "society"),
        new(AppRoles.Owner, "Owner", "society"),
        new(AppRoles.BoardMember, "Board Member", "society"),
        new(AppRoles.President, "President", "society"),
        new(AppRoles.Secretary, "Secretary", "society"),
        new(AppRoles.VicePresident, "Vice President", "society"),
        new(AppRoles.Treasurer, "Treasurer", "society"),
        // Operations
        new(AppRoles.SuperAdmin, "Super Admin", "operations"),
        new(AppRoles.SecuritySupervisor, "Security Supervisor", "operations"),
        new(AppRoles.SecurityGuard, "Security Guard", "operations"),
        new(AppRoles.Fm, "Facility Manager (FM)", "operations"),
        new(AppRoles.Afm, "Assistant Facility Manager (AFM)", "operations"),
    ];
}

public sealed record RoleInfo(string Code, string Label, string Category);
