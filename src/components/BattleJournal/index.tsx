import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { BattleJournalRecord } from '../../game/battleJournal';
import type { GameState } from '../../game/model';
import { Button, Label, palette } from '../ui';

const RESULTS = {
  win: '胜利',
  lose: '败北',
  caught: '捕捉成功',
  escaped: '脱离战斗',
  abandoned: '主动结束',
};
const SOURCES = {
  move: '招式',
  hazard: '入场陷阱',
  weather: '天气',
  status: '异常状态',
  recoil: '反冲',
  confusion: '混乱自伤',
  seed: '寄生',
};

/** Read-only recorded events: opening this view never replays the battle or consumes RNG. */
export function BattleJournalView({ record }: { record: BattleJournalRecord }) {
  const totals = new Map<string, number>();
  for (const event of record.events)
    if (event.kind === 'damage' && event.source && event.amount)
      totals.set(event.source, (totals.get(event.source) ?? 0) + event.amount);
  const knockouts = record.events.filter((event) => event.kind === 'knockout');
  return (
    <View testID="battle-journal-record" style={{ gap: 8 }}>
      <Label style={{ fontWeight: '800', color: palette.gold }}>{record.name}</Label>
      <Label testID="battle-journal-result" style={{ fontSize: 12 }}>
        {record.kind === 'wild' ? '野生遭遇' : '训练师对战'} ·{' '}
        {record.result ? RESULTS[record.result] : '进行中'} · 记录至回合 {record.turns}
      </Label>
      <Label muted style={{ fontSize: 11 }}>
        仅展示实际记录，不重新演算战斗。伤害汇总包含双方，仅统计保留的事件。
      </Label>
      {record.partial && (
        <Label testID="battle-journal-partial" style={{ color: palette.red, fontSize: 12 }}>
          本场从旧存档或中途开始记录，之前的经过无法补回。
        </Label>
      )}
      {record.truncated && (
        <Label testID="battle-journal-truncated" style={{ color: palette.red, fontSize: 12 }}>
          记录已达到容量上限，部分较早事件未保留，汇总不是整场总量。
        </Label>
      )}
      <View testID="battle-journal-damage" style={{ gap: 3 }}>
        <Label style={{ fontWeight: '700', fontSize: 12 }}>已记录的实际伤害来源</Label>
        {totals.size ? (
          [...totals].map(([source, amount]) => (
            <Label key={source} style={{ fontSize: 12 }}>
              {SOURCES[source as keyof typeof SOURCES]}：{amount}
            </Label>
          ))
        ) : (
          <Label muted style={{ fontSize: 11 }}>
            暂无伤害事件。
          </Label>
        )}
      </View>
      <View testID="battle-journal-knockouts" style={{ gap: 3 }}>
        <Label style={{ fontWeight: '700', fontSize: 12 }}>已记录的倒下顺序</Label>
        {knockouts.length ? (
          knockouts.map((event, index) => (
            <Label key={index} style={{ fontSize: 12 }}>
              {index + 1}. 回合 {event.turn} · {event.text}
            </Label>
          ))
        ) : (
          <Label muted style={{ fontSize: 11 }}>
            暂无倒下记录。
          </Label>
        )}
      </View>
      <Label style={{ fontWeight: '700', fontSize: 12 }}>逐回合记录</Label>
      {!record.events.length && <Label muted>本场尚无事件。</Label>}
      {record.events.map((event, index) => (
        <View key={index} testID={`battle-journal-event-${index}`} style={{ gap: 3 }}>
          {(index === 0 || record.events[index - 1]!.turn !== event.turn) && (
            <Label style={{ color: palette.gold, fontWeight: '700', marginTop: 5 }}>
              回合 {event.turn}
            </Label>
          )}
          <Label style={{ fontSize: 12, lineHeight: 19 }}>{event.text}</Label>
        </View>
      ))}
    </View>
  );
}

export function BattleJournalMenu({ game }: { game: GameState }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = game.battleJournal ?? [];
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  return (
    <ScrollView
      testID="battle-journal-menu"
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
    >
      <Label style={{ fontSize: 20, fontWeight: '800' }}>战后复盘</Label>
      <Label muted style={{ fontSize: 12 }}>
        保留最近 5 场已结束对战，每场事件有数量上限。旧版本已经结束的战斗不会补造记录。
      </Label>
      {!records.length && (
        <Label testID="battle-journal-empty">还没有战后记录。完成下一场对战后再来看看。</Label>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {records.map((record, index) => (
          <Button
            key={record.id}
            small
            testID={`battle-journal-select-${record.id}`}
            selected={selected?.id === record.id}
            onPress={() => setSelectedId(record.id)}
          >
            {index + 1}. {record.name} · {record.result ? RESULTS[record.result] : '进行中'}
          </Button>
        ))}
      </View>
      {selected && <BattleJournalView key={selected.id} record={selected} />}
    </ScrollView>
  );
}
