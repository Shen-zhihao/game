import { useEffect, useRef, useState } from 'react';
import { gameMusic, MUSIC_NAMES } from '../content/music';
import type { GameState } from '../game/model';
import { createMusicController } from '../platform/music/controller';
import { driver, listenForMusicInteraction } from '../platform/music/driver';
import { useAppActivity } from './useAppActivity';
import { useMusicPreferences } from './useMusicPreferences';

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
