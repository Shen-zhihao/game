import { writeFileSync } from 'node:fs';
import { ALL_SPECIES, CONTENT_VERSION, MOVES, TYPES } from '../src/content/catalog';
import { CITIES } from '../src/content/cities';
import { GROWTH_WEIGHTS, STAT_NAMES, TRAINING_PLANS } from '../src/content/training';

writeFileSync(
  'docs/data/training-plans.json',
  JSON.stringify(
    {
      contentVersion: CONTENT_VERSION,
      maxLevel: 100,
      pointsPerLevel: [1, 10],
      abilityPerPoint: 1,
      defaultMode: 'manual',
      strengthBasis:
        'maximum base stat total within the evolutionary family; stable across evolution',
      growthPolicy:
        'stronger families favor higher 1–10 point rolls; lower-strength compensation removed',
      strengthTiers: [
        { potential: 'standard', maxStrength: 500, meanPoints: 4 },
        { potential: 'balanced', minStrength: 501, maxStrength: 550, meanPoints: 5.5 },
        { potential: 'highBase', minStrength: 551, meanPoints: 7 },
      ],
      resetPolicy:
        'confirmed allocations can only be refunded with the respec medicine from the bag; no reroll',
      probabilityWeights: GROWTH_WEIGHTS,
      statNames: STAT_NAMES,
      plans: ALL_SPECIES.map((species) => ({
        dexNumber: species.dexNumber,
        name: species.name,
        types: species.types.map((id) => TYPES[id]),
        ...TRAINING_PLANS[species.id],
        moves: TRAINING_PLANS[species.id]!.moves.map((m) => ({
          ...m,
          name: MOVES[m.moveId]!.name,
        })),
      })),
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  'docs/data/city-services.json',
  JSON.stringify(
    {
      contentVersion: CONTENT_VERSION,
      currency: '调查印记',
      services: CITIES,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `导出 ${ALL_SPECIES.length} 份培养方案、${CITIES.length} 座城镇服务、${CITIES.flatMap((c) => c.quests).length} 份委托（其中 ${CITIES.filter((c) => c.implemented).length} 座城镇已开放）。`,
);
