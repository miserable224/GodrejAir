/**
 * Housekeeping vendor contract — dummy data for deployment UI & shift-based estimates.
 * Mirrors security_vendor_contracts + role rates (see supabase/migrations/015_housekeeping_contracts.sql).
 */

export const HK_VENDOR_CONTRACT = {
  id: 'hk-contract-demo-001',
  vendorName: 'Sparkle Facility Services Pvt Ltd',
  contractNumber: 'HK-GAIR-2025-042',
  startDate: '2025-04-01',
  endDate: '2026-03-31',
  serviceChargePercentage: 8,
  gstPercentage: 18,
  isActive: true,
};

/** Per-role monthly contract rates (₹) — keyed by deployment role label. */
export const HK_CONTRACT_RATES = [
  {
    roleCode: 'HK_SUPERVISOR',
    roleName: 'Housekeeping Supervisor',
    monthlyRate: 22400,
    shift1Sanctioned: 1,
    shift2Sanctioned: 1,
  },
  {
    roleCode: 'HK_STAFF',
    roleName: 'Housekeeping Staff',
    monthlyRate: 14850,
    shift1Sanctioned: 12,
    shift2Sanctioned: 12,
  },
  {
    roleCode: 'HK_GARDENER',
    roleName: 'Gardener',
    monthlyRate: 18200,
    shift1Sanctioned: 2,
    shift2Sanctioned: 1,
  },
  {
    roleCode: 'HK_ELECTRICIAN',
    roleName: 'Electrician',
    monthlyRate: 20500,
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
  {
    roleCode: 'HK_PLUMBER',
    roleName: 'Plumber',
    monthlyRate: 19800,
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
  {
    roleCode: 'HK_STP_OPERATOR',
    roleName: 'STP/WTP/Pool Operator',
    monthlyRate: 21200,
    shift1Sanctioned: 2,
    shift2Sanctioned: 2,
  },
];

/** Demo on-duty counts (S1/S2) when no live deployments — realistic full-strength day. */
export const HK_DEMO_SHIFT_ACTUALS = {
  'Housekeeping Supervisor': { s1: 1, s2: 1 },
  'Housekeeping Staff': { s1: 12, s2: 12 },
  Gardener: { s1: 3, s2: 3 },
  Electrician: { s1: 2, s2: 2 },
  Plumber: { s1: 2, s2: 2 },
  'STP/WTP/Pool Operator': { s1: 2, s2: 2 },
};
