using System.Net;
using System.Text.Json;
using Npgsql;

namespace SecurityOps.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled error on {Method} {Path}", context.Request.Method, context.Request.Path);
            if (context.Response.HasStarted)
                throw;

            var (status, message) = MapException(ex);
            context.Response.StatusCode = (int)status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(new { error = message }, JsonOptions));
        }
    }

    private static (HttpStatusCode Status, string Message) MapException(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException)
        {
            if (e is InvalidOperationException ioe
                && ioe.Message.Contains("Supabase__ConnectionString", StringComparison.OrdinalIgnoreCase))
            {
                return (HttpStatusCode.ServiceUnavailable, ioe.Message);
            }

            if (e is ArgumentException arg
                && arg.Message.Contains("initialization string", StringComparison.OrdinalIgnoreCase))
            {
                return (
                    HttpStatusCode.ServiceUnavailable,
                    "Invalid database connection string on Render. Set Supabase__ConnectionString to the Supabase URI (postgresql://...) or Host=...;Port=5432;... format.");
            }

            if (e is UriFormatException uriEx)
            {
                return (
                    HttpStatusCode.ServiceUnavailable,
                    "Invalid Supabase URI. Use the full postgresql:// string from Supabase, or Host=...;Port=5432;Password=... format.");
            }

            if (e is InvalidOperationException ioe2
                && (ioe2.Message.Contains("postgresql", StringComparison.OrdinalIgnoreCase)
                    || ioe2.Message.Contains("Supabase", StringComparison.OrdinalIgnoreCase)
                    || ioe2.Message.Contains("port", StringComparison.OrdinalIgnoreCase)))
            {
                return (HttpStatusCode.ServiceUnavailable, ioe2.Message);
            }

            if (e is PostgresException pg)
            {
                return pg.SqlState switch
                {
                    PostgresErrorCodes.UniqueViolation => (
                        HttpStatusCode.BadRequest,
                        pg.ConstraintName?.Contains("duty_designations", StringComparison.OrdinalIgnoreCase) == true
                            ? "A designation with this title already exists in this module. Edit or remove the existing one."
                            : $"Duplicate value: {pg.MessageText}"),
                    PostgresErrorCodes.NotNullViolation => (
                        HttpStatusCode.BadRequest,
                        $"Required field missing: {pg.ColumnName ?? pg.MessageText}"),
                    PostgresErrorCodes.CheckViolation => (
                        HttpStatusCode.BadRequest,
                        pg.ConstraintName?.Contains("security_staff_role", StringComparison.OrdinalIgnoreCase) == true
                            ? "That staff role is not allowed. Run Supabase migration 035_security_staff_hk_roles.sql, then retry."
                            : $"Invalid value: {pg.MessageText}"),
                    PostgresErrorCodes.UndefinedTable => (
                        HttpStatusCode.ServiceUnavailable,
                        pg.MessageText.Contains("housekeeping_duty_sessions", StringComparison.OrdinalIgnoreCase)
                            ? "Housekeeping duty table missing. Run Supabase migration 021_housekeeping_duty_sessions.sql in the SQL editor."
                            : "Database tables missing. Run Supabase migrations (009_security_app_users.sql and later) in the SQL editor."),
                    PostgresErrorCodes.InvalidPassword or "28P01" => (
                        HttpStatusCode.ServiceUnavailable,
                        "Database login failed. Check Supabase__ConnectionString on Render."),
                    _ => (
                        HttpStatusCode.ServiceUnavailable,
                        $"Database error ({pg.SqlState}): {pg.MessageText}"),
                };
            }

            if (e is NpgsqlException npg)
            {
                return (
                    HttpStatusCode.ServiceUnavailable,
                    $"Database connection failed: {npg.Message}. Verify Supabase__ConnectionString on Render (use the full postgresql:// URI from Supabase → Database).");
            }
        }

        var detail = ex.GetBaseException().Message;
        if (!string.IsNullOrWhiteSpace(detail) && detail.Length <= 300)
            return (HttpStatusCode.InternalServerError, detail);

        return (HttpStatusCode.InternalServerError, "An unexpected error occurred. Check Render logs for details.");
    }
}
