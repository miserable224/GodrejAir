/**
 * llmWaterVisionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LLM-powered water-photo analyser. Replaces the Google Vision + regex pipeline
 * (`googleVisionService.js`) for new water-record captures.
 *
 * Flow:
 *   capturedPhotoUri  →  base64  →  POST /api/water/analyze-photos
 *                                       (Bearer JWT)
 *                                                  │
 *                                                  ▼
 *                              backend calls Llama 4 Scout (Groq) which
 *                              classifies the photo as starting_meter |
 *                              ending_meter | tds | vehicle_number and
 *                              extracts the literal reading.
 *
 * Exposes `analyzeWaterPhotoWithLLM(uri, photoIndex, filledFields)` whose
 * return shape matches `analyzeWaterPhotoWithVisionAPI` so callers can be
 * swapped without further changes.
 */

import { getSecurityApiOrigin, resolveSecurityApiOrigin } from '../modules/shared/config/apiConfig';
import { fetchWithNetworkHint } from '../modules/shared/utils/networkError';
import { ensureValidAccessToken, forceRefreshAccessToken } from '../modules/shared/services/authService';
import { uriToBase64 } from './googleVisionService';
import { WATER_PHOTO_TYPES } from '../constants/waterPhotoTypes';

function apiBase() {
  return `${getSecurityApiOrigin()}/api`;
}
function networkHint() {
  return `Cannot reach Water API at ${resolveSecurityApiOrigin() ?? 'unknown'}. Set EXPO_PUBLIC_API_URL.`;
}

async function apiRequest(path, { method = 'GET', body, signal, timeoutMs } = {}, retried = false) {
  const accessToken = await ensureValidAccessToken();
  if (!accessToken) throw new Error('Not signed in.');

  // Build an AbortController that bridges the supplied signal AND a timeout.
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const init = {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    signal: controller.signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res;
  try {
    res = await fetchWithNetworkHint(`${apiBase()}${path}`, init, networkHint());
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener?.('abort', onAbort);
  }

  if ((res.status === 401 || res.status === 403) && !retried) {
    const refreshed = await forceRefreshAccessToken();
    if (refreshed) return apiRequest(path, { method, body, signal, timeoutMs }, true);
    throw new Error(`Session expired (${res.status}).`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json?.message || json?.errors?.[0] || detail;
    } catch { /* ignore */ }
    throw new Error(`Water Vision API ${res.status}: ${detail}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

/** Map LLM-side type strings → our WATER_PHOTO_TYPES constants. */
function llmTypeToInternalType(t) {
  switch (String(t || '').toLowerCase()) {
    case 'starting_meter':
    case 'opening_meter':
      return WATER_PHOTO_TYPES.OPENING;
    case 'ending_meter':
    case 'closing_meter':
      return WATER_PHOTO_TYPES.CLOSING;
    case 'tds':
      return WATER_PHOTO_TYPES.TDS;
    case 'vehicle_number':
    case 'vehicle':
    case 'plate':
      return WATER_PHOTO_TYPES.VEHICLE;
    default:
      return null;
  }
}

/**
 * Analyse ONE water-record photo via the backend LLM endpoint.
 *
 * Signature matches `analyzeWaterPhotoWithVisionAPI` from googleVisionService.js
 * so swap-in is trivial.
 *
 * @param {string} photoUri               local URI of the captured photo
 * @param {number} photoIndex             0-based position (ignored, kept for parity)
 * @param {{opening:boolean, closing:boolean, tds:boolean, vehicle:boolean}} filledFields
 * @returns {Promise<{
 *   detectedType: string|null,
 *   detectedValue: string|null,
 *   rawText: string,
 *   confidence: number,
 *   simulated: boolean,
 *   model: string,
 * }>}
 */
export async function analyzeWaterPhotoWithLLM(photoUri, photoIndex = 0, filledFields = {}) {
  if (!photoUri) throw new Error('Photo URI is required.');

  const base64 = await uriToBase64(photoUri);

  const result = await apiRequest('/water/analyze-photos', {
    method: 'POST',
    body: {
      photos: [{ base64, mimeType: 'image/jpeg' }],
      openingFilled: !!filledFields.opening,
      closingFilled: !!filledFields.closing,
      tdsFilled: !!filledFields.tds,
      vehicleFilled: !!filledFields.vehicle,
    },
    timeoutMs: 60_000,
  });

  const first = Array.isArray(result?.items) ? result.items[0] : null;
  if (!first) {
    return {
      detectedType: null,
      detectedValue: null,
      rawText: '',
      confidence: 0,
      simulated: false,
      model: result?.model ?? '',
    };
  }

  return {
    detectedType: llmTypeToInternalType(first.type),
    detectedValue: first.value ?? null,
    rawText: first.rawText ?? '',
    confidence: typeof first.confidence === 'number' ? first.confidence : 0,
    simulated: false,
    model: result?.model ?? '',
    needsReview: !!result?.needsReview,
  };
}

/** Cheap probe so the UI can hide the Scan button when the LLM isn't configured. */
export async function getLlmVisionStatus() {
  try {
    const data = await apiRequest('/water/vision/status', { method: 'GET' });
    return { enabled: !!data?.enabled };
  } catch {
    return { enabled: false };
  }
}
