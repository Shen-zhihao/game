import type { MapId } from '../../game/model';

import { ROOM_SITES } from '../buildings';

/** Full map coverage, including every building interior and optional region. */
export const ILLUSTRATED_WORLD_MAPS = [
  'dawn',
  'route',
  'moss',
  'forest',
  'gym',
  'stoneRoute',
  'stone',
  'mine',
  'rockGym',
  'coastRoute',
  'harbor',
  'tideworks',
  'waterGym',
  'championRoad',
  'league',
  'leagueHall',
  'hallOfFame',
  'powerRoute',
  'volt',
  'powerStation',
  'electricGym',
  'windRoute',
  'wind',
  'windObservatory',
  'windSanctuary',
  'windGym',
  'furnaceRoute',
  'furnace',
  'foundry',
  'hotSprings',
  'fireGym',
  'lakeRoute',
  'lake',
  'mirrorArchive',
  'mirrorRuins',
  'psychicGym',
  'starRoute',
  'star',
  'starCore',
  'ancientTemple',
  'nightHall',
  'starGym',
  'deepwood',
  'echoMeadow',
  'mineDepths',
  'kelpCove',
] as const;
export const ILLUSTRATED_MAPS: readonly MapId[] = [
  ...ILLUSTRATED_WORLD_MAPS,
  ...ROOM_SITES.map((site) => `interior_${site}` as MapId),
];
export function hasIllustratedMap(map: MapId) {
  return ILLUSTRATED_MAPS.includes(map);
}

// The same warm outlines, paper highlights and muted fills as the bag illustrations.
export const sceneInk = {
  outline: '#655541',
  paper: '#fffcf5',
  cream: '#f3e8cb',
  gold: '#e9b34f',
  grass: '#dce3c5',
  leaf: '#a8bf8b',
  leafLight: '#c6d6a4',
  leafDark: '#849e73',
  water: '#a5c6c5',
};
