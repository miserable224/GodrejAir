/**
 * Check-in name lists: hide staff who already have an open duty session.
 */

export function onDutyNameSet(sessions) {
  return new Set(
    (sessions || [])
      .map((s) => (s.staffName || '').trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isStaffOnDuty(staffName, onDutySessions) {
  const key = (staffName || '').trim().toLowerCase();
  if (!key) return false;
  return onDutyNameSet(onDutySessions).has(key);
}

export function normalizeStaffRole(role) {
  return String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

/** Legacy / contract role codes that map to roster HOUSEKEEPING. */
const HK_ROLE_ALIASES = {
  HK_STAFF: 'HOUSEKEEPING',
  HOUSEKEEPING_STAFF: 'HOUSEKEEPING',
};

export function staffRoleMatchesAllowed(role, allowedRoles) {
  const key = normalizeStaffRole(role);
  const allowed = new Set((allowedRoles || []).map((r) => normalizeStaffRole(r)));
  if (allowed.has(key)) return true;
  const alias = HK_ROLE_ALIASES[key];
  return alias ? allowed.has(alias) : false;
}

/** Roster names limited to staff whose role is in allowedRoles (e.g. security vs HK). */
export function rosterNamesForRoles(staffRoster, allowedRoles) {
  return Array.from(
    new Set(
      (staffRoster || [])
        .filter((s) => staffRoleMatchesAllowed(s.role, allowedRoles))
        .map((s) => (s.name ?? s.Name ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

/** Full roster rows for a module (security vs HK), for manage picker edit/delete. */
export function rosterMembersForRoles(staffRoster, allowedRoles) {
  return (staffRoster || [])
    .filter((s) => {
      const id = s?.id ?? s?.Id;
      const name = (s?.name ?? s?.Name ?? '').trim();
      return id && name && staffRoleMatchesAllowed(s.role, allowedRoles);
    })
    .map((s) => ({
      id: s.id ?? s.Id,
      name: (s.name ?? s.Name ?? '').trim(),
      badgeNumber: s.badgeNumber ?? s.BadgeNumber ?? null,
      role: s.role ?? s.Role ?? '',
      phone: s.phone ?? s.Phone ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Names available for check-in (not currently on duty). */
export function filterNamesAvailableForCheckIn(allNames, onDutySessions) {
  const busy = onDutyNameSet(onDutySessions);
  return (allNames || [])
    .filter((n) => {
      const key = String(n).trim().toLowerCase();
      return key && !busy.has(key);
    })
    .sort((a, b) => a.localeCompare(b));
}
