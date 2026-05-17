using Microsoft.EntityFrameworkCore;
using SecurityOps.Domain.Entities;
using SecurityOps.Infrastructure.Persistence;

namespace SecurityOps.Api.Auth;

public sealed class AuthUserSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthUserSeeder> _logger;

    public AuthUserSeeder(ApplicationDbContext db, IConfiguration configuration, ILogger<AuthUserSeeder> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (!await _db.Database.CanConnectAsync(cancellationToken))
                return;

            var seed = _configuration.GetSection("Auth:SeedUsers").Get<List<SeedUserConfig>>() ?? DefaultSeedUsers();
            var now = DateTime.UtcNow;
            var created = 0;

            foreach (var u in seed)
            {
                if (string.IsNullOrWhiteSpace(u.Username) || string.IsNullOrWhiteSpace(u.Password))
                    continue;

                var username = u.Username.Trim().ToLowerInvariant();
                var existing = await _db.SecurityAppUsers
                    .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);

                if (existing is not null)
                    continue;

                _db.SecurityAppUsers.Add(new SecurityAppUser
                {
                    Id = Guid.NewGuid(),
                    Username = username,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(u.Password),
                    Role = AppRoles.Normalize(u.Role),
                    DisplayName = u.DisplayName ?? u.Username,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }

            if (created > 0)
            {
                await _db.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Seeded {Count} app users ({Created} new)", seed.Count, created);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Auth user seed skipped (run migrations 009–010 if needed)");
        }
    }

    private static List<SeedUserConfig> DefaultSeedUsers() =>
    [
        // Quick test logins (use on login screen)
        new("demo", "demo123", AppRoles.Resident, "Demo Resident"),
        new("testadmin", "testadmin123", AppRoles.SuperAdmin, "Test Admin"),
        // Society
        new("resident1", "resident123", AppRoles.Resident, "Demo Resident"),
        new("owner1", "owner123", AppRoles.Owner, "Unit Owner"),
        new("president", "president123", AppRoles.President, "Society President"),
        new("secretary", "secretary123", AppRoles.Secretary, "Society Secretary"),
        new("vicepresident", "vicepres123", AppRoles.VicePresident, "Vice President"),
        new("treasurer", "treasurer123", AppRoles.Treasurer, "Treasurer"),
        new("boardmember", "board123", AppRoles.BoardMember, "Board Member"),
        // Operations
        new("superadmin", "superadmin123", AppRoles.SuperAdmin, "Super Administrator"),
        new("secsupervisor", "secsuper123", AppRoles.SecuritySupervisor, "Security Supervisor"),
        new("fm", "fm123", AppRoles.Fm, "Facility Manager"),
        new("afm", "afm123", AppRoles.Afm, "Assistant Facility Manager"),
        new("guard1", "guard123", AppRoles.SecurityGuard, "Security Guard"),
        // Legacy aliases (optional)
        new("admin", "dev-password", AppRoles.SuperAdmin, "Administrator"),
    ];

    private sealed record SeedUserConfig(string Username, string Password, string Role, string? DisplayName);
}
