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
 * Apply period ops-dashboard role rows to security deployment cards.
 */
export function mergeSecurityOpsDashboardIntoCounts(prev, apiRoles) {
  if (!apiRoles?.length) return prev;

  return prev.map((item) => {
    if (item.category !== 'Security') return item;
    const key = normalizeRoleKey(item.role);
    const match = apiRoles.find((r) => normalizeRoleKey(r.role) === key);
    if (!match) return { ...item, actualS1: 0, actualS2: 0 };
    return {
      ...item,
      expected: Number(match.expected) || item.expected,
      actualS1: Number(match.actualS1) || 0,
      actualS2: Number(match.actualS2) || 0,
    };
  });
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

function bumpShiftCount(row) {
  if (row.actualS1 < row.expected) {
    return { ...row, actualS1: row.actualS1 + 1 };
  }
  if (row.actualS2 < row.expected) {
    return { ...row, actualS2: row.actualS2 + 1 };
  }
  return { ...row, actualS1: row.actualS1 + 1 };
}

/**
 * Reflect queued deployment entries on role rows (by designation → role).
 * Each entry adds +1 to S1 (or S2 if S1 is full) for the matching role card.
 * @param {'Security'|'FM_HK'} category
 */
export function applyDeploymentEntriesToCounts(counts, entries, category = 'Security') {
  if (!entries?.length || !counts?.length) return counts;

  let rows = counts.map((row) => ({ ...row }));
  for (const entry of entries) {
    const roleKey = normalizeRoleKey(entry.designation);
    if (!roleKey) continue;
    rows = rows.map((item) => {
      if (item.category !== category) return item;
      if (normalizeRoleKey(item.role) !== roleKey) return item;
      return bumpShiftCount(item);
    });
  }
  return rows;
}

/**
 * Role rows for a module card: only designations present in deployment entries.
 * Counts start at 0 and increment per queued/saved log; nothing added → empty list.
 */
export function buildDeploymentOnlyRoleRows(staffCounts, entries, category) {
  if (!entries?.length) return [];

  const deployedKeys = new Set(
    entries.map((e) => normalizeRoleKey(e.designation)).filter(Boolean),
  );

  const rows = staffCounts
    .filter((c) => c.category === category && deployedKeys.has(normalizeRoleKey(c.role)))
    .map((row) => ({ ...row, actualS1: 0, actualS2: 0 }));

  for (const entry of entries) {
    const key = normalizeRoleKey(entry.designation);
    if (!key || rows.some((r) => normalizeRoleKey(r.role) === key)) continue;

    const template = staffCounts.find(
      (c) => c.category === category && normalizeRoleKey(c.role) === key,
    );
    rows.push({
      ...(template || {
        id: `deploy-${category}-${key}`,
        category,
        role: (entry.designation || '').trim() || entry.designation,
        expected: 1,
      }),
      actualS1: 0,
      actualS2: 0,
    });
  }

  return applyDeploymentEntriesToCounts(rows, entries, category);
}

/** @deprecated Use applyDeploymentEntriesToCounts(counts, entries, 'Security') */
export function applySecurityEntriesToCounts(counts, entries) {
  return applyDeploymentEntriesToCounts(counts, entries, 'Security');
}
