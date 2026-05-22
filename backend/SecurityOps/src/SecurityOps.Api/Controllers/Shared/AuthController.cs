using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SecurityOps.Api.Auth;
using SecurityOps.Domain.Entities;
using SecurityOps.Infrastructure.Persistence;

namespace SecurityOps.Api.Controllers.Shared;

/// <summary>Shared — authentication &amp; tokens.</summary>
[ApiController]
[Route("api/auth")]
[Tags("Shared")]
public sealed class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly JwtTokenService _tokens;
    private readonly AdminOtpService _adminOtp;

    public AuthController(
        ApplicationDbContext db,
        IConfiguration configuration,
        JwtTokenService tokens,
        AdminOtpService adminOtp)
    {
        _db = db;
        _configuration = configuration;
        _tokens = tokens;
        _adminOtp = adminOtp;
    }

    /// <summary>Send a one-time password to the admin email (sign-in or registration).</summary>
    [HttpPost("admin/send-otp")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> SendAdminOtp([FromBody] AdminSendOtpRequest request, CancellationToken ct)
    {
        if (request is null || !AdminOtpService.IsValidEmail(request.Email))
            return BadRequest(new { error = "A valid email address is required." });

        var result = await _adminOtp.SendOtpAsync(request.Email, ct);
        if (!result.Success)
            return BadRequest(new { error = result.Message });

        return Ok(new
        {
            message = result.Message,
            devOtp = result.DevOtp,
        });
    }

    /// <summary>Verify OTP — creates the user on first successful verification, then issues tokens.</summary>
    [HttpPost("admin/verify-otp")]
    [AllowAnonymous]
    public async Task<ActionResult<AdminVerifyOtpResponse>> VerifyAdminOtp(
        [FromBody] AdminVerifyOtpRequest request,
        CancellationToken ct)
    {
        if (request is null || !AdminOtpService.IsValidEmail(request.Email))
            return BadRequest(new { error = "A valid email address is required." });
        if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Trim().Length < 4)
            return BadRequest(new { error = "Enter the OTP from your email." });

        try
        {
            var (user, created) = await _adminOtp.VerifyAndGetOrCreateUserAsync(
                request.Email,
                request.Otp,
                request.DisplayName,
                ct);

            var tokens = await IssueTokenPairAsync(user, ct);
            return Ok(new AdminVerifyOtpResponse(tokens, created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Production login — validates username/password against security_app_users.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokenResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Username and password are required." });

        var username = request.Username.Trim().ToLowerInvariant();
        var user = await _db.SecurityAppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive, cancellationToken);

        var passwordOk = false;
        if (user is not null && !string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            try
            {
                passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch
            {
                passwordOk = false;
            }
        }

        if (user is null || !passwordOk)
            return Unauthorized(new { error = "Invalid username or password." });

        return Ok(await IssueTokenPairAsync(user, cancellationToken));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokenResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.RefreshToken))
            return BadRequest(new { error = "refresh_token is required." });

        var hash = JwtTokenService.HashRefreshToken(request.RefreshToken.Trim());
        var stored = await _db.SecurityRefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow)
            return Unauthorized(new { error = "Refresh token is invalid or expired." });

        if (!stored.User.IsActive)
            return Unauthorized(new { error = "Account is disabled." });

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(await IssueTokenPairAsync(stored.User, cancellationToken));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult> Logout([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.RefreshToken))
            return Ok(new { message = "Signed out." });

        var hash = JwtTokenService.HashRefreshToken(request.RefreshToken.Trim());
        var stored = await _db.SecurityRefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
        if (stored is not null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { message = "Signed out." });
    }

    /// <summary>All assignable roles (for admin UI / documentation).</summary>
    [HttpGet("roles")]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<RoleInfo>> ListRoles() =>
        Ok(RoleCatalog.All);

    [HttpGet("me")]
    [Authorize]
    public ActionResult<MeResponse> Me()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var username = User.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
            ?? User.Identity?.Name
            ?? "";
        var role = User.FindFirstValue(ClaimTypes.Role) ?? AppRoles.SecurityGuard;
        var displayName = User.FindFirstValue(ClaimTypes.Name) ?? username;

        return Ok(new MeResponse(sub ?? "", username, displayName, role));
    }

    /// <summary>Issue a JWT for local/Swagger testing when Jwt:DevLogin:Enabled is true.</summary>
    [HttpPost("dev-token")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokenResponse>> DevToken([FromBody] DevTokenRequest? request, CancellationToken cancellationToken)
    {
        if (!_configuration.GetValue("Jwt:DevLogin:Enabled", false))
            return NotFound();

        if (request is null)
            return BadRequest(new { error = "Request body is required (username, password, role)." });

        var expectedUser = _configuration["Jwt:DevLogin:Username"];
        var expectedPass = _configuration["Jwt:DevLogin:Password"];
        if (string.IsNullOrEmpty(expectedUser) || request.Username != expectedUser || request.Password != expectedPass)
            return Unauthorized(new { error = "Invalid credentials." });

        var role = AppRoles.Normalize(
            string.IsNullOrWhiteSpace(request.Role) ? AppRoles.SuperAdmin : request.Role);
        if (!AppRoles.IsValid(request.Role) && !AppRoles.IsValid(role))
            return BadRequest(new { error = "Invalid role." });

        var user = await _db.SecurityAppUsers
            .FirstOrDefaultAsync(u => u.Username == request.Username.Trim().ToLowerInvariant(), cancellationToken);

        if (user is null)
        {
            var now = DateTime.UtcNow;
            user = new SecurityAppUser
            {
                Id = Guid.NewGuid(),
                Username = request.Username.Trim().ToLowerInvariant(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = AppRoles.Normalize(role),
                DisplayName = request.Username,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.SecurityAppUsers.Add(user);
            await _db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            user.Role = AppRoles.Normalize(role);
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(await IssueTokenPairAsync(user, cancellationToken));
    }

    private async Task<AuthTokenResponse> IssueTokenPairAsync(SecurityAppUser user, CancellationToken cancellationToken)
    {
        var access = _tokens.IssueAccessToken(user);
        var refreshPlain = JwtTokenService.GenerateRefreshTokenPlainText();
        var now = DateTime.UtcNow;

        _db.SecurityRefreshTokens.Add(new SecurityRefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = JwtTokenService.HashRefreshToken(refreshPlain),
            ExpiresAt = now.AddDays(_tokens.RefreshTokenDays),
            CreatedAt = now,
        });
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthTokenResponse(
            access,
            refreshPlain,
            "Bearer",
            _tokens.AccessTokenMinutes * 60,
            user.Role,
            user.DisplayName,
            user.Username);
    }

    public sealed record AdminSendOtpRequest(string Email);
    public sealed record AdminVerifyOtpRequest(string Email, string Otp, string? DisplayName);
    public sealed record AdminVerifyOtpResponse(AuthTokenResponse Tokens, bool UserCreated);

    public sealed record LoginRequest(string Username, string Password);
    public sealed record RefreshRequest(string RefreshToken);
    public sealed record DevTokenRequest(string Username, string Password, string? Role);

    public sealed record AuthTokenResponse(
        string AccessToken,
        string RefreshToken,
        string TokenType,
        int ExpiresIn,
        string Role,
        string DisplayName,
        string Username);

    public sealed record MeResponse(string UserId, string Username, string DisplayName, string Role);
}
