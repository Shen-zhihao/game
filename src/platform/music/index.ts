import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { gameMusic, MUSIC_NAMES } from '../../content/music';
import type { GameState } from '../../game/model';
import { useAppActivity } from '../../hooks/useAppActivity';
import { createMusicController } from './controller';
import { driver, listenForMusicInteraction, preferenceDriver } from './driver';
import { createMusicPreferences } from './preferences';

const preferences = createMusicPreferences(preferenceDriver);
export const setMusicPreferences = preferences.set;
export const useMusicPreferences = () =>
  useSyncExternalStore(preferences.subscribe, preferences.get, preferences.get);

export function useGameMusic(
  game: GameState | null,
  inGame: boolean,
  playingBattleId: string | null,
) {
  const settings = useMusicPreferences();
  const active = useAppActivity();
  const controller = useRef<ReturnType<typeof createMusicController> | null>(null);
  const [issue, setIssue] = useState('');
  const scene = gameMusic(game, inGame, !game?.battle || playingBattleId !== game.battle.id);
  useEffect(() => {
    const music = createMusicController(driver, (error) => {
      setIssue(
        !error
          ? ''
          : error instanceof Error && error.name === 'NotAllowedError'
            ? '轻点画面后播放音乐。'
            : '音乐暂时无法播放，可关闭后重新开启。',
      );
    });
    controller.current = music;
    const stopListening = listenForMusicInteraction(music.retry);
    return () => {
      stopListening();
      music.dispose();
      controller.current = null;
    };
  }, []);
  const { track, battleId } = scene;
  useEffect(() => {
    controller.current?.update(
      { track, battleId, inGame },
      settings.enabled ? settings.volume : 0,
      active,
    );
  }, [track, battleId, inGame, settings.enabled, settings.volume, active]);
  return { title: MUSIC_NAMES[track], issue };
}
