import { describe, expect, it } from 'vitest';
import design from '../docs/精灵属性/精灵设计数据.json';
import acquisition from '../docs/精灵获取/稀有精灵获取.json';
import { ALL_SPECIES, learnset, MOVES, SPECIES, TYPE_IDS } from '../src/content/catalog';
import { SIGNATURE_BY_SPECIES } from '../src/content/signatures';
import { TRAINING_PLANS } from '../src/content/training';
import { makeCreature, statsFor } from '../src/game/rules';
import { createSnapshot, decodeSnapshot } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

const rarityFor = (familyId: string) =>
  acquisition.families.find((family) => family.familyId === familyId)?.rarity ?? 'ordinary';

describe('按稀有程度与进化生态分配物种属性', () => {
  it('普通形态以单系为主且不超过双系，初始伙伴只在最终进化增加副系', () => {
    const ordinary = ALL_SPECIES.filter((species) => rarityFor(species.familyId) === 'ordinary');
    expect(ordinary).toHaveLength(190);
    expect(ordinary.filter((species) => species.types.length === 1).length).toBeGreaterThan(
      ordinary.length * 0.7,
    );
    for (const species of ordinary) expect(species.types.length).toBeLessThanOrEqual(2);
    for (const family of design.families.filter((entry) => rarityFor(entry.id) === 'starter')) {
      expect(family.forms.map((species) => species.types.length)).toEqual([1, 1, 2]);
      expect(family.forms.every((species) => species.types[0] === family.forms[0]!.types[0])).toBe(
        true,
      );
    }
  });
  it('稀有既有单系专精也有多系组合，神兽体现两条不同路线', () => {
    const rare = ALL_SPECIES.filter((species) => rarityFor(species.familyId) === 'rare');
    expect(rare.filter((species) => species.types.length === 1).length).toBeGreaterThan(0);
    expect(rare.filter((species) => species.types.length >= 3).length).toBeGreaterThan(0);
    expect(SPECIES.creature_249!.types).toEqual(['psychic']);
    expect(SPECIES.creature_250!.types).toEqual(['dragon', 'ghost', 'fire', 'ice']);
    for (const species of ALL_SPECIES.filter((s) =>
      ['rare', 'legendary'].includes(rarityFor(s.familyId)),
    )) {
      const signature = SIGNATURE_BY_SPECIES[species.id]!;
      expect(species.types).toContain(signature.move.type);
      expect(signature.move.exclusiveSpeciesId).toBe(species.id);
    }
  });
  it('全部家族有分配依据，十八属性都有覆盖，自然学招及培养建议仍可执行', () => {
    expect(design.typingPolicy.maxTypes).toBeNull();
    for (const family of design.families) expect(family.typingRationale.length).toBeGreaterThan(15);
    for (const type of TYPE_IDS) expect(ALL_SPECIES.some((s) => s.types.includes(type))).toBe(true);
    for (const species of ALL_SPECIES) {
      const available = learnset(species.id);
      expect(available.find((move) => move.moveId === `${species.types[0]}_1`)!.level).toBe(1);
      expect(available.every((move) => !!MOVES[move.moveId])).toBe(true);
      for (const move of TRAINING_PLANS[species.id]!.moves) expect(available).toContainEqual(move);
      expect(new Set(available.map((move) => move.moveId)).size).toBe(available.length);
    }
  });
  it('属性收束后，旧档仍完整保留旧副系招式、复刻册、待学选择和能力', () => {
    const game = fixture();
    const creature = makeCreature(game, 'creature_017', 20);
    creature.moves = [
      { id: 'bug_2', pp: 3 },
      { id: 'electric_2', pp: 4 },
      { id: 'flying_2', pp: 5 },
      { id: 'focus', pp: 6 },
    ];
    creature.taughtMoves = ['fairy_2'];
    game.creatures[creature.id] = creature;
    game.box.push(creature.id);
    game.dex.seen.push(creature.speciesId);
    game.dex.caught.push(creature.speciesId);
    game.pending.push({ kind: 'move', creatureId: creature.id, moveId: 'electric_1' });
    const abilities = statsFor(creature);
    const save = createSnapshot(game, testEntropy, null);
    save.contentVersion = 'ch10.3';
    const restored = decodeSnapshot(JSON.stringify(save)).game;
    expect(restored).toEqual(game);
    expect(statsFor(restored.creatures[creature.id]!)).toEqual(abilities);
    expect(SPECIES[restored.creatures[creature.id]!.speciesId]!.types).toEqual(['bug']);
    expect(learnset(creature.speciesId).some((move) => move.moveId === 'electric_2')).toBe(false);
  });
});
