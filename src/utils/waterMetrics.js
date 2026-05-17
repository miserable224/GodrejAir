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

export function computeWaterDashboard({
  waterRecords,
  waterFilter,
  waterCustomFrom,
  waterCustomTo,
  waterSourceFilter,
  waterTankerFilter,
  tankCapacityKl,
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

  const totalLoads = recordsInRange.reduce((s, r) => s + Number(r.load || 0), 0);
  const avgTds =
    recordsInRange.length > 0
      ? Math.round(recordsInRange.reduce((s, r) => s + Number(r.tds || 0), 0) / recordsInRange.length)
      : 0;
  const latest = recordsInRange[recordsInRange.length - 1];
  const latestInflow = Math.max(0, Number(latest?.closingMeter || 0) - Number(latest?.openingMeter || 0));
  const periodStartMeter = recordsInRange.length ? Number(recordsInRange[0].openingMeter || 0) : 0;
  const periodEndMeter = recordsInRange.length
    ? Number(recordsInRange[recordsInRange.length - 1].closingMeter || 0)
    : 0;
  const netDelta = Math.max(0, periodEndMeter - periodStartMeter);
  const latestTankLevelKl = Number(latest?.tankLevelKl || 0);
  const safeCapacity = Math.max(1, Number(tankCapacityKl || 0));
  const tankFillPct = Math.max(0, Math.min(100, (latestTankLevelKl / safeCapacity) * 100));

  const totalInflowMeter = recordsInRange.reduce(
    (s, r) => s + Math.max(0, Number(r.closingMeter || 0) - Number(r.openingMeter || 0)),
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
    const prev = Number(arr[idx - 1]?.tankLevelKl || 0);
    const curr = Number(r?.tankLevelKl || 0);
    return s + Math.max(0, prev - curr);
  }, 0);
  const netTankGain = Math.max(
    0,
    Number(recordsInRange[recordsInRange.length - 1]?.tankLevelKl || 0) -
      Number(recordsInRange[0]?.tankLevelKl || 0),
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
  };
}
