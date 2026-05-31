import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDesignations, invalidateSecurityCache } from '../services/securityService';
import { ensureValidAccessToken } from '../../shared/services/authService';

/**
 * Active duty designations for Security + Housekeeping check-in pickers.
 */
export function useDutyDesignations({ token, enabled }) {
  const [byModule, setByModule] = useState({ security: [], housekeeping: [] });
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const load = useCallback(async () => {
    if (!enabledRef.current || !token) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const accessToken = (await ensureValidAccessToken()) || token;
      if (!accessToken || controller.signal.aborted) return;

      invalidateSecurityCache();
      const [security, housekeeping] = await Promise.all([
        fetchDesignations(accessToken, 'security', controller.signal),
        fetchDesignations(accessToken, 'housekeeping', controller.signal),
      ]);
      if (!controller.signal.aborted) {
        setByModule({
          security: Array.isArray(security) ? security : [],
          housekeeping: Array.isArray(housekeeping) ? housekeeping : [],
        });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.warn('[useDutyDesignations]', err?.message || err);
        setByModule({ security: [], housekeeping: [] });
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!enabled || !token) {
      abortRef.current?.abort();
      setIsLoading(false);
      return undefined;
    }
    load();
    return () => abortRef.current?.abort();
  }, [enabled, token, load]);

  const refresh = useCallback(() => load(), [load]);

  return { byModule, isLoading, refresh };
}
