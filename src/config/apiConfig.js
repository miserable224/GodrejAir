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

/**
 * Resolve API origin. EXPO_PUBLIC_API_URL is inlined at build time (set in Vercel env).
 */
export function resolveApiOrigin() {
  const fromEnv = normalizeOrigin(process.env.EXPO_PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5115';
  }

  if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && globalThis.location?.hostname) {
    const host = globalThis.location.hostname;
    if (!isLocalhostHost(host)) {
      return null;
    }
  }

  return 'http://localhost:5115';
}

export function getApiOrigin() {
  const origin = resolveApiOrigin();
  if (!origin) {
    throw new Error(
      'API URL is not configured for this deployment. In Vercel → Settings → Environment Variables, set EXPO_PUBLIC_API_URL to your live HTTPS API (e.g. https://your-api.example.com), then redeploy.',
    );
  }
  return origin;
}

export function isProductionWebWithoutApi() {
  return Platform.OS === 'web' && resolveApiOrigin() == null;
}
