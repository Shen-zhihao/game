import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot } from '../src/persistence/snapshot';
import { newGame, reduceGame } from '../src/game/engine';
import { recommendedAllocation } from '../src/game/growth';
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
import { playableCoast } from './coast-helpers';
import { playableHighlands } from './highland-helpers';
import {
  playableElectric,
  playableWind,
  playableFurnace,
  playableLake,
  playableStar,
  playableChampion,
  playablePostgame,
} from './adventure-helpers';

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
  it.each([
    'current',
    'opening',
    'legacy',
    'highlands',
    'cultivation',
    'ecologySkills',
    'combatMoves',
    'coast',
    'environment',
    'cheats',
    'electric',
    'wind',
    'furnace',
    'lake',
    'star',
    'champion',
    'postgame',
  ] as const)('%s：加密分块→预览同意→原子覆盖→提交回执→冷读取继续', async (version) => {
    const senderRepo = new SaveRepository(new MemoryDriver(), testEntropy);
    const driver = new MemoryDriver();
    const receiverRepo = new SaveRepository(driver, testEntropy);
    const old = await receiverRepo.save(2, fixture('creature_004'), null);
    let game =
      version === 'opening'
        ? newGame('来自甲手机', 0, null, 45678)
        : version === 'postgame'
          ? playablePostgame().game
          : version === 'champion'
            ? playableChampion().game
            : version === 'star'
              ? playableStar().game
              : version === 'lake'
                ? playableLake().game
                : version === 'furnace'
                  ? playableFurnace().game
                  : version === 'wind'
                    ? playableWind().game
                    : version === 'electric'
                      ? playableElectric().game
                      : version === 'coast' || version === 'environment'
                        ? playableCoast().game
                        : version === 'highlands'
                          ? playableHighlands().game
                          : fixture('creature_007');
    game.dialogue = null;
    game.player.name = '来自甲手机';
    if (version === 'cheats') {
      game = reduceGame(game, { kind: 'cheat', code: '105' });
      game = reduceGame(game, { kind: 'cheat', code: '503' });
      game = reduceGame(game, { kind: 'cheat', code: '301' });
      expect(game.cheats!.masterBallsGranted).toBe(10);
      expect(game.inventory.key_water_rig).toBe(1);
      expect(game.progress.flags.waterLeader).not.toBe(true);
    }
    if (version === 'environment') {
      const { atCenter } = await import('../src/game/fieldSkills');
      expect(atCenter(game)).toBe(true);
      game = reduceGame(game, {
        kind: 'centerLearn',
        creatureId: game.party[0]!,
        moveId: 'surf',
        replace: 0,
      });
      game = reduceGame(game, { kind: 'tick', seconds: 10 });
      expect(game.masterBalls!.claimed).toEqual(['harbor_report']);
      expect(game.creatures[game.party[0]!]!.taughtMoves).toContain('surf');
      expect(game.environment!.remaining).toBe(230);
    }
    if (version === 'ecologySkills' || version === 'combatMoves') {
      const { makeCreature } = await import('../src/game/rules');
      game.progress.flags.rival = game.progress.flags.catchTutorial = true;
      const source = makeCreature(game, 'creature_001', version === 'combatMoves' ? 9 : 12);
      game.creatures[source.id] = source;
      game.box.push(source.id);
      game.dex.seen.push(source.speciesId);
      game.dex.caught.push(source.speciesId);
      game = reduceGame(game, { kind: 'buy', itemId: 'skill_copy', quantity: 1 });
      game = reduceGame(game, {
        kind: 'copyMove',
        sourceId: source.id,
        creatureId: game.party[0]!,
        moveId: version === 'combatMoves' ? 'focus' : 'grass_2',
        replace: null,
      });
      expect(game.creatures[game.party[0]!]!.taughtMoves).toContain(
        version === 'combatMoves' ? 'focus' : 'grass_2',
      );
    }
    if (version === 'cultivation') {
      const c = game.creatures[game.party[0]!]!;
      game.progress.flags.rival = true;
      game.progress.flags.catchTutorial = true;
      game = reduceGame(game, {
        kind: 'allocate',
        creatureId: c.id,
        points: recommendedAllocation(c),
      });
      game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_training', action: 'accept' });
      game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_training', action: 'claim' });
      game = reduceGame(game, { kind: 'exchange', offerId: 'dawn_respec', quantity: 1 });
      expect(game.cityServices!.exchanges.dawn_respec).toBe(1);
    }
    // Enough legitimate growth entries to exercise multiple 64 KiB chunks without invalid fields.
    for (let i = 0; i < (version === 'opening' ? 0 : 30); i++) {
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
    if (version === 'legacy') snapshot.contentVersion = 'ch1.1';
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
            expect(offer.summary.party.length).toBe(game.party.length);
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
