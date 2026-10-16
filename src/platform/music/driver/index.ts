import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { MusicDriver } from '../controller';
import { MUSIC_ASSETS } from '../assets';
import type { MusicPreferenceDriver } from '../preferences';

const storage = new SQLiteStorage('stargrove-preferences.db');
export const preferenceDriver: MusicPreferenceDriver = {
  read: () => storage.getItemSync('background-music'),
  write: (value) => storage.setItemSync('background-music', value),
};
let audio: typeof import('expo-audio') | undefined;
let preparing: Promise<void> | undefined;
export const driver: MusicDriver = {
  prepare() {
    preparing ??= import('expo-audio')
      .then(async (module) => {
        await module.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          allowsRecording: false,
          interruptionMode: 'doNotMix',
        });
        audio = module;
      })
      .catch((error: unknown) => {
        preparing = undefined;
        throw error;
      });
    return preparing;
  },
  create(track, loop) {
    if (!audio) throw new Error('音频模块尚未准备完成');
    const player = audio.createAudioPlayer(MUSIC_ASSETS[track], { updateInterval: 250 });
    player.loop = loop;
    let released = false;
    return {
      setVolume: (value) => {
        player.volume = value;
      },
      play: () => player.play(),
      pause: () => player.pause(),
      release: () => {
        if (released) return;
        released = true;
        player.pause();
        player.remove();
      },
    };
  },
};
export const listenForMusicInteraction = (_retry: () => void) => () => {};
