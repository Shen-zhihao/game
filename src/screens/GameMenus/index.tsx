import { HapticPressable as Pressable } from '../../components/HapticPressable';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ALL_SPECIES,
  learnset,
  MOVES,
  SPECIES,
  STARTERS,
  TYPE_IDS,
  TYPES,
} from '../../content/catalog';
import { isTownLocation, objective } from '../../content/world';
import { CreatureSprite } from '../../components/CreatureSprite';
import { MoveDetails, MoveLearningPanel } from '../../components/MoveDetails';
import { Button, HpBar, Label, palette, Panel, styles, TypeBadges } from '../../components/ui';
import { Command, GameState, STAT_KEYS, TypeId } from '../../game/model';
import {
  canEvolve,
  creatureName,
  evolutionLabel,
  statsFor,
  typeMultiplier,
  xpAt,
} from '../../game/rules';
import { statusName } from '../BattleScreen';
import { CityQuestBoard } from '../CityMenus';
import { TrainingPanel, TrainingPlanView } from '../TrainingPanel';
import { availablePoints, trainingFor } from '../../game/growth';
import { STAT_NAMES } from '../../content/training';
import { recallOptions } from '../../game/skills';
import { SkillCopyMenu } from '../SkillCopyMenu';
import { HabitatDetails } from '../../components/HabitatDetails';
import { atCenter, fieldSkill, fieldSkillUnlocked } from '../../game/fieldSkills';
import { ADVENTURE_CHAPTERS } from '../../content/adventure';
import { LEAGUE_MILESTONES } from '../../content/league';
import { CONSERVATION_CONTENT } from '../../content/conservation';
export { RegionMenu } from '../RegionMenu';
export { BagMenu } from '../CityMenus';

export type MenuName =
  | 'party'
  | 'center'
  | 'environment'
  | 'bag'
  | 'dex'
  | 'quests'
  | 'map'
  | 'save'
  | 'transfer'
  | 'settings';
