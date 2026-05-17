namespace SecurityOps.Application.Common;

public static class AttendanceShiftMapping
{
    public static string ToDbShiftType(string apiShiftName) =>
        (apiShiftName ?? string.Empty).Trim() switch
        {
            "Shift1" => "DAY",
            "Shift2" => "NIGHT",
            "Shift3" => "SHIFT3",
            "Gnl" => "GNL",
            "Reliever" => "RELIEVER",
            _ => (apiShiftName ?? string.Empty).Trim().ToUpperInvariant(),
        };

    public static string ToApiShiftName(string dbShiftType) =>
        (dbShiftType ?? string.Empty).Trim().ToUpperInvariant() switch
        {
            "DAY" => "Shift1",
            "NIGHT" => "Shift2",
            "SHIFT3" => "Shift3",
            "GNL" or "GENERAL" => "Gnl",
            "RELIEVER" or "REL" => "Reliever",
            _ => dbShiftType ?? string.Empty,
        };
}
