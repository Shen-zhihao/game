import type { SpriteReference } from '../spriteFrames';

/** Independent rear artwork exists only for the three starter evolution families. */
export const BACK_SPRITE_CELL: Readonly<Record<string, number>> = {
  creature_001: 0,
  creature_002: 1,
  creature_003: 2,
  creature_004: 3,
  creature_005: 4,
  creature_006: 5,
  creature_007: 6,
  creature_008: 7,
  creature_009: 8,
};

export function backSpriteFor(speciesId: string): SpriteReference | null {
  if (!Object.hasOwn(BACK_SPRITE_CELL, speciesId)) return null;
  const cell = BACK_SPRITE_CELL[speciesId];
  return cell === undefined ? null : { atlas: 'starters_back', cell };
}
