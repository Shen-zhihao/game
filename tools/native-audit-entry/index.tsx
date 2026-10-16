// Separate bundle entry: this file is never imported by the shipping game.
import React, { useEffect, useState } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import { registerRootComponent } from 'expo';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import TcpSocket from 'react-native-tcp-socket';
import { WorldViewport } from '../../src/components/WorldViewport';
import { newGame, reduceGame } from '../../src/game/engine';
import { startBattle } from '../../src/game/battle';
import { makeCreature } from '../../src/game/rules';
import { openDriver } from '../../src/persistence/driver';
import { SaveRepository } from '../../src/persistence/repository';
import { createSnapshot, Snapshot } from '../../src/persistence/snapshot';
import { makeReceiver } from '../../src/transfer/crypto';
import { TransferEvents, TransferPeer, Wire } from '../../src/transfer/protocol';

const entropy = (n: number) => Crypto.getRandomBytes(n);
async function runNativeAudit() {
  const checks: string[] = [];
  const assert = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
    checks.push(message);
  };
  let game = newGame('原生传档验证', 0, 'creature_001', 13579);
  game.dialogue = null;
  const bug = makeCreature(game, 'creature_013', 9);
  game.creatures[bug.id] = bug;
  game.party.push(bug.id);
  game.dex.seen.push(bug.speciesId);
  game.dex.caught.push(bug.speciesId);
  game.inventory.candy = 1;
  game = reduceGame(game, { kind: 'useItem', itemId: 'candy', creatureId: bug.id });
  while (game.pending.length) {
    const choice = game.pending[0]!;
    game = reduceGame(
      game,
      choice.kind === 'move'
        ? { kind: 'learn', creatureId: choice.creatureId, moveId: choice.moveId, replace: null }
        : { kind: 'evolve', creatureId: choice.creatureId, toId: choice.toId, accept: true },
    );
  }
  assert(
    game.creatures[bug.id]!.speciesId === 'creature_014',
    'native Hermes growth and evolution',
  );
  startBattle(game, 'catchTutorial', { speciesId: 'creature_037', level: 4, tutorial: true });
  game = reduceGame(game, { kind: 'battle', action: { kind: 'ball' } });
  game = reduceGame(game, { kind: 'closeBattle' });
  assert(
    game.party.length === 3 && game.inventory.ball === 9,
    'native Hermes capture and consumption',
  );
  const driver = await openDriver('native-audit-receiver.db');
  const repository = new SaveRepository(driver, entropy);
  const initial = (await repository.load(1))?.snapshot ?? null;
  const before = await repository.save(1, game, initial?.revisionId ?? null);
  const reopened = new SaveRepository(await openDriver('native-audit-receiver.db'), entropy);
  assert(
    (await reopened.load(1))!.snapshot.checksum === before.checksum,
    'SQLite reopen preserves exact checkpoint',
  );
  const original = await driver.read();
  try {
    await driver.transaction((d) => {
      d.slots[1] = { ...before, revisionId: 'rollback-test' };
      d.slots[3] = undefined as unknown as Snapshot;
    });
  } catch {
    /* SQL bind failure after first attempted insert. */
  }
  assert(
    JSON.stringify(await driver.read()) === JSON.stringify(original),
    'SQLite transaction failure rolls back pointer changes',
  );
  // Exercise several real native TCP chunks using normal bounded creature histories.
  for (let i = 0; i < 25; i++) {
    const c = makeCreature(game, 'creature_040', 8);
    c.history = Array.from({ length: 32 }, () => ({
      kind: 'learned' as const,
      label: '测试成长记录'.repeat(12),
      level: 8,
    }));
    game.creatures[c.id] = c;
    game.box.push(c.id);
  }
  if (!game.dex.caught.includes('creature_040')) {
    game.dex.seen.push('creature_040');
    game.dex.caught.push('creature_040');
  }
  const snapshot = createSnapshot(game, entropy, null);
  let identity: ReturnType<typeof makeReceiver>;
  let receiver: TransferPeer | null = null;
  let sender: TransferPeer | null = null;
  let resolveDone: () => void = () => undefined;
  let rejectDone: (e: Error) => void = () => undefined;
  let agreed = false;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const events: TransferEvents = {
    status: () => undefined,
    progress: () => undefined,
    completed: () => undefined,
    failed: (m) => rejectDone(new Error(m)),
  };
  const server = TcpSocket.createServer((socket) => {
    receiver = new TransferPeer(
      'receiver',
      socket as unknown as Wire,
      identity.pairing,
      entropy,
      repository,
      {
        ...events,
        offer: () => {
          agreed = true;
          void receiver!.accept(1, before.revisionId);
        },
      },
      identity,
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port: 0, host: '127.0.0.1' }, resolve);
  });
  identity = makeReceiver(entropy, '127.0.0.1', server.address()!.port);
  const timeout = setTimeout(() => rejectDone(new Error('Native TCP audit timeout')), 20000);
  const client = TcpSocket.createConnection(
    { host: '127.0.0.1', port: identity.pairing.port, connectTimeout: 5000 },
    () => {
      sender = new TransferPeer(
        'sender',
        client as unknown as Wire,
        identity.pairing,
        entropy,
        repository,
        { ...events, completed: resolveDone },
      );
      void sender.start(snapshot).catch(rejectDone);
    },
  );
  client.on('error', rejectDone);
  try {
    await done;
    assert(agreed, 'native TCP encrypted offer requires explicit acceptance');
    const loaded = await reopened.load(1);
    assert(
      loaded!.snapshot.checksum === snapshot.checksum && loaded!.game.box.length === 25,
      'native TCP encrypted multi-chunk save commits and reloads',
    );
    const data = await driver.read();
    assert(
      data.backups[1]!.revisionId === before.revisionId && data.receipts.length > 0,
      'SQLite import protects old save and writes commit receipt',
    );
  } finally {
    clearTimeout(timeout);
    (sender as TransferPeer | null)?.cancel();
    (receiver as TransferPeer | null)?.cancel();
    client.destroy();
    server.close();
    identity.secretKey.fill(0);
  }
  return { platform: Platform.OS, status: 'passed', checks, completedAt: new Date().toISOString() };
}
function NativeAuditApp() {
  const [report, setReport] = useState('Running native SQLite / TCP / Hermes audit…');
  const { width, height } = useWindowDimensions();
  const [scene] = useState(() => {
    const g = newGame('原生验证', 0, 'creature_001', 999);
    g.dialogue = null;
    return g;
  });
  useEffect(() => {
    void runNativeAudit()
      .then((result) => {
        console.info('STARGROVE_NATIVE_AUDIT', JSON.stringify(result));
        new File(Paths.document, 'native-audit.json').write(JSON.stringify(result, null, 2));
        setReport(JSON.stringify(result, null, 2));
      })
      .catch((error: unknown) => {
        const result = {
          platform: Platform.OS,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };
        console.info('STARGROVE_NATIVE_AUDIT', JSON.stringify(result));
        new File(Paths.document, 'native-audit.json').write(JSON.stringify(result));
        setReport(JSON.stringify(result));
      });
  }, []);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#102b23',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <WorldViewport
        game={scene}
        width={Math.min(width * 0.6, height * 1.5)}
        height={height - 30}
        paused
      />
      <Text style={{ flex: 1, fontSize: 11, color: '#eedfa9' }}>{report}</Text>
    </View>
  );
}
registerRootComponent(NativeAuditApp);
