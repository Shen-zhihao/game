import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { SaveRepository } from '../../persistence/repository';
import { exportSave, pickSave } from '../../persistence/saveFiles';
import { Snapshot, summary } from '../../persistence/snapshot';
import { decodeSaveFile, selectSaveEntry } from '../../persistence/archive';

export type Slots = Awaited<ReturnType<SaveRepository['list']>>;
export function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
}
export function SnapshotInfo({ snapshot, label }: { snapshot: Snapshot; label?: string }) {
  const s = summary(snapshot);
  return (
    <View style={{ gap: 4 }}>
      {!!label && <Label style={{ color: palette.gold, fontWeight: '700' }}>{label}</Label>}
      <Label style={{ fontSize: 17, fontWeight: '800' }}>
        {s.name}　·　{s.map}
      </Label>
      <Label muted style={{ fontSize: 12 }}>
        {s.badges} 枚徽章 · {timeLabel(s.playTimeSeconds)} ·{' '}
        {new Date(snapshot.savedAt).toLocaleString()}
      </Label>
      <Label muted style={{ fontSize: 11 }}>
        队伍 {s.party.length} 只 · 内容 {s.contentVersion}
      </Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {s.party.map((member, index) => (
          <View
            key={index}
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.canvas,
            }}
          >
            <CreatureSprite speciesId={member.speciesId} size={38} />
          </View>
        ))}
      </View>
    </View>
  );
}
export function SaveMenu({
  repository,
  slot,
  saveStatus,
  onSave,
  onSaveAs,
  onReload,
  onTitle,
  hasGame = true,
}: {
  repository: SaveRepository;
  slot: number;
  saveStatus: string;
  onSave: () => Promise<Snapshot | null>;
  onSaveAs: () => Promise<number>;
  onReload: (slot: number) => Promise<void>;
  onTitle: () => Promise<void>;
  hasGame?: boolean;
}) {
  const [slots, setSlots] = useState<Slots>([]);
  const [selected, setSelected] = useState(slot);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ label: string; snapshot: Snapshot }[]>([]);
  const [incoming, setIncoming] = useState<ReturnType<typeof decodeSaveFile> | null>(null);
  const [incomingSelected, setIncomingSelected] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const running = useRef(false);
  const refresh = useCallback(async () => {
    const list = await repository.list();
    setSlots(list);
  }, [repository]);
  useEffect(() => {
    let alive = true;
    void repository
      .list()
      .then((list) => {
        if (alive) setSlots(list);
      })
      .catch((e: unknown) => {
        if (alive) setMessage(String(e));
      });
    return () => {
      alive = false;
    };
  }, [repository]);
  const attempt = async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const current = slots.find((s) => s.slot === selected);
  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
      <Label style={styles.title}>读取与管理存档</Label>
      <Label muted style={{ fontSize: 12 }}>
        先选择一份存档，再按读取；每次只读取所选存档。每槽保留10份历史，覆盖前另留保护备份。
      </Label>
      <Label muted style={{ fontSize: 12 }}>
        存档不绑定账号或设备。分享文件后，其他玩家可导入为新档继续；角色名字与原进度一并保留。
      </Label>
      <Panel style={{ padding: 12, gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Label style={{ fontSize: 13, fontWeight: '800' }}>旅程记录</Label>
          <Label muted style={{ fontSize: 11 }}>
            当前选择 · 槽位 {selected}
          </Label>
        </View>
        <ScrollView
          testID="save-slot-list"
          nestedScrollEnabled
          style={{ maxHeight: 150 }}
          contentContainerStyle={[styles.wrap, { gap: 6, paddingBottom: 2 }]}
        >
          {slots.map((s) => (
            <Button
              key={s.slot}
              testID={`save-slot-${s.slot}`}
              small
              selected={selected === s.slot}
              accent={selected === s.slot}
              disabled={busy}
              onPress={() => {
                setSelected(s.slot);
                setHistory([]);
                setConfirm(false);
              }}
            >
              槽位 {s.slot}
              {hasGame && s.slot === slot ? ' · 当前' : ''} {s.error ? '⚠' : s.snapshot ? '●' : '○'}
              {s.summary ? ` ${s.summary.name}` : ''}
            </Button>
          ))}
        </ScrollView>
      </Panel>
      {current?.snapshot && !current.error ? (
        <Panel>
          <SnapshotInfo snapshot={current.snapshot} />
        </Panel>
      ) : (
        <Label muted>{current?.error ?? '这个槽位是空的。'}</Label>
      )}
      <View style={styles.wrap}>
        <Button
          accent
          disabled={busy || !hasGame}
          onPress={() =>
            attempt(async () => {
              await onSave();
              await refresh();
              setMessage('当前进度已保存。');
            })
          }
        >
          保存当前冒险 · 槽 {slot}
        </Button>
        <Button
          testID="save-as-new"
          disabled={busy || !hasGame}
          onPress={() =>
            attempt(async () => {
              const target = await onSaveAs();
              setSelected(target);
              setHistory([]);
              await refresh();
              setMessage(`已另存到新槽位 ${target}，后续进度保存在此槽，原档保留。`);
            })
          }
        >
          另存为新档并继续
        </Button>
        <Button
          testID="load-selected-save"
          disabled={busy || !current?.snapshot || !!current.error}
          onPress={() =>
            attempt(async () => {
              await onReload(selected);
            })
          }
        >
          读取所选存档 · 槽 {selected}
        </Button>
        <Button
          disabled={busy || !current?.snapshot || !!current.error}
          onPress={() =>
            attempt(async () => {
              if (hasGame && selected === slot) await onSave();
              const s = await repository.load(selected);
              if (s) await exportSave(s.snapshot);
              await refresh();
              setMessage('已打开系统分享或下载存档文件，接收者可直接导入。');
            })
          }
        >
          分享所选存档文件
        </Button>
        <Button
          testID="import-save-file"
          disabled={busy}
          onPress={() =>
            attempt(async () => {
              await onSave();
              const text = await pickSave();
              if (text) {
                setIncoming(decodeSaveFile(text));
                setIncomingSelected(0);
                setConfirm(false);
                await refresh();
              }
            })
          }
        >
          导入存档文件
        </Button>
        <Button
          disabled={busy}
          onPress={() =>
            attempt(async () => {
              await onSave();
              setHistory(await repository.recovery(selected));
              await refresh();
            })
          }
        >
          历史与保护备份
        </Button>
      </View>
      <Label muted style={{ fontSize: 12 }}>
        {saveStatus} {message}
      </Label>
      {incoming && (
        <Panel style={{ gap: 12 }}>
          <Label style={{ color: palette.gold, fontWeight: '700' }}>
            {incoming.collection ? '从旧合集选择一份存档' : '准备恢复的存档'}
          </Label>
          {incoming.collection && (
            <View style={styles.wrap}>
              {incoming.entries.map((entry, index) => (
                <Button
                  key={index}
                  small
                  testID={`import-entry-${index}`}
                  selected={incomingSelected === index}
                  accent={incomingSelected === index}
                  disabled={busy}
                  onPress={() => {
                    setIncomingSelected(index);
                    setConfirm(false);
                  }}
                >
                  原槽 {entry.slot} · {summary(entry.snapshot).name}
                </Button>
              ))}
            </View>
          )}
          <SnapshotInfo snapshot={selectSaveEntry(incoming, incomingSelected).snapshot} />
          <Label muted>只导入并读取上面选中的这一份。新增导入会保留本机原有存档。</Label>
          <View style={styles.wrap}>
            <Button
              accent
              testID="import-as-new"
              disabled={busy}
              onPress={() =>
                attempt(async () => {
                  const restored = await repository.importNew(
                    JSON.stringify(incoming.file),
                    incomingSelected,
                  );
                  setIncoming(null);
                  setHistory([]);
                  setSelected(restored.slot);
                  await refresh();
                  await onReload(restored.slot);
                })
              }
            >
              导入所选存档为新档并读取
            </Button>
            <Button
              disabled={busy}
              onPress={() =>
                attempt(async () => {
                  if (!confirm && current?.snapshot) {
                    setConfirm(true);
                    return;
                  }
                  await repository.import(
                    selected,
                    JSON.stringify(selectSaveEntry(incoming, incomingSelected).snapshot),
                    current?.snapshot?.revisionId ?? null,
                    repository.newBranch(),
                  );
                  setIncoming(null);
                  setHistory([]);
                  await onReload(selected);
                  await refresh();
                  setMessage('已恢复并读取。');
                })
              }
            >
              {confirm
                ? '确认覆盖并恢复'
                : `${current?.snapshot ? '覆盖' : '恢复到'}槽位 ${selected}`}
            </Button>
            <Button disabled={busy} onPress={() => setIncoming(null)}>
              取消
            </Button>
          </View>
          {current?.snapshot && (
            <Label muted>覆盖槽位 {selected} 前会保留原进度到保护备份，需再次确认。</Label>
          )}
        </Panel>
      )}
      {history.map((h, i) => (
        <Panel key={`${h.snapshot.revisionId}-${i}`} style={{ gap: 8 }}>
          <SnapshotInfo snapshot={h.snapshot} label={h.label} />
          <Button
            small
            onPress={() => {
              setIncoming(decodeSaveFile(JSON.stringify(h.snapshot)));
              setIncomingSelected(0);
              setConfirm(false);
            }}
          >
            预览恢复此版本
          </Button>
          <Button small disabled={busy} onPress={() => attempt(() => exportSave(h.snapshot))}>
            分享此历史版本
          </Button>
        </Panel>
      ))}
      <Button disabled={busy} onPress={() => attempt(onTitle)}>
        保存并返回标题
      </Button>
    </ScrollView>
  );
}
