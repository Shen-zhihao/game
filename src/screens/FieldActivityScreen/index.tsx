import { useEffect } from 'react';
import { BackHandler, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityBoard } from '../../components/ActivityBoard';
import { Button, Label, palette } from '../../components/ui';
import { FIELD_ACTIVITIES } from '../../content/fieldActivities';
import { HELD_ITEMS } from '../../content/battleTraits';
import type { Command, GameState } from '../../game/model';
import type { ActivityAction } from '../../game/activities/types';

export function FieldActivityScreen({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const run = game.activities!.active!,
    definition = FIELD_ACTIVITIES[run.id]!,
    record = game.activities?.records[run.id];
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const close = () => {
      dispatch({ kind: 'activity', action: { kind: 'close' } });
      return true;
    };
    const back = BackHandler.addEventListener('hardwareBackPress', close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      const direction = (
        { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<
          string,
          string
        >
      )[e.key];
      if (direction && definition.kind === 'push') {
        e.preventDefault();
        dispatch({ kind: 'activity', action: { kind: 'step', value: direction } });
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', onKey);
    };
  }, [dispatch, definition.kind]);
  const act = (action: ActivityAction) => dispatch({ kind: 'activity', action });
  return (
    <View
      testID="field-activity-screen"
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#3c423b66',
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 12,
        paddingHorizontal: Math.max(12, insets.left, insets.right),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '100%',
          backgroundColor: palette.panel,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: palette.line,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 14,
            gap: 12,
            borderBottomWidth: 1,
            borderColor: palette.line,
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Label style={{ fontSize: 21, fontWeight: '800' }}>{definition.title}</Label>
            <Label muted>
              操作 {run.moves} 次
              {record ? ` · 最佳 ${record.bestMoves} 次 · 已完成 ${record.completions} 次` : ''}
            </Label>
          </View>
          <Button testID="activity-close" onPress={() => act({ kind: 'close' })}>
            返回地图
          </Button>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 18, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <Label>{definition.instructions}</Label>
          <View
            style={{
              borderRadius: 18,
              padding: 14,
              backgroundColor: '#e9eadc',
              borderWidth: 1,
              borderColor: '#d4d3bb',
            }}
          >
            <ActivityBoard definition={definition} run={run} onAction={act} />
          </View>
          <View
            testID="activity-feedback"
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor:
                run.status === 'won' ? '#e1e9d4' : run.status === 'lost' ? '#f1ddd0' : '#f3ecd9',
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Label style={{ fontWeight: '700' }}>
              {run.status === 'won' ? '✓ 已完成　' : run.status === 'lost' ? '本局结束　' : ''}
              {run.feedback}
            </Label>
          </View>
          <Label muted>{definition.hint}</Label>
          {definition.reward && (
            <Label>
              首次完成：{HELD_ITEMS[definition.reward.item].name} ×1、旅费 {definition.reward.money}
              。{record?.rewardClaimed ? '奖励已领取。' : '奖励只领取一次。'}
            </Label>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {run.status === 'won' && definition.reward && !record?.rewardClaimed && (
              <Button accent testID="activity-claim" onPress={() => act({ kind: 'claim' })}>
                领取首次奖励
              </Button>
            )}
            {run.status === 'won' && definition.kind === 'fish' && (
              <Button
                accent
                testID="activity-encounter"
                onPress={() => act({ kind: 'step', value: 'encounter' })}
              >
                引出精灵 · 进入遭遇
              </Button>
            )}
            <Button testID="activity-reset" onPress={() => act({ kind: 'reset' })}>
              {run.status === 'playing' ? '重置本局' : '再玩一次'}
            </Button>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
