import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOVES, SPECIES } from '../../content/catalog';
import { BattleStage } from '../../components/BattleStage';
import { BattleCommandIcon } from '../../components/BattleCommandIcon';
import { BATTLE_BACKGROUNDS } from '../../components/BattleStage/backgrounds';
import { battleAnchors, battleTheme, BATTLE_SCENES } from '../../content/battleScenes';
import { BattleMenus } from '../../components/BattleMenus';
import { BattleMoves } from '../../components/BattleMoves';
import { Button, HpBar, Label, palette, Panel, TypeBadges } from '../../components/ui';
import {
  BattleAction,
  BattleCaptureEvent,
  BattleVisualEvent,
  Command,
  GameState,
} from '../../game/model';
import {
  battleScene,
  presentationScene,
  presentationSwitches,
  presentationFaints,
  presentationGrowth,
  BattleSwitchVisual,
} from '../../game/battleVisuals';
import { creatureName } from '../../game/rules';
import {
  BattleExperienceBar,
  BattleGrowthIllustration,
} from '../../components/BattleGrowthIllustration';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { chanceLabel, criticalChance, hitChance, roundPace } from '../../game/combat';
import { WEATHER } from '../../game/environment';
import { WeatherOverlay } from '../../components/WeatherOverlay';
import { BALLS } from '../../game/capture';
import { createBattlePlaybackClock } from '../../game/battlePlayback';
import { useBattleMessageDelay } from '../../hooks/useBattleMessageDelay';
import { useAppActivity } from '../../hooks/useAppActivity';

