namespace SecurityOps.Domain.Entities;

/// <summary>
/// One row per role + shift_type in Supabase (security_sanctioned_strength).
/// Aggregate rows by role in SanctionedStrengthAggregation (Application layer).
/// </summary>
public class SecuritySanctionedStrength : AuditableEntity
{
    public string RoleName { get; set; } = string.Empty;
    public string ShiftType { get; set; } = string.Empty;
    public int RequiredCount { get; set; }
}
