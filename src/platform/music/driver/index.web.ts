import { Asset } from 'expo-asset';
import type { MusicDriver } from '../controller';
import type { MusicPreferenceDriver } from '../preferences';
import { MUSIC_ASSETS } from '../assets';

export const preferenceDriver: MusicPreferenceDriver = {
  read: () => localStorage.getItem('stargrove-background-music'),
  write: (value) => localStorage.setItem('stargrove-background-music', value),
};
export const driver: MusicDriver = {
  prepare: () => Promise.resolve(),
  create(track, loop) {
    const source = Asset.fromModule(MUSIC_ASSETS[track]).uri;
    const player = new Audio(source);
    player.loop = loop;
    player.preload = 'auto';
    player.hidden = true;
    player.dataset.gameMusic = track;
    document.body.appendChild(player);
    return {
      setVolume: (value) => {
        player.volume = value;
      },
      play: () => player.play(),
      pause: () => player.pause(),
      release: () => {
        player.pause();
        player.removeAttribute('src');
        player.load();
        player.remove();
      },
    };
  },
};
export function listenForMusicInteraction(retry: () => void) {
  document.addEventListener('pointerdown', retry, true);
  document.addEventListener('keydown', retry, true);
  return () => {
    document.removeEventListener('pointerdown', retry, true);
    document.removeEventListener('keydown', retry, true);
  };
}
