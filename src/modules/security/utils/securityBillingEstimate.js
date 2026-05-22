import { normalizeRoleKey } from './securityRoleMapping';

function rateCardRole(rate) {
  return rate?.roleName ?? rate?.role ?? rate?.RoleName ?? rate?.Role ?? '';
}

function findRateByDbRole(rates, dbRole) {
  const k = normalizeRoleKey(dbRole);
  return rates.find((x) => normalizeRoleKey(rateCardRole(x)) === k) || null;
}

function matchSecurityRoleRate(deploymentRole, rates) {
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

function daysInCurrentMonthUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
}

function effectiveMonthlyPerPaxFromRateCard(rate) {
  const m = Number(rate?.monthlyRate ?? rate?.MonthlyRate) || 0;
  if (m > 0) return m;
  const d = Number(rate?.dailyRate ?? rate?.DailyRate) || 0;
  const days = daysInCurrentMonthUtc();
  return d > 0 && days > 0 ? d * days : 0;
}

function perShiftRateFromMonthlyRateCard(rate) {
  const monthly = effectiveMonthlyPerPaxFromRateCard(rate);
  const dim = daysInCurrentMonthUtc();
  if (monthly <= 0 || dim <= 0) return 0;
  return monthly / (2 * dim);
}

export function estimateSecurityBillFromShifts(securityRows, rates, sanctionedStrength = []) {
  let total = 0;

  if (rates?.length) {
    for (const row of securityRows) {
      const actual = Number(row.actualS1) + Number(row.actualS2);
      const expectedSlots = Math.max(0, Number(row.expected) || 0) * 2;
      const present = actual > 0 ? actual : expectedSlots;
      const r = matchSecurityRoleRate(row.role, rates);
      const perShift = r ? perShiftRateFromMonthlyRateCard(r) : 0;
      total += present * perShift;
    }
  }

  if (total <= 0 && rates?.length && sanctionedStrength?.length) {
    for (const s of sanctionedStrength) {
      const slots =
        (Number(s.shift1Count) || 0) +
        (Number(s.shift2Count) || 0) +
        (Number(s.shift3Count) || 0) +
        (Number(s.generalShiftCount) || 0) +
        (Number(s.relieverCount) || 0);
      if (slots <= 0) continue;
      const r = matchSecurityRoleRate(s.roleName ?? s.role, rates);
      const monthly = r ? effectiveMonthlyPerPaxFromRateCard(r) : 0;
      total += slots * monthly;
    }
  }

  return total;
}
