import { ADVENTURE_ENCOUNTERS, ADVENTURE_INTERACTIONS, ADVENTURE_CHAPTERS } from '../adventure';
import { CITIES, cityFor, questProgress } from '../cities';
import { ITEMS } from '../catalog';
import { GYM_REWARDS, MAPS } from '../world';
import { KEY_ITEMS } from '../keyItems';
import { CONSERVATION_CLOSURES } from '../conservation';
import { LEAGUE_BADGES } from '../league';
import type { GameState } from '../../game/model';

export type QuestKind = 'main' | 'side';
export type QuestStatus = 'active' | 'ready' | 'completed';
type Step = [flag: string, label: string];
interface QuestDefinition {
  id: string;
  name: string;
  kind: QuestKind;
  client: string;
  location: string;
  contact?: string;
  requires?: string[];
  starts: string[];
  steps: Step[];
  rewards: string[];
  ready?: string[];
  automatic?: boolean;
}
export interface JournalQuest extends Omit<QuestDefinition, 'steps'> {
  status: QuestStatus;
  steps: { label: string; done: boolean }[];
  current: number;
  target: number;
  next: string;
  cityQuestId?: string;
}
const residents = Object.values(MAPS).flatMap((m) =>
  m.npcs.map((n) => ({ ...n, mapName: m.name })),
);
const itemRewards = (items: Record<string, number>) =>
  Object.entries(items).map(([id, n]) => `${ITEMS[id]!.name} ×${n}`);
function rewardsFor(flag: string): string[] {
  return Object.values(ADVENTURE_INTERACTIONS).flatMap((interaction) =>
    interaction.rules
      .filter((r) => r.sets?.includes(flag))
      .flatMap((r) => [
        ...(r.money ? [`旅费 ${r.money}`] : []),
        ...itemRewards(r.items ?? {}),
        ...(r.masterBallSource ? ['大师球 ×1'] : []),
        ...KEY_ITEMS.filter((i) => r.sets?.includes(i.flag)).map((i) => i.name),
      ]),
  );
}
function story(
  id: string,
  name: string,
  kind: QuestKind,
  contact: string,
  starts: string[],
  steps: Step[],
  options: Partial<QuestDefinition> = {},
): QuestDefinition {
  const npc = residents.find((n) => n.id === contact);
  return {
    id,
    name,
    kind,
    contact,
    starts,
    steps,
    client: npc?.name ?? '旅途记录',
    location: npc?.mapName ?? '星苔地区',
    requires: ADVENTURE_INTERACTIONS[contact]?.requires,
    rewards: rewardsFor(id),
    ...options,
  };
}

