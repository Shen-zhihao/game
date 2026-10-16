import type { MapId, StoryEvent } from '../../game/model';

export const BATTLE_SCENES = {
  meadow: { name: '晨芽林地', file: 'battle-meadow.png', width: 1536, height: 1024 },
  highlands: { name: '石脊高地', file: 'battle-highlands.png', width: 1536, height: 1024 },
  coast: { name: '潮汐海滨', file: 'battle-coast.png', width: 1536, height: 1024 },
  electric: { name: '雷鸣铜光广场', file: 'battle-electric.png', width: 1536, height: 1024 },
  wind: { name: '风栖雪岭', file: 'battle-wind.png', width: 1536, height: 1024 },
  furnace: { name: '炉心熔岩台地', file: 'battle-furnace.png', width: 1536, height: 1024 },
  lake: { name: '镜湖水庭', file: 'battle-lake.png', width: 1536, height: 1024 },
  star: { name: '星岚古迹', file: 'battle-star.png', width: 1536, height: 1024 },
  league: { name: '联盟金辉竞技场', file: 'battle-league.png', width: 1536, height: 1024 },
};
export type BattleTheme = keyof typeof BATTLE_SCENES;
/** Explicit map coverage prevents later regions silently inheriting the opening forest. */
export const MAP_BATTLE_THEMES: Record<MapId, BattleTheme> = {
  dawn: 'meadow',
  route: 'meadow',
  moss: 'meadow',
  forest: 'meadow',
  gym: 'meadow',
  stoneRoute: 'highlands',
  stone: 'highlands',
  mine: 'highlands',
  rockGym: 'highlands',
  coastRoute: 'coast',
  harbor: 'coast',
  tideworks: 'coast',
  waterGym: 'coast',
  powerRoute: 'electric',
  volt: 'electric',
  powerStation: 'electric',
  electricGym: 'electric',
  windRoute: 'wind',
  wind: 'wind',
  windObservatory: 'wind',
  windSanctuary: 'wind',
  windGym: 'wind',
  furnaceRoute: 'furnace',
  furnace: 'furnace',
  foundry: 'furnace',
  hotSprings: 'furnace',
  fireGym: 'furnace',
  lakeRoute: 'lake',
  lake: 'lake',
  mirrorArchive: 'lake',
  mirrorRuins: 'lake',
  psychicGym: 'lake',
  starRoute: 'star',
  star: 'star',
  starCore: 'star',
  ancientTemple: 'star',
  nightHall: 'star',
  starGym: 'star',
  championRoad: 'league',
  league: 'league',
  leagueHall: 'league',
  hallOfFame: 'league',
  deepwood: 'meadow',
  echoMeadow: 'meadow',
  mineDepths: 'highlands',
  kelpCove: 'coast',
};
export function battleTheme(map: MapId, event?: StoryEvent | null): BattleTheme {
  if (map === 'leagueHall') {
    if (event === 'leagueIce') return 'wind';
    if (event === 'leagueGhost' || event === 'leagueDark') return 'star';
    if (event === 'leagueDragon') return 'highlands';
  }
  return MAP_BATTLE_THEMES[map];
}
/** Both battle participants and effects use the same cover-crop transform. */
export function battleAnchors(theme: BattleTheme, width: number, height: number) {
  const scene = BATTLE_SCENES[theme];
  const scale = Math.max(width / scene.width, height / scene.height);
  const cropX = (scene.width * scale - width) / 2,
    cropY = (scene.height * scale - height) / 2;
  return {
    player: {
      x: scene.width * (390 / 1536) * scale - cropX,
      y: scene.height * (750 / 1024) * scale - cropY,
    },
    enemy: {
      x: scene.width * (1120 / 1536) * scale - cropX,
      y: scene.height * (460 / 1024) * scale - cropY,
    },
  };
}
