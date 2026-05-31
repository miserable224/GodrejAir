/**
 * Normalize and parse Indian-style vehicle plates for the water module.
 */

export function normalizeVehicleNo(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const plate = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
  return plate.length >= 4 ? plate : '';
}

/** One plate per line, or comma / semicolon separated. */
export function parseVehicleNosText(text) {
  const seen = new Set();
  const out = [];
  for (const part of String(text || '').split(/[\n,;]+/)) {
    const plate = normalizeVehicleNo(part);
    if (!plate || seen.has(plate)) continue;
    seen.add(plate);
    out.push(plate);
  }
  return out;
}

export function mapVendorVehiclesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map((x) => ({
    id: x.id,
    vehicleNo: normalizeVehicleNo(x.vehicleNo ?? x.vehicle_no ?? ''),
    isActive: x.isActive !== false && x.is_active !== false,
    notes: x.notes ?? '',
  }));
}

/** Display string for vendor picker / grid (active plates only). */
export function formatVendorPlates(vendor) {
  const active = (vendor?.vehicles ?? [])
    .filter((x) => x.isActive !== false)
    .map((x) => normalizeVehicleNo(x.vehicleNo))
    .filter(Boolean);
  if (active.length > 0) {
    if (active.length <= 2) return active.join(', ');
    return `${active.slice(0, 2).join(', ')} +${active.length - 2}`;
  }
  const legacy = normalizeVehicleNo(vendor?.vehicleNo);
  return legacy || 'No plates registered';
}

export function vendorMatchesPlate(vendor, plate) {
  const needle = normalizeVehicleNo(plate);
  if (!needle) return false;
  if (normalizeVehicleNo(vendor?.vehicleNo) === needle) return true;
  return (vendor?.vehicles ?? []).some(
    (x) => x.isActive !== false && normalizeVehicleNo(x.vehicleNo) === needle,
  );
}
