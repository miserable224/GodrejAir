/**
 * SecurityService — single-file façade over the SecurityOps .NET API.
 *
 * Key design decisions for production:
 *  - All security data is fetched in ONE parallel burst (Promise.allSettled) so
 *    the dashboard only makes 3-4 requests instead of 4-5 sequential ones.
 *  - Results are cached in a module-level cache (5-minute TTL) so navigating away
 *    and back does not re-fetch unnecessarily.
 *  - Every fetch is abortable via AbortSignal so unmounted components don't leak.
 *  - Token expiry is detected centrally — callers get a typed error they can react to.
 */

import { Platform } from 'react-native';
import { getApiOrigin, resolveApiOrigin } from '../config/apiConfig';
import { fetchWithNetworkHint } from '../utils/networkError';
import { ensureValidAccessToken, forceRefreshAccessToken } from './authService';

// ─── Config ────────────────────────────────────────────────────────────────

/** @deprecated Prefer getApiOrigin() — may be localhost when env is missing at build time. */
export const API_ORIGIN = resolveApiOrigin() ?? 'http://localhost:5115';

function apiBase() {
  return `${getApiOrigin()}/api`;
}

function apiNetworkHint() {
  return `Cannot reach API at ${resolveApiOrigin() ?? 'unknown'}. Set EXPO_PUBLIC_API_URL in Vercel (HTTPS) and redeploy.`;
}

// ─── Cache ─────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache.set(key, { ts: Date.now(), value });
}

export function invalidateSecurityCache() {
  for (const key of cache.keys()) {
    cache.delete(key);
  }
}

// ─── Core fetch helper ─────────────────────────────────────────────────────

class AuthError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'AuthError';
  }
}

async function apiFetch(path, token, signal, retried = false) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) {
    throw new AuthError('Not signed in');
  }

  const res = await fetchWithNetworkHint(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    signal,
  }, apiNetworkHint());

  if ((res.status === 401 || res.status === 403) && !retried) {
    const refreshed = await forceRefreshAccessToken();
    if (refreshed) {
      return apiFetch(path, refreshed, signal, true);
    }
    throw new AuthError(`Session expired or unauthorised (${res.status})`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthError(`Session expired or unauthorised (${res.status})`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.message || body?.error || detail;
    } catch { /* ignore */ }
    throw new Error(`API ${res.status} on ${path}: ${detail}`);
  }
  return res.json();
}

// ─── Individual fetchers (exported for targeted use) ───────────────────────

export async function fetchSecurityRates(token, signal) {
  const cached = getCached('rates');
  if (cached) return cached;
  const res = await apiFetch('/security/rates', token, signal);
  const data = Array.isArray(res.data) ? res.data : [];
  setCache('rates', data);
  return data;
}

export async function fetchSanctionedStrength(token, signal) {
  const cached = getCached('strength');
  if (cached) return cached;
  const res = await apiFetch('/security/sanctioned-strength', token, signal);
  const data = Array.isArray(res.data) ? res.data : [];
  setCache('strength', data);
  return data;
}

export async function fetchStaff(token, signal) {
  const res = await apiFetch('/security/staff?pageSize=100', token, signal);
  return res.data?.items ?? [];
}

export async function fetchMonthlyBilling(token, month, signal) {
  const cacheKey = `billing:${month}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const res = await apiFetch(
    `/security/billing/monthly-calculation?month=${encodeURIComponent(month)}`,
    token,
    signal,
  );
  const data = res.data ?? null;
  if (data) setCache(cacheKey, data);
  return data;
}

export async function fetchDailyAttendanceSummary(token, dateYmd, signal) {
  const cacheKey = `attendance:${dateYmd}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const res = await apiFetch(
    `/security/attendance/daily-summary?date=${encodeURIComponent(dateYmd)}`,
    token,
    signal,
  );
  const data = res ?? null;
  if (data) setCache(cacheKey, data);
  return data;
}

