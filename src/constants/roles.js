/**
 * Godrej Air — application roles (must stay in sync with backend AppRoles.cs).
 */

export const API_ROLES = {
  // Society
  RESIDENT: 'RESIDENT',
  OWNER: 'OWNER',
  BOARD_MEMBER: 'BOARD_MEMBER',
  PRESIDENT: 'PRESIDENT',
  SECRETARY: 'SECRETARY',
  VICE_PRESIDENT: 'VICE_PRESIDENT',
  TREASURER: 'TREASURER',
  // Operations
  SUPER_ADMIN: 'SUPER_ADMIN',
  SECURITY_SUPERVISOR: 'SECURITY_SUPERVISOR',
  SECURITY_GUARD: 'SECURITY_GUARD',
  FM: 'FM',
  AFM: 'AFM',
};

export const ROLE_LABELS = {
  [API_ROLES.RESIDENT]: 'Resident',
  [API_ROLES.OWNER]: 'Owner',
  [API_ROLES.BOARD_MEMBER]: 'Board Member',
  [API_ROLES.PRESIDENT]: 'President',
  [API_ROLES.SECRETARY]: 'Secretary',
  [API_ROLES.VICE_PRESIDENT]: 'Vice President',
  [API_ROLES.TREASURER]: 'Treasurer',
  [API_ROLES.SUPER_ADMIN]: 'Super Admin',
  [API_ROLES.SECURITY_SUPERVISOR]: 'Security Supervisor',
  [API_ROLES.SECURITY_GUARD]: 'Security Guard',
  [API_ROLES.FM]: 'Facility Manager',
  [API_ROLES.AFM]: 'Assistant Facility Manager',
  ADMIN: 'Super Admin',
  SUPERVISOR: 'Security Supervisor',
};

/** Navigation bucket → which API roles land there */
export const NAV_BUCKETS = {
  resident: [API_ROLES.RESIDENT, API_ROLES.OWNER],
  society: [
    API_ROLES.BOARD_MEMBER,
    API_ROLES.PRESIDENT,
    API_ROLES.SECRETARY,
    API_ROLES.VICE_PRESIDENT,
    API_ROLES.TREASURER,
  ],
  admin: [API_ROLES.SUPER_ADMIN, 'ADMIN'],
  operations: [API_ROLES.SECURITY_SUPERVISOR, 'SUPERVISOR', API_ROLES.FM, API_ROLES.AFM],
  guard: [API_ROLES.SECURITY_GUARD],
};

export function normalizeApiRole(role) {
  const r = String(role || '').trim().toUpperCase();
  if (r === 'ADMIN') return API_ROLES.SUPER_ADMIN;
  if (r === 'SUPERVISOR') return API_ROLES.SECURITY_SUPERVISOR;
  return r;
}

export function getRoleLabel(apiRole) {
  const n = normalizeApiRole(apiRole);
  return ROLE_LABELS[n] || n;
}

/** Map API role → app navigation bucket */
export function mapApiRoleToNavRole(apiRole) {
  const r = normalizeApiRole(apiRole);
  for (const [nav, roles] of Object.entries(NAV_BUCKETS)) {
    if (roles.includes(r)) return nav;
  }
  return 'resident';
}

export function isSocietyRole(apiRole) {
  const r = normalizeApiRole(apiRole);
  return NAV_BUCKETS.resident.includes(r) || NAV_BUCKETS.society.includes(r);
}

export function isBoardRole(apiRole) {
  return NAV_BUCKETS.society.includes(normalizeApiRole(apiRole));
}

export function isSuperAdmin(apiRole) {
  const r = normalizeApiRole(apiRole);
  return r === API_ROLES.SUPER_ADMIN;
}

/** Check-in / check-out on the Security module card. */
export function canUseSecurityOps(apiRole) {
  const r = normalizeApiRole(apiRole);
  return (
    isSuperAdmin(r) ||
    r === API_ROLES.SECURITY_SUPERVISOR ||
    r === API_ROLES.SECURITY_GUARD
  );
}

