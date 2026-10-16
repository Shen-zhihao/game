import { useEffect, useState } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameControls } from '../../components/GameControls';
import { WorldViewport } from '../../components/WorldViewport';
import { Button, Label, palette, styles } from '../../components/ui';
import type { GameState } from '../../game/model';
import { saveControlLayouts, useControlPreferences } from '../../platform/controlLayout';
import {
  CONTROL_IDS,
  CONTROL_NAMES,
  MAX_CONTROL_SCALE,
  MIN_CONTROL_SCALE,
  controlOrientation,
  moveControl,
  resizeControl,
  resolveControlFrame,
  type ControlId,
  type ControlPreferences,
} from '../../platform/controlLayout/controller';

export function ControlLayoutEditor({
  game,
  width,
  height,
  onClose,
}: {
  game: GameState;
  width: number;
  height: number;
  onClose: () => void;
}) {
  const stored = useControlPreferences();
  const [draft, setDraft] = useState<ControlPreferences>(stored);
  const [selected, setSelected] = useState<ControlId>('dpad');
  const [toolsAtBottom, setToolsAtBottom] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const area = { width, height, ...insets };
  const orientation = controlOrientation(width, height);
  const layout = draft[orientation];
  const scale = layout[selected]?.scale ?? 1;
  const resize = (value: number) =>
    setDraft((current) => ({
      ...current,
      [orientation]: resizeControl(selected, current[orientation], area, value),
    }));
  const nudge = (dx: number, dy: number) =>
    setDraft((current) => {
      const frame = resolveControlFrame(selected, current[orientation], area);
      return {
        ...current,
        [orientation]: moveControl(
          selected,
          current[orientation],
          area,
          frame.left + dx,
          frame.top + dy,
        ),
      };
    });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', onKeyDown);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  return (
    <View
      testID="control-layout-editor"
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.ink }]}
    >
      <WorldViewport game={game} width={width} height={height} paused />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `${palette.ink}44` }]}
      />
      <GameControls
        area={area}
        layout={layout}
        editing={{
          selected,
          onSelect: setSelected,
          onMove: (id, left, top) =>
            setDraft((current) => ({
              ...current,
              [orientation]: moveControl(id, current[orientation], area, left, top),
            })),
        }}
      />
      <View
        style={[
          s.tools,
          {
            left: insets.left + Math.max(12, (width - insets.left - insets.right - 420) / 2),
            width: Math.min(420, width - insets.left - insets.right - 24),
            maxHeight: height - insets.top - insets.bottom - 20,
            ...(toolsAtBottom ? { bottom: insets.bottom + 10 } : { top: insets.top + 10 }),
          },
        ]}
      >
        <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
          <View style={s.row}>
            <Label style={{ fontSize: 17, fontWeight: '800', flex: 1 }}>
              按钮布局 · {orientation === 'landscape' ? '横屏' : '竖屏'}
            </Label>
            <Button
              small
              testID="layout-tools-position"
              onPress={() => setToolsAtBottom(!toolsAtBottom)}
            >
              {toolsAtBottom ? '工具移到顶部' : '工具移到底部'}
            </Button>
          </View>
          <Label muted style={{ fontSize: 12 }}>
            拖动按钮摆放；方向键整组移动。横竖屏分别保存。
          </Label>
          <View style={s.row}>
            {CONTROL_IDS.map((id) => (
              <Button
                small
                key={id}
                testID={`layout-select-${id}`}
                selected={selected === id}
                accent={selected === id}
                onPress={() => setSelected(id)}
                style={{ flex: 1, paddingHorizontal: 2 }}
              >
                {CONTROL_NAMES[id]}
              </Button>
            ))}
          </View>
          <View style={s.row}>
            <Button
              small
              testID="layout-size-decrease"
              accessibilityLabel="缩小选中按钮"
              disabled={scale <= MIN_CONTROL_SCALE}
              onPress={() => resize(scale - 0.1)}
            >
              －
            </Button>
            <Label testID="layout-size" style={{ flex: 1, textAlign: 'center' }}>
              {CONTROL_NAMES[selected]} {Math.round(scale * 100)}%
            </Label>
            <Button
              small
              testID="layout-size-increase"
              accessibilityLabel="放大选中按钮"
              disabled={scale >= MAX_CONTROL_SCALE}
              onPress={() => resize(scale + 0.1)}
            >
              ＋
            </Button>
            <Button small testID="layout-size-default" onPress={() => resize(1)}>
              原大小
            </Button>
          </View>
          <View style={s.row}>
            <Label muted style={{ fontSize: 12 }}>
              微调
            </Label>
            {(
              [
                ['←', -8, 0],
                ['↑', 0, -8],
                ['↓', 0, 8],
                ['→', 8, 0],
              ] as const
            ).map(([symbol, dx, dy]) => (
              <Button
                small
                key={symbol}
                accessibilityLabel={`向${symbol}微调选中按钮`}
                onPress={() => nudge(dx, dy)}
                style={{ flex: 1 }}
              >
                {symbol}
              </Button>
            ))}
          </View>
          {!!error && <Label style={{ color: palette.red, fontSize: 12 }}>{error}</Label>}
          <View style={s.row}>
            <Button small testID="layout-cancel" onPress={onClose}>
              取消
            </Button>
            <Button
              small
              testID="layout-reset"
              onPress={() => {
                setDraft((current) => ({ ...current, [orientation]: {} }));
                setError('');
              }}
              style={{ flex: 1 }}
            >
              恢复本屏默认
            </Button>
            <Button
              small
              accent
              testID="layout-save"
              onPress={() => {
                if (!saveControlLayouts(draft)) {
                  setError('布局保存失败，请重试；取消可保留原布局。');
                  return;
                }
                onClose();
              }}
            >
              保存布局
            </Button>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  tools: {
    position: 'absolute',
    borderRadius: 14,
    backgroundColor: `${palette.panel}fa`,
    borderColor: palette.line,
    borderWidth: 1,
  },
  row: { ...styles.row, gap: 6 },
});
