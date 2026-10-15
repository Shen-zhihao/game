import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ITEMS, SPECIES } from '../content/catalog';
import { battleActionReason } from '../game/battle';
import { BattleAction, GameState } from '../game/model';
import { creatureName, statsFor } from '../game/rules';
import { CreatureSprite } from './CreatureSprite';
import { Button, HpBar, Label, palette, TypeBadges } from './ui';

type Pocket = 'medicine' | 'balls' | 'items';
const POCKETS: { id: Pocket; name: string; mark: string }[] = [
  { id: 'medicine', name: '回复药', mark: '✚' },
  { id: 'balls', name: '精灵球', mark: '◉' },
  { id: 'items', name: '其他道具', mark: '✦' },
];
const pocketOf = (id: string): Pocket =>
  id === 'ball' ? 'balls' : ['potion', 'antidote'].includes(id) ? 'medicine' : 'items';
const condition = (hp: number, status: string | null) =>
  hp === 0
    ? '昏厥'
    : ({ poison: '中毒', burn: '灼伤', paralysis: '麻痹', sleep: '睡眠' }[status ?? ''] ?? '正常');

export function BattleMenus({
  game,
  mode,
  targetItem,
  compact,
  onTargetItem,
  onAction,
  onBack,
}: {
  game: GameState;
  mode: 'bag' | 'party' | 'targets' | null;
  targetItem: 'potion' | 'antidote';
  compact: boolean;
  onTargetItem: (id: 'potion' | 'antidote') => void;
  onAction: (action: BattleAction) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pocket, setPocket] = useState<Pocket>('medicine');
  const [itemId, setItemId] = useState('potion');
  const [creatureId, setCreatureId] = useState(game.party[0]!);
  const context = `${mode}:${creatureId}:${targetItem}`;
  const [feedback, setFeedback] = useState({ context: '', text: '' });
  const [inspectAt, setInspectAt] = useState('');
  const message = feedback.context === context ? feedback.text : '';
  const inspect = inspectAt === context;
  const setMessage = (text: string) => setFeedback({ context, text });
  if (!mode) return null;
  const battle = game.battle!;
  const forced = battle.phase === 'forcedSwitch';
  const ids = Object.keys(ITEMS).filter(
    (id) => pocketOf(id) === pocket && (game.inventory[id] ?? 0) > 0,
  );
  const selectedItem = ids.includes(itemId) ? itemId : ids[0];
  const selected = game.creatures[game.party.includes(creatureId) ? creatureId : game.party[0]!]!;
  const stats = statsFor(selected);
  const selectedAction: BattleAction =
    mode === 'targets'
      ? { kind: targetItem, creatureId: selected.id }
      : { kind: 'switch', creatureId: selected.id };
  const reason = battleActionReason(game, selectedAction);
  const perform = (action: BattleAction) => {
    const why = battleActionReason(game, action);
    if (why) setMessage(why);
    else onAction(action);
  };
  const useItem = () => {
    if (selectedItem === 'ball') perform({ kind: 'ball' });
    else if (selectedItem === 'potion' || selectedItem === 'antidote') onTargetItem(selectedItem);
  };
  const usable = ['ball', 'potion', 'antidote'].includes(selectedItem ?? '');
  return (
    <View
      testID="battle-submenu"
      accessibilityViewIsModal
      role="dialog"
      aria-modal
      style={[
        s.overlay,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={[s.heading, { paddingVertical: compact ? 8 : 15 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headingTitle}>
            {mode === 'bag'
              ? '背包'
              : mode === 'targets'
                ? `使用${ITEMS[targetItem]!.name}`
                : '精灵队伍'}
          </Text>
          <Text style={s.hint}>
            {mode === 'bag'
              ? '选择道具，再选择使用对象。'
              : forced
                ? '伙伴失去了战斗能力，选择下一位上场。'
                : mode === 'targets'
                  ? '选择精灵后确认用药；取消不会消耗道具。'
                  : '选择精灵后确认换人；主动换人会消耗本回合。'}
          </Text>
        </View>
        {!forced && (
          <Button small testID="battle-menu-back" onPress={onBack}>
            {mode === 'targets' ? '返回背包' : '返回战斗'}
          </Button>
        )}
      </View>
      {mode === 'bag' ? (
        <>
          <View style={s.pockets}>
            {POCKETS.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`背包分类：${p.name}`}
                accessibilityState={{ selected: pocket === p.id }}
                onPress={() => {
                  setPocket(p.id);
                  setMessage('');
                }}
                style={[s.pocket, pocket === p.id && s.pocketSelected]}
              >
                <Text style={[s.pocketText, pocket === p.id && { color: '#203c2c' }]}>
                  {p.mark}　{p.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: 12, padding: compact ? 10 : 18 }}>
            <ScrollView style={s.itemList} contentContainerStyle={{ gap: 6, padding: 6 }}>
              {!ids.length && (
                <Label muted style={{ padding: 14 }}>
                  这个口袋里还没有道具。
                </Label>
              )}
              {ids.map((id) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`选择${ITEMS[id]!.name}，持有${game.inventory[id]}个`}
                  accessibilityState={{ selected: selectedItem === id }}
                  key={id}
                  onPress={() => {
                    setItemId(id);
                    setMessage('');
                  }}
                  style={[s.itemRow, selectedItem === id && s.itemSelected]}
                >
                  <Text style={s.itemName}>
                    {selectedItem === id ? '▸ ' : '　'}
                    {ITEMS[id]!.name}
                  </Text>
                  <Text style={s.quantity}>× {game.inventory[id]}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={s.itemDetail}>
              <ScrollView contentContainerStyle={{ gap: compact ? 7 : 12 }}>
                <Text style={s.detailTitle}>
                  {selectedItem ? ITEMS[selectedItem]!.name : '道具说明'}
                </Text>
                <Label>
                  {selectedItem ? ITEMS[selectedItem]!.description : '切换口袋，查看携带的道具。'}
                </Label>
                {selectedItem && <Label muted>持有 ×{game.inventory[selectedItem]}</Label>}
                <Label style={{ color: message ? palette.red : palette.gold }}>
                  {message ||
                    (selectedItem === 'ball' && battle.kind !== 'wild'
                      ? '训练师的精灵不能捕捉。'
                      : selectedItem && !usable
                        ? '这个道具只能在战斗结束后使用。'
                        : '使用道具会消耗本回合。')}
                </Label>
              </ScrollView>
              <Button
                accent
                testID="battle-use-item"
                disabled={
                  !selectedItem || !usable || (selectedItem === 'ball' && battle.kind !== 'wild')
                }
                onPress={useItem}
              >
                {selectedItem === 'ball' ? '投出星纹球' : '使用'}
              </Button>
            </View>
          </View>
        </>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.partyGrid, { padding: compact ? 10 : 18 }]}
          >
            {Array.from({ length: 6 }, (_, index) => {
              const id = game.party[index];
              const c = id ? game.creatures[id]! : null;
              if (!c)
                return (
                  <View key={index} style={[s.partyCard, s.emptyCard]}>
                    <Text style={s.emptyText}>—</Text>
                  </View>
                );
              const max = statsFor(c).hp;
              const active = id === battle.playerId;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`选择${creatureName(c)}，等级${c.level}，HP ${c.hp}/${max}，${condition(c.hp, c.status)}${active ? '，正在出战' : ''}`}
                  accessibilityState={{ selected: selected.id === id }}
                  onPress={() => setCreatureId(id!)}
                  style={[
                    s.partyCard,
                    c.hp === 0 && s.fainted,
                    selected.id === id && s.partySelected,
                  ]}
                >
                  <CreatureSprite speciesId={c.speciesId} size={compact ? 52 : 68} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.cardTop}>
                      <Text numberOfLines={1} style={s.partyName}>
                        {creatureName(c)}
                      </Text>
                      <Text style={s.cardLevel}>Lv.{c.level}</Text>
                    </View>
                    <HpBar value={c.hp} max={max} width="100%" />
                    <View style={s.cardTop}>
                      <Text
                        style={[s.condition, c.status || c.hp === 0 ? { color: '#edb694' } : null]}
                      >
                        {active && c.hp > 0 ? '出战中' : condition(c.hp, c.status)}
                      </Text>
                      <Text style={s.cardHp}>
                        {c.hp}/{max}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[s.partyFooter, { paddingVertical: compact ? 8 : 14 }]}>
            <View style={{ flex: 1 }}>
              {inspect ? (
                <View>
                  <Text style={s.detailTitle}>{creatureName(selected)} · 能力</Text>
                  <TypeBadges types={SPECIES[selected.speciesId]!.types} />
                  <Text style={s.hint}>
                    HP {stats.hp}　攻击 {stats.attack}　防御 {stats.defense}　特攻{' '}
                    {stats.specialAttack}　特防 {stats.specialDefense}　速度 {stats.speed}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={s.detailTitle}>
                    {creatureName(selected)}，{mode === 'targets' ? '使用道具？' : '准备上场？'}
                  </Text>
                  <Label
                    style={{
                      color: message ? palette.red : palette.text,
                      fontSize: compact ? 12 : 14,
                    }}
                  >
                    {message ||
                      reason ||
                      (mode === 'targets'
                        ? ITEMS[targetItem]!.description
                        : forced
                          ? '补位不消耗回合。'
                          : '换上后，对手会继续本回合的行动。')}
                  </Label>
                </>
              )}
            </View>
            <View style={{ gap: 6, minWidth: compact ? 125 : 165 }}>
              <Button
                small
                accent
                testID="battle-confirm-creature"
                onPress={() => perform(selectedAction)}
              >
                {mode === 'targets' ? `使用${ITEMS[targetItem]!.name}` : '换上场'}
              </Button>
              <Button small onPress={() => setInspectAt(inspect ? '' : context)}>
                {inspect ? '返回选择' : '查看能力'}
              </Button>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#173e32',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    backgroundColor: '#102d25',
    borderBottomWidth: 2,
    borderColor: '#849b6b',
  },
  headingTitle: { fontSize: 20, lineHeight: 25, color: palette.gold, fontWeight: '900' },
  hint: { fontSize: 12, lineHeight: 18, color: '#c4d3b2' },
  pockets: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 7 },
  pocket: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    backgroundColor: '#2b5644',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6a8964',
  },
  pocketSelected: { backgroundColor: '#e5ce8c', borderColor: '#f0e3b8' },
  pocketText: { fontSize: 14, fontWeight: '800', color: '#dbe4c3' },
  itemList: {
    flex: 1.15,
    backgroundColor: '#112f27',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b6d53',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 5,
  },
  itemSelected: { borderColor: '#e4c77c', backgroundColor: '#385e44' },
  itemName: { fontSize: 16, fontWeight: '700', color: palette.text },
  quantity: { fontSize: 15, fontWeight: '700', color: palette.gold },
  itemDetail: { flex: 1, gap: 8, paddingHorizontal: 8 },
  detailTitle: { fontSize: 16, lineHeight: 22, color: palette.gold, fontWeight: '800' },
  partyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  partyCard: {
    width: '31.5%',
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 9,
    backgroundColor: '#284f3d',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#5b7c59',
    borderRadius: 9,
  },
  partySelected: { borderColor: '#efd082', backgroundColor: '#385d42' },
  fainted: { backgroundColor: '#443c34', borderColor: '#746454' },
  emptyCard: { justifyContent: 'center', opacity: 0.35 },
  emptyText: { fontSize: 24, color: '#9cac8c' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  partyName: { fontSize: 14, fontWeight: '800', color: palette.text, flexShrink: 1 },
  cardLevel: { fontSize: 11, color: '#d3dab5' },
  cardHp: { fontSize: 11, color: '#d3dab5' },
  condition: { fontSize: 10, color: '#a8c49b' },
  partyFooter: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    paddingHorizontal: 18,
    borderTopWidth: 2,
    borderColor: '#a9ae76',
    backgroundColor: '#102d25',
  },
});
