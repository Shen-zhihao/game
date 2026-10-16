import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Button, Label, palette, styles } from '../../components/ui';
import type { Command, GameState } from '../../game/model';
import { cheatReason } from '../../game/cheats';
import { HelpMenu, menuStyles } from '../GameMenus';
import { setHapticsEnabled, useHapticsEnabled, haptic } from '../../platform/haptics';
import { setMusicPreferences, useMusicPreferences } from '../../platform/music';
import {
  BATTLE_MESSAGE_DELAYS,
  setBattleMessageDelay,
  useBattleMessageDelay,
} from '../../platform/battlePlayback';

export function SettingsMenu({
  game,
  music,
  dispatch,
  onEditControls,
}: {
  game: GameState | null;
  music: { title: string; issue: string };
  dispatch: (command: Command) => void;
  onEditControls: () => void;
}) {
  const [page, setPage] = useState<'root' | 'help' | 'cheats'>('root');
  const hapticsEnabled = useHapticsEnabled();
  const musicSettings = useMusicPreferences();
  const battleMessageDelay = useBattleMessageDelay();
  if (page === 'help') return <HelpMenu />;
  if (page === 'cheats') return <CheatMenu game={game} dispatch={dispatch} />;
  return (
    <View style={{ gap: 12 }}>
      <Label style={styles.title}>设置</Label>
      <Button
        testID="settings-music"
        selected={musicSettings.enabled}
        onPress={() =>
          setMusicPreferences({
            enabled: !musicSettings.enabled,
            volume: musicSettings.volume || 0.55,
          })
        }
      >
        背景音乐：{musicSettings.enabled ? '开启' : '关闭'}
      </Button>
      <Label testID="music-current-track">
        场景配乐：{music.title} · 音量 {Math.round(musicSettings.volume * 100)}%
      </Label>
      <View style={styles.wrap}>
        {[0, 0.25, 0.55, 0.8, 1].map((volume) => (
          <Button
            small
            key={volume}
            testID={`music-volume-${Math.round(volume * 100)}`}
            selected={musicSettings.volume === volume}
            onPress={() => setMusicPreferences({ volume, enabled: volume > 0 })}
          >
            {volume === 0 ? '静音' : `${Math.round(volume * 100)}%`}
          </Button>
        ))}
      </View>
      <Label muted style={{ fontSize: 12 }}>
        探索、特殊区域、重要人物对话与战斗自动切换配乐；切到后台暂停，设置保存在本机。
      </Label>
      {!!music.issue && musicSettings.enabled && musicSettings.volume > 0 && (
        <Label testID="music-playback-issue" muted>
          {music.issue}
        </Label>
      )}
      <Button testID="settings-control-layout" onPress={onEditControls}>
        按钮布局
      </Button>
      <Label muted style={{ fontSize: 12 }}>
        拖动方向键、A 键、菜单与培养按钮，分别调整大小；布局保存在本机。
      </Label>
      <Label testID="battle-playback-setting">
        战斗自动播放间隔：{battleMessageDelay / 1000} 秒
      </Label>
      <View style={styles.wrap}>
        {BATTLE_MESSAGE_DELAYS.map((delay) => (
          <Button
            small
            key={delay}
            testID={`battle-playback-${delay}`}
            selected={battleMessageDelay === delay}
            onPress={() => setBattleMessageDelay(delay)}
          >
            {delay / 1000} 秒
          </Button>
        ))}
      </View>
      <Label muted style={{ fontSize: 12 }}>
        战斗信息默认每条停留 2 秒，技能动画完整播放；技能、道具和换人由你选择。
      </Label>
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
        placeholder="输入数字指令"
        placeholderTextColor={palette.muted}
        inputMode="numeric"
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={4}
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
