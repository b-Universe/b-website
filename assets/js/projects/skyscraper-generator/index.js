import { $, $$, clamp, copy } from '../utils.js';
import {
  STORAGE_KEY,
  BLUEPRINT_SCHEMA_VERSION,
  GENERATOR_META,
  BASE,
  PRESETS,
  getStyle,
  sanitiseConfig,
  applyPresetWithLocks,
  applySeedVariation
} from '../config.js';
import {
  setSkyscraperMaxAnisotropy,
  clearSkyscraperMaterialCache,
  reapplySkyscraperMaterials
} from '../materials/materials.js';
import { resolveTowerComplex } from '../core/towers.js';
import { computeSkyscraperEntrances } from '../core/entrances.js';
import {
  computeSkyscraperBounds,
  generateSkyscraperBlueprint,
  validateSkyscraperBlueprint
} from '../core/blueprints.js';
import { createSkyscraper } from '../geometry/skyscraper.js';
import {
  disposeObject,
  rebuildSkyscraperDebugOverlay,
  rebuildEnvironment,
  resetCameraForFocus,
  snapshot,
  toggleSkyTheatreMode,
  exitSkyFullscreenViewport,
  toggleSkyFullscreenViewport,
  handleSkyFullscreenChange,
  handleSkyStudioKeydown
} from './studio/preview.js';
import {
  fileDownload,
  safeSkyscraperName,
  exportSkyscraperBlueprint,
  exportSkyscraperJSON,
  exportSkyscraperGLB,
  applyImportedSkyscraperData,
  handleSkyscraperFileImport
} from './studio/export.js';
import {
  renderStylePicker,
  updateStylePicker,
  renderPresetList,
  updatePresetList,
  renderCustomPresets,
  randomizeSettings,
  renderControls
} from './studio/controls.js';

let state = sanitiseConfig({ ...copy(BASE), ...copy(PRESETS.art_deco_monumental) });
let activePreset = 'art_deco_monumental';
let lastLoadedPresetId = 'art_deco_monumental';
let seedDerivedFromPreset = true;
let activeBlueprintName = null;
let activeTab = 'structure';
let selectedSectionIndex = 0;
let locks = new Set();

const view = {
  focus: 'full',
  autoRotate: false,
  silhouetteMode: false,
  wireframe: false,
  entranceDebug: false,
  theatre: false,
  fullscreen: false,
  environment: 'city',
  grid: true
};

let renderer = null;
let scene = null;
let camera = null;
let orbit = null;
let hemi = null;
let ambient = null;
let sun = null;
let fillLight = null;
let complexGroup = null;
let environmentGroup = null;
let debugGroup = null;
let ready = false;
let rebuildTimer = null;

