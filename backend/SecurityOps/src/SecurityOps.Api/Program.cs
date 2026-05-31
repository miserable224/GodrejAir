using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SecurityOps.Api.Auth;
using SecurityOps.Api.Middleware;
using SecurityOps.Api.Services.Chat;
using SecurityOps.Api.Services.Llm;
using SecurityOps.Api.Services.Vision;
using SecurityOps.Application;
using SecurityOps.Infrastructure;
using SecurityOps.Infrastructure.Persistence;
using Serilog;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://+:{port}");

builder.Host.UseSerilog((_, _, cfg) =>
    cfg.MinimumLevel.Information()
        .Enrich.FromLogContext()
        .WriteTo.Console());

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .DisallowCredentials();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Godrej Air API", Version = "v1" });
    var bearer = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste JWT (Bearer accessToken from POST /api/auth/login)."
    };
    c.AddSecurityDefinition("Bearer", bearer);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [bearer] = Array.Empty<string>()
    });
    c.TagActionsBy(api =>
    {
        var path = api.RelativePath ?? string.Empty;
        if (path.StartsWith("api/security", StringComparison.OrdinalIgnoreCase))
            return new[] { "Security" };
        if (path.StartsWith("api/housekeeping", StringComparison.OrdinalIgnoreCase))
            return new[] { "Housekeeping" };
        if (path.StartsWith("api/promotions", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("api/promotion-types", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("api/vendors", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("api/upload-receipt", StringComparison.OrdinalIgnoreCase))
            return new[] { "Promotions" };
        if (path.StartsWith("api/chat", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("api/community", StringComparison.OrdinalIgnoreCase))
            return new[] { "Community" };
        if (path.StartsWith("api/water", StringComparison.OrdinalIgnoreCase))
            return new[] { "Water" };
        return new[] { "Shared" };
    });
    c.DocInclusionPredicate((_, _) => true);
});

var jwtSection = builder.Configuration.GetSection("Jwt");
var signingKey = jwtSection["SigningKey"];
if (string.IsNullOrWhiteSpace(signingKey) || signingKey.Length < 32)
    signingKey = "local-dev-only-key-change-in-production-32chars";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"] ?? "SecurityOps",
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"] ?? "SecurityOpsClients",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<AuthUserSeeder>();
builder.Services.AddScoped<AdminOtpService>();
builder.Services.AddSingleton<IEmailSender, DevEmailSender>();

// ── LLM service options (works with any OpenAI-protocol provider: Groq, OpenAI, Together, Ollama…)
// Reads from the "Llm" config section, with "OpenAI" kept as a fallback so older
// appsettings files still resolve. Env vars LLM_* take precedence over JSON;
// legacy OPENAI_* env vars are also honoured so existing Render deployments
// keep working without an env-var rename.
builder.Services.Configure<LlmOptions>(opts =>
{
    var section = builder.Configuration.GetSection("Llm");
    if (!section.Exists())
        section = builder.Configuration.GetSection("OpenAI");

    opts.ApiKey =
        Environment.GetEnvironmentVariable("LLM_API_KEY")
        ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY")
        ?? section["ApiKey"];
    opts.BaseUrl =
        Environment.GetEnvironmentVariable("LLM_BASE_URL")
        ?? Environment.GetEnvironmentVariable("OPENAI_BASE_URL")
        ?? section["BaseUrl"]
        ?? "https://api.openai.com/v1";
    opts.Model =
        Environment.GetEnvironmentVariable("LLM_MODEL")
        ?? Environment.GetEnvironmentVariable("OPENAI_MODEL")
        ?? section["Model"]
        ?? "gpt-4o-mini";
    if (double.TryParse(section["Temperature"], out var temp))
        opts.Temperature = temp;
    if (int.TryParse(section["MaxToolHops"], out var hops) && hops > 0)
        opts.MaxToolHops = hops;
    opts.SystemPrompt = section["SystemPrompt"];
});
builder.Services.AddHttpClient<ILlmChatService, OpenAiChatService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Vision-capable multimodal LLM (re-uses the same OpenAI-compatible base URL,
// but needs a longer timeout because base64 payloads + image reasoning are slow).
builder.Services.AddHttpClient<ILlmWaterVisionService, GroqWaterVisionService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<AuthUserSeeder>();
    await seeder.SeedAsync();
}

// Routing + CORS must run before auth so OPTIONS preflight gets CORS headers (Expo Web → API).
app.UseRouting();
app.UseCors("AllowAll");

app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<ValidationExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// TLS is terminated at Render/Vercel edge; container listens on HTTP only — no UseHttpsRedirection.

app.UseAuthentication();
app.UseAuthorization();

var webRoot = app.Environment.WebRootPath;
if (string.IsNullOrWhiteSpace(webRoot))
    webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRoot);
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "godrej-api",
    modules = new[] { "security", "housekeeping", "auth", "duty" },
    dutyPing = "/api/security/duty/ping",
    hkDutyPing = "/api/housekeeping/duty/ping",
}));

app.MapGet("/health/db", async (ApplicationDbContext db, IConfiguration config, CancellationToken ct) =>
{
    var configured = !string.IsNullOrWhiteSpace(config["Supabase:ConnectionString"])
        || !string.IsNullOrWhiteSpace(config.GetConnectionString("DefaultConnection"))
        || !string.IsNullOrWhiteSpace(config["DATABASE_URL"]);

    try
    {
        await db.Database.OpenConnectionAsync(ct);
        await db.Database.CloseConnectionAsync();

        var userCount = await db.SecurityAppUsers.CountAsync(ct);
        return Results.Ok(new { status = "ok", securityAppUsers = userCount });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            status = "error",
            configured,
            message = ex.GetBaseException().Message,
            hint = "Use Supabase Session pooler (port 6543) on Render if direct port 5432 fails.",
        }, statusCode: 503);
    }
});
app.MapGet("/", () => Results.Ok(new
{
    status = "healthy",
    service = "godrej-api",
    health = "/health",
    swagger = app.Environment.IsDevelopment() ? "/swagger" : null,
}));

app.MapControllers();

app.Run();