export const MENU_NAMES: Record<MenuName, string> = {
  party: '伙伴',
  center: '精灵中心',
  environment: '天气与生态',
  bag: '背包与商店',
  dex: '精灵图鉴',
  quests: '任务日志',
  map: '地区地图',
  save: '本地存档',
  transfer: '存档互传',
  settings: '设置',
};
export function MenuFrame({
  menu,
  onMenu,
  onClose,
  children,
}: {
  menu: MenuName;
  onMenu: (m: MenuName) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < 450;
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    enter.setValue(0);
    const animation = Animated.timing(enter, { toValue: 1, duration: 170, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [menu, enter]);
  return (
    <View
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
      <View style={[s.menuHead, compact && { height: 48 }]}>
        <Label style={{ fontSize: 21, fontWeight: '800', letterSpacing: 1 }}>
          旅行手册{' '}
          <Label muted style={{ fontSize: 12 }}>
            {' '}
            / {MENU_NAMES[menu]}
          </Label>
        </Label>
        <Button small testID="menu-close" onPress={onClose}>
          返回冒险 ×
        </Button>
      </View>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView
          style={[s.menuNav, compact && { width: 112 }]}
          contentContainerStyle={{ gap: compact ? 4 : 6, padding: 8 }}
        >
          {(Object.keys(MENU_NAMES) as MenuName[]).map((m, index) => (
            <Pressable
              key={m}
              testID={`menu-${m}`}
              accessibilityRole="button"
              accessibilityLabel={MENU_NAMES[m]}
              accessibilityState={{ selected: menu === m }}
              onPress={() => onMenu(m)}
              style={({ pressed }) => [
                s.navItem,
                compact && { minHeight: 36, paddingVertical: 6 },
                menu === m && s.navSelected,
                pressed && { opacity: 0.72, transform: [{ scale: 0.96 }] },
              ]}
            >
              {!compact && (
                <Label style={{ fontSize: 11, color: menu === m ? palette.ink : '#789887' }}>
                  {String(index + 1).padStart(2, '0')}
                </Label>
              )}
              <Label
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: '700',
                  color: menu === m ? palette.ink : palette.text,
                }}
              >
                {MENU_NAMES[m]}
              </Label>
              {menu === m && !compact && (
                <Label style={{ color: palette.ink, fontSize: 11 }}>▸</Label>
              )}
            </Pressable>
          ))}
        </ScrollView>
        <Animated.View
          testID={`menu-content-${menu}`}
          style={{
            flex: 1,
            padding: compact ? 12 : 16,
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) },
            ],
          }}
        >
          {children}
        </Animated.View>
      </View>
    </View>
  );
}
const statNames = STAT_NAMES;
export function PartyMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [detailTab, setDetailTab] = useState<'overview' | 'training'>(() =>
    game.party[0] && availablePoints(game.creatures[game.party[0]]!) > 0 ? 'training' : 'overview',
  );
  const [selected, setSelected] = useState(game.party[0]!);
  const [showBox, setShowBox] = useState(false);
  const [recall, setRecall] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [potentialId, setPotentialId] = useState('');
  const [moveDetail, setMoveDetail] = useState<string | null>(null);
  const [releaseConfirm, setReleaseConfirm] = useState<string | null>(null);
  const ids = showBox ? game.box : game.party;
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
  const boxReason = !isTownLocation(game.player.map)
    ? '在城镇可使用仓库与技能回忆。'
    : inParty && !game.party.some((id) => id !== c.id && game.creatures[id]!.hp > 0)
      ? '队伍需要保留至少一位可以战斗的伙伴。'
      : !inParty && game.party.length >= 6
        ? '队伍已满，请先让一位伙伴进入仓库。'
        : inParty && game.box.length >= 360
          ? '仓库已满。'
          : null;
  const move =
    moveDetail && c.moves.some((known) => known.id === moveDetail) ? MOVES[moveDetail] : null;
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
      <View style={{ width: '32%' }}>
        <View style={[styles.row, { gap: 6, marginBottom: 10 }]}>
          <Button
            small
            accent={!showBox}
            selected={!showBox}
            onPress={() => {
              setShowBox(false);
              if (!game.party.includes(selected)) setSelected(game.party[0]!);
              setRecall(null);
              setMoveDetail(null);
            }}
          >
            队伍 {game.party.length}/6
          </Button>
          <Button
            small
            accent={showBox}
            selected={showBox}
            onPress={() => {
              setShowBox(true);
              if (game.box[0]) setSelected(game.box[0]);
              setRecall(null);
              setMoveDetail(null);
            }}
          >
            仓库 {game.box.length}
          </Button>
        </View>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {!ids.length && <Label muted>仓库里暂时没有伙伴。</Label>}
          {ids.map((id) => {
            const member = game.creatures[id]!;
            return (
              <Button
                key={id}
                small
                accent={c.id === id}
                selected={c.id === id}
                onPress={() => {
                  setSelected(id);
                  setRecall(null);
                  setMoveDetail(null);
                }}
              >{`${creatureName(member)} · Lv.${member.level}\nHP ${member.hp}/${statsFor(member).hp}${availablePoints(member) ? ` · 待加 ${availablePoints(member)} 点` : ''}`}</Button>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
        {showBox && !ids.length ? (
          <Panel>
            <Label style={styles.title}>仓库空空的</Label>
            <Label muted style={{ marginTop: 8 }}>
              获得第七位伙伴时会自动送入仓库。也可以在城镇把队伍中的伙伴存入这里。
            </Label>
            <Button small style={{ marginTop: 12 }} onPress={() => setShowBox(false)}>
              返回队伍
            </Button>
          </Panel>
        ) : (
          <>
            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <CreatureSprite speciesId={c.speciesId} size={detailTab === 'training' ? 48 : 108} />
              <View style={{ flex: 1 }}>
                <Label style={{ fontSize: detailTab === 'training' ? 18 : 22, fontWeight: '800' }}>
                  {creatureName(c)}
                </Label>
                <Label muted>
                  #{species.dexNumber.toString().padStart(3, '0')}　Lv.{c.level}{' '}
                  {c.status ? `· ${statusName(c.status)}` : ''}
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
            </View>
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
                      基础要害率 6.25%，命中要害造成普通伤害 ×2。要害等级 1 / 2 / 3 对应 12.5% / 25%
                      / 50%，抗要害每级使对手概率减半。
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
                <Label style={{ color: palette.gold }}>{evolutionLabel(species)}</Label>
                <View style={styles.wrap}>
                  {species.evolutions.map((e) => (
                    <Button
                      key={e.toId}
                      small
                      disabled={!canEvolve(c, e.toId, game.inventory)}
                      onPress={() =>
                        dispatch({ kind: 'evolve', creatureId: c.id, toId: e.toId, accept: true })
                      }
                    >
                      进化为{SPECIES[e.toId]!.name}
                    </Button>
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
                  <Button
                    small
                    disabled={!game.party.includes(c.id) || game.party[0] === c.id}
                    onPress={() => dispatch({ kind: 'lead', creatureId: c.id })}
                  >
                    设为首位
                  </Button>
                  <Button
                    small
                    disabled={!!boxReason}
                    onPress={() => dispatch({ kind: 'box', creatureId: c.id, withdraw: !inParty })}
                  >
                    {inParty ? '放入仓库' : '带入队伍'}
                  </Button>
                </View>
                {boxReason && (
                  <Label muted style={{ fontSize: 12 }}>
                    {boxReason}
                  </Label>
                )}
                {!inParty && isTownLocation(game.player.map) && (
                  <Panel>
                    {releaseConfirm === c.id ? (
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
                {!!game.notice && (
                  <View testID="party-operation-notice" accessibilityLiveRegion="polite">
                    <Label style={{ color: palette.mint, fontSize: 12 }}>{game.notice}</Label>
                  </View>
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
export function DexMenu({ game }: { game: GameState }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeId | null>(null);
  const [selected, setSelected] = useState(game.dex.caught[0]!);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const data = useMemo(
    () =>
      ALL_SPECIES.filter((s) => {
        const seen = game.dex.seen.includes(s.id);
        return (
          (!ownedOnly || game.dex.caught.includes(s.id)) &&
          (!filter || (seen && s.types.includes(filter))) &&
          (!query || String(s.dexNumber).includes(query) || (seen && s.name.includes(query)))
        );
      }),
    [filter, game.dex.caught, game.dex.seen, ownedOnly, query],
  );
  const species = SPECIES[selected]!;
  const seen = game.dex.seen.includes(selected);
  const caught = game.dex.caught.includes(selected);
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
      <View style={{ flex: 1 }}>
        <TextInput
          style={s.input}
          placeholder="搜索编号 / 已见精灵名字"
          placeholderTextColor={palette.muted}
          value={query}
          onChangeText={setQuery}
        />
        <ScrollView
          horizontal
          style={{ maxHeight: 43, marginVertical: 8 }}
          contentContainerStyle={{ gap: 5 }}
        >
          <Button small accent={!filter} onPress={() => setFilter(null)}>
            全部
          </Button>
          {TYPE_IDS.map((t) => (
            <Button
              key={t}
              small
              accent={filter === t}
              onPress={() => setFilter(filter === t ? null : t)}
            >
              {TYPES[t]}
            </Button>
          ))}
        </ScrollView>
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <Label muted style={{ fontSize: 11 }}>
            已见 {game.dex.seen.length} · 已得 {game.dex.caught.length} / 250
          </Label>
          <Button small accent={ownedOnly} onPress={() => setOwnedOnly(!ownedOnly)}>
            已获得
          </Button>
        </View>
        <FlatList
          data={data}
          ListEmptyComponent={
            <Label muted style={{ padding: 12 }}>
              没有符合条件的精灵，试试其他属性或搜索词。
            </Label>
          }
          numColumns={2}
          keyExtractor={(item) => item.id}
          extraData={selected}
          columnWrapperStyle={{ gap: 6 }}
          contentContainerStyle={{ gap: 6, paddingBottom: 15 }}
          renderItem={({ item }) => {
            const visible = game.dex.seen.includes(item.id);
            return (
              <Button
                small
                accent={selected === item.id}
                style={{ flex: 1, paddingHorizontal: 5 }}
                onPress={() => setSelected(item.id)}
              >{`#${String(item.dexNumber).padStart(3, '0')} ${visible ? item.name : '？？？'} ${game.dex.caught.includes(item.id) ? '●' : ''}`}</Button>
            );
          }}
        />
      </View>
      <ScrollView
        style={{ width: '43%' }}
        contentContainerStyle={{ gap: 10, alignItems: 'flex-start' }}
      >
        <CreatureSprite speciesId={selected} size={135} unknown={!seen} />
        <Label style={{ fontSize: 23, fontWeight: '800' }}>
          {seen ? species.name : '尚未发现'}
        </Label>
        <Label muted>
          #{String(species.dexNumber).padStart(3, '0')}　
          {caught ? '已获得' : seen ? '已见过' : '等待与你相遇'}
        </Label>
        {seen && (
          <>
            <TypeBadges types={species.types} />
            <HabitatDetails speciesId={species.id} />
            <Label style={{ fontSize: 12 }}>弱点与免疫</Label>
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
                <Label style={{ color: palette.gold, fontSize: 12 }}>
                  {evolutionLabel(species)}
                </Label>
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
      </ScrollView>
    </View>
  );
}
export function QuestMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const f = game.progress.flags;
  const milestones: [string, boolean][] = [
    ...CONSERVATION_CONTENT.milestones.map(([label, flag]): [string, boolean] => [
      label,
      !!f[flag],
    ]),
    ...LEAGUE_MILESTONES.map(([label, flag]): [string, boolean] => [label, !!f[flag]]),
    ...(f.opening
      ? ([
          ['搬家 · 认识邻居阿澈', !!f.neighborMet],
          ['呼救 · 在一号路救出岚博士', !!f.professorRescued],
          ['同行 · 正式获得第一位伙伴', !!f.partnerReceived],
        ] as [string, boolean][])
      : []),
    ['启程 · 与阿澈练习对战', !!f.rival],
    ...(f.opening
      ? ([['登记 · 回研究所领取图鉴与捕捉补给', !!f.fieldKitReceived]] as [string, boolean][])
      : []),
    ['相遇 · 学会捕捉精灵', !!f.catchTutorial],
    ['求助 · 接受穗禾的委托', !!f.quest],
    ['追踪 · 调查两处森林线索', !!f.clueOne && !!f.clueTwo],
    ['开路 · 采集员协助，推动倒木', !!f.logMoved],
    ['微芒 · 击退定序社，救回萤灯蛾', !!f.rescued],
    ['归来 · 回镇报告并领取奖励', !!f.questReward],
    ['枝叶 · 通过草系馆练习并赢得徽章', !!f.leader],
    ['砾岩 · 通过岩石馆练习并赢得徽章', !!f.rockLeader],
    ['石壳虫的新家 · 清理山道栖地', !!f.habitatClean],
    ['矿车旁的旧牌 · 找回并归还工牌', !!f.plaqueReturned],
    ['钟石旧约 · 剧情相遇并获得鸣钟石', !!f.bellCaught],
    ['矿山异常 · 接受砚叔的调查委托', !!f.mineQuest],
    ['共鸣 · 调查两处矿脉并关闭装置', !!f.mineStabilized],
    ['回访 · 向砚叔报告调查结果', !!f.mineReport],
    ['潮汐 · 通过水系馆练习并赢得徽章', !!f.waterLeader],
    ['货运 · 向沐舟核对矿山运单', !!f.harborQuest],
    ['潮闸 · 取得两份证据并恢复自然水流', !!f.sluiceRepaired],
    ['归航 · 回港报告并封存 E-04 运单', !!f.harborReport],
    ['漂流瓶的收件人 · 核对航季并送达家书', !!f.bottleDelivered],
    ['潮池观察 · 记录河口与浅礁并清走旧网', !!f.reefRestored],
    ['旧灯塔维修 · 找到备用镜片并更换', !!f.lighthouseRepaired],
    ['浅礁的回应 · 获得珊枝鹿', !!f.coralCaught],
    ['归航的灯光 · 获得浮岛龟', !!f.islandCaught],
    ['迟来的旧约 · 获得回潮贝', !!f.tideCaught],
    ['旧铃回声 · 调查溪岸和林冠', !!f.mistClueOne && !!f.mistClueTwo],
    ['旧约 · 剧情相遇并获得雾铃灵', !!f.mistCaught],
    ...ADVENTURE_CHAPTERS.flatMap((c) =>
      c.milestones.map(([label, flag]): [string, boolean] => [label, !!f[flag]]),
    ),
  ];
  return (
    <ScrollView contentContainerStyle={{ gap: 14 }}>
      <Label style={styles.title}>冒险日志 · 已获 {game.progress.badges}/8 枚徽章</Label>
      <Label style={{ color: palette.gold }}>
        主线：自由选择道馆顺序，集齐八枚不同徽章，再挑战联盟。
      </Label>
      <Panel>
        <Label style={{ color: palette.gold, fontWeight: '700' }}>当前目标</Label>
        <Label style={{ marginTop: 8 }}>
          {objective(f, game.progress.badges, game.player.map)}
        </Label>
      </Panel>
      <CityQuestBoard game={game} dispatch={dispatch} />
      {!!game.league && (
        <Panel>
          <Label style={{ color: palette.gold }}>
            联盟名录 · {game.league.wins} 次夺冠／{game.league.runs} 轮登记
          </Label>
          <Label muted>
            {game.league.active
              ? `本轮连战 ${game.league.stage + 1}/5`
              : '当前未在连战中，首次与最近冠军队伍独立保留。'}
          </Label>
          {game.league.firstTeam?.map((c, i) => (
            <Label key={i}>
              {i + 1}. {c.nickname || SPECIES[c.speciesId]!.name} · Lv.{c.level}
            </Label>
          ))}
        </Panel>
      )}
      <Label style={{ fontSize: 21, fontWeight: '800' }}>主线与探索足迹</Label>
      {milestones.map(([label, done]) => (
        <Label key={label} style={{ color: done ? palette.mint : palette.muted }}>
          {done ? '●' : '○'}　{label}
        </Label>
      ))}
      <Label muted style={{ fontSize: 12 }}>
        {3 + ADVENTURE_CHAPTERS.length}{' '}
        座已开放道馆可自由选择顺序，馆主与学徒按已有徽章调整等级。区域调查与稀有捕获不作为入馆条件。不同区域有不同遭遇与随机发现；训练师获胜后只交谈，战败可重试，草丛可继续练习。石壳虫
        Lv.10、初始伙伴 Lv.16 可进化。
      </Label>
    </ScrollView>
  );
}
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
        '方向键：移动与转身；A：面向相邻人物或物体交谈、调查。电脑可用 WASD / 箭头、Enter / Z。',
        '草丛会遇到野生精灵。捕捉时先削弱对方；睡眠、麻痹等异常会提高捕获率。',
        '精灵按生境出没：林冠有萤灯蛾、湿岸有荷叶蛙、矿山暗河有滴石鲶。站在岸边面向水面按 A 调查；图鉴与地区地图可查栖息地。',
        '队伍最多 6 只，多出的精灵进入仓库。在城镇打开伙伴页面管理仓库、免费回忆技能。',
        '进化可以暂缓，在伙伴详情里再次进化。成长果可升一级；石壳虫 Lv.10、初始伙伴 Lv.16 有进化机会。',
        '满级 100 级，每次升级随机获得 1–10 能力点，精灵成长强度越高越容易获得高点数；伙伴详情可手动加点或自动培养，1 点直接增加对应能力 1 点。',
        '默认有效速度快者先出手，首次技能仍比较优先度。速度达到对手 2 倍可操作 2 次，3 倍及以上 3 次；每条指令只执行一次，结算后重新选择技能、道具或换人。',
        '双方行动额度在第一次操作前固定，速度变化影响下一回合，换人不补次数。用药、主动换人、投球和逃跑各占一次操作；昏厥取消本轮剩余行动，强制补位免费。异常与天气每轮结算一次，读档保留剩余额度。',
        '隐藏战斗属性有命中、闪避、要害率与抗要害。凝神提高要害率，鹰眼提高命中，影步提升闪避，守心降低受到要害攻击的概率，轻身提升速度；破绽突刺自带更高要害率。',
        '普通技能基础要害率 6.25%，要害等级 1 / 2 / 3 为 12.5% / 25% / 50%；守心每级使概率减半。要害造成普通伤害 ×2，不翻倍治疗或异常伤害；换人会重置战斗强化。',
        '城市任务日志可以接受居民委托，领奖获得调查印记。背包里的商店可购买星纹球和补给，印记可兑换特殊道具。',
        '技能复刻剂可在各城花 600 旅费购买或用 3 枚调查印记兑换；晨芽镇培养委托也会赠送一瓶。从背包或伙伴详情选择来源技能和接收伙伴，满四招时选择替换。',
        '复刻不限制种族、属性与等级，来源不失去技能或 PP；成功才消耗一瓶。复刻技能记入技能册，进化后保留，遗忘后可在城镇免费回忆。',
        '已确认的点数不能在伙伴页撤回。到背包使用重塑药剂可返还已用能力点；需在城镇、满体力、无异常，等级和随机成长记录不变。',
        '重大进度立即保存，探索每 10 秒自动保存。菜单中的本地存档可手动保存或恢复历史。',
        '同网传档：接收手机先等待，发送手机搜索并扫描接收手机的二维码。接收端选择槽位并确认后才导入。',
        'Android 与 iPhone 安装版支持原生局域网；网页预览用于试玩，存档使用该浏览器的本地空间。',
      ].map((t) => (
        <Label key={t} muted>
          {t}
        </Label>
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
              <Label muted>等级、经验、能力点与成长记录会保留。也可以稍后在伙伴详情中进化。</Label>
              <View style={styles.row}>
                <Button
                  accent
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
    borderRadius: 7,
    padding: 10,
    color: palette.text,
    backgroundColor: '#102820',
    fontSize: 14,
    minHeight: 43,
  },
});
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#102b23fa' },
  menuHead: {
    height: 60,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuNav: { width: 136, flexGrow: 0, borderRightWidth: 1, borderColor: '#334e3d' },
  navItem: {
    minHeight: 39,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#35584a',
    backgroundColor: '#1d3b31',
  },
  navSelected: { backgroundColor: palette.gold, borderColor: '#bda066' },
  input: menuStyles.input,
});
