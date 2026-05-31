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
            if (seed.Count == 0)
                return;

            var syncPasswords = _configuration.GetValue("Auth:SyncSeedPasswords", true);
            var deactivateOthers = _configuration.GetValue("Auth:DeactivateNonSeedUsers", true);
            var allowed = new HashSet<string>(
                seed.Select(s => s.Username.Trim().ToLowerInvariant()),
                StringComparer.Ordinal);

            var now = DateTime.UtcNow;
            var created = 0;
            var updated = 0;
            var changed = false;

            foreach (var u in seed)
            {
                if (string.IsNullOrWhiteSpace(u.Username) || string.IsNullOrWhiteSpace(u.Password))
                    continue;

                var username = u.Username.Trim().ToLowerInvariant();
                var role = AppRoles.Normalize(u.Role);
                var hash = BCrypt.Net.BCrypt.HashPassword(u.Password);

                var existing = await _db.SecurityAppUsers
                    .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);

                if (existing is null)
                {
                    _db.SecurityAppUsers.Add(new SecurityAppUser
                    {
                        Id = Guid.NewGuid(),
                        Username = username,
                        PasswordHash = hash,
                        Role = role,
                        DisplayName = u.DisplayName ?? u.Username,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    created++;
                    changed = true;
                    continue;
                }

                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    changed = true;
                }

                if (!string.Equals(existing.DisplayName, u.DisplayName, StringComparison.Ordinal)
                    && !string.IsNullOrWhiteSpace(u.DisplayName))
                {
                    existing.DisplayName = u.DisplayName;
                    changed = true;
                }

                if (syncPasswords)
                {
                    existing.PasswordHash = hash;
                    existing.Role = role;
                    existing.UpdatedAt = now;
                    updated++;
                    changed = true;
                }
            }

            if (deactivateOthers)
            {
                var stale = await _db.SecurityAppUsers
                    .Where(x => !allowed.Contains(x.Username))
                    .Where(x => x.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var user in stale)
                {
                    user.IsActive = false;
                    user.UpdatedAt = now;
                    changed = true;
                }

                if (stale.Count > 0)
                    _logger.LogInformation("Deactivated {Count} non-seed app users", stale.Count);
            }

            if (changed)
                await _db.SaveChangesAsync(cancellationToken);

            if (created > 0 || updated > 0)
                _logger.LogInformation("Auth seed: {Created} created, {Updated} password/role sync", created, updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Auth user seed failed (run migrations 009–010 and 031 if needed)");
        }
    }

    private static List<SeedUserConfig> DefaultSeedUsers() =>
    [
        new("admin", "GodrejAir#2026", AppRoles.SuperAdmin, "Administrator"),
        new("ss", "NSF#2026", AppRoles.SecuritySupervisor, "Security Supervisor"),
        new("fmhk", "Krishv#2026", AppRoles.Fm, "FM / Housekeeping"),
    ];

    private sealed record SeedUserConfig(string Username, string Password, string Role, string? DisplayName);
}
