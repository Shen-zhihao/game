import { HapticPressable as Pressable } from '../../components/HapticPressable';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { MAPS, objective } from '../../content/world';
import { Command, Direction, GameState } from '../../game/model';
import { WorldViewport } from '../../components/WorldViewport';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, palette } from '../../components/ui';
import { availablePoints } from '../../game/growth';
import { TERRAIN_SPEEDS, travelProfile, WEATHER, weatherAt } from '../../game/environment';

export function Explore({
  game,
  dispatch,
  width,
  height,
  paused,
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef<Direction | null>(null);
  const blocked =
    paused ||
    !!game.dialogue ||
    !!game.battle ||
    !!game.pending.length ||
    !!game.progress.flags.starterChoice;
  const input = useRef({ blocked, dispatch, onMenu, dialogue: !!game.dialogue, game });
  useEffect(() => {
    input.current = { blocked, dispatch, onMenu, dialogue: !!game.dialogue, game };
  }, [blocked, dispatch, game, onMenu]);
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
  const keySize = tiny ? 36 : 44;
  const travel = travelProfile(game);
  const [hiddenNotice, setHiddenNotice] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setHiddenNotice(game.notice), 4000);
    return () => clearTimeout(timeout);
  }, [game.notice]);
  const controls = (d: Direction, symbol: string, x: number, y: number) => (
    <Pressable
      testID={`move-${d}`}
      accessibilityRole="button"
      accessibilityLabel={`向${{ up: '上', down: '下', left: '左', right: '右' }[d]}移动`}
      hitSlop={tiny ? 4 : 0}
      onPressIn={() => direction(d)}
      onPressOut={stop}
      disabled={blocked}
      style={({ pressed }) => [
        s.arrow,
        { width: keySize, height: keySize, left: x * keySize, top: y * keySize },
        pressed && s.pressed,
        blocked && { opacity: 0.3 },
      ]}
    >
      <Text style={s.arrowText}>{symbol}</Text>
    </Pressable>
  );
  return (
    <View testID="explore-fullscreen" style={{ width, height }}>
      <WorldViewport game={game} width={width} height={height} paused={blocked} />
      <View
        pointerEvents="box-none"
        style={[
          s.header,
          { top: insets.top + 10, left: insets.left + 14, right: insets.right + 14 },
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
          {growthPoints > 0 &&
            !game.dialogue &&
            (!game.progress.flags.opening || game.progress.flags.partnerReceived) && (
              <Pressable
                testID="growth-review"
                accessibilityRole="button"
                accessibilityLabel={`分配能力点 ${growthPoints}`}
                onPress={onMenu}
                disabled={blocked}
                style={[s.menuButton, { borderColor: palette.gold }]}
              >
                <Text style={[s.menuText, { color: palette.gold }]}>培养 +{growthPoints}</Text>
              </Pressable>
            )}
          {!tiny && (
            <View pointerEvents="none" style={s.statusCard}>
              <Text style={s.smallText}>
                ◎ {game.player.money}　·　{saveStatus}
              </Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="☷ 菜单"
            onPress={onMenu}
            disabled={paused || !!game.progress.flags.starterChoice}
            style={({ pressed }) => [s.menuButton, pressed && s.pressed]}
          >
            <Text style={s.menuText}>☷ 菜单</Text>
          </Pressable>
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
      {!game.dialogue && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            width: keySize * 3,
            height: keySize * 3,
            left: insets.left + 16,
            bottom: insets.bottom + 16,
          }}
        >
          {controls('up', '▴', 1, 0)}
          {controls('left', '◂', 0, 1)}
          {controls('right', '▸', 2, 1)}
          {controls('down', '▾', 1, 2)}
        </View>
      )}
      <Pressable
        testID="interact"
        accessibilityRole="button"
        accessibilityLabel={facingWater ? 'A 调查水面' : 'A 交谈调查'}
        onPress={() =>
          game.dialogue ? dispatch({ kind: 'nextDialogue' }) : dispatch({ kind: 'interact' })
        }
        disabled={
          paused || !!game.battle || !!game.pending.length || !!game.progress.flags.starterChoice
        }
        style={({ pressed }) => [
          s.aButton,
          {
            right: insets.right + 22,
            bottom: insets.bottom + (tiny ? 24 : 40),
            width: tiny ? 58 : 70,
            height: tiny ? 58 : 70,
          },
          pressed && s.pressed,
        ]}
      >
        <Text style={s.aText}>A</Text>
      </Pressable>
      {!tiny && !game.dialogue && (
        <Text
          pointerEvents="none"
          style={[s.interactHint, { right: insets.right + 16, bottom: insets.bottom + 18 }]}
        >
          {facingWater ? '调查水面' : '交谈 / 调查'}
        </Text>
      )}
      {hiddenNotice !== game.notice && !!game.notice && !game.dialogue && (
        <View
          pointerEvents="none"
          style={[
            s.notice,
            {
              bottom: insets.bottom + 18,
              maxWidth: Math.max(150, width - insets.left - insets.right - keySize * 3 - 140),
            },
          ]}
        >
          <Text numberOfLines={2} style={s.smallText}>
            {game.notice}
          </Text>
        </View>
      )}
      {game.dialogue && (
        <View
          style={[
            s.dialogue,
            {
              left: insets.left + 16,
              right: insets.right + (tiny ? 94 : 116),
              bottom: insets.bottom + 16,
              padding: tiny ? 12 : 18,
            },
          ]}
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
        </View>
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
  menuButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f6e8be66',
    backgroundColor: '#17392d80',
  },
  menuText: { color: '#fff5d6', fontSize: 14, fontWeight: '700' },
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
  arrow: {
    position: 'absolute',
    borderRadius: 13,
    backgroundColor: '#163d2e80',
    borderWidth: 1,
    borderColor: '#edf2d378',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#f3f3db', fontSize: 25, textShadowColor: '#173c2b', textShadowRadius: 3 },
  pressed: { backgroundColor: '#517b52c7', transform: [{ scale: 0.97 }] },
  aButton: {
    position: 'absolute',
    borderRadius: 40,
    backgroundColor: '#e4cd8b88',
    borderWidth: 2,
    borderColor: '#fff0bc99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aText: {
    color: '#fff6d7',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: '#3a573c',
    textShadowRadius: 3,
  },
  interactHint: {
    position: 'absolute',
    color: '#fff3d0',
    fontSize: 11,
    textShadowColor: '#173c2b',
    textShadowRadius: 3,
  },
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
