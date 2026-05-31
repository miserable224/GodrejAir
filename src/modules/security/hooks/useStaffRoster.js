import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchStaff, invalidateSecurityCache } from '../services/securityService';
import { ensureValidAccessToken } from '../../shared/services/authService';

/**
 * Shared security_staff roster for Security + Housekeeping duty pickers.
 * Loads whenever either module (or duty modal) is active — not only Security expand.
 */
export function useStaffRoster({ token, enabled }) {
  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!enabled || !token) {
      setRoster([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const accessToken = (await ensureValidAccessToken()) || token;
      if (!accessToken || controller.signal.aborted) return;

      invalidateSecurityCache();
      const staff = await fetchStaff(accessToken, controller.signal);
      if (!controller.signal.aborted) {
        setRoster(Array.isArray(staff) ? staff : []);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.warn('[useStaffRoster]', err?.message || err);
        setRoster([]);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { roster, isLoading, refresh: load };
}
