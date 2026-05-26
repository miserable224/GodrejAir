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
        var connectionString = ConnectionStringNormalizer.Resolve(configuration);

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
        services.AddSingleton<IPromotionReceiptStorage, LocalPromotionReceiptStorage>();
        services.AddSingleton<IWaterPhotoStorage, LocalWaterPhotoStorage>();
        return services;
    }
}
