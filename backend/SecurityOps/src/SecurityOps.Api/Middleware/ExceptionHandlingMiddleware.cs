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

            if (e is PostgresException pg)
            {
                return pg.SqlState switch
                {
                    PostgresErrorCodes.UndefinedTable => (
                        HttpStatusCode.ServiceUnavailable,
                        "Database tables missing. Run Supabase migrations (009_security_app_users.sql and later) in the SQL editor."),
                    PostgresErrorCodes.InvalidPassword or "28P01" => (
                        HttpStatusCode.ServiceUnavailable,
                        "Database login failed. Check Supabase__ConnectionString on Render."),
                    _ => (
                        HttpStatusCode.ServiceUnavailable,
                        $"Database error ({pg.SqlState}): {pg.MessageText}"),
                };
            }
        }

        return (HttpStatusCode.InternalServerError, "An unexpected error occurred. Check Render logs for details.");
    }
}
