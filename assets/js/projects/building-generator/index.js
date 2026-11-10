import { $, $$, clamp, copy, rng32, randInt, pick } from './utils.js';
import {
  STYLES,
  BASE,
  CONFIG_KEYS,
  PRESETS,
  OPTIONS,
  SCHEMA,
  CATEGORIES,
  MATERIAL_CHOICES,
  COLOR_CHOICES,
  BLUEPRINT_SCHEMA_VERSION,
  GENERATOR_META,
  STORAGE_KEY,
  getStyle,
  baseForStyle,
  sanitisePreset
} from './config.js';
import { segmentsForFloor, chooseFireEscapePlacement, getFireEscapeWallAnchor, makeSeg, subtractIntervals } from './core/layouts.js';
import {
  computeDefaultEntranceGameplay,
  computePrimaryEntranceLayout,
  computeCornerEntranceLayout,
  buildEntranceDefinition,
  computeBuildingEntrances
} from './core/entrances.js';
import { computeBuildingBounds, generateBuildingBlueprint, validateBuildingBlueprint } from './core/blueprints.js';
import {
  solid,
  puddleMaterial,
  glassMaterial,
  textureMaterial,
  clearMaterialCache,
  setMaterialLightingMode,
  setMaterialMaxAnisotropy
} from './geometry/materials.js';
import { box, slabBox, cylinder, line, sagCable, signboard, worldRoot } from './geometry/primitives.js';
import { overrideColor, pickWindowDamageMode, addWindow, addDoor, wallForSide, addCornerChamfer } from './geometry/facades.js';
import {
  addBalcony,
  addFireEscape,
  addAwning,
  addEntrance,
  addSetbackTerrace,
  addSurfaceWeathering,
  addVerticalDetails,
  addInteriors,
  addVines,
  addRoof,
  addRooftopProps
} from './geometry/details.js';
import { createBuilding } from './geometry/building.js';
import {
  renderControls,
  renderStylePicker,
  updateStylePicker,
  renderPresetList,
  updatePresetList,
  renderCustomPresets,
  randomizeSettings
} from './studio/controls.js';
import {
  createDebugLabelSprite,
  buildEntranceDebugGizmos,
  rebuildDebugOverlay,
  addStreetlamp,
  cityRoad,
  disposeObject,
  rebuildEnvironment,
  createBlockVariant,
  buildingAt,
  resetCamera,
  snapshot,
  toggleTheatreMode,
  isFullscreenActive,
  updateFullscreenUI,
  enterFullscreenViewport,
  exitFullscreenViewport,
  toggleFullscreenViewport,
  handleStudioKeydown,
  handleFullscreenChange
} from './studio/preview.js';
import {
  fileDownload,
  safeName,
  exportBlueprint,
  exportJSON,
  exportGLB,
  applyImportedBuildingData,
  handleFileImport
} from './studio/export.js';

// Studio State
let state = { ...copy(BASE), ...copy(PRESETS.paragon_brick) };
Object.assign(state, computeDefaultEntranceGameplay(state));
delete state.label;

let activeBlueprintName = null;
let locks = new Set();
let activeTab = 'form';
let activePreset = 'paragon_brick';
let savedPresets = {};
const view = {
  mode: 'single',
  lighting: 'day',
  environment: 'street',
  grid: true,
  autoRotate: false,
  wireframe: false,
  entranceDebug: false,
  theatre: false,
  fullscreen: false
};

let scene, camera, renderer, orbit, buildingGroup, environmentGroup, debugGroup, hemi, sun, ambient, groundGrid;
let lastCameraTarget = null;
let refocusAfterBuild = false;
let buildStats = { buildings: 1, triangles: 0 };
let renderScheduled = false;
let ready = false;

export function toast(message) {
  const container = $('#studio-toasts');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'studio-toast';
  item.textContent = message;
  container.appendChild(item);
  setTimeout(() => item.remove(), 3300);
}

export function loadPreset(data, name, id = null, bpName = null) {
  state = sanitisePreset(data);
  activePreset = id;
  activeBlueprintName = bpName;
  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = String(state.seed);
  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderStudioControls();
  if (ready) {
    refocusAfterBuild = true;
    scheduleRebuild();
  }
  toast('Loaded ' + name);
}

