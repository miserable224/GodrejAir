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
