# Production: Water, Security & Housekeeping

Deploy checklist and known limitations for the three ops modules on **Render** (API) + **Vercel** (Expo web).

## Database migrations

Run on **production** Supabase (SQL Editor or CLI), in order, after earlier app migrations:

| Migration | Purpose |
|-----------|---------|
| `027_water_module.sql` | `water_vendors`, `water_records` |
| `028_water_record_photos.sql` | Audit photo metadata per record |
| `029_water_vendor_capacity.sql` | Tanker capacity (KL) on vendors |
| `030_water_vendor_vehicles.sql` | Multiple plates per vendor (skip if `027` already includes fleet table) |
| `031_auth_operational_users.sql` | Deactivate non-operational app logins |
| **`032_production_clear_operational_demo_data.sql`** | **Production go-live:** clears demo guard/staff names, water vendors & records, duty/deployment history |

Also ensure security/HK duty migrations through **`021_housekeeping_duty_sessions.sql`** (and `012`–`016` deployment logs) are applied. See `docs/RENDER_DEPLOY.md` for the full security baseline.

### After migration `032`

**Removed:** `security_staff` roster, all `water_vendors` / `water_records`, deployment logs, duty sessions, patrol/shift rows that referenced staff.

**Kept:** Security & HK **contract** tables (`security_vendor_contracts`, `security_role_rates`, `security_sanctioned_strength`, `hk_vendor_contracts`, `hk_contract_rates` — designations, monthly rates, headcount). App constants `ADMIN_MANPOWER_DEPLOYMENT` (role titles only).

**Next steps in the app:** Add security staff (Security module), add water tanker vendors (Water → Add vendor), record tanker deliveries fresh. HK staff names are entered at check-in/deployment (no separate HK roster table).

Optional: delete old files under the API `wwwroot/uploads/` folder on Render after `032` so stale photo URLs are not served.

## Environment variables

### Render (SecurityOps API)

| Key | Required | Notes |
|-----|----------|--------|
| `Supabase__ConnectionString` | Yes | Prefer **pooler** URI (`:6543`) for serverless |
| `Jwt__SigningKey` | Yes | 32+ random characters |
| `LLM_API_KEY` | For water vision | Groq or other OpenAI-compatible key |
| `LLM_BASE_URL` | Optional | e.g. `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Optional | e.g. `meta-llama/llama-4-scout-17b-16e-instruct` |
| `OPENAI_*` | Legacy fallback | Same as `LLM_*` if not renamed yet |

`LLM_*` is **not** set on Vercel — vision runs on the API only.

### Vercel (Expo web)

| Key | Notes |
|-----|--------|
| `EXPO_PUBLIC_API_URL` | Production API origin (no trailing slash) |

## Photo storage (important)

Today, module photos are stored on the **API container disk**:

| Module | Path / table |
|--------|----------------|
| Water | `wwwroot/uploads/water/…` → `water_record_photos.photo_url` |
| Security duty | `wwwroot/uploads/…` → `security_duty_sessions.entry_photo_url` / `exit_photo_url` |
| Housekeeping duty | Same pattern as security |

**Render redeploys and restarts erase local disk.** URLs stored in Postgres will return **404** after a deploy until photos are re-uploaded.

### Phase 1 (current)

- Acceptable for pilot / low volume.
- Document incidents; avoid relying on old photo URLs long-term.

### Phase 2 (recommended)

1. Upload bytes to **Supabase Storage** (or S3) from the API.
2. Store the public/signed URL in the existing DB columns.
3. Optional: one-time migration script for any files still on disk before redeploy.

No schema change is strictly required if URLs remain strings in the same columns.

## API behaviour (performance)

- `GET /api/water/records?includePhotos=false` (default) returns `photoCount` only — use `GET /api/water/records/{id}/photos` when full metadata is needed.
- List `limit` is capped at **500** server-side; clients should use **≤200** for month views and **≤100** for “Today”.
- Admin dashboard loads Security / HK / Water data only when the section is **expanded** (or duty modals need HK/Security context).

## Verify after deploy

```bash
curl https://YOUR-SERVICE.onrender.com/health
curl -H "Authorization: Bearer TOKEN" "https://YOUR-SERVICE.onrender.com/api/water/records?days=7&limit=10&includePhotos=false"
```

Expected: JSON `data` array with `photoCount`, `photos` null or omitted.
