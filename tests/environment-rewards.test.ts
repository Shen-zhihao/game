import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, ITEMS, learnset, MOVES } from '../src/content/catalog';
import { CITIES, shopStock } from '../src/content/cities';
import { MAPS, terrainPassable } from '../src/content/world';
import { battleActionReason, startBattle } from '../src/game/battle';
import {
  BALLS,
  captureDifficulty,
  grantMasterBall,
  MASTER_BALL_SOURCES,
} from '../src/game/capture';
import { hitChance, roundPace } from '../src/game/combat';
import { reduceGame } from '../src/game/engine';
import {
  ecologyMultiplier,
  strengthEncounterMultiplier,
  travelProfile,
  WEATHER,
  weatherAt,
  weatherStat,
  weightedEcology,
} from '../src/game/environment';
import { atCenter, canSurf, FIELD_SKILLS } from '../src/game/fieldSkills';
import { GameState, MapId, WeatherId } from '../src/game/model';
import { knockoutReward } from '../src/game/rewards';
import {
  calculateDamage,
  captureChance,
  effectiveStat,
  makeCreature,
  statsFor,
  xpAt,
} from '../src/game/rules';
import { copyMoveReason } from '../src/game/skills';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { playableCoast } from './coast-helpers';
import { fixture, testEntropy } from './helpers';

const cold = (g: GameState) =>
  decodeSnapshot(JSON.stringify(createSnapshot(g, testEntropy, null))).game;
const act = (g: GameState, index = 0) => {
  const next = reduceGame(g, { kind: 'battle', action: { kind: 'move', index } });
  validateGame(next);
  return next;
};
function duel(event: 'forestGuard' | 'leader' | null = null) {
  const game = fixture();
  game.progress.flags.rival = game.progress.flags.catchTutorial = true;
  const c = makeCreature(game, 'creature_004', 50, true);
  c.moves = [{ id: 'tackle', pp: 35 }];
  game.creatures = { [c.id]: c };
  game.party = [c.id];
  game.dex = { seen: [c.speciesId], caught: [c.speciesId] };
  if (event === 'leader')
    Object.assign(game.progress.flags, {
      gymScout: true,
      gymKeeper: true,
      gymSwitchOne: true,
      gymSwitchTwo: true,
    });
  startBattle(game, event, event ? undefined : { speciesId: 'creature_037', level: 10 });
  for (const e of game.battle!.enemies) {
    e.hp = 1;
    e.moves = [{ id: 'growl', pp: MOVES.growl!.pp }];
  }
  game.battle!.aiMove = 0;
  return game;
}
function weatherDuel(weather: WeatherId): GameState {
  const g = duel();
  const c = g.creatures[g.party[0]!]!;
  c.moves = ['guard', 'rain_call', 'recover'].map((id) => ({ id, pp: MOVES[id]!.pp }));
  const e = g.battle!.enemies[0]!;
  e.hp = statsFor(e).hp;
  e.moves = [{ id: 'guard', pp: MOVES.guard!.pp }];
  g.battle!.weather = { kind: weather, ambient: weather, turns: null };
  return g;
}

