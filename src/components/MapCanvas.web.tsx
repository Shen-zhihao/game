import React from 'react';
import { Image, View } from 'react-native';
import { GameState } from '../game/model';
import { MAP_IMAGES } from './sceneAssets';

export function MapCanvas({
  state,
  width,
  height,
}: {
  state: GameState;
  width: number;
  height: number;
}) {
  return (
    <View style={{ width, height }}>
      <Image source={MAP_IMAGES[state.player.map]} resizeMode="stretch" style={{ width, height }} />
    </View>
  );
}
