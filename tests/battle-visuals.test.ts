import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/content/catalog';
import { startBattle } from '../src/game/battle';
import { battleScene, MOVE_VISUALS, presentationScene } from '../src/game/battleVisuals';
import { reduceGame } from '../src/game/engine';
import { BattleMoveEvent } from '../src/game/model';
import { makeCreature, statsFor } from '../src/game/rules';
import { hitChance } from '../src/game/combat';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

function duel(moveId = 'tackle', enemySpecies = 'creature_037') {
  const game = fixture();
  const c = makeCreature(game, 'creature_037', 40);
  game.creatures = { [c.id]: c };
  game.party = [c.id];
  game.box = [];
  game.dex = { seen: [c.speciesId], caught: [c.speciesId] };
  c.moves = [{ id: moveId, pp: MOVES[moveId]!.pp }];
  startBattle(game, null, { speciesId: enemySpecies, level: 40 });
  const e = game.battle!.enemies[0]!;
  e.moves = [{ id: 'guard', pp: 20 }];
  game.battle!.aiMove = 0;
  game.battle!.playerStages.speed = 6;
  game.battle!.enemyStages.speed = -2;
  game.battle!.enemyStages.defense = 6;
  return game;
}
const act = (g: ReturnType<typeof duel>) =>
  reduceGame(g, { kind: 'battle', action: { kind: 'move', index: 0 } });
const moves = (g: ReturnType<typeof duel>) =>
  (g.battle!.visualEvents ?? []).filter((e): e is BattleMoveEvent => e.kind === 'move');
describe('逐次出手的技能演出', () => {
  it('全部技能有演出，18 属性区分画面；治疗、强化、天气各自正确定位', () => {
    expect(Object.keys(MOVE_VISUALS).sort()).toEqual(Object.keys(MOVES).sort());
    expect(
      new Set(
        Object.values(MOVES)
          .filter((m) => m.id.endsWith('_1'))
          .map((m) => MOVE_VISUALS[m.id]!.pattern),
      ).size,
    ).toBe(18);
    expect(MOVE_VISUALS.recover).toMatchObject({ motion: 'self', pattern: 'heal' });
    expect(MOVE_VISUALS.guard).toMatchObject({ motion: 'self', pattern: 'shield' });
    expect(MOVE_VISUALS.rain_call).toMatchObject({ motion: 'field', pattern: 'weather' });
    expect(MOVE_VISUALS.signature_250).toMatchObject({ signature: true, pattern: 'dragon' });
    expect(hitChance('signature_249', { accuracy: -6 })).toBeLessThan(0.95);
  });
  it('三倍速度逐次记录三次技能、PP 与实际日志对应，画面保存可冷恢复', () => {
    const game = duel(),
      next = act(game),
      events = moves(next);
    expect(events.filter((e) => e.side === 'player')).toHaveLength(3);
    expect(events).toHaveLength(next.battle!.logs.filter((l) => l.includes('使用了')).length);
    for (const e of events) {
      expect(next.battle!.logs[e.logIndex]).toContain(MOVES[e.moveId]!.name);
      expect(e.endLogIndex).toBeGreaterThan(e.logIndex);
      expect(e.after.enemy.hp).toBeLessThanOrEqual(e.before.enemy.hp);
    }
    const initial = battleScene(game);
    const first = events[0]!;
    expect(
      presentationScene(initial, next.battle!.visualEvents!, first.logIndex, false).scene,
    ).toEqual(first.before);
    expect(
      presentationScene(initial, next.battle!.visualEvents!, first.logIndex, true).scene,
    ).toEqual(first.after);
    const snapshot = createSnapshot(next, testEntropy, null);
    expect(decodeSnapshot(JSON.stringify(snapshot)).game).toEqual(next);
  });
  it('睡眠、无 PP 和无效指令不会凭空播放出手；旧回合事件被清空', () => {
    const game = duel(),
      c = game.creatures[game.party[0]!]!;
    c.status = 'sleep';
    c.sleepTurns = 2;
    const next = act(game);
    expect(moves(next).some((e) => e.side === 'player')).toBe(false);
    const invalid = reduceGame(next, { kind: 'battle', action: { kind: 'move', index: 99 } });
    expect(moves(invalid)).toEqual([]);
    const pp = duel();
    pp.creatures[pp.party[0]!]!.moves[0]!.pp = 1;
    expect(moves(act(pp)).filter((e) => e.side === 'player')).toHaveLength(1);
  });
  it('未命中、免疫与要害拥有明确结果，免疫不产生受击伤害', () => {
    const immune = act(duel('tackle', 'creature_025'));
    const e = moves(immune).find((e) => e.side === 'player')!;
    expect(e.outcome).toBe('immune');
    expect(e.after.enemy.hp).toBe(e.before.enemy.hp);
    const miss = duel();
    miss.battle!.playerStages.accuracy = -6;
    miss.battle!.enemyStages.evasion = 6;
    expect(moves(act(miss)).some((e) => e.side === 'player' && e.outcome === 'miss')).toBe(true);
    const critical = duel();
    critical.battle!.playerStages.critical = 3;
    critical.battle!.enemyStages.criticalGuard = -1;
    expect(
      moves(act(critical))
        .filter((e) => e.side === 'player' && e.outcome === 'hit')
        .every((e) => e.critical),
    ).toBe(true);
  });
  it('治疗作用在自身；新对手只在派出消息时出现，攻击不会打到下一只身上', () => {
    const heal = duel('recover');
    heal.creatures[heal.party[0]!]!.hp = 10;
    const healed = moves(act(heal)).find((e) => e.side === 'player')!;
    expect(healed.after.player.hp).toBeGreaterThan(healed.before.player.hp);
    const game = duel('normal_2'),
      first = game.battle!.enemies[0]!;
    first.hp = 1;
    const replacement = makeCreature(game, 'creature_010', 40);
    game.battle!.kind = 'trainer';
    game.battle!.enemies.push(replacement);
    const next = act(game),
      event = moves(next)[0]!;
    expect(event.before.enemy.id).toBe(first.id);
    expect(event.after.enemy.hp).toBe(0);
    const send = next.battle!.visualEvents!.find(
      (e) => e.kind === 'scene' && e.scene.enemy.id === replacement.id,
    )!;
    expect(next.battle!.logs[send.logIndex]).toContain('派出了');
    expect(
      presentationScene(battleScene(game), next.battle!.visualEvents!, send.logIndex, true).scene
        .enemy.id,
    ).toBe(replacement.id);
    expect(next.battle!.enemies[1]!.hp).toBe(statsFor(replacement).hp);
    validateGame(next);
  });
  it('篡改演出技能归属与顺序的存档被拒绝，旧存档无演出字段仍可使用', () => {
    const game = act(duel()),
      old = structuredClone(game);
    delete old.battle!.visualEvents;
    validateGame(old);
    const forged = structuredClone(game);
    moves(forged)[0]!.moveId = 'signature_250';
    expect(() => validateGame(forged)).toThrow('归属');
    const order = structuredClone(game);
    order.battle!.visualEvents![0]!.logIndex = 99;
    expect(() => validateGame(order)).toThrow('顺序');
  });
});
