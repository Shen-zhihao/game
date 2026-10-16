import { MapId } from '../../game/model';

export const MAP_IMAGES: Partial<Record<MapId, number>> = {
  dawn: require('../../../assets/maps/dawn-expanded.png'),
  route: require('../../../assets/maps/route-expanded.png'),
  moss: require('../../../assets/maps/moss-expanded.png'),
  forest: require('../../../assets/maps/forest-expanded.png'),
  gym: require('../../../assets/maps/gym.png'),
  stoneRoute: require('../../../assets/maps/stone-route.png'),
  stone: require('../../../assets/maps/stone-city-coast-v2.png'),
  mine: require('../../../assets/maps/old-mine.png'),
  coastRoute: require('../../../assets/maps/coast-route.png'),
  harbor: require('../../../assets/maps/harbor-city-v2.png'),
  tideworks: require('../../../assets/maps/tideworks-v2.png'),
  waterGym: require('../../../assets/maps/water-gym-v2.png'),
  rockGym: require('../../../assets/maps/rock-gym.png'),
};
export const TRAVELER_ATLAS = require('../../../assets/characters/traveler-walk.png');
export const NPC_ATLAS = require('../../../assets/characters/npcs.png');

export const RANGER_ATLAS = require('../../../assets/characters/ranger-walk.png');
