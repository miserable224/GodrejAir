/**
 * useSecurityData — security state + date-aware API loading for the admin dashboard.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchSecurityDashboard, invalidateSecurityCache } from '../services/securityService';
import { ADMIN_MANPOWER_DEPLOYMENT } from '../../../constants/data';
import { resolveSecurityDateParams } from '../utils/securityDateParams';
import { mergeSecurityOpsDashboardIntoCounts } from '../utils/securityRoleMapping';

const DEBOUNCE_MS = 400;

function buildInitialCounts() {
  return ADMIN_MANPOWER_DEPLOYMENT.map((item) => ({
    ...item,
    actualS1: item.expected,
    actualS2: item.expected,
  }));
}

export function useSecurityData({ token, dateRange, customRange = {}, enabled = true }) {
  const [staffCounts, setStaffCounts] = useState(buildInitialCounts);
  const [securityRoleRates, setSecurityRoleRates] = useState([]);
  const [sanctionedStrength, setSanctionedStrength] = useState([]);
  const [securityBilling, setSecurityBilling] = useState(null);
  const [securityDashboard, setSecurityDashboard] = useState(null);
  const [staffRoster, setStaffRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchErrors, setFetchErrors] = useState({});
  const [periodLabel, setPeriodLabel] = useState('Today');

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const dateParams = useMemo(
    () => resolveSecurityDateParams(dateRange, customRange),
    [dateRange, customRange.from, customRange.to],
  );

  const load = useCallback(() => {
    if (!enabled || !token || !dateParams.valid) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setPeriodLabel(dateParams.label);

    fetchSecurityDashboard(token, dateParams, controller.signal)
      .then(({ rates, strength, staff, opsDashboard, billing, errors }) => {
        if (controller.signal.aborted) return;

        setSecurityRoleRates(rates);
        setSanctionedStrength(strength);
        setStaffRoster(Array.isArray(staff) ? staff : []);
        setSecurityDashboard(opsDashboard);
        setSecurityBilling(billing);
        setFetchErrors(errors);

        setStaffCounts((prev) => {
          const base = buildInitialCounts().map((row, i) =>
            row.category === 'FM_HK' && prev[i]
              ? { ...row, actualS1: prev[i].actualS1, actualS2: prev[i].actualS2 }
              : row,
          );
          if (opsDashboard?.roles?.length) {
            return mergeSecurityOpsDashboardIntoCounts(base, opsDashboard.roles);
          }
          return base.map((row) =>
            row.category === 'Security' ? { ...row, actualS1: 0, actualS2: 0 } : row,
          );
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('[useSecurityData] burst fetch failed:', err);
        setFetchErrors({ burst: err.message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }, [
    enabled,
    token,
    dateParams.cacheKey,
    dateParams.valid,
    dateParams.label,
    dateParams.from,
    dateParams.to,
  ]);

  useEffect(() => {
    if (!enabled || !token) return undefined;

    if (!dateParams.valid) {
      setPeriodLabel(
        dateRange === 'Custom Range'
          ? 'Custom · enter From and To (DD/MM/YYYY)'
          : dateParams.label,
      );
      return undefined;
    }

    const delay =
      isFirstLoadRef.current || dateRange !== 'Custom Range' ? 0 : DEBOUNCE_MS;
    isFirstLoadRef.current = false;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, delay);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, token, load, dateParams.valid, dateRange]);

  const refresh = useCallback(() => {
    invalidateSecurityCache();
    load();
  }, [load]);

  return {
    staffCounts,
    setStaffCounts,
    securityRoleRates,
    sanctionedStrength,
    setSanctionedStrength,
    securityBilling,
    securityDashboard,
    staffRoster,
    isLoading,
    fetchErrors,
    periodLabel,
    refresh,
  };
}
