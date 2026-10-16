import { Animated, Image, View } from 'react-native';
import { MAPS, mapSize } from '../../content/world';
import type { MapId } from '../../game/model';
import { MAP_IMAGES } from '../sceneAssets';
import type { DoorPresentation } from '../../useBuildingPassage';

/** Animate the original door pixels within their authored opening; idle painted doors need no overlay. */
export function BuildingDoors({
  map,
  scale,
  passage,
  night,
}: {
  map: MapId;
  scale: number;
  passage?: DoorPresentation | null;
  night?: Animated.Value;
}) {
  return (
    <>
      {MAPS[map].entrances?.map((entrance) => {
        const active =
          passage && passage.entrance.x === entrance.x && passage.entrance.y === entrance.y;
        const frame = entrance.doorway;
        const source = frame.raster ? MAP_IMAGES[map] : undefined;
        const world = mapSize(map);
        // A painted building already contains its closed door and trim.
        if (source && !active) return null;
        const half = frame.width / 2;
        const kind = MAPS[entrance.map].interior?.kind;
        const glass = kind === 'center';
        const id = `building-door-${map}-${entrance.x}-${entrance.y}`;
        return (
          <View
            key={id}
            testID={id}
            pointerEvents="none"
            accessibilityLabel={`${entrance.name}的门`}
            style={{
              position: 'absolute',
              left: frame.x * scale,
              top: frame.y * scale,
              width: frame.width * scale,
              height: frame.height * scale,
              overflow: 'hidden',
              backgroundColor: '#102721',
              zIndex: entrance.y * 10,
            }}
          >
            {[0, 1].map((side) => (
              <Animated.View
                key={side}
                testID={`${id}-${side === 0 ? 'left' : 'right'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: side * half * scale,
                  width: half * scale,
                  backgroundColor: glass ? '#598e95' : side ? '#896343' : '#9c7450',
                  overflow: 'hidden',
                  borderWidth: source ? 0 : scale,
                  borderColor: glass ? '#c3ded6' : '#513f2d',
                  transform: [
                    {
                      translateX: active
                        ? passage.open.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, (side ? 1 : -1) * half * scale],
                          })
                        : 0,
                    },
                  ],
                }}
              >
                {source ? (
                  <Image
                    source={source}
                    resizeMode="stretch"
                    style={{
                      position: 'absolute',
                      width: world.width * scale,
                      height: world.height * scale,
                      left: -(frame.x + side * half) * scale,
                      top: -frame.y * scale,
                    }}
                  />
                ) : (
                  <>
                    <View
                      style={{
                        position: 'absolute',
                        left: scale,
                        right: scale,
                        top: 2 * scale,
                        height: 9 * scale,
                        backgroundColor: glass ? '#a2ced1' : '#c09966',
                        borderWidth: scale * 0.5,
                        borderColor: '#e4d19a',
                      }}
                    />
                    {night && (
                      <Animated.View
                        testID={`${id}-window-light-${side}`}
                        style={{
                          position: 'absolute',
                          left: scale,
                          right: scale,
                          top: 2 * scale,
                          height: 9 * scale,
                          borderWidth: scale * 0.5,
                          borderColor: '#fff0c2',
                          backgroundColor: '#ffda83',
                          opacity: night,
                        }}
                      />
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        left: (side ? 1 : 4) * scale,
                        top: 14 * scale,
                        width: 2 * scale,
                        height: 2 * scale,
                        borderRadius: scale,
                        backgroundColor: '#ffe8a5',
                      }}
                    />
                  </>
                )}
              </Animated.View>
            ))}
          </View>
        );
      })}
    </>
  );
}
