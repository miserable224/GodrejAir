namespace SecurityOps.Api.Auth;

/// <summary>Logs OTP to console — use real SMTP in production via appsettings Email section.</summary>
public sealed class DevEmailSender : IEmailSender
{
    private readonly ILogger<DevEmailSender> _logger;

    public DevEmailSender(ILogger<DevEmailSender> logger) => _logger = logger;

    public Task SendOtpAsync(string toEmail, string otpCode, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning(
            "[DEV EMAIL] OTP for {Email}: {Otp} (configure Email:SmtpHost for production)",
            toEmail,
            otpCode);
        return Task.CompletedTask;
    }
}
