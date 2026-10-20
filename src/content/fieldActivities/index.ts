import { FISHING_SITES, FISHING_REGION_NAMES, fishingRegion } from '../fishing';
import type { TownId } from '../../game/model';
import type { HeldItemId } from '../battleTraits';
import { CITY_IDENTITIES, CITY_TOWNS, districtNpcId, districtFlag } from '../cityDistricts';

export type ActivityKind =
  | 'garden'
  | 'pipes'
  | 'excavate'
  | 'fish'
  | 'bells'
  | 'forge'
  | 'mirrors'
  | 'balance'
  | 'slide'
  | 'push';
export interface ActivityDefinition {
  id: string;
  kind: ActivityKind;
  title: string;
  instructions: string;
  hint: string;
  npcId: string;
  goalFlag: string;
  variant: number;
  town?: TownId;
  prerequisite?: string;
  fishingSiteId?: string;
  reward?: { item: HeldItemId; money: number };
}
const CITY_DESIGNS: Record<TownId, [ActivityKind, string, string, string, HeldItemId]> = {
  dawn: [
    'garden',
    '育苗小园',
    '亲手播种、浇水并调整遮阳棚，照顾三盆新苗。',
    '每盆播种后浇水一次，保持半阴；积水可用排水键处理。',
    'held_seed',
  ],
  moss: [
    'pipes',
    '藤编引露架',
    '旋转九块藤编槽，把林间露水从左侧入口引到右下花盆。',
    '藤槽两端必须相接，水路需要经过全部九块；点击藤槽旋转。',
    'held_cleanse',
  ],
  stone: [
    'excavate',
    '岩层寻宝',
    '选择细凿或小锤，在岩壁坍落前完整取出带标记的三处矿晶。',
    '细凿只敲一格；小锤敲十字五格但消耗3点支撑。每处有两层岩壳。',
    'held_shell',
  ],
  harbor: [
    'fish',
    '白帆垂钓',
    '在白帆港河口选择可选果饵后投竿，观察咬钩，再交替收线和放线控制张力。',
    '等待两次会咬钩，第三次仍能提竿；第四次鱼会离开。张力达到7或降到0会脱钩。',
    'held_pearl',
  ],
  volt: [
    'pipes',
    '街灯回路',
    '旋转绝缘接线盘，让电流经过九个节点到达街灯。',
    '电源在左上格西侧，灯线在右下格东侧；断口相接才会亮起。',
    'held_lens',
  ],
  wind: [
    'bells',
    '回风调铃',
    '观察铃片音高，再选中两枚铃片交换位置，将四枚按音高排列。',
    '从左至右按低音到高音排列：1、2、3、4。点击两枚不同铃片即可交换。',
    'held_boots',
  ],
  furnace: [
    'forge',
    '余温锻造',
    '用添火和通风调节温度，达到本次标记温度时落锤，完成三次锻打。',
    '添火升温2格，通风降温1格；每次锻打后降温2格。温度超过7会损坏工件。',
    'held_charcoal',
  ],
  lake: [
    'mirrors',
    '湖光反射台',
    '转动三块反射镜，把左侧入射的光送进左下方的莲花灯。',
    '斜线镜把水平光转为垂直光。光路每次旋转都会更新，可直接观察断点。',
    'held_scope',
  ],
  star: [
    'balance',
    '双衡星盘',
    '将四枚星砝码分到两端，使两端各达到5点星重。',
    '点击砝码会依次放到左盘、右盘、桌面。1与4、2与3可以平衡。',
    'held_leftovers',
  ],
  league: [
    'slide',
    '巡礼拼图',
    '移动空格旁的徽章拓片，将八枚拓片按巡礼编号排好。',
    '目标为第一行1、2、3，第二行4、5、6，第三行7、8、空格。可随时重置本局。',
    'held_band',
  ],
};
export const CITY_ACTIVITIES: ActivityDefinition[] = CITY_TOWNS.map((town, variant) => {
  const [kind, title, instructions, hint, item] = CITY_DESIGNS[town];
  return {
    id: `activity_${town}`,
    town,
    kind,
    title,
    instructions,
    hint,
    npcId: districtNpcId(town, town === 'harbor' ? 'fishing' : 'craft_workshop'),
    goalFlag: `activity_${town}_done`,
    variant,
    reward: { item, money: 180 },
    ...(town === 'harbor' ? { fishingSiteId: 'river_delta' } : {}),
  };
});
const GYM_DESIGNS: [string, ActivityKind, string, string][] = [
  ['gym', 'pipes', '藤门引露槽', 'gymScout'],
  ['rock', 'push', '配重石室', 'rockScout'],
  ['water', 'pipes', '浮桥水路', 'waterScout'],
  ['electric', 'pipes', '检修回路', 'electricScout'],
  ['wind', 'bells', '风铃音阶', 'windScout'],
  ['fire', 'forge', '炉温阀台', 'fireScout'],
  ['psychic', 'mirrors', '镜光通廊', 'psychicScout'],
  ['star', 'balance', '双衡门锁', 'starScout'],
];
export const GYM_ACTIVITIES: ActivityDefinition[] = GYM_DESIGNS.flatMap(
  ([prefix, kind, title, scout], i) =>
    ['One', 'Two'].map((suffix, stage) => ({
      id: `puzzle_${prefix}_${stage + 1}`,
      kind,
      title: `${title} · ${stage + 1}`,
      instructions:
        kind === 'push'
          ? '用方向键移动，把配重石推到金色底座；石头只能推动，不能拉回。'
          : `调整${title}，让机关真正接通，随后地图上的通道会打开。`,
      hint:
        kind === 'push'
          ? '先绕到石头下方，将它向上推，再绕到另一侧横推入座。走入死角可重置。'
          : kind === 'pipes'
            ? '入口在左上西侧，出口在右下东侧；连通全部九格。'
            : kind === 'bells'
              ? '依次选两枚铃片交换，按1、2、3、4排列。'
              : kind === 'forge'
                ? '添火+2，通风−1，在金色温度标记处落锤。'
                : kind === 'mirrors'
                  ? '旋转三块斜镜，把光线引向左下方接收灯。'
                  : '每枚砝码可以在桌面、左盘、右盘之间移动；两盘达到标记星重。',
      npcId: `${prefix}Switch${suffix}`,
      goalFlag: `${prefix}Switch${suffix}`,
      variant: i * 2 + stage,
      ...(stage ? { prerequisite: scout } : {}),
    })),
);
export const FISHING_ACTIVITIES: ActivityDefinition[] = FISHING_SITES.map((site) => ({
  id: `fishing_${site.id}`,
  kind: 'fish',
  title: `${FISHING_REGION_NAMES[fishingRegion(site.id)]}垂钓 · ${site.name}`,
  instructions: '选择果饵后投竿，观察咬钩，再交替收线与放线。收线成功后仍须在遭遇战中投球捕捉。',
  hint: '观察两次后提竿；第四次观察会错过咬钩。张力保持在1至6，收线四次即可靠岸。',
  npcId: '',
  goalFlag: `fishing_${site.id}_done`,
  variant: 0,
  fishingSiteId: site.id,
}));
export const FIELD_ACTIVITIES = Object.fromEntries(
  [...CITY_ACTIVITIES, ...GYM_ACTIVITIES, ...FISHING_ACTIVITIES].map((d) => [d.id, d]),
) as Record<string, ActivityDefinition>;
export const ACTIVITY_FLAGS = [...CITY_ACTIVITIES, ...FISHING_ACTIVITIES].map((d) => d.goalFlag);
export const activityQuest = (d: ActivityDefinition) => ({
  id: `${d.id}_quest`,
  name: d.title,
  client: d.town === 'harbor' ? '垂钓员白汀' : CITY_IDENTITIES[d.town!].people[1],
  story: `${d.town === 'harbor' ? '到潮声滨园北岸，与垂钓员白汀交谈' : `进入${CITY_IDENTITIES[d.town!].houses[1]}，调查屋内工作台`}，完成「${d.title}」。${d.instructions}首次完成还可在活动中领取专属携带道具。`,
  condition: { kind: 'flag' as const, flag: d.goalFlag, label: `完成${d.title}` },
  reward: { money: 120, merit: 2, items: {} as Record<string, number> },
});
export const activityCraftFlag = (town: TownId) => districtFlag(town, 'craft_workshop');
