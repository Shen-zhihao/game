import design from '../../../docs/data/creature-types.json';
import acquisition from '../../../docs/data/acquisition-plan.json';
import { ADVENTURE_STORY_CONTENT } from '../adventure';
import { CONSERVATION_WATER } from '../conservation';
import { LEAGUE_MAPS } from '../league';
import { MapId } from '../../game/model';

export interface HabitatEncounter {
  speciesId: string;
  min: number;
  max: number;
  weight: number;
}
export interface HabitatSite {
  storySpeciesId?: string;
  id: string;
  name: string;
  regionId: string;
  medium: 'land' | 'water' | 'story';
  map?: MapId;
  bounds?: [number, number, number, number];
  description: string;
  encounters: HabitatEncounter[];
}
const encounter = (number: number, min: number, max: number, weight: number): HabitatEncounter => ({
  speciesId: `creature_${String(number).padStart(3, '0')}`,
  min,
  max,
  weight,
});
const site = (
  id: string,
  name: string,
  regionId: string,
  medium: HabitatSite['medium'],
  description: string,
  map?: MapId,
  encounters: HabitatEncounter[] = [],
  bounds?: HabitatSite['bounds'],
): HabitatSite => ({
  id,
  name,
  regionId,
  medium,
  description,
  ...(map ? { map } : {}),
  encounters,
  ...(bounds ? { bounds } : {}),
});
export const HABITAT_SITES: HabitatSite[] = [
  site(
    'coast_shore',
    '矿港道·芦苇草滩',
    'coastRoute',
    'land',
    '淡水桥头与湿润草滩，蟹、螺、鸭和鲎在湿岸觅食。',
    'coastRoute',
    [
      encounter(82, 9, 12, 30),
      encounter(95, 10, 13, 25),
      encounter(190, 10, 13, 30),
      encounter(196, 11, 14, 15),
    ],
  ),
  site(
    'sluice_shore',
    '潮间闸·湿岸',
    'tideworks',
    'land',
    '潮闸外的泥沙草滩，保留旱潮都可抵达的水陆交错生境。',
    'tideworks',
    [
      encounter(82, 11, 14, 35),
      encounter(95, 11, 14, 30),
      encounter(190, 12, 15, 20),
      encounter(196, 12, 15, 15),
    ],
  ),
  site(
    'route_meadow',
    '晨光一号路',
    'route',
    'land',
    '低矮草甸与种子灌丛，鼠类觅食，雀鸟利用开阔视野。',
    'route',
    [
      encounter(37, 3, 6, 35),
      encounter(40, 4, 7, 25),
      encounter(10, 4, 6, 25),
      encounter(13, 5, 7, 15),
    ],
  ),
  site(
    'route_thicket',
    '东侧高草区',
    'route',
    'land',
    '根系包裹着碎石，适合石壳虫躲藏与结蛹。',
    'route',
    [encounter(13, 5, 7, 55), encounter(40, 4, 7, 25), encounter(10, 4, 6, 20)],
    [24, 11, 28, 16],
  ),
  site(
    'dawn_pool',
    '晨芽镇·花园池',
    'dawn',
    'water',
    '水草覆盖的浅池，荷叶蛙在睡莲与岸边间活动。',
    'dawn',
    [encounter(27, 4, 6, 100)],
  ),
  site(
    'route_stream',
    '一号路·溪湾',
    'route',
    'water',
    '与森林相通的缓流，岸边有水草和蛙类食物。',
    'route',
    [encounter(27, 5, 7, 100)],
  ),
  site(
    'moss_pool',
    '苔丘镇·林缘池',
    'moss',
    'water',
    '水流通向林中湿地，适合两栖精灵停留。',
    'moss',
    [encounter(27, 6, 8, 100)],
  ),
  site(
    'forest_floor',
    '苔影森林',
    'forest',
    'land',
    '林下苔藓、落叶与石缝组成遮蔽环境。',
    'forest',
    [encounter(13, 6, 8, 55), encounter(10, 7, 9, 45)],
  ),
  site(
    'forest_canopy',
    '林冠草地',
    'forest',
    'land',
    '花粉和树汁充足，萤灯蛾在林隙与高枝间聚集。',
    'forest',
    [encounter(16, 7, 9, 65), encounter(13, 6, 8, 35)],
    [14, 1, 28, 5],
  ),
  site(
    'forest_marsh',
    '南岸湿地',
    'forest',
    'land',
    '湿润草岸，荷叶蛙可上岸觅食，叶耳兔取食岸边嫩草。',
    'forest',
    [encounter(27, 7, 9, 70), encounter(10, 6, 8, 30)],
    [1, 16, 20, 18],
  ),
  site(
    'forest_stream',
    '森林·林间溪水',
    'forest',
    'water',
    '浅水、浮叶与缓流构成连续的两栖生境。',
    'forest',
    [encounter(27, 7, 9, 100)],
  ),
  site(
    'stone_slope',
    '二号碎石道',
    'stoneRoute',
    'land',
    '排水良好的砾草坡，适合掘洞、食根及矿物护甲精灵。',
    'stoneRoute',
    [encounter(49, 7, 10, 40), encounter(59, 8, 10, 35), encounter(13, 7, 9, 25)],
  ),
  site(
    'stone_crystal',
    '东坡砾草地',
    'stoneRoute',
    'land',
    '日照充足的晶砂坡，晶芽螺吸附矿物，砾角犀磨角。',
    'stoneRoute',
    [encounter(62, 8, 11, 65), encounter(59, 8, 10, 35)],
    [25, 10, 29, 16],
  ),
  site(
    'mine_shaft',
    '石脊旧矿山',
    'mine',
    'land',
    '干燥矿道与高处洞壁，煤团鼹掘土，听岩蝠依靠回声飞行。',
    'mine',
    [encounter(68, 8, 11, 40), encounter(71, 8, 11, 35), encounter(62, 9, 11, 25)],
  ),
  site(
    'mine_rubble',
    '矿山南岸碎石堆',
    'mine',
    'land',
    '靠近暗河的干燥石岸，只有陆生精灵在碎石间活动。',
    'mine',
    [encounter(68, 8, 11, 65), encounter(62, 9, 11, 35)],
    [3, 14, 11, 18],
  ),
  site(
    'mine_river',
    '旧矿山·地下暗河',
    'mine',
    'water',
    '滴石鲶在矿物质丰富的暗河中生活；站在岸边面向水面调查。',
    'mine',
    [encounter(75, 8, 11, 100)],
  ),
  site('forest_shrine', '森林·旧铃残碑', 'forest', 'story', '护林旧约留下的铃声与雾气。', 'forest'),
  site(
    'mine_bell',
    '旧矿山·回声钟石',
    'mine',
    'story',
    '矿工工牌与钟石共鸣留下的同行旧约。',
    'mine',
  ),
  site(
    'nursery',
    '晨芽镇·研究所保育园',
    'dawn',
    'story',
    '初始伙伴由博士正式赠予，不进入普通野生遭遇。',
    'dawn',
  ),
  site(
    'deepwood',
    '苔影深林·古木与腐殖层',
    'forest',
    'land',
    '落叶、真菌与古老树根支撑的成熟森林。',
  ),
  site(
    'reed_marsh',
    '苔影深林·芦苇沼泽',
    'forest',
    'water',
    '苇丛、淤泥和缓流为涉禽与水生精灵提供掩护。',
  ),
  site(
    'orchard',
    '晨光原野·果林与田埂',
    'route',
    'land',
    '成熟果树、谷物和田埂，适合采食与农田共生精灵。',
  ),
  site(
    'ranch',
    '晨光原野·开阔牧场',
    'route',
    'land',
    '连续草场与起伏丘陵，提供群居、奔跑和觅草空间。',
  ),
  site(
    'dusk_grass',
    '晨光原野·暮影灌丛',
    'route',
    'land',
    '灌丛边缘的遮蔽区，适合伏击与追踪小型猎物。',
  ),
  site(
    'quartz_depths',
    '旧矿山深层·晶簇岩室',
    'mine',
    'land',
    '富含晶矿的稳定岩室，供结晶与岩石精灵栖身。',
  ),
  site(
    'sulfur_vents',
    '旧矿山深层·硫热裂隙',
    'mine',
    'land',
    '硫晶、矿热与通风裂隙形成耐热精灵的特殊生境。',
  ),
  site('salt_ice', '高山矿洞·霜盐洞', 'town-5', 'land', '冷风凝结盐晶，适合冰系与矿盐共生精灵。'),
  site(
    'river_delta',
    '潮汐港·河口缓流',
    'town-3',
    'water',
    '河水与潮水交汇，水草和沙洲形成繁殖、藏身场所。',
    'harbor',
    [encounter(79, 10, 13, 35), encounter(88, 11, 14, 30), encounter(187, 10, 13, 35)],
  ),
  site(
    'river_rapids',
    '潮汐上游·急流浅滩',
    'town-3',
    'water',
    '清洁、含氧量高的急流，适合强健鳍足与逆流活动。',
    'coastRoute',
    [encounter(79, 9, 12, 100)],
    [12, 1, 17, 24],
  ),
  site(
    'tidal_flat',
    '潮汐港·潮间滩涂',
    'town-3',
    'water',
    '潮池、沙砾与泥滩交错，适合掘沙、滤食与甲壳精灵。',
    'tideworks',
    [encounter(82, 11, 14, 40), encounter(95, 11, 14, 30), encounter(196, 12, 15, 30)],
  ),
  site(
    'open_sea',
    '潮汐外海·洋流带',
    'town-3',
    'water',
    '开阔深水与连续洋流，供大范围迁游精灵活动。',
    'coastRoute',
    [encounter(85, 12, 15, 35), encounter(91, 11, 14, 35), encounter(93, 12, 15, 30)],
    [30, 1, 38, 24],
  ),
  site(
    'reef_garden',
    '潮汐外海·珊瑚浅礁',
    'town-3',
    'water',
    '明亮浅礁与潮汐回声，保留珊瑚和稀有生境故事。稀有精灵只在调查后定点相遇。',
    'tideworks',
    [encounter(198, 13, 16, 100)],
    [29, 17, 38, 26],
  ),
  site(
    'kelp_forest',
    '潮汐外海·海藻林',
    'town-3',
    'water',
    '海藻、矿质锚点和隐蔽水道组成稳定食物网。',
  ),
  site(
    'wind_valley',
    '风栖山脊·风谷与峭壁',
    'town-5',
    'land',
    '上升气流、岩壁巢位与稀疏山草，供滑翔和攀岩活动。',
  ),
  site(
    'alpine_snow',
    '风栖山脊·高山雪线',
    'town-5',
    'land',
    '低温、冰晶与积雪，适合保温皮毛和寒气精灵。',
  ),
  site(
    'volcano',
    '炉心火山·熔岩冷却带',
    'town-6',
    'land',
    '冷却火山岩与热裂隙交错，不把精灵直接放进熔岩。',
  ),
  site(
    'thermal_spring',
    '炉心山麓·温泉溪谷',
    'town-6',
    'water',
    '温泉与冷溪交汇，提供耐冷热两栖精灵的生活区。',
  ),
  site(
    'warm_woodland',
    '炉心山麓·暖风疏林',
    'town-6',
    'land',
    '耐热灌木、树洞和上升暖流，供火系兽类与飞鸟筑巢。',
  ),
  site(
    'city_power',
    '雷鸣市·能源设施外缘',
    'town-4',
    'land',
    '受控电流、金属结构与安全通风口，供电与钢系共生。',
  ),
  site(
    'city_canal',
    '雷鸣市·生态排水渠',
    'town-4',
    'water',
    '经过治理的清洁水渠，连接城镇与外围湿地。',
  ),
  site(
    'city_oldquarter',
    '星岚城·旧街与灯巷',
    'town-8',
    'land',
    '灯火、旧织物与废弃居所，为都市灵体提供载体。',
  ),
  site(
    'city_workshop',
    '星岚城·工坊与轨道花园',
    'town-8',
    'land',
    '陶土、金属轨道与工坊余材，适合与工艺共生的精灵。',
  ),
  site(
    'mirror_lake',
    '镜湖镇·镜湖湿岸',
    'town-7',
    'water',
    '安静水面与岸边雾气，适合水、超能与回声灵体。',
  ),
  site(
    'ruins_court',
    '星核遗迹·碑廊与古庭',
    'ruins',
    'land',
    '古文、石碑与残存结界，栖居古代守护精灵。',
  ),
  site(
    'ruins_spring',
    '星核遗迹·轮镜旧泉',
    'ruins',
    'story',
    '旧泉与时间涟漪相连，仅通过保育与调查剧情开启。',
  ),
  site(
    'ruins_seal',
    '星核遗迹·封印内庭',
    'ruins',
    'story',
    '守护结界与封印载体的深层空间，由完整调查链开启。',
  ),
  site(
    'star_shrine',
    '星核遗迹·双衡星坛',
    'ruins',
    'story',
    '双衡星兽的秩序试炼场，仅在相应传说剧情中相遇。',
  ),
  site(
    'frostfire_seal',
    '星核遗迹·霜火封印室',
    'ruins',
    'story',
    '冷焰与龙脉共同维持的封印，终宵烛龙的剧情相遇地点。',
  ),
];

