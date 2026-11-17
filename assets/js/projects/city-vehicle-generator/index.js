import { $, $$, clamp, copy } from './utils.js';
import {
  STORAGE_KEY,
  BASE,
  PRESETS,
  STYLES,
  getStyle,
  sanitiseConfig,
  applyPresetWithLocks
} from './config.js';
import { generateVehicleBlueprint, validateVehicleBlueprint } from './core/blueprints.js';
import { setVehicleMaxAnisotropy, reapplyVehicleMaterials } from './materials/materials.js';
import { createCityVehicle } from './geometry/vehicle.js';
import {
  disposeObject,
  rebuildVehicleDebugOverlay,
  rebuildVehicleEnvironment,
  resetCameraForFocus,
  snapshot,
  toggleVehTheatreMode,
  isVehFullscreenActive,
  toggleVehFullscreenViewport,
  exitVehFullscreenViewport,
  handleVehFullscreenChange,
  handleVehStudioKeydown
} from './studio/preview.js';
import {
  exportVehicleBlueprint,
  exportVehicleJSON,
  exportVehicleGLB,
  exportTrafficFleetPack,
  handleVehicleFileImport
} from './studio/export.js';
import {
  renderStylePicker,
  updateStylePicker,
  renderPresetList,
  updatePresetList,
  renderCustomPresets,
  randomizeSettings,
  applySeedVariation,
  renderControls
} from './studio/controls.js';

let state = sanitiseConfig({ ...copy(BASE), ...copy(PRESETS.sedan) });
let activePreset = 'sedan';
let activeBlueprintName = null;
let activeTab = 'structure';
const locks = new Set();

const view = {
  focus: 'hero',
  autoRotate: false,
  silhouetteMode: false,
  wireframe: false,
  debugOverlay: false,
  theatre: false,
  fullscreen: false,
  environment: 'street',
  grid: true
};

let renderer = null;
let scene = null;
let camera = null;
let orbit = null;
let vehicleRoot = null;
let envRoot = null;
let debugRoot = null;
let hemiLight = null;
let keyLight = null;
let rimLight = null;
let beaconMats = { red: [], blue: [], amber: [] };
let strobeWasActive = false;
let ready = false;
let rebuildTimer = null;
let matTimer = null;

function toast(msg) {
  const wrap = $('#studio-toasts');
  if (!wrap || !msg) return;
  const el = document.createElement('div');
  el.className = 'studio-toast';
  el.textContent = String(msg);
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

function setStatus(msg) {
  const el = $('#studio-status');
  if (el) el.textContent = String(msg || '');
}

function vehAppCountTriangles(root) {
  let tris = 0;
  if (!root) return tris;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    const geo = obj.geometry;
    if (geo.index) tris += Math.floor(geo.index.count / 3);
    else if (geo.attributes?.position) tris += Math.floor(geo.attributes.position.count / 3);
  });
  return tris;
}

function vehAppApplyViewFlags() {
  if (!vehicleRoot) return;
  reapplyVehicleMaterials(vehicleRoot, state, view);
  const redSet = new Set();
  const blueSet = new Set();
  const amberSet = new Set();
  vehicleRoot.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const role = obj.userData?.materialRole;
    if (role === 'redLight') redSet.add(obj.material);
    else if (role === 'blueLight') blueSet.add(obj.material);
    else if (role === 'amberLight') amberSet.add(obj.material);
  });
  beaconMats = {
    red: Array.from(redSet),
    blue: Array.from(blueSet),
    amber: Array.from(amberSet)
  };
  strobeWasActive = false;
}

function vehAppRebuildEnvironment() {
  if (!envRoot) return;
  const boundsMeters = vehicleRoot?.userData?.blueprint?.bounds?.meters || null;
  rebuildVehicleEnvironment(envRoot, view.environment, view.grid, boundsMeters, state.lightingTime);
}

