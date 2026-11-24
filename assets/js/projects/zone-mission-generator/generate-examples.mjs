import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateMission, serializeMission } from './mission-core.js';
import { ARCHETYPE_PRESETS, SCENARIOS } from './presets.js';

const [output, filter] = process.argv.slice(2);
if (!output) throw Error('Usage: node generate-examples.mjs OUTPUT_DIRECTORY [SCENARIO_NAME]');
const examples = filter ? SCENARIOS.filter(([label]) => label === filter) : SCENARIOS;
if (!examples.length) throw Error('No matching scenario');
mkdirSync(output, { recursive: true });
for (const [label, archetype, settings] of examples) {
  const mission = generateMission({ ...ARCHETYPE_PRESETS[archetype], ...settings, archetype });
  if (!mission.validation.ok) throw Error(mission.validation.errors.join('\n'));
  mission.identity.label = label;
  const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = resolve(output, name + '.mission.json');
  writeFileSync(file, JSON.stringify(serializeMission(mission), null, 2) + '\n', { flag: 'wx' });
  console.log(label, mission.validation.totals);
}
