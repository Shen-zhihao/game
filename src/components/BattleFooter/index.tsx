import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '../HapticPressable';
import { BattleCommandIcon } from '../BattleCommandIcon';
import { palette } from '../ui';

export interface BattleFooterCommand {
  id: string;
  title: string;
  detail: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}

/** Floating controls leave the battle scene at its full viewport size. */
export function BattleFooter({
  mode,
  title,
  message,
  progress,
  commands,
  compact,
  narrow,
  stopped,
  paused,
  disabled,
  onAdvance,
  onTogglePause,
}: {
  mode: 'commands' | 'playback' | 'result' | 'waiting' | 'forcedSwitch';
  title: string;
  message: string;
  progress?: string;
  commands: BattleFooterCommand[];
  compact: boolean;
  narrow: boolean;
  stopped: boolean;
  paused: boolean;
  disabled: boolean;
  onAdvance: () => void;
  onTogglePause: () => void;
}) {
  const playback = mode === 'playback' || mode === 'result';
  if (mode === 'commands')
    return (
      <View testID="battle-footer" style={s.commands}>
        {commands.map((command) => (
          <Pressable
            key={command.id}
            testID={command.id}
            accessibilityRole="button"
            accessibilityLabel={`${command.title}，${command.detail}`}
            disabled={command.disabled}
            onPress={command.onPress}
            style={({ pressed }) => [
              s.tile,
              command.id === 'fight' && s.fight,
              command.disabled && s.disabled,
              pressed && s.pressed,
            ]}
          >
            <View style={[s.icon, { backgroundColor: `${command.color}18` }]}>
              <BattleCommandIcon name={command.title} size={25} />
            </View>
            <Text style={s.tileTitle}>{command.title}</Text>
          </Pressable>
        ))}
      </View>
    );
  return (
    <View
      testID="battle-footer"
      style={[s.panel, !playback && s.notice, compact && { paddingVertical: 8 }]}
    >
      {playback ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="战斗信息，点击立即继续"
            testID="battle-dialogue"
            disabled={disabled}
            onPress={onAdvance}
            style={s.dialogue}
          >
            <View style={s.heading}>
              <View style={[s.dot, stopped && { backgroundColor: '#b3a78d' }]} />
              <Text
                testID={mode === 'result' ? 'battle-auto-return' : 'battle-autoplay-status'}
                style={s.eyebrow}
              >
                {stopped ? '已暂停 · 点击继续' : '自动播放 · 点击继续'}
              </Text>
              {!!progress && (
                <Text testID="battle-message-progress" style={s.counter}>
                  {progress}
                </Text>
              )}
            </View>
            <Text testID="battle-message-text" style={[s.message, narrow && s.narrowMessage]}>
              {message}
            </Text>
          </Pressable>
          <View style={s.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? '继续自动播放' : '暂停自动播放'}
              testID="battle-playback-pause"
              disabled={disabled}
              onPress={onTogglePause}
              style={({ pressed }) => [s.control, pressed && s.pressed]}
            >
              <Text style={s.controlText}>{paused ? '继续' : '暂停'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'result' ? '立即返回旅程' : '立即播放下一条战斗细节'}
              testID={mode === 'result' ? 'close-battle' : 'battle-next-line'}
              disabled={disabled}
              onPress={onAdvance}
              style={({ pressed }) => [s.control, s.next, pressed && s.pressed]}
            >
              <Text style={[s.controlText, { color: '#72501f' }]}>
                {mode === 'result' ? '返回' : '下一条'} ›
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={s.dialogue}>
          <Text style={s.eyebrow}>{title}</Text>
          <Text style={s.message}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  commands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 300,
    gap: 7,
  },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#e3d8c4',
    backgroundColor: '#fffcf5f2',
    borderRadius: 17,
    boxShadow: '0 3px 12px #46371e14',
  },
  fight: { borderColor: '#dfc398', backgroundColor: '#fbeddaf5' },
  icon: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19, color: '#55442f' },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2d2b2',
    backgroundColor: '#fffcf5f2',
    boxShadow: '0 3px 12px #46371e14',
  },
  notice: { alignSelf: 'flex-end', width: '100%', maxWidth: 420 },
  dialogue: { flex: 1, minWidth: 0, gap: 3, minHeight: 44, justifyContent: 'center' },
  heading: { flexDirection: 'row', gap: 7, alignItems: 'center', flexWrap: 'wrap' },
  eyebrow: { color: '#92784e', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8b9f82' },
  counter: { color: palette.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  message: { fontSize: 16, lineHeight: 23, color: '#4c4030', fontWeight: '600' },
  narrowMessage: { fontSize: 14, lineHeight: 21 },
  controls: { flexDirection: 'row', gap: 5 },
  control: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1eadc',
  },
  next: { backgroundColor: '#f5e4b8', borderWidth: 1, borderColor: '#e4cea0' },
  controlText: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.38 },
  pressed: { backgroundColor: '#f3dfaf' },
});
