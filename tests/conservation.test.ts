import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, STARTERS, isOrdinarySpecies } from '../src/content/catalog';
import { SPECIES_HABITATS } from '../src/content/habitats';
import { ADVENTURE_ENCOUNTERS } from '../src/content/adventure';
import { CONSERVATION_CLOSURES } from '../src/content/conservation';
import { MAPS, objective } from '../src/content/world';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { makeCreature } from '../src/game/rules';
import { PlayerBot, testEntropy, playOpening } from './helpers';
import { playablePostgame, travel } from './adventure-helpers';

let cached: PlayerBot | undefined;
const completed = () => {
  cached ??= playablePostgame();
  const b = new PlayerBot('creature_001', 1);
  b.game = structuredClone(cached.game);
  return b;
};
describe('通关后保育、全部旧约与250种获取路径', () => {
  it('零徽章可沿普通陆路抵达四生境并完成环境记录，不依赖冲浪或其他工具', () => {
    const bot = playOpening('creature_001', 975);
    bot.portal('route');
    bot.npc('catchGuide');
    travel(bot, 'dawn');
    bot.npc('professor');
    for (const [map, npc] of [
      ['deepwood', 'woodNote'],
      ['echoMeadow', 'meadowNote'],
      ['mineDepths', 'mineWater'],
      ['kelpCove', 'shoreNote'],
    ] as const) {
      travel(bot, map);
      bot.npc(npc);
    }
    travel(bot, 'dawn');
    bot.npc('professor');
    expect(bot.game.progress.flags.bookReport).toBe(true);
    expect(bot.game.progress.badges).toBe(0);
    expect(
      bot.game.progress.flags.waterRig ||
        bot.game.progress.flags.lighthouseRepaired ||
        bot.game.progress.flags.champion,
    ).toBeFalsy();
  });
  it('旧支线、观察册、保育伙伴、四生态研究和限量三球均可完整结案', () => {
    const bot = completed();
    for (const flag of CONSERVATION_CLOSURES)
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    expect(bot.game.progress.flags.postgameComplete).toBe(true);
    expect(STARTERS.every((id) => bot.game.dex.caught.includes(id))).toBe(true);
    expect(bot.game.masterBalls!.claimed).toEqual([
      'harbor_report',
      'ancient_pact',
      'league_research',
    ]);
    expect(bot.game.inventory.master_ball).toBe(3);
    const owned = Object.keys(bot.game.creatures).length,
      money = bot.game.player.money,
      items = { ...bot.game.inventory };
    bot.npc('professor');
    bot.npc('professor');
    expect(Object.keys(bot.game.creatures)).toHaveLength(owned);
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(items);
    expect(
      decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game,
    ).toEqual(bot.game);
  }, 60000); // Runs the entire journey and validates every command, including on busy build hosts.
  it('通关后的地图提示反映结案状态，同时保留联盟场内的连战指引', () => {
    const flags = { rival: true, catchTutorial: true, journeyComplete: true };
    expect(objective(flags, 8, 'star')).toContain('完整旅程已完成');
    expect(objective({ ...flags, postgameComplete: true }, 8, 'star')).toContain(
      '居民故事已全部结案',
    );
    expect(objective({ ...flags, postgameComplete: true }, 8, 'leagueHall')).toContain('冰之精英');
    expect(objective({ rival: true, catchTutorial: true, starReport: true }, 8, 'star')).toContain(
      '冠军路',
    );
  });
  it('两位神兽先完成自己的故事；逃跑可重试，大师球捕获后不再生成，三球账本保留', () => {
    const bot = completed();
    travel(bot, 'ancientTemple');
    bot.npc('balanceGuardian');
    expect(bot.game.progress.flags.encounter249Awakened).toBe(true);
    expect(bot.game.progress.flags.encounter249Caught).not.toBe(true);
    bot.captureBall = 'master_ball';
    bot.npc('balanceGuardian', true);
    expect(bot.game.progress.flags.encounter249Caught).toBe(true);
    travel(bot, 'nightHall');
    bot.npc('nightDragon', true);
    expect(bot.game.progress.flags.encounter250Caught).toBe(true);
    expect(bot.game.masterBalls!.used).toBe(2);
    expect(bot.game.inventory.master_ball).toBe(1);
    const count = Object.keys(bot.game.creatures).length;
    bot.npc('nightDragon', true);
    travel(bot, 'ancientTemple');
    bot.npc('balanceGuardian', true);
    expect(Object.keys(bot.game.creatures)).toHaveLength(count);
    const cold = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    expect(cold.masterBalls).toEqual(bot.game.masterBalls);
    const bad = structuredClone(cold);
    bad.progress.flags.nightEchoes = false;
    expect(() => validateGame(bad)).toThrow(/前置/);
  });
  it('所有普通家族均有实际生态池，全部剧情家族有地图与事件，进化可在同档完成', () => {
    for (const s of ALL_SPECIES) {
      expect(SPECIES_HABITATS[s.id]!.obtainableNow, s.name).toBe(true);
      if (!s.evolvesFromId && !isOrdinarySpecies(s.id) && !STARTERS.includes(s.id)) {
        const pair = Object.entries(ADVENTURE_ENCOUNTERS).find(([, e]) => e!.speciesId === s.id);
        if (
          ['creature_025', 'creature_077', 'creature_097', 'creature_098', 'creature_099'].includes(
            s.id,
          )
        )
          continue;
        expect(pair, s.name).toBeDefined();
        expect(Object.values(MAPS).some((m) => m.npcs.some((n) => n.event === pair![0]))).toBe(
          true,
        );
      }
    }
    const bot = completed();
    expect(Object.keys(bot.game.world!.finds).length).toBeLessThanOrEqual(128);
    expect(bot.game.world!.generatedMaps).toHaveLength(Object.keys(MAPS).length);
  });
  it('四件工具只开自愿捷径，普通路仍可走，跳转落点与存档有效', () => {
    const bot = completed();
    for (const [map, id, x, y] of [
      ['deepwood', 'woodLift', 32, 27],
      ['echoMeadow', 'meadowGlide', 35, 26],
      ['mineDepths', 'heatCart', 35, 26],
      ['kelpCove', 'ruinPassage', 39, 5],
    ] as const) {
      travel(bot, map);
      bot.npc(id);
      expect(bot.game.player.x).toBe(x);
      expect(bot.game.player.y).toBe(y);
      validateGame(bot.game);
    }
  });
  it('满仓不会部分赠予；城镇放生只移除仓库个体，图鉴和冠军名录保留', () => {
    const bot = completed();
    travel(bot, 'dawn');
    const first = structuredClone(bot.game.league!.firstTeam);
    while (bot.game.party.length < 6) {
      const c = makeCreature(bot.game, 'creature_037', 5);
      bot.game.creatures[c.id] = c;
      bot.game.party.push(c.id);
    }
    while (bot.game.box.length < 359) {
      const c = makeCreature(bot.game, 'creature_037', 5);
      bot.game.creatures[c.id] = c;
      bot.game.box.push(c.id);
    }
    bot.game.progress.flags.nurseryGift = false;
    bot.game.progress.flags.postgameComplete = false;
    validateGame(bot.game);
    const before = Object.keys(bot.game.creatures).length;
    bot.npc('professor');
    expect(Object.keys(bot.game.creatures)).toHaveLength(before);
    expect(bot.game.progress.flags.nurseryGift).toBe(false);
    const remove = bot.game.box[0]!,
      speciesId = bot.game.creatures[remove]!.speciesId;
    bot.act({ kind: 'release', creatureId: bot.game.party[0]! });
    expect(Object.keys(bot.game.creatures)).toHaveLength(before);
    bot.act({ kind: 'release', creatureId: remove });
    expect(bot.game.creatures[remove]).toBeUndefined();
    expect(bot.game.dex.caught).toContain(speciesId);
    expect(bot.game.league!.firstTeam).toEqual(first);
    bot.npc('professor');
    expect(bot.game.progress.flags.nurseryGift).toBe(true);
    expect(Object.keys(bot.game.creatures)).toHaveLength(before + 1);
    validateGame(bot.game);
  });
});
