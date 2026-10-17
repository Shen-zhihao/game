import { useState } from 'react';
import { Text, View } from 'react-native';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { BagBrowser, BagButton, bagColors, bagStyles } from '../../components/BagBrowser';
import { ITEMS, ITEM_POCKETS, type ItemPocket } from '../../content/catalog';
import { bagInventory } from '../../content/keyItems';
import { cityFor, servicesUnlocked, shopStock } from '../../content/cities';
import type { Command, GameState } from '../../game/model';
import { isSupply, supplyReason } from '../../game/items';
import { SkillCopyMenu } from '../SkillCopyMenu';
import { fieldItemReason } from '../../game/fieldItems';
import { sellPrice } from '../../game/cityServices';
import { SellPanel } from './SellPanel';

export function BagMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [tab, setTab] = useState<'bag' | 'shop' | 'sell' | 'exchange'>('bag');
  const [chosen, setChosen] = useState('potion');
  const [targetId, setTargetId] = useState(game.party[0]!);
  const [copyOpen, setCopyOpen] = useState(false);
  const [operationStarted, setOperationStarted] = useState(false);
  const [pocket, setPocket] = useState('all');
  const inventory = bagInventory(game);
  const city = cityFor(game.player.map);
  const canTrade = !!city && servicesUnlocked(game);
  const mode = canTrade ? tab : 'bag';
  const stock =
    mode === 'shop'
      ? shopStock(game)
      : mode === 'exchange'
        ? city!.exchanges.map((o) => o.itemId)
        : Object.keys(inventory).filter(
            (id) => inventory[id]! > 0 && (mode !== 'sell' || sellPrice(id) > 0),
          );
  const ids = stock.filter((id) => pocket === 'all' || ITEMS[id]!.pocket === pocket);
  const selected = ids.includes(chosen) ? chosen : ids[0];
  const item = selected ? ITEMS[selected] : null;
  const offer = city?.exchanges.find((o) => o.itemId === selected);
  const canPurchase = (quantity: number) => {
    if (!selected || !item) return false;
    if (
      (game.inventory[selected] ?? 0) +
        quantity * (mode === 'exchange' ? (offer?.quantity ?? 1) : 1) >
      999
    )
      return false;
    return mode === 'exchange'
      ? !!offer &&
          (game.cityServices?.merit ?? 0) >= offer.cost * quantity &&
          (game.cityServices?.exchanges[offer.id] ?? 0) + quantity <= 999
      : game.player.money >= item.price * quantity;
  };
  const target = game.creatures[game.party.includes(targetId) ? targetId : game.party[0]!];
  const act = (command: Command) => {
    setOperationStarted(true);
    dispatch(command);
  };
  const purchase = (quantity: number) => {
    if (!selected) return;
    act(
      mode === 'exchange' && offer
        ? { kind: 'exchange', offerId: offer.id, quantity }
        : { kind: 'buy', itemId: selected, quantity },
    );
  };
  const supplyIssue =
    target && selected && isSupply(selected) ? supplyReason(target, selected) : null;
  const hint =
    mode === 'sell'
      ? '仅出售背包库存；重要物品及伙伴携带的道具会保留。确认报价后才会成交。'
      : mode !== 'bag'
        ? `持有 ×${selected ? (inventory[selected] ?? 0) : 0} · ${mode === 'exchange' ? '使用调查印记兑换补给。' : '购买后直接放入背包。'}`
        : item?.pocket === 'field'
          ? (fieldItemReason(game, selected!) ?? '直接使用；剩余步数会显示在探索地图上。')
          : item?.pocket === 'key'
            ? '随身携带即可生效，不消耗。'
            : item?.pocket === 'held'
              ? `选择伙伴后确认携带；原携带道具会收回背包。${target?.heldItem ? `目前携带：${ITEMS[target.heldItem]!.name}。` : ''}`
              : item?.pocket === 'balls'
                ? '在野生精灵战斗中打开背包投球。'
                : item?.pocket === 'evolution'
                  ? '在「伙伴」详情中使用进化道具。'
                  : selected === 'skill_copy'
                    ? '选择来源技能和接收伙伴，成功后消耗一瓶。'
                    : (supplyIssue ?? (target ? '选择伙伴，再确认使用。' : '先获得一位同行伙伴。'));
  return (
    <View testID="bag-screen" style={{ flex: 1, minHeight: 0, gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 0,
          minHeight: 36,
        }}
      >
        <View style={bagStyles.modeRow}>
          {(['bag', 'shop', 'sell', 'exchange'] as const).map((id) => (
            <Pressable
              key={id}
              testID={`bag-tab-${id}`}
              accessibilityRole="button"
              accessibilityLabel={
                { bag: '背包', shop: '补给商店', sell: '出售道具', exchange: '印记兑换' }[id]
              }
              accessibilityState={{ selected: mode === id, disabled: id !== 'bag' && !canTrade }}
              disabled={id !== 'bag' && !canTrade}
              onPress={() => {
                setTab(id);
                setPocket('all');
                setOperationStarted(false);
              }}
              style={({ pressed }) => [
                bagStyles.modeButton,
                mode === id && bagStyles.modeSelected,
                id !== 'bag' && !canTrade && { opacity: 0.4 },
                pressed && { opacity: 0.65 },
              ]}
            >
              <Text style={[bagStyles.modeText, mode === id && { color: bagColors.ink }]}>
                {{ bag: '背包', shop: '补给商店', sell: '出售道具', exchange: '印记兑换' }[id]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8 }}>
          <Text style={[bagStyles.text, { fontWeight: '800', fontVariant: ['tabular-nums'] }]}>
            ◎ {game.player.money.toLocaleString()}
          </Text>
          <Text style={bagStyles.muted}>印记 {game.cityServices?.merit ?? 0}</Text>
        </View>
      </View>
      <BagBrowser
        game={game}
        context={
          mode === 'bag'
            ? '随身行装'
            : `${city!.name} · ${{ shop: '补给商店', sell: '出售道具', exchange: '印记兑换' }[mode]}`
        }
        pockets={(['all', ...Object.keys(ITEM_POCKETS)] as ('all' | ItemPocket)[]).map((id) => ({
          id,
          icon: id,
          name: id === 'all' ? '全部道具' : ITEM_POCKETS[id],
          count: stock.filter((itemId) => id === 'all' || ITEMS[itemId]!.pocket === id).length,
        }))}
        pocket={pocket}
        onPocket={(id) => {
          setPocket(id);
          setOperationStarted(false);
        }}
        entries={ids.map((id) => ({
          id,
          quantity: inventory[id] ?? 0,
          value:
            mode === 'shop'
              ? `◎ ${ITEMS[id]!.price}`
              : mode === 'sell'
                ? `售 ◎${sellPrice(id)}`
                : mode === 'exchange'
                  ? `${city!.exchanges.find((o) => o.itemId === id)!.cost} 印记`
                  : undefined,
        }))}
        selectedId={selected}
        onSelect={(id) => {
          setChosen(id);
          setOperationStarted(false);
        }}
        targetId={target?.id}
        onTarget={
          mode === 'bag' && item?.pocket !== 'field'
            ? (id) => {
                setTargetId(id);
                setOperationStarted(false);
              }
            : undefined
        }
        hint={hint}
        actionWidth={mode === 'sell' ? 180 : undefined}
        notice={operationStarted ? game.notice : ''}
        emptyTitle={
          mode === 'bag'
            ? '这个口袋还是空的'
            : mode === 'sell'
              ? '没有可出售的道具'
              : '这里暂不提供这类道具'
        }
        emptyMessage={
          mode === 'bag' ? '在旅途中收集补给，装好再出发。' : '切换其他分类，看看本城的补给。'
        }
        actions={
          item && selected ? (
            mode === 'sell' ? (
              <SellPanel
                key={`${pocket}:${selected}`}
                game={game}
                itemId={selected}
                onSell={(quantity) => act({ kind: 'sell', itemId: selected, quantity })}
              />
            ) : mode !== 'bag' ? (
              <View style={{ gap: 5 }}>
                <BagButton
                  primary
                  testID="shop-buy-one"
                  disabled={!canPurchase(1)}
                  onPress={() => purchase(1)}
                >
                  {mode === 'exchange' ? `兑换 1 · ${offer!.cost}印记` : `购买 1 · ◎${item.price}`}
                </BagButton>
                <BagButton
                  testID="shop-buy-five"
                  disabled={!canPurchase(5)}
                  onPress={() => purchase(5)}
                >
                  {mode === 'exchange'
                    ? `兑换 5 · ${offer!.cost * 5}印记`
                    : `购买 5 · ◎${item.price * 5}`}
                </BagButton>
              </View>
            ) : item.pocket === 'field' ? (
              <BagButton
                primary
                testID="bag-use-field"
                disabled={!!fieldItemReason(game, selected)}
                onPress={() => act({ kind: 'useFieldItem', itemId: selected })}
              >
                使用驱避喷雾
              </BagButton>
            ) : item.pocket === 'held' ? (
              <View style={{ gap: 6 }}>
                <BagButton
                  primary
                  testID="bag-equip"
                  disabled={!target || target.heldItem === selected}
                  onPress={() => {
                    if (target) act({ kind: 'equip', creatureId: target.id, itemId: selected });
                  }}
                >
                  交给伙伴携带
                </BagButton>
                {target?.heldItem && (
                  <BagButton
                    testID="bag-unequip"
                    onPress={() => act({ kind: 'equip', creatureId: target.id, itemId: null })}
                  >
                    收回携带道具
                  </BagButton>
                )}
              </View>
            ) : item.pocket === 'medicine' || item.pocket === 'training' ? (
              <BagButton
                primary
                testID="bag-use"
                disabled={
                  !target ||
                  !!supplyIssue ||
                  !(isSupply(selected) || ['candy', 'respec', 'skill_copy'].includes(selected))
                }
                onPress={() => {
                  if (selected === 'skill_copy') setCopyOpen(true);
                  else if (target)
                    act({ kind: 'useItem', creatureId: target.id, itemId: selected });
                }}
              >
                {selected === 'skill_copy' ? '复刻技能' : '使用道具'}
              </BagButton>
            ) : undefined
          ) : undefined
        }
      />
      {!canTrade && (
        <Text style={[bagStyles.muted, { fontSize: 10, lineHeight: 13 }]}>
          {city
            ? '完成捕捉入门后开放本地商店与印记兑换。'
            : '到城镇补充道具，或使用调查印记兑换物资。'}
        </Text>
      )}
      {copyOpen && (
        <SkillCopyMenu
          game={game}
          dispatch={dispatch}
          initialTargetId={target?.id ?? targetId}
          onClose={() => {
            setCopyOpen(false);
            setOperationStarted(true);
          }}
        />
      )}
    </View>
  );
}