// Each family has an ecological reason, rather than assigning habitats by type alone.
// A chapter's actual encounter pool also supplies its map and dex habitat records.
for (const chapter of ADVENTURE_STORY_CONTENT)
  for (const map of chapter.maps) {
    if (!map.encounters.length) continue;
    const existingId =
      map.id === 'powerRoute'
        ? 'city_power'
        : map.id === 'windRoute'
          ? 'wind_valley'
          : map.id === 'windSanctuary'
            ? 'alpine_snow'
            : map.id === 'furnaceRoute'
              ? 'volcano'
              : map.id === 'hotSprings'
                ? 'warm_woodland'
                : map.id === 'lakeRoute'
                  ? 'mirror_lake'
                  : map.id === 'mirrorRuins'
                    ? 'ruins_court'
                    : map.id === 'star'
                      ? 'city_oldquarter'
                      : map.id === 'starRoute'
                        ? 'orchard'
                        : map.id === 'deepwood'
                          ? 'deepwood'
                          : map.id === 'echoMeadow'
                            ? 'ranch'
                            : map.id === 'mineDepths'
                              ? 'quartz_depths'
                              : null;
    const existing = existingId ? HABITAT_SITES.find((s) => s.id === existingId) : undefined;
    if (existing) {
      existing.map = map.id;
      existing.encounters = map.encounters;
    } else
      HABITAT_SITES.push(
        site(
          `regional_${map.id}`,
          map.name,
          'number' in chapter ? `town-${chapter.number}` : map.id,
          'land',
          map.subtitle,
          map.id,
          map.encounters,
        ),
      );
  }
