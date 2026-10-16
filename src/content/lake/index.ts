import { AdventureChapter, encounter as e, terrain } from '../adventureTypes';

const road = terrain(46, 34);
road.fill(8, 0, 1, 34, ':');
road.fill(8, 6, 30, 1, ':');
road.fill(37, 6, 1, 23, ':');
road.fill(8, 28, 30, 1, ':');
road.fill(15, 10, 16, 14, '~');
road.fill(8, 17, 38, 1, ':');
road.fill(15, 17, 16, 1, '=');
road.fill(3, 6, 4, 9, 'g');
road.fill(32, 22, 4, 6, 'g');
road.fill(10, 25, 4, 6, 'g');
const town = terrain(40, 32);
town.fill(2, 2, 6, 4, 'C');
town.fill(24, 2, 9, 4, 'G');
town.fill(2, 12, 7, 4, 'S');
town.fill(25, 22, 8, 4, 'H');
town.fill(11, 22, 7, 4, 'H');
town.fill(18, 0, 1, 32, ':');
town.fill(5, 6, 30, 1, ':');
town.fill(5, 16, 35, 1, ':');
town.fill(28, 6, 1, 15, ':');
town.fill(5, 6, 1, 15, ':');
town.fill(5, 28, 30, 1, ':');
town.fill(11, 9, 4, 5, '~');
town.fill(11, 11, 4, 1, '=');
const archive = terrain(34, 28, ':');
archive.fill(8, 3, 4, 9, '#');
archive.fill(22, 3, 4, 9, '#');
archive.fill(8, 17, 4, 7, '#');
archive.fill(22, 17, 4, 7, '#');
archive.fill(0, 14, 1, 1, ':');
const ruins = terrain(46, 36, ':');
ruins.fill(10, 7, 25, 1, '#');
ruins.fill(10, 28, 25, 1, '#');
ruins.fill(10, 7, 1, 22, '#');
ruins.fill(34, 7, 1, 22, '#');
ruins.fill(10, 17, 1, 1, ':');
ruins.fill(34, 17, 1, 1, ':');
ruins.fill(22, 7, 1, 1, ':');
ruins.fill(22, 28, 1, 1, ':');
ruins.fill(16, 11, 13, 13, '~');
ruins.fill(16, 17, 13, 1, '=');
ruins.fill(22, 11, 1, 13, '=');
ruins.fill(0, 17, 1, 1, ':');
ruins.fill(37, 5, 5, 8, 'g');
ruins.fill(3, 22, 5, 8, 'g');
const gym = terrain(32, 26, ':');
gym.fill(1, 16, 30, 1, '#');
gym.fill(16, 16, 1, 1, ':');
gym.fill(1, 9, 30, 1, '#');
gym.fill(16, 9, 1, 1, ':');
gym.fill(16, 25, 1, 1, ':');
const rare = (n: number, name: string, level: number, requires = ['rubbingRecovered']) => ({
  speciesId: `creature_${String(n).padStart(3, '0')}`,
  name,
  level,
  requires,
  awakened: `encounter${n}Awakened`,
  caught: `encounter${n}Caught`,
});
export const LAKE_CHAPTER: AdventureChapter = {
  number: 7,
  title: '镜心篇 · 公开的双衡档案',
  town: 'lake',
  maps: [
    {
      id: 'lakeRoute',
      name: '九号镜河路',
      subtitle: '湿岸双环与跨湖公共桥',
      rows: road.rows(),
      npcs: [
        {
          id: 'lakeTrainer',
          name: '镜河陪练',
          x: 10,
          y: 29,
          role: 'trainer',
          event: 'lakeTraining',
          patrol: [
            [10, 29],
            [11, 29],
            [12, 29],
            [11, 29],
          ],
        },
        { id: 'oldSketch', name: '旧湖岸写生板', x: 12, y: 7, role: 'clue' },
        { id: 'mirrorFootOne', name: '浅岸水纹足迹', x: 33, y: 20, role: 'clue' },
      ],
      portals: [
        { x: 8, y: 33, map: 'volt', toX: 1, toY: 15 },
        { x: 8, y: 0, map: 'lake', toX: 18, toY: 30 },
        { x: 45, y: 17, map: 'mirrorRuins', toX: 1, toY: 17 },
      ],
      encounters: [e(27, 31, 37, 35), e(151, 32, 38, 30), e(162, 32, 38, 25), e(157, 31, 37, 10)],
    },
    {
      id: 'lake',
      name: '镜湖镇',
      subtitle: '把答案留在每个人都能查阅的地方',
      rows: town.rows(),
      npcs: [
        { id: 'lakeHeal', name: '镜湖治疗员', x: 5, y: 6, role: 'healer' },
        { id: 'lakeShop', name: '镜河补给行', x: 5, y: 16, role: 'shop' },
        { id: 'psychicGymGate', name: '镜心道馆入口', x: 28, y: 6, role: 'gate' },
        { id: 'lakeArchivist', name: '馆员镜禾', x: 22, y: 16, role: 'quest' },
        { id: 'memoryPainter', name: '画师岚青', x: 7, y: 28, role: 'quest' },
        { id: 'rubbingScholar', name: '拓片学者厘石', x: 28, y: 28, role: 'quest' },
        { id: 'mirrorKeeper', name: '护泉员汀回', x: 20, y: 27, role: 'quest' },
        { id: 'rivalLake', name: '阿澈', x: 19, y: 9, role: 'trainer', event: 'rivalLake' },
      ],
      portals: [
        { x: 18, y: 31, map: 'lakeRoute', toX: 8, toY: 1 },
        { x: 39, y: 16, map: 'mirrorArchive', toX: 1, toY: 14 },
      ],
      encounters: [],
    },
    {
      id: 'mirrorArchive',
      name: '镜湖公开档案馆',
      subtitle: '双向回流不是支线密码，而是公开工程记录',
      rows: archive.rows(),
      npcs: [
        { id: 'lakeArchiveOne', name: '双衡原理卷', x: 16, y: 5, role: 'clue' },
        { id: 'lakeArchiveTwo', name: '镜阵检修图', x: 16, y: 22, role: 'clue' },
        { id: 'currentSketch', name: '新湖岸测绘图', x: 5, y: 5, role: 'clue' },
        { id: 'rubbingDesk', name: '拓片拼合台', x: 28, y: 23, role: 'mechanism' },
      ],
      portals: [{ x: 0, y: 14, map: 'lake', toX: 38, toY: 16 }],
      encounters: [],
    },
    {
      id: 'mirrorRuins',
      name: '回镜遗庭',
      subtitle: '三向镜阵、两条环廊与安静的残碑',
      rows: ruins.rows(),
      npcs: [
        { id: 'mirrorNorth', name: '北镜·第一道光', x: 22, y: 5, role: 'mechanism' },
        { id: 'mirrorEast', name: '东镜·第二道光', x: 32, y: 17, role: 'mechanism' },
        { id: 'mirrorWest', name: '西镜·回流的光', x: 12, y: 17, role: 'mechanism' },
        {
          id: 'mirrorGuard',
          name: '定序社封档员',
          x: 22,
          y: 25,
          role: 'trainer',
          event: 'mirrorGuard',
        },
        { id: 'mirrorConsole', name: '公开复原台', x: 22, y: 31, role: 'mechanism' },
        { id: 'rubbingNorth', name: '北廊残拓', x: 7, y: 5, role: 'clue' },
        { id: 'rubbingEast', name: '东廊残拓', x: 38, y: 17, role: 'clue' },
        { id: 'rubbingSouth', name: '南廊残拓', x: 7, y: 31, role: 'clue' },
        { id: 'mirrorFootTwo', name: '泉眼水纹足迹', x: 37, y: 28, role: 'clue' },
        { id: 'springSurvey', name: '泉眼保育桩', x: 38, y: 31, role: 'mechanism' },
        {
          id: 'runeStoneFriend',
          name: '纹印石',
          x: 5,
          y: 10,
          role: 'quest',
          event: 'encounter_141',
        },
        {
          id: 'relicBirdFriend',
          name: '遗羽雏',
          x: 38,
          y: 5,
          role: 'quest',
          event: 'encounter_144',
        },
        { id: 'moonFoxFriend', name: '残月狐', x: 5, y: 20, role: 'quest', event: 'encounter_147' },
        {
          id: 'sourceRingFriend',
          name: '源环灵',
          x: 39,
          y: 22,
          role: 'quest',
          event: 'encounter_149',
        },
        {
          id: 'formlessFriend',
          name: '无相兽',
          x: 39,
          y: 10,
          role: 'quest',
          event: 'encounter_150',
        },
        {
          id: 'sandGlyphFriend',
          name: '砂字虫',
          x: 15,
          y: 31,
          role: 'quest',
          event: 'encounter_238',
        },
        {
          id: 'ancientLizardFriend',
          name: '残曜蜥',
          x: 31,
          y: 31,
          role: 'quest',
          event: 'encounter_241',
        },
        {
          id: 'lockBeastFriend',
          name: '玄锁兽',
          x: 16,
          y: 5,
          role: 'quest',
          event: 'encounter_247',
        },
        {
          id: 'springMirrorFriend',
          name: '泉镜幼灵',
          x: 36,
          y: 26,
          role: 'quest',
          event: 'encounter_244',
        },
      ],
      portals: [{ x: 0, y: 17, map: 'lakeRoute', toX: 44, toY: 17 }],
      encounters: [e(162, 34, 39, 50), e(157, 33, 38, 30), e(151, 33, 39, 20)],
    },
    {
      id: 'psychicGym',
      name: '镜心道馆',
      subtitle: '光的去向与归途都看得清',
      rows: gym.rows(),
      npcs: [
        { id: 'psychicSwitchOne', name: '入射镜', x: 7, y: 21, role: 'switch' },
        {
          id: 'psychicScout',
          name: '学徒澈影',
          x: 16,
          y: 15,
          role: 'trainer',
          event: 'psychicScout',
        },
        { id: 'psychicSwitchTwo', name: '回照镜', x: 25, y: 12, role: 'switch' },
        {
          id: 'psychicKeeper',
          name: '镜廊守望员',
          x: 16,
          y: 8,
          role: 'trainer',
          event: 'psychicKeeper',
        },
        {
          id: 'psychicLeader',
          name: '馆主澄镜',
          x: 16,
          y: 3,
          role: 'leader',
          event: 'psychicLeader',
        },
      ],
      portals: [{ x: 16, y: 25, map: 'lake', toX: 28, toY: 7 }],
      encounters: [],
    },
  ],
  trainers: {
    lakeTraining: { name: '镜河陪练', team: [['creature_162', 34]], reward: 260, practice: true },
    psychicScout: { name: '学徒澈影', team: [['creature_162', 9]], reward: 280 },
    psychicKeeper: { name: '镜廊守望员', team: [['creature_163', 10]], reward: 330 },
    psychicLeader: {
      name: '馆主澄镜',
      team: [
        ['creature_162', 10],
        ['creature_163', 12],
      ],
      reward: 1300,
    },
    mirrorGuard: {
      name: '定序社封档员',
      team: [
        ['creature_136', 36],
        ['creature_118', 37],
        ['creature_134', 36],
      ],
      reward: 1300,
    },
    rivalLake: {
      name: '阿澈',
      team: [
        ['creature_045', 36],
        ['creature_104', 37],
        ['creature_124', 36],
      ],
      reward: 1100,
    },
  },
  gym: {
    number: 7,
    town: 'lake',
    map: 'psychicGym',
    gate: 'psychicGymGate',
    leader: 'psychicLeader',
    scout: 'psychicScout',
    keeper: 'psychicKeeper',
    switches: ['psychicSwitchOne', 'psychicSwitchTwo'],
    badge: '镜心徽章',
    tool: 'ruinKey',
    toolName: '遗迹通行钥匙',
    entrance: { x: 16, y: 24 },
    barriers: [
      [16, 16, 'psychicSwitchOne'],
      [16, 9, 'psychicSwitchTwo'],
    ],
    switchDescriptions: [
      '入射镜沿刻痕转正，第一扇光门打开。',
      '回照镜把余光送回起点，第二扇光门打开。',
    ],
    intro: '澄镜：看清伙伴的长处，也看清自己的选择。镜心考验开始！',
    lesson: '超能力并非万能。属性、要害与抗要害都可以成为你的配队思路。',
  },
  interactions: {
    lakeArchivist: {
      requires: ['furnaceReport', 'returnFlowCalibrator'],
      locked: [
        '档案馆、遗庭、道馆与居民故事自由开放。正式回流复原需要炉心城结案报告与主线双向校准件。',
      ],
      rules: [
        {
          when: ['mirrorRestored'],
          absent: ['lakeRecords'],
          sets: ['lakeRecords'],
          money: 1600,
          items: { ultra_ball: 5, moon_shard: 1 },
          lines: [
            '双衡不是召唤精灵的咒语，而是输入与回流相互校准的工程原则。公开原理卷、镜阵实测与主线校准件已经相互验证。',
            '你把完整复原方法存入任务手册，任何人都能查阅。获得旅费 1600、高级球 ×5、月影碎片 ×1。',
            '定序社把总接口设在星岚城北的星核调度庭。带校准件与公开档案前往，先恢复三条支路，再解除单向主锁。无需神兽捕获或支线密码。',
          ],
        },
        {
          absent: ['lakeQuest'],
          sets: ['lakeQuest'],
          lines: [
            '炎砚的箱号与校准件都核对好了。先读东侧公开档案馆的双衡原理卷和镜阵检修图，再到回镜遗庭验证。',
            '检修图给出明确顺序「北镜 → 东镜 → 西镜」。错转可以重置，不消耗道具，不需要等待现实光照。',
          ],
        },
      ],
      repeat: ['公开原理卷、检修图与三向镜阵将验证双向复原。完成后回镜禾处封存公开档案。'],
    },
    lakeArchiveOne: {
      requires: ['lakeQuest'],
      rules: [
        {
          absent: ['lakeArchiveOne'],
          sets: ['lakeArchiveOne'],
          lines: [
            '双衡原理：每一份输入都有对应回流。单向抽取会把冷端和热端一起压进主接口，星流失衡才会唤醒终宵烛龙的防御反应。',
            '终宵烛龙不是必须捕获的能源，关闭装置并恢复回流才是解决方法。',
          ],
        },
      ],
      repeat: ['原理记录已保存：还流而非夺取，校准而非召唤。'],
    },
    lakeArchiveTwo: {
      requires: ['lakeQuest'],
      rules: [
        {
          absent: ['lakeArchiveTwo'],
          sets: ['lakeArchiveTwo'],
          lines: [
            '镜阵检修图：先北镜送光，次东镜分流，末西镜回照。错转时重新按北镜归零；两条公共环廊都能到达，不需要遗迹钥匙。',
          ],
        },
      ],
      repeat: ['顺序明确写在公开检修图中：北 → 东 → 西。'],
    },
    mirrorNorth: {
      requires: ['lakeArchiveOne', 'lakeArchiveTwo'],
      rules: [
        {
          when: ['mirrorEast'],
          absent: ['mirrorAligned'],
          clears: ['mirrorNorth', 'mirrorEast'],
          lines: ['你把镜阵安全归零，旧顺序已清除。按北镜、东镜、西镜重试，不消耗道具。'],
        },
        {
          absent: ['mirrorAligned'],
          sets: ['mirrorNorth'],
          lines: ['北镜把第一道光送入东槽。下一步是东镜，最后西镜回照。'],
        },
      ],
      repeat: ['镜阵已完成双向校准，毋须再转动。'],
    },
    mirrorEast: {
      requires: ['lakeArchiveOne', 'lakeArchiveTwo'],
      rules: [
        {
          when: ['mirrorNorth'],
          absent: ['mirrorAligned'],
          sets: ['mirrorEast'],
          lines: ['东镜把输入分为两支，西镜的回流槽亮起。最后操作西镜。'],
        },
      ],
      repeat: ['先从北镜送光，再转东镜，最后西镜回照；已校准后无需再转。'],
    },
    mirrorWest: {
      requires: ['lakeArchiveOne', 'lakeArchiveTwo'],
      rules: [
        {
          when: ['mirrorNorth', 'mirrorEast'],
          absent: ['mirrorAligned'],
          sets: ['mirrorAligned'],
          lines: ['西镜把余光送回北槽。两束光互相平衡，公开复原台的校准接口安全打开。'],
        },
        {
          when: ['mirrorNorth'],
          absent: ['mirrorEast', 'mirrorAligned'],
          clears: ['mirrorNorth', 'mirrorEast'],
          lines: ['回照早于分流，镜阵自动安全归零。没有损失；再按北 → 东 → 西即可。'],
        },
      ],
      repeat: ['镜阵检修图写着北 → 东 → 西。完成后再去公开复原台。'],
    },
    mirrorGuard: { requires: ['mirrorAligned'], rules: [], repeat: [] },
    mirrorConsole: {
      requires: ['mirrorGuard', 'mirrorAligned', 'returnFlowCalibrator'],
      rules: [
        {
          absent: ['mirrorRestored'],
          sets: ['mirrorRestored'],
          lines: [
            '你用主线校准件验证双向接口，复原台准确重现了输入与回流。定序社试图封存的更改记录也自动公开。',
            '校准件仍保留在任务手册，不消耗。回镇找镜禾封存可以公开查阅的完整方法。',
          ],
        },
      ],
      repeat: ['双衡复原已验证，校准件原样保留。回访镜禾结案。'],
    },
    rivalLake: { requires: ['lakeQuest'], rules: [], repeat: [] },
    oldSketch: {
      rules: [
        {
          absent: ['oldSketch'],
          sets: ['oldSketch'],
          lines: ['写生板上的旧湖岸有三株柳树与一座公共小桥，绘画视角可能会让水位看起来不同。'],
        },
      ],
      repeat: ['旧写生的树位与桥位已记录。'],
    },
    currentSketch: {
      rules: [
        {
          absent: ['currentSketch'],
          sets: ['currentSketch'],
          lines: ['新测绘图标明旧桥从未淹没，写生板采用了高处视角。湖面镜影不是失踪街区的入口。'],
        },
      ],
      repeat: ['新测绘的位置已核对。'],
    },
    memoryPainter: {
      rules: [
        {
          when: ['oldSketch', 'currentSketch'],
          absent: ['memoryRecovered'],
          sets: ['memoryRecovered'],
          money: 500,
          items: { respec: 1, candy: 2 },
          lines: [
            '画师把旧景的视角补注在画框上：记忆没有消失，只需要一份能互相核对的说明。',
            '「镜中旧景」完成，旅费 500、重塑药剂 ×1、成长果 ×2。',
          ],
        },
      ],
      repeat: ['带来镜河路的旧写生与档案馆的新测绘图，我们一起把镜中的旧景说明完整。'],
    },
    rubbingNorth: {
      rules: [
        {
          absent: ['rubbingNorth'],
          sets: ['rubbingNorth'],
          lines: ['北廊残拓保留完整边框，符号描述的是栖地而非封印密码。'],
        },
      ],
      repeat: ['北廊残拓已保存。'],
    },
    rubbingEast: {
      rules: [
        {
          absent: ['rubbingEast'],
          sets: ['rubbingEast'],
          lines: ['东廊残拓给出古代保育园的编号，能与北廊边框拼接。'],
        },
      ],
      repeat: ['东廊残拓已保存。'],
    },
    rubbingSouth: {
      rules: [
        {
          absent: ['rubbingSouth'],
          sets: ['rubbingSouth'],
          lines: ['南廊残拓写明不强迫守护者离开栖地，调查完成后由精灵自由回应。'],
        },
      ],
      repeat: ['南廊残拓已保存。'],
    },
    rubbingDesk: {
      requires: ['rubbingNorth', 'rubbingEast', 'rubbingSouth'],
      rules: [
        {
          absent: ['rubbingAssembled'],
          sets: ['rubbingAssembled'],
          lines: [
            '按完整边框拼回三块拓片，保育记录的缺页补齐，没有需要猜测的支线密码。回镇交给厘石。',
          ],
        },
      ],
      repeat: ['拓片已经完整拼合，厘石等待结案。'],
    },
    rubbingScholar: {
      rules: [
        {
          when: ['rubbingAssembled'],
          absent: ['rubbingRecovered'],
          sets: ['rubbingRecovered'],
          items: { ultra_ball: 8, old_inscription: 2 },
          lines: [
            '厘石把拓片公开存档并划出安静观察线。八种遗庭伙伴分别愿意在原栖地相遇，不要求先捕获另一只。',
            '「失落拓片」完成，高级球 ×8、古文碑片 ×2；所有定点相遇都可重试。',
          ],
        },
      ],
      repeat: [
        '在遗庭北、东、南三廊记录残拓，到档案馆拼合台补齐边框，再来交档。与主线双衡复原相互独立。',
      ],
    },
    mirrorFootOne: {
      rules: [
        {
          absent: ['mirrorFootOne'],
          sets: ['mirrorFootOne'],
          lines: ['浅岸脚印是一圈圈水纹，泉镜幼灵沿公共小桥下的缓流移动。'],
        },
      ],
      repeat: ['浅岸足迹已保存。'],
    },
    mirrorFootTwo: {
      rules: [
        {
          absent: ['mirrorFootTwo'],
          sets: ['mirrorFootTwo'],
          lines: ['泉眼水纹与浅岸一致，幼灵没有被困在镜子里，只需要不受打扰的回游路线。'],
        },
      ],
      repeat: ['泉眼足迹已保存。'],
    },
    springSurvey: {
      requires: ['mirrorFootOne', 'mirrorFootTwo'],
      rules: [
        {
          absent: ['mirrorSpringClear'],
          sets: ['mirrorSpringClear'],
          lines: [
            '你依据两段水纹划出缓流保育线，清走岸边废线，不改变公共桥或湖面水位。回镇向汀回说明。',
          ],
        },
      ],
      repeat: ['泉眼保育已完成。'],
    },
    mirrorKeeper: {
      rules: [
        {
          when: ['mirrorSpringClear'],
          absent: ['mirrorTracks'],
          sets: ['mirrorTracks'],
          items: { ultra_ball: 4, tide_pearl: 1 },
          lines: [
            '汀回把浅岸与泉眼连成完整观察路线，泉镜幼灵在遗庭东南的泉眼等你。',
            '「泉镜幼灵的足迹」完成，高级球 ×4、潮汐珠 ×1；相遇不要求冲浪术或镜心徽章。',
          ],
        },
      ],
      repeat: ['记录镜河路浅岸与遗庭泉眼两段足迹，在保育桩完成缓流保护，再来说明。'],
    },
    ...Object.fromEntries(
      [
        'runeStoneFriend',
        'relicBirdFriend',
        'moonFoxFriend',
        'sourceRingFriend',
        'formlessFriend',
        'sandGlyphFriend',
        'ancientLizardFriend',
        'lockBeastFriend',
      ].map((id) => [
        id,
        { rules: [], repeat: [], locked: ['先记录三廊残拓，到档案馆拼合，再向厘石公开交档。'] },
      ]),
    ),
    springMirrorFriend: {
      rules: [],
      repeat: [],
      locked: ['先记录两段水纹足迹、完成泉眼保育，再向汀回结案。'],
    },
  },
  encounters: {
    encounter_141: rare(141, '纹印石', 36),
    encounter_144: rare(144, '遗羽雏', 36),
    encounter_147: rare(147, '残月狐', 38),
    encounter_149: rare(149, '源环灵', 44),
    encounter_150: rare(150, '无相兽', 44),
    encounter_238: rare(238, '砂字虫', 36),
    encounter_241: rare(241, '残曜蜥', 38),
    encounter_247: rare(247, '玄锁兽', 39),
    encounter_244: rare(244, '泉镜幼灵', 37, ['mirrorTracks']),
  },
  prerequisites: {
    mirrorGuard: ['mirrorAligned'],
    rivalLake: ['lakeQuest'],
    mirrorEast: ['mirrorNorth', 'lakeArchiveOne', 'lakeArchiveTwo'],
    mirrorAligned: ['mirrorNorth', 'mirrorEast', 'lakeArchiveOne', 'lakeArchiveTwo'],
  },
  milestones: [
    ['镜心 · 赢得澄镜的徽章', 'psychicLeader'],
    ['镜阵 · 公开验证双向回流', 'mirrorRestored'],
    ['档案 · 封存完整复原方法', 'lakeRecords'],
    ['镜中旧景 · 核对视角与桥位', 'memoryRecovered'],
    ['失落拓片 · 三廊拼合并公开', 'rubbingRecovered'],
    ['泉镜足迹 · 恢复安静回游线', 'mirrorTracks'],
    ['同行 · 镜湖切磋', 'rivalLake'],
  ],
  objectives: {
    lake: [
      ['lakeRecords', '复原方法公开存档。带校准件与档案去星岚城北的星核调度庭。'],
      ['mirrorRestored', '镜阵验证完成，回访镜禾封存公开档案。'],
      ['lakeQuest', '读双衡原理与检修图，按北 → 东 → 西验证镜阵。'],
    ],
    mirrorRuins: [
      ['mirrorRestored', '复原台已验证，回镇向镜禾结案。'],
      ['mirrorGuard', '操作公开复原台，验证主线校准件。'],
      ['mirrorAligned', '镜阵安全打开，对战封档员后公开复原记录。'],
      ['lakeQuest', '按北 → 东 → 西操作三向镜阵，错转可安全重试。'],
    ],
  },
  rest: { x: 6, y: 6 },
  finds: {
    lakeRoute: [
      [4, 9],
      [33, 24],
      [12, 28],
    ],
    lake: [
      [21, 28],
      [8, 19],
      [32, 20],
    ],
    mirrorRuins: [
      [6, 24],
      [39, 8],
      [30, 30],
    ],
  },
  indoor: ['mirrorArchive', 'psychicGym'],
  links: [
    {
      from: 'volt',
      exit: { x: 0, y: 15, map: 'lakeRoute', toX: 8, toY: 32 },
      paths: [[0, 15, 6, 1]],
    },
  ],
};
