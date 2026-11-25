import { Platform } from 'react-native';

export type UploadFile = { uri: string; name: string; type: string };

/**
 * Adds a picked file to a FormData, on every platform.
 * - Phone: React Native sends { uri, name, type } as the file.
 * - Web: a browser turns that object into the text "[object Object]", so the real file is
 *   read from its blob:/data: URI and added as a Blob.
 */
export async function appendFile(formData: FormData, field: string, file: UploadFile): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    const typed = file.type && blob.type !== file.type ? blob.slice(0, blob.size, file.type) : blob;
    formData.append(field, typed, file.name);
    return;
  }
  formData.append(field, { uri: file.uri, name: file.name, type: file.type } as any);
}
