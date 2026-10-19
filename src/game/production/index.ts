import { cityFor, servicesUnlocked } from '../../content/cities';
import {
  ADVANCED_PRODUCTION_RECIPES,
  BASIC_PRODUCTION_RECIPES,
  PRODUCTION_CHAINS,
  PRODUCTION_KEEPSAKES,
  PRODUCTION_MATERIALS,
  PRODUCTION_PRODUCTS,
  PRODUCTION_RECIPES,
  PRODUCTION_TOWNS,
  type ProductionKeepsakeId,
  type ProductionMaterialId,
  type ProductionProductId,
  type ProductionRecipe,
  type ProductionTown,
} from '../../content/production';
import { calendarDetails, calendarFor, dayPeriodFor, type DayPeriod } from '../calendar';
import {
  PRODUCTION_DECORATIONS,
  PRODUCTION_STORIES,
  type ProductionDecorationId,
} from '../../content/productionRewards';
import type { GameState } from '../model';

export const PRODUCTION_STOCK_LIMIT = 999;
export const PRODUCTION_HISTORY_LIMIT = 999999;
export interface ProductionClaim {
  /** The calendar day is the claim key, saved with the award in one reducer checkpoint. */
  day: number;
  count: number;
}
export interface ProductionState {
  materials: Partial<Record<ProductionMaterialId, number>>;
  products: Partial<Record<ProductionProductId, number>>;
  crafted: Partial<Record<ProductionProductId, number>>;
  activityClaims: Record<string, ProductionClaim>;
  orders: Partial<Record<ProductionProductId, ProductionClaim>>;
  collection: { stamps: number; keepsakes: ProductionKeepsakeId[] };
  /** Only player choices and an actual garden visit need saving; unlocks use the order ledger. */
  presentation?: {
    decorations: Partial<Record<ProductionTown, ProductionDecorationId>>;
    viewedResults: ProductionTown[];
  };
}
export type ProductionAction =
  | { kind: 'craft'; recipeId: string }
  | { kind: 'order'; recipeId: string }
  | { kind: 'decorate'; town: ProductionTown; decorationId: ProductionDecorationId | null };

export function createProduction(): ProductionState {
  return {
    materials: {},
    products: {},
    crafted: {},
    activityClaims: {},
    orders: {},
    collection: { stamps: 0, keepsakes: [] },
  };
}

export function productionCollection(state: ProductionState): ProductionState['collection'] {
  const stamps = PRODUCTION_RECIPES.reduce(
    (sum, recipe) => sum + (state.orders[recipe.id]?.count ?? 0),
    0,
  );
  const keepsakes = PRODUCTION_KEEPSAKES.filter((keepsake) => {
    if (keepsake.id === 'recipe_album')
      return BASIC_PRODUCTION_RECIPES.every((recipe) => (state.crafted[recipe.id] ?? 0) > 0);
    const orders = PRODUCTION_RECIPES.filter(
      (recipe) => !keepsake.town || recipe.town === keepsake.town,
    ).reduce((sum, recipe) => sum + (state.orders[recipe.id]?.count ?? 0), 0);
    return orders >= keepsake.orders;
  }).map((keepsake) => keepsake.id);
  return { stamps, keepsakes };
}

/** Called only by the successful activity transition, never by opening or claiming first rewards. */
export function awardProductionMaterials(game: GameState, activityId: string): string {
  const chain = PRODUCTION_TOWNS.map((town) => PRODUCTION_CHAINS[town]).find(
    (entry) => entry.activityId === activityId,
  );
  if (!chain) return '';
  const day = calendarFor(game).day;
  const state = (game.production ??= createProduction());
  const claim = state.activityClaims[activityId];
  if (claim && claim.day >= day) return '今日手作材料已领取，明天可再次完成活动补充。';
  if ((claim?.count ?? 0) >= PRODUCTION_HISTORY_LIMIT)
    return '手作材料累计记录已满；本次活动记录仍会保留。';
  const materials = Object.entries(chain.materials) as [ProductionMaterialId, number][];
  if (materials.some(([id, count]) => (state.materials[id] ?? 0) + count > PRODUCTION_STOCK_LIMIT))
    return '手作材料仓已满；先制作成品，再重玩即可领取今日材料。';
  // Claim first, then grant fixed materials. Both are persisted in the same atomic game checkpoint.
  state.activityClaims[activityId] = { day, count: (claim?.count ?? 0) + 1 };
  for (const [id, count] of materials) state.materials[id] = (state.materials[id] ?? 0) + count;
  return `今日手作材料：${materials.map(([id, count]) => `${PRODUCTION_MATERIALS[id].name}×${count}`).join('、')}。`;
}

