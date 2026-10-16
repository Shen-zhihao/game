import { describe, expect, it } from 'vitest';
import { MAPS, terrainPassable } from '../src/content/world';
import { ADVENTURE_ENCOUNTERS } from '../src/content/adventure';
import { decodeSnapshot, createSnapshot, validateGame } from '../src/persistence/snapshot';
import { playOpening, testEntropy } from './helpers';
import {
  playableElectric,
  playableWind,
  regionalChallenge,
  trainVolt,
  travel,
  windSidequests,
} from './adventure-helpers';

describe('流羽篇、迁徙旧约与自由山路', () => {
  it('零徽章直达全部山路与支线，调查只限制自己的后续，飞行馆可首战', () => {
    const bot = playOpening('creature_004', 819);
    bot.portal('route');
    bot.npc('catchGuide');
    travel(bot, 'wind');
    bot.npc('windScientist');
    expect(bot.game.progress.flags.windQuest).not.toBe(true);
    windSidequests(bot);
    expect(bot.game.progress.badges).toBe(0);
    expect(
      bot.game.progress.flags.kiteReturned &&
        bot.game.progress.flags.migrationRecovered &&
        bot.game.progress.flags.pactRecovered,
    ).toBe(true);
    for (const id of ['windRoute', 'windSanctuary'] as const) {
      expect(MAPS[id].rows.length).toBe(34);
      expect(terrainPassable(id, 1, 22, bot.game.progress.flags)).toBe(true);
    }
    trainVolt(bot, 18);
    regionalChallenge(bot, 5);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.glider).toBe(true);
    expect(bot.game.progress.flags.powerReport || bot.game.progress.flags.windReport).toBeFalsy();
  });
  it('风向双证据、解除锁定、主线报告与第五枚徽章完整持久化，奖励不重复', () => {
    const bot = playableWind();
    expect(bot.game.progress.badges).toBe(5);
    for (const f of [
      'windReport',
      'windBalanced',
      'windGuard',
      'windLeader',
      'glider',
      'rivalWind',
      'migrationRecovered',
      'kiteReturned',
      'pactRecovered',
    ])
      expect(bot.game.progress.flags[f], f).toBe(true);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    const money = bot.game.player.money,
      items = { ...bot.game.inventory };
    for (const id of ['windScientist', 'kiteChild', 'migrationKeeper', 'pactKeeper']) bot.npc(id);
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(items);
    const corrupt = structuredClone(bot.game);
    corrupt.progress.flags.windClueOne = false;
    expect(() => validateGame(corrupt)).toThrow(/前置/);
  });
  it('三种稀有只在迁徙支线后开启，逃跑可重试，捕获后不再生成', () => {
    const bot = playableElectric();
    travel(bot, 'windSanctuary');
    bot.npc('thunderRoc');
    expect(bot.game.progress.flags.encounter115Awakened).not.toBe(true);
    windSidequests(bot);
    trainVolt(bot, 34);
    bot.captureBall = 'master_ball';
    travel(bot, 'windSanctuary');
    bot.npc('cloudFairy');
    expect(bot.game.progress.flags.encounter116Awakened).toBe(true);
    expect(bot.game.progress.flags.encounter116Caught).not.toBe(true);
    bot.npc('cloudFairy', true);
    expect(bot.game.progress.flags.encounter116Caught).toBe(true);
    const count = Object.keys(bot.game.creatures).length;
    bot.npc('cloudFairy', true);
    expect(Object.keys(bot.game.creatures)).toHaveLength(count);
    for (const id of ['encounter_115', 'encounter_116', 'encounter_214'] as const)
      expect(ADVENTURE_ENCOUNTERS[id]!.requires).toEqual(['migrationRecovered']);
    validateGame(bot.game);
  });
});
