import { B_UNITS_PER_METER } from '../config.js';
import { copy, slugify } from '../utils.js';
import { generateSpecialtyBlueprint, validateSpecialtyBlueprint } from '../core/blueprints.js';
import { getSpecialtyFamily, sanitiseSpecialtyConfig } from '../core/registry.js';

export const SPECIALTY_STORAGE_KEY = 'b.specialtyBuildingSuite.savedConfigs.v1';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function buildScopedExportRoot(buildingGroup, state = {}) {
  const scope = state.exportScope || 'complete_property';
  const wrap = new THREE.Group();
  wrap.name = `SpecialtyBuildingExport_${slugify(state.presetId || state.familyId || 'building')}`;

  const layerA = buildingGroup.getObjectByName('LayerA_BuildingStructure');
  const layerB = buildingGroup.getObjectByName('LayerB_PropertyLot');
  const layerC = buildingGroup.getObjectByName('LayerC_EnvironmentalObjects');

  if (scope === 'building_only') {
    const mainBlock = buildingGroup.getObjectByName('MainBuilding');
    if (mainBlock) wrap.add(mainBlock.clone(true));
    else if (layerA) wrap.add(layerA.clone(true));
  } else if (scope === 'building_and_attached' || scope === 'building') {
    if (layerA) wrap.add(layerA.clone(true));
  } else if (scope === 'building_and_objects') {
    if (layerA) wrap.add(layerA.clone(true));
    if (layerC) wrap.add(layerC.clone(true));
  } else if (scope === 'lot') {
    if (layerB) wrap.add(layerB.clone(true));
  } else if (scope === 'objects') {
    if (layerC) wrap.add(layerC.clone(true));
  } else {
    for (const child of buildingGroup.children) {
      wrap.add(child.clone(true));
    }
  }

  // Optional coordinate & scale transforms for B Remastered vs standard metric Y-up
  if (state.exportUnits === 'b_units') {
    wrap.scale.setScalar(B_UNITS_PER_METER);
  }
  if (state.exportAxis === 'z_up') {
    wrap.rotation.x = Math.PI / 2;
  }
  wrap.updateMatrixWorld(true);
  return wrap;
}

export function exportSpecialtyGLB(buildingGroup, state, toast) {
  if (!buildingGroup) {
    if (toast) toast('Nothing To Export Yet');
    return;
  }
  if (typeof THREE === 'undefined' || !THREE.GLTFExporter) {
    if (toast) toast('Gltf Exporter Not Available');
    return;
  }

  const exportRoot = buildScopedExportRoot(buildingGroup, state);
  const exporter = new THREE.GLTFExporter();
  const scopeSuffix = state.exportScope && state.exportScope !== 'complete_property' ? `-${state.exportScope}` : '';
  const baseName = `specialty-${slugify(state.presetId || state.familyId || 'building')}${scopeSuffix}-${state.seed || 1}`;

  try {
    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          triggerDownload(blob, `${baseName}.glb`);
          if (toast) toast(`Exported ${baseName}.glb`);
        } else {
          const json = JSON.stringify(result, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          triggerDownload(blob, `${baseName}.gltf`);
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

export function exportSpecialtyBlueprint(buildingGroup, state, toast) {
  const bp = buildingGroup?.userData?.blueprint || generateSpecialtyBlueprint(state, buildingGroup, buildingGroup?.userData?.placementCtx, {
    entrances: buildingGroup?.userData?.entrances || [],
    objectPlacements: buildingGroup?.userData?.objectPlacements || [],
    missingDependencies: buildingGroup?.userData?.missingDependencies || []
  });
  const baseName = `specialty-${slugify(state.presetId || state.familyId || 'building')}-${state.seed || 1}`;
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${baseName}.specialty.json`);
  if (toast) toast(`Exported ${baseName}.specialty.json`);
  return bp;
}

export function exportSpecialtySettings(state, toast) {
  const payload = copy(sanitiseSpecialtyConfig(state));
  const baseName = `specialty-preset-${slugify(state.presetId || state.familyId || 'building')}-${state.seed || 1}`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${baseName}.json`);
  if (toast) toast(`Exported ${baseName}.json`);
  return payload;
}

export function loadSavedSpecialtyConfigs() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SPECIALTY_STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function saveSpecialtyConfig(name, state) {
  const list = loadSavedSpecialtyConfigs();
  const fam = getSpecialtyFamily(state.familyId);
  const entry = {
    id: `saved_${Date.now()}`,
    name: name || `${fam?.label || state.familyId} #${list.length + 1}`,
    savedAt: new Date().toISOString(),
    config: sanitiseSpecialtyConfig(state)
  };
  list.unshift(entry);
  const trimmed = list.slice(0, 25);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPECIALTY_STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (_) {
    // Ignore storage quota errors
  }
  return entry;
}

export function deleteSavedSpecialtyConfig(id) {
  const next = loadSavedSpecialtyConfigs().filter((item) => item.id !== id);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPECIALTY_STORAGE_KEY, JSON.stringify(next));
    }
  } catch (_) {}
  return next;
}

export function parseImportedSpecialtyJson(rawText) {
  const data = JSON.parse(rawText);
  if (data && (data.schemaVersion === 'b.specialty-building.v1' || data.settings)) {
    const checked = validateSpecialtyBlueprint(data);
    if (!checked.valid) {
      throw new Error(checked.errors.join('; '));
    }
    return { kind: 'blueprint', settings: checked.settings, blueprint: checked.blueprint };
  }
  return { kind: 'settings', settings: sanitiseSpecialtyConfig(data) };
}
