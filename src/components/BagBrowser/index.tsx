import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HapticPressable as Pressable } from '../HapticPressable';
import { CreatureSprite } from '../CreatureSprite';
import { BagIllustration, ItemIcon, PocketIcon } from '../ItemIcon';
import { palette } from '../ui';
import { ITEMS, type ItemPocket } from '../../content/catalog';
import type { GameState } from '../../game/model';
import { creatureName, statsFor } from '../../game/rules';

export const bagColors = {
  canvas: palette.canvas,
  paper: palette.panel,
  wash: palette.panel2,
  line: palette.line,
  ink: palette.ink,
  muted: palette.muted,
  amber: palette.amber,
  gold: '#b47b20',
  tint: palette.tint,
  red: palette.red,
};

export function BagButton({
  children,
  onPress,
  disabled = false,
  primary = false,
  testID,
  style,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      feedback={primary ? 'confirm' : 'selection'}
      onPress={onPress}
      style={({ pressed }) => [
        b.button,
        primary && b.primary,
        disabled && { opacity: 0.4 },
        style,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[b.buttonText, primary && { color: bagColors.paper }]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export interface BagPocket {
  id: string;
  name: string;
  icon: ItemPocket | 'all';
  count: number;
}
export interface BagEntry {
  id: string;
  quantity: number;
  value?: string;
}

export function BagBrowser({
  game,
  pockets,
  pocket,
  onPocket,
  entries,
  selectedId,
  onSelect,
  targetId,
  onTarget,
  description,
  hint,
  actions,
  actionWidth,
  notice = '',
  testPrefix = 'bag',
  context = '随身行装',
  emptyTitle = '这个口袋还是空的',
  emptyMessage = '在旅途中收集补给，装好再出发。',
}: {
  game: GameState;
  pockets: BagPocket[];
  pocket: string;
  onPocket: (id: string) => void;
  entries: BagEntry[];
  selectedId?: string;
  onSelect: (id: string) => void;
  targetId?: string;
  onTarget?: (id: string) => void;
  description?: string;
  hint?: string;
  actions?: ReactNode;
  actionWidth?: number;
  notice?: string;
  testPrefix?: string;
  context?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const [frame, setFrame] = useState({ width: 800, height: 320 });
  const stacked = frame.width < 480;
  const compact = frame.height < 390;
  const target = game.creatures[targetId ?? game.party[0]!];
  const partyList = useRef<ScrollView>(null);
  const targetIndex = onTarget && target ? Math.max(0, game.party.indexOf(target.id)) : 0;
  const showTarget = useCallback(() => {
    partyList.current?.scrollTo(
      stacked
        ? { x: targetIndex * 160, animated: false }
        : { y: targetIndex * 62, animated: false },
    );
  }, [stacked, targetIndex]);
  useEffect(showTarget, [showTarget]);
  const activePocket = pockets.find((p) => p.id === pocket) ?? pockets[0];
  const name = selectedId ? ITEMS[selectedId]!.name : '口袋空空的';
  return (
    <View
      testID={`${testPrefix}-browser`}
      onLayout={({ nativeEvent: { layout } }) =>
        setFrame({ width: layout.width, height: layout.height })
      }
      style={[b.browser, stacked && { flexDirection: 'column' }]}
    >
      <View
        style={[
          b.showcase,
          stacked
            ? { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }
            : {
                width: Math.min(230, Math.max(144, frame.width * 0.28)),
                padding: compact ? 12 : 20,
              },
        ]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 220 400"
            preserveAspectRatio="none"
            aria-hidden
          >
            <Path d="M185 0h35v400H55Z" fill="#e7c67c" opacity={0.24} />
            <Path d="M212 0h8v400H110Z" fill="#efbc48" opacity={0.16} />
          </Svg>
        </View>
        <View style={{ gap: compact || stacked ? 2 : 6 }}>
          <Text style={b.eyebrow}>{context}</Text>
          <Text style={[b.bagTitle, (compact || stacked) && { fontSize: 25, lineHeight: 30 }]}>
            BAG<Text style={{ fontSize: 14, fontWeight: '500' }}> / 背包</Text>
          </Text>
        </View>
        {!stacked && (
          <View style={{ alignItems: 'center', marginVertical: compact ? 0 : 6 }}>
            <BagIllustration size={compact ? 76 : Math.min(132, frame.height * 0.34)} />
          </View>
        )}
        {stacked && frame.width >= 360 && <BagIllustration size={52} />}
        <View style={stacked ? { flex: 1, minWidth: 0 } : { flex: 1, minHeight: 0, gap: 7 }}>
          {!stacked && (
            <Text style={b.eyebrow}>
              {onTarget ? '选择使用对象' : context === '对战补给' ? '出战伙伴' : '同行伙伴'}
            </Text>
          )}
          <ScrollView
            key={stacked ? 'horizontal' : 'vertical'}
            ref={partyList}
            testID={`${testPrefix}-party`}
            onContentSizeChange={showTarget}
            horizontal={stacked}
            style={stacked ? { height: 58 } : { flex: 1 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {(onTarget ? game.party : target ? [target.id] : []).map((id) => {
              const c = game.creatures[id]!;
              const max = statsFor(c).hp;
              return (
                <Pressable
                  key={id}
                  testID={`${testPrefix}-target-${id}`}
                  accessibilityRole={onTarget ? 'button' : undefined}
                  accessibilityLabel={`${creatureName(c)}，等级${c.level}，HP ${c.hp}/${max}`}
                  accessibilityState={onTarget ? { selected: target?.id === id } : undefined}
                  onPress={onTarget ? () => onTarget(id) : undefined}
                  style={[
                    b.partner,
                    stacked && { width: 154 },
                    target?.id === id &&
                      onTarget && { borderColor: bagColors.gold, backgroundColor: bagColors.paper },
                  ]}
                >
                  <CreatureSprite speciesId={c.speciesId} size={stacked ? 28 : compact ? 30 : 38} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text numberOfLines={1} style={b.partnerName}>
                      {creatureName(c)}
                    </Text>
                    <View style={b.healthTrack}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (c.hp / max) * 100)}%`,
                          backgroundColor:
                            c.hp / max > 0.5 ? '#83a98a' : c.hp / max > 0.2 ? '#d1a145' : '#c87b6b',
                        }}
                      />
                    </View>
                    <Text numberOfLines={1} style={b.partnerInfo}>
                      {c.hp}/{max} <Text style={{ color: bagColors.muted }}>· Lv.{c.level}</Text>
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {!game.party.length && <Text style={b.muted}>伙伴即将与你同行。</Text>}
          </ScrollView>
        </View>
      </View>
      <View style={b.contents}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={{ position: 'absolute', right: -50, top: 38, opacity: 0.035 }}>
            <BagIllustration size={300} />
          </View>
        </View>
        <ScrollView
          horizontal
          testID={`${testPrefix}-pockets`}
          style={{ flexGrow: 0, height: compact ? 46 : 56, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 10, gap: 4, alignItems: 'stretch' }}
        >
          {pockets.map((p) => (
            <Pressable
              key={p.id}
              testID={`${testPrefix}-pocket-${p.id}`}
              accessibilityRole="button"
              accessibilityLabel={`背包分类：${p.name}`}
              accessibilityHint={`${p.count}种道具`}
              accessibilityState={{ selected: pocket === p.id }}
              onPress={() => onPocket(p.id)}
              style={({ pressed }) => [
                b.pocket,
                pocket === p.id && b.pocketActive,
                pressed && { opacity: 0.6 },
              ]}
            >
              <PocketIcon pocket={p.icon} size={compact ? 21 : 25} />
              <Text
                style={[
                  b.pocketText,
                  pocket === p.id && { color: bagColors.ink, fontWeight: '800' },
                ]}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={b.listHeading}>
          <Text style={b.sectionTitle}>{activePocket?.name ?? '道具'}</Text>
          <Text style={b.counter}>{entries.length} 种道具</Text>
        </View>
        <ScrollView
          testID={`${testPrefix}-list`}
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ paddingHorizontal: compact ? 8 : 12, gap: 3, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {!entries.length && (
            <View style={b.empty}>
              <BagIllustration size={54} />
              <Text style={b.sectionTitle}>{emptyTitle}</Text>
              <Text style={b.muted}>{emptyMessage}</Text>
            </View>
          )}
          {entries.map((entry) => {
            const selected = selectedId === entry.id;
            return (
              <Pressable
                key={entry.id}
                testID={`${testPrefix}-item-${entry.id}`}
                accessibilityRole="button"
                accessibilityLabel={`选择${ITEMS[entry.id]!.name}，持有${entry.quantity}个${entry.value ? `，${entry.value}` : ''}`}
                accessibilityState={{ selected }}
                onPress={() => onSelect(entry.id)}
                style={({ pressed }) => [
                  b.itemRow,
                  compact && { minHeight: 42 },
                  selected && b.itemSelected,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[b.pointer, { color: selected ? bagColors.amber : 'transparent' }]}>
                  ›
                </Text>
                <ItemIcon itemId={entry.id} size={compact ? 27 : 31} />
                <Text
                  numberOfLines={1}
                  style={[b.itemName, selected && { color: bagColors.paper }]}
                >
                  {ITEMS[entry.id]!.name}
                </Text>
                <View style={[b.amount, selected && { backgroundColor: bagColors.amber }]}>
                  <Text numberOfLines={1} style={b.amountText}>
                    {entry.value ?? `× ${entry.quantity}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[b.detail, { height: compact ? 86 : 108 }, compact && { padding: 7 }]}>
          {!!selectedId && !stacked && <ItemIcon itemId={selectedId} size={compact ? 34 : 44} />}
          <View style={{ flex: 1, minWidth: 0, minHeight: 0, gap: 3 }}>
            <Text numberOfLines={1} style={b.detailTitle}>
              {name}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4 }}>
              {!!notice && (
                <Text
                  testID={`${testPrefix}-operation-notice`}
                  accessibilityLiveRegion="polite"
                  style={b.feedback}
                >
                  {notice}
                </Text>
              )}
              <Text style={b.description}>
                {description ||
                  (selectedId ? ITEMS[selectedId]!.description : '切换分类，看看其他口袋吧。')}
              </Text>
              {!!hint && <Text style={b.hint}>{hint}</Text>}
            </ScrollView>
          </View>
          {!!actions && (
            <View
              style={{
                gap: 5,
                width: actionWidth,
                maxWidth: actionWidth ?? (stacked ? 94 : frame.width < 540 ? 110 : 210),
              }}
            >
              {actions}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export const bagStyles = StyleSheet.create({
  text: { color: bagColors.ink, fontSize: 13, lineHeight: 19 },
  muted: { color: bagColors.muted, fontSize: 12, lineHeight: 18 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeButton: { paddingHorizontal: 14, minHeight: 34, justifyContent: 'center', borderRadius: 18 },
  modeSelected: { backgroundColor: bagColors.amber },
  modeText: { color: bagColors.muted, fontSize: 12, fontWeight: '700' },
});
const b = StyleSheet.create({
  browser: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    backgroundColor: bagColors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: bagColors.line,
    overflow: 'hidden',
  },
  showcase: { backgroundColor: bagColors.wash, overflow: 'hidden' },
  eyebrow: {
    color: bagColors.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bagTitle: {
    color: bagColors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  contents: { flex: 1, minWidth: 0, minHeight: 0 },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
    borderWidth: 1,
    borderColor: '#ffffff70',
    borderRadius: 11,
    backgroundColor: '#fffcf5c0',
    minHeight: 56,
  },
  partnerName: { color: bagColors.ink, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  partnerInfo: { color: bagColors.ink, fontSize: 9, lineHeight: 12, fontVariant: ['tabular-nums'] },
  healthTrack: { height: 4, borderRadius: 3, overflow: 'hidden', backgroundColor: '#ded9ca' },
  pocket: {
    minWidth: 58,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderColor: 'transparent',
    gap: 1,
  },
  pocketActive: {
    borderColor: bagColors.amber,
    backgroundColor: '#fff0c450',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  pocketText: { color: bagColors.muted, fontSize: 10, lineHeight: 14 },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 5,
  },
  sectionTitle: { color: bagColors.ink, fontSize: 12, fontWeight: '700' },
  counter: { color: bagColors.muted, fontSize: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 46,
    paddingRight: 5,
    paddingLeft: 6,
    borderRadius: 13,
  },
  itemSelected: { backgroundColor: bagColors.ink },
  pointer: { width: 9, fontSize: 23, fontWeight: '700' },
  itemName: { flex: 1, minWidth: 0, color: bagColors.ink, fontSize: 14, fontWeight: '600' },
  amount: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: bagColors.canvas,
    alignItems: 'center',
  },
  amountText: {
    color: bagColors.ink,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderColor: bagColors.line,
    backgroundColor: '#f6ecd5',
    padding: 12,
  },
  detailTitle: { color: bagColors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  description: { color: bagColors.ink, fontSize: 12, lineHeight: 18 },
  hint: { color: bagColors.muted, fontSize: 10, lineHeight: 15 },
  feedback: { color: '#8b6122', fontSize: 11, lineHeight: 16 },
  muted: { color: bagColors.muted, fontSize: 11, lineHeight: 17 },
  empty: { alignItems: 'center', gap: 6, padding: 10 },
  button: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: bagColors.line,
    backgroundColor: bagColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: bagColors.ink, borderColor: bagColors.ink, minHeight: 36 },
  buttonText: { color: bagColors.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
