import { Asset } from 'expo-asset';
import type { SceneSpriteSources } from '../../content/sceneIllustrations/sprites';

const modules = {
  reactor: require('../../../assets/scene-props/reactor.png'),
  generator: require('../../../assets/scene-props/generator.png'),
  kiln: require('../../../assets/scene-props/kiln.png'),
  shelves: require('../../../assets/scene-props/shelves.png'),
  observatory: require('../../../assets/scene-props/observatory.png'),
  greenhouse: require('../../../assets/scene-props/greenhouse.png'),
  cloister: require('../../../assets/scene-props/cloister.png'),
  rocks: require('../../../assets/scene-props/rocks.png'),
  grove: require('../../../assets/scene-props/grove.png'),
};
/** The fallback illustration uses the same packaged props as the flattened map. */
export const SCENE_SPRITE_SOURCES = Object.fromEntries(
  Object.entries(modules).map(([kind, source]) => [kind, Asset.fromModule(source).uri]),
) as SceneSpriteSources;
