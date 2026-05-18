import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const GEO_TIMEOUT_MS = 6000;

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
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          capturedAt: new Date().toISOString(),
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120000,
        timeout: GEO_TIMEOUT_MS,
      },
    );
  });
}

export async function getCurrentGeoPosition() {
  if (Platform.OS === 'web') {
    return getWebGeolocation();
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function formatGeoCaption(geo) {
  if (!geo || geo.latitude == null || geo.longitude == null) return 'GPS: unavailable';
  const la = Math.abs(geo.latitude);
  const lo = Math.abs(geo.longitude);
  const ns = geo.latitude >= 0 ? 'N' : 'S';
  const ew = geo.longitude >= 0 ? 'E' : 'W';
  return `GPS: ${la.toFixed(5)}° ${ns}, ${lo.toFixed(5)}° ${ew}`;
}

/** Location label for deployment APIs when UI has no manual location field. */
export function locationLabelFromPhoto(photo) {
  if (photo?.latitude != null && photo?.longitude != null) {
    return formatGeoCaption(photo);
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
  const base = {
    uri: displayUri,
    file: file || undefined,
    capturedAt: new Date().toISOString(),
  };
  if (!geo) return base;
  return {
    ...base,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
    capturedAt: geo.capturedAt || base.capturedAt,
  };
}

function photoFromPickerAsset(asset) {
  if (!asset) return null;
  const uri = asset.uri;
  const file = asset.file;
  if (!uri && !file) return null;
  return { uri, file };
}

async function attachGeo(photoBase) {
  const geo = await getCurrentGeoPosition();
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
  });
  if (result.canceled) return null;
  const photoBase = photoFromPickerAsset(result.assets?.[0]);
  if (!photoBase) return null;
  return attachGeo(photoBase);
}

export async function pickGeoPhotoFromCamera() {
  if (Platform.OS === 'web') {
    Alert.alert(
      'Camera on mobile browser',
      'Many phones block the camera in the browser. Use Gallery to pick a photo, or use Expo Go on your phone.',
    );
    return pickGeoPhotoFromLibrary();
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
