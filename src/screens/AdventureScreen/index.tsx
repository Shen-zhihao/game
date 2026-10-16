import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { Label, palette } from '../../components/ui';
import { Command, GameState, MapId } from '../../game/model';
import { BattleScreen } from '../BattleScreen';
import { Explore } from '../Explore';
import { SCENE_TRANSITION } from '../../sceneTransition';
import { PendingScreen, StarterChoice } from '../GameMenus';
import { BattleIntroIllustration } from '../../components/BattleIntroIllustration';

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
  onMenu,
  onBattlePlayback,
  coveredByEvent = false,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  width: number;
  height: number;
  paused: boolean;
  onMenu: () => void;
  onBattlePlayback: (id: string, playing: boolean) => void;
  coveredByEvent?: boolean;
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
  const [readyMap, setReadyMap] = useState<MapId | null>(null);
  const [completedIntro, setCompletedIntro] = useState<BattleTransition | null>(null);
  const introFinished = completedIntro === view.transition;
  const completeIntro = useCallback(() => setCompletedIntro(view.transition), [view.transition]);
  const onMapReady = useCallback((map: MapId) => setReadyMap(map), []);
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
    const animation = Animated.sequence([
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
    });
    return () => animation.stop();
  }, [transition, flash, curtain]);
  const destinationReady = !!transition?.entering || readyMap === game.player.map;
  useEffect(() => {
    if (
      !transition ||
      !view.showDestination ||
      !destinationReady ||
      (transition.entering && !introFinished)
    )
      return;
    // A timeout alone cannot establish that a freshly loaded map image is ready.
    const animation = Animated.sequence([
      Animated.delay(SCENE_TRANSITION.coveredFrame),
      Animated.timing(curtain, {
        toValue: 0,
        duration: reduced.current ? Math.min(80, SCENE_TRANSITION.fadeIn) : SCENE_TRANSITION.fadeIn,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished)
        setView((current) =>
          current.transition === transition ? { ...current, transition: null } : current,
        );
    });
    return () => animation.stop();
  }, [transition, view.showDestination, destinationReady, curtain, introFinished]);
  const transitioning = !!transition;
  const presentedGame = transition && !view.showDestination ? transition.source : game;
  const showingBattle = !!presentedGame.battle;
  const [lastExplore, setLastExplore] = useState(game);
  if (!showingBattle && lastExplore !== presentedGame) setLastExplore(presentedGame);
  return (
    <View
      style={{ flex: 1, backgroundColor: SCENE_TRANSITION.color }}
      pointerEvents={coveredByEvent ? 'none' : 'auto'}
      accessibilityElementsHidden={coveredByEvent}
      importantForAccessibility={coveredByEvent ? 'no-hide-descendants' : 'auto'}
    >
      <View
        style={{ flex: 1 }}
        pointerEvents={transitioning ? 'none' : 'auto'}
        accessibilityElementsHidden={transitioning}
        importantForAccessibility={transitioning ? 'no-hide-descendants' : 'auto'}
      >
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={showingBattle ? 'none' : 'auto'}
          accessibilityElementsHidden={showingBattle}
          importantForAccessibility={showingBattle ? 'no-hide-descendants' : 'auto'}
        >
          <Explore
            game={showingBattle ? lastExplore : presentedGame}
            dispatch={dispatch}
            width={width}
            height={height}
            paused={paused || transitioning || showingBattle}
            onMenu={onMenu}
            coveredTransition={transitioning}
            onReady={onMapReady}
          />
        </View>
        {presentedGame.battle && (
          <View style={StyleSheet.absoluteFill}>
            <BattleScreen
              onPlaybackChange={onBattlePlayback}
              key={presentedGame.battle.id}
              game={presentedGame}
              dispatch={dispatch}
              height={height}
              paused={paused || transitioning}
            />
          </View>
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
                <View style={{ width: 64, height: 2, backgroundColor: palette.amber }} />
                <Label style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>
                  {game.battle?.kind === 'wild' ? '野生精灵出现了' : '对战即将开始'}
                </Label>
              </>
            )}
          </Animated.View>
          {transition.entering && view.showDestination && !introFinished && game.battle && (
            <BattleIntroIllustration game={game} paused={paused} onFinished={completeIntro} />
          )}
        </View>
      )}
    </View>
  );
}
