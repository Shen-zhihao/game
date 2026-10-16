import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MAX_SAVE_FILE_BYTES, PortableSave, saveFileData } from '../archive';
import { APP_NAME } from '../../content/brand';

export async function exportSave(save: PortableSave): Promise<void> {
  const { filename, text } = saveFileData(save);
  const file = new File(Paths.cache, filename);
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备无法打开系统分享');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: `分享${APP_NAME}存档`,
    UTI: 'public.json',
  });
  // Some Android share targets read the URI after the chooser returns. Keep the cache copy
  // available to the recipient rather than deleting it before they can open it.
}
export async function pickSave(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size ?? 0) > MAX_SAVE_FILE_BYTES)
      throw new Error('存档文件超过 64 MiB 上限');
    return await file.text();
  } finally {
    if (file.exists && file.uri.startsWith(Paths.cache.uri)) file.delete();
  }
}
