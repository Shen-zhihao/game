import React, { useRef } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { HapticPressable as Pressable } from '../HapticPressable';
import { palette } from '../ui';
import type { Direction } from '../../game/model';
import {
  CONTROL_NAMES,
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
export function GameControls({
  area,
  layout,
  blocked = false,
  actionDisabled = false,
  menuDisabled = false,
  dialogue = false,
  facingWater = false,
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
  facingWater?: boolean;
  growthPoints?: number;
  onDirection?: (direction: Direction) => void;
  onDirectionEnd?: () => void;
  onInteract?: () => void;
  onMenu?: () => void;
  editing?: ControlEditing;
}) {
  const dpad = resolveControlFrame('dpad', layout, area);
  const action = resolveControlFrame('interact', layout, area);
  const menu = resolveControlFrame('menu', layout, area);
  const growth = resolveControlFrame('growth', layout, area);
  const arrows: [Direction, string, number, number][] = [
    ['up', '▴', 1, 0],
    ['left', '◂', 0, 1],
    ['right', '▸', 2, 1],
    ['down', '▾', 1, 2],
  ];
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {(!dialogue || editing) && (
        <Control id="dpad" frame={dpad} editing={editing}>
          {arrows.map(([direction, symbol, x, y]) => (
            <Pressable
              key={direction}
              testID={`move-${direction}`}
              accessibilityRole="button"
              accessibilityLabel={`向${{ up: '上', down: '下', left: '左', right: '右' }[direction]}移动`}
              onPressIn={() => onDirection?.(direction)}
              onPressOut={onDirectionEnd}
              disabled={!editing && blocked}
              style={({ pressed }) => [
                s.arrow,
                {
                  left: (x * dpad.width) / 3,
                  top: (y * dpad.height) / 3,
                  width: dpad.width / 3,
                  height: dpad.height / 3,
                  borderRadius: 13 * dpad.scale,
                },
                pressed && s.pressed,
                !editing && blocked && { opacity: 0.3 },
              ]}
            >
              <Text style={[s.arrowText, { fontSize: 25 * dpad.scale }]}>{symbol}</Text>
            </Pressable>
          ))}
        </Control>
      )}
      <Control id="interact" frame={action} editing={editing}>
        <Pressable
          testID="interact"
          accessibilityRole="button"
          accessibilityLabel={facingWater ? 'A 调查水面' : 'A 交谈调查'}
          onPress={onInteract}
          disabled={!editing && actionDisabled}
          style={({ pressed }) => [s.aButton, pressed && s.pressed]}
        >
          <Text style={[s.aText, { fontSize: 28 * action.scale }]}>A</Text>
        </Pressable>
      </Control>
      {!editing && area.height >= 300 && !dialogue && (
        <Text
          pointerEvents="none"
          style={[
            s.hint,
            {
              left: action.left - 8,
              top: action.top + action.height + 4,
              width: action.width + 16,
            },
          ]}
        >
          {facingWater ? '调查水面' : '交谈 / 调查'}
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
              { borderColor: palette.gold },
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
  arrow: {
    position: 'absolute',
    backgroundColor: '#163d2e80',
    borderWidth: 1,
    borderColor: '#edf2d378',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#f3f3db', textShadowColor: '#173c2b', textShadowRadius: 3 },
  aButton: {
    flex: 1,
    borderRadius: 100,
    backgroundColor: '#e4cd8b88',
    borderWidth: 2,
    borderColor: '#fff0bc99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aText: { color: '#fff6d7', fontWeight: '800', textShadowColor: '#3a573c', textShadowRadius: 3 },
  menuButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f6e8be66',
    backgroundColor: '#17392d80',
  },
  menuText: { color: '#fff5d6', fontWeight: '700' },
  pressed: { backgroundColor: '#517b52c7', transform: [{ scale: 0.97 }] },
  hint: {
    position: 'absolute',
    color: '#fff3d0',
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: '#173c2b',
    textShadowRadius: 3,
  },
  editable: {
    outlineWidth: 1,
    outlineColor: '#f6e8be88',
    outlineStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#10272044',
  },
  selected: { outlineWidth: 2, outlineColor: palette.gold, backgroundColor: '#efcf8122' },
});
