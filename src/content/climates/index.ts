import type { MapId, WeatherId } from '../../game/model';

type WeatherWeights = Record<WeatherId, number>;
const climates = {
  garden: {
    name: '温和草原',
    weights: { clear: 34, sun: 20, rain: 23, storm: 5, fog: 15, snow: 3, sand: 0 },
  },
  forest: {
    name: '湿润林地',
    weights: { clear: 28, sun: 13, rain: 28, storm: 5, fog: 26, snow: 0, sand: 0 },
  },
  coast: {
    name: '海滨季风',
    weights: { clear: 29, sun: 15, rain: 28, storm: 16, fog: 12, snow: 0, sand: 0 },
  },
  quarry: {
    name: '高地矿区',
    weights: { clear: 30, sun: 15, rain: 8, storm: 3, fog: 10, snow: 10, sand: 24 },
  },
  alpine: {
    name: '高山冷风',
    weights: { clear: 25, sun: 10, rain: 10, storm: 8, fog: 17, snow: 30, sand: 0 },
  },
  volcanic: {
    name: '火山暖谷',
    weights: { clear: 32, sun: 35, rain: 7, storm: 3, fog: 8, snow: 0, sand: 15 },
  },
  lake: {
    name: '湖畔湿地',
    weights: { clear: 27, sun: 12, rain: 26, storm: 5, fog: 30, snow: 0, sand: 0 },
  },
  star: {
    name: '星岚台地',
    weights: { clear: 32, sun: 17, rain: 14, storm: 8, fog: 23, snow: 6, sand: 0 },
  },
} satisfies Record<string, { name: string; weights: WeatherWeights }>;
const regions: Partial<Record<MapId, keyof typeof climates>> = {
  dawn: 'garden',
  route: 'garden',
  echoMeadow: 'garden',
  moss: 'forest',
  forest: 'forest',
  deepwood: 'forest',
  stone: 'quarry',
  stoneRoute: 'quarry',
  harbor: 'coast',
  coastRoute: 'coast',
  tideworks: 'coast',
  powerRoute: 'coast',
  volt: 'coast',
  kelpCove: 'coast',
  wind: 'alpine',
  windRoute: 'alpine',
  windSanctuary: 'alpine',
  championRoad: 'alpine',
  furnace: 'volcanic',
  furnaceRoute: 'volcanic',
  hotSprings: 'volcanic',
  lake: 'lake',
  lakeRoute: 'lake',
  mirrorRuins: 'lake',
  star: 'star',
  starRoute: 'star',
  starCore: 'star',
  ancientTemple: 'star',
  league: 'star',
};
export const climateFor = (map: MapId) => climates[regions[map] ?? 'garden'];
export const naturalWeatherChoices = (map: MapId, current: WeatherId): [WeatherId, number][] =>
  (Object.entries(climateFor(map).weights) as [WeatherId, number][]).filter(
    ([id, n]) => id !== current && n > 0,
  );
