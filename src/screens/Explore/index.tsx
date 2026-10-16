import { HapticPressable as Pressable } from '../../components/HapticPressable';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MAPS, objective } from '../../content/world';
import { Command, Direction, GameState } from '../../game/model';
import { WorldViewport } from '../../components/WorldViewport';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, palette } from '../../components/ui';
import { availablePoints } from '../../game/growth';
import { TERRAIN_SPEEDS, travelProfile, WEATHER, weatherAt } from '../../game/environment';
import { useBuildingPassage } from '../../useBuildingPassage';
import { GameControls } from '../../components/GameControls';
import { useControlPreferences } from '../../platform/controlLayout';
import {
  controlOrientation,
  resolveControlFrame,
  resolveDialogueFrame,
} from '../../platform/controlLayout/controller';
import { SCENE_TRANSITION } from '../../sceneTransition';

export function Explore({
  game: currentGame,
  dispatch,
  width,
  height,
  paused: screenPaused,
  saveStatus,
  onMenu,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
  width: number;
  height: number;
  paused: boolean;
  saveStatus: string;
  onMenu: () => void;
}) {
  const { game, door, transition } = useBuildingPassage(currentGame);
  const paused = screenPaused || !!transition;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef<Direction | null>(null);
  const blocked =
    paused ||
    !!game.dialogue ||
    !!game.battle ||
    !!game.pending.length ||
    !!game.progress.flags.starterChoice;
  const input = useRef({ paused, blocked, dispatch, onMenu, dialogue: !!game.dialogue, game });
  useEffect(() => {
    input.current = { paused, blocked, dispatch, onMenu, dialogue: !!game.dialogue, game };
  }, [paused, blocked, dispatch, game, onMenu]);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    held.current = null;
  }, []);
  const direction = useCallback(
    (d: Direction) => {
      if (input.current.blocked || held.current === d) return;
      stop();
      held.current = d;
      const step = () => {
        if (input.current.blocked) {
          stop();
          return;
        }
        const current = input.current.game;
        const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]!;
        const delay = travelProfile(
          current,
          current.player.x + dx!,
          current.player.y + dy!,
        ).interval;
        input.current.dispatch({ kind: 'walk', direction: d });
        timer.current = setTimeout(step, delay);
      };
      step();
    },
    [stop],
  );
  useEffect(() => {
    if (blocked) stop();
    return stop;
  }, [blocked, stop]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', stop);
    return () => sub.remove();
  }, [stop]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const directions: Record<string, Direction> = {
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
    };
    const keyDown = (e: KeyboardEvent) => {
      if (input.current.paused) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const key = e.key.toLowerCase();
      if (directions[key]) {
        e.preventDefault();
        if (!e.repeat) direction(directions[key]!);
        return;
      }
      if (!e.repeat && ['enter', ' ', 'z'].includes(key)) {
        e.preventDefault();
        stop();
        if (input.current.dialogue) input.current.dispatch({ kind: 'nextDialogue' });
        else if (!input.current.blocked) input.current.dispatch({ kind: 'interact' });
      }
      if (key === 'escape' && !e.repeat && !input.current.blocked) {
        stop();
        input.current.onMenu();
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (directions[e.key.toLowerCase()] === held.current) stop();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [direction, stop]);
  const insets = useSafeAreaInsets();
  const preferences = useControlPreferences();
  const layout = preferences[controlOrientation(width, height)];
  const area = { width, height, ...insets };
  const actionFrame = resolveControlFrame('interact', layout, area);
  const dpadFrame = resolveControlFrame('dpad', layout, area);
  const tiny = height < 300;
  const [faceX, faceY] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    game.player.facing
  ]!;
  const facingWater =
    MAPS[game.player.map].rows[game.player.y + faceY!]?.[game.player.x + faceX!] === '~';
  const growthPoints = game.party.reduce(
    (sum, id) => sum + availablePoints(game.creatures[id]!),
    0,
  );
  const travel = travelProfile(game);
  const [hiddenNotice, setHiddenNotice] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setHiddenNotice(game.notice), 4000);
    return () => clearTimeout(timeout);
  }, [game.notice]);
  return (
    <View testID="explore-fullscreen" style={{ width, height }}>
      <WorldViewport
        game={game}
        width={width}
        height={height}
        paused={blocked}
        door={door}
        coveredTransition={!!transition}
      />
      <View
        pointerEvents="box-none"
        style={[
          s.header,
          { top: insets.top + 10, left: insets.left + 14, right: insets.right + 112 },
        ]}
      >
        <View pointerEvents="none" style={[s.locationCard, { maxWidth: width * 0.48 }]}>
          <Text numberOfLines={1} style={s.location}>
            {MAPS[game.player.map].name}
          </Text>
          {!tiny && (
            <Text style={s.smallText}>
              ◈ {game.progress.badges}/8　{WEATHER[weatherAt(game)].mark}{' '}
              {WEATHER[weatherAt(game)].name} · {TERRAIN_SPEEDS[travel.terrain].name}{' '}
              {Math.round(travel.speed * 100)}%
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!tiny && (
            <View pointerEvents="none" style={s.statusCard}>
              <Text style={s.smallText}>
                ◎ {game.player.money}　·　{saveStatus}
              </Text>
            </View>
          )}
        </View>
      </View>
      {!tiny && !game.dialogue && (
        <View
          pointerEvents="none"
          style={[
            s.objective,
            { top: insets.top + 75, left: insets.left + 14, maxWidth: Math.min(290, width * 0.4) },
          ]}
        >
          <Text numberOfLines={2} style={s.goalText}>
            {objective(game.progress.flags, game.progress.badges, game.player.map)}
          </Text>
        </View>
      )}
      {hiddenNotice !== game.notice && !!game.notice && !game.dialogue && (
        <View
          pointerEvents="none"
          style={[
            s.notice,
            {
              bottom: insets.bottom + 18,
              maxWidth: Math.max(150, width - insets.left - insets.right - dpadFrame.width - 140),
            },
          ]}
        >
          <Text numberOfLines={2} style={s.smallText}>
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
              <Text style={s.smallText}>
                {game.dialogue.index + 1}/{game.dialogue.lines.length}　继续 ▸
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
      <GameControls
        area={area}
        layout={layout}
        blocked={blocked}
        actionDisabled={
          paused || !!game.battle || !!game.pending.length || !!game.progress.flags.starterChoice
        }
        menuDisabled={paused || !!game.progress.flags.starterChoice}
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
        onMenu={onMenu}
      />
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
    backgroundColor: '#102d247a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 3,
  },
  location: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: '#10251dc0',
    textShadowRadius: 3,
  },
  smallText: {
    color: '#f1e9ce',
    fontSize: 11,
    lineHeight: 16,
    textShadowColor: '#112c23',
    textShadowRadius: 2,
  },
  statusCard: {
    backgroundColor: '#102d2470',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  objective: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: '#102d246b',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalText: {
    color: '#fff0c6',
    fontSize: 12,
    lineHeight: 18,
    textShadowColor: '#193b2c',
    textShadowRadius: 2,
  },
  pressed: { backgroundColor: '#517b52c7', transform: [{ scale: 0.97 }] },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 9,
    backgroundColor: '#102d247d',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dialogue: {
    position: 'absolute',
    backgroundColor: '#123227d9',
    borderWidth: 1,
    borderColor: '#e2d49aab',
    borderRadius: 14,
  },
  speaker: { color: '#f2d78f', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  dialogueNext: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
});
