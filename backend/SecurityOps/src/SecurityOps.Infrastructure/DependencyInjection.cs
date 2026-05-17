using EFCore.NamingConventions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Infrastructure.Persistence;
using SecurityOps.Infrastructure.Storage;

namespace SecurityOps.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var supabase = configuration["Supabase:ConnectionString"];
        var defaultCs = configuration.GetConnectionString("DefaultConnection");
        var connectionString = !string.IsNullOrWhiteSpace(supabase)
            ? supabase.Trim()
            : defaultCs;
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Configure a database connection: set Supabase:ConnectionString or ConnectionStrings:DefaultConnection.");

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(connectionString, b =>
            {
                b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
            });
            options.UseSnakeCaseNamingConvention();
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddSingleton<ISecurityPhotoStorage, LocalSecurityPhotoStorage>();
        return services;
    }
}