function renderStudioControls() {
  const panel = $('#tab-content');
  renderControls(panel, activeTab, state, locks, {
    view,
    toggleEntranceDebug,
    renderControls: renderStudioControls,
    scheduleRebuild,
    toast,
    onSettingChanged: (key) => {
      if (!['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) {
        activePreset = null;
        updatePresetList(activePreset);
      }
    }
  });
}

export function randomize(category) {
  randomizeSettings(category, state, locks, {
    onResetActivePreset: () => {
      activePreset = null;
      activeBlueprintName = null;
      updatePresetList(activePreset);
      refocusAfterBuild = true;
    },
    renderControlsUI: () => renderStudioControls(),
    scheduleRebuild: () => scheduleRebuild(),
    toast: (msg) => toast(msg)
  });
}

function saveCustom() {
  const input = $('#custom-name');
  const name = input ? input.value.trim() : '';
  if (!name) {
    toast('Give this building a name first');
    return;
  }
  savedPresets[name] = copy(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
  } catch {
    toast('Storage unavailable - use JSON export instead');
    return;
  }
  if (input) input.value = '';
  renderCustomPresetsList();
  toast('Saved ' + name);
}

function renderCustomPresetsList() {
  const panel = $('#custom-presets');
  renderCustomPresets(
    panel,
    savedPresets,
    (presetData, name) => loadPreset(presetData, name),
    (name) => {
      delete savedPresets[name];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
      } catch {}
      renderCustomPresetsList();
    }
  );
}

export function setEntranceDebug(active) {
  view.entranceDebug = Boolean(active);
  $('#btn-entrance-debug')?.classList.toggle('active', view.entranceDebug);
  const chk = $('#entrance-debug-toggle');
  if (chk) chk.checked = view.entranceDebug;
  if (activeTab === 'features') renderStudioControls();
  if (ready) {
    rebuildDebugOverlay(debugGroup, view, buildingGroup);
  }
  toast(view.entranceDebug ? 'Entrance debug gizmos enabled (E)' : 'Entrance debug gizmos hidden');
}

export function toggleEntranceDebug() {
  setEntranceDebug(!view.entranceDebug);
}

export function scheduleRebuild() {
  if (!ready || renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    rebuild();
  });
}

export function rebuild() {
  if (!ready) return;
  const wasMode = buildStats.mode;
  disposeObject(buildingGroup);
  disposeObject(environmentGroup);
  clearMaterialCache();
  const mode = view.mode;
  let count = 1;

  if (mode === 'single') {
    buildingAt(buildingGroup, createBuilding, state, 0, 0, 0, 0);
  } else if (mode === 'compare') {
    for (let i = -1; i <= 1; i++) {
      const cfg = { ...copy(state), seed: state.seed + (i + 1) * 7919 };
      cfg.width = clamp(state.width + (i === 0 ? 0 : i * 1.1), 6, 32);
      cfg.floors = clamp(state.floors + (i === 0 ? 0 : i), 1, 14);
      cfg.inspectedFloor = 0;
      buildingAt(buildingGroup, createBuilding, cfg, i * Math.max(26, state.width + 7), 0, 0, i + 1);
    }
    count = 3;
  } else {
    const perSide = 5;
    const sidewalkLineZ = 11.4;
    for (let side = 0; side < 2; side++) {
      const rowConfigs = [];
      const effWidths = [];
      for (let n = 0; n < perSide; n++) {
        const cfg = createBlockVariant(state, side, n, perSide, locks);
        const extW = cfg.width * ((cfg.extension >= 2 ? 0.24 : 0) + (cfg.extension >= 3 ? 0.24 : 0));
        rowConfigs.push(cfg);
        effWidths.push(cfg.width + extW);
      }

      const gap = 3.6;
      const totalSpan = effWidths.reduce((acc, w) => acc + w, 0) + gap * (perSide - 1);
      let cursorX = -totalSpan * 0.5;

      for (let n = 0; n < perSide; n++) {
        const cfg = rowConfigs[n];
        const wEff = effWidths[n];
        const xCenter = cursorX + wEff * 0.5;
        cursorX += wEff + gap;

        const zCenter = side === 0
          ? -(sidewalkLineZ + cfg.depth * 0.5)
          : (sidewalkLineZ + cfg.depth * 0.5);
        const rotY = side === 0 ? 0 : Math.PI;
        buildingAt(buildingGroup, createBuilding, cfg, xCenter, zCenter, rotY, side * perSide + n);
      }
    }
    count = 10;
  }

  buildStats = { mode, buildings: count };
  rebuildEnvironment(environmentGroup, view, state);
  rebuildDebugOverlay(debugGroup, view, buildingGroup);

  buildingGroup.traverse((obj) => {
    if (obj.isMesh && obj.material) obj.material.wireframe = view.wireframe;
  });

  const bldgStat = $('#stat-buildings');
  if (bldgStat) bldgStat.textContent = count;
  const floorsStat = $('#stat-floors');
  if (floorsStat) floorsStat.textContent = state.floors;

  let triangles = 0;
  buildingGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      triangles += obj.geometry.index ? obj.geometry.index.count / 3 : obj.geometry.attributes.position.count / 3;
    }
  });
  const triStat = $('#stat-triangles');
  if (triStat) triStat.textContent = Math.round(triangles).toLocaleString('en-US');

  const statusEl = $('#render-status');
  if (statusEl) {
    statusEl.textContent = mode === 'block' ? 'NEIGHBORHOOD VIEW' : mode === 'compare' ? 'THREE VARIATIONS' : 'LIVE MODEL';
  }

  if (wasMode !== mode || !lastCameraTarget || refocusAfterBuild) {
    lastCameraTarget = resetCamera(camera, orbit, buildingGroup);
    refocusAfterBuild = false;
  }
  $('#studio-loading')?.classList.add('hidden');
}

