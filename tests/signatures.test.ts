import { describe, expect, it } from 'vitest';
import acquisition from '../docs/data/acquisition-plan.json';
import { ALL_SPECIES, canLearnMove, learnset, SPECIES } from '../src/content/catalog';
import { SIGNATURES, SIGNATURE_BY_SPECIES } from '../src/content/signatures';
import { reduceGame } from '../src/game/engine';
import { startBattle } from '../src/game/battle';
import { MAPS, terrainPassable } from '../src/content/world';
import { copyableMove, copyMoveReason, recallOptions } from '../src/game/skills';
import { centerOptions } from '../src/game/fieldSkills';
import { gainXp, makeCreature, xpAt } from '../src/game/rules';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

function owned(speciesId: string, level: number) {
  const game = fixture();
  const c = makeCreature(game, speciesId, level);
  game.creatures[c.id] = c;
  game.box.push(c.id);
  game.dex.caught.push(speciesId);
  game.dex.seen.push(speciesId);
  game.inventory.skill_copy = 2;
  return { game, c };
}
describe('每个稀有与神兽形态的专属技能', () => {
  it('覆盖 38 个家族的 51 个形态，招式属性、学习等级与归属均明确', () => {
    const rare = new Set(
      acquisition.families
        .filter((f) => ['rare', 'legendary'].includes(f.rarity))
        .map((f) => f.familyId),
    );
    expect(SIGNATURES).toHaveLength(51);
    expect(new Set(SIGNATURES.map((s) => s.move.name)).size).toBe(51);
    expect(SIGNATURES.map((s) => s.speciesId).sort()).toEqual(
      ALL_SPECIES.filter((s) => rare.has(s.familyId))
        .map((s) => s.id)
        .sort(),
    );
    for (const s of SIGNATURES) {
      expect(SPECIES[s.speciesId]!.types).toContain(s.move.type);
      expect(s.move.exclusiveSpeciesId).toBe(s.speciesId);
      expect(learnset(s.speciesId)).toContainEqual({ level: s.level, moveId: s.move.id });
      expect(copyableMove(s.move.id)).toBe(false);
      expect(s.description.length).toBeGreaterThan(10);
      const c = makeCreature(fixture(), s.speciesId, 100);
      expect(c.moves.some((m) => m.id === s.move.id)).toBe(true);
    }
    expect(canLearnMove('creature_001', 'fire_2')).toBe(true);
  });
  it('按等级自然解锁，也能在中心回忆，未到等级不提前开放', () => {
    const { game, c } = owned('creature_249', 49);
    const signature = SIGNATURE_BY_SPECIES[c.speciesId]!;
    expect(recallOptions(c).some((m) => m.moveId === signature.move.id)).toBe(false);
    gainXp(game, c, xpAt(50, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
    expect(game.pending).toContainEqual({
      kind: 'move',
      creatureId: c.id,
      moveId: signature.move.id,
    });
    expect(centerOptions(game, c)).toContain(signature.move.id);
    let learned = reduceGame(game, {
      kind: 'learn',
      creatureId: c.id,
      moveId: signature.move.id,
      replace: 0,
    });
    expect(learned.creatures[c.id]!.moves[0]!.id).toBe(signature.move.id);
    const healer = MAPS.dawn.npcs.find((n) => n.role === 'healer')!;
    const adjacent = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ].find(([dx, dy]) =>
      terrainPassable('dawn', healer.x + dx!, healer.y + dy!, learned.progress.flags),
    )!;
    Object.assign(learned.player, {
      map: 'dawn',
      x: healer.x + adjacent[0]!,
      y: healer.y + adjacent[1]!,
    });
    learned = reduceGame(learned, {
      kind: 'centerForget',
      creatureId: c.id,
      moveId: signature.move.id,
    });
    learned = reduceGame(learned, {
      kind: 'centerLearn',
      creatureId: c.id,
      moveId: signature.move.id,
      replace: null,
    });
    expect(learned.creatures[c.id]!.moves.some((m) => m.id === signature.move.id)).toBe(true);
    expect(learned.inventory.skill_copy).toBe(2);
    validateGame(learned);
  });
  it('复刻剂不能复制给其他种族或同种伙伴，拒绝时道具和技能均不变', () => {
    const { game, c } = owned('creature_025', 20);
    const signature = SIGNATURE_BY_SPECIES[c.speciesId]!.move.id;
    const same = makeCreature(game, c.speciesId, 5);
    game.creatures[same.id] = same;
    game.box.push(same.id);
    for (const targetId of [game.party[0]!, same.id]) {
      expect(copyMoveReason(game, c.id, targetId, signature, 0)).toContain('专属技能');
      const next = reduceGame(game, {
        kind: 'copyMove',
        sourceId: c.id,
        creatureId: targetId,
        moveId: signature,
        replace: 0,
      });
      expect(next.inventory.skill_copy).toBe(2);
      expect(next.creatures[targetId]!.moves).toEqual(game.creatures[targetId]!.moves);
    }
  });
  it('进化后招式更换为对应形态，保留已消耗 PP，并移除旧形态待学选项', () => {
    const { game, c } = owned('creature_025', 100);
    game.inventory.echo_bell = 1;
    const before = SIGNATURE_BY_SPECIES[c.speciesId]!,
      after = SIGNATURE_BY_SPECIES.creature_026!;
    c.moves = [
      { id: before.move.id, pp: 2 },
      { id: 'tackle', pp: 10 },
    ];
    game.pending = [
      { kind: 'evolution', creatureId: c.id, toId: after.speciesId },
      { kind: 'move', creatureId: c.id, moveId: before.move.id },
    ];
    const next = reduceGame(game, {
      kind: 'evolve',
      creatureId: c.id,
      toId: after.speciesId,
      accept: true,
    });
    expect(next.creatures[c.id]!.moves[0]).toEqual({ id: after.move.id, pp: 2 });
    expect(next.pending.some((p) => p.kind === 'move' && p.moveId === before.move.id)).toBe(false);
    expect(recallOptions(next.creatures[c.id]!).some((m) => m.moveId === before.move.id)).toBe(
      false,
    );
    validateGame(next);
  });
  it('导入存档拒绝伪造的在用、复刻册、待学和敌方专属技能', () => {
    const signature = SIGNATURE_BY_SPECIES.creature_250!.move.id;
    const game = fixture(),
      c = game.creatures[game.party[0]!]!;
    for (const field of ['active', 'taught', 'pending'] as const) {
      const forged = structuredClone(game);
      if (field === 'active') forged.creatures[c.id]!.moves[0] = { id: signature, pp: 1 };
      if (field === 'taught') forged.creatures[c.id]!.taughtMoves = [signature];
      if (field === 'pending')
        forged.pending.push({ kind: 'move', creatureId: c.id, moveId: signature });
      expect(() => validateGame(forged)).toThrow();
    }
    const forgedEnemy = structuredClone(game);
    startBattle(forgedEnemy, null, { speciesId: 'creature_037', level: 5 });
    forgedEnemy.battle!.enemies[0]!.moves[0] = { id: signature, pp: 1 };
    expect(() => validateGame(forgedEnemy)).toThrow('归属');
  });
  it('旧存档不强改配招，原有进度可恢复，之后通过回忆获得新招', () => {
    const { game, c } = owned('creature_250', 70);
    c.moves = [
      { id: 'dragon_2', pp: 3 },
      { id: 'guard', pp: 5 },
    ];
    const snapshot = createSnapshot(game, testEntropy, null);
    snapshot.contentVersion = 'ch10.2';
    const restored = decodeSnapshot(JSON.stringify(snapshot)).game;
    expect(restored.creatures[c.id]).toEqual(c);
    expect(recallOptions(restored.creatures[c.id]!).some((m) => m.moveId === 'signature_250')).toBe(
      true,
    );
  });
});
