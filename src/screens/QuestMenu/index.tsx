import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import {
  journalQuests,
  canClaimCityQuest,
  JournalQuest,
  QuestKind,
  QuestStatus,
} from '../../content/quests';
import type { Command, GameState } from '../../game/model';
import { CityQuestBoard } from '../CityMenus';

const STATUS_NAMES: Record<QuestStatus, string> = {
  active: '进行中',
  ready: '待交付',
  completed: '已完成',
};
const KIND_NAMES: Record<QuestKind, string> = { main: '主线', side: '支线' };
export function QuestMenu({ game, dispatch }: { game: GameState; dispatch: (c: Command) => void }) {
  const [kind, setKind] = useState<QuestKind | 'all'>('all');
  const [status, setStatus] = useState<QuestStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [board, setBoard] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = height < 450;
  const wide = width >= 1000 && height >= 600;
  const quests = useMemo(() => journalQuests(game), [game]);
  const visible = quests.filter(
    (q) =>
      (kind === 'all' || q.kind === kind) &&
      (status === 'all' || q.status === status) &&
      `${q.name} ${q.client} ${q.location}`.includes(search.trim()),
  );
  const selected = visible.find((q) => q.id === selectedId) ?? visible[0];
  if (board)
    return (
      <View style={{ flex: 1, gap: 12 }}>
        <Button small testID="quest-back-journal" onPress={() => setBoard(false)}>
          返回已接任务
        </Button>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 18 }}>
          <CityQuestBoard game={game} dispatch={dispatch} />
        </ScrollView>
      </View>
    );
  if (!wide && selectedId && selected)
    return (
      <View testID="quest-detail-page" style={{ flex: 1, minHeight: 0, gap: 8 }}>
        <Button small testID="quest-back-list" onPress={() => setSelectedId(null)}>
          返回任务列表
        </Button>
        <QuestDetails
          key={selected.id}
          quest={selected}
          game={game}
          dispatch={(command) => {
            setSelectedId(selected.id);
            dispatch(command);
          }}
        />
      </View>
    );
  return (
    <View testID="quest-manager" style={{ flex: 1, minHeight: 0, gap: compact ? 7 : 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }]}>
        <View>
          <Label style={[styles.title, compact && { fontSize: 19, lineHeight: 24 }]}>
            任务管理
          </Label>
          <Label muted style={{ fontSize: 12 }} testID="quest-summary">
            已接 {quests.length} · 进行中 {quests.filter((q) => q.status === 'active').length} ·
            待交付 {quests.filter((q) => q.status === 'ready').length} · 已完成{' '}
            {quests.filter((q) => q.status === 'completed').length}
          </Label>
        </View>
        <Button small testID="quest-open-board" onPress={() => setBoard(true)}>
          接取城镇委托
        </Button>
      </View>
      <View style={[styles.wrap, { gap: 6 }]}>
        {(['all', 'main', 'side'] as const).map((value) => (
          <Button
            small
            key={value}
            selected={kind === value}
            testID={`quest-kind-${value}`}
            onPress={() => {
              setKind(value);
              setSelectedId(null);
            }}
          >
            {value === 'all' ? '全部任务' : KIND_NAMES[value]}
          </Button>
        ))}
        <TextInput
          accessibilityLabel="搜索已接任务"
          placeholder="搜索任务、委托人或地区"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          style={s.search}
          testID="quest-search"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {(['all', 'active', 'ready', 'completed'] as const).map((value) => (
          <Button
            small
            key={value}
            selected={status === value}
            testID={`quest-status-${value}`}
            onPress={() => {
              setStatus(value);
              setSelectedId(null);
            }}
          >
            {value === 'all' ? '全部状态' : STATUS_NAMES[value]}
          </Button>
        ))}
      </ScrollView>
      {visible.length ? (
        <View style={{ flex: 1, minHeight: 0, gap: 12, flexDirection: wide ? 'row' : 'column' }}>
          <ScrollView
            testID="quest-list"
            style={wide ? { width: '38%', flexGrow: 0 } : { flex: 1 }}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {visible.map((q) => (
              <Pressable
                key={q.id}
                accessibilityRole="button"
                accessibilityLabel={`查看任务：${q.name}`}
                accessibilityState={{ selected: selected?.id === q.id }}
                testID={`quest-select-${q.id}`}
                onPress={() => setSelectedId(q.id)}
                style={[s.card, selected?.id === q.id && s.selected]}
              >
                <View style={[styles.row, { justifyContent: 'space-between', gap: 6 }]}>
                  <Label muted style={{ fontSize: 11 }}>
                    {KIND_NAMES[q.kind]} · {q.location}
                  </Label>
                  <Label
                    style={{
                      fontSize: 11,
                      color: q.status === 'completed' ? palette.muted : palette.gold,
                    }}
                  >
                    {STATUS_NAMES[q.status]}
                  </Label>
                </View>
                <Label style={{ fontWeight: '800' }}>{q.name}</Label>
                <Label muted style={{ fontSize: 11 }}>
                  {q.client} · {q.current}/{q.target}
                  {game.trackedQuestId === q.id ? ' · 追踪中' : ''}
                </Label>
              </Pressable>
            ))}
          </ScrollView>
          {wide && selected && (
            <QuestDetails
              key={selected.id}
              quest={selected}
              game={game}
              dispatch={(command) => {
                setSelectedId(selected.id);
                dispatch(command);
              }}
            />
          )}
        </View>
      ) : (
        <Panel testID="quest-empty">
          <Label style={{ fontWeight: '800' }}>没有符合条件的任务</Label>
          <Label muted style={{ marginTop: 8 }}>
            调整筛选或搜索；与居民交谈、开始调查后，任务会自动记入这里。
          </Label>
        </Panel>
      )}
    </View>
  );
}
function QuestDetails({
  quest,
  game,
  dispatch,
}: {
  quest: JournalQuest;
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const completed = quest.status === 'completed';
  const tracking = game.trackedQuestId === quest.id;
  return (
    <ScrollView
      testID={`quest-detail-${quest.id}`}
      style={{
        flex: 1,
        backgroundColor: palette.panel,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.line,
      }}
      contentContainerStyle={{ gap: 12, padding: 16 }}
    >
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <Label style={{ color: palette.gold }}>
          {KIND_NAMES[quest.kind]} · {STATUS_NAMES[quest.status]}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          {quest.current}/{quest.target}
        </Label>
      </View>
      <Label style={{ fontSize: 21, lineHeight: 28, fontWeight: '800' }}>{quest.name}</Label>
      <Label muted style={{ fontSize: 12 }}>
        委托人：{quest.client}　·　{quest.location}
      </Label>
      <Button
        small
        accent={!tracking && !completed}
        selected={tracking}
        testID={`quest-track-${quest.id}`}
        disabled={completed && !tracking}
        onPress={() => dispatch({ kind: 'trackQuest', questId: tracking ? null : quest.id })}
      >
        {tracking ? '取消追踪' : completed ? '任务已完成' : '追踪任务'}
      </Button>
      <View
        style={{ height: 5, backgroundColor: palette.panel2, borderRadius: 3, overflow: 'hidden' }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.min(1, quest.current / Math.max(1, quest.target)) * 100}%`,
            backgroundColor: palette.amber,
          }}
        />
      </View>
      <Panel style={{ padding: 12, backgroundColor: completed ? palette.panel2 : palette.tint }}>
        <Label style={{ fontWeight: '700' }}>
          {completed ? '已完成' : quest.status === 'ready' ? '目标达成 · 等待交付' : '下一步'}
        </Label>
        <Label style={{ marginTop: 4 }}>{quest.next}</Label>
      </Panel>
      <Label style={{ fontWeight: '800' }}>任务目标</Label>
      {quest.steps.map((step, index) => (
        <Label key={index} muted={step.done} style={{ fontSize: 13 }}>
          {step.done ? '✓' : '○'}　{step.label}
        </Label>
      ))}
      <Label style={{ fontWeight: '800' }}>任务奖励{completed ? ' · 已发放' : ''}</Label>
      <View
        testID={`quest-rewards-${quest.id}`}
        style={{ backgroundColor: palette.tint, borderRadius: 10, padding: 12, gap: 5 }}
      >
        {(quest.rewards.length ? quest.rewards : ['剧情与探索记录']).map((reward) => (
          <Label key={reward} style={{ color: palette.gold, fontSize: 13 }}>
            {reward}
          </Label>
        ))}
      </View>
      {quest.cityQuestId && !completed && (
        <>
          <Button
            accent
            testID={`journal-claim-${quest.id}`}
            disabled={!canClaimCityQuest(game, quest)}
            onPress={() =>
              dispatch({ kind: 'cityQuest', questId: quest.cityQuestId!, action: 'claim' })
            }
          >
            交付并领取奖励
          </Button>
          <Label muted style={{ fontSize: 11 }}>
            交付与领奖需在委托所属城镇办理；交付物品只在领取时扣除。
          </Label>
        </>
      )}
      {quest.cityQuestId && (
        <View accessibilityLiveRegion="polite" testID="quest-journal-notice">
          <Label muted style={{ fontSize: 11 }}>
            {game.notice}
          </Label>
        </View>
      )}
      {!quest.cityQuestId && !completed && (
        <Label muted style={{ fontSize: 11 }}>
          按任务目标调查或向委托人报告，完成时自动记录并结算奖励。
        </Label>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  search: {
    flex: 1,
    minWidth: 170,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 12,
    gap: 4,
    backgroundColor: palette.panel,
  },
  selected: { backgroundColor: palette.tint, borderColor: palette.gold },
});
