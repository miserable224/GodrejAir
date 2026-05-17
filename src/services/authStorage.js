import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'godrej_air_session';

async function webGet() {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function webSet(value) {
  if (value == null) {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return;
  }
  globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(value));
}

export async function loadStoredSession() {
  try {
    if (Platform.OS === 'web') return webGet();
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session) {
  try {
    const payload = JSON.stringify(session);
    if (Platform.OS === 'web') {
      webSet(session);
      return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, payload);
  } catch (err) {
    console.warn('[authStorage] save failed', err);
  }
}

export async function clearStoredSession() {
  try {
    if (Platform.OS === 'web') {
      webSet(null);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
