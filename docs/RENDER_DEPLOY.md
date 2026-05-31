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
| `Supabase__ConnectionString` | See formats below |
| `Jwt__SigningKey` | 32+ random characters |
| `LLM_API_KEY` | Groq / OpenAI-compatible (water vision + chatbot) |
| `LLM_BASE_URL` | e.g. `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | e.g. `meta-llama/llama-4-scout-17b-16e-instruct` |
| `DOTNET_USE_POLLING_FILE_WATCHER` | `true` |

Use **double underscore** `Supabase__ConnectionString` (not single underscore).

**Option A — paste Supabase URI** (Project Settings → Database → Connection string → URI):

```text
postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**Option B — Npgsql key=value format:**

```text
Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

Do **not** paste only the password, project ref, or JSON — the full connection string is required.

In Supabase → SQL Editor, run migrations `009_security_app_users.sql` through `021_housekeeping_duty_sessions.sql` (includes duty check-in/out for security and housekeeping), plus **`027`–`030`** for the water module (030 = multiple vehicle plates per vendor). See `docs/PRODUCTION_WATER_SECURITY_HK.md` for env vars, photo-storage limits, and performance notes.

## Verify after deploy

```bash
curl https://YOUR-SERVICE.onrender.com/health
```

Expected: `"service":"godrej-api"`

```bash
curl -X POST https://YOUR-SERVICE.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
```

Expected: HTTP 200 with `accessToken`, `refreshToken`, and `expiresIn` (seconds).

Operational accounts (seeded on API startup — see `Auth:SeedUsers` in appsettings):

| Username | Role | Dashboard access |
|----------|------|------------------|
| `admin` | Super Admin | All modules |
| `ss` | Security Supervisor | Security, Water, Housekeeping |
| `fmhk` | FM | Housekeeping, Water |

JWT access token lifetime defaults to **30 minutes**; refresh token **7 days** (`Jwt:AccessTokenMinutes`, `Jwt:RefreshTokenDays`).

Duty check-in/out (requires latest API deploy + migrations 019–021):

```bash
# Should return 401 without token, not 404
curl -s -o /dev/null -w "%{http_code}" -X POST https://YOUR-SERVICE.onrender.com/api/security/duty/check-in
curl -s -o /dev/null -w "hk:%{http_code}" https://YOUR-SERVICE.onrender.com/api/housekeeping/duty/ping
```

Expected: `401` on check-in POST, `200` on HK ping. If you get **404**, redeploy Render from the current `dev` branch.
