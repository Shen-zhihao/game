import { describe, expect, it } from 'vitest';
import { reduceGame } from '../src/game/engine';
import { createCollection, decodeSaveFile, saveFileData } from '../src/persistence/archive';
import { MemoryDriver, SaveRepository, StoreDriver } from '../src/persistence/repository';
import { SaveSession } from '../src/persistence/session';
import { createSnapshot, digest } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

const player = (name: string, starter = 'creature_001') => {
  const game = fixture(starter);
  game.player.name = name;
  return game;
};
describe('多玩家独立存档与可分享文件', () => {
  it('突破三个固定槽位，创建和读取任意独立存档，始终提供一个空槽', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    for (let i = 1; i <= 7; i++) expect((await repo.saveNew(player(`玩家${i}`))).slot).toBe(i);
    expect((await repo.list()).map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const slot of [7, 2, 5, 1, 6, 3, 4])
      expect((await repo.load(slot))!.game.player.name).toBe(`玩家${slot}`);
    expect(await repo.load(8)).toBeNull();
    for (const slot of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(repo.load(slot)).rejects.toThrow(/槽位/);
      await expect(repo.recovery(slot)).rejects.toThrow(/槽位/);
      await expect(repo.save(slot, fixture(), null)).rejects.toThrow(/槽位/);
    }
  });
  it('不同玩家的全部存档一次分享，新设备批量新增、冷读并独立继续，原档不覆盖', async () => {
    const source = new SaveRepository(new MemoryDriver(), testEntropy);
    const games = [
      player('甲玩家'),
      player('乙玩家', 'creature_004'),
      player('丙玩家', 'creature_007'),
    ];
    games[1] = reduceGame(games[1]!, { kind: 'cheat', code: '105' });
    games[1] = reduceGame(games[1]!, { kind: 'cheat', code: '503' });
    games[2] = reduceGame(games[2]!, { kind: 'tick', seconds: 5 });
    for (const game of games) await source.saveNew(game);
    const collection = await source.exportAll();
    const file = saveFileData(collection);
    expect(file.filename).toMatch(/^stargrove-all-.*\.stargrove$/);
    const targetDriver = new MemoryDriver();
    const target = new SaveRepository(targetDriver, testEntropy);
    const own = await target.saveNew(player('本机玩家'));
    const restored = await target.importNew(file.text);
    expect(restored.map((entry) => entry.slot)).toEqual([2, 3, 4]);
    const cold = new SaveRepository(targetDriver, testEntropy);
    expect((await cold.load(1))!.snapshot).toEqual(own.snapshot);
    for (let i = 0; i < games.length; i++)
      expect((await cold.load(restored[i]!.slot))!.game).toEqual(games[i]);
    const continued = reduceGame(games[1]!, { kind: 'tick', seconds: 4 });
    const next = await cold.save(3, continued, restored[1]!.snapshot.revisionId, cold.newBranch());
    expect(next.lineageId).toBe(collection.entries[1]!.snapshot.lineageId);
    expect(next.parentRevisionId).toBe(collection.entries[1]!.snapshot.revisionId);
    expect(next.branchId).not.toBe(collection.entries[1]!.snapshot.branchId);
    expect((await source.load(2))!.game).toEqual(games[1]);
    expect((await cold.load(3))!.game).toEqual(continued);
  });
  it('单档与旧版文件可给另一位玩家重复新增恢复，不绑定原设备或传档回执', async () => {
    const source = createSnapshot(player('原旅行者'), testEntropy, null);
    source.contentVersion = 'ch10.0';
    const target = new SaveRepository(new MemoryDriver(), testEntropy);
    const own = await target.saveNew(player('接收玩家'));
    const file = saveFileData(source);
    expect(decodeSaveFile(file.text).collection).toBe(false);
    const first = await target.importNew(file.text);
    const second = await target.importNew(file.text);
    expect(first[0]!.slot).toBe(2);
    expect(second[0]!.slot).toBe(3);
    expect((await target.load(1))!.snapshot).toEqual(own.snapshot);
    expect((await target.load(2))!.game.player.name).toBe('原旅行者');
    expect((await target.load(3))!.snapshot).toEqual(source);
  });
  it('历史和保护备份也能分享为单档，恢复后不影响原分支', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    const before = await repo.saveNew(player('过去的我'));
    await repo.save(1, player('现在的我'), before.snapshot.revisionId);
    const history = await repo.recovery(1);
    const restored = await repo.importNew(saveFileData(history[0]!.snapshot).text);
    expect((await repo.load(restored[0]!.slot))!.game.player.name).toBe('过去的我');
    expect((await repo.load(1))!.game.player.name).toBe('现在的我');
  });
  it('合集任意一档损坏、重复或版本不兼容时，整个导入均不写入', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    await repo.saveNew(player('保留'));
    const before = await repo.exportAll();
    const collection = createCollection([
      { slot: 1, snapshot: createSnapshot(player('甲'), testEntropy, null) },
      { slot: 2, snapshot: createSnapshot(player('乙'), testEntropy, null) },
    ]);
    const variants = [
      (c: typeof collection) => {
        c.entries[1]!.snapshot.payload += ' ';
      },
      (c: typeof collection) => {
        c.entries[1]!.snapshot.contentVersion = 'future';
      },
      (c: typeof collection) => {
        c.entries[1]!.slot = 1;
      },
      (c: typeof collection) => {
        c.entries[1]!.slot = 0;
      },
    ];
    for (const mutate of variants) {
      const bad = structuredClone(collection);
      mutate(bad);
      bad.checksum = digest(JSON.stringify(bad.entries));
      await expect(repo.importNew(JSON.stringify(bad))).rejects.toThrow();
      expect((await repo.exportAll()).entries).toEqual(before.entries);
    }
    const damaged = { ...collection, checksum: '0'.repeat(64) };
    await expect(repo.importNew(JSON.stringify(damaged))).rejects.toThrow(/校验/);
    expect((await repo.exportAll()).entries).toEqual(before.entries);
  });
  it('批量导入遇到磁盘故障全部回滚，不留下半份合集或改动原档', async () => {
    const driver = new MemoryDriver();
    const repo = new SaveRepository(driver, testEntropy);
    await repo.saveNew(player('原玩家'));
    const collection = createCollection([
      { slot: 1, snapshot: createSnapshot(player('甲'), testEntropy, null) },
      { slot: 2, snapshot: createSnapshot(player('乙'), testEntropy, null) },
    ]);
    const before = await driver.read();
    driver.failCommit = true;
    await expect(repo.importNew(JSON.stringify(collection))).rejects.toThrow(/磁盘/);
    expect(await driver.read()).toEqual(before);
  });
  it('两份仓库同时新增不会抢占同一槽，旧 revision 写入仍被拦截', async () => {
    const driver = new MemoryDriver();
    const a = new SaveRepository(driver, testEntropy);
    const b = new SaveRepository(driver, testEntropy);
    const created = await Promise.all([a.saveNew(player('甲')), b.saveNew(player('乙'))]);
    expect(created.map((s) => s.slot)).toEqual([1, 2]);
    const writes = await Promise.allSettled([
      a.save(1, player('甲的新进度'), created[0]!.snapshot.revisionId),
      b.save(1, player('过时覆盖'), created[0]!.snapshot.revisionId),
    ]);
    expect(writes.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect((await a.load(2))!.game.player.name).toBe('乙');
  });
});

