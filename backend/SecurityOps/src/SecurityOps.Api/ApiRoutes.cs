namespace SecurityOps.Api;

/// <summary>
/// Canonical HTTP routes for the modular monolith (UI → single API).
/// </summary>
public static class ApiRoutes
{
    public const string AuthPrefix = "api/auth";

    public static class Security
    {
        public const string Prefix = "api/security";
        public const string DashboardPeriod = $"{Prefix}/dashboard/period";
        public const string DashboardMonthly = $"{Prefix}/dashboard/monthly";
        public const string Attendance = $"{Prefix}/attendance";
        public const string Billing = $"{Prefix}/billing";
        public const string Staff = $"{Prefix}/staff";
        public const string Patrols = $"{Prefix}/patrols";
        public const string Media = $"{Prefix}/media";
    }

    public static class Housekeeping
    {
        public const string Prefix = "api/housekeeping";
        public const string Dashboard = $"{Prefix}/dashboard";
    }
}
