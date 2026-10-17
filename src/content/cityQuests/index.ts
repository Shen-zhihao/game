import type { CityQuest } from '../cities';
import {
  CITY_BUILDING_KINDS,
  CITY_IDENTITIES,
  CITY_TOWNS,
  districtFlag,
  districtQuestId,
} from '../cityDistricts';
import type { TownId } from '../../game/model';
import { CITY_ACTIVITIES } from '../fieldActivities';

export const DISTRICT_POINTS = [
  'market',
  'garden',
  'promenade',
  ...CITY_BUILDING_KINDS,
  'craft_bakery',
  'craft_workshop',
  'craft_library',
  'festival',
] as const;
export const DISTRICT_FLAGS = CITY_TOWNS.flatMap((town) =>
  DISTRICT_POINTS.map((point) => districtFlag(town, point)),
);

export function districtQuests(town: TownId): Omit<CityQuest, 'cityId'>[] {
  const identity = CITY_IDENTITIES[town];
  const activity = CITY_ACTIVITIES.find((a) => a.town === town)!;
  const checklist = (points: string[], labels: string[]): CityQuest['condition'] => ({
    kind: 'checklist',
    stops: points.map((point, i) => ({
      flag: districtFlag(town, point),
      label: labels[i]!,
    })),
  });
  return [
    {
      id: districtQuestId(town, 'tour'),
      name: `${identity.quarters[0]}漫游手帖`,
      client: identity.people[3],
      story: `从东侧${identity.quarters[0]}开始，阅读集市、南侧街区和花园的三块导览牌。记录会保留，顺序不限。`,
      condition: checklist(
        ['market', 'promenade', 'garden'],
        [
          `阅读东侧${identity.quarters[0]}导览牌`,
          `阅读南侧${identity.quarters[1]}街史牌`,
          `阅读${identity.quarters[2]}记事牌`,
        ],
      ),
      reward: { money: 220, merit: 2, items: { ball: 3 } },
    },
    {
      id: districtQuestId(town, 'neighbors'),
      name: `${identity.quarters[1]}的六位邻居`,
      client: identity.people[3],
      story:
        '走进烘焙坊、工坊、书馆、会馆、茶舍和温室，与各自的主人交谈。六份生活各有故事，认识邻居后回委托板领奖。',
      condition: checklist(
        [...CITY_BUILDING_KINDS],
        identity.people.map((person, i) => `拜访${identity.houses[i]}的${person}`),
      ),
      reward: { money: 280, merit: 3, items: { super_potion: 2 } },
    },
    {
      id: districtQuestId(town, 'craft'),
      name: `${identity.celebration} · 筹备`,
      client: identity.people[1],
      story: `居民正在筹备${identity.celebration}。进入东侧的${identity.houses[0]}、${identity.houses[1]}、${identity.houses[2]}，调查各屋东南侧的工作台。${town === 'harbor' ? '修好风向帆并整理其他记录。' : `工坊需亲手完成「${activity.title}」，其余两屋整理工作记录。`}`,
      condition: checklist(
        ['craft_bakery', 'craft_workshop', 'craft_library'],
        identity.craft.map((name, i) =>
          i === 1 && town !== 'harbor'
            ? `到${identity.houses[i]}完成${activity.title}`
            : `到${identity.houses[i]}整理${name}`,
        ),
      ),
      reward: { money: 320, merit: 3, items: { ether: 1, candy: 1 } },
    },
    {
      id: districtQuestId(town, 'supplies'),
      name: `${identity.quarters[0]}共享补给箱`,
      client: identity.people[3],
      story: `为${identity.houses[3]}的共享补给箱准备草露药两份、清醒露两份；领取奖励时一次性交付，居民用这些物资照顾路过的旅人。`,
      condition: { kind: 'delivery', items: { potion: 2, antidote: 2 } },
      reward: { money: 200, merit: 2, items: { great_ball: 3 } },
    },
    {
      id: districtQuestId(town, 'festival'),
      name: `${identity.celebration} · 相聚`,
      client: identity.people[4],
      prerequisite: districtQuestId(town, 'craft'),
      story: `交付「${identity.celebration} · 筹备」后，到南侧${identity.quarters[2]}环路东南角找筹备人，与居民一同见证${identity.celebration}，再回委托板领取谢礼。`,
      condition: checklist(
        ['festival'],
        [`到${identity.quarters[2]}与筹备人交谈，参加${identity.celebration}`],
      ),
      reward: { money: 400, merit: 4, items: { skill_copy: 1, super_potion: 2 } },
    },
  ];
}
