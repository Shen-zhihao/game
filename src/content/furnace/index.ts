import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';

const road = terrain(44, 34, ',');
road.fill(9, 0, 1, 34, ':');
road.fill(9, 4, 35, 1, ':');
road.fill(9, 27, 29, 1, ':');
road.fill(37, 4, 1, 24, ':');
road.fill(0, 16, 38, 1, ':');
road.fill(16, 9, 14, 12, '#');
road.fill(18, 11, 10, 8, 'L');
road.fill(3, 5, 4, 8, 'g');
road.fill(31, 21, 5, 6, 'g');
road.fill(12, 24, 5, 7, 'g');
const town = terrain(40, 32, ',');
town.fill(2, 2, 6, 4, 'C');
town.fill(25, 2, 9, 4, 'G');
town.fill(2, 12, 7, 4, 'S');
town.fill(24, 21, 8, 4, 'H');
town.fill(3, 23, 7, 4, 'H');
town.fill(18, 0, 1, 32, ':');
town.fill(5, 6, 30, 1, ':');
town.fill(5, 16, 35, 1, ':');
town.fill(29, 6, 1, 15, ':');
town.fill(5, 6, 1, 15, ':');
town.fill(5, 27, 30, 1, ':');
town.fill(11, 9, 4, 4, '^');
const foundry = terrain(38, 30, ':');
foundry.fill(8, 3, 5, 9, '#');
foundry.fill(8, 18, 5, 8, '#');
foundry.fill(22, 8, 7, 12, 'L');
foundry.fill(22, 14, 7, 1, '=');
foundry.fill(37, 24, 1, 1, ':');
foundry.fill(15, 3, 5, 4, 'g');
foundry.fill(30, 21, 5, 5, 'g');
const springs = terrain(42, 32, ',');
springs.fill(0, 18, 37, 1, ':');
springs.fill(6, 4, 1, 24, ':');
springs.fill(6, 4, 31, 1, ':');
springs.fill(36, 4, 1, 24, ':');
springs.fill(6, 27, 31, 1, ':');
springs.fill(13, 9, 15, 14, '~');
springs.fill(6, 15, 31, 1, ':');
springs.fill(13, 15, 15, 1, '=');
springs.fill(30, 20, 5, 5, 'g');
springs.fill(2, 6, 3, 8, 'g');
springs.fill(8, 24, 7, 3, 'g');
const gym = terrain(32, 26, ':');
gym.fill(1, 16, 30, 1, 'L');
gym.fill(16, 16, 1, 1, ':');
gym.fill(1, 9, 30, 1, 'L');
gym.fill(16, 9, 1, 1, ':');
gym.fill(16, 25, 1, 1, ':');
const rare = (n: number, name: string, level: number) => ({
  speciesId: `creature_${n}`,
  name,
  level,
  requires: ['springRestored'],
  awakened: `encounter${n}Awakened`,
  caught: `encounter${n}Caught`,
});
export const FURNACE_CHAPTER: AdventureChapter = {
  number: 6,
  title: '炉心篇 · 留给归途的温度',
  town: 'furnace',
  maps: [
    {
      id: 'furnaceRoute',
      name: '六号熔脊回廊',
      subtitle: '石脊旧路与风栖山路在冷却岩环相接',
      rows: road.rows(),
      npcs: [
        {
          id: 'furnaceTrainer',
          name: '耐热训练员',
          x: 11,
          y: 28,
          role: 'trainer',
          event: 'furnaceTraining',
          patrol: [
            [11, 28],
            [12, 28],
            [13, 28],
            [12, 28],
          ],
        },
        { id: 'toolCase', name: '路边工匠工具箱', x: 33, y: 24, role: 'clue' },
        { id: 'oldFreight', name: '旧货运路标', x: 11, y: 8, role: 'clue' },
      ],
      portals: [
        { x: 9, y: 33, map: 'stone', toX: 10, toY: 1 },
        { x: 43, y: 4, map: 'wind', toX: 1, toY: 16 },
        { x: 9, y: 0, map: 'furnace', toX: 18, toY: 30 },
        { x: 0, y: 16, map: 'foundry', toX: 36, toY: 24 },
      ],
      encounters: [e(120, 26, 31, 30), e(125, 27, 32, 25), e(215, 26, 31, 30), e(221, 27, 32, 15)],
    },
    {
      id: 'furnace',
      name: '炉心城',
      subtitle: '每一份热量都有回去的路',
      rows: town.rows(),
      npcs: [
        { id: 'furnaceHeal', name: '炉心治疗员', x: 5, y: 6, role: 'healer' },
        { id: 'furnaceShop', name: '熔脊补给行', x: 5, y: 16, role: 'shop' },
        { id: 'fireGymGate', name: '炉心道馆入口', x: 29, y: 6, role: 'gate' },
        { id: 'furnaceForeman', name: '工头炎砚', x: 22, y: 16, role: 'quest' },
        { id: 'toolMaker', name: '工匠砺青', x: 11, y: 20, role: 'quest' },
        { id: 'springKeeper', name: '温泉师暖汀', x: 31, y: 27, role: 'quest' },
        { id: 'oldForeman', name: '退休工头禾炭', x: 7, y: 27, role: 'quest' },
        {
          id: 'rivalFurnace',
          name: '阿澈',
          x: 19,
          y: 9,
          role: 'trainer',
          event: 'rivalFurnace',
          storyBattle: true,
        },
      ],
      portals: [
        { x: 18, y: 31, map: 'furnaceRoute', toX: 9, toY: 1 },
        { x: 39, y: 16, map: 'hotSprings', toX: 1, toY: 18 },
      ],
      encounters: [],
    },
    {
      id: 'foundry',
      name: '熔炉校准站',
      subtitle: '矿山箱号的终点，公共冷却桥一直开放',
      rows: foundry.rows(),
      npcs: [
        { id: 'foundryCrate', name: '封存晶矿箱', x: 16, y: 6, role: 'clue' },
        { id: 'foundryPressure', name: '双向压力计', x: 20, y: 23, role: 'clue' },
        {
          id: 'foundryGuard',
          name: '定序社校准主管',
          x: 32,
          y: 8,
          role: 'trainer',
          event: 'foundryGuard',
        },
        { id: 'foundryConsole', name: '过载回路控制台', x: 32, y: 3, role: 'mechanism' },
        { id: 'oldLedger', name: '公开领料总账', x: 4, y: 8, role: 'clue' },
        { id: 'toolRack', name: '检修工具归还架', x: 5, y: 22, role: 'mechanism' },
      ],
      portals: [{ x: 37, y: 24, map: 'furnaceRoute', toX: 1, toY: 16 }],
      encounters: [e(117, 27, 33, 28), e(120, 28, 33, 27), e(215, 28, 34, 25), e(223, 28, 33, 20)],
    },
    {
      id: 'hotSprings',
      name: '温泉冷石谷',
      subtitle: '冷溪、暖泉与黑曜石岸的两层环路',
      rows: springs.rows(),
      npcs: [
        { id: 'springCold', name: '冷溪温标', x: 8, y: 6, role: 'clue' },
        { id: 'springWarm', name: '暖泉温标', x: 35, y: 6, role: 'clue' },
        { id: 'springMix', name: '冷石混流槽', x: 35, y: 26, role: 'mechanism' },
        {
          id: 'obsidianScorpion',
          name: '黑曜蝎',
          x: 8,
          y: 20,
          role: 'quest',
          event: 'encounter_127',
        },
        { id: 'sunButterfly', name: '日冕蝶', x: 31, y: 20, role: 'quest', event: 'encounter_128' },
        { id: 'smokeFox', name: '硫烟面狐', x: 33, y: 28, role: 'quest', event: 'encounter_225' },
      ],
      portals: [{ x: 0, y: 18, map: 'furnace', toX: 38, toY: 16 }],
      encounters: [e(123, 28, 34, 45), e(218, 28, 34, 35), e(125, 27, 33, 20)],
    },
    {
      id: 'fireGym',
      name: '炉心道馆',
      subtitle: '先给热量一条回路，再看火焰的力量',
      rows: gym.rows(),
      npcs: [
        { id: 'fireSwitchOne', name: '冷却支路阀', x: 7, y: 21, role: 'switch' },
        { id: 'fireScout', name: '学徒炽星', x: 16, y: 15, role: 'trainer', event: 'fireScout' },
        { id: 'fireSwitchTwo', name: '回温平衡阀', x: 25, y: 12, role: 'switch' },
        { id: 'fireKeeper', name: '冷却桥守卫', x: 16, y: 8, role: 'trainer', event: 'fireKeeper' },
        { id: 'fireLeader', name: '馆主烁岑', x: 16, y: 3, role: 'leader', event: 'fireLeader' },
      ],
      portals: [{ x: 16, y: 25, map: 'furnace', toX: 29, toY: 7 }],
      encounters: [],
    },
  ],
  trainers: {
    furnaceTraining: {
      name: '耐热训练员',
      team: [['creature_120', 28]],
      reward: 240,
      practice: true,
    },
    fireScout: { name: '学徒炽星', team: [['creature_120', 9]], reward: 270 },
    fireKeeper: { name: '冷却桥守卫', team: [['creature_117', 10]], reward: 310 },
    fireLeader: {
      name: '馆主烁岑',
      team: [
        ['creature_120', 10],
        ['creature_125', 12],
      ],
      reward: 1200,
    },
    foundryGuard: {
      name: '定序社校准主管',
      team: [
        ['creature_121', 31],
        ['creature_133', 32],
        ['creature_124', 31],
      ],
      reward: 1100,
    },
    rivalFurnace: {
      name: '阿澈',
      team: [
        ['creature_044', 31],
        ['creature_104', 32],
        ['creature_050', 31],
      ],
      reward: 950,
    },
  },
  gym: {
    number: 6,
    town: 'furnace',
    map: 'fireGym',
    gate: 'fireGymGate',
    leader: 'fireLeader',
    scout: 'fireScout',
    keeper: 'fireKeeper',
    switches: ['fireSwitchOne', 'fireSwitchTwo'],
    badge: '炉心徽章',
    tool: 'heatSuit',
    toolName: '隔热装备',
    entrance: { x: 16, y: 24 },
    barriers: [
      [16, 16, 'fireSwitchOne'],
      [16, 9, 'fireSwitchTwo'],
    ],
    switchDescriptions: [
      '冷却支路先行，第一座桥降到安全温度并展开。',
      '回温阀导向循环槽，第二座桥展开；热量可以流动，不必被抽走。',
    ],
    intro: '烁岑：能量不是越多越好，能与你的伙伴相配才有力量。来吧！',
    lesson: '天气会影响火、水与回复招式。准备补给，再选择适合自己的搭配。',
  },
  interactions: {
    furnaceForeman: {
      requires: ['windReport'],
      locked: ['普通城镇、道馆和工匠委托已经开放。熔炉异常的调查需风栖气象站的回流结案图。'],
      rules: [
        {
          when: ['furnaceShutdown'],
          absent: ['furnaceReport'],
          sets: ['furnaceReport'],
          money: 1400,
          items: { ultra_ball: 4, skill_copy: 2 },
          lines: [
            '箱号从石脊矿山、潮汐港、E-04 一直对应到这里。矿石不是失踪了，而是被定序社用来校准单向抽取设备。',
            '校准站公共冷却回路正常，过载来自强行抽走回流。你保留了设备与工人记录，取得的双向校准件不会出售、丢弃或消耗。',
            '获得旅费 1400、高级球 ×4、复刻剂 ×2。带校准件到镜湖镇的公开档案馆，请馆员镜禾查明古代双衡机制。',
          ],
        },
        {
          absent: ['furnaceQuest'],
          sets: ['furnaceQuest'],
          lines: [
            '回风图与矿山箱号都到了。沿熔脊回廊西侧公共冷却桥，到校准站查封存晶矿箱和压力计。',
            '确认停机方案后让主管停止阻挠，再在过载控制台关掉私人旁路。阿澈在为工人准备返程车，不需要捕获任何精灵来停炉。',
          ],
        },
      ],
      repeat: [
        '对照箱号与压力计，停止主管的过载回路。校准件与完整调度图将一起送到镜湖公开档案馆。',
      ],
    },
    foundryCrate: {
      requires: ['furnaceQuest'],
      rules: [
        {
          absent: ['foundryCrate'],
          sets: ['foundryCrate'],
          lines: [
            '晶矿箱的矿号、航季、E-04 登记连成完整运输链。箱内是装置校准晶体，没有被关押或失踪的精灵。',
          ],
        },
      ],
      repeat: ['运输箱号已完整封存。'],
    },
    foundryPressure: {
      requires: ['furnaceQuest'],
      rules: [
        {
          absent: ['foundryPressure'],
          sets: ['foundryPressure'],
          lines: [
            '两支压力针方向相同：回流也被当作输入。主接口通向星核遗迹，古老的双向槽却一直闲置。',
          ],
        },
      ],
      repeat: ['压力与主接口的记录已保存。'],
    },
    foundryGuard: { requires: ['foundryCrate', 'foundryPressure'], rules: [], repeat: [] },
    foundryConsole: {
      requires: ['foundryGuard'],
      rules: [
        {
          absent: ['furnaceShutdown'],
          sets: ['furnaceShutdown', 'returnFlowCalibrator'],
          lines: [
            '先接通公共冷却回路，再切断私人抽取支线，最后让双向槽缓慢归零。过载熔炉停止，城镇供热不受影响。',
            '你取出设备备用的「双向回流校准件」，记入不可出售、不可丢弃的主线手册。它不是随机掉落，也不要求支线或捕获。回城向炎砚核对箱号。',
          ],
        },
      ],
      repeat: ['过载旁路已停止，双向回流校准件保存在主线手册中。回城结案。'],
    },
    rivalFurnace: { requires: ['furnaceQuest'], rules: [], repeat: [] },
    toolMaker: {
      rules: [
        {
          when: ['toolReturned'],
          absent: ['toolReward'],
          sets: ['toolReward'],
          money: 450,
          items: { super_potion: 3, ether: 2 },
          lines: [
            '砺青逐件核对工具：每一件都回到了检修架，工人不用再冒险临时借用不合适的工具。',
            '「熔炉外的工具」完成，旅费 450、浓缩药 ×3、星泉露 ×2。',
          ],
        },
        {
          absent: ['toolQuest'],
          sets: ['toolQuest'],
          lines: [
            '回廊东南的工具箱落在路边。先看箱内清单，再放回校准站南侧的检修架，最后来向我说明。',
          ],
        },
      ],
      repeat: ['工具箱在回廊东南，检修架在校准站南侧。公共冷却桥一直可走。'],
    },
    toolCase: {
      requires: ['toolQuest'],
      rules: [
        {
          absent: ['toolCase'],
          sets: ['toolCase'],
          lines: ['你按清单检查扳手、量规与护套，全部完整。把工具安全封装，送往校准站的检修架。'],
        },
      ],
      repeat: ['工具清单已核对。'],
    },
    toolRack: {
      requires: ['toolCase'],
      rules: [
        {
          absent: ['toolReturned'],
          sets: ['toolReturned'],
          lines: ['按清单将工具归位，工人签下收据。回城向砺青报告，不会消耗你的战斗道具。'],
        },
      ],
      repeat: ['工具已归还，收据保留在任务册中。'],
    },
    springKeeper: {
      rules: [
        {
          when: ['springRestored'],
          absent: ['springReward'],
          sets: ['springReward'],
          money: 450,
          items: { ultra_ball: 5, candy: 2 },
          lines: [
            '暖汀确认两侧温度稳定，游客与野生精灵的休息区重新分开。',
            '「温泉里的冷石」完成，旅费 450、高级球 ×5、成长果 ×2。黑曜蝎、日冕蝶、硫烟面狐可在冷石谷独立定点相遇。',
          ],
        },
        {
          absent: ['springQuest'],
          sets: ['springQuest'],
          lines: [
            '冷石混流槽的阀门需要重新配平。先读冷溪与暖泉两块温标，再操作南侧的混流槽，最后回访。没有现实时间或天气要求。',
          ],
        },
      ],
      repeat: ['温标在冷石谷北侧两端，混流槽在东南。配平不需要隔热装备，安全步道一直开放。'],
    },
    springCold: {
      requires: ['springQuest'],
      rules: [
        {
          absent: ['springCold'],
          sets: ['springCold'],
          lines: ['冷溪温度稳定，是混流所需的冷端基准，不能把它全部堵住。'],
        },
      ],
      repeat: ['冷端基准已记录。'],
    },
    springWarm: {
      requires: ['springQuest'],
      rules: [
        {
          absent: ['springWarm'],
          sets: ['springWarm'],
          lines: ['暖泉温标保留完整曲线，热端只需按比例减流。无需等待太阳或下雨。'],
        },
      ],
      repeat: ['热端基准已记录。'],
    },
    springMix: {
      requires: ['springCold', 'springWarm'],
      rules: [
        {
          absent: ['springRestored'],
          sets: ['springRestored'],
          lines: [
            '你按两块温标交替调节冷、暖端，保留精灵休憩的缓流池。温度回到安全区，回城找暖汀。',
          ],
        },
      ],
      repeat: ['混流已经稳定，三位稀有伙伴的休憩岸恢复。'],
    },
    oldFreight: {
      rules: [
        {
          absent: ['oldFreight'],
          sets: ['oldFreight'],
          lines: [
            '旧路标记着矿石从未改运神秘禁区，而是一直运往校准站。停用后的公共路线也完整保留。',
          ],
        },
      ],
      repeat: ['旧货运方向已抄录。'],
    },
    oldLedger: {
      rules: [
        {
          absent: ['oldLedger'],
          sets: ['oldLedger'],
          lines: [
            '公开总账写明领料人和退料数量，早年的调度故障并非诅咒。禾炭的签名旁有一条未公开说明的更正。',
          ],
        },
      ],
      repeat: ['公开领料记录已抄录。'],
    },
    oldForeman: {
      rules: [
        {
          when: ['oldFreight', 'oldLedger'],
          absent: ['foremanTestimony'],
          sets: ['foremanTestimony'],
          items: { old_inscription: 1, respec: 1 },
          lines: [
            '禾炭：我当年只报输入，没有报回流，让大家误以为山脉会吞走热量。现在我把完整证词和更正交给公开档案馆。',
            '「老工头的证词」完成，古文碑片 ×1、重塑药剂 ×1。运输与早年事故都有可核对的记录，不再留下失踪工人与矿石的谜团。',
          ],
        },
      ],
      repeat: ['带来旧货运路标与公开总账的两份记录，我会把过去没说完整的事写清楚。'],
    },
    obsidianScorpion: {
      rules: [],
      repeat: [],
      locked: ['先协助暖汀读两块温标并配平混流槽，让冷石岸恢复。'],
    },
    sunButterfly: {
      rules: [],
      repeat: [],
      locked: ['混流槽稳定后它会从温暖花丛中现身，不需要等待烈日。'],
    },
    smokeFox: { rules: [], repeat: [], locked: ['先修复温泉冷石谷的混流，让烟雾有安全排出的路。'] },
  },
  encounters: {
    encounter_127: rare(127, '黑曜蝎', 34),
    encounter_128: rare(128, '日冕蝶', 35),
    encounter_225: rare(225, '硫烟面狐', 34),
  },
  prerequisites: {
    foundryGuard: ['foundryCrate', 'foundryPressure'],
    rivalFurnace: ['furnaceQuest'],
    furnaceShutdown: ['foundryGuard', 'returnFlowCalibrator'],
    returnFlowCalibrator: ['furnaceShutdown'],
  },
  milestones: [
    ['炉心 · 赢得烁岑的徽章', 'fireLeader'],
    ['停炉 · 取得双向回流校准件', 'furnaceShutdown'],
    ['运单终点 · 向炎砚结案', 'furnaceReport'],
    ['熔炉外的工具 · 逐件归还', 'toolReward'],
    ['温泉里的冷石 · 恢复混流', 'springReward'],
    ['老工头的证词 · 公开更正', 'foremanTestimony'],
    ['同行 · 炉心切磋', 'rivalFurnace'],
  ],
  objectives: {
    furnace: [
      ['furnaceReport', '运输链已查明，带主线校准件去镜湖镇查阅双衡档案。'],
      ['furnaceShutdown', '过载旁路已停止，回访炎砚封存完整运输证据。'],
      ['furnaceQuest', '对照校准站晶矿箱与压力计，停止过载后取主线校准件。'],
    ],
    foundry: [
      ['furnaceShutdown', '校准件已保存在主线手册，回炉心城结案。'],
      ['foundryGuard', '操作控制台，保留公共冷却并隔离私人旁路。'],
      ['furnaceQuest', '调查晶矿箱与压力计，核对矿山到 E-04 的运输链。'],
    ],
  },
  rest: { x: 6, y: 6 },
  finds: {
    furnaceRoute: [
      [5, 9],
      [32, 23],
      [14, 26],
    ],
    furnace: [
      [12, 11],
      [26, 27],
      [20, 19],
    ],
    hotSprings: [
      [3, 10],
      [31, 23],
      [12, 26],
    ],
    foundry: [
      [17, 4],
      [32, 24],
    ],
  },
  indoor: ['foundry', 'fireGym'],
  links: [
    {
      from: 'stone',
      exit: { x: 10, y: 0, map: 'furnaceRoute', toX: 9, toY: 32 },
      paths: [[10, 0, 1, 7]],
    },
    {
      from: 'wind',
      exit: { x: 0, y: 16, map: 'furnaceRoute', toX: 42, toY: 4 },
      paths: [[0, 16, 7, 1]],
    },
  ],
};
