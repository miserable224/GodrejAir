import { getSecurityApiOrigin } from '../../shared/config/apiConfig';
import { fetchWithNetworkHint } from '../../shared/utils/networkError';
import { ensureValidAccessToken } from '../../shared/services/authService';

function apiBase() {
  return `${getSecurityApiOrigin()}/api`;
}

function apiNetworkHint() {
  return `Cannot reach API at ${getSecurityApiOrigin()}. Set EXPO_PUBLIC_API_URL.`;
}

function normalizeLookup(row) {
  const id = row?.id ?? row?.Id;
  if (!id) return null;
  return {
    id: String(id),
    name: String(row?.name ?? row?.Name ?? row?.typeName ?? row?.TypeName ?? ''),
  };
}

function normalizeVendor(row) {
  const id = row?.id ?? row?.Id;
  if (!id) return null;
  return {
    id: String(id),
    vendorName: String(row?.vendorName ?? row?.VendorName ?? ''),
    contactPerson: row?.contactPerson ?? row?.ContactPerson ?? '',
    phone: row?.phone ?? row?.Phone ?? '',
  };
}

function normalizeBoardMember(row) {
  const id = row?.id ?? row?.Id;
  if (!id) return null;
  const name = String(row?.name ?? row?.Name ?? '');
  const role = row?.role ?? row?.Role ?? '';
  return {
    id: String(id),
    name,
    role,
    phone: row?.phone ?? row?.Phone ?? '',
    label: role ? `${name} (${role})` : name,
  };
}

function normalizeLookups(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeLookup).filter(Boolean);
}

async function readApiError(res) {
  try {
    const body = await res.json();
    if (body?.errors?.length) return body.errors.join(', ');
    if (body?.message) return body.message;
    return JSON.stringify(body);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

async function authGet(path, token, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');

  const res = await fetchWithNetworkHint(
    `${apiBase()}${path}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${await readApiError(res)}`);
  }

  const body = await res.json();
  return body?.data ?? body ?? [];
}

async function authJson(method, path, token, payload, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');

  const url = `${apiBase()}${path}`;
  const res = await fetchWithNetworkHint(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${await readApiError(res)}`);
  }

  const body = await res.json();
  return body?.data ?? body;
}

export async function fetchPromotionTypes(token, signal) {
  const rows = await authGet('/promotion-types', token, signal);
  return normalizeLookups(rows);
}

export async function fetchPromotionVendors(token, signal) {
  const rows = await authGet('/vendors', token, signal);
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeVendor).filter(Boolean);
}

export async function fetchBoardMembers(token, signal) {
  const rows = await authGet('/promotions/board-members', token, signal);
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeBoardMember).filter(Boolean);
}

export function fetchPromotions(token, signal) {
  return authGet('/promotions', token, signal);
}

export function fetchPromotionDashboard(token, signal) {
  return authGet('/promotions/dashboard', token, signal);
}

export function fetchPromotionById(token, id, signal) {
  return authGet(`/promotions/${id}`, token, signal);
}

export function updatePromotion(token, id, payload, signal) {
  return authJson('PUT', `/promotions/${id}`, token, payload, signal);
}

export function addPromotionPayment(token, id, payload, signal) {
  return authJson('POST', `/promotions/${id}/payment`, token, payload, signal);
}

/**
 * Save one promotion — tries POST /api/promotions, falls back to bulk-create.
 */
export async function createPromotion(token, payload, signal) {
  const item = {
    promotionTypeId: payload.promotionTypeId,
    quantity: payload.quantity,
    unitPrice: payload.unitPrice,
    vendorId: payload.vendorId,
    boardMemberId: payload.boardMemberId || null,
    promotionTitle: payload.promotionTitle || null,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    notes: payload.notes || null,
  };

  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');

  const singleUrl = `${apiBase()}/promotions`;
  const singleRes = await fetchWithNetworkHint(
    singleUrl,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
      signal,
    },
    apiNetworkHint(),
  );

  if (singleRes.ok) {
    const body = await singleRes.json();
    return body?.data ?? body;
  }

  if (singleRes.status !== 404 && singleRes.status !== 405) {
    throw new Error(`/promotions failed (${singleRes.status}): ${await readApiError(singleRes)}`);
  }

  return authJson('POST', '/promotions/bulk-create', accessToken, { items: [item] }, signal);
}

/** @deprecated Use createPromotion */
export async function postPromotionsBulk(token, items, signal) {
  return authJson('POST', '/promotions/bulk-create', token, { items }, signal);
}

export async function uploadPromotionReceipt(token, file, promotionId, signal) {
  const accessToken = token || (await ensureValidAccessToken());
  if (!accessToken) throw new Error('Not signed in');
  if (!file) throw new Error('Receipt file is required.');

  const formData = new FormData();
  formData.append('file', file);

  const qs = promotionId ? `?promotionId=${encodeURIComponent(promotionId)}` : '';
  const res = await fetchWithNetworkHint(
    `${apiBase()}/upload-receipt${qs}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      signal,
    },
    apiNetworkHint(),
  );

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await readApiError(res)}`);
  }

  const body = await res.json();
  return body?.data ?? body;
}
