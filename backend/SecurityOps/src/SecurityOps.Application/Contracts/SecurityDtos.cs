namespace SecurityOps.Application.Contracts;

// --- Staff ---
public sealed record StaffResponse(
    Guid Id,
    string Name,
    string? BadgeNumber,
    string Role,
    string? Phone,
    bool IsActive,
    DateTime CreatedAt);

public sealed record CreateStaffRequest(string Name, string? BadgeNumber, string Role, string? Phone);
public sealed record UpdateStaffRequest(string Name, string? BadgeNumber, string Role, string? Phone, bool IsActive);

// --- Locations ---
public sealed record LocationResponse(Guid Id, string Name, string? Code, string? Description, double? Latitude, double? Longitude, bool IsActive);
public sealed record CreateLocationRequest(string Name, string? Code, string? Description, double? Latitude, double? Longitude);
public sealed record UpdateLocationRequest(string Name, string? Code, string? Description, double? Latitude, double? Longitude, bool IsActive);

// --- Shifts ---
public sealed record ShiftResponse(
    Guid Id,
    DateOnly ShiftDate,
    string ShiftType,
    Guid? SupervisorId,
    string Status,
    string? Notes,
    DateTime CreatedAt);

public sealed record CreateShiftRequest(DateOnly ShiftDate, string ShiftType, Guid? SupervisorId, string? Notes, string Status = "PLANNED");
public sealed record UpdateShiftRequest(DateOnly ShiftDate, string ShiftType, Guid? SupervisorId, string? Notes, string Status);

// --- Deployments ---
public sealed record DeploymentResponse(Guid Id, Guid ShiftId, Guid StaffId, Guid LocationId, bool IsLastGuard);

public sealed record BulkDeploymentRequest(Guid ShiftId, IReadOnlyList<DeploymentLine> Deployments);
public sealed record DeploymentLine(Guid StaffId, Guid LocationId, bool IsLastGuard = false);

// --- Patrols ---
public sealed record CreatePatrolRequest(
    Guid ShiftId,
    Guid RecordedBy,
    DateTime PatrolTime,
    string PatrolType,
    string? Remarks,
    double? Latitude,
    double? Longitude,
    IReadOnlyList<Guid> StaffIds,
    IReadOnlyList<string> Photos);

/// <summary>Mobile admin patrol modal — staff name + photo URLs after upload.</summary>
public sealed record CreateMobilePatrolRequest(
    string StaffName,
    string? LocationName,
    string? Remarks,
    DateTime PatrolTime,
    double? Latitude,
    double? Longitude,
    IReadOnlyList<string> PhotoUrls,
    string PatrolType = "REGULAR");

public sealed record PatrolPhotoResponse(Guid Id, string PhotoUrl, int DisplayOrder);
public sealed record PatrolStaffResponse(Guid StaffId, string? StaffName);
public sealed record PatrolResponse(
    Guid Id,
    Guid ShiftId,
    Guid RecordedBy,
    DateTime PatrolTime,
    string PatrolType,
    string? Remarks,
    double? Latitude,
    double? Longitude,
    IReadOnlyList<PatrolStaffResponse> Staff,
    IReadOnlyList<PatrolPhotoResponse> Photos);

// --- Reports ---
public sealed record DailyManpowerReport(DateOnly Date, int RequiredManpower, int DeployedManpower, int Shortage);
public sealed record MonthlyShortageReport(string Month, int TotalShifts, int TotalPatrols, decimal CompliancePercent);
public sealed record PatrolComplianceReport(int ExpectedPatrols, int CompletedPatrols, int MissedPatrols);
public sealed record AttendanceReportItem(Guid StaffId, string StaffName, int PatrolCount, int ShiftDeploymentCount);
public sealed record AttendanceReport(IReadOnlyList<AttendanceReportItem> Items);