export function resizeRenderer() {
  if (!renderer) return;
  const area = $('#building-stage');
  if (!area) return;
  const w = Math.max(1, area.clientWidth);
  const h = Math.max(1, area.clientHeight);
  const size = new THREE.Vector2();
  renderer.getSize(size);
  if (size.x !== w || size.y !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

export function updateLighting() {
  if (!scene) return;
  const mode = view.lighting;
  setMaterialLightingMode(mode);
  if (mode === 'day') {
    scene.background.set('#0e2230');
    scene.fog.color.set('#0e2230');
    hemi.intensity = 0.95;
    ambient.intensity = 0.36;
    sun.intensity = 1.3;
    sun.color.set('#fff1d1');
    sun.position.set(28, 45, 20);
  } else if (mode === 'evening') {
    scene.background.set('#211d2d');
    scene.fog.color.set('#211d2d');
    hemi.intensity = 0.55;
    ambient.intensity = 0.32;
    sun.intensity = 0.95;
    sun.color.set('#ffc78b');
    sun.position.set(29, 17, -14);
  } else {
    scene.background.set('#080f22');
    scene.fog.color.set('#080f22');
    hemi.intensity = 0.32;
    ambient.intensity = 0.2;
    sun.intensity = 0.35;
    sun.color.set('#9ca9ec');
    sun.position.set(-17, 25, 12);
  }
}

export function initScene() {
  const canvas = $('#building-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#0c1b29', 1);

  if (renderer.capabilities?.getMaxAnisotropy) {
    setMaterialMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1b29');
  scene.fog = new THREE.Fog('#0c1b29', 70, 155);

  camera = new THREE.PerspectiveCamera(47, 1, 0.1, 500);
  camera.position.set(28, 20, 30);

  orbit = new THREE.OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.07;
  orbit.minDistance = 8;
  orbit.maxDistance = 160;
  orbit.maxPolarAngle = Math.PI * 0.49;
  orbit.target.set(0, 8, 0);

  buildingGroup = worldRoot(scene);
  environmentGroup = worldRoot(scene);
  debugGroup = worldRoot(scene);
  debugGroup.name = 'EntranceDebugOverlay';

  hemi = new THREE.HemisphereLight('#d6ecff', '#27302e', 0.85);
  scene.add(hemi);
  ambient = new THREE.AmbientLight('#ffffff', 0.4);
  scene.add(ambient);
  sun = new THREE.DirectionalLight('#ffe3b5', 1.25);
  sun.position.set(28, 46, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 190;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  updateLighting();

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(resizeRenderer);
    const stage = $('#building-stage');
    if (stage) observer.observe(stage);
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  ready = true;
  rebuild();

  function tick() {
    requestAnimationFrame(tick);
    if (!renderer || !scene) return;
    orbit.autoRotate = view.autoRotate;
    orbit.autoRotateSpeed = 0.45;
    orbit.update();
    renderer.render(scene, camera);
  }
  tick();
}

function handleKeyDownEvent(e) {
  handleStudioKeydown(e, {
    toggleFullscreen: () => toggleFullscreenViewport(view, toast, resizeRenderer),
    toggleTheatre: () => toggleTheatreMode(view, toast, resizeRenderer),
    toggleEntranceDebug,
    snapshot: () => snapshot(renderer, scene, camera, state, ready, toast),
    exitFullscreen: () => exitFullscreenViewport(view, toast, resizeRenderer)
  });
}

function handleFullscreenChangeEvent() {
  handleFullscreenChange(view, resizeRenderer);
}

export function initUI() {
  renderStylePicker($('#style-picker'), state.style, (presetData, name, id) => loadPreset(presetData, name, id));
  renderPresetList($('#preset-list'), activePreset, (presetData, name, id) => loadPreset(presetData, name, id));
  renderStudioControls();

  $$('.studio-tab').forEach((btn) => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    $$('.studio-tab').forEach((t) => {
      const on = t === btn;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    renderStudioControls();
  }));

  const seedInput = $('#seed-input');
  if (seedInput) {
    seedInput.value = String(state.seed);
    seedInput.addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number(seedInput.value) || 1337), 1, 99999999);
      seedInput.value = state.seed;
      activePreset = null;
      updatePresetList(activePreset);
      scheduleRebuild();
    });
  }

  const btnNewSeed = $('#btn-new-seed');
  if (btnNewSeed) {
    btnNewSeed.onclick = () => {
      state.seed = Math.floor(Math.random() * 99999998) + 1;
      if (seedInput) seedInput.value = state.seed;
      activePreset = null;
      updatePresetList(activePreset);
      scheduleRebuild();
      toast('New seed: ' + state.seed);
    };
  }

  const btnRandomAll = $('#btn-random-all');
  if (btnRandomAll) {
    btnRandomAll.onclick = () => randomize('all');
  }

  $$('[data-random]').forEach((b) => b.addEventListener('click', () => randomize(b.dataset.random)));

  $$('.view-mode').forEach((b) => b.addEventListener('click', () => {
    view.mode = b.dataset.mode;
    $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn === b));
    scheduleRebuild();
  }));

  $('#btn-reset-camera')?.addEventListener('click', () => {
    if (ready) resetCamera(camera, orbit, buildingGroup);
  });

  $('#btn-rotate')?.addEventListener('click', () => {
    view.autoRotate = !view.autoRotate;
    if (orbit) orbit.autoRotate = view.autoRotate;
    $('#btn-rotate')?.classList.toggle('active', view.autoRotate);
    toast(view.autoRotate ? 'Turntable on' : 'Turntable off');
  });

  $('#btn-wireframe')?.addEventListener('click', () => {
    view.wireframe = !view.wireframe;
    $('#btn-wireframe')?.classList.toggle('active', view.wireframe);
    scheduleRebuild();
  });

  $('#btn-entrance-debug')?.addEventListener('click', toggleEntranceDebug);
  $('#entrance-debug-toggle')?.addEventListener('change', (e) => {
    setEntranceDebug(Boolean(e.target.checked));
  });

  $('#lighting-select')?.addEventListener('change', (e) => {
    view.lighting = e.target.value;
    updateLighting();
    scheduleRebuild();
  });

  $('#environment-select')?.addEventListener('change', (e) => {
    view.environment = e.target.value;
    rebuildEnvironment(environmentGroup, view, state);
  });

  $('#ground-grid')?.addEventListener('change', (e) => {
    view.grid = e.target.checked;
    rebuildEnvironment(environmentGroup, view, state);
  });

  $('#btn-save-custom')?.addEventListener('click', saveCustom);

  const doExportBlueprint = () => {
    const customName = $('#custom-name')?.value?.trim();
    exportBlueprint(state, {
      customName,
      activeBlueprintName,
      activePreset,
      toast
    });
  };
  $('#btn-export-blueprint')?.addEventListener('click', doExportBlueprint);
  $('#btn-export-blueprint-top')?.addEventListener('click', doExportBlueprint);

  const doExportJSON = () => exportJSON(state, { toast });
  $('#btn-export-json')?.addEventListener('click', doExportJSON);

  $('#btn-import-json')?.addEventListener('click', () => $('#file-import')?.click());
  $('#file-import')?.addEventListener('change', (e) => {
    handleFileImport(e, (settings, name, presetId, bpName) => {
      loadPreset(settings, name, presetId, bpName);
    }, toast);
  });

  const doExportGLB = () => exportGLB(state, createBuilding, {
    isReady: ready,
    loadExporter,
    toast,
    setExportButtonDisabled: (disabled) => {
      const btn1 = $('#btn-export-glb');
      const btn2 = $('#btn-export-glb-side');
      if (btn1) btn1.disabled = disabled;
      if (btn2) btn2.disabled = disabled;
    }
  });
  $('#btn-export-glb')?.addEventListener('click', doExportGLB);
  $('#btn-export-glb-side')?.addEventListener('click', doExportGLB);

  const doSnapshot = () => snapshot(renderer, scene, camera, state, ready, toast);
  $('#btn-screenshot')?.addEventListener('click', doSnapshot);
  $('#btn-screenshot-side')?.addEventListener('click', doSnapshot);
  $('#btn-stage-snapshot')?.addEventListener('click', doSnapshot);

  $('#btn-theatre')?.addEventListener('click', () => toggleTheatreMode(view, toast, resizeRenderer));
  $('#btn-theatre-quick')?.addEventListener('click', () => toggleTheatreMode(view, toast, resizeRenderer));
  $('#btn-fullscreen')?.addEventListener('click', () => toggleFullscreenViewport(view, toast, resizeRenderer));
  $('#btn-fullscreen-quick')?.addEventListener('click', () => toggleFullscreenViewport(view, toast, resizeRenderer));

  window.addEventListener('keydown', handleKeyDownEvent);
  document.addEventListener('fullscreenchange', handleFullscreenChangeEvent);

  try {
    savedPresets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    savedPresets = {};
  }
  renderCustomPresetsList();
}

