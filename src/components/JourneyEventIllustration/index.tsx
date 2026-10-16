import { useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { sceneInk as ink } from '../../content/sceneArt';
import { SPECIES } from '../../content/catalog';
import {
  JourneyEvent,
  journeyEventDuration,
  journeyEventTitle,
  evolutionResultName,
} from '../../game/presentation';
import { creatureName } from '../../game/rules';
import { usePresentationMotion } from '../../hooks/usePresentationMotion';
import { haptic } from '../../platform/haptics';
import { Button } from '../ui';
import { CreatureSprite } from '../CreatureSprite';
import { ItemIcon } from '../ItemIcon';
import { FieldObject, HealingMachine, JourneyBadge, PaperHalo } from '../IllustrationEffects';

export function JourneyEventIllustration({
  event,
  paused,
  onFinish,
}: {
  event: JourneyEvent;
  paused: boolean;
  onFinish: (cancel?: boolean) => void;
}) {
  const { height, width } = useWindowDimensions();
  const compact = height < 500;
  const [held, setHeld] = useState(false);
  const { progress, reduced, active } = usePresentationMotion(
    journeyEventDuration(event),
    paused || held,
    () => {
      haptic('success');
      onFinish();
    },
  );
  const value = (inputRange: number[], outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
  const size = Math.min(compact ? 156 : 220, height * 0.37);
  const title = journeyEventTitle(event);
  useEffect(() => {
    const back = () => {
      if (active && !paused) onFinish(event.kind === 'evolution');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        back();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', key);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', key);
    };
  }, [active, event.kind, onFinish, paused]);
  const heading =
    event.kind === 'reward'
      ? event.champion
        ? '冠军名录'
        : '旅程的证明'
      : event.kind === 'evolution'
        ? '共同成长的时刻'
        : event.kind === 'healing'
          ? '精灵中心'
          : '伙伴的力量';
  return (
    <View
      testID={`journey-${event.kind}`}
      accessibilityViewIsModal
      role="dialog"
      aria-modal
      accessibilityLabel={title}
      style={s.screen}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <Path d="M0 0h340L120 500H0Zm850 0h150v500H630Z" fill="#f4d28a" />
          <Circle cx={500} cy={250} r={220} fill={ink.paper} fillOpacity={0.6} />
          <Circle
            cx={500}
            cy={250}
            r={240}
            fill="none"
            stroke={ink.gold}
            strokeWidth={2}
            strokeDasharray="3 12"
          />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: compact ? 4 : 8, paddingTop: compact ? 14 : 28 }}>
        <Text style={s.eyebrow}>{heading}</Text>
        <Text accessibilityLiveRegion="polite" style={[s.title, { fontSize: compact ? 23 : 30 }]}>
          {title}
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            opacity: value([0, 0.15, 0.8, 1], [0, 0.8, 0.8, 0.3]),
            transform: reduced ? [] : [{ scale: value([0, 1], [0.7, 1.1]) }],
          }}
        >
          <PaperHalo size={size * 1.5} />
        </Animated.View>
        {event.kind === 'evolution' ? (
          <View testID="evolution-forms" style={{ width: size, height: size }}>
            <Animated.View
              testID="evolution-before"
              style={{
                position: 'absolute',
                opacity: value(
                  [0, 0.12, 0.35, 0.43, 0.52, 0.58, 0.64, 1],
                  [1, 1, 0.3, 1, 0.2, 0.8, 0, 0],
                ),
                transform: reduced
                  ? []
                  : [{ scale: value([0, 0.2, 0.56, 0.7, 1], [1, 1.05, 0.86, 0.3, 0.3]) }],
              }}
            >
              <CreatureSprite speciesId={event.from.speciesId} size={size} />
            </Animated.View>
            <Animated.View
              testID="evolution-after"
              style={{
                position: 'absolute',
                opacity: value([0, 0.56, 0.72, 1], [0, 0, 1, 1]),
                transform: reduced
                  ? []
                  : [{ scale: value([0, 0.56, 0.76, 0.86, 1], [0.3, 0.3, 1.12, 0.98, 1]) }],
              }}
            >
              <CreatureSprite speciesId={event.toId} size={size} />
            </Animated.View>
            {!reduced && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: value([0, 0.25, 0.55, 0.64, 0.76, 1], [0, 0.35, 0.7, 1, 0, 0]),
                    borderRadius: size,
                    backgroundColor: ink.paper,
                  },
                ]}
              />
            )}
          </View>
        ) : event.kind === 'healing' ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: compact ? 8 : 14 }}>
              {event.party.map((c, i) => (
                <Animated.View
                  key={c.id}
                  testID={`healing-ball-${i}`}
                  style={{
                    opacity: value([0, 0.1 + i * 0.07, 0.17 + i * 0.07, 1], [0.25, 0.25, 1, 1]),
                    transform: reduced
                      ? []
                      : [
                          {
                            translateY: value(
                              [0, 0.1 + i * 0.07, 0.17 + i * 0.07, 0.25 + i * 0.07, 1],
                              [0, 0, -9, 0, 0],
                            ),
                          },
                        ],
                  }}
                >
                  <ItemIcon itemId="ball" size={compact ? 32 : 42} />
                </Animated.View>
              ))}
            </View>
            <Animated.View
              style={{ opacity: value([0, 0.15, 0.6, 0.7, 0.8, 1], [0.65, 1, 0.7, 1, 0.8, 1]) }}
            >
              <HealingMachine size={size * 1.45} />
            </Animated.View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {event.party.map((c) => (
                <CreatureSprite key={c.id} speciesId={c.speciesId} size={Math.min(44, size / 3)} />
              ))}
            </View>
          </View>
        ) : event.kind === 'reward' ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Animated.View
              testID="journey-badge"
              style={{
                opacity: value([0, 0.2, 1], [0, 1, 1]),
                transform: reduced
                  ? []
                  : [
                      { translateY: value([0, 0.3, 0.5, 1], [35, -6, 0, 0]) },
                      { scale: value([0, 0.32, 0.52, 1], [0.3, 1.1, 1, 1]) },
                    ],
              }}
            >
              <JourneyBadge size={size * 0.93} champion={event.champion} />
            </Animated.View>
            {event.champion && (
              <View
                testID="champion-team"
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  maxWidth: width * 0.8,
                }}
              >
                {event.party.map((c) => (
                  <View key={c.id} style={{ alignItems: 'center' }}>
                    <CreatureSprite speciesId={c.speciesId} size={compact ? 44 : 64} />
                    <Text style={s.small}>{creatureName(c)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {event.partner && (
              <Animated.View
                style={{
                  opacity: value([0, 0.14, 1], [0, 1, 1]),
                  transform: reduced
                    ? []
                    : [{ translateX: value([0, 0.2, 0.42, 0.55, 1], [-30, 0, 15, 0, 0]) }],
                }}
              >
                <CreatureSprite speciesId={event.partner.speciesId} size={size} flip />
              </Animated.View>
            )}
            <View style={{ width: size * 0.8, height: size }}>
              <Animated.View
                testID="field-object"
                style={{
                  position: 'absolute',
                  top: size * 0.15,
                  opacity: value(
                    [0, 0.47, 0.74, 1],
                    [
                      1,
                      1,
                      event.effect === 'surfEnter' || event.effect === 'surfExit' ? 1 : 0,
                      event.effect === 'surfEnter' ? 1 : 0,
                    ],
                  ),
                  transform: reduced
                    ? []
                    : [
                        {
                          translateY: value(
                            [0, 0.5, 1],
                            [0, 0, event.effect === 'gate' ? -size : 15],
                          ),
                        },
                        {
                          rotate: progress.interpolate({
                            inputRange: [0, 0.5, 0.8, 1],
                            outputRange: [
                              '0deg',
                              '0deg',
                              event.effect === 'log' ? '100deg' : '0deg',
                              event.effect === 'log' ? '100deg' : '0deg',
                            ],
                          }),
                        },
                      ],
                }}
              >
                <FieldObject effect={event.effect} size={size * 0.8} />
              </Animated.View>
              {!reduced &&
                ['rock', 'log', 'cut'].includes(event.effect) &&
                [-1, 1, -0.5, 0.5].map((direction, i) => (
                  <Animated.View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: size * 0.3,
                      top: size * 0.45,
                      width: 12,
                      height: 9,
                      borderRadius: 3,
                      backgroundColor: event.effect === 'rock' ? '#b6a68c' : '#bd9967',
                      opacity: value([0, 0.48, 0.53, 0.9, 1], [0, 0, 1, 0, 0]),
                      transform: [
                        { translateX: value([0, 0.5, 1], [0, 0, direction * size * 0.7]) },
                        { translateY: value([0, 0.5, 0.7, 1], [0, 0, -35 - i * 7, 22]) },
                        { rotate: `${i * 35}deg` },
                      ],
                    }}
                  />
                ))}
            </View>
          </View>
        )}
      </View>
      <View
        style={{
          alignItems: 'center',
          gap: compact ? 8 : 12,
          paddingBottom: compact ? 14 : 28,
          paddingHorizontal: 22,
        }}
      >
        <Text
          testID="journey-event-description"
          style={[s.description, { fontSize: compact ? 13 : 16 }]}
        >
          {event.kind === 'evolution'
            ? `与${SPECIES[event.from.speciesId]!.name}一起，迎接${evolutionResultName(event)}。`
            : event.kind === 'healing'
              ? '伙伴们的 HP、PP 和异常状态正在恢复。'
              : event.description}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button small disabled={paused} onPress={() => setHeld(!held)}>
            {held ? '继续播放' : '暂停'}
          </Button>
          {event.kind === 'evolution' && (
            <Button
              small
              testID="cancel-evolution-animation"
              disabled={paused}
              onPress={() => onFinish(true)}
            >
              暂缓进化
            </Button>
          )}
          <Button
            small
            accent
            testID="skip-journey-animation"
            disabled={paused}
            onPress={() => onFinish()}
          >
            {event.kind === 'evolution' ? '完成进化' : '继续冒险'}
          </Button>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3000,
    backgroundColor: ink.cream,
  },
  eyebrow: { color: '#96723e', fontSize: 11, letterSpacing: 3, fontWeight: '700' },
  title: { color: ink.outline, fontWeight: '900', textAlign: 'center' },
  description: { color: ink.outline, textAlign: 'center', lineHeight: 22 },
  small: { color: ink.outline, fontSize: 10 },
});
