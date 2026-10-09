using System;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using Notes.Application.Interfaces;

namespace Notes.Infrastructure.Services;

public class SmtpEmailService : IEmailNotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendCollaborationInviteEmailAsync(string recipientEmail, string ownerName, string ownerEmail, string noteTitle, Guid noteId)
    {
        var host = _configuration["SmtpSettings:Host"] ?? "smtp.gmail.com";
        var portStr = _configuration["SmtpSettings:Port"] ?? "587";
        var username = _configuration["SmtpSettings:Username"] ?? "";
        var password = _configuration["SmtpSettings:Password"] ?? "";
        var senderEmail = _configuration["SmtpSettings:SenderEmail"] ?? username;
        var senderName = _configuration["SmtpSettings:SenderName"] ?? "Keep Notes";
        var clientBaseUrl = _configuration["AllowedOrigins:0"] ?? "http://localhost:4200";

        // If credentials are not yet configured, log warning and exit cleanly without failing the caller
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || username.Contains("your-email@gmail.com"))
        {
            _logger.LogWarning("SMTP credentials not configured in appsettings.json. Skipping email dispatch to {Recipient}.", recipientEmail);
            return;
        }

        if (!int.TryParse(portStr, out int port))
        {
            port = 587;
        }

        var displayOwner = string.IsNullOrWhiteSpace(ownerName) ? ownerEmail : ownerName;
        var displayTitle = string.IsNullOrWhiteSpace(noteTitle) ? "Untitled Note" : noteTitle;
        var appUrl = $"{clientBaseUrl.TrimEnd('/')}/dashboard?openSharedNoteId={noteId}";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress("", recipientEmail));
        message.Subject = $"{displayOwner} shared a note with you: \"{displayTitle}\"";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Note Shared With You</title>
</head>
<body style=""margin: 0; padding: 24px; background-color: #f8f9fa; font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #202124;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #dadce0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;"">
    <tr>
      <td style=""padding: 24px 28px 12px 28px; border-bottom: 1px solid #f1f3f4;"">
        <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" style=""width: 100%;"">
          <tr>
            <td style=""vertical-align: middle;"">
              <span style=""font-size: 20px; font-weight: 600; color: #fbbc04;"">💡</span>
              <span style=""font-size: 18px; font-weight: 500; color: #202124; margin-left: 6px; letter-spacing: -0.2px;"">Keep <strong>Notes</strong></span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style=""padding: 24px 28px;"">
        <h2 style=""margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #202124;"">
          This note has been shared with you
        </h2>
        <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #5f6368;"">
          <strong>{displayOwner}</strong> ({ownerEmail}) added you as a collaborator on a note:
        </p>
        <div style=""background-color: #f1f3f4; border-left: 4px solid #1a73e8; border-radius: 0 6px 6px 0; padding: 14px 18px; margin: 18px 0;"">
          <div style=""font-size: 16px; font-weight: 600; color: #202124; word-break: break-word;"">
            {displayTitle}
          </div>
        </div>
        <p style=""margin: 16px 0 24px 0; font-size: 13px; line-height: 1.5; color: #70757a;"">
          The owner of this note is {ownerEmail}. You should only open notes from someone you trust.
        </p>
        <table role=""presentation"" cellspacing=""0"" cellpadding=""0"">
          <tr>
            <td style=""border-radius: 4px; background-color: #1a73e8;"">
              <a href=""{appUrl}"" target=""_blank"" style=""display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 4px; letter-spacing: 0.2px;"">
                Open note
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style=""padding: 16px 28px; background-color: #f8f9fa; border-top: 1px solid #f1f3f4; text-align: center; font-size: 12px; color: #70757a;"">
        Keep Notes • Real-time collaborative notes
      </td>
    </tr>
  </table>
