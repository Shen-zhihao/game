import { describe, expect, it } from 'vitest';
import {
  COAST_SPRITE_CELL,
  isOrdinarySpecies,
  SPECIES,
  TIDAL_SPRITE_CELL,
} from '../src/content/catalog';
import { CITIES } from '../src/content/cities';
import { MAPS, terrainPassable } from '../src/content/world';
import { reduceGame } from '../src/game/engine';
import { COAST_STORY_ENCOUNTERS } from '../src/game/coastStory';
import { ORIGINAL_MAPS } from '../src/game/exploration';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import {
  coastReady,
  coastSidequests,
  enterCoast,
  playableCoast,
  waterChallenge,
} from './coast-helpers';
import { enterHighlands, rockChallenge, train } from './highland-helpers';
import { fixture, playOpening, testEntropy } from './helpers';

describe('潮汐章节：自由道馆、港口结案与三段浅礁旧约', () => {
  it.each([
    ['moss', 'stone', 'harbor'],
    ['moss', 'harbor', 'stone'],
    ['stone', 'moss', 'harbor'],
    ['stone', 'harbor', 'moss'],
    ['harbor', 'moss', 'stone'],
    ['harbor', 'stone', 'moss'],
  ] as const)('三馆自由顺序 %s → %s → %s，无区域剧情前置', (...order) => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    bot.hunt('creature_040');
    enterHighlands(bot);
    const grass = bot.game.party[0]!;
    train(bot, grass, 20);
    const travel = (destination: typeof bot.game.player.map) => {
      const queue = [[bot.game.player.map]],
        visited = new Set([bot.game.player.map]);
      while (queue.length) {
        const route = queue.shift()!,
          current = route.at(-1)!;
        if (current === destination) {
          for (const map of route.slice(1)) bot.portal(map);
          return;
        }
        for (const portal of MAPS[current].portals)
          if (!visited.has(portal.map)) {
            visited.add(portal.map);
            queue.push([...route, portal.map]);
          }
      }
      throw new Error('Missing mainland route');
    };
    for (const [index, town] of order.entries()) {
      travel(town);
      bot.heal();
      bot.act({ kind: 'lead', creatureId: grass });
      if (town === 'moss') {
        for (const npc of [
          'gymGate',
          'gymSwitchOne',
          'gymScout',
          'gymSwitchTwo',
          'gymKeeper',
          'leader',
        ])
          bot.npc(npc);
      } else if (town === 'stone') rockChallenge(bot);
      else waterChallenge(bot);
      expect(bot.game.progress.badges).toBe(index + 1);
      bot.portal(town);
    }
    expect(
      bot.game.progress.flags.questReward ||
        bot.game.progress.flags.mineQuest ||
        bot.game.progress.flags.harborQuest,
    ).toBeFalsy();
  });

  it('无徽章、无森林报告、无渡水也能抵达港口与全部陆上维修点，水系馆可先打', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    bot.hunt('creature_040');
    enterHighlands(bot);
    train(bot, bot.game.party[0]!, 14);
    enterCoast(bot);
    bot.npc('harborMaster');
    expect(bot.game.progress.flags.harborQuest).not.toBe(true);
    bot.portal('tideworks');
    for (const [x, y] of [
      [8, 6],
      [19, 6],
      [34, 16],
      [33, 24],
    ])
      bot.go(x!, y!);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.waterRig).not.toBe(true);
    expect(bot.game.progress.flags.questReward).not.toBe(true);
    expect(terrainPassable('tideworks', 27, 24, bot.game.progress.flags)).toBe(false);
    bot.go(25, 24);
    bot.act({ kind: 'walk', direction: 'right' });
    expect(bot.game.player.x).toBe(25);
    expect(bot.game.notice).toContain('北侧');
    bot.portal('harbor');
    bot.heal();
    waterChallenge(bot);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.leader || bot.game.progress.flags.rockLeader).toBeFalsy();
    expect(bot.game.progress.flags.waterRig).toBe(true);
    expect(terrainPassable('tideworks', 27, 24, bot.game.progress.flags)).toBe(true);
    const money = bot.game.player.money;
    const items = { ...bot.game.inventory };
    bot.npc('waterLeader');
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(items);
    bot.portal('harbor');
    bot.portal('tideworks');
    bot.go(25, 24);
    for (let step = 0; step < 4; step++) bot.act({ kind: 'walk', direction: 'right' });
    expect([bot.game.player.x, bot.game.player.y]).toEqual([29, 24]);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    bot.portal('harbor');
    bot.portal('coastRoute');
    bot.portal('stone');
    bot.heal();
    rockChallenge(bot);
    expect(bot.game.progress.badges).toBe(2);
  });

  it('三枚不同徽章与完整港口调查可通关，机关不绕过，往返与存档都可继续', () => {
    const bot = playableCoast();
    const f = bot.game.progress.flags;
    expect(bot.game.progress.badges).toBe(3);
    expect(bot.game.progress.chapter).toBe(4);
    for (const flag of [
      'mineReport',
      'harborQuest',
      'cargoManifest',
      'sluiceGauge',
      'tideGuard',
      'sluiceRepaired',
      'harborReport',
      'waterLeader',
      'waterRig',
      'bottleDelivered',
      'reefRestored',
      'lighthouseRepaired',
    ])
      expect(f[flag], flag).toBe(true);
    const saved = createSnapshot(bot.game, testEntropy, null);
    bot.game = decodeSnapshot(JSON.stringify(saved)).game;
    expect(bot.game.player.healMap).toBe('harbor');
    const money = bot.game.player.money,
      inventory = { ...bot.game.inventory };
    bot.npc('harborMaster');
    bot.npc('postkeeper');
    bot.portal('tideworks');
    bot.npc('oldLighthouse');
    bot.npc('reefCleanup');
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(inventory);
    bot.portal('harbor');
    bot.portal('coastRoute');
    bot.portal('stone');
    expect(bot.game.progress.badges).toBe(3);
  });

  it('货运调查要求矿山报告及两份证据，控制台不能提前结算；不依赖灯塔或捕获', () => {
    const bot = coastReady();
    bot.portal('tideworks');
    bot.npc('sluiceConsole');
    bot.npc('tideGuard');
    expect(bot.game.progress.flags.sluiceRepaired || bot.game.progress.flags.tideGuard).toBeFalsy();
    bot.portal('harbor');
    bot.npc('harborMaster');
    bot.npc('cargoManifest');
    bot.portal('tideworks');
    bot.npc('tideGuard');
    expect(bot.game.progress.flags.tideGuard).not.toBe(true);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    bot.npc('sluiceGauge');
    bot.npc('tideGuard');
    bot.npc('sluiceConsole');
    bot.portal('harbor');
    const money = bot.game.player.money;
    bot.npc('harborMaster');
    expect(bot.game.player.money).toBe(money + 800);
    expect(bot.game.progress.flags.harborReport).toBe(true);
    expect(
      bot.game.progress.flags.lighthouseRepaired || bot.game.progress.flags.coralCaught,
    ).toBeFalsy();
  });

  it('三条居民支线无徽章也可完成，未核对家书、不收镜片或少观察点不会跳步', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    enterHighlands(bot);
    enterCoast(bot);
    bot.npc('postkeeper');
    expect(bot.game.progress.flags.bottleDelivered).not.toBe(true);
    bot.portal('tideworks');
    bot.npc('oldLighthouse');
    bot.npc('lensCase');
    bot.npc('reefCleanup');
    expect(
      bot.game.progress.flags.lighthouseLens || bot.game.progress.flags.reefRestored,
    ).toBeFalsy();
    bot.portal('harbor');
    coastSidequests(bot);
    for (const flag of ['bottleDelivered', 'reefRestored', 'lighthouseRepaired'])
      expect(bot.game.progress.flags[flag]).toBe(true);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.harborQuest).not.toBe(true);
  });

  it('三个稀有相遇有剧情门槛；逃跑后可存读重试，捕获后不重复生成', () => {
    const bot = coastReady();
    bot.portal('tideworks');
    for (const npc of ['coralFriend', 'islandFriend', 'tideShell']) bot.npc(npc);
    expect(
      bot.game.progress.flags.coralAwakened ||
        bot.game.progress.flags.islandAwakened ||
        bot.game.progress.flags.tideAwakened,
    ).toBeFalsy();
    bot.portal('harbor');
    coastSidequests(bot);
    bot.npc('coralFriend');
    expect(bot.game.progress.flags.coralAwakened).toBe(true);
    expect(bot.game.progress.flags.coralCaught).not.toBe(true);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    bot.portal('harbor');
    bot.heal();
    bot.act({
      kind: 'buy',
      itemId: 'ball',
      quantity: Math.min(70, Math.floor(bot.game.player.money / 100)),
    });
    for (const npc of ['coralFriend', 'islandFriend', 'tideShell']) {
      bot.portal('tideworks');
      bot.npc(npc, true);
      bot.portal('harbor');
      bot.heal();
    }
    for (const e of Object.values(COAST_STORY_ENCOUNTERS))
      expect(bot.game.progress.flags[e.caught], e.name).toBe(true);
    const owned = Object.keys(bot.game.creatures).length;
    bot.portal('tideworks');
    for (const npc of ['coralFriend', 'islandFriend', 'tideShell']) bot.npc(npc, true);
    expect(Object.keys(bot.game.creatures)).toHaveLength(owned);
    validateGame(bot.game);
  });

  it('旧 ch2.3 探索只补建海岸区域，不重刷旧发现、能力点、永久技能册或战斗随机数', () => {
    const game = fixture();
    const previousMaps = [...ORIGINAL_MAPS, 'stoneRoute', 'stone', 'mine', 'rockGym'];
    game.world!.generatedMaps = previousMaps as typeof ORIGINAL_MAPS;
    game.world!.patrols = Object.fromEntries(
      Object.entries(game.world!.patrols).filter(([key]) =>
        previousMaps.includes(key.split(':')[0]!),
      ),
    );
    game.world!.finds = Object.fromEntries(
      Object.entries(game.world!.finds).filter(([, f]) => previousMaps.includes(f.map)),
    );
    const snapshot = createSnapshot(game, testEntropy, null);
    snapshot.contentVersion = 'ch2.3';
    const updated = reduceGame(decodeSnapshot(JSON.stringify(snapshot)).game, {
      kind: 'tick',
      seconds: 1,
    });
    expect(updated.creatures).toEqual(game.creatures);
    expect(updated.rng).toBe(game.rng);
    for (const [id, f] of Object.entries(game.world!.finds))
      expect(updated.world!.finds[id]).toEqual(f);
    expect(updated.world!.generatedMaps).toHaveLength(Object.keys(MAPS).length);
    const next = reduceGame(updated, { kind: 'tick', seconds: 1 });
    expect(next.world!.finds).toEqual(updated.world!.finds);
    validateGame(next);
  });

  it('伪造海岸剧情、徽章、工具与稀有捕获会被严格拒绝', () => {
    for (const flag of [
      'waterLeader',
      'waterRig',
      'waterScout',
      'waterSwitchTwo',
      'waterKeeper',
      'harborQuest',
      'cargoManifest',
      'sluiceGauge',
      'tideGuard',
      'sluiceRepaired',
      'harborReport',
      'bottleDate',
      'bottleDelivered',
      'lighthouseLens',
      'lighthouseRepaired',
      'reefRestored',
      'coralAwakened',
      'coralCaught',
      'islandAwakened',
      'islandCaught',
      'tideAwakened',
      'tideCaught',
    ]) {
      const game = fixture();
      game.progress.flags[flag] = true;
      expect(() => validateGame(game), flag).toThrow();
    }
  });

  it('海岸遭遇、训练师与全部进化形态具备独立精灵画面，四城服务不出售剧情精灵', () => {
    for (const map of [MAPS.coastRoute, MAPS.tideworks])
      for (const e of map.encounters) {
        expect(isOrdinarySpecies(e.speciesId)).toBe(true);
        const family = SPECIES[e.speciesId]!.familyId;
        for (const s of Object.values(SPECIES).filter((s) => s.familyId === family))
          expect(COAST_SPRITE_CELL[s.id] ?? TIDAL_SPRITE_CELL[s.id]).toBeDefined();
      }
    const harbor = CITIES.find((c) => c.map === 'harbor')!;
    expect(harbor.quests).toHaveLength(3);
    expect(harbor.stock).toContain('skill_copy');
    expect(harbor.stock).toContain('tide_pearl');
  });
});
