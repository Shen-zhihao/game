import { describe, expect, it } from 'vitest';
import { ADVENTURE_ENCOUNTERS } from '../src/content/adventure';
import { ALL_SPECIES, spriteFor } from '../src/content/catalog';
import { MAPS, npcVisible } from '../src/content/world';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { playOpening, testEntropy } from './helpers';
import { playableStar, regionalChallenge, trainVolt, travel } from './adventure-helpers';

describe('星岚主线收尾与八馆自由巡礼', () => {
  it('综合馆可在零徽章首战，九城纪念不要求任何区域主线', () => {
    const bot = playOpening('creature_004', 935);
    bot.portal('route');
    bot.npc('catchGuide');
    for (const town of [
      'dawn',
      'moss',
      'stone',
      'harbor',
      'volt',
      'wind',
      'furnace',
      'lake',
      'star',
    ] as const) {
      travel(bot, town);
      bot.heal();
    }
    bot.npc('starCoordinator');
    expect(bot.game.progress.flags.coreQuest).not.toBe(true);
    bot.npc('photoKeeper');
    expect(bot.game.progress.flags.pilgrimagePhoto).toBe(true);
    travel(bot, 'ancientTemple');
    bot.npc('balanceGuardian');
    expect(bot.game.progress.flags.encounter249Awakened).not.toBe(true);
    trainVolt(bot, 20);
    regionalChallenge(bot, 8);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.coordinationManual).toBe(true);
    expect(
      bot.game.progress.flags.lakeRecords || bot.game.progress.flags.coreStabilized,
    ).toBeFalsy();
  });
  it('两侧支路、首席对战、归流与主锁完整收尾，八枚徽章与双份大师球账本可恢复', () => {
    const bot = playableStar();
    expect(bot.game.progress.badges).toBe(8);
    expect(bot.game.progress.chapter).toBe(9);
    for (const flag of [
      'coreCommander',
      'coreReturn',
      'coreStabilized',
      'starReport',
      'starLeader',
      'coordinationManual',
      'pilgrimagePhoto',
      'templeRestored',
      'ancientPactReward',
      'rivalStar',
    ])
      expect(bot.game.progress.flags[flag], flag).toBe(true);
    expect(bot.game.progress.flags.champion).not.toBe(true);
    expect(bot.game.dex.caught).not.toContain('creature_249');
    expect(bot.game.dex.caught).not.toContain('creature_250');
    expect(bot.game.masterBalls!.claimed).toEqual(['harbor_report', 'ancient_pact']);
    expect(bot.game.inventory.master_ball).toBe(2);
    const echo = MAPS.starCore.npcs.find((n) => n.id === 'coreDragonEcho')!;
    expect(npcVisible(bot.game, echo)).toBe(false);
    const inventory = { ...bot.game.inventory },
      money = bot.game.player.money;
    bot.npc('starCoordinator');
    bot.npc('photoKeeper');
    travel(bot, 'starRoute');
    bot.npc('pactCaretaker');
    expect(bot.game.player.money).toBe(money);
    expect(bot.game.inventory).toEqual(inventory);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    expect(bot.game.progress.flags.returnFlowCalibrator).toBe(true);
    expect(bot.game.progress.flags.starReport).toBe(true);
    const bad = structuredClone(bot.game);
    bad.progress.flags.coreReturn = false;
    expect(() => validateGame(bad)).toThrow(/前置/);
    travel(bot, 'nightHall');
    for (const id of ['nightCold', 'nightFlame', 'nightBalance']) bot.npc(id);
    expect(bot.game.progress.flags.nightEchoes).not.toBe(true);
    expect(ADVENTURE_ENCOUNTERS.encounter_249!.requires).toContain('champion');
    expect(ADVENTURE_ENCOUNTERS.encounter_250!.requires).toContain('coreStabilized');
  });
  it('全部250种已有独立正面图集格，不再为进化形态共用或缺省占位', () => {
    const cells = new Set<string>();
    for (const s of ALL_SPECIES) {
      const p = spriteFor(s.id);
      expect(p, s.name).not.toBeNull();
      expect(p!.cell).toBeGreaterThanOrEqual(0);
      expect(p!.cell).toBeLessThan(16);
      cells.add(`${p!.atlas}:${p!.cell}`);
    }
    expect(cells.size).toBe(250);
  });
});
