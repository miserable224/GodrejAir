function parseDMY(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || Number.isNaN(year)) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  const dt = new Date(fullYear, month - 1, day);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function parseNum(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).trim().replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

/** Tariff used by the vendor cost summary card. 13 paise / litre = ₹130 / KL. */
export const WATER_RATE_PER_KL = 130;

export function computeWaterDashboard({
  waterRecords,
  waterFilter,
  waterCustomFrom,
  waterCustomTo,
  waterSourceFilter,
  waterTankerFilter,
  tankCapacityKl,
  /**
   * Static baseline level of the reservoir (in KL). Used when none of the
   * tanker records carry an explicit `tankLevelKl` reading, so the capacity
   * card can still show "X of Y KL". Treat 1 m³ = 1 KL.
   */
  tankBaselineKl = 0,
  waterVendors = [],
}) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let rangeStart = startToday;
  let rangeEnd = endToday;
  if (waterFilter === 'week') {
    rangeStart = new Date(startToday);
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeEnd = endToday;
  } else if (waterFilter === 'month') {
    rangeStart = new Date(startToday);
    rangeStart.setDate(rangeStart.getDate() - 29);
    rangeEnd = endToday;
  } else if (waterFilter === 'custom') {
    const from = parseDMY(waterCustomFrom);
    const to = parseDMY(waterCustomTo);
    if (from && to) {
      rangeStart = from < to ? from : to;
      rangeEnd = from < to ? to : from;
      rangeEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999);
    }
  }

  const recordsInRangeBase = waterRecords
    .map((r, idx) => ({ ...r, _d: parseDMY(r.date), _idx: idx }))
    .filter((r) => r._d && r._d >= rangeStart && r._d <= rangeEnd)
    .sort((a, b) => {
      if (a._d.getTime() !== b._d.getTime()) return a._d - b._d;
      return b._idx - a._idx;
    });

  const recordsInRange = recordsInRangeBase
    .filter((r) => {
      if (waterSourceFilter === 'all') return true;
      return (r.sourceType || 'tanker') === waterSourceFilter;
    })
    .filter((r) => (waterTankerFilter === 'all' ? true : r.vehicleNo === waterTankerFilter));

  const tankerOptions = Array.from(
    new Set(
      recordsInRangeBase
          .filter((r) => (r.sourceType || 'tanker') === 'tanker')
          .map((r) => r.vehicleNo),
    ),
  ).filter(Boolean);

  const totalLoads = recordsInRange.reduce((s, r) => s + parseNum(r.load), 0);
  const avgTds =
    recordsInRange.length > 0
      ? Math.round(recordsInRange.reduce((s, r) => s + parseNum(r.tds), 0) / recordsInRange.length)
      : 0;
  const latest = recordsInRange[recordsInRange.length - 1];
  const latestInflow = Math.max(0, parseNum(latest?.closingMeter) - parseNum(latest?.openingMeter));
  const periodStartMeter = recordsInRange.length ? parseNum(recordsInRange[0].openingMeter) : 0;
  const periodEndMeter = recordsInRange.length
    ? parseNum(recordsInRange[recordsInRange.length - 1].closingMeter)
    : 0;
  const netDelta = Math.max(0, periodEndMeter - periodStartMeter);
  const latestRecordedTankLevelKl = parseNum(latest?.tankLevelKl);
  const baselineKl = parseNum(tankBaselineKl);
  // Records that don't carry a tank-level reading shouldn't blank out the
  // reservoir level; fall back to the configured baseline.
  const latestTankLevelKl = latestRecordedTankLevelKl > 0
    ? latestRecordedTankLevelKl
    : baselineKl;
  const safeCapacity = Math.max(1, parseNum(tankCapacityKl));
  const tankFillPct = Math.max(0, Math.min(100, (latestTankLevelKl / safeCapacity) * 100));

  const totalInflowMeter = recordsInRange.reduce(
    (s, r) => s + Math.max(0, parseNum(r.closingMeter) - parseNum(r.openingMeter)),
    0,
  );

  const tankShortfallKl = Math.max(0, safeCapacity - latestTankLevelKl);
  const inferredPerTankerKl = totalLoads > 0 ? totalInflowMeter / totalLoads : 12;
  const tankersRequired = inferredPerTankerKl > 0 ? Math.ceil(tankShortfallKl / inferredPerTankerKl) : 0;

  const rangeDays =
    recordsInRange.length > 0
      ? Math.max(
          1,
          Math.ceil(
            (recordsInRange[recordsInRange.length - 1]._d - recordsInRange[0]._d) / (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : 1;

  const tankDrops = recordsInRange.reduce((s, r, idx, arr) => {
    if (idx === 0) return s;
    const prev = parseNum(arr[idx - 1]?.tankLevelKl);
    const curr = parseNum(r?.tankLevelKl);
    return s + Math.max(0, prev - curr);
  }, 0);
  const netTankGain = Math.max(
    0,
    parseNum(recordsInRange[recordsInRange.length - 1]?.tankLevelKl) -
      parseNum(recordsInRange[0]?.tankLevelKl),
  );
  const estimatedUsageKl = Math.max(0, tankDrops);
  const avgDailyUsageKl = estimatedUsageKl > 0 ? estimatedUsageKl / rangeDays : 0;
  const daysLeftPrediction =
    avgDailyUsageKl > 0 ? Math.max(0, Math.floor(latestTankLevelKl / avgDailyUsageKl)) : null;
  const unaccountedLossKl = Math.max(0, totalInflowMeter - netTankGain - estimatedUsageKl);
  const unaccountedLossPct =
    totalInflowMeter > 0 ? Math.round((unaccountedLossKl / totalInflowMeter) * 100) : 0;

  const statusBand = tankFillPct < 20 ? 'critical' : tankFillPct <= 50 ? 'warning' : 'safe';

  const smartAlerts = [];
  if (tankFillPct < 20) smartAlerts.push('Critical tank level: below 20%');
  else if (tankFillPct <= 50) smartAlerts.push('Warning tank level: 20–50%');
  else smartAlerts.push('Tank level is healthy (>50%)');
  if (daysLeftPrediction !== null && daysLeftPrediction <= 2) {
    smartAlerts.push(`Days left prediction is low (${daysLeftPrediction} days)`);
  }
  if (unaccountedLossPct >= 10) {
    smartAlerts.push(`Possible leakage / unaccounted loss: ${unaccountedLossPct}%`);
  }

  const labelByFilter = {
    today: 'Today',
    week: '1 Week',
    month: '1 Month',
    custom: 'Custom',
  };

  // ── Per-vendor cost summary ────────────────────────────────────────────────
  // Each entry rolls up every record in the current date range that belongs
  // to one vendor:
  //   • declaredKl   = loads × vendor.tankerCapacityKl  (what they bill)
  //   • measuredKl   = Σ (closingMeter − openingMeter)  (what we received)
  //   • declaredCost = declaredKl × ₹130
  //   • measuredCost = measuredKl × ₹130
  //   • varianceKl   = measuredKl − declaredKl          (negative = shortfall)
  const vendorIndex = new Map();
  for (const v of waterVendors ?? []) {
    if (!v) continue;
    const key = String(v.id ?? v.vehicleNo ?? v.name ?? '');
    if (!key) continue;
    vendorIndex.set(key, v);
  }
  const findVendor = (r) => {
    if (r.tankerVendorId && vendorIndex.has(String(r.tankerVendorId)))
      return vendorIndex.get(String(r.tankerVendorId));
    if (r.vendorId && vendorIndex.has(String(r.vendorId)))
      return vendorIndex.get(String(r.vendorId));
    if (r.vehicleNo) {
      const plate = String(r.vehicleNo).trim().toUpperCase().replace(/[\s-]+/g, '');
      for (const v of vendorIndex.values()) {
        if (v.vehicleNo && String(v.vehicleNo).replace(/[\s-]+/g, '') === plate) return v;
        const fleet = v.vehicles ?? v.vehicleNos ?? [];
        const list = Array.isArray(fleet)
          ? fleet.map((x) => (typeof x === 'string' ? x : x?.vehicleNo))
          : [];
        if (list.some((p) => p && String(p).replace(/[\s-]+/g, '') === plate)) return v;
      }
    }
    if (r.source) {
      for (const v of vendorIndex.values()) if (v.name === r.source) return v;
    }
    return null;
  };

  const vendorAgg = new Map(); // key → {vendorName, capacityKl, loads, measuredKl}
  for (const r of recordsInRange) {
    if ((r.sourceType || 'tanker') !== 'tanker') continue;
    const v = findVendor(r);
    const key = v?.id ?? r.vehicleNo ?? r.source ?? 'unknown';
    const name = v?.name ?? r.source ?? r.vehicleNo ?? 'Unknown vendor';
    const capacityKl = Number(v?.tankerCapacityKl) > 0 ? Number(v.tankerCapacityKl) : 6;
    const loads = parseNum(r.load) || 1;
    const measuredKl = Math.max(0, parseNum(r.closingMeter) - parseNum(r.openingMeter));

    if (!vendorAgg.has(key)) {
      vendorAgg.set(key, {
        vendorId: v?.id ?? null,
        vendorName: name,
        vehicleNo: v?.vehicleNo ?? r.vehicleNo ?? null,
        platesUsed: new Set(),
        capacityKl,
        loads: 0,
        measuredKl: 0,
      });
    }
    const row = vendorAgg.get(key);
    if (r.vehicleNo) {
      const p = String(r.vehicleNo).trim().toUpperCase().replace(/[\s-]+/g, '');
      if (p) row.platesUsed.add(p);
    }
    row.loads += loads;
    row.measuredKl += measuredKl;
  }

  const vendorSummary = Array.from(vendorAgg.values())
    .map((row) => {
      const declaredKl = row.loads * row.capacityKl;
      const measuredKl = row.measuredKl;
      const declaredCost = Math.round(declaredKl * WATER_RATE_PER_KL);
      const measuredCost = Math.round(measuredKl * WATER_RATE_PER_KL);
      const platesLabel =
        row.platesUsed?.size > 0
          ? [...row.platesUsed].sort().join(', ')
          : row.vehicleNo;
      const { platesUsed, ...rest } = row;
      return {
        ...rest,
        vehicleNo: platesLabel,
        declaredKl,
        measuredKl,
        declaredCost,
        measuredCost,
        varianceKl: measuredKl - declaredKl,
        varianceCost: measuredCost - declaredCost,
      };
    })
    .sort((a, b) => b.declaredCost - a.declaredCost);

  const vendorSummaryTotals = vendorSummary.reduce(
    (acc, r) => {
      acc.loads += r.loads;
      acc.declaredKl += r.declaredKl;
      acc.measuredKl += r.measuredKl;
      acc.declaredCost += r.declaredCost;
      acc.measuredCost += r.measuredCost;
      return acc;
    },
    { loads: 0, declaredKl: 0, measuredKl: 0, declaredCost: 0, measuredCost: 0 },
  );

  return {
    recordsInRange,
    tankerOptions,
    totalLoads,
    avgTds,
    latestInflow,
    periodStartMeter,
    periodEndMeter,
    netDelta,
    latestTankLevelKl,
    safeCapacity,
    tankFillPct,
    tankShortfallKl,
    tankersRequired,
    inferredPerTankerKl,
    daysLeftPrediction,
    unaccountedLossPct,
    statusBand,
    smartAlerts,
    periodLabel: labelByFilter[waterFilter] || 'Today',
    vendorSummary,
    vendorSummaryTotals,
    waterRatePerKl: WATER_RATE_PER_KL,
  };
}