export const STORY_QUESTS: QuestDefinition[] = [
  story(
    'catchTutorial',
    '启程 · 第一位伙伴',
    'main',
    'catchGuide',
    [],
    [
      ['neighborMet', '在晨芽镇认识邻居阿澈'],
      ['professorRescued', '到一号路救出岚博士'],
      ['partnerReceived', '回研究所正式领取伙伴'],
      ['rival', '与阿澈完成对战练习'],
      ['fieldKitReceived', '回研究所领取图鉴与捕捉补给'],
      ['catchTutorial', '在一号路完成捕捉练习'],
    ],
    {
      automatic: true,
      rewards: ['初始伙伴 ×1', '精灵图鉴', '星纹球 ×10', '草露药 ×5', '清醒露 ×2'],
    },
  ),
  story(
    'questReward',
    '森林微芒 · 寻回萤灯蛾',
    'main',
    'researcher',
    ['quest'],
    [
      ['clueOne', '调查苔影森林的断枝'],
      ['clueTwo', '调查微光脚印'],
      ['forestScout', '与采集员完成练习'],
      ['logMoved', '从南面推动倒木'],
      ['rescued', '击退定序社，救回萤灯蛾'],
      ['questReward', '回苔丘镇向穗禾报告'],
    ],
    {
      requires: ['catchTutorial'],
      ready: ['rescued'],
      rewards: ['旅费 500', '成长果 ×2', '星纹球 ×5', '解锁技能：剪藤术'],
    },
  ),
  story(
    'mineReport',
    '矿山异常 · 共鸣的去向',
    'main',
    'mineForeman',
    ['mineQuest'],
    [
      ['mineClueOne', '调查旧矿山采掘痕迹'],
      ['mineClueTwo', '调查东侧异常晶矿'],
      ['mineGuard', '击退北部勘测员'],
      ['mineStabilized', '关闭共鸣放大装置'],
      ['mineReport', '回石脊城向砚叔报告'],
    ],
    {
      requires: ['questReward'],
      ready: ['mineStabilized'],
      rewards: ['旅费 600', '成长果 ×2', '星纹球 ×5'],
    },
  ),
  story(
    'harborReport',
    '潮闸逆流 · 核对矿山运单',
    'main',
    'harborMaster',
    ['harborQuest'],
    [
      ['cargoManifest', '查阅潮汐港仓库货运簿'],
      ['sluiceGauge', '调查潮间闸水位计'],
      ['tideGuard', '击退货运员'],
      ['sluiceRepaired', '隔离非法供能回路，恢复潮闸'],
      ['harborReport', '回港向沐舟报告'],
    ],
    {
      requires: ['mineReport'],
      ready: ['sluiceRepaired'],
      rewards: ['旅费 800', '成长果 ×2', '星纹球 ×5', `${ITEMS.skill_copy!.name} ×1`, '大师球 ×1'],
    },
  ),
  story(
    'powerReport',
    '逆流的电站',
    'main',
    'powerEngineer',
    ['powerQuest'],
    [
      ['powerClueOne', '到 E-04 核对设备登记'],
      ['powerClueTwo', '调查晶丝分流线'],
      ['powerGuard', '让接线员停机配合'],
      ['powerRestored', '隔离旁路，恢复公共照明'],
      ['powerReport', '回雷鸣市向乔弧结案'],
    ],
    { ready: ['powerRestored'] },
  ),
  story(
    'windReport',
    '归来的迁徙风',
    'main',
    'windScientist',
    ['windQuest'],
    [
      ['windClueOne', '查阅气象站历史风向图'],
      ['windClueTwo', '调查实时回流仪'],
      ['windGuard', '击退测风员'],
      ['windBalanced', '解除单向锁，恢复回风'],
      ['windReport', '回风栖镇向牧岚报告'],
    ],
    { ready: ['windBalanced'] },
  ),
  story(
    'furnaceReport',
    '留给归途的温度',
    'main',
    'furnaceForeman',
    ['furnaceQuest'],
    [
      ['foundryCrate', '核对封存晶矿箱'],
      ['foundryPressure', '调查校准站压力计'],
      ['foundryGuard', '让主管停止阻挠'],
      ['furnaceShutdown', '停止过载并取得双向回流校准件'],
      ['furnaceReport', '回炉心城向炎砚结案'],
    ],
    {
      ready: ['furnaceShutdown'],
      rewards: [...rewardsFor('furnaceReport'), ...rewardsFor('furnaceShutdown')],
    },
  ),
  story(
    'lakeRecords',
    '公开的双衡档案',
    'main',
    'lakeArchivist',
    ['lakeQuest'],
    [
      ['lakeArchiveOne', '查阅双衡原理卷'],
      ['lakeArchiveTwo', '查阅镜阵检修图'],
      ['mirrorAligned', '按北 → 东 → 西校准镜阵'],
      ['mirrorGuard', '完成复原台守卫对战'],
      ['mirrorRestored', '用校准件验证双向接口'],
      ['lakeRecords', '回镜湖镇向镜禾封存档案'],
    ],
    { ready: ['mirrorRestored'] },
  ),
  story(
    'starReport',
    '让星流回到众人之间',
    'main',
    'starCoordinator',
    ['coreQuest'],
    [
      ['coreClue', '读取星核调度庭总表'],
      ['coreWest', '恢复西侧林矿支路'],
      ['coreEast', '恢复东侧潮风支路'],
      ['coreCommander', '让纪衡解除阻挠'],
      ['coreReturn', '校准双向归流槽'],
      ['coreStabilized', '解除单向主锁'],
      ['starReport', '回星岚城向知衡公开结案'],
    ],
    { ready: ['coreStabilized'] },
  ),
  story(
    'champion',
    '联盟巡礼 · 八枚徽章与冠军',
    'main',
    'leagueRegistrar',
    ['catchTutorial'],
    [
      ...GYM_REWARDS.map((g): Step => [g.leader, `获得${g.badge}`]),
      ['rivalLeague', '在联盟大厅与阿澈完成巡礼终场'],
      ['leagueQualified', '向登记员报名五场连战'],
      ['cleared_leagueIce', '通过冰之精英'],
      ['cleared_leagueGhost', '通过幽灵精英'],
      ['cleared_leagueDark', '通过恶之精英'],
      ['cleared_leagueDragon', '通过龙之精英'],
      ['champion', '战胜冠军望野'],
    ],
    {
      requires: [...LEAGUE_BADGES, 'rivalLeague'],
      rewards: [
        '星苔联盟冠军称号',
        '冠军名录：首次与最近一次同行队伍',
        '各场对战经验与旅费按战果结算',
      ],
    },
  ),
  story(
    'habitatClean',
    '石壳虫的新家',
    'side',
    'habitat',
    [],
    [['habitatClean', '清理山道栖地的绳线与石片']],
    { rewards: ['星纹球 ×3'] },
  ),
  story(
    'plaqueReturned',
    '矿车旁的旧牌',
    'side',
    'retiredMiner',
    ['miningPlaque'],
    [
      ['miningPlaque', '在旧矿车旁找到十七号工牌'],
      ['plaqueReturned', '回石脊城归还给砾伯'],
    ],
    {
      requires: ['catchTutorial'],
      ready: ['miningPlaque'],
      rewards: ['草露药 ×2', '解锁技能：碎岩术', '开启鸣钟石的旧约相遇'],
    },
  ),
  story(
    'bottleDelivered',
    '漂流瓶的收件人',
    'side',
    'postkeeper',
    ['bottleFound'],
    [
      ['bottleFound', '找到漂流瓶家书'],
      ['bottleDate', '在潮汐港核对旧航季'],
      ['bottleDelivered', '送交港口西南的青帆'],
    ],
    {
      ready: ['bottleFound', 'bottleDate'],
      rewards: ['旅费 250', `${ITEMS.super_potion!.name} ×2`, '星纹球 ×3'],
    },
  ),
  story(
    'reefRestored',
    '潮池观察',
    'side',
    'reefCleanup',
    ['shoreObservation', 'poolObservation'],
    [
      ['shoreObservation', '记录矿港道河口'],
      ['poolObservation', '记录潮间闸浅礁'],
      ['reefRestored', '从岸上安全清除旧网'],
    ],
    { rewards: ['星纹球 ×5', '星泉露 ×1', '开启珊枝鹿的栖地相遇'] },
  ),
  story(
    'lighthouseRepaired',
    '旧灯塔维修',
    'side',
    'lighthouseKeeper',
    ['lighthouseQuest'],
    [
      ['lighthouseLens', '到灯塔南侧检修箱取备用镜片'],
      ['lighthouseRepaired', '到灯座更换镜片'],
    ],
    { rewards: ['成长果 ×3', '潮汐珠 ×1', '解锁技能：冲浪术'] },
  ),
  story(
    'lostReturned',
    '失物招领箱',
    'side',
    'lostClerk',
    ['parcelTag', 'parcelReceipt'],
    [
      ['parcelTag', '记录防水标签特征'],
      ['parcelReceipt', '核对公开领取记录'],
      ['lostReturned', '交给失物管理员小序'],
    ],
    { ready: ['parcelTag', 'parcelReceipt'] },
  ),
  story(
    'shiftRecovered',
    '电站值班簿',
    'side',
    'shiftClerk',
    ['shiftWest', 'shiftEast'],
    [
      ['shiftWest', '记录西班值班簿'],
      ['shiftEast', '记录东班值班簿'],
      ['shiftRecovered', '向值班员照临补齐交接'],
    ],
    { ready: ['shiftWest', 'shiftEast'] },
  ),
  story(
    'gardenRestored',
    '电梯旁的小花园',
    'side',
    'gardenKeeper',
    ['gardenQuest'],
    [
      ['gardenFlow', '打开四号栈道生态引水阀'],
      ['gardenRestored', '回花坛按下灌溉钮'],
    ],
  ),
  story(
    'kiteReturned',
    '断线风筝',
    'side',
    'kiteChild',
    ['kiteQuest'],
    [
      ['kiteLine', '检查五号山道东北风筝线'],
      ['kiteSecured', '到保护地观景台固定锚'],
      ['kiteReturned', '回风栖镇交给小穗'],
    ],
    { ready: ['kiteSecured'] },
  ),
  story(
    'migrationRecovered',
    '迁徙记录',
    'side',
    'migrationKeeper',
    ['migrationLow', 'migrationPeak', 'migrationNest'],
    [
      ['migrationLow', '记录低谷羽迹'],
      ['migrationPeak', '记录高岭信号羽'],
      ['migrationNest', '调查旧巢'],
      ['migrationRecovered', '向白翎汇总记录'],
    ],
    { ready: ['migrationLow', 'migrationPeak', 'migrationNest'] },
  ),
  story(
    'pactRecovered',
    '观岩驿旧约',
    'side',
    'pactKeeper',
    ['pactStone', 'pactName'],
    [
      ['pactStone', '记录旧驿刻石'],
      ['pactName', '核对旧驿名册'],
      ['pactRecovered', '向守望人归档'],
    ],
    { ready: ['pactStone', 'pactName'] },
  ),
  story(
    'toolReward',
    '熔炉外的工具',
    'side',
    'toolMaker',
    ['toolQuest'],
    [
      ['toolCase', '检查回廊东南工具箱清单'],
      ['toolReturned', '归还校准站检修架'],
      ['toolReward', '回炉心城向砺青报告'],
    ],
    { ready: ['toolReturned'] },
  ),
  story(
    'springReward',
    '温泉里的冷石',
    'side',
    'springKeeper',
    ['springQuest'],
    [
      ['springCold', '读取冷溪温标'],
      ['springWarm', '读取暖泉温标'],
      ['springRestored', '配平混流槽'],
      ['springReward', '回访温泉师暖汀'],
    ],
    { ready: ['springRestored'] },
  ),
  story(
    'foremanTestimony',
    '老工头的证词',
    'side',
    'oldForeman',
    ['oldFreight', 'oldLedger'],
    [
      ['oldFreight', '记录旧运输路标'],
      ['oldLedger', '查阅公开总账'],
      ['foremanTestimony', '请禾炭公开更正证词'],
    ],
    { ready: ['oldFreight', 'oldLedger'] },
  ),
  story(
    'memoryRecovered',
    '镜中旧景',
    'side',
    'memoryPainter',
    ['oldSketch', 'currentSketch'],
    [
      ['oldSketch', '查看旧湖岸写生板'],
      ['currentSketch', '对照新测绘图'],
      ['memoryRecovered', '请画师岚青补注视角'],
    ],
    { ready: ['oldSketch', 'currentSketch'] },
  ),
  story(
    'rubbingRecovered',
    '失落拓片',
    'side',
    'rubbingScholar',
    ['rubbingNorth', 'rubbingEast', 'rubbingSouth'],
    [
      ['rubbingNorth', '记录北廊残拓'],
      ['rubbingEast', '记录东廊残拓'],
      ['rubbingSouth', '记录南廊残拓'],
      ['rubbingAssembled', '到档案馆拼合拓片'],
      ['rubbingRecovered', '回镇交给厘石公开存档'],
    ],
    { ready: ['rubbingAssembled'] },
  ),
  story(
    'mirrorTracks',
    '泉镜幼灵的足迹',
    'side',
    'mirrorKeeper',
    ['mirrorFootOne', 'mirrorFootTwo'],
    [
      ['mirrorFootOne', '记录浅岸脚印'],
      ['mirrorFootTwo', '记录泉眼水纹'],
      ['mirrorSpringClear', '恢复安静回游线'],
      ['mirrorTracks', '向护泉员汀回说明'],
    ],
    { ready: ['mirrorSpringClear'] },
  ),
  story(
    'pilgrimagePhoto',
    '巡礼者的合照',
    'side',
    'photoKeeper',
    CITIES.map((c) => `photoStamp_${c.id}`),
    [
      ...CITIES.filter((c) => c.implemented).map((c): Step => [
        `photoStamp_${c.id}`,
        `在${c.name}精灵中心留下纪念标记`,
      ]),
      ['pilgrimagePhoto', '到星岚城找摄影师雨帧合照'],
    ],
    { ready: CITIES.filter((c) => c.implemented).map((c) => `photoStamp_${c.id}`) },
  ),
  story(
    'ancientPactReward',
    '双衡古庙',
    'side',
    'pactCaretaker',
    ['templeQuest'],
    [
      ['templeWater', '疏通回水铭槽'],
      ['templeLight', '修复归光铭槽'],
      ['templeRestored', '读取双衡碑'],
      ['ancientPactReward', '回访守望者静岚'],
    ],
    { ready: ['templeRestored'] },
  ),
  story(
    'nightEchoes',
    '终宵厅的回声',
    'side',
    'nightBalance',
    ['nightCold', 'nightFlame'],
    [
      ['nightCold', '理解冷端回声'],
      ['nightFlame', '理解暖端回声'],
      ['nightEchoes', '接合两端的完整记忆'],
    ],
  ),
  story(
    'bookReport',
    '博士的观察册',
    'side',
    'professor',
    ['bookQuest'],
    [
      ['woodNote', '记录幽苔保育林林冠'],
      ['meadowNote', '记录回声原野草甸'],
      ['shoreNote', '记录回潮海藻湾水域'],
      ['bookReport', '回研究所向岚博士报告'],
    ],
    { ready: ['woodNote', 'meadowNote', 'shoreNote'] },
  ),
  story(
    'mountainEchoes',
    '山道回声',
    'side',
    'echoSteward',
    ['echoPeak', 'echoValley', 'echoCliff'],
    [
      ['echoPeak', '记录岩脊回声'],
      ['echoValley', '记录谷地回声'],
      ['echoCliff', '记录崖岸回声'],
      ['mountainEchoes', '向测绘员听禾汇总'],
    ],
    { ready: ['echoPeak', 'echoValley', 'echoCliff'] },
  ),
  story(
    'mineSafetyReport',
    '深矿旧约',
    'side',
    'retiredMiner',
    ['mineAir', 'mineStone', 'mineWater'],
    [
      ['plaqueReturned', '归还十七号工牌'],
      ['mineAir', '记录通风'],
      ['mineStone', '调查岩层'],
      ['mineWater', '记录暗河水质'],
      ['mineSafetyReport', '回石脊城向砾伯封存记录'],
    ],
    { ready: ['plaqueReturned', 'mineAir', 'mineStone', 'mineWater'] },
  ),
  story(
    'coveMemory',
    '旧航匣的航季记忆',
    'side',
    'coveCase',
    ['shipArchive'],
    [
      ['reefRestored', '完成潮池保育'],
      ['shoreNote', '记录海藻林'],
      ['shipArchive', '查阅旧航匣登记板'],
      ['coveMemory', '到湾边旧航匣核对记录'],
    ],
    { contact: 'coveCase', rewards: rewardsFor('coveMemory') },
  ),
  story(
    'manualStudy',
    '协同训练心得',
    'side',
    'manualCoach',
    [],
    [['manualStudy', '携协同手册与保育林教练交流']],
  ),
  story(
    'nurseryGift',
    '保育园的新伙伴',
    'side',
    'professor',
    ['champion'],
    [
      ['bookReport', '完成博士观察册'],
      ['champion', '取得联盟冠军'],
      ['nurseryGift', '回研究所领取两位新伙伴'],
    ],
    {
      requires: ['champion', 'bookReport'],
      ready: ['champion', 'bookReport'],
      rewards: ['另外两种初始伙伴的新个体各 ×1'],
    },
  ),
  story(
    'leagueResearch',
    '联盟生态研究',
    'side',
    'professor',
    ['nurseryGift'],
    [
      ['deepSurvey', '完成保育林观察'],
      ['ridgeSurvey', '完成原野观察'],
      ['mineSurvey', '完成深矿观察'],
      ['kelpSurvey', '完成海藻湾观察'],
      ['leagueResearch', '向岚博士提交四生境记录'],
    ],
    {
      requires: ['nurseryGift'],
      ready: ['deepSurvey', 'ridgeSurvey', 'mineSurvey', 'kelpSurvey'],
      rewards: ['大师球 ×1'],
    },
  ),
  story(
    'dexComplete',
    '星苔图鉴守望者',
    'side',
    'professor',
    ['leagueResearch'],
    [['dexComplete', '登记 250 种形态，向岚博士报告']],
    { requires: ['champion', 'bookReport'], rewards: ['旅费 10000', '星苔图鉴守望者称号'] },
  ),
];

