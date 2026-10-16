import { SaveRepository } from '../../persistence/repository';
import { Entropy, Snapshot } from '../../persistence/snapshot';
import { Pairing } from '../crypto';
import { TransferEvents } from '../protocol';
export type NearbyDevice = {
  sessionId: string;
  name: string;
  host: string;
  port: number;
  serviceName: string;
};
export const LAN_AVAILABLE = false;
export class LanTransfer {
  constructor(_repository: SaveRepository, _entropy: Entropy) {
    void _repository;
    void _entropy;
  }
  async search(
    _onDevices: (devices: NearbyDevice[]) => void,
    _onStatus: (message: string) => void,
  ): Promise<void> {
    throw new Error('双机直传需要 Android / iPhone 原生安装版');
  }
  async receive(_events: TransferEvents): Promise<Pairing> {
    throw new Error('双机直传需要原生安装版');
  }
  async send(
    _pairing: Pairing,
    _snapshot: Snapshot,
    _events: TransferEvents,
    _device?: NearbyDevice,
  ): Promise<void> {
    throw new Error('双机直传需要原生安装版');
  }
  async accept(_slot: number, _expectedRevision: string | null): Promise<void> {}
  stop(): void {}
}
