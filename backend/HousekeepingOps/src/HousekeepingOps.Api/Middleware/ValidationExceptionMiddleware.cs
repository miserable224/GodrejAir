using System.Net;
using System.Text.Json;
using SecurityOps.Application.Common.Models;

namespace HousekeepingOps.Api.Middleware;

public sealed class ValidationExceptionMiddleware(RequestDelegate next, ILogger<ValidationExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (FluentValidation.ValidationException ex)
        {
            logger.LogWarning(ex, "Validation failed on {Path}", context.Request.Path);
            await WriteErrorsAsync(context, ex.Errors.Select(e => e.ErrorMessage).ToArray());
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Business rule failed on {Path}", context.Request.Path);
            await WriteErrorsAsync(context, [ex.Message]);
        }
    }

    private static async Task WriteErrorsAsync(HttpContext context, string[] errors)
    {
        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(ApiResponse<object>.Fail(errors), JsonOptions));
    }
}