const canal = HABITAT_SITES.find((s) => s.id === 'city_canal')!;
HABITAT_SITES.push(
  site(
    'champion_alpine',
    '冠军路·高岭回环',
    'league',
    'land',
    '回环岩坡与高岭冷风，适合攀岩、飞行、耐寒精灵；不混入剧情稀有家族。',
    'championRoad',
    LEAGUE_MAPS.championRoad.encounters,
  ),
);
for (const chapter of ADVENTURE_STORY_CONTENT)
  for (const [event, encounter] of Object.entries(chapter.encounters ?? {})) {
    if (!encounter) continue;
    const map = chapter.maps.find((m) => m.npcs.some((n) => n.event === event));
    if (map)
      HABITAT_SITES.push({
        ...site(
          `story_${event}`,
          `${map.name}·${encounter.name}`,
          'number' in chapter ? `town-${chapter.number}` : map.id,
          'story',
          '完成对应保育调查后开启独立定点相遇；失败可重试，捕获后不重复生成。',
          map.id,
        ),
        storySpeciesId: encounter.speciesId,
      });
  }
canal.map = 'volt';
canal.encounters = [
  encounter(27, 12, 16, 35),
  encounter(187, 13, 17, 35),
  encounter(190, 13, 17, 30),
];
for (const water of CONSERVATION_WATER) {
  const id = water.map === 'kelpCove' ? 'kelp_forest' : 'reed_marsh',
    existing = HABITAT_SITES.find((s) => s.id === id);
  const next = site(
    id,
    water.name,
    water.regionId,
    'water',
    water.description,
    water.map,
    water.encounters,
  );
  if (existing) Object.assign(existing, next);
  else HABITAT_SITES.push(next);
}
for (const [id, map, bounds, pool] of [
  [
    'sulfur_vents',
    'mineDepths',
    [31, 6, 40, 20],
    [encounter(176, 28, 38, 55), encounter(179, 29, 39, 45)],
  ],
  [
    'salt_ice',
    'mineDepths',
    [2, 4, 14, 31],
    [encounter(184, 29, 39, 60), encounter(182, 28, 38, 40)],
  ],
  [
    'dusk_grass',
    'echoMeadow',
    [28, 6, 41, 22],
    [encounter(51, 25, 34, 40), encounter(168, 25, 34, 35), encounter(173, 25, 34, 25)],
  ],
] as [string, MapId, [number, number, number, number], HabitatEncounter[]][]) {
  const s = HABITAT_SITES.find((s) => s.id === id)!;
  s.map = map;
  s.regionId = map;
  s.bounds = bounds;
  s.encounters = pool;
}
const familyDefinitions = `
001|deepwood,nursery|取食林缘嫩叶与苔藓，角枝为微光植物提供附着面。
002|warm_woodland,nursery|在温暖树洞筑巢，炽尾用来驱散潮气，成长后借暖流滑翔。
003|forest_stream,river_rapids,nursery|沿清洁溪流捕食小型水生生物，鳍足和岩质护甲适合浅滩。
004|route_meadow,route_thicket,forest_floor,forest_marsh|以嫩草和花芽为食，在密草和林缘之间藏身、奔跑。
005|route_meadow,route_thicket,forest_floor,forest_canopy,stone_slope|幼体依附碎石与苔根，蛹在石缝结晶，成虫停留在有矿砂的林隙。
006|forest_canopy,deepwood,city_power|取食花蜜与树汁，电光用于同伴交流，成虫沿高枝与安全电场迁飞。
007|deepwood|依靠腐木和湿润落叶生长，以菌丝循环林地养分，避开干燥草原。
008|deepwood,stone_slope|在长满苔藓的岩根间晒背，藤脊与古木色护甲提供伪装。
009|forest_shrine|依附旧铃和护林记忆，在残碑雾气中维持回声，不出现在普通草丛。
010|dawn_pool,route_stream,moss_pool,forest_marsh,forest_stream|依水草和浮叶藏身，浅水繁殖，也会上湿润草岸取食。
011|deepwood,orchard|追随开花植物采蜜，以树脂和花粉构筑蜂巢。
012|deepwood|盘绕粗大树根，以湿润灌丛和腐殖层掩护伏击，不在开阔石坡暴露。
013|deepwood|在晨露密集的灌木间结晶丝网，晶露与毒液共同保护巢区。
014|mirror_lake,deepwood|以静水镜像和微弱回声定位，停留在清澈、少扰动的深池。
015|deepwood|在湿润落叶下分解植物残屑，依靠壳与毒液抵御天敌。
016|deepwood,ruins_court|依附荆棘、枯木和覆石旧庭，古老植被与残存灵性构成载体。
017|route_meadow,orchard,city_power|采集草籽与谷物，幼体藏草，逐电形态会利用设施外围的静电。
018|route_meadow,route_thicket,wind_valley|在草甸觅食、树杈筑巢，进化后沿山谷气流扩大活动范围。
019|ranch,city_power|群居于有遮蔽的草场，电绒形态靠安全静电调节羊群信号。
020|orchard,deepwood|采集和传播浆果，厚实身体适合在果林与林缘穿行。
021|stone_slope,ranch|在干燥坡地掘穴，强壮后肢适合砾地跳跃，避开淤泥深水。
022|dusk_grass,deepwood|沿灌丛边缘追踪猎物，用暮色与树影隐藏身形。
023|orchard,route_meadow|在谷地和果树间传播种子，草铃状羽饰与风中鸣声相互呼应。
024|ranch,wind_valley|需要连续开阔地奔跑，结实蹄部适合干草原与砂砾丘陵。
025|ranch,wind_valley|在高草场休息，借低云和暖气流缓慢移动，需保育剧情建立信任。
026|dusk_grass,deepwood|在落叶与低矮林枝间旋转滑行，以灌丛遮蔽小型身体。
027|stone_slope,stone_crystal|以坚实坡面磨角并开掘根系，矿物质为护甲提供原料。
028|stone_crystal,mine_shaft,mine_rubble,quartz_depths|吸附晶砂与含矿水滴，在稳定岩壁缓慢结晶，不生活在松软沼地。
029|stone_slope,wind_valley|在干燥砂岩裂缝中避风，龙鳞形态占据更高的裸岩领地。
030|mine_shaft,mine_rubble,sulfur_vents|沿煤层掘土筑巢，含碳矿物与地热支撑火、钢形态成长。
031|mine_shaft,quartz_depths|悬挂洞顶避光，以回声识别矿壁与飞行通道。
032|quartz_depths,city_power|沿含铁矿层排成蚁路，金属与磁场帮助整齐协作搬运。
033|mine_river|生活在黑暗的矿质河水中，以触须和水压识别暗流，不放在干燥草地。
034|mine_bell|钟石承载矿工留下的回声，需要归还旧牌并完成约定后才能相遇。
035|salt_ice,mine_river|在寒冷地下水与矿盐缝隙觅食，以微弱电光识别同伴。
036|river_delta,river_rapids|幼体藏在缓流底泥中，成长后以更强鳍足适应逆流与浅滩。
037|coast_shore,sluice_shore,tidal_flat,reef_garden|在潮池取食、岩隙蜕壳，矿砂与低温潮水共同塑造硬壳。
038|open_sea|沿外海洋流巡游，速度与感知适合追踪猎物，中间形态可跃水滑翔。
039|river_delta,open_sea|幼体利用河口隐蔽水道，成熟形态沿海流与电信号长距离迁移。
040|open_sea,reef_garden|随潮漂游，以发光触腕吸引小型生物，避开干燥陆地。
041|open_sea|依靠帆鳍与长身形高速巡游，需要开阔海面而非狭小池塘。
042|coast_shore,sluice_shore,tidal_flat,river_delta|在泥滩滤食并稳固水草根系，泥壳与草芽随潮汐共同生长。
043|reef_garden|依靠珊瑚浅礁与洁净潮水生存，由保育支线修复栖地后相遇。
044|reef_garden,kelp_forest|背部承载植被和浮土，在受保护的海湾缓慢迁移，不进入普通随机池。
045|reef_garden,mirror_lake|停留在寒潮与回声交汇的潮池，需回潮旧约剧情才能获得。
046|wind_valley,alpine_snow|蹄角适合峭壁攀行，进化后更能适应高山寒风与雪线。
047|wind_valley|利用山谷上升气流筑高巢，雷龙形态占据暴风山口。
048|alpine_snow|厚毛与寒雾保护身体，雪地和低温山林提供持续冷源。
049|wind_valley,alpine_snow|轻翼能借风旋转迁飞，冰霜形态活动在更高、更冷的山口。
050|wind_valley,alpine_snow|在高山湖岸与石台停留，鸣声用于顺着风谷寻找同伴。
051|wind_valley|以坚硬喙部筑岩壁巢，陡坡与开放气流便于起降。
052|wind_valley|在强风与雷云边缘巡航，迁徙调查完成后才会回应训练师。
053|alpine_snow,wind_valley|栖居云雾、冰晶与稳定气流交汇处，需恢复迁徙通路后相遇。
054|warm_woodland,city_oldquarter|附着在旧灯和耐热树洞，以火光与记忆维持灵体。
055|volcano|依靠温暖的冷却岩面调节体温，避开仍在流动的熔岩。
056|thermal_spring|在温泉与冷溪间活动，耐热体表和强壮四肢适合水陆切换。
057|warm_woodland,volcano|以耐火树木和峭壁筑巢，借暖风升空，不在无落脚点的熔岩中栖息。
058|volcano,sulfur_vents|藏在黑曜岩和硫热石隙，以毒液和硬壳保护领域，来源保留调查剧情。
059|warm_woodland,volcano|逐日照和花蜜迁飞，需要火山花带恢复后才出现。
060|city_power|利用受控静电和安全设备外壳储能，在设施外围而非危险带电芯处筑巢。
061|city_power,city_workshop|围绕金属结构与稳定机械振动活动，齿轮形态依赖成套部件。
062|city_oldquarter,city_workshop|附着旧纸张与风声，在屋檐和工坊中折叠出飞行轮廓。
063|city_oldquarter|借旧灯巷的光影与居民记忆活动，只由都市调查线开启。
064|city_power,city_oldquarter|金属羽壳需要可回收材料，停留在能源设施外墙与高檐。
065|city_power|栖居稳定讯号与受控电流的交汇点，需先完成能源调查建立联系。
066|ruins_court|与石碑、古文和守护结界共生，需要遗迹调查解除沉睡。
067|ruins_court,wind_valley|幼体栖于古庭高檐，进化后依靠遗迹星流与上升气流行动。
068|mirror_lake,ruins_court|借镜湖月影和古庭残留回声隐藏行踪，镜面水源不可缺少。
069|ruins_seal|围绕多元素源环保持稳定，只能完成深层遗迹故事后获得。
070|ruins_seal|形态与封印记忆相连，不以普通种族方式繁殖或随机出现。
071|reed_marsh|苇管羽骨如笛，长腿能在浅水行走，以芦穗掩护幼体。
072|reed_marsh,mirror_lake|背部墨囊遮掩水下行踪，适合泥底与植被密集的湿地水域。
073|deepwood|依靠阔叶、苔藓和柔韧枝条吐丝结茧，完整树冠便于成虫导航。
074|orchard,deepwood|以果实和花蜜为食，果盏状结构能把种子带往林缘。
075|reed_marsh,mirror_lake|在睡莲浅池休息，安静水面与梦境波纹共同保护领地。
076|deepwood|菌伞依赖湿润腐殖层与共生植物，由生态保育调查开启。
077|orchard,ranch|从谷穗间觅食，成熟后利用田野上升气流传播种子。
078|orchard,ranch|沿田埂筑泥坝并开掘蓄水沟，硬土前爪适合农田与缓坡。
079|ranch|成群活动于开阔草场，蹄步和电光帮助群体保持节奏。
080|ranch,orchard|在花粉与谷物尘间振翅，利用起伏气流进行求偶和迁飞。
081|dusk_grass,ranch|依靠开阔地热流形成远望幻景，需要观测支线完成后接近。
082|sulfur_vents|硫晶沿脊背结冠，通风鳍帮助在矿热与有毒蒸气间调节身体。
083|quartz_depths,mine_river|沿含矿石面与潮湿岩隙感知震动，以电与敲击信号交流。
084|quartz_depths|钟乳岩状身体悬在洞顶，利用空腔共鸣滑行，避开无岩顶草原。
085|salt_ice|冰盐与金属矿层为护甲提供结晶原料，温暖海滩不适合它们。
086|quartz_depths,ruins_seal|封矿结构与古老守护意识结合，需矿山保育调查完成后唤醒。
087|river_delta,open_sea|幼体依附河口岩面，螺壳水文成长后能顺洋流稳定迁游。
088|coast_shore,sluice_shore,river_delta,tidal_flat,open_sea|以河口与湿岸作繁殖地，成年背部帆翼帮助跨海迁徙。
089|kelp_forest|以藻丝、矿质锚盘和浅海电场相连，成年会携带小片漂流藻林。
090|coast_shore,sluice_shore,tidal_flat|在砂砾岸潜伏并稳固浅潮池，层叠甲壳与泥岩相互伪装。
091|reef_garden,open_sea|利用明亮浅潮和发光腺体交流，随潮汐进入外海浅层。
092|reef_garden,ruins_seal|附着沉船匣体与潮汐记忆，只由海岸调查恢复封存故事后获得。
093|alpine_snow|霜线皮毛与冰针前爪保护身体，需要稳定低温而非普通林地。
094|wind_valley,alpine_snow|翼铃依靠持续气流发声，成年沿极光与高空寒气迁移。
095|wind_valley|砾羽幼体在岩巢长大，成年借盘旋气流观察山地猎物。
096|alpine_snow|冰晶折射形成环晕，安静雪地与低温湖岸适合藏身。
097|wind_valley|以结实风索在岩壁与树杈间架网，利用气流而非地下暗河行动。
098|alpine_snow,wind_valley|在断峰与冰翼气流间休息，完成山脊守护故事后才回应训练师。
099|volcano|砂岩甲片在温暖炉灰中成长，需要有稳定落脚面的冷却岩带。
100|thermal_spring|水与火共同调节体温，尾鳍适合冷热泉交汇的水域。
101|warm_woodland,volcano|取食耐热树汁并以炭弦发声，蜕皮在温暖树干和冷却熔岩边缘进行。
102|warm_woodland|火漆羽毛与灰烬记忆相连，在耐火树林和高檐筑巢。
103|sulfur_vents,volcano|硫烟面纹帮助隐藏在热裂隙的蒸气中，来源保留火山调查线。
104|city_oldquarter,city_workshop|依附废线与旧织物成形，线轴关节需要工坊与旧城材料。
105|city_oldquarter,city_power|折纸翅膀借屋檐风飞行，成熟形态沿安全讯号通路传递信息。
106|city_workshop|以陶土、旧瓷片和工坊歌声形成身体，草原与外海不能提供载体。
107|city_workshop,city_power|磁足收集金属碎屑，壳内小轨道依赖稳定金属表面和受控电流。
108|city_oldquarter,city_workshop|锚钟与旧居守护记忆组成身体，需旧城调查确认来历后相遇。
109|city_oldquarter,city_power|以舞台灯光和人群情绪构成霓幕，只在都市支线完成后回应。
110|ruins_court|幼体藏在古文砂层，结蛹时吸收碑纹，成虫沿遗迹边界巡游。
111|ruins_court,ruins_seal|古曜鳞甲与残存龙脉相连，需要遗迹保护故事而非普通岩坡随机刷新。
112|ruins_spring|镜泉水滴成长为轮镜，依赖旧泉与时间涟漪的稳定联系。
113|ruins_seal|玄锁与封印意识共同维持身体，必须在解印故事中建立信任。
114|star_shrine|双衡星坛为力量与感知提供平衡，只能通过完整传说试炼相遇。
115|frostfire_seal|冷焰封印与龙脉保持体内多种力量平衡，只在终宵传说剧情中出现。
`
  .trim()
  .split('\n')
  .map((line) => {
    const [number, sites, description] = line.split('|');
    return { familyId: `F${number}`, siteIds: sites!.split(','), description: description! };
  });
