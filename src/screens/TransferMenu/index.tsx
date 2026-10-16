import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { SaveRepository } from '../../persistence/repository';
import { decodePairing, encodePairing, Pairing } from '../../transfer/crypto';
import { LAN_AVAILABLE, LanTransfer, NearbyDevice } from '../../transfer/lan';
import { Offer, TransferEvents } from '../../transfer/protocol';
import { entropy } from '../../runtime';
import { menuStyles } from '../GameMenus';
import { Slots, timeLabel } from '../SaveMenu';
import { APP_NAME } from '../../content/brand';

export function TransferMenu({
  repository,
  onImported,
}: {
  repository: SaveRepository;
  onImported: (slot: number) => Promise<void>;
}) {
  const controller = useMemo(() => new LanTransfer(repository, entropy), [repository]);
  const alive = useRef(true);
  const scanLock = useRef(false);
  const [mode, setMode] = useState<'choose' | 'send' | 'receive'>('choose');
  const [status, setStatus] = useState('两部手机连接同一 Wi-Fi，接收端先开启等待。');
  const [slots, setSlots] = useState<Slots>([]);
  const [source, setSource] = useState(1);
  const [target, setTarget] = useState(1);
  const [devices, setDevices] = useState<NearbyDevice[]>([]);
  const [device, setDevice] = useState<NearbyDevice | undefined>();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [code, setCode] = useState('');
  const [scan, setScan] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<{ slot?: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const events = useMemo<TransferEvents>(
    () => ({
      status: (m) => {
        if (alive.current) setStatus(m);
      },
      progress: (r) => {
        if (alive.current) setProgress(r);
      },
      offer: (o) => {
        if (alive.current) {
          setOffer(o);
          setBusy(false);
          setConfirm(false);
          void repository.list().then((s) => {
            if (alive.current) setSlots(s);
          });
        }
      },
      completed: (slot) => {
        if (alive.current) {
          setCompleted({ slot });
          setBusy(false);
          setStatus(
            slot
              ? `接收完成，存档已写入槽位 ${slot}。`
              : '已送达，对方已保存。此手机的原存档仍保留。',
          );
        }
      },
      failed: (m, uncertain) => {
        if (alive.current) {
          setBusy(false);
          setStatus(m + (uncertain ? ' 请查看接收端，或重新配对查询结果。' : ''));
        }
      },
    }),
    [repository],
  );
  useEffect(() => {
    alive.current = true;
    void repository.list().then((s) => {
      if (alive.current) {
        setSlots(s);
        setSource(s.find((v) => v.snapshot && !v.error)?.slot ?? 1);
        setTarget(s.find((v) => !v.snapshot)?.slot ?? 1);
      }
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') {
        controller.stop();
        setPairing(null);
        setScan(false);
        setBusy(false);
        setStatus('已进入后台，传档会话已取消。请重新开始。');
      }
    });
    return () => {
      alive.current = false;
      sub.remove();
      controller.stop();
    };
  }, [controller, repository]);
  const run = useCallback(async (work: () => Promise<void>) => {
    try {
      await work();
    } catch (e) {
      if (alive.current) {
        setBusy(false);
        setStatus(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);
  const reset = () => {
    controller.stop();
    setPairing(null);
    setOffer(null);
    setCompleted(null);
    setProgress(0);
    setBusy(false);
    setScan(false);
    setMode('choose');
    setStatus('两部手机连接同一 Wi-Fi，接收端先开启等待。');
  };
  const beginSend = async (text: string) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScan(false);
    setBusy(true);
    await run(async () => {
      const paired = decodePairing(text);
      const loaded = await repository.load(source);
      if (!loaded) throw new Error('请先选择一个有效的存档');
      await controller.send(paired, loaded.snapshot, events, device);
    });
    scanLock.current = false;
  };
  if (scan)
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Label>扫描接收手机上显示的星苔配对码</Label>
        <CameraView
          style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => {
            void beginSend(result.data);
          }}
        />
        <Button onPress={() => setScan(false)}>取消扫描</Button>
      </View>
    );
  const selected = slots.find((s) => s.slot === target);
  return (
    <ScrollView contentContainerStyle={{ gap: 13, paddingBottom: 20 }}>
      <Label style={styles.title}>存档互传</Label>
      <Label muted>{status}</Label>
      {!LAN_AVAILABLE && (
        <Panel>
          <Label>
            当前是网页试玩。Wi-Fi 搜索和手机直传需要安装 Android / iPhone
            原生版；网页可在「本地存档」导出与导入文件备份。
          </Label>
        </Panel>
      )}
      {mode === 'choose' ? (
        <View style={styles.wrap}>
          <Button
            accent
            disabled={!LAN_AVAILABLE}
            onPress={() => {
              setMode('send');
              void run(() => controller.search(setDevices, setStatus));
            }}
          >
            发送存档 · 搜索附近手机
          </Button>
          <Button
            disabled={!LAN_AVAILABLE}
            onPress={() => {
              setMode('receive');
              setBusy(true);
              void run(async () => {
                const p = await controller.receive(events);
                if (alive.current) {
                  setPairing(p);
                  setBusy(false);
                  setStatus('等待另一部手机搜索并扫描配对码。有效期 2 分钟。');
                }
              });
            }}
          >
            接收存档 · 等待连接
          </Button>
        </View>
      ) : (
        <>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Label style={{ color: palette.gold, fontWeight: '700' }}>
              {mode === 'send' ? '发送端' : '接收端'}
            </Label>
            <Button small onPress={reset}>
              结束本次会话
            </Button>
          </View>
          {mode === 'send' && !completed && (
            <>
              <Label>选择要发送的存档</Label>
              <View style={styles.wrap}>
                {slots.map((s) => (
                  <Button
                    key={s.slot}
                    small
                    accent={source === s.slot}
                    disabled={busy || !s.snapshot || !!s.error}
                    onPress={() => setSource(s.slot)}
                  >
                    槽 {s.slot} · {s.summary?.name ?? '空档'} · {s.summary?.map ?? ''}
                  </Button>
                ))}
              </View>
              <View style={styles.wrap}>
                {devices.map((d) => (
                  <Button
                    key={d.sessionId}
                    small
                    accent={device?.sessionId === d.sessionId}
                    disabled={busy}
                    onPress={() => setDevice(d)}
                  >
                    {d.name} · {d.sessionId.slice(0, 6)}
                  </Button>
                ))}
              </View>
              <Label muted style={{ fontSize: 12 }}>
                {device
                  ? `已选择 ${device.name}，请扫描该手机的配对码。`
                  : '可以选附近设备后扫描，也可以直接扫描接收端配对码连接。'}
              </Label>
              <View style={styles.wrap}>
                <Button
                  accent
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const p = permission?.granted ? permission : await requestPermission();
                      if (!p.granted) throw new Error('未获得相机权限，可在下方粘贴完整配对码');
                      setScan(true);
                    })
                  }
                >
                  扫描配对码
                </Button>
                <Button
                  disabled={busy}
                  onPress={() => void run(() => controller.search(setDevices, setStatus))}
                >
                  重新搜索
                </Button>
              </View>
              <TextInput
                value={code}
                onChangeText={setCode}
                style={menuStyles.input}
                multiline
                maxLength={1500}
                placeholder="也可粘贴接收端的完整配对码"
                placeholderTextColor={palette.muted}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Button
                small
                disabled={busy || !code.trim()}
                onPress={() => void beginSend(code.trim())}
              >
                使用配对码连接
              </Button>
            </>
          )}
          {mode === 'receive' && pairing && !offer && !completed && (
            <View style={[styles.row, { alignItems: 'flex-start', flexWrap: 'wrap' }]}>
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8 }}>
                <QRCode value={encodePairing(pairing)} size={174} />
              </View>
              <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                <Label>让发送手机扫描此二维码</Label>
                <Label muted style={{ fontSize: 12 }}>
                  会话 {pairing.sessionId.slice(0, 6)}　{pairing.host}:{pairing.port}
                </Label>
                <Label muted style={{ fontSize: 12 }}>
                  二维码包含本次临时公钥与配对凭据。请只交给要接收存档的手机。
                </Label>
                <Button
                  small
                  onPress={() =>
                    void Clipboard.setStringAsync(encodePairing(pairing)).then(() =>
                      setStatus('完整配对码已复制，可在发送端粘贴。'),
                    )
                  }
                >
                  复制完整配对码
                </Button>
              </View>
            </View>
          )}
          {offer && !completed && (
            <Panel style={{ gap: 12 }}>
              <Label style={{ fontSize: 19, fontWeight: '800', color: palette.gold }}>
                收到存档预览
              </Label>
              <Label>
                {offer.summary.name} · {offer.summary.map} · {offer.summary.badges} 枚徽章
              </Label>
              <Label muted>
                {timeLabel(offer.summary.playTimeSeconds)} · 队伍 {offer.summary.party.length} 只 ·
                内容 {offer.summary.contentVersion}
              </Label>
              <View style={styles.wrap}>
                {slots.map((s) => (
                  <Button
                    key={s.slot}
                    small
                    accent={target === s.slot}
                    disabled={busy}
                    onPress={() => {
                      setTarget(s.slot);
                      setConfirm(false);
                    }}
                  >
                    槽 {s.slot} · {s.summary?.name ?? (s.error ? '损坏存档' : '空槽')}
                  </Button>
                ))}
              </View>
              <Label muted>
                {selected?.summary
                  ? `当前槽位：${selected.summary.name} · ${selected.summary.map} · ${selected.summary.badges} 徽章。覆盖前会保留备份。`
                  : '将写入所选槽位。'}
              </Label>
              <Button
                accent
                disabled={busy}
                onPress={() => {
                  if (selected?.snapshot && !confirm) {
                    setConfirm(true);
                    return;
                  }
                  setBusy(true);
                  void run(() => controller.accept(target, selected?.snapshot?.revisionId ?? null));
                }}
              >
                {confirm ? `确认覆盖槽位 ${target} 并接收` : `接收到槽位 ${target}`}
              </Button>
            </Panel>
          )}
          {progress > 0 && (
            <>
              <View
                style={{
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: '#284637',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    backgroundColor: palette.gold,
                  }}
                />
              </View>
              <Label muted>
                {Math.round(progress * 100)}% ·{' '}
                {completed ? '已保存完成' : '最终完成以接收端提交回执为准'}
              </Label>
            </>
          )}
          {completed && (
            <Button
              accent
              onPress={() => {
                if (completed.slot) void run(() => onImported(completed.slot!));
                else reset();
              }}
            >
              {completed.slot ? '从此存档继续' : '完成'}
            </Button>
          )}
        </>
      )}
      {LAN_AVAILABLE && (
        <Button
          small
          onPress={() =>
            void Linking.openSettings().catch(() =>
              setStatus(
                `无法打开系统设置，请在手机设置中找到${APP_NAME}，检查相机和本地网络权限。`,
              ),
            )
          }
        >
          打开系统权限设置
        </Button>
      )}
      <Label muted style={{ fontSize: 11 }}>
        仅在本页前台监听。退出、拒绝、断线或校验失败均保留原档；完成后会暂停原会话并读取导入的整份进度。
      </Label>
    </ScrollView>
  );
}