function toast(msg) {
  const host = $('#studio-toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'studio-toast';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3200);
}

function setStatus(msg) {
  const el = $('#render-status');
  if (el) el.textContent = msg;
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const stage = $('#skyscraper-stage');
  if (!stage) return;
  const w = Math.max(240, stage.clientWidth || 640);
  const h = Math.max(240, stage.clientHeight || 480);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function updateLighting() {
  if (!scene || !hemi || !ambient || !sun || !fillLight) return;
  const mode = state.lightingTime || 'day';

  if (mode === 'golden_hour') {
    scene.background.set('#282534');
    scene.fog.color.set('#282534');
    hemi.intensity = 0.85;
    hemi.color.set('#ffd29d');
    ambient.intensity = 0.38;
    sun.intensity = 1.45;
    sun.color.set('#ffb86c');
    sun.position.set(160, 88, 95);
    fillLight.intensity = 0.45;
  } else if (mode === 'dusk') {
    scene.background.set('#141c2c');
    scene.fog.color.set('#141c2c');
    hemi.intensity = 0.56;
    hemi.color.set('#96b8e8');
    ambient.intensity = 0.28;
    sun.intensity = 0.7;
    sun.color.set('#ff9e78');
    sun.position.set(-130, 62, 110);
    fillLight.intensity = 0.35;
  } else if (mode === 'night') {
    scene.background.set('#070d18');
    scene.fog.color.set('#070d18');
    hemi.intensity = 0.34;
    hemi.color.set('#7594c7');
    ambient.intensity = 0.22;
    sun.intensity = 0.45;
    sun.color.set('#96b2eb');
    sun.position.set(-110, 140, 80);
    fillLight.intensity = 0.28;
  } else {
    scene.background.set('#0f2030');
    scene.fog.color.set('#0f2030');
    hemi.intensity = 0.68;
    hemi.color.set('#dceeff');
    ambient.intensity = 0.28;
    sun.intensity = 1.04;
    sun.color.set('#ffe7c2');
    sun.position.set(145, 220, 130);
    fillLight.intensity = 0.24;
  }
}

function updateStats(bp) {
  if (!bp) return;
  const tEl = $('#stat-towers');
  const tUnitEl = $('#stat-towers-unit');
  const fEl = $('#stat-floors');
  const fUnitEl = $('#stat-floors-unit');
  const hEl = $('#stat-height');
  const triEl = $('#stat-triangles');
  const sceneLbl = $('#scene-label');
  const styleTag = $('#active-style-name');

  const towerCount = bp.bounds?.towerCount || 1;
  if (tEl) tEl.textContent = String(towerCount);
  if (tUnitEl) tUnitEl.textContent = towerCount === 1 ? 'tower' : 'towers';
  if (fEl) fEl.textContent = String(bp.bounds?.totalFloors || 0);
  if (fUnitEl) {
    fUnitEl.textContent = (towerCount > 1 && bp.bounds?.maxTowerFloors)
      ? `floors (${bp.bounds.maxTowerFloors} max)`
      : 'floors';
  }
  if (hEl) hEl.textContent = `${Math.round(bp.bounds?.meters?.height || 0)}m`;
  if (triEl) triEl.textContent = (bp.geometryStats?.triangles || 0).toLocaleString();
  if (styleTag) styleTag.textContent = bp.styleLabel || 'Custom Skyscraper';
  if (sceneLbl) {
    const refId = activePreset || lastLoadedPresetId;
    const idx = Math.max(1, Object.keys(PRESETS).indexOf(refId) + 1);
    const numStr = String(idx).padStart(2, '0');
    sceneLbl.textContent = `${numStr} / ${bp.styleLabel || 'Custom Skyscraper'}`;
  }
}

function refreshMaterialsInPlace() {
  if (!ready || !complexGroup) return;
  reapplySkyscraperMaterials(complexGroup, state, {
    silhouetteMode: view.silhouetteMode,
    wireframe: view.wireframe,
    lightingTime: state.lightingTime
  });
  setStatus(view.silhouetteMode ? 'Silhouette Massing Mode' : 'Ready');
}

export function rebuild(resetCam = false) {
  if (!ready || !scene || !complexGroup) return;
  disposeObject(complexGroup);
  clearSkyscraperMaterialCache();

  const built = createSkyscraper(state, { lightingTime: state.lightingTime });
  while (built.children.length > 0) {
    const ch = built.children[0];
    built.remove(ch);
    complexGroup.add(ch);
  }
  complexGroup.userData.blueprint = built.userData.blueprint;
  complexGroup.userData.complex = built.userData.complex;

  reapplySkyscraperMaterials(complexGroup, state, {
    silhouetteMode: view.silhouetteMode,
    wireframe: view.wireframe,
    lightingTime: state.lightingTime
  });

  const bp = built.userData.blueprint;
  updateStats(bp);
  rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  rebuildSkyscraperDebugOverlay(debugGroup, complexGroup, state, view.entranceDebug);

  // Expand shadow camera bounds to cover multi-tower footprints
  if (sun && bp?.bounds?.meters) {
    const shadowHalf = Math.max(85, bp.bounds.meters.plazaWidth * 0.9, bp.bounds.meters.height * 0.7);
    sun.shadow.camera.left = -shadowHalf;
    sun.shadow.camera.right = shadowHalf;
    sun.shadow.camera.top = shadowHalf;
    sun.shadow.camera.bottom = -shadowHalf;
    sun.shadow.camera.far = Math.max(450, shadowHalf * 3.5);
    sun.shadow.camera.updateProjectionMatrix();
  }

  if (resetCam) {
    resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  }
  setStatus(view.silhouetteMode ? 'Silhouette Massing Mode' : 'Ready');
}

function scheduleRebuild(immediate = false, resetCam = false) {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
  if (immediate) {
    rebuild(resetCam);
    return;
  }
  setStatus('Updating Massing...');
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    rebuild(resetCam);
  }, 55);
}

