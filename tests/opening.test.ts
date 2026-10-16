import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, SPECIES, STARTERS } from '../src/content/catalog';
import { battleActionReason, startBattle } from '../src/game/battle';
import { newGame, reduceGame, safeForTransfer } from '../src/game/engine';
import { npcVisible, MAPS } from '../src/content/world';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, PlayerBot, testEntropy } from './helpers';

describe('先救博士，再正式获得伙伴', () => {
  it('新档空队伍，不能提前选伙伴；空队伍菜单的合法存档可重开', () => {
    const game = newGame('刚搬来的旅人', 0, null, 34567);
    expect(game.party).toEqual([]);
    expect(game.inventory.ball).toBe(0);
    expect(game.dialogue?.speaker).toBe('妈妈');
    expect(validateGame(game)).toEqual(game);
    const s = createSnapshot(game, testEntropy, null);
    expect(decodeSnapshot(JSON.stringify(s)).game).toEqual(game);
    expect(reduceGame(game, { kind: 'chooseStarter', speciesId: STARTERS[0]! })).toEqual(game);
    expect(() => validateGame({ ...fixture(), party: [], creatures: {} })).toThrow(/空队伍/);
  });

  it('背包选择、救援、正式赠送、对手战和图鉴补给分别保存且不重复发奖', async () => {
    const bot = new PlayerBot(STARTERS[0]!, 789, true);
    bot.npc('rival');
    expect(bot.game.progress.flags.neighborMet).toBe(true);
    expect(bot.game.party).toHaveLength(0);
    bot.portal('route');
    expect(bot.game.progress.flags.professorCall).toBe(true);
    bot.npc('professorBag');
    expect(bot.game.progress.flags.starterChoice).toBe(true);
    expect(safeForTransfer(bot.game)).toBe(false);
    const choosing = createSnapshot(bot.game, testEntropy, null);
    bot.game = decodeSnapshot(JSON.stringify(choosing)).game;
    bot.act({ kind: 'chooseStarter', speciesId: STARTERS[0]! });
    const partnerId = bot.game.party[0]!;
    expect(bot.game.battle?.event).toBe('openingRescue');
    expect(bot.game.battle?.enemies[0]!.level).toBe(2);
    expect(battleActionReason(bot.game, { kind: 'run' })).toContain('博士');
    const turn = bot.game.battle!.turn;
    bot.act({ kind: 'battle', action: { kind: 'run' } });
    expect(bot.game.battle!.turn).toBe(turn);
    bot.act({ kind: 'chooseStarter', speciesId: STARTERS[1]! });
    expect(bot.game.party).toEqual([partnerId]);
    bot.battle();
    expect(bot.game.progress.flags.professorRescued).toBe(true);
    expect(bot.game.progress.flags.partnerReceived).toBeUndefined();
    expect(bot.game.player.map).toBe('dawn');
    expect(bot.game.dialogue?.after).toBe('partnerGift');
    const repo = new SaveRepository(new MemoryDriver(), testEntropy);
    const gift = await repo.save(1, bot.game, null);
    bot.game = (await repo.load(1))!.game;
    bot.dismiss();
    expect(bot.game.progress.flags.partnerReceived).toBe(true);
    expect(bot.game.party).toEqual([partnerId]);
    expect(bot.game.inventory.ball).toBe(0);
    expect(gift.payload).not.toContain('fieldKitReceived');
    bot.portal('route');
    bot.npc('routeRival');
    expect(bot.game.progress.flags.rival).toBe(true);
    expect(bot.game.progress.flags.fieldKitReceived).toBeUndefined();
    expect(bot.game.dialogue?.after).toBe('fieldKitGift');
    bot.dismiss();
    expect(bot.game.progress.flags.fieldKitReceived).toBe(true);
    expect(bot.game.inventory.ball).toBe(10);
    const inventory = { ...bot.game.inventory };
    bot.npc('professor');
    expect(bot.game.inventory).toEqual(inventory);
    expect(bot.game.party).toEqual([partnerId]);
    expect(
      npcVisible(
        bot.game,
        MAPS.route.npcs.find((n) => n.id === 'professorBag')!,
      ),
    ).toBe(false);
    validateGame(bot.game);
  });

  it('救援失败可回到背包重试，沿用借来的实例而不重新领一只', () => {
    const bot = new PlayerBot(STARTERS[1]!, 13579, true);
    bot.npc('rival');
    bot.portal('route');
    bot.npc('professorBag');
    bot.act({ kind: 'chooseStarter', speciesId: STARTERS[1]! });
    const id = bot.game.party[0]!;
    bot.game.creatures[id]!.hp = 1;
    for (let i = 0; bot.game.battle!.phase !== 'ended' && i < 30; i++)
      bot.act({ kind: 'battle', action: { kind: 'move', index: 2 } });
    expect(bot.game.battle!.result).toBe('lose');
    expect(bot.game.progress.flags.professorRescued).toBeUndefined();
    bot.act({ kind: 'closeBattle' });
    bot.portal('route');
    bot.npc('professorBag');
    expect(bot.game.party).toEqual([id]);
    expect(bot.game.progress.flags.starterChoice).toBe(false);
    expect(bot.game.progress.flags.professorRescued).toBe(true);
    bot.dismiss();
    expect(bot.game.progress.flags.partnerReceived).toBe(true);
    validateGame(bot.game);
  });

  it('新序章对手按初始家族选克制伙伴，旧档维持旧的练习战', () => {
    for (const [i, starter] of STARTERS.entries()) {
      const g = fixture(starter);
      Object.assign(g.progress.flags, {
        opening: true,
        neighborMet: true,
        professorCall: true,
        professorRescued: true,
        partnerReceived: true,
      });
      startBattle(g, 'rival');
      expect(g.battle!.enemies[0]!.speciesId).toBe(STARTERS[(i + 1) % 3]);
      expect(g.battle!.enemies[0]!.moves.every((m) => m.id === 'tackle' || m.id === 'growl')).toBe(
        true,
      );
      expect(SPECIES[g.battle!.enemies[0]!.speciesId]).toBeDefined();
    }
    const legacy = fixture();
    startBattle(legacy, 'rival');
    expect(legacy.battle!.enemies[0]!.speciesId).toBe('creature_037');
  });

  it('ch1.1 原档不重跑开场，首次新提交保留身份并升级内容版本', async () => {
    const game = fixture();
    game.progress.flags.rival = true;
    game.progress.flags.catchTutorial = true;
    const old = { ...createSnapshot(game, testEntropy, null), contentVersion: 'ch1.1' };
    const loaded = decodeSnapshot(JSON.stringify(old));
    expect(loaded.game).toEqual(game);
    expect(loaded.game.progress.flags.opening).toBeUndefined();
    const r = new SaveRepository(new MemoryDriver(), testEntropy);
    await r.import(1, JSON.stringify(old), null, 'legacy');
    const current = await r.save(1, loaded.game, old.revisionId);
    expect(current.contentVersion).toBe(CONTENT_VERSION);
    expect(current.parentRevisionId).toBe(old.revisionId);
    expect(current.lineageId).toBe(old.lineageId);
    expect(decodeSnapshot(JSON.stringify(current)).game).toEqual(game);
  });
});
