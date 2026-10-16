import { useState } from 'react';
import { Animated, Text } from 'react-native';
import { sceneInk } from '../../content/sceneArt';
import { MAPS } from '../../content/world';
import type { MapId } from '../../game/model';
import { usePresentationMotion } from '../../hooks/usePresentationMotion';

export function MapArrivalIllustration({ map, paused }: { map: MapId; paused: boolean }) {
  const [finished, setFinished] = useState(false);
  const { progress, reduced } = usePresentationMotion(1900, paused, () => setFinished(true));
  if (finished) return null;
  return (
    <Animated.View
      testID="map-arrival-name"
      pointerEvents="none"
      accessibilityLabel={`到达${MAPS[map].name}`}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: 18,
        alignSelf: 'center',
        maxWidth: '40%',
        paddingHorizontal: 24,
        paddingVertical: 9,
        backgroundColor: sceneInk.paper,
        borderColor: '#d7bb87',
        borderWidth: 1,
        borderRadius: 14,
        opacity: progress.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: reduced
          ? []
          : [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [-12, 0, 0, -6],
                }),
              },
            ],
      }}
    >
      <Text
        style={{ color: sceneInk.outline, fontSize: 17, fontWeight: '800', textAlign: 'center' }}
      >
        {MAPS[map].name}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: '#927d60', fontSize: 10, textAlign: 'center', marginTop: 2 }}
      >
        {MAPS[map].subtitle}
      </Text>
    </Animated.View>
  );
}
