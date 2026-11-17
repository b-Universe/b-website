import { copy, slugifyName } from '../utils.js';
import { GENERATOR_META } from '../core/categories.js';
import { COMMON_MATERIAL_KEYS, hasObjectFamily, sanitiseObjectConfig } from '../core/registry.js';
import { checkBlueprintCompatibility, generateObjectBlueprint } from '../core/blueprints.js';
import { generateVariationCandidates } from '../core/variation.js';
import { buildCityObject } from '../core/assemblies.js';
import { disposeObjectGroup } from './preview.js';

function expTriggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function exportCityObjectGLB(objectGroup, state, toast) {
  if (!objectGroup) {
    if (toast) toast('Nothing To Export Yet');
    return;
  }
  if (typeof THREE === 'undefined' || !THREE.GLTFExporter) {
    if (toast) toast('Gltf Exporter Not Available');
    return;
  }

  const exporter = new THREE.GLTFExporter();
  const baseName = `city-object-${slugifyName(state.familyId || 'prop')}-${state.seed || 1}`;

  try {
    exporter.parse(
      objectGroup,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          expTriggerDownload(blob, `${baseName}.glb`);
          if (toast) toast(`Exported ${baseName}.glb`);
        } else {
          const json = JSON.stringify(result, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          expTriggerDownload(blob, `${baseName}.gltf`);
          if (toast) toast(`Exported ${baseName}.gltf`);
        }
      },
      { binary: true, onlyVisible: true }
    );
  } catch (err) {
    console.error('Glb Export Error:', err);
    if (toast) toast('Glb Export Failed');
  }
}

export function exportCityObjectBlueprint(objectGroup, state, toast) {
  const blueprint = objectGroup?.userData?.blueprint || generateObjectBlueprint(state, objectGroup);
  const baseName = `city-object-${slugifyName(state.familyId || 'prop')}-${state.seed || 1}`;
  const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
  expTriggerDownload(blob, `${baseName}.blueprint.json`);
  if (toast) toast(`Exported ${baseName}.blueprint.json`);
  return blueprint;
}

export function exportCityAssemblyPack(state, locks = new Set(), toast) {
  const candidates = generateVariationCandidates(state, 6, locks);
  const variants = candidates.map((cand) => {
    const built = buildCityObject(cand.config, { locks });
    const bp = copy(built.userData?.blueprint || {});
    disposeObjectGroup(built);
    return {
      label: cand.label,
      seed: cand.seed,
      condition: cand.config.condition,
      config: cand.config,
      blueprint: bp
    };
  });

  const pack = {
    schemaVersion: 'b.city-object-pack.v1',
    generator: { ...GENERATOR_META },
    exportedAt: new Date().toISOString(),
    baseFamilyId: state.familyId,
    basePresetId: state.presetId,
    variantCount: variants.length,
    variants
  };

  const baseName = `city-object-pack-${slugifyName(state.familyId || 'prop')}-${state.seed || 1}`;
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  expTriggerDownload(blob, `${baseName}.pack.json`);
  if (toast) toast(`Exported ${baseName}.pack.json (6 Variants)`);
  return pack;
}

export function applyImportedObjectData(data, currentState, locks = new Set()) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Json import payload');
  }

  let candidateCfg = null;
  if (data.schemaVersion === 'b.city-object-pack.v1' && Array.isArray(data.variants) && data.variants.length > 0) {
    candidateCfg = data.variants[0].config || data.variants[0].blueprint?.parameters;
  } else if (data.parameters && (data.schemaVersion === 'b.city-object.v1' || data.schemaVersion === 'b.city-assembly.v1')) {
    candidateCfg = data.parameters;
  } else if (data.config && data.config.familyId) {
    candidateCfg = data.config;
  } else if (data.familyId) {
    candidateCfg = data;
  }

  if (!candidateCfg || !candidateCfg.familyId) {
    throw new Error('Could not find city object parameters in imported file');
  }
  if (!hasObjectFamily(candidateCfg.familyId)) {
    throw new Error(`Unknown city object family: ${candidateCfg.familyId}`);
  }
  if (data.schemaVersion === 'b.city-object.v1' || data.schemaVersion === 'b.city-assembly.v1') {
    const compat = checkBlueprintCompatibility(data);
    if (!compat.compatible) {
      throw new Error(compat.errors[0] || 'Incompatible blueprint payload');
    }
  }

  const next = sanitiseObjectConfig(candidateCfg);
  const sameFamily = currentState && currentState.familyId === next.familyId;

  for (const key of locks) {
    if (currentState && currentState[key] !== undefined) {
      if (sameFamily || COMMON_MATERIAL_KEYS.includes(key) || key === 'seed' || key === 'variationMode') {
        next[key] = copy(currentState[key]);
      }
    }
  }

  return sanitiseObjectConfig(next);
}

export function handleObjectFileImport(file, currentState, locks, onLoaded, toast) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const nextCfg = applyImportedObjectData(parsed, currentState, locks);
      if (onLoaded) onLoaded(nextCfg);
      if (toast) toast(`Imported ${nextCfg.familyId}`);
    } catch (err) {
      console.error('Import error:', err);
      if (toast) toast(`Import Failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}
