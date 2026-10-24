import { CaptureTargetPanel } from '../../components/CaptureTargetPanel';
import { PartyPresetsPanel } from '../../components/PartyPresetsPanel';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { MenuIcon } from '../../components/MenuIcon';
import {
  ALL_SPECIES,
  learnset,
  MOVES,
  SPECIES,
  STARTERS,
  TYPE_IDS,
  TYPES,
} from '../../content/catalog';
import { isTownLocation } from '../../content/world';
import { CreatureSprite } from '../../components/CreatureSprite';
import { CreatureTraits } from '../../components/CreatureTraits';
import { FriendshipPanel } from '../../components/FriendshipPanel';
import {
  evolutionProgressLabel,
  evolutionRequirementsLabel,
} from '../../game/evolutionRequirements';
import { MoveDetails, MoveLearningPanel } from '../../components/MoveDetails';
import { Button, HpBar, Label, palette, Panel, styles, TypeBadges } from '../../components/ui';
import { Command, GameState, MapId, STAT_KEYS, TypeId } from '../../game/model';
import {
  abilityFor,
  canEvolve,
  creatureName,
  evolutionLabel,
  statsFor,
  typeMultiplier,
  xpAt,
} from '../../game/rules';
import { conditionLabels } from '../../game/statusLabels';
import { TrainingPanel, TrainingPlanView } from '../TrainingPanel';
import { availablePoints, trainingFor } from '../../game/growth';
import { STAT_NAMES } from '../../content/training';
import { recallOptions } from '../../game/skills';
import { SkillCopyMenu } from '../SkillCopyMenu';
import { HabitatDetails } from '../../components/HabitatDetails';
import { atCenter, fieldSkill, fieldSkillUnlocked } from '../../game/fieldSkills';
import { boxTransferReason, warehouseIds } from '../../game/party';
export { RegionMenu } from '../RegionMenu';
export { BagMenu } from '../CityMenus';

export type MenuName =
  | 'nursery'
  | 'production'
  | 'challenge'
  | 'party'
  | 'center'
  | 'bag'
  | 'dex'
  | 'quests'
  | 'battleJournal'
  | 'map'
  | 'save'
  | 'transfer'
  | 'settings';
