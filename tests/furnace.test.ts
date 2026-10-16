import { describe, expect, it } from 'vitest';
import { MAPS, terrainPassable } from '../src/content/world';
import { ADVENTURE_ENCOUNTERS } from '../src/content/adventure';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { playOpening, testEntropy } from './helpers';
import {
  furnaceSidequests,
  playableFurnace,
  regionalChallenge,
  trainVolt,
  travel,
} from './adventure-helpers';

describe('炉心篇与不可丢弃的校准件', () => {
  it('零徽章可从石脊或风栖走冷却环路，完成三支线并首战炉心馆', () => {
    const bot = playOpening('creature_007', 845);
    bot.portal('route');
    bot.npc('catchGuide');
    travel(bot, 'furnace');
    bot.heal();
    bot.npc('furnaceForeman');
    expect(bot.game.progress.flags.furnaceQuest).not.toBe(true);
    furnaceSidequests(bot);
    for (const flag of ['toolReward', 'springReward', 'foremanTestimony'])
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.heatSuit).not.toBe(true);
    expect(terrainPassable('furnaceRoute', 20, 12, bot.game.progress.flags)).toBe(false);
    trainVolt(bot, 18);
    regionalChallenge(bot, 6);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.heatSuit).toBe(true);
  });
  it('矿石运输链在熔炉记录中闭合，停炉后固定获得校准件，六馆档可冷读取', () => {
    const bot = playableFurnace();
    expect(bot.game.progress.badges).toBe(6);
    for (const flag of [
      'furnaceReport',
      'furnaceShutdown',
      'returnFlowCalibrator',
      'foundryCrate',
      'foundryPressure',
      'foundryGuard',
      'rivalFurnace',
    ])
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    const inventory = { ...bot.game.inventory },
      money = bot.game.player.money;
    bot.npc('furnaceForeman');
    bot.npc('toolMaker');
    bot.npc('springKeeper');
    bot.npc('oldForeman');
    expect(bot.game.inventory).toEqual(inventory);
    expect(bot.game.player.money).toBe(money);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    expect(bot.game.progress.flags.returnFlowCalibrator).toBe(true);
    expect(bot.game.masterBalls!.claimed).toEqual(['harbor_report']);
    const bad = structuredClone(bot.game);
    bad.progress.flags.foundryGuard = false;
    expect(() => validateGame(bad)).toThrow(/前置/);
    travel(bot, 'furnace');
    bot.heal();
    expect(bot.game.player.healMap).toBe('furnace');
  });
  it('温泉稀有相遇不依赖主线、现实天气或隔热工具，公共桥均可达', () => {
    for (const id of ['encounter_127', 'encounter_128', 'encounter_225'] as const)
      expect(ADVENTURE_ENCOUNTERS[id]!.requires).toEqual(['springRestored']);
    for (const map of ['furnaceRoute', 'furnace', 'foundry', 'hotSprings', 'fireGym'] as const)
      for (const p of MAPS[map].portals)
        expect(terrainPassable(p.map, p.toX, p.toY, {}), `${map}->${p.map}`).toBe(true);
  });
});
