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

            var normalized = Normalize(raw.Trim().Trim('"').Trim('\''));
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

    /// <summary>
    /// Manual URI parse — System.Uri breaks when the password contains ':' or other reserved characters.
    /// </summary>
    private static string FromPostgresUri(string uriString)
    {
        var value = uriString;
        if (value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
            value = "postgresql://" + value["postgres://".Length..];

        const string scheme = "postgresql://";
        if (!value.StartsWith(scheme, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Expected a postgresql:// connection URI.");

        var remainder = value[scheme.Length..];
        var atIndex = remainder.LastIndexOf('@');
        if (atIndex < 0)
        {
            throw new InvalidOperationException(
                "Invalid postgresql URI. Use the full URI from Supabase, or Host=...;Port=5432;... format. " +
                "If your password has special characters, URL-encode it in the URI or use Host= format.");
        }

        var userInfo = remainder[..atIndex];
        var hostPart = remainder[(atIndex + 1)..];

        var userColon = userInfo.IndexOf(':');
        var username = Uri.UnescapeDataString(userColon >= 0 ? userInfo[..userColon] : userInfo);
        var password = Uri.UnescapeDataString(userColon >= 0 ? userInfo[(userColon + 1)..] : string.Empty);

        var pathStart = hostPart.IndexOf('/');
        var hostPort = pathStart >= 0 ? hostPart[..pathStart] : hostPart;
        var database = pathStart >= 0 ? hostPart[(pathStart + 1)..] : "postgres";

        var queryStart = database.IndexOf('?');
        if (queryStart >= 0)
            database = database[..queryStart];

        var portColon = hostPort.LastIndexOf(':');
        var host = portColon >= 0 ? hostPort[..portColon] : hostPort;
        var port = 5432;
        if (portColon >= 0 && !int.TryParse(hostPort[(portColon + 1)..], out port))
        {
            throw new InvalidOperationException(
                $"Invalid port in postgresql URI near '{hostPort[(portColon + 1)..]}'. " +
                "Use the Supabase URI as copied, or switch to Host=...;Port=...;Password=... format.");
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = string.IsNullOrWhiteSpace(database) ? "postgres" : database,
            Username = username,
            Password = password,
            SslMode = SslMode.Require,
        };

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
                "Supabase__ConnectionString is invalid. Use Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=...;SSL Mode=Require " +
                "or paste the postgresql:// URI from Supabase (URL-encode special characters in the password).",
                ex);
        }
    }
}
