/** Normalize role labels for matching deployment rows to vendor rate cards. */
export function normalizeRoleKey(s) {
  return String(s || '')
    .trim()
    .split(/[\s_/]+/)
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

function rateCardRole(rate) {
  return rate?.roleName ?? rate?.role ?? rate?.RoleName ?? rate?.Role ?? '';
}

function findRateByDbRole(rates, dbRole) {
  const k = normalizeRoleKey(dbRole);
  return rates.find((x) => normalizeRoleKey(rateCardRole(x)) === k) || null;
}

/**
 * Match deployment UI labels to vendor rate `role` values (e.g. Tower / Main Gate → SECURITY_GUARD).
 */
export function matchSecurityRoleRate(deploymentRole, rates) {
  if (!rates?.length) return null;
  const key = normalizeRoleKey(deploymentRole);
  const direct = rates.find((x) => normalizeRoleKey(rateCardRole(x)) === key);
  if (direct) return direct;

  if (key.includes('LADY')) return findRateByDbRole(rates, 'LADY_GUARD');
  if (key.includes('SECURITY') && key.includes('OFFICER')) return findRateByDbRole(rates, 'SECURITY_OFFICER');
  if (key.includes('HEAD') && key.includes('GUARD')) return findRateByDbRole(rates, 'HEAD_GUARD');
  if (key.includes('SUPERVISOR')) return findRateByDbRole(rates, 'SUPERVISOR');

  if (
    key.includes('TOWER') ||
    key.includes('MAIN GATE') ||
    key.includes(' GATE') ||
    key.startsWith('GATE ') ||
    key.includes('PATROL') ||
    key.includes('PERIMETER') ||
    key.includes('GUARDS') ||
    key.endsWith(' GUARD') ||
    key.endsWith('GUARD')
  ) {
    return findRateByDbRole(rates, 'SECURITY_GUARD');
  }

  const fuzzy = rates.find((x) => {
    const rk = normalizeRoleKey(rateCardRole(x));
    return rk.length >= 4 && (key.includes(rk) || rk.includes(key));
  });
  return fuzzy || null;
}

function roleRowsFromSummary(summary) {
  return summary?.roles ?? summary?.Roles ?? [];
}

/**
 * Apply attendance API summaries to security deployment rows (S1/S2 split from daily deployed).
 */
export function mergeAttendanceSummariesIntoCounts(prev, summaries, rates) {
  if (!summaries?.length) return prev;

  const agg = new Map();
  for (const summary of summaries) {
    for (const role of roleRowsFromSummary(summary)) {
      const key = normalizeRoleKey(role.roleName ?? role.RoleName);
      if (!key) continue;
      const dep = Number(role.deployed ?? role.Deployed) || 0;
      const cur = agg.get(key) || { sum: 0, n: 0 };
      cur.sum += dep;
      cur.n += 1;
      agg.set(key, cur);
    }
  }

  if (agg.size === 0) return prev;

  return prev.map((item) => {
    if (item.category !== 'Security') return item;
    const rate = matchSecurityRoleRate(item.role, rates);
    const dbRole = rate?.roleName ?? rate?.role;
    if (!dbRole) return item;

    const target = normalizeRoleKey(dbRole);
    let deployed = 0;
    for (const [apiRole, val] of agg) {
      if (apiRole === target || apiRole.includes(target) || target.includes(apiRole)) {
        deployed = Math.round(val.sum / val.n);
        break;
      }
    }
    if (deployed <= 0) return item;

    const s1 = Math.ceil(deployed / 2);
    const s2 = Math.floor(deployed / 2);
    return { ...item, actualS1: s1, actualS2: s2 };
  });
}
