import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, learnset, MOVES } from '../src/content/catalog';
import { emptyStages, startBattle } from '../src/game/battle';
import {
  chanceLabel,
  criticalChance,
  hitChance,
  roundPace,
  speedActionCount,
} from '../src/game/combat';
import { reduceGame } from '../src/game/engine';
import { GameState } from '../src/game/model';
import { calculateDamage, makeCreature, statsFor } from '../src/game/rules';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

function duel() {
  const game = fixture();
  game.progress.flags.rival = game.progress.flags.catchTutorial = true;
  const player = makeCreature(game, 'creature_037', 20);
  player.nickname = '迅风';
  player.moves = ['tackle', 'focus', 'agility', 'guard'].map((id) => ({ id, pp: MOVES[id]!.pp }));
  game.creatures = { [player.id]: player };
  game.party = [player.id];
  game.dex = { seen: ['creature_037'], caught: ['creature_037'] };
  startBattle(game, null, { speciesId: 'creature_037', level: 20 });
  const enemy = makeCreature(game, 'creature_037', 20);
  enemy.nickname = '岩盾';
  enemy.moves = [{ id: 'guard', pp: MOVES.guard!.pp }];
  game.battle!.enemies = [enemy];
  game.battle!.aiMove = 0;
  game.battle!.enemyStages.defense = 6;
  validateGame(game);
  return game;
}
const move = (game: GameState, index = 0) =>
  reduceGame(game, { kind: 'battle', action: { kind: 'move', index } });
const playerOf = (g: GameState) => g.creatures[g.battle!.playerId]!;
const enemyOf = (g: GameState) => g.battle!.enemies[g.battle!.enemyIndex]!;
const attacks = (g: GameState, name: string) =>
  g.battle!.logs.filter((s) => s.startsWith(`${name}使用了`));

