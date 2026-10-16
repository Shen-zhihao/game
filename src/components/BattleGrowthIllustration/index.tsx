import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { sceneInk } from '../../content/sceneArt';
import { BattleFigure } from '../../game/model';
import { BattleGrowthVisual, experienceFrames, experienceRatio } from '../../game/battleVisuals';
import { creatureName } from '../../game/rules';
import { usePresentationMotion } from '../../hooks/usePresentationMotion';
import { JourneyBadge } from '../IllustrationEffects';

function ExperienceRoll({
  before,
  after,
  paused,
  onFinished,
}: BattleGrowthVisual & { paused: boolean; onFinished: () => void }) {
  const frames = experienceFrames(before, after);
  const { progress } = usePresentationMotion(frames.duration, paused, onFinished);
  const fill = progress.interpolate({
    inputRange: frames.input,
    outputRange: frames.output,
    extrapolate: 'clamp',
  });
  return (
    <Animated.View
      testID="battle-experience-fill"
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: sceneInk.gold,
        transformOrigin: 'left center',
        transform: [{ scaleX: fill }],
      }}
    />
  );
}
export function BattleExperienceBar({ figure, paused }: { figure: BattleFigure; paused: boolean }) {
  const [view, setView] = useState<{
    figure: BattleFigure;
    roll: BattleGrowthVisual | null;
    generation: number;
  }>({ figure, roll: null, generation: 0 });
  if (view.figure.id !== figure.id)
    setView({ figure, roll: null, generation: view.generation + 1 });
  else if (view.figure.experience !== figure.experience || view.figure.level !== figure.level)
    setView({
      figure,
      roll: { before: view.figure, after: figure },
      generation: view.generation + 1,
    });
  return (
    <View
      testID="battle-experience-bar"
      style={{
        height: 4,
        marginLeft: 22,
        marginTop: 4,
        backgroundColor: '#e4dac5',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {view.roll ? (
        <ExperienceRoll
          key={view.generation}
          {...view.roll}
          paused={paused}
          onFinished={() =>
            setView((current) =>
              current.generation === view.generation ? { ...current, roll: null } : current,
            )
          }
        />
      ) : (
        <View
          style={{
            height: '100%',
            width: `${experienceRatio(figure) * 100}%`,
            backgroundColor: sceneInk.gold,
          }}
        />
      )}
    </View>
  );
}
export function BattleGrowthIllustration({
  visual,
  paused,
  onFinished,
}: {
  visual: BattleGrowthVisual;
  paused: boolean;
  onFinished: () => void;
}) {
  const frames = experienceFrames(visual.before, visual.after);
  const { progress, reduced } = usePresentationMotion(frames.duration, paused, onFinished);
  const levels = visual.after.level - visual.before.level;
  const points = (visual.after.growthPoints ?? 0) - (visual.before.growthPoints ?? 0);
  return (
    <Animated.View
      testID="battle-growth-animation"
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        bottom: 14,
        minWidth: 220,
        maxWidth: '58%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: sceneInk.paper,
        borderWidth: 1,
        borderColor: sceneInk.gold,
        borderRadius: 16,
        opacity: progress.interpolate({
          inputRange: [0, 0.15, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: reduced
          ? []
          : [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [15, 0, 0],
                }),
              },
            ],
      }}
    >
      {levels > 0 && <JourneyBadge size={50} />}
      <View style={{ flexShrink: 1 }}>
        <Text style={{ color: sceneInk.outline, fontWeight: '900', fontSize: levels ? 19 : 15 }}>
          {levels ? `${creatureName(visual.after)}升级了！` : '伙伴获得经验'}
        </Text>
        <Text style={{ color: '#96723e', fontSize: 12, marginTop: 3 }}>
          {levels
            ? `Lv.${visual.before.level} → Lv.${visual.after.level}　能力点 +${Math.max(0, points)}`
            : `经验 +${(visual.after.experience ?? 0) - (visual.before.experience ?? 0)}`}
        </Text>
      </View>
    </Animated.View>
  );
}
