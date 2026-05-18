import { resolveSecurityDateParams } from '../../security/utils/securityDateParams';

const PRESET_TO_RANGE = {
  today: 'Today',
  week: 'Last 1 Week',
  month: 'Last 1 Month',
  custom: 'Custom Range',
};

/**
 * Map Housekeeping UI presets to the same date params as Security ops.
 */
export function resolveWorkforceDateParams(staffTimePreset, staffDateRange = {}) {
  const dateRange = PRESET_TO_RANGE[staffTimePreset] ?? 'Today';
  return resolveSecurityDateParams(dateRange, staffDateRange);
}
