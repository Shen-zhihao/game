import React from 'react';
import { Animated, View } from 'react-native';
import { MAPS } from '../../content/world';
import type { MapId } from '../../game/model';
import type { DoorPresentation } from '../../useBuildingPassage';

/** Door leaves slide within the doorway drawn by TileMap, including raster-backed maps. */
export function BuildingDoors({
  map,
  scale,
  passage,
}: {
  map: MapId;
  scale: number;
  passage?: DoorPresentation | null;
}) {
  return (
    <>
      {MAPS[map].entrances?.map((entrance) => {
        const active =
          passage && passage.entrance.x === entrance.x && passage.entrance.y === entrance.y;
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
              left: (entrance.x * 32 + 7) * scale,
              top: (entrance.y * 32 + 6) * scale,
              width: 18 * scale,
              height: 25 * scale,
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
                  left: side * 9 * scale,
                  width: 9 * scale,
                  backgroundColor: glass ? '#598e95' : side ? '#896343' : '#9c7450',
                  borderWidth: scale,
                  borderColor: glass ? '#c3ded6' : '#513f2d',
                  transform: [
                    {
                      translateX: active
                        ? passage.open.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, (side ? 1 : -1) * 9 * scale],
                          })
                        : 0,
                    },
                  ],
                }}
              >
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
              </Animated.View>
            ))}
          </View>
        );
      })}
    </>
  );
}
