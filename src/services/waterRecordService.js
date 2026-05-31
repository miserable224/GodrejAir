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
import { normalizeToKl } from '../utils/waterFormHelpers';

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

function mapWaterVendor(v) {
  const vehicles = Array.isArray(v.vehicles)
    ? v.vehicles.map((x) => ({
        id: x.id,
        vehicleNo: (x.vehicleNo ?? '').toUpperCase(),
        isActive: x.isActive !== false,
        notes: x.notes ?? null,
      }))
    : [];
  const activePlates = vehicles.filter((x) => x.isActive).map((x) => x.vehicleNo);
  return {
    id: v.id,
    name: v.name,
    contactNumber: v.contactNumber ?? '',
    address: v.address ?? '',
    tankerCapacityKl: normalizeToKl(v.tankerCapacityKl) || 6,
    vehicles,
    vehicleNo: v.vehicleNo ?? activePlates[0] ?? '',
    vehicleNos: activePlates,
    createdAt: v.createdAt,
  };
}

export async function fetchWaterVendors({ signal } = {}) {
  const list = await apiRequest('/water/vendors', { signal });
  return Array.isArray(list) ? list.map(mapWaterVendor) : [];
}

export async function createWaterVendor(vendor, { signal } = {}) {
  const vehicleNos = Array.isArray(vendor.vehicleNos)
    ? vendor.vehicleNos.filter(Boolean)
    : vendor.vehicleNo
      ? [vendor.vehicleNo]
      : [];
  const data = await apiRequest('/water/vendors', {
    method: 'POST',
    body: {
      name: vendor.name,
      contactNumber: vendor.contactNumber || null,
      address: vendor.address || null,
      vehicleNos: vehicleNos.length > 0 ? vehicleNos : null,
      tankerCapacityKl: vendor.tankerCapacityKl ?? null,
    },
    signal,
  });
  return mapWaterVendor(data);
}

export async function addWaterVendorVehicle(vendorId, vehicleNo, { signal, notes } = {}) {
  const data = await apiRequest(`/water/vendors/${vendorId}/vehicles`, {
    method: 'POST',
    body: { vehicleNo, notes: notes || null },
    signal,
  });
  return {
    id: data.id,
    vehicleNo: (data.vehicleNo ?? '').toUpperCase(),
    isActive: data.isActive !== false,
    notes: data.notes ?? null,
  };
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

/**
 * Resolve `days` / `limit` for list API from dashboard filter chips.
 * @returns {{ days: number, limit: number, skip?: boolean }}
 */
export function resolveWaterListQuery(waterFilter, customFrom = '', customTo = '') {
  const today = new Date();
  const dmyToDate = (s) => {
    if (!s || typeof s !== 'string') return null;
    const [d, m, y] = s.split('/').map((p) => Number(p));
    if (!d || !m || Number.isNaN(y)) return null;
    const full = y < 100 ? 2000 + y : y;
    const dt = new Date(full, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  if (waterFilter === 'today') {
    return { days: 2, limit: 100 };
  }
  if (waterFilter === 'week') {
    return { days: 8, limit: 200 };
  }
  if (waterFilter === 'month') {
    return { days: 31, limit: 200 };
  }
  if (waterFilter === 'custom') {
    const from = dmyToDate(customFrom);
    const to = dmyToDate(customTo);
    const earliest = from && to ? (from < to ? from : to) : from || to;
    if (!earliest) {
      return { days: 31, limit: 200, skip: true };
    }
    const diff = Math.ceil((today - earliest) / (1000 * 60 * 60 * 24)) + 1;
    return { days: Math.min(365, Math.max(2, diff)), limit: 200 };
  }
  return { days: 31, limit: 200 };
}

export async function fetchWaterRecords({
  days = 30,
  limit = 200,
  includePhotos = false,
  signal,
} = {}) {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
    includePhotos: includePhotos ? 'true' : 'false',
  });
  const list = await apiRequest(`/water/records?${params}`, { signal });
  return Array.isArray(list) ? list : [];
}
