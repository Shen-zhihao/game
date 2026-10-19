import type { HeldItemId } from '../../content/battleTraits';
import type { Npc } from '../../content/world';
import type { GameState, MapId, StoryEvent } from '../model';

export const GYM_REMATCH_EVENTS = [
  'rematchGrass',
  'rematchRock',
  'rematchWater',
  'rematchElectric',
  'rematchWind',
  'rematchFire',
  'rematchPsychic',
  'rematchStar',
] as const;
export type GymRematchEvent = (typeof GYM_REMATCH_EVENTS)[number];
export interface GymRematchRecord {
  attempts: number;
  wins: number;
}
interface GymRematch {
  event: GymRematchEvent;
  leader: StoryEvent;
  map: MapId;
  name: string;
  theme: string;
  team: [string, number][];
  heldItems: HeldItemId[];
  reward: number;
}
const team = (...ids: number[]): [string, number][] =>
  ids.map((id, i) => [`creature_${String(id).padStart(3, '0')}`, [58, 59, 59, 60, 62][i]!]);
/** Distinct repeat events never reset or reuse the original gym victory flags. */
export const GYM_REMATCHES: readonly GymRematch[] = [
  {
    event: 'rematchGrass',
    leader: 'leader',
    map: 'gym',
    name: '馆主榆岚 · 冠军再战',
    theme: '草木续航',
    team: team(21, 28, 195, 24, 3),
    heldItems: ['held_leftovers', 'held_shell', 'held_band', 'held_cleanse', 'held_seed'],
    reward: 3600,
  },
  {
    event: 'rematchRock',
    leader: 'rockLeader',
    map: 'rockGym',
    name: '馆主岳砾 · 冠军再战',
    theme: '岩壁扬沙',
    team: team(61, 84, 178, 209, 64),
    heldItems: ['held_leftovers', 'held_band', 'held_cleanse', 'held_boots', 'held_lens'],
    reward: 3600,
  },
  {
    event: 'rematchWater',
    leader: 'waterLeader',
    map: 'waterGym',
    name: '馆主汐遥 · 冠军再战',
    theme: '雨幕轮转',
    team: team(189, 92, 28, 90, 192),
    heldItems: ['held_leftovers', 'held_lens', 'held_shell', 'held_cleanse', 'held_pearl'],
    reward: 3600,
  },
  {
    event: 'rematchElectric',
    leader: 'electricLeader',
    map: 'electricGym',
    name: '馆主衡电 · 冠军再战',
    theme: '电流接力',
    team: team(45, 92, 181, 235, 131),
    heldItems: ['held_lens', 'held_leftovers', 'held_band', 'held_cleanse', 'held_boots'],
    reward: 3600,
  },
  {
    event: 'rematchWind',
    leader: 'windLeader',
    map: 'windGym',
    name: '馆主岑羽 · 冠军再战',
    theme: '疾风游击',
    team: team(112, 139, 192, 114, 105),
    heldItems: ['held_boots', 'held_shell', 'held_leftovers', 'held_band', 'held_scope'],
    reward: 3600,
  },
  {
    event: 'rematchFire',
    leader: 'fireLeader',
    map: 'fireGym',
    name: '馆主烁岑 · 冠军再战',
    theme: '晴日强攻',
    team: team(122, 124, 217, 128, 126),
    heldItems: ['held_leftovers', 'held_shell', 'held_band', 'held_lens', 'held_charcoal'],
    reward: 3600,
  },
  {
    event: 'rematchPsychic',
    leader: 'psychicLeader',
    map: 'psychicGym',
    name: '馆主澄镜 · 冠军再战',
    theme: '凝神破阵',
    team: team(163, 34, 186, 211, 146),
    heldItems: ['held_leftovers', 'held_lens', 'held_shell', 'held_boots', 'held_cleanse'],
    reward: 3600,
  },
  {
    event: 'rematchStar',
    leader: 'starLeader',
    map: 'starGym',
    name: '馆主闻衡 · 冠军再战',
    theme: '星岚均衡',
    team: team(172, 228, 134, 206, 233),
    heldItems: ['held_boots', 'held_lens', 'held_shell', 'held_cleanse', 'held_leftovers'],
    reward: 3600,
  },
];
export function gymRematch(event: string | null | undefined): GymRematch | undefined {
  return GYM_REMATCHES.find((gym) => gym.event === event);
}
export function registerGymRematch(game: GameState, event: GymRematchEvent): void {
  const record = ((game.gymRematches ??= {})[event] ??= { attempts: 0, wins: 0 });
  record.attempts = Math.min(999999999, record.attempts + 1);
}
export function finishGymRematch(game: GameState): void {
  const battle = game.battle!,
    gym = gymRematch(battle.event);
  if (!gym) return;
  if (battle.result === 'win') {
    const record = game.gymRematches![gym.event]!;
    record.wins = Math.min(999999999, record.wins + 1);
    battle.logs.push(
      `冠军再战获胜！本馆再战已获胜 ${record.wins} 次，徽章、首通赠礼和机关进度保持不变。`,
      '随时可回来再次切磋，每次胜利独立结算再战奖金。',
    );
  } else if (battle.result === 'lose') {
    battle.logs.push(
      '本次道馆再战结束，已获得的经验与击败奖励保留；首通与再战胜场不受影响。回本馆与馆主交谈即可重新挑战，无需重做机关。',
    );
  }
}
export function gymRematchEntryReason(game: GameState, gym: GymRematch): string | null {
  if (!game.progress.flags.champion) return '成为联盟冠军后，才能挑战馆主的强化队伍。';
  if (!game.progress.flags[gym.leader]) return '先完成本馆首次挑战，再来进行冠军再战。';
  if (game.player.map !== gym.map) return '请回到对应道馆，与馆主交谈开始再战。';
  if (
    game.battle ||
    game.league?.active ||
    game.challenge?.active ||
    game.activities?.active ||
    game.pending.length
  )
    return '请先结束当前挑战或伙伴的成长选择，再来进行道馆再战。';
  return null;
}
export function interactGymRematch(
  game: GameState,
  npc: Npc,
  talk: (speaker: string, lines: string[], after?: StoryEvent | null) => void,
): boolean {
  const gym = GYM_REMATCHES.find((entry) => entry.leader === npc.event);
  if (!gym || !game.progress.flags.champion) return false;
  const reason = gymRematchEntryReason(game, gym);
  if (reason) talk(npc.name, [reason]);
  else
    talk(
      npc.name,
      [
        `欢迎回来，冠军！这次以「${gym.theme}」的五位伙伴与你单打切磋，等级为 Lv.58–62。`,
        `本馆再战已获胜 ${game.gymRematches?.[gym.event]?.wins ?? 0} 次。每场胜利另获 ${gym.reward} 金币，不重复发放徽章或首通赠礼。`,
        '强化队伍会换人，并携带道具与两份高浓草露药。战败后可直接重试，机关与首次胜利记录不变；中途存档会保留当前战况和剩余用药。准备好就开始吧！',
      ],
      gym.event,
    );
  return true;
}
