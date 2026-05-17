import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export async function getCurrentGeoPosition() {
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

/** @param {string} uri @param {object|null} geo */
export function buildGeoTaggedPhoto(uri, geo) {
  if (!uri) return null;
  if (!geo) return { uri, capturedAt: new Date().toISOString() };
  return {
    uri,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
    capturedAt: geo.capturedAt || new Date().toISOString(),
  };
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
  const uri = result.assets?.[0]?.uri;
  if (!uri) return null;
  const geo = await getCurrentGeoPosition();
  return buildGeoTaggedPhoto(uri, geo);
}

export async function pickGeoPhotoFromCamera() {
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!camPerm.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take a photo.');
    return null;
  }
  const pickOptions = { quality: 0.85, mediaTypes: ['images'] };
  let result;
  try {
    result = await ImagePicker.launchCameraAsync(pickOptions);
  } catch (launchErr) {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Camera',
        'Browsers often cannot use the device camera from this screen. Use Gallery to attach a photo, or use the app on a phone (Expo Go or a dev build).',
      );
      return null;
    }
    throw launchErr;
  }
  if (result.canceled) return null;
  const uri = result.assets?.[0]?.uri;
  if (!uri) return null;
  const geo = await getCurrentGeoPosition();
  return buildGeoTaggedPhoto(uri, geo);
}