export function loadPreset(presetData, name = 'Preset', presetId = null, customBlueprintName = null) {
  state = applyPresetWithLocks(state, presetData, locks);
  activePreset = presetId;
  seedDerivedFromPreset = Boolean(presetId && PRESETS[presetId]);
  if (presetId) lastLoadedPresetId = presetId;
  else if (state.style) lastLoadedPresetId = state.style;
  activeBlueprintName = customBlueprintName;
  selectedSectionIndex = clamp(selectedSectionIndex, 0, Math.max(0, state.sections.length - 1));

  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = String(state.seed);
  const varSel = $('#variation-strength-select');
  if (varSel) varSel.value = state.variationStrength || 'moderate';
  const lightSel = $('#lighting-select');
  if (lightSel) lightSel.value = state.lightingTime || 'day';

  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderStudioControls();
  updateLighting();
  rebuild(true);
  toast(`Loaded ${name}`);
}

function renderStudioControls() {
  renderControls(activeTab, $('#tab-content'), state, locks, {
    activePreset,
    selectedSectionIndex,
    onSelectSection: (idx) => {
      selectedSectionIndex = idx;
    },
    onSelectPreset: (data, label, id) => {
      loadPreset(data, label, id);
    },
    onStructureChanged: (immediate = true) => {
      activePreset = null;
      seedDerivedFromPreset = false;
      updatePresetList(null);
      scheduleRebuild(immediate, false);
    },
    onMaterialChanged: (needsFullRebuild = false) => {
      activePreset = null;
      seedDerivedFromPreset = false;
      updatePresetList(null);
      if (needsFullRebuild) scheduleRebuild(true, false);
      else refreshMaterialsInPlace();
    },
    onLightingTimeChanged: (nextTime) => {
      state.lightingTime = nextTime;
      const lightSel = $('#lighting-select');
      if (lightSel) lightSel.value = nextTime;
      updateLighting();
      scheduleRebuild(true, false);
    },
    onExportBlueprint: () => exportSkyscraperBlueprint(state, activeBlueprintName, toast),
    onExportJSON: () => exportSkyscraperJSON(state, activeBlueprintName, toast),
    onExportGLB: () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus),
    onSnapshot: () => snapshot(renderer, scene, camera, state, ready, toast)
  });
}

function handleToggleSilhouette(forceVal = null) {
  view.silhouetteMode = forceVal !== null ? Boolean(forceVal) : !view.silhouetteMode;
  $('#btn-silhouette')?.classList.toggle('active', view.silhouetteMode);
  $('#btn-silhouette-top')?.classList.toggle('active', view.silhouetteMode);
  const chk = $('#silhouette-toggle');
  if (chk) chk.checked = view.silhouetteMode;
  refreshMaterialsInPlace();
  toast(view.silhouetteMode ? 'Silhouette Evaluation Mode On' : 'Silhouette Mode Off');
}

function handleToggleDebug(forceVal = null) {
  view.entranceDebug = forceVal !== null ? Boolean(forceVal) : !view.entranceDebug;
  $('#btn-entrance-debug')?.classList.toggle('active', view.entranceDebug);
  const chk = $('#entrance-debug-toggle');
  if (chk) chk.checked = view.entranceDebug;
  rebuildSkyscraperDebugOverlay(debugGroup, complexGroup, state, view.entranceDebug);
  toast(view.entranceDebug ? 'Entrance & Skybridge Gizmos On' : 'Debug Gizmos Off');
}

