import { View } from 'react-native';
import { regionalHandbook } from '../../game/regionalHandbook';
import type { Command, GameState, MapId } from '../../game/model';
import { Button, Label, palette } from '../ui';

export function RegionalHandbook({
  game,
  regionId,
  onMap,
  dispatch,
}: {
  game: GameState;
  regionId: string;
  onMap: (map: MapId) => void;
  dispatch?: (command: Command) => void;
}) {
  const handbook = regionalHandbook(game, regionId);
  return (
    <View
      testID="regional-handbook"
      style={{ gap: 10, padding: 10, borderRadius: 10, backgroundColor: palette.panel2 }}
    >
      <Label style={{ fontWeight: '800', color: palette.gold }}>地区探索手册</Label>
      <Label muted style={{ fontSize: 11 }}>
        按已接触的委托、实地调查和获得记录整理；各类目标独立统计，不代表地区总探索率。隐藏地点不会提前标出。
      </Label>
      <Label testID="handbook-next" style={{ fontSize: 12 }}>
        {handbook.next}
      </Label>
      {handbook.sections.map((section) => (
        <View key={section.id} testID={`handbook-${section.id}`} style={{ gap: 6 }}>
          <Label style={{ fontWeight: '700', fontSize: 12 }}>
            {section.title} · {section.entries.filter((entry) => entry.done).length}/
            {section.entries.length} 已记录目标
          </Label>
          {!section.entries.length && (
            <Label muted style={{ fontSize: 11 }}>
              暂无记录；不表示本地区没有其他内容。
            </Label>
          )}
          {section.entries.map((entry) => (
            <View key={entry.id} testID={`handbook-entry-${entry.id}`} style={{ gap: 4 }}>
              <Label style={{ fontSize: 12 }}>
                {entry.done ? '✓' : '○'} {entry.title}
              </Label>
              <Label muted style={{ fontSize: 11 }}>
                {entry.detail}
              </Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {entry.map && (
                  <Button
                    small
                    testID={`handbook-map-${entry.id}`}
                    onPress={() => onMap(entry.map!)}
                  >
                    查看地区地图
                  </Button>
                )}
                {entry.questId && dispatch && (
                  <Button
                    small
                    testID={`handbook-track-${entry.id}`}
                    onPress={() => dispatch({ kind: 'trackQuest', questId: entry.questId! })}
                  >
                    {game.trackedQuestId === entry.questId ? '已追踪' : '追踪委托'}
                  </Button>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
