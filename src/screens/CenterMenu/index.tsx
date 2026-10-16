import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { MOVES } from '../../content/catalog';
import { MAPS } from '../../content/world';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { MoveLearningPanel } from '../../components/MoveDetails';
import { Command, GameState } from '../../game/model';
import { atCenter, centerOptions, FIELD_SKILLS, fieldSkill } from '../../game/fieldSkills';
import { creatureName } from '../../game/rules';

export function CenterMenu({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const [selected, setSelected] = useState(game.party[0] ?? '');
  const [learning, setLearning] = useState('');
  const [forgetting, setForgetting] = useState('');
  const [contentWidth, setContentWidth] = useState(600);
  const { width, height } = useWindowDimensions();
  const stacked = contentWidth < 450 && height > width;
  const contentRef = useRef<ScrollView>(null);
  const beginLearning = (moveId: string) => {
    setLearning(moveId);
    setForgetting('');
    contentRef.current?.scrollTo({ y: 0, animated: true });
  };
  const c = game.creatures[selected] ?? game.creatures[game.party[0] ?? ''];
  const available = atCenter(game) && !!c;
  return (
    <View
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
      style={{ flex: 1, minHeight: 0, gap: 10 }}
    >
      <Label style={styles.title}>精灵中心 · {MAPS[game.player.map].name}</Label>
      <Label muted style={{ fontSize: 12 }}>
        {available
          ? '免费恢复全队状态、遗忘与回忆技能。剧情通用技能解锁后，可教给任意伙伴。'
          : '走到任意城市精灵中心的治疗柜台前，再打开此页办理服务。每座已开放城市均有精灵中心。'}
      </Label>
      <View accessibilityLiveRegion="polite" testID="center-notice">
        <Label style={{ color: palette.gold }}>{game.notice}</Label>
      </View>
      <View style={{ flex: 1, minHeight: 0, flexDirection: stacked ? 'column' : 'row', gap: 12 }}>
        <ScrollView
          key={stacked ? 'horizontal' : 'vertical'}
          horizontal={stacked}
          style={stacked ? { flexGrow: 0, maxHeight: 70 } : { width: '31%', flexGrow: 0 }}
          contentContainerStyle={{ gap: 7 }}
        >
          <Button
            accent
            disabled={!available}
            testID="center-heal"
            onPress={() => dispatch({ kind: 'centerHeal' })}
          >
            恢复全队 · 免费
          </Button>
          {[...game.party, ...game.box].map((id) => (
            <Button
              small
              selected={c?.id === id}
              key={id}
              onPress={() => {
                setSelected(id);
                setLearning('');
                setForgetting('');
              }}
            >
              {creatureName(game.creatures[id]!)} · Lv.{game.creatures[id]!.level}
              {game.box.includes(id) ? '（仓库）' : ''}
            </Button>
          ))}
        </ScrollView>
        <ScrollView
          ref={contentRef}
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        >
          {!!learning && c && available && (
            <MoveLearningPanel
              key={`${c.id}:${learning}`}
              c={c}
              moveId={learning}
              testID="center-learn"
              onLearn={(replace) => {
                dispatch({ kind: 'centerLearn', creatureId: c.id, moveId: learning, replace });
                setLearning('');
              }}
              onCancel={() => setLearning('')}
            />
          )}
          {FIELD_SKILLS.map((s) => (
            <Panel key={s.id} style={{ padding: 10, gap: 5 }}>
              <Label
                style={{
                  color: game.progress.flags[s.flag] ? palette.accent : palette.gold,
                  fontWeight: '800',
                }}
              >
                {s.name} · {game.progress.flags[s.flag] ? '已解锁' : '尚未解锁'}
              </Label>
              <Label muted style={{ fontSize: 12 }}>
                {s.story}。{s.use}
              </Label>
              <Button
                small
                disabled={
                  !available ||
                  !game.progress.flags[s.flag] ||
                  !!c?.moves.some((m) => m.id === s.id)
                }
                onPress={() => beginLearning(s.id)}
              >
                学习／重学{s.name}
              </Button>
            </Panel>
          ))}
          {c && (
            <>
              <Label style={{ fontWeight: '800' }}>{creatureName(c)} · 当前技能</Label>
              {c.moves.map((m) => (
                <View key={m.id} style={[styles.wrap, { gap: 6 }]}>
                  <Label style={{ flex: 1 }}>
                    {MOVES[m.id]!.name}　PP {m.pp}/{MOVES[m.id]!.pp}
                  </Label>
                  <Button
                    small
                    disabled={!available || c.moves.length <= 1}
                    onPress={() => {
                      setForgetting(m.id);
                      setLearning('');
                    }}
                  >
                    遗忘{MOVES[m.id]!.name}
                  </Button>
                </View>
              ))}
              {!!forgetting && c.moves.some((m) => m.id === forgetting) && (
                <View style={styles.wrap}>
                  <Button
                    small
                    testID="center-confirm-forget"
                    onPress={() => {
                      dispatch({ kind: 'centerForget', creatureId: c.id, moveId: forgetting });
                      setForgetting('');
                    }}
                  >
                    确认遗忘{MOVES[forgetting]!.name} · 可重学
                  </Button>
                  <Button small onPress={() => setForgetting('')}>
                    取消
                  </Button>
                </View>
              )}
              <Label style={{ fontWeight: '800' }}>其他可回忆技能 · 免费</Label>
              <View style={styles.wrap}>
                {centerOptions(game, c)
                  .filter((id) => !fieldSkill(id) && !c.moves.some((m) => m.id === id))
                  .map((id) => (
                    <Button
                      small
                      disabled={!available}
                      key={id}
                      selected={learning === id}
                      onPress={() => beginLearning(id)}
                    >
                      {MOVES[id]!.name}
                    </Button>
                  ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
