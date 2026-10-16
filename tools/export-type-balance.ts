import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { ALL_SPECIES, CONTENT_VERSION } from '../src/content/catalog';
import { analyzeTyping, TYPING_BALANCE_POLICY } from '../src/content/typeBalance';

async function main() {
  const profiles = ALL_SPECIES.map((species) => ({
    speciesId: species.id,
    dexNumber: species.dexNumber,
    name: species.name,
    ...analyzeTyping(species.types),
  }));
  const invalid = profiles.filter((entry) => entry.issues.length);
  if (invalid.length) throw new Error(JSON.stringify(invalid));
  const path = 'docs/精灵属性/属性平衡核验.json';
  writeFileSync(
    path,
    await format(
      JSON.stringify({ contentVersion: CONTENT_VERSION, policy: TYPING_BALANCE_POLICY, profiles }),
      { ...(await resolveConfig(path)), filepath: path },
    ),
  );
  console.log(`已核对 ${profiles.length} 种精灵的弱点、抗性及每个属性收益。`);
}
void main();