function updateStats(bp) {
  if (!bp) return;
  const dims = bp.dimensions || {};
  const lenEl = $('#stat-length');
  const wbEl = $('#stat-wheelbase');
  const axEl = $('#stat-axles');
  const triEl = $('#stat-triangles');
  const lblEl = $('#scene-label');
  const styleEl = $('#active-style-name');

  if (lenEl) lenEl.textContent = `${Number(dims.length ?? state.overallLength ?? 0).toFixed(2)}m`;
  if (wbEl) wbEl.textContent = `${Number(dims.wheelbase || 0).toFixed(2)}m`;
  if (axEl) {
    const cnt = bp.axles ? bp.axles.length : 2;
    axEl.textContent = `${cnt} Axles`;
  }
  if (triEl) {
    const triCount = vehAppCountTriangles(vehicleRoot);
    triEl.textContent = `${triCount.toLocaleString()} Tris`;
  }
  const styleObj = getStyle(state.style);
  if (styleEl) styleEl.textContent = styleObj.label;
  if (lblEl) {
    const customLabel = activeBlueprintName ? `${activeBlueprintName} · ` : '';
    lblEl.textContent = `${customLabel}${styleObj.label} (${bp.bodyStyle?.bodyFamily || state.bodyFamily})`;
  }
}

function updateLighting() {
  if (!scene || !hemiLight || !keyLight || !rimLight) return;
  const mode = state.lightingTime || 'day';

  if (mode === 'golden_hour') {
    scene.background = new THREE.Color('#2c242b');
    scene.fog = new THREE.Fog('#2c242b', 38, 150);
    hemiLight.color.set('#ffd5a6');
    hemiLight.groundColor.set('#38313a');
    hemiLight.intensity = 0.72;
    keyLight.color.set('#ffae66');
    keyLight.intensity = 1.15;
    keyLight.position.set(14, 9, 10);
    rimLight.color.set('#7fa8d9');
    rimLight.intensity = 0.45;
  } else if (mode === 'dusk') {
    scene.background = new THREE.Color('#1a2234');
    scene.fog = new THREE.Fog('#1a2234', 34, 140);
    hemiLight.color.set('#84a2d4');
    hemiLight.groundColor.set('#232630');
    hemiLight.intensity = 0.6;
    keyLight.color.set('#b7c9ff');
    keyLight.intensity = 0.88;
    keyLight.position.set(11, 13, 12);
    rimLight.color.set('#ff9966');
    rimLight.intensity = 0.52;
  } else if (mode === 'night') {
    scene.background = new THREE.Color('#0c111a');
    scene.fog = new THREE.Fog('#0c111a', 30, 125);
    hemiLight.color.set('#55739e');
    hemiLight.groundColor.set('#14171f');
    hemiLight.intensity = 0.52;
    keyLight.color.set('#a8c4ef');
    keyLight.intensity = 0.85;
    keyLight.position.set(10, 16, 12);
    rimLight.color.set('#4de2ff');
    rimLight.intensity = 0.48;
  } else {
    scene.background = new THREE.Color('#19222d');
    scene.fog = new THREE.Fog('#19222d', 42, 160);
    hemiLight.color.set('#e8f2ff');
    hemiLight.groundColor.set('#363b42');
    hemiLight.intensity = 0.78;
    keyLight.color.set('#fff6e8');
    keyLight.intensity = 1.05;
    keyLight.position.set(12, 18, 14);
    rimLight.color.set('#7db0e3');
    rimLight.intensity = 0.42;
  }

  if (envRoot) {
    vehAppRebuildEnvironment();
  }
  vehAppApplyViewFlags();
}

function refreshMaterialsInPlace() {
  state = sanitiseConfig(state);
  if (!ready || !vehicleRoot) return;
  vehAppApplyViewFlags();
  setStatus('Updated Materials');
}

