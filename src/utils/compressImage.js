/**
 * Resize and compress photos before uploading to the API (base64 JSON body).
 * Uses expo-image-manipulator on native; canvas resize on web.
 */
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { uriToBase64 } from '../services/googleVisionService';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

async function compressWebUriToBase64(uri) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not read photo (${response.status}).`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image.'));
      el.src = objectUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available.');
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error('Could not encode image.');
    return { base64: dataUrl.slice(comma + 1), mimeType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * @param {string} uri Local file, content, or data URI
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export async function compressUriToBase64(uri) {
  if (!uri) throw new Error('Photo URI is missing.');

  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma === -1) throw new Error('Invalid data URI.');
    return { base64: uri.slice(comma + 1), mimeType: 'image/jpeg' };
  }

  if (Platform.OS === 'web') {
    return compressWebUriToBase64(uri);
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    return { base64: await uriToBase64(result.uri ?? uri), mimeType: 'image/jpeg' };
  }

  return { base64: result.base64, mimeType: 'image/jpeg' };
}
