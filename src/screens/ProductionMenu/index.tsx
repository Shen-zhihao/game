import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { cityFor } from '../../content/cities';
import {
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
import type { Command, GameState } from '../../game/model';
import { productionAvailability } from '../../game/production';

export function ProductionMenu({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
}) {
  const here = cityFor(game.player.map)?.map;
  const [selected, setSelected] = useState<ProductionTown>(
    PRODUCTION_TOWNS.find((town) => town === here) ?? 'dawn',
  );
  const chain = PRODUCTION_CHAINS[selected];
  const state = game.production;
  const calendar = calendarDetails(game);
  const collectedToday =
    (state?.activityClaims[chain.activityId]?.day ?? 0) >= calendarFor(game).day;
  const morningBlock = restBlockedReason(game, 'morning');
  const nightBlock = restBlockedReason(game, 'night');
  const made = PRODUCTION_RECIPES.filter((recipe) => (state?.crafted[recipe.id] ?? 0) > 0).length;
  return (
    <ScrollView testID="production-menu" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
      <View style={{ gap: 4 }}>
        <Label style={{ fontSize: 22, fontWeight: '800' }}>城市手作与夜市</Label>
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
        return (
          <Panel
            key={recipe.id}
            style={{ padding: 12, gap: 8 }}
            testID={`production-recipe-${recipe.id}`}
          >
            <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
              <Label style={{ fontWeight: '800' }}>{product.name}</Label>
              <Label style={{ color: palette.gold }}>成品 ×{state?.products[recipe.id] ?? 0}</Label>
            </View>
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
          已制作 {made}/6 种成品 · 已收藏 {state?.collection.keepsakes.length ?? 0}/
          {PRODUCTION_KEEPSAKES.length} 件纪念品
        </Label>
        <View style={[styles.wrap, { gap: 6 }]}>
          {PRODUCTION_RECIPES.map((recipe) => (
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
