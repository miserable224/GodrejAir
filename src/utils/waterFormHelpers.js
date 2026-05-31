import {
  WATER_PHOTO_TYPES,
  WATER_PHOTO_CAPTURE_ORDER,
  WATER_PHOTO_CHECKLIST,
} from '../constants/waterPhotoTypes';
import { photoHasGps } from './geoPhoto';

export function photoTypeStatusKey(type) {
  switch (type) {
    case WATER_PHOTO_TYPES.OPENING:
      return 'opening';
    case WATER_PHOTO_TYPES.CLOSING:
      return 'closing';
    case WATER_PHOTO_TYPES.TDS:
      return 'tds';
    case WATER_PHOTO_TYPES.VEHICLE:
      return 'vehicle';
    default:
      return null;
  }
}

/** Next photo type in the guided capture sequence, or null when all four are scanned. */
export function nextWaterPhotoCaptureType(form) {
  const status = waterPhotoTypeStatus(form);
  for (const type of WATER_PHOTO_CAPTURE_ORDER) {
    const key = photoTypeStatusKey(type);
    if (key && !status[key]) return type;
  }
  return null;
}

export function nextMissingWaterPhotoChecklistItem(form) {
  const status = waterPhotoTypeStatus(form);
  return (
    WATER_PHOTO_CHECKLIST.find((item) => {
      const key = photoTypeStatusKey(item.type);
      return key && !status[key];
    }) ?? null
  );
}

export function waterPhotoTypesCapturedCount(form) {
  const status = waterPhotoTypeStatus(form);
  return WATER_PHOTO_CAPTURE_ORDER.filter((type) => {
    const key = photoTypeStatusKey(type);
    return key && status[key];
  }).length;
}

export function getTodayDMY() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear() % 100).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

export function getNowTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function createEmptyWaterForm() {
  return {
    date: getTodayDMY(),
    time: getNowTimeLabel(),
    sourceType: 'tanker',
    tankerVendorId: '',
    source: '',
    openingMeter: '',
    closingMeter: '',
    tds: '',
    vehicleNo: '',
    // `load` is auto-computed from closingMeter - openingMeter at submit time;
    // no longer surfaced as a UI field.
    load: '',
    userValidated: false,
    photos: [],
  };
}

function parseMeterNum(value) {
  if (value == null || value === '') return NaN;
  return parseFloat(String(value).replace(/,/g, '').replace(/\s/g, ''));
}

export function computeWaterLoad(openingMeter, closingMeter) {
  const o = parseMeterNum(openingMeter);
  const c = parseMeterNum(closingMeter);
  if (!Number.isFinite(o) || !Number.isFinite(c) || c < o) return '';
  const delta = c - o;
  return Number.isInteger(delta) ? String(delta) : delta.toFixed(1);
}

/**
 * After each photo scan, ensure that among ALL captured meter photos the
 * lowest reading is always the starting meter and the highest is always the
 * ending meter — regardless of which type the LLM tagged each photo as.
 *
 * This corrects two common LLM mistakes:
 *   1. Two meter photos sent separately (single-photo mode), both classified
 *      as "starting_meter" because the model has no cross-photo context.
 *   2. The model swapping starting / ending labels on the same image type.
 *
 * Photo badges are also rewritten to match the new assignment so the UI
 * stays consistent with the form fields.
 */
function reconcileMeterPhotos(form) {
  const photos = form.photos ?? [];
  const meterPhotos = photos.filter(
    (p) =>
      (p.detectedType === WATER_PHOTO_TYPES.OPENING ||
        p.detectedType === WATER_PHOTO_TYPES.CLOSING) &&
      Number.isFinite(parseMeterNum(p.detectedValue)),
  );
  if (meterPhotos.length < 2) return form;

  const sorted = [...meterPhotos].sort(
    (a, b) => parseMeterNum(a.detectedValue) - parseMeterNum(b.detectedValue),
  );
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  // No-op if both photos somehow have the same reading.
  if (parseMeterNum(lowest.detectedValue) === parseMeterNum(highest.detectedValue)) {
    return form;
  }

  const lowestId = lowest.id;
  const highestId = highest.id;

  const nextPhotos = photos.map((p) => {
    if (p.id === lowestId && p.detectedType !== WATER_PHOTO_TYPES.OPENING) {
      return { ...p, detectedType: WATER_PHOTO_TYPES.OPENING };
    }
    if (p.id === highestId && p.detectedType !== WATER_PHOTO_TYPES.CLOSING) {
      return { ...p, detectedType: WATER_PHOTO_TYPES.CLOSING };
    }
    return p;
  });

  return {
    ...form,
    photos: nextPhotos,
    openingMeter: lowest.detectedValue,
    closingMeter: highest.detectedValue,
  };
}

/**
 * Merge OCR result into form fields (any photo order).
 */