describe('逐只击败结算与高等级成长', () => {
  it('第一只倒下立即入账，冷读取后继续第二只，结算页与关闭不重复发奖', () => {
    let g = duel('forestGuard');
    const first = knockoutReward(g.battle!, g.battle!.enemies[0]!);
    const money = g.player.money,
      xp = g.creatures[g.party[0]!]!.experience;
    g = act(g);
    expect(g.battle!.phase).toBe('choose');
    expect(g.battle!.enemyIndex).toBe(1);
    expect(g.player.money).toBe(money + first.money);
    expect(g.creatures[g.party[0]!]!.experience).toBe(xp + first.experience);
    expect(g.battle!.rewards!.defeated).toHaveLength(1);
    g = cold(g);
    const previous = g.battle!.rewards!.experience;
    const second = knockoutReward(g.battle!, g.battle!.enemies[1]!);
    g = act(g);
    expect(g.battle!.result).toBe('win');
    expect(g.battle!.rewards!.experience).toBe(previous + second.experience);
    const paid = cold(g);
    expect(act(paid).player.money).toBe(paid.player.money);
    expect(reduceGame(paid, { kind: 'closeBattle' }).creatures).toEqual(paid.creatures);
  });
  it('同种同级的馆主 > NPC > 野怪；道馆胜利另给经验、阶梯金币和道具', () => {
    const g = duel();
    const b = g.battle!,
      enemy = b.enemies[0]!;
    const wild = knockoutReward(b, enemy);
    const npc = knockoutReward({ ...b, kind: 'trainer', event: 'forestGuard' }, enemy);
    const leader = knockoutReward({ ...b, kind: 'trainer', event: 'leader' }, enemy);
    expect(leader.experience).toBeGreaterThan(npc.experience);
    expect(npc.experience).toBeGreaterThan(wild.experience);
    expect(leader.money).toBeGreaterThan(npc.money);
    expect(npc.money).toBeGreaterThan(wild.money);
    let gym = duel('leader');
    const total = gym.battle!.enemies.reduce(
      (n, e) => n + knockoutReward(gym.battle!, e).experience,
      0,
    );
    while (gym.battle!.phase !== 'ended') gym = act(gym);
    expect(gym.progress.badges).toBe(1);
    expect(gym.battle!.rewards!.experience).toBeGreaterThan(total);
    expect(gym.inventory.ultra_ball).toBe(2);
    expect(gym.inventory.candy).toBe(2);
    expect(gym.battle!.logs.some((l) => l.includes('第 1 枚徽章额外奖励'))).toBe(true);
  });
  it('逃跑不发金币；战败也保留已经结算的击败记录，满级不溢出', () => {
    let g = duel();
    const before = g.player.money;
    g.battle!.runAttempts = 2;
    g = reduceGame(g, { kind: 'battle', action: { kind: 'run' } });
    expect(g.player.money).toBe(before);
    expect(g.battle!.rewards!.experience).toBe(0);
    let trainer = act(duel('forestGuard'));
    const rewardXp = trainer.creatures[trainer.party[0]!]!.experience;
    trainer.creatures[trainer.party[0]!]!.hp = 1;
    trainer.creatures[trainer.party[0]!]!.moves = [{ id: 'growl', pp: MOVES.growl!.pp }];
    trainer.battle!.enemies[1]!.hp = statsFor(trainer.battle!.enemies[1]!).hp;
    trainer.battle!.enemies[1]!.moves = [{ id: 'tackle', pp: 35 }];
    trainer.battle!.aiMove = 0;
    trainer = act(trainer);
    expect(trainer.battle!.result).toBe('lose');
    expect(trainer.creatures[trainer.party[0]!]!.experience).toBe(rewardXp);
    expect(cold(trainer).battle!.rewards!.defeated).toHaveLength(1);
  });
  it('四条曲线后期所需经验远大于前期，100 级封顶不变', () => {
    for (const curve of ['fast', 'medium_fast', 'medium_slow', 'slow'] as const) {
      expect(xpAt(91, curve) - xpAt(90, curve)).toBeGreaterThan(
        (xpAt(11, curve) - xpAt(10, curve)) * 30,
      );
      expect(xpAt(101, curve)).toBe(xpAt(100, curve));
    }
  });
  it('旧战斗已通过的敌人不会补发，伪造或重复击败记录被拒绝', () => {
    let g = act(duel('forestGuard'));
    delete g.battle!.rewards;
    const before = g.player.money;
    g = act(cold(g));
    expect(g.battle!.rewards!.defeated).toHaveLength(2);
    expect(g.player.money - before).toBeLessThan(1000);
    const bad = structuredClone(g);
    bad.battle!.rewards!.defeated.push(bad.battle!.rewards!.defeated[0]!);
    expect(() => validateGame(bad)).toThrow(/结算/);
  });
});