function rebuild(resetCam = false) {
  state = sanitiseConfig(state);
  if (!ready || !scene) return;

  if (vehicleRoot) {
    scene.remove(vehicleRoot);
    disposeObject(vehicleRoot);
    vehicleRoot = null;
  }

  const start = performance.now();
  vehicleRoot = createCityVehicle(state);
  scene.add(vehicleRoot);

  vehAppApplyViewFlags();
  vehAppRebuildEnvironment();
  rebuildVehicleDebugOverlay(debugRoot, vehicleRoot, view.debugOverlay);

  if (resetCam) {
    resetCameraForFocus(camera, orbit, vehicleRoot, view.focus, scene);
  }

  const elapsed = (performance.now() - start).toFixed(1);
  updateStats(vehicleRoot.userData.blueprint);
  setStatus(`Ready (${elapsed}ms)`);
}

function scheduleRebuild(immediate = false, resetCam = false) {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  if (immediate) {
    rebuild(resetCam);
    return;
  }
  rebuildTimer = setTimeout(() => rebuild(resetCam), 65);
}

function scheduleMaterialRefresh(immediate = false) {
  if (matTimer) clearTimeout(matTimer);
  if (immediate) {
    refreshMaterialsInPlace();
    return;
  }
  matTimer = setTimeout(refreshMaterialsInPlace, 30);
}

function vehAppBuildControlContext() {
  return {
    onStructureChanged(isLive) {
      activeBlueprintName = null;
      scheduleRebuild(!isLive ? true : false, false);
    },
    onMaterialChanged(isLive) {
      scheduleMaterialRefresh(isLive);
    },
    onLightingChanged() {
      const sel = $('#lighting-select');
      if (sel) sel.value = state.lightingTime;
      updateLighting();
    },
    onStyleSelected(styleId) {
      const desc = getStyle(styleId);
      loadPreset(desc.preset, styleId);
    },
    onNewSeed() {
      state.seed = Math.floor(Math.random() * 8999999) + 1000;
      applySeedVariation(state, locks);
      const topSeed = $('#seed-input');
      if (topSeed) topSeed.value = String(state.seed);
      activeBlueprintName = null;
      rebuild(false);
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
      toast(`Generated Seed #${state.seed}`);
    },
    onExportBlueprint() {
      exportVehicleBlueprint(state, activeBlueprintName, toast);
    },
    onExportFleet() {
      exportTrafficFleetPack(state, 8, toast);
    },
    onExportJSON() {
      exportVehicleJSON(state, activeBlueprintName, toast);
    },
    onExportGLB() {
      exportVehicleGLB(state, ready, activeBlueprintName, vehAppLoadGLTFExporter, toast, setStatus);
    },
    onImportTrigger() {
      $('#file-import')?.click();
    },
    onSnapshot() {
      snapshot(renderer, scene, camera, state, ready, toast);
    }
  };
}

function loadPreset(presetId, explicitStyleId = null) {
  const preset = PRESETS[presetId];
  if (!preset) return;
  const target = { ...copy(BASE), ...copy(preset), style: explicitStyleId || preset.style || presetId };
  state = applyPresetWithLocks(state, target, locks);
  activePreset = presetId;
  activeBlueprintName = null;

  const seedEl = $('#seed-input');
  if (seedEl) seedEl.value = String(state.seed);

  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
  rebuild(true);
  toast(`Loaded Preset: ${preset.label || presetId}`);
}

function vehAppLoadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function vehAppLoadThreeStack() {
  if (!window.THREE) {
    await vehAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
  }
  if (!window.THREE?.OrbitControls) {
    await vehAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
  }
}

async function vehAppLoadGLTFExporter() {
  if (window.THREE?.GLTFExporter) return;
  await vehAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js');
}

