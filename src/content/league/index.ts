import { terrain, encounter as e, AdventureTrainer } from '../adventureTypes';
import type { GameMap } from '../world';
import type { StoryEvent } from '../../game/model';

export const LEAGUE_BADGES = [
  'leader',
  'rockLeader',
  'waterLeader',
  'electricLeader',
  'windLeader',
  'fireLeader',
  'psychicLeader',
  'starLeader',
];
export const LEAGUE_STAGES = [
  'leagueIce',
  'leagueGhost',
  'leagueDark',
  'leagueDragon',
  'leagueChampion',
] as const;
export const LEAGUE_STAGE_NAMES = [
  '霜岑 · 冰',
  '灯隐 · 幽灵',
  '夜准 · 恶',
  '澜脊 · 龙',
  '冠军 · 望野',
];
const road = terrain(48, 40, ',');
road.fill(0, 36, 48, 1, ':');
road.fill(7, 5, 1, 32, ':');
road.fill(7, 5, 34, 1, ':');
road.fill(40, 5, 1, 27, ':');
road.fill(18, 0, 1, 32, ':');
road.fill(18, 31, 23, 1, ':');
road.fill(7, 18, 34, 1, ':');
road.fill(13, 10, 18, 13, '#');
road.fill(18, 10, 1, 13, ':');
road.fill(13, 18, 18, 1, ':');
road.fill(3, 7, 3, 10, 'g');
road.fill(33, 24, 5, 6, 'g');
road.fill(20, 33, 8, 4, 'g');
const plaza = terrain(40, 32, ':');
plaza.fill(2, 2, 6, 4, 'C');
plaza.fill(2, 12, 7, 4, 'S');
plaza.fill(13, 2, 15, 5, 'G');
plaza.fill(29, 22, 7, 4, 'H');
plaza.fill(20, 31, 1, 1, ':');
const halls = terrain(36, 70, ':');
for (const y of [12, 25, 38, 51]) {
  halls.fill(1, y, 34, 1, '#');
  halls.fill(18, y, 1, 1, ':');
}
halls.fill(18, 69, 1, 1, ':');
const fame = terrain(36, 24, ':');
fame.fill(4, 3, 7, 5, '^');
fame.fill(25, 3, 7, 5, '^');
fame.fill(18, 23, 1, 1, ':');
export const LEAGUE_MAPS: Record<'championRoad' | 'league' | 'leagueHall' | 'hallOfFame', GameMap> =
  {
    championRoad: {
      id: 'championRoad',
      name: '十一号冠军路',
      subtitle: '四层回环与最后一段共同走过的山路',
      rows: road.rows(),
      npcs: [
        {
          id: 'championScout',
          name: '巡礼登山家',
          x: 9,
          y: 7,
          role: 'trainer',
          event: 'championScout',
        },
      ],
      portals: [
        { x: 47, y: 36, map: 'star', toX: 1, toY: 18 },
        { x: 18, y: 0, map: 'league', toX: 20, toY: 30 },
      ],
      encounters: [
        e(100, 42, 48, 20),
        e(103, 42, 48, 20),
        e(201, 43, 49, 15),
        e(207, 42, 48, 20),
        e(212, 43, 49, 15),
        e(65, 42, 48, 10),
      ],
    },
    league: {
      id: 'league',
      name: '星苔联盟',
      subtitle: '八枚不同徽章，每一种道路都被承认',
      rows: plaza.rows(),
      npcs: [
        { id: 'leagueHeal', name: '联盟治疗员', x: 5, y: 6, role: 'healer' },
        { id: 'leagueShop', name: '联盟补给站', x: 5, y: 16, role: 'shop' },
        { id: 'leagueRegistrar', name: '联盟登记员', x: 20, y: 9, role: 'gate' },
        {
          id: 'rivalLeague',
          name: '阿澈·巡礼终场',
          x: 18,
          y: 23,
          role: 'trainer',
          event: 'rivalLeague',
          storyBattle: true,
        },
        {
          id: 'leagueGuide',
          name: '连战向导',
          x: 28,
          y: 16,
          role: 'sign',
          lines: [
            '集齐八枚不同徽章，与阿澈完成巡礼终场切磋，即可登记冰、幽灵、恶、龙四位精英与冠军的五场连战。',
            '所有地区调查、支线、稀有或神兽捕获都不影响资格。连战可用补给；战败或主动离场后从第一位精英重来，经验、金币与冠军历史保留。',
          ],
        },
      ],
      portals: [{ x: 20, y: 31, map: 'championRoad', toX: 18, toY: 1 }],
      encounters: [],
    },
    leagueHall: {
      id: 'leagueHall',
      name: '联盟五重回廊',
      subtitle: '冰、幽灵、恶、龙与冠军的连续考验',
      rows: halls.rows(),
      npcs: [
        {
          id: 'leagueIce',
          name: '冰之精英霜岑',
          x: 18,
          y: 56,
          role: 'trainer',
          event: 'leagueIce',
        },
        {
          id: 'leagueGhost',
          name: '幽灵精英灯隐',
          x: 18,
          y: 43,
          role: 'trainer',
          event: 'leagueGhost',
        },
        {
          id: 'leagueDark',
          name: '恶之精英夜准',
          x: 18,
          y: 30,
          role: 'trainer',
          event: 'leagueDark',
        },
        {
          id: 'leagueDragon',
          name: '龙之精英澜脊',
          x: 18,
          y: 17,
          role: 'trainer',
          event: 'leagueDragon',
        },
        {
          id: 'leagueChampion',
          name: '冠军望野',
          x: 18,
          y: 4,
          role: 'leader',
          event: 'leagueChampion',
        },
      ],
      portals: [{ x: 18, y: 69, map: 'league', toX: 20, toY: 10 }],
      encounters: [],
    },
    hallOfFame: {
      id: 'hallOfFame',
      name: '星苔冠军名录',
      subtitle: '每位同行者，都在这段旅程中留下名字',
      rows: fame.rows(),
      npcs: [
        { id: 'fameRecord', name: '冠军名录终端', x: 18, y: 6, role: 'mechanism' },
        { id: 'fameRival', name: '阿澈', x: 11, y: 16, role: 'quest' },
        { id: 'fameProfessor', name: '岚博士', x: 25, y: 16, role: 'quest' },
      ],
      portals: [{ x: 18, y: 23, map: 'league', toX: 20, toY: 10 }],
      encounters: [],
    },
  };
