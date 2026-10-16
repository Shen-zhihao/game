import { describe, expect, it } from 'vitest';
import { ADVENTURE_ENCOUNTERS } from '../src/content/adventure';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { playOpening, testEntropy } from './helpers';
import {
  lakeSidequests,
  playableFurnace,
  playableLake,
  regionalChallenge,
  trainVolt,
  travel,
} from './adventure-helpers';

describe('镜心篇与可重置的双衡镜阵', () => {
  it('遗庭支线与道馆在零徽章开放，不强制主线校准件或稀有捕获', () => {
    const bot = playOpening('creature_001', 902);
    bot.portal('route');
    bot.npc('catchGuide');
    travel(bot, 'lake');
    bot.heal();
    bot.npc('lakeArchivist');
    expect(bot.game.progress.flags.lakeQuest).not.toBe(true);
    lakeSidequests(bot);
    for (const flag of ['memoryRecovered', 'rubbingRecovered', 'mirrorTracks'])
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.ruinKey).not.toBe(true);
    trainVolt(bot, 18);
    regionalChallenge(bot, 7);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.ruinKey).toBe(true);
    expect(bot.game.progress.flags.returnFlowCalibrator).not.toBe(true);
  });
  it('镜阵错序安全重置，可中途冷读取，主线校准件不消耗', () => {
    const bot = playableFurnace();
    travel(bot, 'lake');
    bot.heal();
    bot.npc('lakeArchivist');
    travel(bot, 'mirrorArchive');
    bot.npc('lakeArchiveOne');
    bot.npc('lakeArchiveTwo');
    travel(bot, 'mirrorRuins');
    bot.npc('mirrorEast');
    expect(bot.game.progress.flags.mirrorEast).not.toBe(true);
    bot.npc('mirrorNorth');
    bot.npc('mirrorWest');
    expect(bot.game.progress.flags.mirrorNorth).toBe(false);
    bot.npc('mirrorNorth');
    bot.npc('mirrorEast');
    bot.npc('mirrorNorth');
    expect(bot.game.progress.flags.mirrorEast).toBe(false);
    bot.npc('mirrorNorth');
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    bot.npc('mirrorEast');
    bot.npc('mirrorWest');
    expect(bot.game.progress.flags.mirrorAligned).toBe(true);
    bot.npc('mirrorNorth');
    expect(bot.game.progress.flags.mirrorAligned).toBe(true);
    expect(bot.game.progress.flags.returnFlowCalibrator).toBe(true);
    const bad = structuredClone(bot.game);
    bad.progress.flags.mirrorEast = false;
    expect(() => validateGame(bad)).toThrow(/前置/);
  });
  it('公开记录→镜阵→封档员→复原台→档案结案，七枚徽章保存后奖励不重复', () => {
    const bot = playableLake();
    expect(bot.game.progress.badges).toBe(7);
    for (const flag of [
      'mirrorGuard',
      'mirrorRestored',
      'lakeRecords',
      'psychicLeader',
      'ruinKey',
      'rivalLake',
      'returnFlowCalibrator',
    ])
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    const money = bot.game.player.money,
      items = { ...bot.game.inventory };
    for (const id of ['lakeArchivist', 'memoryPainter', 'rubbingScholar', 'mirrorKeeper'])
      bot.npc(id);
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(items);
    for (const id of [141, 144, 147, 149, 150, 238, 241, 247])
      expect(ADVENTURE_ENCOUNTERS[`encounter_${id}`]!.requires).toEqual(['rubbingRecovered']);
    expect(ADVENTURE_ENCOUNTERS.encounter_244!.requires).toEqual(['mirrorTracks']);
  });
});
