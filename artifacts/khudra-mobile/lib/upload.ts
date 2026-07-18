import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
}

export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
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
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name, mimeType };
}

/**
 * Uploads a picked image to the presigned URL returned by requestUploadUrl,
 * and returns the objectPath (e.g. "/objects/uploads/xyz") to store as
 * `/api/storage${objectPath}` on the record.
 */
export async function uploadPickedImage(
  image: PickedImage,
  requestUploadUrl: (args: {
    data: { name: string; size: number; contentType: string };
  }) => Promise<{ uploadURL: string; objectPath: string }>,
): Promise<string> {
  const fileInfo = await fetch(image.uri);
  const blob = await fileInfo.blob();

  const { uploadURL, objectPath } = await requestUploadUrl({
    data: { name: image.name, size: blob.size, contentType: image.mimeType },
  });

  const putResult = await fetch(uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': image.mimeType },
    body: blob,
  });

  if (!putResult.ok) {
    throw new Error('فشل رفع الصورة');
  }

  return `/api/storage${objectPath}`;
}
