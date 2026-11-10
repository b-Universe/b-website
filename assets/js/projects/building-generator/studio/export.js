import { generateBuildingBlueprint, validateBuildingBlueprint } from '../core/blueprints.js';
import { getStyle, PRESETS } from '../config.js';

export function fileDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const safeName = (state) => String(state.style) + '-' + String(state.seed);

export function exportBlueprint(state, options = {}) {
  const { customName, activeBlueprintName, activePreset, toast } = options;
  const bpName = customName || activeBlueprintName || (activePreset && PRESETS[activePreset]?.label) || `${getStyle(state.style).label} #${state.seed}`;
  const blueprint = generateBuildingBlueprint(state, { name: bpName });
  fileDownload(
    new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' }),
    'b-building-' + safeName(state) + '.building.json'
  );
  if (toast) toast('Building Blueprint (.building.json) exported');
  return blueprint;
}

export function exportJSON(state, options = {}) {
  const { toast } = options;
  fileDownload(
    new Blob([JSON.stringify({ generator: 'B-3D-Building-Generator', version: 1, settings: state }, null, 2)], { type: 'application/json' }),
    'b-building-' + safeName(state) + '.json'
  );
  if (toast) toast('Building settings exported');
}

export async function exportGLB(state, createBuilding, options = {}) {
  const { isReady, loadExporter, toast, setExportButtonDisabled } = options;
  if (!isReady) {
    if (toast) toast('The 3D generator is not ready');
    return;
  }
  if (setExportButtonDisabled) setExportButtonDisabled(true);
  try {
    if (loadExporter) await loadExporter();
    const group = createBuilding(state);
    group.userData = { preset: state.style, seed: state.seed, floors: state.floors };
    const exporter = new THREE.GLTFExporter();
    const data = await new Promise((resolve, reject) => {
      try {
        exporter.parse(group, resolve, { binary: true, onlyVisible: true, truncateDrawRange: true }, reject);
      } catch (e) {
        reject(e);
      }
    });
    fileDownload(new Blob([data], { type: 'model/gltf-binary' }), 'b-building-' + safeName(state) + '.glb');
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    if (toast) toast('Building model exported');
  } catch (error) {
    console.error('Building export failed', error);
    if (toast) toast('GLB export failed: ' + error.message);
  } finally {
    if (setExportButtonDisabled) setExportButtonDisabled(false);
  }
}

export function applyImportedBuildingData(parsed, sourceLabel = 'Imported building', onLoadPreset) {
  const validation = validateBuildingBlueprint(parsed);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
  if (onLoadPreset) {
    onLoadPreset(validation.settings, validation.blueprint.name || sourceLabel, null, validation.blueprint.name || null);
  }
  return validation.blueprint;
}

export async function handleFileImport(e, onLoadPreset, toast) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyImportedBuildingData(parsed, file.name, onLoadPreset);
  } catch (err) {
    if (toast) toast('Cannot import file: ' + err.message);
  }
  e.target.value = '';
}