function vehAppResizeStage() {
  if (!renderer || !camera) return;
  const stage = $('#vehicle-stage');
  if (!stage) return;
  const w = Math.max(240, stage.clientWidth || 640);
  const h = Math.max(220, stage.clientHeight || 480);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

async function initScene() {
  const stage = $('#vehicle-stage');
  const canvas = $('#vehicle-canvas');
  if (!stage || !canvas) return;

  try {
    setStatus('Loading 3d Viewport...');
    await vehAppLoadThreeStack();

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    setVehicleMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1.4, 0.08, 450);

    orbit = new THREE.OrbitControls(camera, canvas);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI * 0.495;

    hemiLight = new THREE.HemisphereLight('#e8f2ff', '#363b42', 0.78);
    scene.add(hemiLight);

    keyLight = new THREE.DirectionalLight('#fff6e8', 1.05);
    keyLight.position.set(12, 18, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    rimLight = new THREE.DirectionalLight('#7db0e3', 0.42);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    envRoot = new THREE.Group();
    envRoot.name = 'VehicleEnvironment';
    scene.add(envRoot);

    debugRoot = new THREE.Group();
    debugRoot.name = 'VehicleDebugOverlay';
    scene.add(debugRoot);

    ready = true;
    vehAppResizeStage();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => vehAppResizeStage());
      ro.observe(stage);
    }
    window.addEventListener('resize', vehAppResizeStage);

    updateLighting();
    rebuild(true);

    const animate = () => {
      requestAnimationFrame(animate);
      if (orbit) {
        orbit.autoRotate = Boolean(view.autoRotate);
        orbit.autoRotateSpeed = 1.45;
        orbit.update();
      }
      if (state.beaconFlash && state.emergencyLightsLit && vehicleRoot && !view.silhouetteMode) {
        const phase = performance.now() * 0.0085;
        const redPulse = Math.sin(phase) > 0 ? 1.15 : 0.16;
        const bluePulse = Math.sin(phase) <= 0 ? 1.15 : 0.16;
        const amberPulse = 0.25 + 0.85 * (0.5 + 0.5 * Math.sin(phase * 0.8));
        for (const m of beaconMats.red) if (m.emissive) m.emissiveIntensity = redPulse;
        for (const m of beaconMats.blue) if (m.emissive) m.emissiveIntensity = bluePulse;
        for (const m of beaconMats.amber) if (m.emissive) m.emissiveIntensity = amberPulse;
        strobeWasActive = true;
      } else if (strobeWasActive) {
        const baseIntensity = state.emergencyLightsLit ? 0.9 : 0.1;
        for (const m of beaconMats.red) if (m.emissive) m.emissiveIntensity = baseIntensity;
        for (const m of beaconMats.blue) if (m.emissive) m.emissiveIntensity = baseIntensity;
        for (const m of beaconMats.amber) if (m.emissive) m.emissiveIntensity = baseIntensity;
        strobeWasActive = false;
      }
      if (renderer && scene && camera) renderer.render(scene, camera);
    };
    animate();
  } catch (err) {
    console.error('3d Viewport Error:', err);
    setStatus('3d Viewport Unavailable');
    stage.innerHTML = `<div class="studio-error">Could not initialize 3d Webgl viewport (${err.message}).</div>`;
  }
}

function vehAppApplyImported(cfg, labelName, styleId, sourceLabel) {
  state = sanitiseConfig(cfg);
  activePreset = getStyle(styleId || state.style).preset;
  activeBlueprintName = labelName || null;
  const seedEl = $('#seed-input');
  if (seedEl) seedEl.value = String(state.seed);
  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
  rebuild(true);
  setStatus(`Loaded: ${sourceLabel}`);
}

