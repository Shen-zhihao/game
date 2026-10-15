import { emptyStore, StoreData, StoreDriver } from './repository';
const KEY = 'stargrove-web-v1';
export async function openDriver(_name?: string): Promise<StoreDriver> {
  const read = async (): Promise<StoreData> => {
    const raw = globalThis.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoreData) : emptyStore();
  };
  return {
    read,
    async transaction<T>(operation: (store: StoreData) => T) {
      const data = await read();
      const result = operation(data);
      globalThis.localStorage.setItem(KEY, JSON.stringify(data));
      return result;
    },
  };
}
