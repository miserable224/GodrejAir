namespace SecurityOps.Api.Auth;

/// <summary>
/// Application roles for Godrej Air (society members, board, and operations staff).
/// </summary>
public static class AppRoles
{
    // ── Society / residents ─────────────────────────────────────────────────
    public const string Resident = "RESIDENT";
    public const string Owner = "OWNER";
    public const string BoardMember = "BOARD_MEMBER";
    public const string President = "PRESIDENT";
    public const string Secretary = "SECRETARY";
    public const string VicePresident = "VICE_PRESIDENT";
    public const string Treasurer = "TREASURER";

    // ── Operations / admin ──────────────────────────────────────────────────
    public const string SuperAdmin = "SUPER_ADMIN";
    public const string SecuritySupervisor = "SECURITY_SUPERVISOR";
    public const string SecurityGuard = "SECURITY_GUARD";
    public const string Fm = "FM";
    public const string Afm = "AFM";

    /** @deprecated Use <see cref="SuperAdmin"/> */
    public const string Admin = "ADMIN";

    /** @deprecated Use <see cref="SecuritySupervisor"/> */
    public const string Supervisor = "SUPERVISOR";

    private static readonly HashSet<string> ValidRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        Resident, Owner, BoardMember, President, Secretary, VicePresident, Treasurer,
        SuperAdmin, SecuritySupervisor, SecurityGuard, Fm, Afm,
        Admin, Supervisor,
    };

    /// <summary>Canonical role string (handles legacy ADMIN / SUPERVISOR aliases).</summary>
    public static string Normalize(string? role)
    {
        var r = (role ?? Resident).Trim().ToUpperInvariant();
        return r switch
        {
            Admin => SuperAdmin,
            Supervisor => SecuritySupervisor,
            _ => ValidRoles.Contains(r) ? r : Resident,
        };
    }

    public static bool IsValid(string? role) =>
        ValidRoles.Contains((role ?? "").Trim());

    // ── Authorization policy groups (comma-separated for [Authorize(Roles = …)]) ──

    public const string SuperAdminOnly = $"{SuperAdmin},{Admin}";

    public const string SocietyResidents =
        $"{Resident},{Owner},{BoardMember},{President},{Secretary},{VicePresident},{Treasurer}";

    public const string SocietyBoard =
        $"{BoardMember},{President},{Secretary},{VicePresident},{Treasurer},{SuperAdmin},{Admin}";

    public const string OperationsManagement =
        $"{SuperAdmin},{Admin},{SecuritySupervisor},{Supervisor},{Fm},{Afm}";

    public const string SecurityOperationsStaff =
        $"{SuperAdmin},{Admin},{SecuritySupervisor},{Supervisor},{SecurityGuard},{Fm},{Afm}";

    public const string FmHkStaff = $"{SuperAdmin},{Admin},{Fm},{Afm},{SecuritySupervisor},{Supervisor}";

    /** Any signed-in app user (society + operations). */
    public const string AllAuthenticated =
        $"{SocietyResidents},{SecurityOperationsStaff}";

    // Backward-compatible names used on existing controllers
    public const string AdminOrSupervisor = OperationsManagement;
    public const string AllStaff = SecurityOperationsStaff;
}
