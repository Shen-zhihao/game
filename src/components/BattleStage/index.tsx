import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { MOVES } from '../../content/catalog';
import { BattleCaptureEvent, BattleMoveEvent, BattleScene } from '../../game/model';
import { moveFeedback, MOVE_VISUALS, MoveVisual, VisualPattern } from '../../game/battleVisuals';
import type { BattleFaintVisual, BattleSwitchVisual } from '../../game/battleVisuals';
import { haptic } from '../../platform/haptics';
import { CreatureSprite } from '../CreatureSprite';
import { palette } from '../ui';
import { BattleSwitchIllustration } from '../BattleSwitchIllustration';
import { BattleCaptureIllustration } from '../BattleCaptureIllustration';
import { BattleFaintIllustration } from '../BattleFaintIllustration';

type Point = { x: number; y: number };
function Glyph({ pattern, color, glow, variant, signature }: MoveVisual) {
  const c = color;
  const common = { stroke: glow, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const shapes: Record<VisualPattern, React.ReactNode> = {
    slash: (
      <G {...common} fill={c}>
        <Path d="M35 150 Q65 70 158 38 Q110 90 88 130Z" />
        <Path d="M64 166 Q104 98 170 78 L121 145Z" opacity={0.7} />
      </G>
    ),
    leaf: (
      <G {...common} fill={c}>
        <Path d="M38 153 Q28 42 161 40 Q156 159 38 153Z" />
        <Path d="M43 150 L145 54 M80 112 L68 72 M106 87 L144 96" fill="none" />
      </G>
    ),
    flame: (
      <G {...common}>
        <Path
          d="M99 20 Q160 86 140 112 Q171 98 157 139 Q143 179 99 178 Q39 175 40 119 Q46 85 77 67 Q65 112 88 109 Q110 84 99 20Z"
          fill={c}
        />
        <Path d="M106 101 Q142 155 99 165 Q66 158 86 127 L96 144Z" fill="#ffe7a0" stroke="none" />
      </G>
    ),
    wave: (
      <G {...common} fill={c}>
        <Path d="M25 117 Q54 67 85 108 Q115 153 145 90 Q142 58 123 62 Q149 31 176 73 Q204 135 146 157 Q71 188 25 117Z" />
        <Path d="M41 126 Q80 168 134 130" fill="none" strokeWidth={7} />
      </G>
    ),
    bolt: (
      <Polygon points="113,15 45,110 93,106 70,184 166,77 116,80 148,15" fill={c} {...common} />
    ),
    sting: (
      <G {...common} fill={c}>
        <Path d="M27 168 L83 83 L101 100 L169 31 L117 116 L99 101Z" />
        <Ellipse cx={75} cy={76} rx={17} ry={35} rotation={-45} origin="75,76" opacity={0.65} />
        <Ellipse cx={121} cy={123} rx={17} ry={35} rotation={-45} origin="121,123" opacity={0.65} />
      </G>
    ),
    wind: (
      <G fill="none" stroke={c} strokeWidth={12} strokeLinecap="round">
        <Path d="M25 68 H122 Q178 65 161 35 Q141 17 124 42 M36 100 H162 Q190 99 175 126 M25 132 H111 Q157 136 139 165 Q121 182 100 163" />
        <Path d="M35 94 H146" stroke={glow} strokeWidth={3} />
      </G>
    ),
    stone: (
      <G {...common} fill={c}>
        <Polygon points="62,42 113,27 158,63 171,127 118,170 53,151 29,94" />
        <Path d="M62 42 L77 91 L29 94 M77 91 L118 170 M77 91 L158 63 M77 91 L171 127" fill="none" />
      </G>
    ),
    venom: (
      <G {...common} fill={c}>
        <Path d="M99 24 Q120 69 150 107 Q183 163 101 176 Q23 162 49 114Z" />
        <Circle cx={83} cy={130} r={9} fill={glow} />
        <Circle cx={120} cy={148} r={5} fill={glow} />
      </G>
    ),
    earth: (
      <G {...common} fill={c}>
        <Path d="M20 160 L49 79 L72 112 L110 30 L139 114 L167 80 L184 160Z" />
        <Path d="M42 175 L90 150 L122 172 L163 150" fill="none" strokeWidth={8} />
      </G>
    ),
    ice: (
      <G stroke={c} strokeWidth={9} strokeLinecap="round">
        {[0, 60, 120].map((a) => (
          <G key={a} rotation={a} origin="100,100">
            <Line x1={100} y1={23} x2={100} y2={177} />
            <Path d="M75 44 L100 68 L125 44 M75 156 L100 132 L125 156" fill="none" />
          </G>
        ))}
        <Polygon points="100,65 133,100 100,135 67,100" fill={glow} strokeWidth={3} />
      </G>
    ),
    fist: (
      <G {...common} fill={c}>
        <Path d="M50 143 L37 95 Q33 77 51 72 L57 53 Q68 39 83 53 Q98 32 111 50 Q132 37 143 60 Q165 55 169 79 L159 127 L131 163 L73 167Z" />
        <Path
          d="M63 80 L66 105 M91 66 L91 100 M118 63 L118 97 M144 76 L142 102 M55 122 L103 114 L125 135"
          fill="none"
        />
      </G>
    ),
    mind: (
      <G fill="none" stroke={c} strokeWidth={7}>
        <Ellipse cx={100} cy={100} rx={77} ry={34} rotation={35} origin="100,100" />
        <Ellipse cx={100} cy={100} rx={77} ry={34} rotation={-35} origin="100,100" />
        <Circle cx={100} cy={100} r={25} fill={glow} strokeWidth={4} />
      </G>
    ),
    ghost: (
      <G {...common} fill={c}>
        <Path d="M42 156 Q22 91 58 58 Q108 8 153 58 Q180 96 158 158 L129 143 L106 170 L80 145 L58 170Z" />
        <Ellipse cx={78} cy={95} rx={10} ry={16} fill="#252039" stroke="none" />
        <Ellipse cx={125} cy={95} rx={10} ry={16} fill="#252039" stroke="none" />
      </G>
    ),
    dragon: (
      <G {...common} fill={c}>
        <Path d="M34 152 L53 101 L31 61 L79 73 L98 28 L114 68 L154 40 L146 88 L178 106 L141 126 L121 164 L81 172 L92 141 L63 141Z" />
        <Path d="M64 110 L109 91 L142 107 L105 118" fill={glow} stroke="none" />
        <Circle cx={114} cy={84} r={4} fill="#201e35" />
      </G>
    ),
    claw: (
      <G fill={c} stroke={glow} strokeWidth={2}>
        {[0, 1, 2].map((i) => (
          <Path
            key={i}
            d={`M${55 + i * 30} 25 Q${27 + i * 30} 97 ${40 + i * 30} 174 Q${52 + i * 30} 100 ${87 + i * 30} 55Z`}
          />
        ))}
      </G>
    ),
    steel: (
      <G {...common} fill={c}>
        <Polygon points="120,20 156,42 101,125 116,137 99,154 83,142 57,179 37,164 64,126 51,115 65,96 80,109" />
        <Path d="M135 36 L87 117" fill="none" strokeWidth={6} />
      </G>
    ),
    star: (
      <Polygon
        {...common}
        fill={c}
        points="100,18 122,75 181,79 137,117 152,177 100,143 47,177 63,117 19,79 78,75"
      />
    ),
    heal: (
      <G fill="#a2f7a0" {...common}>
        <Rect x={81} y={39} width={38} height={122} rx={8} />
        <Rect x={39} y={81} width={122} height={38} rx={8} />
        <Circle cx={100} cy={100} r={77} fill="none" stroke={c} strokeWidth={5} />
      </G>
    ),
    shield: (
      <G {...common} fill={c}>
        <Path
          d="M100 26 L161 54 L151 117 Q141 153 100 180 Q59 153 49 117 L39 54Z"
          fillOpacity={0.65}
        />
        <Path d="M100 48 V152 M63 72 L100 54 L137 72" fill="none" strokeWidth={6} />
      </G>
    ),
    focus: (
      <G fill="none" stroke={c} strokeWidth={6}>
        <Circle cx={100} cy={100} r={61} />
        <Circle cx={100} cy={100} r={28} />
        {[0, 90, 180, 270].map((a) => (
          <Line key={a} x1={100} y1={12} x2={100} y2={53} rotation={a} origin="100,100" />
        ))}
        <Circle cx={100} cy={100} r={8} fill={glow} />
      </G>
    ),
    debuff: (
      <G {...common} fill={c}>
        <Path d="M83 28 H117 V110 H150 L100 175 L50 110 H83Z" />
        <Path d="M39 63 Q100 10 162 63" fill="none" strokeWidth={7} />
      </G>
    ),
    weather: (
      <G {...common} fill={c}>
        <Circle cx={131} cy={65} r={34} fill={glow} />
        <Path d="M39 134 Q14 96 52 88 Q63 48 97 71 Q138 46 151 91 Q192 100 163 134Z" />
        {[57, 100, 143].map((x) => (
          <Line key={x} x1={x} y1={150} x2={x - 7} y2={173} stroke={c} strokeWidth={7} />
        ))}
      </G>
    ),
  };
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 200">
      <Circle cx={100} cy={100} r={90} fill={c} opacity={0.12} />
      <G rotation={(variant - 1) * 9} origin="100,100">
        {shapes[pattern]}
      </G>
      {signature && (
        <G fill="none" stroke={glow} strokeWidth={2} opacity={0.85}>
          <Circle cx={100} cy={100} r={95} />
          <Circle cx={100} cy={100} r={86} />
          {Array.from({ length: 12 }, (_, i) => (
            <Path key={i} d="M96 12 L100 5 L104 12" rotation={i * 30} origin="100,100" />
          ))}
        </G>
      )}
    </Svg>
  );
}
function Burst({ visual, critical }: { visual: MoveVisual; critical: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={84} fill={visual.color} opacity={0.15} />
      <Circle
        cx={120}
        cy={120}
        r={72}
        stroke={visual.glow}
        strokeWidth={critical ? 7 : 3}
        fill="none"
      />
      <Circle cx={120} cy={120} r={98} stroke={visual.color} strokeWidth={4} fill="none" />
      {Array.from({ length: visual.signature ? 14 : 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / (visual.signature ? 14 : 8);
        return (
          <G key={i}>
            <Line
              x1={120 + Math.cos(angle) * 80}
              y1={120 + Math.sin(angle) * 80}
              x2={120 + Math.cos(angle) * 115}
              y2={120 + Math.sin(angle) * 115}
              stroke={i % 2 ? visual.color : visual.glow}
              strokeWidth={i % 2 ? 7 : 4}
              strokeLinecap="round"
            />
            <Circle
              cx={120 + Math.cos(angle) * 52}
              cy={120 + Math.sin(angle) * 52}
              r={(i % 3) + 3}
              fill={visual.glow}
            />
          </G>
        );
      })}
    </Svg>
  );
}
export function BattleStage({
  scene,
  playerAnchor,
  enemyAnchor,
  size,
  event,
  feedbackEvent,
  eventKey,
  playing,
  onImpact,
  onFinished,
  ended,
  switches,
  completedSwitches,
  switchesPaused,
  onSwitchFinished,
  capture,
  captureCompleted,
  captured,
  captureKey,
  faints,
  hideFainted,
  onFaintFinished,
}: {
  scene: BattleScene;
  playerAnchor: Point;
  enemyAnchor: Point;
  size: number;
  event: BattleMoveEvent | null;
  feedbackEvent: BattleMoveEvent | null;
  eventKey: string;
  playing: boolean;
  onImpact: (key: string) => void;
  onFinished: (key: string) => void;
  ended: boolean;
  switches: BattleSwitchVisual[];
  completedSwitches: string[];
  switchesPaused: boolean;
  onSwitchFinished: (key: string) => void;
  capture: BattleCaptureEvent | null;
  captureCompleted: boolean;
  captured: boolean;
  captureKey: string;
  faints: (BattleFaintVisual & { key: string; completed: boolean })[];
  hideFainted: boolean;
  onFaintFinished: (key: string) => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const impactKey = useRef('');
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  const visual = event ? MOVE_VISUALS[event.moveId]! : null;
  useEffect(() => {
    progress.setValue(0);
    if (!event || !visual || !playing) return;
    const duration = reduced ? 240 : visual.duration;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const hitTimer = setTimeout(() => {
      onImpact(eventKey);
      if (event.outcome === 'hit' && MOVES[event.moveId]!.power && impactKey.current !== eventKey) {
        impactKey.current = eventKey;
        haptic(event.critical ? 'success' : 'impact');
      }
    }, duration * 0.62);
    animation.start(({ finished }) => {
      if (finished) {
        onFinished(eventKey);
      }
    });
    return () => {
      clearTimeout(hitTimer);
      animation.stop();
    };
  }, [event, eventKey, visual, progress, reduced, onFinished, onImpact, playing]);
  const centers = {
    player: { x: playerAnchor.x, y: playerAnchor.y - size * 0.58 },
    enemy: { x: enemyAnchor.x, y: enemyAnchor.y - size * 0.47 },
  };
  const source = centers[event?.side ?? 'player'];
  const otherSide = event?.side === 'player' ? 'enemy' : 'player';
  const self =
    event && !MOVES[event.moveId]!.power && MOVES[event.moveId]!.effect?.target === 'self';
  const target =
    visual?.motion === 'field'
      ? { x: (centers.player.x + centers.enemy.x) / 2, y: (centers.player.y + centers.enemy.y) / 2 }
      : self
        ? source
        : centers[otherSide];
  const destination = event?.outcome === 'miss' ? { x: target.x + 60, y: target.y - 55 } : target;
  const dx = destination.x - source.x,
    dy = destination.y - source.y;
  const interp = (inputRange: number[], outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
  const spriteStyle = (side: 'player' | 'enemy') => {
    if (!playing || !event || !visual || reduced) return {};
    if (side === event.side)
      return {
        transform: [
          {
            translateX: interp(
              [0, 0.13, 0.32, 0.56, 0.82, 1],
              [
                0,
                -dx * 0.02,
                visual.motion === 'lunge' ? dx * 0.24 : 0,
                visual.motion === 'lunge' ? dx * 0.24 : 0,
                0,
                0,
              ],
            ),
          },
          {
            translateY: interp(
              [0, 0.13, 0.32, 0.56, 0.82, 1],
              [
                0,
                3,
                visual.motion === 'lunge' ? dy * 0.24 - 9 : -9,
                visual.motion === 'lunge' ? dy * 0.24 : 0,
                0,
                0,
              ],
            ),
          },
          { scale: interp([0, 0.2, 0.56, 1], [1, 1.05, 1.05, 1]) },
        ],
      };
    if (event.outcome !== 'hit' || !MOVES[event.moveId]!.power) return {};
    return {
      opacity: interp([0, 0.58, 0.62, 0.67, 0.72, 0.8, 1], [1, 1, 0.28, 1, 0.4, 1, 1]),
      transform: [
        {
          translateX: interp([0, 0.58, 0.62, 0.66, 0.7, 0.74, 0.82, 1], [0, 0, -8, 8, -5, 5, 0, 0]),
        },
      ],
    };
  };
  const radius = Math.max(72, size * (visual?.signature ? 0.84 : 0.65));
  const feedback = playing ? event : feedbackEvent;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!capture &&
        !captured &&
        !faints.some((visual) => visual.side === 'enemy') &&
        (!hideFainted || scene.enemy.hp > 0) &&
        !switches.some((visual) => visual.side === 'enemy') && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: enemyAnchor.x - size / 2,
                top: enemyAnchor.y - size * 0.92,
              },
              spriteStyle('enemy'),
            ]}
          >
            <CreatureSprite
              speciesId={scene.enemy.speciesId}
              size={size}
              animate={!ended && !playing}
            />
          </Animated.View>
        )}
      {!faints.some((visual) => visual.side === 'player') &&
        (!hideFainted || scene.player.hp > 0) &&
        !switches.some((visual) => visual.side === 'player') && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: playerAnchor.x - size * 0.6,
                top: playerAnchor.y - size * 1.1,
              },
              spriteStyle('player'),
            ]}
          >
            <CreatureSprite
              speciesId={scene.player.speciesId}
              size={size * 1.2}
              view="back"
              animate={!ended && !playing}
            />
          </Animated.View>
        )}
      {switches.map((visual) => {
        const key = `${eventKey}:${visual.side}`;
        return (
          <BattleSwitchIllustration
            key={key}
            visual={visual}
            anchor={visual.side === 'player' ? playerAnchor : enemyAnchor}
            size={size}
            eventKey={key}
            paused={switchesPaused}
            completed={completedSwitches.includes(key)}
            reduced={reduced}
            ended={ended}
            onFinished={onSwitchFinished}
          />
        );
      })}
      {capture && (
        <BattleCaptureIllustration
          key={captureKey}
          event={capture}
          playerAnchor={playerAnchor}
          enemyAnchor={enemyAnchor}
          size={size}
          eventKey={eventKey}
          paused={switchesPaused}
          completed={captureCompleted}
          reduced={reduced}
          onFinished={onFinished}
        />
      )}
      {faints.map((visual) => (
        <BattleFaintIllustration
          key={visual.key}
          visual={visual}
          anchor={visual.side === 'player' ? playerAnchor : enemyAnchor}
          size={size}
          paused={switchesPaused}
          completed={visual.completed}
          onFinished={() => onFaintFinished(visual.key)}
        />
      ))}
      {playing && visual && event && (
        <View
          testID="battle-skill-effect"
          accessibilityLabel={`${MOVES[event.moveId]!.name} · ${event.outcome === 'miss' ? '未命中' : event.outcome === 'immune' ? '免疫' : '技能特效'}`}
          style={StyleSheet.absoluteFill}
        >
          {visual.signature && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#090d2d',
                  opacity: interp([0, 0.12, 0.45, 0.8, 1], [0, 0.4, 0.4, 0.1, 0]),
                },
              ]}
            />
          )}
          <Animated.View
            style={{
              position: 'absolute',
              left: source.x - radius,
              top: source.y - radius,
              width: radius * 2,
              height: radius * 2,
              opacity: interp([0, 0.08, 0.28, 0.55, 1], [0, 0.65, 0.7, 0, 0]),
              transform: [{ scale: reduced ? 1 : interp([0, 0.3, 0.6, 1], [0.5, 1, 1.5, 1.5]) }],
            }}
          >
            <Svg width="100%" height="100%" viewBox="0 0 200 200">
              <Circle cx={100} cy={100} r={78} fill={visual.color} opacity={0.15} />
              <Circle cx={100} cy={100} r={74} stroke={visual.glow} strokeWidth={4} fill="none" />
            </Svg>
          </Animated.View>
          <Animated.View
            testID="battle-skill-projectile"
            style={{
              position: 'absolute',
              left: (reduced ? target.x : source.x) - radius,
              top: (reduced ? target.y : source.y) - radius,
              width: radius * 2,
              height: radius * 2,
              opacity: interp([0, 0.16, 0.27, 0.62, 0.8, 1], [0, 0, 1, 1, 0, 0]),
              transform: reduced
                ? []
                : [
                    { translateX: interp([0, 0.22, 0.62, 1], [0, 0, dx, dx]) },
                    { translateY: interp([0, 0.22, 0.62, 1], [0, 0, dy, dy]) },
                    {
                      scale: interp([0, 0.22, 0.6, 1], [0.45, 0.6, visual.signature ? 1.3 : 1, 1]),
                    },
                    {
                      rotate: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange:
                          visual.motion === 'self' ? ['-20deg', '30deg'] : ['0deg', '0deg'],
                      }),
                    },
                  ],
            }}
          >
            <Glyph {...visual} />
          </Animated.View>
          {event.outcome === 'hit' && (
            <Animated.View
              style={{
                position: 'absolute',
                left: target.x - radius * 1.3,
                top: target.y - radius * 1.3,
                width: radius * 2.6,
                height: radius * 2.6,
                opacity: interp([0, 0.56, 0.65, 0.86, 1], [0, 0, 1, 0.7, 0]),
                transform: [{ scale: reduced ? 1 : interp([0, 0.56, 0.7, 1], [0.3, 0.3, 1, 1.5]) }],
              }}
            >
              <Burst visual={visual} critical={event.critical} />
            </Animated.View>
          )}
          <Animated.View
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: '23%',
              paddingHorizontal: 22,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: visual.color,
              backgroundColor: `${palette.panel}f5`,
              opacity: interp([0, 0.08, 0.75, 1], [0, 1, 1, 0]),
              transform: [{ translateY: reduced ? 0 : interp([0, 0.15, 1], [-8, 0, 0]) }],
            }}
          >
            <Text
              style={{
                color: palette.ink,
                fontWeight: '800',
                fontSize: visual.signature ? 20 : 15,
                letterSpacing: 2,
              }}
            >
              {visual.signature ? '✦ ' : ''}
              {MOVES[event.moveId]!.name}
              {visual.signature ? ' · 专属' : ''}
            </Text>
          </Animated.View>
        </View>
      )}
      {feedback &&
        moveFeedback(feedback).map((entry) => (
          <Animated.View
            key={`${eventKey}:${entry.side}:${entry.kind}`}
            testID={`battle-feedback-${entry.side}-${entry.kind}`}
            style={{
              position: 'absolute',
              left: centers[entry.side].x - 100,
              top: centers[entry.side].y - size * 0.15,
              width: 200,
              alignItems: 'center',
              opacity: playing ? interp([0, 0.6, 0.68, 1], [0, 0, 1, 1]) : 1,
              transform: [
                { translateY: reduced ? 0 : playing ? interp([0, 0.6, 1], [0, 0, -24]) : -24 },
              ],
            }}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color:
                  entry.kind === 'heal'
                    ? '#b4ffb0'
                    : entry.kind === 'damage' && feedback.critical
                      ? '#ffe17c'
                      : entry.kind === 'damage' || entry.kind === 'recoil'
                        ? '#fff0db'
                        : '#e2e9ed',
                fontSize: entry.kind === 'damage' ? 27 : 21,
                fontWeight: '900',
                textShadowColor: '#10241f',
                textShadowOffset: { width: 1, height: 2 },
                textShadowRadius: 4,
                backgroundColor: `${palette.ink}ed`,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              {entry.label}
            </Text>
          </Animated.View>
        ))}
    </View>
  );
}
