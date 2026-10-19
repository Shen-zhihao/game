import { CITY_IDENTITIES } from '../cityDistricts';
import type { ProductionTown } from '../production';

/** Lifetime stamps reveal these optional keepsakes; choosing one never spends stamps. */
export const PRODUCTION_DECORATIONS = [
  {
    id: 'flower_box',
    name: '邻里花箱',
    description: '木箱里盛着居民一起照料的小花，可摆在晨芽、石脊或白帆的花园。',
    stamps: 18,
  },
  {
    id: 'pennant',
    name: '手作彩旗',
    description: '麦穗、矿晶与海浪纹样串成彩旗，把三城的手艺带到你选择的花园。',
    stamps: 30,
  },
  {
    id: 'lantern_cluster',
    name: '暖光灯串',
    description: '几盏柔光小灯围成一簇，为你选择的街区花园留下一处温暖亮色。',
    stamps: 45,
  },
] as const;
export type ProductionDecorationId = (typeof PRODUCTION_DECORATIONS)[number]['id'];

/** A finite story collection, unlocked by the same permanent stamp ledger as decorations. */
export const PRODUCTION_STORIES = [
  {
    id: 'dawn_shared_breakfast',
    town: 'dawn',
    stamps: 18,
    title: '多留一只餐包',
    speaker: CITY_IDENTITIES.dawn.people[0],
    body: '麦穗原先总把最后一只餐包留在柜台，等忙完的人来取。后来，育苗员带来一小把香草，木匠送来一块垫篮的木板，餐包旁渐渐有了花和留言。麦穗笑着说：“你送来的不只是订单。现在大家经过这里，都会问一句，还有谁没吃早饭？”',
  },
  {
    id: 'stone_quiet_chime',
    town: 'stone',
    stamps: 30,
    title: '风铃里的空隙',
    speaker: CITY_IDENTITIES.stone.people[1],
    body: '刻砚试过把矿晶风铃串得很密，声音却挤成一团。一天，他看见归来的矿工坐在层岩纪念园里，谁也没急着说话，便把晶片之间的距离放宽了一点。新的铃声一声接着一声。他把这次修改记在工坊墙上：“好手艺，也要给邻居留一点安静。”',
  },
  {
    id: 'harbor_returning_light',
    town: 'harbor',
    stamps: 45,
    title: '灯下的新一页',
    speaker: CITY_IDENTITIES.harbor.people[2],
    body: '海笺整理旧航季索引时，发现一页空白的返港记录。那晚，他带着纸笔坐到潮声滨园，把夜市收摊的轻响、海玻璃映出的灯色和水手们分面包的笑声逐一写下。“旧书馆不只收藏很久以前的事，”他说，“你和邻居一起做出的这些小东西，也是白帆港值得留下的一页。”',
  },
] as const satisfies readonly {
  id: string;
  town: ProductionTown;
  stamps: number;
  title: string;
  speaker: string;
  body: string;
}[];
