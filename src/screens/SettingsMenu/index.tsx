import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Button, Label, palette, styles } from '../../components/ui';
import type { Command, GameState } from '../../game/model';
import { cheatReason } from '../../game/cheats';
import { HelpMenu, menuStyles } from '../GameMenus';
import { setHapticsEnabled, useHapticsEnabled, haptic } from '../../platform/haptics';

export function SettingsMenu({
  game,
  dispatch,
}: {
  game: GameState | null;
  dispatch: (command: Command) => void;
}) {
  const [page, setPage] = useState<'root' | 'help' | 'cheats'>('root');
  const hapticsEnabled = useHapticsEnabled();
  if (page === 'help') return <HelpMenu />;
  if (page === 'cheats') return <CheatMenu game={game} dispatch={dispatch} />;
  return (
    <View style={{ gap: 12 }}>
      <Label style={styles.title}>设置</Label>
      <Button
        testID="settings-haptics"
        selected={hapticsEnabled}
        onPress={() => {
          setHapticsEnabled(!hapticsEnabled);
          if (!hapticsEnabled) haptic('confirm');
        }}
      >
        触感震动：{hapticsEnabled ? '开启' : '关闭'}
      </Button>
      <Label muted style={{ fontSize: 12 }}>
        按钮、方向键与战斗命中提供轻触反馈；此设置保存在本机。
      </Label>
      <Button testID="settings-help" onPress={() => setPage('help')}>
        操作说明
      </Button>
      <Button testID="settings-cheats" disabled={!game} onPress={() => setPage('cheats')}>
        金手指
      </Button>
      {!game && <Label muted>开始或继续一段冒险后，可以使用金手指。</Label>}
    </View>
  );
}
function CheatMenu({
  game,
  dispatch,
}: {
  game: GameState | null;
  dispatch: (command: Command) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const confirm = () => {
    const reason = game ? cheatReason(game, code) : '请先开始或继续一段冒险。';
    if (reason) {
      setError(reason);
      setSubmitted(false);
      return;
    }
    setError('');
    setSubmitted(true);
    dispatch({ kind: 'cheat', code });
  };
  return (
    <KeyboardAvoidingView
      style={{ gap: 12, flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TextInput
        testID="cheat-code-input"
        accessibilityLabel="金手指数字指令"
        value={code}
        onChangeText={(value) => {
          setCode(value);
          setError('');
          setSubmitted(false);
        }}
        placeholder="输入三位数字指令"
        placeholderTextColor={palette.muted}
        inputMode="numeric"
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={3}
        returnKeyType="done"
        onSubmitEditing={confirm}
        style={[
          menuStyles.input,
          { minHeight: 48, fontSize: 16, borderColor: error ? palette.red : palette.line },
        ]}
      />
      <Button accent testID="cheat-confirm" disabled={!game} onPress={confirm}>
        确认
      </Button>
      {(error || submitted) && (
        <Text
          testID="cheat-result"
          accessibilityLiveRegion="polite"
          style={[styles.text, { color: error ? palette.red : palette.mint }]}
        >
          {error || game?.notice}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}
