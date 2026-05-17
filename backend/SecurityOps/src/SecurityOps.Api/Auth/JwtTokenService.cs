using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Api.Auth;

public sealed class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration) => _configuration = configuration;

    public int AccessTokenMinutes => _configuration.GetValue("Jwt:AccessTokenMinutes", 15);
    public int RefreshTokenDays => _configuration.GetValue("Jwt:RefreshTokenDays", 7);

    public string SigningKey
    {
        get
        {
            var key = _configuration["Jwt:SigningKey"];
            if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
                key = "local-dev-only-key-change-in-production-32chars";
            return key;
        }
    }

    public string IssueAccessToken(SecurityAppUser user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "SecurityOps";
        var audience = _configuration["Jwt:Audience"] ?? "SecurityOpsClients";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role),
        };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(AccessTokenMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string GenerateRefreshTokenPlainText()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public static string HashRefreshToken(string plain) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plain)));
}
