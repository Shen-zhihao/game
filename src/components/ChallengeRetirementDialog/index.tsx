import { useEffect, useRef } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticPressable as Pressable } from '../HapticPressable';
import { Button, Label, palette, Panel, styles } from '../ui';

export function ChallengeRetirementDialog({
  visible,
  rental,
  streak,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  rental: boolean;
  streak: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const continueRef = useRef<View>(null);
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const keyDown = (event: KeyboardEvent) => {
      // Modal controls receive their keyboard events first; adventure/battle listeners
      // on window must never turn a dialog key into a second game action.
      event.stopPropagation();
      if (!['escape', 'x'].includes(event.key.toLowerCase())) return;
      event.preventDefault();
      if (!event.repeat) onCancel();
    };
    document.addEventListener('keydown', keyDown);
    return () => document.removeEventListener('keydown', keyDown);
  }, [visible, onCancel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      onRequestClose={onCancel}
      onShow={() => continueRef.current?.focus()}
    >
      <ScrollView
        testID="challenge-retire-dialog"
        accessibilityViewIsModal
        role="dialog"
        aria-modal
        accessibilityLabel="确认结束本轮挑战"
        style={s.backdrop}
        contentContainerStyle={[
          s.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
          },
        ]}
      >
        <Panel style={s.panel}>
          <Label style={s.title}>要结束本轮{rental ? '租借' : ''}挑战吗？</Label>
          <Label testID="challenge-retire-consequence">
            本轮挑战会结束，当前 {streak} 连胜将不再继续；下次挑战从 0 连胜开始。
          </Label>
          <Label>
            {rental
              ? '租借伙伴会归还，自己的原队伍与仓库会完整还原。'
              : '原队伍与仓库会完整还原，包括原等级、培养、体力、技能次数与携带道具。'}
          </Label>
          <Label testID="challenge-retire-preserved">已获得的积分和最高纪录都会保留。</Label>
          <Pressable
            ref={continueRef}
            testID="challenge-retire-cancel"
            accessibilityRole="button"
            accessibilityLabel="继续挑战，不结束本轮"
            onPress={onCancel}
            style={({ pressed }) => [styles.button, styles.accent, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>继续挑战</Text>
          </Pressable>
          <Button
            testID="challenge-retire-confirm"
            accessibilityLabel="确认结束本轮挑战并还原原队伍"
            onPress={onConfirm}
          >
            确认结束并还原队伍
          </Button>
        </Panel>
      </ScrollView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#201a15a8' },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '100%', maxWidth: 440, gap: 12 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: palette.ink },
});
