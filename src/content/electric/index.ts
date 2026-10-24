import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';

const road = terrain(40, 28);
road.fill(0, 0, 1, 28, '#');
road.fill(12, 0, 1, 28, ':');
road.fill(12, 7, 23, 1, ':');
road.fill(12, 20, 23, 1, ':');
road.fill(34, 7, 1, 14, ':');
road.fill(34, 10, 6, 1, ':');
road.fill(18, 10, 9, 7, '~');
road.fill(18, 13, 9, 1, '=');
road.fill(12, 13, 23, 1, ':');
road.fill(18, 13, 9, 1, '=');
road.fill(3, 4, 6, 7, 'g');
road.fill(3, 18, 6, 5, 'g');
road.fill(29, 17, 4, 6, 'g');
road.fill(6, 11, 7, 1, ':');
road.fill(6, 11, 1, 8, ':');

const town = terrain(40, 28);
town.fill(2, 2, 6, 4, 'C');
town.fill(24, 2, 8, 4, 'G');
town.fill(3, 11, 6, 4, 'S');
town.fill(19, 10, 6, 4, 'H');
town.fill(29, 19, 6, 4, 'H');
town.fill(12, 0, 1, 28, ':');
town.fill(5, 6, 30, 1, ':');
town.fill(5, 15, 30, 1, ':');
town.fill(28, 6, 1, 18, ':');
town.fill(12, 23, 23, 1, ':');
town.fill(5, 15, 1, 9, ':');
town.fill(16, 18, 7, 4, '^');
town.fill(5, 23, 24, 1, ':');
town.fill(34, 8, 3, 12, '~');
town.fill(34, 15, 3, 1, '=');

const station = terrain(38, 28, ':');
station.fill(8, 3, 5, 6, '#');
station.fill(8, 16, 5, 6, '#');
station.fill(23, 8, 7, 9, '#');
station.fill(1, 12, 15, 3, '~');
station.fill(5, 12, 3, 3, '=');
station.fill(0, 18, 8, 1, ':');
station.fill(16, 20, 6, 4, 'g');
station.fill(31, 19, 4, 5, 'g');

const gym = terrain(30, 24, ':');
gym.fill(1, 14, 28, 1, '#');
gym.fill(14, 14, 1, 1, ':');
gym.fill(1, 8, 28, 1, '#');
gym.fill(14, 8, 1, 1, ':');
gym.fill(14, 23, 1, 1, ':');