/** Unlocks are derived from permanent ledgers, so old saves gain no invented observations. */
export function advancedRecipeProgress(game: GameState, town: ProductionTown) {
  const observed = game.ecology?.[town];
  const orders = BASIC_PRODUCTION_RECIPES.filter((recipe) => recipe.town === town).reduce(
    (sum, recipe) => sum + (game.production?.orders[recipe.id]?.count ?? 0),
    0,
  );
  const requiredOrders = 3;
  const missing = [
    orders < requiredOrders ? `本城基础订单 ${orders}/${requiredOrders}` : '',
    !observed?.day ? '白天野外观察 0/1' : '',
    !observed?.night ? '夜晚野外观察 0/1' : '',
  ].filter(Boolean);
  return {
    orders,
    requiredOrders,
    observedDay: !!observed?.day,
    observedNight: !!observed?.night,
    unlocked: !missing.length,
    reason: missing.length ? `进阶配方未解锁：${missing.join('；')}。` : '',
  };
}

export type ProductionGoal =
  DayPeriod | 'order' | 'materials' | 'craft' | 'delivery' | 'city_result' | 'complete';

/** Prefer an observation that is possible now; crafting and delivery reuse permanent ledgers. */
export function productionNextGoal(game: GameState, town: ProductionTown): ProductionGoal {
  const progress = advancedRecipeProgress(game, town);
  const period = dayPeriodFor(game);
  const missingDay = !progress.observedDay;
  const missingNight = !progress.observedNight;
  if (period === 'day' && missingDay) return 'day';
  if (period === 'night' && missingNight) return 'night';
  if (missingDay) return 'day';
  if (missingNight) return 'night';
  if (progress.orders < progress.requiredOrders) return 'order';
  const recipe = ADVANCED_PRODUCTION_RECIPES.find((entry) => entry.town === town)!;
  if ((game.production?.orders[recipe.id]?.count ?? 0) > 0)
    return game.production?.presentation?.viewedResults.includes(town) ? 'complete' : 'city_result';
  if ((game.production?.products[recipe.id] ?? 0) > 0) return 'delivery';
  return Object.entries(recipe.ingredients).every(
    ([id, count]) => (game.production?.materials[id as ProductionMaterialId] ?? 0) >= count,
  )
    ? 'craft'
    : 'materials';
}

/** Call only when the player reads the garden guide after the first advanced delivery. */
export function viewProductionResult(game: GameState, town: ProductionTown): void {
  const recipe = ADVANCED_PRODUCTION_RECIPES.find((entry) => entry.town === town);
  const state = game.production;
  if (!recipe || !state || !(state.orders[recipe.id]?.count ?? 0)) return;
  const presentation = (state.presentation ??= { decorations: {}, viewedResults: [] });
  if (!presentation.viewedResults.includes(town)) presentation.viewedResults.push(town);
}

export function productionDecorationReason(game: GameState): string {
  return !servicesUnlocked(game)
    ? '先完成捕捉入门，再来布置城市花园。'
    : game.battle ||
        game.dialogue ||
        game.pending.length ||
        game.activities?.active ||
        game.challenge?.active ||
        game.league?.active
      ? '请先结束当前活动、对话或战斗。'
      : '';
}

