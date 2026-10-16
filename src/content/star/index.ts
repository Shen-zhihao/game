import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';

export const PHOTO_TOWNS = [
  'dawn',
  'moss',
  'stone',
  'harbor',
  'volt',
  'wind',
  'furnace',
  'lake',
  'star',
] as const;
const photoFlags = PHOTO_TOWNS.map((t) => `photoStamp_${t}`);
const road = terrain(48, 34);
road.fill(10, 0, 1, 34, ':');
road.fill(10, 7, 29, 1, ':');
road.fill(38, 7, 1, 23, ':');
road.fill(10, 29, 29, 1, ':');
road.fill(0, 18, 48, 1, ':');
road.fill(18, 10, 13, 15, '#');
road.fill(23, 10, 1, 15, ':');
road.fill(18, 18, 13, 1, ':');
road.fill(3, 5, 5, 8, 'g');
road.fill(32, 22, 5, 6, 'g');
road.fill(12, 25, 4, 6, 'g');
road.fill(38, 0, 1, 8, ':');
const town = terrain(44, 34, ':');
town.fill(3, 2, 7, 4, 'C');
town.fill(28, 2, 10, 4, 'G');
town.fill(3, 12, 7, 4, 'S');
town.fill(26, 22, 8, 4, 'H');
town.fill(4, 24, 8, 4, 'H');
town.fill(17, 9, 7, 7, '^');
town.fill(17, 21, 7, 8, 'g');
town.fill(22, 0, 1, 7, ':');
town.fill(22, 29, 1, 5, ':');
town.fill(43, 18, 1, 1, ':');
town.fill(0, 18, 1, 1, ':');
const core = terrain(44, 34, ':');
core.fill(11, 8, 5, 15, '#');
core.fill(29, 8, 5, 15, '#');
core.fill(18, 9, 8, 10, 'L');
core.fill(18, 14, 8, 1, '=');
core.fill(22, 33, 1, 1, ':');
const temple = terrain(42, 34, ':');
temple.fill(10, 7, 22, 1, '#');
temple.fill(10, 27, 22, 1, '#');
temple.fill(10, 7, 1, 21, '#');
temple.fill(31, 7, 1, 21, '#');
temple.fill(10, 17, 1, 1, ':');
temple.fill(31, 17, 1, 1, ':');
temple.fill(21, 7, 1, 1, ':');
temple.fill(21, 27, 1, 1, ':');
temple.fill(16, 12, 10, 11, '~');
temple.fill(16, 17, 10, 1, '=');
temple.fill(0, 17, 1, 1, ':');
temple.fill(21, 0, 1, 7, ':');
const hall = terrain(38, 30, ':');
hall.fill(8, 6, 22, 1, '#');
hall.fill(8, 23, 22, 1, '#');
hall.fill(8, 6, 1, 18, '#');
hall.fill(29, 6, 1, 18, '#');
hall.fill(18, 6, 1, 1, ':');
hall.fill(18, 23, 1, 1, ':');
hall.fill(18, 29, 1, 1, ':');
hall.fill(12, 12, 4, 6, 'L');
hall.fill(23, 12, 4, 6, '~');
const gym = terrain(34, 28, ':');
gym.fill(1, 18, 32, 1, '#');
gym.fill(17, 18, 1, 1, ':');
gym.fill(1, 10, 32, 1, '#');
gym.fill(17, 10, 1, 1, ':');
gym.fill(17, 27, 1, 1, ':');
const rare = (n: number, name: string, level: number, requires = ['pilgrimagePhoto']) => ({
  speciesId: `creature_${n}`,
  name,
  level,
  requires,
  awakened: `encounter${n}Awakened`,
  caught: `encounter${n}Caught`,
});
export const STAR_CHAPTER: AdventureChapter = {
  number: 8,
  title: '星岚篇 · 让星流回到众人之间',
  town: 'star',
  maps: [
    {
      id: 'starRoute',
      name: '十号星辉环道',
      subtitle: '炉心、镜湖与星岚之间的双环大道',
      rows: road.rows(),
      npcs: [
        {
          id: 'starTrainer',
          name: '星辉陪练',
          x: 12,
          y: 30,
          role: 'trainer',
          event: 'starTraining',
          patrol: [
            [12, 30],
            [13, 30],
            [14, 30],
            [13, 30],
          ],
        },
        { id: 'pactCaretaker', name: '古庙守望者静岚', x: 35, y: 7, role: 'quest' },
      ],
      portals: [
        { x: 0, y: 18, map: 'furnace', toX: 18, toY: 1 },
        { x: 47, y: 18, map: 'lake', toX: 18, toY: 1 },
        { x: 10, y: 0, map: 'star', toX: 22, toY: 32 },
        { x: 38, y: 0, map: 'ancientTemple', toX: 1, toY: 17 },
      ],
      encounters: [e(165, 37, 43, 25), e(171, 37, 43, 25), e(173, 37, 43, 25), e(160, 37, 43, 25)],
    },
    {
      id: 'star',
      name: '星岚城',
      subtitle: '每一盏灯，都有自己的来处与归途',
      rows: town.rows(),
      npcs: [
        { id: 'starHeal', name: '星岚治疗员', x: 6, y: 6, role: 'healer' },
        { id: 'starShop', name: '星桥补给行', x: 6, y: 16, role: 'shop' },
        { id: 'starGymGate', name: '星岚道馆入口', x: 33, y: 6, role: 'gate' },
        { id: 'starCoordinator', name: '协调员知衡', x: 27, y: 17, role: 'quest' },
        { id: 'photoKeeper', name: '巡礼摄影师雨帧', x: 12, y: 29, role: 'quest' },
        { id: 'rivalStar', name: '阿澈', x: 23, y: 8, role: 'trainer', event: 'rivalStar' },
        { id: 'dreamCat', name: '梦灯猫', x: 8, y: 29, role: 'quest', event: 'encounter_138' },
        { id: 'bronzePigeon', name: '铜壳鸽', x: 36, y: 27, role: 'quest', event: 'encounter_139' },
        { id: 'signalSpirit', name: '讯流灵', x: 28, y: 21, role: 'quest', event: 'encounter_140' },
        {
          id: 'anchorButler',
          name: '锚钟管家',
          x: 4,
          y: 20,
          role: 'quest',
          event: 'encounter_236',
        },
        { id: 'neonJester', name: '霓幕小丑', x: 37, y: 12, role: 'quest', event: 'encounter_237' },
      ],
      portals: [
        { x: 22, y: 33, map: 'starRoute', toX: 10, toY: 1 },
        { x: 22, y: 0, map: 'starCore', toX: 22, toY: 32 },
      ],
      encounters: [
        e(226, 38, 44, 25),
        e(229, 38, 44, 25),
        e(232, 38, 44, 20),
        e(234, 38, 44, 20),
        e(135, 37, 43, 10),
      ],
    },
    {
      id: 'starCore',
      name: '星核调度庭',
      subtitle: '不是夺走能量，而是让所有支路重新相通',
      rows: core.rows(),
      npcs: [
        { id: 'coreReadout', name: '星流调度总表', x: 21, y: 5, role: 'clue' },
        { id: 'coreWest', name: '西侧林矿支路', x: 7, y: 10, role: 'mechanism' },
        { id: 'coreEast', name: '东侧潮风支路', x: 37, y: 10, role: 'mechanism' },
        {
          id: 'coreCommander',
          name: '定序社首席纪衡',
          x: 22,
          y: 23,
          role: 'trainer',
          event: 'coreCommander',
        },
        { id: 'coreReturn', name: '双向回流槽', x: 35, y: 27, role: 'mechanism' },
        { id: 'coreRegulator', name: '星流主锁', x: 7, y: 27, role: 'mechanism' },
        {
          id: 'coreDragonEcho',
          name: '终宵烛龙的防御回响',
          x: 36,
          y: 4,
          role: 'echo',
          artSpeciesId: 'creature_250',
          visibleWhen: ['coreAwakened'],
          hiddenWhen: ['coreStabilized'],
        },
      ],
      portals: [{ x: 22, y: 33, map: 'star', toX: 22, toY: 1 }],
      encounters: [],
    },
    {
      id: 'ancientTemple',
      name: '双衡古庙',
      subtitle: '古老的两条回路，仍为归途留着灯',
      rows: temple.rows(),
      npcs: [
        { id: 'templeWater', name: '回水铭槽', x: 7, y: 8, role: 'mechanism' },
        { id: 'templeLight', name: '归光铭槽', x: 35, y: 8, role: 'mechanism' },
        { id: 'templePact', name: '古庙双衡碑', x: 21, y: 29, role: 'clue' },
        {
          id: 'balanceGuardian',
          name: '双衡星兽',
          x: 21,
          y: 9,
          role: 'quest',
          event: 'encounter_249',
        },
      ],
      portals: [
        { x: 0, y: 17, map: 'starRoute', toX: 38, toY: 1 },
        { x: 21, y: 0, map: 'nightHall', toX: 18, toY: 28 },
      ],
      encounters: [],
    },
    {
      id: 'nightHall',
      name: '终宵厅',
      subtitle: '冷端与暖端的回声，是可以重新理解的记忆',
      rows: hall.rows(),
      npcs: [
        { id: 'nightCold', name: '冷端回声壁', x: 6, y: 9, role: 'clue' },
        { id: 'nightFlame', name: '暖端回声壁', x: 31, y: 9, role: 'clue' },
        { id: 'nightBalance', name: '终宵回声台', x: 18, y: 25, role: 'mechanism' },
        {
          id: 'nightDragon',
          name: '终宵烛龙',
          x: 18,
          y: 9,
          role: 'quest',
          event: 'encounter_250',
          visibleWhen: ['nightEchoes'],
        },
      ],
      portals: [{ x: 18, y: 29, map: 'ancientTemple', toX: 21, toY: 1 }],
      encounters: [],
    },
    {
      id: 'starGym',
      name: '星岚道馆',
      subtitle: '没有唯一的属性，也没有唯一的通关思路',
      rows: gym.rows(),
      npcs: [
        { id: 'starSwitchOne', name: '协同入阵台', x: 7, y: 23, role: 'switch' },
        { id: 'starScout', name: '学徒初衡', x: 17, y: 17, role: 'trainer', event: 'starScout' },
        { id: 'starSwitchTwo', name: '协同回阵台', x: 26, y: 13, role: 'switch' },
        { id: 'starKeeper', name: '巡礼守望员', x: 17, y: 9, role: 'trainer', event: 'starKeeper' },
        { id: 'starLeader', name: '馆主闻衡', x: 17, y: 3, role: 'leader', event: 'starLeader' },
      ],
      portals: [{ x: 17, y: 27, map: 'star', toX: 33, toY: 7 }],
      encounters: [],
    },
  ],
  trainers: {
    starTraining: { name: '星辉陪练', team: [['creature_229', 40]], reward: 280, practice: true },
    starScout: {
      name: '学徒初衡',
      team: [
        ['creature_165', 9],
        ['creature_232', 9],
      ],
      reward: 320,
    },
    starKeeper: {
      name: '巡礼守望员',
      team: [
        ['creature_229', 10],
        ['creature_234', 10],
      ],
      reward: 370,
    },
    starLeader: {
      name: '馆主闻衡',
      team: [
        ['creature_171', 10],
        ['creature_226', 11],
        ['creature_232', 12],
      ],
      reward: 1600,
    },
    coreCommander: {
      name: '定序社首席纪衡',
      team: [
        ['creature_137', 42],
        ['creature_134', 43],
        ['creature_122', 44],
        ['creature_243', 43],
      ],
      reward: 2000,
    },
    rivalStar: {
      name: '阿澈',
      team: [
        ['creature_045', 41],
        ['creature_105', 42],
        ['creature_124', 41],
        ['creature_050', 41],
      ],
      reward: 1500,
    },
  },
  gym: {
    number: 8,
    town: 'star',
    map: 'starGym',
    gate: 'starGymGate',
    leader: 'starLeader',
    scout: 'starScout',
    keeper: 'starKeeper',
    switches: ['starSwitchOne', 'starSwitchTwo'],
    badge: '星岚徽章',
    tool: 'coordinationManual',
    toolName: '协同训练手册',
    entrance: { x: 17, y: 26 },
    barriers: [
      [17, 18, 'starSwitchOne'],
      [17, 10, 'starSwitchTwo'],
    ],
    switchDescriptions: [
      '入阵台记录你的队伍，第一段协同回廊打开，不检查任何其他徽章。',
      '回阵台完成本馆配合考验，通往闻衡的回廊打开。',
    ],
    intro: '闻衡：你可以用速度、耐久、属性覆盖，或自己的办法证明同行。没有唯一解，开始吧！',
    lesson:
      '综合队伍需要观察技能覆盖。精灵中心可免费重学已解锁招式，复刻剂可把已掌握技能教给任意伙伴。',
  },
  interactions: {
    starCoordinator: {
      requires: ['lakeRecords', 'returnFlowCalibrator'],
      locked: [
        '道馆、普通道路和居民委托都开放。星流调度庭的正式复原需要镜湖公开档案与炉心双向校准件。',
      ],
      rules: [
        {
          when: ['coreStabilized'],
          absent: ['starReport'],
          sets: ['starReport'],
          money: 2200,
          items: { ultra_ball: 6, skill_copy: 2, candy: 3 },
          lines: [
            '林矿、潮风与归流三路都已恢复，森林躁动、矿道共鸣、海闸逆流、迁徙绕行都有同一条完整证据链。',
            '纪衡承认了强行抽取的错误，设备封存交由各城共同管理；他与工人都已平安离场，公开记录会接受后续核查。',
            '终宵烛龙回应的是失衡的防御信号，回流恢复后已退回终宵厅。双衡古庙留下的不是捕获命令，而是保持两路相通的约定。',
            '获得旅费 2200、高级球 ×6、复刻剂 ×2、成长果 ×3。八枚不同徽章是联盟唯一地区资格；你可继续巡礼，也可回头补做任何居民故事。',
          ],
        },
        {
          absent: ['coreQuest'],
          sets: ['coreQuest'],
          lines: [
            '完整运输链和复原方法已经公开。到城北星核调度庭读取总表，先恢复西侧林矿与东侧潮风支路，再让纪衡解除主锁。',
            '阿澈负责疏散与守护公共回路。你保留主线校准件，恢复回流即可解决危机，不需要捕获终宵烛龙。',
          ],
        },
      ],
      repeat: [
        '星流复原：读总表、恢复林矿和潮风支路、击退纪衡、校准回流槽、解除主锁，再回来结案。区域报告与八馆巡礼可以分别推进。',
      ],
    },
    coreReadout: {
      requires: ['coreQuest'],
      rules: [
        {
          absent: ['coreClue'],
          sets: ['coreClue', 'coreAwakened'],
          lines: [
            '总表显示所有输入被压进单向主锁，连回流也被抽走。终宵烛龙的防御回响因此显现，并不是它主动制造灾难。',
            '公开档案与校准件给出完整步骤：西侧林矿、东侧潮风、双向归流，最后解除主锁。公共回路单独保留。',
          ],
        },
      ],
      repeat: ['总表与公开档案一致，先恢复两侧支路，最后才解除主锁。'],
    },
    coreWest: {
      requires: ['coreClue'],
      rules: [
        {
          absent: ['coreWest'],
          sets: ['coreWest'],
          lines: ['林矿支路接回自然回路，矿道与森林的异常频率开始减弱。公共照明保持供能。'],
        },
      ],
      repeat: ['林矿支路稳定。'],
    },
    coreEast: {
      requires: ['coreClue'],
      rules: [
        {
          absent: ['coreEast'],
          sets: ['coreEast'],
          lines: ['潮风支路恢复双向流动，海闸与山脊不再被总接口强行抽取。'],
        },
      ],
      repeat: ['潮风支路稳定。'],
    },
    coreCommander: { requires: ['coreWest', 'coreEast'], rules: [], repeat: [] },
    coreReturn: {
      requires: ['coreCommander', 'returnFlowCalibrator'],
      rules: [
        {
          absent: ['coreReturn'],
          sets: ['coreReturn'],
          lines: [
            '你按镜湖公开方法安装并读取双向校准件，把冷端与热端余量各送回原支路。校准件保留，不会损毁或消耗。',
            '三路指针终于相互平衡，现在可以到西南解除星流主锁。',
          ],
        },
      ],
      repeat: ['归流槽已经双向校准，主线校准件原样保留。'],
    },
    coreRegulator: {
      requires: ['coreWest', 'coreEast', 'coreReturn'],
      rules: [
        {
          absent: ['coreStabilized'],
          sets: ['coreStabilized'],
          lines: [
            '你解除单向主锁，星流沿三条公共支路缓缓回归。过载光柱散去，终宵烛龙的防御回响也安静下来。',
            '阿澈传来消息：居民与工人全部平安，公共设备仍在工作。各城接管设备，定序社的调度记录全部公开。',
            '主线危机已经解决，无需捕获任何精灵。回星岚城向知衡完成结案，往后仍可自由旅行。',
          ],
        },
      ],
      repeat: ['星流恢复双向平衡，回城结案。自然天气与普通精灵生态继续变化。'],
    },
    coreDragonEcho: {
      requires: ['coreAwakened'],
      rules: [],
      repeat: [
        '这是失衡触发的防御回响，不是可以投球的对战。恢复两侧支路与归流，再解除主锁，它就会退回安静的栖地。',
      ],
    },
    rivalStar: { requires: ['coreQuest'], rules: [], repeat: [] },
    photoKeeper: {
      rules: [
        {
          when: photoFlags,
          absent: ['pilgrimagePhoto'],
          sets: ['pilgrimagePhoto'],
          money: 650,
          items: { ultra_ball: 6, respec: 1 },
          lines: [
            '九座城市的精灵中心纪念标记齐了，雨帧把它们拼成一幅完整巡礼合照，不需要真实摄像头或联网。',
            '「巡礼者的合照」完成，旅费 650、高级球 ×6、重塑药剂 ×1。梦灯猫、铜壳鸽、讯流灵、锚钟管家和霓幕小丑在旧街与工坊愿意独立相遇。',
          ],
        },
      ],
      repeat: [
        '在晨芽、苔丘、石脊、潮汐、雷鸣、风栖、炉心、镜湖、星岚九城，与精灵中心治疗员交谈即可留下公开纪念标记。没有徽章要求，通关后仍可补齐。',
      ],
    },
    pactCaretaker: {
      requires: ['lakeRecords'],
      locked: ['普通古庙步道可走。正式修复要先在镜湖公开完整双衡档案，免得凭传闻操作古设备。'],
      rules: [
        {
          when: ['templeRestored'],
          absent: ['ancientPactReward'],
          sets: ['ancientPactReward'],
          masterBallSource: 'ancient_pact',
          items: { candy: 3 },
          lines: [
            '两条古庙回路恢复，静岚把守护约定记入公开手册。双衡星兽会在你取得联盟冠军资格后回应试炼，捕获并非主线要求。',
            '「双衡古庙」完成，成长果 ×3、大师球 ×1；这是全篇三个固定来源之一，不会重复领取，也不在商店出售。',
          ],
        },
        {
          absent: ['templeQuest'],
          sets: ['templeQuest'],
          lines: [
            '按公开档案修复古庙回水与归光两条铭槽，再读取双衡碑，最后回来找我。公共环廊一直可走，不要求遗迹钥匙或任何稀有捕获。',
          ],
        },
      ],
      repeat: [
        '回水铭槽、归光铭槽都恢复后，到双衡碑确认，再回静岚处结案。通关后古庙与终宵厅仍可继续调查。',
      ],
    },
    templeWater: {
      requires: ['templeQuest'],
      rules: [
        {
          absent: ['templeWater'],
          sets: ['templeWater'],
          lines: ['回水铭槽疏通，原有泉流回到公共水道，没有抽干精灵栖地。'],
        },
      ],
      repeat: ['回水铭槽已恢复。'],
    },
    templeLight: {
      requires: ['templeQuest'],
      rules: [
        {
          absent: ['templeLight'],
          sets: ['templeLight'],
          lines: ['归光铭槽按照双向图归位，余光重新照向旧驿的归途。'],
        },
      ],
      repeat: ['归光铭槽已恢复。'],
    },
    templePact: {
      requires: ['templeWater', 'templeLight'],
      rules: [
        {
          absent: ['templeRestored'],
          sets: ['templeRestored'],
          lines: [
            '双衡碑的两面同时亮起：「取其所需，留其归途」。守护者保留自己的栖地，也保留选择同行的自由。',
            '古庙修复已完成，回静岚处领取守护约定。双衡星兽捕捉须联盟冠军后再来，不影响联盟。',
          ],
        },
      ],
      repeat: ['两面古碑都亮着，约定已经完成。'],
    },
    balanceGuardian: {
      rules: [],
      repeat: [],
      locked: ['先修复双衡古庙，并取得联盟冠军资格，再来回应守护者的自愿试炼。'],
    },
    nightCold: {
      requires: ['champion', 'templeRestored', 'coreStabilized'],
      locked: ['主线星流恢复、双衡古庙修复并取得冠军资格后，回声壁才会连接完整记忆。'],
      rules: [
        {
          absent: ['nightCold'],
          sets: ['nightCold'],
          lines: ['冷端回声保留的是防御信号：终宵烛龙以冷焰减缓过载，并非企图冻结地区。'],
        },
      ],
      repeat: ['冷端记忆已记录。'],
    },
    nightFlame: {
      requires: ['champion', 'templeRestored', 'coreStabilized'],
      rules: [
        {
          absent: ['nightFlame'],
          sets: ['nightFlame'],
          lines: [
            '暖端回声与调度记录一致，烛龙用焰流疏散多余能量。两端一起看，才能理解它为何苏醒。',
          ],
        },
      ],
      repeat: ['暖端记忆已记录。'],
    },
    nightBalance: {
      requires: ['nightCold', 'nightFlame'],
      rules: [
        {
          absent: ['nightEchoes'],
          sets: ['nightEchoes'],
          items: { ultra_ball: 5, candy: 3 },
          lines: [
            '两段回声接成完整记忆，终宵烛龙已经不必防御过载，愿意在自己的栖地认识这位归还回流的旅人。',
            '「终宵厅的回声」完成，高级球 ×5、成长果 ×3。现在可独立挑战烛龙，击倒、逃跑、战败后都能再来，捕获后不重复生成。',
          ],
        },
      ],
      repeat: ['冷暖回声已完整公开，终宵烛龙可自愿回应试炼。'],
    },
    nightDragon: {
      rules: [],
      repeat: [],
      locked: ['先完成终宵厅冷端、暖端两份回声调查，并在回声台汇总。'],
    },
    ...Object.fromEntries(
      ['dreamCat', 'bronzePigeon', 'signalSpirit', 'anchorButler', 'neonJester'].map((id) => [
        id,
        { rules: [], repeat: [], locked: ['先在九城精灵中心留下纪念标记，再向雨帧完成巡礼合照。'] },
      ]),
    ),
  },
  encounters: {
    encounter_138: rare(138, '梦灯猫', 42),
    encounter_139: rare(139, '铜壳鸽', 42),
    encounter_140: rare(140, '讯流灵', 43),
    encounter_236: rare(236, '锚钟管家', 44),
    encounter_237: rare(237, '霓幕小丑', 44),
    encounter_249: rare(249, '双衡星兽', 65, ['champion', 'templeRestored']),
    encounter_250: rare(250, '终宵烛龙', 70, [
      'champion',
      'templeRestored',
      'coreStabilized',
      'nightEchoes',
    ]),
  },
  prerequisites: {
    coreCommander: ['coreWest', 'coreEast'],
    rivalStar: ['coreQuest'],
    coreAwakened: ['coreClue'],
    ancientPactReward: ['templeRestored'],
    ...Object.fromEntries(photoFlags.map((f) => [f, ['catchTutorial']])),
  },
  milestones: [
    ['星岚 · 赢得闻衡的徽章', 'starLeader'],
    ['总接口 · 查明失衡与防御回响', 'coreClue'],
    ['三路复原 · 恢复星流平衡', 'coreStabilized'],
    ['公开结案 · 各城共同管理设备', 'starReport'],
    ['巡礼者合照 · 九城纪念', 'pilgrimagePhoto'],
    ['双衡古庙 · 归还回水与归光', 'templeRestored'],
    ['终宵厅回声 · 理解冷暖两端', 'nightEchoes'],
    ['同行 · 星岚切磋', 'rivalStar'],
  ],
  objectives: {
    star: [
      [
        'starReport',
        '星流危机已结案。集齐八枚不同徽章后前往冠军路；居民故事与传说相遇可继续补做。',
      ],
      ['coreStabilized', '星流已恢复，回访知衡公开结案。'],
      ['coreQuest', '读取调度总表，恢复林矿、潮风与归流三路后解除主锁。'],
    ],
    starCore: [
      ['coreStabilized', '危机已解除，回星岚城向知衡结案。'],
      ['coreReturn', '三路已平衡，到西南星流主锁安全解除单向抽取。'],
      ['coreCommander', '使用主线校准件恢复东南归流槽。'],
      ['coreQuest', '读取总表，分别恢复西侧林矿与东侧潮风支路，再对战纪衡。'],
    ],
  },
  rest: { x: 7, y: 6 },
  finds: {
    starRoute: [
      [5, 9],
      [34, 24],
      [14, 28],
    ],
    star: [
      [13, 20],
      [19, 23],
      [37, 29],
    ],
    ancientTemple: [
      [6, 24],
      [35, 23],
    ],
    nightHall: [
      [5, 25],
      [32, 25],
    ],
  },
  indoor: ['starCore', 'starGym', 'ancientTemple', 'nightHall'],
  links: [
    {
      from: 'furnace',
      exit: { x: 18, y: 0, map: 'starRoute', toX: 1, toY: 18 },
      paths: [[18, 0, 1, 7]],
    },
    {
      from: 'lake',
      exit: { x: 18, y: 0, map: 'starRoute', toX: 46, toY: 18 },
      paths: [[18, 0, 1, 7]],
    },
  ],
};
