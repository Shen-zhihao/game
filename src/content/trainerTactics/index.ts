import { gymRematch } from '../../game/gymRematches';
import type { WeatherId } from '../../game/model';

export interface TrainerTactic {
  name: string;
  support: string[];
  weather?: WeatherId;
  switchBudget: number;
}
const profiles: Record<string, TrainerTactic> = {
  grass: { name: '眠香与续航', support: ['sleep', 'recover', 'focus'], switchBudget: 2 },
  rock: {
    name: '坚守与扬沙',
    support: ['sand_call', 'guard', 'steady'],
    weather: 'sand',
    switchBudget: 2,
  },
  water: {
    name: '雨幕接力',
    support: ['rain_call', 'agility', 'guard'],
    weather: 'rain',
    switchBudget: 2,
  },
  electric: { name: '高速压制', support: ['agility', 'aim', 'focus'], switchBudget: 2 },
  wind: { name: '疾风游击', support: ['agility', 'shadow_step', 'focus'], switchBudget: 2 },
  fire: {
    name: '晴日强攻',
    support: ['sun_call', 'focus', 'agility'],
    weather: 'sun',
    switchBudget: 2,
  },
  psychic: {
    name: '凝神破阵',
    support: ['confuse_ray', 'focus', 'aim', 'steady'],
    switchBudget: 2,
  },
  star: { name: '守心反击', support: ['steady', 'recover', 'focus'], switchBudget: 2 },
  leagueIce: {
    name: '雪幕攻势',
    support: ['snow_call', 'agility', 'guard'],
    weather: 'snow',
    switchBudget: 4,
  },
  leagueGhost: {
    name: '迷雾牵制',
    support: ['fog_call', 'confuse_ray', 'shadow_step', 'sleep'],
    weather: 'fog',
    switchBudget: 4,
  },
  leagueDark: { name: '要害突袭', support: ['focus', 'agility', 'aim'], switchBudget: 4 },
  leagueDragon: { name: '蓄势强攻', support: ['agility', 'focus', 'guard'], switchBudget: 4 },
  leagueChampion: {
    name: '均衡轮转',
    support: ['recover', 'agility', 'focus', 'steady'],
    switchBudget: 5,
  },
};
export function trainerTactic(event: string | null): TrainerTactic | null {
  if (!event) return null;
  const rematch = gymRematch(event);
  if (rematch) return { ...trainerTactic(rematch.leader)!, switchBudget: 4 };
  if (profiles[event]) return profiles[event]!;
  if (['leader', 'gymScout', 'gymKeeper'].includes(event)) return profiles.grass!;
  const prefix = ['rock', 'water', 'electric', 'wind', 'fire', 'psychic', 'star'].find((key) =>
    [key + 'Scout', key + 'Keeper', key + 'Leader'].includes(event),
  );
  return prefix ? profiles[prefix]! : null;
}
