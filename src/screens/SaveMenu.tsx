import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Label, palette, Panel, styles } from '../components/ui';
import { SaveRepository } from '../persistence/repository';
import { exportSave, pickSave } from '../persistence/saveFiles';
import { decodeSnapshot, Snapshot, summary } from '../persistence/snapshot';

export type Slots = Awaited<ReturnType<SaveRepository['list']>>;
export function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
}
export function SnapshotInfo({ snapshot, label }: { snapshot: Snapshot; label?: string }) {
  const s = summary(snapshot);
  return (
    <View style={{ gap: 4 }}>
      {!!label && <Label style={{ color: palette.gold, fontWeight: '700' }}>{label}</Label>}
      <Label>
        {s.name}　·　{s.map}
      </Label>
      <Label muted style={{ fontSize: 12 }}>
        {s.badges} 枚徽章 · {timeLabel(s.playTimeSeconds)} ·{' '}
        {new Date(snapshot.savedAt).toLocaleString()}
      </Label>
      <Label muted style={{ fontSize: 11 }}>
        队伍 {s.party.length} 只 · 内容 {s.contentVersion}
      </Label>
    </View>
  );
}
export function SaveMenu({
  repository,
  slot,
  saveStatus,
  onSave,
  onReload,
  onTitle,
}: {
  repository: SaveRepository;
  slot: number;
  saveStatus: string;
  onSave: () => Promise<Snapshot | null>;
  onReload: (slot: number) => Promise<void>;
  onTitle: () => Promise<void>;
}) {
  const [slots, setSlots] = useState<Slots>([]);
  const [selected, setSelected] = useState(slot);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ label: string; snapshot: Snapshot }[]>([]);
  const [incoming, setIncoming] = useState<Snapshot | null>(null);
  const [confirm, setConfirm] = useState(false);
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
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const current = slots.find((s) => s.slot === selected);
  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
      <Label style={styles.title}>本地冒险记录</Label>
      <Label muted style={{ fontSize: 12 }}>
        每槽保留 10 份历史；覆盖导入前另保留保护备份。
      </Label>
      <View style={styles.wrap}>
        {slots.map((s) => (
          <Button
            key={s.slot}
            small
            accent={selected === s.slot}
            onPress={() => {
              setSelected(s.slot);
              setHistory([]);
              setConfirm(false);
            }}
          >
            槽位 {s.slot}
            {s.slot === slot ? ' · 当前' : ''} {s.error ? '⚠' : s.snapshot ? '●' : '○'}
          </Button>
        ))}
      </View>
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
          disabled={busy}
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
          disabled={busy || !current?.snapshot || !!current.error}
          onPress={() =>
            attempt(async () => {
              await onSave();
              await onReload(selected);
            })
          }
        >
          读取所选槽位
        </Button>
        <Button
          disabled={busy || !current?.snapshot || !!current.error}
          onPress={() =>
            attempt(async () => {
              await onSave();
              const s = await repository.load(selected);
              if (s) await exportSave(s.snapshot);
            })
          }
        >
          导出文件备份
        </Button>
        <Button
          disabled={busy}
          onPress={() =>
            attempt(async () => {
              await onSave();
              const text = await pickSave();
              if (text) {
                setIncoming(decodeSnapshot(text).snapshot);
                setConfirm(false);
                await refresh();
              }
            })
          }
        >
          导入备份文件
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
          <SnapshotInfo snapshot={incoming} label="准备恢复的存档" />
          <Label>
            {current?.snapshot
              ? `将覆盖槽位 ${selected}，原进度会保留到保护备份。`
              : `将写入空槽位 ${selected}。`}
          </Label>
          <View style={styles.wrap}>
            <Button
              accent
              disabled={busy}
              onPress={() =>
                attempt(async () => {
                  if (!confirm && current?.snapshot) {
                    setConfirm(true);
                    return;
                  }
                  await repository.import(
                    selected,
                    JSON.stringify(incoming),
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
              {confirm ? '确认覆盖并恢复' : `恢复到槽位 ${selected}`}
            </Button>
            <Button onPress={() => setIncoming(null)}>取消</Button>
          </View>
        </Panel>
      )}
      {history.map((h, i) => (
        <Panel key={`${h.snapshot.revisionId}-${i}`} style={{ gap: 8 }}>
          <SnapshotInfo snapshot={h.snapshot} label={h.label} />
          <Button
            small
            onPress={() => {
              setIncoming(h.snapshot);
              setConfirm(false);
            }}
          >
            预览恢复此版本
          </Button>
        </Panel>
      ))}
      <Button disabled={busy} onPress={() => attempt(onTitle)}>
        保存并返回标题
      </Button>
    </ScrollView>
  );
}
