import { HK_CONTRACT_RATES } from '../constants/hkContracts';
import { applyDeploymentEntriesToCounts, normalizeRoleKey } from '../../security/utils/securityRoleMapping';

function daysInCurrentMonthUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
}

function effectiveMonthly(rate) {
  const m = Number(rate?.monthlyRate) || 0;
  if (m > 0) return m;
  const d = Number(rate?.dailyRate) || 0;
  const dim = daysInCurrentMonthUtc();
  return d > 0 && dim > 0 ? d * dim : 0;
}

function perShiftFromMonthly(monthly) {
  const dim = daysInCurrentMonthUtc();
  if (monthly <= 0 || dim <= 0) return 0;
  return monthly / (2 * dim);
}

export function matchHkRoleRate(deploymentRole, rates) {
  if (!rates?.length) return null;
  const key = normalizeRoleKey(deploymentRole);
  const direct = rates.find((x) => normalizeRoleKey(x.roleName) === key);
  if (direct) return direct;

  if (key.includes('FACILITY') && key.includes('MANAGER') && !key.includes('ASSISTANT')) {
    return rates.find((x) => x.roleCode === 'HK_FM') || null;
  }
  if (key.includes('ASSISTANT') && key.includes('FACILITY')) {
    return rates.find((x) => x.roleCode === 'HK_AFM') || null;
  }
  if (key.includes('CRM') || key.includes('ACCOUNTANT')) {
    return rates.find((x) => x.roleCode === 'HK_CRM') || null;
  }
  if (key.includes('FRONT') && key.includes('OFFICE')) {
    return rates.find((x) => x.roleCode === 'HK_FRONT_OFFICE') || null;
  }
  if (key.includes('HOUSEKEEPING') && key.includes('STAFF')) {
    return rates.find((x) => x.roleCode === 'HK_STAFF') || null;
  }
  if (key.includes('HOUSEKEEPING') && key.includes('SUPERVISOR')) {
    return rates.find((x) => x.roleCode === 'HK_SUPERVISOR') || null;
  }
  if (key.includes('SUPERVISOR')) {
    return rates.find((x) => x.roleCode === 'HK_SUPERVISOR') || null;
  }
  if (key.includes('GARDEN')) return rates.find((x) => x.roleCode === 'HK_GARDENER') || null;
  if (key.includes('ELECTRIC')) return rates.find((x) => x.roleCode === 'HK_ELECTRICIAN') || null;
  if (key.includes('PLUMB')) return rates.find((x) => x.roleCode === 'HK_PLUMBER') || null;
  if (key.includes('STP') || key.includes('WTP') || key.includes('POOL')) {
    return rates.find((x) => x.roleCode === 'HK_STP_OPERATOR') || null;
  }
  return null;
}

/**
 * Shift-based ₹ estimate from deployed / demo headcount × contract monthly rates.
 */
export function estimateHkBillFromShifts(hkRows, rates) {
  const lines = [];
  let total = 0;

  if (!rates?.length || !hkRows?.length) {
    return { total: 0, lines };
  }

  for (const row of hkRows) {
    const actual = Number(row.actualS1) + Number(row.actualS2);
    const expectedSlots = Math.max(0, Number(row.expected) || 0) * 2;
    const present = actual > 0 ? actual : expectedSlots;
    const r = matchHkRoleRate(row.role, rates);
    const perShift = r ? perShiftFromMonthly(effectiveMonthly(r)) : 0;
    const line = present * perShift;
    total += line;
    lines.push({
      role: row.role,
      present,
      perShift,
      line,
      rateRole: r?.roleCode ?? null,
    });
  }

  return { total, lines };
}

/**
 * Contract role rows with demo S1/S2 until user deployments override counts.
 */
export function buildHkContractDisplayRows(staffCounts, entries, demoActuals) {
  const baseRows = HK_CONTRACT_RATES.map((rate) => {
    const template = staffCounts.find(
      (c) => c.category === 'FM_HK' && normalizeRoleKey(c.role) === normalizeRoleKey(rate.roleName),
    );
    const expectedS1 = rate.shift1Sanctioned;
    const expectedS2 = rate.shift2Sanctioned;
    const demo = demoActuals?.[rate.roleName];
    return {
      id: template?.id ?? `hk-${rate.roleCode}`,
      category: 'FM_HK',
      role: rate.roleName,
      expected: Math.max(expectedS1, expectedS2, template?.expected ?? 0),
      expectedS1,
      expectedS2,
      headcountSanctioned: rate.headcountSanctioned,
      monthlyRate: rate.monthlyRate,
      shiftTimings: rate.shiftTimings,
      skillType: rate.skillType,
      type: template?.type ?? rate.skillType ?? 'Skilled',
      shift: template?.shift ?? rate.shiftTimings,
      actualS1: demo?.s1 ?? 0,
      actualS2: demo?.s2 ?? 0,
    };
  });

  if (!entries?.length) {
    return baseRows;
  }

  let rows = baseRows.map((r) => ({ ...r, actualS1: 0, actualS2: 0 }));
  for (const entry of entries) {
    const roleKey = normalizeRoleKey(entry.designation);
    if (!roleKey) continue;
    if (!rows.some((r) => normalizeRoleKey(r.role) === roleKey)) {
      const rate = matchHkRoleRate(entry.designation, HK_CONTRACT_RATES);
      rows.push({
        id: `hk-deploy-${roleKey}`,
        category: 'FM_HK',
        role: entry.designation,
        expected: Math.max(rate?.shift1Sanctioned ?? 0, rate?.shift2Sanctioned ?? 0, 1),
        expectedS1: rate?.shift1Sanctioned ?? 1,
        expectedS2: rate?.shift2Sanctioned ?? 0,
        monthlyRate: rate?.monthlyRate ?? 0,
        actualS1: 0,
        actualS2: 0,
      });
    }
  }
  return applyDeploymentEntriesToCounts(rows, entries, 'FM_HK');
}
