import { describe, expect, it } from 'vitest';
import plan from '../docs/data/campaign-plan.json';
import acquisition from '../docs/data/acquisition-plan.json';
import { CONTENT_VERSION, isOrdinarySpecies, SPECIES } from '../src/content/catalog';
import { MAPS, mapSize, terrainPassable } from '../src/content/world';
import { reduceGame } from '../src/game/engine';
import { createExploration, encountersAt, FIND_SITES, worldNpcs } from '../src/game/exploration';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, playChapter, playOpening, testEntropy } from './helpers';
const sceneDimensions = {
  deepwood: [1280, 1088],
  echoMeadow: [1408, 1088],
  mineDepths: [1408, 1088],
  kelpCove: [1472, 1088],
  championRoad: [1536, 1280],
  league: [1280, 1024],
  leagueHall: [1152, 2240],
  hallOfFame: [1152, 768],
  star: [1408, 1088],
  starRoute: [1536, 1088],
  starCore: [1408, 1088],
  starGym: [1088, 896],
  ancientTemple: [1344, 1088],
  nightHall: [1216, 960],
  lake: [1280, 1024],
  lakeRoute: [1472, 1088],
  mirrorArchive: [1088, 896],
  mirrorRuins: [1472, 1152],
  psychicGym: [1024, 832],
  furnace: [1280, 1024],
  furnaceRoute: [1408, 1088],
  foundry: [1216, 960],
  hotSprings: [1344, 1024],
  fireGym: [1024, 832],
  dawn: [960, 640],
  route: [960, 640],
  moss: [960, 640],
  forest: [960, 640],
  gym: [768, 512],
  stoneRoute: [1152, 768],
  stone: [960, 704],
  mine: [1152, 768],
  rockGym: [832, 640],
  coastRoute: [1280, 832],
  harbor: [1152, 832],
  tideworks: [1280, 896],
  waterGym: [832, 704],
  powerRoute: [1280, 896],
  volt: [1280, 896],
  powerStation: [1216, 896],
  electricGym: [960, 768],
  wind: [1216, 960],
  windRoute: [1472, 1088],
  windObservatory: [1088, 896],
  windSanctuary: [1408, 1088],
  windGym: [1024, 832],
};

