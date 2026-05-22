import { Platform } from 'react-native';

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function isLocalhostHost(hostname) {
  if (!hostname) return true;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isLocalhostOrigin(origin) {
  try {
    const host = new URL(origin).hostname;
    return isLocalhostHost(host);
  } catch {
    return false;
  }
}

function resolveEnvOrigin(envValue, fallbackPort) {
  const fromEnv = normalizeOrigin(envValue);
  if (fromEnv) {
    // Vercel/production must not use localhost even if env was copied from .env.example
    if (
      Platform.OS === 'web' &&
      typeof globalThis !== 'undefined' &&
      globalThis.location?.hostname &&
      !isLocalhostHost(globalThis.location.hostname) &&
      isLocalhostOrigin(fromEnv)
    ) {
      return null;
    }
    return fromEnv;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${fallbackPort}`;
  }

  if (Platform.OS === 'web') {
    const host =
      typeof globalThis !== 'undefined' ? globalThis.location?.hostname : null;
    if (host && isLocalhostHost(host)) {
      return `http://localhost:${fallbackPort}`;
    }
    // Production web or static export build — require EXPO_PUBLIC_API_URL
    return null;
  }

  return `http://localhost:${fallbackPort}`;
}

/**
 * Security API (auth, security routes). Default port 5115.
 */
export function resolveSecurityApiOrigin() {
  return resolveEnvOrigin(
    process.env.EXPO_PUBLIC_SECURITY_API_URL || process.env.EXPO_PUBLIC_API_URL,
    5115,
  );
}

/**
 * Housekeeping routes — same host as Security API (single deployment).
 * EXPO_PUBLIC_HOUSEKEEPING_API_URL overrides only if you run a separate HK API locally.
 */
export function resolveHousekeepingApiOrigin() {
  const dedicated = normalizeOrigin(process.env.EXPO_PUBLIC_HOUSEKEEPING_API_URL);
  if (dedicated) return dedicated;
  return resolveSecurityApiOrigin();
}

/** @deprecated Use resolveSecurityApiOrigin */
export function resolveApiOrigin() {
  return resolveSecurityApiOrigin();
}

export function getSecurityApiOrigin() {
  const origin = resolveSecurityApiOrigin();
  if (!origin) {
    const onLiveWeb =
      Platform.OS === 'web' &&
      typeof globalThis !== 'undefined' &&
      globalThis.location?.hostname &&
      !isLocalhostHost(globalThis.location.hostname);
    throw new Error(
      onLiveWeb
        ? 'API URL not configured for production. In Vercel set EXPO_PUBLIC_API_URL to https://godrejair.onrender.com and redeploy.'
        : 'Security API URL is not configured. Set EXPO_PUBLIC_SECURITY_API_URL or EXPO_PUBLIC_API_URL.',
    );
  }
  return origin;
}

export function getHousekeepingApiOrigin() {
  const origin = resolveHousekeepingApiOrigin();
  if (!origin) {
    throw new Error(
      'API URL is not configured. Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_SECURITY_API_URL.',
    );
  }
  return origin;
}

/** @deprecated Use getSecurityApiOrigin */
export function getApiOrigin() {
  return getSecurityApiOrigin();
}

export function isProductionWebWithoutApi() {
  return Platform.OS === 'web' && resolveSecurityApiOrigin() == null;
}
