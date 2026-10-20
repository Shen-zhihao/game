import { fishingEntryReason, fishingSiteAtPlayer } from '../../game/fishing';
import { forcedTravelDuration } from '../../game/movement';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { trackedQuest } from '../../content/quests';
import { MAPS, objective } from '../../content/world';
import { Command, GameState, MapId } from '../../game/model';
import { WorldViewport } from '../../components/WorldViewport';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Label, palette } from '../../components/ui';
import { availablePoints } from '../../game/growth';
import { isIndoor, localWeather, WEATHER, weatherAt } from '../../game/environment';
import { useBuildingPassage } from '../../hooks/useBuildingPassage';
import { GameControls } from '../../components/GameControls';
import { useControlPreferences } from '../../hooks/useControlPreferences';
import {
  controlOrientation,
  resolveControlFrame,
  resolveDialogueFrame,
} from '../../platform/controlLayout/controller';
import { SCENE_TRANSITION } from '../../sceneTransition';
import { calendarDetails } from '../../game/calendar';
import { useNightLighting } from '../../hooks/useNightLighting';
import { useMapPassage } from '../../hooks/useMapPassage';
import { useWalkInput } from '../../hooks/useWalkInput';
import { MapArrivalIllustration } from '../../components/MapArrivalIllustration';