/** Called around an actual ledger mutation, not menu reads or save loading. */
export function advancedRecipeUnlockNotice(
  game: GameState,
  town: ProductionTown,
  previouslyUnlocked: boolean,
): string {
  if (previouslyUnlocked || !advancedRecipeProgress(game, town).unlocked) return '';
  const recipes = ADVANCED_PRODUCTION_RECIPES.filter((recipe) => recipe.town === town);
  return `进阶配方已解锁：${recipes.map((recipe) => PRODUCTION_PRODUCTS[recipe.id].name).join('、')}。可到${PRODUCTION_CHAINS[town].venue}制作。`;
}

export function productionAvailability(game: GameState, recipe: ProductionRecipe) {
  const state = game.production;
  const chain = PRODUCTION_CHAINS[recipe.town];
  const closed = chain.nightOnly && !calendarDetails(game).night;
  const local = cityFor(game.player.map)?.map === recipe.town;
  const busy =
    !!game.battle ||
    !!game.dialogue ||
    !!game.pending.length ||
    !!game.activities?.active ||
    !!game.challenge?.active ||
    !!game.league?.active;
  const unlockReason = recipe.advanced ? advancedRecipeProgress(game, recipe.town).reason : '';
  const reason = !servicesUnlocked(game)
    ? '先完成捕捉入门，再来参加城市手作。'
    : busy
      ? '请先结束当前活动、对话或战斗。'
      : !local
        ? `请到${chain.venue}所在城镇办理。`
        : closed
          ? '夜市 18:00 至次日 06:00 营业；材料和订单不会过期。'
          : unlockReason;
  const materialsReady = Object.entries(recipe.ingredients).every(
    ([id, count]) => (state?.materials[id as ProductionMaterialId] ?? 0) >= count,
  );
  const craftFull =
    (state?.products[recipe.id] ?? 0) >= PRODUCTION_STOCK_LIMIT ||
    (state?.crafted[recipe.id] ?? 0) >= PRODUCTION_HISTORY_LIMIT;
  const claim = state?.orders[recipe.id];
  const orderedToday = !!claim && claim.day >= calendarFor(game).day;
  const orderFull = (claim?.count ?? 0) >= PRODUCTION_HISTORY_LIMIT;
  const productReady = (state?.products[recipe.id] ?? 0) > 0;
  return {
    reason,
    unlockReason,
    canCraft: !reason && materialsReady && !craftFull,
    canOrder: !reason && productReady && !orderedToday && !orderFull,
    craftReason:
      reason ||
      (craftFull ? '成品仓或制作记录已满。' : !materialsReady ? '材料不足，先完成本城活动。' : ''),
    orderReason:
      reason ||
      (orderedToday
        ? '今日订单已交付，明天会再次开放。'
        : orderFull
          ? '订单累计记录已满。'
          : !productReady
            ? '先制作一份成品。'
            : ''),
    orderedToday,
  };
}

