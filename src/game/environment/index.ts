import { SPECIES } from '../../content/catalog';
import { MAPS } from '../../content/world';
import { ADVENTURE_STORY_CONTENT } from '../../content/adventure';
import {
  Creature,
  EnvironmentState,
  GameState,
  LocalWeather,
  MapId,
  Stat,
  TypeId,
  WeatherId,
} from '../model';
import { climateFor, naturalWeatherChoices } from '../../content/climates';
import { citySurfaceFor } from '../../content/surfaces';

export const WEATHER: Record<
  WeatherId,
  { name: string; mark: string; field: string; battle: string }
> = {
  clear: { name: '晴朗', mark: '☀', field: '通常的栖地分布与步速。', battle: '无额外修正。' },
  sun: {
    name: '烈日',
    mark: '◉',
    field: '火、草系更活跃；草地步速 ×0.95。',
    battle: '火伤 ×1.5，水伤 ×0.5；草系速度 ×1.15，回复术恢复 2/3 HP。',
  },
  rain: {
    name: '降雨',
    mark: '☂',
    field: '水、电、虫系更活跃；土路 ×0.9，草地 ×0.85。',
    battle: '水伤 ×1.5，火伤 ×0.5；水系速度 ×1.15，电招命中 ×1.1；回复术恢复 1/4 HP。',
  },
  storm: {
    name: '雷雨',
    mark: 'ϟ',
    field: '电、水系更活跃；露天陆地 ×0.8，桥梁 ×0.9。',
    battle: '水伤 ×1.3，火伤 ×0.7；电招命中 ×1.2，飞行招命中 ×0.85；回复术恢复 1/4 HP。',
  },
  fog: {
    name: '薄雾',
    mark: '≋',
    field: '幽灵、超能力、恶系更活跃；露天陆地 ×0.9。',
    battle: '幽灵、恶伤 ×1.2；除幽灵/超能力招外，对敌招式命中 ×0.85，自身技能不受影响。',
  },
  snow: {
    name: '飘雪',
    mark: '❄',
    field: '冰系更活跃；露天陆地 ×0.8，桥梁 ×0.9。',
    battle: '冰伤 ×1.25、火伤 ×1.15；冰系防御 ×1.5、速度 ×1.15，无冰雹扣血。',
  },
  sand: {
    name: '扬沙',
    mark: '⋰',
    field: '岩石、地面、钢系更活跃；露天陆地 ×0.85。',
    battle: '地面伤 ×1.15，岩石系特防 ×1.5；轮末扣 1/16 HP，岩石/地面/钢免疫。',
  },
};
export const INDOOR_MAPS: MapId[] = [
  'gym',
  'rockGym',
  'waterGym',
  'mine',
  'leagueHall',
  'hallOfFame',
  ...ADVENTURE_STORY_CONTENT.flatMap((c) => c.indoor),
  ...Object.values(MAPS)
    .filter((m) => m.interior)
    .map((m) => m.id),
];
export const isIndoor = (map: MapId) => INDOOR_MAPS.includes(map);
export function createEnvironment(seed: number, map: MapId = 'dawn'): EnvironmentState {
  const env = { seed: (seed ^ 0x85ebca6b) >>> 0 || 1 };
  const local = rollWeather(env, map);
  return { ...env, ...local, climates: { [climateFor(map).id]: local } };
}
export const localWeather = (game: GameState, map = game.player.map): LocalWeather | undefined =>
  game.environment?.climates?.[climateFor(map).id] ?? game.environment;
