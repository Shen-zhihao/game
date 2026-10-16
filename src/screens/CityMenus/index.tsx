import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ITEMS, ITEM_POCKETS, ItemPocket } from '../../content/catalog';
import { bagInventory } from '../../content/keyItems';
import { CITIES, cityFor, questProgress, servicesUnlocked, shopStock } from '../../content/cities';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { Command, GameState } from '../../game/model';
import { isSupply } from '../../game/items';
import { creatureName, statsFor } from '../../game/rules';
import { SkillCopyMenu } from '../SkillCopyMenu';

export function BagMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [tab, setTab] = useState<'bag' | 'shop' | 'exchange'>('bag');
  const [chosen, setChosen] = useState('potion');
  const [targetId, setTargetId] = useState(game.party[0]!);
  const [copyOpen, setCopyOpen] = useState(false);
  const [pocket, setPocket] = useState<'all' | ItemPocket>('all');
  const inventory = bagInventory(game);
  const city = cityFor(game.player.map);
  const canTrade = !!city && servicesUnlocked(game);
  const mode = canTrade ? tab : 'bag';
  const ids =
    mode === 'shop'
      ? shopStock(game)
      : mode === 'exchange'
        ? city!.exchanges.map((o) => o.itemId)
        : Object.keys(inventory).filter(
            (id) => inventory[id]! > 0 && (pocket === 'all' || ITEMS[id]!.pocket === pocket),
          );
  const selected = ids.includes(chosen) ? chosen : ids[0];
  const item = selected ? ITEMS[selected] : null;
  const offer = city?.exchanges.find((o) => o.itemId === selected);
  const target = game.creatures[game.party.includes(targetId) ? targetId : game.party[0]!]!;
  const purchase = (quantity: number) =>
    selected &&
    dispatch(
      mode === 'exchange' && offer
        ? { kind: 'exchange', offerId: offer.id, quantity }
        : { kind: 'buy', itemId: selected, quantity },
    );
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }]}>
        <View style={[styles.wrap, { gap: 5 }]}>
          {(['bag', 'shop', 'exchange'] as const).map((id) => (
            <Button
              key={id}
              small
              testID={`bag-tab-${id}`}
              selected={mode === id}
              accent={mode === id}
              disabled={id !== 'bag' && !canTrade}
              onPress={() => setTab(id)}
            >
              {id === 'bag' ? '背包' : id === 'shop' ? '补给商店' : '印记兑换'}
            </Button>
          ))}
        </View>
        <Label style={{ color: palette.gold, fontSize: 12 }}>
          ◎ {game.player.money}　调查印记 {game.cityServices?.merit ?? 0}
        </Label>
      </View>
      <Label muted style={{ fontSize: 11 }}>
        {canTrade
          ? `${city.name} · ${city.merchant} · 特殊道具每城不同，印记来自居民委托`
          : city
            ? '完成捕捉入门后开放本地商店、居民委托和兑换。'
            : '到城镇可购买补给并用调查印记兑换特殊道具。'}
      </Label>
      {mode === 'bag' && (
        <View style={{ flexShrink: 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {(['all', ...Object.keys(ITEM_POCKETS)] as ('all' | ItemPocket)[]).map((id) => (
              <Button
                key={id}
                small
                testID={`bag-pocket-${id}`}
                selected={pocket === id}
                accent={pocket === id}
                onPress={() => setPocket(id)}
              >
                {id === 'all' ? '全部' : ITEM_POCKETS[id]}
              </Button>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={{ flex: 1, flexDirection: 'row', gap: 14 }}>
        <ScrollView
          style={{ width: '36%', flexGrow: 0 }}
          contentContainerStyle={{ gap: 7, paddingBottom: 14 }}
        >
          {!ids.length && <Label muted>背包是空的。</Label>}
          {ids.map((id) => (
            <Button
              key={id}
              small
              testID={`bag-item-${id}`}
              accent={selected === id}
              onPress={() => setChosen(id)}
            >
              {ITEMS[id]!.name}　
              {mode === 'shop'
                ? `◎${ITEMS[id]!.price}`
                : mode === 'exchange'
                  ? `${city!.exchanges.find((o) => o.itemId === id)!.cost} 印记`
                  : `×${inventory[id]}`}
            </Button>
          ))}
        </ScrollView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 18 }}>
          {item && selected && (
            <>
              <Label style={{ fontSize: 23, fontWeight: '800', color: palette.gold }}>
                {item.name}
              </Label>
              <Label>{item.description}</Label>
              <Label muted>持有 ×{inventory[selected] ?? 0}</Label>
              {mode !== 'bag' ? (
                <>
                  <View style={styles.wrap}>
                    <Button
                      small
                      accent
                      testID="shop-buy-one"
                      disabled={
                        (game.inventory[selected] ?? 0) >= 999 ||
                        (mode === 'exchange'
                          ? (game.cityServices?.merit ?? 0) < (offer?.cost ?? Infinity)
                          : game.player.money < item.price)
                      }
                      onPress={() => purchase(1)}
                    >
                      {mode === 'exchange'
                        ? `兑换 1 个 · ${offer!.cost} 印记`
                        : `购买 1 个 · ◎${item.price}`}
                    </Button>
                    <Button
                      small
                      testID="shop-buy-five"
                      disabled={
                        (game.inventory[selected] ?? 0) + 5 > 999 ||
                        (mode === 'exchange'
                          ? (game.cityServices?.merit ?? 0) < (offer?.cost ?? Infinity) * 5
                          : game.player.money < item.price * 5)
                      }
                      onPress={() => purchase(5)}
                    >
                      {mode === 'exchange'
                        ? `兑换 5 个 · ${offer!.cost * 5} 印记`
                        : `购买 5 个 · ◎${item.price * 5}`}
                    </Button>
                  </View>
                  <Label muted style={{ fontSize: 12 }}>
                    {mode === 'exchange'
                      ? '兑换后直接加入背包。印记兑换可重复办理，余额不足或背包已满时不扣印记。'
                      : '直接使用旅费购买，买到的补给可在野外和战斗中使用。成长果、重塑药剂与进化品需在战斗外使用。'}
                  </Label>
                </>
              ) : (
                <>
                  {item.pocket === 'key' ? (
                    <Label muted>
                      随身携带即可使用对应探索方式，不消耗，也不会自动完成剧情或道馆考验。
                    </Label>
                  ) : item.pocket === 'balls' ? (
                    <Label muted>
                      在野生精灵战斗中打开背包投球。不能捕获训练师伙伴，也不会提前解锁剧情相遇。
                    </Label>
                  ) : item.pocket === 'evolution' ? (
                    <Label muted>进化道具在「伙伴」详情中使用；未满足条件不会消耗。</Label>
                  ) : selected === 'skill_copy' ? (
                    <Label muted>选择来源伙伴及技能，再选择队伍或仓库中的接收伙伴。</Label>
                  ) : (
                    <>
                      <Label muted>选择使用对象</Label>
                      <View style={styles.wrap}>
                        {game.party.map((id) => (
                          <Button
                            key={id}
                            small
                            accent={target?.id === id}
                            onPress={() => setTargetId(id)}
                          >
                            {creatureName(game.creatures[id]!)}
                          </Button>
                        ))}
                      </View>
                      {target && (
                        <Label>
                          {creatureName(target)} · Lv.{target.level} · HP {target.hp}/
                          {statsFor(target).hp}
                        </Label>
                      )}
                    </>
                  )}
                  {(item.pocket === 'medicine' || item.pocket === 'training') && (
                    <Button
                      small
                      accent
                      testID="bag-use"
                      disabled={
                        !target ||
                        !(
                          isSupply(selected) ||
                          selected === 'candy' ||
                          selected === 'respec' ||
                          selected === 'skill_copy'
                        )
                      }
                      onPress={() =>
                        selected === 'skill_copy'
                          ? setCopyOpen(true)
                          : dispatch({ kind: 'useItem', creatureId: target.id, itemId: selected })
                      }
                    >
                      {selected === 'skill_copy' ? '选择来源与接收伙伴' : '使用道具'}
                    </Button>
                  )}
                  {selected === 'respec' && (
                    <Label muted style={{ fontSize: 12 }}>
                      需在城镇、体力全满、无异常，且已有已分配点数。使用后返还能力点，再到伙伴培养页重新分配。
                    </Label>
                  )}
                </>
              )}
            </>
          )}
          <View accessibilityLiveRegion="polite" testID="bag-operation-notice">
            <Label style={{ color: palette.mint, fontSize: 12 }}>{game.notice}</Label>
          </View>
        </ScrollView>
      </View>
      {copyOpen && (
        <SkillCopyMenu
          game={game}
          dispatch={dispatch}
          initialTargetId={target?.id ?? targetId}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </View>
  );
}

export function CityQuestBoard({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const here = cityFor(game.player.map);
  const [chosen, setChosen] = useState(here?.id ?? 'dawn');
  const city = CITIES.find((c) => c.id === chosen) ?? CITIES[0]!;
  const canAct = here?.id === city.id && servicesUnlocked(game);
  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <Label style={{ fontSize: 21, fontWeight: '800' }}>城市居民委托</Label>
        <Label style={{ color: palette.gold }}>调查印记 {game.cityServices?.merit ?? 0}</Label>
      </View>
      <View style={[styles.wrap, { gap: 6 }]}>
        {CITIES.filter((c) => c.implemented).map((c) => (
          <Button
            key={c.id}
            small
            testID={`quests-city-${c.id}`}
            accent={city.id === c.id}
            onPress={() => setChosen(c.id)}
          >
            {c.name}
            {here?.id === c.id ? ' · 所在地' : ''}
          </Button>
        ))}
      </View>
      <Label muted style={{ fontSize: 12 }}>
        {canAct
          ? '可以接受多份委托，自由安排顺序。完成后回本城领取；领取时才交付药物。'
          : '可查看其他城镇的进度；接受、交付与领奖需到对应城镇，并完成捕捉入门。'}
      </Label>
      {city.quests.map((q) => {
        const progress = questProgress(game, q);
        const status = game.cityServices?.quests[q.id];
        return (
          <Panel key={q.id} style={{ padding: 12, gap: 8 }}>
            <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
              <Label
                style={{
                  fontWeight: '800',
                  color: status === 'claimed' ? palette.mint : palette.gold,
                }}
              >
                {q.name}
              </Label>
              <Label muted style={{ fontSize: 11 }}>
                {q.client} ·{' '}
                {status === 'claimed'
                  ? '已领奖'
                  : status
                    ? progress.ready
                      ? '可交付'
                      : '进行中'
                    : '未接受'}
              </Label>
            </View>
            <Label muted style={{ fontSize: 12 }}>
              {q.story}
            </Label>
            <Label style={{ fontSize: 12 }}>
              {progress.label}　{progress.current}/{progress.target}
            </Label>
            <Label muted style={{ fontSize: 11 }}>
              奖励：◎{q.reward.money} · 印记 ×{q.reward.merit} ·{' '}
              {Object.entries(q.reward.items)
                .map(([id, n]) => `${ITEMS[id]!.name} ×${n}`)
                .join('、')}
            </Label>
            <Button
              small
              accent={status !== 'claimed'}
              testID={`quest-action-${q.id}`}
              disabled={!canAct || status === 'claimed' || (status === 'active' && !progress.ready)}
              onPress={() =>
                dispatch({ kind: 'cityQuest', questId: q.id, action: status ? 'claim' : 'accept' })
              }
            >
              {status === 'claimed' ? '奖励已领取' : status ? '交付并领取奖励' : '接受委托'}
            </Button>
          </Panel>
        );
      })}
      <View accessibilityLiveRegion="polite" testID="quest-operation-notice">
        <Label style={{ color: palette.mint, fontSize: 12 }}>{game.notice}</Label>
      </View>
      <Label muted style={{ fontSize: 11 }}>
        潮汐港、雷鸣市、风栖镇、炉心城、镜湖镇和星岚城的委托及商店将随各自地图开放。居民委托不会限制道馆顺序，稀有精灵仍由剧情获得。
      </Label>
    </View>
  );
}
