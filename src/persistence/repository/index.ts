import { GameState } from '../../game/model';
import { decodeSaveFile, selectSaveEntry } from '../archive';
import {
  createSnapshot,
  decodeSnapshot,
  Entropy,
  identifier,
  Snapshot,
  summary,
} from '../snapshot';

export interface StoreData {
  slots: Record<string, Snapshot>;
  history: Record<string, Snapshot[]>;
  backups: Record<string, Snapshot>;
  receipts: { transferId: string; checksum: string; revisionId: string; slot: number }[];
}
export const emptyStore = (): StoreData => ({ slots: {}, history: {}, backups: {}, receipts: [] });
const validSlot = (slot: number) => Number.isSafeInteger(slot) && slot > 0;
function nextSlot(store: StoreData): number {
  let slot = 1;
  while (store.slots[slot]) slot++;
  return slot;
}
export interface StoreDriver {
  read(): Promise<StoreData>;
  transaction<T>(operation: (store: StoreData) => T): Promise<T>;
}
export class SaveRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly driver: StoreDriver,
    private readonly entropy: Entropy,
  ) {}
  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }
  async list() {
    await this.queue;
    const store = await this.driver.read();
    const numbers = [
      ...new Set([
        1,
        2,
        3,
        ...Object.keys(store.slots).map(Number).filter(validSlot),
        nextSlot(store),
      ]),
    ].sort((a, b) => a - b);
    return numbers.map((slot) => {
      const s = store.slots[slot];
      if (!s)
        return {
          slot,
          snapshot: null,
          summary: null,
          error: null,
          hasBackup: !!store.backups[slot],
        };
      try {
        decodeSnapshot(JSON.stringify(s));
        return {
          slot,
          snapshot: s,
          summary: summary(s),
          error: null,
          hasBackup: !!store.backups[slot],
        };
      } catch (error) {
        return {
          slot,
          snapshot: s,
          summary: null,
          error: error instanceof Error ? error.message : '存档损坏',
          hasBackup: !!store.backups[slot],
        };
      }
    });
  }
  async load(slot: number): Promise<{ snapshot: Snapshot; game: GameState } | null> {
    this.checkSlot(slot);
    await this.queue;
    const s = (await this.driver.read()).slots[slot];
    return s ? decodeSnapshot(JSON.stringify(s)) : null;
  }
  async saveNew(
    game: GameState,
    previous: Snapshot | null = null,
  ): Promise<{ slot: number; snapshot: Snapshot }> {
    const frozen = JSON.parse(JSON.stringify(game)) as GameState;
    return this.serialize(() =>
      this.driver.transaction((store) => {
        const slot = nextSlot(store);
        const snapshot = createSnapshot(frozen, this.entropy, previous, this.newBranch());
        this.put(store, slot, snapshot);
        return { slot, snapshot };
      }),
    );
  }
  async importNew(
    text: string,
    entryIndex?: number,
  ): Promise<{ slot: number; snapshot: Snapshot }> {
    const { snapshot } = selectSaveEntry(decodeSaveFile(text), entryIndex);
    return this.serialize(() =>
      this.driver.transaction((store) => {
        const slot = nextSlot(store);
        this.put(store, slot, snapshot);
        return { slot, snapshot };
      }),
    );
  }
  async save(
    slot: number,
    game: GameState,
    expectedRevision: string | null,
    branchId?: string,
  ): Promise<Snapshot> {
    const frozen = JSON.parse(JSON.stringify(game)) as GameState;
    return this.serialize(() =>
      this.driver.transaction((store) => {
        this.checkSlot(slot);
        const previous = store.slots[slot] ?? null;
        if ((previous?.revisionId ?? null) !== expectedRevision)
          throw new Error('存档已改变，请重新读取，避免覆盖其他进度');
        const snapshot = createSnapshot(frozen, this.entropy, previous, branchId);
        this.put(store, slot, snapshot);
        return snapshot;
      }),
    );
  }
  async import(
    slot: number,
    text: string,
    expectedRevision: string | null,
    transferId: string,
  ): Promise<Snapshot> {
    const { snapshot } = decodeSnapshot(text);
    return this.serialize(() =>
      this.driver.transaction((store) => {
        this.checkSlot(slot);
        const receipt = store.receipts.find(
          (r) => r.transferId === transferId && r.checksum === snapshot.checksum,
        );
        if (receipt) return snapshot;
        const current = store.slots[slot];
        if ((current?.revisionId ?? null) !== expectedRevision)
          throw new Error('目标槽位已改变，请重新预览并确认');
        if (current) store.backups[slot] = current;
        this.put(store, slot, snapshot);
        store.receipts.push({
          transferId,
          checksum: snapshot.checksum,
          revisionId: snapshot.revisionId,
          slot,
        });
        store.receipts = store.receipts.slice(-100);
        return snapshot;
      }),
    );
  }
  async recovery(slot: number): Promise<{ label: string; snapshot: Snapshot }[]> {
    this.checkSlot(slot);
    await this.queue;
    const s = await this.driver.read();
    return [
      ...(s.backups[slot] ? [{ label: '覆盖前保护备份', snapshot: s.backups[slot]! }] : []),
      ...(s.history[slot] ?? []).map((snapshot) => ({ label: snapshot.savedAt, snapshot })),
    ].filter(({ snapshot }) => {
      try {
        decodeSnapshot(JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    });
  }
  async receipt(transferId: string, checksum: string) {
    await this.queue;
    const store = await this.driver.read();
    return (
      store.receipts.find((r) => r.transferId === transferId && r.checksum === checksum) ??
      Object.entries(store.slots)
        .filter(([, s]) => s.checksum === checksum)
        .map(([slot, s]) => ({
          transferId,
          checksum,
          revisionId: s.revisionId,
          slot: Number(slot),
        }))[0] ??
      null
    );
  }
  newBranch(): string {
    return identifier(this.entropy);
  }
  async drain(): Promise<void> {
    await this.queue;
  }
  private checkSlot(slot: number) {
    if (!validSlot(slot)) throw new Error('无效存档槽位');
  }
  private put(store: StoreData, slot: number, snapshot: Snapshot) {
    const previous = store.slots[slot];
    if (previous) store.history[slot] = [previous, ...(store.history[slot] ?? [])].slice(0, 10);
    store.slots[slot] = snapshot;
  }
}
