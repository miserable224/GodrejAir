namespace SecurityOps.Application.Common;

/// <summary>Normalize DateTime values for PostgreSQL timestamptz (Npgsql requires UTC).</summary>
public static class UtcDates
{
    /// <summary>Start of calendar day at 00:00:00 UTC.</summary>
    public static DateTime ToUtcDate(DateTime value)
    {
        var calendarDay = value.Kind switch
        {
            DateTimeKind.Utc => value.Date,
            DateTimeKind.Local => value.ToUniversalTime().Date,
            _ => value.Date,
        };
        return DateTime.SpecifyKind(calendarDay, DateTimeKind.Utc);
    }

    public static DateTime ToUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

    public static DateTime? ToUtc(DateTime? value) =>
        value is null ? null : ToUtc(value.Value);

    public static (DateTime Start, DateTime EndExclusive) UtcDayRange(DateTime value)
    {
        var start = ToUtcDate(value);
        return (start, start.AddDays(1));
    }
}
