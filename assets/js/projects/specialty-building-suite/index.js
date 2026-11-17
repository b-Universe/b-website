import { $, copy } from '../utils.js';
import {
  BUILDING_CATEGORIES,
  ARCHITECTURAL_ERAS,
  CONDITION_LEVELS,
  LOT_TYPES,
  BASE_BUILDING_CONFIG,
  SHARED_CONTROL_TABS
} from '../config.js';
import { ensureSpecialtyBuildingRegistry } from '../families/register-all.js';
import {
  getAllSpecialtyFamilies,
  getAllSpecialtyPresets,
  getSpecialtyFamily,
  getSpecialtyPreset,
  searchSpecialtyCatalog,
  buildDefaultSpecialtyConfig,
  sanitiseSpecialtyConfig,
  applySpecialtyPresetWithLocks
} from '../core/registry.js';
import {
  createPlacementContext,
  registerBuildingFootprint,
  registerEntranceClearance,
  validateAndReservePlacement
} from '../core/placement-anchors.js';
import { randomizeSettings } from '../core/seeded-generation.js';
import { validateSpecialtyBlueprint } from '../core/blueprints.js';
import { createSpecialtyBuilding } from '../geometry/building-assembler.js';
import { createSpecialtyPreview } from './preview.js';
import { createSpecialtyControls } from './controls.js';
import {
  buildScopedExportRoot,
  exportSpecialtyGLB,
  exportSpecialtyBlueprint,
  exportSpecialtySettings
} from './export.js';

