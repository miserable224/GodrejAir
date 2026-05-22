import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchHousekeepingDashboard, invalidateHousekeepingCache } from '../services/housekeepingService';
import { resolveWorkforceDateParams } from '../utils/workforceDateParams';
import { applyDeploymentEntriesToCounts } from '../../security/utils/securityRoleMapping';
import { buildHkContractDisplayRows } from '../utils/hkBilling';
import { HK_DEMO_SHIFT_ACTUALS } from '../constants/hkContracts';

const DEBOUNCE_MS = 400;

function mapApiRolesToRows(apiRoles) {
  if (!apiRoles?.length) return [];
  return apiRoles.map((r, i) => ({
    id: r.roleCode || `hk-api-${i}`,
    roleCode: r.roleCode,
    category: 'FM_HK',
    role: r.role ?? r.Role,
    expected: Number(r.expected ?? r.Expected) || 0,
    expectedS1: Number(r.expectedS1) || Number(r.expected) || 0,
    expectedS2: Number(r.expectedS2) || Number(r.expected) || 0,
    headcountSanctioned: Number(r.headcountSanctioned) || 0,
    monthlyRate: Number(r.monthlyRate) || 0,
    shiftTimings: r.shiftTimings ?? '',
    skillType: r.skillType ?? 'Skilled',
    actualS1: Number(r.actualS1 ?? r.ActualS1) || 0,
    actualS2: Number(r.actualS2 ?? r.ActualS2) || 0,
  }));
}

export function useHousekeepingData({
  token,
  staffTimePreset,
  staffDateRange = {},
  enabled = true,
}) {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodLabel, setPeriodLabel] = useState('Today');

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const dateParams = useMemo(
    () => resolveWorkforceDateParams(staffTimePreset, staffDateRange),
    [staffTimePreset, staffDateRange.from, staffDateRange.to],
  );

  const load = useCallback(() => {
    if (!enabled || !token || !dateParams.valid) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setPeriodLabel(dateParams.label);

    fetchHousekeepingDashboard(token, dateParams, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setDashboard(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('[useHousekeepingData]', err);
        setError(err?.message || 'Could not load housekeeping data');
        setDashboard(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }, [enabled, token, dateParams.cacheKey, dateParams.valid, dateParams.label, dateParams.from, dateParams.to]);

  useEffect(() => {
    if (!enabled || !token) return undefined;

    if (!dateParams.valid) {
      setPeriodLabel(
        staffTimePreset === 'custom'
          ? 'Custom · enter From and To (DD/MM/YYYY)'
          : dateParams.label,
      );
      return undefined;
    }

    const delay =
      isFirstLoadRef.current || staffTimePreset !== 'custom' ? 0 : DEBOUNCE_MS;
    isFirstLoadRef.current = false;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, delay);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, token, load, dateParams.valid, staffTimePreset]);

  const refresh = useCallback(() => {
    invalidateHousekeepingCache();
    load();
  }, [load]);

  const roleRows = useMemo(() => {
    const fromApi = mapApiRolesToRows(dashboard?.roles);
    if (fromApi.length) return fromApi;
    return buildHkContractDisplayRows([], [], HK_DEMO_SHIFT_ACTUALS);
  }, [dashboard]);

  return {
    dashboard,
    roleRows,
    periodLabel,
    isLoading,
    error,
    refresh,
    dateParams,
  };
}

/**
 * Merge queued/saved HK deployments onto API role rows for live UI updates.
 */
export function mergeHkDeploymentOverlay(apiRows, entries) {
  if (!entries?.length) return apiRows;
  const base = (apiRows ?? []).map((r) => ({ ...r, actualS1: 0, actualS2: 0 }));
  return applyDeploymentEntriesToCounts(base, entries, 'FM_HK');
}
