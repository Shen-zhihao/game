import { describe, expect, it } from 'vitest';
import { LEAGUE_STAGES, LEAGUE_TRAINERS } from '../src/content/league';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { GameState } from '../src/game/model';
import { applySupply, supplyReason } from '../src/game/items';
import { statsFor } from '../src/game/rules';
import { PlayerBot, playOpening, testEntropy } from './helpers';
import {
  playableChampion,
  prepareLeague,
  regionalChallenge,
  runLeague,
  trainVolt,
  travel,
} from './adventure-helpers';
import { rockChallenge } from './highland-helpers';
import { waterChallenge } from './coast-helpers';

let cached: GameState | undefined;
const completed = () => structuredClone((cached ??= playableChampion().game));
describe('联盟、冠军名录与两种结局顺序', () => {
  it('八馆、星流、四精英与六只冠军队伍完整结案，首次名录冷读取保留', () => {
    const game = completed();
    expect(game.progress.badges).toBe(8);
    expect(game.progress.flags.champion).toBe(true);
    expect(game.progress.flags.journeyComplete).toBe(true);
    expect(game.progress.flags.journeyCreditsViewed).toBe(true);
    expect(game.player.map).toBe('hallOfFame');
    expect(game.league!.wins).toBe(1);
    expect(game.league!.runs).toBe(1);
    expect(game.league!.firstTeam).toEqual(game.league!.lastTeam);
    expect(LEAGUE_TRAINERS.leagueChampion!.team).toHaveLength(6);
    expect(decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game).toEqual(
      game,
    );
    const bad = structuredClone(game);
    bad.league!.firstTeam = null;
    expect(() => validateGame(bad)).toThrow(/名录/);
  }, 60000); // Full eight-gym campaign; this is a correctness check, not a latency benchmark.
  it('连战中途存档、离场归零、战败回大厅，冠军历史与成长均不丢失', () => {
    const bot = new PlayerBot('creature_001', 1);
    bot.game = completed();
    bot.portal('league');
    bot.heal();
    const first = structuredClone(bot.game.league!.firstTeam);
    bot.npc('leagueRegistrar');
    bot.npc('leagueIce');
    expect(bot.game.league!.stage).toBe(1);
    bot.game = decodeSnapshot(JSON.stringify(createSnapshot(bot.game, testEntropy, null))).game;
    expect(bot.game.league!.active).toBe(true);
    bot.portal('league');
    expect(bot.game.league!.stage).toBe(0);
    expect(LEAGUE_STAGES.every((f) => !bot.game.progress.flags[f])).toBe(true);
    bot.npc('leagueRegistrar');
    const exp = bot.game.creatures[bot.game.party[0]!]!.experience;
    // Valid depleted-party fixture exercises defeat without granting or rewriting progression.
    for (const id of bot.game.party) {
      bot.game.creatures[id]!.hp = 1;
      for (const move of bot.game.creatures[id]!.moves) move.pp = 0;
    }
    validateGame(bot.game);
    bot.go(18, 57);
    bot.act({ kind: 'walk', direction: 'up' });
    bot.act({ kind: 'interact' });
    bot.dismiss();
    for (let i = 0; bot.game.battle?.phase !== 'ended' && i < 100; i++) {
      const b = bot.game.battle!;
      bot.act({
        kind: 'battle',
        action:
          b.phase === 'forcedSwitch'
            ? {
                kind: 'switch',
                creatureId: bot.game.party.find((id) => bot.game.creatures[id]!.hp > 0)!,
              }
            : { kind: 'move', index: 0 },
      });
    }
    expect(bot.game.battle!.result).toBe('lose');
    expect(bot.game.player.map).toBe('league');
    expect(bot.game.league!.active).toBe(false);
    expect(bot.game.league!.stage).toBe(0);
    expect(bot.game.league!.wins).toBe(1);
    expect(bot.game.league!.firstTeam).toEqual(first);
    expect(bot.game.creatures[bot.game.party[0]!]!.experience).toBeGreaterThanOrEqual(exp);
    bot.act({ kind: 'closeBattle' });
    bot.choices();
    validateGame(bot.game);
    bot.npc('leagueRegistrar');
    expect(bot.game.league!.active).toBe(true);
    expect(bot.game.league!.stage).toBe(0);
  });
  it('反向收齐八馆可先完成联盟，不要求任何地区调查、支线或传说捕获', () => {
    const bot = playOpening('creature_001', 789);
    bot.portal('route');
    bot.npc('catchGuide');
    travel(bot, 'moss');
    bot.heal();
    bot.act({ kind: 'buy', itemId: 'ball', quantity: 8 });
    travel(bot, 'route');
    bot.hunt('creature_040');
    for (const [i, number] of [8, 7, 6, 5, 4, 3, 2, 1].entries()) {
      trainVolt(bot, 24 + i * 4);
      const supplies = Math.max(0, 5 - (bot.game.inventory.hyper_potion ?? 0));
      if (supplies) bot.act({ kind: 'buy', itemId: 'hyper_potion', quantity: supplies });
      if (number >= 4) regionalChallenge(bot, number);
      else if (number === 3) {
        travel(bot, 'harbor');
        bot.heal();
        waterChallenge(bot);
        bot.portal('harbor');
      } else if (number === 2) {
        travel(bot, 'stone');
        bot.heal();
        rockChallenge(bot);
        bot.portal('stone');
      } else {
        travel(bot, 'moss');
        bot.heal();
        for (const npc of [
          'gymGate',
          'gymSwitchOne',
          'gymScout',
          'gymSwitchTwo',
          'gymKeeper',
          'leader',
        ])
          bot.npc(npc);
        bot.portal('moss');
      }
    }
    expect(bot.game.progress.badges).toBe(8);
    expect(
      bot.game.progress.flags.questReward ||
        bot.game.progress.flags.mineReport ||
        bot.game.progress.flags.starReport,
    ).toBeFalsy();
    prepareLeague(bot);
    runLeague(bot);
    expect(bot.game.progress.flags.champion).toBe(true);
    expect(bot.game.progress.flags.journeyComplete).not.toBe(true);
    expect(bot.game.progress.flags.starReport).not.toBe(true);
    expect(bot.game.dex.caught).not.toContain('creature_249');
  });
  it('高浓药与复苏芽只作用于有效目标，恢复体力不伪造 PP 或成长', () => {
    const game = completed(),
      c = game.creatures[game.party[0]!]!,
      pp = c.moves.map((m) => m.pp),
      level = c.level;
    c.hp = 1;
    const max = statsFor(c).hp;
    expect(applySupply(c, 'hyper_potion')).toBe(true);
    expect(c.hp).toBe(Math.min(max, 201));
    c.hp = 0;
    c.status = 'poison';
    expect(applySupply(c, 'hyper_potion')).toBe(false);
    expect(applySupply(c, 'revive')).toBe(true);
    expect(c.hp).toBe(Math.floor(max / 2));
    expect(c.status).toBeNull();
    expect(supplyReason(c, 'revive')).not.toBeNull();
    expect(c.moves.map((m) => m.pp)).toEqual(pp);
    expect(c.level).toBe(level);
  });
});
