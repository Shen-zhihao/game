import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, learnset, MOVES, SPECIES } from '../src/content/catalog';
import { CITIES, CITY_QUESTS, questProgress } from '../src/content/cities';
import { TRAINING_PLANS } from '../src/content/training';
import { healParty, startBattle } from '../src/game/battle';
import { reduceGame } from '../src/game/engine';
import {
  allocatePoints,
  availablePoints,
  earnedPoints,
  emptyStats,
  growthRoll,
  recommendedAllocation,
  sumStats,
  trainingFor,
} from '../src/game/growth';
import { STAT_KEYS, Stats } from '../src/game/model';
import { calculateDamage, gainXp, makeCreature, statsFor, xpAt } from '../src/game/rules';
import { MemoryDriver, SaveRepository } from '../src/persistence/repository';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

function growthGame(speciesId = 'creature_033', level = 8) {
  const game = fixture();
  const c = makeCreature(game, speciesId, level);
  game.creatures = { [c.id]: c };
  game.party = [c.id];
  game.dex = { seen: [speciesId], caught: [speciesId] };
  game.progress.flags = { rival: true, catchTutorial: true };
  return game;
}
describe('250 份培养方案与 1–10 点成长', () => {
  it('每个形态有可执行的六维方案、真实四技能和进化建议，同家族强度档一致', () => {
    expect(Object.keys(TRAINING_PLANS)).toHaveLength(250);
    for (const s of ALL_SPECIES) {
      const plan = TRAINING_PLANS[s.id]!;
      expect(plan.speciesId).toBe(s.id);
      expect(sumStats(plan.weights)).toBe(10);
      expect(plan.moves).toHaveLength(4);
      expect(new Set(plan.moves.map((m) => m.moveId)).size).toBe(4);
      for (const m of plan.moves)
        expect(learnset(s.id)).toContainEqual({ moveId: m.moveId, level: m.level });
      expect(plan.strategy).toContain(s.name);
      expect(plan.evolution.length).toBeGreaterThan(10);
      for (const edge of s.evolutions)
        expect(TRAINING_PLANS[edge.toId]!.potential).toBe(plan.potential);
    }
  });
  it('所有强度档都能获得 1 与 10，强度越高平均点数越多，进化不改变概率', () => {
    const means: number[] = [];
    for (const potential of ['standard', 'balanced', 'highBase']) {
      const plan = Object.values(TRAINING_PLANS).find((p) => p.potential === potential)!;
      const rolls = Array.from({ length: 20000 }, (_, i) => growthRoll(i + 1, plan.speciesId, 20));
      expect(new Set(rolls).size).toBe(10);
      expect(Math.min(...rolls)).toBe(1);
      expect(Math.max(...rolls)).toBe(10);
      means.push(rolls.reduce((sum, n) => sum + n, 0) / rolls.length);
    }
    expect(means[0]).toBeLessThan(means[1]!);
    expect(means[1]).toBeLessThan(means[2]!);
    const forms = ['standard', 'balanced', 'highBase'].map(
      (potential) =>
        Object.values(TRAINING_PLANS).find((p) => p.potential === potential)!.speciesId,
    );
    for (let seed = 1; seed <= 200; seed++) {
      const points = forms.map((id) => growthRoll(seed, id, 20));
      expect(points[0]).toBeLessThanOrEqual(points[1]!);
      expect(points[1]).toBeLessThanOrEqual(points[2]!);
    }
  });
  it('250种精灵达到学招等级均能学会或进入替换队列，成长点同时结算且冷读不丢', () => {
    for (const species of ALL_SPECIES) {
      const game = growthGame(species.id, 1);
      const c = game.creatures[game.party[0]!]!;
      for (const level of [...new Set(learnset(species.id).map((m) => m.level))].filter(
        (l) => l > 1,
      )) {
        const before = c.level;
        gainXp(game, c, xpAt(level, species.experienceCurve) - c.experience);
        for (const entry of learnset(species.id).filter(
          (m) => m.level > before && m.level <= level,
        ))
          expect(
            c.moves.some((m) => m.id === entry.moveId) ||
              game.pending.some(
                (p) => p.kind === 'move' && p.creatureId === c.id && p.moveId === entry.moveId,
              ),
          ).toBe(true);
        expect(c.training!.rolls).toHaveLength(level - 1);
        expect(availablePoints(c)).toBeGreaterThan(0);
      }
      expect(decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game).toEqual(
        game,
      );
    }
  });
  it('成长果升级有空位时直接学会，满四招时选择替换，不重复发点或消耗额外药品', () => {
    let game = growthGame('creature_004', 6);
    const id = game.party[0]!;
    game.inventory.candy = 5;
    game = reduceGame(game, { kind: 'useItem', itemId: 'candy', creatureId: id });
    expect(game.creatures[id]!.level).toBe(7);
    expect(game.creatures[id]!.moves.some((m) => m.id === 'flame_tail')).toBe(true);
    expect(game.notice).toContain(`学会了${MOVES.flame_tail!.name}`);
    expect(game.inventory.candy).toBe(4);
    while (game.creatures[id]!.level < 9)
      game = reduceGame(game, { kind: 'useItem', itemId: 'candy', creatureId: id });
    expect(game.pending).toContainEqual({ kind: 'move', creatureId: id, moveId: 'focus' });
    const earned = earnedPoints(game.creatures[id]!);
    const candy = game.inventory.candy;
    const invalid = reduceGame(game, {
      kind: 'learn',
      creatureId: id,
      moveId: 'focus',
      replace: 0.5,
    });
    expect(invalid.pending).toEqual(game.pending);
    expect(invalid.creatures).toEqual(game.creatures);
    game = reduceGame(game, { kind: 'learn', creatureId: id, moveId: 'focus', replace: 0 });
    expect(game.notice).toContain('学会了凝神');
    expect(game.creatures[id]!.moves[0]!.id).toBe('focus');
    expect(game.creatures[id]!.moves).toHaveLength(4);
    expect(earnedPoints(game.creatures[id]!)).toBe(earned);
    expect(game.inventory.candy).toBe(candy);
    expect(decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game).toEqual(
      game,
    );
  });
  it('旧补偿规则的成长和已确认点数完整保留，后续升级才改用强度规则', () => {
    const species = Object.values(TRAINING_PLANS).find(
      (p) => p.potential === 'standard',
    )!.speciesId;
    const old = growthGame(species, 8);
    const id = old.party[0]!;
    const c = old.creatures[id]!;
    delete c.training!.strengthFromLevel;
    c.training!.rolls = Array.from({ length: c.level - 1 }, (_, i) =>
      growthRoll(c.training!.seed, c.speciesId, i + 2, true),
    );
    c.training!.allocated.attack = earnedPoints(c);
    const recorded = structuredClone(c.training!);
    const abilities = statsFor(c);
    const snapshot = createSnapshot(old, testEntropy, null);
    snapshot.contentVersion = 'ch10.1';
    let loaded = decodeSnapshot(JSON.stringify(snapshot)).game;
    loaded = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    expect(loaded.creatures[id]!.training!.strengthFromLevel).toBe(9);
    expect(loaded.creatures[id]!.training!.rolls).toEqual(recorded.rolls);
    expect(loaded.creatures[id]!.training!.allocated).toEqual(recorded.allocated);
    expect(statsFor(loaded.creatures[id]!)).toEqual(abilities);
    const migrated = loaded.creatures[id]!;
    gainXp(loaded, migrated, xpAt(9, SPECIES[species]!.experienceCurve) - migrated.experience);
    expect(migrated.training!.rolls.slice(0, 7)).toEqual(recorded.rolls);
    expect(migrated.training!.rolls[7]).toBe(growthRoll(recorded.seed, species, 9));
    expect(migrated.training!.allocated).toEqual(recorded.allocated);
    expect(decodeSnapshot(JSON.stringify(createSnapshot(loaded, testEntropy, null))).game).toEqual(
      loaded,
    );
    const forged = structuredClone(loaded);
    forged.creatures[id]!.training!.rolls[0] = (forged.creatures[id]!.training!.rolls[0]! % 10) + 1;
    expect(() => validateGame(forged)).toThrow(/成长记录/);
  });
  it('已确认的点数不能靠负数加点或模式切换重分配，必须实际持有并消耗重塑药剂', () => {
    let game = growthGame();
    const id = game.party[0]!;
    const points = availablePoints(game.creatures[id]!);
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: id,
      points: { ...emptyStats(), attack: points },
    });
    const committed = structuredClone(game.creatures[id]!.training!.allocated);
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: id,
      points: { ...emptyStats(), attack: -1, speed: 1 },
    });
    game = reduceGame(game, { kind: 'trainingMode', creatureId: id, mode: 'auto' });
    game = reduceGame(game, { kind: 'trainingMode', creatureId: id, mode: 'manual' });
    game = reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id });
    expect(game.creatures[id]!.training!.allocated).toEqual(committed);
    expect(availablePoints(game.creatures[id]!)).toBe(0);
    game.inventory.respec = 1;
    const rolls = [...game.creatures[id]!.training!.rolls];
    game = reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id });
    expect(game.inventory.respec).toBe(0);
    expect(game.creatures[id]!.training!.allocated).toEqual(emptyStats());
    expect(availablePoints(game.creatures[id]!)).toBe(points);
    expect(game.creatures[id]!.training!.rolls).toEqual(rolls);
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: id,
      points: { ...emptyStats(), speed: points },
    });
    expect(game.creatures[id]!.training!.allocated.speed).toBe(points);
    validateGame(game);
  });
  it('分次与连续升级得到相同记录；不消耗战斗随机流，满级 100 不再发点或吃果', () => {
    for (const curve of ['fast', 'medium_fast', 'medium_slow', 'slow']) {
      const species = ALL_SPECIES.find((s) => s.experienceCurve === curve)!;
      const game = growthGame(species.id, 1);
      const c = game.creatures[game.party[0]!]!;
      const stepped = structuredClone(game);
      const d = stepped.creatures[c.id]!;
      const rng = game.rng;
      for (let level = 2; level <= 100; level++)
        gainXp(stepped, d, xpAt(level, species.experienceCurve) - d.experience);
      gainXp(game, c, 9999999);
      expect(c.level).toBe(100);
      expect(trainingFor(c).rolls).toEqual(trainingFor(d).rolls);
      expect(trainingFor(c).rolls).toHaveLength(99);
      expect(trainingFor(c).rolls.every((n) => n >= 1 && n <= 10)).toBe(true);
      expect(game.rng).toBe(rng);
      expect(c.experience).toBe(xpAt(100, species.experienceCurve));
      const earned = earnedPoints(c);
      gainXp(game, c, 9999999);
      expect(earnedPoints(c)).toBe(earned);
      game.pending = [];
      game.inventory.candy = 1;
      const after = reduceGame(game, { kind: 'useItem', creatureId: c.id, itemId: 'candy' });
      expect(after.inventory.candy).toBe(1);
      expect(earnedPoints(after.creatures[c.id]!)).toBe(earned);
      validateGame(after);
    }
  });
  it('手动加点精确增加战斗能力；允许全部投入一项，拒绝负数、小数和超额', () => {
    let game = growthGame();
    const c = game.creatures[game.party[0]!]!;
    const before = statsFor(c);
    const amount = availablePoints(c);
    const target = makeCreature(game, 'creature_037', 8);
    const damage = calculateDamage(c, target, 'tackle').damage;
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: c.id,
      points: { ...emptyStats(), attack: amount },
    });
    expect(statsFor(game.creatures[c.id]!).attack).toBe(before.attack + amount);
    expect(calculateDamage(game.creatures[c.id]!, target, 'tackle').damage).toBeGreaterThan(damage);
    expect(availablePoints(game.creatures[c.id]!)).toBe(0);
    for (const points of [
      { ...emptyStats(), hp: 1 },
      { ...emptyStats(), hp: -1 },
      { ...emptyStats(), hp: 0.5 },
      { ...emptyStats(), hp: NaN },
    ]) {
      const after = reduceGame(game, { kind: 'allocate', creatureId: c.id, points });
      expect(after.creatures).toEqual(game.creatures);
    }
    validateGame(game);
  });
  it('体力加点保留绝对损伤，不复活昏厥伙伴；自动培养立即分配并持续处理升级', () => {
    let game = growthGame();
    const id = game.party[0]!;
    game.creatures[id]!.hp -= 5;
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: id,
      points: { ...emptyStats(), hp: 3 },
    });
    expect(statsFor(game.creatures[id]!).hp - game.creatures[id]!.hp).toBe(5);
    const fainted = structuredClone(game.creatures[id]!);
    fainted.hp = 0;
    const originalHp = fainted.hp;
    allocatePoints(fainted, { ...emptyStats(), hp: 1 });
    expect(fainted.hp).toBe(originalHp);
    game = reduceGame(game, { kind: 'trainingMode', creatureId: id, mode: 'auto' });
    expect(availablePoints(game.creatures[id]!)).toBe(0);
    const c = game.creatures[id]!;
    gainXp(game, c, xpAt(c.level + 1, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
    expect(availablePoints(c)).toBe(0);
    expect(trainingFor(c).mode).toBe('auto');
    game = reduceGame(game, { kind: 'trainingMode', creatureId: id, mode: 'manual' });
    const d = game.creatures[id]!;
    gainXp(game, d, xpAt(d.level + 1, SPECIES[d.speciesId]!.experienceCurve) - d.experience);
    expect(availablePoints(d)).toBeGreaterThan(0);
    validateGame(game);
  });
  it('进化继承全部投入与成长记录；后续每级的随机点不受暂缓进化影响', () => {
    let game = growthGame('creature_001', 16);
    const id = game.party[0]!;
    allocatePoints(game.creatures[id]!, recommendedAllocation(game.creatures[id]!));
    const training = structuredClone(game.creatures[id]!.training);
    const delayed = structuredClone(game);
    game = reduceGame(game, { kind: 'evolve', creatureId: id, toId: 'creature_002', accept: true });
    expect(game.creatures[id]!.training).toEqual(training);
    for (const g of [game, delayed]) {
      const c = g.creatures[id]!;
      gainXp(g, c, xpAt(19, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
    }
    expect(game.creatures[id]!.training!.rolls).toEqual(delayed.creatures[id]!.training!.rolls);
  });
  it('重塑只返还已分配点，不重抽、不变等级；非城镇或未恢复健康不消耗道具', () => {
    let game = growthGame();
    const id = game.party[0]!;
    game.inventory.respec = 2;
    game = reduceGame(game, { kind: 'trainingMode', creatureId: id, mode: 'auto' });
    const before = structuredClone(game.creatures[id]!);
    game.player.map = 'route';
    game.player.x = 1;
    game.player.y = 10;
    expect(
      reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id }).inventory.respec,
    ).toBe(2);
    game.player.map = 'dawn';
    game.player.x = 8;
    game.player.y = 7;
    game.creatures[id]!.hp--;
    expect(
      reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id }).inventory.respec,
    ).toBe(2);
    healParty(game);
    game = reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id });
    expect(game.inventory.respec).toBe(1);
    expect(availablePoints(game.creatures[id]!)).toBe(earnedPoints(before));
    expect(game.creatures[id]!.training!.rolls).toEqual(before.training!.rolls);
    expect(game.creatures[id]!.experience).toBe(before.experience);
    expect(game.creatures[id]!.training!.mode).toBe('manual');
    expect(
      reduceGame(game, { kind: 'useItem', itemId: 'respec', creatureId: id }).inventory.respec,
    ).toBe(1);
    validateGame(game);
  });
  it('旧存档迁移精确保留六维、损伤、等级与经验，补齐点数并冻结旧加成', () => {
    const old = growthGame('creature_033', 27);
    delete old.cityServices;
    const c = old.creatures[old.party[0]!]!;
    delete c.training;
    c.iv = Object.fromEntries(STAT_KEYS.map((k, i) => [k, i * 6])) as Stats;
    c.hp = statsFor(c).hp - 7;
    const original = statsFor(c);
    const snapshot = createSnapshot(old, testEntropy, null);
    snapshot.contentVersion = 'ch2.0';
    const loaded = decodeSnapshot(JSON.stringify(snapshot)).game;
    const migrated = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    expect(statsFor(migrated.creatures[c.id]!)).toEqual(original);
    expect(migrated.creatures[c.id]!.hp).toBe(c.hp);
    expect(migrated.creatures[c.id]!.experience).toBe(c.experience);
    expect(availablePoints(migrated.creatures[c.id]!)).toBeGreaterThan(0);
    const bonus = structuredClone(migrated.creatures[c.id]!.training!.legacyBonus);
    gainXp(
      migrated,
      migrated.creatures[c.id]!,
      xpAt(30, SPECIES[c.speciesId]!.experienceCurve) - c.experience,
    );
    expect(migrated.creatures[c.id]!.training!.legacyBonus).toEqual(bonus);
    expect(migrated.creatures[c.id]!.training!.rolls).toHaveLength(29);
    validateGame(migrated);
  });
});

