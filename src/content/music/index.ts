import { MAPS, GYM_REWARDS } from '../world';
import { worldMapFor } from '../buildings';
import type { GameState, WorldMapId } from '../../game/model';

export const MUSIC_NAMES = {
  title: '星苔的邀约',
  travel: '新叶步道',
  town: '窗灯与归途',
  forest: '林间萤语',
  cave: '矿脉回声',
  coast: '青帆逐浪',
  power: '铜光脉冲',
  wind: '雪岭来信',
  furnace: '炉心火种',
  mirror: '镜湖微光',
  ruins: '群星低语',
  league: '金辉之约',
  gentle: '同行的叮咛',
  rival: '阿澈的约定',
  tension: '定序暗流',
  'wild-battle': '草丛里的挑战',
  'trainer-battle': '伙伴的交锋',
  'boss-battle': '徽章与星冠',
  victory: '胜利的新芽',
  defeat: '休息后再出发',
  encounter: '遭遇闪光',
} as const;
export type MusicTrack = keyof typeof MUSIC_NAMES;
export interface MusicScene {
  track: MusicTrack;
  battleId: string | null;
  inGame: boolean;
}

/** Every world map is intentional; new regions must choose their own music. */
export const MAP_MUSIC = {
  dawn: 'town',
  moss: 'town',
  route: 'travel',
  forest: 'forest',
  gym: 'league',
  stoneRoute: 'travel',
  stone: 'town',
  mine: 'cave',
  rockGym: 'league',
  coastRoute: 'coast',
  harbor: 'coast',
  tideworks: 'cave',
  waterGym: 'league',
  powerRoute: 'power',
  volt: 'power',
  powerStation: 'power',
  electricGym: 'league',
  windRoute: 'wind',
  wind: 'wind',
  windObservatory: 'wind',
  windSanctuary: 'ruins',
  windGym: 'league',
  furnaceRoute: 'furnace',
  furnace: 'furnace',
  foundry: 'furnace',
  hotSprings: 'gentle',
  fireGym: 'league',
  lakeRoute: 'mirror',
  lake: 'mirror',
  mirrorArchive: 'mirror',
  mirrorRuins: 'ruins',
  psychicGym: 'league',
  starRoute: 'ruins',
  star: 'ruins',
  starCore: 'tension',
  ancientTemple: 'ruins',
  nightHall: 'ruins',
  starGym: 'league',
  championRoad: 'league',
  league: 'league',
  leagueHall: 'league',
  hallOfFame: 'victory',
  deepwood: 'forest',
  echoMeadow: 'forest',
  mineDepths: 'cave',
  kelpCove: 'coast',
} satisfies Record<WorldMapId, MusicTrack>;

export function gameMusic(
  game: GameState | null,
  inGame: boolean,
  battleResultReady = true,
): MusicScene {
  if (!inGame || !game) return { track: 'title', battleId: null, inGame: false };
  const battle = game.battle;
  if (battle) {
    let track: MusicTrack;
    if (battleResultReady && (battle.result === 'win' || battle.result === 'caught'))
      track = 'victory';
    else if (battleResultReady && battle.result === 'lose') track = 'defeat';
    else if (battleResultReady && battle.result === 'escaped')
      track = MAP_MUSIC[worldMapFor(game.player.map)];
    else if (
      GYM_REWARDS.some((gym) => gym.leader === battle.event) ||
      battle.event?.startsWith('league') ||
      battle.event === 'coreCommander'
    )
      track = 'boss-battle';
    else track = battle.kind === 'wild' ? 'wild-battle' : 'trainer-battle';
    return { track, battleId: battle.id, inGame: true };
  }
  const map = MAPS[game.player.map];
  const speaker = game.dialogue?.speaker;
  let track: MusicTrack = MAP_MUSIC[worldMapFor(game.player.map)];
  if (map.interior) track = map.interior.kind === 'center' ? 'gentle' : 'town';
  if (speaker) {
    const npc = map.npcs.find((candidate) => candidate.name === speaker);
    if (speaker.includes('定序社')) track = 'tension';
    else if (speaker.startsWith('阿澈')) track = 'rival';
    else if (speaker === '岚博士' || speaker === '妈妈' || npc?.role === 'healer') track = 'gentle';
    else if (npc?.role === 'leader') track = 'league';
  }
  return { track, battleId: null, inGame: true };
}