STORY_QUESTS.push(
  story(
    'journeyComplete',
    '归途 · 星苔完整旅程',
    'main',
    '',
    ['champion', 'starReport'],
    [
      ['starReport', '完成星流调查并公开结案'],
      ['champion', '成为星苔联盟冠军'],
      ['creditsViewed', '阅览联盟篇结局'],
      ['journeyComplete', '记录星流与联盟的完整归途'],
    ],
    { rewards: ['星流与联盟完整旅程记录'] },
  ),
);
STORY_QUESTS.push(
  story(
    'postgameComplete',
    '完整远征 · 居民与旧约',
    'side',
    'professor',
    ['leagueResearch'],
    [
      ...CONSERVATION_CLOSURES.map((flag): Step => [
        flag,
        STORY_QUESTS.find((q) => q.id === flag)?.name ??
          (
            {
              routeChest: '找回一号路遗落补给',
              mistClueOne: '记录溪岸铃声',
              mistClueTwo: '记录林冠铃声',
              mistAwakened: '回应雾铃灵的旧约',
              templeRestored: '恢复双衡古庙',
              nightEchoes: '理解终宵厅回声',
            } as Record<string, string>
          )[flag] ??
          '完成生态与旧约调查',
      ]),
      ['postgameComplete', '回研究所向岚博士分享完整归途'],
    ],
    {
      requires: ['champion', 'bookReport'],
      ready: CONSERVATION_CLOSURES,
      rewards: ['完整远征结案记录'],
    },
  ),
);
for (const chapter of ADVENTURE_CHAPTERS) {
  const event = Object.keys(chapter.trainers).find((id) => id.startsWith('rival'));
  const npc = residents.find((n) => n.event === event);
  if (event && npc)
    STORY_QUESTS.push(
      story(
        event,
        `同行切磋 · ${MAPS[chapter.town].name}`,
        'side',
        npc.id,
        [],
        [[event, '与阿澈完成本地切磋']],
        { rewards: ['对战经验与旅费按战果结算'] },
      ),
    );
}