async function fetchAttendanceForDates(token, dates, signal) {
  if (!dates?.length) return [];
  const results = await Promise.allSettled(
    dates.map((d) => fetchDailyAttendanceSummary(token, d, signal)),
  );
  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

// ─── Burst fetch (main dashboard call) ─────────────────────────────────────

/**
 * Fetches all security data in parallel (date-aware).
 *
 * @param {object} dateParams - from resolveSecurityDateParams()
 * Returns { rates, strength, staff, billing, attendanceSummaries, errors }
 */
export async function fetchSecurityDashboard(token, dateParams, signal) {
  const month = dateParams?.month ?? new Date().toISOString().substring(0, 7);
  const dates = dateParams?.dates ?? [];
  const cacheKey = `dashboard:${dateParams?.cacheKey ?? month}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled([
    fetchSecurityRates(token, signal),
    fetchSanctionedStrength(token, signal),
    fetchStaff(token, signal),
    fetchMonthlyBilling(token, month, signal),
    fetchAttendanceForDates(token, dates, signal),
  ]);

  const errors = {};

  function unwrap(result, key, fallback = null) {
    if (result.status === 'fulfilled') return result.value;
    errors[key] = result.reason?.message ?? String(result.reason);
    return fallback;
  }

  const payload = {
    rates: unwrap(settled[0], 'rates', []) ?? [],
    strength: unwrap(settled[1], 'strength', []) ?? [],
    staff: unwrap(settled[2], 'staff', []) ?? [],
    billing: unwrap(settled[3], 'billing'),
    attendanceSummaries: unwrap(settled[4], 'attendance', []) ?? [],
    errors,
  };

  setCache(cacheKey, payload);
  return payload;
}

// ─── Mutations ─────────────────────────────────────────────────────────────

async function readApiError(res, fallback) {
  let detail = fallback || res.statusText;
  try {
    const body = await res.json();
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      return body.errors.join(' ');
    }
    if (typeof body?.message === 'string' && body.message) return body.message;
    if (typeof body?.error === 'string' && body.error) return body.error;
    if (typeof body?.title === 'string' && body.title) return body.title;
  } catch {
    /* ignore */
  }
  return detail;
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

function photoFilePart(photo) {
  const uri = photo?.uri;
  if (!uri) return null;
  const name = photoFileName(uri);
  return { uri, name, type: photoMimeType(name) };
}

async function appendPhotoToFormData(formData, photo) {
  if (Platform.OS === 'web') {
    if (photo?.file instanceof File) {
      const name = photo.file.name || 'photo.jpg';
      formData.append('file', photo.file, name);
      return;
    }
    const uri = photo?.uri;
    if (!uri) throw new Error('Photo URI is required');
    const name = photoFileName(uri);
    let blob;
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Could not read the selected photo. Use Gallery and try again.');
      }
      blob = await response.blob();
    } catch {
      throw new Error(
        'Could not read the photo on this device. Use Gallery (not Camera) and ensure location permission is allowed or denied — do not leave the prompt open.',
      );
    }
    const type = blob.type || photoMimeType(name);
    const file =
      typeof File !== 'undefined'
        ? new File([blob], name, { type })
        : Object.assign(blob, { name, type });
    formData.append('file', file, name);
    return;
  }

  const uri = photo?.uri;
  if (!uri) throw new Error('Photo URI is required');

  const part = photoFilePart(photo);
  if (!part) throw new Error('Photo URI is required');
  formData.append('file', part);
}

/**
 * Upload a local image (camera/gallery URI) to the API. Returns absolute photo URL.
 */
export async function uploadSecurityPhoto(token, photo, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new AuthError('Not signed in');

  const formData = new FormData();
  await appendPhotoToFormData(formData, photo);

  const res = await fetchWithNetworkHint(`${apiBase()}/security/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    signal,
  }, apiNetworkHint());

  if (!res.ok) {
    throw new Error(`Photo upload failed (${res.status}): ${await readApiError(res)}`);
  }

  const body = await res.json();
  return body?.data?.url || body?.data?.Url || body?.url;
}

export async function postDailyAttendance(token, payload, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new AuthError('Not signed in');

  const res = await fetchWithNetworkHint(`${apiBase()}/security/attendance/daily-entry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  }, apiNetworkHint());
  if (!res.ok) {
    throw new Error(`Failed to save attendance (${res.status}): ${await readApiError(res)}`);
  }
  invalidateSecurityCache();
  return res.json();
}

/**
 * Save daily attendance counts plus optional deployment audit (photo uploaded first).
 */
export async function postDailyAttendanceWithDeployment(token, payload, photo, signal) {
  const next = { ...payload };
  if (photo?.uri && payload?.deploymentContext) {
    const photoUrl = await uploadSecurityPhoto(token, photo, signal);
    if (!photoUrl) throw new Error('Photo upload succeeded but no URL was returned.');
    next.deploymentContext = {
      ...payload.deploymentContext,
      photoUrls: [photoUrl],
    };
  }
  return postDailyAttendance(token, next, signal);
}

export async function postMobilePatrol(token, payload, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new AuthError('Not signed in');

  const { photo, staffName, locationName, remarks, latitude, longitude, patrolTime } = payload;
  const photoUrl = await uploadSecurityPhoto(accessToken, photo, signal);
  if (!photoUrl) throw new Error('Photo upload succeeded but no URL was returned.');

  const body = {
    staffName: (staffName || '').trim(),
    locationName: locationName?.trim() || null,
    remarks: remarks?.trim() || null,
    patrolTime: patrolTime || new Date().toISOString(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    photoUrls: [photoUrl],
  };

  const res = await fetchWithNetworkHint(`${apiBase()}/security/patrols/mobile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }, apiNetworkHint());

  if (!res.ok) {
    throw new Error(`Failed to save patrol (${res.status}): ${await readApiError(res)}`);
  }

  invalidateSecurityCache();
  return res.json();
}

export async function postStaffMember(token, payload, signal) {
  const res = await fetchWithNetworkHint(`${apiBase()}/security/staff`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  }, apiNetworkHint());
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json())?.message || detail; } catch { /* ignore */ }
    throw new Error(`Failed to add staff (${res.status}): ${detail}`);
  }
  invalidateSecurityCache();
  return res.json();
}

