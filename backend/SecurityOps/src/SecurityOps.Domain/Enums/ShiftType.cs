namespace SecurityOps.Domain.Enums;

public static class ShiftTypes
{
    public const string Day = "DAY";
    public const string Night = "NIGHT";

    public static bool IsValid(string? value) =>
        string.Equals(value, Day, StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, Night, StringComparison.OrdinalIgnoreCase);
}
