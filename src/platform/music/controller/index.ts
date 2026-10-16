import type { MusicScene, MusicTrack } from '../../../content/music';

export interface MusicVoice {
  setVolume: (volume: number) => void;
  play: () => void | Promise<void>;
  pause: () => void;
  release: () => void;
}
export interface MusicDriver {
  prepare: () => Promise<void>;
  create: (track: MusicTrack, loop: boolean) => MusicVoice;
}
const DEFAULT_TIMING = { fadeOut: 140, fadeIn: 280, encounter: 720 };

/** Presentation only: never changes game state, random streams, or saves. */
export function createMusicController(
  driver: MusicDriver,
  onError: (error: unknown | null) => void = () => {},
  timing = DEFAULT_TIMING,
) {
  let scene: MusicScene | null = null;
  let volume = 0;
  let active = false;
  let disposed = false;
  let failed = false;
  let revision = 0;
  let desired: MusicTrack | null = null;
  let encounterId: string | null = null;
  let current: { key: MusicTrack; voice: MusicVoice; gain: number } | null = null;
  let fade: ReturnType<typeof setInterval> | undefined;
  let cue: ReturnType<typeof setTimeout> | undefined;

  const cancelTimers = () => {
    clearInterval(fade);
    clearTimeout(cue);
    fade = undefined;
    cue = undefined;
  };
  const report = (error: unknown) => {
    failed = true;
    onError(error);
  };
  const release = () => {
    const old = current;
    current = null;
    try {
      old?.voice.release();
    } catch {
      /* Disposed native handles are harmless. */
    }
  };
  const fadeTo = (gain: number, duration: number, done?: () => void) => {
    clearInterval(fade);
    const entry = current;
    if (!entry) {
      done?.();
      return;
    }
    const from = entry.gain;
    const start = Date.now();
    const tick = () => {
      if (current !== entry) return;
      const progress = Math.min(1, (Date.now() - start) / Math.max(1, duration));
      entry.gain = from + (gain - from) * progress;
      try {
        entry.voice.setVolume(entry.gain * volume);
      } catch (error) {
        report(error);
      }
      if (progress === 1) {
        clearInterval(fade);
        fade = undefined;
        done?.();
      }
    };
    fade = setInterval(tick, Math.min(25, duration));
    tick();
  };
  const start = (entry: NonNullable<typeof current>, token: number) => {
    try {
      // Invoke play inside the browser's input event when retrying autoplay.
      const playing = entry.voice.play();
      void Promise.resolve(playing)
        .then(() => {
          if (disposed || revision !== token || current !== entry || !active || !volume) return;
          failed = false;
          onError(null);
          fadeTo(1, entry.key === 'encounter' ? 30 : timing.fadeIn);
          if (entry.key === 'encounter') {
            clearTimeout(cue);
            cue = setTimeout(() => {
              encounterId = null;
              if (scene) switchTrack(scene.track);
            }, timing.encounter);
          }
        })
        .catch((error: unknown) => {
          if (revision === token && current === entry) report(error);
        });
    } catch (error) {
      report(error);
    }
  };
  const switchTrack = (key: MusicTrack) => {
    desired = key;
    cancelTimers();
    const token = ++revision;
    if (current?.key === key) {
      start(current, token);
      return;
    }
    const load = () => {
      release();
      void driver
        .prepare()
        .then(() => {
          if (disposed || token !== revision || !active || !volume) return;
          const voice = driver.create(key, key !== 'encounter');
          current = { key, voice, gain: 0 };
          voice.setVolume(0);
          start(current, token);
        })
        .catch((error: unknown) => {
          if (!disposed && token === revision) {
            release();
            report(error);
          }
        });
    };
    if (current) fadeTo(0, key === 'encounter' ? 40 : timing.fadeOut, load);
    else load();
  };
  return {
    update(next: MusicScene, level: number, foreground: boolean) {
      if (disposed) return;
      const previous = scene;
      const wasPlaying = active && volume > 0;
      scene = next;
      active = foreground;
      volume = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
      if (!active || volume === 0) {
        encounterId = null;
        desired = null;
        ++revision;
        cancelTimers();
        try {
          current?.voice.pause();
        } catch (error) {
          report(error);
        }
        if (current?.key === 'encounter') release();
        return;
      }
      if (
        wasPlaying &&
        previous?.inGame &&
        next.inGame &&
        next.battleId &&
        previous.battleId !== next.battleId &&
        next.track.endsWith('-battle')
      )
        encounterId = next.battleId;
      if (encounterId !== next.battleId || !next.track.endsWith('-battle')) encounterId = null;
      const target = encounterId ? 'encounter' : next.track;
      if (desired !== target || !wasPlaying) switchTrack(target);
      else if (current) {
        try {
          current.voice.setVolume(current.gain * volume);
        } catch (error) {
          report(error);
        }
      }
    },
    retry() {
      if (!failed || disposed || !active || !volume || !desired) return;
      failed = false;
      if (current?.key === desired) start(current, revision);
      else switchTrack(desired);
    },
    dispose() {
      disposed = true;
      ++revision;
      cancelTimers();
      release();
    },
  };
}
