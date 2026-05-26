import { Platform } from 'react-native';
import { WATER_PHOTO_TYPES } from '../constants/waterPhotoTypes';

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

function getVisionApiKey() {
  const key = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
        reject(new Error('Could not encode image as base64.'));
        return;
      }
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

export async function uriToBase64(uri) {
  if (!uri) throw new Error('Photo URI is missing.');

  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma === -1) throw new Error('Invalid data URI.');
    return uri.slice(comma + 1);
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read photo (${response.status}).`);
  }
  const blob = await response.blob();
  return blobToBase64(blob);
}

function formatReading(num) {
  if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.001) {
    return String(Math.round(num));
  }
  return String(num);
}

/**
 * Extract meter readings (5+ digit values) and TDS (100–800) from OCR text.
 */
export function parseMeterReadingsFromText(rawText) {
  const text = String(rawText || '');
  const meterReadings = [];
  const meterSeen = new Set();
  const tdsCandidates = [];

  const tdsLabelRegex = /TDS[\s:]*(\d{2,3}(?:\.\d+)?)/gi;
  let labelMatch;
  while ((labelMatch = tdsLabelRegex.exec(text)) !== null) {
    const num = parseFloat(labelMatch[1]);
    if (Number.isFinite(num) && num >= 100 && num <= 800) {
      tdsCandidates.push({ value: formatReading(num), order: labelMatch.index });
    }
  }

  const tokenRegex = /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+)\b/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const raw = match[1];
    const normalized = raw.replace(/,/g, '');
    const num = parseFloat(normalized);
    if (!Number.isFinite(num)) continue;

    const intDigits = normalized.split('.')[0].replace(/\D/g, '');

    if (intDigits.length >= 5) {
      const value = formatReading(num);
      if (!meterSeen.has(value)) {
        meterSeen.add(value);
        meterReadings.push({ value, order: match.index });
      }
      continue;
    }

    if (num >= 100 && num <= 800) {
      tdsCandidates.push({ value: formatReading(num), order: match.index });
    }
  }

  meterReadings.sort((a, b) => a.order - b.order);
  tdsCandidates.sort((a, b) => a.order - b.order);

  const uniqueTds = [];
  const tdsSeen = new Set();
  for (const t of tdsCandidates) {
    if (!tdsSeen.has(t.value)) {
      tdsSeen.add(t.value);
      uniqueTds.push(t);
    }
  }

  return {
    meterReadings: meterReadings.map((m) => m.value),
    tds: uniqueTds[0]?.value ?? null,
    rawText: text,
  };
}

/** Indian vehicle plate patterns (e.g. KA53JR1035). */
export function parseVehicleFromText(rawText) {
  const text = String(rawText || '').toUpperCase();
  const plateRegex = /\b([A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{1,4})\b/g;
  let match;
  while ((match = plateRegex.exec(text)) !== null) {
    const normalized = match[1].replace(/[\s-]/g, '');
    if (normalized.length >= 8 && normalized.length <= 12) {
      return normalized;
    }
  }
  return null;
}

/**
 * Classify OCR text into water photo types (order-independent).
 */
export function classifyWaterPhotoOcr(rawText, filledFields = {}) {
  const text = String(rawText || '');
  const upper = text.toUpperCase();
  const parsed = parseMeterReadingsFromText(text);
  const vehicle = parseVehicleFromText(text);

  if (vehicle && (/VEHICLE|REG|PLATE|KA\s*\d|TANKER|LORRY|TRUCK/i.test(text) || !parsed.meterReadings.length)) {
    return { detectedType: WATER_PHOTO_TYPES.VEHICLE, detectedValue: vehicle };
  }

  if (/TDS|PPM|P\.P\.M|PART\s*PER\s*MILLION/i.test(text) && parsed.tds) {
    return { detectedType: WATER_PHOTO_TYPES.TDS, detectedValue: parsed.tds };
  }

  if (/OPEN|START|BEGIN|INITIAL|INLET|BEFORE|STARTING/i.test(upper) && parsed.meterReadings[0]) {
    return { detectedType: WATER_PHOTO_TYPES.OPENING, detectedValue: parsed.meterReadings[0] };
  }

  if (/CLOS|END|FINAL|OUTLET|STOP|AFTER|ENDING/i.test(upper) && parsed.meterReadings[0]) {
    return { detectedType: WATER_PHOTO_TYPES.CLOSING, detectedValue: parsed.meterReadings[0] };
  }

  if (parsed.tds && parsed.meterReadings.length === 0) {
    return { detectedType: WATER_PHOTO_TYPES.TDS, detectedValue: parsed.tds };
  }

  if (vehicle && !parsed.meterReadings.length) {
    return { detectedType: WATER_PHOTO_TYPES.VEHICLE, detectedValue: vehicle };
  }

  if (parsed.meterReadings.length >= 2) {
    return {
      detectedType: 'multi',
      opening: parsed.meterReadings[0],
      closing: parsed.meterReadings[1],
      tds: parsed.tds,
      vehicle,
    };
  }

  if (parsed.meterReadings.length === 1) {
    const reading = parsed.meterReadings[0];
    if (!filledFields.opening) {
      return { detectedType: WATER_PHOTO_TYPES.OPENING, detectedValue: reading };
    }
    if (!filledFields.closing) {
      return { detectedType: WATER_PHOTO_TYPES.CLOSING, detectedValue: reading };
    }
    return { detectedType: 'meter_reading', detectedValue: reading };
  }

  if (vehicle) {
    return { detectedType: WATER_PHOTO_TYPES.VEHICLE, detectedValue: vehicle };
  }

  return { detectedType: null, detectedValue: null };
}

function extractFullTextFromVisionResponse(body) {
  const responses = body?.responses;
  if (!Array.isArray(responses) || responses.length === 0) return '';

  const first = responses[0];
  if (first?.error?.message) {
    throw new Error(first.error.message);
  }

  const annotation = first?.fullTextAnnotation;
  if (annotation?.text) return annotation.text;

  const textAnnotations = first?.textAnnotations;
  if (Array.isArray(textAnnotations) && textAnnotations[0]?.description) {
    return textAnnotations[0].description;
  }

  return '';
}

export async function analyzePhotoWithVisionAPI(photoUri) {
  const apiKey = getVisionApiKey();

  if (!apiKey) {
    // No demo fallback: the LLM endpoint is the primary path. Returning
    // hard-coded fake values here previously caused the form to auto-populate
    // "KA53JR1035" / "245" etc. as if real readings — a serious UX bug.
    throw new Error(
      'Google Vision API key not configured. Use the LLM scan path (analyzeWaterPhotoWithLLM) instead.',
    );
  }

  const base64 = await uriToBase64(photoUri);

  const res = await fetch(`${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: Platform.OS === 'web' ? undefined : { languageHints: ['en'] },
        },
      ],
    }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('Vision API returned an invalid response.');
  }

  if (!res.ok) {
    const msg =
      body?.error?.message ||
      body?.responses?.[0]?.error?.message ||
      `Vision API error (${res.status})`;
    throw new Error(msg);
  }

  const rawText = extractFullTextFromVisionResponse(body);
  if (!rawText.trim()) {
    throw new Error('No text detected. Retake closer to the meter, TDS display, or vehicle plate.');
  }

  return { ...parseMeterReadingsFromText(rawText), simulated: false };
}

/**
 * OCR + auto-classify for water entry photos (starting meter, ending meter, TDS, vehicle).
 * Only used as an explicit fallback when the primary LLM path is unavailable.
 * Throws when no Google Vision API key is configured — callers should catch
 * and either surface the error or fall back to manual entry.
 */
export async function analyzeWaterPhotoWithVisionAPI(photoUri, _photoIndex = 0, filledFields = {}) {
  const base = await analyzePhotoWithVisionAPI(photoUri);
  const classified = classifyWaterPhotoOcr(base.rawText, filledFields);
  return {
    ...base,
    ...classified,
    simulated: false,
  };
}
