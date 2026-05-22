import { getSecurityApiOrigin } from '../../shared/config/apiConfig';
import { fetchWithNetworkHint } from '../../shared/utils/networkError';
import { ensureValidAccessToken } from '../../shared/services/authService';
import { uploadSecurityPhoto } from '../../security/services/securityService';

const hkCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function apiBase() {
  return `${getSecurityApiOrigin()}/api`;
}

function apiNetworkHint() {
  return `Cannot reach API at ${getSecurityApiOrigin()}. Set EXPO_PUBLIC_API_URL.`;
}

function getCached(key) {
  const entry = hkCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    hkCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  hkCache.set(key, { ts: Date.now(), value });
}

export function invalidateHousekeepingCache() {
  hkCache.clear();
}

/**
 * @param {object} dateParams - from resolveWorkforceDateParams()
 */
export async function fetchHousekeepingDashboard(token, dateParams, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  if (!dateParams?.valid || !dateParams.from || !dateParams.to) {
    throw new Error('Select a valid date range.');
  }

  const cacheKey = `hk:${dateParams.cacheKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    from: dateParams.from,
    to: dateParams.to,
    label: dateParams.label || '',
  });

  const res = await fetchWithNetworkHint(
    `${apiBase()}/housekeeping/dashboard?${qs.toString()}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.message || body?.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`Housekeeping dashboard failed (${res.status}): ${detail}`);
  }

  const body = await res.json();
  const raw = body?.data ?? body;
  const data = normalizeHkDashboard(raw);
  setCache(cacheKey, data);
  return data;
}

function normalizeHkDashboard(raw) {
  if (!raw) return null;
  const roles = raw.roles ?? raw.Roles ?? [];
  return {
    periodLabel: raw.periodLabel ?? raw.PeriodLabel ?? '',
    from: raw.from ?? raw.From ?? '',
    to: raw.to ?? raw.To ?? '',
    dayCount: Number(raw.dayCount ?? raw.DayCount) || 0,
    totalDeployed: Number(raw.totalDeployed ?? raw.TotalDeployed) || 0,
    totalRequired: Number(raw.totalRequired ?? raw.TotalRequired) || 0,
    totalShortage: Number(raw.totalShortage ?? raw.TotalShortage) || 0,
    estimatedWages: Number(raw.estimatedWages ?? raw.EstimatedWages) || 0,
    roles: roles.map((r) => ({
      roleCode: r.roleCode ?? r.RoleCode,
      role: r.role ?? r.Role,
      expected: Number(r.expected ?? r.Expected) || 0,
      actualS1: Number(r.actualS1 ?? r.ActualS1) || 0,
      actualS2: Number(r.actualS2 ?? r.ActualS2) || 0,
      deploymentCount: Number(r.deploymentCount ?? r.DeploymentCount) || 0,
    })),
  };
}

function photoFileName(uri) {
  return uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
}

function photoMimeType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function photoToUploadFile(photo) {
  if (photo?.file instanceof File) {
    return photo.file;
  }
  const uri = photo?.uri;
  if (!uri) throw new Error('Photo is required for each entry.');
  const name = photoFileName(uri);
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read photo from device.');
  const blob = await response.blob();
  const type = blob.type || photoMimeType(name);
  if (typeof File !== 'undefined') {
    return new File([blob], name, { type });
  }
  return Object.assign(blob, { name, type });
}

async function readApiError(res) {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body?.message || body?.error || detail;
  } catch {
    /* ignore */
  }
  return detail;
}

/**
 * Save queued housekeeping deployment logs (Housekeeping API).
 */
export async function postBulkHousekeepingDeployments(token, dateIso, items, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  if (!items?.length) throw new Error('Add at least one housekeeping entry before saving.');

  const formData = new FormData();
  formData.append('date', dateIso);
  formData.append(
    'entries',
    JSON.stringify(
      items.map((item) => ({
        designation: item.designation,
        staffName: item.staffName,
        location: item.location,
        photoLatitude: item.photo?.latitude ?? null,
        photoLongitude: item.photo?.longitude ?? null,
        photoAccuracyMeters: item.photo?.accuracy ?? null,
        photoCapturedAt: item.photo?.capturedAt ?? null,
      })),
    ),
  );

  for (const item of items) {
    const file = await photoToUploadFile(item.photo);
    const name = file.name || 'photo.jpg';
    formData.append('photos', file, name);
  }

  const res = await fetchWithNetworkHint(
    `${apiBase()}/housekeeping/deployments/bulk`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    throw new Error(`Failed to save housekeeping logs (${res.status}): ${await readApiError(res)}`);
  }

  invalidateHousekeepingCache();
  const body = await res.json();
  return body?.data ?? body;
}

// ─── Duty check-in / check-out ─────────────────────────────────────────────

const HK_DUTY_DEPLOY_MSG =
  'Housekeeping check-in/out is not on this server (404). Redeploy the API and run migration 021_housekeeping_duty_sessions.sql.';

async function parseJsonResponse(res) {
  if (res.status === 204) return { data: null, empty: true };
  const text = await res.text();
  if (!text?.trim()) return { data: null, empty: true };
  return { ...JSON.parse(text), empty: false };
}

