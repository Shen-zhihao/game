import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { SPECIES } from '../../content/catalog';
import { MAPS } from '../../content/world';
import { cityFor } from '../../content/cities';
import { CITY_IDENTITIES } from '../../content/cityDistricts';
import { PRODUCTION_DECORATIONS, PRODUCTION_STORIES } from '../../content/productionRewards';
import {
  ADVANCED_PRODUCTION_RECIPES,
  BASIC_PRODUCTION_RECIPES,
  PRODUCTION_CHAINS,
  PRODUCTION_KEEPSAKES,
  PRODUCTION_MATERIALS,
  PRODUCTION_PRODUCTS,
  PRODUCTION_RECIPES,
  PRODUCTION_TOWNS,
  type ProductionMaterialId,
  type ProductionTown,
} from '../../content/production';
import { calendarDetails, calendarFor, restBlockedReason } from '../../game/calendar';
import { observationProgress } from '../../game/ecology';
import type { Command, GameState, MapId } from '../../game/model';
import {
  advancedRecipeProgress,
  productionAvailability,
  productionDecorationReason,
  productionNextGoal,
} from '../../game/production';

export function ProductionMenu({
  game,
  dispatch,
  facilityTown,
  onOpenRegion,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  facilityTown?: ProductionTown;
  onOpenRegion?: (map: MapId) => void;
}) {
  const here = cityFor(game.player.map)?.map;
  const [selectedTown, setSelected] = useState<ProductionTown>(
    facilityTown ?? PRODUCTION_TOWNS.find((town) => town === here) ?? 'dawn',
  );
  const selected = facilityTown ?? selectedTown;
  const chain = PRODUCTION_CHAINS[selected];
  const state = game.production;
  const calendar = calendarDetails(game);
  const observation = observationProgress(game, selected);
  const progress = advancedRecipeProgress(game, selected);
  const nextGoal = productionNextGoal(game, selected);
  const advancedRecipe = ADVANCED_PRODUCTION_RECIPES.find((recipe) => recipe.town === selected)!;
  const advancedProduct = PRODUCTION_PRODUCTS[advancedRecipe.id];
  const advancedAvailability = productionAvailability(game, advancedRecipe);
  const gardenName = CITY_IDENTITIES[selected].quarters[2];
  const goalTitles = {
    materials: `下一步：备齐${advancedProduct.name}的材料`,
    craft: `下一步：制作${advancedProduct.name}`,
    delivery: `下一步：首次交付${advancedProduct.name}`,
    city_result: `下一步：到${gardenName}查看城市成果`,
    complete: '本城进阶手作目标已完成',
  };
  const goalDetails = {
    materials: `完成${chain.source}补充材料。还需：${Object.entries(advancedRecipe.ingredients)
      .filter(([id, count]) => (state?.materials[id as ProductionMaterialId] ?? 0) < count)
      .map(
        ([id, count]) =>
          `${PRODUCTION_MATERIALS[id as ProductionMaterialId].name} ×${count - (state?.materials[id as ProductionMaterialId] ?? 0)}`,
      )
      .join('、')}。`,
    craft: `材料已备齐，在${chain.venue}制作进阶成品。${advancedAvailability.craftReason}`,
    delivery: `成品已放入手作仓，在${chain.venue}交付「${advancedRecipe.order}」。${advancedAvailability.orderReason}`,
    city_result: `首次交付已完成，手作已留在${gardenName}的长椅旁。回到街区，阅读花园记事牌即可完成追踪；只打开地图不会记为已查看。`,
    complete: `你已亲自查看${gardenName}的手作成果。可继续交付每日订单，累计印花解锁可选装饰和居民故事。`,
  };
  const stamps = state?.collection.stamps ?? 0;
  const selectedDecoration = state?.presentation?.decorations[selected];
  const nextReward = PRODUCTION_DECORATIONS.find((reward) => reward.stamps > stamps);
  const story = PRODUCTION_STORIES.find((entry) => entry.town === selected)!;
  const decorationBlock = productionDecorationReason(game);
  const observationGoal = nextGoal === 'day' || nextGoal === 'night';
  const goalMap = observationGoal
    ? observation.maps.includes(game.player.map)
      ? game.player.map
      : (observation.maps.find((map) => map !== selected) ?? observation.maps[0]!)
    : selected;
  const goalPeriod = nextGoal === 'night' ? '夜晚' : '白天';
  const periodReady = observationGoal && (nextGoal === 'night') === calendar.night;
  const collectedToday =
    (state?.activityClaims[chain.activityId]?.day ?? 0) >= calendarFor(game).day;
  const morningBlock = restBlockedReason(game, 'morning');
  const nightBlock = restBlockedReason(game, 'night');
  const made = BASIC_PRODUCTION_RECIPES.filter(
    (recipe) => (state?.crafted[recipe.id] ?? 0) > 0,
  ).length;
  const advancedMade = ADVANCED_PRODUCTION_RECIPES.filter(
    (recipe) => (state?.crafted[recipe.id] ?? 0) > 0,
  ).length;
  const advancedDelivered = ADVANCED_PRODUCTION_RECIPES.filter(
    (recipe) => (state?.orders[recipe.id]?.count ?? 0) > 0,
  ).length;
  return (
    <ScrollView testID="production-menu" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
      <View style={{ gap: 4 }}>
        <Label style={{ fontSize: 22, fontWeight: '800' }}>
          {facilityTown ? chain.venue : '城市手作与夜市'}
        </Label>
        <Label muted>活动采集 → 制作成品 → 交付订单 → 收藏纪念章</Label>
        <Label muted style={{ fontSize: 12 }}>
          手作材料、成品与印花独立保存，不消耗伙伴，不改变战斗背包或旅费。
        </Label>
      </View>
      <Panel style={{ padding: 12, gap: 8 }} testID="production-calendar">
        <Label style={{ fontWeight: '800' }}>
          {calendar.date} · {calendar.clock} · {calendar.night ? '夜晚' : '白天'}
        </Label>
        <View style={[styles.wrap, { gap: 8 }]}>
          <Button
            small
            testID="production-rest-morning"
            disabled={!!morningBlock}
            onPress={() => dispatch({ kind: 'rest', target: 'morning' })}
          >
            休息到清晨
          </Button>
          <Button
            small
            testID="production-rest-night"
            disabled={!!nightBlock}
            onPress={() => dispatch({ kind: 'rest', target: 'night' })}
          >
            休息到夜晚
          </Button>
        </View>
        <Label muted style={{ fontSize: 12 }}>
          休息推进世界日期与时间，不恢复伙伴体力，不增加游玩时长。夜市每天 18:00 至次日 06:00 开放。
        </Label>
        {!!(morningBlock || nightBlock) && (
          <Label muted style={{ fontSize: 12 }}>
            {morningBlock || nightBlock}
          </Label>
        )}
      </Panel>
      {!facilityTown && (
        <View style={[styles.wrap, { gap: 6 }]}>
          {PRODUCTION_TOWNS.map((town) => (
            <Button
              small
              key={town}
              selected={selected === town}
              testID={`production-town-${town}`}
              onPress={() => setSelected(town)}
            >
              {PRODUCTION_CHAINS[town].title}
              {here === town ? ' · 所在地' : ''}
            </Button>
          ))}
        </View>
      )}
      <Panel testID={`production-next-goal-${selected}`} style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>当前追踪 · {chain.title}</Label>
        <Label testID="production-next-goal-title" style={{ color: palette.gold }}>
          {observationGoal
            ? `下一步：完成${goalPeriod}野外观察`
            : nextGoal === 'order'
              ? `下一步：再交付 ${progress.requiredOrders - progress.orders} 份本城基础订单`
              : goalTitles[nextGoal as keyof typeof goalTitles]}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          {progress.observedDay ? '✓' : '○'} 白天观察 · {progress.observedNight ? '✓' : '○'}{' '}
          夜晚观察 · 基础订单 {progress.orders}/{progress.requiredOrders}
        </Label>
        <Label testID="production-next-goal-detail" muted style={{ fontSize: 12 }}>
          {observationGoal
            ? `${observation.location}：${goalPeriod}真实遇见一次野生精灵即可，无需捕捉。${periodReady ? '当前时段符合条件。' : `当前是${calendar.night ? '夜晚' : '白天'}，可在安全城镇选择「休息到${nextGoal === 'night' ? '夜晚' : '清晨'}」。`}`
            : nextGoal === 'order'
              ? `完成${chain.source}领取材料，在${chain.venue}制作并交付基础成品。每种订单每天可交付一次${chain.nightOnly ? '，夜市仅 18:00 至次日 06:00 营业' : ''}。`
              : goalDetails[nextGoal as keyof typeof goalDetails]}
        </Label>
        <Label testID="production-goal-stages" muted style={{ fontSize: 12 }}>
          {(state?.crafted[advancedRecipe.id] ?? 0) > 0 || nextGoal === 'craft' ? '✓' : '○'} 备料 →{' '}
          {(state?.crafted[advancedRecipe.id] ?? 0) > 0 ? '✓' : '○'} 制作 →{' '}
          {(state?.orders[advancedRecipe.id]?.count ?? 0) > 0 ? '✓' : '○'} 首次交付 →{' '}
          {nextGoal === 'complete' ? '✓' : '○'} 查看城市成果 →{' '}
          {nextGoal === 'complete' ? '✓ 完成' : '○ 完成'}
        </Label>
        {onOpenRegion && (
          <Button small testID="production-next-goal-map" onPress={() => onOpenRegion(goalMap)}>
            在地图中查看 · {MAPS[goalMap].name}
          </Button>
        )}
      </Panel>
      <Panel testID="production-long-term-rewards" style={{ padding: 12, gap: 10 }}>
        <Label style={{ fontWeight: '800' }}>印花长期奖励 · 累计 {stamps} 枚</Label>
        <Label muted style={{ fontSize: 12 }}>
          印花是终身累计成就，不是货币。奖励自动解锁，无需领取或扣除印花；同一装饰可用于三城，每城独立保存一种选择。
        </Label>
        <Label testID="production-next-reward" style={{ color: palette.gold, fontSize: 12 }}>
          {nextReward
            ? `距离下一档 ${nextReward.stamps} 枚还差 ${nextReward.stamps - stamps} 枚 · ${nextReward.name}与居民故事`
            : '三档长期奖励均已解锁，感谢你持续照顾邻里。'}
        </Label>
        <Label testID="production-selected-decoration" style={{ fontWeight: '700' }}>
          {gardenName} ·{' '}
          {PRODUCTION_DECORATIONS.find((reward) => reward.id === selectedDecoration)?.name ??
            '未布置额外装饰'}
        </Label>
        <View style={[styles.wrap, { gap: 6 }]}>
          <Button
            small
            selected={!selectedDecoration}
            disabled={!!decorationBlock || !selectedDecoration}
            testID="production-decoration-none"
            onPress={() =>
              dispatch({
                kind: 'production',
                action: { kind: 'decorate', town: selected, decorationId: null },
              })
            }
          >
            不放额外装饰
          </Button>
          {PRODUCTION_DECORATIONS.map((reward) => (
            <Button
              key={reward.id}
              small
              selected={selectedDecoration === reward.id}
              disabled={
                !!decorationBlock || stamps < reward.stamps || selectedDecoration === reward.id
              }
              testID={`production-decoration-select-${reward.id}`}
              onPress={() =>
                dispatch({
                  kind: 'production',
                  action: { kind: 'decorate', town: selected, decorationId: reward.id },
                })
              }
            >
              {stamps >= reward.stamps
                ? selectedDecoration === reward.id
                  ? '✓ '
                  : ''
                : '未解锁 · '}
              {reward.name} · {reward.stamps} 枚
            </Button>
          ))}
        </View>
        <Label muted style={{ fontSize: 11 }}>
          可远程布置所选城市，回到花园即可看到。更换或收起装饰不会移除首次进阶订单留下的纪念。
        </Label>
        {!!decorationBlock && (
          <Label muted style={{ fontSize: 11 }}>
            {decorationBlock}
          </Label>
        )}
        <View testID={`production-story-${story.id}`} style={{ gap: 4 }}>
          <Label style={{ fontWeight: '700' }}>居民故事 · {story.title}</Label>
          <Label muted style={{ fontSize: 12 }}>
            {stamps >= story.stamps
              ? `${story.speaker}：${story.body}`
              : `累计 ${story.stamps} 枚印花后解锁，尚差 ${story.stamps - stamps} 枚。`}
          </Label>
        </View>
      </Panel>
      <Panel testID="production-observation-checklist" style={{ padding: 12, gap: 10 }}>
        <Label style={{ fontWeight: '800' }}>
          {facilityTown ? '本城昼夜观察手账' : '三城昼夜观察手账'}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          每城在指定区域白天、夜晚各真实遇见一次野生精灵，并累计交付 3
          份本城基础订单，即可解锁本城进阶配方。无需捕捉，不消耗伙伴。
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          仅记录真实野外相遇的首次物种、地点与游戏日历时间；旧图鉴、训练家战斗不会补记。昼夜以世界日历为准，与画面明暗设置无关。
        </Label>
        {(facilityTown ? [facilityTown] : PRODUCTION_TOWNS).map((town) => {
          const observation = observationProgress(game, town);
          const progress = advancedRecipeProgress(game, town);
          return (
            <View key={town} testID={`production-observation-${town}`} style={{ gap: 4 }}>
              <Label style={{ fontWeight: '700' }}>
                {observation.title} · {observation.complete ? '昼夜观察完成' : '等待观察'}
              </Label>
              <Label muted style={{ fontSize: 12 }}>
                {observation.location}
              </Label>
              {(['day', 'night'] as const).map((period) => {
                const record = observation[period];
                const recordedAt = record ? calendarDetails({ ...game, calendar: record }) : null;
                return (
                  <Label
                    key={period}
                    testID={`production-observation-${town}-${period}`}
                    style={{ fontSize: 12, color: record ? palette.gold : palette.muted }}
                  >
                    {record ? '✓' : '○'} {period === 'day' ? '白天' : '夜晚'}：
                    {record && recordedAt
                      ? `${SPECIES[record.speciesId]?.name ?? record.speciesId} · ${MAPS[record.map].name} · ${recordedAt.date} ${recordedAt.clock}`
                      : '尚未在指定区域遇见野生精灵'}
                  </Label>
                );
              })}
              <Label testID={`production-unlock-${town}`} style={{ fontSize: 12 }}>
                基础订单 {progress.orders}/{progress.requiredOrders} · 进阶配方
                {progress.unlocked ? '已解锁' : '未解锁'}
              </Label>
              {!progress.unlocked && (
                <Label muted testID={`production-unlock-reason-${town}`} style={{ fontSize: 12 }}>
                  {progress.reason}
                </Label>
              )}
            </View>
          );
        })}
      </Panel>
      <Panel testID={`production-source-${selected}`} style={{ padding: 12, gap: 6 }}>
        <Label style={{ fontWeight: '800' }}>
          {chain.venue}
          {chain.nightOnly ? (calendar.night ? ' · 夜市营业中' : ' · 等待入夜') : ' · 全天制作'}
        </Label>
        <Label>{chain.instructions}</Label>
        <Label style={{ color: palette.gold }}>
          {chain.source} · {collectedToday ? '今日材料已领取' : '今日材料待领取'}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          每个游戏日首次成功完成本活动，领取一份固定材料。重复游玩、重开菜单或读档不会重复发放；首次活动奖励仍可单独领取。
        </Label>
        <View style={[styles.wrap, { gap: 8 }]}>
          {(Object.keys(chain.materials) as ProductionMaterialId[]).map((id) => (
            <View key={id} style={{ backgroundColor: palette.panel2, borderRadius: 8, padding: 8 }}>
              <Label testID={`production-stock-${id}`}>
                {PRODUCTION_MATERIALS[id].name} ×{state?.materials[id] ?? 0}
              </Label>
              <Label muted style={{ fontSize: 11 }}>
                每日成功奖励 +{chain.materials[id]}
              </Label>
            </View>
          ))}
        </View>
        {selected === 'harbor' && (
          <Label muted style={{ fontSize: 12 }}>
            只使用捞起的空贝壳与海玻璃，精灵不作为食材或生产原料。
          </Label>
        )}
      </Panel>
      {PRODUCTION_RECIPES.filter((recipe) => recipe.town === selected).map((recipe) => {
        const product = PRODUCTION_PRODUCTS[recipe.id];
        const availability = productionAvailability(game, recipe);
        const progress = recipe.advanced ? advancedRecipeProgress(game, recipe.town) : null;
        return (
          <Panel
            key={recipe.id}
            style={{ padding: 12, gap: 8 }}
            testID={`production-recipe-${recipe.id}`}
          >
            <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
              <Label style={{ fontWeight: '800' }}>
                {recipe.advanced ? '进阶 · ' : '基础 · '}
                {product.name}
              </Label>
              <Label style={{ color: palette.gold }}>成品 ×{state?.products[recipe.id] ?? 0}</Label>
            </View>
            {progress && (
              <Label
                testID={`production-recipe-unlock-${recipe.id}`}
                style={{ fontSize: 12, color: progress.unlocked ? palette.gold : palette.muted }}
              >
                {progress.unlocked
                  ? '进阶配方已解锁'
                  : `解锁条件：${availability.unlockReason || progress.reason}`}
              </Label>
            )}
            <Label muted style={{ fontSize: 12 }}>
              {product.description}
            </Label>
            <Label style={{ fontSize: 12 }}>
              配方：
              {(Object.entries(recipe.ingredients) as [ProductionMaterialId, number][])
                .map(
                  ([id, count]) =>
                    `${PRODUCTION_MATERIALS[id].name} ×${count}（持有 ${state?.materials[id] ?? 0}）`,
                )
                .join(' · ')}
            </Label>
            <Button
              small
              accent
              testID={`production-craft-${recipe.id}`}
              disabled={!availability.canCraft}
              onPress={() =>
                dispatch({ kind: 'production', action: { kind: 'craft', recipeId: recipe.id } })
              }
            >
              制作 {product.name} ×1
            </Button>
            {!!availability.craftReason && (
              <Label muted style={{ fontSize: 11 }}>
                {availability.craftReason}
              </Label>
            )}
            <View style={{ height: 1, backgroundColor: palette.line }} />
            <Label style={{ fontWeight: '700' }}>{recipe.order}</Label>
            <Label muted style={{ fontSize: 12 }}>
              交付本成品 ×1 → 手作印花 ×1；每个游戏日可交付一次。
            </Label>
            <Button
              small
              testID={`production-order-${recipe.id}`}
              disabled={!availability.canOrder}
              onPress={() =>
                dispatch({ kind: 'production', action: { kind: 'order', recipeId: recipe.id } })
              }
            >
              {availability.orderedToday ? '今日已交付' : '交付今日订单'}
            </Button>
            {!!availability.orderReason && (
              <Label muted style={{ fontSize: 11 }}>
                {availability.orderReason}
              </Label>
            )}
            <Label muted style={{ fontSize: 11 }}>
              累计制作 {state?.crafted[recipe.id] ?? 0} · 累计交付{' '}
              {state?.orders[recipe.id]?.count ?? 0}
            </Label>
          </Panel>
        );
      })}
      <Panel testID="production-collection" style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>
          城市收藏册 · 手作印花 {state?.collection.stamps ?? 0}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          基础成品已制作 {made}/6 种 · 已收藏 {state?.collection.keepsakes.length ?? 0}/
          {PRODUCTION_KEEPSAKES.length} 件纪念品
        </Label>
        <View style={[styles.wrap, { gap: 6 }]}>
          {BASIC_PRODUCTION_RECIPES.map((recipe) => (
            <Label
              key={recipe.id}
              muted={!(state?.crafted[recipe.id] ?? 0)}
              style={{ fontSize: 12 }}
            >
              {(state?.crafted[recipe.id] ?? 0) > 0 ? '✓' : '○'}{' '}
              {PRODUCTION_PRODUCTS[recipe.id].name}
            </Label>
          ))}
        </View>
        <View testID="production-advanced-collection" style={{ gap: 6 }}>
          <Label style={{ fontWeight: '700' }}>
            进阶手作 · 已制作 {advancedMade}/3 种 · 已交付 {advancedDelivered}/3 种
          </Label>
          <Label
            testID="production-ecology-artisan-badge"
            style={{
              color: advancedMade === 3 && advancedDelivered === 3 ? palette.gold : palette.muted,
            }}
          >
            {advancedMade === 3 && advancedDelivered === 3 ? '✓ 已达成' : '○ 待达成'} 三城生态匠人章
          </Label>
          <Label muted style={{ fontSize: 11 }}>
            三城进阶成品各制作并交付至少一次即可达成；仅记录成就，不额外发放印花。
          </Label>
          {ADVANCED_PRODUCTION_RECIPES.map((recipe) => (
            <Label
              key={recipe.id}
              testID={`production-advanced-collection-${recipe.id}`}
              muted={!(state?.crafted[recipe.id] ?? 0)}
              style={{ fontSize: 12 }}
            >
              {(state?.crafted[recipe.id] ?? 0) > 0 ? '✓' : '○'}{' '}
              {PRODUCTION_PRODUCTS[recipe.id].name}
              {' · '}累计制作 {state?.crafted[recipe.id] ?? 0}
              {' · '}累计交付 {state?.orders[recipe.id]?.count ?? 0}
            </Label>
          ))}
          <Label muted style={{ fontSize: 11 }}>
            进阶成品单独记录，不增加基础收藏册的 6 种成品或 5 件纪念品要求。
          </Label>
        </View>
        {PRODUCTION_KEEPSAKES.map((keepsake) => {
          const owned = state?.collection.keepsakes.includes(keepsake.id) ?? false;
          return (
            <View
              key={keepsake.id}
              testID={`production-keepsake-${keepsake.id}`}
              style={{ gap: 2 }}
            >
              <Label style={{ color: owned ? palette.gold : palette.muted }}>
                {owned ? '✓' : '○'} {keepsake.name}
              </Label>
              <Label muted style={{ fontSize: 11 }}>
                {keepsake.description}
              </Label>
            </View>
          );
        })}
        <Label muted style={{ fontSize: 12 }}>
          配方、材料和收藏永久保留。未做的订单每天都会回来，没有错过后无法补齐的收藏。
        </Label>
      </Panel>
      <View accessibilityLiveRegion="polite" testID="production-notice">
        <Label>{game.notice}</Label>
      </View>
    </ScrollView>
  );
}