export const weatherAt = (game: GameState, map = game.player.map): WeatherId => {
  const weather = localWeather(game, map)?.weather ?? 'clear';
  return isIndoor(map) || climateFor(map).weights[weather] === 0 ? 'clear' : weather;
};
function environmentRandom(env: Pick<EnvironmentState, 'seed'>) {
  env.seed = (Math.imul(env.seed, 1664525) + 1013904223) >>> 0;
  return env.seed / 0x100000000;
}
function rollWeather(
  env: Pick<EnvironmentState, 'seed'>,
  map: MapId,
  current?: WeatherId,
): LocalWeather {
  const choices = naturalWeatherChoices(map, current);
  let roll = environmentRandom(env) * choices.reduce((n, [, weight]) => n + weight, 0);
  return {
    weather: (choices.find(([, weight]) => (roll -= weight) < 0) ?? choices[0]!)[0],
    remaining: 180 + Math.floor(environmentRandom(env) * 181),
  };
}
export function syncWeather(game: GameState): void {
  const env = (game.environment ??= createEnvironment(game.rng, game.player.map));
  if (isIndoor(game.player.map)) return;
  const climate = climateFor(game.player.map);
  const legacy = !env.climates;
  env.climates ??= {};
  const local = (env.climates[climate.id] ??=
    legacy && climate.weights[env.weather] > 0
      ? { weather: env.weather, remaining: env.remaining }
      : rollWeather(env, game.player.map));
  // Retain the current-weather fields for existing save consumers.
  Object.assign(env, local);
}
export function advanceWeather(game: GameState): void {
  syncWeather(game);
  const env = game.environment!;
  if (
    isIndoor(game.player.map) ||
    game.battle ||
    game.dialogue ||
    game.pending.length ||
    game.progress.flags.starterChoice
  )
    return;
  const local = env.climates![climateFor(game.player.map).id]!;
  if (--local.remaining <= 0) {
    Object.assign(local, rollWeather(env, game.player.map, local.weather));
    game.notice = `天气转为${WEATHER[local.weather].name}。${WEATHER[local.weather].field}`;
  }
  Object.assign(env, local);
}
const favorites: Partial<Record<WeatherId, TypeId[]>> = {
  sun: ['fire', 'grass'],
  rain: ['water', 'electric', 'bug'],
  storm: ['electric', 'water'],
  fog: ['ghost', 'psychic', 'dark'],
  snow: ['ice'],
  sand: ['rock', 'ground', 'steel'],
};
export function ecologyMultiplier(speciesId: string, weather: WeatherId): number {
  const types = SPECIES[speciesId]!.types;
  if (favorites[weather]?.some((type) => types.includes(type))) return 1.8;
  if (
    (weather === 'sun' && types.includes('water')) ||
    (['rain', 'storm', 'snow'].includes(weather) && types.includes('fire')) ||
    (weather === 'sand' && types.some((t) => ['water', 'grass', 'bug'].includes(t)))
  )
    return 0.6;
  return 1;
}
/** A bounded strength penalty applies before normalising a local pool. Story encounters never enter it. */
export function strengthEncounterMultiplier(speciesId: string): number {
  const s = SPECIES[speciesId]!;
  return (
    Math.max(0.12, Math.min(1, 1 - Math.max(0, s.baseStatTotal - 300) / 500)) *
    (s.stage > 1 ? 0.5 ** (s.stage - 1) : 1) *
    Math.min(1, s.captureRate / 120)
  );
}
export function weightedEcology<T extends { speciesId: string; weight: number }>(
  entries: readonly T[],
  weather: WeatherId,
): T[] {
  return entries.map((e) => ({
    ...e,
    weight:
      e.weight * ecologyMultiplier(e.speciesId, weather) * strengthEncounterMultiplier(e.speciesId),
  }));
}
export function weatherDamage(type: TypeId | null, weather: WeatherId): number {
  if (weather === 'sun') return type === 'fire' ? 1.5 : type === 'water' ? 0.5 : 1;
  if (weather === 'rain') return type === 'water' ? 1.5 : type === 'fire' ? 0.5 : 1;
  if (weather === 'storm') return type === 'water' ? 1.3 : type === 'fire' ? 0.7 : 1;
  if (weather === 'snow') return type === 'ice' ? 1.25 : type === 'fire' ? 1.15 : 1;
  if (weather === 'sand' && type === 'ground') return 1.15;
  if (weather === 'fog' && (type === 'ghost' || type === 'dark')) return 1.2;
  return 1;
}
export function weatherStat(c: Creature, stat: Exclude<Stat, 'hp'>, weather: WeatherId): number {
  const types = SPECIES[c.speciesId]!.types;
  if (stat === 'specialDefense' && weather === 'sand' && types.includes('rock')) return 1.5;
  if (stat === 'defense' && weather === 'snow' && types.includes('ice')) return 1.5;
  if (
    stat === 'speed' &&
    ((weather === 'sun' && types.includes('grass')) ||
      (weather === 'rain' && types.includes('water')) ||
      (weather === 'snow' && types.includes('ice')))
  )
    return 1.15;
  return 1;
}
export function weatherAccuracy(type: TypeId | null, weather: WeatherId): number {
  if (weather === 'rain' && type === 'electric') return 1.1;
  if (weather === 'storm') return type === 'electric' ? 1.2 : type === 'flying' ? 0.85 : 1;
  if (weather === 'fog' && type !== 'ghost' && type !== 'psychic') return 0.85;
  return 1;
}
export const TERRAIN_SPEEDS = {
  road: { name: '土路', speed: 1 },
  bridge: { name: '桥梁／栈道', speed: 1 },
  floor: { name: '室内地板', speed: 1 },
  lawn: { name: '草地', speed: 0.92 },
  grass: { name: '高草／花丛', speed: 0.78 },
  gravel: { name: '碎石地', speed: 0.82 },
  sand: { name: '沙滩', speed: 0.75 },
  water: { name: '渡水', speed: 0.7 },
} as const;
export function terrainAt(map: MapId, x: number, y: number): keyof typeof TERRAIN_SPEEDS {
  const tile = MAPS[map].rows[y]?.[x];
  if (tile === '~' || tile === 'W') return 'water';
  if (isIndoor(map)) return map === 'mine' || map === 'mineDepths' ? 'gravel' : 'floor';
  if (tile === '=') return 'bridge';
  if (tile === ',') return 'gravel';
  if (tile === ':' || tile === 'R') return 'road';
  if (tile === 'g' || tile === '^') return 'grass';
  if (citySurfaceFor(map)) return citySurfaceFor(map)!.terrain;
  if (['coastRoute', 'tideworks', 'kelpCove', 'powerRoute'].includes(map)) return 'sand';
  if (['stoneRoute', 'furnaceRoute', 'foundry'].includes(map)) return 'gravel';
  return 'lawn';
}
export function travelProfile(game: GameState, x = game.player.x, y = game.player.y) {
  const terrain = terrainAt(game.player.map, x, y);
  const weather = weatherAt(game);
  let modifier = 1;
  if (terrain !== 'water' && !isIndoor(game.player.map)) {
    if (weather === 'rain')
      modifier = ['lawn', 'grass'].includes(terrain) ? 0.85 : terrain === 'road' ? 0.9 : 1;
    if (weather === 'sun' && ['lawn', 'grass'].includes(terrain)) modifier = 0.95;
    if (weather === 'storm' || weather === 'snow') modifier = terrain === 'bridge' ? 0.9 : 0.8;
    if (weather === 'fog') modifier = 0.9;
    if (weather === 'sand') modifier = 0.85;
  }
  const speed = Math.max(0.5, TERRAIN_SPEEDS[terrain].speed * modifier);
  return {
    terrain,
    weather,
    speed,
    interval: Math.round(160 / speed),
    duration: Math.round(140 / speed),
  };
}
