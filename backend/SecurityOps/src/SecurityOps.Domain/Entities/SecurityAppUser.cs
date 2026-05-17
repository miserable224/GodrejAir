namespace SecurityOps.Domain.Entities;

public class SecurityAppUser
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "SECURITY_GUARD";
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<SecurityRefreshToken> RefreshTokens { get; set; } = new List<SecurityRefreshToken>();
}
