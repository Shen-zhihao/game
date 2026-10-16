import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';
import type { MapId } from '../../game/model';

type ConservationContent = Pick<
  AdventureChapter,
  | 'maps'
  | 'trainers'
  | 'interactions'
  | 'encounters'
  | 'prerequisites'
  | 'milestones'
  | 'finds'
  | 'indoor'
  | 'links'
>;
const wood = terrain(40, 34);
wood.fill(0, 24, 34, 1, ':');
wood.fill(7, 5, 1, 24, ':');
wood.fill(7, 5, 27, 1, ':');
wood.fill(33, 5, 1, 24, ':');
wood.fill(7, 28, 27, 1, ':');
wood.fill(16, 10, 13, 13, '~');
wood.fill(7, 17, 27, 1, ':');
wood.fill(16, 17, 13, 1, '=');
wood.fill(3, 5, 3, 10, 'g');
wood.fill(10, 24, 5, 6, 'g');
wood.fill(30, 8, 3, 7, 'g');
const meadow = terrain(44, 34);
meadow.fill(0, 24, 38, 1, ':');
meadow.fill(7, 5, 1, 24, ':');
meadow.fill(7, 5, 31, 1, ':');
meadow.fill(37, 5, 1, 24, ':');
meadow.fill(7, 28, 31, 1, ':');
meadow.fill(17, 10, 11, 12, '~');
meadow.fill(7, 17, 31, 1, ':');
meadow.fill(17, 17, 11, 1, '=');
meadow.fill(3, 5, 3, 9, 'g');
meadow.fill(11, 24, 9, 7, 'g');
meadow.fill(30, 8, 7, 9, 'g');
const mine = terrain(44, 34, ',');
mine.fill(0, 24, 38, 1, ':');
mine.fill(7, 5, 1, 24, ':');
mine.fill(7, 5, 31, 1, ':');
mine.fill(37, 5, 1, 24, ':');
mine.fill(7, 28, 31, 1, ':');
mine.fill(16, 10, 14, 14, '~');
mine.fill(7, 17, 31, 1, ':');
mine.fill(16, 17, 14, 1, '=');
mine.fill(3, 5, 3, 9, 'g');
mine.fill(10, 25, 5, 5, 'g');
mine.fill(32, 8, 4, 8, 'g');
const cove = terrain(46, 34);
cove.fill(0, 24, 41, 1, ':');
cove.fill(7, 5, 1, 24, ':');
cove.fill(7, 5, 34, 1, ':');
cove.fill(40, 5, 1, 24, ':');
cove.fill(7, 28, 34, 1, ':');
cove.fill(13, 9, 23, 15, '~');
cove.fill(7, 18, 34, 1, ':');
cove.fill(13, 18, 23, 1, '=');
cove.fill(3, 7, 3, 13, 'g');
cove.fill(37, 22, 3, 6, 'g');
const rare = (n: number, name: string, level: number, requires: string[]) => ({
  speciesId: `creature_${String(n).padStart(3, '0')}`,
  name,
  level,
  requires,
  awakened: `encounter${n}Awakened`,
  caught: `encounter${n}Caught`,
});
export const CONSERVATION_CLOSURES = [
  'routeChest',
  'mistClueOne',
  'mistClueTwo',
  'mistAwakened',
  'bookReport',
  'plaqueReturned',
  'mineSafetyReport',
  'habitatClean',
  'mountainEchoes',
  'bottleDelivered',
  'reefRestored',
  'coveMemory',
  'lighthouseRepaired',
  'lostReturned',
  'shiftRecovered',
  'gardenRestored',
  'kiteReturned',
  'migrationRecovered',
  'pactRecovered',
  'toolReward',
  'springReward',
  'foremanTestimony',
  'memoryRecovered',
  'rubbingRecovered',
  'mirrorTracks',
  'pilgrimagePhoto',
  'templeRestored',
  'nightEchoes',
  'nurseryGift',
  'leagueResearch',
  'journeyComplete',
];
export const CONSERVATION_CONTENT: ConservationContent = {
  maps: [
    {
      id: 'deepwood',
      name: '幽苔保育林',
      subtitle: '林冠、果林、静水池与安全环廊',
      rows: wood.rows(),
      npcs: [
        { id: 'woodNote', name: '林冠保育观察台', x: 11, y: 7, role: 'clue' },
        { id: 'woodLift', name: '林冠检修升降台', x: 8, y: 5, role: 'mechanism' },
        {
          id: 'conservationRanger',
          name: '巡林员禾荫',
          x: 5,
          y: 27,
          role: 'quest',
          patrol: [
            [5, 27],
            [5, 28],
            [5, 29],
            [5, 28],
          ],
        },
        { id: 'manualCoach', name: '协同研究员', x: 32, y: 28, role: 'quest' },
        { id: 'dewSpider', name: '晶露蛛', x: 5, y: 20, role: 'quest', event: 'encounter_33' },
        { id: 'mirrorFish', name: '镜池鱼', x: 30, y: 18, role: 'quest', event: 'encounter_34' },
        { id: 'leafSnail', name: '腐叶螺', x: 12, y: 29, role: 'quest', event: 'encounter_35' },
        { id: 'thornDoll', name: '幽棘偶', x: 33, y: 25, role: 'quest', event: 'encounter_36' },
        {
          id: 'mushroomGuest',
          name: '菌冠伞客',
          x: 9,
          y: 10,
          role: 'quest',
          event: 'encounter_164',
        },
      ],
      portals: [{ x: 0, y: 24, map: 'moss', toX: 28, toY: 16 }],
      encounters: [
        e(19, 24, 32, 22),
        e(22, 24, 32, 20),
        e(29, 24, 32, 20),
        e(31, 25, 33, 18),
        e(46, 24, 31, 20),
      ],
    },
    {
      id: 'echoMeadow',
      name: '回声原野',
      subtitle: '草原、灌丛、湖畔与三个不同的回声点',
      rows: meadow.rows(),
      npcs: [
        { id: 'meadowNote', name: '原野迁移观察台', x: 14, y: 5, role: 'clue' },
        { id: 'echoPeak', name: '岩脊回声标', x: 21, y: 5, role: 'clue' },
        { id: 'echoValley', name: '谷地回声标', x: 7, y: 17, role: 'clue' },
        { id: 'echoCliff', name: '崖岸回声标', x: 36, y: 25, role: 'clue' },
        { id: 'echoSteward', name: '原野测绘员听禾', x: 8, y: 28, role: 'quest' },
        { id: 'meadowGlide', name: '原野滑翔台', x: 7, y: 7, role: 'mechanism' },
        { id: 'cloudCow', name: '眠云牛', x: 4, y: 8, role: 'quest', event: 'encounter_57' },
        { id: 'leafShrew', name: '旋叶鼩', x: 33, y: 19, role: 'quest', event: 'encounter_58' },
        { id: 'mirageBeast', name: '远望蜃兽', x: 37, y: 5, role: 'quest', event: 'encounter_175' },
      ],
      portals: [{ x: 0, y: 24, map: 'stoneRoute', toX: 34, toY: 21 }],
      encounters: [
        e(46, 25, 34, 15),
        e(51, 25, 34, 10),
        e(53, 25, 34, 15),
        e(55, 25, 34, 15),
        e(165, 25, 34, 10),
        e(168, 25, 34, 15),
        e(171, 25, 34, 10),
        e(173, 25, 34, 10),
      ],
    },
    {
      id: 'mineDepths',
      name: '回声深矿',
      subtitle: '晶簇、硫热裂隙、霜盐岸与通风维护环',
      rows: mine.rows(),
      npcs: [
        { id: 'mineAir', name: '深矿通风计', x: 6, y: 7, role: 'clue' },
        { id: 'mineStone', name: '岩层稳定计', x: 35, y: 15, role: 'clue' },
        { id: 'mineWater', name: '暗河生态观察桩', x: 8, y: 27, role: 'clue' },
        { id: 'heatCart', name: '硫热检修车', x: 9, y: 7, role: 'mechanism' },
        { id: 'blindShrimp', name: '盲灯虾', x: 30, y: 19, role: 'quest', event: 'encounter_78' },
        {
          id: 'mineGateBeast',
          name: '封矿门兽',
          x: 33,
          y: 5,
          role: 'quest',
          event: 'encounter_186',
        },
      ],
      portals: [{ x: 0, y: 24, map: 'mine', toX: 34, toY: 20 }],
      encounters: [
        e(65, 28, 38, 25),
        e(176, 28, 38, 20),
        e(179, 29, 39, 20),
        e(182, 28, 38, 20),
        e(184, 29, 39, 15),
      ],
    },
    {
      id: 'kelpCove',
      name: '回潮海藻湾',
      subtitle: '静湾、海藻林与旧航匣的完整记录',
      rows: cove.rows(),
      npcs: [
        { id: 'shoreNote', name: '海藻林生态观察台', x: 8, y: 7, role: 'clue' },
        { id: 'shipArchive', name: '旧航匣登记板', x: 37, y: 7, role: 'clue' },
        { id: 'coveCase', name: '旧航匣回声座', x: 37, y: 27, role: 'mechanism' },
        { id: 'ruinPassage', name: '古码头检修门', x: 10, y: 28, role: 'mechanism' },
        {
          id: 'tideArchiveSpirit',
          name: '九汐匣灵',
          x: 8,
          y: 25,
          role: 'quest',
          event: 'encounter_200',
        },
      ],
      portals: [{ x: 0, y: 24, map: 'tideworks', toX: 38, toY: 24 }],
      encounters: [e(82, 26, 35, 25), e(95, 26, 35, 25), e(190, 26, 35, 25), e(196, 27, 36, 25)],
    },
  ],
  trainers: {},
  interactions: {
    professor: {
      requires: ['catchTutorial'],
      rules: [
        {
          when: ['bookQuest', 'woodNote', 'meadowNote', 'shoreNote'],
          absent: ['bookReport'],
          sets: ['bookReport'],
          money: 600,
          items: { ultra_ball: 6, skill_copy: 1 },
          lines: [
            '林冠、原野与海藻湾三种生境的记录完整了。博士的观察册记录环境与行为，不要求先抓到任何稀有精灵。',
            '「博士的观察册」完成，旅费 600、高级球 ×6、复刻剂 ×1。晶露蛛、镜池鱼、腐叶螺、幽棘偶和菌冠伞客愿在幽苔保育林各自相遇。',
            '联盟冠军后再来，保育园会为另外两种初始伙伴提供新的同行个体。',
          ],
        },
        {
          absent: ['bookQuest'],
          sets: ['bookQuest'],
          lines: [
            '帮我记录幽苔保育林的林冠、回声原野的草甸、回潮海藻湾的水域。三个观察台都有固定步道，不需要徽章、工具或稀有捕获。',
            '以前的记录也会计算。观察册完成后，保育林中五位稀有伙伴会愿意了解你。',
          ],
        },
      ],
      repeat: [
        '林冠观察台在幽苔保育林，原野观察台在回声原野，海藻观察台在回潮海藻湾。记录环境即可，不要求随机掉落或先捕获。',
      ],
    },
    woodNote: {
      rules: [
        {
          absent: ['woodNote'],
          sets: ['woodNote', 'deepSurvey'],
          lines: [
            '你记录树冠透光、落叶腐殖层与静水池的差别。每种精灵都依赖具体食物、附着面与水源。',
          ],
        },
      ],
      repeat: ['林冠与静水生态记录已保存。'],
    },
    meadowNote: {
      rules: [
        {
          absent: ['meadowNote'],
          sets: ['meadowNote', 'ridgeSurvey'],
          lines: ['原野兽群沿草甸、灌丛和湖岸轮流觅食。你记录路线，不追赶个体。'],
        },
      ],
      repeat: ['原野生境记录已保存。'],
    },
    shoreNote: {
      rules: [
        {
          absent: ['shoreNote'],
          sets: ['shoreNote', 'kelpSurvey'],
          lines: ['海藻林给藻绳鳗提供食物与藏身处。你记录潮水交换和叶带生长，不拔走海藻。'],
        },
      ],
      repeat: ['海藻林记录已保存。'],
    },
    echoPeak: {
      rules: [
        {
          absent: ['echoPeak'],
          sets: ['echoPeak'],
          lines: ['岩脊回声先反射，再从湖岸传回，并不是远方有迷路的旅人。'],
        },
      ],
      repeat: ['岩脊回声已记录。'],
    },
    echoValley: {
      rules: [
        {
          absent: ['echoValley'],
          sets: ['echoValley'],
          lines: ['谷地回声的延迟对应岩壁距离，与岩脊记录的声源一致。'],
        },
      ],
      repeat: ['谷地回声已记录。'],
    },
    echoCliff: {
      rules: [
        {
          absent: ['echoCliff'],
          sets: ['echoCliff'],
          lines: ['崖岸回声补上最后一段传播路线，三处记录可以明确声源来自空的旧牧铃。'],
        },
      ],
      repeat: ['崖岸回声已记录。'],
    },
    echoSteward: {
      rules: [
        {
          when: ['echoPeak', 'echoValley', 'echoCliff'],
          absent: ['mountainEchoes'],
          sets: ['mountainEchoes'],
          money: 550,
          items: { ultra_ball: 5, echo_bell: 1 },
          lines: [
            '三份测绘说明旧牧铃被风吹响，没有失踪者，也不需要等待特定天气。听禾固定松脱的铃架，安静的草甸重新开放。',
            '「山道回声」完成，旅费 550、高级球 ×5、回声铃 ×1。眠云牛、旋叶鼩、远望蜃兽在各自生境独立相遇。',
          ],
        },
      ],
      repeat: [
        '调查岩脊、谷地、崖岸三处回声标，我会把传播路线画完整。不用捕捉稀有精灵来证明记录。',
      ],
    },
    mineAir: {
      rules: [
        {
          absent: ['mineAir'],
          sets: ['mineAir'],
          lines: ['通风保持双向交换，硫热裂隙与霜盐岸互不封堵，深矿没有被困工人。'],
        },
      ],
      repeat: ['通风记录完整。'],
    },
    mineStone: {
      rules: [
        {
          absent: ['mineStone'],
          sets: ['mineStone'],
          lines: ['岩层计读数稳定，封矿门保护的是暗河栖地，并非藏匿货物。'],
        },
      ],
      repeat: ['岩层记录完整。'],
    },
    mineWater: {
      rules: [
        {
          absent: ['mineWater'],
          sets: ['mineWater', 'mineSurvey'],
          lines: ['暗河水质清澈，盲灯虾靠灯触与冰晶壳在这里生活。你记录水质并保留原有流路。'],
        },
      ],
      repeat: ['暗河生态记录已保存。'],
    },
    retiredMiner: {
      requires: ['plaqueReturned'],
      rules: [
        {
          when: ['mineAir', 'mineStone', 'mineWater'],
          absent: ['mineSafetyReport'],
          sets: ['mineSafetyReport'],
          items: { ultra_ball: 5, candy: 2 },
          lines: [
            '砾伯把工牌旧约与三份深矿保育记录一起封存：旧友都已平安，封矿门保留的是精灵的家。',
            '「矿车旁的旧牌」后续完成，高级球 ×5、成长果 ×2。盲灯虾与封矿门兽在回声深矿各自相遇；不需要主线矿山报告或碎岩工具。',
          ],
        },
      ],
      repeat: [
        '工牌已经平安归还。回声深矿的通风、岩层、暗河三份记录能补全栖地保护，让盲灯虾与封矿门兽愿意相遇。',
      ],
    },
    shipArchive: {
      rules: [
        {
          absent: ['shipArchive'],
          sets: ['shipArchive'],
          lines: [
            '旧航匣登记板列着所有船员的平安归港记录，匣内保存的是航季记忆。没有沉船失踪人员需要等待救援。',
          ],
        },
      ],
      repeat: ['旧航季记录已完整核对。'],
    },
    coveCase: {
      requires: ['reefRestored', 'shoreNote', 'shipArchive'],
      rules: [
        {
          absent: ['coveMemory'],
          sets: ['coveMemory'],
          items: { great_ball: 5, candy: 2 },
          lines: [
            '潮池保育与海藻林、旧航匣三份记录互相对应，九汐匣灵不必再独自保管无人理解的航季。',
            '「潮池观察」后续完成，超级球 ×5、成长果 ×2。九汐匣灵在湾边回声座独立相遇，失败可重试。',
          ],
        },
      ],
      repeat: ['潮池与旧航匣的故事已完整公开，九汐匣灵可以选择自己的同行者。'],
    },
    woodLift: {
      requires: ['powerPass'],
      locked: ['霆光徽章的检修权限可使用升降台；林间公共环路始终可走。'],
      rules: [
        {
          jump: { map: 'deepwood', x: 32, y: 27 },
          lines: ['检修升降台把你送到南侧林冠步道，缩短绕行距离。'],
        },
      ],
      repeat: [],
    },
    meadowGlide: {
      requires: ['glider'],
      locked: ['流羽徽章的滑翔装备可跨越观景落差；公共环路始终可走。'],
      rules: [
        {
          jump: { map: 'echoMeadow', x: 35, y: 26 },
          lines: ['你按安全风标滑翔到南侧观景台。天气不会封闭普通道路。'],
        },
      ],
      repeat: [],
    },
    heatCart: {
      requires: ['heatSuit'],
      locked: ['炉心徽章的隔热装备允许搭乘硫热检修车；公共维护桥始终可走。'],
      rules: [
        {
          jump: { map: 'mineDepths', x: 35, y: 26 },
          lines: ['隔热检修车沿固定安全轨道驶到南侧岩岸，没有进入熔岩或破坏暗河。'],
        },
      ],
      repeat: [],
    },
    ruinPassage: {
      requires: ['ruinKey'],
      locked: ['镜心徽章的遗迹钥匙可通过古码头检修门；公共岸路始终可走。'],
      rules: [
        {
          jump: { map: 'kelpCove', x: 39, y: 5 },
          lines: ['遗迹钥匙开启可选检修通道，你抵达北侧码头。'],
        },
      ],
      repeat: [],
    },
    manualCoach: {
      requires: ['coordinationManual'],
      rules: [
        {
          absent: ['manualStudy'],
          sets: ['manualStudy'],
          items: { skill_copy: 1 },
          lines: [
            '你按协同手册比较速度、命中与技能覆盖。研究员赠送复刻剂 ×1；学习通用技能的剧情前置仍保留，培养方案可自由调整。',
          ],
        },
      ],
      repeat: ['手册只提供训练建议，不强制队伍属性或加点。所有精灵都可以接收已掌握技能的复刻。'],
    },
    conservationRanger: {
      rules: [],
      repeat: [
        '保育林的林冠、果林与静水池各有食物链。固定观察不消耗精灵球；稀有伙伴由博士观察册开启。',
      ],
    },
    ...Object.fromEntries(
      ['dewSpider', 'mirrorFish', 'leafSnail', 'thornDoll', 'mushroomGuest'].map((id) => [
        id,
        {
          rules: [],
          repeat: [],
          locked: ['先完成博士的林冠、原野、海藻湾三份观察册并回研究所结案。'],
        },
      ]),
    ),
    ...Object.fromEntries(
      ['cloudCow', 'leafShrew', 'mirageBeast'].map((id) => [
        id,
        { rules: [], repeat: [], locked: ['先记录岩脊、谷地、崖岸三处回声，再向听禾汇总。'] },
      ]),
    ),
    blindShrimp: {
      rules: [],
      repeat: [],
      locked: ['归还矿车工牌后，核对通风、岩层、暗河三份记录并向砾伯结案。'],
    },
    mineGateBeast: {
      rules: [],
      repeat: [],
      locked: ['先归还工牌并完成深矿三份保育记录，再向砾伯结案。'],
    },
    tideArchiveSpirit: {
      rules: [],
      repeat: [],
      locked: ['修复潮池栖地，并核对海藻林观察与旧航匣登记，再到回声座完成旧约。'],
    },
  },
  encounters: {
    encounter_33: rare(33, '晶露蛛', 32, ['bookReport']),
    encounter_34: rare(34, '镜池鱼', 33, ['bookReport']),
    encounter_35: rare(35, '腐叶螺', 32, ['bookReport']),
    encounter_36: rare(36, '幽棘偶', 35, ['bookReport']),
    encounter_164: rare(164, '菌冠伞客', 34, ['bookReport']),
    encounter_57: rare(57, '眠云牛', 33, ['mountainEchoes']),
    encounter_58: rare(58, '旋叶鼩', 34, ['mountainEchoes']),
    encounter_175: rare(175, '远望蜃兽', 36, ['mountainEchoes']),
    encounter_78: rare(78, '盲灯虾', 34, ['mineSafetyReport']),
    encounter_186: rare(186, '封矿门兽', 38, ['mineSafetyReport']),
    encounter_200: rare(200, '九汐匣灵', 37, ['coveMemory']),
  },
  prerequisites: {
    nurseryGift: ['champion', 'bookReport'],
    leagueResearch: [
      'champion',
      'bookReport',
      'deepSurvey',
      'ridgeSurvey',
      'mineSurvey',
      'kelpSurvey',
    ],
    postgameComplete: CONSERVATION_CLOSURES,
    dexComplete: ['champion', 'bookReport'],
  },
  milestones: [
    ['博士观察册 · 林冠、原野与海藻湾', 'bookReport'],
    ['山道回声 · 三处传播记录', 'mountainEchoes'],
    ['深矿旧约 · 工牌与三份保育记录', 'mineSafetyReport'],
    ['旧航匣 · 潮池与海藻林记录', 'coveMemory'],
    ['保育园 · 另外两种初始伙伴的新个体', 'nurseryGift'],
    ['联盟研究 · 四生境与第三处限量球', 'leagueResearch'],
    ['完整远征 · 所有居民故事与通关后旧约结案', 'postgameComplete'],
    ['全图鉴 · 登记250种形态', 'dexComplete'],
  ],
  finds: {
    deepwood: [
      [4, 8],
      [12, 26],
      [31, 12],
    ],
    echoMeadow: [
      [4, 10],
      [14, 26],
      [33, 13],
    ],
    mineDepths: [
      [4, 10],
      [12, 27],
      [33, 13],
    ],
    kelpCove: [
      [4, 11],
      [38, 25],
    ],
  },
  indoor: ['mineDepths'],
  links: [
    {
      from: 'moss',
      exit: { x: 29, y: 16, map: 'deepwood', toX: 1, toY: 24 },
      paths: [[23, 16, 7, 1]],
    },
    {
      from: 'stoneRoute',
      exit: { x: 35, y: 21, map: 'echoMeadow', toX: 1, toY: 24 },
      paths: [[30, 21, 6, 1]],
    },
    {
      from: 'mine',
      exit: { x: 35, y: 20, map: 'mineDepths', toX: 1, toY: 24 },
      paths: [[30, 20, 6, 1]],
    },
    {
      from: 'tideworks',
      exit: { x: 39, y: 24, map: 'kelpCove', toX: 1, toY: 24 },
      paths: [[34, 24, 6, 1]],
    },
  ],
};
export const CONSERVATION_WATER: {
  id: string;
  name: string;
  regionId: string;
  map: MapId;
  description: string;
  encounters: ReturnType<typeof e>[];
}[] = [
  {
    id: 'kelp_forest_live',
    name: '回潮海藻湾·海藻深水',
    regionId: 'kelpCove',
    map: 'kelpCove',
    description: '海藻与稳定洋流提供食物和藏身处，藻绳鳗沿叶带成长。',
    encounters: [
      e(193, 28, 38, 40),
      e(85, 28, 38, 20),
      e(91, 28, 38, 15),
      e(93, 28, 38, 15),
      e(198, 28, 38, 10),
    ],
  },
  {
    id: 'woodland_pool_live',
    name: '幽苔林·静水池',
    regionId: 'deepwood',
    map: 'deepwood',
    description: '清洁缓流与浮叶水草，适合两栖精灵和墨点螈。',
    encounters: [e(154, 26, 35, 55), e(27, 24, 32, 45)],
  },
];
