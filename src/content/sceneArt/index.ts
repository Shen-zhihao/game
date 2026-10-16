import type { MapId } from '../../game/model';

/** First illustration pass; later regions keep their own art until reviewed. */
export const ILLUSTRATED_MAPS = ['dawn', 'route', 'moss', 'forest', 'gym'] as const;
export function hasIllustratedMap(map: MapId) {
  return (ILLUSTRATED_MAPS as readonly MapId[]).includes(map);
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
