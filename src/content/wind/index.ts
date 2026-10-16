import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';

const ridge = terrain(46, 34);
ridge.fill(8, 0, 1, 34, ':');
ridge.fill(8, 26, 31, 1, ':');
ridge.fill(38, 5, 1, 22, ':');
ridge.fill(8, 5, 36, 1, ':');
ridge.fill(43, 0, 1, 6, ':');
ridge.fill(17, 9, 13, 13, '#');
ridge.fill(18, 13, 11, 5, '~');
ridge.fill(8, 16, 31, 1, ':');
ridge.fill(18, 16, 11, 1, '=');
ridge.fill(38, 10, 8, 1, ':');
ridge.fill(2, 3, 4, 8, 'g');
ridge.fill(10, 23, 6, 7, 'g');
ridge.fill(32, 18, 4, 6, 'g');
ridge.fill(32, 6, 4, 5, ',');
ridge.fill(10, 9, 5, 7, ',');
const town = terrain(38, 30);
town.fill(3, 2, 7, 4, 'C');
town.fill(24, 2, 9, 4, 'G');
town.fill(3, 12, 7, 4, 'S');
town.fill(22, 19, 8, 4, 'H');
town.fill(2, 22, 7, 4, 'H');
town.fill(18, 0, 1, 30, ':');
town.fill(6, 6, 28, 1, ':');
town.fill(6, 16, 31, 1, ':');
town.fill(6, 6, 1, 15, ':');
town.fill(28, 6, 1, 12, ':');
town.fill(18, 25, 16, 1, ':');
town.fill(33, 12, 5, 1, ':');
town.fill(33, 12, 1, 14, ':');
town.fill(11, 9, 4, 4, '^');
town.fill(21, 9, 4, 4, '^');
const station = terrain(34, 28, ':');
station.fill(9, 3, 5, 8, '#');
station.fill(20, 15, 4, 8, '#');
station.fill(0, 20, 10, 1, ':');
station.fill(26, 3, 5, 5, 'g');
const sanctuary = terrain(44, 34, ',');
sanctuary.fill(0, 22, 40, 1, ':');
sanctuary.fill(6, 4, 1, 25, ':');
sanctuary.fill(6, 4, 30, 1, ':');
sanctuary.fill(35, 4, 1, 25, ':');
sanctuary.fill(6, 28, 30, 1, ':');
sanctuary.fill(14, 9, 13, 15, '#');
sanctuary.fill(15, 10, 11, 13, '~');
sanctuary.fill(6, 16, 30, 1, ':');
sanctuary.fill(15, 16, 11, 1, '=');
sanctuary.fill(3, 5, 3, 7, 'g');
sanctuary.fill(28, 18, 6, 8, 'g');
sanctuary.fill(36, 5, 5, 9, 'g');
const gym = terrain(32, 26, ':');
gym.fill(1, 16, 30, 1, '#');
gym.fill(16, 16, 1, 1, ':');
gym.fill(1, 9, 30, 1, '#');
gym.fill(16, 9, 1, 1, ':');
gym.fill(16, 25, 1, 1, ':');
gym.fill(3, 3, 7, 3, '^');
gym.fill(23, 19, 6, 3, '^');
const rare = (n: number, name: string, level: number) => ({
  speciesId: `creature_${n}`,
  name,
  level,
  requires: ['migrationRecovered'],
  awakened: `encounter${n}Awakened`,
  caught: `encounter${n}Caught`,
});

