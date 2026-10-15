import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MAX_SAVE_BYTES, Snapshot } from './snapshot';

export async function exportSave(snapshot: Snapshot): Promise<void> {
  const file = new File(Paths.cache, `stargrove-${snapshot.revisionId.slice(0, 8)}.stargrove`);
  file.write(JSON.stringify(snapshot));
  if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备无法打开系统分享');
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: '备份星苔远征存档',
      UTI: 'public.json',
    });
  } finally {
    if (file.exists) file.delete();
  }
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
  if ((asset.size ?? file.size ?? 0) > MAX_SAVE_BYTES) throw new Error('存档超过 8 MiB 上限');
  try {
    return await file.text();
  } finally {
    if (file.exists && file.uri.startsWith(Paths.cache.uri)) file.delete();
  }
}
