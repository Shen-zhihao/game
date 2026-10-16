import type { MapId, TownId } from '../../game/model';

export interface GroundMaterial {
  atlas: 'city' | 'biome' | 'base';
  cell: number;
}
export interface CitySurface {
  name: string;
  street: number;
  ground: GroundMaterial;
  edge: string;
  terrain: 'lawn' | 'gravel' | 'sand' | 'road';
}
/** Material changes never change collision rows, portals, encounter grass or saved positions. */
export const CITY_SURFACES: Record<TownId, CitySurface> = {
  dawn: {
    name: '暖白花园砖',
    street: 0,
    ground: { atlas: 'city', cell: 10 },
    edge: '#9c845b',
    terrain: 'lawn',
  },
  moss: {
    name: '苔缝林间石',
    street: 1,
    ground: { atlas: 'city', cell: 11 },
    edge: '#385841',
    terrain: 'lawn',
  },
  stone: {
    name: '灰玄武岩铺地',
    street: 2,
    ground: { atlas: 'base', cell: 12 },
    edge: '#545f67',
    terrain: 'gravel',
  },
  harbor: {
    name: '晒暖木栈道',
    street: 3,
    ground: { atlas: 'city', cell: 12 },
    edge: '#756044',
    terrain: 'sand',
  },
  volt: {
    name: '铜缝工业石板',
    street: 4,
    ground: { atlas: 'city', cell: 13 },
    edge: '#b28759',
    terrain: 'gravel',
  },
  wind: {
    name: '霜边山城板岩',
    street: 5,
    ground: { atlas: 'city', cell: 14 },
    edge: '#b7c9cf',
    terrain: 'lawn',
  },
  furnace: {
    name: '赤陶火山人字砖',
    street: 6,
    ground: { atlas: 'city', cell: 15 },
    edge: '#643d2b',
    terrain: 'gravel',
  },
  lake: {
    name: '青银湖畔石',
    street: 7,
    ground: { atlas: 'biome', cell: 12 },
    edge: '#74a8a8',
    terrain: 'road',
  },
  star: {
    name: '靛蓝星纹街砖',
    street: 8,
    ground: { atlas: 'biome', cell: 14 },
    edge: '#b39b58',
    terrain: 'lawn',
  },
  league: {
    name: '金线礼仪石坪',
    street: 9,
    ground: { atlas: 'biome', cell: 12 },
    edge: '#b29a57',
    terrain: 'road',
  },
};
export const citySurfaceFor = (map: MapId): CitySurface | undefined =>
  (CITY_SURFACES as Partial<Record<MapId, CitySurface>>)[map];
export function cityGroundMaterial(map: MapId, tile: string): GroundMaterial | undefined {
  const surface = citySurfaceFor(map);
  if (!surface) return undefined;
  if (tile === ':') return { atlas: 'city', cell: surface.street };
  if (tile === '.') return surface.ground;
  return undefined;
}
