using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Domain.Entities;
using SecurityOps.Infrastructure.Persistence;

namespace SecurityOps.Api.Auth;

public sealed class AdminOtpService
{
    private const string Purpose = "ADMIN_LOGIN";
    private const int OtpLength = 6;
    private const int OtpTtlMinutes = 10;
    private const int MinResendSeconds = 60;

    private readonly ApplicationDbContext _db;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AdminOtpService> _logger;

    public AdminOtpService(
        ApplicationDbContext db,
        IEmailSender email,
        IConfiguration config,
        IWebHostEnvironment env,
        ILogger<AdminOtpService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _env = env;
        _logger = logger;
    }

    public static bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) &&
        Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    public async Task<SendOtpResult> SendOtpAsync(string email, CancellationToken ct)
    {
        var normalized = NormalizeEmail(email);
        var recent = await _db.SecurityEmailOtps
            .Where(x => x.Email == normalized && x.Purpose == Purpose && x.UsedAt == null)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (recent is not null && recent.CreatedAt > DateTime.UtcNow.AddSeconds(-MinResendSeconds))
        {
            return SendOtpResult.Fail($"Please wait {MinResendSeconds} seconds before requesting another OTP.");
        }

        var otp = GenerateOtp();
        var now = DateTime.UtcNow;

        _db.SecurityEmailOtps.Add(new SecurityEmailOtp
        {
            Id = Guid.NewGuid(),
            Email = normalized,
            OtpHash = HashOtp(otp),
            Purpose = Purpose,
            ExpiresAt = now.AddMinutes(OtpTtlMinutes),
            CreatedAt = now,
        });
        await _db.SaveChangesAsync(ct);

        await _email.SendOtpAsync(normalized, otp, ct);
        _logger.LogInformation("Admin OTP sent to {Email}", normalized);

        var devExpose = _env.IsDevelopment() && _config.GetValue("Email:ExposeOtpInResponse", true);
        return SendOtpResult.Ok(
            $"OTP sent to {normalized}. Check your inbox.",
            devExpose ? otp : null);
    }

    public async Task<(SecurityAppUser User, bool Created)> VerifyAndGetOrCreateUserAsync(
        string email,
        string otp,
        string? displayName,
        CancellationToken ct)
    {
        var normalized = NormalizeEmail(email);
        var code = otp.Trim();

        var record = await _db.SecurityEmailOtps
            .Where(x => x.Email == normalized && x.Purpose == Purpose && x.UsedAt == null)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (record is null || record.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("OTP expired or not found. Request a new code.");

        if (!string.Equals(record.OtpHash, HashOtp(code), StringComparison.Ordinal))
            throw new InvalidOperationException("Invalid OTP. Please try again.");

        record.UsedAt = DateTime.UtcNow;

        var user = await _db.SecurityAppUsers
            .FirstOrDefaultAsync(u => u.Email == normalized, ct);

        var created = false;
        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(displayName))
                throw new InvalidOperationException("Full name is required to create your admin account.");

            var name = displayName.Trim();
            var username = normalized.Split('@')[0];
            var suffix = 0;
            while (await _db.SecurityAppUsers.AnyAsync(u => u.Username == username, ct))
            {
                suffix++;
                username = $"{normalized.Split('@')[0]}{suffix}";
            }

            var now = DateTime.UtcNow;
            user = new SecurityAppUser
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = normalized,
                DisplayName = name,
                Role = AppRoles.SuperAdmin,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.SecurityAppUsers.Add(user);
            created = true;
            _logger.LogInformation("Created admin user {Email} as {Role}", normalized, user.Role);
        }
        else if (!user.IsActive)
        {
            throw new InvalidOperationException("This account is disabled.");
        }
        else if (!string.IsNullOrWhiteSpace(displayName))
        {
            user.DisplayName = displayName.Trim();
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return (user, created);
    }

    private static string GenerateOtp()
    {
        var n = RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, OtpLength));
        return n.ToString().PadLeft(OtpLength, '0');
    }

    private static string HashOtp(string otp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(otp.Trim())));

    public sealed record SendOtpResult(bool Success, string Message, string? DevOtp)
    {
        public static SendOtpResult Ok(string message, string? devOtp) => new(true, message, devOtp);
        public static SendOtpResult Fail(string message) => new(false, message, null);
    }
}