const familyById = new Map(familyDefinitions.map((f) => [f.familyId, f]));
const acquisitionById = new Map(acquisition.families.map((f) => [f.familyId, f]));
export interface SpeciesHabitat {
  speciesId: string;
  familyId: string;
  ecology: string;
  description: string;
  siteIds: string[];
  method: 'wild' | 'evolution' | 'storyGift' | 'storyEncounter';
  sourceSpeciesId: string | null;
  questId: string | null;
  storyBeat: string | null;
  obtainableNow: boolean;
}
export const SPECIES_HABITATS: Record<string, SpeciesHabitat> = {};
for (const family of design.families) {
  const definition = familyById.get(family.id);
  if (!definition) throw new Error(`缺少家族栖息地：${family.id}`);
  const story = acquisitionById.get(family.id);
  const wildAvailable = HABITAT_SITES.some(
    (s) => s.map && s.encounters.some((e) => family.forms.some((f) => f.id === e.speciesId)),
  );
  for (const form of family.forms) {
    const matureRange =
      form.stage <= 1
        ? ''
        : form.types.includes('water')
          ? '进化后需要更稳定的水源和更宽敞的水域或湿岸。'
          : form.types.includes('flying')
            ? definition.siteIds.some((id) =>
                ['mine_shaft', 'mine_river', 'quartz_depths'].includes(id),
              )
              ? '进化后沿洞顶与岩壁活动，需要更宽阔的洞室。'
              : definition.siteIds.some((id) => id.startsWith('city_'))
                ? '进化后沿屋檐与街巷风道扩大活动范围。'
                : '进化后利用高枝、岩壁或上升气流扩大活动范围。'
            : '进化后在同一生境中占据更宽的觅食或守护范围。';
    SPECIES_HABITATS[form.id] = {
      speciesId: form.id,
      familyId: family.id,
      ecology: design.ecologies.find((e) => e.id === family.ecology)!.name,
      description: `${form.name}：${definition.description}${matureRange}`,
      siteIds: [
        ...new Set([
          ...definition.siteIds,
          ...HABITAT_SITES.filter(
            (s) =>
              family.forms.some((f) => f.id === s.storySpeciesId) ||
              s.encounters.some((e) => family.forms.some((f) => f.id === e.speciesId)),
          ).map((s) => s.id),
        ]),
      ],
      method: form.evolvesFromId
        ? 'evolution'
        : story
          ? (story.method as 'storyGift' | 'storyEncounter')
          : 'wild',
      sourceSpeciesId: form.evolvesFromId,
      questId: story?.questId ?? null,
      storyBeat: story?.storyBeat ?? null,
      obtainableNow: story ? story.implemented : wildAvailable,
    };
  }
}
export const habitatSite = (id: string) => HABITAT_SITES.find((s) => s.id === id)!;
export function encounterSiteAt(
  map: MapId,
  x: number,
  y: number,
  medium: 'land' | 'water' = 'land',
) {
  const candidates = HABITAT_SITES.filter(
    (s) => s.map === map && s.medium === medium && s.encounters.length,
  );
  return (
    candidates.find(
      (s) =>
        s.bounds && x >= s.bounds[0] && y >= s.bounds[1] && x <= s.bounds[2] && y <= s.bounds[3],
    ) ?? candidates.find((s) => !s.bounds)
  );
}
export const landEncounters = (map: MapId) =>
  HABITAT_SITES.find((s) => s.map === map && s.medium === 'land' && !s.bounds)?.encounters ?? [];
export const habitatZones = (map: MapId) =>
  HABITAT_SITES.filter((s) => s.map === map && s.medium === 'land' && s.bounds).map((s) => ({
    name: s.name,
    bounds: s.bounds!,
    encounters: s.encounters,
  }));
export function habitat(speciesId: string): string {
  const profile = SPECIES_HABITATS[speciesId];
  if (!profile) return '未知栖息地';
  const locations = profile.siteIds.map((id) => habitatSite(id).name).join('／');
  return `${locations} · ${profile.method === 'evolution' ? '进化获得' : profile.method === 'wild' ? '普通野生' : '剧情获得'}${profile.obtainableNow ? '' : '（后续区域）'}`;
}
