import { ChallengeMenu } from '../src/screens/ChallengeMenu';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { STARTERS } from '../src/content/catalog';
import { CreatureSprite } from '../src/components/CreatureSprite';
import { TravelerSprite } from '../src/components/CharacterSprite';
import { playerAppearance } from '../src/content/appearances';
import { MapCanvas } from '../src/components/MapCanvas';
import { Button, Label, palette, Panel, styles } from '../src/components/ui';
import { newGame, safeForTransfer } from '../src/game/engine';
import { SaveRepository } from '../src/persistence/repository';
import { createSnapshot } from '../src/persistence/snapshot';
import { entropy, getRepository } from '../src/runtime';
import { AdventureScreen } from '../src/screens/AdventureScreen';
import {
  BagMenu,
  DexMenu,
  HelpMenu,
  MenuFrame,
  MenuName,
  menuStyles,
  PartyMenu,
  QuestMenu,
  RegionMenu,
} from '../src/screens/GameMenus';
import { SaveMenu, Slots, timeLabel } from '../src/screens/SaveMenu';
import { TransferMenu } from '../src/screens/TransferMenu';
import { useGameSession } from '../src/hooks/useGameSession';
import { CenterMenu } from '../src/screens/CenterMenu';
import { APP_DESCRIPTION, APP_ENGLISH_NAME, APP_NAME, APP_TAGLINE } from '../src/content/brand';
import { SettingsMenu } from '../src/screens/SettingsMenu';
import { ControlLayoutEditor } from '../src/screens/ControlLayoutEditor';
import { useGameMusic } from '../src/hooks/useGameMusic';
import { useJourneyPresentation } from '../src/hooks/useJourneyPresentation';
import { JourneyEventIllustration } from '../src/components/JourneyEventIllustration';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
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
  const [editingControls, setEditingControls] = useState(false);
  const [slots, setSlots] = useState<Slots>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('旅人');
  const [avatar, setAvatar] = useState(0);
  const [newSlot, setNewSlot] = useState(1);
  const [confirmNew, setConfirmNew] = useState(false);
  const session = useGameSession(repository);
  const game = session.game;
  const presentation = useJourneyPresentation(game, session.dispatch);
  const dispatch = presentation.dispatch;
  const resetPresentation = presentation.reset;
  const [playingBattleId, setPlayingBattleId] = useState<string | null>(null);
  const onBattlePlayback = useCallback((id: string, playing: boolean) => {
    setPlayingBattleId((current) => (playing ? id : current === id ? null : current));
  }, []);
  const music = useGameMusic(presentation.game, screen === 'play', playingBattleId);
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
    pauseSession(
      !!menu ||
        editingControls ||
        !!presentation.view ||
        !!game?.activities?.active ||
        screen !== 'play',
    );
  }, [menu, editingControls, presentation.view, game?.activities?.active, screen, pauseSession]);
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
      resetPresentation();
      await loadSession(slot);
      setScreen('play');
      setMenu(null);
    },
    [loadSession, resetPresentation],
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
          if (!safeForTransfer(game))
            throw new Error('请先结束规则挑战、战斗、对话与成长选择，再进行传档');
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
          {bootError ? `本地存档未能打开：${bootError}` : `正在准备${APP_NAME}…`}
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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `${palette.canvas}ef` }]} />
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
                <Text style={s.eyebrow}>{APP_ENGLISH_NAME}</Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 10 : 16 }}
                >
                  <Image
                    source={require('../assets/icon.png')}
                    accessibilityLabel={`${APP_NAME}图标：火系伙伴与星纹捕捉球`}
                    style={{
                      width: compact ? 56 : 72,
                      height: compact ? 56 : 72,
                      borderRadius: 16,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[s.logo, { flexShrink: 1 }, compact && { fontSize: 42, lineHeight: 54 }]}
                  >
                    {APP_NAME}
                  </Text>
                </View>
                <View
                  style={{
                    width: 62,
                    height: 3,
                    backgroundColor: palette.gold,
                    marginVertical: 14,
                  }}
                />
                <Label style={{ color: '#dece96', fontSize: compact ? 14 : 20, letterSpacing: 1 }}>
                  {APP_TAGLINE}
                </Label>
                <Label muted style={{ maxWidth: 330, marginTop: 12, fontSize: compact ? 12 : 14 }}>
                  {APP_DESCRIPTION}
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
                  <Button testID="open-save-menu" onPress={() => changeMenu('save')}>
                    读取存档 / 管理
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
                <Label style={{ fontSize: 12, letterSpacing: 2, color: palette.muted }}>
                  你的旅程
                </Label>
                <ScrollView
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={{ gap: compact ? 7 : 12 }}
                >
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
                          {String(slot.slot).padStart(2, '0')}　
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
                </ScrollView>
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
                <Label style={styles.title}>登记旅行者资料</Label>
                <Button small onPress={() => setScreen('title')}>
                  返回标题
                </Button>
              </View>
              <Panel
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 22,
                }}
              >
                <TravelerSprite
                  avatar={avatar}
                  testID="traveler-preview"
                  facing="down"
                  steps={0}
                  paused
                  size={compact ? 96 : 150}
                />
                <View style={{ flex: 1, maxWidth: 470, gap: 10 }}>
                  <Label
                    style={{
                      fontSize: compact ? 24 : 32,
                      lineHeight: compact ? 32 : 40,
                      fontWeight: '900',
                      color: palette.gold,
                    }}
                  >
                    刚搬到晨芽镇
                  </Label>
                  <Label>写下名字，整理好行李，再去认识新邻居。</Label>
                  <Label muted testID="traveler-appearance-description">
                    {playerAppearance(avatar).description}
                  </Label>
                  <Label muted>你现在还没有精灵。第一位伙伴会在旅途中的一次意外相遇里登场。</Label>
                  <Label muted style={{ fontSize: 12 }}>
                    旅程目标：挑战八座道馆，集齐八枚徽章，向联盟出发。
                  </Label>
                </View>
              </Panel>
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
                <Button
                  small
                  testID="avatar-cycle"
                  accessibilityLabel="切换旅行者外观"
                  onPress={() => setAvatar(avatar ? 0 : 1)}
                >
                  外观 {avatar + 1} · {playerAppearance(avatar).name}
                </Button>
                <ScrollView
                  horizontal
                  style={{ maxHeight: 48, flexGrow: 0 }}
                  contentContainerStyle={{ gap: 9 }}
                >
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
                </ScrollView>
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
                      const g = newGame(name, avatar, null, seed);
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
          <AdventureScreen
            onBattlePlayback={onBattlePlayback}
            coveredByEvent={!!presentation.view}
            key={session.slot}
            game={presentation.game!}
            dispatch={(command) => {
              dispatch(command);
              if (command.kind === 'closeBattle' && game.battle?.ruleChallenge)
                setMenu('challenge');
            }}
            width={width}
            height={height}
            paused={!!menu || editingControls || !!presentation.view || !session.active || busy}
            onMenu={() => changeMenu('party')}
          />
        </>
      )}
      {menu && (
        <MenuFrame
          menu={menu}
          onMenu={changeMenu}
          onClose={closeMenu}
          hasGame={!!game}
          coveredByEvent={!!presentation.view}
        >
          {menu === 'transfer' ? (
            <TransferMenu
              repository={repository}
              onImported={async (slot) => {
                await load(slot);
                await refresh();
              }}
            />
          ) : menu === 'save' ? (
            <SaveMenu
              repository={repository}
              slot={session.slot}
              hasGame={!!game}
              saveStatus={session.saveStatus}
              onSave={session.save}
              onSaveAs={session.saveAs}
              onReload={load}
              onTitle={async () => {
                presentation.reset();
                await session.unload();
                setMenu(null);
                setScreen('title');
                await refresh();
              }}
            />
          ) : menu === 'settings' ? (
            <SettingsMenu
              game={game}
              music={music}
              dispatch={dispatch}
              onEditControls={() => setEditingControls(true)}
            />
          ) : game ? (
            <>
              {menu === 'party' && <PartyMenu game={game} dispatch={dispatch} />}
              {menu === 'center' && <CenterMenu game={game} dispatch={dispatch} />}
              {menu === 'bag' && <BagMenu game={game} dispatch={dispatch} />}
              {menu === 'dex' &&
                (game.progress.flags.opening && !game.progress.flags.fieldKitReceived ? (
                  <Panel>
                    <Label style={styles.title}>还没有领取图鉴</Label>
                    <Label style={{ marginTop: 12 }}>
                      先完成博士救援、正式获得伙伴，再与阿澈切磋并回研究所领取图鉴。
                    </Label>
                  </Panel>
                ) : (
                  <DexMenu game={game} />
                ))}
              {menu === 'quests' && <QuestMenu game={game} dispatch={dispatch} />}
              {menu === 'map' && (
                <RegionMenu
                  game={game}
                  onTravel={(town) => {
                    dispatch({ kind: 'fastTravel', town });
                    setMenu(null);
                  }}
                />
              )}
              {menu === 'challenge' && (
                <ChallengeMenu
                  game={game}
                  dispatch={(command) => {
                    dispatch(command);
                    if (
                      command.kind === 'challenge' &&
                      ['start', 'next'].includes(command.action.kind)
                    )
                      setMenu(null);
                  }}
                />
              )}
            </>
          ) : (
            <HelpMenu />
          )}
        </MenuFrame>
      )}
      {editingControls && (
        <ControlLayoutEditor
          game={game ?? titleScene}
          width={width}
          height={height}
          onClose={() => setEditingControls(false)}
        />
      )}
      {screen === 'play' && presentation.view && (
        <JourneyEventIllustration
          key={presentation.view.id}
          event={presentation.view.event}
          paused={busy || !session.active}
          onFinish={presentation.finish}
        />
      )}
      {!!error && (
        <View style={s.error}>
          <ScrollView style={{ flex: 1, maxHeight: 90 }}>
            <Label style={{ color: palette.red }}>{error}</Label>
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
            { backgroundColor: `${palette.ink}66`, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color={palette.gold} />
        </View>
      )}
      {width < height && !editingControls && !menu && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            alignSelf: 'center',
            backgroundColor: palette.panel,
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
    backgroundColor: palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 14,
  },
  eyebrow: { color: palette.muted, fontSize: 12, letterSpacing: 4 },
  logo: { fontSize: 64, lineHeight: 82, color: palette.ink, fontWeight: '900', letterSpacing: 5 },
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
    backgroundColor: `${palette.panel}fa`,
  },
});
