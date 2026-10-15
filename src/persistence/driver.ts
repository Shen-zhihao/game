import * as SQLite from 'expo-sqlite';
import { emptyStore, StoreData, StoreDriver } from './repository';
import { Snapshot } from './snapshot';

export async function openDriver(name = 'stargrove-v1.db'): Promise<StoreDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS save_slots (slot INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS save_history (slot INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS protected_backups (slot INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS import_receipts (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);`);
  const tables = [
    ['slots', 'save_slots'],
    ['history', 'save_history'],
    ['backups', 'protected_backups'],
  ] as const;
  async function read(
    connection: Pick<SQLite.SQLiteDatabase, 'getAllAsync' | 'getFirstAsync'> = db,
  ): Promise<StoreData> {
    const data = emptyStore();
    for (const [key, table] of tables) {
      const rows = await connection.getAllAsync<{ slot: number; data: string }>(
        `SELECT slot, data FROM ${table}`,
      );
      for (const row of rows) {
        if (key === 'history') data.history[row.slot] = JSON.parse(row.data) as Snapshot[];
        else data[key][row.slot] = JSON.parse(row.data) as Snapshot;
      }
    }
    const receipts = await connection.getFirstAsync<{ data: string }>(
      'SELECT data FROM import_receipts WHERE id=1',
    );
    if (receipts) data.receipts = JSON.parse(receipts.data) as StoreData['receipts'];
    return data;
  }
  return {
    read,
    async transaction<T>(operation: (store: StoreData) => T): Promise<T> {
      let result: T;
      await db.withExclusiveTransactionAsync(async (tx) => {
        const data = await read(tx);
        result = operation(data);
        for (const [key, table] of tables) {
          for (const [slot, value] of Object.entries(data[key]))
            await tx.runAsync(
              `INSERT OR REPLACE INTO ${table} (slot, data) VALUES (?, ?)`,
              Number(slot),
              JSON.stringify(value),
            );
        }
        await tx.runAsync(
          'INSERT OR REPLACE INTO import_receipts (id, data) VALUES (1, ?)',
          JSON.stringify(data.receipts),
        );
      });
      return result!;
    },
  };
}
