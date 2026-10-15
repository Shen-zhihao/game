import { describe, expect, it } from 'vitest';
import { reduceGame } from '../src/game/engine';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot, decodeSnapshot, digest, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

describe('本地与导入事务', () => {
  it('快照可恢复并继续，篡改、未来版本和非法位置被拒绝', () => {
    const g = fixture();
    const s = createSnapshot(g, testEntropy, null);
    expect(decodeSnapshot(JSON.stringify(s)).game).toEqual(g);
    expect(() => decodeSnapshot(JSON.stringify({ ...s, payload: s.payload + ' ' }))).toThrow(
      /校验/,
    );
    expect(() => decodeSnapshot(JSON.stringify({ ...s, contentVersion: 'future' }))).toThrow(
      /更新/,
    );
    const bad = { ...g, player: { ...g.player, x: 0, y: 0 } };
    const payload = JSON.stringify(bad);
    expect(() =>
      decodeSnapshot(JSON.stringify({ ...s, payload, checksum: digest(payload) })),
    ).toThrow(/位置/);
  });
  it('拒绝重复精灵、悬空引用、非法属性状态与高额 HP', () => {
    const g = fixture();
    expect(() => validateGame({ ...g, party: [g.party[0], g.party[0]] })).toThrow();
    const id = g.party[0]!;
    expect(() =>
      validateGame({ ...g, creatures: { ...g.creatures, [id]: { ...g.creatures[id], hp: 9999 } } }),
    ).toThrow(/体力/);
    expect(() => validateGame({ ...g, party: ['unknown'] })).toThrow();
  });
  it('连续保存保留最近 10 份，导入保护备份不随历史轮转删除', async () => {
    const driver = new MemoryDriver();
    const repo = new SaveRepository(driver, testEntropy);
    let g = fixture();
    let s = await repo.save(1, g, null);
    const old = s;
    const imported = createSnapshot(fixture('creature_004'), testEntropy, null);
    await repo.import(1, JSON.stringify(imported), s.revisionId, 't1');
    s = imported;
    for (let i = 0; i < 15; i++) {
      g = reduceGame(g, { kind: 'tick', seconds: 1 });
      s = await repo.save(1, g, s.revisionId);
    }
    expect(driver.data.history[1]).toHaveLength(10);
    expect(driver.data.backups[1]!.revisionId).toBe(old.revisionId);
    expect((await repo.load(1))!.game.playTimeSeconds).toBe(15);
  });
  it('导入失败整体回滚，当前槽与备份保持不变', async () => {
    const d = new MemoryDriver();
    const r = new SaveRepository(d, testEntropy);
    const s = await r.save(1, fixture(), null);
    const before = await d.read();
    d.failCommit = true;
    await expect(
      r.import(
        1,
        JSON.stringify(createSnapshot(fixture('creature_007'), testEntropy, null)),
        s.revisionId,
        'failure',
      ),
    ).rejects.toThrow(/磁盘/);
    expect(await d.read()).toEqual(before);
  });
  it('拒绝过时槽位覆盖；相同传输回执幂等', async () => {
    const d = new MemoryDriver();
    const r = new SaveRepository(d, testEntropy);
    const old = await r.save(1, fixture(), null);
    const s = createSnapshot(fixture('creature_004'), testEntropy, null);
    await r.import(1, JSON.stringify(s), old.revisionId, 'duplicate');
    const history = JSON.stringify(d.data.history);
    await r.import(1, JSON.stringify(s), old.revisionId, 'duplicate');
    expect(JSON.stringify(d.data.history)).toBe(history);
    await expect(r.save(1, fixture(), old.revisionId)).rejects.toThrow(/已改变/);
    expect(await r.receipt('duplicate', s.checksum)).toMatchObject({
      slot: 1,
      revisionId: s.revisionId,
    });
  });
  it('读取坏档报错并保留原快照，仍可找到有效历史', async () => {
    const d = new MemoryDriver();
    const r = new SaveRepository(d, testEntropy);
    const a = await r.save(1, fixture(), null);
    await r.save(1, fixture(), a.revisionId);
    d.data.slots[1]!.checksum = '0'.repeat(64);
    await expect(r.load(1)).rejects.toThrow(/校验/);
    expect((await r.list())[0]!.error).toContain('校验');
    expect((await r.recovery(1))[0]!.snapshot.revisionId).toBe(a.revisionId);
    expect(d.data.slots[1]!.checksum).toBe('0'.repeat(64));
  });
});
