using SecurityOps.Domain.Enums;

namespace SecurityOps.Application.Common;

/// <summary>
/// Infer morning (DAY) vs night (NIGHT) from timestamp in India Standard Time.
/// Morning: 06:00–17:59 IST · Night: 18:00–05:59 IST.
/// </summary>
public static class DutyShiftInference
{
    private static readonly TimeSpan IstOffset = TimeSpan.FromHours(5.5);

    public static string InferShiftType(DateTime utcInstant)
    {
        var utc = utcInstant.Kind switch
        {
            DateTimeKind.Utc => utcInstant,
            DateTimeKind.Local => utcInstant.ToUniversalTime(),
            _ => DateTime.SpecifyKind(utcInstant, DateTimeKind.Utc),
        };

        var ist = utc.Add(IstOffset);
        var hour = ist.Hour;
        return hour is >= 6 and < 18 ? ShiftTypes.Day : ShiftTypes.Night;
    }

    public static string DisplayName(string? shiftType) =>
        string.IsNullOrWhiteSpace(shiftType)
            ? string.Empty
            : string.Equals(shiftType, ShiftTypes.Day, StringComparison.OrdinalIgnoreCase)
                ? "Morning shift"
                : "Night shift";

    public static DateTime ResolveInstantUtc(DateTime? capturedAt, DateTime fallbackUtc) =>
        capturedAt is { } c && c != default
            ? UtcDates.ToUtc(c)
            : UtcDates.ToUtc(fallbackUtc);
}