function initUI() {
  renderStylePicker($('#style-picker'), state.style, (styleId) => {
    const arch = getStyle(styleId);
    loadPreset(arch.preset, styleId);
  });

  renderPresetList($('#preset-list'), activePreset, (presetId) => {
    loadPreset(presetId);
  });

  renderCustomPresets($('#custom-presets'), (cfg, name) => {
    vehAppApplyImported(cfg, name, cfg?.style, name);
    toast(`Loaded "${name}"`);
  }, toast);

  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());

  const tabs = $$('.studio-tab');
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab || 'structure';
      tabs.forEach((b) => b.classList.toggle('active', b === tab));
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    });
  }

  const seedEl = $('#seed-input');
  if (seedEl) {
    seedEl.value = String(state.seed);
    seedEl.addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number(seedEl.value) || 1024), 1, 99999999);
      applySeedVariation(state, locks);
      seedEl.value = String(state.seed);
      activeBlueprintName = null;
      rebuild(false);
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    });
  }

  $('#btn-new-seed')?.addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 8999999) + 1000;
    applySeedVariation(state, locks);
    if (seedEl) seedEl.value = String(state.seed);
    activeBlueprintName = null;
    rebuild(false);
    renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    toast(`Generated Seed #${state.seed}`);
  });

  $('#btn-random-all')?.addEventListener('click', () => {
    randomizeSettings('all', state, locks);
    state.seed = Math.floor(Math.random() * 8999999) + 1000;
    if (seedEl) seedEl.value = String(state.seed);
    activeBlueprintName = null;
    renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    rebuild(true);
    toast('Randomized City Vehicle');
  });

  for (const btn of $$('[data-rand-cat]')) {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.randCat;
      if (!cat) return;
      randomizeSettings(cat, state, locks);
      activeBlueprintName = null;
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
      if (cat === 'materials') {
        refreshMaterialsInPlace();
      } else {
        rebuild(cat === 'structure');
      }
      toast(`Randomized ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    });
  }

  const focusBtns = $$('[data-focus]');
  for (const btn of focusBtns) {
    btn.addEventListener('click', () => {
      view.focus = btn.dataset.focus || 'hero';
      focusBtns.forEach((b) => b.classList.toggle('active', b === btn));
      resetCameraForFocus(camera, orbit, vehicleRoot, view.focus, scene);
    });
  }

  $('#btn-reset-camera')?.addEventListener('click', () => {
    resetCameraForFocus(camera, orbit, vehicleRoot, view.focus, scene);
  });

  $('#btn-rotate')?.addEventListener('click', () => {
    view.autoRotate = !view.autoRotate;
    $('#btn-rotate')?.classList.toggle('active', view.autoRotate);
  });

  const toggleSilhouetteFn = () => {
    view.silhouetteMode = !view.silhouetteMode;
    $('#btn-silhouette')?.classList.toggle('active', view.silhouetteMode);
    const chk = $('#silhouette-toggle');
    if (chk) chk.checked = view.silhouetteMode;
    vehAppApplyViewFlags();
    toast(view.silhouetteMode ? 'Silhouette Readability Mode On' : 'Silhouette Mode Off');
  };

  $('#btn-silhouette')?.addEventListener('click', toggleSilhouetteFn);
  $('#silhouette-toggle')?.addEventListener('change', (e) => {
    view.silhouetteMode = Boolean(e.target.checked);
    $('#btn-silhouette')?.classList.toggle('active', view.silhouetteMode);
    vehAppApplyViewFlags();
  });

  $('#btn-wireframe')?.addEventListener('click', () => {
    view.wireframe = !view.wireframe;
    $('#btn-wireframe')?.classList.toggle('active', view.wireframe);
    vehAppApplyViewFlags();
  });

  const toggleDebugFn = () => {
    view.debugOverlay = !view.debugOverlay;
    $('#btn-debug-overlay')?.classList.toggle('active', view.debugOverlay);
    const chk = $('#debug-overlay-toggle');
    if (chk) chk.checked = view.debugOverlay;
    rebuildVehicleDebugOverlay(debugRoot, vehicleRoot, view.debugOverlay);
    toast(view.debugOverlay ? 'Collision & Axle Gizmos On' : 'Gizmos Off');
  };

  $('#btn-debug-overlay')?.addEventListener('click', toggleDebugFn);
  $('#debug-overlay-toggle')?.addEventListener('change', (e) => {
    view.debugOverlay = Boolean(e.target.checked);
    $('#btn-debug-overlay')?.classList.toggle('active', view.debugOverlay);
    rebuildVehicleDebugOverlay(debugRoot, vehicleRoot, view.debugOverlay);
  });

  $('#environment-select')?.addEventListener('change', (e) => {
    view.environment = e.target.value || 'street';
    vehAppRebuildEnvironment();
  });

  $('#lighting-select')?.addEventListener('change', (e) => {
    state.lightingTime = e.target.value || 'day';
    updateLighting();
    if (activeTab === 'scene') {
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    }
  });

  $('#ground-grid')?.addEventListener('change', (e) => {
    view.grid = Boolean(e.target.checked);
    vehAppRebuildEnvironment();
  });

  const doSnapshot = () => snapshot(renderer, scene, camera, state, ready, toast);
  $('#btn-stage-snapshot')?.addEventListener('click', doSnapshot);
  $('#btn-screenshot')?.addEventListener('click', doSnapshot);
  $('#btn-screenshot-side')?.addEventListener('click', doSnapshot);

  const toggleTheatre = () => toggleVehTheatreMode(view, toast, vehAppResizeStage);
  const toggleFullscreen = () => toggleVehFullscreenViewport(view, toast, vehAppResizeStage);
  const exitFullscreen = () => exitVehFullscreenViewport(view, toast, vehAppResizeStage);

  $('#btn-theatre')?.addEventListener('click', toggleTheatre);
  $('#btn-theatre-quick')?.addEventListener('click', toggleTheatre);
  $('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  $('#btn-fullscreen-quick')?.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => handleVehFullscreenChange(view, vehAppResizeStage));
  document.addEventListener('keydown', (e) => {
    handleVehStudioKeydown(e, {
      toggleFullscreen,
      toggleTheatre,
      toggleDebug: toggleDebugFn,
      toggleSilhouette: toggleSilhouetteFn,
      snapshot: doSnapshot,
      exitFullscreen
    });
  });

  $('#btn-save-custom')?.addEventListener('click', () => {
    const input = $('#custom-name');
    const customLabel = (input?.value || '').trim() || `${getStyle(state.style).label} #${state.seed}`;
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
    existing.unshift({ name: customLabel, savedAt: new Date().toISOString(), config: copy(state) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 24)));
    if (input) input.value = '';
    activeBlueprintName = customLabel;
    renderCustomPresets($('#custom-presets'), (cfg, name) => {
      vehAppApplyImported(cfg, name, cfg?.style, name);
      toast(`Loaded "${name}"`);
    }, toast);
    toast(`Saved "${customLabel}"`);
  });

  const doBlueprint = () => exportVehicleBlueprint(state, activeBlueprintName, toast);
  const doFleet = () => exportTrafficFleetPack(state, 8, toast);
  const doJSON = () => exportVehicleJSON(state, activeBlueprintName, toast);
  const doGLB = () => exportVehicleGLB(state, ready, activeBlueprintName, vehAppLoadGLTFExporter, toast, setStatus);

  $('#btn-export-blueprint')?.addEventListener('click', doBlueprint);
  $('#btn-export-blueprint-top')?.addEventListener('click', doBlueprint);
  $('#btn-export-fleet')?.addEventListener('click', doFleet);
  $('#btn-export-json')?.addEventListener('click', doJSON);
  $('#btn-export-glb')?.addEventListener('click', doGLB);
  $('#btn-export-glb-side')?.addEventListener('click', doGLB);

  $('#btn-import-json')?.addEventListener('click', () => $('#file-import')?.click());
  $('#file-import')?.addEventListener('change', (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      handleVehicleFileImport(file, vehAppApplyImported, toast);
      e.target.value = '';
    }
  });
}

window.BCityVehicleBlueprint = {
  version: '1.0.0',
  schemaVersion: 'b.vehicle.v1',
  archetypes: STYLES,
  presets: PRESETS,
  getConfig: () => sanitiseConfig(state),
  generateBlueprint: (cfg) => generateVehicleBlueprint(cfg || state),
  validateBlueprint: (input) => validateVehicleBlueprint(input),
  createVehicleMesh: (cfg) => createCityVehicle(cfg || state),
  loadPreset,
  applyImported: vehAppApplyImported
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initScene();
  });
} else {
  initUI();
  initScene();
}
