/** Sources are supplied by the raster generator or the native asset resolver. */
export const SCENE_SPRITE_FILES = {
  reactor: 'assets/scene-props/reactor.png',
  generator: 'assets/scene-props/generator.png',
  kiln: 'assets/scene-props/kiln.png',
  shelves: 'assets/scene-props/shelves.png',
  observatory: 'assets/scene-props/observatory.png',
  greenhouse: 'assets/scene-props/greenhouse.png',
  cloister: 'assets/scene-props/cloister.png',
  rocks: 'assets/scene-props/rocks.png',
  grove: 'assets/scene-props/grove.png',
} as const;
export type SceneSpriteKind = keyof typeof SCENE_SPRITE_FILES;
export type SceneSpriteSources = Record<SceneSpriteKind, string>;
const attribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Ignore only the transparent export padding when fitting a prop to its physical footprint.
// Original pixels, including alpha, remain untouched in the packaged PNGs.
const viewBoxes: Record<SceneSpriteKind, string> = {
  reactor: '242 55 1052 887',
  generator: '56 64 1424 861',
  kiln: '162 32 1311 906',
  shelves: '134 105 1269 736',
  observatory: '224 52 1099 912',
  greenhouse: '69 96 1385 842',
  cloister: '125 3 1291 990',
  rocks: '0 150 1536 735',
  grove: '46 56 1446 914',
};
export function sceneSprite(
  sources: SceneSpriteSources,
  kind: SceneSpriteKind,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  // The sources parameter keeps all callers explicit about the runtime/generator asset set.
  if (!sources[kind]) throw new Error(`Missing illustrated scene prop: ${kind}`);
  return `<svg data-scene-sprite="${kind}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBoxes[kind]}" preserveAspectRatio="xMidYMid meet"><use href="#scene-prop-${kind}"/></svg>`;
}
export function sceneSpriteDefinitions(sources: SceneSpriteSources, art: string) {
  const used = [
    ...new Set(
      [...art.matchAll(/data-scene-sprite="([a-z]+)"/g)].map(
        (match) => match[1] as SceneSpriteKind,
      ),
    ),
  ];
  return `<defs>${used.map((kind) => `<image id="scene-prop-${kind}" width="1536" height="1024" href="${attribute(sources[kind])}"/>`).join('')}</defs>`;
}
