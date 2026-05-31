namespace SecurityOps.Domain;

public static class DesignationDefaults
{
    public static readonly IReadOnlyList<(string Module, string Title, int SortOrder)> All =
    [
        (DeploymentModules.Housekeeping, "Facility Manager", 1),
        (DeploymentModules.Housekeeping, "Assistant Facility Manager", 2),
        (DeploymentModules.Housekeeping, "CRM / Accountant", 3),
        (DeploymentModules.Housekeeping, "Front Office Exe / Helpdesk", 4),
        (DeploymentModules.Housekeeping, "Housekeeping Supervisor", 5),
        (DeploymentModules.Housekeeping, "Housekeeping Staff", 6),
        (DeploymentModules.Housekeeping, "Gardener", 7),
        (DeploymentModules.Housekeeping, "Electrician", 8),
        (DeploymentModules.Housekeeping, "Plumber", 9),
        (DeploymentModules.Housekeeping, "STP/WTP/Pool Operator", 10),
        (DeploymentModules.Security, "Security Supervisor", 1),
        (DeploymentModules.Security, "Main Gate Guard", 2),
        (DeploymentModules.Security, "Tower Guards", 3),
        (DeploymentModules.Security, "Lady Guards", 4),
    ];

    public static IReadOnlyList<(string Title, int SortOrder)> ForModule(string module) =>
        All.Where(x => x.Module == module).Select(x => (x.Title, x.SortOrder)).ToList();
}