</body>
</html>
",
            TextBody = $"{displayOwner} ({ownerEmail}) shared a note with you: \"{displayTitle}\".\n\nOpen note in app: {appUrl}"
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            
            // Accept all SSL certificates if needed for local dev/testing
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            var secureSocketOption = port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(host, port, secureSocketOption);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Collaboration invite email successfully delivered to {Recipient} via SMTP.", recipientEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deliver collaboration invite email to {Recipient} via SMTP.", recipientEmail);
        }
    }

    public async Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string resetUrl)
    {
        var host = _configuration["SmtpSettings:Host"] ?? "smtp.gmail.com";
        var portStr = _configuration["SmtpSettings:Port"] ?? "587";
        var username = _configuration["SmtpSettings:Username"] ?? "";
        var password = _configuration["SmtpSettings:Password"] ?? "";
        var senderEmail = _configuration["SmtpSettings:SenderEmail"] ?? username;
        var senderName = _configuration["SmtpSettings:SenderName"] ?? "Keep Notes";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || username.Contains("your-email@gmail.com"))
        {
            _logger.LogWarning("SMTP credentials not configured in appsettings.json. Skipping password reset email dispatch to {Recipient}.", recipientEmail);
            return;
        }

        if (!int.TryParse(portStr, out int port))
        {
            port = 587;
        }

        var displayName = string.IsNullOrWhiteSpace(recipientName) ? recipientEmail : recipientName;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(displayName, recipientEmail));
        message.Subject = "Reset your Keep Notes password";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Reset Your Password</title>
</head>
<body style=""margin: 0; padding: 24px; background-color: #f8f9fa; font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #202124;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #dadce0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;"">
    <tr>
      <td style=""padding: 24px 28px 12px 28px; border-bottom: 1px solid #f1f3f4;"">
        <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" style=""width: 100%;"">
          <tr>
            <td style=""vertical-align: middle;"">
              <span style=""font-size: 20px; font-weight: 600; color: #fbbc04;"">💡</span>
              <span style=""font-size: 18px; font-weight: 500; color: #202124; margin-left: 6px; letter-spacing: -0.2px;"">Keep <strong>Notes</strong></span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style=""padding: 24px 28px;"">
        <h2 style=""margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #202124;"">
          Reset your password
        </h2>
        <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #5f6368;"">
          Hello <strong>{displayName}</strong>,
        </p>
        <p style=""margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #5f6368;"">
          We received a request to reset the password for your Keep Notes account (<strong>{recipientEmail}</strong>). Click the button below to choose a new password:
        </p>
        <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" style=""margin: 24px 0;"">
          <tr>
            <td style=""border-radius: 4px; background-color: #1a73e8;"">
              <a href=""{resetUrl}"" target=""_blank"" style=""display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 4px; letter-spacing: 0.2px;"">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style=""margin: 20px 0 8px 0; font-size: 13px; line-height: 1.5; color: #70757a;"">
          This link will expire in 3 hours. If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        <div style=""margin-top: 16px; padding-top: 16px; border-top: 1px dashed #dadce0; font-size: 12px; color: #80868b; word-break: break-all;"">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href=""{resetUrl}"" style=""color: #1a73e8; text-decoration: none;"">{resetUrl}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style=""padding: 16px 28px; background-color: #f8f9fa; border-top: 1px solid #f1f3f4; text-align: center; font-size: 12px; color: #70757a;"">
        Keep Notes • Real-time collaborative notes
      </td>
    </tr>
  </table>
</body>
</html>
",
            TextBody = $"Hello {displayName},\n\nWe received a request to reset the password for your Keep Notes account ({recipientEmail}).\n\nReset your password here: {resetUrl}\n\nThis link will expire in 3 hours. If you didn't request this, you can safely ignore this email."
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            var secureSocketOption = port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(host, port, secureSocketOption);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Password reset email successfully delivered to {Recipient} via SMTP.", recipientEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deliver password reset email to {Recipient} via SMTP.", recipientEmail);
        }
    }
}