describe('旧战斗迁移的捕获与逃跑', () => {
  it('ch3.0 无天气和限量球账本的旧档保留原队伍，首次推进补齐独立环境', () => {
    const g = fixture();
    delete g.environment;
    delete g.masterBalls;
    const snapshot = createSnapshot(g, testEntropy, null);
    snapshot.contentVersion = 'ch3.0';
    const loaded = decodeSnapshot(JSON.stringify(snapshot)).game;
    expect(loaded.creatures).toEqual(g.creatures);
    expect(loaded.environment).toBeUndefined();
    const next = reduceGame(loaded, { kind: 'tick', seconds: 1 });
    expect(next.environment!.weather).toBe('clear');
    expect(next.rng).toBe(g.rng);
    expect(next.masterBalls).toEqual({ claimed: [], used: 0 });
    validateGame(next);
  });
  it('没有奖励字段的旧档不会把活着的对手记成击败', () => {
    for (const result of ['caught', 'escaped'] as const) {
      let g = duel();
      delete g.battle!.rewards;
      g.battle!.tutorialCatch = result === 'caught';
      g.battle!.runAttempts = 2;
      g = reduceGame(cold(g), {
        kind: 'battle',
        action: result === 'caught' ? { kind: 'ball' } : { kind: 'run' },
      });
      expect(g.battle!.result).toBe(result);
      expect(g.battle!.rewards!.defeated).toEqual([]);
      validateGame(cold(g));
    }
  });
});
describe('天气、地形和战斗场地', () => {
  it('天气独立随机、暂停冻结、3–6 分钟轮换，存读后走势一致', () => {
    const g = fixture();
    g.environment!.remaining = 1;
    const rng = g.rng;
    const next = reduceGame(g, { kind: 'tick', seconds: 1 });
    expect(next.environment!.weather).not.toBe('clear');
    expect(next.environment!.remaining).toBeGreaterThanOrEqual(180);
    expect(next.environment!.remaining).toBeLessThanOrEqual(360);
    expect(next.rng).toBe(rng);
    expect(reduceGame(cold(g), { kind: 'tick', seconds: 1 }).environment).toEqual(next.environment);
    startBattle(g, null, { speciesId: 'creature_037', level: 5 });
    expect(reduceGame(g, { kind: 'tick', seconds: 10 }).environment).toEqual(g.environment);
    g.battle = null;
    g.player.map = 'gym';
    g.player.x = 6;
    g.player.y = 8;
    expect(weatherAt(g)).toBe('clear');
    expect(reduceGame(g, { kind: 'tick', seconds: 10 }).environment).toEqual(g.environment);
  });
  it('偏好天气只改变已有物种权重；强种、进化型和低捕获率种更稀有', () => {
    expect(ecologyMultiplier('creature_007', 'rain')).toBeGreaterThan(
      ecologyMultiplier('creature_004', 'rain'),
    );
    const entries = [
      { speciesId: 'creature_007', weight: 20 },
      { speciesId: 'creature_004', weight: 20 },
    ];
    expect(weightedEcology(entries, 'rain').map((e) => e.speciesId)).toEqual(
      entries.map((e) => e.speciesId),
    );
    expect(strengthEncounterMultiplier('creature_003')).toBeLessThan(
      strengthEncounterMultiplier('creature_001'),
    );
    expect(captureDifficulty('creature_003', 60)).toBeLessThan(
      captureDifficulty('creature_001', 5),
    );
  });
  it('道路、桥梁、草丛、碎石、沙滩与渡水步速不同，动画和输入保持间隔', () => {
    const g = fixture();
    const find = (map: MapId, char: string) => {
      g.player.map = map;
      const y = MAPS[map].rows.findIndex((r) => r.includes(char));
      return travelProfile(g, MAPS[map].rows[y]!.indexOf(char), y);
    };
    const road = find('route', ':');
    const grass = find('route', 'g');
    expect(road.speed).toBe(1);
    expect(grass.speed).toBeLessThan(road.speed);
    expect(find('stoneRoute', '.').terrain).toBe('gravel');
    expect(find('coastRoute', '.').terrain).toBe('sand');
    expect(find('tideworks', 'W').terrain).toBe('water');
    g.environment!.weather = 'rain';
    expect(find('route', 'g').speed).toBeLessThan(grass.speed);
    expect(find('coastRoute', '=').speed).toBe(1);
    for (const weather of Object.keys(WEATHER) as WeatherId[]) {
      g.environment!.weather = weather;
      const p = find('route', 'g');
      expect(p.speed).toBeGreaterThanOrEqual(0.5);
      expect(p.duration).toBeLessThan(p.interval);
      expect(terrainPassable('route', 4, 2, {})).toBe(true);
    }
  });
  it('天气伤害、特防／防御、速度与命中生效，免疫关系和自身强化保持不变', () => {
    const g = fixture();
    const fire = makeCreature(g, 'creature_004', 40);
    const water = makeCreature(g, 'creature_007', 40);
    const rock = makeCreature(g, ALL_SPECIES.find((s) => s.types.includes('rock'))!.id, 40);
    const iceId = ALL_SPECIES.find((s) => s.types.includes('ice'))!.id;
    const ice = makeCreature(g, iceId, 40);
    const damage = (w: WeatherId) =>
      calculateDamage(fire, water, 'fire_2', {}, {}, 1, false, w).damage;
    expect(damage('sun')).toBeGreaterThan(damage('clear'));
    expect(damage('rain')).toBeLessThan(damage('clear'));
    expect(weatherStat(rock, 'specialDefense', 'sand')).toBe(1.5);
    expect(weatherStat(ice, 'defense', 'snow')).toBe(1.5);
    expect(effectiveStat(water, 'speed', {}, 'rain')).toBeGreaterThan(
      effectiveStat(water, 'speed', {}),
    );
    expect(roundPace(water, fire, {}, {}, 'rain').playerSpeed).toBe(
      effectiveStat(water, 'speed', {}, 'rain'),
    );
    expect(hitChance('tackle', {}, {}, 'fog')).toBe(0.85);
    expect(hitChance('guard', {}, {}, 'fog')).toBe(1);
    expect(hitChance('ghost_1', {}, {}, 'fog')).toBe(1);
    const ghost = makeCreature(g, 'creature_025', 40);
    expect(calculateDamage(fire, ghost, 'tackle', {}, {}, 1, true, 'sun').damage).toBe(0);
  });
  it('天气技能覆盖五轮再恢复原天气，冷读保留期限；扬沙每轮只扣一次', () => {
    let g = weatherDuel('sun');
    g = act(g, 1);
    expect(g.battle!.weather).toEqual({ kind: 'rain', ambient: 'sun', turns: 4 });
    g = cold(g);
    for (let i = 0; i < 4; i++) g = act(g);
    expect(g.battle!.weather).toEqual({ kind: 'sun', ambient: 'sun', turns: null });
    let sand = weatherDuel('sand');
    const before = sand.creatures[sand.party[0]!]!.hp;
    sand = act(sand);
    expect(before - sand.creatures[sand.party[0]!]!.hp).toBe(
      Math.max(1, Math.floor(statsFor(sand.creatures[sand.party[0]!]!).hp / 16)),
    );
  });
});

