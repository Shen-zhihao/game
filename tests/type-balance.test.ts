import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, TYPE_CHART } from '../src/content/catalog';
import { analyzeTyping } from '../src/content/typeBalance';
import { makeCreature, typeMultiplier } from '../src/game/rules';
import { createSnapshot, decodeSnapshot } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

describe('全图鉴属性组合的收益与反制', () => {
  it('250种精灵都有弱点和抗性，附加属性有收益，实际弱点不超过4倍', () => {
    for (const species of ALL_SPECIES) {
      const profile = analyzeTyping(species.types);
      expect(profile.issues, `${species.name} ${species.types.join('/')}`).toEqual([]);
      expect(profile.weaknesses.length).toBeGreaterThan(0);
      expect(profile.resistances.length).toBeGreaterThan(0);
      for (const entry of profile.benefits)
        expect(entry.defensive.length + entry.offensive.length).toBeGreaterThan(0);
    }
  });
  it('能识别无弱点与极端累乘组合，同时保留标准免疫和通用计算', () => {
    expect(analyzeTyping(['water', 'bug', 'dragon', 'steel']).issues).toContain(
      '没有可被克制的属性弱点',
    );
    expect(analyzeTyping(['rock', 'poison', 'fire', 'steel']).issues).toContain('弱点叠乘超过4倍');
    expect(typeMultiplier('ground', ['rock', 'poison', 'fire', 'steel'])).toBe(16);
    expect(typeMultiplier('electric', ['water', 'flying', 'ground'])).toBe(0);
    expect(TYPE_CHART.ice.grass).toBe(2);
  });
  it('旧版本精灵保留已有招式、身份、经验与培养记录，改用当前组合', () => {
    const g = fixture();
    const c = makeCreature(g, 'creature_178', 40);
    c.moves = [
      { id: 'rock_1', pp: 25 },
      { id: 'poison_2', pp: 15 },
      { id: 'fire_2', pp: 15 },
      { id: 'steel_2', pp: 15 },
    ];
    g.creatures[c.id] = c;
    g.box.push(c.id);
    g.dex.seen.push(c.speciesId);
    g.dex.caught.push(c.speciesId);
    const snapshot = createSnapshot(g, testEntropy, null);
    snapshot.contentVersion = 'ch10.3';
    expect(decodeSnapshot(JSON.stringify(snapshot)).game.creatures[c.id]).toEqual(c);
  });
});
