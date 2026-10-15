import * as Crypto from 'expo-crypto';
import { openDriver } from './persistence/driver';
import { SaveRepository } from './persistence/repository';

export const entropy = (length: number): Uint8Array => Crypto.getRandomBytes(length);
let repositoryPromise: Promise<SaveRepository> | null = null;
export function getRepository(): Promise<SaveRepository> {
  repositoryPromise ??= openDriver()
    .then((driver) => new SaveRepository(driver, entropy))
    .catch((error: unknown) => {
      repositoryPromise = null;
      throw error;
    });
  return repositoryPromise;
}
