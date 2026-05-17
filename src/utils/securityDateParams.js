const pad2 = (n) => String(n).padStart(2, '0');

/** Parse DD/MM/YYYY or DD-MM-YYYY; 2-digit year → 2000+y */
export function parseDMYInput(str) {
  const parts = String(str || '').trim().split(/[/-]/);
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  let y = parseInt(parts[2], 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (y < 100) y += 2000;
  const dt = new Date(y, m, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMonth(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function enumerateDates(from, to, maxDays = 31) {
  const out = [];
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end && out.length < maxDays) {
    out.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Map security UI date presets to API query parameters.
 * @returns {{ mode, month, dates, cacheKey, label, valid }}
 */
export function resolveSecurityDateParams(dateRange, customRange = {}) {
  const today = startOfDay(new Date());

  if (dateRange === 'Today') {
    const date = toYMD(today);
    return {
      mode: 'day',
      month: toMonth(today),
      dates: [date],
      cacheKey: `today:${date}`,
      label: 'Today',
      valid: true,
    };
  }

  if (dateRange === 'Last 1 Week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const dates = enumerateDates(from, today, 7);
    return {
      mode: 'range',
      month: toMonth(today),
      from: toYMD(from),
      to: toYMD(today),
      dates,
      cacheKey: `week:${dates[0]}:${dates[dates.length - 1]}`,
      label: 'Last 7 days',
      valid: true,
    };
  }

  if (dateRange === 'Last 1 Month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const dates = enumerateDates(from, today, 31);
    return {
      mode: 'month',
      month: toMonth(today),
      from: toYMD(from),
      to: toYMD(today),
      dates,
      cacheKey: `month:${toMonth(today)}`,
      label: 'This month',
      valid: true,
    };
  }

  if (dateRange === 'Custom Range') {
    const df = parseDMYInput(customRange.from);
    const dt = parseDMYInput(customRange.to);
    if (!df || !dt || dt < df) {
      return {
        mode: 'invalid',
        month: toMonth(today),
        dates: [],
        cacheKey: 'custom:invalid',
        label: 'Custom range',
        valid: false,
      };
    }
    const dates = enumerateDates(df, dt, 31);
    return {
      mode: 'range',
      month: toMonth(dt),
      from: toYMD(df),
      to: toYMD(dt),
      dates,
      cacheKey: `custom:${toYMD(df)}:${toYMD(dt)}`,
      label: `${customRange.from} – ${customRange.to}`,
      valid: true,
    };
  }

  const date = toYMD(today);
  return {
    mode: 'day',
    month: toMonth(today),
    dates: [date],
    cacheKey: `default:${date}`,
    label: 'Today',
    valid: true,
  };
}
