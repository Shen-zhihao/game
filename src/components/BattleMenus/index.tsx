import { HapticPressable as Pressable } from '../HapticPressable';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ITEMS, SPECIES } from '../../content/catalog';
import { battleActionReason } from '../../game/battle';
import { BattleAction, GameState } from '../../game/model';
import { captureChance, creatureName, statsFor } from '../../game/rules';
import { isSupply, SupplyId } from '../../game/items';
import { chanceLabel } from '../../game/combat';
import { conditionLabels } from '../../game/statusLabels';
import { BALLS, ballEffect, isBall } from '../../game/capture';
import { CreatureSprite } from '../CreatureSprite';
import { Button, HpBar, Label, palette, TypeBadges } from '../ui';
import { BagBrowser, BagButton, bagColors } from '../BagBrowser';

type Pocket = 'medicine' | 'balls' | 'items';
const POCKETS: { id: Pocket; name: string; mark: string }[] = [
  { id: 'medicine', name: '回复药', mark: '✚' },
  { id: 'balls', name: '精灵球', mark: '◉' },
  { id: 'items', name: '其他道具', mark: '✦' },
];
const pocketOf = (id: string): Pocket =>
  isBall(id) ? 'balls' : isSupply(id) ? 'medicine' : 'items';
const condition = (hp: number, status: string | null, confusionTurns?: number) =>
  hp === 0 ? '昏厥' : conditionLabels({ status, confusionTurns }).join(' · ') || '正常';

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
  targetItem: SupplyId;
  compact: boolean;
  onTargetItem: (id: SupplyId) => void;
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
    if (selectedItem && isBall(selectedItem)) perform({ kind: 'ball', ballId: selectedItem });
    else if (selectedItem && isSupply(selectedItem)) onTargetItem(selectedItem);
  };
  const selectedBall = !!selectedItem && isBall(selectedItem);
  const usable = selectedBall || (!!selectedItem && isSupply(selectedItem));
  if (mode === 'bag') {
    const ballIssue =
      selectedItem && isBall(selectedItem)
        ? battleActionReason(game, { kind: 'ball', ballId: selectedItem })
        : null;
    const effect = selectedItem && isBall(selectedItem) ? ballEffect(game, selectedItem) : null;
    const capture =
      selectedItem && isBall(selectedItem) && battle.kind === 'wild'
        ? BALLS[selectedItem].guaranteed
          ? '大师球：必定捕获。'
          : battle.tutorialCatch
            ? '捕捉教学：本次保证成功。普通野生遭遇仍可能捕捉失败。'
            : `当前倍率 ×${effect!.multiplier}（${effect!.reason}）。当前捕获率 ${chanceLabel(captureChance(battle.enemies[battle.enemyIndex]!, effect!.multiplier))}。每次投球仍可能挣脱，降低 HP 或施加异常状态可提高成功率。`
        : '';
    return (
      <View
        testID="battle-submenu"
        accessibilityViewIsModal
        role="dialog"
        aria-modal
        style={[
          s.overlay,
          {
            backgroundColor: bagColors.canvas,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={s.bagHeading}>
          <Text style={s.bagHeadingTitle}>战斗背包</Text>
          <Text style={[s.hint, { color: bagColors.muted, flex: 1 }]}>选择道具，再确认使用</Text>
          <BagButton testID="battle-menu-back" onPress={onBack}>
            返回战斗
          </BagButton>
        </View>
        <View style={{ flex: 1, minHeight: 0, padding: compact ? 8 : 14 }}>
          <BagBrowser
            game={game}
            testPrefix="battle-bag"
            context="对战补给"
            pockets={POCKETS.map((p) => ({
              id: p.id,
              name: p.name,
              icon: p.id === 'items' ? 'training' : p.id,
              count: Object.keys(ITEMS).filter(
                (id) => pocketOf(id) === p.id && (game.inventory[id] ?? 0) > 0,
              ).length,
            }))}
            pocket={pocket}
            onPocket={(id) => {
              setPocket(id as Pocket);
              setMessage('');
            }}
            entries={ids.map((id) => ({ id, quantity: game.inventory[id]! }))}
            selectedId={selectedItem}
            onSelect={(id) => {
              setItemId(id);
              setMessage('');
            }}
            targetId={battle.playerId}
            hint={
              message ||
              ballIssue ||
              (selectedItem && !usable
                ? '这个道具需要在战斗结束后使用。'
                : `${capture}使用道具消耗一次行动。`)
            }
            actions={
              <BagButton
                primary
                testID="battle-use-item"
                disabled={!selectedItem || !usable || !!ballIssue}
                onPress={useItem}
              >
                {selectedBall ? '投出精灵球' : '选择使用对象'}
              </BagButton>
            }
          />
        </View>
      </View>
    );
  }
  return (
    <View
      testID="battle-submenu"
      accessibilityViewIsModal
      role="dialog"
      aria-modal
      style={[
        s.overlay,
        mode === 'targets' && { backgroundColor: bagColors.canvas },
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View
        style={[
          s.heading,
          { paddingVertical: compact ? 8 : 15 },
          mode === 'targets' && { backgroundColor: bagColors.paper, borderColor: bagColors.line },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.headingTitle, mode === 'targets' && { color: bagColors.ink }]}>
            {mode === 'targets' ? `使用${ITEMS[targetItem]!.name}` : '精灵队伍'}
          </Text>
          <Text style={[s.hint, mode === 'targets' && { color: bagColors.muted }]}>
            {forced
              ? '伙伴失去了战斗能力，选择下一位上场。'
              : mode === 'targets'
                ? '选择精灵后确认用药；取消不会消耗道具。'
                : '选择精灵后确认换人；主动换人会消耗一次操作。'}
          </Text>
        </View>
        {!forced &&
          (mode === 'targets' ? (
            <BagButton testID="battle-menu-back" onPress={onBack}>
              返回背包
            </BagButton>
          ) : (
            <Button small testID="battle-menu-back" onPress={onBack}>
              返回战斗
            </Button>
          ))}
      </View>
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
              accessibilityLabel={`选择${creatureName(c)}，等级${c.level}，HP ${c.hp}/${max}，${condition(c.hp, c.status, c.confusionTurns)}${active ? '，正在出战' : ''}`}
              accessibilityState={{ selected: selected.id === id }}
              onPress={() => setCreatureId(id!)}
              style={[
                s.partyCard,
                c.hp === 0 && s.fainted,
                selected.id === id && s.partySelected,
                mode === 'targets' && {
                  backgroundColor: selected.id === id ? bagColors.tint : bagColors.paper,
                  borderColor: selected.id === id ? bagColors.gold : bagColors.line,
                },
              ]}
            >
              <CreatureSprite speciesId={c.speciesId} size={compact ? 52 : 68} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.cardTop}>
                  <Text
                    numberOfLines={1}
                    style={[s.partyName, mode === 'targets' && { color: bagColors.ink }]}
                  >
                    {creatureName(c)}
                  </Text>
                  <Text style={[s.cardLevel, mode === 'targets' && { color: bagColors.muted }]}>
                    Lv.{c.level}
                  </Text>
                </View>
                <HpBar value={c.hp} max={max} width="100%" />
                <View style={s.cardTop}>
                  <Text
                    style={[
                      s.condition,
                      mode === 'targets' && { color: bagColors.muted },
                      c.status || (c.confusionTurns ?? 0) > 0 || c.hp === 0
                        ? { color: mode === 'targets' ? bagColors.red : '#edb694' }
                        : null,
                    ]}
                  >
                    {active && c.hp > 0
                      ? ['出战中', ...conditionLabels(c)].join(' · ')
                      : condition(c.hp, c.status, c.confusionTurns)}
                  </Text>
                  <Text style={[s.cardHp, mode === 'targets' && { color: bagColors.muted }]}>
                    {c.hp}/{max}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View
        style={[
          s.partyFooter,
          { paddingVertical: compact ? 8 : 14 },
          mode === 'targets' && { backgroundColor: bagColors.paper, borderColor: bagColors.line },
        ]}
      >
        <View style={{ flex: 1 }}>
          {inspect ? (
            <View>
              <Text style={[s.detailTitle, mode === 'targets' && { color: bagColors.ink }]}>
                {creatureName(selected)} · 能力
              </Text>
              <TypeBadges types={SPECIES[selected.speciesId]!.types} />
              <Text style={[s.hint, mode === 'targets' && { color: bagColors.muted }]}>
                HP {stats.hp}　攻击 {stats.attack}　防御 {stats.defense}　特攻 {stats.specialAttack}
                　特防 {stats.specialDefense}　速度 {stats.speed}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[s.detailTitle, mode === 'targets' && { color: bagColors.ink }]}>
                {creatureName(selected)}，{mode === 'targets' ? '使用道具？' : '准备上场？'}
              </Text>
              <Label
                style={{
                  color: message
                    ? mode === 'targets'
                      ? bagColors.red
                      : palette.red
                    : mode === 'targets'
                      ? bagColors.ink
                      : palette.text,
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
          {mode === 'targets' ? (
            <BagButton
              primary
              testID="battle-confirm-creature"
              onPress={() => perform(selectedAction)}
            >{`使用${ITEMS[targetItem]!.name}`}</BagButton>
          ) : (
            <Button
              small
              accent
              testID="battle-confirm-creature"
              onPress={() => perform(selectedAction)}
            >
              换上场
            </Button>
          )}
          {mode === 'targets' ? (
            <BagButton onPress={() => setInspectAt(inspect ? '' : context)}>
              {inspect ? '返回选择' : '查看能力'}
            </BagButton>
          ) : (
            <Button small onPress={() => setInspectAt(inspect ? '' : context)}>
              {inspect ? '返回选择' : '查看能力'}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bagHeading: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bagHeadingTitle: { color: bagColors.ink, fontSize: 21, fontWeight: '900' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: palette.panel,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    backgroundColor: palette.canvas,
    borderBottomWidth: 2,
    borderColor: palette.line,
  },
  headingTitle: { fontSize: 20, lineHeight: 25, color: palette.gold, fontWeight: '900' },
  hint: { fontSize: 12, lineHeight: 18, color: palette.muted },
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
    backgroundColor: palette.panel2,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: palette.line,
    borderRadius: 9,
  },
  partySelected: { borderColor: palette.amber, backgroundColor: palette.tint },
  fainted: { backgroundColor: '#f1e5df', borderColor: '#d2b9ac' },
  emptyCard: { justifyContent: 'center', opacity: 0.35 },
  emptyText: { fontSize: 24, color: palette.muted },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  partyName: { fontSize: 14, fontWeight: '800', color: palette.text, flexShrink: 1 },
  cardLevel: { fontSize: 11, color: palette.muted },
  cardHp: { fontSize: 11, color: palette.muted },
  condition: { fontSize: 10, color: palette.accent, flexShrink: 1 },
  partyFooter: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    paddingHorizontal: 18,
    borderTopWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.canvas,
  },
});
