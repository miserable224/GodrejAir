export const MAX_WATER_SCAN_PHOTOS = 4;

export const WATER_PHOTO_TYPES = {
  OPENING: 'opening_meter',
  CLOSING: 'closing_meter',
  TDS: 'tds',
  VEHICLE: 'vehicle',
};

export const WATER_PHOTO_TYPE_LABELS = {
  opening_meter: 'Starting meter',
  closing_meter: 'Ending meter',
  tds: 'TDS',
  vehicle: 'Vehicle no.',
};

export const WATER_PHOTO_TYPE_ICONS = {
  opening_meter: 'speedometer-outline',
  closing_meter: 'speedometer',
  tds: 'water-outline',
  vehicle: 'car-outline',
};

/** Guided camera sequence: vehicle → TDS → starting meter → ending meter. */
export const WATER_PHOTO_CAPTURE_ORDER = [
  WATER_PHOTO_TYPES.VEHICLE,
  WATER_PHOTO_TYPES.TDS,
  WATER_PHOTO_TYPES.OPENING,
  WATER_PHOTO_TYPES.CLOSING,
];

export const WATER_PHOTO_CHECKLIST = [
  {
    type: WATER_PHOTO_TYPES.VEHICLE,
    label: 'Vehicle number',
    icon: 'car-outline',
    hint: 'Tanker number plate',
  },
  {
    type: WATER_PHOTO_TYPES.TDS,
    label: 'TDS',
    icon: 'water-outline',
    hint: 'Hand-held TDS meter',
  },
  {
    type: WATER_PHOTO_TYPES.OPENING,
    label: 'Starting meter',
    icon: 'speedometer-outline',
    hint: 'Reading BEFORE fill',
  },
  {
    type: WATER_PHOTO_TYPES.CLOSING,
    label: 'Ending meter',
    icon: 'speedometer',
    hint: 'Reading AFTER fill',
  },
];