describe('自由探索、巡走与剧情相遇', () => {
  it('室外地图扩展为新区域，出入口、巡走和发现候选点仍合法', () => {
    for (const map of Object.values(MAPS)) {
      expect(new Set(map.rows.map((row) => row.length)).size).toBe(1);
      expect(mapSize(map.id)).toEqual({
        width: sceneDimensions[map.id][0],
        height: sceneDimensions[map.id][1],
      });
      for (const portal of map.portals) {
        expect(terrainPassable(map.id, portal.x, portal.y, {})).toBe(true);
        expect(terrainPassable(portal.map, portal.toX, portal.toY, {})).toBe(true);
      }
      for (const npc of map.npcs)
        if (npc.patrol)
          for (const [x, y] of npc.patrol) expect(terrainPassable(map.id, x, y, {})).toBe(true);
    }
    expect(encountersAt('route', 25, 13).name).toBe('东侧高草区');
    expect(encountersAt('route', 25, 13).encounters).not.toEqual(
      encountersAt('route', 4, 2).encounters,
    );
    expect(encountersAt('forest', 3, 17).name).toBe('南岸湿地');
    for (const map of Object.values(MAPS))
      for (const [x, y] of FIND_SITES[map.id] ?? []) {
        expect(terrainPassable(map.id, x, y, {}), `Invalid find ${map.id} ${x},${y}`).toBe(true);
        expect(map.npcs.some((n) => n.x === x && n.y === y)).toBe(false);
      }
  });

  it('新档种子改变探索事件，同档重开保持位置、内容与已领取状态，不重刷奖励', () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(createExploration(i + 1).finds)),
    );
    expect(layouts.size).toBeGreaterThan(10);
    const game = fixture();
    game.progress.flags.rival = game.progress.flags.catchTutorial = true;
    const [id, find] = Object.entries(game.world!.finds).find(
      ([, f]) => f.map === 'dawn' && f.kind === 'items',
    )!;
    game.player.x = find.x - 1;
    game.player.y = find.y;
    game.player.facing = 'right';
    const before = game.inventory[find.itemId] ?? 0;
    const full = reduceGame(
      { ...game, inventory: { ...game.inventory, [find.itemId]: 999 } },
      { kind: 'interact' },
    );
    expect(full.world!.finds[id]!.claimed).toBe(false);
    expect(full.inventory[find.itemId]).toBe(999);
    const taken = reduceGame(game, { kind: 'interact' });
    expect(taken.inventory[find.itemId]).toBe(before + find.quantity);
    expect(taken.world!.finds[id]!.claimed).toBe(true);
    const loaded = decodeSnapshot(JSON.stringify(createSnapshot(taken, testEntropy, null))).game;
    expect(loaded.world).toEqual(taken.world);
    loaded.dialogue = null;
    const repeated = reduceGame(loaded, { kind: 'interact' });
    expect(repeated.inventory).toEqual(taken.inventory);
    expect(worldNpcs(repeated).some((n) => n.id === id)).toBe(false);
  });

  it('人物逐格巡走、避开玩家、靠近时停下并冻结对话现场；探索不消耗战斗随机数', () => {
    let game = fixture();
    game.player.map = 'route';
    game.player.x = 10;
    game.player.y = 10;
    const rng = game.rng;
    const seen = new Set<string>();
    let previous = worldNpcs(game).find((n) => n.id === 'routeTrainer')!;
    for (let i = 0; i < 24; i++) {
      game = reduceGame(game, { kind: 'tick', seconds: 1 });
      const next = worldNpcs(game).find((n) => n.id === 'routeTrainer')!;
      expect(Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y)).toBeLessThanOrEqual(1);
      seen.add(`${next.x},${next.y}`);
      previous = next;
      validateGame(game);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(game.rng).toBe(rng);
    game.player.x = previous.x - 1;
    game.player.y = previous.y;
    game.player.facing = 'right';
    game = reduceGame(game, { kind: 'tick', seconds: 10 });
    expect(worldNpcs(game).find((n) => n.id === 'routeTrainer')!.x).toBe(previous.x);
    game = reduceGame(game, { kind: 'interact' });
    expect(game.dialogue?.speaker).toBe('巡路员');
    const patrols = game.world!.patrols;
    game = reduceGame(game, { kind: 'tick', seconds: 10 });
    expect(game.world!.patrols).toEqual(patrols);
    expect(
      decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game.world,
    ).toEqual(game.world);
  });

  it('动态人物的实际位置参与碰撞；损坏或缺失的巡走记录不能导入', () => {
    const game = fixture();
    game.player.map = 'route';
    game.player.x = 13;
    game.player.y = 10;
    game.player.facing = 'up';
    game.world!.patrols['route:routeTrainer']!.index = 2;
    expect(reduceGame(game, { kind: 'walk', direction: 'up' }).player.y).toBe(10);
    expect(() => validateGame({ ...game, world: { ...game.world!, patrols: {} } })).toThrow(/巡走/);
  });

  it('无需森林任务即可通过本馆练习并取得徽章，旧的救援路线仍可保留', () => {
    const bot = playOpening('creature_004', 789);
    bot.portal('route');
    bot.npc('catchGuide');
    bot.portal('moss');
    bot.npc('shop');
    for (let i = 0; i < 4; i++) {
      bot.heal();
      bot.npc('mossTraining');
    }
    bot.heal();
    bot.act({ kind: 'buy', itemId: 'potion', quantity: 5 });
    bot.npc('gymGate');
    expect(bot.game.player.map).toBe('gym');
    expect(bot.game.progress.flags.quest).toBeUndefined();
    bot.npc('gymSwitchOne');
    bot.npc('gymScout');
    bot.npc('gymSwitchTwo');
    bot.npc('gymKeeper');
    bot.npc('leader');
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.questReward).toBeUndefined();
    bot.portal('moss');
    bot.npc('researcher');
    bot.portal('forest');
    bot.npc('clueOne');
    bot.npc('clueTwo');
    bot.npc('forestScout');
    bot.npc('forestLog');
    bot.npc('forestGuard');
    bot.npc('lostCreature');
    bot.portal('moss');
    bot.npc('researcher');
    expect(bot.game.progress.flags.questReward).toBe(true);
    expect(bot.game.progress.badges).toBe(1);
    validateGame(bot.game);
  });

  it('雾铃灵由剧情开启，逃跑后可重试，捕获后不重复开启；稀有家族不进随机遭遇', () => {
    const bot = playChapter('creature_004', 789);
    bot.portal('moss');
    bot.heal();
    bot.act({ kind: 'buy', itemId: 'great_ball', quantity: 15 });
    bot.captureBall = 'great_ball';
    bot.portal('forest');
    bot.npc('mistShrine');
    expect(bot.game.progress.flags.mistAwakened).toBeUndefined();
    bot.npc('mistClueOne');
    bot.npc('mistClueTwo');
    bot.npc('mistShrine'); // First encounter deliberately escapes, then retries.
    expect(bot.game.progress.flags.mistAwakened).toBe(true);
    expect(bot.game.progress.flags.mistCaught).toBeUndefined();
    bot.act({ kind: 'interact' });
    bot.dismiss();
    expect(bot.game.battle?.event).toBe('mistEncounter');
    bot.battle(true);
    expect(bot.game.progress.flags.mistCaught).toBe(true);
    const owned = Object.values(bot.game.creatures).filter(
      (c) => c.speciesId === 'creature_025',
    ).length;
    bot.npc('mistShrine');
    expect(bot.game.battle).toBeNull();
    expect(
      Object.values(bot.game.creatures).filter((c) => c.speciesId === 'creature_025'),
    ).toHaveLength(owned);
    for (const map of Object.values(MAPS))
      for (const encounter of [
        ...map.encounters,
        ...(map.zones ?? []).flatMap((z) => z.encounters),
      ])
        expect(isOrdinarySpecies(encounter.speciesId)).toBe(true);
    const questIds = new Set([...plan.milestones, ...plan.sidequests].map((q) => q.id));
    for (const entry of acquisition.families) {
      expect(SPECIES[entry.baseSpeciesId]?.familyId).toBe(entry.familyId);
      expect(questIds.has(entry.questId)).toBe(true);
    }
  });

  it('ch1.2 原坐标无需缩放迁移，新扩展区域以 ch1.3 保存', () => {
    const legacy = fixture();
    delete legacy.world;
    legacy.player.x = 22;
    legacy.player.y = 10;
    const old = { ...createSnapshot(legacy, testEntropy, null), contentVersion: 'ch1.2' };
    const loaded = decodeSnapshot(JSON.stringify(old)).game;
    expect(loaded.player).toEqual(legacy.player);
    const current = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    validateGame(current);
    expect(current.world).toBeDefined();
    expect(createSnapshot(current, testEntropy, old).contentVersion).toBe(CONTENT_VERSION);
  });
});