function normalizeHkDutySession(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.Id,
    staffId: row.staffId ?? row.StaffId ?? null,
    staffName: row.staffName ?? row.StaffName ?? '',
    locationId: row.locationId ?? row.LocationId ?? null,
    locationName: row.locationName ?? row.LocationName ?? '',
    designation: row.designation ?? row.Designation ?? null,
    status: row.status ?? row.Status ?? 'open',
    entryAt: row.entryAt ?? row.EntryAt,
    exitAt: row.exitAt ?? row.ExitAt ?? null,
    entryPhotoUrl: row.entryPhotoUrl ?? row.EntryPhotoUrl ?? null,
    exitPhotoUrl: row.exitPhotoUrl ?? row.ExitPhotoUrl ?? null,
    entryLatitude: row.entryLatitude ?? row.EntryLatitude ?? null,
    entryLongitude: row.entryLongitude ?? row.EntryLongitude ?? null,
    exitLatitude: row.exitLatitude ?? row.ExitLatitude ?? null,
    exitLongitude: row.exitLongitude ?? row.ExitLongitude ?? null,
    entryShift: row.entryShift ?? row.EntryShift ?? null,
    exitShift: row.exitShift ?? row.ExitShift ?? null,
    entryShiftDisplay: row.entryShiftDisplay ?? row.EntryShiftDisplay ?? null,
    exitShiftDisplay: row.exitShiftDisplay ?? row.ExitShiftDisplay ?? null,
    durationMinutes: row.durationMinutes ?? row.DurationMinutes ?? null,
    durationHours: row.durationHours ?? row.DurationHours ?? null,
    durationLabel: row.durationLabel ?? row.DurationLabel ?? null,
  };
}

async function hkDutyFetch(path, token, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  const res = await fetchWithNetworkHint(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  }, apiNetworkHint());
  if (!res.ok) {
    throw new Error(`Housekeeping duty failed (${res.status}): ${await readApiError(res)}`);
  }
  const json = await parseJsonResponse(res);
  return json;
}

export async function assertHkDutyApiAvailable(token, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  const res = await fetchWithNetworkHint(`${apiBase()}/housekeeping/duty/ping`, {
    method: 'GET',
    signal,
  }, apiNetworkHint());
  if (res.status === 404) throw new Error(HK_DUTY_DEPLOY_MSG);
  if (!res.ok) throw new Error(`Housekeeping duty probe failed (${res.status})`);
}

export async function fetchHkDutySessionsRange(token, { from, to }, signal) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  const json = await hkDutyFetch(`/housekeeping/duty/sessions${qs ? `?${qs}` : ''}`, token, signal);
  const list = Array.isArray(json.data) ? json.data : [];
  return list.map(normalizeHkDutySession);
}

export async function fetchOpenHkDutySession(token, staffName, signal) {
  const q = encodeURIComponent((staffName || '').trim());
  const json = await hkDutyFetch(`/housekeeping/duty/open?staffName=${q}`, token, signal);
  return normalizeHkDutySession(json.data);
}

export async function fetchOnDutyHkSessions(token, signal) {
  const json = await hkDutyFetch('/housekeeping/duty/on-duty', token, signal);
  const list = Array.isArray(json.data) ? json.data : [];
  return list.map(normalizeHkDutySession);
}

export async function postHkDutyCheckIn(token, payload, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  await assertHkDutyApiAvailable(accessToken, signal);

  const { photo, staffName, locationName, designation, latitude, longitude, accuracy, capturedAt, entryAt } = payload;
  if (!photo?.uri && !photo?.file) throw new Error('Check-in photo is required.');

  const photoUrl = await uploadSecurityPhoto(accessToken, photo, signal);
  if (!photoUrl) throw new Error('Photo upload succeeded but no URL was returned.');

  const body = {
    staffName: (staffName || '').trim(),
    locationName: (locationName || '').trim(),
    designation: designation?.trim() || null,
    entryAt: capturedAt || entryAt || new Date().toISOString(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    accuracyMeters: accuracy ?? null,
    capturedAt: capturedAt || entryAt || new Date().toISOString(),
    photoUrls: [photoUrl],
  };

  const res = await fetchWithNetworkHint(`${apiBase()}/housekeeping/duty/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }, apiNetworkHint());

  if (!res.ok) {
    if (res.status === 404) throw new Error(HK_DUTY_DEPLOY_MSG);
    throw new Error(`Check-in failed (${res.status}): ${await readApiError(res)}`);
  }

  invalidateHousekeepingCache();
  const json = await parseJsonResponse(res);
  return normalizeHkDutySession(json.data);
}

export async function postHkDutyCheckOut(token, sessionId, payload, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  await assertHkDutyApiAvailable(accessToken, signal);

  const { photo, latitude, longitude, accuracy, capturedAt, exitAt } = payload || {};
  const photoUrls = [];
  if (photo?.uri || photo?.file) {
    const photoUrl = await uploadSecurityPhoto(accessToken, photo, signal);
    if (photoUrl) photoUrls.push(photoUrl);
  }

  const body = {
    exitAt: capturedAt || exitAt || new Date().toISOString(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    accuracyMeters: accuracy ?? null,
    capturedAt: capturedAt || exitAt || new Date().toISOString(),
    photoUrls,
  };

  const res = await fetchWithNetworkHint(
    `${apiBase()}/housekeeping/duty/${sessionId}/check-out`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error(HK_DUTY_DEPLOY_MSG);
    throw new Error(`Check-out failed (${res.status}): ${await readApiError(res)}`);
  }

  invalidateHousekeepingCache();
  const json = await parseJsonResponse(res);
  return normalizeHkDutySession(json.data);
}
