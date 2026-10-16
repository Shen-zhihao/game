import { describe, expect, it } from 'vitest';
import { isOrdinarySpecies } from '../src/content/catalog';
import { MAPS, npcVisible, terrainPassable } from '../src/content/world';
import { startBattle } from '../src/game/battle';
import { reduceGame } from '../src/game/engine';
import { encountersAt, ORIGINAL_MAPS, worldNpcs } from '../src/game/exploration';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, playChapter, playOpening, testEntropy } from './helpers';
import { enterHighlands, playableHighlands, rockChallenge, train } from './highland-helpers';

describe('石脊区域的自由道馆与矿山故事', () => {
  it('无徽章和碎岩工具也能穿过两条山道、到城镇及矿山，并返回森林', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    enterHighlands(bot);
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.questReward).not.toBe(true);
    bot.portal('mine');
    bot.go(6, 4);
    bot.go(28, 19);
    bot.portal('stone');
    bot.portal('stoneRoute');
    bot.portal('forest');
    expect(bot.game.progress.flags.logMoved).not.toBe(true);
    expect(bot.game.progress.flags.rockBreaker).not.toBe(true);
  });

  it('先草后岩获得两枚不同徽章，奖励不重复，按已有徽章提升第二馆等级', () => {
    const bot = playableHighlands();
    expect(bot.game.progress.badges).toBe(2);
    expect(bot.game.progress.chapter).toBe(3);
    expect(bot.game.progress.flags.leader).toBe(true);
    bot.npc('rockGymGate');
    const money = bot.game.player.money;
    bot.npc('rockLeader');
    expect(bot.game.progress.badges).toBe(2);
    expect(bot.game.player.money).toBe(money);
    bot.portal('stone');
    bot.portal('stoneRoute');
    bot.npc('foothillRock');
    expect(terrainPassable('stoneRoute', 17, 11, bot.game.progress.flags)).toBe(true);
    expect(
      worldNpcs(bot.game).some((n) => n.id === 'foothillRock' && npcVisible(bot.game, n)),
    ).toBe(false);
    const snapshot = createSnapshot(bot.game, testEntropy, null);
    expect(decodeSnapshot(JSON.stringify(snapshot)).game).toEqual(bot.game);
  });

  it('先岩后草也能完成两馆，不要求森林或矿山主线，第二馆练习变为13与14级', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    bot.hunt('creature_040');
    enterHighlands(bot);
    const grass = bot.game.party[0]!;
    train(bot, grass, 10);
    bot.act({ kind: 'buy', itemId: 'potion', quantity: 8 });
    rockChallenge(bot);
    expect(bot.game.progress.badges).toBe(1);
    expect(bot.game.progress.flags.leader).not.toBe(true);
    expect(bot.game.progress.flags.questReward).not.toBe(true);
    bot.portal('stone');
    bot.heal();
    const bird = bot.game.party.find((id) => bot.game.creatures[id]!.speciesId === 'creature_040')!;
    train(bot, bird, 14);
    bot.act({ kind: 'buy', itemId: 'potion', quantity: 5 });
    bot.portal('stoneRoute');
    bot.portal('forest');
    bot.portal('moss');
    bot.heal();
    bot.npc('gymGate');
    bot.npc('gymSwitchOne');
    // Check the actual decision checkpoint, then finish through player commands.
    bot.go(11, 11);
    bot.act({ kind: 'walk', direction: 'up' });
    bot.act({ kind: 'interact' });
    bot.dismiss();
    expect(bot.game.battle?.enemies[0]?.level).toBe(13);
    bot.battle();
    bot.npc('gymSwitchTwo');
    bot.go(11, 6);
    bot.act({ kind: 'walk', direction: 'up' });
    bot.act({ kind: 'interact' });
    bot.dismiss();
    expect(bot.game.battle?.enemies[0]?.level).toBe(14);
    bot.battle();
    bot.npc('leader');
    expect(bot.game.progress.badges).toBe(2);
    expect(bot.game.progress.flags.rockLeader && bot.game.progress.flags.leader).toBe(true);
    expect(bot.game.progress.flags.mineQuest).not.toBe(true);
  });

  it('矿山调查接续森林：取证、击退、关机、回访；进度可恢复，报告奖励只结算一次', () => {
    const bot = playChapter('creature_001');
    enterHighlands(bot);
    bot.npc('mineForeman');
    bot.portal('mine');
    bot.npc('mineRegulator');
    expect(bot.game.progress.flags.mineStabilized).not.toBe(true);
    bot.npc('mineClueOne');
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    bot.npc('mineClueTwo');
    bot.npc('mineGuard');
    bot.npc('mineRegulator');
    expect(bot.game.progress.flags.mineStabilized).toBe(true);
    bot.portal('stone');
    const money = bot.game.player.money;
    bot.npc('mineForeman');
    expect(bot.game.player.money).toBe(money + 600);
    const inventory = { ...bot.game.inventory };
    bot.npc('mineForeman');
    expect(bot.game.player.money).toBe(money + 600);
    expect(bot.game.inventory).toEqual(inventory);
    expect(bot.game.progress.flags.mineReport).toBe(true);
  });

  it('工牌支线独立于徽章和矿山调查，鸣钟石只由剧情相遇，逃跑可重试且捕获后不再生成', () => {
    const bot = playOpening('creature_001');
    bot.portal('route');
    bot.npc('catchGuide');
    enterHighlands(bot);
    bot.act({ kind: 'buy', itemId: 'ball', quantity: 15 });
    bot.portal('mine');
    bot.npc('bellStone');
    expect(bot.game.progress.flags.bellAwakened).not.toBe(true);
    bot.npc('miningPlaque');
    bot.portal('stone');
    bot.npc('retiredMiner');
    const potions = bot.game.inventory.potion;
    bot.npc('retiredMiner');
    expect(bot.game.inventory.potion).toBe(potions);
    bot.act({ kind: 'useItem', itemId: 'candy', creatureId: bot.game.party[0]! });
    bot.choices();
    bot.heal();
    train(bot, bot.game.party[0]!, 16);
    bot.act({ kind: 'recall', creatureId: bot.game.party[0]!, moveId: 'sleep', replace: 2 });
    expect(bot.game.creatures[bot.game.party[0]!]!.moves[2]!.id).toBe('sleep');
    bot.captureBall = 'great_ball';
    bot.act({ kind: 'buy', itemId: 'great_ball', quantity: 8 });
    expect(bot.game.inventory.great_ball).toBe(8);
    bot.act({ kind: 'buy', itemId: 'potion', quantity: 5 });
    bot.portal('mine');
    bot.npc('bellStone');
    expect(bot.game.progress.flags.bellAwakened).toBe(true);
    expect(bot.game.progress.flags.bellCaught).not.toBe(true);
    bot.npc('bellStone', true);
    expect(bot.game.progress.flags.bellCaught).toBe(true);
    const owned = Object.keys(bot.game.creatures).length;
    bot.npc('bellStone');
    expect(Object.keys(bot.game.creatures)).toHaveLength(owned);
    expect(bot.game.battle).toBeNull();
    expect(bot.game.progress.badges).toBe(0);
    expect(bot.game.progress.flags.mineQuest).not.toBe(true);
    expect(isOrdinarySpecies('creature_077')).toBe(false);
    expect(
      [...MAPS.mine.encounters, ...encountersAt('stoneRoute', 26, 12).encounters].every((e) =>
        isOrdinarySpecies(e.speciesId),
      ),
    ).toBe(true);
  });

  it('旧ch1.3世界只补建新区域的探索记录，不重刷旧奖励或改变队伍与战斗随机数', () => {
    const game = fixture();
    delete game.world!.generatedMaps;
    game.world!.patrols = Object.fromEntries(
      Object.entries(game.world!.patrols).filter(([key]) =>
        ORIGINAL_MAPS.includes(key.split(':')[0] as (typeof ORIGINAL_MAPS)[number]),
      ),
    );
    game.world!.finds = Object.fromEntries(
      Object.entries(game.world!.finds).filter(([, f]) => ORIGINAL_MAPS.includes(f.map)),
    );
    const oldFind = Object.values(game.world!.finds)[0]!;
    oldFind.claimed = true;
    const oldFinds = structuredClone(game.world!.finds);
    const old = createSnapshot(game, testEntropy, null);
    old.contentVersion = 'ch1.3';
    const loaded = decodeSnapshot(JSON.stringify(old)).game;
    expect(loaded.world!.generatedMaps).toBeUndefined();
    const next = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    validateGame(next);
    expect(next.world!.generatedMaps).toHaveLength(Object.keys(MAPS).length);
    expect(next.rng).toBe(game.rng);
    expect(next.creatures).toEqual(game.creatures);
    for (const [id, find] of Object.entries(oldFinds)) expect(next.world!.finds[id]).toEqual(find);
    expect(next.world!.finds.find_mine_0).toBeDefined();
    const again = reduceGame(next, { kind: 'tick', seconds: 1 });
    expect(again.world!.finds).toEqual(next.world!.finds);
  });

  it('岩石徽章、工具、支线与主线的伪造前置会被存档校验拒绝', () => {
    for (const flag of [
      'rockLeader',
      'rockBreaker',
      'plaqueReturned',
      'bellAwakened',
      'bellCaught',
      'mineQuest',
      'mineGuard',
      'mineStabilized',
      'mineReport',
      'foothillRock',
    ]) {
      const game = fixture();
      game.progress.flags[flag] = true;
      expect(() => validateGame(game), flag).toThrow();
    }
    const game = fixture();
    game.progress.badges = 1;
    game.progress.chapter = 2;
    expect(() => validateGame(game)).toThrow(/徽章/);
  });

  it('在石脊治疗后战败返回山城，不会被送回第一座城镇', () => {
    let game = fixture();
    game.player.map = 'stone';
    game.player.healMap = 'stone';
    game.player.x = 6;
    game.player.y = 5;
    startBattle(game, null, { speciesId: 'creature_071', level: 50 });
    for (let i = 0; game.battle?.phase !== 'ended' && i < 20; i++)
      game = reduceGame(game, { kind: 'battle', action: { kind: 'move', index: 0 } });
    expect(game.battle?.result).toBe('lose');
    expect(game.player).toMatchObject({ map: 'stone', x: 6, y: 5 });
    validateGame(reduceGame(game, { kind: 'closeBattle' }));
  });
});
