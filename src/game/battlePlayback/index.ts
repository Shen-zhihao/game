export interface PlaybackStep {
  key: string;
  delayMs: number;
  ready: boolean;
  paused: boolean;
  onAdvance: () => void;
}
/** Presentation-only clock. Never sends a gameplay command or resolves a turn. */
export function createBattlePlaybackClock() {
  let current: (PlaybackStep & { remaining: number }) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startedAt = 0;
  let generation = 0;
  let completedKey: string | null = null;
  const stop = () => {
    generation++;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      if (current) current.remaining = Math.max(0, current.remaining - (Date.now() - startedAt));
    }
  };
  const advance = () => {
    if (!current?.ready) return;
    const step = current;
    stop();
    current = null;
    completedKey = step.key;
    step.onAdvance();
  };
  return {
    update(step: PlaybackStep | null) {
      stop();
      if (!step || step.key === completedKey) {
        current = null;
        return;
      }
      current = {
        ...step,
        remaining:
          current?.key === step.key && current.delayMs === step.delayMs
            ? current.remaining
            : step.delayMs,
      };
      if (current.paused || (current.remaining === 0 && !current.ready)) return;
      const token = generation;
      startedAt = Date.now();
      timer = setTimeout(() => {
        if (token !== generation || !current) return;
        timer = null;
        current.remaining = 0;
        if (current.ready) advance();
      }, current.remaining);
    },
    skip: advance,
    dispose() {
      stop();
      current = null;
    },
  };
}