export const ELECTRIC_CHAPTER: AdventureChapter = {
  number: 4,
  title: '霆光篇 · 逆流的电站',
  town: 'volt',
  maps: [
    {
      id: 'powerRoute',
      name: '四号滨海栈道',
      subtitle: '湿地、环桥与能源运输线',
      rows: road.rows(),
      npcs: [
        {
          id: 'powerTrainer',
          name: '栈道训练员',
          x: 10,
          y: 21,
          role: 'trainer',
          event: 'powerTraining',
          patrol: [
            [10, 21],
            [10, 22],
            [10, 23],
            [10, 22],
          ],
        },
        { id: 'gardenValve', name: '生态引水阀', x: 31, y: 7, role: 'mechanism' },
        { id: 'parcelTag', name: '防水包裹标签', x: 6, y: 9, role: 'clue' },
      ],
      portals: [
        { x: 12, y: 27, map: 'harbor', toX: 34, toY: 1 },
        { x: 12, y: 0, map: 'volt', toX: 12, toY: 26 },
        { x: 39, y: 10, map: 'powerStation', toX: 1, toY: 18 },
      ],
      encounters: [e(43, 12, 16, 35), e(129, 13, 17, 35), e(73, 13, 17, 30)],
    },
    {
      id: 'volt',
      name: '雷鸣市',
      subtitle: '把每一盏灯留给归途',
      rows: town.rows(),
      npcs: [
        { id: 'voltHeal', name: '雷鸣治疗员', x: 5, y: 6, role: 'healer' },
        { id: 'voltShop', name: '电桥补给行', x: 6, y: 15, role: 'shop' },
        { id: 'electricGymGate', name: '霆光道馆入口', x: 28, y: 6, role: 'gate' },
        { id: 'powerEngineer', name: '工程师乔弧', x: 18, y: 15, role: 'quest' },
        { id: 'lostClerk', name: '失物管理员小序', x: 22, y: 15, role: 'quest' },
        { id: 'parcelReceipt', name: '公开领取记录', x: 8, y: 23, role: 'clue' },
        { id: 'shiftClerk', name: '值班员照临', x: 29, y: 16, role: 'quest' },
        { id: 'gardenKeeper', name: '园丁芦芽', x: 18, y: 22, role: 'quest' },
        { id: 'gardenBed', name: '电梯旁的小花园', x: 20, y: 18, role: 'mechanism' },
        {
          id: 'rivalPower',
          name: '阿澈',
          x: 13,
          y: 8,
          role: 'trainer',
          event: 'rivalPower',
          storyBattle: true,
        },
      ],
      portals: [{ x: 12, y: 27, map: 'powerRoute', toX: 12, toY: 1 }],
      encounters: [],
    },
    {
      id: 'powerStation',
      name: 'E-04 能源站',
      subtitle: '公共检修桥与分流回路',
      rows: station.rows(),
      npcs: [
        { id: 'powerManifest', name: 'E-04 设备登记', x: 15, y: 5, role: 'clue' },
        { id: 'powerCircuit', name: '晶丝分流线', x: 21, y: 19, role: 'clue' },
        {
          id: 'powerGuard',
          name: '定序社接线员',
          x: 32,
          y: 8,
          role: 'trainer',
          event: 'powerGuard',
        },
        { id: 'powerConsole', name: '双路检修台', x: 33, y: 3, role: 'mechanism' },
        { id: 'shiftWest', name: '西班值班簿', x: 4, y: 7, role: 'clue' },
        { id: 'shiftEast', name: '东班值班簿', x: 31, y: 22, role: 'clue' },
      ],
      portals: [{ x: 0, y: 18, map: 'powerRoute', toX: 38, toY: 10 }],
      encounters: [e(129, 15, 19, 35), e(132, 15, 20, 35), e(73, 14, 18, 30)],
    },
    {
      id: 'electricGym',
      name: '霆光道馆',
      subtitle: '闭合回路，照亮各自的道路',
      rows: gym.rows(),
      npcs: [
        { id: 'electricSwitchOne', name: '分路开关', x: 7, y: 19, role: 'switch' },
        {
          id: 'electricScout',
          name: '学徒电芽',
          x: 14,
          y: 13,
          role: 'trainer',
          event: 'electricScout',
        },
        { id: 'electricSwitchTwo', name: '回路开关', x: 23, y: 11, role: 'switch' },
        {
          id: 'electricKeeper',
          name: '巡检员安伏',
          x: 14,
          y: 7,
          role: 'trainer',
          event: 'electricKeeper',
        },
        {
          id: 'electricLeader',
          name: '馆主衡电',
          x: 14,
          y: 3,
          role: 'leader',
          event: 'electricLeader',
        },
      ],
      portals: [{ x: 14, y: 23, map: 'volt', toX: 28, toY: 7 }],
      encounters: [],
    },
  ],
  trainers: {
    powerTraining: {
      name: '栈道训练员',
      team: [['creature_129', 15]],
      reward: 180,
      practice: true,
    },
    electricScout: { name: '学徒电芽', team: [['creature_129', 9]], reward: 220 },
    electricKeeper: { name: '巡检员安伏', team: [['creature_132', 10]], reward: 260 },
    electricLeader: {
      name: '馆主衡电',
      team: [
        ['creature_129', 10],
        ['creature_132', 12],
      ],
      reward: 1000,
    },
    powerGuard: {
      name: '定序社接线员',
      team: [
        ['creature_130', 19],
        ['creature_133', 20],
      ],
      reward: 650,
    },
    rivalPower: {
      name: '阿澈',
      team: [
        ['creature_044', 18],
        ['creature_040', 19],
      ],
      reward: 500,
    },
  },
  gym: {
    number: 4,
    town: 'volt',
    map: 'electricGym',
    gate: 'electricGymGate',
    leader: 'electricLeader',
    scout: 'electricScout',
    keeper: 'electricKeeper',
    switches: ['electricSwitchOne', 'electricSwitchTwo'],
    badge: '霆光徽章',
    tool: 'powerPass',
    toolName: '检修电梯权限',
    entrance: { x: 14, y: 22 },
    barriers: [
      [14, 14, 'electricSwitchOne'],
      [14, 8, 'electricSwitchTwo'],
    ],
  },
  interactions: {
    powerEngineer: {
      requires: ['harborReport'],
      locked: [
        '普通道路、道馆与居民委托一直开放。要核对非法分流，请先找港口沐舟完成 E-04 运单结案。',
      ],
      rules: [
        {
          when: ['powerRestored'],
          absent: ['powerReport'],
          sets: ['powerReport'],
          money: 900,
          items: { ultra_ball: 3, skill_copy: 1, candy: 2 },
          lines: [
            '登记号、晶丝采样和港口运单完全吻合：森林晶丝是定序社制作分流线的测量材料，不是精灵主动攻击人的证据。',
            '你先隔离旁路，再恢复公共照明。获得旅费 900、高级球 ×3、复刻剂 ×1、成长果 ×2。',
            '单向抽取让北部风道失去回流，迁徙记录开始异常。把双路检修图带去风栖镇气象站，查明回流去向；原件已存入任务册，不会丢失。',
          ],
        },
        {
          absent: ['powerQuest'],
          sets: ['powerQuest'],
          lines: [
            '沐舟的 E-04 副本到了。先到栈道东侧能源站核对设备登记和晶丝分流线，再请接线员停机配合。',
            '检修台有双路操作步骤，公共检修桥始终可达，无需霆光徽章。阿澈已帮我们疏散值班人员。',
          ],
        },
      ],
      repeat: [
        '调查中：核对设备登记与晶丝分流线，击退接线员，按检修步骤断开非法旁路后回来报告。',
        '若已结案：双路检修图和风道异常记录已封存。普通照明恢复，下一站是风栖镇气象站。',
      ],
    },
    powerManifest: {
      requires: ['powerQuest'],
      locked: ['先向雷鸣市工程师乔弧领取调查许可。'],
      rules: [
        {
          absent: ['powerClueOne'],
          sets: ['powerClueOne'],
          lines: [
            '设备登记的 E-04 箱号对应矿山原料与港口货柜。终端图纸显示能量只进不出，公共电网并不是事故源头。',
          ],
        },
      ],
      repeat: ['箱号和单向接口已记录；另一份证据在南侧晶丝回路。'],
    },
    powerCircuit: {
      requires: ['powerQuest'],
      locked: ['先取得乔弧的调查许可，避免碰触带电装置。'],
      rules: [
        {
          absent: ['powerClueTwo'],
          sets: ['powerClueTwo'],
          lines: [
            '林间晶丝被编成测量线，沿矿石共鸣频率截取回流。登记图和现场接法吻合，定序社的非法旁路已有双重证据。',
          ],
        },
      ],
      repeat: ['晶丝用途已有现场证据。北侧接线员仍控制旁路，公共检修桥可从东侧绕行。'],
    },
    powerGuard: {
      requires: ['powerClueOne', 'powerClueTwo'],
      locked: ['先核对设备登记和晶丝回路，确认停机不会影响公共电网。'],
      rules: [],
      repeat: [],
    },
    powerConsole: {
      requires: ['powerGuard'],
      locked: ['先取得两份证据并让接线员停止阻挠，再按检修步骤操作。'],
      rules: [
        {
          absent: ['powerRestored'],
          sets: ['powerRestored'],
          lines: [
            '第一步隔离非法旁路，第二步闭合公共照明回路，第三步解除单向锁。你没有中断医院或居民供电。',
            '北部回流监测仍不稳定，调度图指向风栖山脊。带记录回乔弧处报告，不需要捕获任何精灵。',
          ],
        },
      ],
      repeat: ['公共电网已恢复；非法旁路隔离。回雷鸣市向乔弧结案。'],
    },
    lostClerk: {
      rules: [
        {
          when: ['parcelTag', 'parcelReceipt'],
          absent: ['lostReturned'],
          sets: ['lostReturned'],
          money: 280,
          items: { super_potion: 2 },
          lines: [
            '防水标签的蓝线编号与公开领取记录相符，你把失物交给真正的主人。无需猜名字，证据不全时也不会永久失败。',
            '「失物招领箱」完成，旅费 280、浓缩药 ×2。',
          ],
        },
      ],
      repeat: [
        '遗失包裹有蓝色防水标签。请核对四号栈道的标签和市南公开领取记录，两份都找到再来。已归还的失物不会重复领奖。',
      ],
    },
    parcelTag: {
      rules: [
        {
          absent: ['parcelTag'],
          sets: ['parcelTag'],
          lines: ['蓝线编号 L-27，收件标记是一朵五瓣花。你抄下特征，原标签留在防水夹中。'],
        },
      ],
      repeat: ['L-27 的编号与五瓣花特征已记录。'],
    },
    parcelReceipt: {
      rules: [
        {
          absent: ['parcelReceipt'],
          sets: ['parcelReceipt'],
          lines: [
            '公开失物登记写着 L-27 与五瓣花，签收人是花园的芦芽。带着两份特征交给失物管理员。',
          ],
        },
      ],
      repeat: ['签收记录已核对。'],
    },
    shiftWest: {
      rules: [
        {
          absent: ['shiftWest'],
          sets: ['shiftWest'],
          lines: ['西班值班簿记录：公共电网始终供电，异常仅出现在外接旁路。你记下完整交班时刻。'],
        },
      ],
      repeat: ['西班记录已抄入任务册。'],
    },
    shiftEast: {
      rules: [
        {
          absent: ['shiftEast'],
          sets: ['shiftEast'],
          lines: ['东班值班簿补全了检修人员名单，没有人失踪。异常信号在交班后转向北部风道。'],
        },
      ],
      repeat: ['东班名单与时刻已核对。'],
    },
    shiftClerk: {
      rules: [
        {
          when: ['shiftWest', 'shiftEast'],
          absent: ['shiftRecovered'],
          sets: ['shiftRecovered'],
          items: { great_ball: 5, ether: 2 },
          lines: [
            '两本值班簿补齐了交接，家属终于得到平安消息。调度异常与工人失踪无关。',
            '「电站值班簿」完成，超级球 ×5、星泉露 ×2。',
          ],
        },
      ],
      repeat: ['公共检修桥一直开放。帮我对上能源站西班与东班的两本值班簿，交班记录就完整了。'],
    },
    gardenKeeper: {
      rules: [
        {
          absent: ['gardenQuest'],
          sets: ['gardenQuest'],
          lines: [
            '花园水渠停了，阀门在四号栈道东侧。打开引水阀，再来花坛按下灌溉钮，就能恢复这里。',
            '园艺支线不影响公共电梯和道馆；不必购买或交付任何稀有材料。',
          ],
        },
      ],
      repeat: ['引水阀在栈道东侧，灌溉钮在这座小花园的花坛旁。'],
    },
    gardenValve: {
      requires: ['gardenQuest'],
      locked: ['先问雷鸣市的园丁芦芽，确认这条生态引水支线。'],
      rules: [
        {
          absent: ['gardenFlow'],
          sets: ['gardenFlow'],
          lines: ['你打开生态支线引水阀，清水通过封闭细渠流向花园，不会影响河口的正常水量。'],
        },
      ],
      repeat: ['生态引水已经开启，回花坛启动灌溉。'],
    },
    gardenBed: {
      requires: ['gardenFlow'],
      locked: ['先找园丁芦芽说明情况，并打开四号栈道的生态引水阀。'],
      rules: [
        {
          absent: ['gardenRestored'],
          sets: ['gardenRestored'],
          items: { candy: 2, respec: 1 },
          lines: [
            '灌溉缓缓流过花坛，电梯旁的五瓣花重新挺起。维修人员也有了可以休息的花园。',
            '「电梯旁的小花园」完成，成长果 ×2、重塑药剂 ×1。',
          ],
        },
      ],
      repeat: ['花园已经恢复，公共休息区重新开放。'],
    },
    rivalPower: {
      requires: ['powerQuest'],
      locked: ['阿澈正在帮工程师疏散值班员，先和乔弧说明港口运单。'],
      rules: [],
      repeat: [],
    },
  },
  prerequisites: { powerGuard: ['powerClueOne', 'powerClueTwo'], rivalPower: ['powerQuest'] },
  milestones: [
    ['霆光 · 赢得衡电的徽章', 'electricLeader'],
    ['逆流 · 取得设备与晶丝证据', 'powerClueTwo'],
    ['停机 · 隔离非法分流', 'powerRestored'],
    ['归灯 · 向乔弧结案', 'powerReport'],
    ['失物招领箱 · 依据两份特征归还', 'lostReturned'],
    ['电站值班簿 · 补齐交接', 'shiftRecovered'],
    ['电梯旁的小花园 · 恢复生态灌溉', 'gardenRestored'],
    ['同行 · 与电站的阿澈切磋', 'rivalPower'],
  ],
  objectives: {
    volt: [
      ['powerReport', '电站已恢复。向北出发寻找风栖山脊的回流线索，道馆与居民委托自由安排。'],
      ['powerRestored', '非法旁路已隔离，回访乔弧领取报告与补给。'],
      ['powerQuest', '调查能源站设备登记与晶丝分流线，循双路检修图隔离旁路。'],
    ],
    powerStation: [
      ['powerRestored', '回雷鸣市向乔弧结案，查明风道回流异常。'],
      ['powerGuard', '操作北侧双路检修台，先隔离旁路再恢复公共照明。'],
      ['powerQuest', '记录 E-04 登记与晶丝回路，击退接线员后再操作检修台。'],
    ],
  },
  rest: { x: 6, y: 6 },
  finds: {
    powerRoute: [
      [5, 5],
      [30, 20],
      [35, 23],
    ],
    volt: [
      [16, 23],
      [10, 9],
      [31, 16],
    ],
    powerStation: [
      [20, 21],
      [33, 24],
      [16, 8],
    ],
  },
  indoor: ['electricGym', 'powerStation'],
  links: [
    {
      from: 'harbor',
      exit: { x: 34, y: 0, map: 'powerRoute', toX: 12, toY: 26 },
      paths: [
        [34, 0, 1, 7],
        [30, 6, 5, 1],
      ],
    },
  ],
};
