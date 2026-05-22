/** Format minutes as "8h 15m" for duty presence display. */
export function formatDutyDurationMinutes(minutes) {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDutyTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function sessionMinutes(s) {
  if (s.status === 'open' && s.entryAt) {
    return Math.max(0, Math.round((Date.now() - new Date(s.entryAt).getTime()) / 60000));
  }
  return s.durationMinutes ?? 0;
}

/** Sum minutes per staff across completed + open sessions. */
export function aggregateHoursByStaff(sessions) {
  const map = new Map();
  for (const s of sessions || []) {
    const name = (s.staffName || '').trim();
    if (!name) continue;
    const mins = sessionMinutes(s);
    map.set(name, (map.get(name) || 0) + mins);
  }
  return [...map.entries()]
    .map(([staffName, totalMinutes]) => ({
      staffName,
      totalMinutes,
      label: formatDutyDurationMinutes(totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}
