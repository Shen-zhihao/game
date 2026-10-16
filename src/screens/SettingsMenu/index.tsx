import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { MenuIcon } from '../../components/MenuIcon';
import type { Command, GameState } from '../../game/model';
import { cheatReason } from '../../game/cheats';
import { HelpMenu, menuStyles } from '../GameMenus';
import { setHapticsEnabled, useHapticsEnabled, haptic } from '../../platform/haptics';
import { setMusicPreferences, useMusicPreferences } from '../../platform/music';
import { setDayNightEnabled, useDayNightEnabled } from '../../platform/dayNight';
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
  const [contentWidth, setContentWidth] = useState(0);
  const [page, setPage] = useState<'root' | 'help' | 'cheats'>('root');
  const hapticsEnabled = useHapticsEnabled();
  const musicSettings = useMusicPreferences();
  const battleMessageDelay = useBattleMessageDelay();
  const dayNightEnabled = useDayNightEnabled();
  if (page !== 'root')
    return (
      <View style={{ flex: 1, minHeight: 0, gap: 12 }}>
        <Button small style={{ alignSelf: 'flex-start' }} onPress={() => setPage('root')}>
          ‹ 设置
        </Button>
        {page === 'help' ? <HelpMenu /> : <CheatMenu game={game} dispatch={dispatch} />}
      </View>
    );
  return (
    <ScrollView
      testID="settings-scroll"
      style={{ flex: 1, minHeight: 0 }}
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
      contentContainerStyle={{ gap: 14, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View style={settingsStyles.heading}>
        <View>
          <Label style={styles.title}>偏好设置</Label>
          <Label muted style={{ fontSize: 12 }}>
            让冒险按你的节奏进行
          </Label>
        </View>
        <View style={settingsStyles.localBadge}>
          <Label style={{ fontSize: 10, color: palette.gold }}>本机保存</Label>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <SettingSection title="声音与触感" icon="settings" wide={contentWidth >= 650}>
          <SettingToggle
            testID="settings-music"
            title="背景音乐"
            enabled={musicSettings.enabled}
            onPress={() =>
              setMusicPreferences({
                enabled: !musicSettings.enabled,
                volume: musicSettings.volume || 0.55,
              })
            }
          />
          <Label testID="music-current-track" muted style={{ fontSize: 12 }}>
            场景配乐 · {music.title}
          </Label>
          <View style={[styles.wrap, { gap: 6 }]}>
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
          <Label muted style={settingsStyles.description}>
            探索、特殊区域、重要人物对话与战斗自动切换配乐；切到后台暂停。
          </Label>
          {!!music.issue && musicSettings.enabled && musicSettings.volume > 0 && (
            <Label testID="music-playback-issue" style={{ color: palette.red, fontSize: 12 }}>
              {music.issue}
            </Label>
          )}
          <View style={settingsStyles.divider} />
          <SettingToggle
            testID="settings-haptics"
            title="触感震动"
            enabled={hapticsEnabled}
            onPress={() => {
              setHapticsEnabled(!hapticsEnabled);
              if (!hapticsEnabled) haptic('confirm');
            }}
          />
          <Label muted style={settingsStyles.description}>
            按钮、方向键与战斗命中提供轻触反馈。
          </Label>
        </SettingSection>
        <SettingSection title="旅途与节奏" icon="map" wide={contentWidth >= 650}>
          <SettingToggle
            testID="settings-day-night"
            title="白天黑夜循环"
            enabled={dayNightEnabled}
            onPress={() => setDayNightEnabled(!dayNightEnabled)}
          />
          <Label testID="day-night-setting-description" muted style={settingsStyles.description}>
            白天、夜晚各约 30
            分钟，午夜日期自动前进。夜晚露天场景变暗、建筑亮灯，战斗和室内保持正常亮度。关闭后保持白天亮度，日期仍会推进。
          </Label>
          <View style={settingsStyles.divider} />
          <Label testID="battle-playback-setting" style={{ fontWeight: '700', fontSize: 13 }}>
            战斗自动播放间隔 · {battleMessageDelay / 1000} 秒
          </Label>
          <View style={[styles.wrap, { gap: 6 }]}>
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
          <Label muted style={settingsStyles.description}>
            默认每条停留 2 秒，技能动画完整播放；技能、道具和换人由你选择。
          </Label>
        </SettingSection>
        <SettingSection title="操作与帮助" icon="party" wide={false}>
          <View style={[styles.wrap, { gap: 8 }]}>
            <Button testID="settings-control-layout" onPress={onEditControls}>
              按钮布局 ↗
            </Button>
            <Button testID="settings-help" onPress={() => setPage('help')}>
              操作说明 ↗
            </Button>
            <Button testID="settings-cheats" disabled={!game} onPress={() => setPage('cheats')}>
              金手指 ↗
            </Button>
          </View>
          <Label muted style={settingsStyles.description}>
            拖动方向键、A 键、菜单与培养按钮，分别调整大小；横竖屏分别保存。
          </Label>
          {!game && <Label muted>开始或继续一段冒险后，可以使用金手指。</Label>}
        </SettingSection>
      </View>
    </ScrollView>
  );
}
function SettingSection({
  title,
  icon,
  wide,
  children,
}: {
  title: string;
  icon: 'settings' | 'map' | 'party';
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <Panel style={{ padding: 16, gap: 12, width: wide ? '48%' : '100%', flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={settingsStyles.sectionIcon}>
          <MenuIcon name={icon} size={17} />
        </View>
        <Label style={{ fontWeight: '800', fontSize: 15 }}>{title}</Label>
      </View>
      {children}
    </Panel>
  );
}
function SettingToggle({
  title,
  enabled,
  onPress,
  testID,
}: {
  title: string;
  enabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: enabled }}
      aria-checked={enabled}
      onPress={onPress}
      style={({ pressed }) => [settingsStyles.toggle, pressed && { opacity: 0.7 }]}
    >
      <View style={{ flex: 1 }}>
        <Label style={{ fontSize: 13, fontWeight: '700' }}>{title}</Label>
        <Label muted style={{ fontSize: 10, lineHeight: 15 }}>
          {enabled ? '已开启' : '已关闭'}
        </Label>
      </View>
      <View style={[settingsStyles.track, enabled && { backgroundColor: palette.ink }]}>
        <View
          style={[
            settingsStyles.thumb,
            enabled && { alignSelf: 'flex-end', backgroundColor: palette.amber },
          ]}
        />
      </View>
    </Pressable>
  );
}
const settingsStyles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  localBadge: {
    backgroundColor: palette.tint,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  description: { fontSize: 12, lineHeight: 20 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: palette.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 2 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { width: 44, height: 26, borderRadius: 15, padding: 3, backgroundColor: palette.panel2 },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.panel },
});

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
          style={[styles.text, { color: error ? palette.red : palette.accent }]}
        >
          {error || game?.notice}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}
