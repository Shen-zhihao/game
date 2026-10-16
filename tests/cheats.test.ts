import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, ITEMS } from '../src/content/catalog';
import { bagInventory, KEY_ITEMS } from '../src/content/keyItems';
import { MAPS, terrainPassable } from '../src/content/world';
import { shopStock } from '../src/content/cities';
import { CHEAT_CODES, CREATURE_CHEAT_CODES, ITEM_CHEAT_CODES } from '../src/game/cheats';
import { newGame, reduceGame } from '../src/game/engine';
import { makeCreature } from '../src/game/rules';
import { startBattle } from '../src/game/battle';
import { consumeMasterBall } from '../src/game/capture';
import { playableCoast } from './coast-helpers';
import { canSurf } from '../src/game/fieldSkills';
import { createSnapshot, decodeSnapshot, validateGame } from '../src/persistence/snapshot';
import { fixture, PlayerBot, testEntropy } from './helpers';

const cold = (game: ReturnType<typeof fixture>) =>
  decodeSnapshot(JSON.stringify(createSnapshot(game, testEntropy, null))).game;
describe('统一金手指与重要物品', () => {
  it('普通物品通过数字指令反复领取可用，首尾空白兼容，真实存档冷读保留', () => {
    let g = reduceGame(fixture(), { kind: 'cheat', code: '  301  ' });
    g = reduceGame(g, { kind: 'cheat', code: '301' });
    expect(g.inventory.candy).toBe(198);
    expect(g.cheats!.redemptions).toBe(2);
    const c = g.creatures[g.party[0]!]!;
    const level = c.level;
    g = reduceGame(g, { kind: 'useItem', itemId: 'candy', creatureId: c.id });
    expect(g.creatures[c.id]!.level).toBe(level + 1);
    expect(g.inventory.candy).toBe(197);
    expect(cold(g)).toEqual(g);
  });
  it('无效代码、满背包和成长未结算都不领取', () => {
    const g = fixture();
    for (const code of [
      '999',
      '0301',
      '3 01',
      '3.01',
      '3e2',
      '３０１',
      'STG-CANDY-99',
      '301\n302',
      '',
    ]) {
      const invalid = reduceGame(g, { kind: 'cheat', code });
      expect(invalid.inventory).toEqual(g.inventory);
      expect(invalid.cheats).toBeUndefined();
      expect(invalid.notice).toMatch(/数字指令/);
    }
    const full = structuredClone(g);
    full.inventory.potion = 950;
    const rejected = reduceGame(full, { kind: 'cheat', code: '201' });
    expect(rejected.inventory.potion).toBe(950);
    expect(rejected.cheats).toBeUndefined();
    g.pending.push({ kind: 'move', creatureId: g.party[0]!, moveId: 'focus' });
    expect(reduceGame(g, { kind: 'cheat', code: '301' }).inventory).toEqual(g.inventory);
  });
  it('大师球额外授予与使用超过三枚后仍可正常读档，剧情三枚独立计算', () => {
    let g = reduceGame(fixture(), { kind: 'cheat', code: '105' });
    for (let i = 0; i < 4; i++) expect(consumeMasterBall(g)).toBe(true);
    expect(g.masterBalls).toEqual({ claimed: [], used: 0 });
    expect(g.cheats).toEqual({ redemptions: 1, masterBallsGranted: 10, masterBallsUsed: 4 });
    g.progress.flags.rival = g.progress.flags.catchTutorial = true;
    startBattle(g, null, { speciesId: 'creature_037', level: 2 });
    g = reduceGame(g, { kind: 'battle', action: { kind: 'ball', ballId: 'master_ball' } });
    expect(g.battle!.result).toBe('caught');
    expect(g.inventory.master_ball).toBe(5);
    expect(g.cheats!.masterBallsUsed).toBe(5);
    expect(cold(g)).toEqual(g);
    const bad = structuredClone(g);
    bad.cheats!.masterBallsUsed--;
    expect(() => validateGame(bad)).toThrow(/大师球/);
  });
  it('金手指不会占掉未领取剧情球的位置，也不能在训练师对战中拿球或捕获伙伴', () => {
    let g = fixture();
    for (let i = 0; i < 10; i++) g = reduceGame(g, { kind: 'cheat', code: '106' });
    expect(g.inventory.master_ball).toBe(990);
    const limit = reduceGame(g, { kind: 'cheat', code: '105' });
    expect(limit.inventory.master_ball).toBe(990);
    expect(limit.cheats!.redemptions).toBe(10);
    startBattle(g, 'rival');
    expect(reduceGame(g, { kind: 'cheat', code: '104' }).inventory.master_ball).toBe(990);
    expect(
      reduceGame(g, { kind: 'battle', action: { kind: 'ball', ballId: 'master_ball' } }).inventory
        .master_ball,
    ).toBe(990);
  });
  it('剧情球与金手指球混合持有时先用额外来源，两份账本和旧版本都可继续读取', () => {
    let g = playableCoast().game;
    g = reduceGame(g, { kind: 'cheat', code: '104' });
    expect(g.inventory.master_ball).toBe(2);
    consumeMasterBall(g);
    expect(g.cheats!.masterBallsUsed).toBe(1);
    expect(g.masterBalls!.used).toBe(0);
    consumeMasterBall(g);
    expect(g.masterBalls!.used).toBe(1);
    expect(cold(g)).toEqual(g);
    const previous = createSnapshot(fixture(), testEntropy, null);
    previous.contentVersion = 'ch10.0';
    expect(decodeSnapshot(JSON.stringify(previous)).game.cheats).toBeUndefined();
  });
  it('渡水关键道具可实际下水并保存在水面，不授予徽章或跳过主线', () => {
    let g = fixture();
    expect(canSurf(g)).toBe(false);
    const before = structuredClone(g.progress);
    g = reduceGame(g, { kind: 'cheat', code: '503' });
    expect(canSurf(g)).toBe(true);
    expect(g.progress).toEqual(before);
    const map = MAPS.dawn;
    let spot: [number, number] | undefined;
    for (let y = 0; y < map.rows.length; y++)
      for (let x = 1; x < map.rows[y]!.length; x++) {
        if (
          map.rows[y]![x] === '~' &&
          terrainPassable('dawn', x - 1, y, {}) &&
          !map.npcs.some((n) => n.x === x - 1 && n.y === y)
        )
          spot = [x - 1, y];
      }
    expect(spot).toBeDefined();
    [g.player.x, g.player.y] = spot!;
    g = reduceGame(g, { kind: 'walk', direction: 'right' });
    expect(map.rows[g.player.y]![g.player.x]).toBe('~');
    expect(cold(g)).toEqual(g);
    expect(reduceGame(g, { kind: 'cheat', code: '503' }).cheats!.redemptions).toBe(1);
  });
  it('全部关键物品仅持有一份，能从重要物品袋看到且不会进入城市商店', () => {
    let g = fixture();
    g.progress.flags.rival = g.progress.flags.catchTutorial = true;
    for (const item of KEY_ITEMS) {
      g = reduceGame(g, { kind: 'cheat', code: item.code });
      expect(bagInventory(g)[item.id]).toBe(1);
      expect(ITEMS[item.id]!.pocket).toBe('key');
      expect(shopStock(g)).not.toContain(item.id);
    }
    expect(cold(g).progress.badges).toBe(0);
    const bad = structuredClone(g);
    bad.inventory.key_water_rig = 2;
    expect(() => validateGame(bad)).toThrow(/重要物品/);
  });
  it('提前领取的碎岩工具可实际清理捷径，存档保留但不会授予砾岩徽章', () => {
    let g = reduceGame(fixture(), { kind: 'cheat', code: '502' });
    Object.assign(g.player, { map: 'stoneRoute', x: 16, y: 11, facing: 'right' });
    g = reduceGame(g, { kind: 'interact' });
    expect(g.progress.flags.foothillRock).toBe(true);
    expect(g.progress.flags.rockLeader).not.toBe(true);
    expect(cold(g)).toEqual(g);
  });
  it('开场补给发放时即使已有接近满袋的金手指球也不会损坏剧情存档', () => {
    const bot = new PlayerBot('creature_001', 789, true);
    for (let i = 0; i < 10; i++) bot.act({ kind: 'cheat', code: '101' });
    expect(bot.game.inventory.ball).toBe(990);
    bot.npc('rival');
    bot.portal('route');
    bot.npc('professorBag');
    bot.act({ kind: 'chooseStarter', speciesId: 'creature_001' });
    bot.battle();
    bot.dismiss();
    bot.portal('route');
    bot.npc('routeRival');
    bot.dismiss();
    expect(bot.game.progress.flags.fieldKitReceived).toBe(true);
    expect(bot.game.inventory.ball).toBe(999);
    expect(cold(bot.game)).toEqual(bot.game);
  });
  it('项目 Markdown 包含每个实际生效代码，没有重复代码或未知道具', () => {
    const guide = readFileSync('docs/金手指/金手指代码.md', 'utf8');
    expect(new Set(CHEAT_CODES.map((e) => e.code)).size).toBe(CHEAT_CODES.length);
    expect([...new Set(ITEM_CHEAT_CODES.map((e) => e.itemId))].sort()).toEqual(
      Object.keys(ITEMS).sort(),
    );
    for (const entry of ITEM_CHEAT_CODES) {
      expect(entry.code).toMatch(/^[1-5]\d{2}$/);
      expect(guide).toContain(entry.code);
      expect(ITEMS[entry.itemId]).toBeDefined();
    }
    expect(CREATURE_CHEAT_CODES).toHaveLength(250);
    for (const entry of CREATURE_CHEAT_CODES) {
      expect(entry.code).toMatch(/^6\d{3}$/);
      expect(guide).toContain(`\`${entry.code}\``);
    }
  });
  it('250个固定代码分别获得对应精灵，正式图鉴与冷读记录一致', () => {
    for (const species of ALL_SPECIES) {
      const entry = CREATURE_CHEAT_CODES.find((item) => item.speciesId === species.id)!;
      const g = reduceGame(fixture(), { kind: 'cheat', code: ` ${entry.code} ` });
      const creature = g.creatures[g.party.at(-1)!]!;
      expect(creature.speciesId).toBe(species.id);
      expect(creature.level).toBe(5);
      expect(creature.moves.length).toBeGreaterThan(0);
      expect(g.dex.caught).toContain(species.id);
      expect(g.dex.seen).toContain(species.id);
      expect(cold(g)).toEqual(g);
    }
  });
  it('同一代码可重复获得独立个体，队伍满后入仓，双满时不消耗序号或领取次数', () => {
    let g = fixture();
    for (let i = 0; i < 6; i++) g = reduceGame(g, { kind: 'cheat', code: '6250' });
    expect(g.party).toHaveLength(6);
    expect(g.box).toHaveLength(1);
    expect(new Set([...g.party, ...g.box]).size).toBe(7);
    expect(g.creatures[g.box[0]!]!.speciesId).toBe('creature_250');
    expect(cold(g)).toEqual(g);
    while (g.box.length < 360) {
      const c = makeCreature(g, 'creature_037', 5);
      g.creatures[c.id] = c;
      g.box.push(c.id);
    }
    g.dex.seen.push('creature_037');
    g.dex.caught.push('creature_037');
    const before = structuredClone(g);
    g = reduceGame(g, { kind: 'cheat', code: '6001' });
    expect(g.notice).toMatch(/都已满/);
    expect(g.sequence).toBe(before.sequence);
    expect(g.cheats).toEqual(before.cheats);
    expect(g.creatures).toEqual(before.creatures);
    expect(cold(g)).toEqual(g);
  });
  it('获得精灵不跳过序章救援、不授予剧情标记，忙碌与非法代码不会领取', () => {
    const opening = newGame('测试', 0, null, 123);
    opening.dialogue = null;
    const blocked = reduceGame(opening, { kind: 'cheat', code: '6250' });
    expect(blocked.party).toHaveLength(0);
    expect(blocked.cheats).toBeUndefined();
    expect(blocked.notice).toMatch(/博士救援/);
    const original = fixture();
    const received = reduceGame(original, { kind: 'cheat', code: '6250' });
    expect(received.progress).toEqual(original.progress);
    for (const code of ['6000', '6251', '06001', '６００１', '6e03']) {
      const rejected = reduceGame(original, { kind: 'cheat', code });
      expect(rejected.creatures).toEqual(original.creatures);
      expect(rejected.cheats).toBeUndefined();
    }
  });
});