export const MENU_NAMES: Record<MenuName, string> = {
  nursery: '培育屋',
  production: '城市工坊',
  challenge: '规则挑战',
  party: '伙伴',
  center: '精灵中心',
  bag: '背包与商店',
  dex: '精灵图鉴',
  quests: '任务管理',
  battleJournal: '战后复盘',
  map: '地区地图',
  save: '本地存档',
  transfer: '存档互传',
  settings: '设置',
};
const MENU_SECTIONS = [
  'party',
  'center',
  'nursery',
  'bag',
  'dex',
  'quests',
  'battleJournal',
  'map',
  'challenge',
  'production',
  'save',
  'transfer',
  'settings',
] as const;
export function MenuFrame({
  menu,
  onMenu,
  onClose,
  hasGame = true,
  coveredByEvent = false,
  children,
}: {
  menu: MenuName;
  onMenu: (m: MenuName) => void;
  onClose: () => void;
  hasGame?: boolean;
  coveredByEvent?: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 450 || width < 600;
  const navRef = useRef<ScrollView>(null);
  const navLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [enter] = useState(() => new Animated.Value(0));
  const centerTab = useCallback(() => {
    const layout = navLayouts.current[menu];
    if (layout)
      navRef.current?.scrollTo({
        x: Math.max(0, layout.x + layout.width / 2 - (width - insets.left - insets.right - 56) / 2),
        animated: false,
      });
  }, [menu, width, insets.left, insets.right]);
  useEffect(centerTab, [centerTab]);
  useEffect(() => {
    if (coveredByEvent) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '') ||
        target?.isContentEditable
      )
        return;
      if (!['escape', 'x'].includes(event.key.toLowerCase())) return;
      event.preventDefault();
      // Consume this close key before adventure listeners can reopen the menu.
      event.stopImmediatePropagation();
      onClose();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', keyDown, true);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', keyDown, true);
    };
  }, [onClose, coveredByEvent]);
  useEffect(() => {
    enter.setValue(0);
    const animation = Animated.timing(enter, { toValue: 1, duration: 170, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [menu, enter]);
  const available = (name: MenuName) => hasGame || ['save', 'transfer', 'settings'].includes(name);
  const close = (
    <Pressable
      testID="menu-close"
      accessibilityRole="button"
      accessibilityLabel="返回冒险"
      hitSlop={4}
      onPress={onClose}
      style={({ pressed }) => [s.frameIcon, pressed && styles.pressed]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
        <Path d="M6 6l12 12M18 6L6 18" stroke={palette.ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
  return (
    <View
      pointerEvents={coveredByEvent ? 'none' : 'auto'}
      accessibilityElementsHidden={coveredByEvent}
      importantForAccessibility={coveredByEvent ? 'no-hide-descendants' : 'auto'}
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
      <View style={s.secondaryHeader}>
        <ScrollView
          ref={navRef}
          horizontal
          testID="menu-navigation"
          style={{ flex: 1, minWidth: 0 }}
          contentContainerStyle={{ alignItems: 'center', gap: 5, paddingHorizontal: 4 }}
          onContentSizeChange={centerTab}
          showsHorizontalScrollIndicator={false}
        >
          {MENU_SECTIONS.map((name) => (
            <Pressable
              key={name}
              testID={`menu-${name}`}
              accessibilityRole="button"
              accessibilityLabel={MENU_NAMES[name]}
              accessibilityState={{ selected: menu === name, disabled: !available(name) }}
              aria-pressed={menu === name}
              disabled={!available(name)}
              onLayout={({ nativeEvent }) => {
                navLayouts.current[name] = nativeEvent.layout;
                if (menu === name) centerTab();
              }}
              onPress={() => onMenu(name)}
              style={({ pressed }) => [
                s.secondaryTab,
                menu === name && { backgroundColor: palette.amber },
                !available(name) && styles.disabled,
                pressed && { opacity: 0.65 },
              ]}
            >
              <MenuIcon name={name} size={22} />
              <Label style={{ fontSize: 14, lineHeight: 22, fontWeight: '800' }}>
                {MENU_NAMES[name]}
              </Label>
            </Pressable>
          ))}
        </ScrollView>
        {close}
      </View>
      <Animated.View
        testID={`menu-content-${menu}`}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          paddingHorizontal: compact ? 10 : 18,
          paddingTop: 4,
          paddingBottom: compact ? 10 : 18,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const statNames = STAT_NAMES;
export function PartyMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [contentWidth, setContentWidth] = useState(600);
  const { width, height } = useWindowDimensions();
  const stacked = contentWidth < 450 && height > width;
  const small = contentWidth < 550;
  const [detailTab, setDetailTab] = useState<'overview' | 'training'>(() =>
    game.party[0] && availablePoints(game.creatures[game.party[0]]!) > 0 ? 'training' : 'overview',
  );
  const [selected, setSelected] = useState(game.party[0]!);
  const [showBox, setShowBox] = useState(false);
  const [boxQuery, setBoxQuery] = useState('');
  const [boxType, setBoxType] = useState<TypeId | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [boxSort, setBoxSort] = useState<'storage' | 'level' | 'dex'>('storage');
  const [recall, setRecall] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [potentialId, setPotentialId] = useState('');
  const [moveDetail, setMoveDetail] = useState<string | null>(null);
  const [releaseConfirm, setReleaseConfirm] = useState<string | null>(null);
  const detailRef = useRef<ScrollView>(null);
  const boxIds = useMemo(
    () => warehouseIds(game, { query: boxQuery, type: boxType, favoritesOnly, sort: boxSort }),
    [game, boxQuery, boxType, favoritesOnly, boxSort],
  );
  const ids = showBox ? boxIds : game.party;
  const resetBoxFilters = () => {
    setBoxQuery('');
    setBoxType(null);
    setFavoritesOnly(false);
    setBoxSort('storage');
    setReleaseConfirm(null);
  };
  const c =
    game.creatures[ids.includes(selected) ? selected : ids[0]!] ?? game.creatures[game.party[0]!]!;
  if (!c || (game.progress.flags.opening && !game.progress.flags.partnerReceived))
    return (
      <Panel>
        <Label style={styles.title}>{c ? '临时借用的伙伴' : '还没有精灵伙伴'}</Label>
        <Label style={{ marginTop: 12 }}>
          {c
            ? `先和${creatureName(c)}救出博士，再回研究所正式领取伙伴。`
            : '先拜访邻居，再前往一号路。第一位伙伴将在故事中与你相遇。'}
        </Label>
      </Panel>
    );
  const species = SPECIES[c.speciesId]!;
  const stats = statsFor(c);
  const xpStart = xpAt(c.level, species.experienceCurve);
  const xpNext = xpAt(Math.min(100, c.level + 1), species.experienceCurve);
  const inParty = game.party.includes(c.id);
  const partyIndex = game.party.indexOf(c.id);
  const firstReady = game.party.find((id) => game.creatures[id]!.hp > 0);
  const boxReason = boxTransferReason(game, c.id, !inParty);
  const transferMember = () => {
    if (boxReason) return;
    // Selection follows the actual state update via ids above, not an optimistic transfer.
    // A rejected/debounced command must not make the selected partner disappear.
    setRecall(null);
    setMoveDetail(null);
    setReleaseConfirm(null);
    detailRef.current?.scrollTo({ y: 0, animated: false });
    dispatch({ kind: 'box', creatureId: c.id, withdraw: !inParty });
  };
  const move =
    moveDetail && c.moves.some((known) => known.id === moveDetail) ? MOVES[moveDetail] : null;
  return (
    <View
      testID="party-screen"
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
      style={{ flex: 1, minHeight: 0, flexDirection: stacked ? 'column' : 'row', gap: 12 }}
    >
      <View
        style={
          stacked
            ? { height: showBox ? 270 : 126, gap: 8 }
            : { width: small ? 145 : '32%', minWidth: small ? 145 : 170, minHeight: 0 }
        }
      >
        <View style={[styles.row, { gap: 6, marginBottom: 10 }]}>
          <Button
            small
            testID="party-show-team"
            accent={!showBox}
            selected={!showBox}
            style={{ flex: 1, paddingHorizontal: 6 }}
            onPress={() => {
              setShowBox(false);
              setReleaseConfirm(null);
              if (!game.party.includes(selected)) setSelected(game.party[0]!);
              setRecall(null);
              setMoveDetail(null);
              detailRef.current?.scrollTo({ y: 0, animated: false });
            }}
          >
            队伍 {game.party.length}
            {small && !stacked ? '' : '/6'}
          </Button>
          <Button
            small
            testID="party-show-box"
            accent={showBox}
            selected={showBox}
            style={{ flex: 1, paddingHorizontal: 6 }}
            onPress={() => {
              setShowBox(true);
              setReleaseConfirm(null);
              if (game.box[0]) setSelected(game.box[0]);
              setRecall(null);
              setMoveDetail(null);
              detailRef.current?.scrollTo({ y: 0, animated: false });
            }}
          >
            仓库 {game.box.length}
          </Button>
        </View>
        {showBox && (
          <View style={{ gap: 6, marginBottom: 8 }} testID="warehouse-controls">
            <TextInput
              testID="warehouse-search"
              accessibilityLabel="搜索仓库昵称、种类或编号"
              placeholder="昵称 / 种类 / 编号"
              placeholderTextColor={palette.muted}
              value={boxQuery}
              onChangeText={(value) => {
                setBoxQuery(value);
                setReleaseConfirm(null);
              }}
              style={[
                s.searchInput,
                {
                  flex: 0,
                  minHeight: 34,
                  borderWidth: 1,
                  borderColor: palette.line,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                },
              ]}
            />
            <ScrollView
              horizontal
              style={{ flexGrow: 0, maxHeight: 34 }}
              contentContainerStyle={{ gap: 4 }}
            >
              <Button
                small
                selected={!boxType}
                onPress={() => {
                  setBoxType(null);
                  setReleaseConfirm(null);
                }}
              >
                全部属性
              </Button>
              {TYPE_IDS.map((type) => (
                <Button
                  small
                  key={type}
                  testID={`warehouse-type-${type}`}
                  selected={boxType === type}
                  onPress={() => {
                    setBoxType(type);
                    setReleaseConfirm(null);
                  }}
                >
                  {TYPES[type]}
                </Button>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              style={{ flexGrow: 0, maxHeight: 34 }}
              contentContainerStyle={{ gap: 4 }}
            >
              {(
                [
                  ['storage', '入库顺序'],
                  ['level', '等级↓'],
                  ['dex', '编号↑'],
                ] as const
              ).map(([sort, label]) => (
                <Button
                  small
                  key={sort}
                  testID={`warehouse-sort-${sort}`}
                  selected={boxSort === sort}
                  onPress={() => {
                    setBoxSort(sort);
                    setReleaseConfirm(null);
                  }}
                >
                  {label}
                </Button>
              ))}
              <Button
                small
                testID="warehouse-favorites"
                selected={favoritesOnly}
                onPress={() => {
                  setFavoritesOnly(!favoritesOnly);
                  setReleaseConfirm(null);
                }}
              >
                仅收藏
              </Button>
              <Button small testID="warehouse-reset" onPress={resetBoxFilters}>
                重置
              </Button>
            </ScrollView>
            <Label muted style={{ fontSize: 11 }}>
              显示 {boxIds.length} / {game.box.length} · 收藏仅防放生
            </Label>
          </View>
        )}
        <ScrollView
          key={stacked ? 'horizontal' : 'vertical'}
          horizontal={stacked}
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 3 }}
        >
          {!ids.length && (
            <Label muted>{game.box.length ? '没有符合筛选的伙伴。' : '仓库里暂时没有伙伴。'}</Label>
          )}
          {ids.map((id, index) => {
            const member = game.creatures[id]!;
            return (
              <Pressable
                key={id}
                testID={`party-member-${id}`}
                accessibilityRole="button"
                accessibilityLabel={`${showBox ? '仓库' : '队伍'}第${index + 1}位，${creatureName(member)}，等级${member.level}，HP ${member.hp}/${statsFor(member).hp}${!showBox && id === firstReady ? '，首发' : ''}`}
                accessibilityState={{ selected: c.id === id }}
                style={({ pressed }) => [
                  s.partnerCard,
                  stacked && { width: 180 },
                  c.id === id && s.partnerSelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setSelected(id);
                  setRecall(null);
                  setMoveDetail(null);
                  setReleaseConfirm(null);
                  detailRef.current?.scrollTo({ y: 0, animated: false });
                }}
              >
                <View style={{ alignItems: 'center', gap: 2 }}>
                  {!showBox && (
                    <Label style={{ fontSize: 10, lineHeight: 12, color: palette.gold }}>
                      {String(index + 1).padStart(2, '0')}
                      {id === firstReady ? ' · 首发' : ''}
                    </Label>
                  )}
                  <CreatureSprite speciesId={member.speciesId} size={small ? 32 : 40} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: palette.ink, fontWeight: '800', fontSize: 13 }}
                  >
                    {member.favorite ? '★ ' : ''}
                    {creatureName(member)}
                  </Text>
                  <Label muted style={{ fontSize: 10, lineHeight: 16 }}>
                    Lv.{member.level} · HP {member.hp}/{statsFor(member).hp}
                  </Label>
                  <HpBar value={member.hp} max={statsFor(member).hp} width="100%" />
                  {!!availablePoints(member) && !stacked && (
                    <Label style={{ fontSize: 10, lineHeight: 14, color: palette.gold }}>
                      待培养 {availablePoints(member)} 点
                    </Label>
                  )}
                </View>
                {c.id === id && <View style={s.partnerDot} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={{ flex: 1, minHeight: 0, gap: 8 }} testID="party-detail-column">
        <Panel testID="party-storage-toolbar" style={{ padding: 10, gap: 6 }}>
          {ids.length > 0 && (
            <>
              <View style={[styles.wrap, { alignItems: 'center' }]}>
                <Label style={{ flex: 1, minWidth: 100, fontWeight: '700' }}>
                  {creatureName(c)} · {inParty ? '队伍伙伴' : '仓库伙伴'}
                </Label>
                <Button
                  small
                  accent
                  testID={inParty ? 'party-deposit' : 'party-withdraw'}
                  accessibilityLabel={`${inParty ? '将' : '从仓库取回'}${creatureName(c)}${inParty ? '送入仓库' : '加入队伍'}`}
                  disabled={!!boxReason}
                  onPress={transferMember}
                >
                  {inParty ? '送入仓库' : '带入队伍'}
                </Button>
              </View>
              <Label muted testID="party-storage-reason" style={{ fontSize: 11 }}>
                {boxReason ??
                  '城镇内可直接存取；送入仓库不会放生或改变伙伴，最后一位可战斗伙伴必须留队。'}
              </Label>
            </>
          )}
          {!!game.notice && (
            <View testID="party-operation-notice" accessibilityLiveRegion="polite">
              <Label style={{ color: palette.accent, fontSize: 12 }}>{game.notice}</Label>
            </View>
          )}
        </Panel>
        <ScrollView
          ref={detailRef}
          testID="party-details"
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        >
          <PartyPresetsPanel game={game} dispatch={dispatch} />
          {showBox && !ids.length ? (
            <Panel>
              <Label style={styles.title}>
                {game.box.length ? '没有匹配的伙伴' : '仓库空空的'}
              </Label>
              <Label muted style={{ marginTop: 8 }}>
                {game.box.length
                  ? '试试其他名字、属性或取消仅收藏；筛选不会改变伙伴或仓库顺序。'
                  : '获得第七位伙伴时会自动送入仓库。也可以在城镇把队伍中的伙伴存入这里。'}
              </Label>
              {game.box.length > 0 && (
                <Button small onPress={resetBoxFilters}>
                  清除筛选
                </Button>
              )}
              <Button small style={{ marginTop: 12 }} onPress={() => setShowBox(false)}>
                返回队伍
              </Button>
            </Panel>
          ) : (
            <>
              <Panel
                style={[
                  styles.row,
                  { alignItems: 'center', padding: 14, backgroundColor: palette.tint },
                ]}
              >
                <CreatureSprite
                  speciesId={c.speciesId}
                  size={detailTab === 'training' ? 48 : small ? 64 : 108}
                />
                <View style={{ flex: 1 }}>
                  <Label
                    style={{ fontSize: detailTab === 'training' ? 18 : 22, fontWeight: '800' }}
                  >
                    {creatureName(c)}
                  </Label>
                  <Label muted>
                    #{species.dexNumber.toString().padStart(3, '0')}　Lv.{c.level}{' '}
                    {conditionLabels(c)
                      .map((label) => `· ${label}`)
                      .join(' ')}
                  </Label>
                  {detailTab === 'overview' && (
                    <>
                      <TypeBadges types={species.types} />
                      <HpBar value={c.hp} max={stats.hp} width="100%" />
                      <Label muted>
                        HP {c.hp}/{stats.hp}　经验 {c.experience}
                      </Label>
                      <HpBar
                        value={c.experience - xpStart}
                        max={Math.max(1, xpNext - xpStart)}
                        width="100%"
                      />
                      <Label muted style={{ fontSize: 11 }}>
                        {c.level < 100 ? `距下一级 ${xpNext - c.experience} 经验` : '已达最高等级'}
                      </Label>
                    </>
                  )}
                </View>
              </Panel>
              <Panel testID="party-management" style={{ padding: 12, gap: 8 }}>
                <Label style={{ fontWeight: '700' }}>
                  {inParty ? `队伍整理 · 当前第${partyIndex + 1}位` : '仓库管理'}
                </Label>
                <View style={styles.wrap}>
                  <Button
                    small
                    testID="party-favorite"
                    selected={c.favorite === true}
                    onPress={() => {
                      setReleaseConfirm(null);
                      dispatch({ kind: 'favorite', creatureId: c.id, value: !c.favorite });
                    }}
                  >
                    {c.favorite ? '★ 解除收藏锁定' : '☆ 收藏并锁定'}
                  </Button>
                  {inParty && (
                    <>
                      <Button
                        small
                        testID="party-move-up"
                        accessibilityLabel={`将${creatureName(c)}在队伍中上移一位`}
                        disabled={partyIndex <= 0}
                        onPress={() =>
                          dispatch({
                            kind: 'reorderParty',
                            creatureId: c.id,
                            toIndex: partyIndex - 1,
                          })
                        }
                      >
                        ↑ 上移
                      </Button>
                      <Button
                        small
                        testID="party-move-down"
                        accessibilityLabel={`将${creatureName(c)}在队伍中下移一位`}
                        disabled={partyIndex >= game.party.length - 1}
                        onPress={() =>
                          dispatch({
                            kind: 'reorderParty',
                            creatureId: c.id,
                            toIndex: partyIndex + 1,
                          })
                        }
                      >
                        ↓ 下移
                      </Button>
                      <Button
                        small
                        testID="party-set-lead"
                        disabled={partyIndex === 0}
                        onPress={() => dispatch({ kind: 'lead', creatureId: c.id })}
                      >
                        设为首位
                      </Button>
                    </>
                  )}
                </View>
                <Label muted style={{ fontSize: 11 }}>
                  {inParty
                    ? '战斗按队伍顺序选择首位可以战斗的伙伴。调整顺序后自动保存。'
                    : '取回的伙伴会加入队尾，可以在队伍页继续调整顺序。'}
                </Label>
              </Panel>
              <View style={styles.wrap}>
                <Button
                  small
                  testID="party-overview"
                  accent={detailTab === 'overview'}
                  onPress={() => setDetailTab('overview')}
                >
                  状态与技能
                </Button>
                <Button
                  small
                  testID="party-training"
                  accent={detailTab === 'training'}
                  onPress={() => setDetailTab('training')}
                >
                  能力培养 · 待加 {availablePoints(c)}
                </Button>
              </View>
              {detailTab === 'training' ? (
                <TrainingPanel key={c.id} c={c} game={game} dispatch={dispatch} />
              ) : (
                <>
                  <CreatureTraits
                    creature={c}
                    onUnequip={() => dispatch({ kind: 'equip', creatureId: c.id, itemId: null })}
                  />
                  <FriendshipPanel creature={c} game={game} dispatch={dispatch} />
                  <View style={styles.wrap}>
                    {STAT_KEYS.map((k) => (
                      <Panel key={k} style={{ padding: 10, minWidth: 80, flexGrow: 1 }}>
                        <Label muted style={{ fontSize: 11 }}>
                          {statNames[k]}
                        </Label>
                        <Label style={{ fontWeight: '800', fontSize: 20 }}>{stats[k]}</Label>
                        <Label muted style={{ fontSize: 9 }}>
                          种族 {species.baseStats[k]} · 培养 +{trainingFor(c).allocated[k]}
                        </Label>
                      </Panel>
                    ))}
                  </View>
                  <Button
                    small
                    testID="party-combat-potential"
                    onPress={() => setPotentialId(potentialId === c.id ? '' : c.id)}
                  >
                    隐藏战斗属性 · 命中 / 闪避 / 要害
                  </Button>
                  {potentialId === c.id && (
                    <Panel style={{ padding: 12, gap: 6 }}>
                      <Label style={{ color: palette.gold, fontWeight: '700' }}>隐藏战斗属性</Label>
                      <Label muted style={{ fontSize: 12 }}>
                        基础要害率 6.25%，命中要害造成普通伤害 ×2。要害等级 1 / 2 / 3 对应 12.5% /
                        25% / 50%，抗要害每级使对手概率减半。
                      </Label>
                      <Label muted style={{ fontSize: 12 }}>
                        命中与闪避初始 0
                        级，由技能临时改变；自身强化必定生效。隐藏属性不消耗能力点，换人和战斗结束后重置。
                      </Label>
                      <Label muted style={{ fontSize: 12 }}>
                        速度达到对手 2 倍时每回合可操作 2 次，3 倍及以上 3
                        次。每次结算后重新选择技能、道具或换人，单次技能只使用一次。
                      </Label>
                    </Panel>
                  )}
                  <Label style={{ color: palette.gold }}>
                    进化路线{species.evolutions.length ? '' : ' · 最终形态'}
                  </Label>
                  <View style={{ gap: 10 }}>
                    {species.evolutions.map((e) => (
                      <Panel key={e.toId} style={{ padding: 12, gap: 8 }}>
                        <Label style={{ fontSize: 12 }}>{evolutionRequirementsLabel(e)}</Label>
                        {!!e.alternatives?.length && (
                          <Label
                            muted
                            testID={`evolution-progress-${e.toId}`}
                            style={{ fontSize: 11 }}
                          >
                            {evolutionProgressLabel(c, e, game)}
                          </Label>
                        )}
                        <Button
                          small
                          testID={`evolve-${e.toId}`}
                          disabled={!canEvolve(c, e.toId, game.inventory, game)}
                          onPress={() =>
                            dispatch({
                              kind: 'evolve',
                              creatureId: c.id,
                              toId: e.toId,
                              accept: true,
                            })
                          }
                        >
                          进化为{SPECIES[e.toId]!.name}
                        </Button>
                      </Panel>
                    ))}
                  </View>
                  <View style={styles.wrap}>
                    <Button
                      small
                      testID="party-copy-skill"
                      disabled={!(game.inventory.skill_copy! > 0)}
                      onPress={() => setCopyOpen(true)}
                    >
                      复刻技能 · 持有 {game.inventory.skill_copy ?? 0}
                    </Button>
                  </View>
                  {!inParty && isTownLocation(game.player.map) && (
                    <Panel>
                      {c.favorite ? (
                        <Label muted testID="party-release-locked">
                          已收藏锁定，解除收藏后才能放生。存取仓库不受影响。
                        </Label>
                      ) : releaseConfirm === c.id ? (
                        <>
                          <Label>
                            将让{creatureName(c)}
                            回到保育区，移除这只个体。图鉴、剧情与冠军名录保留。确认后可从存档历史恢复整份旧进度。
                          </Label>
                          <View style={styles.wrap}>
                            <Button
                              small
                              onPress={() => {
                                dispatch({ kind: 'release', creatureId: c.id });
                                setReleaseConfirm(null);
                              }}
                            >
                              确认放生{creatureName(c)}
                            </Button>
                            <Button small onPress={() => setReleaseConfirm(null)}>
                              取消
                            </Button>
                          </View>
                        </>
                      ) : (
                        <Button small onPress={() => setReleaseConfirm(c.id)}>
                          放生到保育区…
                        </Button>
                      )}
                    </Panel>
                  )}
                  <Label style={{ fontWeight: '700' }}>
                    {recall
                      ? `回忆${MOVES[recall]!.name} · 选择要替换的技能`
                      : '已学技能 · 点击查看详情'}
                  </Label>
                  {recall && (
                    <MoveLearningPanel
                      key={`${c.id}:${recall}`}
                      c={c}
                      moveId={recall}
                      testID="recall"
                      onLearn={(replace) => {
                        dispatch({ kind: 'recall', creatureId: c.id, moveId: recall, replace });
                        setMoveDetail(recall);
                        setRecall(null);
                      }}
                      onCancel={() => setRecall(null)}
                    />
                  )}
                  {!recall &&
                    c.moves.map((m) => (
                      <Button
                        key={m.id}
                        small
                        testID={`party-move-${m.id}`}
                        accent={moveDetail === m.id}
                        onPress={() => {
                          setMoveDetail(moveDetail === m.id ? null : m.id);
                        }}
                      >{`${MOVES[m.id]!.name}${MOVES[m.id]!.exclusiveSpeciesId ? '〔专属〕' : ''}　${MOVES[m.id]!.type ? TYPES[MOVES[m.id]!.type!] : '无属性'}　PP ${m.pp}/${MOVES[m.id]!.pp}${recall ? '　← 替换' : ''}`}</Button>
                    ))}
                  {!recall && move && <MoveDetails moveId={move.id} />}
                  {!!c.taughtMoves?.length && (
                    <Label muted style={{ fontSize: 12 }}>
                      通用技能册：{c.taughtMoves.map((id) => MOVES[id]!.name).join('、')}
                      。进化后保留，城镇可免费回忆。
                    </Label>
                  )}
                  {isTownLocation(game.player.map) && (
                    <View style={styles.wrap}>
                      {recallOptions(c)
                        .filter(
                          (m) =>
                            fieldSkillUnlocked(game, m.moveId) &&
                            (!fieldSkill(m.moveId) || atCenter(game)),
                        )
                        .filter((m) => !c.moves.some((known) => known.id === m.moveId))
                        .map((m) => (
                          <Button
                            key={m.moveId}
                            small
                            accent={recall === m.moveId}
                            onPress={() => setRecall(recall === m.moveId ? null : m.moveId)}
                          >
                            回忆{m.copied ? ' · 复刻' : ''}：{MOVES[m.moveId]!.name}
                          </Button>
                        ))}
                    </View>
                  )}
                  <Label style={{ fontWeight: '700' }}>成长足迹</Label>
                  {c.history.map((h, i) => (
                    <Label key={i} muted style={{ fontSize: 12 }}>
                      Lv.{h.level} · {h.label}
                    </Label>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
      {copyOpen && (
        <SkillCopyMenu
          game={game}
          dispatch={dispatch}
          initialTargetId={c.id}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </View>
  );
}
export function DexMenu({
  game,
  dispatch,
  onOpenRegion,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  onOpenRegion: (map: MapId) => void;
}) {
  const { height } = useWindowDimensions();
  const short = height < 450;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeId | null>(null);
  const [selected, setSelected] = useState(game.dex.caught[0] ?? ALL_SPECIES[0]!.id);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const search = query.trim().replace(/^#/, '');
  const columns = contentWidth >= 700 ? 2 : 1;
  const data = useMemo(
    () =>
      ALL_SPECIES.filter((s) => {
        const seen = game.dex.seen.includes(s.id);
        return (
          (!ownedOnly || game.dex.caught.includes(s.id)) &&
          (!filter || (seen && s.types.includes(filter))) &&
          (!search ||
            String(s.dexNumber).padStart(3, '0').includes(search) ||
            (seen && s.name.includes(search)))
        );
      }),
    [filter, game.dex.caught, game.dex.seen, ownedOnly, search],
  );
  const selectedId = data.find((s) => s.id === selected)?.id ?? data[0]?.id;
  const resetFilters = () => {
    setQuery('');
    setFilter(null);
    setOwnedOnly(false);
  };
  return (
    <View
      testID="dex-screen"
      style={s.dex}
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
    >
      {!short && (
        <View style={s.dexHeading}>
          <Label style={{ fontSize: 20, lineHeight: 26, fontWeight: '800' }}>精灵图鉴</Label>
          <Label muted style={{ fontSize: 11 }}>
            已见 {game.dex.seen.length} · 已得 {game.dex.caught.length} / 250
          </Label>
        </View>
      )}
      <View style={[s.searchBar, searchFocused && { borderColor: palette.accent }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
          <Circle
            cx={10.5}
            cy={10.5}
            r={6.5}
            stroke={palette.muted}
            strokeWidth={1.8}
            fill="none"
          />
          <Path d="M16 16l4 4" stroke={palette.muted} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <TextInput
          testID="dex-search"
          accessibilityLabel="搜索精灵编号或已见名字"
          style={s.searchInput}
          placeholder="编号 / 已见精灵名字"
          placeholderTextColor={palette.muted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <Pressable
            testID="dex-search-clear"
            accessibilityRole="button"
            accessibilityLabel="清空搜索"
            onPress={() => setQuery('')}
            style={({ pressed }) => [s.searchClear, pressed && styles.pressed]}
          >
            <Label style={{ fontSize: 21, lineHeight: 24 }}>×</Label>
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ScrollView
          testID="dex-type-filters"
          horizontal
          style={{ flex: 1, minWidth: 0, height: 36 }}
          contentContainerStyle={{ gap: 6, alignItems: 'center' }}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Button small selected={!filter} onPress={() => setFilter(null)}>
            全部
          </Button>
          {TYPE_IDS.map((t) => (
            <Button
              key={t}
              small
              selected={filter === t}
              onPress={() => setFilter(filter === t ? null : t)}
            >
              {TYPES[t]}
            </Button>
          ))}
        </ScrollView>
        <Button
          small
          testID="dex-owned"
          selected={ownedOnly}
          onPress={() => setOwnedOnly(!ownedOnly)}
        >
          已获得
        </Button>
      </View>
      <View style={[s.dexBody, contentWidth < 360 && { flexDirection: 'column' }]}>
        <View
          style={[
            { flex: 1, minWidth: 0, minHeight: 0, gap: 6 },
            contentWidth < 360 && { flex: 0, height: Math.min(180, height * 0.24) },
          ]}
        >
          <Label testID="dex-result-count" muted style={{ fontSize: 11 }}>
            {data.length} 条记录{short ? ` · 已得 ${game.dex.caught.length}/250` : ''}
          </Label>
          <FlatList
            testID="dex-results"
            key={columns}
            style={{ flex: 1 }}
            data={data}
            ListEmptyComponent={
              <View style={{ gap: 10, padding: 12 }}>
                <Label muted>暂无匹配记录</Label>
                <Button small onPress={resetFilters}>
                  重置筛选
                </Button>
              </View>
            }
            numColumns={columns}
            keyExtractor={(item) => item.id}
            extraData={selectedId}
            columnWrapperStyle={columns > 1 ? { gap: 6 } : undefined}
            contentContainerStyle={{ gap: 6, paddingBottom: 15 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const visible = game.dex.seen.includes(item.id);
              return (
                <Pressable
                  testID={`dex-entry-${item.dexNumber}`}
                  accessibilityRole="button"
                  accessibilityLabel={`编号${item.dexNumber} ${visible ? item.name : '尚未发现'}`}
                  accessibilityState={{ selected: selectedId === item.id }}
                  style={({ pressed }) => [
                    s.dexEntry,
                    columns > 1 && { maxWidth: '50%' },
                    selectedId === item.id && s.dexEntrySelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelected(item.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <View style={s.dexThumb}>
                      <CreatureSprite speciesId={item.id} size={38} unknown={!visible} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Label muted style={{ fontSize: 10, lineHeight: 14 }}>
                          #{String(item.dexNumber).padStart(3, '0')}
                        </Label>
                        {game.dex.caught.includes(item.id) && (
                          <Label style={{ color: palette.accent, fontSize: 10, lineHeight: 14 }}>
                            ●
                          </Label>
                        )}
                      </View>
                      <Text numberOfLines={1} style={s.dexEntryName}>
                        {visible ? item.name : '？？？'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
        <ScrollView
          key={selectedId ?? 'empty'}
          testID="dex-details"
          style={s.dexDetails}
          contentContainerStyle={{ gap: 10, padding: contentWidth < 560 ? 10 : 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {selectedId ? (
            <DexDetails
              game={game}
              speciesId={selectedId}
              compact={short || contentWidth < 560}
              dispatch={dispatch}
              onOpenRegion={onOpenRegion}
            />
          ) : (
            <View style={{ gap: 12, alignItems: 'flex-start' }}>
              <Label style={{ fontSize: 17, fontWeight: '700' }}>没有匹配的精灵</Label>
              <Label muted>试试其他编号、已见名字或属性。</Label>
              <Button small onPress={resetFilters}>
                重置筛选
              </Button>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
function DexDetails({
  game,
  speciesId,
  compact,
  dispatch,
  onOpenRegion,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  onOpenRegion: (map: MapId) => void;
  speciesId: string;
  compact: boolean;
}) {
  const species = SPECIES[speciesId]!;
  const seen = game.dex.seen.includes(speciesId);
  const caught = game.dex.caught.includes(speciesId);
  return (
    <>
      <CreatureSprite speciesId={speciesId} size={compact ? 88 : 120} unknown={!seen} />
      <Label style={{ fontSize: 23, fontWeight: '800' }}>{seen ? species.name : '尚未发现'}</Label>
      <Label muted>
        #{String(species.dexNumber).padStart(3, '0')}　
        {caught ? '已获得' : seen ? '已见过' : '等待与你相遇'}
      </Label>
      {seen && (
        <>
          <TypeBadges types={species.types} />
          <Label style={{ color: palette.gold, fontWeight: '700' }}>
            特性 · {abilityFor({ speciesId }).name}
          </Label>
          <Label muted style={{ fontSize: 12 }}>
            {abilityFor({ speciesId }).description}
          </Label>
          <HabitatDetails speciesId={species.id} seenSpeciesIds={game.dex.seen} />
          <CaptureTargetPanel
            game={game}
            speciesId={species.id}
            dispatch={dispatch}
            onOpenRegion={onOpenRegion}
          />
          <Label style={{ fontSize: 12 }}>属性弱点与免疫</Label>
          <View style={styles.wrap}>
            {TYPE_IDS.filter((t) => typeMultiplier(t, species.types) !== 1).map((t) => (
              <Label
                key={t}
                style={{
                  fontSize: 11,
                  color: typeMultiplier(t, species.types) === 0 ? palette.gold : palette.muted,
                }}
              >
                {TYPES[t]} ×{typeMultiplier(t, species.types)}
              </Label>
            ))}
          </View>
          {caught ? (
            <>
              <Label style={{ color: palette.gold, fontSize: 12 }}>{evolutionLabel(species)}</Label>
              <Label muted style={{ fontSize: 12 }}>
                基础能力总和 {species.baseStatTotal} · {species.experienceCurve}
              </Label>
              <View style={styles.wrap}>
                {STAT_KEYS.map((k) => (
                  <Label key={k} muted style={{ fontSize: 12 }}>
                    {statNames[k]} {species.baseStats[k]}
                  </Label>
                ))}
              </View>
              <Label muted style={{ fontSize: 12 }}>
                在「伙伴」查看当前能力、自由加点与成长记录。
              </Label>
              <TrainingPlanView speciesId={species.id} />
              <Label style={{ fontSize: 12 }}>可学技能</Label>
              {learnset(species.id).map((m) => (
                <Label muted key={m.moveId} style={{ fontSize: 12 }}>
                  Lv.{m.level}　{MOVES[m.moveId]!.name}
                  {MOVES[m.moveId]!.exclusiveSpeciesId ? '〔专属 · 不可复刻〕' : ''}
                </Label>
              ))}
            </>
          ) : (
            <Label muted>获得后开放进化、能力和技能资料。</Label>
          )}
        </>
      )}
      {!seen && (
        <Label muted>探索草丛、与训练师对战来发现新的伙伴。后续章节的物种会逐步开放。</Label>
      )}
    </>
  );
}
export { QuestMenu } from '../QuestMenu';
export function StarterChoice({ dispatch }: { dispatch: (c: Command) => void }) {
  const [selected, setSelected] = useState(STARTERS[0]!);
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="professor-bag-choice"
      role="dialog"
      aria-modal
      accessibilityViewIsModal
      style={[
        s.overlay,
        {
          paddingLeft: 18 + insets.left,
          paddingRight: 18 + insets.right,
          paddingTop: 12 + insets.top,
          paddingBottom: 12 + insets.bottom,
          gap: 10,
        },
      ]}
    >
      <Label style={{ fontSize: 21, lineHeight: 27, fontWeight: '900', color: palette.gold }}>
        博士掉落的背包
      </Label>
      <Label muted>岚博士：快从里面借用一位伙伴，帮我赶开绒团鼠！</Label>
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        {STARTERS.map((id) => (
          <Panel
            key={id}
            style={{
              flex: 1,
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: selected === id ? palette.gold : palette.line,
            }}
          >
            <CreatureSprite speciesId={id} size={80} animate={selected === id} />
            <Label style={{ fontSize: 18, fontWeight: '800' }}>{SPECIES[id]!.name} · Lv.5</Label>
            <TypeBadges types={SPECIES[id]!.types} />
            <Button
              small
              accent={selected === id}
              testID={`starter-${id}`}
              onPress={() => setSelected(id)}
            >
              {selected === id ? '已选中' : '看看这只'}
            </Button>
          </Panel>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Label muted style={{ flex: 1, fontSize: 12 }}>
          先借用它完成救援。博士会在研究所正式把伙伴交给你。
        </Label>
        <Button
          accent
          testID="confirm-borrow-starter"
          onPress={() => dispatch({ kind: 'chooseStarter', speciesId: selected })}
        >
          就借用{SPECIES[selected]!.name}！
        </Button>
      </View>
    </View>
  );
}
export function HelpMenu() {
  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Label style={styles.title}>旅行小贴士</Label>
      {[
        '方向键：上下左右移动与转身，按住持续移动，松手停止；A：面向相邻人物或物体交谈、调查。电脑可同时按 WASD / 箭头组合斜走，Enter / Z 交谈。',
        '草丛会遇到野生精灵。捕捉时先削弱对方；睡眠、麻痹等异常会提高捕获率。',
        '精灵按生境出没：林冠有萤灯蛾、湿岸有荷叶蛙、矿山暗河有滴石鲶。站在岸边面向水面按 A 调查；图鉴与地区地图可查栖息地。',
        '队伍最多 6 只，多出的精灵进入仓库。伙伴详情顶部可以主动送入仓库或取回，城镇及其室内均可使用；上移、下移或设为首位可调整出场顺序，整理后自动保存。技能可在城镇免费回忆。',
        '进化可以暂缓，在伙伴详情里再次进化。成长果可升一级；石壳虫 Lv.10、初始伙伴 Lv.16 有进化机会。',
        '满级 100 级，每次升级随机获得 1–10 能力点，精灵成长强度越高越容易获得高点数；伙伴详情可手动加点或自动培养，1 点直接增加对应能力 1 点。',
        '默认有效速度快者先出手，首次技能仍比较优先度。速度达到对手 2 倍可操作 2 次，3 倍及以上 3 次；每条指令只执行一次，结算后重新选择技能、道具或换人。',
        '双方行动额度在第一次操作前固定，速度变化影响下一回合，换人不补次数。用药、主动换人、投球和逃跑各占一次操作；昏厥取消本轮剩余行动，强制补位免费。异常与天气每轮结算一次，读档保留剩余额度。',
        '冰冻时除伤害类火属性技能外无法出招，每轮仅有一次 20% 的自然解冻机会；使用伤害类火属性技能或受到火属性技能伤害时解冻。冰属性精灵免疫冰冻，晴天不会新增冰冻。',
        '混乱可与其他异常并存，持续 2–5 个可行动回合；每回合仅判定一次，1/3 概率自伤并阻止本轮后续出招（用药或果实解除后可恢复），被睡眠、冰冻或麻痹阻止行动时不扣持续回合。换下或战斗结束时解除。清醒露和解除全部异常的果实可同时清除冰冻及混乱。',
        '隐藏战斗属性有命中、闪避、要害率与抗要害。凝神提高要害率，鹰眼提高命中，影步提升闪避，守心降低受到要害攻击的概率，轻身提升速度；破绽突刺自带更高要害率。',
        '普通技能基础要害率 6.25%，要害等级 1 / 2 / 3 为 12.5% / 25% / 50%；守心每级使概率减半。要害造成普通伤害 ×2，不翻倍治疗或异常伤害；换人会重置战斗强化。',
        '城市任务日志可以接受居民委托，领奖获得调查印记。背包里的商店可购买星纹球和补给，印记可兑换特殊道具。',
        '技能复刻剂可在各城花 600 旅费购买或用 3 枚调查印记兑换；晨芽镇培养委托也会赠送一瓶。从背包或伙伴详情选择来源技能和接收伙伴，满四招时选择替换。',
        '复刻不限制种族、属性与等级，来源不失去技能或 PP；成功才消耗一瓶。复刻技能记入技能册，进化后保留，遗忘后可在城镇免费回忆。',
        '已确认的点数不能在伙伴页撤回。到背包使用重塑药剂可返还已用能力点；需在城镇、满体力、无异常，等级和随机成长记录不变。',
        '重大进度立即保存，探索每 10 秒自动保存。菜单中的本地存档可手动保存或恢复历史。',
        '同网传档：接收手机先等待，发送手机搜索并扫描接收手机的二维码。接收端选择槽位并确认后才导入。',
        'Android 与 iPhone 安装版支持原生局域网；网页预览用于试玩，存档使用该浏览器的本地空间。',
      ].map((t, index) => (
        <Panel key={t} style={{ padding: 14, flexDirection: 'row', gap: 12 }}>
          <Label style={{ color: palette.gold, fontSize: 12, fontWeight: '800' }}>
            {String(index + 1).padStart(2, '0')}
          </Label>
          <Label style={{ flex: 1 }}>{t}</Label>
        </Panel>
      ))}
    </ScrollView>
  );
}
export function PendingScreen({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const insets = useSafeAreaInsets();
  const choice = game.pending[0]!;
  const c = game.creatures[choice.creatureId]!;
  return (
    <View
      style={[
        s.overlay,
        {
          paddingLeft: 24 + insets.left,
          paddingRight: 24 + insets.right,
          paddingTop: 24 + insets.top,
          paddingBottom: 24 + insets.bottom,
          justifyContent: 'center',
        },
      ]}
    >
      <Panel style={{ maxWidth: 900, width: '100%', maxHeight: '100%', alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {choice.kind === 'evolution' ? (
            <>
              <Label style={styles.title}>伙伴正在发生变化</Label>
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <View style={{ alignItems: 'center' }}>
                  <CreatureSprite speciesId={c.speciesId} size={110} />
                  <Label>{creatureName(c)}</Label>
                  <TypeBadges types={SPECIES[c.speciesId]!.types} />
                </View>
                <Label style={{ fontSize: 26, color: palette.gold }}>→</Label>
                <View style={{ alignItems: 'center' }}>
                  <CreatureSprite speciesId={choice.toId} size={110} />
                  <Label>{SPECIES[choice.toId]!.name}</Label>
                  <TypeBadges types={SPECIES[choice.toId]!.types} />
                </View>
              </View>
              <Label muted>
                等级、经验、能力点、亲密度与成长记录会保留。也可以稍后在伙伴详情中进化。
              </Label>
              <Label muted style={{ fontSize: 12 }}>
                {evolutionProgressLabel(
                  c,
                  SPECIES[c.speciesId]!.evolutions.find((edge) => edge.toId === choice.toId)!,
                  game,
                )}
              </Label>
              <View style={styles.row}>
                <Button
                  accent
                  disabled={!canEvolve(c, choice.toId, game.inventory, game)}
                  onPress={() =>
                    dispatch({ kind: 'evolve', creatureId: c.id, toId: choice.toId, accept: true })
                  }
                >
                  见证进化
                </Button>
                <Button
                  onPress={() =>
                    dispatch({ kind: 'evolve', creatureId: c.id, toId: choice.toId, accept: false })
                  }
                >
                  暂缓进化
                </Button>
              </View>
            </>
          ) : (
            <>
              <Label style={styles.title}>{creatureName(c)}想学新技能</Label>
              <MoveLearningPanel
                key={`${c.id}:${choice.moveId}`}
                c={c}
                moveId={choice.moveId}
                testID="learn"
                onLearn={(replace) =>
                  dispatch({ kind: 'learn', creatureId: c.id, moveId: choice.moveId, replace })
                }
                onCancel={() =>
                  dispatch({
                    kind: 'learn',
                    creatureId: c.id,
                    moveId: choice.moveId,
                    replace: null,
                  })
                }
              />
            </>
          )}
        </ScrollView>
      </Panel>
    </View>
  );
}
export const menuStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 10,
    color: palette.text,
    backgroundColor: palette.panel,
    fontSize: 14,
    minHeight: 43,
  },
});
const s = StyleSheet.create({
  dex: { flex: 1, minHeight: 0, minWidth: 0, gap: 10 },
  dexHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    backgroundColor: palette.panel,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    paddingVertical: 8,
    color: palette.text,
    fontSize: 14,
    outlineWidth: 0,
    outlineStyle: 'solid',
  },
  searchClear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dexBody: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 },
  dexEntry: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 9,
    backgroundColor: palette.panel,
    gap: 3,
  },
  dexEntrySelected: { borderColor: palette.amber, backgroundColor: palette.tint },
  dexThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dexEntryName: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  dexDetails: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.panel,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
  partnerSelected: { backgroundColor: palette.tint, borderColor: palette.amber },
  partnerDot: { width: 5, height: 22, borderRadius: 3, backgroundColor: palette.amber },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: palette.canvas },

  frameIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    gap: 2,
  },
  secondaryTab: {
    minWidth: 44,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: menuStyles.input,
});