export const WIND_CHAPTER: AdventureChapter = {
  number: 5,
  title: '流羽篇 · 归来的迁徙风',
  town: 'wind',
  maps: [
    {
      id: 'windRoute',
      name: '五号回风山道',
      subtitle: '岩脊双环、架桥与风向标',
      rows: ridge.rows(),
      npcs: [
        {
          id: 'windTrainer',
          name: '山路陪练羽舟',
          x: 10,
          y: 27,
          role: 'trainer',
          event: 'windTraining',
          patrol: [
            [10, 27],
            [11, 27],
            [12, 27],
            [11, 27],
          ],
        },
        { id: 'kiteLine', name: '松脱的风筝线', x: 33, y: 8, role: 'clue' },
        { id: 'migrationLow', name: '低谷观察台', x: 12, y: 13, role: 'clue' },
        { id: 'pactStone', name: '观岩驿刻石', x: 34, y: 25, role: 'clue' },
      ],
      portals: [
        { x: 8, y: 33, map: 'volt', toX: 12, toY: 1 },
        { x: 43, y: 0, map: 'wind', toX: 18, toY: 28 },
        { x: 45, y: 10, map: 'windSanctuary', toX: 1, toY: 22 },
      ],
      encounters: [e(100, 19, 24, 28), e(103, 20, 25, 25), e(109, 19, 23, 27), e(113, 21, 25, 20)],
    },
    {
      id: 'wind',
      name: '风栖镇',
      subtitle: '风向可以不同，归路一直相通',
      rows: town.rows(),
      npcs: [
        { id: 'windHeal', name: '风栖治疗员', x: 6, y: 6, role: 'healer' },
        { id: 'windShop', name: '云岭补给行', x: 6, y: 16, role: 'shop' },
        { id: 'windGymGate', name: '流羽道馆入口', x: 28, y: 6, role: 'gate' },
        { id: 'windScientist', name: '气象员牧岚', x: 23, y: 16, role: 'quest' },
        { id: 'kiteChild', name: '风筝匠小穗', x: 11, y: 20, role: 'quest' },
        { id: 'migrationKeeper', name: '迁徙记录员白翎', x: 20, y: 25, role: 'quest' },
        { id: 'pactKeeper', name: '观岩驿守望人', x: 29, y: 25, role: 'quest' },
        { id: 'rivalWind', name: '阿澈', x: 19, y: 8, role: 'trainer', event: 'rivalWind' },
      ],
      portals: [
        { x: 18, y: 29, map: 'windRoute', toX: 43, toY: 1 },
        { x: 37, y: 12, map: 'windObservatory', toX: 1, toY: 20 },
      ],
      encounters: [],
    },
    {
      id: 'windObservatory',
      name: '山脊气象站',
      subtitle: '同一片天空里的两份记录',
      rows: station.rows(),
      npcs: [
        { id: 'windArchive', name: '历史风向图', x: 5, y: 5, role: 'clue' },
        { id: 'windVane', name: '实时回流仪', x: 17, y: 12, role: 'clue' },
        {
          id: 'windGuard',
          name: '定序社测风员',
          x: 28,
          y: 11,
          role: 'trainer',
          event: 'windGuard',
        },
        { id: 'windValve', name: '回风平衡阀', x: 28, y: 22, role: 'mechanism' },
      ],
      portals: [{ x: 0, y: 20, map: 'wind', toX: 36, toY: 12 }],
      encounters: [],
    },
    {
      id: 'windSanctuary',
      name: '断风岭保护地',
      subtitle: '架桥连接雪池、崖壁与迁徙高台',
      rows: sanctuary.rows(),
      npcs: [
        { id: 'kiteAnchor', name: '崖边风筝锚', x: 8, y: 5, role: 'mechanism' },
        { id: 'migrationPeak', name: '高岭观察台', x: 34, y: 6, role: 'clue' },
        { id: 'migrationNest', name: '旧巢观察台', x: 9, y: 27, role: 'clue' },
        { id: 'pactName', name: '旧驿平安名册', x: 30, y: 29, role: 'clue' },
        { id: 'thunderRoc', name: '远雷鹏', x: 36, y: 12, role: 'quest', event: 'encounter_115' },
        { id: 'cloudFairy', name: '栖云灵', x: 8, y: 11, role: 'quest', event: 'encounter_116' },
        { id: 'peakDragon', name: '断峰龙', x: 35, y: 27, role: 'quest', event: 'encounter_214' },
      ],
      portals: [{ x: 0, y: 22, map: 'windRoute', toX: 44, toY: 10 }],
      encounters: [
        e(106, 22, 27, 25),
        e(111, 22, 27, 20),
        e(201, 23, 28, 18),
        e(204, 23, 28, 12),
        e(207, 23, 28, 12),
        e(210, 23, 28, 8),
        e(212, 22, 27, 5),
      ],
    },
    {
      id: 'windGym',
      name: '流羽道馆',
      subtitle: '转动风标，让不同方向都能抵达',
      rows: gym.rows(),
      npcs: [
        { id: 'windSwitchOne', name: '南风风标', x: 7, y: 21, role: 'switch' },
        { id: 'windScout', name: '学徒羽铃', x: 16, y: 15, role: 'trainer', event: 'windScout' },
        { id: 'windSwitchTwo', name: '北风风标', x: 25, y: 12, role: 'switch' },
        { id: 'windKeeper', name: '空桥守望员', x: 16, y: 8, role: 'trainer', event: 'windKeeper' },
        { id: 'windLeader', name: '馆主岑羽', x: 16, y: 3, role: 'leader', event: 'windLeader' },
      ],
      portals: [{ x: 16, y: 25, map: 'wind', toX: 28, toY: 7 }],
      encounters: [],
    },
  ],
  trainers: {
    windTraining: {
      name: '山路陪练羽舟',
      team: [['creature_103', 20]],
      reward: 210,
      practice: true,
    },
    windScout: { name: '学徒羽铃', team: [['creature_103', 9]], reward: 240 },
    windKeeper: { name: '空桥守望员', team: [['creature_109', 10]], reward: 290 },
    windLeader: {
      name: '馆主岑羽',
      team: [
        ['creature_103', 10],
        ['creature_111', 12],
      ],
      reward: 1100,
    },
    windGuard: {
      name: '定序社测风员',
      team: [
        ['creature_104', 25],
        ['creature_110', 26],
      ],
      reward: 850,
    },
    rivalWind: {
      name: '阿澈',
      team: [
        ['creature_044', 25],
        ['creature_041', 26],
        ['creature_050', 25],
      ],
      reward: 800,
    },
  },
  gym: {
    number: 5,
    town: 'wind',
    map: 'windGym',
    gate: 'windGymGate',
    leader: 'windLeader',
    scout: 'windScout',
    keeper: 'windKeeper',
    switches: ['windSwitchOne', 'windSwitchTwo'],
    badge: '流羽徽章',
    tool: 'glider',
    toolName: '滑翔装备',
    entrance: { x: 16, y: 24 },
    barriers: [
      [16, 16, 'windSwitchOne'],
      [16, 9, 'windSwitchTwo'],
    ],
    switchDescriptions: [
      '你把南风风标转向外侧，第一座安全空桥展开。',
      '北风与南风的标记平行，第二座空桥展开。风的方向没有高下，只要找到相通的路。',
    ],
    intro: '岑羽：速度可以争先，方向要自己选择。让伙伴们展现自己的节奏吧！',
    lesson: '试着留意双方速度和连续出手次数，换人与回复药也属于你的战术。',
  },
  interactions: {
    windScientist: {
      requires: ['powerReport'],
      locked: ['气象站和道馆随时开放。回流调查需要雷鸣市乔弧的双路检修报告，先把 E-04 事件结案。'],
      rules: [
        {
          when: ['windBalanced'],
          absent: ['windReport'],
          sets: ['windReport'],
          money: 1100,
          items: { ultra_ball: 3, ether: 3 },
          lines: [
            '历史风向与现场回流吻合，抽取旁路才是迁徙紊乱的原因；不是鸟群预示灾难。',
            '你解开了测风锁，鸟群终于沿旧航路通过。旅费 1100、高级球 ×3、星泉露 ×3。',
            '回风被集中送往炉心城的熔炉校准站，矿山箱号也出现在调度图上。沿风栖镇西路或石脊城北路到炉心城，向工头炎砚出示封存图。',
          ],
        },
        {
          absent: ['windQuest'],
          sets: ['windQuest'],
          lines: [
            'E-04 的检修图说明有人抽走了回流。去东侧气象站对照历史风向图与实时回流仪，证据齐全后请测风员解除单向锁。',
            '不必等待特定天气，仪器保留完整记录；普通空桥一直开放。',
          ],
        },
      ],
      repeat: [
        '对照气象站两份风向记录，停止单向测风设备，再操作回风平衡阀。结案后可继续调查炉心城，迁徙支线可随时补做。',
      ],
    },
    windArchive: {
      requires: ['windQuest'],
      rules: [
        {
          absent: ['windClueOne'],
          sets: ['windClueOne'],
          lines: [
            '旧风向图每季都保留一条向海岸返回的气流。现在调度图只标进风，消失的回路通往炉心城。',
          ],
        },
      ],
      repeat: ['历史风向已封存，现场回流仪能验证这条缺口。'],
    },
    windVane: {
      requires: ['windQuest'],
      rules: [
        {
          absent: ['windClueTwo'],
          sets: ['windClueTwo'],
          lines: [
            '仪器显示风速本身正常，单向锁把回流送入矿石导管。电站异常与迁徙绕行有同一个原因。',
          ],
        },
      ],
      repeat: ['实时回流记录已保存，解除旁路不会影响公共观测。'],
    },
    windGuard: { requires: ['windClueOne', 'windClueTwo'], rules: [], repeat: [] },
    windValve: {
      requires: ['windGuard'],
      rules: [
        {
          absent: ['windBalanced'],
          sets: ['windBalanced'],
          lines: [
            '你解除调度锁，先开向海回流，再关闭私人抽取管。回风仪的两支指针重新相向。',
            '公共风标继续记录，迁徙高台恢复安静。回镇向牧岚报告。',
          ],
        },
      ],
      repeat: ['双向风道已恢复，去牧岚处结案。'],
    },
    rivalWind: { requires: ['windQuest'], rules: [], repeat: [] },
    kiteChild: {
      rules: [
        {
          when: ['kiteSecured'],
          absent: ['kiteReturned'],
          sets: ['kiteReturned'],
          money: 350,
          items: { skill_copy: 1, great_ball: 3 },
          lines: [
            '你把风筝沿锚索安全收回，没有攀上危险崖壁。小穗修好线轴，把风筝重新交给家人。',
            '「断线风筝」完成，旅费 350、复刻剂 ×1、超级球 ×3。',
          ],
        },
        {
          absent: ['kiteQuest'],
          sets: ['kiteQuest'],
          lines: [
            '风筝线落在五号山道东北角，锚在保护地西北的观景台。先检查线，再固定锚，最后回来找我。步道始终可走，不需要滑翔装备。',
          ],
        },
      ],
      repeat: ['先查五号山道的风筝线，再去保护地固定风筝锚。已完成的风筝不会重复领奖。'],
    },
    kiteLine: {
      requires: ['kiteQuest'],
      rules: [
        {
          absent: ['kiteLine'],
          sets: ['kiteLine'],
          lines: ['线没有断，只是卷入松动的线扣。你记下正确的绕线方向。'],
        },
      ],
      repeat: ['绕线方向已记录，保护地的风筝锚可安全操作。'],
    },
    kiteAnchor: {
      requires: ['kiteLine'],
      rules: [
        {
          absent: ['kiteSecured'],
          sets: ['kiteSecured'],
          lines: ['你按记录固定线扣，再缓缓收紧风筝锚。风筝沿公共护栏落回步道。回镇交给小穗。'],
        },
      ],
      repeat: ['风筝已安全收回，回镇找小穗。'],
    },
    migrationLow: {
      rules: [
        {
          absent: ['migrationLow'],
          sets: ['migrationLow'],
          lines: ['低谷的羽迹说明鸟群并未失踪，只改走了较慢的路线。记录风速，不去追赶幼鸟。'],
        },
      ],
      repeat: ['低谷记录已完成。'],
    },
    migrationPeak: {
      rules: [
        {
          absent: ['migrationPeak'],
          sets: ['migrationPeak'],
          lines: ['高岭还有旧航路的信号羽，保护地高台没有受损。观察不依赖实时天气。'],
        },
      ],
      repeat: ['高岭记录已完成。'],
    },
    migrationNest: {
      rules: [
        {
          absent: ['migrationNest'],
          sets: ['migrationNest'],
          lines: ['旧巢保留着完整巢材，没有精灵被带走。你划出不打扰孵育的安静路线。'],
        },
      ],
      repeat: ['旧巢记录已完成。'],
    },
    migrationKeeper: {
      rules: [
        {
          when: ['migrationLow', 'migrationPeak', 'migrationNest'],
          absent: ['migrationRecovered'],
          sets: ['migrationRecovered'],
          money: 400,
          items: { ultra_ball: 5 },
          lines: [
            '三份记录补全了鸟群的去向。我们设置缓慢绕行区和安静观测线，保护地重新适合休憩。',
            '「迁徙记录」完成，高级球 ×5、旅费 400。远雷鹏、栖云灵与断峰龙愿意在高台和雪池见你；无需先捕获任何一只。',
          ],
        },
      ],
      repeat: [
        '到山道低谷、保护地高岭和旧巢各记录一次，再回来汇总。三只稀有伙伴是独立相遇，未捕获可以重试。',
      ],
    },
    pactStone: {
      rules: [
        {
          absent: ['pactStone'],
          sets: ['pactStone'],
          lines: ['刻石写着「只要灯在，归人就有路」。名字与保护地的旧驿名册相互对应。'],
        },
      ],
      repeat: ['旧约石刻已记录。'],
    },
    pactName: {
      rules: [
        {
          absent: ['pactName'],
          sets: ['pactName'],
          lines: ['旧名册逐一记着所有驿员的去向：有人归乡，有人迁居，没有无故失踪的名字。'],
        },
      ],
      repeat: ['所有驿员的去向已有记录。'],
    },
    pactKeeper: {
      rules: [
        {
          when: ['pactStone', 'pactName'],
          absent: ['pactRecovered'],
          sets: ['pactRecovered'],
          items: { dragon_scale: 1, candy: 2 },
          lines: [
            '守望人接过拓印：观岩驿没有等来一场灾难，只是道路改迁。如今旧友的平安与旧约一起留在这里。',
            '「观岩驿旧约」完成，龙鳞 ×1、成长果 ×2。',
          ],
        },
      ],
      repeat: ['核对五号山道的刻石与保护地南侧的平安名册，让旧约有一个完整的结尾。'],
    },
    thunderRoc: {
      rules: [],
      repeat: [],
      locked: ['先完成低谷、高岭、旧巢三份迁徙观察，并向风栖镇白翎汇总。'],
    },
    cloudFairy: { rules: [], repeat: [], locked: ['白翎的迁徙汇总会恢复这片安静雪池的观测线。'] },
    peakDragon: {
      rules: [],
      repeat: [],
      locked: ['先完成迁徙观察与汇总，让保护地恢复不打扰精灵的步道。'],
    },
  },
  encounters: {
    encounter_115: rare(115, '远雷鹏', 30),
    encounter_116: rare(116, '栖云灵', 28),
    encounter_214: rare(214, '断峰龙', 32),
  },
  prerequisites: { windGuard: ['windClueOne', 'windClueTwo'], rivalWind: ['windQuest'] },
  milestones: [
    ['流羽 · 赢得岑羽的徽章', 'windLeader'],
    ['归风 · 恢复双向风道并结案', 'windReport'],
    ['断线风筝 · 安全收回', 'kiteReturned'],
    ['迁徙记录 · 低谷、高岭与旧巢', 'migrationRecovered'],
    ['观岩驿旧约 · 核对平安名册', 'pactRecovered'],
    ['同行 · 山脊切磋', 'rivalWind'],
  ],
  objectives: {
    wind: [
      ['windReport', '回风已恢复。炉心城的调度图接续主线，居民委托与道馆自由安排。'],
      ['windBalanced', '回访气象员牧岚，汇总风道回流记录。'],
      ['windQuest', '对照气象站历史与实时记录，解除单向锁后恢复回风。'],
    ],
    windObservatory: [
      ['windBalanced', '回风恢复，回镇向牧岚结案。'],
      ['windGuard', '操作回风平衡阀，恢复向海的回流。'],
      ['windQuest', '查阅风向图与回流仪，再与测风员对战。'],
    ],
  },
  rest: { x: 7, y: 6 },
  finds: {
    windRoute: [
      [4, 7],
      [12, 25],
      [33, 20],
      [41, 25],
    ],
    wind: [
      [12, 11],
      [25, 17],
      [32, 26],
    ],
    windSanctuary: [
      [4, 8],
      [30, 24],
      [39, 10],
    ],
  },
  indoor: ['windGym', 'windObservatory'],
  links: [
    {
      from: 'volt',
      exit: { x: 12, y: 0, map: 'windRoute', toX: 8, toY: 32 },
      paths: [[12, 0, 1, 7]],
    },
  ],
};
