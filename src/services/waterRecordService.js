/**
 * waterRecordService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend client for the Water module REST endpoints exposed by the .NET API:
 *
 *   GET  /api/water/vendors          → list tanker vendors
 *   POST /api/water/vendors          → create a tanker vendor
 *   GET  /api/water/records?days=30  → list water-delivery records
 *   POST /api/water/records          → create a water-delivery record
 *
 * Mirrors the auth pattern used by chatService / llmWaterVisionService —
 * Bearer JWT + transparent refresh on 401.
 */

import { getSecurityApiOrigin, resolveSecurityApiOrigin } from '../modules/shared/config/apiConfig';
import { fetchWithNetworkHint } from '../modules/shared/utils/networkError';
import { ensureValidAccessToken, forceRefreshAccessToken } from '../modules/shared/services/authService';

function apiBase() {
  return `${getSecurityApiOrigin()}/api`;
}
function networkHint() {
  return `Cannot reach Water API at ${resolveSecurityApiOrigin() ?? 'unknown'}. Set EXPO_PUBLIC_API_URL.`;
}

async function apiRequest(path, { method = 'GET', body, signal } = {}, retried = false) {
  const accessToken = await ensureValidAccessToken();
  if (!accessToken) throw new Error('Not signed in.');

  const init = {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetchWithNetworkHint(`${apiBase()}${path}`, init, networkHint());

  if ((res.status === 401 || res.status === 403) && !retried) {
    const refreshed = await forceRefreshAccessToken();
    if (refreshed) return apiRequest(path, { method, body, signal }, true);
    throw new Error(`Session expired (${res.status}).`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json?.message || json?.errors?.[0] || detail;
    } catch { /* ignore */ }
    throw new Error(`Water API ${res.status} on ${path}: ${detail}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

// ─── Vendors ──────────────────────────────────────────────────────────────

export async function fetchWaterVendors({ signal } = {}) {
  const list = await apiRequest('/water/vendors', { signal });
  return Array.isArray(list)
    ? list.map((v) => ({
        id: v.id,
        name: v.name,
        contactNumber: v.contactNumber ?? '',
        address: v.address ?? '',
        vehicleNo: v.vehicleNo ?? '',
        createdAt: v.createdAt,
      }))
    : [];
}

export async function createWaterVendor(vendor, { signal } = {}) {
  return apiRequest('/water/vendors', {
    method: 'POST',
    body: {
      name: vendor.name,
      contactNumber: vendor.contactNumber || null,
      address: vendor.address || null,
      vehicleNo: vendor.vehicleNo || null,
    },
    signal,
  });
}

// ─── Records ──────────────────────────────────────────────────────────────

/**
 * Normalise an "DD/MM/YY" / "DD/MM/YYYY" date to the ISO format the API
 * understands. We accept ISO already.
 */
function normaliseDate(date) {
  if (!date) return null;
  const trimmed = String(date).trim();
  // already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD/MM/YY or DD/MM/YYYY
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yy}-${mm}-${dd}`;
  }
  return trimmed;
}

/**
 * POST a water-delivery record.
 *
 * @param {object} record
 * @param {string} record.date          DD/MM/YY, DD/MM/YYYY, or YYYY-MM-DD
 * @param {string} [record.time]        Display-only (server uses createdAt for time)
 * @param {string} [record.source]      Vendor name / "Kaveri" / etc.
 * @param {string} [record.sourceType]  "tanker" | "kaveri" | "borewell"
 * @param {string} [record.vehicleNo]
 * @param {string} [record.openingMeter]
 * @param {string} [record.closingMeter]
 * @param {string} [record.tds]
 * @param {string} [record.load]        Auto-computed if omitted
 * @param {string} [record.tankLevelKl] Optional
 * @param {string} [record.vendorId]    UUID of water_vendors row
 * @param {string} [record.notes]
 * @param {string} [record.receiptUrl]
 * @param {Array<{base64:string,mimeType?:string,photoType?:string,detectedValue?:string,scanConfidence?:number,latitude?:number,longitude?:number,capturedAt?:string}>} [record.photos]
 */
export async function createWaterRecord(record, { signal } = {}) {
  const photos = Array.isArray(record.photos)
    ? record.photos
        .filter((p) => p && p.base64)
        .map((p) => ({
          base64: p.base64,
          mimeType: p.mimeType || 'image/jpeg',
          photoType: p.photoType || 'unknown',
          detectedValue: p.detectedValue ?? null,
          scanConfidence:
            typeof p.scanConfidence === 'number' ? p.scanConfidence : null,
          latitude: typeof p.latitude === 'number' ? p.latitude : null,
          longitude: typeof p.longitude === 'number' ? p.longitude : null,
          capturedAt: p.capturedAt || null,
        }))
    : null;

  return apiRequest('/water/records', {
    method: 'POST',
    body: {
      date: normaliseDate(record.date),
      time: record.time || null,
      source: record.source || null,
      sourceType: record.sourceType || 'tanker',
      vehicleNo: record.vehicleNo || null,
      openingMeter: record.openingMeter || null,
      closingMeter: record.closingMeter || null,
      tds: record.tds || null,
      load: record.load || null,
      tankLevelKl: record.tankLevelKl || null,
      vendorId: record.vendorId || null,
      notes: record.notes || null,
      receiptUrl: record.receiptUrl || null,
      photos,
    },
    signal,
  });
}

export async function fetchWaterRecordPhotos(recordId, { signal } = {}) {
  const list = await apiRequest(`/water/records/${recordId}/photos`, { signal });
  return Array.isArray(list) ? list : [];
}

export async function fetchWaterRecords({ days = 30, limit = 200, signal } = {}) {
  const params = new URLSearchParams({ days: String(days), limit: String(limit) });
  const list = await apiRequest(`/water/records?${params}`, { signal });
  return Array.isArray(list) ? list : [];
}
