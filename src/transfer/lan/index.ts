import TcpSocket from 'react-native-tcp-socket';
import Zeroconf, { Service } from 'react-native-zeroconf';
import * as Network from 'expo-network';
import { SaveRepository } from '../../persistence/repository';
import { Entropy, Snapshot } from '../../persistence/snapshot';
import { makeReceiver, Pairing, ReceiverIdentity } from '../crypto';
import { TransferEvents, TransferPeer, Wire } from '../protocol';

export type NearbyDevice = {
  sessionId: string;
  name: string;
  host: string;
  port: number;
  serviceName: string;
};
export const LAN_AVAILABLE = true;
export class LanTransfer {
  private zeroconf: Zeroconf | null = null;
  private server: ReturnType<typeof TcpSocket.createServer> | null = null;
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private peer: TransferPeer | null = null;
  private identity: ReceiverIdentity | null = null;
  private generation = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private publishedName: string | null = null;
  constructor(
    private readonly repository: SaveRepository,
    private readonly entropy: Entropy,
  ) {}
  private getDiscovery() {
    if (!this.zeroconf) this.zeroconf = new Zeroconf();
    return this.zeroconf;
  }
  async search(
    onDevices: (devices: NearbyDevice[]) => void,
    onStatus: (message: string) => void,
  ): Promise<void> {
    this.stop();
    const generation = this.generation;
    const z = this.getDiscovery();
    onDevices([]);
    onStatus('正在搜索同一 Wi-Fi 下的接收端…');
    const access = await z.checkLocalNetworkAccess({
      type: 'stargrovesave',
      protocol: 'tcp',
      request: false,
    });
    if (generation !== this.generation) return;
    if (access === 'denied') throw new Error('本地网络权限被拒绝，请在系统设置中允许后重试');
    const devices = new Map<string, NearbyDevice>();
    z.on('resolved', (s: Service) => {
      if (generation !== this.generation || s.txt.v !== '1' || !s.txt.session) return;
      const host = s.addresses[0] ?? s.host;
      if (!host || !s.port) return;
      devices.set(s.txt.session, {
        sessionId: s.txt.session,
        name: s.txt.alias ?? '星苔旅人',
        host,
        port: s.port,
        serviceName: s.name,
      });
      onDevices([...devices.values()]);
    });
    z.on('remove', (name) => {
      for (const [id, d] of devices) if (d.serviceName === name) devices.delete(id);
      onDevices([...devices.values()]);
    });
    z.on('error', (error) => {
      if (generation === this.generation)
        onStatus(`搜索失败：${error.message}。检查本地网络权限，或扫描接收端二维码直接连接。`);
    });
    z.scan({ type: 'stargrovesave', protocol: 'tcp', domain: 'local.', resolveTimeout: 5 });
    this.searchTimer = setTimeout(() => {
      if (generation !== this.generation) return;
      z.stop();
      onStatus(
        devices.size
          ? '搜索结束，选择接收端并扫描配对码。'
          : '未找到设备。确认对方已打开接收页、同网且没有访客隔离；也可直接扫描配对码。',
      );
    }, 20000);
  }
  async receive(events: TransferEvents): Promise<Pairing> {
    this.stop();
    const generation = this.generation;
    const z = this.getDiscovery();
    const access = await z.checkLocalNetworkAccess({
      type: 'stargrovesave',
      protocol: 'tcp',
      request: false,
    });
    if (generation !== this.generation) throw new Error('接收已取消');
    if (access === 'denied') throw new Error('本地网络权限被拒绝，请在系统设置中允许');
    const host = await Network.getIpAddressAsync();
    if (generation !== this.generation) throw new Error('接收已取消');
    if (!host || host === '0.0.0.0' || host.startsWith('127.'))
      throw new Error('没有可用的局域网地址，请连接 Wi-Fi');
    const server = TcpSocket.createServer((socket) => {
      if (generation !== this.generation || this.socket || !this.identity) {
        socket.destroy();
        return;
      }
      this.socket = socket;
      socket.setNoDelay(true);
      this.peer = new TransferPeer(
        'receiver',
        socket as unknown as Wire,
        this.identity.pairing,
        this.entropy,
        this.repository,
        events,
        this.identity,
      );
      events.status('对方正在连接，验证配对中…');
    });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen({ port: 0, host: '::', reuseAddress: true }, resolve);
    });
    if (generation !== this.generation) {
      server.close();
      throw new Error('接收已取消');
    }
    const port = server.address()!.port;
    this.identity = makeReceiver(this.entropy, host, port);
    const pairing = this.identity.pairing;
    z.on('error', (error) => {
      if (generation === this.generation)
        events.status(`发现服务错误：${error.message}。配对码仍可直接连接。`);
    });
    // Socket/QR remains usable when multicast publication is blocked by the router.
    try {
      const published = await z.publishService({
        type: 'stargrovesave',
        protocol: 'tcp',
        name: `星苔-${pairing.sessionId.slice(0, 6)}`,
        port,
        txt: { v: '1', session: pairing.sessionId, alias: '星苔接收端' },
      });
      if (generation !== this.generation) {
        await z.unpublishService(published.name);
        throw new Error('接收已取消');
      }
      this.publishedName = published.name;
    } catch (error) {
      if (generation !== this.generation) throw error;
      events.status('附近搜索不可用，可扫描配对码直接传档。');
    }
    this.expiryTimer = setTimeout(() => {
      if (generation === this.generation) {
        this.stop();
        events.failed('接收等待已超时，请重新生成配对码', false);
      }
    }, 120000);
    return pairing;
  }
  async send(
    pairing: Pairing,
    snapshot: Snapshot,
    events: TransferEvents,
    device?: NearbyDevice,
  ): Promise<void> {
    this.stop();
    const generation = this.generation;
    if (device && device.sessionId !== pairing.sessionId)
      throw new Error('扫描的配对码不属于选中的手机');
    await new Promise<void>((resolve, reject) => {
      const socket = TcpSocket.createConnection(
        {
          host: device?.host ?? pairing.host,
          port: device?.port ?? pairing.port,
          connectTimeout: 10000,
        },
        () => {
          if (generation !== this.generation) {
            socket.destroy();
            reject(new Error('连接已取消'));
            return;
          }
          socket.setNoDelay(true);
          this.peer = new TransferPeer(
            'sender',
            socket as unknown as Wire,
            pairing,
            this.entropy,
            this.repository,
            events,
          );
          this.peer.start(snapshot).then(resolve, reject);
        },
      );
      this.socket = socket;
      socket.once('error', reject);
    });
  }
  async accept(slot: number, expectedRevision: string | null) {
    await this.peer?.accept(slot, expectedRevision);
  }
  stop(): void {
    this.generation += 1;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.searchTimer = null;
    this.expiryTimer = null;
    this.peer?.cancel();
    this.peer = null;
    this.socket?.destroy();
    this.socket = null;
    this.server?.close();
    this.server = null;
    this.identity?.secretKey.fill(0);
    this.identity = null;
    const z = this.zeroconf;
    if (z) {
      z.stop();
      z.removeAllListeners();
      if (this.publishedName) void z.unpublishService(this.publishedName).catch(() => undefined);
      z.removeDeviceListeners();
    }
    this.zeroconf = null;
    this.publishedName = null;
  }
}
