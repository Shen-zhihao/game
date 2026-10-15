import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MAPS, objective } from '../content/world';
import { Command, Direction, GameState } from '../game/model';
import { WorldViewport } from '../components/WorldViewport';
import { Label, palette, Button } from '../components/ui';

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const held = useRef<Direction | null>(null);
  const blocked = paused || !!game.dialogue || !!game.battle || !!game.pending.length;
  const input = useRef({ blocked, dispatch, onMenu, dialogue: !!game.dialogue });
  useEffect(() => {
    input.current = { blocked, dispatch, onMenu, dialogue: !!game.dialogue };
  }, [blocked, dispatch, game.dialogue, onMenu]);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    held.current = null;
  }, []);
  const direction = useCallback(
    (d: Direction) => {
      if (input.current.blocked || held.current === d) return;
      stop();
      held.current = d;
      input.current.dispatch({ kind: 'walk', direction: d });
      timer.current = setInterval(() => {
        if (input.current.blocked) {
          stop();
          return;
        }
        input.current.dispatch({ kind: 'walk', direction: d });
      }, 160);
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
  const compact = height < 430;
  const availableHeight = height - (compact ? 68 : 92);
  const mapWidth = Math.min(width - (compact ? 224 : 280), availableHeight * 1.65);
  const mapHeight = availableHeight;
  const controls = (d: Direction, symbol: string, style: object) => (
    <Pressable
      testID={`move-${d}`}
      accessibilityLabel={`向${{ up: '上', down: '下', left: '左', right: '右' }[d]}移动`}
      onPressIn={() => direction(d)}
      onPressOut={stop}
      disabled={blocked}
      style={({ pressed }) => [
        s.arrow,
        compact && { width: 40, height: 40 },
        style,
        pressed && { backgroundColor: '#668568' },
      ]}
    >
      <Text style={{ color: '#e6e8bd', fontSize: 22 }}>{symbol}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#0c251e' }}>
      <View style={[s.top, { height: compact ? 49 : 62 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.location}>
            {MAPS[game.player.map].name}
            <Text style={s.chapter}> / CH. 01</Text>
          </Text>
          <Label muted style={{ fontSize: 11, lineHeight: 15 }}>
            {MAPS[game.player.map].subtitle}
          </Label>
        </View>
        <Label muted style={{ fontSize: 11 }}>
          {saveStatus}
        </Label>
        <Button small onPress={onMenu}>
          ☷ 菜单
        </Button>
      </View>
      <View
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={[s.side, { width: compact ? 112 : 140 }]}>
          <Text style={s.miniLabel}>下一步</Text>
          <Label
            style={{
              fontSize: compact ? 11 : 12,
              lineHeight: compact ? 17 : 20,
              marginTop: 6,
              flexShrink: 1,
            }}
          >
            {objective(game.progress.flags, game.progress.badges)}
          </Label>
          <View style={{ flex: 1, minHeight: 12 }} />
          <View
            style={{ width: compact ? 92 : 124, height: compact ? 92 : 124, position: 'relative' }}
          >
            {controls('up', '▴', { position: 'absolute', top: 0, left: compact ? 28 : 40 })}
            {controls('down', '▾', { position: 'absolute', bottom: 0, left: compact ? 28 : 40 })}
            {controls('left', '◂', {
              position: 'absolute',
              left: compact ? -8 : 0,
              top: compact ? 26 : 40,
            })}
            {controls('right', '▸', {
              position: 'absolute',
              right: compact ? -8 : 0,
              top: compact ? 26 : 40,
            })}
          </View>
          <Label muted style={{ fontSize: 9, marginTop: 12 }}>
            方向键 / WASD
          </Label>
        </View>
        <View
          style={{
            width: mapWidth,
            height: mapHeight,
            overflow: 'hidden',
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#466651',
            backgroundColor: '#8dab72',
          }}
        >
          <WorldViewport game={game} width={mapWidth} height={mapHeight} paused={blocked} />
          <View pointerEvents="none" style={s.mapTag}>
            <Text style={{ color: '#e7dfb7', fontSize: 10, letterSpacing: 1 }}>
              星苔地区 · 早晨
            </Text>
          </View>
        </View>
        <View style={[s.side, { width: compact ? 112 : 140, alignItems: 'center' }]}>
          <Text style={s.miniLabel}>旅行者</Text>
          <Label style={{ fontWeight: '700', marginTop: 5 }}>{game.player.name}</Label>
          <Label muted style={{ fontSize: 11 }}>
            ◈ {game.progress.badges} 枚徽章
          </Label>
          <Label muted style={{ fontSize: 11 }}>
            ◎ {game.player.money}
          </Label>
          <View style={{ flex: 1, minHeight: 12 }} />
          <Pressable
            testID="interact"
            accessibilityRole="button"
            accessibilityLabel="A 交谈调查"
            onPress={() =>
              game.dialogue ? dispatch({ kind: 'nextDialogue' }) : dispatch({ kind: 'interact' })
            }
            disabled={paused || !!game.battle || !!game.pending.length}
            style={({ pressed }) => [
              s.aButton,
              compact && { width: 58, height: 58 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ fontSize: 25, fontWeight: '700', color: '#273d2c' }}>A</Text>
          </Pressable>
          <Label muted style={{ fontSize: 11, marginTop: 8 }}>
            交谈 / 调查
          </Label>
          <Label muted style={{ fontSize: 9 }}>
            Enter / Z
          </Label>
        </View>
      </View>
      <View style={{ height: compact ? 19 : 28, paddingHorizontal: 16, justifyContent: 'center' }}>
        <Label muted style={{ fontSize: 10, lineHeight: 15 }}>
          {game.notice}
        </Label>
      </View>
      {game.dialogue && (
        <View style={s.dialogue}>
          <View style={{ flex: 1 }}>
            <Text style={s.speaker}>{game.dialogue.speaker}</Text>
            <Label
              style={{ fontSize: compact ? 14 : 16, lineHeight: compact ? 22 : 27, marginTop: 5 }}
            >
              {game.dialogue.lines[game.dialogue.index]}
            </Label>
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Label muted style={{ fontSize: 10 }}>
              {game.dialogue.index + 1} / {game.dialogue.lines.length}
            </Label>
            <Button accent onPress={() => dispatch({ kind: 'nextDialogue' })}>
              继续 ▸
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  top: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderColor: '#304d3c',
  },
  location: { color: palette.text, fontSize: 19, fontWeight: '800', letterSpacing: 2 },
  chapter: { color: '#93ab88', fontSize: 10, fontWeight: '500', letterSpacing: 1 },
  side: { height: '100%', padding: 14 },
  miniLabel: { color: '#b9cc9c', fontSize: 10, letterSpacing: 2 },
  arrow: {
    width: 44,
    height: 44,
    backgroundColor: '#284c3d',
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: '#5f7b59',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aButton: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#e1cd87',
    borderWidth: 3,
    borderColor: '#9a8e58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#163a2dcc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dialogue: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    bottom: 26,
    flexDirection: 'row',
    gap: 18,
    padding: 20,
    backgroundColor: '#123227f5',
    borderWidth: 2,
    borderColor: '#c4bb7d',
    borderRadius: 12,
    minHeight: 116,
  },
  speaker: { color: '#e4cc84', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});
