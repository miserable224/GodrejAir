using Microsoft.Extensions.Configuration;
using Npgsql;

namespace SecurityOps.Infrastructure.Persistence;

/// <summary>
/// Accepts Npgsql key=value strings or Supabase-style postgresql:// URIs.
/// </summary>
public static class ConnectionStringNormalizer
{
    public static string Resolve(IConfiguration configuration)
    {
        var candidates = new[]
        {
            configuration["Supabase:ConnectionString"],
            configuration.GetConnectionString("DefaultConnection"),
            configuration["DATABASE_URL"],
        };

        foreach (var raw in candidates)
        {
            if (string.IsNullOrWhiteSpace(raw))
                continue;

            var normalized = Normalize(raw.Trim());
            Validate(normalized);
            return normalized;
        }

        throw new InvalidOperationException(
            "Configure a database connection: set Supabase__ConnectionString (or DATABASE_URL) on Render.");
    }

    public static string Normalize(string connectionString)
    {
        if (connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
            || connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
        {
            return FromPostgresUri(connectionString);
        }

        return connectionString;
    }

    private static string FromPostgresUri(string uriString)
    {
        var uri = new Uri(uriString);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            SslMode = SslMode.Require,
        };

        if (!string.IsNullOrEmpty(uri.Query))
        {
            var query = uri.Query.TrimStart('?');
            foreach (var part in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2)
                    continue;
                var key = Uri.UnescapeDataString(kv[0]);
                var value = Uri.UnescapeDataString(kv[1]);
                if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase)
                    && Enum.TryParse<SslMode>(value, true, out var ssl))
                {
                    builder.SslMode = ssl;
                }
            }
        }

        return builder.ConnectionString;
    }

    private static void Validate(string connectionString)
    {
        try
        {
            _ = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "Supabase__ConnectionString is invalid. Use Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=...;SSL Mode=Require;Trust Server Certificate=true " +
                "or paste the postgresql:// URI from Supabase.",
                ex);
        }
    }
}
