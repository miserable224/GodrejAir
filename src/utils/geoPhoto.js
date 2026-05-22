import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const GEO_TIMEOUT_MS = 15000;

function coordsFromPosition(pos) {
  if (!pos?.coords) return null;
  const { latitude, longitude, accuracy } = pos.coords;
  if (latitude == null || longitude == null) return null;
  return {
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    capturedAt: new Date().toISOString(),
  };
}

function exifGpsCoord(value, ref) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const sign = ref === 'S' || ref === 'W' ? -1 : 1;
    return value * sign;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const deg = Number(value[0]) || 0;
    const min = Number(value[1]) || 0;
    const sec = Number(value[2]) || 0;
    const sign = ref === 'S' || ref === 'W' ? -1 : 1;
    return sign * (deg + min / 60 + sec / 3600);
  }
  return null;
}

function geoFromPickerAsset(asset) {
  if (!asset) return null;

  const capturedAt = new Date().toISOString();

  if (typeof asset.latitude === 'number' && typeof asset.longitude === 'number') {
    return {
      latitude: asset.latitude,
      longitude: asset.longitude,
      accuracy: null,
      capturedAt,
    };
  }

  const exif = asset.exif;
  if (exif && typeof exif === 'object') {
    const lat = exifGpsCoord(
      exif.GPSLatitude ?? exif.latitude ?? exif.Latitude,
      exif.GPSLatitudeRef,
    );
    const lon = exifGpsCoord(
      exif.GPSLongitude ?? exif.longitude ?? exif.Longitude,
      exif.GPSLongitudeRef,
    );
    if (lat != null && lon != null) {
      return {
        latitude: lat,
        longitude: lon,
        accuracy: null,
        capturedAt,
      };
    }
  }

  return null;
}

/** Morning 06:00–17:59 IST, night otherwise (matches backend DutyShiftInference). */
export function inferShiftFromCapturedAt(capturedAtIso) {
  const when = capturedAtIso ? new Date(capturedAtIso) : new Date();
  if (Number.isNaN(when.getTime())) {
    return { shiftType: 'NIGHT', label: 'Night shift' };
  }
  const istHour = new Date(when.getTime() + 330 * 60 * 1000).getUTCHours();
  const isMorning = istHour >= 6 && istHour < 18;
  return {
    shiftType: isMorning ? 'DAY' : 'NIGHT',
    label: isMorning ? 'Morning shift' : 'Night shift',
  };
}

function getWebGeolocation() {
  return new Promise((resolve) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
    if (!geo) {
      resolve(null);
      return;
    }
    if (typeof globalThis !== 'undefined' && globalThis.isSecureContext === false) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
    geo.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(coordsFromPosition(pos));
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: GEO_TIMEOUT_MS,
      },
    );
  });
}

export async function getCurrentGeoPosition() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords?.latitude != null && last?.coords?.longitude != null) {
      return coordsFromPosition(last);
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 60000,
      timeout: GEO_TIMEOUT_MS,
    });
    const fromExpo = coordsFromPosition(pos);
    if (fromExpo) return fromExpo;
  } catch {
    // fall through to browser API on web
  }

  if (Platform.OS === 'web') {
    return getWebGeolocation();
  }

  return null;
}

function formatCoords(geo) {
  const la = Math.abs(geo.latitude);
  const lo = Math.abs(geo.longitude);
  const ns = geo.latitude >= 0 ? 'N' : 'S';
  const ew = geo.longitude >= 0 ? 'E' : 'W';
  return `${la.toFixed(5)}° ${ns}, ${lo.toFixed(5)}° ${ew}`;
}

/** Timestamp + GPS lines shown under deployment / patrol photos. */
export function formatGeoCaption(photo) {
  const lines = [];
  const when = photo?.capturedAt ? new Date(photo.capturedAt) : null;
  const capturedIso = photo?.capturedAt || (when && !Number.isNaN(when.getTime()) ? when.toISOString() : null);
  if (when && !Number.isNaN(when.getTime())) {
    lines.push(when.toLocaleString());
  } else {
    lines.push(new Date().toLocaleString());
  }

  lines.push(`Shift: ${inferShiftFromCapturedAt(capturedIso).label}`);

  if (photo?.latitude != null && photo?.longitude != null) {
    const acc =
      photo.accuracy != null && Number.isFinite(photo.accuracy)
        ? ` (±${Math.round(photo.accuracy)}m)`
        : '';
    lines.push(`GPS: ${formatCoords(photo)}${acc}`);
  } else {
    lines.push(
      Platform.OS === 'web'
        ? 'GPS: unavailable — allow location for this site in the browser'
        : 'GPS: unavailable — enable location permission for Godrej Air',
    );
  }

  return lines.join('\n');
}

/** Location label for deployment APIs when UI has no manual location field. */
export function locationLabelFromPhoto(photo) {
  if (photo?.latitude != null && photo?.longitude != null) {
    return formatCoords(photo);
  }
  return 'On-site';
}

/** @param {string} uri @param {object|null} geo @param {File|undefined} file */
export function buildGeoTaggedPhoto(uri, geo, file) {
  if (!uri && !file) return null;
  let displayUri = uri;
  if (Platform.OS === 'web' && file && typeof URL !== 'undefined' && URL.createObjectURL) {
    displayUri = URL.createObjectURL(file);
  }
  const capturedAt = geo?.capturedAt || new Date().toISOString();
  const base = {
    uri: displayUri,
    file: file || undefined,
    capturedAt,
  };
  if (!geo || geo.latitude == null || geo.longitude == null) {
    return base;
  }
  return {
    ...base,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy ?? null,
    capturedAt,
  };
}

function photoFromPickerAsset(asset) {
  if (!asset) return null;
  const uri = asset.uri;
  const file = asset.file;
  if (!uri && !file) return null;
  return { uri, file, asset };
}

async function attachGeo(photoBase) {
  const asset = photoBase.asset;
  let geo = geoFromPickerAsset(asset);
  if (!geo) {
    geo = await getCurrentGeoPosition();
  }

  if (!geo) {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Location not available',
        Platform.OS === 'web'
          ? 'Allow location access when the browser asks, or use HTTPS/localhost. Timestamp is still saved with the photo.'
          : 'Enable location for Godrej Air in Settings. Timestamp is still saved with the photo.',
      );
    }
  }

  return buildGeoTaggedPhoto(photoBase.uri, geo, photoBase.file);
}

export async function pickGeoPhotoFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to attach an image.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    exif: true,
  });
  if (result.canceled) return null;
  const photoBase = photoFromPickerAsset(result.assets?.[0]);
  if (!photoBase) return null;
  return attachGeo(photoBase);
}

export async function pickGeoPhotoFromCamera() {
  if (Platform.OS === 'web') {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPerm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an image.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: true,
    });
    if (result.canceled) return null;
    const photoBase = photoFromPickerAsset(result.assets?.[0]);
    if (!photoBase) return null;
    return attachGeo(photoBase);
  }

  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!camPerm.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take a photo.');
    return null;
  }
  let result;
  try {
    result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      mediaTypes: ['images'],
      exif: true,
    });
  } catch {
    Alert.alert('Camera unavailable', 'Use Gallery to attach a photo instead.');
    return null;
  }
  if (result.canceled) return null;
  const photoBase = photoFromPickerAsset(result.assets?.[0]);
  if (!photoBase) return null;
  return attachGeo(photoBase);
}