describe('速度的先手与多次出手', () => {
  it('2 倍、3 倍边界与上限明确，小数速度不丢阈值', () => {
    expect([19.99, 20, 29.99, 30, 10000].map((n) => speedActionCount(n, 10))).toEqual([
      1, 2, 2, 3, 3,
    ]);
    expect(speedActionCount(90 / 7, 30 / 7)).toBe(3);
    expect(speedActionCount(10, 10)).toBe(1);
  });
  it.each([
    [0, 1],
    [2, 2],
    [4, 3],
  ] as const)('速度等级 %i 实际出手 %i 次、逐次扣 PP、只推进一个回合', (stage, count) => {
    const game = duel();
    game.battle!.playerStages.speed = stage;
    const next = move(game);
    expect(attacks(next, '迅风')).toHaveLength(count);
    expect(attacks(next, '岩盾')).toHaveLength(1);
    expect(playerOf(next).moves[0]!.pp).toBe(MOVES.tackle!.pp - count);
    expect(next.battle!.turn).toBe(2);
    if (stage)
      expect(next.battle!.logs.indexOf(attacks(next, '迅风')[0]!)).toBeLessThan(
        next.battle!.logs.indexOf(attacks(next, '岩盾')[0]!),
      );
    validateGame(next);
  });
  it('对手也可连续出手；先制招式仍可抢在高速精灵之前', () => {
    const game = duel();
    game.battle!.enemyStages.speed = 4;
    expect(attacks(move(game, 3), '岩盾')).toHaveLength(3);
    const priority = duel();
    priority.battle!.playerStages.speed = 4;
    enemyOf(priority).moves = [{ id: 'quick', pp: 25 }];
    const next = move(priority);
    const lines = next.battle!.logs.filter((s) => s.includes('使用了'));
    expect(lines[0]).toBe('岩盾使用了疾步冲撞！');
    expect(attacks(next, '迅风')).toHaveLength(3);
  });
  it('轻身与麻痹影响有效速度，本回合配额不在强化中递归增加', () => {
    let game = duel();
    game = move(game, 2);
    expect(attacks(game, '迅风')).toHaveLength(1);
    expect(game.battle!.playerStages.speed).toBe(2);
    expect(
      roundPace(playerOf(game), enemyOf(game), game.battle!.playerStages, game.battle!.enemyStages)
        .playerActions,
    ).toBe(2);
    game = move(game, 2);
    expect(attacks(game, '迅风')).toHaveLength(2);
    expect(game.battle!.playerStages.speed).toBe(6);
    playerOf(game).status = 'paralysis';
    expect(
      roundPace(playerOf(game), enemyOf(game), game.battle!.playerStages, game.battle!.enemyStages)
        .playerActions,
    ).toBe(2);
  });
  it('所选技能只剩一 PP 时不会免费追击，也不自动改用别的技能或挣扎', () => {
    const game = duel();
    game.battle!.playerStages.speed = 4;
    playerOf(game).moves[0]!.pp = 1;
    const next = move(game);
    expect(attacks(next, '迅风')).toEqual(['迅风使用了撞击！']);
    expect(playerOf(next).moves[0]!.pp).toBe(0);
    expect(playerOf(next).moves[1]!.pp).toBe(MOVES.focus!.pp);
    expect(next.battle!.logs.some((s) => s.includes('PP 已耗尽'))).toBe(true);
  });
  it('麻痹每轮只判定一次，不会利用后续行动重抽，也不会额外吞掉 PP', () => {
    const outcomes = new Set<number>();
    for (const seed of [12345, 45678, 789, 2654435769, 3735928559, 123456789]) {
      const game = duel();
      game.rng = seed;
      game.battle!.playerStages.speed = 6;
      playerOf(game).status = 'paralysis';
      const next = move(game, 3);
      const count = attacks(next, '迅风').length;
      outcomes.add(count);
      expect([0, 2]).toContain(count);
      expect(playerOf(next).moves[3]!.pp).toBe(20 - count);
      expect(next.battle!.logs.filter((s) => s.includes('麻痹了，没能行动'))).toHaveLength(
        count ? 0 : 1,
      );
    }
    expect(outcomes).toEqual(new Set([0, 2]));
  });
  it('击倒目标便停止追击，训练师下一只不承接旧行动', () => {
    const game = duel();
    game.battle!.playerStages.speed = 4;
    enemyOf(game).hp = 1;
    const reserve = makeCreature(game, 'creature_037', 20);
    game.battle!.enemies.push(reserve);
    const next = move(game);
    expect(next.battle!.enemyIndex).toBe(1);
    expect(enemyOf(next).hp).toBe(reserve.hp);
    expect(attacks(next, '迅风')).toHaveLength(1);
    expect(attacks(next, '岩盾')).toHaveLength(0);
    expect(next.battle!.enemyStages).toEqual(emptyStages());
    validateGame(next);
  });
  it('用药只消耗一份，敌方按速度回应；捕捉成功立即终止整轮', () => {
    const game = duel();
    game.battle!.enemyStages.speed = 4;
    playerOf(game).hp -= 5;
    const next = reduceGame(game, {
      kind: 'battle',
      action: { kind: 'potion', creatureId: playerOf(game).id },
    });
    expect(next.inventory.potion).toBe(game.inventory.potion! - 1);
    expect(attacks(next, '岩盾')).toHaveLength(3);
    expect(attacks(next, '迅风')).toHaveLength(0);
    expect(next.battle!.turn).toBe(2);
    game.battle!.tutorialCatch = true;
    const caught = reduceGame(game, { kind: 'battle', action: { kind: 'ball' } });
    expect(caught.inventory.ball).toBe(game.inventory.ball! - 1);
    expect(caught.battle!.result).toBe('caught');
    expect(attacks(caught, '岩盾')).toHaveLength(0);
    validateGame(caught);
  });
  it('异常扣血和睡眠倒计时按回合一次结算，挣扎反伤倒下即停止', () => {
    const game = duel();
    game.battle!.playerStages.speed = 4;
    playerOf(game).status = 'poison';
    const loss = Math.max(1, Math.floor(statsFor(playerOf(game)).hp / 8));
    const next = move(game, 3);
    expect(playerOf(next).hp).toBe(playerOf(game).hp - loss);
    expect(next.battle!.logs.filter((s) => s.includes('异常伤害'))).toHaveLength(1);
    playerOf(game).status = 'sleep';
    playerOf(game).sleepTurns = 2;
    const sleeping = move(game);
    expect(playerOf(sleeping).sleepTurns).toBe(1);
    expect(attacks(sleeping, '迅风')).toHaveLength(0);
    expect(playerOf(sleeping).moves[0]!.pp).toBe(35);
    playerOf(game).status = null;
    playerOf(game).sleepTurns = 0;
    playerOf(game).hp = 1;
    playerOf(game).moves.forEach((m) => {
      m.pp = 0;
    });
    const reserve = makeCreature(game, 'creature_037', 20);
    game.creatures[reserve.id] = reserve;
    game.party.push(reserve.id);
    const recoil = move(game, -1);
    expect(recoil.battle!.phase).toBe('forcedSwitch');
    expect(attacks(recoil, '迅风')).toEqual(['迅风使用了奋力一搏！']);
    expect(attacks(recoil, '岩盾')).toHaveLength(0);
    const switched = reduceGame(recoil, {
      kind: 'battle',
      action: { kind: 'switch', creatureId: reserve.id },
    });
    expect(switched.battle!.turn).toBe(recoil.battle!.turn);
    expect(switched.battle!.playerStages).toEqual(emptyStages());
    validateGame(switched);
  });
});

