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

export function BagMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [tab, setTab] = useState<'bag' | 'shop' | 'exchange'>('bag');
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
        : Object.keys(inventory).filter((id) => inventory[id]! > 0);
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
    mode !== 'bag'
      ? `持有 ×${selected ? (inventory[selected] ?? 0) : 0} · ${mode === 'exchange' ? '使用调查印记兑换补给。' : '购买后直接放入背包。'}`
      : item?.pocket === 'key'
        ? '随身携带即可生效，不消耗。'
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
          {(['bag', 'shop', 'exchange'] as const).map((id) => (
            <Pressable
              key={id}
              testID={`bag-tab-${id}`}
              accessibilityRole="button"
              accessibilityLabel={{ bag: '背包', shop: '补给商店', exchange: '印记兑换' }[id]}
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
                {{ bag: '背包', shop: '补给商店', exchange: '印记兑换' }[id]}
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
            : `${city!.name} · ${mode === 'shop' ? '补给商店' : '印记兑换'}`
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
          mode === 'bag'
            ? (id) => {
                setTargetId(id);
                setOperationStarted(false);
              }
            : undefined
        }
        hint={hint}
        notice={operationStarted ? game.notice : ''}
        emptyTitle={mode === 'bag' ? '这个口袋还是空的' : '这里暂不提供这类道具'}
        emptyMessage={
          mode === 'bag' ? '在旅途中收集补给，装好再出发。' : '切换其他分类，看看本城的补给。'
        }
        actions={
          item && selected ? (
            mode !== 'bag' ? (
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
