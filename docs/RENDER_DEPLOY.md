# Render deploy (single API)

## Required settings

| Setting | Value |
|---------|--------|
| **Dockerfile Path** | `backend/SecurityOps/Dockerfile` |
| **Docker Context** | `.` |
| **Root Directory** | *(leave empty)* |
| **Branch** | `dev` |

Do **not** use `backend/HousekeepingOps/Dockerfile` — that is legacy and has no `/api/auth/login`.

## Environment variables

| Key | Example |
|-----|---------|
| `Supabase__ConnectionString` | `Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true` |
| `Jwt__SigningKey` | 32+ random characters |
| `DOTNET_USE_POLLING_FILE_WATCHER` | `true` |

Use **double underscore** `Supabase__ConnectionString` (not single underscore).

In Supabase → SQL Editor, run migrations `009_security_app_users.sql` through `016_deployment_logs_module.sql`.

## Verify after deploy

```bash
curl https://YOUR-SERVICE.onrender.com/health
```

Expected: `"service":"godrej-api"`

```bash
curl -X POST https://YOUR-SERVICE.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"testadmin123"}'
```

Expected: HTTP 200 with `accessToken`.
