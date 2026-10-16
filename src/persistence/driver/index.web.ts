import { emptyStore, StoreData, StoreDriver } from '../repository';
const KEY = 'stargrove-web-v1';
export async function openDriver(_name?: string): Promise<StoreDriver> {
  const read = (): StoreData => {
    const raw = globalThis.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoreData) : emptyStore();
  };
  return {
    read: async () => read(),
    async transaction<T>(operation: (store: StoreData) => T) {
      const commit = () => {
        const data = read();
        const result = operation(data);
        globalThis.localStorage.setItem(KEY, JSON.stringify(data));
        return result;
      };
      // Coordinate separate tabs too; the revision comparison happens inside this lock.
      return globalThis.navigator?.locks
        ? globalThis.navigator.locks.request(KEY, commit)
        : commit();
    },
  };
}