function loadScript(url, check, timeout = 14000) {
  if (check()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    let done = false;
    const timer = setTimeout(() => finish(new Error('Timed out loading ' + url)), timeout);
    function finish(error) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    }
    script.onload = () => (check() ? finish() : finish(new Error('Library loaded but expected feature is missing')));
    script.onerror = () => finish(new Error('Unable to load ' + url));
    document.head.appendChild(script);
  });
}

async function loadOneOf(urls, check) {
  if (check()) return;
  let lastError = null;
  for (const url of urls) {
    try {
      await loadScript(url, check);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Missing 3D dependency');
}

export async function loadDependencies() {
  await loadOneOf([
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ], () => !!window.THREE?.WebGLRenderer);
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
  ], () => !!window.THREE?.OrbitControls);
}

export async function loadExporter() {
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
    'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js'
  ], () => !!window.THREE?.GLTFExporter);
}

export function showLoadError(error) {
  console.error('Unable to start B Building Generator', error);
  const screen = $('#studio-loading');
  if (!screen) return;
  screen.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = '3D preview unavailable';
  const body = document.createElement('span');
  body.textContent = 'The Three.js library could not be loaded. Check your connection and reload this page.';
  const detail = document.createElement('span');
  detail.textContent = error.message;
  screen.append(title, body, detail);
  const statusEl = $('#render-status');
  if (statusEl) statusEl.textContent = 'LIBRARY ERROR';
}

window.BBuildingBlueprint = {
  SCHEMA_VERSION: BLUEPRINT_SCHEMA_VERSION,
  GENERATOR_META: copy(GENERATOR_META),
  computeDefaultEntranceGameplay,
  computePrimaryEntranceLayout,
  computeCornerEntranceLayout,
  computeBuildingEntrances,
  computeBuildingBounds,
  generateBuildingBlueprint,
  validateBuildingBlueprint,
  applyImportedBuildingData: (parsed, sourceLabel = 'Imported building') => {
    return applyImportedBuildingData(parsed, sourceLabel, (settings, name, presetId, bpName) => {
      loadPreset(settings, name, presetId, bpName);
    });
  },
  segmentsForFloor,
  createBuilding
};

if (typeof document !== 'undefined') {
  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
}
