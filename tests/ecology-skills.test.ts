import { describe, expect, it } from 'vitest';
import acquisition from '../docs/精灵获取/稀有精灵获取.json';
import { ALL_SPECIES, isOrdinarySpecies, MOVES, SPECIES } from '../src/content/catalog';
import { CITIES } from '../src/content/cities';
import { encounterSiteAt, HABITAT_SITES, SPECIES_HABITATS } from '../src/content/habitats';
import { REGION_PLACES } from '../src/content/region';
import { MAPS, terrainPassable } from '../src/content/world';
import { startBattle } from '../src/game/battle';
import { reduceGame } from '../src/game/engine';
import { makeCreature } from '../src/game/rules';
import { copyMoveReason, recallOptions } from '../src/game/skills';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

describe('按生态安排的 250 种栖息地', () => {
  it('覆盖全部形态与 115 家族，地点、进化来源和地区对应，并区分未来来源', () => {
    expect(Object.keys(SPECIES_HABITATS)).toHaveLength(250);
    expect(new Set(Object.values(SPECIES_HABITATS).map((p) => p.familyId)).size).toBe(115);
    expect(new Set(HABITAT_SITES.map((s) => s.id)).size).toBe(HABITAT_SITES.length);
    for (const s of ALL_SPECIES) {
      const p = SPECIES_HABITATS[s.id]!;
      expect(p.familyId).toBe(s.familyId);
      expect(p.description).toContain(s.name);
      expect(p.siteIds.length).toBeGreaterThan(0);
      expect(p.siteIds.every((id) => HABITAT_SITES.some((h) => h.id === id))).toBe(true);
      expect(p.sourceSpeciesId).toBe(s.evolvesFromId);
      if (s.evolvesFromId) expect(p.method).toBe('evolution');
    }
    for (const site of HABITAT_SITES)
      expect(REGION_PLACES.some((p) => p.id === site.regionId)).toBe(true);
    expect(SPECIES_HABITATS.creature_075!.siteIds).toEqual(['mine_river']);
    expect(SPECIES_HABITATS.creature_201!.obtainableNow).toBe(true);
    expect(SPECIES_HABITATS.creature_250!.method).toBe('storyEncounter');
    expect(SPECIES_HABITATS.creature_001!.method).toBe('storyGift');
  });
  it('每个实际遭遇都落在声明的栖地，陆地不出纯水生滴石鲶，故事家族不泄漏', () => {
    for (const site of HABITAT_SITES)
      for (const e of site.encounters) {
        expect(site.map).toBeDefined();
        expect(isOrdinarySpecies(e.speciesId)).toBe(true);
        expect(SPECIES_HABITATS[e.speciesId]!.siteIds).toContain(site.id);
        expect(e.min).toBeGreaterThanOrEqual(1);
        expect(e.max).toBeGreaterThanOrEqual(e.min);
        expect(e.weight).toBeGreaterThan(0);
        if (site.medium === 'land') expect(e.speciesId).not.toBe('creature_075');
      }
    for (const family of acquisition.families) {
      const forms = ALL_SPECIES.filter((s) => s.familyId === family.familyId);
      for (const form of forms) {
        expect(SPECIES_HABITATS[form.id]!.questId).toBe(family.questId);
        expect(SPECIES_HABITATS[form.id]!.obtainableNow).toBe(family.implemented);
      }
    }
  });
  it('水生遭遇都有真实水面与可站立岸边，不需要走进水或额外徽章', () => {
    const neighbors = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const site of HABITAT_SITES.filter(
      (s) => s.map && s.medium === 'water' && s.encounters.length,
    )) {
      const map = MAPS[site.map!];
      const banks: [number, number][] = [];
      map.rows.forEach((row, y) =>
        [...row].forEach((tile, x) => {
          if (tile === '~' && encounterSiteAt(map.id, x, y, 'water')?.id === site.id)
            for (const [dx, dy] of neighbors)
              if (
                terrainPassable(map.id, x + dx!, y + dy!, {}) &&
                !map.npcs.some((n) => n.x === x + dx! && n.y === y + dy!)
              )
                banks.push([x + dx!, y + dy!]);
        }),
      );
      expect(banks.length, site.name).toBeGreaterThan(0);
    }
  });
  it('新生成发现使用所在生境的陆生池，旧的发现坐标和领取记录不重刷', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = fixture('creature_001', seed);
      for (const find of Object.values(game.world!.finds).filter((f) => f.kind === 'wild'))
        expect(
          encounterSiteAt(find.map, find.x, find.y)!.encounters.some(
            (e) => e.speciesId === find.speciesId,
          ),
        ).toBe(true);
    }
    const old = fixture();
    const find = Object.values(old.world!.finds).find((f) => f.map === 'mine')!;
    find.kind = 'wild';
    find.speciesId = 'creature_075';
    const snapshot = createSnapshot(old, testEntropy, null);
    snapshot.contentVersion = 'ch2.1';
    const loaded = decodeSnapshot(JSON.stringify(snapshot)).game;
    const migrated = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    expect(migrated.world!.finds).toEqual(old.world!.finds);
    expect(migrated.rng).toBe(old.rng);
  });
  it('岸边按 A 真正触发暗河精灵战斗，可恢复回合；入门前不会提前开启', () => {
    let game = fixture();
    Object.assign(game.player, { map: 'mine', x: 15, y: 19, facing: 'down' });
    const before = reduceGame(game, { kind: 'interact' });
    expect(before.battle).toBeNull();
    game.progress.flags.rival = game.progress.flags.catchTutorial = true;
    game = reduceGame(game, { kind: 'interact' });
    expect(game.battle!.enemies[0]!.speciesId).toBe('creature_075');
    expect(game.battle!.logs[0]).toContain('地下暗河');
    expect(game.player.x).toBe(15);
    expect(game.player.y).toBe(19);
    expect(decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game).toEqual(
      game,
    );
    validateGame(game);
  });
});

