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

/** A paper dialogue strip and a separate command tray keep each phase easy to read. */
export function BattleFooter({
  mode,
  title,
  message,
  detail,
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
  detail?: string;
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
  return (
    <View
      testID="battle-footer"
      style={[s.root, compact && s.compact, !narrow && !playback && s.horizontal]}
    >
      {playback ? (
        <>
          <View style={s.playbackHeading}>
            <View style={s.heading}>
              <View style={[s.dot, stopped && { backgroundColor: '#b3a78d' }]} />
              <Text style={s.eyebrow}>{title}</Text>
              {!!progress && (
                <Text testID="battle-message-progress" style={s.counter}>
                  {progress}
                </Text>
              )}
            </View>
            <View style={s.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={paused ? '继续自动播放' : '暂停自动播放'}
                testID="battle-playback-pause"
                disabled={disabled}
                onPress={onTogglePause}
                style={({ pressed }) => [s.control, pressed && s.pressed]}
              >
                <Text style={s.controlText}>{paused ? '继续播放' : '暂停'}</Text>
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
                  {mode === 'result' ? '继续冒险' : '下一条'} ›
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="战斗信息，点击立即继续"
            testID="battle-dialogue"
            disabled={disabled}
            onPress={onAdvance}
            style={s.dialogue}
          >
            <Text
              testID="battle-message-text"
              style={[s.message, compact && { fontSize: 16, lineHeight: 23 }]}
            >
              {message}
            </Text>
            <Text
              testID={mode === 'result' ? 'battle-auto-return' : 'battle-autoplay-status'}
              style={s.hint}
            >
              {stopped
                ? '自动播放已暂停 · 点击仍可继续'
                : mode === 'result'
                  ? '即将自动返回旅程 · 点击立即继续'
                  : '自动播放中 · 点击画面或此处立即继续'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={[s.prompt, !narrow && { flex: 0.8 }]}>
            <Text style={s.eyebrow}>{title}</Text>
            <Text style={[s.promptText, compact && { fontSize: 15, lineHeight: 21 }]}>
              {message}
            </Text>
            {!!detail && !compact && !narrow && (
              <Text numberOfLines={2} style={s.hint}>
                {detail}
              </Text>
            )}
          </View>
          {mode === 'commands' && (
            <View style={[s.grid, !narrow && { flex: 1.2 }]}>
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
                    <BattleCommandIcon name={command.title} size={compact ? 27 : 31} />
                  </View>
                  <View style={s.tileCopy}>
                    <Text style={s.tileTitle}>{command.title}</Text>
                    {!compact && (
                      <Text numberOfLines={1} style={s.tileDetail}>
                        {command.detail}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.chevron, { color: command.color }]}>›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18, paddingVertical: 12, gap: 10 },
  compact: { paddingHorizontal: 12, paddingVertical: 8, gap: 5 },
  horizontal: { flexDirection: 'row', gap: 22, alignItems: 'stretch' },
  heading: { flexDirection: 'row', gap: 7, alignItems: 'center', flexShrink: 1 },
  playbackHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: { color: '#92784e', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8b9f82' },
  counter: { color: palette.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 6 },
  control: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: '#f1eadc',
  },
  next: { backgroundColor: '#f5e4b8', borderWidth: 1, borderColor: '#e4cea0' },
  controlText: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  dialogue: { flex: 1, minHeight: 0, justifyContent: 'center', gap: 5 },
  message: { fontSize: 19, lineHeight: 28, color: '#4c4030', fontWeight: '600' },
  hint: { color: '#9c8c74', fontSize: 10, lineHeight: 15 },
  prompt: { justifyContent: 'center', gap: 5 },
  promptText: { color: '#4c4030', fontSize: 18, lineHeight: 25, fontWeight: '700' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 0 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    height: '46%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e3d8c4',
    backgroundColor: '#fffcf5',
    borderRadius: 15,
  },
  fight: { borderColor: '#dfc398', backgroundColor: '#fbedd4' },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileCopy: { flex: 1, minWidth: 0 },
  tileTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20, color: '#55442f' },
  tileDetail: { fontSize: 10, lineHeight: 14, color: '#9c8b70', marginTop: 1 },
  chevron: { fontSize: 20, fontWeight: '500' },
  disabled: { opacity: 0.38 },
  pressed: { backgroundColor: '#f3dfaf' },
});
