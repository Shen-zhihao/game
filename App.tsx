import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SPECIES, STARTERS } from './src/content/catalog';
import { CreatureSprite } from './src/components/CreatureSprite';
import { MapCanvas } from './src/components/MapCanvas';
import { Button, Label, palette, Panel, styles, TypeBadges } from './src/components/ui';
import { newGame, safeForTransfer } from './src/game/engine';
import { SaveRepository } from './src/persistence/repository';
import { createSnapshot } from './src/persistence/snapshot';
import { entropy, getRepository } from './src/runtime';
import { Explore } from './src/screens/Explore';
import { BattleScreen } from './src/screens/BattleScreen';
import {
  BagMenu,
  DexMenu,
  HelpMenu,
  MenuFrame,
  MenuName,
  menuStyles,
  PartyMenu,
  PendingScreen,
  QuestMenu,
  RegionMenu,
} from './src/screens/GameMenus';
import { SaveMenu, Slots, timeLabel } from './src/screens/SaveMenu';
import { TransferMenu } from './src/screens/TransferMenu';
import { useGameSession } from './src/useGameSession';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#071c16' }}>
        <GameApp />
      </View>
    </SafeAreaProvider>
  );
}
function GameApp() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [repository, setRepository] = useState<SaveRepository | null>(null);
  const [bootError, setBootError] = useState('');
  const [screen, setScreen] = useState<'title' | 'create' | 'play'>('title');
  const [menu, setMenu] = useState<MenuName | null>(null);
  const [slots, setSlots] = useState<Slots>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('旅人');
  const [avatar, setAvatar] = useState(0);
  const [starter, setStarter] = useState(STARTERS[0]!);
  const [newSlot, setNewSlot] = useState(1);
  const [confirmNew, setConfirmNew] = useState(false);
  const session = useGameSession(repository);
  const game = session.game;
  const { load: loadSession, pause: pauseSession, save: saveSession, slot: activeSlot } = session;
  const titleScene = useMemo(() => {
    const g = newGame('旅人', 0, STARTERS[0]!, 12345);
    g.player.x = 12;
    g.player.y = 8;
    return g;
  }, []);
  const refresh = useCallback(async () => {
    if (repository) setSlots(await repository.list());
  }, [repository]);
  const boot = useCallback(async () => {
    try {
      const r = await getRepository();
      const initialSlots = await r.list();
      setBootError('');
      setRepository(r);
      setSlots(initialSlots);
    } catch (e) {
      setBootError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void getRepository()
      .then(async (r) => {
        const list = await r.list();
        if (alive) {
          setRepository(r);
          setSlots(list);
        }
      })
      .catch((e: unknown) => {
        if (alive) setBootError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    pauseSession(!!menu || screen !== 'play');
  }, [menu, screen, pauseSession]);
  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);
  const load = useCallback(
    async (slot: number) => {
      await loadSession(slot);
      setScreen('play');
      setMenu(null);
    },
    [loadSession],
  );
  const closeMenu = useCallback(() => {
    void run(async () => {
      if (menu === 'transfer' && game) await loadSession(activeSlot);
      setMenu(null);
      await refresh();
    });
  }, [game, menu, refresh, run, loadSession, activeSlot]);
  const changeMenu = useCallback(
    (m: MenuName) => {
      void run(async () => {
        if (menu === 'transfer' && game) await loadSession(activeSlot);
        if (m === 'transfer') {
          if (!safeForTransfer(game)) throw new Error('请先完成战斗、对话与成长选择，再进行传档');
          await saveSession();
          await repository?.drain();
        }
        setMenu(m);
      });
    },
    [game, menu, repository, run, loadSession, saveSession, activeSlot],
  );
  if (!repository)
    return (
      <View style={s.center}>
        <ActivityIndicator color={palette.gold} />
        <Label style={{ marginTop: 16 }}>
          {bootError ? `本地存档未能打开：${bootError}` : '正在准备星苔地区…'}
        </Label>
        {!!bootError && <Button onPress={() => void boot()}>重试打开原存档</Button>}
      </View>
    );
  const compact = height < 440;
  return (
    <View style={{ flex: 1 }}>
      {(screen === 'title' || screen === 'create') && (
        <>
          <View style={StyleSheet.absoluteFill}>
            <MapCanvas state={titleScene} width={width} height={height} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a281be6' }]} />
          </View>
          {screen === 'title' ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                paddingLeft: (width > 1000 ? 64 : 28) + insets.left,
                paddingRight: (width > 1000 ? 64 : 28) + insets.right,
                paddingTop: (compact ? 22 : 40) + insets.top,
                paddingBottom: (compact ? 22 : 40) + insets.bottom,
                gap: 30,
              }}
            >
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
                <Text style={s.eyebrow}>STARGROVE EXPEDITION</Text>
                <Text style={[s.logo, compact && { fontSize: 42, lineHeight: 54 }]}>星苔远征</Text>
                <View
                  style={{
                    width: 62,
                    height: 3,
                    backgroundColor: palette.gold,
                    marginVertical: 14,
                  }}
                />
                <Label style={{ color: '#dece96', fontSize: compact ? 16 : 20, letterSpacing: 3 }}>
                  第一章 · 晨光与微芒
                </Label>
                <Label muted style={{ maxWidth: 330, marginTop: 12, fontSize: compact ? 12 : 14 }}>
                  在微光之中，遇见第一位伙伴。{'\n'}探索、捕捉，让每一段同行留下痕迹。
                </Label>
                <View style={[styles.wrap, { marginTop: compact ? 18 : 30 }]}>
                  <Button
                    accent
                    testID="new-adventure"
                    onPress={() => {
                      setNewSlot(slots.find((s) => !s.snapshot)?.slot ?? 1);
                      setConfirmNew(false);
                      setScreen('create');
                    }}
                  >
                    开始新冒险 ▸
                  </Button>
                  <Button onPress={() => changeMenu('transfer')}>存档互传</Button>
                </View>
                <Label muted style={{ fontSize: 10, marginTop: 16 }}>
                  原创精灵 RPG　·　离线单机　·　v0.1.0{Platform.OS === 'web' ? '　·　网页试玩' : ''}
                </Label>
              </View>
              <View
                style={{ flex: 1, maxWidth: 440, justifyContent: 'center', gap: compact ? 7 : 12 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: compact ? 0 : 12,
                  }}
                >
                  {STARTERS.map((id) => (
                    <CreatureSprite key={id} speciesId={id} size={compact ? 70 : 105} animate />
                  ))}
                </View>
                <Label style={{ fontSize: 12, letterSpacing: 2, color: '#b5c8a5' }}>你的旅程</Label>
                {slots.map((slot) => (
                  <Panel
                    key={slot.slot}
                    style={{
                      padding: compact ? 10 : 15,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Label style={{ fontWeight: '700' }}>
                        0{slot.slot}　
                        {slot.summary?.name ?? (slot.error ? '存档需要恢复' : '尚未启程')}
                      </Label>
                      <Label muted style={{ fontSize: 11, lineHeight: 17 }}>
                        {slot.summary
                          ? `${slot.summary.map} · ${slot.summary.badges} 徽章 · ${timeLabel(slot.summary.playTimeSeconds)}`
                          : (slot.error ?? '选择新冒险，在此记录旅程')}
                      </Label>
                    </View>
                    {slot.summary && (
                      <Button small onPress={() => void run(() => load(slot.slot))}>
                        继续
                      </Button>
                    )}
                    {slot.error && (
                      <Button
                        small
                        onPress={() => {
                          setScreen('create');
                          setNewSlot(slots.find((s) => !s.snapshot)?.slot ?? 1);
                          setError('原存档已保留；可从新冒险菜单的本地存档中恢复历史。');
                        }}
                      >
                        恢复帮助
                      </Button>
                    )}
                  </Panel>
                ))}
              </View>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                paddingLeft: (compact ? 18 : 30) + insets.left,
                paddingRight: (compact ? 18 : 30) + insets.right,
                paddingTop: (compact ? 18 : 30) + insets.top,
                paddingBottom: (compact ? 18 : 30) + insets.bottom,
                gap: 12,
              }}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Label style={styles.title}>选择你的第一位伙伴</Label>
                <Button small onPress={() => setScreen('title')}>
                  返回标题
                </Button>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                {STARTERS.map((id) => (
                  <Panel
                    key={id}
                    style={{
                      flex: 1,
                      padding: compact ? 12 : 20,
                      borderColor: starter === id ? palette.gold : palette.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CreatureSprite
                      speciesId={id}
                      size={compact ? 84 : 140}
                      animate={starter === id}
                    />
                    <Label style={{ fontSize: compact ? 18 : 22, fontWeight: '800' }}>
                      {SPECIES[id]!.name}
                    </Label>
                    <TypeBadges types={SPECIES[id]!.types} />
                    <Label muted style={{ fontSize: 11, marginTop: 3, marginBottom: 10 }}>
                      {id === STARTERS[0]
                        ? '温柔的森林守护者'
                        : id === STARTERS[1]
                          ? '敏捷热情的火光'
                          : '可靠沉稳的河流伙伴'}
                    </Label>
                    <Button
                      small
                      accent={starter === id}
                      testID={`starter-${id}`}
                      onPress={() => setStarter(id)}
                    >
                      {starter === id ? '已选择 ✓' : '选择伙伴'}
                    </Button>
                  </Panel>
                ))}
              </View>
              <View style={[styles.wrap, { alignItems: 'center', gap: 9 }]}>
                <TextInput
                  accessibilityLabel="旅行者名字"
                  value={name}
                  onChangeText={setName}
                  maxLength={12}
                  placeholder="旅行者名字"
                  placeholderTextColor={palette.muted}
                  style={[menuStyles.input, { width: 130 }]}
                />
                <Button small onPress={() => setAvatar(avatar ? 0 : 1)}>
                  外观 {avatar + 1}
                </Button>
                {slots.map((s) => (
                  <Button
                    small
                    key={s.slot}
                    accent={newSlot === s.slot}
                    onPress={() => {
                      setNewSlot(s.slot);
                      setConfirmNew(false);
                    }}
                  >
                    槽{s.slot} {s.snapshot ? '已有进度' : '空'}
                  </Button>
                ))}
                <Button
                  accent
                  testID="begin-journey"
                  disabled={busy || !name.trim()}
                  onPress={() =>
                    void run(async () => {
                      const previous = slots.find((s) => s.slot === newSlot)?.snapshot;
                      if (previous && !confirmNew) {
                        setConfirmNew(true);
                        return;
                      }
                      const seed = new DataView(entropy(4).buffer).getUint32(0, true);
                      const g = newGame(name, avatar, starter, seed);
                      const snapshot = createSnapshot(g, entropy, null);
                      await repository.import(
                        newSlot,
                        JSON.stringify(snapshot),
                        previous?.revisionId ?? null,
                        repository.newBranch(),
                      );
                      await load(newSlot);
                      await refresh();
                    })
                  }
                >
                  {confirmNew ? '确认新冒险 · 原档保留备份' : '出发 ▸'}
                </Button>
              </View>
            </View>
          )}
        </>
      )}
      {screen === 'play' && game && (
        <>
          {game.battle ? (
            <BattleScreen game={game} dispatch={session.dispatch} height={height} />
          ) : (
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
              <Explore
                game={game}
                dispatch={session.dispatch}
                width={width - insets.left - insets.right}
                height={height - insets.top - insets.bottom}
                paused={!!menu || !session.active || busy}
                saveStatus={session.saveStatus}
                onMenu={() => changeMenu('party')}
              />
            </SafeAreaView>
          )}
        </>
      )}
      {menu && (
        <MenuFrame menu={menu} onMenu={changeMenu} onClose={closeMenu}>
          {menu === 'transfer' ? (
            <TransferMenu
              repository={repository}
              onImported={async (slot) => {
                await load(slot);
                await refresh();
              }}
            />
          ) : game ? (
            <>
              {menu === 'party' && <PartyMenu game={game} dispatch={session.dispatch} />}
              {menu === 'bag' && <BagMenu game={game} dispatch={session.dispatch} />}
              {menu === 'dex' && <DexMenu game={game} />}
              {menu === 'quests' && <QuestMenu game={game} />}
              {menu === 'map' && <RegionMenu game={game} />}
              {menu === 'settings' && <HelpMenu />}
              {menu === 'save' && (
                <SaveMenu
                  repository={repository}
                  slot={session.slot}
                  saveStatus={session.saveStatus}
                  onSave={session.save}
                  onReload={load}
                  onTitle={async () => {
                    await session.unload();
                    setMenu(null);
                    setScreen('title');
                    await refresh();
                  }}
                />
              )}
            </>
          ) : (
            <HelpMenu />
          )}
        </MenuFrame>
      )}
      {game && !game.battle && game.pending.length > 0 && screen === 'play' && (
        <PendingScreen game={game} dispatch={session.dispatch} />
      )}
      {!!error && (
        <View style={s.error}>
          <ScrollView style={{ flex: 1, maxHeight: 90 }}>
            <Label style={{ color: '#f1d2a9' }}>{error}</Label>
          </ScrollView>
          <Button small onPress={() => setError('')}>
            知道了
          </Button>
        </View>
      )}
      {busy && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#0d271d66', justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color={palette.gold} />
        </View>
      )}
      {width < height && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            alignSelf: 'center',
            backgroundColor: '#123125',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Label style={{ fontSize: 11 }}>横屏体验更佳，请旋转设备</Label>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 14,
  },
  eyebrow: { color: '#b4c7a2', fontSize: 12, letterSpacing: 4 },
  logo: { fontSize: 64, lineHeight: 82, color: '#f0e5b9', fontWeight: '900', letterSpacing: 5 },
  error: {
    position: 'absolute',
    bottom: 16,
    left: '10%',
    right: '10%',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bc9e65',
    backgroundColor: '#3b3e29fa',
  },
});
