import { z } from 'zod';
import { decodeSnapshot, digest, Snapshot, utf8 } from '../snapshot';

export const MAX_SAVE_FILE_BYTES = 64 * 1024 * 1024;
export interface SaveEntry {
  slot: number;
  snapshot: Snapshot;
}
export interface SaveCollection {
  format: 'stargrove-collection';
  version: 1;
  createdAt: string;
  entries: SaveEntry[];
  checksum: string;
}
export type PortableSave = Snapshot | SaveCollection;
const collectionSchema = z.strictObject({
  format: z.literal('stargrove-collection'),
  version: z.literal(1),
  createdAt: z.iso.datetime(),
  entries: z
    .array(z.strictObject({ slot: z.number().int().positive().safe(), snapshot: z.unknown() }))
    .min(1),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
});
export function createCollection(entries: SaveEntry[]): SaveCollection {
  const collection: SaveCollection = {
    format: 'stargrove-collection',
    version: 1,
    createdAt: new Date().toISOString(),
    entries: [...entries].sort((a, b) => a.slot - b.slot),
    checksum: '',
  };
  collection.checksum = digest(JSON.stringify(collection.entries));
  return decodeSaveFile(JSON.stringify(collection)).file as SaveCollection;
}
export function decodeSaveFile(text: string): {
  file: PortableSave;
  entries: { slot: number | null; snapshot: Snapshot }[];
  collection: boolean;
} {
  if (utf8(text).length > MAX_SAVE_FILE_BYTES) throw new Error('存档文件超过 64 MiB 上限');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('存档不是有效的 JSON');
  }
  if (input && typeof input === 'object' && 'format' in input) {
    const parsed = collectionSchema.safeParse(input);
    if (!parsed.success) throw new Error('存档合集结构或版本不正确');
    if (digest(JSON.stringify(parsed.data.entries)) !== parsed.data.checksum)
      throw new Error('存档合集校验失败，原进度未被修改');
    const seen = new Set<number>();
    const entries = parsed.data.entries.map(({ slot, snapshot }) => {
      if (seen.has(slot)) throw new Error('存档合集包含重复槽位');
      seen.add(slot);
      return { slot, snapshot: decodeSnapshot(JSON.stringify(snapshot)).snapshot };
    });
    const file: SaveCollection = { ...parsed.data, entries };
    return { file, entries, collection: true };
  }
  const { snapshot } = decodeSnapshot(text);
  return { file: snapshot, entries: [{ slot: null, snapshot }], collection: false };
}
export function saveFileData(save: PortableSave): { filename: string; text: string } {
  const text = JSON.stringify(save);
  decodeSaveFile(text);
  return {
    filename:
      'format' in save
        ? `stargrove-all-${save.createdAt.replace(/[:.]/g, '-')}.stargrove`
        : `stargrove-${save.revisionId.slice(0, 8)}.stargrove`,
    text,
  };
}
/** Legacy collections remain readable, but every import must select exactly one entry. */
export function selectSaveEntry(file: ReturnType<typeof decodeSaveFile>, index?: number) {
  if (index === undefined && file.entries.length > 1) throw new Error('请先选择要导入的一份存档');
  const selected = index ?? 0;
  if (!Number.isSafeInteger(selected) || selected < 0 || selected >= file.entries.length)
    throw new Error('所选存档不存在，请重新选择');
  return file.entries[selected]!;
}
