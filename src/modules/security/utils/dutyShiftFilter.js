/** Shift 1 = morning (DAY), Shift 2 = night (NIGHT) — matches backend DutyShiftInference. */

export function inferShiftNumberFromInstant(iso) {
  if (!iso) return 1;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 1;
  const hour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(d),
    10,
  );
  return hour >= 6 && hour < 18 ? 1 : 2;
}

export function sessionShiftNumber(session) {
  const raw = String(session?.entryShift || '').toUpperCase();
  if (raw === 'DAY' || raw.includes('MORNING')) return 1;
  if (raw === 'NIGHT' || raw.includes('NIGHT')) return 2;
  return inferShiftNumberFromInstant(session?.entryAt);
}

export function sessionMatchesShift(session, shiftNumber) {
  return sessionShiftNumber(session) === shiftNumber;
}

export const SHIFT_LABELS = { 1: 'Shift 1', 2: 'Shift 2' };
export const SHIFT_SUBLABELS = { 1: 'Morning · 6am–6pm', 2: 'Night · 6pm–6am' };
