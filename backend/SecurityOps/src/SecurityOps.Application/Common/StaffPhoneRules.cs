using System.Text.RegularExpressions;

namespace SecurityOps.Application.Common;

public static class StaffPhoneRules
{
    public static bool IsValidOptional(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return true;
        var digits = ExtractDigits(phone);
        return digits.Length == 10 && digits[0] is >= '6' and <= '9';
    }

  public static string? NormalizeOptional(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = ExtractDigits(phone);
        return digits.Length == 10 ? digits : null;
    }

    private static string ExtractDigits(string phone)
    {
        var digits = Regex.Replace(phone.Trim(), @"\D", "");
        if (digits.StartsWith("91", StringComparison.Ordinal) && digits.Length == 12)
            digits = digits[2..];
        if (digits.StartsWith('0') && digits.Length == 11)
            digits = digits[1..];
        return digits;
    }
}
