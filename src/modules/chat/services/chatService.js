/**
 * Chat / Community service — talks to /api/chat and /api/community on the .NET API.
 *
 * Mirrors the auth flow used by securityService (Bearer token + refresh-on-401).
 * No caching: every chat turn must hit the orchestrator.
 */

import { getSecurityApiOrigin, resolveSecurityApiOrigin } from '../../shared/config/apiConfig';
import { fetchWithNetworkHint } from '../../shared/utils/networkError';
import { ensureValidAccessToken, forceRefreshAccessToken } from '../../shared/services/authService';

function apiBase() {
  return `${getSecurityApiOrigin()}/api`;
}

function networkHint() {
  return `Cannot reach Community API at ${resolveSecurityApiOrigin() ?? 'unknown'}. Set EXPO_PUBLIC_API_URL.`;
}

class AuthError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'AuthError';
  }
}

async function apiRequest(path, { method = 'GET', body, signal } = {}, retried = false) {
  const accessToken = await ensureValidAccessToken();
  if (!accessToken) throw new AuthError('Not signed in');

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
    throw new AuthError(`Session expired (${res.status})`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AuthError(`Session expired (${res.status})`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json?.message || json?.errors?.[0] || detail;
    } catch { /* ignore */ }
    throw new Error(`Community API ${res.status} on ${path}: ${detail}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

// ─── Chat orchestrator ─────────────────────────────────────────────────────

/**
 * Send a chat message and receive a structured reply.
 * @returns {Promise<{ reply: string, data: any, intent: string, sessionId: string, suggestions: string[] }>}
 */
export async function sendChatMessage(message, sessionId, signal) {
  return apiRequest('/chat/message', {
    method: 'POST',
    body: { message, sessionId: sessionId ?? null },
    signal,
  });
}

// ─── Community read endpoints ──────────────────────────────────────────────

export async function fetchTodayClasses({ date, category, signal } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (category) params.set('category', category);
  const qs = params.toString();
  return apiRequest(`/community/classes${qs ? `?${qs}` : ''}`, { signal });
}

export async function fetchUpcomingClasses({ days = 7, signal } = {}) {
  return apiRequest(`/community/classes/upcoming?days=${days}`, { signal });
}

export async function fetchEvents({ from, to, category, signal } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (category) params.set('category', category);
  const qs = params.toString();
  return apiRequest(`/community/events${qs ? `?${qs}` : ''}`, { signal });
}

export async function fetchVendors({ date, category, signal } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (category) params.set('category', category);
  const qs = params.toString();
  return apiRequest(`/community/vendors${qs ? `?${qs}` : ''}`, { signal });
}
