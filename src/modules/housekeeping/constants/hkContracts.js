/**
 * Annexure-III MANPOWER DEPLOYMENT — contract rates (₹/person/month).
 * Mirrors supabase/migrations/022_housekeeping_manpower_annexure.sql.
 */

export const HK_VENDOR_CONTRACT = {
  id: 'a1000000-0000-4000-8000-000000000001',
  vendorName: 'Sparkle Facility Services Pvt Ltd',
  contractNumber: 'HK-ANNEXURE-III-2025',
  startDate: '2025-04-01',
  endDate: '2026-03-31',
  serviceChargePercentage: 8,
  gstPercentage: 18,
  isActive: true,
};

/** Per-role monthly contract rates (₹) — keyed by deployment role label. */
export const HK_CONTRACT_RATES = [
  {
    roleCode: 'HK_FM',
    roleName: 'Facility Manager',
    monthlyRate: 55000,
    headcountSanctioned: 1,
    shiftTimings: '9:00 AM – 6:30 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 1,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_AFM',
    roleName: 'Assistant Facility Manager',
    monthlyRate: 40000,
    headcountSanctioned: 1,
    shiftTimings: '10:30 AM – 8:00 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 1,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_CRM',
    roleName: 'CRM / Accountant',
    monthlyRate: 30000,
    headcountSanctioned: 1,
    shiftTimings: '9:00 AM – 6:30 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 1,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_FRONT_OFFICE',
    roleName: 'Front Office Exe / Helpdesk',
    monthlyRate: 28750,
    headcountSanctioned: 1,
    shiftTimings: '9:00 AM – 6:30 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 1,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_SUPERVISOR',
    roleName: 'Housekeeping Supervisor',
    monthlyRate: 20000,
    headcountSanctioned: 1,
    shiftTimings: '8:30 AM – 5:30 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 1,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_STAFF',
    roleName: 'Housekeeping Staff',
    monthlyRate: 16865,
    headcountSanctioned: 24,
    shiftTimings: '24 Hours (Shifts)',
    skillType: 'Skilled',
    shift1Sanctioned: 12,
    shift2Sanctioned: 12,
  },
  {
    roleCode: 'HK_GARDENER',
    roleName: 'Gardener',
    monthlyRate: 16865,
    headcountSanctioned: 3,
    shiftTimings: '8:30 AM – 5:30 PM',
    skillType: 'Skilled',
    shift1Sanctioned: 3,
    shift2Sanctioned: 0,
  },
  {
    roleCode: 'HK_ELECTRICIAN',
    roleName: 'Electrician',
    monthlyRate: 25300,
    headcountSanctioned: 4,
    shiftTimings: '24 Hours (Shifts)',
    skillType: 'Skilled',
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
  {
    roleCode: 'HK_PLUMBER',
    roleName: 'Plumber',
    monthlyRate: 25300,
    headcountSanctioned: 4,
    shiftTimings: '24 Hours (Shifts)',
    skillType: 'Skilled',
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
  {
    roleCode: 'HK_STP_OPERATOR',
    roleName: 'STP/WTP/Pool Operator',
    monthlyRate: 27025,
    headcountSanctioned: 4,
    shiftTimings: '24 Hours (Shifts)',
    skillType: 'Skilled',
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
];

/** Contract monthly = Σ (monthlyRate × headcount). */
export function hkContractMonthlyTotal(rates = HK_CONTRACT_RATES) {
  return rates.reduce(
    (sum, r) => sum + (Number(r.monthlyRate) || 0) * Math.max(1, Number(r.headcountSanctioned) || 0),
    0,
  );
}

/** Demo on-duty counts (S1/S2) when no live deployments. */
export const HK_DEMO_SHIFT_ACTUALS = {
  'Facility Manager': { s1: 1, s2: 0 },
  'Assistant Facility Manager': { s1: 1, s2: 0 },
  'CRM / Accountant': { s1: 1, s2: 0 },
  'Front Office Exe / Helpdesk': { s1: 1, s2: 0 },
  'Housekeeping Supervisor': { s1: 1, s2: 0 },
  'Housekeeping Staff': { s1: 12, s2: 12 },
  Gardener: { s1: 3, s2: 0 },
  Electrician: { s1: 2, s2: 2 },
  Plumber: { s1: 2, s2: 2 },
  'STP/WTP/Pool Operator': { s1: 2, s2: 2 },
};