function copyFixture() {
  const game = fixture();
  game.progress.flags.rival = game.progress.flags.catchTutorial = true;
  const source = makeCreature(game, 'creature_004', 18);
  game.creatures[source.id] = source;
  game.box.push(source.id);
  game.dex.seen.push(source.speciesId);
  game.dex.caught.push(source.speciesId);
  game.inventory.skill_copy = 2;
  return { game, sourceId: source.id, targetId: game.party[0]! };
}
describe('任意精灵的通用技能复刻', () => {
  it('每城可买可兑换，成功跨属性学习只扣一瓶，来源技能与零 PP 不受影响', () => {
    for (const city of CITIES) {
      expect(city.stock).toContain('skill_copy');
      expect(city.exchanges.some((o) => o.itemId === 'skill_copy')).toBe(true);
    }
    const { game, sourceId, targetId } = copyFixture();
    game.creatures[sourceId]!.moves.find((m) => m.id === 'fire_2')!.pp = 0;
    const source = structuredClone(game.creatures[sourceId]);
    const learned = reduceGame(game, {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: null,
    });
    expect(learned.inventory.skill_copy).toBe(1);
    expect(learned.creatures[sourceId]).toEqual(source);
    expect(learned.creatures[targetId]!.moves).toContainEqual({
      id: 'fire_2',
      pp: MOVES.fire_2!.pp,
    });
    expect(learned.creatures[targetId]!.taughtMoves).toEqual(['fire_2']);
    expect(learned.creatures[targetId]!.speciesId).toBe('creature_001');
    const duplicate = reduceGame(learned, {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: 0,
    });
    expect(duplicate.inventory).toEqual(learned.inventory);
    expect(duplicate.creatures).toEqual(learned.creatures);
    validateGame(learned);
  });
  it('全部 250 种形态在 Lv.1 均可学习跨种族技能，仓库和昏厥状态也不设门槛', () => {
    for (const species of ALL_SPECIES) {
      const { game, sourceId } = copyFixture();
      const c = makeCreature(game, species.id, 1);
      game.creatures[c.id] = c;
      game.box.push(c.id);
      for (const key of ['seen', 'caught'] as const)
        if (!game.dex[key].includes(c.speciesId)) game.dex[key].push(c.speciesId);
      c.hp = 0;
      const next = reduceGame(game, {
        kind: 'copyMove',
        sourceId,
        creatureId: c.id,
        moveId: 'fire_2',
        replace: null,
      });
      expect(next.creatures[c.id]!.moves.some((m) => m.id === 'fire_2')).toBe(true);
      expect(next.creatures[c.id]!.hp).toBe(0);
      expect(next.inventory.skill_copy).toBe(1);
      validateGame(next);
    }
  });
  it('满四招必须选替换位，错误槽位、陌生来源、未知技能与来源未掌握的技能均不消耗', () => {
    const { game, sourceId, targetId } = copyFixture();
    game.creatures[targetId]!.moves.push({ id: 'recover', pp: MOVES.recover!.pp });
    const command = {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: null,
    } as const;
    for (const change of [
      {},
      { replace: 4 },
      { replace: -1 },
      { replace: 0.5 },
      { sourceId: 'unknown' },
      { creatureId: 'unknown' },
      { moveId: 'unknown' },
      { moveId: 'ice_2' },
      { moveId: 'struggle' },
    ]) {
      const next = reduceGame(game, { ...command, ...change });
      expect(next.inventory).toEqual(game.inventory);
      expect(next.creatures).toEqual(game.creatures);
    }
    const next = reduceGame(game, { ...command, replace: 1 });
    expect(next.creatures[targetId]!.moves).toHaveLength(4);
    expect(next.creatures[targetId]!.moves[1]!.id).toBe('fire_2');
    expect(next.inventory.skill_copy).toBe(1);
  });
  it('缺药、对话、待选成长或战斗中拒绝复刻，不产生半扣道具或隐式学习', () => {
    for (const context of ['inventory', 'dialogue', 'pending', 'battle']) {
      const { game, sourceId, targetId } = copyFixture();
      if (context === 'inventory') game.inventory.skill_copy = 0;
      if (context === 'dialogue')
        game.dialogue = { speaker: '测试', lines: ['测试'], index: 0, after: null };
      if (context === 'pending')
        game.pending.push({ kind: 'move', creatureId: targetId, moveId: 'recover' });
      if (context === 'battle') startBattle(game, null, { speciesId: 'creature_037', level: 2 });
      expect(copyMoveReason(game, sourceId, targetId, 'fire_2', null)).not.toBeNull();
      const next = reduceGame(game, {
        kind: 'copyMove',
        sourceId,
        creatureId: targetId,
        moveId: 'fire_2',
        replace: null,
      });
      expect(next.inventory).toEqual(game.inventory);
      expect(next.creatures).toEqual(game.creatures);
    }
  });
  it('复刻技能在实际战斗中可选用并消耗正确 PP，不改变精灵属性', () => {
    const { game, sourceId, targetId } = copyFixture();
    const learned = reduceGame(game, {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: null,
    });
    startBattle(learned, null, { speciesId: 'creature_013', level: 2 });
    const index = learned.creatures[targetId]!.moves.findIndex((m) => m.id === 'fire_2');
    const fought = reduceGame(learned, { kind: 'battle', action: { kind: 'move', index } });
    expect(fought.creatures[targetId]!.moves[index]!.pp).toBe(MOVES.fire_2!.pp - 1);
    expect(fought.battle!.logs.some((s) => s.includes(`使用了${MOVES.fire_2!.name}`))).toBe(true);
    expect(SPECIES[fought.creatures[targetId]!.speciesId]!.types).toEqual(['grass']);
    validateGame(fought);
  });
  it('进化与遗忘后保留通用技能册，城镇免费回忆，不再消耗复刻剂', () => {
    let { game, sourceId, targetId } = copyFixture();
    const target = makeCreature(game, 'creature_001', 16);
    game.creatures[target.id] = target;
    game.party.push(target.id);
    targetId = target.id;
    game = reduceGame(game, {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: 0,
    });
    game = reduceGame(game, {
      kind: 'evolve',
      creatureId: targetId,
      toId: 'creature_002',
      accept: true,
    });
    while (game.pending.length) {
      const p = game.pending[0]!;
      game = reduceGame(
        game,
        p.kind === 'move'
          ? { kind: 'learn', creatureId: p.creatureId, moveId: p.moveId, replace: null }
          : { kind: 'evolve', creatureId: p.creatureId, toId: p.toId, accept: false },
      );
    }
    const before = game.inventory.skill_copy;
    game = reduceGame(game, { kind: 'recall', creatureId: targetId, moveId: 'growl', replace: 0 });
    expect(game.creatures[targetId]!.moves.some((m) => m.id === 'fire_2')).toBe(false);
    expect(
      recallOptions(game.creatures[targetId]!).some((m) => m.moveId === 'fire_2' && m.copied),
    ).toBe(true);
    game = reduceGame(game, { kind: 'recall', creatureId: targetId, moveId: 'fire_2', replace: 0 });
    expect(game.creatures[targetId]!.moves[0]!.id).toBe('fire_2');
    expect(game.inventory.skill_copy).toBe(before);
    expect(game.creatures[targetId]!.taughtMoves).toEqual(['fire_2']);
    validateGame(game);
  });
  it('技能册冷读取完整保留，拒绝未知、重复与临时挣扎技能；旧档无该字段可读', async () => {
    const { game, sourceId, targetId } = copyFixture();
    const learned = reduceGame(game, {
      kind: 'copyMove',
      sourceId,
      creatureId: targetId,
      moveId: 'fire_2',
      replace: null,
    });
    const driver = new MemoryDriver();
    await new SaveRepository(driver, testEntropy).save(1, learned, null);
    expect((await new SaveRepository(driver, testEntropy).load(1))!.game).toEqual(learned);
    for (const taughtMoves of [['bad'], ['struggle'], ['fire_2', 'fire_2']]) {
      const bad = structuredClone(learned);
      bad.creatures[targetId]!.taughtMoves = taughtMoves;
      expect(() => validateGame(bad)).toThrow(/技能册/);
    }
    const old = fixture();
    const snapshot = createSnapshot(old, testEntropy, null);
    snapshot.contentVersion = 'ch2.1';
    expect(decodeSnapshot(JSON.stringify(snapshot)).game).toEqual(old);
  });
});
