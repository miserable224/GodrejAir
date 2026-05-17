import { Platform } from 'react-native';
import { loadStoredSession, saveStoredSession, clearStoredSession } from './authStorage';
import {
  mapApiRoleToNavRole,
  normalizeApiRole,
  getRoleLabel,
  API_ROLES,
} from '../constants/roles';

export { API_ROLES, mapApiRoleToNavRole, normalizeApiRole, getRoleLabel };

function resolveOrigin() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && typeof env === 'string') {
    return env.replace(/\/+$/, '').replace(/\/api$/i, '');
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:5115';
  return 'http://localhost:5115';
}

const API_ORIGIN = resolveOrigin();
const AUTH_BASE = `${API_ORIGIN}/api/auth`;

function normalizeTokenResponse(data) {
  return {
    accessToken: data.accessToken ?? data.access_token,
    refreshToken: data.refreshToken ?? data.refresh_token,
    expiresIn: data.expiresIn ?? data.expires_in ?? 900,
    role: data.role,
    displayName: data.displayName ?? data.display_name,
    username: data.username,
  };
}

function buildSession(tokens) {
  const expiresAt = Date.now() + (tokens.expiresIn || 900) * 1000;
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
    role: tokens.role,
    displayName: tokens.displayName,
    username: tokens.username,
    appRole: mapApiRoleToNavRole(tokens.role),
  };
}

async function parseAuthError(res) {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body?.error || body?.message || detail;
  } catch { /* ignore */ }
  return detail;
}

export async function sendAdminOtp(email) {
  const res = await fetch(`${AUTH_BASE}/admin/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Could not send OTP');
  return {
    message: body?.message || 'OTP sent',
    devOtp: body?.devOtp ?? null,
  };
}

export async function verifyAdminOtp(email, otp, displayName) {
  const res = await fetch(`${AUTH_BASE}/admin/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      displayName: displayName?.trim() || null,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'OTP verification failed');

  const tokenPayload = body?.tokens ?? body;
  const data = normalizeTokenResponse(tokenPayload);
  if (!data.accessToken || !data.refreshToken) {
    throw new Error('Invalid login response from server');
  }
  const session = buildSession(data);
  await saveStoredSession(session);
  notifySessionUpdated(session);
  return { session, userCreated: Boolean(body?.userCreated) };
}

export async function loginWithCredentials(username, password) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  const data = normalizeTokenResponse(await res.json());
  if (!data.accessToken || !data.refreshToken) {
    throw new Error('Invalid login response from server');
  }
  const session = buildSession(data);
  await saveStoredSession(session);
  notifySessionUpdated(session);
  return session;
}

export async function refreshSession(refreshToken) {
  const res = await fetch(`${AUTH_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error(await parseAuthError(res));
  const data = normalizeTokenResponse(await res.json());
  const prev = await loadStoredSession();
  const session = buildSession({
    ...data,
    displayName: data.displayName ?? prev?.displayName,
    username: data.username ?? prev?.username,
  });
  await saveStoredSession(session);
  notifySessionUpdated(session);
  return session;
}

export async function logoutOnServer(refreshToken) {
  if (!refreshToken) return;
  try {
    await fetch(`${AUTH_BASE}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* best effort */
  }
}

export async function clearSession() {
  const prev = await loadStoredSession();
  await logoutOnServer(prev?.refreshToken);
  await clearStoredSession();
}

export async function restoreSession() {
  const stored = await loadStoredSession();
  if (!stored?.accessToken || !stored?.refreshToken) return null;

  const stillValid = stored.expiresAt && Date.now() < stored.expiresAt - 60_000;
  if (stillValid) return stored;

  try {
    return await refreshSession(stored.refreshToken);
  } catch {
    await clearStoredSession();
    return null;
  }
}

export function sessionToUser(session) {
  if (!session) return null;
  const apiRole = normalizeApiRole(session.role);
  return {
    id: session.username,
    name: session.displayName || session.username,
    role: session.appRole,
    apiRole,
    roleLabel: getRoleLabel(apiRole),
    username: session.username,
  };
}

/** Singleton used by securityService for 401 → refresh → retry */
let sessionRef = null;
let onSessionExpired = null;
let onSessionUpdated = null;
let refreshInFlight = null;

export function setAuthSessionRef(session) {
  sessionRef = session;
}

export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

export function setOnSessionUpdated(handler) {
  onSessionUpdated = handler;
}

function notifySessionUpdated(session) {
  sessionRef = session;
  onSessionUpdated?.(session);
}

export function getAccessToken() {
  return sessionRef?.accessToken ?? null;
}

export async function ensureValidAccessToken() {
  if (!sessionRef?.accessToken) return null;
  if (sessionRef.expiresAt && Date.now() < sessionRef.expiresAt - 60_000) {
    return sessionRef.accessToken;
  }
  return forceRefreshAccessToken();
}

/** Refresh even when access token has not expired (e.g. after HTTP 401). */
export async function forceRefreshAccessToken() {
  if (!sessionRef?.refreshToken) {
    onSessionExpired?.('Session expired. Please sign in again.');
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshSession(sessionRef.refreshToken)
      .then((s) => {
        notifySessionUpdated(s);
        return s.accessToken;
      })
      .catch(() => {
        onSessionExpired?.('Session expired. Please sign in again.');
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}
