import { useId } from 'react';
import type { ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, Image, Path } from 'react-native-svg';
import type { SpriteFrame } from '../../content/spriteFrames';

/** Crop a transparent atlas by ownership when a neighbour extends inside its bounding box. */
export function AtlasFrameImage({
  frame,
  source,
  width,
  height,
  unknown = false,
}: {
  frame: SpriteFrame;
  source: ImageSourcePropType;
  width: number;
  height: number;
  unknown?: boolean;
}) {
  const id = `atlas-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const image = (
    <Image
      href={source}
      x={0}
      y={0}
      width={frame.atlasWidth}
      height={frame.atlasHeight}
      preserveAspectRatio="none"
      clipPath={`url(#${id})`}
    />
  );
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <Defs>
        <ClipPath id={id}>
          <Path d={frame.clipPath} />
        </ClipPath>
      </Defs>
      {unknown ? <Path d={frame.clipPath} fill="#263e42" opacity={0.65} /> : image}
    </Svg>
  );
}