export const LEAGUE_TRAINERS: Partial<Record<StoryEvent, AdventureTrainer>> = {
  championScout: {
    name: '巡礼登山家',
    team: [
      ['creature_208', 45],
      ['creature_202', 45],
    ],
    reward: 1500,
  },
  rivalLeague: {
    name: '阿澈·巡礼终场',
    team: [
      ['creature_045', 46],
      ['creature_105', 47],
      ['creature_124', 46],
      ['creature_050', 46],
    ],
    reward: 2200,
  },
  leagueIce: {
    name: '冰之精英霜岑',
    team: [
      ['creature_102', 47],
      ['creature_108', 48],
      ['creature_203', 48],
      ['creature_211', 49],
    ],
    reward: 2400,
  },
  leagueGhost: {
    name: '幽灵精英灯隐',
    team: [
      ['creature_026', 48],
      ['creature_119', 49],
      ['creature_228', 49],
      ['creature_134', 50],
    ],
    reward: 2600,
  },
  leagueDark: {
    name: '恶之精英夜准',
    team: [
      ['creature_052', 49],
      ['creature_131', 50],
      ['creature_087', 50],
      ['creature_114', 51],
    ],
    reward: 2800,
  },
  leagueDragon: {
    name: '龙之精英澜脊',
    team: [
      ['creature_067', 50],
      ['creature_090', 51],
      ['creature_105', 51],
      ['creature_243', 52],
    ],
    reward: 3000,
  },
  leagueChampion: {
    name: '冠军望野',
    team: [
      ['creature_003', 52],
      ['creature_006', 52],
      ['creature_009', 52],
      ['creature_134', 53],
      ['creature_206', 53],
      ['creature_243', 54],
    ],
    reward: 6000,
  },
};
export const LEAGUE_PREREQUISITES: Record<string, string[]> = {
  leagueQualified: LEAGUE_BADGES,
  rivalLeague: LEAGUE_BADGES,
  championScout: ['catchTutorial'],
  champion: ['cleared_leagueChampion', 'leagueQualified', 'rivalLeague'],
  leagueEnding: ['champion'],
  creditsViewed: ['leagueEnding'],
  journeyComplete: ['champion', 'starReport', 'creditsViewed'],
  journeyCreditsViewed: ['journeyComplete'],
  ...Object.fromEntries(
    LEAGUE_STAGES.flatMap((stage, i) => [
      [stage, ['leagueQualified', 'rivalLeague', ...LEAGUE_STAGES.slice(0, i)]],
      [
        `cleared_${stage}`,
        ['leagueQualified', 'rivalLeague', ...LEAGUE_STAGES.slice(0, i).map((e) => `cleared_${e}`)],
      ],
    ]),
  ),
};
export const LEAGUE_MILESTONES: [string, string][] = [
  ['联盟 · 八徽章认证', 'leagueQualified'],
  ['同行终场 · 与阿澈完成巡礼切磋', 'rivalLeague'],
  ...LEAGUE_STAGES.map((event, i): [string, string] => [
    `精英与冠军 · ${LEAGUE_STAGE_NAMES[i]}`,
    `cleared_${event}`,
  ]),
  ['冠军名录 · 登记同行伙伴', 'champion'],
  ['归途 · 完整地区与联盟结局', 'journeyComplete'],
];
