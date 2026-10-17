import type { TownId } from '../../game/model';
import type { GameMap, Npc } from '../world';

export const CITY_TOWNS = [
  'dawn',
  'moss',
  'stone',
  'harbor',
  'volt',
  'wind',
  'furnace',
  'lake',
  'star',
  'league',
] as const satisfies readonly TownId[];
export const CITY_BUILDING_KINDS = [
  'bakery',
  'workshop',
  'library',
  'guild',
  'teahouse',
  'greenhouse',
] as const;
export type CityBuildingKind = (typeof CITY_BUILDING_KINDS)[number];
export type CityBuildingSite = `${TownId}_${CityBuildingKind}`;
export const CITY_BUILDING_SITES = CITY_TOWNS.flatMap((town) =>
  CITY_BUILDING_KINDS.map((kind): CityBuildingSite => `${town}_${kind}`),
);
export interface CityScenery {
  kind: 'fountain' | 'bench' | 'lamp' | 'stall' | 'planter' | 'arch' | 'landmark';
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Shared source-pixel anchors keep the illustrated glass and night glow aligned. */
export function streetLampAnchors(lamp: Pick<CityScenery, 'x' | 'y'>) {
  return {
    bulbX: lamp.x * 32 + 9.5,
    bulbY: lamp.y * 32 - 20,
    groundX: lamp.x * 32 + 16,
    groundY: lamp.y * 32 + 29,
  };
}
interface CityIdentity {
  size: [number, number];
  quarters: [string, string, string];
  houses: [string, string, string, string, string, string];
  people: [string, string, string, string, string, string];
  craft: [string, string, string];
  actions: [string, string, string];
  celebration: string;
  ending: string;
}
/** Coordinates in the old quarter stay stable for story events and existing saves. */
export const CITY_IDENTITIES: Record<TownId, CityIdentity> = {
  dawn: {
    size: [30, 20],
    quarters: ['晨露集市', '新叶邻里', '向阳花园'],
    houses: ['麦芽面包房', '种籽手作屋', '晨光绘本馆', '新叶旅人会馆', '花蜜茶舍', '育苗玻璃房'],
    people: ['面包师麦穗', '木匠芽生', '绘本员小叶', '会馆管事晨禾', '茶师蜜芽', '育苗员青芽'],
    craft: ['面团发酵记录', '种籽名牌', '花园故事页'],
    actions: [
      '翻看烤炉旁的温度记录，为面团补好晨间发酵时间。',
      '对照木牌上的叶形，将育苗名牌整理成组。',
      '把遗落的绘本页按花园四季重新排好。',
    ],
    celebration: '新叶野餐会',
    ending: '面包、种籽名牌和绘本都准备好了。大家在花园铺开桌布，邀你和伙伴留下第一张邻里合照。',
  },
  moss: {
    size: [30, 20],
    quarters: ['苔香小集', '林匠街', '萤灯庭园'],
    houses: ['榛果烘焙屋', '藤编工坊', '护林书屋', '巡林会馆', '苔香茶室', '蕨叶温室'],
    people: ['烘焙师榛榛', '藤匠织青', '书屋管理员叶笺', '护林员苔叔', '茶师林雾', '蕨园员青苔'],
    craft: ['榛果配方板', '藤编灯罩', '萤灯巡护册'],
    actions: [
      '读出配方板上磨损的榛果配比，补全烘焙笔记。',
      '顺着藤纹将散开的灯罩扣合，给萤灯留出透气口。',
      '按溪岸、林冠、林缘整理巡护册里的夜间记录。',
    ],
    celebration: '林间萤灯夜',
    ending: '新灯罩挂上了庭园的树梢，巡护册也回到书屋。居民们为归来的巡林员点亮了柔和的萤灯。',
  },
  stone: {
    size: [30, 22],
    quarters: ['矿灯集市', '石刻巷', '层岩纪念园'],
    houses: ['炉石面包铺', '石雕工坊', '山城地质馆', '矿队会馆', '岩泉茶舍', '高山育苗房'],
    people: ['烘焙师岩麦', '石匠刻砚', '地质员层岚', '矿队管事灯叔', '茶师泉砂', '育苗员石苇'],
    craft: ['矿队炉温表', '归途石刻', '岩层标本签'],
    actions: [
      '参照换班时间，补齐供矿队使用的烘焙炉温表。',
      '把磨平的归途指向纹重新描出，让晚班矿工认得回家的路。',
      '按岩层深浅核对三张标本签，保留采集位置。',
    ],
    celebration: '归途矿灯展',
    ending: '矿灯沿着新石刻排成一线。白天采矿的人和夜班归来的人，在纪念园一起分享热面包。',
  },
  harbor: {
    size: [36, 26],
    quarters: ['白帆市集', '船匠街', '潮声滨园'],
    houses: ['海盐烘焙坊', '帆具修造所', '旧航季书馆', '水手会馆', '贝壳茶屋', '滨海育苗室'],
    people: ['面包师盐穗', '帆匠白索', '航史员海笺', '水手长归帆', '茶师贝音', '育苗员沙青'],
    craft: ['海盐面包订单', '破损的风向帆', '旧航季索引'],
    actions: [
      '按返港时刻整理海盐面包订单，让夜航的水手也能领到。',
      '对齐帆布上的旧缝线，给风向帆补上一枚牢固的扣环。',
      '对照港口旧称，将三份航季索引归回正确书架。',
    ],
    celebration: '白帆归港宴',
    ending: '修好的风向帆在海风中展开。码头传来归船的铃声，水手们在潮声滨园为平安归港举杯。',
  },
  volt: {
    size: [40, 28],
    quarters: ['铜光夜市', '机巧街', '回路公园'],
    houses: ['铜炉烘焙坊', '钟表修理铺', '城市电史馆', '夜班会馆', '暖灯茶室', '光合作物房'],
    people: ['烘焙师铜麦', '钟表师齿星', '电史员流笺', '夜班管事照叔', '茶师暖弧', '育苗员光芽'],
    craft: ['节电烘焙表', '停摆的街钟', '公共照明档案'],
    actions: [
      '错开三台烤炉的启动时刻，填好夜市节电烘焙表。',
      '按齿轮上的刻痕校准街钟，让夜班交接听得到准点钟声。',
      '核对公共灯线旧图，把支路标注补回照明档案。',
    ],
    celebration: '铜光不夜集',
    ending: '街钟准时敲响，夜市的灯依次亮起。居民们为下班的人留着茶与面包，公园里满是温暖的铜光。',
  },
  wind: {
    size: [38, 30],
    quarters: ['云邮集市', '风筝巷', '回风台地'],
    houses: ['云麦烘焙坊', '风铃作坊', '候鸟书馆', '山邮会馆', '云影茶舍', '雪绒育苗房'],
    people: ['面包师云麦', '风铃匠铃羽', '鸟类记录员羽笺', '山邮员归云', '茶师云影', '育苗员雪绒'],
    craft: ['高地发酵表', '失声的风铃', '候鸟来信簿'],
    actions: [
      '结合高地气温，替发酵表补上保温时间。',
      '把错位的三枚铃片按长短排好，让微风也能敲出和声。',
      '按候鸟迁徙方向整理来信，留下经过山口的日期。',
    ],
    celebration: '回风听铃会',
    ending: '风铃在台地重新响起，候鸟从屋檐上掠过。山邮员把新信放进会馆，邀请大家听一阵归来的风。',
  },
  furnace: {
    size: [40, 32],
    quarters: ['赤陶市集', '窑火匠街', '暖泉花园'],
    houses: ['余温烘焙坊', '赤陶工坊', '窑火记忆馆', '工匠会馆', '暖泉茶屋', '耐热花温室'],
    people: ['烘焙师余麦', '陶匠赤纹', '记忆馆员火笺', '工匠管事砚火', '茶师泉暖', '育苗员红苇'],
    craft: ['余热烘焙表', '裂纹的茶盏', '老师傅窑记'],
    actions: [
      '沿回温曲线填好烘焙表，把窑炉余热留给面包。',
      '描出茶盏裂纹的走向，将修补位置标给陶匠。',
      '按温度段归整老师傅的窑记，留住每次试烧的结果。',
    ],
    celebration: '余温陶灯节',
    ending: '新烧好的陶灯围住温泉花园。工匠们用修补后的茶盏分享热茶，把一天最后的余温留给邻居。',
  },
  lake: {
    size: [40, 32],
    quarters: ['镜水小集', '水彩街', '睡莲庭园'],
    houses: ['莲香面包房', '水彩装帧坊', '湖岸诗书馆', '渡湖会馆', '涟漪茶室', '睡莲玻璃房'],
    people: ['面包师莲麦', '装帧师水青', '诗书员涟笺', '渡湖管事归舟', '茶师镜雨', '育苗员莲汀'],
    craft: ['莲香食谱页', '散开的写生册', '湖岸旧诗签'],
    actions: [
      '把被水汽模糊的食谱页晾平，补好莲香面包的配方。',
      '对照湖岸线，将散开的写生页装回同一本册子。',
      '按水位标记整理旧诗签，保留每首诗写成的岸边位置。',
    ],
    celebration: '镜湖水彩展',
    ending: '写生册摊在庭园长桌上，诗签挂在睡莲旁。居民们把今天的湖光也画进了共同的画卷。',
  },
  star: {
    size: [44, 34],
    quarters: ['星桥市集', '古纹街', '双衡星园'],
    houses: ['星麦烘焙房', '铜星刻印坊', '双衡公共书馆', '星桥会馆', '星砂茶舍', '夜光植园'],
    people: ['面包师星麦', '刻印师铜芒', '馆员衡笺', '会馆管事星桥', '茶师砂月', '育苗员夜芽'],
    craft: ['双份面包签', '归流铜星印', '公共阅读目录'],
    actions: [
      '将面包预订单分成白班与夜班两份，让两边都能领到热食。',
      '比对铜印上双向纹路，把磨损的归流线描回原位。',
      '给旧目录补上公共借阅标记，让每个人都能找到需要的书。',
    ],
    celebration: '双衡星灯会',
    ending: '铜星印盖在灯会的请柬上。白班与夜班的人们在同一片星光下相聚，共同点亮双衡星园。',
  },
  league: {
    size: [40, 32],
    quarters: ['巡礼市集', '徽章工匠街', '同行纪念园'],
    houses: ['金穗烘焙坊', '徽章拓印坊', '巡礼纪事馆', '同行者会馆', '凯旋茶室', '四季花温室'],
    people: ['面包师金穗', '拓印师印岚', '纪事员途笺', '会馆管事同行', '茶师归盏', '育苗员四季'],
    craft: ['连战补给清单', '空白纪念徽章', '同行者留言册'],
    actions: [
      '按五场连战的休息间隔整理烘焙补给清单。',
      '把八种纹样的拓印位置排好，为纪念徽章留出同行者的名字。',
      '将旅人留言按出发的城镇整理，保留每段不同的道路。',
    ],
    celebration: '同行者纪念展',
    ending:
      '纪念徽章和留言册摆进了花园展柜。人们分享旅途中受过的帮助，每一种走到这里的道路都被认真记下。',
  },
};

export function cityLayout(town: TownId) {
  const [oldWidth, oldHeight] = CITY_IDENTITIES[town].size;
  const width = Math.ceil(oldWidth * 1.75);
  const height = Math.ceil((oldWidth * oldHeight * 3) / width);
  const blockWidth = Math.min(9, Math.floor((width - oldWidth - 7) / 2));
  const eastX = [oldWidth + 2, width - blockWidth - 2];
  const eastY = [3, 13];
  const buildings = CITY_BUILDING_KINDS.map((kind, i) => ({
    kind,
    site: `${town}_${kind}` as CityBuildingSite,
    name: CITY_IDENTITIES[town].houses[i]!,
    person: CITY_IDENTITIES[town].people[i]!,
    x: i < 4 ? eastX[i % 2]! : i === 4 ? 4 : Math.floor(oldWidth * 0.64),
    y: i < 4 ? eastY[Math.floor(i / 2)]! : oldHeight + 3,
    width: i < 4 ? blockWidth : 8,
    height: 4,
  }));
  return {
    oldWidth,
    oldHeight,
    width,
    height,
    buildings,
    boulevard: Math.floor((eastX[0]! + blockWidth + eastX[1]!) / 2),
    gardenX: oldWidth + Math.floor((width - oldWidth) / 2),
    gardenY: oldHeight + Math.floor((height - oldHeight) / 2),
  };
}
export const cityBuildingAt = (map: string, x: number, y: number) =>
  CITY_TOWNS.includes(map as TownId)
    ? cityLayout(map as TownId).buildings.find((b) => b.x === x && b.y === y)
    : undefined;

export const districtFlag = (town: TownId, point: string) => `district_${town}_${point}`;
export const districtQuestId = (town: TownId, task: string) => `${town}_district_${task}`;
export const districtNpcId = (town: TownId, point: string) => `district_${town}_${point}`;

/** Append inhabited quarters, without scaling or replacing the original street grid. */
export function expandCityDistricts(maps: Record<string, GameMap>) {
  for (const town of CITY_TOWNS) {
    const map = maps[town]!;
    const l = cityLayout(town),
      identity = CITY_IDENTITIES[town];
    if (map.rows[0]!.length !== l.oldWidth || map.rows.length !== l.oldHeight)
      throw new Error(`老城区尺寸发生变化，请同步扩建布局：${town}`);
    const cells = Array.from({ length: l.height }, (_, y) =>
      Array.from({ length: l.width }, (_, x) =>
        x < l.oldWidth && y < l.oldHeight
          ? map.rows[y]![x]!
          : x === 0 || y === 0 || x === l.width - 1 || y === l.height - 1
            ? '#'
            : '.',
      ),
    );
    const fill = (x: number, y: number, w: number, h: number, tile: string) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy]![xx] = tile;
    };
    const eastRoad = (y: number) => fill(l.oldWidth, y, l.width - l.oldWidth - 1, 2, ':');
    fill(l.boulevard, 1, 2, l.height - 2, ':');
    for (const y of [9, 19, l.oldHeight + 9]) eastRoad(y);
    fill(1, l.oldHeight + 9, l.width - 2, 2, ':');
    // Connect both quarters to an existing core street; do not cut through houses or water.
    const connect = (start: [number, number]) => {
      const queue: [number, number][] = [start];
      const previous = new Map<string, [number, number] | null>([[start.join(','), null]]);
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i]!;
        if (x < l.oldWidth - 1 && y < l.oldHeight - 1 && cells[y]![x] === ':') {
          let at: [number, number] | null = [x, y];
          while (at) {
            cells[at[1]]![at[0]] = ':';
            at = previous.get(at.join(',')) ?? null;
          }
          return;
        }
        for (const [nx, ny] of [
          [x - 1, y],
          [x, y - 1],
          [x, y + 1],
          [x + 1, y],
        ]) {
          if (
            nx! < 1 ||
            ny! < 1 ||
            nx! >= l.width - 1 ||
            ny! >= l.height - 1 ||
            previous.has(`${nx},${ny}`)
          )
            continue;
          const tile = cells[ny!]![nx!]!;
          const oldRim = nx === l.oldWidth - 1 || ny === l.oldHeight - 1;
          if (!'.:^,='.includes(tile) && !(oldRim && tile === '#')) continue;
          previous.set(`${nx},${ny}`, [x, y]);
          queue.push([nx!, ny!]);
        }
      }
      throw new Error(`新街区未连接老城区：${town}`);
    };
    connect([l.oldWidth, 9]);
    connect([l.oldWidth, 19]);
    connect([Math.floor(l.oldWidth / 2), l.oldHeight + 9]);

    // Keep all old saved return coordinates valid; outer exits move to the expanded rim.
    for (const exit of map.portals) {
      if (exit.x === l.oldWidth - 1) {
        fill(exit.x, exit.y, l.width - exit.x, 1, ':');
        exit.x = l.width - 1;
      }
      if (exit.y === l.oldHeight - 1) {
        // This corridor is reserved before placing buildings below.
        fill(exit.x, exit.y, 1, l.height - exit.y, ':');
        exit.y = l.height - 1;
      }
    }
    for (const building of l.buildings) {
      fill(building.x, building.y, building.width, building.height, 'H');
      const doorX = Math.floor(building.x + building.width / 2);
      const roadY = building.y < l.oldHeight ? (building.y < 10 ? 9 : 19) : l.oldHeight + 9;
      fill(doorX, building.y + building.height, 1, roadY - building.y - building.height + 1, ':');
    }
    const scenery: CityScenery[] = [];
    const prop = (kind: CityScenery['kind'], x: number, y: number, width = 1, height = 1) => {
      if (
        Array.from({ length: height }, (_, dy) =>
          Array.from({ length: width }, (_, dx) => cells[y + dy]?.[x + dx]).join(''),
        )
          .join('')
          .split('')
          .some((t) => t !== '.')
      )
        return;
      fill(x, y, width, height, 'F');
      scenery.push({ kind, x, y, width, height });
    };
    // A loop around the garden and a small canal with two real bridges.
    const gx = l.gardenX,
      gy = l.gardenY;
    fill(gx - 5, gy - 3, 11, 1, ':');
    fill(gx - 5, gy + 3, 11, 1, ':');
    fill(gx - 5, gy - 3, 1, 7, ':');
    fill(gx + 5, gy - 3, 1, 7, ':');
    fill(gx - 3, gy - 1, 7, 2, '~');
    fill(gx - 1, gy - 1, 2, 2, '=');
    fill(gx - 1, gy - 3, 2, 2, ':');
    fill(gx - 1, gy + 1, 2, 3, ':');
    fill(
      gx + 5,
      Math.min(gy + 3, l.oldHeight + 9),
      1,
      Math.abs(l.oldHeight + 9 - (gy + 3)) + 1,
      ':',
    );
    prop('fountain', gx - 3, gy + 1, 2, 2);
    prop('landmark', gx + 2, gy + 1, 2, 2);
    for (const dx of [-4, 3]) prop('bench', gx + dx, gy - 2);
    for (const y of [8, 18]) {
      prop('stall', l.oldWidth + 3, y, 2, 1);
      prop('planter', l.width - 5, y, 2, 1);
    }
    for (let y = 5; y < l.height - 3; y += 6) prop('lamp', l.boulevard - 1, y);
    for (let x = 3; x < l.width - 3; x += 6) prop('planter', x, l.height - 3);
    // Orchard rows and little wooded courts give the extra land a purpose, with open aisles.
    for (let y = l.oldHeight + 13; y < l.height - 4; y += 3)
      for (let x = 4; x < l.oldWidth - 3; x += 4) {
        if (cells[y]![x] === '.' && cells[y + 1]![x] === '.') cells[y]![x] = 'T';
        if (cells[y]![x + 1] === '.') cells[y]![x + 1] = '^';
      }
    for (let y = 22; y < l.oldHeight; y += 3)
      for (const x of [l.oldWidth + 3, l.width - 4]) if (cells[y]![x] === '.') cells[y]![x] = 'T';
    for (const [bx, by] of [
      [l.oldWidth + 2, 11],
      [l.width - 6, 11],
      [2, l.oldHeight + 1],
    ])
      for (let y = by!; y < by! + 2; y++)
        for (let x = bx!; x < bx! + 3; x++) if (cells[y]?.[x] === '.') cells[y]![x] = '^';
    for (let y = 2; y < l.height - 2; y++)
      for (let x = 2; x < l.width - 2; x++) {
        if ((x < l.oldWidth && y < l.oldHeight) || cells[y]![x] !== '.') continue;
        if ((x * 13 + y * 7) % 41 < 2) cells[y]![x] = '^';
      }
    const landmarkNpcs: Npc[] = [
      {
        id: districtNpcId(town, 'market'),
        name: `${identity.quarters[0]}导览牌`,
        x: l.boulevard + 2,
        y: 10,
        role: 'sign',
      },
      {
        id: districtNpcId(town, 'garden'),
        name: `${identity.quarters[2]}记事牌`,
        x: gx + 4,
        y: gy - 3,
        role: 'sign',
      },
      {
        id: districtNpcId(town, 'promenade'),
        name: `${identity.quarters[1]}街史牌`,
        x: 15,
        y: l.oldHeight + 10,
        role: 'sign',
      },
      {
        id: districtNpcId(town, 'festival'),
        name: `${identity.celebration}筹备人`,
        x: gx + 4,
        y: gy + 3,
        role: 'resident',
      },
    ];
    for (const npc of landmarkNpcs) cells[npc.y]![npc.x] = ':';
    // Furnish both the original quarter and the new streets, beside rather than on roads.
    // Keep door approaches, NPC conversations, patrol routes and incoming save positions clear.
    const reserved = [...map.npcs, ...landmarkNpcs, ...map.portals].map((p) => [p.x, p.y]);
    for (const npc of map.npcs) reserved.push(...(npc.patrol ?? []));
    for (const other of Object.values(maps))
      for (const portal of other.portals)
        if (portal.map === town) reserved.push([portal.toX, portal.toY]);
    const placeAmenity = (kind: CityScenery['kind'], x: number, y: number, w = 1, h = 1) => {
      if (x < 2 || y < 2 || x + w > l.width - 2 || y + h > l.height - 2) return false;
      if (
        reserved.some(
          ([rx, ry]) => rx! >= x - 2 && rx! <= x + w + 1 && ry! >= y - 2 && ry! <= y + h + 1,
        )
      )
        return false;
      for (let yy = y - 1; yy <= y + h; yy++)
        for (let xx = x - 1; xx <= x + w; xx++)
          if ('HCSG'.includes(cells[yy]?.[xx] ?? ' ')) return false;
      if (
        Array.from({ length: h }, (_, dy) =>
          Array.from({ length: w }, (_, dx) => cells[y + dy]?.[x + dx]),
        )
          .flat()
          .some((t) => t !== '.')
      )
        return false;
      if (
        scenery.some(
          (p) =>
            Math.abs(p.x - x) + Math.abs(p.y - y) <
            (kind === 'fountain' && p.kind === 'fountain' ? 12 : 4),
        )
      )
        return false;
      prop(kind, x, y, w, h);
      return true;
    };
    // Additional public fountain courts connect to existing streets through clear lawn.
    for (
      let y = 3;
      y < l.height - 4 && scenery.filter((p) => p.kind === 'fountain').length < 3;
      y++
    )
      for (
        let x = 3;
        x < l.width - 4 && scenery.filter((p) => p.kind === 'fountain').length < 3;
        x++
      ) {
        if (cells[y + 2]?.[x] !== ':' || cells[y + 2]?.[x + 1] !== ':') continue;
        if (placeAmenity('fountain', x, y, 2, 2)) {
          placeAmenity('bench', x - 4, y + 1, 2);
          placeAmenity('lamp', x + 5, y + 1);
        }
      }
    for (let y = 3; y < l.height - 3; y++)
      for (let x = 3; x < l.width - 3; x++) {
        const besideRoad = cells[y + 1]?.[x] === ':' || cells[y - 1]?.[x] === ':';
        if (!besideRoad) continue;
        if ((x + y * 3) % 9 === 0) placeAmenity('lamp', x, y);
        else if ((x * 3 + y) % 17 === 0) placeAmenity('bench', x, y, 2);
      }
    map.rows = cells.map((row) => row.join(''));
    map.scenery = scenery;
    map.npcs.push(...landmarkNpcs);
    map.subtitle = `${identity.quarters.join(' · ')}，沿街可进入居民的家与工坊`;
  }
  // Inbound roads land just inside their matching relocated gateway.
  for (const map of Object.values(maps))
    for (const portal of map.portals) {
      if (!CITY_TOWNS.includes(portal.map as TownId)) continue;
      const l = cityLayout(portal.map as TownId);
      if (portal.toX >= l.oldWidth - 2) portal.toX += l.width - l.oldWidth;
      if (portal.toY >= l.oldHeight - 2) portal.toY += l.height - l.oldHeight;
    }
}
