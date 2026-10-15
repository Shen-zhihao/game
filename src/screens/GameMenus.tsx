import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_SPECIES, ITEMS, learnset, MOVES, SPECIES, TYPE_IDS, TYPES } from '../content/catalog';
import { MAPS, objective } from '../content/world';
import { CreatureSprite } from '../components/CreatureSprite';
import { Button, HpBar, Label, palette, Panel, styles, TypeBadges } from '../components/ui';
import { Command, GameState, STAT_KEYS, TypeId } from '../game/model';
import {
  canEvolve,
  creatureName,
  evolutionLabel,
  statsFor,
  typeMultiplier,
  xpAt,
} from '../game/rules';
import { statusName } from './BattleScreen';

export type MenuName =
  'party' | 'bag' | 'dex' | 'quests' | 'map' | 'save' | 'transfer' | 'settings';
export const MENU_NAMES: Record<MenuName, string> = {
  party: '伙伴',
  bag: '背包与商店',
  dex: '精灵图鉴',
  quests: '任务日志',
  map: '地区地图',
  save: '本地存档',
  transfer: '存档互传',
  settings: '操作说明',
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
      <View style={s.menuHead}>
        <Label style={{ fontSize: 21, fontWeight: '800', letterSpacing: 1 }}>
          旅行手册{' '}
          <Label muted style={{ fontSize: 12 }}>
            {' '}
            / {MENU_NAMES[menu]}
          </Label>
        </Label>
        <Button small onPress={onClose}>
          返回冒险 ×
        </Button>
      </View>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView style={s.menuNav} contentContainerStyle={{ gap: 8, padding: 12 }}>
          {(Object.keys(MENU_NAMES) as MenuName[]).map((m) => (
            <Button key={m} small accent={menu === m} onPress={() => onMenu(m)}>
              {MENU_NAMES[m]}
            </Button>
          ))}
        </ScrollView>
        <View style={{ flex: 1, padding: 16 }}>{children}</View>
      </View>
    </View>
  );
}
const statNames = {
  hp: '体力',
  attack: '攻击',
  defense: '防御',
  specialAttack: '特攻',
  specialDefense: '特防',
  speed: '速度',
};
export function PartyMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [selected, setSelected] = useState(game.party[0]!);
  const [showBox, setShowBox] = useState(false);
  const [recall, setRecall] = useState<string | null>(null);
  const c = game.creatures[selected] ?? game.creatures[game.party[0]!]!;
  const species = SPECIES[c.speciesId]!;
  const stats = statsFor(c);
  const ids = showBox ? game.box : game.party;
  const xpStart = xpAt(c.level, species.experienceCurve);
  const xpNext = xpAt(Math.min(100, c.level + 1), species.experienceCurve);
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
      <View style={{ width: '32%' }}>
        <View style={[styles.row, { gap: 6, marginBottom: 10 }]}>
          <Button small accent={!showBox} onPress={() => setShowBox(false)}>
            队伍 {game.party.length}/6
          </Button>
          <Button small accent={showBox} onPress={() => setShowBox(true)}>
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
                onPress={() => {
                  setSelected(id);
                  setRecall(null);
                }}
              >{`${creatureName(member)} · Lv.${member.level}\nHP ${member.hp}/${statsFor(member).hp}`}</Button>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <CreatureSprite speciesId={c.speciesId} size={108} />
          <View style={{ flex: 1 }}>
            <Label style={{ fontSize: 22, fontWeight: '800' }}>{creatureName(c)}</Label>
            <Label muted>
              #{species.dexNumber.toString().padStart(3, '0')}　Lv.{c.level}{' '}
              {c.status ? `· ${statusName(c.status)}` : ''}
            </Label>
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
          </View>
        </View>
        <View style={styles.wrap}>
          {STAT_KEYS.map((k) => (
            <Panel key={k} style={{ padding: 10, minWidth: 80, flexGrow: 1 }}>
              <Label muted style={{ fontSize: 11 }}>
                {statNames[k]}
              </Label>
              <Label style={{ fontWeight: '800', fontSize: 20 }}>{stats[k]}</Label>
              <Label muted style={{ fontSize: 9 }}>
                种族 {species.baseStats[k]} · 个体 {c.iv[k]}
              </Label>
            </Panel>
          ))}
        </View>
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
            disabled={!game.party.includes(c.id) || game.party[0] === c.id}
            onPress={() => dispatch({ kind: 'lead', creatureId: c.id })}
          >
            设为首位
          </Button>
          <Button
            small
            onPress={() =>
              dispatch({ kind: 'box', creatureId: c.id, withdraw: !game.party.includes(c.id) })
            }
          >
            {game.party.includes(c.id) ? '放入仓库' : '带入队伍'}
          </Button>
        </View>
        <Label style={{ fontWeight: '700' }}>技能 · 点击待回忆技能后，选择替换位置</Label>
        {c.moves.map((m, i) => (
          <Button
            key={m.id}
            small
            onPress={() => {
              if (recall) {
                dispatch({ kind: 'recall', creatureId: c.id, moveId: recall, replace: i });
                setRecall(null);
              }
            }}
          >{`${MOVES[m.id]!.name}　${MOVES[m.id]!.type ? TYPES[MOVES[m.id]!.type!] : '无属性'}　PP ${m.pp}/${MOVES[m.id]!.pp}${recall ? '　← 替换' : ''}`}</Button>
        ))}
        {['dawn', 'moss'].includes(game.player.map) && (
          <View style={styles.wrap}>
            {learnset(c.speciesId)
              .filter((m) => m.level <= c.level && !c.moves.some((known) => known.id === m.moveId))
              .map((m) => (
                <Button
                  key={m.moveId}
                  small
                  accent={recall === m.moveId}
                  onPress={() => setRecall(recall === m.moveId ? null : m.moveId)}
                >
                  回忆：{MOVES[m.moveId]!.name}
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
      </ScrollView>
    </View>
  );
}
export function BagMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [target, setTarget] = useState(game.party[0]!);
  const [shop, setShop] = useState(false);
  const [selected, setSelected] = useState('potion');
  const item = ITEMS[selected]!;
  const c = game.creatures[target]!;
  const sale = [
    'ball',
    'potion',
    'antidote',
    'candy',
    ...(game.progress.flags.questReward
      ? Object.keys(ITEMS).filter((id) => !['ball', 'potion', 'antidote', 'candy'].includes(id))
      : []),
  ];
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 18 }}>
      <View style={{ width: '42%' }}>
        <View style={[styles.row, { marginBottom: 10 }]}>
          <Button small accent={!shop} onPress={() => setShop(false)}>
            背包
          </Button>
          <Button
            small
            accent={shop}
            disabled={!game.progress.flags.shop || game.player.map !== 'moss'}
            onPress={() => setShop(true)}
          >
            补给店
          </Button>
        </View>
        <ScrollView contentContainerStyle={{ gap: 7 }}>
          {(shop ? sale : Object.keys(game.inventory).filter((id) => game.inventory[id]! > 0)).map(
            (id) => (
              <Button key={id} small accent={id === selected} onPress={() => setSelected(id)}>
                {ITEMS[id]!.name}　{shop ? `◎ ${ITEMS[id]!.price}` : `×${game.inventory[id]}`}
              </Button>
            ),
          )}
          {!shop && !Object.values(game.inventory).some((q) => q > 0) && (
            <Label muted>背包是空的，可以去补给店购买道具。</Label>
          )}
        </ScrollView>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 15 }}>
        <Label style={{ fontSize: 25, fontWeight: '800', color: palette.gold }}>{item.name}</Label>
        <Label>{item.description}</Label>
        <Label muted>
          持有 ×{game.inventory[selected] ?? 0}　旅费 ◎ {game.player.money}
        </Label>
        {shop ? (
          <View style={styles.wrap}>
            <Button
              accent
              disabled={game.player.money < item.price}
              onPress={() => dispatch({ kind: 'buy', itemId: selected, quantity: 1 })}
            >
              购买 1 个 · {item.price}
            </Button>
            <Button
              disabled={game.player.money < item.price * 5}
              onPress={() => dispatch({ kind: 'buy', itemId: selected, quantity: 5 })}
            >
              购买 5 个 · {item.price * 5}
            </Button>
          </View>
        ) : (
          <>
            <Label muted>选择使用对象</Label>
            <View style={styles.wrap}>
              {game.party.map((id) => (
                <Button key={id} small accent={target === id} onPress={() => setTarget(id)}>
                  {creatureName(game.creatures[id]!)}
                </Button>
              ))}
            </View>
            <Label>
              {creatureName(c)} · Lv.{c.level} · HP {c.hp}/{statsFor(c).hp}
            </Label>
            <Button
              accent
              disabled={
                !['potion', 'antidote', 'candy'].includes(selected) || !game.inventory[selected]
              }
              onPress={() => dispatch({ kind: 'useItem', creatureId: target, itemId: selected })}
            >
              使用道具
            </Button>
            {!['potion', 'antidote', 'candy', 'ball'].includes(selected) && (
              <Label muted>进化道具请在伙伴详情中使用；条件不足不会消耗。</Label>
            )}
          </>
        )}
        <Label muted style={{ fontSize: 12 }}>
          {game.notice}
        </Label>
        {!game.progress.flags.shop && (
          <Label muted>在苔丘镇和补给商人交谈后，可在城镇打开商店。</Label>
        )}
      </ScrollView>
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
                  在「伙伴」查看当前等级能力与成长记录。
                </Label>
                <Label style={{ fontSize: 12 }}>可学技能</Label>
                {learnset(species.id).map((m) => (
                  <Label muted key={m.moveId} style={{ fontSize: 12 }}>
                    Lv.{m.level}　{MOVES[m.moveId]!.name}
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
export function QuestMenu({ game }: { game: GameState }) {
  const f = game.progress.flags;
  const milestones: [string, boolean][] = [
    ['启程 · 与阿澈练习对战', !!f.rival],
    ['相遇 · 学会捕捉精灵', !!f.catchTutorial],
    ['求助 · 接受穗禾的委托', !!f.quest],
    ['追踪 · 调查两处森林线索', !!f.clueOne && !!f.clueTwo],
    ['开路 · 采集员协助，推动倒木', !!f.logMoved],
    ['微芒 · 击退定序社，救回萤灯蛾', !!f.rescued],
    ['归来 · 回镇报告并领取奖励', !!f.questReward],
    ['枝叶 · 赢得首枚道馆徽章', game.progress.badges > 0],
  ];
  return (
    <ScrollView contentContainerStyle={{ gap: 14 }}>
      <Label style={styles.title}>第一章 · 晨光与微芒</Label>
      <Panel>
        <Label style={{ color: palette.gold, fontWeight: '700' }}>当前目标</Label>
        <Label style={{ marginTop: 8 }}>{objective(f, game.progress.badges)}</Label>
      </Panel>
      {milestones.map(([label, done]) => (
        <Label key={label} style={{ color: done ? palette.mint : palette.muted }}>
          {done ? '●' : '○'}　{label}
        </Label>
      ))}
      <Label muted style={{ fontSize: 12 }}>
        分支：一号路东北侧有旅行补给。训练场可以反复挑战；石壳虫 Lv.10 可进化，初始伙伴 Lv.16
        可进化。
      </Label>
    </ScrollView>
  );
}
export function RegionMenu({ game }: { game: GameState }) {
  return (
    <ScrollView contentContainerStyle={{ gap: 14 }}>
      <Label style={styles.title}>星苔地区 · 南境</Label>
      <Label muted>北 ↑</Label>
      {(['forest', 'moss', 'route', 'dawn'] as const).map((id) => (
        <Panel
          key={id}
          style={{ borderColor: game.player.map === id ? palette.gold : palette.line, padding: 14 }}
        >
          <Label
            style={{
              color: game.player.map === id ? palette.gold : palette.text,
              fontWeight: '700',
            }}
          >
            {game.player.map === id ? '◆ ' : '◇ '}
            {MAPS[id].name}
          </Label>
          <Label muted style={{ fontSize: 12 }}>
            {id === 'forest'
              ? '调查断枝、脚印 → 推木开路 → 森林救援'
              : id === 'moss'
                ? '免费治疗 · 补给商店 · 研究员 · 东侧道馆'
                : id === 'route'
                  ? '西：晨芽镇　东：苔丘镇　草丛可以捕捉'
                  : '东行出镇 · 博士与阿澈'}
          </Label>
        </Panel>
      ))}
      <Label muted>苔丘道馆在苔丘镇东北侧。北境与其余道馆将在后续章节开放。</Label>
    </ScrollView>
  );
}
export function HelpMenu() {
  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Label style={styles.title}>旅行小贴士</Label>
      {[
        '方向键：移动与转身；A：面向相邻人物或物体交谈、调查。电脑可用 WASD / 箭头、Enter / Z。',
        '草丛会遇到野生精灵。捕捉时先削弱对方；睡眠、麻痹等异常会提高捕获率。',
        '队伍最多 6 只，多出的精灵进入仓库。在城镇打开伙伴页面管理仓库、免费回忆技能。',
        '进化可以暂缓，在伙伴详情里再次进化。成长果可升一级；石壳虫 Lv.10、初始伙伴 Lv.16 有进化机会。',
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
      <Panel style={{ maxWidth: 760, width: '100%', alignSelf: 'center', gap: 12 }}>
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
            <Label muted>等级、经验与个体值会保留。也可以稍后在伙伴详情中进化。</Label>
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
            <Label style={{ color: palette.gold, fontSize: 18 }}>
              {MOVES[choice.moveId]!.name}
            </Label>
            <Label muted>已掌握四个技能。选择一个替换，或留待城镇回忆。</Label>
            <View style={styles.wrap}>
              {c.moves.map((m, i) => (
                <Button
                  key={m.id}
                  onPress={() =>
                    dispatch({ kind: 'learn', creatureId: c.id, moveId: choice.moveId, replace: i })
                  }
                >
                  替换 {MOVES[m.id]!.name}
                </Button>
              ))}
            </View>
            <Button
              onPress={() =>
                dispatch({ kind: 'learn', creatureId: c.id, moveId: choice.moveId, replace: null })
              }
            >
              这次不学
            </Button>
          </>
        )}
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
  menuNav: { maxWidth: 136, borderRightWidth: 1, borderColor: '#334e3d' },
  input: menuStyles.input,
});
