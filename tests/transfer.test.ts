import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot } from '../src/persistence/snapshot';
import {
  decodePairing,
  encodePairing,
  LineDecoder,
  makeReceiver,
  MAX_FRAME,
  SecureChannel,
  senderKeys,
} from '../src/transfer/crypto';
import { TransferEvents, TransferPeer, Wire } from '../src/transfer/protocol';
import { fixture, testEntropy } from './helpers';

describe('配对与加密', () => {
  it('二维码绑定临时公钥与 256 位凭据，过期拒绝', () => {
    const receiver = makeReceiver(testEntropy, '192.168.1.10', 12345);
    const encoded = encodePairing(receiver.pairing);
    expect(decodePairing(encoded)).toEqual(receiver.pairing);
    expect(() => decodePairing(encoded, Date.now() + 121000)).toThrow(/过期/);
    expect(() => decodePairing('123456')).toThrow();
  });
  it('双向解密，拒绝修改、重放、反射与错误公钥', () => {
    const r = makeReceiver(testEntropy, '127.0.0.1', 1234);
    const sender = senderKeys(testEntropy);
    const a = new SecureChannel(
      'sender',
      r.pairing.sessionId,
      sender.secretKey,
      r.pairing.publicKey,
      testEntropy,
    );
    const b = new SecureChannel(
      'receiver',
      r.pairing.sessionId,
      r.secretKey,
      sender.publicKey,
      testEntropy,
    );
    const cipher = a.seal({ type: 'TEST', name: '秘密玩家' }).trim();
    expect(cipher).not.toContain('秘密玩家');
    expect(b.open(cipher)).toEqual({ type: 'TEST', name: '秘密玩家' });
    expect(() => b.open(cipher)).toThrow(/重放/);
    expect(() => a.open(cipher)).toThrow();
    const third = senderKeys(testEntropy);
    const c = new SecureChannel(
      'receiver',
      r.pairing.sessionId,
      third.secretKey,
      sender.publicKey,
      testEntropy,
    );
    expect(() => c.open(a.seal({ type: 'TEST' }).trim())).toThrow(/校验/);
    expect(a.open(b.seal({ type: 'REPLY' }).trim())).toEqual({ type: 'REPLY' });
    a.dispose();
    b.dispose();
    c.dispose();
  });
  it('TCP 分片和合并帧可解析，拒绝无限增长的帧', () => {
    const decoder = new LineDecoder();
    const result: string[] = [];
    decoder.feed('hel', (v) => result.push(v));
    decoder.feed('lo\nworld\n', (v) => result.push(v));
    expect(result).toEqual(['hello', 'world']);
    expect(() => decoder.feed('x'.repeat(MAX_FRAME + 1), () => undefined)).toThrow(/上限/);
  });
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});
describe('真实 Node TCP 上的共用传档协议', () => {
  it('加密分块→预览同意→原子覆盖→提交回执→冷读取继续', async () => {
    const senderRepo = new SaveRepository(new MemoryDriver(), testEntropy);
    const driver = new MemoryDriver();
    const receiverRepo = new SaveRepository(driver, testEntropy);
    const old = await receiverRepo.save(2, fixture('creature_004'), null);
    const game = fixture('creature_007');
    game.player.name = '来自甲手机';
    // Enough legitimate growth entries to exercise multiple 64 KiB chunks without invalid fields.
    for (let i = 0; i < 30; i++) {
      const { makeCreature } = await import('../src/game/rules');
      const c = makeCreature(game, 'creature_040', 8);
      c.history = Array.from({ length: 32 }, () => ({
        kind: 'learned' as const,
        label: '成长足迹'.repeat(15),
        level: 8,
      }));
      game.creatures[c.id] = c;
      game.box.push(c.id);
      if (!game.dex.seen.includes(c.speciesId)) {
        game.dex.seen.push(c.speciesId);
        game.dex.caught.push(c.speciesId);
      }
    }
    const snapshot = createSnapshot(game, testEntropy, null);
    let receiverPeer: TransferPeer;
    const raw: string[] = [];
    let offered = false;
    let importedSlot = 0;
    let resolveDone: () => void = () => undefined;
    let rejectDone: (e: Error) => void = () => undefined;
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    const base: TransferEvents = {
      status: () => undefined,
      progress: () => undefined,
      completed: () => undefined,
      failed: (m) => rejectDone(new Error(m)),
    };
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => raw.push(chunk.toString()));
      receiverPeer = new TransferPeer(
        'receiver',
        socket as unknown as Wire,
        identity.pairing,
        testEntropy,
        receiverRepo,
        {
          ...base,
          offer: async (offer) => {
            offered = true;
            expect(driver.data.slots[2]!.revisionId).toBe(old.revisionId);
            expect(offer.summary.name).toBe('来自甲手机');
            await receiverPeer.accept(2, old.revisionId);
          },
          completed: (slot) => {
            importedSlot = slot!;
          },
        },
        identity,
      );
    });
    cleanups.push(() => server.close());
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as net.AddressInfo).port;
    const identity = makeReceiver(testEntropy, '127.0.0.1', port);
    const client = net.createConnection({ host: '127.0.0.1', port });
    cleanups.push(() => client.destroy());
    await new Promise<void>((r) => client.once('connect', r));
    const sender = new TransferPeer(
      'sender',
      client as unknown as Wire,
      identity.pairing,
      testEntropy,
      senderRepo,
      { ...base, completed: resolveDone },
    );
    cleanups.push(() => sender.cancel());
    cleanups.push(() => receiverPeer?.cancel());
    await sender.start(snapshot);
    await done;
    expect(offered).toBe(true);
    expect(importedSlot).toBe(2);
    expect(raw.join('')).not.toContain('来自甲手机');
    expect(raw.join('')).not.toContain(snapshot.payload);
    const restored = await new SaveRepository(driver, testEntropy).load(2);
    expect(restored!.game).toEqual(game);
    expect(driver.data.backups[2]!.revisionId).toBe(old.revisionId);
    expect(driver.data.receipts).toHaveLength(1);
    expect((await receiverRepo.receipt('new-session', snapshot.checksum))!.slot).toBe(2);
  });
  it('错误配对凭据不会展示存档预览或修改原档', async () => {
    const driver = new MemoryDriver();
    const repo = new SaveRepository(driver, testEntropy);
    const old = await repo.save(1, fixture(), null);
    const before = await driver.read();
    let previewed = false;
    let resolveFailure: (message: string) => void = () => undefined;
    const failed = new Promise<string>((r) => (resolveFailure = r));
    const events: TransferEvents = {
      status: () => undefined,
      progress: () => undefined,
      completed: () => {
        throw new Error('Should not commit');
      },
      offer: () => {
        previewed = true;
      },
      failed: resolveFailure,
    };
    let receiver: TransferPeer;
    const server = net.createServer((socket) => {
      receiver = new TransferPeer(
        'receiver',
        socket as unknown as Wire,
        identity.pairing,
        testEntropy,
        repo,
        events,
        identity,
      );
    });
    cleanups.push(() => server.close());
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as net.AddressInfo).port;
    const identity = makeReceiver(testEntropy, '127.0.0.1', port);
    const bad = makeReceiver(testEntropy, '127.0.0.1', port).pairing;
    const client = net.createConnection({ host: '127.0.0.1', port });
    cleanups.push(() => client.destroy());
    await new Promise<void>((r) => client.once('connect', r));
    const sender = new TransferPeer(
      'sender',
      client as unknown as Wire,
      { ...identity.pairing, token: bad.token },
      testEntropy,
      repo,
      events,
    );
    cleanups.push(() => sender.cancel());
    cleanups.push(() => receiver?.cancel());
    await sender.start(old);
    expect(await failed).toContain('配对');
    expect(previewed).toBe(false);
    expect(await driver.read()).toEqual(before);
  });
});