describe('读档与自动保存的顺序', () => {
  it('重读当前槽直接回到已存进度，不先把未保存变化写回去', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    const original = await repo.saveNew(player('旅人'));
    const session = new SaveSession(repo);
    await session.load(1);
    session.dispatch({ kind: 'tick', seconds: 7 });
    expect(session.state.game!.playTimeSeconds).toBe(7);
    await session.load(1);
    expect(session.state.game!.playTimeSeconds).toBe(0);
    expect((await repo.load(1))!.snapshot).toEqual(original.snapshot);
  });
  it('切换到另一位玩家前保存原玩家，后续自动保存不会串档', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    await repo.saveNew(player('甲'));
    await repo.saveNew(player('乙', 'creature_004'));
    const session = new SaveSession(repo);
    await session.load(1);
    session.dispatch({ kind: 'tick', seconds: 3 });
    await session.load(2);
    expect(session.state.game!.player.name).toBe('乙');
    session.dispatch({ kind: 'tick', seconds: 8 });
    await session.save();
    expect((await repo.load(1))!.game.playTimeSeconds).toBe(3);
    expect((await repo.load(2))!.game.playTimeSeconds).toBe(8);
    await session.load(1);
    expect(session.state.game!.player.name).toBe('甲');
  });
  it('另存为新档后在新槽继续，原检查点可任意读取', async () => {
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    const old = await repo.saveNew(player('甲'));
    await repo.saveNew(player('乙'));
    await repo.saveNew(player('丙'));
    const session = new SaveSession(repo);
    await session.load(1);
    session.dispatch({ kind: 'tick', seconds: 5 });
    expect(await session.saveAs()).toBe(4);
    expect(session.state.slot).toBe(4);
    session.dispatch({ kind: 'tick', seconds: 4 });
    await session.save();
    expect((await repo.load(1))!.snapshot).toEqual(old.snapshot);
    expect((await repo.load(4))!.game.playTimeSeconds).toBe(9);
    await session.load(1);
    expect(session.state.game!.playTimeSeconds).toBe(0);
  });
  it('进行中的保存先完成，再切档；延迟自动保存与重复输入不会写错玩家', async () => {
    const memory = new MemoryDriver();
    let hold = false;
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const driver: StoreDriver = {
      read: () => memory.read(),
      async transaction(operation) {
        if (hold) {
          hold = false;
          started();
          await gate;
        }
        return memory.transaction(operation);
      },
    };
    const repo = new SaveRepository(driver, testEntropy);
    await repo.saveNew(player('甲'));
    await repo.saveNew(player('乙'));
    const session = new SaveSession(repo);
    await session.load(1);
    session.dispatch({ kind: 'tick', seconds: 3 });
    hold = true;
    const saving = session.save();
    await entered;
    const loading = session.load(2);
    const lateSave = session.save();
    session.dispatch({ kind: 'tick', seconds: 99 });
    release();
    await Promise.all([saving, loading, lateSave]);
    expect((await repo.load(1))!.game.playTimeSeconds).toBe(3);
    expect((await repo.load(2))!.game.playTimeSeconds).toBe(0);
    expect(session.state.game!.player.name).toBe('乙');
  });
  it('保存失败不会丢弃当前玩家；坏档或空槽也不会替换正在玩的进度', async () => {
    const driver = new MemoryDriver();
    const repo = new SaveRepository(driver, testEntropy);
    await repo.saveNew(player('甲'));
    await repo.saveNew(player('乙'));
    const session = new SaveSession(repo);
    await session.load(1);
    session.dispatch({ kind: 'tick', seconds: 6 });
    driver.failCommit = true;
    await expect(session.load(2)).rejects.toThrow(/磁盘/);
    await expect(session.unload()).rejects.toThrow(/磁盘/);
    expect(session.state.slot).toBe(1);
    expect(session.state.game!.playTimeSeconds).toBe(6);
    driver.failCommit = false;
    await expect(session.load(3)).rejects.toThrow(/没有存档/);
    driver.data.slots[2]!.checksum = '0'.repeat(64);
    await expect(session.load(2)).rejects.toThrow(/校验/);
    expect(session.state.game!.player.name).toBe('甲');
    expect((await repo.load(1))!.game.playTimeSeconds).toBe(0);
    await session.save();
    expect((await repo.load(1))!.game.playTimeSeconds).toBe(6);
  });
});
