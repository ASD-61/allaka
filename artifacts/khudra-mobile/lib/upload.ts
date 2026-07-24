import * as ImagePicker from 'expo-image-picker';
import { Alert } from '@/lib/alert';
import { resolveApiDomain, schemeForDomain } from '@/lib/api-scheme';

export interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Prompts the user to pick an image source (camera or gallery) and returns the
 * picked image. Use this everywhere a picture is uploaded so every screen
 * offers both options (not just gallery).
 */
export async function pickImageWithChoice(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    Alert.alert('إضافة صورة', 'اختر مصدر الصورة', [
      {
        text: 'التقاط بالكاميرا',
        onPress: async () => resolve(await takePhoto()),
      },
      {
        text: 'اختيار من الاستديو',
        onPress: async () => resolve(await pickImage()),
      },
      { text: 'إلغاء', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    // No forced square crop: keep the full picture the user chose so nothing
    // gets cut off ("نص الصورة طاير"). allowsEditing:true still lets them
    // freely adjust/crop it themselves if they want.
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name, mimeType };
}

export async function takePhoto(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name, mimeType };
}

/**
 * Uploads a picked image THROUGH the API server so it can be screened by Google
 * SafeSearch (inappropriate images are rejected) before being stored in
 * Cloudflare R2. Returns the object path/URL to store on the record.
 *
 * The image is sent as multipart/form-data; the server never writes it to disk
 * (it moderates the in-memory buffer and forwards it to the bucket).
 *
 * NOTE: the optional second argument is kept for backwards compatibility with
 * existing call sites (they used to pass a presign requester); it is unused now.
 */
type LegacyUploadRequester = (args: {
  data: { name: string; size: number; contentType: string };
}) => Promise<unknown>;

export async function uploadPickedImage(
  image: PickedImage,
  _legacyRequestUploadUrl?: LegacyUploadRequester,
): Promise<string> {
  const domain = resolveApiDomain();
  const url = `${schemeForDomain(domain)}://${domain}/api/storage/uploads`;

  const form = new FormData();
  form.append('file', {
    uri: image.uri,
    name: image.name,
    type: image.mimeType,
  } as any);

  const res = await fetch(url, { method: 'POST', body: form });

  if (!res.ok) {
    // Surface the server's specific reason (e.g. the SafeSearch rejection
    // message) so the UI can tell the user exactly why the upload was blocked.
    let message = 'فشل رفع الصورة';
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { objectPath: string };
  const objectPath = data.objectPath;

  // With direct-to-bucket (S3/R2) storage the server returns an absolute public
  // URL — store it as-is. Otherwise it's a relative object path served through
  // the API server, so prefix the storage route.
  return /^https?:\/\//.test(objectPath) ? objectPath : `/api/storage${objectPath}`;
}
