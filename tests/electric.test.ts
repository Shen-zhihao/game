import { describe, expect, it } from 'vitest';
import { MAPS, terrainPassable } from '../src/content/world';
import {
  ADVENTURE_CHAPTERS,
  ADVENTURE_GYMS,
  ADVENTURE_PREREQUISITES,
} from '../src/content/adventure';
import { ELECTRIC_SPRITE_CELL, isOrdinarySpecies } from '../src/content/catalog';
import { CITIES } from '../src/content/cities';
import { HABITAT_SITES } from '../src/content/habitats';
import { reduceGame } from '../src/game/engine';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { playOpening, testEntropy } from './helpers';
import { enterHighlands } from './highland-helpers';
import { enterCoast } from './coast-helpers';
import {
  electricSidequests,
  playableElectric,
  regionalChallenge,
  trainVolt,
  travel,
} from './adventure-helpers';

describe('雷鸣市章节与独立霆光道馆', () => {
  it('无徽章与区域调查可自由抵达电站、三条支线并首战霆光馆', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    enterHighlands(bot);
    enterCoast(bot);
    travel(bot, 'volt');
    trainVolt(bot, 16);
    bot.npc('powerEngineer');
    expect(bot.game.progress.flags.powerQuest).not.toBe(true);
    travel(bot, 'powerStation');
    bot.npc('powerConsole');
    expect(bot.game.progress.flags.powerRestored).not.toBe(true);
    electricSidequests(bot);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.harborReport).not.toBe(true);
    expect(
      bot.game.progress.flags.lostReturned &&
        bot.game.progress.flags.shiftRecovered &&
        bot.game.progress.flags.gardenRestored,
    ).toBe(true);
    expect(terrainPassable('electricGym', 14, 14, bot.game.progress.flags)).toBe(false);
    regionalChallenge(bot, 4);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.powerPass).toBe(true);
    const coins = bot.game.player.money,
      inventory = { ...bot.game.inventory };
    bot.npc('electricGymGate');
    bot.npc('electricLeader');
    bot.portal('volt');
    expect(bot.game.player.money).toBe(coins);
    expect(bot.game.inventory).toEqual(inventory);
    expect(
      bot.game.progress.flags.questReward ||
        bot.game.progress.flags.harborReport ||
        bot.game.progress.flags.powerReport,
    ).toBeFalsy();
  });
  it('港口运单→双证据→停机→报告，第四枚徽章与支线结案都能保存继续', () => {
    const bot = playableElectric(),
      flags = bot.game.progress.flags;
    for (const id of [
      'powerQuest',
      'powerClueOne',
      'powerClueTwo',
      'powerGuard',
      'powerRestored',
      'powerReport',
      'electricLeader',
      'powerPass',
      'rivalPower',
      'lostReturned',
      'shiftRecovered',
      'gardenRestored',
    ])
      expect(flags[id], id).toBe(true);
    expect(bot.game.progress.badges).toBe(4);
    expect(bot.game.progress.chapter).toBe(5);
    const saved = createSnapshot(bot.game, testEntropy, null);
    bot.game = decodeSnapshot(JSON.stringify(saved)).game;
    const inventory = { ...bot.game.inventory },
      coins = bot.game.player.money;
    bot.npc('powerEngineer');
    bot.npc('lostClerk');
    bot.npc('shiftClerk');
    bot.npc('gardenBed');
    expect(bot.game.inventory).toEqual(inventory);
    expect(bot.game.player.money).toBe(coins);
    expect(bot.game.masterBalls!.claimed).toEqual(['harbor_report']);
    const bad = structuredClone(bot.game);
    bad.progress.flags.powerClueOne = false;
    expect(() => validateGame(bad)).toThrow(/前置/);
    travel(bot, 'harbor');
    bot.heal();
    travel(bot, 'volt');
    bot.heal();
    expect(bot.game.player.healMap).toBe('volt');
  });
  it('章节地图完整、自由路线双向、精灵生态与图集有效，旧档只补建新图', () => {
    const chapter = ADVENTURE_CHAPTERS.find((c) => c.number === 4)!;
    expect(chapter.maps).toHaveLength(4);
    expect(CITIES.find((c) => c.map === 'volt')!.implemented).toBe(true);
    for (const map of chapter.maps) {
      for (const portal of map.portals)
        expect(terrainPassable(portal.map, portal.toX, portal.toY, {})).toBe(true);
      for (const encounter of map.encounters) {
        expect(isOrdinarySpecies(encounter.speciesId)).toBe(true);
        expect(ELECTRIC_SPRITE_CELL[encounter.speciesId]).toBeDefined();
      }
    }
    expect(HABITAT_SITES.find((s) => s.id === 'city_power')!.map).toBe('powerRoute');
    for (const gym of ADVENTURE_GYMS)
      expect(ADVENTURE_PREREQUISITES[gym.switches[0]]).toEqual(['rival', 'catchTutorial']);
    const bot = playOpening('creature_001');
    const old = structuredClone(bot.game);
    const newIds = chapter.maps.map((m) => m.id);
    old.world!.generatedMaps = old.world!.generatedMaps!.filter((id) => !newIds.includes(id));
    for (const [id, find] of Object.entries(old.world!.finds))
      if (newIds.includes(find.map)) delete old.world!.finds[id];
    for (const id of Object.keys(old.world!.patrols))
      if (newIds.some((map) => id.startsWith(map + ':'))) delete old.world!.patrols[id];
    const next = reduceGame(old, { kind: 'tick', seconds: 0 });
    validateGame(next);
    expect(next.world!.generatedMaps).toHaveLength(Object.keys(MAPS).length);
    expect(next.creatures).toEqual(old.creatures);
    expect(next.rng).toBe(old.rng);
    for (const [id, find] of Object.entries(old.world!.finds))
      expect(next.world!.finds[id]).toEqual(find);
  });
});
