import { HABITAT_SITES } from '../habitats';

export const FISHING_REGIONS = ['river', 'lake', 'coast'] as const;
export type FishingRegion = (typeof FISHING_REGIONS)[number];
export const FISHING_REGION_NAMES: Record<FishingRegion, string> = {
  river: '河川',
  lake: '湖泊',
  coast: '海岸',
};
export const FISHING_SITES = HABITAT_SITES.filter(
  (site) => site.map && site.medium === 'water' && site.encounters.length,
);
export function fishingRegion(siteId: string): FishingRegion {
  if (['river_delta', 'tidal_flat', 'open_sea', 'reef_garden', 'kelp_forest'].includes(siteId))
    return 'coast';
  if (['dawn_pool', 'moss_pool', 'reed_marsh', 'mirror_lake'].includes(siteId)) return 'lake';
  return 'river';
}
export const FISHING_BAITS = {
  none: { name: '不用果饵', hint: '不消耗道具，保持当地原有遭遇比例。', types: [] },
  held_berry: {
    name: '甘露果饵',
    hint: '偏好草、妖精属性：当地符合条件的精灵权重 ×2。',
    types: ['grass', 'fairy'],
  },
  held_cleanse: {
    name: '清露果饵',
    hint: '偏好岩石、地面、钢属性：当地符合条件的精灵权重 ×2。',
    types: ['rock', 'ground', 'steel'],
  },
} as const;
export type FishingBait = keyof typeof FISHING_BAITS;
export const FISHING_MILESTONE_REWARD = { item: 'net_ball', count: 3, money: 120 } as const;