describe('剧情技能、精灵中心、大师球与开放路线', () => {
  it.each(['great_ball', 'ultra_ball'] as const)(
    '%s 投球只扣所选球，捕获不会给新入队精灵奖励自身经验',
    (ballId) => {
      let g = duel();
      g.battle!.tutorialCatch = true;
      g.inventory[ballId] = 2;
      const enemy = structuredClone(g.battle!.enemies[0]!);
      const normalBalls = g.inventory.ball;
      const money = g.player.money;
      g = reduceGame(g, { kind: 'battle', action: { kind: 'ball', ballId } });
      expect(g.battle!.result).toBe('caught');
      expect(g.inventory[ballId]).toBe(1);
      expect(g.inventory.ball).toBe(normalBalls);
      expect(g.player.money).toBe(money);
      expect(g.creatures[enemy.id]!.experience).toBe(enemy.experience);
      expect(g.battle!.rewards!.defeated).toEqual([]);
      validateGame(cold(g));
    },
  );
  it('每座城市中心都能恢复／遗忘／重学，锁定剧情技能不能先学或复刻', () => {
    let g = playableCoast().game;
    for (const map of ['dawn', 'moss', 'stone', 'harbor'] as const) {
      const healer = MAPS[map].npcs.find((n) => n.role === 'healer')!;
      g.player.map = map;
      const adjacent = [
        [0, 1],
        [1, 0],
        [-1, 0],
        [0, -1],
      ].find(
        ([dx, dy]) =>
          terrainPassable(map, healer.x + dx!, healer.y + dy!, g.progress.flags) &&
          !MAPS[map].npcs.some((n) => n.x === healer.x + dx! && n.y === healer.y + dy!),
      )!;
      g.player.x = healer.x + adjacent[0]!;
      g.player.y = healer.y + adjacent[1]!;
      expect(atCenter(g)).toBe(true);
      const id = g.party[0]!;
      g.creatures[id]!.hp = 0;
      g.creatures[id]!.status = 'poison';
      g.creatures[id]!.moves[0]!.pp = 0;
      g = reduceGame(g, { kind: 'centerHeal' });
      expect(g.creatures[id]!.hp).toBe(statsFor(g.creatures[id]!).hp);
      expect(g.creatures[id]!.status).toBeNull();
      expect(g.creatures[id]!.moves[0]!.pp).toBe(MOVES[g.creatures[id]!.moves[0]!.id]!.pp);
      expect(g.player.healMap).toBe(map);
      if (g.creatures[id]!.moves.some((m) => m.id === 'surf'))
        g = reduceGame(g, { kind: 'centerForget', creatureId: id, moveId: 'surf' });
      g = reduceGame(g, {
        kind: 'centerLearn',
        creatureId: id,
        moveId: 'surf',
        replace: g.creatures[id]!.moves.length === 4 ? 0 : null,
      });
      expect(g.creatures[id]!.moves.some((m) => m.id === 'surf')).toBe(true);
      g = reduceGame(g, { kind: 'centerForget', creatureId: id, moveId: 'surf' });
      expect(g.creatures[id]!.moves.some((m) => m.id === 'surf')).toBe(false);
      g = reduceGame(g, { kind: 'centerLearn', creatureId: id, moveId: 'surf', replace: null });
      expect(g.creatures[id]!.moves.some((m) => m.id === 'surf')).toBe(true);
      validateGame(cold(g));
    }
    const locked = fixture();
    Object.assign(locked.player, { x: 5, y: 13 });
    const id = locked.party[0]!;
    const before = structuredClone(locked.creatures[id]);
    expect(
      reduceGame(locked, { kind: 'centerLearn', creatureId: id, moveId: 'surf', replace: 0 })
        .creatures[id],
    ).toEqual(before);
    locked.inventory.skill_copy = 1;
    locked.creatures[id]!.moves[0] = { id: 'surf', pp: 15 };
    expect(copyMoveReason(locked, id, id, 'surf', 1)).toContain('剧情');
    expect(
      FIELD_SKILLS.every(
        (s) => !ALL_SPECIES.some((sp) => learnset(sp.id).some((m) => m.moveId === s.id)),
      ),
    ).toBe(true);
  });
  it('冲浪来自独立灯塔支线，替换或入库最后一个冲浪不会把旅人困在水上', () => {
    let g = playableCoast().game;
    // Test this field permission independently of the already completed gym.
    g.progress.flags.waterRig = false;
    g.progress.flags.waterLeader = false;
    g.progress.badges--;
    g.progress.chapter--;
    const id = g.party[0]!;
    g.creatures[id]!.moves[0] = { id: 'surf', pp: 15 };
    g.creatures[id]!.taughtMoves = [...new Set([...(g.creatures[id]!.taughtMoves ?? []), 'surf'])];
    g.player.map = 'harbor';
    const y = MAPS.harbor.rows.findIndex((r) => r.includes('~'));
    g.player.y = y;
    g.player.x = MAPS.harbor.rows[y]!.indexOf('~');
    expect(canSurf(g)).toBe(true);
    validateGame(g);
    expect(reduceGame(g, { kind: 'box', creatureId: id, withdraw: false }).party).toContain(id);
    g.inventory.skill_copy = 1;
    const source = g.party.find((other) => other !== id)!;
    expect(copyMoveReason(g, source, id, g.creatures[source]!.moves[0]!.id, 0)).toContain('岸上');
    const bad = structuredClone(g);
    bad.creatures[id]!.moves = [{ id: 'tackle', pp: 35 }];
    expect(() => validateGame(bad)).toThrow(/渡水/);
  });
  it('普通／超级／高级球阶梯提升；大师球必定捕获已解锁剧情精灵，NPC 不能抓', () => {
    let g = playableCoast().game;
    expect(g.inventory.master_ball).toBe(1);
    const rare = makeCreature(g, 'creature_099', 90);
    expect(captureChance(rare, BALLS.ultra_ball.multiplier)).toBeGreaterThan(
      captureChance(rare, BALLS.great_ball.multiplier),
    );
    expect(captureChance(rare, BALLS.great_ball.multiplier)).toBeGreaterThan(captureChance(rare));
    expect(g.progress.flags.tideAwakened).not.toBe(true);
    // Start the unlocked story encounter through the same story event preparation used by its NPC.
    g.progress.flags.tideAwakened = true;
    startBattle(g, 'tideEncounter', { speciesId: 'creature_099', level: 16 });
    g = reduceGame(g, { kind: 'battle', action: { kind: 'ball', ballId: 'master_ball' } });
    expect(g.battle!.result).toBe('caught');
    expect(g.progress.flags.tideCaught).toBe(true);
    expect(g.inventory.master_ball).toBe(0);
    expect(g.masterBalls!.used).toBe(1);
    validateGame(cold(g));
    const npc = duel('forestGuard');
    npc.inventory.master_ball = 1;
    expect(battleActionReason(npc, { kind: 'ball', ballId: 'master_ball' })).toContain('训练师');
  });
  it('全篇三处限量来源按各自剧情解锁；商店、兑换和随机物品都不能发大师球', () => {
    const g = playableCoast().game;
    expect(MASTER_BALL_SOURCES).toHaveLength(3);
    expect(g.masterBalls!.claimed).toEqual(['harbor_report']);
    expect(grantMasterBall(g, 'harbor_report')).toBe(false);
    expect(grantMasterBall(g, 'league_research')).toBe(false);
    for (const c of CITIES) {
      expect(c.stock).not.toContain('master_ball');
      expect(c.exchanges.every((o) => o.itemId !== 'master_ball')).toBe(true);
      if (c.map) {
        g.player.map = c.map;
        expect(shopStock(g)).not.toContain('master_ball');
      }
    }
    expect(Object.values(g.world!.finds).every((f) => f.itemId !== 'master_ball')).toBe(true);
    expect(ITEMS.master_ball!.price).toBe(0);
    const bad = structuredClone(g);
    bad.inventory.master_ball = 2;
    expect(() => validateGame(bad)).toThrow(/大师球/);
    const duplicate = structuredClone(g);
    duplicate.masterBalls!.claimed.push('harbor_report');
    duplicate.inventory.master_ball = 2;
    expect(() => validateGame(duplicate)).toThrow(/大师球/);
  });
});
