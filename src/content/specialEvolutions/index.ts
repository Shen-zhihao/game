import type { MapId, SpecialEvolutionCondition } from '../../game/model';

/** Alternate paths never remove or raise an existing evolution requirement. */
export const SPECIAL_EVOLUTIONS: Record<
  string,
  { toId: string; condition: SpecialEvolutionCondition }
> = {
  creature_010: {
    toId: 'creature_011',
    condition: { minLevel: 16, friendship: 120, period: 'day' },
  },
  creature_051: {
    toId: 'creature_052',
    condition: { minLevel: 28, friendship: 160, period: 'night' },
  },
  creature_053: {
    toId: 'creature_054',
    condition: { minLevel: 28, friendship: 160, period: 'day' },
  },
  creature_063: {
    toId: 'creature_064',
    condition: { minLevel: 32, maps: ['mine', 'mineDepths'], moveId: 'rock_2' },
  },
  creature_123: {
    toId: 'creature_124',
    condition: { minLevel: 32, maps: ['hotSprings'], moveId: 'water_2' },
  },
};

export const SPECIAL_EVOLUTION_PLACES: Partial<Record<MapId, string>> = {
  mine: '石脊旧矿山',
  mineDepths: '回声深矿',
  hotSprings: '温泉冷石谷',
};
