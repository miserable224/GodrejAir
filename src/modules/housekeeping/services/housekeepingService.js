import { getHousekeepingApiOrigin } from '../../shared/config/apiConfig';
import { fetchWithNetworkHint } from '../../shared/utils/networkError';
import { ensureValidAccessToken } from '../../shared/services/authService';

const hkCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function apiBase() {
  return `${getHousekeepingApiOrigin()}/api`;
}

function apiNetworkHint() {
  return `Cannot reach Housekeeping API at ${getHousekeepingApiOrigin()}. Set EXPO_PUBLIC_HOUSEKEEPING_API_URL.`;
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
