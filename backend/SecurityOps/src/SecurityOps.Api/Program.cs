using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SecurityOps.Api.Auth;
using SecurityOps.Api.Middleware;
using SecurityOps.Application;
using SecurityOps.Infrastructure;
using Serilog;

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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Security API (Godrej Air)", Version = "v1" });
    var bearer = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste JWT (Bearer token from /api/auth/dev-token when enabled)."
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

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "security-api" }));
app.MapGet("/", () => Results.Ok(new { status = "healthy", service = "security-api", health = "/health" }));

app.MapControllers();

app.Run();
