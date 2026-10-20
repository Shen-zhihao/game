import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { Command, GameState } from '../../game/model';
import { MAX_PARTY_PRESETS, presetApplyReason, presetMenuReason } from '../../game/party/presets';
import { creatureName } from '../../game/rules';
import { Button, Label, palette, Panel, styles } from '../ui';

export function PartyPresetsPanel({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<{
    kind: 'delete' | 'save';
    index: number;
    expectedName: string;
  } | null>(null);
  const presets = game.partyPresets ?? [];
  const reason = presetMenuReason(game);
  const send = (action: Extract<Command, { kind: 'partyPreset' }>['action']) => {
    setConfirm(null);
    dispatch({ kind: 'partyPreset', action });
  };
  return (
    <Panel style={{ padding: 12, gap: 8 }}>
      <Button
        small
        testID="preset-toggle"
        onPress={() => {
          setOpen(!open);
          setConfirm(null);
        }}
      >
        {open ? '收起队伍预设' : `队伍预设 ${presets.length}/${MAX_PARTY_PRESETS}`}
      </Button>
      {open && (
        <>
          <Label muted>
            保存当前队伍的成员和顺序。仅在城镇安全状态切换，不改技能、培养、携带物或体力。
          </Label>
          {!!reason && <Label muted>{reason}</Label>}
          <TextInput
            testID="preset-name"
            accessibilityLabel="队伍预设名称"
            placeholder="预设名称，例如探索队"
            placeholderTextColor={palette.muted}
            value={name}
            maxLength={20}
            onChangeText={(text) => {
              setName(text);
              setConfirm(null);
            }}
            style={{
              minHeight: 40,
              color: palette.ink,
              borderColor: palette.line,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 10,
            }}
          />
          <Button
            small
            testID="preset-save-new"
            disabled={!!reason || !name.trim() || presets.length >= MAX_PARTY_PRESETS}
            onPress={() => send({ kind: 'save', index: null, name })}
          >
            保存当前队伍为新预设
          </Button>
          {!presets.length && <Label muted>还没有预设。先整理当前队伍，再输入名称保存。</Label>}
          {presets.map((preset, index) => {
            const applyReason = presetApplyReason(game, index);
            return (
              <View
                key={index}
                style={{ gap: 6, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 8 }}
              >
                <Label style={{ fontWeight: '700' }}>
                  {index + 1}. {preset.name}
                </Label>
                <Label muted>
                  {preset.creatureIds
                    .map(
                      (id, order) =>
                        `${order + 1}. ${game.creatures[id] ? creatureName(game.creatures[id]!) : '伙伴已离队'}`,
                    )
                    .join(' → ')}
                </Label>
                <View style={styles.wrap}>
                  <Button
                    small
                    testID={`preset-apply-${index}`}
                    disabled={!!applyReason}
                    onPress={() => send({ kind: 'apply', index, expectedName: preset.name })}
                  >
                    切换此队伍
                  </Button>
                  <Button
                    small
                    testID={`preset-rename-${index}`}
                    disabled={!!reason || !name.trim()}
                    onPress={() => send({ kind: 'rename', index, name, expectedName: preset.name })}
                  >
                    用输入名称改名
                  </Button>
                  <Button
                    small
                    testID={`preset-overwrite-${index}`}
                    disabled={!!reason}
                    onPress={() => setConfirm({ kind: 'save', index, expectedName: preset.name })}
                  >
                    用当前队伍覆盖
                  </Button>
                  <Button
                    small
                    testID={`preset-delete-${index}`}
                    disabled={!!reason}
                    onPress={() => setConfirm({ kind: 'delete', index, expectedName: preset.name })}
                  >
                    删除预设
                  </Button>
                </View>
                {!!applyReason && <Label muted>{applyReason}</Label>}
                {confirm?.index === index && confirm.expectedName === preset.name && (
                  <>
                    <Label>
                      {confirm.kind === 'delete'
                        ? `删除「${preset.name}」的预设记录？伙伴不会被放生。`
                        : `用当前${game.party.length}位伙伴覆盖「${preset.name}」？保留原名称。`}
                    </Label>
                    <View style={styles.wrap}>
                      <Button
                        small
                        testID={`preset-confirm-${index}`}
                        disabled={!!reason}
                        onPress={() =>
                          send(
                            confirm.kind === 'delete'
                              ? { kind: 'delete', index, expectedName: preset.name }
                              : {
                                  kind: 'save',
                                  index,
                                  name: preset.name,
                                  expectedName: preset.name,
                                },
                          )
                        }
                      >
                        确认{confirm.kind === 'delete' ? '删除' : '覆盖'}
                      </Button>
                      <Button small testID="preset-cancel" onPress={() => setConfirm(null)}>
                        取消
                      </Button>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </>
      )}
    </Panel>
  );
}
