import { useEffect } from 'react';

/** Let loaded scene content commit and paint before its covering curtain is lifted. */
export function useSceneReady(ready: boolean, onReady?: () => void) {
  useEffect(() => {
    if (!ready || !onReady) return;
    let paintedFrame: number | undefined;
    const committedFrame = requestAnimationFrame(() => {
      paintedFrame = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(committedFrame);
      if (paintedFrame !== undefined) cancelAnimationFrame(paintedFrame);
    };
  }, [ready, onReady]);
}
