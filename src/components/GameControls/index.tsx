import React, { useRef } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { HapticPressable as Pressable } from '../HapticPressable';
import { palette } from '../ui';
import type { WalkDirection } from '../../game/model';
import { DirectionPad } from '../DirectionPad';
import {
  CONTROL_NAMES,
  DEFAULT_DIRECTION_PAD_OPACITY,
  resolveControlFrame,
  type ControlArea,
  type ControlFrame,
  type ControlId,
  type ControlLayout,
} from '../../platform/controlLayout/controller';

export interface ControlEditing {
  selected: ControlId;
  onSelect: (id: ControlId) => void;
  onMove: (id: ControlId, left: number, top: number) => void;
}
function Control({
  id,
  frame,
  editing,
  children,
}: {
  id: ControlId;
  frame: ControlFrame;
  editing?: ControlEditing;
  children: React.ReactNode;
}) {
  const origin = useRef({ left: 0, top: 0, pageX: 0, pageY: 0 });
  return (
    <View
      {...(editing
        ? {
            onStartShouldSetResponder: () => true,
            onMoveShouldSetResponder: () => true,
            onResponderGrant: ({ nativeEvent }: GestureResponderEvent) => {
              origin.current = {
                left: frame.left,
                top: frame.top,
                pageX: nativeEvent.pageX,
                pageY: nativeEvent.pageY,
              };
              editing.onSelect(id);
            },
            onResponderMove: ({ nativeEvent }: GestureResponderEvent) =>
              editing.onMove(
                id,
                origin.current.left + nativeEvent.pageX - origin.current.pageX,
                origin.current.top + nativeEvent.pageY - origin.current.pageY,
              ),
            onResponderTerminationRequest: () => false,
          }
        : {})}
      testID={`control-${id}`}
      accessibilityLabel={editing ? `拖动${CONTROL_NAMES[id]}` : undefined}
      style={[
        {
          position: 'absolute',
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
        },
        editing && s.editable,
        editing?.selected === id && s.selected,
      ]}
    >
      <View style={{ flex: 1 }} pointerEvents={editing ? 'none' : 'box-none'}>
        {children}
      </View>
    </View>
  );
}
/** Keep the target label near A without covering the other configured controls. */
function interactionHintFrame(area: ControlArea, action: ControlFrame, controls: ControlFrame[]) {
  const width = Math.min(176, Math.max(1, area.width - area.left - area.right));
  const height = Math.min(36, Math.max(1, area.height - area.top - area.bottom));
  const clampX = (x: number) => Math.max(area.left, Math.min(x, area.width - area.right - width));
  const clampY = (y: number) => Math.max(area.top, Math.min(y, area.height - area.bottom - height));
  const preferredX = clampX(action.left + (action.width - width) / 2);
  const preferredY = clampY(action.top + action.height + 4);
  const xs = [
    ...new Set([
      preferredX,
      area.left,
      clampX(area.width),
      ...controls.flatMap((frame) => [
        clampX(frame.left - width - 4),
        clampX(frame.left + frame.width + 4),
      ]),
    ]),
  ];
  const ys = [
    ...new Set([
      preferredY,
      area.top,
      clampY(area.height),
      ...controls.flatMap((frame) => [
        clampY(frame.top - height - 4),
        clampY(frame.top + frame.height + 4),
      ]),
    ]),
  ];
  const candidates = xs.flatMap((left) => ys.map((top) => ({ left, top, width, height })));
  const overlap = (candidate: (typeof candidates)[number]) =>
    controls.reduce(
      (sum, frame) =>
        sum +
        Math.max(
          0,
          Math.min(candidate.left + width + 2, frame.left + frame.width) -
            Math.max(candidate.left - 2, frame.left),
        ) *
          Math.max(
            0,
            Math.min(candidate.top + height + 2, frame.top + frame.height) -
              Math.max(candidate.top - 2, frame.top),
          ),
      0,
    );
  const distance = (candidate: (typeof candidates)[number]) =>
    Math.abs(candidate.left - preferredX) + Math.abs(candidate.top - preferredY);
  candidates.sort((a, b) => overlap(a) - overlap(b) || distance(a) - distance(b));
  return candidates[0]!;
}
export function GameControls({
  area,
  layout,
  blocked = false,
  actionDisabled = false,
  menuDisabled = false,
  dialogue = false,
  actionHint = '交谈 / 调查',
  hintObstacles = [],
  growthPoints = 0,
  onDirection,
  onDirectionEnd,
  onInteract,
  onMenu,
  editing,
}: {
  area: ControlArea;
  layout: ControlLayout;
  blocked?: boolean;
  actionDisabled?: boolean;
  menuDisabled?: boolean;
  dialogue?: boolean;
  actionHint?: string;
  hintObstacles?: ControlFrame[];
  growthPoints?: number;
  onDirection?: (direction: WalkDirection) => void;
  onDirectionEnd?: () => void;
  onInteract?: () => void;
  onMenu?: () => void;
  editing?: ControlEditing;
}) {
  const dpad = resolveControlFrame('dpad', layout, area);
  const action = resolveControlFrame('interact', layout, area);
  const menu = resolveControlFrame('menu', layout, area);
  const growth = resolveControlFrame('growth', layout, area);
  const hint = interactionHintFrame(area, action, [
    dpad,
    action,
    menu,
    ...(growthPoints > 0 ? [growth] : []),
    ...hintObstacles,
  ]);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {(!dialogue || editing) && (
        <Control id="dpad" frame={dpad} editing={editing}>
          <DirectionPad
            key={`${dpad.left}:${dpad.top}:${dpad.width}:${dpad.visualSize}`}
            size={dpad.width}
            visualSize={dpad.visualSize}
            opacity={layout.dpad?.opacity ?? DEFAULT_DIRECTION_PAD_OPACITY}
            disabled={!editing && blocked}
            onDirection={onDirection}
            onRelease={onDirectionEnd}
          />
        </Control>
      )}
      <Control id="interact" frame={action} editing={editing}>
        <Pressable
          testID="interact"
          accessibilityRole="button"
          accessibilityLabel={dialogue ? 'A 继续对话' : `A ${actionHint}`}
          onPress={onInteract}
          disabled={!editing && actionDisabled}
          style={({ pressed }) => [s.aButton, pressed && s.pressed]}
        >
          <Text style={[s.aText, { fontSize: 28 * action.scale }]}>A</Text>
        </Pressable>
      </Control>
      {!editing && !dialogue && (
        <Text
          testID="interact-target-hint"
          pointerEvents="none"
          numberOfLines={2}
          style={[
            s.hint,
            {
              left: hint.left,
              top: hint.top,
              width: hint.width,
              maxHeight: hint.height,
            },
          ]}
        >
          {actionHint}
        </Text>
      )}
      <Control id="menu" frame={menu} editing={editing}>
        <Pressable
          testID="explore-menu"
          accessibilityRole="button"
          accessibilityLabel="☷ 菜单"
          onPress={onMenu}
          disabled={!editing && menuDisabled}
          style={({ pressed }) => [s.menuButton, pressed && s.pressed]}
        >
          <Text style={[s.menuText, { fontSize: 14 * menu.scale }]}>☷ 菜单</Text>
        </Pressable>
      </Control>
      {(growthPoints > 0 || editing) && (
        <Control id="growth" frame={growth} editing={editing}>
          <Pressable
            testID="growth-review"
            accessibilityRole="button"
            accessibilityLabel={`分配能力点 ${growthPoints}`}
            onPress={onMenu}
            disabled={!editing && blocked}
            style={({ pressed }) => [
              s.menuButton,
              { borderColor: palette.amber },
              pressed && s.pressed,
            ]}
          >
            <Text style={[s.menuText, { color: palette.gold, fontSize: 14 * growth.scale }]}>
              培养 +{growthPoints || 8}
            </Text>
          </Pressable>
        </Control>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  aButton: {
    flex: 1,
    borderRadius: 100,
    backgroundColor: `${palette.amber}eb`,
    borderWidth: 2,
    borderColor: '#b99042',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aText: {
    color: palette.ink,
    fontWeight: '800',
  },
  menuButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: `${palette.panel}f2`,
  },
  menuText: { color: palette.ink, fontWeight: '700' },
  pressed: { backgroundColor: palette.tint, transform: [{ scale: 0.97 }] },
  hint: {
    position: 'absolute',
    color: palette.ink,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    backgroundColor: `${palette.panel}d9`,
    borderRadius: 5,
    paddingVertical: 2,
  },
  editable: {
    outlineWidth: 1,
    outlineColor: `${palette.onDark}88`,
    outlineStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: `${palette.ink}44`,
  },
  selected: { outlineWidth: 2, outlineColor: palette.amber, backgroundColor: `${palette.amber}22` },
});