describe('隐藏命中、闪避与双倍要害', () => {
  it('基础 6.25%，凝神分级、招式自身倾向与抗要害共同生效', () => {
    expect([0, 1, 2, 3].map((critical) => criticalChance('tackle', { critical }))).toEqual([
      1 / 16,
      1 / 8,
      1 / 4,
      1 / 2,
    ]);
    expect(criticalChance('keen_strike')).toBe(1 / 8);
    expect(criticalChance('keen_strike', { critical: 2 })).toBe(1 / 2);
    expect(criticalChance('tackle', { critical: 2 }, { criticalGuard: 1 })).toBe(1 / 8);
    expect(criticalChance('focus', { critical: 3 })).toBe(0);
    expect(chanceLabel(1 / 16)).toBe('6.25%');
  });
  it('要害恰为同一普通伤害的两倍，免疫和非伤害技能不会变成伤害', () => {
    const game = duel();
    for (const id of ['tackle', 'fire_2', 'water_2', 'keen_strike', 'recover'])
      for (const variation of [0.9, 0.937, 1]) {
        const normal = calculateDamage(playerOf(game), enemyOf(game), id, {}, {}, variation).damage;
        expect(
          calculateDamage(playerOf(game), enemyOf(game), id, {}, {}, variation, true).damage,
        ).toBe(normal * 2);
      }
    enemyOf(game).speciesId = 'creature_025';
    expect(calculateDamage(playerOf(game), enemyOf(game), 'tackle', {}, {}, 1, true).damage).toBe(
      0,
    );
  });
  it('实际战斗可凝神、达到上限、守心，且每次出手单独触发双倍要害', () => {
    let game = duel();
    game = move(game, 1);
    expect(game.battle!.playerStages.critical).toBe(2);
    expect(game.battle!.logs.some((s) => s.includes('25%'))).toBe(true);
    game = move(game, 1);
    game = move(game, 1);
    expect(game.battle!.playerStages.critical).toBe(3);
    expect(game.battle!.logs.some((s) => s.includes('上限'))).toBe(true);
    enemyOf(game).moves = [{ id: 'steady', pp: 15 }];
    game = move(game, 3);
    expect(game.battle!.enemyStages.criticalGuard).toBe(1);
    expect(criticalChance('tackle', game.battle!.playerStages, game.battle!.enemyStages)).toBe(
      1 / 4,
    );
    game.battle!.playerStages.speed = 4;
    game.battle!.enemyStages.criticalGuard = -3;
    enemyOf(game).moves = [{ id: 'guard', pp: 20 }];
    const crits = move(game);
    expect(crits.battle!.logs.filter((s) => s.includes('命中要害（双倍伤害）'))).toHaveLength(3);
    validateGame(crits);
  });
  it('鹰眼与影步影响命中；自身强化不受闪避和属性免疫影响', () => {
    expect(hitChance('tackle', {}, { evasion: 6 })).toBeCloseTo(1 / 3);
    expect(hitChance('tackle', { accuracy: 6 }, { evasion: 6 })).toBe(1);
    expect(hitChance('keen_strike', { accuracy: 2 })).toBe(1);
    expect(hitChance('focus', { accuracy: -6 }, { evasion: 6 })).toBe(1);
    let game = duel();
    enemyOf(game).speciesId = ALL_SPECIES.find((s) => s.types.includes('dark'))!.id;
    enemyOf(game).hp = statsFor(enemyOf(game)).hp;
    game.battle!.playerStages.accuracy = -6;
    game.battle!.enemyStages.evasion = 6;
    game.battle!.playerStages.speed = -6;
    game.battle!.enemyStages.speed = 6;
    game = move(game, 1);
    expect(game.battle!.playerStages.critical).toBe(2);
    playerOf(game).moves[0] = { id: 'aim', pp: 15 };
    game = move(game);
    expect(game.battle!.playerStages.accuracy).toBe(-4);
  });
  it('所有种族能通过成长学习并复刻辅助招，新出现精灵始终有攻击技能', () => {
    for (const species of ALL_SPECIES) {
      expect(learnset(species.id)).toContainEqual({ level: 9, moveId: 'focus' });
      expect(learnset(species.id)).toContainEqual({ level: 22, moveId: 'agility' });
      for (const level of [1, 9, 15, 22, 24, 28, 50, 100]) {
        const game = fixture();
        const c = makeCreature(game, species.id, level);
        expect(c.moves.length).toBeLessThanOrEqual(4);
        expect(c.moves.some((m) => MOVES[m.id]!.power > 0)).toBe(true);
      }
    }
  });
  it('隐藏阶段可冷读取重放，非法范围拒绝导入，旧 ch2.2 战斗继续', () => {
    const game = move(duel(), 1);
    game.battle!.playerStages.evasion = 2;
    game.battle!.enemyStages.accuracy = -1;
    const restored = decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game;
    expect(move(restored)).toEqual(move(game));
    for (const [stage, value] of [
      ['critical', 4],
      ['criticalGuard', -4],
      ['accuracy', 7],
      ['evasion', -7],
    ] as const) {
      const invalid = structuredClone(game);
      invalid.battle!.playerStages[stage] = value;
      expect(() => validateGame(invalid)).toThrow();
    }
    const old = duel();
    old.battle!.enemies[0]!.moves = [{ id: 'guard', pp: 20 }];
    playerOf(old).moves = [{ id: 'tackle', pp: 35 }];
    for (const stages of [old.battle!.playerStages, old.battle!.enemyStages])
      for (const key of ['critical', 'criticalGuard', 'accuracy', 'evasion'] as const)
        delete stages[key];
    const snapshot = createSnapshot(old, testEntropy, null);
    snapshot.contentVersion = 'ch2.2';
    const legacy = decodeSnapshot(JSON.stringify(snapshot)).game;
    expect(move(legacy).battle!.turn).toBe(2);
    validateGame(move(legacy));
  });
});