// Each gym remains independent of the regional investigation story.
for (const gym of GYM_REWARDS) {
  const chapter = ADVENTURE_CHAPTERS.find((c) => c.gym.leader === gym.leader);
  const prefix = gym.leader === 'leader' ? 'gym' : gym.leader === 'rockLeader' ? 'rock' : 'water';
  const switches = chapter?.gym.switches ?? [`${prefix}SwitchOne`, `${prefix}SwitchTwo`];
  const scout = chapter?.gym.scout ?? `${prefix}Scout`;
  const keeper = chapter?.gym.keeper ?? `${prefix}Keeper`;
  const leader = residents.find((n) => n.event === gym.leader);
  STORY_QUESTS.push(
    story(
      gym.leader,
      `${gym.badge}的考验`,
      'main',
      leader?.id ?? gym.leader,
      [...switches, scout, keeper],
      [
        [switches[0]!, '启动第一处机关'],
        [scout, '完成学徒练习'],
        [switches[1]!, '启动第二处机关'],
        [keeper, '完成守门训练师练习'],
        [gym.leader, '战胜馆主'],
      ],
      {
        requires: ['rival', 'catchTutorial'],
        rewards: [gym.badge, gym.toolName, '对战经验与旅费按战果结算'],
      },
    ),
  );
}
// Story encounters are recorded after the first response, and remain retryable until caught.
for (const encounter of [
  ...Object.values(ADVENTURE_ENCOUNTERS),
  {
    caught: 'mistCaught',
    awakened: 'mistAwakened',
    name: '雾铃灵',
    requires: ['questReward', 'mistClueOne', 'mistClueTwo'],
  },
  { caught: 'bellCaught', awakened: 'bellAwakened', name: '鸣钟石', requires: ['plaqueReturned'] },
  { caught: 'coralCaught', awakened: 'coralAwakened', name: '珊枝鹿', requires: ['reefRestored'] },
  {
    caught: 'islandCaught',
    awakened: 'islandAwakened',
    name: '浮岛龟',
    requires: ['reefRestored', 'lighthouseRepaired'],
  },
  {
    caught: 'tideCaught',
    awakened: 'tideAwakened',
    name: '回潮贝',
    requires: ['bottleDelivered', 'lighthouseRepaired'],
  },
]) {
  if (!encounter) continue;
  const npc = residents.find(
    (n) => n.event && ADVENTURE_ENCOUNTERS[n.event]?.caught === encounter.caught,
  );
  STORY_QUESTS.push(
    story(
      encounter.caught,
      `旧约相遇 · ${encounter.name}`,
      'side',
      npc?.id ??
        (
          {
            mistCaught: 'mistShrine',
            bellCaught: 'bellStone',
            coralCaught: 'coralFriend',
            islandCaught: 'islandFriend',
            tideCaught: 'tideShell',
          } as Record<string, string>
        )[encounter.caught] ??
        '',
      [
        encounter.awakened,
        ...(encounter.caught === 'mistCaught' ? ['mistClueOne', 'mistClueTwo'] : []),
      ],
      [
        [encounter.awakened, `回应${encounter.name}的同行试炼`],
        [encounter.caught, '降低体力后投球邀请；未成功可重试'],
      ],
      { requires: [...encounter.requires], rewards: [`捕获成功后：${encounter.name} ×1`] },
    ),
  );
}

