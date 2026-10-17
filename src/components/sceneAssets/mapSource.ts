import { Platform, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import type { MapId } from '../../game/model';
import { MAP_IMAGES, MAP_IMAGE_REVISIONS } from './index';

/** The adventure canvas and menu previews must resolve the same current illustration. */
export function mapImageSource(map: MapId): ImageSourcePropType {
  const source = MAP_IMAGES[map];
  if (Platform.OS !== 'web') return source;
  const uri = Asset.fromModule(source).uri;
  return { uri: `${uri}${uri.includes('?') ? '&' : '?'}art=${MAP_IMAGE_REVISIONS[map]}` };
}
