import { FishingJournal } from '../../components/FishingJournal';
import { FISHING_BAITS, FISHING_SITES, type FishingBait } from '../../content/fishing';
import { activitySolved } from '../../game/activities';
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
          {definition.kind === 'fish' && (
            <View style={{ gap: 8 }}>
              <Label>
                本地钓点：{FISHING_SITES.find((site) => site.id === definition.fishingSiteId)?.name}
              </Label>
              <Label muted>
                只出现本地水域的普通精灵，保留天气与昼夜规律；果饵不会引出异地或剧情稀有精灵。
              </Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(FISHING_BAITS) as FishingBait[]).map((baitId) => (
                  <Button
                    small
                    key={baitId}
                    testID={`fishing-bait-${baitId}`}
                    selected={(run.fishing?.baitId ?? 'none') === baitId}
                    disabled={run.stage !== 0 || run.status !== 'playing'}
                    onPress={() => act({ kind: 'bait', baitId })}
                  >
                    {FISHING_BAITS[baitId].name}
                    {baitId !== 'none' ? ` · 背包 ${game.inventory[baitId] ?? 0}` : ''}
                  </Button>
                ))}
              </View>
              <Label muted>{FISHING_BAITS[run.fishing?.baitId ?? 'none'].hint}</Label>
              <Label muted>
                果饵使用背包里的甘露果／清露果，不取下伙伴携带物。只在成功投竿时消耗 1
                个，选择、引出精灵不另收费；失败、重置不返还。城镇商店有售。重置后默认不用果饵。
              </Label>
            </View>
          )}
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
            {run.status === 'won' &&
              definition.kind === 'fish' &&
              activitySolved(definition, run) && (
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
          {definition.kind === 'fish' && (
            <FishingJournal
              game={game}
              onClaim={(region) => act({ kind: 'fishingClaim', region })}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
