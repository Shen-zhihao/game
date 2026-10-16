import { describe, expect, it } from 'vitest';
import design from '../docs/精灵属性/精灵设计数据.json';
import { ALL_SPECIES, SPECIES, STARTERS, TYPE_CHART, TYPE_IDS } from '../src/content/catalog';
import { battleActionReason, startBattle } from '../src/game/battle';
import { reduceGame } from '../src/game/engine';
import { TypeId } from '../src/game/model';
import {
  calculateDamage,
  captureChance,
  gainXp,
  makeCreature,
  statsFor,
  typeMultiplier,
  xpAt,
} from '../src/game/rules';
import { validateGame } from '../src/persistence/snapshot';
import { fixture, playChapter } from './helpers';

describe('内容与标准属性', () => {
  it('250 种、115 家族、135 条无环进化边，引用有效', () => {
    expect(ALL_SPECIES).toHaveLength(250);
    expect(design.families).toHaveLength(115);
    expect(ALL_SPECIES.reduce((n, s) => n + s.evolutions.length, 0)).toBe(135);
    for (const s of ALL_SPECIES) {
      expect(s.baseStatTotal).toBe(Object.values(s.baseStats).reduce((a, b) => a + b, 0));
      expect(new Set(s.types).size).toBe(s.types.length);
      expect(s.types.every((t) => TYPE_IDS.includes(t))).toBe(true);
      let next = s;
      const seen = new Set<string>();
      while (next.evolutions.length) {
        expect(seen.has(next.id)).toBe(false);
        seen.add(next.id);
        const target = SPECIES[next.evolutions[0]!.toId]!;
        expect(target.evolvesFromId).toBe(next.id);
        expect(target.experienceCurve).toBe(next.experienceCurve);
        next = target;
      }
    }
  });
  it('完整 324 个方向关系、8 个免疫与多属性乘积', () => {
    expect(TYPE_IDS).toHaveLength(18);
    expect(Object.values(TYPE_CHART).flatMap(Object.values)).toHaveLength(324);
    expect(
      Object.values(TYPE_CHART)
        .flatMap(Object.values)
        .filter((v) => v === 0),
    ).toHaveLength(8);
    expect(typeMultiplier('ice', ['grass', 'ground', 'flying', 'dragon'])).toBe(16);
    expect(typeMultiplier('fire', ['water', 'rock', 'fire', 'dragon'])).toBe(1 / 16);
    expect(typeMultiplier('electric', ['water', 'flying', 'ground'])).toBe(0);
    for (const [atk, def] of [
      ['normal', 'ghost'],
      ['ghost', 'normal'],
      ['electric', 'ground'],
      ['ground', 'flying'],
      ['poison', 'steel'],
      ['psychic', 'dark'],
      ['dragon', 'fairy'],
      ['fighting', 'ghost'],
    ] as [TypeId, TypeId][])
      expect(typeMultiplier(atk, [def])).toBe(0);
    expect(typeMultiplier('dragon', ['dragon'])).toBe(2);
    expect(typeMultiplier('ghost', ['ghost'])).toBe(2);
    expect(typeMultiplier('ice', ['ice'])).toBe(0.5);
    expect(typeMultiplier('ice', ['dragon', 'flying', 'ground', 'grass'])).toBe(16);
  });
  it('免疫在最低伤害之前生效；无属性兜底能命中幽灵', () => {
    const g = fixture();
    const a = makeCreature(g, 'creature_037', 10);
    const d = makeCreature(g, 'creature_025', 10);
    expect(calculateDamage(a, d, 'tackle').damage).toBe(0);
    expect(calculateDamage(a, d, 'struggle').damage).toBeGreaterThan(0);
  });
});
describe('捕捉、成长与进化', () => {
  it('四条经验曲线的等级边界', () => {
    expect(['fast', 'medium_fast', 'medium_slow', 'slow'].map((c) => xpAt(1, c as 'fast'))).toEqual(
      [0, 0, 0, 0],
    );
    expect(
      ['fast', 'medium_fast', 'medium_slow', 'slow'].map((c) => xpAt(100, c as 'fast')),
    ).toEqual([800000, 1000000, 1059860, 1250000]);
  });
  it('连续升级、取消后重试、进化不重抽个体、不复活昏厥', () => {
    let g = fixture();
    const c = makeCreature(g, 'creature_013', 7);
    g.creatures = { [c.id]: c };
    g.party = [c.id];
    g.dex = { seen: [c.speciesId], caught: [c.speciesId] };
    const iv = { ...c.iv };
    gainXp(g, c, xpAt(11, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
    expect(c.level).toBe(11);
    const edge = SPECIES[c.speciesId]!.evolutions[0]!;
    g = reduceGame(g, { kind: 'evolve', creatureId: c.id, toId: edge.toId, accept: false });
    expect(g.creatures[c.id]!.speciesId).toBe(c.speciesId);
    g.pending = [];
    g.creatures[c.id]!.hp = 0;
    const xp = g.creatures[c.id]!.experience;
    g = reduceGame(g, { kind: 'evolve', creatureId: c.id, toId: edge.toId, accept: true });
    expect(g.creatures[c.id]!.hp).toBe(0);
    expect(g.creatures[c.id]!.iv).toEqual(iv);
    expect(g.creatures[c.id]!.experience).toBe(xp);
    expect(g.dex.caught).toContain(edge.toId);
  });
  it('所有 135 条进化都保持身份、经验、完整属性与道具原子消耗', () => {
    for (const s of ALL_SPECIES)
      for (const edge of s.evolutions) {
        let g = fixture();
        const c = makeCreature(
          g,
          s.id,
          edge.condition.kind === 'level' ? edge.condition.level : edge.condition.minLevel,
        );
        g.creatures = { [c.id]: c };
        g.party = [c.id];
        g.dex = { seen: [s.id], caught: [s.id] };
        if (edge.condition.kind === 'item') g.inventory[edge.condition.itemId] = 1;
        const iv = { ...c.iv };
        const oldXp = c.experience;
        g = reduceGame(g, { kind: 'evolve', creatureId: c.id, toId: edge.toId, accept: true });
        expect(g.creatures[c.id]!.speciesId).toBe(edge.toId);
        expect(g.creatures[c.id]!.id).toBe(c.id);
        expect(g.creatures[c.id]!.experience).toBe(oldXp);
        expect(g.creatures[c.id]!.iv).toEqual(iv);
        if (edge.condition.kind === 'item') expect(g.inventory[edge.condition.itemId]).toBe(0);
        validateGame(g);
      }
  });
  it('低 HP 与睡眠提高捕获率；满仓不扣球，训练师不可捕捉', () => {
    const g = fixture();
    const c = makeCreature(g, 'creature_037', 5);
    const base = captureChance(c);
    c.hp = 1;
    expect(captureChance(c)).toBeGreaterThan(base);
    c.status = 'sleep';
    expect(captureChance(c)).toBeGreaterThan(base);
    startBattle(g, 'rival');
    const balls = g.inventory.ball;
    const after = reduceGame(g, { kind: 'battle', action: { kind: 'ball' } });
    expect(after.inventory.ball).toBe(balls);
    expect(after.battle!.turn).toBe(1);
  });
  it('教学捕捉只生成一个实例并保存进度，重放结束指令不发奖', () => {
    let g = fixture();
    startBattle(g, 'catchTutorial', { speciesId: 'creature_037', level: 4, tutorial: true });
    g = reduceGame(g, { kind: 'battle', action: { kind: 'ball' } });
    expect(g.party).toHaveLength(2);
    expect(g.inventory.ball).toBe(9);
    expect(g.progress.flags.catchTutorial).toBe(true);
    const again = reduceGame(g, { kind: 'battle', action: { kind: 'ball' } });
    expect(again).toEqual(g);
    validateGame(g);
  });
  it('战斗状态可序列化重放，AI 意图在玩家选择前固定', () => {
    const a = fixture();
    startBattle(a, 'rival');
    const b = JSON.parse(JSON.stringify(a));
    expect(reduceGame(a, { kind: 'battle', action: { kind: 'move', index: 1 } })).toEqual(
      reduceGame(b, { kind: 'battle', action: { kind: 'move', index: 1 } }),
    );
  });
  it('所有 PP 耗尽可使用无属性奋力一搏', () => {
    const g = fixture();
    startBattle(g, null, { speciesId: 'creature_025', level: 5 });
    g.creatures[g.battle!.playerId]!.moves.forEach((m) => (m.pp = 0));
    const hp = g.battle!.enemies[0]!.hp;
    const next = reduceGame(g, { kind: 'battle', action: { kind: 'move', index: -1 } });
    expect(next.battle!.enemies[0]!.hp).toBeLessThan(hp);
  });
  it('无效用药不消耗物品、回合、随机数；给后排用药只让对手行动一次', () => {
    const g = fixture();
    const reserve = makeCreature(g, 'creature_007', 12);
    g.party.push(reserve.id);
    g.creatures[reserve.id] = reserve;
    startBattle(g, 'rival');
    const full = { kind: 'potion', creatureId: reserve.id } as const;
    expect(battleActionReason(g, full)).toContain('体力已满');
    const refused = reduceGame(g, { kind: 'battle', action: full });
    expect(refused.inventory).toEqual(g.inventory);
    expect(refused.battle!.turn).toBe(1);
    expect(refused.rng).toBe(g.rng);
    expect(refused.creatures).toEqual(g.creatures);
    g.creatures[reserve.id]!.hp -= 12;
    const player = g.creatures[g.battle!.playerId]!;
    const healed = reduceGame(g, { kind: 'battle', action: full });
    expect(healed.creatures[reserve.id]!.hp).toBe(statsFor(reserve).hp);
    expect(healed.inventory.potion).toBe(g.inventory.potion! - 1);
    expect(healed.battle!.turn).toBe(2);
    expect(healed.creatures[player.id]!.hp).toBeLessThan(player.hp);
    expect(healed.battle!.logs.filter((l) => l.includes('绒团鼠使用了'))).toHaveLength(1);
    const dead = structuredClone(g);
    dead.creatures[reserve.id]!.hp = 0;
    const unchanged = reduceGame(dead, { kind: 'battle', action: full });
    expect(unchanged.creatures[reserve.id]!.hp).toBe(0);
    expect(unchanged.battle!.turn).toBe(1);
    expect(unchanged.inventory).toEqual(dead.inventory);
    const noStatus = reduceGame(g, {
      kind: 'battle',
      action: { kind: 'antidote', creatureId: reserve.id },
    });
    expect(noStatus.battle!.turn).toBe(1);
    expect(noStatus.inventory).toEqual(g.inventory);
  });
  it('主动换人消耗回合，倒下后的补位免费；拒绝当前和昏厥精灵', () => {
    const g = fixture();
    const reserve = makeCreature(g, 'creature_007', 15);
    g.party.push(reserve.id);
    g.creatures[reserve.id] = reserve;
    startBattle(g, 'rival');
    const playerId = g.battle!.playerId;
    const switchIn = { kind: 'switch', creatureId: reserve.id } as const;
    expect(battleActionReason(g, { kind: 'switch', creatureId: playerId })).toContain('已经在场上');
    const voluntary = reduceGame(g, { kind: 'battle', action: switchIn });
    expect(voluntary.battle!.turn).toBe(2);
    expect(voluntary.battle!.playerId).toBe(reserve.id);
    expect(voluntary.creatures[reserve.id]!.hp).toBeLessThan(reserve.hp);
    expect(voluntary.battle!.participants).toContain(reserve.id);
    g.creatures[playerId]!.hp = 0;
    g.battle!.phase = 'forcedSwitch';
    const forced = reduceGame(g, { kind: 'battle', action: switchIn });
    expect(forced.battle!.turn).toBe(1);
    expect(forced.creatures[reserve.id]!.hp).toBe(reserve.hp);
    expect(forced.battle!.phase).toBe('choose');
    expect(forced.battle!.playerStages).toEqual({
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
      critical: 0,
      criticalGuard: 0,
    });
    expect(battleActionReason(g, { kind: 'potion', creatureId: reserve.id })).toContain('请先选择');
    g.creatures[reserve.id]!.hp = 0;
    expect(battleActionReason(g, switchIn)).toContain('失去战斗能力');
  });
});
describe('第一章新档流程', () => {
  for (const starter of STARTERS)
    it(`${SPECIES[starter]!.name}可走通森林救援、机关与道馆`, () => {
      const bot = playChapter(starter);
      expect(bot.game.progress.badges).toBe(1);
      expect(bot.game.progress.flags.vineCut).toBe(true);
      expect(bot.game.progress.flags.rescued).toBe(true);
      expect(bot.game.party.length).toBeGreaterThanOrEqual(2);
      const before = bot.game.player.money;
      bot.npc('leader');
      expect(bot.game.player.money).toBe(before);
      validateGame(bot.game);
    });
});
