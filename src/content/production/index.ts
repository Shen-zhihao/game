/** City production has its own inventory; none of these IDs are battle items or creatures. */
export const PRODUCTION_MATERIALS = {
  garden_grain: { name: '花园麦穗', source: '育苗小园' },
  garden_herbs: { name: '食用香草', source: '育苗小园' },
  quarry_stone: { name: '平整石料', source: '岩层寻宝' },
  quarry_crystal: { name: '透光矿晶', source: '岩层寻宝' },
  harbor_shells: { name: '拾得空贝壳', source: '白帆垂钓' },
  harbor_glass: { name: '海玻璃', source: '白帆垂钓' },
} as const;
export type ProductionMaterialId = keyof typeof PRODUCTION_MATERIALS;
export type ProductionTown = 'dawn' | 'stone' | 'harbor';
export const PRODUCTION_TOWNS = ['dawn', 'stone', 'harbor'] as const;
export interface ProductionChain {
  town: ProductionTown;
  title: string;
  venue: string;
  source: string;
  activityId: string;
  instructions: string;
  nightOnly: boolean;
  materials: Partial<Record<ProductionMaterialId, number>>;
}
export const PRODUCTION_CHAINS: Record<ProductionTown, ProductionChain> = {
  dawn: {
    town: 'dawn',
    title: '晨芽烘焙',
    venue: '麦芽面包房',
    source: '育苗小园',
    activityId: 'activity_dawn',
    instructions: '前往晨芽镇的种籽手作屋，完成育苗小园，再把麦穗和香草带到本镇烘焙。',
    nightOnly: false,
    materials: { garden_grain: 3, garden_herbs: 3 },
  },
  stone: {
    town: 'stone',
    title: '石脊工坊',
    venue: '石雕工坊',
    source: '岩层寻宝',
    activityId: 'activity_stone',
    instructions: '前往石脊城的工坊，完成岩层寻宝，留下矿晶与石料制作邻里装饰。',
    nightOnly: false,
    materials: { quarry_stone: 3, quarry_crystal: 3 },
  },
  harbor: {
    town: 'harbor',
    title: '白帆夜市',
    venue: '潮声夜市摊',
    source: '白帆垂钓',
    activityId: 'activity_harbor',
    instructions: '在白帆港潮声滨园北岸完成垂钓，整理岸边捞起的空贝壳和海玻璃；夜间回港制作。',
    nightOnly: true,
    materials: { harbor_shells: 3, harbor_glass: 3 },
  },
};
export const PRODUCTION_PRODUCTS = {
  herb_roll: { name: '香草小餐包', description: '麦穗与香草烤成的植物食材点心。' },
  garden_biscuit: { name: '花园香草饼', description: '带着清新草木香的酥脆饼干。' },
  crystal_chime: { name: '矿晶风铃', description: '石料托着透光矿晶，轻轻碰出清亮回声。' },
  stone_marker: { name: '矿纹路牌', description: '嵌上矿晶的石质小路牌，送给街区花园。' },
  shell_mobile: { name: '空贝风饰', description: '捞起的空贝壳与海玻璃组成摇曳挂饰。' },
  tide_lantern: { name: '海玻璃夜灯', description: '海玻璃围出柔光灯罩，空贝壳装点底座。' },
} as const;
export type ProductionProductId = keyof typeof PRODUCTION_PRODUCTS;
export interface ProductionRecipe {
  id: ProductionProductId;
  town: ProductionTown;
  ingredients: Partial<Record<ProductionMaterialId, number>>;
  order: string;
}
export const PRODUCTION_RECIPES: readonly ProductionRecipe[] = [
  {
    id: 'herb_roll',
    town: 'dawn',
    ingredients: { garden_grain: 2, garden_herbs: 1 },
    order: '邻里早餐篮',
  },
  {
    id: 'garden_biscuit',
    town: 'dawn',
    ingredients: { garden_grain: 1, garden_herbs: 2 },
    order: '花园茶点盒',
  },
  {
    id: 'crystal_chime',
    town: 'stone',
    ingredients: { quarry_stone: 2, quarry_crystal: 1 },
    order: '工坊门前风铃',
  },
  {
    id: 'stone_marker',
    town: 'stone',
    ingredients: { quarry_stone: 1, quarry_crystal: 2 },
    order: '花圃认路牌',
  },
  {
    id: 'shell_mobile',
    town: 'harbor',
    ingredients: { harbor_shells: 2, harbor_glass: 1 },
    order: '夜市摊位风饰',
  },
  {
    id: 'tide_lantern',
    town: 'harbor',
    ingredients: { harbor_shells: 1, harbor_glass: 2 },
    order: '滨园夜游灯',
  },
];
export const PRODUCTION_KEEPSAKES = [
  {
    id: 'dawn_keepsake',
    name: '麦穗邻里章',
    description: '累计完成晨芽订单 3 份',
    town: 'dawn',
    orders: 3,
  },
  {
    id: 'stone_keepsake',
    name: '矿晶匠心章',
    description: '累计完成石脊订单 3 份',
    town: 'stone',
    orders: 3,
  },
  {
    id: 'harbor_keepsake',
    name: '潮声夜市章',
    description: '累计完成白帆订单 3 份',
    town: 'harbor',
    orders: 3,
  },
  {
    id: 'recipe_album',
    name: '三城手作图册',
    description: '亲手制作全部 6 种成品',
    town: null,
    orders: 0,
  },
  {
    id: 'neighbor_keepsake',
    name: '街区好邻居纪念章',
    description: '累计完成城市订单 18 份',
    town: null,
    orders: 18,
  },
] as const;
export type ProductionKeepsakeId = (typeof PRODUCTION_KEEPSAKES)[number]['id'];
