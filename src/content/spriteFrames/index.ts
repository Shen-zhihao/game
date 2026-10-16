import regions from '../../../docs/data/sprite-frames.json';

export interface SpriteReference {
  atlas: string;
  cell: number;
}
export interface SpriteFrame {
  atlasWidth: number;
  atlasHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
const atlases = regions as Record<
  string,
  { width: number; height: number; frames: Record<string, number[]> }
>;
export function spriteFrame(sprite: SpriteReference): SpriteFrame {
  const atlas = atlases[sprite.atlas];
  const frame = atlas?.frames[String(sprite.cell)];
  if (!atlas || !frame || frame.length !== 4)
    throw new Error(`Missing sprite region: ${sprite.atlas}/${sprite.cell}`);
  return {
    atlasWidth: atlas.width,
    atlasHeight: atlas.height,
    x: frame[0]!,
    y: frame[1]!,
    width: frame[2]!,
    height: frame[3]!,
  };
}
export function spriteLayout(sprite: SpriteReference, size: number) {
  const frame = spriteFrame(sprite);
  const scale = (size * 0.86) / Math.max(frame.width, frame.height);
  return {
    crop: {
      left: (size - frame.width * scale) / 2,
      top: size * 0.93 - frame.height * scale,
      width: frame.width * scale,
      height: frame.height * scale,
    },
    image: {
      left: -frame.x * scale,
      top: -frame.y * scale,
      width: frame.atlasWidth * scale,
      height: frame.atlasHeight * scale,
    },
  };
}
