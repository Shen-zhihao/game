import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MAPS, GYM_BARRIERS, mapSize, npcVisible } from '../../content/world';
import { GameState, MapId } from '../../game/model';
import { TravelerSprite } from '../CharacterSprite';
import { CreatureSprite } from '../CreatureSprite';
import { MapCanvas } from '../MapCanvas';
import { facingNpc, npcInReach, worldNpcs } from '../../game/exploration';
import { GrassWind } from '../GrassWind';
import { WorldNpc } from '../WorldNpc';
import { CoastAmbient } from '../CoastAmbient';
import { CoastPropKind, CoastPropSprite } from '../CoastPropSprite';
import { QuarryPropSprite } from '../QuarryPropSprite';
import { travelProfile, weatherAt, isIndoor } from '../../game/environment';
import { WeatherOverlay } from '../WeatherOverlay';
import { GroundWeather } from '../GroundWeather';
import { BuildingDoors } from '../BuildingDoor';
import type { DoorPresentation } from '../../hooks/useBuildingPassage';
import { DOOR_TIMINGS } from '../../game/buildingPassage';
import { NightBuildingLights } from '../NightBuildingLights';
import { sceneInk } from '../../content/sceneArt';
import { FieldPropIllustration } from '../FieldPropIllustration';
import { FieldObjectIllustration } from '../FieldObjectIllustration';
import { fieldObjectFor, fieldObjectSize, fieldObjectFlag } from '../../content/fieldProps';
import { BagIllustration } from '../ItemIcon';
import { ServiceCounters } from '../ServiceCounters';
import { ProductionMilestones } from '../ProductionMilestones';
import { ProductionRewards } from '../ProductionRewards';
import { palette } from '../ui';
import {
  ADVENTURE_GYMS,
  ADVENTURE_INTERACTIONS,
  adventureEncounter,
} from '../../content/adventure';

