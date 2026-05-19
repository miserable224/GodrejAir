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

- `Supabase__ConnectionString`
- `Jwt__SigningKey` (32+ characters)
- `DOTNET_USE_POLLING_FILE_WATCHER` = `true` (set in Dockerfile; can add in dashboard too)

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