export function recordQuestContact(game: GameState, npcId: string) {
  if (!game.progress.flags.catchTutorial) return;
  const accepted = game.questJournal ?? [];
  const tasks = STORY_QUESTS.filter(
    (q) =>
      q.contact === npcId &&
      (q.requires ?? []).every((f) => game.progress.flags[f]) &&
      !accepted.includes(q.id),
  );
  if (tasks.length) game.questJournal = [...accepted, ...tasks.map((q) => q.id)];
}
export function journalQuests(game: GameState): JournalQuest[] {
  const flags = game.progress.flags;
  const storyQuests = STORY_QUESTS.filter(
    (q) =>
      q.automatic ||
      flags[q.id] ||
      game.questJournal?.includes(q.id) ||
      q.starts.some((f) => flags[f]),
  ).map((q): JournalQuest => {
    const completed = !!flags[q.id];
    const steps = q.steps
      .filter(
        ([f]) =>
          !['neighborMet', 'professorRescued', 'partnerReceived', 'fieldKitReceived'].includes(f) ||
          flags.opening,
      )
      .map(([f, label]) => ({ label, done: completed || !!flags[f] }));
    const status = completed ? 'completed' : q.ready?.every((f) => flags[f]) ? 'ready' : 'active';
    return {
      ...q,
      steps,
      status,
      current: steps.filter((s) => s.done).length,
      target: steps.length,
      next: completed
        ? '任务已完成，记录与奖励已保留。'
        : (steps.find((s) => !s.done)?.label ?? '继续调查任务目标。'),
    };
  });
  const cityQuests = CITIES.flatMap((city) =>
    city.quests
      .filter((q) => game.cityServices?.quests[q.id])
      .map((q): JournalQuest => {
        const completed = game.cityServices?.quests[q.id] === 'claimed';
        const progress = questProgress(game, q);
        return {
          id: q.id,
          cityQuestId: q.id,
          name: q.name,
          kind: 'side',
          client: q.client,
          location: city.name,
          starts: [],
          rewards: [
            `旅费 ${q.reward.money}`,
            `调查印记 ×${q.reward.merit}`,
            ...itemRewards(q.reward.items),
          ],
          status: completed ? 'completed' : progress.ready ? 'ready' : 'active',
          steps: [
            { label: completed ? q.story : progress.label, done: completed || progress.ready },
            { label: `回${city.name}交付并领取奖励`, done: completed },
          ],
          current: completed ? progress.target : progress.current,
          target: progress.target,
          next: completed
            ? '奖励已领取。'
            : progress.ready
              ? `回${city.name}交付并领取奖励`
              : q.story,
        };
      }),
  );
  return [...storyQuests, ...cityQuests].sort((a, b) => {
    const order = { ready: 0, active: 1, completed: 2 };
    return (
      order[a.status] - order[b.status] || (a.kind === b.kind ? 0 : a.kind === 'main' ? -1 : 1)
    );
  });
}
export function canClaimCityQuest(game: GameState, quest: JournalQuest) {
  return (
    !!quest.cityQuestId &&
    quest.status === 'ready' &&
    CITIES.find((c) => c.id === cityFor(game.player.map)?.id)?.quests.some(
      (q) => q.id === quest.cityQuestId,
    )
  );
}

export function trackedQuest(game: GameState): JournalQuest | undefined {
  return game.trackedQuestId
    ? journalQuests(game).find((q) => q.id === game.trackedQuestId)
    : undefined;
}