export function initScene() {
  const canvas = $('#skyscraper-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#0f2030', 1);

  if (renderer.capabilities?.getMaxAnisotropy) {
    setSkyscraperMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f2030');
  scene.fog = new THREE.Fog('#0f2030', 220, 1200);

  camera = new THREE.PerspectiveCamera(46, 1, 0.5, 3600);
  camera.position.set(110, 115, 155);

  orbit = new THREE.OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.minDistance = 8;
  orbit.maxDistance = 900;
  orbit.maxPolarAngle = Math.PI * 0.495;
  orbit.target.set(0, 70, 0);

  complexGroup = new THREE.Group();
  complexGroup.name = 'SkyscraperComplexRoot';
  scene.add(complexGroup);

  environmentGroup = new THREE.Group();
  environmentGroup.name = 'SkylineEnvironment';
  scene.add(environmentGroup);

  debugGroup = new THREE.Group();
  debugGroup.name = 'SkyscraperDebugOverlay';
  scene.add(debugGroup);

  hemi = new THREE.HemisphereLight('#dceeff', '#26323a', 0.68);
  scene.add(hemi);
  ambient = new THREE.AmbientLight('#ffffff', 0.28);
  scene.add(ambient);

  sun = new THREE.DirectionalLight('#ffe7c2', 1.04);
  sun.position.set(145, 220, 130);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  fillLight = new THREE.DirectionalLight('#8ec5fc', 0.24);
  fillLight.position.set(-120, 95, -140);
  scene.add(fillLight);

  updateLighting();

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(resizeRenderer);
    const stage = $('#skyscraper-stage');
    if (stage) observer.observe(stage);
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  ready = true;
  const loadingScreen = $('#studio-loading');
  if (loadingScreen) loadingScreen.classList.add('hidden');

  rebuild(true);

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

export function initUI() {
  renderStylePicker($('#style-picker'), state.style, (data, label, id) => loadPreset(data, label, id));
  renderPresetList($('#preset-list'), activePreset, (data, label, id) => loadPreset(data, label, id));
  renderCustomPresets($('#custom-presets'), (data, label, id, customName) => loadPreset(data, label, id, customName), toast);
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
  const varSel = $('#variation-strength-select');

  const applyCurrentSeedVariation = (toastMsg) => {
    const basePreset = PRESETS[lastLoadedPresetId] || PRESETS[state.style] || state;
    const startState = (activePreset || seedDerivedFromPreset) ? applyPresetWithLocks(state, basePreset, locks) : state;
    state = applySeedVariation(
      { ...startState, seed: state.seed, variationStrength: state.variationStrength },
      state.seed,
      state.variationStrength || 'moderate',
      locks
    );
    activePreset = null;
    updatePresetList(null);
    selectedSectionIndex = clamp(selectedSectionIndex, 0, Math.max(0, state.sections.length - 1));
    renderStudioControls();
    scheduleRebuild(true, false);
    if (toastMsg) toast(toastMsg);
  };

  if (seedInput) {
    seedInput.value = String(state.seed);
    seedInput.addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number(seedInput.value) || 2026), 1, 99999999);
      seedInput.value = String(state.seed);
      applyCurrentSeedVariation(`Applied Seed: ${state.seed}`);
    });
  }

  if (varSel) {
    varSel.value = state.variationStrength || 'moderate';
    varSel.addEventListener('change', () => {
      state.variationStrength = varSel.value;
      applyCurrentSeedVariation(`Seed Variation: ${varSel.value}`);
    });
  }

  $('#btn-regenerate')?.addEventListener('click', () => {
    if (seedInput) {
      state.seed = clamp(Math.floor(Number(seedInput.value) || state.seed || 2026), 1, 99999999);
      seedInput.value = String(state.seed);
    }
    applyCurrentSeedVariation(`Regenerated Seed: ${state.seed}`);
  });

  $('#btn-new-seed')?.addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 99999998) + 1;
    if (seedInput) seedInput.value = String(state.seed);
    applyCurrentSeedVariation(`New Seed: ${state.seed}`);
  });

  $('#btn-reset-preset')?.addEventListener('click', () => {
    const presetId = activePreset || lastLoadedPresetId || state.style;
    const preset = PRESETS[presetId] || PRESETS.art_deco_monumental;
    const styleDef = getStyle(preset.style || presetId);
    loadPreset(preset, styleDef.label, presetId);
  });

  $('#btn-random-all')?.addEventListener('click', () => {
    randomizeSettings('all', state, locks);
    state = sanitiseConfig(state);
    activePreset = null;
    seedDerivedFromPreset = false;
    updatePresetList(null);
    renderStudioControls();
    rebuild(true);
    toast('Randomized Unlocked Skyscraper Parameters');
  });

  $$('[data-random]').forEach((btn) => btn.addEventListener('click', () => {
    const cat = btn.dataset.random;
    randomizeSettings(cat, state, locks);
    state = sanitiseConfig(state);
    activePreset = null;
    seedDerivedFromPreset = false;
    updatePresetList(null);
    renderStudioControls();
    if (cat === 'materials') refreshMaterialsInPlace();
    else rebuild(false);
    toast(`Randomized ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
  }));

  $$('.view-mode').forEach((btn) => btn.addEventListener('click', () => {
    view.focus = btn.dataset.focus || 'full';
    $$('.view-mode').forEach((b) => b.classList.toggle('active', b === btn));
    if (ready) resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  }));

  $('#btn-reset-camera')?.addEventListener('click', () => {
    if (ready) resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  });

  $('#btn-rotate')?.addEventListener('click', () => {
    view.autoRotate = !view.autoRotate;
    $('#btn-rotate')?.classList.toggle('active', view.autoRotate);
    toast(view.autoRotate ? 'Turntable On' : 'Turntable Off');
  });

  $('#btn-silhouette')?.addEventListener('click', () => handleToggleSilhouette());
  $('#btn-silhouette-top')?.addEventListener('click', () => handleToggleSilhouette());
  $('#silhouette-toggle')?.addEventListener('change', (e) => handleToggleSilhouette(e.target.checked));

  $('#btn-wireframe')?.addEventListener('click', () => {
    view.wireframe = !view.wireframe;
    $('#btn-wireframe')?.classList.toggle('active', view.wireframe);
    refreshMaterialsInPlace();
  });

  $('#btn-entrance-debug')?.addEventListener('click', () => handleToggleDebug());
  $('#entrance-debug-toggle')?.addEventListener('change', (e) => handleToggleDebug(e.target.checked));

  $('#btn-stage-snapshot')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));
  $('#btn-screenshot')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));
  $('#btn-screenshot-side')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));

  $('#btn-theatre')?.addEventListener('click', () => toggleSkyTheatreMode(view, toast, resizeRenderer));
  $('#btn-theatre-quick')?.addEventListener('click', () => toggleSkyTheatreMode(view, toast, resizeRenderer));
  $('#btn-fullscreen')?.addEventListener('click', () => toggleSkyFullscreenViewport(view, toast, resizeRenderer));
  $('#btn-fullscreen-quick')?.addEventListener('click', () => toggleSkyFullscreenViewport(view, toast, resizeRenderer));

  $('#lighting-select')?.addEventListener('change', (e) => {
    state.lightingTime = e.target.value;
    updateLighting();
    scheduleRebuild(true, false);
    if (activeTab === 'lighting') renderStudioControls();
  });

  $('#environment-select')?.addEventListener('change', (e) => {
    view.environment = e.target.value;
    const bp = complexGroup?.userData?.blueprint;
    rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  });

  $('#ground-grid')?.addEventListener('change', (e) => {
    view.grid = Boolean(e.target.checked);
    const bp = complexGroup?.userData?.blueprint;
    rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  });

  $('#btn-save-custom')?.addEventListener('click', () => {
    const nameInput = $('#custom-name');
    const name = (nameInput?.value || '').trim() || `${getStyle(state.style).label} ${state.seed}`;
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) saved = [];
    } catch {
      saved = [];
    }
    saved.unshift({ name, config: copy(state), savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 24)));
    if (nameInput) nameInput.value = '';
    renderCustomPresets($('#custom-presets'), (data, lbl, id, customName) => loadPreset(data, lbl, id, customName), toast);
    toast(`Saved "${name}"`);
  });

  $('#btn-export-blueprint')?.addEventListener('click', () => exportSkyscraperBlueprint(state, activeBlueprintName, toast));
  $('#btn-export-blueprint-top')?.addEventListener('click', () => exportSkyscraperBlueprint(state, activeBlueprintName, toast));
  $('#btn-export-json')?.addEventListener('click', () => exportSkyscraperJSON(state, activeBlueprintName, toast));
  $('#btn-export-glb')?.addEventListener('click', () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus));
  $('#btn-export-glb-side')?.addEventListener('click', () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus));

  const fileInput = $('#file-import');
  $('#btn-import-json')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) {
      handleSkyscraperFileImport(f, (cfg, label, styleId, bpName) => loadPreset(cfg, label, styleId, bpName), toast);
      fileInput.value = '';
    }
  });

  window.addEventListener('keydown', (e) => {
    handleSkyStudioKeydown(e, {
      toggleFullscreen: () => toggleSkyFullscreenViewport(view, toast, resizeRenderer),
      toggleTheatre: () => toggleSkyTheatreMode(view, toast, resizeRenderer),
      toggleDebug: () => handleToggleDebug(),
      toggleSilhouette: () => handleToggleSilhouette(),
      snapshot: () => snapshot(renderer, scene, camera, state, ready, toast),
      exitFullscreen: () => exitSkyFullscreenViewport(view, toast, resizeRenderer)
    });
  });

  document.addEventListener('fullscreenchange', () => handleSkyFullscreenChange(view, resizeRenderer));
}

function loadScript(url, check) {
  return new Promise((resolve, reject) => {
    if (check()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    let done = false;
    const timer = setTimeout(() => finish(new Error('Timed Out Loading ' + url)), 14000);
    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (err) {
        script.remove();
        reject(err);
      } else {
        resolve();
      }
    }
    script.onload = () => (check() ? finish() : finish(new Error('Loaded Library Missing Expected Symbols')));
    script.onerror = () => finish(new Error('Unable To Load ' + url));
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
  throw lastError || new Error('Missing 3d Dependency');
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
  console.error('Unable To Start B Skyscraper Generator', error);
  const screen = $('#studio-loading');
  if (!screen) return;
  screen.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = '3d Preview Unavailable';
  const body = document.createElement('span');
  body.textContent = 'The Three.js Library Could Not Be Loaded. Check Your Connection And Reload This Page.';
  const detail = document.createElement('span');
  detail.textContent = error.message;
  screen.append(title, body, detail);
  setStatus('Library Error');
}

if (typeof window !== 'undefined') {
  window.BSkyscraperBlueprint = {
    SCHEMA_VERSION: BLUEPRINT_SCHEMA_VERSION,
    GENERATOR_META: copy(GENERATOR_META),
    resolveTowerComplex,
    computeSkyscraperEntrances,
    computeSkyscraperBounds,
    generateSkyscraperBlueprint,
    validateSkyscraperBlueprint,
    applyImportedSkyscraperData: (parsed, sourceLabel = 'Imported Skyscraper') =>
      applyImportedSkyscraperData(parsed, sourceLabel, (cfg, lbl, sid, bpName) => loadPreset(cfg, lbl, sid, bpName), toast),
    createSkyscraper,
    exportBlueprintJSON: () => generateSkyscraperBlueprint(state),
    fileDownload,
    safeSkyscraperName
  };
}

if (typeof document !== 'undefined') {
  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
}