const HUMAN_ROLES = new Set([
  'professor',
  'rival',
  'healer',
  'shop',
  'quest',
  'trainer',
  'leader',
  'home',
  'resident',
  'distressedProfessor',
]);
const COAST_FRIENDS: Record<string, [string, string]> = {
  coralFriend: ['creature_097', 'coralCaught'],
  islandFriend: ['creature_098', 'islandCaught'],
  tideShell: ['creature_099', 'tideCaught'],
};
const COAST_PROPS: Record<string, CoastPropKind> = {
  driftBottle: 'bottle',
  reefCleanup: 'net',
  lensCase: 'lens',
  oldLighthouse: 'lamp',
  sluiceConsole: 'console',
  waterSwitchOne: 'valve',
  waterSwitchTwo: 'valve',
};
export function WorldViewport({
  game,
  width,
  height,
  paused,
  motionPaused = paused,
  door,
  coveredTransition = false,
  onReady,
  night,
}: {
  game: GameState;
  width: number;
  height: number;
  paused: boolean;
  motionPaused?: boolean;
  door?: DoorPresentation | null;
  coveredTransition?: boolean;
  onReady?: (map: MapId) => void;
  night?: Animated.Value;
}) {
  const world = mapSize(game.player.map);
  const scale = MAPS[game.player.map].interior
    ? Math.max(height / world.height, Math.min(width / world.width, height / 320))
    : Math.max(height / 360, width / world.width);
  const [position] = useState(
    () => new Animated.ValueXY({ x: game.player.x * 32, y: game.player.y * 32 }),
  );
  const [opacity] = useState(() => new Animated.Value(1));
  const last = useRef({ map: game.player.map, x: game.player.x, y: game.player.y });
  const stepDuration = travelProfile(game).duration;
  useLayoutEffect(() => {
    const previous = last.current;
    const changedMap = previous.map !== game.player.map;
    const dx = Math.abs(previous.x - game.player.x);
    const dy = Math.abs(previous.y - game.player.y);
    const distance = Math.hypot(dx, dy);
    last.current = { map: game.player.map, x: game.player.x, y: game.player.y };
    const target = { x: game.player.x * 32, y: game.player.y * 32 };
    position.stopAnimation();
    if (changedMap || Math.max(dx, dy) !== 1 || paused) {
      if (distance || changedMap || paused) position.setValue(target);
      if (changedMap) {
        opacity.stopAnimation();
        if (coveredTransition) opacity.setValue(1);
        else {
          opacity.setValue(0.35);
          Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
        }
      }
      return;
    }
    Animated.timing(position, {
      toValue: target,
      duration: Math.round(stepDuration * distance),
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    return () => position.stopAnimation();
  }, [
    game.player.map,
    game.player.x,
    game.player.y,
    opacity,
    paused,
    position,
    stepDuration,
    coveredTransition,
  ]);
  const camera = useMemo(() => {
    const xHalf = width / scale / 2;
    const yHalf = height / scale / 2;
    const x =
      world.width * scale <= width
        ? (width - world.width * scale) / 2
        : position.x.interpolate({
            inputRange: [xHalf - 16, world.width - xHalf - 16],
            outputRange: [0, width - world.width * scale],
            extrapolate: 'clamp',
          });
    const y =
      world.height * scale <= height
        ? 0
        : position.y.interpolate({
            inputRange: [yHalf - 16, world.height - yHalf - 16],
            outputRange: [0, height - world.height * scale],
            extrapolate: 'clamp',
          });
    return { x, y };
  }, [height, position, scale, width, world.width, world.height]);
  const npcs = worldNpcs(game);
  const nearby = facingNpc(game) ?? npcs.find((n) => npcVisible(game, n) && npcInReach(game, n));
  return (
    <View
      testID="world-viewport"
      style={{
        width,
        height,
        overflow: 'hidden',
        backgroundColor: sceneInk.cream,
      }}
    >
      <Animated.View
        style={{
          width: world.width * scale,
          height: world.height * scale,
          opacity,
          transform: [{ translateX: camera.x }, { translateY: camera.y }],
        }}
      >
        <MapCanvas
          state={game}
          width={world.width * scale}
          height={world.height * scale}
          onReady={onReady}
        />
        <BuildingDoors map={game.player.map} scale={scale} passage={door} night={night} />
        <CoastAmbient game={game} scale={scale} paused={paused} />
        <GroundWeather
          map={game.player.map}
          weather={weatherAt(game)}
          focusX={game.player.x}
          focusY={game.player.y}
          scale={scale}
          width={width}
          height={height}
          paused={paused}
        />
        {!isIndoor(game.player.map) && (
          <GrassWind
            mapId={game.player.map}
            scale={scale}
            paused={paused}
            weather={weatherAt(game)}
          />
        )}
        {npcs
          .filter(
            (n) =>
              (!HUMAN_ROLES.has(n.role) || adventureEncounter(n.event ?? null) || n.artSpeciesId) &&
              npcVisible(game, n),
          )
          .map((n) => {
            const encounter = adventureEncounter(n.event ?? null);
            const friend =
              COAST_FRIENDS[n.id] ??
              (encounter ? [encounter.speciesId, encounter.caught] : undefined);
            const coastProp = COAST_PROPS[n.id];
            const fieldObject = fieldObjectFor(n);
            const size = n.artSpeciesId
              ? 108
              : friend
                ? 55
                : fieldObject
                  ? fieldObjectSize(fieldObject)
                  : n.role === 'log'
                    ? 58
                    : n.role === 'gate'
                      ? 50
                      : 42;
            const cell =
              n.role === 'switch' || n.role === 'echo'
                ? 2
                : n.role === 'rock'
                  ? 6
                  : n.role === 'mechanism'
                    ? 7
                    : n.role === 'chest'
                      ? 3
                      : n.role === 'log'
                        ? 4
                        : n.role === 'gate'
                          ? 5
                          : 0;
            return (
              <View
                pointerEvents="none"
                key={n.id}
                style={{
                  position: 'absolute',
                  left: (n.x * 32 + 16 - size / 2) * scale,
                  top: (n.y * 32 + 31 - size) * scale,
                  zIndex: n.y * 10,
                  width: size * scale,
                  height: size * scale,
                  opacity: n.role === 'clue' && game.progress.flags[n.id] ? 0.55 : 1,
                }}
              >
                {n.artSpeciesId ? (
                  <CreatureSprite
                    speciesId={n.artSpeciesId}
                    size={size * scale}
                    animate={!paused}
                  />
                ) : n.role === 'professorBag' ? (
                  <BagIllustration size={size * scale} />
                ) : friend && !game.progress.flags[friend[1]] ? (
                  <CreatureSprite speciesId={friend[0]} size={size * scale} animate={!paused} />
                ) : coastProp ? (
                  <CoastPropSprite
                    kind={coastProp}
                    size={size * scale}
                    active={
                      !!game.progress.flags[
                        n.id === 'oldLighthouse'
                          ? 'lighthouseRepaired'
                          : n.id === 'sluiceConsole'
                            ? 'sluiceRepaired'
                            : n.id === 'reefCleanup'
                              ? 'reefRestored'
                              : n.id
                      ]
                    }
                  />
                ) : fieldObject ? (
                  <FieldObjectIllustration
                    kind={fieldObject}
                    size={size * scale}
                    active={!!game.progress.flags[fieldObjectFlag(n.id)]}
                  />
                ) : n.role === 'rock' ||
                  n.role === 'mechanism' ||
                  (game.player.map === 'rockGym' && n.role === 'switch') ? (
                  <QuarryPropSprite
                    kind={
                      n.role === 'rock' ? 'rock' : n.role === 'mechanism' ? 'console' : 'weight'
                    }
                    size={size * scale}
                    active={
                      !!game.progress.flags[
                        ADVENTURE_INTERACTIONS[n.id]?.rules.find((r) => r.sets?.length)
                          ?.sets?.[0] ?? (n.role === 'mechanism' ? 'mineStabilized' : n.id)
                      ]
                    }
                  />
                ) : n.role === 'rescue' || n.role === 'openingWild' ? (
                  <CreatureSprite
                    speciesId={n.role === 'openingWild' ? 'creature_037' : 'creature_016'}
                    size={size * scale}
                    animate
                  />
                ) : (
                  <FieldPropIllustration cell={cell} size={size * scale} />
                )}
              </View>
            );
          })}
        {(GYM_BARRIERS[game.player.map] ?? [])
          .filter(([, , flag]) => !game.progress.flags[flag])
          .map(([x, y, flag]) => (
            <View
              key={flag}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: (x * 32 - 8) * scale,
                top: (y * 32 - 14) * scale,
                zIndex: y * 10,
                width: 48 * scale,
                height: 48 * scale,
              }}
            >
              {game.player.map === 'waterGym' ? (
                <CoastPropSprite kind="gate" size={48 * scale} />
              ) : game.player.map === 'rockGym' ||
                ADVENTURE_GYMS.some((g) => g.map === game.player.map) ? (
                <QuarryPropSprite kind="door" size={48 * scale} />
              ) : (
                <FieldPropIllustration cell={6} size={48 * scale} />
              )}
            </View>
          ))}
        {(game.player.map === 'forest' || game.player.map === 'gym') && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 10.9 * 32 * scale, top: -20 * scale, zIndex: 1 }}
          >
            <FieldPropIllustration cell={5} size={84 * scale} />
          </View>
        )}
        {npcs
          .filter(
            (n) =>
              HUMAN_ROLES.has(n.role) &&
              !adventureEncounter(n.event ?? null) &&
              !n.artSpeciesId &&
              npcVisible(game, n),
          )
          .map((n) => (
            <WorldNpc
              key={n.id}
              npc={n}
              scale={scale}
              paused={game.world?.trainerChallenge?.npcId === n.id ? motionPaused : paused}
              alert={
                game.world?.trainerChallenge?.npcId === n.id &&
                game.world.trainerChallenge.phase === 'alert'
              }
            />
          ))}
        <ServiceCounters map={game.player.map} scale={scale} />
        <ProductionMilestones game={game} scale={scale} />
        <ProductionRewards game={game} scale={scale} />
        <Animated.View
          key={game.player.map}
          pointerEvents="none"
          testID="traveler"
          style={{
            position: 'absolute',
            left: -12 * scale,
            top: -19 * scale,
            width: 56 * scale,
            height: 56 * scale,
            zIndex: game.player.y * 10 + 1,
            transform: [
              { translateX: Animated.multiply(position.x, scale) },
              { translateY: Animated.multiply(position.y, scale) },
            ],
          }}
        >
          {/* A faded native door view must never be reused for the standing traveler. */}
          <Animated.View
            key={door ? (door.entering ? 'entering' : 'leaving') : 'standing'}
            testID="traveler-visibility"
            style={{
              width: 56 * scale,
              height: 56 * scale,
              opacity: door
                ? door.travel.interpolate({
                    inputRange: [0, 1],
                    outputRange: door.entering ? [1, 0] : [0, 1],
                  })
                : 1,
              transform: door
                ? [
                    {
                      translateX: door.travel.interpolate({
                        inputRange: [0, 1],
                        outputRange: door.entering
                          ? [0, door.offset.x * 32 * scale]
                          : [door.offset.x * 32 * scale, 0],
                      }),
                    },
                    {
                      translateY: door.travel.interpolate({
                        inputRange: [0, 1],
                        outputRange: door.entering
                          ? [0, door.offset.y * 32 * scale]
                          : [door.offset.y * 32 * scale, 0],
                      }),
                    },
                  ]
                : [],
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 21 * scale,
                height: 6 * scale,
                borderRadius: 16 * scale,
                backgroundColor: '#183f3470',
                bottom: 7 * scale,
                left: 18 * scale,
              }}
            />
            {['~', 'W'].includes(
              MAPS[game.player.map].rows[game.player.y]?.[game.player.x] ?? '',
            ) && (
              <View style={{ position: 'absolute', left: 4 * scale, top: 24 * scale }}>
                <CoastPropSprite kind="raft" size={48 * scale} />
              </View>
            )}
            <TravelerSprite
              avatar={game.player.avatar}
              testID="traveler-sprite"
              facing={game.player.facing}
              steps={game.steps + (door ? 1 : 0)}
              paused={paused && !door}
              stepDuration={
                door
                  ? DOOR_TIMINGS.open + DOOR_TIMINGS.pass + DOOR_TIMINGS.close
                  : stepDuration + 35
              }
              size={56 * scale}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <WeatherOverlay
        key={game.player.map}
        weather={weatherAt(game)}
        width={width}
        height={height}
        paused={paused}
        night={night}
      />
      {night && (
        <>
          <Animated.View
            testID="night-map-shade"
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#09152d',
                opacity: night.interpolate({ inputRange: [0, 1], outputRange: [0, 0.26] }),
              },
            ]}
          />
          <Animated.View
            testID="night-building-lights"
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: world.width * scale,
              height: world.height * scale,
              opacity: Animated.multiply(opacity, night),
              transform: [{ translateX: camera.x }, { translateY: camera.y }],
            }}
          >
            <NightBuildingLights map={game.player.map} scale={scale} />
          </Animated.View>
        </>
      )}
      <View pointerEvents="none" style={s.vignette} />
      {nearby && !game.dialogue && (
        <View pointerEvents="none" style={s.hint}>
          <Text style={s.hintText}>A　{nearby.name}</Text>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  vignette: { ...StyleSheet.absoluteFill, borderWidth: 1, borderColor: `${palette.ink}22` },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${palette.panel}f5`,
    borderWidth: 1,
    borderColor: palette.line,
  },
  hintText: { color: palette.ink, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