/** Record patrolling — SS and admin only (not FM / AFM). */
export function canRecordSecurityPatrol(apiRole) {
  const r = normalizeApiRole(apiRole);
  return isSuperAdmin(r) || r === API_ROLES.SECURITY_SUPERVISOR;
}

export function isOperationsStaff(apiRole) {
  return NAV_BUCKETS.operations.includes(normalizeApiRole(apiRole)) || isSuperAdmin(apiRole);
}

export function canAccessAdminDashboard(apiRole) {
  const nav = mapApiRoleToNavRole(apiRole);
  return nav === 'admin' || nav === 'operations' || nav === 'guard';
}

/** Dashboard module ids (AdminDashboardScreen section.id) */
export const DASHBOARD_MODULE_IDS = {
  RENTALS: 'rentals',
  AMC: 'amc',
  WATER: 'WaterTracking',
  SECURITY: 'Security',
  WORKFORCE: 'Workforce',
  EXPENSES: 'Expenses',
  PROMOTIONS: 'promotions',
  MYGATE: 'mygate',
};

/**
 * Which module cards a role may see. `null` = all modules.
 * Guard → Security + Water only.
 * FM / AFM → Housekeeping (Workforce) + Water only.
 */
export function getVisibleModuleIds(apiRole) {
  const r = normalizeApiRole(apiRole);
  switch (r) {
    case API_ROLES.SECURITY_GUARD:
      return new Set([DASHBOARD_MODULE_IDS.SECURITY, DASHBOARD_MODULE_IDS.WATER]);
    case API_ROLES.FM:
    case API_ROLES.AFM:
      return new Set([DASHBOARD_MODULE_IDS.WORKFORCE, DASHBOARD_MODULE_IDS.WATER]);
    case API_ROLES.SECURITY_SUPERVISOR:
      return new Set([
        DASHBOARD_MODULE_IDS.SECURITY,
        DASHBOARD_MODULE_IDS.WATER,
      ]);
    default:
      return null;
  }
}

export function isModuleVisible(moduleId, apiRole) {
  const allowed = getVisibleModuleIds(apiRole);
  if (!allowed) return true;
  return allowed.has(moduleId);
}

export function filterDashboardSections(sections, apiRole) {
  const allowed = getVisibleModuleIds(apiRole);
  if (!allowed) return sections;
  return sections.filter((s) => allowed.has(s.id));
}

export function filterDashboardGroups(groups, apiRole) {
  const allowed = getVisibleModuleIds(apiRole);
  if (!allowed) {
    return groups;
  }
  return groups
    .map((g) => ({
      ...g,
      sections: g.sections.filter((s) => allowed.has(s.id)),
    }))
    .filter((g) => g.sections.length > 0);
}

const FIELD_OPS_DASHBOARD_ROLES = new Set([
  API_ROLES.SECURITY_SUPERVISOR,
  API_ROLES.FM,
  API_ROLES.AFM,
]);

const FIELD_OPS_MODULE_IDS = new Set([
  DASHBOARD_MODULE_IDS.SECURITY,
  DASHBOARD_MODULE_IDS.WORKFORCE,
  DASHBOARD_MODULE_IDS.WATER,
]);

/** SS / FM / AFM — dashboard cards stay collapsed; duty + water entry actions only. */
export function isFieldOpsDashboardRole(apiRole) {
  return FIELD_OPS_DASHBOARD_ROLES.has(normalizeApiRole(apiRole));
}

export function canExpandDashboardModule(moduleId, apiRole) {
  if (!isFieldOpsDashboardRole(apiRole)) return true;
  return !FIELD_OPS_MODULE_IDS.has(moduleId);
}

/** FM, AFM, SS, and guards only get the Home tab (no Tenant tab). */
export function hasLimitedAdminNav(apiRole) {
  const r = normalizeApiRole(apiRole);
  return (
    r === API_ROLES.SECURITY_GUARD ||
    r === API_ROLES.SECURITY_SUPERVISOR ||
    r === API_ROLES.FM ||
    r === API_ROLES.AFM
  );
}

