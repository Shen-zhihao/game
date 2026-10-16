import { useState } from 'react';
import { View } from 'react-native';
import { ITEMS } from '../../content/catalog';
import {
  CITIES,
  CITY_QUESTS,
  cityFor,
  questProgress,
  servicesUnlocked,
} from '../../content/cities';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { Command, GameState } from '../../game/model';

export { BagMenu } from '../BagMenu';

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
        const status = game.cityServices?.quests[q.id];
        const live = questProgress(game, q);
        const locked = !!q.prerequisite && game.cityServices?.quests[q.prerequisite] !== 'claimed';
        const progress =
          status === 'claimed'
            ? { ...live, current: live.target, ready: true, label: '委托目标已完成' }
            : live;
        return (
          <Panel key={q.id} style={{ padding: 12, gap: 8 }}>
            <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
              <Label
                style={{
                  fontWeight: '800',
                  color: status === 'claimed' ? palette.accent : palette.gold,
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
            {locked && (
              <Label muted style={{ fontSize: 12 }}>
                先交付：{CITY_QUESTS[q.prerequisite!]!.name}
              </Label>
            )}
            <Label style={{ fontSize: 12 }}>
              {progress.label}　{progress.current}/{progress.target}
            </Label>
            <View
              style={{
                height: 5,
                backgroundColor: palette.panel2,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(1, progress.current / Math.max(1, progress.target)) * 100}%`,
                  backgroundColor: palette.amber,
                }}
              />
            </View>
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
              disabled={
                !canAct ||
                locked ||
                status === 'claimed' ||
                (status === 'active' && !progress.ready)
              }
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
        <Label style={{ color: palette.accent, fontSize: 12 }}>{game.notice}</Label>
      </View>
      <Label muted style={{ fontSize: 11 }}>
        潮汐港、雷鸣市、风栖镇、炉心城、镜湖镇和星岚城的委托及商店将随各自地图开放。居民委托不会限制道馆顺序，稀有精灵仍由剧情获得。
      </Label>
    </View>
  );
}
