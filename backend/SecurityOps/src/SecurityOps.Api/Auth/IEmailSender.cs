namespace SecurityOps.Api.Auth;

public interface IEmailSender
{
    Task SendOtpAsync(string toEmail, string otpCode, CancellationToken cancellationToken = default);
}