export function applyProduction(game: GameState, action: ProductionAction): void {
  if (action.kind === 'decorate') {
    const decoration = PRODUCTION_DECORATIONS.find((entry) => entry.id === action.decorationId);
    if (!PRODUCTION_TOWNS.includes(action.town) || (action.decorationId !== null && !decoration)) {
      game.notice = '这份城市装饰不存在。';
      return;
    }
    const reason = productionDecorationReason(game);
    if (reason) {
      game.notice = reason;
      return;
    }
    const state = game.production;
    const stamps = state ? productionCollection(state).stamps : 0;
    if (decoration && stamps < decoration.stamps) {
      game.notice = `累计 ${decoration.stamps} 枚手作印花后解锁${decoration.name}，印花不会被消耗。`;
      return;
    }
    if (!state) {
      game.notice = '当前没有布置额外装饰。';
      return;
    }
    const presentation = (state.presentation ??= { decorations: {}, viewedResults: [] });
    if (decoration) presentation.decorations[action.town] = decoration.id;
    else delete presentation.decorations[action.town];
    game.notice = decoration
      ? `已为${PRODUCTION_CHAINS[action.town].title}所在花园布置${decoration.name}。印花不消耗，首次交付纪念仍保留。`
      : '已收起本城额外装饰；首次交付纪念仍保留，可随时重新布置。';
    return;
  }
  const recipe = PRODUCTION_RECIPES.find((entry) => entry.id === action.recipeId);
  if (!recipe || !['craft', 'order'].includes(action.kind)) {
    game.notice = '这份手作配方不存在。';
    return;
  }
  const available = productionAvailability(game, recipe);
  if (!(action.kind === 'craft' ? available.canCraft : available.canOrder)) {
    game.notice = action.kind === 'craft' ? available.craftReason : available.orderReason;
    return;
  }
  const state = (game.production ??= createProduction());
  const previouslyUnlocked = advancedRecipeProgress(game, recipe.town).unlocked;
  const previousOrders = state.orders[recipe.id]?.count ?? 0;
  const name = PRODUCTION_PRODUCTS[recipe.id].name;
  const previousKeepsakes = state.collection.keepsakes;
  const previousStamps = state.collection.stamps;
  if (action.kind === 'craft') {
    for (const [id, count] of Object.entries(recipe.ingredients) as [
      ProductionMaterialId,
      number,
    ][])
      state.materials[id] = (state.materials[id] ?? 0) - count;
    state.products[recipe.id] = (state.products[recipe.id] ?? 0) + 1;
    state.crafted[recipe.id] = (state.crafted[recipe.id] ?? 0) + 1;
    game.notice = `制作完成：${name}×1，已放入手作成品仓。`;
  } else {
    // Consume exactly one product and save the daily order claim before any collection reward.
    state.orders[recipe.id] = {
      day: calendarFor(game).day,
      count: previousOrders + 1,
    };
    state.products[recipe.id] = (state.products[recipe.id] ?? 0) - 1;
    game.notice = `已交付「${recipe.order}」：${name}×1，获得手作印花×1。明天仍可来交付。`;
    if (recipe.advanced && previousOrders === 0) {
      const display = {
        dawn: '晨芽镇花园已布置好野餐',
        stone: '石脊城已摆放昼夜矿晶灯',
        harbor: '白帆港已展出潮汐星光画',
      }[recipe.town];
      game.notice += ` ${display}，回到街区看看你的手作吧。`;
    }
  }
  state.collection = productionCollection(state);
  const added = PRODUCTION_KEEPSAKES.filter(
    (keepsake) =>
      state.collection.keepsakes.includes(keepsake.id) && !previousKeepsakes.includes(keepsake.id),
  );
  if (added.length)
    game.notice += ` 新收藏：${added.map((keepsake) => keepsake.name).join('、')}。`;
  const rewards = [...PRODUCTION_DECORATIONS, ...PRODUCTION_STORIES].filter(
    (reward) => reward.stamps > previousStamps && reward.stamps <= state.collection.stamps,
  );
  if (rewards.length)
    game.notice += ` 印花长期奖励已解锁：${rewards.map((reward) => ('name' in reward ? reward.name : reward.title)).join('、')}。到手作菜单选择装饰、阅读故事，无需扣除印花。`;
  if (action.kind === 'order' && !recipe.advanced) {
    const unlocked = advancedRecipeUnlockNotice(game, recipe.town, previouslyUnlocked);
    if (unlocked) game.notice += ` ${unlocked}`;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, max: number, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
function validCounts(value: unknown, keys: readonly string[], max: number) {
  return (
    isRecord(value) &&
    Object.entries(value).every(([key, count]) => keys.includes(key) && integer(count, max))
  );
}
function validClaims(value: unknown, keys: readonly string[], day: number) {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, claim]) =>
        keys.includes(key) &&
        isRecord(claim) &&
        exactKeys(claim, ['day', 'count']) &&
        integer(claim.day, day, 1) &&
        integer(claim.count, Math.min(PRODUCTION_HISTORY_LIMIT, claim.day), 1),
    )
  );
}

