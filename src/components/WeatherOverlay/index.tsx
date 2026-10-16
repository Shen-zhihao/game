import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { WeatherId } from '../../game/model';
import { isRain, weatherParticles, weatherTimings } from '../../game/weatherVisuals';
import { useAmbientMotion } from '../../hooks/useAmbientMotion';

interface WeatherProps {
  weather: WeatherId;
  width: number;
  height: number;
  paused?: boolean;
  night?: Animated.Value;
}
const COLORS: Record<WeatherId, [string, number]> = {
  clear: ['#fffcf5', 0],
  sun: ['#f3d390', 0.055],
  rain: ['#809ba5', 0.065],
  storm: ['#435566', 0.16],
  snow: ['#dbe8e5', 0.06],
  fog: ['#edf0e5', 0.1],
  sand: ['#c9aa77', 0.09],
};

/** Weather blends over the illustration; old and new conditions crossfade without a scene cut. */
export const WeatherOverlay = memo(function WeatherOverlay(props: WeatherProps) {
  const [layers, setLayers] = useState<WeatherId[]>([props.weather]);
  const remove = useCallback(
    (weather: WeatherId) =>
      setLayers((current) =>
        current.length > 1 ? current.filter((entry) => entry !== weather) : current,
      ),
    [],
  );
  if (layers[layers.length - 1] !== props.weather)
    setLayers([layers[layers.length - 1]!, props.weather]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {layers
        .filter((weather) => weather !== 'clear')
        .map((weather) => (
          <WeatherLayer
            key={weather}
            {...props}
            weather={weather}
            visible={weather === props.weather}
            entering={layers.length > 1}
            onExited={remove}
          />
        ))}
    </View>
  );
});

const WeatherLayer = memo(function WeatherLayer({
  weather,
  width,
  height,
  paused = false,
  night,
  visible,
  entering,
  onExited,
}: WeatherProps & { visible: boolean; entering: boolean; onExited: (weather: WeatherId) => void }) {
  const [presence] = useState(() => new Animated.Value(visible && !entering ? 1 : 0));
  const timings = useMemo(() => weatherTimings(weather), [weather]);
  const { clocks, reduced } = useAmbientMotion(timings, paused || !visible);
  const particles = useMemo(
    () => weatherParticles(weather, width, height),
    [weather, width, height],
  );
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    const fade = Animated.timing(presence, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 1 : 1400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
      isInteraction: false,
    });
    fade.start(({ finished }) => {
      if (finished && !visible) onExited(weather);
    });
    return () => fade.stop();
  }, [onExited, presence, reduced, visible, weather]);
  const [color, opacity] = COLORS[weather];
  const visibleOpacity =
    weather === 'sun' && night
      ? Animated.multiply(presence, Animated.subtract(1, night))
      : presence;
  return (
    <Animated.View
      testID={`weather-effect-${weather}`}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: visibleOpacity }]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]} />
      {!reduced &&
        particles.map((particle) => {
          const phase = Animated.modulo(Animated.add(clocks[particle.clock]!, particle.phase), 1);
          const rain = isRain(weather),
            snow = weather === 'snow';
          return (
            <Animated.View
              key={particle.id}
              testID={`weather-particle-${weather}-${particle.id}`}
              style={{
                position: 'absolute',
                left: weather === 'sand' ? -50 : particle.x,
                top: weather === 'sand' ? particle.y : -50,
                width: particle.size,
                height: particle.length,
                borderRadius: rain ? 1 : particle.size,
                backgroundColor: weather === 'sand' ? '#e5cda0' : '#fffdf1',
                opacity: phase.interpolate({
                  inputRange: [0, 0.07, 0.9, 1],
                  outputRange: [0, particle.opacity, particle.opacity, 0],
                }),
                transform: [
                  {
                    translateY:
                      weather === 'sand'
                        ? phase.interpolate({
                            inputRange: [0, 0.25, 0.5, 0.75, 1],
                            outputRange: [0, particle.drift, 0, -particle.drift, 0],
                          })
                        : phase.interpolate({ inputRange: [0, 1], outputRange: [0, height + 100] }),
                  },
                  {
                    translateX:
                      weather === 'sand'
                        ? phase.interpolate({ inputRange: [0, 1], outputRange: [0, width + 100] })
                        : snow
                          ? phase.interpolate({
                              inputRange: [0, 0.25, 0.5, 0.75, 1],
                              outputRange: [0, particle.drift, 8, -particle.drift, 0],
                            })
                          : phase.interpolate({
                              inputRange: [0, 1],
                              outputRange: [particle.drift / 2, -particle.drift / 2],
                            }),
                  },
                  { rotate: rain ? (weather === 'storm' ? '14deg' : '7deg') : '0deg' },
                ],
              }}
            />
          );
        })}
      {(weather === 'fog' || weather === 'sand') &&
        [0, 1, 2].map((layer) => (
          <Animated.View
            key={layer}
            style={{
              position: 'absolute',
              left: -width * 0.35,
              top: height * (-0.1 + layer * 0.27),
              width: width * 1.7,
              height: height * 0.8,
              opacity: clocks[layer]!.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: weather === 'fog' ? [0.32, 0.52, 0.32] : [0.07, 0.16, 0.07],
              }),
              transform: [
                {
                  translateX: clocks[layer]!.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [-width * 0.1, width * 0.1, -width * 0.1],
                  }),
                },
              ],
            }}
          >
            <Svg width="100%" height="100%" viewBox="0 0 1000 500">
              <Defs>
                <RadialGradient id={`${id}-mist-${layer}`} cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop
                    offset="0"
                    stopColor={weather === 'fog' ? '#f7f6e9' : '#d9bd8b'}
                    stopOpacity={0.55}
                  />
                  <Stop
                    offset="55%"
                    stopColor={weather === 'fog' ? '#eef0e5' : '#d9bd8b'}
                    stopOpacity={0.24}
                  />
                  <Stop offset="100%" stopColor="#f2eedc" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={500} cy={250} rx={500} ry={250} fill={`url(#${id}-mist-${layer})`} />
            </Svg>
          </Animated.View>
        ))}
      {weather === 'sun' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: clocks[0]!.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.55, 0.85, 0.55],
              }),
            },
          ]}
        >
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id={`${id}-sun`} x1="100%" y1="0" x2="0" y2="100%">
                <Stop offset="0" stopColor="#fff1c8" stopOpacity={0.2} />
                <Stop offset="80%" stopColor="#fff2d0" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="100%">
                <Stop offset="0" stopColor="#fff8df" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#fff7dc" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={height} fill={`url(#${id}-sun)`} />
            <Path
              d={`M${width * 0.6} 0h${width * 0.22}L${width * 0.33} ${height}H${width * 0.05}Z M${width * 0.9} 0h${width * 0.08}L${width * 0.56} ${height}H${width * 0.45}Z`}
              fill={`url(#${id}-beam)`}
            />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
});
