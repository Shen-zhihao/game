import { Buffer } from 'buffer';
import { z } from 'zod';
import { CONTENT_VERSION, SPECIES } from '../content/catalog';
import { SaveRepository } from '../persistence/repository';
import {
  decodeSnapshot,
  digest,
  Entropy,
  fromUtf8,
  identifier,
  MAX_SAVE_BYTES,
  SaveSummary,
  Snapshot,
  summary,
  utf8,
} from '../persistence/snapshot';
import {
  equalToken,
  LineDecoder,
  Pairing,
  ReceiverIdentity,
  SecureChannel,
  senderKeys,
} from './crypto';

export interface Wire {
  write(text: string, encoding: 'utf8', cb: (error?: Error | null) => void): unknown;
  end(): unknown;
  destroy(): unknown;
  on(event: 'data', callback: (data: string | Uint8Array) => void): unknown;
  on(event: 'error', callback: (error: Error) => void): unknown;
  on(event: 'close', callback: () => void): unknown;
}
const offerSchema = z.strictObject({
  type: z.literal('OFFER'),
  transferId: z.string().regex(/^[a-f0-9]{32}$/),
  bytes: z.number().int().min(1).max(MAX_SAVE_BYTES),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  summary: z.strictObject({
    name: z.string().min(1).max(12),
    map: z.string().max(30),
    badges: z.number().int().min(0).max(1),
    playTimeSeconds: z.number().int().min(0).max(315360000),
    party: z
      .array(
        z.strictObject({ speciesId: z.string().max(50), level: z.number().int().min(1).max(100) }),
      )
      .min(1)
      .max(6),
    contentVersion: z.string().max(40),
    revisionId: z.string().max(100),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
export type Offer = z.infer<typeof offerSchema>;
export interface TransferEvents {
  status(message: string): void;
  progress(ratio: number): void;
  offer?(offer: Offer): void;
  completed(slot?: number): void;
  failed(message: string, uncertain: boolean): void;
}
const CHUNK_BYTES = 64 * 1024;
export class TransferPeer {
  private channel: SecureChannel | null = null;
  private readonly decoder = new LineDecoder();
  private queue: Promise<void> = Promise.resolve();
  private outgoingOffer: Offer | null = null;
  private incomingOffer: Offer | null = null;
  private chunks: Uint8Array[] = [];
  private receivedBytes = 0;
  private nextChunk = 0;
  private target: { slot: number; expectedRevision: string | null } | null = null;
  private accepted = false;
  private authenticated = false;
  private done = false;
  private sentFinish = false;
  private committing = false;
  private disconnectedDuringCommit = false;
  private pendingFrames = 0;
  private committedSlot: number | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly totalTimer: ReturnType<typeof setTimeout>;
  private source: Uint8Array | null = null;
  private ackWaiter: { index: number; resolve: () => void; reject: (error: Error) => void } | null =
    null;
  constructor(
    private readonly role: 'sender' | 'receiver',
    private readonly wire: Wire,
    private readonly pairing: Pairing,
    private readonly entropy: Entropy,
    private readonly repository: SaveRepository,
    private readonly events: TransferEvents,
    private readonly receiver?: ReceiverIdentity,
  ) {
    this.totalTimer = setTimeout(() => this.fail('会话已超时，请重新配对'), 120000);
    this.touch();
    wire.on('data', (data) => {
      if (this.done) return;
      try {
        this.decoder.feed(typeof data === 'string' ? data : fromUtf8(data), (line) => {
          if (!line) return;
          if (++this.pendingFrames > 32) throw new Error('传输消息发送过快');
          this.queue = this.queue
            .then(() => this.onLine(line))
            .catch((error: unknown) =>
              this.fail(error instanceof Error ? error.message : '传输数据无效'),
            )
            .finally(() => {
              this.pendingFrames -= 1;
            });
        });
      } catch (error) {
        this.fail(error instanceof Error ? error.message : '传输数据无效');
      }
    });
    wire.on('error', (error) => this.fail(error.message));
    wire.on('close', () => {
      if (!this.done)
        this.fail(
          this.sentFinish ? '连接中断，接收结果尚未确认；重新连接可查询' : '连接中断，原存档已保留',
        );
    });
  }
  private touch() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.fail('15 秒没有传输响应，请重试'), 15000);
  }
  async start(snapshot: Snapshot): Promise<void> {
    if (this.role !== 'sender' || this.done) return;
    const text = JSON.stringify(snapshot);
    decodeSnapshot(text);
    this.source = utf8(text);
    this.outgoingOffer = {
      type: 'OFFER',
      transferId: identifier(this.entropy),
      bytes: this.source.length,
      hash: digest(this.source),
      summary: summary(snapshot),
    };
    const keys = senderKeys(this.entropy);
    this.channel = new SecureChannel(
      'sender',
      this.pairing.sessionId,
      keys.secretKey,
      this.pairing.publicKey,
      this.entropy,
    );
    keys.secretKey.fill(0);
    await this.write(
      JSON.stringify({
        v: 1,
        type: 'HELLO',
        sessionId: this.pairing.sessionId,
        publicKey: keys.publicKey,
      }) + '\n',
    );
    await this.send({ type: 'AUTH', token: this.pairing.token });
    this.events.status('正在验证配对…');
  }
  async accept(slot: number, expectedRevision: string | null): Promise<void> {
    if (!this.incomingOffer || this.accepted || this.done || this.role !== 'receiver') return;
    this.target = { slot, expectedRevision };
    this.accepted = true;
    this.events.status('正在接收存档…');
    this.touch();
    await this.send({ type: 'ACCEPT', transferId: this.incomingOffer.transferId });
  }
  cancel(): void {
    if (this.done) return;
    if (this.committing) {
      this.disconnectedDuringCommit = true;
      this.events.status('正在提交存档，提交完成后结束会话…');
      return;
    }
    void this.send({ type: 'CANCEL' }).catch(() => undefined);
    this.fail('传档已取消，原存档已保留');
  }
  private async onLine(line: string): Promise<void> {
    if (this.done) return;
    this.touch();
    if (!this.channel && this.role === 'receiver') {
      if (Date.now() > this.pairing.expires) throw new Error('配对码已过期');
      const hello = z
        .strictObject({
          v: z.literal(1),
          type: z.literal('HELLO'),
          sessionId: z.string(),
          publicKey: z.string().max(50),
        })
        .parse(JSON.parse(line));
      if (hello.sessionId !== this.pairing.sessionId || !this.receiver)
        throw new Error('配对会话不匹配');
      this.channel = new SecureChannel(
        'receiver',
        this.pairing.sessionId,
        this.receiver.secretKey,
        hello.publicKey,
        this.entropy,
      );
      return;
    }
    if (!this.channel) throw new Error('未完成配对');
    const message = this.channel.open(line);
    if (message.type === 'CANCEL') throw new Error('对方已取消，原存档已保留');
    if (!this.authenticated) {
      if (
        this.role === 'receiver' &&
        message.type === 'AUTH' &&
        typeof message.token === 'string' &&
        equalToken(message.token, this.pairing.token)
      ) {
        this.authenticated = true;
        await this.send({ type: 'AUTH_OK' });
        return;
      }
      if (this.role === 'sender' && message.type === 'AUTH_OK') {
        this.authenticated = true;
        await this.send({
          type: 'QUERY_STATUS',
          transferId: this.outgoingOffer!.transferId,
          checksum: this.outgoingOffer!.summary.checksum,
        });
        return;
      }
      throw new Error('配对验证失败，请重新扫描接收端二维码');
    }
    if (message.type === 'QUERY_STATUS' && this.role === 'receiver') {
      const receipt = await this.repository.receipt(
        String(message.transferId),
        String(message.checksum),
      );
      await this.send(
        receipt
          ? { type: 'COMMITTED', checksum: receipt.checksum, slot: receipt.slot }
          : { type: 'NOT_RECEIVED' },
      );
      if (receipt) this.complete(receipt.slot);
      return;
    }
    if (message.type === 'NOT_RECEIVED' && this.role === 'sender') {
      await this.send(this.outgoingOffer!);
      this.events.status('等待对方预览并选择存档槽…');
      if (this.idleTimer) clearTimeout(this.idleTimer);
      return;
    }
    if (message.type === 'OFFER' && this.role === 'receiver') {
      if (this.incomingOffer) throw new Error('重复的存档提议');
      this.incomingOffer = offerSchema.parse(message);
      if (
        this.incomingOffer.summary.contentVersion !== CONTENT_VERSION ||
        this.incomingOffer.summary.party.some((c) => !Object.hasOwn(SPECIES, c.speciesId))
      )
        throw new Error('存档内容版本不兼容，请更新两部手机上的游戏');
      this.events.offer?.(this.incomingOffer);
      this.events.status('请选择目标槽位并确认导入');
      // Human preview is covered by the two-minute total limit, not the data idle limit.
      if (this.idleTimer) clearTimeout(this.idleTimer);
      return;
    }
    if (message.type === 'ACCEPT' && this.role === 'sender') {
      if (this.accepted || message.transferId !== this.outgoingOffer?.transferId)
        throw new Error('传输标识不一致');
      this.accepted = true;
      this.events.status('对方已同意，正在发送…');
      // Do not block the receive queue while waiting for per-chunk acknowledgements.
      void this.sendChunks().catch((error: unknown) =>
        this.fail(error instanceof Error ? error.message : '发送失败'),
      );
      return;
    }
    if (message.type === 'ACK' && this.role === 'sender') {
      if (!this.ackWaiter || message.index !== this.ackWaiter.index)
        throw new Error('分块回执无效');
      const waiter = this.ackWaiter;
      this.ackWaiter = null;
      waiter.resolve();
      return;
    }
    if (message.type === 'DATA' && this.role === 'receiver') {
      if (
        !this.accepted ||
        !this.incomingOffer ||
        message.index !== this.nextChunk ||
        typeof message.data !== 'string' ||
        message.data.length > 87384 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(message.data)
      )
        throw new Error('分块顺序或长度无效');
      const chunk = new Uint8Array(Buffer.from(message.data, 'base64'));
      if (
        !chunk.length ||
        chunk.length > CHUNK_BYTES ||
        this.receivedBytes + chunk.length > this.incomingOffer.bytes
      )
        throw new Error('接收数据超出声明大小');
      this.chunks.push(chunk);
      this.receivedBytes += chunk.length;
      this.nextChunk += 1;
      this.events.progress(this.receivedBytes / this.incomingOffer.bytes);
      await this.send({ type: 'ACK', index: message.index });
      return;
    }
    if (message.type === 'FINISH' && this.role === 'receiver') {
      if (
        !this.accepted ||
        !this.incomingOffer ||
        !this.target ||
        this.receivedBytes !== this.incomingOffer.bytes
      )
        throw new Error('存档未接收完整');
      const joined = new Uint8Array(Buffer.concat(this.chunks.map((c) => Buffer.from(c))));
      this.chunks = [];
      if (digest(joined) !== this.incomingOffer.hash) throw new Error('传输校验失败，原存档已保留');
      this.events.status('正在校验并保存…');
      const text = fromUtf8(joined);
      const { snapshot } = decodeSnapshot(text);
      if (JSON.stringify(summary(snapshot)) !== JSON.stringify(this.incomingOffer.summary))
        throw new Error('存档与预览信息不一致');
      const target = this.target;
      this.committing = true;
      try {
        await this.repository.import(
          target.slot,
          text,
          target.expectedRevision,
          this.incomingOffer.transferId,
        );
      } finally {
        this.committing = false;
      }
      this.committedSlot = target.slot;
      // The receipt exists in the same SQLite transaction before success is sent.
      if (!this.disconnectedDuringCommit) {
        try {
          await this.send({ type: 'COMMITTED', checksum: snapshot.checksum, slot: target.slot });
        } catch {
          /* The local transaction is committed; sender can query its receipt. */
        }
      }
      this.complete(target.slot);
      return;
    }
    if (message.type === 'COMMITTED' && this.role === 'sender') {
      if (message.checksum !== this.outgoingOffer?.summary.checksum)
        throw new Error('提交回执不匹配');
      this.complete();
      return;
    }
    throw new Error('当前阶段不接受这条传输消息');
  }
  private async sendChunks(): Promise<void> {
    const bytes = this.source!;
    for (let offset = 0, index = 0; offset < bytes.length; offset += CHUNK_BYTES, index += 1) {
      if (this.done) return;
      const ack = new Promise<void>((resolve, reject) => {
        this.ackWaiter = { index, resolve, reject };
      });
      await this.send({
        type: 'DATA',
        index,
        data: Buffer.from(bytes.subarray(offset, offset + CHUNK_BYTES)).toString('base64'),
      });
      await ack;
      this.events.progress(Math.min(1, (offset + CHUNK_BYTES) / bytes.length));
    }
    this.sentFinish = true;
    this.events.status('已发送，等待对方保存回执…');
    await this.send({ type: 'FINISH' });
  }
  private async send(message: Record<string, unknown>): Promise<void> {
    if (!this.channel || this.done) return;
    await this.write(this.channel.seal(message));
  }
  private write(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wire.write(text, 'utf8', (error) => (error ? reject(error) : resolve()));
    });
  }
  private complete(slot?: number) {
    if (this.done) return;
    this.done = true;
    this.cleanup();
    this.events.progress(1);
    this.events.completed(slot);
    this.wire.end();
  }
  private fail(message: string) {
    if (this.done) return;
    if (this.committedSlot !== null) {
      this.complete(this.committedSlot);
      return;
    }
    if (this.committing) {
      this.disconnectedDuringCommit = true;
      return;
    }
    this.done = true;
    this.cleanup();
    this.events.failed(message, this.sentFinish);
    this.wire.destroy();
  }
  private cleanup() {
    clearTimeout(this.totalTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.channel?.dispose();
    this.chunks = [];
    this.source = null;
    this.ackWaiter?.reject(new Error('连接已结束'));
    this.ackWaiter = null;
  }
}
export type { SaveSummary };