function showToast(msg) {
  const el = $('#spec-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

function updateStatsOverlay(buildingGroup) {
  const bp = buildingGroup?.userData?.blueprint;
  if (!bp) return;
  const setText = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  const bSize = bp.bounds?.buildingMeters?.size || { x: 0, y: 0, z: 0 };
  const lSize = bp.bounds?.lotMeters?.size || { x: 0, y: 0, z: 0 };
  const lotInfo = bp.layers?.layerB_PropertyLot;
  const gStats = bp.geometryStats || { totalMeshes: 0, totalTriangles: 0 };
  const deps = bp.objectDependencies || [];
  setText('#stat-dims', `${bSize.x}m x ${bSize.z}m x ${bSize.y}m`);
  setText('#stat-lot', lotInfo?.enabled ? `${lSize.x}m x ${lSize.z}m (${lotInfo.parkingStalls?.length || 0} Stalls)` : 'No Lot (Building Only)');
  setText('#stat-stats', `${gStats.totalMeshes} Meshes | ${gStats.totalTriangles} Tris`);
  setText('#stat-objects', `${deps.length} Props Placed | ${bp.entrances.length} Entrances`);
  setText('#spec-blueprint-preview', JSON.stringify({
    schemaVersion: bp.schemaVersion,
    familyId: bp.familyId,
    presetId: bp.presetId,
    seed: bp.seed,
    bounds: bp.bounds,
    entrances: bp.entrances,
    placementAnchorsCount: bp.placementAnchors.length,
    objectDependencies: deps,
    missingObjectDependencies: bp.missingObjectDependencies
  }, null, 2));
}

function specLoadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script')).find((s) => s.src === url);
    if (existing && (typeof THREE !== 'undefined')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

async function specEnsureThree() {
  if (typeof THREE === 'undefined') {
    await specLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
  }
  if (!THREE.OrbitControls) {
    await specLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
  }
  if (!THREE.GLTFExporter) {
    await specLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js');
  }
}

async function initSpecialtyBuildingStudio() {
  ensureSpecialtyBuildingRegistry();
  const canvasEl = $('#specialty-canvas');
  if (!canvasEl) return;

  try {
    await specEnsureThree();
  } catch (err) {
    console.error('Three.js load failed:', err);
    showToast('Failed To Load 3d Renderer');
    return;
  }
  if (typeof THREE === 'undefined') return;

  const state = copy(buildDefaultSpecialtyConfig('gas_station', 'modern_corporate_gas_station'));
  const locks = new Set();
  const preview = createSpecialtyPreview(canvasEl);

  let currentBuilding = null;
  let controlsUi = null;
  let rebuildScheduled = false;

  function rebuild(autoFrame = false) {
    currentBuilding = createSpecialtyBuilding(state, { locks });
    preview.setModel(currentBuilding, state);
    if (autoFrame) {
      preview.frameCamera('full');
    }
    updateStatsOverlay(currentBuilding);
    if (controlsUi) {
      controlsUi.refresh(currentBuilding.userData?.blueprint);
    }
  }

  function scheduleRebuild(autoFrame = false) {
    if (rebuildScheduled) return;
    rebuildScheduled = true;
    requestAnimationFrame(() => {
      rebuildScheduled = false;
      rebuild(autoFrame);
    });
  }

  controlsUi = createSpecialtyControls({
    state,
    locks,
    toast: showToast,
    getLatestBlueprint: () => currentBuilding?.userData?.blueprint || null,
    onStateChange(key, value) {
      state[key] = value;
      scheduleRebuild(key === 'lotType' || key === 'includeLot');
    },
    onSelectFamily(familyId) {
      const fam = getSpecialtyFamily(familyId);
      if (!fam || !fam.presets.length) return;
      const firstPreset = fam.presets[0];
      const next = applySpecialtyPresetWithLocks(state, firstPreset.id, locks);
      Object.assign(state, next);
      rebuild(true);
      showToast(`Selected ${fam.label}`);
    },
    onSelectPreset(presetId) {
      const preset = getSpecialtyPreset(presetId);
      if (!preset) return;
      const next = applySpecialtyPresetWithLocks(state, presetId, locks);
      Object.assign(state, next);
      rebuild(true);
      showToast(`Preset: ${preset.label}`);
    },
    onRandomizeSeed() {
      state.seed = Math.floor(Math.random() * 900000) + 1000;
      rebuild(false);
      showToast(`New Seed: ${state.seed}`);
    },
    onRandomizeAll() {
      const next = randomizeSettings(state, state.seed + 37, locks);
      Object.assign(state, next);
      rebuild(false);
      showToast(`Randomized Variation (${state.seed})`);
    },
    onResetPreset() {
      const next = buildDefaultSpecialtyConfig(state.familyId, state.presetId);
      Object.assign(state, next);
      rebuild(true);
      showToast('Reset To Clean Preset Defaults');
    },
    onExportGLB() {
      exportSpecialtyGLB(currentBuilding, state, showToast);
    },
    onExportBlueprint() {
      exportSpecialtyBlueprint(currentBuilding, state, showToast);
    },
    onExportSettings() {
      exportSpecialtySettings(state, showToast);
    },
    onImportParsed(parsed) {
      Object.assign(state, sanitiseSpecialtyConfig(parsed.settings));
      rebuild(true);
    }
  });

  // Preview Toolbar & Top Quick Actions
  const bindClick = (sel, fn) => {
    const el = $(sel);
    if (el) el.addEventListener('click', fn);
  };
  bindClick('#spec-top-rand', () => {
    const next = randomizeSettings(state, state.seed + 37, locks);
    Object.assign(state, next);
    rebuild(false);
    showToast(`Randomized Variation (${state.seed})`);
  });
  bindClick('#spec-top-seed', () => {
    state.seed = Math.floor(Math.random() * 900000) + 1000;
    rebuild(false);
    showToast(`New Seed: ${state.seed}`);
  });
  bindClick('#spec-top-bp', () => exportSpecialtyBlueprint(currentBuilding, state, showToast));
  bindClick('#spec-top-glb', () => exportSpecialtyGLB(currentBuilding, state, showToast));
  bindClick('#spec-fullscreen', () => {
    const el = $('.specialty-project-card') || document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });
  bindClick('#spec-cam-full', () => preview.frameCamera('full'));
  bindClick('#spec-cam-street', () => preview.frameCamera('street'));
  bindClick('#spec-cam-building', () => preview.frameCamera('building'));
  bindClick('#spec-cam-roof', () => preview.frameCamera('roof'));
  bindClick('#spec-btn-snapshot', () => preview.captureSnapshot(state));

  const chkTurn = $('#spec-toggle-turntable');
  if (chkTurn) chkTurn.addEventListener('change', () => preview.setTurntable(chkTurn.checked));
  const chkGrid = $('#spec-toggle-grid');
  if (chkGrid) chkGrid.addEventListener('change', () => preview.setGridVisible(chkGrid.checked));
  const chkHuman = $('#spec-toggle-human');
  if (chkHuman) chkHuman.addEventListener('change', () => preview.setScaleHumanVisible(chkHuman.checked));
  const chkGizmos = $('#spec-toggle-gizmos');
  if (chkGizmos) chkGizmos.addEventListener('change', () => preview.setGizmosVisible(chkGizmos.checked));
  const chkWire = $('#spec-toggle-wire');
  if (chkWire) chkWire.addEventListener('change', () => preview.setWireframe(chkWire.checked));
  const chkSil = $('#spec-toggle-sil');
  if (chkSil) chkSil.addEventListener('change', () => preview.setSilhouette(chkSil.checked));

  const btnTheatre = $('#spec-btn-theatre');
  if (btnTheatre) {
    btnTheatre.addEventListener('click', () => {
      document.body.classList.toggle('studio-theatre-mode');
      setTimeout(() => preview.resize(), 60);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 's') {
      state.seed = Math.floor(Math.random() * 900000) + 1000;
      rebuild(false);
    } else if (k === 'f') {
      preview.frameCamera('full');
    } else if (k === 't' && chkTurn) {
      chkTurn.checked = !chkTurn.checked;
      preview.setTurntable(chkTurn.checked);
    } else if (k === 'h' && chkHuman) {
      chkHuman.checked = !chkHuman.checked;
      preview.setScaleHumanVisible(chkHuman.checked);
    } else if (k === 'p') {
      preview.captureSnapshot(state);
    } else if (k === 'e') {
      exportSpecialtyGLB(currentBuilding, state, showToast);
    } else if (k === 'escape' && document.body.classList.contains('studio-theatre-mode')) {
      document.body.classList.remove('studio-theatre-mode');
      setTimeout(() => preview.resize(), 60);
    }
  });

  rebuild(true);
}

// Expose global headless & cross-tool API
ensureSpecialtyBuildingRegistry();

export const BSpecialtyBuildingSuite = {
  BUILDING_CATEGORIES,
  ARCHITECTURAL_ERAS,
  CONDITION_LEVELS,
  LOT_TYPES,
  BASE_BUILDING_CONFIG,
  SHARED_CONTROL_TABS,
  ensureSpecialtyBuildingRegistry,
  getAllSpecialtyFamilies,
  getAllSpecialtyPresets,
  getSpecialtyFamily,
  getSpecialtyPreset,
  searchSpecialtyCatalog,
  buildDefaultSpecialtyConfig,
  sanitiseSpecialtyConfig,
  applySpecialtyPresetWithLocks,
  createPlacementContext,
  registerBuildingFootprint,
  registerEntranceClearance,
  validateAndReservePlacement,
  createSpecialtyBuilding,
  validateSpecialtyBlueprint,
  buildScopedExportRoot,
  exportSpecialtyGLB
};

if (typeof window !== 'undefined') {
  window.BSpecialtyBuildingSuite = BSpecialtyBuildingSuite;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', initSpecialtyBuildingStudio);
  } else if ($('#specialty-canvas')) {
    initSpecialtyBuildingStudio();
  }
}