type Page = 'commands' | 'moves' | 'party' | 'bag' | 'targets';
function BattleTile({
  title,
  detail,
  color,
  disabled = false,
  onPress,
  testID,
  icon = false,
}: {
  title: string;
  detail?: string;
  color?: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  icon?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join('，')}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        s.tile,
        disabled && { opacity: 0.35 },
        pressed && { backgroundColor: '#f2df9c', transform: [{ translateY: 1 }] },
      ]}
    >
      {icon ? (
        <BattleCommandIcon name={title} />
      ) : (
        <View style={[s.tileDot, { backgroundColor: color ?? palette.accent }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={s.tileTitle}>
          {title}
        </Text>
        {detail && (
          <Text numberOfLines={1} style={s.tileDetail}>
            {detail}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
export function BattleScreen({
  game,
  dispatch,
  height,
  paused = false,
  onPlaybackChange,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
  height: number;
  paused?: boolean;
  onPlaybackChange: (id: string, playing: boolean) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const b = game.battle!;
  const player = game.creatures[b.playerId]!;
  const enemy = b.enemies[b.enemyIndex]!;
  const pace = roundPace(player, enemy, b.playerStages, b.enemyStages, b.weather?.kind);
  const actionTotal = b.actionRound?.playerTotal ?? pace.playerActions;
  const actionsRemaining = b.actionRound?.playerRemaining ?? actionTotal;
  const enemyActionTotal = b.actionRound?.enemyTotal ?? pace.enemyActions;
  const compact = height < 450;
  const defaultFooterHeight = compact ? 114 : Math.min(180, Math.round(height * 0.25));
  const [field, setField] = useState({ width, height: height - defaultFooterHeight });
  const [page, setPage] = useState<Page>('commands');
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCombatStats, setShowCombatStats] = useState(false);
  const [targetItem, setTargetItem] = useState<import('../../game/items').SupplyId>('potion');
  const logRef = useRef<ScrollView>(null);
  const pendingTurn = useRef(false);
  const actionAt = useRef(0);
  const [presentation, setPresentation] = useState<string[]>([]);
  const [presentationId, setPresentationId] = useState(0);
  const [line, setLine] = useState(0);
  const [initialScene, setInitialScene] = useState(() => battleScene(game));
  const [visualEvents, setVisualEvents] = useState<BattleVisualEvent[]>([]);
  const [initialOpening] = useState(() => b.turn === 1 && !b.visualEvents?.length);
  const [completedEffect, setCompletedEffect] = useState('');
  const [impactedEffect, setImpactedEffect] = useState('');
  const [completedSwitches, setCompletedSwitches] = useState<string[]>([]);
  const opening =
    initialOpening &&
    presentationId === 0 &&
    !(['player', 'enemy'] as const).every((side) =>
      completedSwitches.includes(`${b.id}:opening:${side}`),
    );
  const [completedFaints, setCompletedFaints] = useState<string[]>([]);
  const [completedGrowth, setCompletedGrowth] = useState('');
  const onFaintFinished = useCallback(
    (key: string) => setCompletedFaints((keys) => (keys.includes(key) ? keys : [...keys, key])),
    [],
  );
  const onSwitchFinished = useCallback((key: string) => {
    setCompletedSwitches((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }, []);
  const [playbackClock] = useState(createBattlePlaybackClock);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const messageDelay = useBattleMessageDelay();
  const active = useAppActivity();
  const effectKey = `${b.id}:${b.turn}:${b.actionRound?.playerRemaining ?? 0}:${presentationId}:${line}`;
  const switchKey = opening ? `${b.id}:opening` : effectKey;
  const onEffectFinished = useCallback(
    (key: string) => setCompletedEffect(key),
    [setCompletedEffect],
  );
  const onEffectImpact = useCallback((key: string) => setImpactedEffect(key), []);
  const presenting = opening || presentation.length > 0;
  useEffect(() => {
    onPlaybackChange(b.id, presenting || busy || pendingTurn.current);
  }, [b.id, presenting, busy, onPlaybackChange]);
  useEffect(() => () => onPlaybackChange(b.id, false), [b.id, onPlaybackChange]);
  const playback = presentationScene(
    initialScene,
    visualEvents,
    line,
    completedEffect === effectKey || impactedEffect === effectKey,
  );
  const scene = presenting ? playback.scene : busy ? initialScene : battleScene(game);
  const displayedPace = roundPace(
    game.creatures[scene.player.id] ?? player,
    b.enemies.find((creature) => creature.id === scene.enemy.id) ?? enemy,
    b.playerStages,
    b.enemyStages,
    b.weather?.kind,
  );
  const activeMove = presenting ? playback.move : null;
  const capture = presenting
    ? playback.capture
    : !busy && b.result === 'caught'
      ? (visualEvents.find(
          (event): event is BattleCaptureEvent => event.kind === 'capture' && event.caught,
        ) ?? null)
      : null;
  const animatingCapture =
    !!capture && presenting && line === capture.logIndex && completedEffect !== effectKey;
  const captured = !busy && b.result === 'caught';
  const switches = useMemo(
    (): BattleSwitchVisual[] =>
      opening
        ? [
            {
              side: 'enemy',
              phase: b.kind === 'wild' ? 'reveal' : 'send',
              figure: initialScene.enemy,
            },
            { side: 'player', phase: 'send', figure: initialScene.player },
          ]
        : presenting
          ? presentationSwitches(initialScene, visualEvents, line)
          : [],
    [opening, b.kind, presenting, initialScene, visualEvents, line],
  );
  const faints =
    presenting && !opening
      ? presentationFaints(initialScene, visualEvents, line, scene).map((visual) => {
          const key = `${b.id}:${presentationId}:faint:${visual.logIndex}:${visual.side}`;
          return { ...visual, key, completed: completedFaints.includes(key) };
        })
      : [];
  const growth =
    presenting && !opening ? presentationGrowth(initialScene, visualEvents, line) : null;
  const animatingGrowth = !!growth && completedGrowth !== effectKey;
  const animatingMove = !!activeMove && completedEffect !== effectKey;
  const animating =
    animatingMove ||
    animatingCapture ||
    animatingGrowth ||
    faints.some((visual) => !visual.completed) ||
    switches.some((visual) => !completedSwitches.includes(`${switchKey}:${visual.side}`));
  const feedbackEvent =
    presenting && !animating
      ? (visualEvents.find(
          (event): event is import('../../game/model').BattleMoveEvent =>
            event.kind === 'move' && event.logIndex <= line && line <= event.endLogIndex,
        ) ?? null)
      : null;
  useEffect(() => {
    if (!pendingTurn.current) return;
    pendingTurn.current = false;
    setPresentation(b.logs);
    setPresentationId((value) => value + 1);
    setVisualEvents(b.visualEvents ?? []);
    setCompletedEffect('');
    setCompletedSwitches([]);
    setCompletedFaints([]);
    setCompletedGrowth('');
    setLine(0);
    setBusy(false);
  }, [b]);
  const playbackKey = presenting
    ? effectKey
    : b.phase === 'ended' && !busy
      ? `${effectKey}:result`
      : null;
  const playbackStopped = paused || playbackPaused || showLog || !active;
  useEffect(() => {
    playbackClock.update(
      playbackKey
        ? {
            key: playbackKey,
            delayMs: messageDelay,
            ready: !animating,
            paused: playbackStopped,
            onAdvance: () => {
              if (paused || animating || opening) return;
              if (presenting) {
                if (line + 1 < presentation.length) setLine(line + 1);
                else setPresentation([]);
              } else if (b.phase === 'ended') dispatch({ kind: 'closeBattle' });
            },
          }
        : null,
    );
  }, [
    playbackClock,
    playbackKey,
    messageDelay,
    animating,
    playbackStopped,
    paused,
    opening,
    presenting,
    line,
    presentation.length,
    b.phase,
    dispatch,
  ]);
  useEffect(() => () => playbackClock.dispose(), [playbackClock]);
  const act = useCallback(
    (action: BattleAction) => {
      if (paused || busy || presenting || Date.now() - actionAt.current < 350) return;
      actionAt.current = Date.now();
      setInitialScene(battleScene(game));
      // Hold the battle score until the last move and message have actually played.
      onPlaybackChange(b.id, true);
      pendingTurn.current = true;
      setBusy(true);
      setShowLog(false);
      setPlaybackPaused(false);
      setPage('commands');
      dispatch({ kind: 'battle', action });
    },
    [
      paused,
      busy,
      presenting,
      dispatch,
      setPage,
      setBusy,
      setShowLog,
      setPlaybackPaused,
      game,
      b.id,
      onPlaybackChange,
    ],
  );
  useEffect(() => {
    const back = () => {
      if (paused || busy || animating) return true;
      if (showLog) setShowLog(false);
      else if (presenting) playbackClock.skip();
      else if (b.phase !== 'forcedSwitch') setPage(page === 'targets' ? 'bag' : 'commands');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'x') {
        event.preventDefault();
        back();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', key);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', key);
    };
  });
  const size = Math.min(190, Math.max(104, field.height * 0.4));
  const theme = battleTheme(game.player.map, b.event);
  const { player: playerAnchor, enemy: enemyAnchor } = battleAnchors(
    theme,
    field.width,
    field.height,
  );
  const maxPlayer = scene.player.maxHp;
  const maxEnemy = scene.enemy.maxHp;
  const choosingParty =
    !presenting && (b.phase === 'forcedSwitch' || page === 'party' || page === 'targets');
  const ended = b.phase === 'ended';
  const choosingMoves =
    page === 'moves' && !presenting && !ended && !busy && b.phase !== 'forcedSwitch';
  const moveColumns = width - insets.left - insets.right >= 600 ? 4 : 2;
  const footerHeight = choosingMoves
    ? Math.min(moveColumns === 4 ? (compact ? 160 : 180) : 260, Math.round(height * 0.65))
    : defaultFooterHeight;
  return (
    <View testID="battle-screen" style={{ flex: 1, backgroundColor: palette.ink }}>
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setField((old) => (old.width === w && old.height === h ? old : { width: w, height: h }));
        }}
      >
        <Image
          testID="battle-background"
          accessibilityLabel={BATTLE_SCENES[theme].name}
          source={BATTLE_BACKGROUNDS[theme]}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
        <WeatherOverlay weather={b.weather?.kind ?? 'clear'} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: insets.top + 42,
            maxWidth: '36%',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: `${palette.panel}ee`,
          }}
        >
          <Text testID="battle-weather" style={{ color: palette.text, fontSize: 11 }}>
            {WEATHER[b.weather?.kind ?? 'clear'].mark} {WEATHER[b.weather?.kind ?? 'clear'].name}
            {b.weather?.turns ? ` · ${b.weather.turns} 轮` : ''}　经验池{' '}
            {b.rewards?.experience ?? 0} · 金币 +{b.rewards?.money ?? 0}
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: playerAnchor.x - size * 0.4,
            top: playerAnchor.y - 5,
            width: size * 0.8,
            height: size * 0.14,
            borderRadius: size,
            backgroundColor: `${palette.ink}35`,
            opacity:
              switches.some((visual) => visual.side === 'player') ||
              faints.some((visual) => visual.side === 'player') ||
              (!presenting && scene.player.hp <= 0)
                ? 0
                : 1,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: enemyAnchor.x - size * 0.3,
            top: enemyAnchor.y - 4,
            width: size * 0.6,
            height: size * 0.1,
            borderRadius: size,
            backgroundColor: `${palette.ink}35`,
            opacity:
              capture ||
              captured ||
              switches.some((visual) => visual.side === 'enemy') ||
              faints.some((visual) => visual.side === 'enemy') ||
              (!presenting && scene.enemy.hp <= 0)
                ? 0
                : 1,
          }}
        />
        <BattleStage
          scene={scene}
          playerAnchor={playerAnchor}
          enemyAnchor={enemyAnchor}
          size={size}
          event={activeMove}
          feedbackEvent={feedbackEvent}
          eventKey={switchKey}
          playing={animatingMove && !playbackStopped}
          onImpact={onEffectImpact}
          onFinished={onEffectFinished}
          ended={ended}
          switches={switches}
          completedSwitches={completedSwitches}
          switchesPaused={playbackStopped}
          onSwitchFinished={onSwitchFinished}
          capture={capture}
          captureCompleted={!animatingCapture}
          captured={captured}
          captureKey={`${b.id}:${presentationId}:capture`}
          faints={faints}
          hideFainted={!presenting && !busy}
          onFaintFinished={onFaintFinished}
        />
        {growth && (
          <BattleGrowthIllustration
            key={effectKey}
            visual={growth}
            paused={playbackStopped}
            onFinished={() => setCompletedGrowth(effectKey)}
          />
        )}
        <View
          style={[
            s.statusCard,
            {
              left: (compact ? 14 : 24) + insets.left,
              top: (compact ? 15 : 24) + insets.top,
              width: Math.min(260, field.width * 0.32),
              padding: compact ? 10 : 14,
            },
          ]}
        >
          <View style={s.nameRow}>
            <Text numberOfLines={1} style={[s.creatureName, compact && { fontSize: 15 }]}>
              {creatureName(scene.enemy)}
            </Text>
            <Text style={s.level}>Lv.{scene.enemy.level}</Text>
          </View>
          <TypeBadges types={SPECIES[scene.enemy.speciesId]!.types} />
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            <Text style={s.hpLabel}>HP</Text>
            <View style={{ flex: 1 }}>
              <HpBar value={scene.enemy.hp} max={maxEnemy} width="100%" paused={playbackStopped} />
            </View>
            <AnimatedNumber
              value={scene.enemy.hp}
              suffix={`/${maxEnemy}`}
              paused={playbackStopped}
              style={s.hpNumber}
            />
          </View>
          {scene.enemy.status && <Text style={s.statusText}>{statusName(scene.enemy.status)}</Text>}
          <Text testID="enemy-pace" style={{ color: palette.muted, fontSize: compact ? 10 : 12 }}>
            速度 {Number(displayedPace.enemySpeed.toFixed(1))} · 行动 {enemyActionTotal} 次 / 回合
          </Text>
        </View>
        <View
          style={[
            s.statusCard,
            {
              right: (compact ? 14 : 24) + insets.right,
              bottom: compact ? 13 : 22,
              width: Math.min(285, field.width * 0.34),
              padding: compact ? 10 : 14,
            },
          ]}
        >
          <View style={s.nameRow}>
            <Text numberOfLines={1} style={[s.creatureName, compact && { fontSize: 15 }]}>
              {creatureName(scene.player)}
            </Text>
            <Text style={s.level}>Lv.{scene.player.level}</Text>
          </View>
          <TypeBadges types={SPECIES[scene.player.speciesId]!.types} />
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            <Text style={s.hpLabel}>HP</Text>
            <View style={{ flex: 1 }}>
              <HpBar
                value={scene.player.hp}
                max={maxPlayer}
                width="100%"
                paused={playbackStopped}
              />
            </View>
            <AnimatedNumber
              value={scene.player.hp}
              suffix={`/${maxPlayer}`}
              paused={playbackStopped}
              style={s.hpNumber}
            />
          </View>
          <BattleExperienceBar figure={scene.player} paused={playbackStopped} />
          {scene.player.status && (
            <Text style={s.statusText}>{statusName(scene.player.status)}</Text>
          )}
          <Text testID="player-pace" style={{ color: palette.muted, fontSize: compact ? 10 : 12 }}>
            速度 {Number(displayedPace.playerSpeed.toFixed(1))} · 行动 {actionTotal} 次 / 回合
          </Text>
          {!ended && (
            <Text
              testID="battle-actions-remaining"
              style={{ color: palette.muted, fontSize: compact ? 10 : 12, fontWeight: '700' }}
            >
              本回合剩余 {actionsRemaining}/{actionTotal} 次操作 · 每次重新选择
            </Text>
          )}
        </View>
        <View style={[s.battleTag, { top: 7 + insets.top }]}>
          <Text style={{ color: palette.text, fontSize: 11 }}>
            {b.name} ·{' '}
            {b.kind === 'wild' ? '野生遭遇' : `训练师 ${b.enemyIndex + 1}/${b.enemies.length}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="本回合战报"
          onPress={() => {
            setShowCombatStats(false);
            setShowLog(!showLog);
          }}
          style={[s.logButton, { right: 12 + insets.right, top: 10 + insets.top }]}
        >
          <Text style={{ color: palette.text, fontSize: 11 }}>回合 {b.turn}　☷ 战报</Text>
        </Pressable>
        {showLog && (
          <Panel style={[s.selection, { left: '15%', right: '15%', maxHeight: field.height - 18 }]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Label style={{ color: palette.gold, fontWeight: '800' }}>
                {showCombatStats ? '战斗属性' : '本回合记录'}
              </Label>
              <Button
                small
                testID="battle-combat-details"
                onPress={() => setShowCombatStats(!showCombatStats)}
              >
                {showCombatStats ? '返回战报' : '战斗属性'}
              </Button>
            </View>
            <ScrollView
              key={showCombatStats ? 'stats' : 'events'}
              contentContainerStyle={{ gap: 6 }}
            >
              {showCombatStats ? (
                <>
                  <Label style={{ color: palette.gold, fontSize: 12 }}>
                    {WEATHER[b.weather?.kind ?? 'clear'].name}：
                    {WEATHER[b.weather?.kind ?? 'clear'].battle}
                  </Label>
                  <Label style={{ color: palette.gold, fontSize: 12 }}>
                    当前速度 {Number(pace.playerSpeed.toFixed(1))} /{' '}
                    {Number(pace.enemySpeed.toFixed(1))} · 本轮行动额度 {actionTotal} /{' '}
                    {enemyActionTotal} 次，剩余操作可重新选择
                  </Label>
                  <Label muted style={{ fontSize: 12 }}>
                    普通攻击要害率：我方{' '}
                    {chanceLabel(criticalChance('tackle', b.playerStages, b.enemyStages))} / 对方{' '}
                    {chanceLabel(criticalChance('tackle', b.enemyStages, b.playerStages))}；要害伤害
                    ×2。
                  </Label>
                  <Label muted style={{ fontSize: 12 }}>
                    我方命中 {b.playerStages.accuracy ?? 0}／闪避 {b.playerStages.evasion ?? 0}
                    ／要害 {b.playerStages.critical ?? 0}／抗要害{' '}
                    {b.playerStages.criticalGuard ?? 0} 级；对方命中 {b.enemyStages.accuracy ?? 0}
                    ／闪避 {b.enemyStages.evasion ?? 0}／要害 {b.enemyStages.critical ?? 0}／抗要害{' '}
                    {b.enemyStages.criticalGuard ?? 0} 级。
                  </Label>
                  {player.moves.map((m) => (
                    <Label key={m.id} muted style={{ fontSize: 11 }}>
                      {MOVES[m.id]!.name}：当前命中{' '}
                      {chanceLabel(hitChance(m.id, b.playerStages, b.enemyStages, b.weather?.kind))}
                      {MOVES[m.id]!.power
                        ? ` · 要害 ${chanceLabel(criticalChance(m.id, b.playerStages, b.enemyStages))}`
                        : ''}
                    </Label>
                  ))}
                </>
              ) : (
                b.logs.map((line, i) => <Label key={i}>{line}</Label>)
              )}
            </ScrollView>
            <Button small style={{ marginTop: 10 }} onPress={() => setShowLog(false)}>
              收起战报
            </Button>
          </Panel>
        )}
        {ended && !presenting && !busy && !showLog && (
          <Panel style={[s.result, { maxHeight: field.height - 20, padding: compact ? 14 : 22 }]}>
            <Label style={{ fontSize: compact ? 20 : 27, fontWeight: '900', color: palette.gold }}>
              {b.result === 'win'
                ? '对战胜利'
                : b.result === 'caught'
                  ? '捕捉成功'
                  : b.result === 'escaped'
                    ? '顺利离开'
                    : '休整再出发'}
            </Label>
            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ gap: 4 }}>
              {b.logs.map((line, i) => (
                <Label
                  key={i}
                  style={{ fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 22 }}
                >
                  {line}
                </Label>
              ))}
            </ScrollView>
          </Panel>
        )}
      </View>
      <View
        style={[
          s.footer,
          {
            height: footerHeight + insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {choosingMoves ? (
          <BattleMoves
            game={game}
            columns={moveColumns}
            actionsRemaining={actionsRemaining}
            actionTotal={actionTotal}
            onMove={(index) => act({ kind: 'move', index })}
            onBack={() => setPage('commands')}
          />
        ) : (
          <>
            <View
              style={{
                flex: 1,
                paddingHorizontal: compact ? 15 : 24,
                paddingVertical: compact ? 10 : 18,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: compact ? 3 : 8,
                }}
              >
                <Text
                  style={{ color: palette.gold, fontSize: compact ? 11 : 13, fontWeight: '700' }}
                >
                  {presenting
                    ? '战斗进程'
                    : ended
                      ? '冒险记录'
                      : choosingParty
                        ? '伙伴的选择'
                        : page === 'moves'
                          ? `选择技能 · 本次使用 1 次，剩余 ${actionsRemaining}/${actionTotal} 次操作`
                          : page === 'bag'
                            ? '选择道具'
                            : `${creatureName(player)}，你打算怎么做？`}
                </Text>
                {page !== 'commands' && !ended && !presenting && b.phase !== 'forcedSwitch' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="返回战斗指令"
                    onPress={() => setPage('commands')}
                  >
                    <Text style={{ color: palette.muted, fontSize: 11 }}>‹ 返回指令</Text>
                  </Pressable>
                )}
              </View>
              {presenting ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="战斗信息，自动播放"
                  testID="battle-dialogue"
                  disabled={animating}
                  onPress={playbackClock.skip}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Label style={{ fontSize: compact ? 15 : 19, lineHeight: compact ? 23 : 29 }}>
                    {opening ? '双方的伙伴正在登场！' : presentation[line]}
                  </Label>
                  <Text style={{ alignSelf: 'flex-end', color: palette.gold, fontSize: 11 }}>
                    {playbackStopped
                      ? '播放已暂停'
                      : animating
                        ? animatingGrowth
                          ? '伙伴成长中 · 自动播放'
                          : faints.some((visual) => !visual.completed)
                            ? '精灵正在退场 · 自动播放'
                            : opening
                              ? '伙伴登场中 · 自动播放'
                              : activeMove
                                ? '技能演出中 · 自动播放'
                                : animatingCapture
                                  ? '捕捉演出中 · 自动播放'
                                  : '精灵切换中 · 自动播放'
                        : `自动播放 · ${messageDelay / 1000} 秒 / 条`}
                  </Text>
                </Pressable>
              ) : (
                <ScrollView
                  ref={logRef}
                  onContentSizeChange={() => logRef.current?.scrollToEnd({ animated: false })}
                  contentContainerStyle={{ gap: 3 }}
                >
                  {b.logs.slice(-3).map((line, i) => (
                    <Label
                      key={`${b.turn}-${i}`}
                      style={{
                        fontSize: compact ? 12 : 15,
                        lineHeight: compact ? 18 : 23,
                        color: i === b.logs.slice(-3).length - 1 ? palette.text : palette.muted,
                      }}
                    >
                      {line}
                    </Label>
                  ))}
                </ScrollView>
              )}
            </View>
            <View
              style={[
                s.commandBox,
                {
                  width: (field.width - insets.left - insets.right) * 0.41,
                  padding: compact ? 8 : 13,
                  gap: compact ? 6 : 9,
                },
              ]}
            >
              {presenting ? (
                <View style={{ flex: 1, justifyContent: 'center', gap: compact ? 4 : 10 }}>
                  <Label
                    testID="battle-autoplay-status"
                    style={{ color: palette.muted, fontSize: compact ? 11 : 13 }}
                  >
                    {playbackStopped ? '播放已暂停' : `自动播放 · ${messageDelay / 1000} 秒 / 条`}
                  </Label>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      small
                      testID="battle-playback-pause"
                      onPress={() => setPlaybackPaused(!playbackPaused)}
                    >
                      {playbackPaused ? '继续播放' : '暂停'}
                    </Button>
                    <Button
                      small
                      testID="battle-next-line"
                      disabled={animating}
                      onPress={playbackClock.skip}
                    >
                      下一条
                    </Button>
                  </View>
                </View>
              ) : ended ? (
                <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  <Label
                    testID="battle-auto-return"
                    style={{ color: palette.muted, fontSize: compact ? 11 : 13 }}
                  >
                    {playbackStopped ? '播放已暂停' : `${messageDelay / 1000} 秒后自动返回旅程`}
                  </Label>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      small
                      testID="battle-playback-pause"
                      onPress={() => setPlaybackPaused(!playbackPaused)}
                    >
                      {playbackPaused ? '继续播放' : '暂停'}
                    </Button>
                    <Button accent small testID="close-battle" onPress={playbackClock.skip}>
                      立即返回旅程
                    </Button>
                  </View>
                </View>
              ) : b.phase === 'forcedSwitch' ? (
                <Label style={{ color: palette.gold, textAlign: 'center' }}>
                  伙伴在等待你的选择
                </Label>
              ) : (
                <>
                  <BattleTile
                    testID="fight"
                    icon
                    title="战斗"
                    detail="选择技能"
                    color="#b97662"
                    disabled={busy || choosingParty}
                    onPress={() => setPage('moves')}
                  />
                  <BattleTile
                    title="背包"
                    icon
                    detail={`精灵球 ${Object.keys(BALLS).reduce((n, id) => n + (game.inventory[id] ?? 0), 0)}`}
                    color="#ceae65"
                    disabled={busy || choosingParty}
                    onPress={() => setPage('bag')}
                  />
                  <BattleTile
                    title="精灵"
                    icon
                    detail={`队伍 ${game.party.length} 只`}
                    color={palette.accent}
                    disabled={busy || choosingParty}
                    onPress={() => setPage('party')}
                  />
                  <BattleTile
                    title="逃跑"
                    icon
                    detail={
                      b.event === 'openingRescue'
                        ? '先帮助博士脱险'
                        : b.kind === 'wild'
                          ? '离开野生对战'
                          : '训练师战不可逃跑'
                    }
                    color="#839fb4"
                    disabled={
                      busy || b.kind !== 'wild' || b.event === 'openingRescue' || choosingParty
                    }
                    onPress={() => act({ kind: 'run' })}
                  />
                </>
              )}
            </View>
          </>
        )}
      </View>
      <BattleMenus
        game={game}
        mode={
          ended || presenting || busy
            ? null
            : choosingParty
              ? page === 'targets'
                ? 'targets'
                : 'party'
              : page === 'bag'
                ? 'bag'
                : null
        }
        targetItem={targetItem}
        compact={compact}
        onTargetItem={(id) => {
          setTargetItem(id);
          setPage('targets');
        }}
        onAction={act}
        onBack={() => setPage(page === 'targets' ? 'bag' : 'commands')}
      />
    </View>
  );
}
export function statusName(status: string) {
  return { poison: '中毒', burn: '灼伤', paralysis: '麻痹', sleep: '睡眠' }[status] ?? status;
}
const s = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    flexShrink: 0,
    backgroundColor: palette.panel,
    borderTopWidth: 1,
    borderColor: palette.line,
  },
  commandBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderLeftWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel2,
    alignContent: 'stretch',
    justifyContent: 'center',
  },
  tile: {
    width: '48%',
    height: '47%',
    flexGrow: 1,
    minHeight: 42,
    flexBasis: '45%',
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tileDot: { width: 5, height: 25, borderRadius: 2 },
  tileTitle: { fontSize: 15, lineHeight: 18, fontWeight: '800', color: palette.ink },
  tileDetail: { fontSize: 10, lineHeight: 14, color: palette.muted, marginTop: 2 },
  statusCard: {
    position: 'absolute',
    backgroundColor: `${palette.panel}f5`,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  creatureName: { color: palette.ink, fontSize: 18, fontWeight: '800', flexShrink: 1 },
  level: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  hpLabel: { fontSize: 10, fontWeight: '900', color: '#aa9251' },
  hpNumber: { fontSize: 11, color: palette.muted },
  statusText: { fontSize: 10, color: '#97644b' },
  battleTag: {
    position: 'absolute',
    alignSelf: 'center',
    top: 7,
    paddingHorizontal: 11,
    paddingVertical: 4,
    backgroundColor: `${palette.panel}ee`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  logButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 7,
    backgroundColor: `${palette.panel}ee`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  selection: {
    position: 'absolute',
    left: '24%',
    right: 14,
    bottom: 10,
    borderColor: '#d0c18b',
    borderWidth: 2,
    backgroundColor: `${palette.panel}fa`,
  },
  result: {
    position: 'absolute',
    left: '25%',
    right: '25%',
    top: 10,
    borderWidth: 2,
    borderColor: '#d7bf7d',
    backgroundColor: `${palette.panel}f2`,
  },
});
