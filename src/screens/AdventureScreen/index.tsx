import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { Label, palette } from '../../components/ui';
import { Command, GameState } from '../../game/model';
import { BattleScreen } from '../BattleScreen';
import { Explore } from '../Explore';
import { SCENE_TRANSITION } from '../../sceneTransition';
import { PendingScreen, StarterChoice } from '../GameMenus';

interface BattleTransition {
  source: GameState;
  entering: boolean;
}

export function AdventureScreen({
  game,
  dispatch,
  width,
  height,
  paused,
  saveStatus,
  onMenu,
  onBattlePlayback,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  width: number;
  height: number;
  paused: boolean;
  saveStatus: string;
  onMenu: () => void;
  onBattlePlayback: (id: string, playing: boolean) => void;
}) {
  const battleId = game.battle?.id ?? null;
  const [view, setView] = useState<{
    battleId: string | null;
    game: GameState;
    transition: BattleTransition | null;
    showDestination: boolean;
  }>({ battleId, game, transition: null, showDestination: true });
  if (view.battleId !== battleId) {
    setView({
      battleId,
      game,
      transition: { source: view.game, entering: !!battleId },
      showDestination: false,
    });
  } else if (view.game !== game) {
    setView({ ...view, game });
  }
  const [flash] = useState(() => new Animated.Value(0));
  const [curtain] = useState(() => new Animated.Value(0));
  const reduced = useRef(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) reduced.current = value;
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  const transition = view.transition;
  useEffect(() => {
    flash.setValue(0);
    curtain.setValue(0);
    if (!transition) return;
    const reduceMotion = reduced.current;
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration: reduceMotion ? Math.min(80, duration) : duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    // Retain the source scene until fully covered, including the final battle frame on return.
    let animation = Animated.sequence([
      ...(reduceMotion || !transition.entering
        ? []
        : [
            timing(flash, 0.55, 70),
            timing(flash, 0, 100),
            timing(flash, 0.7, 70),
            timing(flash, 0, 120),
          ]),
      timing(curtain, 1, transition.entering ? 180 : SCENE_TRANSITION.fadeOut),
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      setView((current) =>
        current.transition === transition ? { ...current, showDestination: true } : current,
      );
      animation = Animated.sequence([
        Animated.delay(SCENE_TRANSITION.coveredFrame),
        timing(curtain, 0, SCENE_TRANSITION.fadeIn),
      ]);
      animation.start(({ finished: revealed }) => {
        if (revealed)
          setView((current) =>
            current.transition === transition ? { ...current, transition: null } : current,
          );
      });
    });
    return () => animation.stop();
  }, [transition, flash, curtain]);
  const transitioning = !!transition;
  const presentedGame = transition && !view.showDestination ? transition.source : game;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        pointerEvents={transitioning ? 'none' : 'auto'}
        accessibilityElementsHidden={transitioning}
        importantForAccessibility={transitioning ? 'no-hide-descendants' : 'auto'}
      >
        {presentedGame.battle ? (
          <BattleScreen
            onPlaybackChange={onBattlePlayback}
            key={presentedGame.battle.id}
            game={presentedGame}
            dispatch={dispatch}
            height={height}
            paused={paused || transitioning}
          />
        ) : (
          <Explore
            game={presentedGame}
            dispatch={dispatch}
            width={width}
            height={height}
            paused={paused || transitioning}
            saveStatus={saveStatus}
            onMenu={onMenu}
          />
        )}
        {!presentedGame.battle && !presentedGame.dialogue && presentedGame.pending.length > 0 && (
          <PendingScreen game={presentedGame} dispatch={dispatch} />
        )}
        {presentedGame.progress.flags.starterChoice &&
          !presentedGame.dialogue &&
          !presentedGame.battle && <StarterChoice dispatch={dispatch} />}
      </View>
      {transitioning && (
        <View
          testID={transition.entering ? 'battle-encounter-transition' : 'battle-return-transition'}
          style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
          accessibilityLabel={
            transition.entering ? '遭遇战斗，正在进入战场' : '战斗结束，正在返回地图'
          }
          accessibilityLiveRegion="polite"
        >
          {transition.entering && (
            <Animated.View
              testID="battle-encounter-flash"
              style={[StyleSheet.absoluteFill, { backgroundColor: '#fff2ce', opacity: flash }]}
            />
          )}
          <Animated.View
            testID="battle-transition-curtain"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: SCENE_TRANSITION.color,
                opacity: curtain,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              },
            ]}
          >
            {transition.entering && (
              <>
                <View style={{ width: 64, height: 2, backgroundColor: palette.gold }} />
                <Label style={{ color: palette.gold, fontSize: 22, fontWeight: '800' }}>
                  {game.battle?.kind === 'wild' ? '野生精灵出现了' : '对战即将开始'}
                </Label>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}