export function Explore({
  game: currentGame,
  dispatch,
  width,
  height,
  paused: screenPaused,
  onMenu,
  coveredTransition = false,
  onReady,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
  width: number;
  height: number;
  paused: boolean;
  onMenu: () => void;
  coveredTransition?: boolean;
  onReady?: (map: MapId) => void;
}) {
  const priorTravelPosition = useRef(currentGame.player);
  const travelLockedUntil = useRef(0);
  useLayoutEffect(() => {
    const duration = forcedTravelDuration(
      { player: priorTravelPosition.current },
      { player: currentGame.player },
    );
    priorTravelPosition.current = currentGame.player;
    if (duration) travelLockedUntil.current = Date.now() + duration;
  }, [currentGame.player]);
  const openMenu = useCallback(() => {
    if (Date.now() >= travelLockedUntil.current) onMenu();
  }, [onMenu]);
  const passage = useMapPassage(currentGame, coveredTransition, screenPaused);
  const { game, door, transition } = useBuildingPassage(passage.game);
  const night = useNightLighting(game, coveredTransition || !!transition || !!passage.transition);
  const calendar = calendarDetails(game);
  const paused = screenPaused || !!transition || !!passage.transition;
  const passageReady = passage.onReady;
  const sceneReady = useCallback(
    (map: MapId) => {
      passageReady(map);
      onReady?.(map);
    },
    [passageReady, onReady],
  );
  const blocked =
    paused ||
    !!game.dialogue ||
    !!game.battle ||
    !!game.activities?.active ||
    !!game.challenge?.active ||
    !!game.pending.length ||
    !!game.world?.trainerChallenge ||
    !!game.progress.flags.starterChoice;
  const { direction, stop } = useWalkInput({ game, paused, blocked, dispatch, onMenu: openMenu });
  const insets = useSafeAreaInsets();
  const preferences = useControlPreferences();
  const layout = preferences[controlOrientation(width, height)];
  const area = { width, height, ...insets };
  const actionFrame = resolveControlFrame('interact', layout, area);
  const dpadFrame = resolveControlFrame('dpad', layout, area);
  const tiny = height < 300;
  const compactTracker = height < 400;
  const tracked = trackedQuest(game);
  const [faceX, faceY] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    game.player.facing
  ]!;
  const facingWater =
    MAPS[game.player.map].rows[game.player.y + faceY!]?.[game.player.x + faceX!] === '~';
  const growthPoints = game.party.reduce(
    (sum, id) => sum + availablePoints(game.creatures[id]!),
    0,
  );
  const weather = WEATHER[weatherAt(game)];
  const remaining = Math.max(0, Math.ceil(localWeather(game)?.remaining ?? 180));
  const nextWeather = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const [hiddenNotice, setHiddenNotice] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setHiddenNotice(game.notice), 4000);
    return () => clearTimeout(timeout);
  }, [game.notice]);
  const weatherChanged = hiddenNotice !== game.notice && game.notice.startsWith('天气转为');
  return (
    <View testID="explore-fullscreen" style={{ width, height }}>
      <WorldViewport
        game={game}
        width={width}
        height={height}
        paused={blocked}
        motionPaused={paused}
        door={door}
        coveredTransition={coveredTransition || !!transition || !!passage.transition}
        onReady={sceneReady}
        night={night}
      />
      <View
        pointerEvents="box-none"
        style={[
          s.header,
          { top: insets.top + 10, left: insets.left + 14, right: insets.right + 112 },
        ]}
      >
        <View pointerEvents="none" style={[s.locationCard, { maxWidth: width * 0.48 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text numberOfLines={1} style={[s.location, { flexShrink: 1 }]}>
              {MAPS[game.player.map].name}
            </Text>
            {!tiny && <Text style={s.smallText}>◈ {game.progress.badges}/8</Text>}
          </View>
          <Text testID="calendar-status" numberOfLines={1} style={s.smallText}>
            星苔历 {calendar.date} · {calendar.clock} {calendar.night ? '夜晚' : '白天'}
          </Text>
          {!isIndoor(game.player.map) && (
            <Text testID="weather-status" numberOfLines={1} style={s.smallText}>
              {weatherChanged ? `天气转为${weather.name}` : `${weather.mark} ${weather.name}`}
              {' · '}下次变化 {nextWeather}
            </Text>
          )}
          {!!game.repelSteps && (
            <Text testID="repel-status" style={s.smallText}>
              驱避喷雾 · 剩余 {game.repelSteps} 步
            </Text>
          )}
        </View>
      </View>
      {!tiny && !game.dialogue && !tracked && (
        <View
          pointerEvents="none"
          style={[
            s.objective,
            {
              top: insets.top + 96 + (game.repelSteps ? 16 : 0),
              left: insets.left + 14,
              maxWidth: Math.min(290, width * 0.4),
            },
          ]}
        >
          <Text numberOfLines={2} style={s.goalText}>
            {objective(game.progress.flags, game.progress.badges, game.player.map)}
          </Text>
        </View>
      )}
      {tracked && !game.dialogue && (
        <View
          testID="tracked-quest-hud"
          pointerEvents="none"
          style={[
            s.objective,
            {
              top:
                insets.top +
                (tiny ? 74 : isIndoor(game.player.map) ? 78 : 96) +
                (game.repelSteps ? 16 : 0),
              left: insets.left + 14,
              maxWidth: Math.min(340, width * 0.45),
              paddingVertical: compactTracker ? 6 : 8,
              gap: compactTracker ? 2 : 4,
            },
          ]}
        >
          <Text
            testID="tracked-quest-name"
            numberOfLines={1}
            style={[s.goalText, { fontWeight: '800', color: palette.gold }]}
          >
            追踪 · {tracked.name}
          </Text>
          <Text
            testID="tracked-quest-goal"
            numberOfLines={compactTracker ? 1 : 2}
            style={s.goalText}
          >
            {tracked.next}
          </Text>
          <Text
            testID="tracked-quest-progress"
            style={[s.smallText, { fontSize: 10, lineHeight: 14 }]}
          >
            {tracked.status === 'completed'
              ? '已完成'
              : tracked.status === 'ready'
                ? '待交付'
                : '进行中'}{' '}
            · {tracked.current}/{tracked.target}
          </Text>
          <View
            style={{
              height: 3,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: palette.panel2,
            }}
          >
            <View
              testID="tracked-quest-progress-bar"
              style={{
                height: '100%',
                width: `${Math.min(1, tracked.current / Math.max(1, tracked.target)) * 100}%`,
                backgroundColor: '#efbc48',
              }}
            />
          </View>
        </View>
      )}
      {hiddenNotice !== game.notice && !!game.notice && !weatherChanged && !game.dialogue && (
        <View
          testID="explore-notice"
          pointerEvents="none"
          style={[
            s.notice,
            {
              bottom: insets.bottom + 18,
              maxWidth: Math.max(150, width - insets.left - insets.right - dpadFrame.width - 140),
            },
          ]}
        >
          <Text testID="explore-notice-text" numberOfLines={2} style={s.noticeText}>
            {game.notice}
          </Text>
        </View>
      )}
      {game.dialogue && (
        <View style={[s.dialogue, resolveDialogueFrame(area, actionFrame)]}>
          <ScrollView
            key={`${game.dialogue.speaker}:${game.dialogue.index}`}
            contentContainerStyle={{ padding: tiny ? 12 : 18 }}
          >
            <Text style={s.speaker}>{game.dialogue.speaker}</Text>
            <Label style={{ fontSize: tiny ? 13 : 16, lineHeight: tiny ? 20 : 26, marginTop: 6 }}>
              {game.dialogue.lines[game.dialogue.index]}
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="继续 ▸"
              onPress={() => dispatch({ kind: 'nextDialogue' })}
              style={({ pressed }) => [s.dialogueNext, pressed && { opacity: 0.6 }]}
            >
              <Text style={[s.smallText, { color: palette.muted, textShadowRadius: 0 }]}>
                {game.dialogue.index + 1}/{game.dialogue.lines.length}　继续 ▸
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
      {!game.dialogue && (
        <View style={{ position: 'absolute', top: insets.top + 58, right: insets.right + 14 }}>
          <Button
            small
            testID="toggle-running"
            disabled={blocked}
            selected={!!game.player.running}
            onPress={() => {
              stop();
              dispatch({ kind: 'setRunning', running: !game.player.running });
            }}
          >
            {game.player.running ? '奔跑中' : '步行'} · R
          </Button>
        </View>
      )}
      {!blocked && fishingSiteAtPlayer(game) && (
        <View style={{ position: 'absolute', top: insets.top + 116, right: insets.right + 14 }}>
          <Button
            small
            testID="shore-fishing"
            disabled={!!fishingEntryReason(game)}
            onPress={() => {
              stop();
              dispatch({ kind: 'fish' });
            }}
          >
            垂钓
          </Button>
        </View>
      )}
      <GameControls
        area={area}
        layout={layout}
        blocked={blocked}
        actionDisabled={
          paused ||
          !!game.battle ||
          !!game.pending.length ||
          !!game.progress.flags.starterChoice ||
          !!game.world?.trainerChallenge
        }
        menuDisabled={
          paused || !!game.progress.flags.starterChoice || !!game.world?.trainerChallenge
        }
        dialogue={!!game.dialogue}
        facingWater={facingWater}
        growthPoints={
          !game.dialogue && (!game.progress.flags.opening || game.progress.flags.partnerReceived)
            ? growthPoints
            : 0
        }
        onDirection={direction}
        onDirectionEnd={stop}
        onInteract={() =>
          game.dialogue ? dispatch({ kind: 'nextDialogue' }) : dispatch({ kind: 'interact' })
        }
        onMenu={openMenu}
      />
      <Animated.View
        testID="night-screen-shade"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#0a1530',
            opacity: night.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
          },
        ]}
      />
      {!!passage.arrival && !transition && !passage.transition && !coveredTransition && (
        <MapArrivalIllustration key={passage.arrival} map={game.player.map} paused={paused} />
      )}
      {passage.transition && (
        <Animated.View
          testID="world-map-transition"
          accessibilityLabel={`正在前往${MAPS[passage.transition.map].name}`}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: SCENE_TRANSITION.color,
              opacity: passage.transition.opacity,
              zIndex: 1000,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Text style={{ fontSize: 25, fontWeight: '800', color: '#655541' }}>
            {MAPS[passage.transition.map].name}
          </Text>
          <View
            style={{
              marginTop: 14,
              width: 50,
              height: 3,
              borderRadius: 2,
              backgroundColor: '#e9b34f',
            }}
          />
        </Animated.View>
      )}
      {transition && (
        <Animated.View
          testID="building-door-transition"
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: SCENE_TRANSITION.color, opacity: transition.opacity, zIndex: 1000 },
          ]}
          accessibilityLabel={`正在${transition.entering ? '进入' : '离开'}${transition.name}`}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationCard: {
    backgroundColor: `${palette.panel}f2`,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 3,
  },
  location: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  smallText: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  objective: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: `${palette.panel}eb`,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalText: {
    color: palette.ink,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: { backgroundColor: `${palette.ink}c7`, transform: [{ scale: 0.97 }] },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 9,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noticeText: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  dialogue: {
    position: 'absolute',
    backgroundColor: `${palette.panel}f2`,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
  },
  speaker: { color: palette.gold, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  dialogueNext: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
});
