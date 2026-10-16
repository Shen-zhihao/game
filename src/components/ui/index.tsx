import { HapticPressable as Pressable } from '../HapticPressable';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { TYPES, TYPE_COLORS } from '../../content/catalog';
import { TypeId } from '../../game/model';

export const palette = {
  canvas: '#f7f2e7',
  ink: '#362f26',
  panel: '#fffcf5',
  panel2: '#efe7d8',
  line: '#ded2bd',
  text: '#362f26',
  muted: '#827463',
  gold: '#a36c18',
  accent: '#96621a',
  amber: '#efbc48',
  tint: '#fff0c4',
  onDark: '#fffcf5',
  red: '#af5143',
};
export function Label({
  children,
  muted = false,
  style,
  testID,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<import('react-native').TextStyle>;
  testID?: string;
}) {
  return (
    <Text testID={testID} style={[styles.text, muted && styles.muted, style]}>
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  accent = false,
  small = false,
  selected,
  testID,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
  small?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
      }
      accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }}
      aria-pressed={selected}
      testID={testID}
      disabled={disabled}
      feedback={accent ? 'confirm' : 'selection'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.selected,
        accent && styles.accent,
        small && styles.small,
        disabled && styles.disabled,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, accent && { color: palette.ink }]}>{children}</Text>
    </Pressable>
  );
}
export function TypeBadges({ types }: { types: TypeId[] }) {
  return (
    <View style={styles.typeRow}>
      {types.map((t) => (
        <View key={t} style={[styles.type, { backgroundColor: TYPE_COLORS[t] }]}>
          <Text style={styles.typeText}>{TYPES[t]}</Text>
        </View>
      ))}
    </View>
  );
}
export function HpBar({
  value,
  max,
  width = 160,
}: {
  value: number;
  max: number;
  width?: number | `${number}%`;
}) {
  const ratio = value / max;
  return (
    <View style={[styles.hp, { width }]}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
          backgroundColor: ratio > 0.5 ? '#92c878' : ratio > 0.2 ? '#e6c66e' : '#d67c65',
        }}
      />
    </View>
  );
}
export function Panel({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.panel, style]}>
      {children}
    </View>
  );
}
export const styles = StyleSheet.create({
  text: { color: palette.text, fontSize: 14, lineHeight: 21, fontFamily: 'System' },
  muted: { color: palette.muted },
  button: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: { color: palette.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  selected: { backgroundColor: palette.tint, borderColor: palette.amber },
  accent: { backgroundColor: palette.amber, borderColor: palette.amber },
  small: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 36 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 4 },
  type: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 11, fontWeight: '800', color: palette.ink },
  hp: {
    height: 7,
    backgroundColor: palette.panel2,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  title: {
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: 0.5,
  },
});