export function applyWaterOcrToForm(form, scanResult) {
  let next = { ...form };
  const type = scanResult?.detectedType;
  const value = scanResult?.detectedValue ?? '';

  switch (type) {
    case WATER_PHOTO_TYPES.OPENING:
      if (value) next.openingMeter = value;
      break;
    case WATER_PHOTO_TYPES.CLOSING:
      if (value) next.closingMeter = value;
      break;
    case WATER_PHOTO_TYPES.TDS:
      if (value) next.tds = value;
      break;
    case WATER_PHOTO_TYPES.VEHICLE:
      if (value) next.vehicleNo = value;
      break;
    case 'meter_reading':
      if (value) {
        if (!next.openingMeter) next.openingMeter = value;
        else if (!next.closingMeter) next.closingMeter = value;
      }
      break;
    case 'multi':
      if (scanResult.opening) next.openingMeter = scanResult.opening;
      if (scanResult.closing) next.closingMeter = scanResult.closing;
      if (scanResult.tds) next.tds = scanResult.tds;
      if (scanResult.vehicle) next.vehicleNo = scanResult.vehicle;
      break;
    default:
      break;
  }

  // Cross-photo reconciliation: lower meter → starting, higher → ending.
  next = reconcileMeterPhotos(next);

  next.load = computeWaterLoad(next.openingMeter, next.closingMeter) || next.load;
  next.userValidated = false;
  return next;
}

export function waterFormFieldStatus(form) {
  return {
    opening: Boolean(form.openingMeter?.trim()),
    closing: Boolean(form.closingMeter?.trim()),
    tds: Boolean(form.tds?.trim()),
    vehicle: Boolean(form.vehicleNo?.trim()),
    vendor: Boolean(form.tankerVendorId?.trim()),
    date: Boolean(form.date?.trim()),
    time: Boolean(form.time?.trim()),
  };
}

/**
 * Tells which of the 4 mandatory photo types have been captured AND
 * successfully scanned. A photo only counts if scanStatus === 'done'
 * and its detectedType matches the expected type.
 */
export function waterPhotoTypeStatus(form) {
  const photos = form.photos ?? [];
  const has = (type) =>
    photos.some((p) => p.scanStatus === 'done' && p.detectedType === type);
  return {
    opening: has(WATER_PHOTO_TYPES.OPENING),
    closing: has(WATER_PHOTO_TYPES.CLOSING),
    tds: has(WATER_PHOTO_TYPES.TDS),
    vehicle: has(WATER_PHOTO_TYPES.VEHICLE),
  };
}

/** Returns true when all 4 mandatory photo types are present. */
export function allWaterPhotoTypesCaptured(form) {
  const s = waterPhotoTypeStatus(form);
  return s.opening && s.closing && s.tds && s.vehicle;
}

export function isWaterFormReadyToSubmit(form, _maxPhotos = 4) {
  const s = waterFormFieldStatus(form);
  const baseReady =
    form.userValidated &&
    s.vendor &&
    s.date &&
    s.time &&
    s.opening &&
    s.closing &&
    s.tds &&
    s.vehicle;

  if (!baseReady) return false;

  const photos = form.photos ?? [];
  if (photos.length === 0) {
    // Manual entry — all readings typed, no photos required.
    return true;
  }

  // Any attached photos must finish scanning and include GPS.
  return photos.every((p) => {
    if (p.scanStatus === 'scanning') return false;
    if (!p.capturedAt) return false;
    return photoHasGps(p);
  });
}

export function waterFormSubmitHint(form) {
  const s = waterFormFieldStatus(form);
  if (!s.vendor) return 'Select vendor to submit';
  if (!s.date || !s.time) return 'Enter date and time to submit';
  if (!s.vehicle || !s.tds || !s.opening || !s.closing) {
    return 'Fill all readings to submit';
  }
  if (!form.userValidated) return 'Confirm readings to submit';
  const scanning = (form.photos ?? []).some((p) => p.scanStatus === 'scanning');
  if (scanning) return 'Wait for photo scan to finish';
  const missingGps = (form.photos ?? []).some((p) => !photoHasGps(p));
  if (missingGps) return 'Retake photos with GPS enabled';
  return 'Submit entry';
}

export function clearFieldFromRemovedPhoto(form, photo) {
  if (!photo?.detectedType || !photo.detectedValue) return form;
  let next = { ...form };
  const fieldMap = {
    opening_meter: 'openingMeter',
    closing_meter: 'closingMeter',
    tds: 'tds',
    vehicle: 'vehicleNo',
  };
  const key = fieldMap[photo.detectedType];
  if (key && next[key] === photo.detectedValue) {
    next[key] = '';
  }

  // The remaining meter photos may now need to be re-assigned (e.g. if we
  // had three meter photos and removed the lowest one, what was previously
  // a "middle" reading must now become the new starting meter).
  next = reconcileMeterPhotos(next);

  next.load = computeWaterLoad(next.openingMeter, next.closingMeter) || '';
  next.userValidated = false;
  return next;
}
