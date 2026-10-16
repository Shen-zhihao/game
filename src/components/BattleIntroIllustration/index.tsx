import { Animated, StyleSheet, Text, View } from 'react-native';
import { MAPS, GYM_REWARDS } from '../../content/world';
import { sceneInk as ink } from '../../content/sceneArt';
import { GameState } from '../../game/model';
import { usePresentationMotion } from '../../hooks/usePresentationMotion';
import { NpcSprite, TravelerSprite } from '../CharacterSprite';
import { CreatureSprite } from '../CreatureSprite';
import { PaperHalo } from '../IllustrationEffects';
import { Button } from '../ui';

export function BattleIntroIllustration({
  game,
  paused,
  onFinished,
}: {
  game: GameState;
  paused: boolean;
  onFinished: () => void;
}) {
  const battle = game.battle!;
  const wild = battle.kind === 'wild';
  const gym = GYM_REWARDS.find((g) => g.leader === battle.event);
  const champion = battle.event === 'leagueChampion';
  const npc = MAPS[game.player.map].npcs.find(
    (n) => n.id === battle.npcId || n.event === battle.event,
  );
  const { progress, reduced } = usePresentationMotion(
    wild ? 650 : gym || champion ? 1800 : 1200,
    paused,
    onFinished,
  );
  const value = (from: number, to: number) =>
    progress.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [from, to, to],
      extrapolate: 'clamp',
    });
  return (
    <View
      testID="illustrated-battle-intro"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: ink.cream,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
      ]}
      accessibilityLabel={wild ? '野生精灵出现了' : `即将挑战${battle.name}`}
    >
      <View pointerEvents="none" style={{ position: 'absolute', opacity: 0.65 }}>
        <PaperHalo size={360} />
      </View>
      <Text style={{ color: '#96723e', fontSize: 12, letterSpacing: 4, marginBottom: 12 }}>
        {wild
          ? '草间的相遇'
          : champion
            ? '联盟 · 最后的挑战'
            : gym
              ? `${gym.badge}的试炼`
              : '训练师挑战'}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: wild ? 0 : 40,
        }}
      >
        {!wild && (
          <Animated.View
            style={{
              alignItems: 'center',
              opacity: value(0, 1),
              transform: reduced ? [] : [{ translateX: value(-160, 0) }],
            }}
          >
            <TravelerSprite avatar={game.player.avatar} facing="down" steps={0} paused size={120} />
            <Text style={{ color: ink.outline, fontSize: 18, fontWeight: '800', marginTop: 6 }}>
              {game.player.name}
            </Text>
          </Animated.View>
        )}
        {!wild && (
          <Animated.View
            style={{ opacity: value(0, 1), transform: reduced ? [] : [{ scale: value(1.5, 1) }] }}
          >
            <Text
              style={{ color: '#b67c28', fontSize: 40, fontWeight: '900', fontStyle: 'italic' }}
            >
              VS
            </Text>
          </Animated.View>
        )}
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: value(0, 1),
            transform: reduced ? [] : [{ translateX: value(wild ? 45 : 160, 0) }],
          }}
        >
          {npc && !wild ? (
            <NpcSprite npc={npc} size={120} paused />
          ) : (
            <CreatureSprite
              speciesId={battle.enemies[battle.enemyIndex]!.speciesId}
              size={wild ? 146 : 120}
            />
          )}
          <Text
            style={{
              color: ink.outline,
              fontSize: wild ? 24 : 18,
              fontWeight: '900',
              marginTop: 6,
            }}
          >
            {wild ? '野生精灵出现了！' : battle.name}
          </Text>
        </Animated.View>
      </View>
      {!wild && (
        <Text style={{ color: '#927d60', fontSize: 12, marginTop: 18 }}>
          带上伙伴，迎接新的挑战。
        </Text>
      )}
      <View style={{ position: 'absolute', bottom: 18, right: 24 }}>
        <Button small testID="skip-battle-intro" disabled={paused} onPress={onFinished}>
          开始对战
        </Button>
      </View>
    </View>
  );
}