/** Strictly validate the independent ledger without weakening any existing battle-item checks. */
export function validateProduction(value: unknown, game: GameState): value is ProductionState {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      'materials',
      'products',
      'crafted',
      'activityClaims',
      'orders',
      'collection',
      ...(Object.hasOwn(value, 'presentation') ? ['presentation'] : []),
    ])
  )
    return false;
  const materialIds = Object.keys(PRODUCTION_MATERIALS);
  const productIds = Object.keys(PRODUCTION_PRODUCTS);
  const day = calendarFor(game).day;
  if (
    !validCounts(value.materials, materialIds, PRODUCTION_STOCK_LIMIT) ||
    !validCounts(value.products, productIds, PRODUCTION_STOCK_LIMIT) ||
    !validCounts(value.crafted, productIds, PRODUCTION_HISTORY_LIMIT) ||
    !validClaims(
      value.activityClaims,
      PRODUCTION_TOWNS.map((town) => PRODUCTION_CHAINS[town].activityId),
      day,
    ) ||
    !validClaims(value.orders, productIds, day) ||
    !isRecord(value.collection) ||
    !exactKeys(value.collection, ['stamps', 'keepsakes']) ||
    !integer(value.collection.stamps, PRODUCTION_HISTORY_LIMIT * productIds.length) ||
    !Array.isArray(value.collection.keepsakes) ||
    value.collection.keepsakes.some(
      (id) => typeof id !== 'string' || !PRODUCTION_KEEPSAKES.some((entry) => entry.id === id),
    ) ||
    new Set(value.collection.keepsakes).size !== value.collection.keepsakes.length
  )
    return false;
  const state = value as unknown as ProductionState;
  if (Object.hasOwn(value, 'presentation')) {
    const presentation = value.presentation;
    if (
      !isRecord(presentation) ||
      !exactKeys(presentation, ['decorations', 'viewedResults']) ||
      !isRecord(presentation.decorations) ||
      Object.entries(presentation.decorations).some(
        ([town, id]) =>
          !PRODUCTION_TOWNS.includes(town as ProductionTown) ||
          !PRODUCTION_DECORATIONS.some(
            (reward) => reward.id === id && state.collection.stamps >= reward.stamps,
          ),
      ) ||
      !Array.isArray(presentation.viewedResults) ||
      new Set(presentation.viewedResults).size !== presentation.viewedResults.length ||
      presentation.viewedResults.some(
        (town) =>
          !ADVANCED_PRODUCTION_RECIPES.some(
            (recipe) => recipe.town === town && (state.orders[recipe.id]?.count ?? 0) > 0,
          ),
      )
    )
      return false;
  }
  if (Object.values(state.activityClaims).length && !servicesUnlocked(game)) return false;
  for (const town of PRODUCTION_TOWNS) {
    const chain = PRODUCTION_CHAINS[town];
    const claims = state.activityClaims[chain.activityId]?.count ?? 0;
    if (claims > (game.activities?.records[chain.activityId]?.completions ?? 0)) return false;
    for (const [id, amount] of Object.entries(chain.materials) as [
      ProductionMaterialId,
      number,
    ][]) {
      const used = PRODUCTION_RECIPES.reduce(
        (sum, recipe) => sum + (state.crafted[recipe.id] ?? 0) * (recipe.ingredients[id] ?? 0),
        0,
      );
      if ((state.materials[id] ?? 0) !== claims * amount - used) return false;
    }
  }
  for (const recipe of PRODUCTION_RECIPES) {
    if (
      recipe.advanced &&
      (state.crafted[recipe.id] ?? 0) > 0 &&
      !advancedRecipeProgress(game, recipe.town).unlocked
    )
      return false;
    if (
      (state.products[recipe.id] ?? 0) !==
      (state.crafted[recipe.id] ?? 0) - (state.orders[recipe.id]?.count ?? 0)
    )
      return false;
  }
  const expected = productionCollection(state);
  return (
    state.collection.stamps === expected.stamps &&
    state.collection.keepsakes.length === expected.keepsakes.length &&
    expected.keepsakes.every((id) => state.collection.keepsakes.includes(id))
  );
}