describe('城市委托、补给与特殊道具兑换', () => {
  it('已开放与规划城市都有商店、三个委托和特殊兑换，不出售剧情精灵', () => {
    expect(CITIES).toHaveLength(9);
    expect(CITIES.filter((c) => c.implemented)).toHaveLength(9);
    const ids = CITIES.flatMap((c) => c.quests.map((q) => q.id));
    expect(new Set(ids).size).toBe(27);
    for (const city of CITIES) {
      expect(city.quests).toHaveLength(3);
      expect(city.stock).toEqual(
        expect.arrayContaining(['ball', 'potion', 'super_potion', 'ether']),
      );
      expect(city.exchanges.some((o) => o.itemId === 'respec')).toBe(true);
      expect(city.stock.every((id) => !id.startsWith('creature_'))).toBe(true);
    }
  });
  it('各城可购精灵球和补给：费用、库存原子结算；缺钱、满包、野外或未入门不扣钱', () => {
    for (const map of ['dawn', 'moss', 'stone', 'harbor'] as const) {
      const g = growthGame();
      g.player.map = map;
      g.player.money = 1000;
      const before = g.inventory.ball ?? 0;
      const after = reduceGame(g, { kind: 'buy', itemId: 'ball', quantity: 5 });
      expect(after.player.money).toBe(500);
      expect(after.inventory.ball).toBe(before + 5);
      for (const qty of [0, -1, 100, 1.5])
        expect(reduceGame(g, { kind: 'buy', itemId: 'ball', quantity: qty }).inventory).toEqual(
          g.inventory,
        );
    }
    const g = growthGame();
    for (const variation of ['money', 'capacity', 'location', 'opening']) {
      const b = structuredClone(g);
      if (variation === 'money') b.player.money = 0;
      if (variation === 'capacity') b.inventory.ball = 999;
      if (variation === 'location') b.player.map = 'route';
      if (variation === 'opening') b.progress.flags.catchTutorial = false;
      const next = reduceGame(b, { kind: 'buy', itemId: 'ball', quantity: 1 });
      expect(next.player.money).toBe(b.player.money);
      expect(next.inventory).toEqual(b.inventory);
    }
  });
  it('交付委托需接受、到本城、备齐物品；只结算一次，不回收精灵', () => {
    let game = growthGame();
    game.inventory.potion = 5;
    const before = structuredClone(game);
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'claim' });
    expect(game.inventory).toEqual(before.inventory);
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'accept' });
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'claim' });
    expect(game.inventory.potion).toBe(3);
    expect(game.player.money).toBe(before.player.money + 100);
    expect(game.cityServices!.merit).toBe(2);
    expect(game.creatures).toEqual(before.creatures);
    const claimed = structuredClone(game);
    for (const action of ['accept', 'claim'] as const)
      game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action });
    expect(game.cityServices).toEqual(claimed.cityServices);
    expect(game.inventory).toEqual(claimed.inventory);
    expect(game.player.money).toBe(claimed.player.money);
    const wrongCity = reduceGame(game, {
      kind: 'cityQuest',
      questId: 'stone_aid',
      action: 'accept',
    });
    expect(wrongCity.cityServices).toEqual(claimed.cityServices);
    validateGame(game);
  });
  it('奖励放不下时不收交付物；兑换需合法印记，余额与凭据严格校验', () => {
    let game = growthGame();
    game.inventory.antidote = 999;
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'accept' });
    const blocked = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'claim' });
    expect(blocked.inventory).toEqual(game.inventory);
    expect(blocked.cityServices!.quests.dawn_care).toBe('active');
    game.inventory.antidote = 0;
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_care', action: 'claim' });
    const before = structuredClone(game);
    expect(
      reduceGame(game, { kind: 'exchange', offerId: 'dawn_respec', quantity: 2 }).inventory,
    ).toEqual(game.inventory);
    expect(
      reduceGame(game, { kind: 'exchange', offerId: 'moss_respec', quantity: 1 }).inventory,
    ).toEqual(game.inventory);
    game = reduceGame(game, { kind: 'exchange', offerId: 'dawn_respec', quantity: 1 });
    expect(game.cityServices!.merit).toBe(0);
    expect(game.inventory.respec).toBe(1);
    expect(game.cityServices!.exchanges.dawn_respec).toBe(1);
    expect(game.player.money).toBe(before.player.money);
    validateGame(game);
    const forged = structuredClone(game);
    forged.cityServices!.merit++;
    expect(() => validateGame(forged)).toThrow(/印记/);
    forged.cityServices!.merit = 0;
    forged.cityServices!.quests.unknown_city_training = 'claimed';
    expect(() => validateGame(forged)).toThrow(/委托/);
  });
  it('图鉴委托允许已有普通精灵，排除初始伙伴和剧情稀有种，不要求特定徽章', () => {
    const game = growthGame();
    game.dex.caught = ['creature_001', 'creature_025', 'creature_077'];
    expect(questProgress(game, CITY_QUESTS.dawn_field!).current).toBe(0);
    game.dex.caught.push('creature_037', 'creature_040');
    expect(questProgress(game, CITY_QUESTS.dawn_field!).ready).toBe(true);
  });
  it('浓缩药和星泉露真正消耗战斗回合；无效使用不扣道具或推进回合', () => {
    let game = growthGame();
    const id = game.party[0]!;
    game.inventory.super_potion = 2;
    game.inventory.ether = 1;
    startBattle(game, null, { speciesId: 'creature_037', level: 2 });
    const same = reduceGame(game, {
      kind: 'battle',
      action: { kind: 'super_potion', creatureId: id },
    });
    expect(same.battle!.turn).toBe(1);
    expect(same.inventory.super_potion).toBe(2);
    game.creatures[id]!.hp = 1;
    game = reduceGame(game, { kind: 'battle', action: { kind: 'super_potion', creatureId: id } });
    expect(game.inventory.super_potion).toBe(1);
    expect(game.battle!.turn).toBe(2);
    expect(game.creatures[id]!.hp).toBeGreaterThan(1);
    const c = game.creatures[id]!;
    c.moves.forEach((m) => {
      m.pp = 0;
    });
    game = reduceGame(game, { kind: 'battle', action: { kind: 'ether', creatureId: id } });
    expect(game.inventory.ether).toBe(0);
    expect(game.creatures[id]!.moves.every((m) => m.pp === Math.min(10, MOVES[m.id]!.pp))).toBe(
      true,
    );
    expect(game.battle!.turn).toBe(3);
    validateGame(game);
  });
  it('本地冷读取保留手动/自动模式、分配、每级点数、委托和兑换；篡改成长总额会拒绝', async () => {
    let game = growthGame();
    const id = game.party[0]!;
    game = reduceGame(game, {
      kind: 'allocate',
      creatureId: id,
      points: { ...emptyStats(), hp: 10 },
    });
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_training', action: 'accept' });
    game = reduceGame(game, { kind: 'cityQuest', questId: 'dawn_training', action: 'claim' });
    game = reduceGame(game, { kind: 'exchange', offerId: 'dawn_candy', quantity: 1 });
    const driver = new MemoryDriver();
    const repo = new SaveRepository(driver, testEntropy);
    await repo.save(1, game, null);
    const loaded = await new SaveRepository(driver, testEntropy).load(1);
    expect(loaded!.game).toEqual(game);
    const forged = structuredClone(game);
    forged.creatures[id]!.training!.allocated.hp = 990;
    expect(() => validateGame(forged)).toThrow(/能力点/);
    forged.creatures[id]!.training!.allocated.hp = 10;
    forged.creatures[id]!.training!.rolls.push(10);
    expect(() => validateGame(forged)).toThrow(/成长记录/);
  });
});
