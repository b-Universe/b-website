import { $, $$, clamp, copy, degToRad } from './utils.js';
import {
  STORAGE_KEY,
  BASE,
  PRESETS,
  STYLES,
  getStyle,
  isRailConfig,
  sanitiseConfig,
  applyPresetWithLocks
} from './config.js';
import { generateVehicleBlueprint, validateVehicleBlueprint } from './core/blueprints.js';
import {
  setVehicleMaxAnisotropy,
  reapplyVehicleMaterials,
  reapplyConsistMaterials
} from './materials/materials.js';
import { createCityVehicle } from './geometry/vehicle.js';
import { RAIL_DEFAULT_CONSISTS } from './transit/rail-archetypes.js';
import { applyRailVehiclePose } from './transit/rail-vehicle.js';
import { solveRailUnitOnRoute } from './transit/track-preview.js';
import {
  addConsistUnit,
  applySharedLiveryToConsist,
  createConsistFromPreset,
  createConsistMeshGroup,
  duplicateConsistUnit,
  generateConsistBlueprint,
  positionConsistOnRoute,
  randomizeConsistUnit,
  randomizeWholeConsist,
  removeConsistUnit,
  reorderConsistUnit,
  reverseConsistUnit,
  sanitiseConsist,
  validateConsist
} from './transit/consist.js';
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
  exportConsistBlueprint,
  exportConsistGLB,
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
let consistState = createConsistFromPreset('freight_manifest');
let consistValidation = validateConsist(consistState, null);
let studioMode = 'vehicle';
let selectedUnitIndex = 0;
let categoryFilter = 'all';
let transitSubgroup = 'all_transit';
let activePreset = 'sedan';
let activeBlueprintName = null;
let activeTab = 'structure';
const locks = new Set();

const trackState = {
  mode: 'rail_straight',
  curved: false,
  curveRadius: 48,
  gradePercent: 3.0,
  playing: false,
  reverse: false,
  speed: 6.0,
  leadS: 0,
  wheelSpinRad: 0,
  followCamera: false,
  doorsOpenPreview: false,
  pantographRaised: true,
  activeRoute: null,
  lastTickMs: 0
};

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
  if (studioMode === 'trainset' || Array.isArray(vehicleRoot.userData?.unitGroups)) {
    reapplyConsistMaterials(vehicleRoot, { ...view, lightingTime: state.lightingTime });
  } else {
    reapplyVehicleMaterials(vehicleRoot, state, view);
  }
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

const RAIL_ENV_MODES = new Set([
  'rail_straight',
  'rail_curved',
  'rail_incline',
  'tram_street',
  'monorail_straddle',
  'monorail_suspended',
  'cableway_aerial'
]);

function vehAppIsRailEnv(mode) {
  return RAIL_ENV_MODES.has(mode);
}

function vehAppIsFixedGuidewayMode(mode) {
  return mode === 'tram_street' || mode === 'monorail_straddle' || mode === 'monorail_suspended' || mode === 'cableway_aerial';
}

function vehAppPreferredStageForConfig(cfg) {
  const bf = cfg?.bodyFamily || '';
  if (bf === 'rail_historic_streetcar' || bf === 'rail_articulated_tram' || bf === 'rail_open_tram') return 'tram_street';
  if (bf === 'rail_straddle_monorail') return 'monorail_straddle';
  if (bf === 'rail_suspended_monorail') return 'monorail_suspended';
  if (bf === 'rail_aerial_gondola') return 'cableway_aerial';
  return 'rail_straight';
}

function vehAppIsElectrifiedConfig(cfg) {
  const elecSet = new Set([
    'rail_electric_loco',
    'rail_highspeed_lead',
    'rail_highspeed_coach',
    'rail_historic_streetcar',
    'rail_articulated_tram',
    'rail_open_tram'
  ]);
  if (studioMode === 'trainset') {
    return (consistState?.units || []).some((u) => elecSet.has(u?.config?.bodyFamily));
  }
  return elecSet.has(cfg?.bodyFamily);
}

function vehAppSyncRailUI() {
  const inRail = studioMode === 'trainset' || isRailConfig(state);
  const railBar = $('#rail-preview-bar');
  if (railBar) railBar.hidden = !inRail;

  const subBar = $('#transit-subfilters');
  if (subBar) subBar.hidden = categoryFilter !== 'transit_rail';

  if (inRail && !vehAppIsRailEnv(view.environment) && view.environment !== 'studio' && view.environment !== 'none') {
    view.environment = vehAppPreferredStageForConfig(state);
    if (view.environment === 'rail_straight' && vehAppIsRailEnv(trackState.mode)) {
      view.environment = trackState.mode;
    }
    const envSel = $('#environment-select');
    if (envSel) envSel.value = view.environment;
  } else if (!inRail && vehAppIsRailEnv(view.environment)) {
    view.environment = 'street';
    const envSel = $('#environment-select');
    if (envSel) envSel.value = 'street';
    trackState.playing = false;
  }

  for (const btn of $$('[data-track-mode]')) {
    btn.classList.toggle('active', btn.dataset.trackMode === trackState.mode);
  }
  for (const btn of $$('[data-studio-mode]')) {
    btn.classList.toggle('active', btn.dataset.studioMode === studioMode);
  }
  const pantoToggle = $('#rail-panto-toggle');
  if (pantoToggle) pantoToggle.checked = Boolean(trackState.pantographRaised);
  const playBtn = $('#btn-track-play');
  if (playBtn) {
    playBtn.classList.toggle('active', trackState.playing);
    playBtn.innerHTML = trackState.playing
      ? '<i class="fa-solid fa-pause"></i> Pause'
      : '<i class="fa-solid fa-play"></i> Play';
  }
  $('#btn-track-reverse')?.classList.toggle('active', trackState.reverse);
}

function vehAppRebuildEnvironment(boundsOverride = null) {
  if (!envRoot) return null;
  const boundsMeters = boundsOverride || vehicleRoot?.userData?.blueprint?.bounds?.meters || null;
  const route = rebuildVehicleEnvironment(
    envRoot,
    view.environment,
    view.grid,
    boundsMeters,
    state.lightingTime,
    {
      curved: view.environment === 'rail_curved' || Boolean(trackState.curved),
      electrified: vehAppIsElectrifiedConfig(state),
      curveRadius: trackState.curveRadius,
      gradePercent: trackState.gradePercent,
      trackGaugeId: state.railTrackGauge || 'standard_1435'
    }
  );
  trackState.activeRoute = route;
  return route;
}

function updateStats(bp) {
  const lenEl = $('#stat-length');
  const wbEl = $('#stat-wheelbase');
  const axEl = $('#stat-axles');
  const triEl = $('#stat-triangles');
  const lblEl = $('#scene-label');
  const styleEl = $('#active-style-name');

  if (studioMode === 'trainset' && vehicleRoot?.userData?.consistBlueprint) {
    const tbp = vehicleRoot.userData.consistBlueprint;
    const sum = tbp.summary || {};
    if (lenEl) lenEl.textContent = `${Number(sum.totalLengthMeters || 0).toFixed(1)}m (${sum.unitCount} Cars)`;
    if (wbEl) wbEl.textContent = `Min R ${Number(sum.minimumCurveRadiusMeters || 24).toFixed(0)}m`;
    if (axEl) axEl.textContent = `${sum.totalAxles || 0} Axles`;
    if (triEl) triEl.textContent = `${vehAppCountTriangles(vehicleRoot).toLocaleString()} Tris`;
    if (styleEl) styleEl.textContent = tbp.name || 'Trainset Consist';
    if (lblEl) lblEl.textContent = `${tbp.name} · ${sum.unitCount} Units (${sum.trackGaugeLabel || 'Standard Gauge'})`;
    return;
  }

  if (!bp) return;
  const dims = bp.dimensions || {};
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

function vehAppUpdateShadowBounds() {
  if (!keyLight || !vehicleRoot) return;
  const box = new THREE.Box3().setFromObject(vehicleRoot);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const halfSpan = Math.max(12, Math.max(size.x, size.z) * 0.72);
  keyLight.target.position.copy(center);
  keyLight.target.updateMatrixWorld();
  keyLight.position.set(center.x + halfSpan * 1.1, Math.max(18, halfSpan * 1.2), center.z + halfSpan * 1.1);
  keyLight.shadow.camera.left = -halfSpan;
  keyLight.shadow.camera.right = halfSpan;
  keyLight.shadow.camera.top = halfSpan;
  keyLight.shadow.camera.bottom = -halfSpan;
  keyLight.shadow.camera.far = Math.max(70, halfSpan * 4.5);
  keyLight.shadow.camera.updateProjectionMatrix();
}

function vehAppApplyPreferredStage(cfg) {
  if (!isRailConfig(cfg) || view.environment === 'studio' || view.environment === 'none') return;
  const pref = vehAppPreferredStageForConfig(cfg);
  if (pref !== 'rail_straight' || vehAppIsFixedGuidewayMode(view.environment) || !vehAppIsRailEnv(view.environment)) {
    view.environment = pref === 'rail_straight' && trackState.curved ? 'rail_curved' : pref;
    trackState.mode = view.environment;
    const envSel = $('#environment-select');
    if (envSel) envSel.value = view.environment;
  }
}

function vehAppPlaceSingleRailOnRoute() {
  if (!vehicleRoot || !isRailConfig(state) || studioMode !== 'vehicle') return;
  const route = trackState.activeRoute;
  const pantoFactor = trackState.pantographRaised ? (state.railPantographHeight ?? 0.85) : 0;
  const manualCabinRad = degToRad(clamp(state.railCabinSwingDeg || 0, -12, 12));
  if (route) {
    const pose = solveRailUnitOnRoute(vehicleRoot.userData.layout, route, trackState.leadS, false);
    vehicleRoot.rotation.order = 'YXZ';
    vehicleRoot.position.set(pose.position[0], pose.position[1], pose.position[2]);
    vehicleRoot.rotation.set(pose.pitchRotX, pose.yaw, 0);
    const doorFactor = trackState.doorsOpenPreview ? 1 : clamp(state.railDoorsOpen ?? 0, 0, 1);
    const yawManual = degToRad(clamp(state.railBogieYawDeg || 0, -15, 15));
    const spinManual = trackState.playing
      ? trackState.wheelSpinRad
      : degToRad(state.railWheelSpinDeg || 0);
    applyRailVehiclePose(vehicleRoot, {
      frontBogieYawRad: route.curved ? pose.frontBogieLocalYaw : yawManual,
      rearBogieYawRad: route.curved ? pose.rearBogieLocalYaw : -yawManual,
      wheelSpinRad: spinManual,
      doorOpenFactor: doorFactor,
      pantographHeight: pantoFactor,
      tramArticulationRad: route.curved ? (pose.tramArticulationRad || 0) : degToRad(clamp(yawManual * 25, -18, 18)),
      cabinSwingRad: manualCabinRad + (pose.cabinSwingRad || 0)
    });
  } else {
    vehicleRoot.position.set(0, 0, 0);
    vehicleRoot.rotation.set(0, 0, 0);
    vehAppRefreshLivePose();
  }
}

function vehAppRefreshLivePose() {
  if (!vehicleRoot) return;
  const pantoFactor = trackState.pantographRaised ? (state.railPantographHeight ?? 0.85) : 0;
  const cabinRad = degToRad(clamp(state.railCabinSwingDeg || 0, -12, 12));
  if (studioMode === 'trainset') {
    const unitGrp = vehicleRoot.userData?.unitGroups?.[selectedUnitIndex];
    if (unitGrp) {
      unitGrp.userData.unitConfig = sanitiseConfig(state);
      const yawRad = degToRad(clamp(state.railBogieYawDeg || 0, -15, 15));
      applyRailVehiclePose(unitGrp, {
        frontBogieYawRad: yawRad,
        rearBogieYawRad: -yawRad,
        wheelSpinRad: degToRad(state.railWheelSpinDeg || 0),
        doorOpenFactor: trackState.doorsOpenPreview ? 1 : clamp(state.railDoorsOpen ?? 0, 0, 1),
        pantographHeight: pantoFactor,
        cabinSwingRad: cabinRad
      });
    }
    return;
  }
  if (isRailConfig(state)) {
    const yawRad = degToRad(clamp(state.railBogieYawDeg || 0, -15, 15));
    applyRailVehiclePose(vehicleRoot, {
      frontBogieYawRad: yawRad,
      rearBogieYawRad: -yawRad,
      wheelSpinRad: degToRad(state.railWheelSpinDeg || 0),
      doorOpenFactor: trackState.doorsOpenPreview ? 1 : clamp(state.railDoorsOpen ?? 0, 0, 1),
      pantographHeight: pantoFactor,
      tramArticulationRad: degToRad(clamp(yawRad * 25, -18, 18)),
      cabinSwingRad: cabinRad
    });
  }
}

function refreshMaterialsInPlace() {
  state = sanitiseConfig(state);
  if (studioMode === 'trainset' && consistState.units[selectedUnitIndex]) {
    consistState.units[selectedUnitIndex].config = copy(state);
    if (vehicleRoot?.userData?.unitGroups?.[selectedUnitIndex]) {
      vehicleRoot.userData.unitGroups[selectedUnitIndex].userData.unitConfig = copy(state);
    }
  }
  if (!ready || !vehicleRoot) return;
  vehAppApplyViewFlags();
  setStatus('Updated Materials');
}

function rebuild(resetCam = false) {
  state = sanitiseConfig(state);
  if (studioMode === 'trainset' && consistState.units[selectedUnitIndex]) {
    consistState.units[selectedUnitIndex].config = copy(state);
    if (consistState.sharedLivery) {
      applySharedLiveryToConsist(consistState, consistState.sharedPalette, locks);
      state = copy(consistState.units[selectedUnitIndex].config);
    }
  }
  vehAppSyncRailUI();
  if (!ready || !scene) return;

  if (vehicleRoot) {
    scene.remove(vehicleRoot);
    disposeObject(vehicleRoot);
    vehicleRoot = null;
  }

  const start = performance.now();

  if (studioMode === 'trainset') {
    consistState = sanitiseConsist(consistState);
    const preVal = validateConsist(consistState, null);
    const route = vehAppRebuildEnvironment({
      length: Math.max(44, (preVal.summary.totalLengthMeters || 50) + 12),
      width: 4,
      height: 5
    });
    if (route && (resetCam || trackState.leadS > route.sMax - 4 || trackState.leadS < route.sMin + preVal.summary.totalLengthMeters)) {
      trackState.leadS = Math.min(route.sMax - 6, preVal.summary.totalLengthMeters * 0.45);
    }
    vehicleRoot = createConsistMeshGroup(consistState, {
      route,
      leadS: trackState.leadS,
      wheelSpinRad: trackState.wheelSpinRad,
      doorOpenFactor: trackState.doorsOpenPreview ? 1 : null,
      pantographHeight: trackState.pantographRaised ? (state.railPantographHeight ?? 0.85) : 0,
      lightingTime: state.lightingTime
    });
    scene.add(vehicleRoot);
    consistValidation = validateConsist(consistState, route);
  } else {
    vehicleRoot = createCityVehicle(state);
    scene.add(vehicleRoot);
    vehAppRebuildEnvironment();
    vehAppPlaceSingleRailOnRoute();
  }

  vehAppApplyViewFlags();
  vehAppUpdateShadowBounds();
  rebuildVehicleDebugOverlay(debugRoot, vehicleRoot, view.debugOverlay);

  if (resetCam) {
    const camMode = studioMode === 'trainset' && view.focus === 'hero' ? 'fit_train' : view.focus;
    resetCameraForFocus(camera, orbit, vehicleRoot, camMode, scene);
  }

  const elapsed = (performance.now() - start).toFixed(1);
  updateStats(vehicleRoot.userData.blueprint);
  if (activeTab === 'consist') {
    renderControls('consist', $('#studio-controls'), state, locks, vehAppBuildControlContext());
  }
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

function vehAppSwitchStudioMode(nextMode, targetTab = null) {
  if (nextMode !== 'vehicle' && nextMode !== 'trainset') return;
  studioMode = nextMode;
  if (studioMode === 'trainset') {
    consistState = sanitiseConsist(consistState);
    selectedUnitIndex = clamp(selectedUnitIndex, 0, consistState.units.length - 1);
    state = copy(consistState.units[selectedUnitIndex].config);
    activeTab = targetTab || 'consist';
    if (!vehAppIsRailEnv(view.environment)) {
      view.environment = trackState.mode || 'rail_straight';
      const envSel = $('#environment-select');
      if (envSel) envSel.value = view.environment;
    }
  } else {
    trackState.playing = false;
    if (activeTab === 'consist') activeTab = 'structure';
    if (targetTab) activeTab = targetTab;
  }
  for (const t of $$('.studio-tab')) {
    t.classList.toggle('active', t.dataset.tab === activeTab);
  }
  updateStylePicker(state.style);
  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
  rebuild(true);
}

function vehAppBuildControlContext() {
  return {
    studioMode,
    selectedUnitIndex,
    consist: consistState,
    consistValidation,
    activeBlueprint: vehicleRoot?.userData?.blueprint || null,
    onStructureChanged(isLive) {
      activeBlueprintName = null;
      scheduleRebuild(!isLive ? true : false, false);
    },
    onPoseChanged() {
      vehAppRefreshLivePose();
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
    onSwitchTab(tabId) {
      activeTab = tabId;
      for (const t of $$('.studio-tab')) t.classList.toggle('active', t.dataset.tab === activeTab);
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    },
    onEnterTrainsetMode() {
      vehAppSwitchStudioMode('trainset', 'consist');
    },
    onLoadConsistPreset(presetId) {
      consistState = createConsistFromPreset(presetId, consistState.seed);
      selectedUnitIndex = 0;
      state = copy(consistState.units[0].config);
      trackState.leadS = 0;
      studioMode = 'trainset';
      vehAppApplyPreferredStage(state);
      rebuild(true);
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
      toast(`Loaded Consist: ${RAIL_DEFAULT_CONSISTS[presetId]?.name || presetId}`);
    },
    onSelectConsistUnit(idx) {
      selectedUnitIndex = clamp(idx, 0, consistState.units.length - 1);
      state = copy(consistState.units[selectedUnitIndex].config);
      activePreset = getStyle(state.style).preset;
      updateStylePicker(state.style);
      updatePresetList(activePreset);
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    },
    onAddConsistUnit(presetId) {
      consistState = addConsistUnit(consistState, presetId);
      selectedUnitIndex = consistState.units.length - 1;
      state = copy(consistState.units[selectedUnitIndex].config);
      studioMode = 'trainset';
      rebuild(true);
      toast(`Added ${getStyle(state.style).label}`);
    },
    onRemoveConsistUnit(idx) {
      consistState = removeConsistUnit(consistState, idx);
      selectedUnitIndex = clamp(selectedUnitIndex, 0, consistState.units.length - 1);
      state = copy(consistState.units[selectedUnitIndex].config);
      rebuild(true);
    },
    onDuplicateConsistUnit(idx) {
      consistState = duplicateConsistUnit(consistState, idx);
      selectedUnitIndex = clamp(idx + 1, 0, consistState.units.length - 1);
      state = copy(consistState.units[selectedUnitIndex].config);
      rebuild(false);
    },
    onReorderConsistUnit(fromIdx, toIdx) {
      consistState = reorderConsistUnit(consistState, fromIdx, toIdx);
      selectedUnitIndex = clamp(toIdx, 0, consistState.units.length - 1);
      state = copy(consistState.units[selectedUnitIndex].config);
      rebuild(false);
    },
    onReverseConsistUnit(idx) {
      consistState = reverseConsistUnit(consistState, idx);
      rebuild(false);
    },
    onRandomizeConsistUnit(idx) {
      consistState = randomizeConsistUnit(consistState, idx, locks);
      if (idx === selectedUnitIndex) state = copy(consistState.units[idx].config);
      rebuild(false);
    },
    onConsistGapChanged(gapVal) {
      consistState.couplingGap = gapVal;
      rebuild(false);
    },
    onToggleSharedLivery(enabled, palette) {
      consistState.sharedLivery = enabled;
      consistState.sharedPalette = palette;
      if (enabled) applySharedLiveryToConsist(consistState, palette, locks);
      state = copy(consistState.units[selectedUnitIndex].config);
      rebuild(false);
    },
    onApplySharedLivery(palette) {
      consistState.sharedPalette = palette;
      applySharedLiveryToConsist(consistState, palette, locks);
      state = copy(consistState.units[selectedUnitIndex].config);
      rebuild(false);
      toast('Applied Shared Livery To Consist');
    },
    onRandomizeWholeConsist() {
      consistState = randomizeWholeConsist(consistState, locks);
      selectedUnitIndex = 0;
      state = copy(consistState.units[0].config);
      rebuild(true);
      toast('Randomized Rail Consist');
    },
    onLoadSavedConsist(loadedConsist, label) {
      consistState = sanitiseConsist(loadedConsist);
      selectedUnitIndex = 0;
      state = copy(consistState.units[0].config);
      studioMode = 'trainset';
      rebuild(true);
      toast(`Loaded "${label}"`);
    },
    onToast: toast,
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
      if (studioMode === 'trainset') exportConsistBlueprint(consistState, trackState.activeRoute, toast);
      else exportVehicleBlueprint(state, activeBlueprintName, toast);
    },
    onExportFleet() {
      exportTrafficFleetPack(state, 8, toast);
    },
    onExportJSON() {
      exportVehicleJSON(state, activeBlueprintName, toast);
    },
    onExportGLB() {
      if (studioMode === 'trainset') {
        exportConsistGLB(consistState, trackState.activeRoute, trackState.leadS, ready, vehAppLoadGLTFExporter, toast, setStatus);
      } else {
        exportVehicleGLB(state, ready, activeBlueprintName, vehAppLoadGLTFExporter, toast, setStatus);
      }
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

  if (studioMode === 'trainset' && !isRailConfig(state)) {
    studioMode = 'vehicle';
    trackState.playing = false;
    if (activeTab === 'consist') activeTab = 'structure';
  }
  if (studioMode === 'trainset' && consistState.units[selectedUnitIndex]) {
    consistState.units[selectedUnitIndex].preset = presetId;
    consistState.units[selectedUnitIndex].config = copy(state);
  }

  const seedEl = $('#seed-input');
  if (seedEl) seedEl.value = String(state.seed);
  vehAppApplyPreferredStage(state);

  updateStylePicker(state.style);
  updatePresetList(activePreset);
  for (const t of $$('.studio-tab')) t.classList.toggle('active', t.dataset.tab === activeTab);
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
    keyLight.shadow.camera.far = 90;
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    scene.add(keyLight.target);

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
      const nowMs = performance.now();
      const dt = trackState.lastTickMs ? clamp((nowMs - trackState.lastTickMs) / 1000, 0, 0.05) : 0;
      trackState.lastTickMs = nowMs;

      if ((studioMode === 'trainset' || isRailConfig(state)) && trackState.playing && vehicleRoot && trackState.activeRoute && dt > 0) {
        const route = trackState.activeRoute;
        const dir = trackState.reverse ? -1 : 1;
        const ds = dir * trackState.speed * dt;
        const trainLen = studioMode === 'trainset'
          ? (vehicleRoot.userData?.consistBlueprint?.summary?.totalLengthMeters || 35)
          : (state.overallLength || 16);
        const minLead = route.sMin + trainLen + 4;
        const maxLead = route.sMax - 4;
        trackState.leadS += ds;
        if (trackState.leadS > maxLead) trackState.leadS = minLead;
        else if (trackState.leadS < minLead) trackState.leadS = maxLead;
        trackState.wheelSpinRad += ds / 0.48;

        const leadGrp = studioMode === 'trainset' ? vehicleRoot.userData?.unitGroups?.[0] : vehicleRoot;
        const prevPos = leadGrp ? leadGrp.position.clone() : null;

        if (studioMode === 'trainset') {
          positionConsistOnRoute(
            vehicleRoot,
            route,
            trackState.leadS,
            trackState.wheelSpinRad,
            trackState.doorsOpenPreview ? 1 : null,
            {
              pantographHeight: trackState.pantographRaised ? (state.railPantographHeight ?? 0.85) : 0
            }
          );
        } else {
          vehAppPlaceSingleRailOnRoute();
        }

        if (trackState.followCamera && leadGrp && prevPos && orbit && camera) {
          const delta = leadGrp.position.clone().sub(prevPos);
          orbit.target.add(delta);
          camera.position.add(delta);
        }
      }

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
  if (studioMode === 'trainset' && !isRailConfig(state)) {
    studioMode = 'vehicle';
  }
  const seedEl = $('#seed-input');
  if (seedEl) seedEl.value = String(state.seed);
  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
  rebuild(true);
  setStatus(`Loaded: ${sourceLabel}`);
}

function vehAppApplyImportedConsist(consistData, sourceLabel) {
  consistState = sanitiseConsist(consistData);
  selectedUnitIndex = 0;
  state = copy(consistState.units[0].config);
  studioMode = 'trainset';
  activeTab = 'consist';
  for (const t of $$('.studio-tab')) t.classList.toggle('active', t.dataset.tab === activeTab);
  updateStylePicker(state.style);
  renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
  rebuild(true);
  setStatus(`Loaded Consist: ${sourceLabel}`);
}

function initUI() {
  const refreshListsForCategory = () => {
    renderStylePicker($('#style-picker'), state.style, (styleId) => {
      const arch = getStyle(styleId);
      loadPreset(arch.preset, styleId);
    }, categoryFilter, transitSubgroup);
    renderPresetList($('#preset-list'), activePreset, (presetId) => {
      loadPreset(presetId);
    }, categoryFilter, transitSubgroup);
  };
  refreshListsForCategory();

  for (const pill of $$('[data-cat-filter]')) {
    pill.addEventListener('click', () => {
      categoryFilter = pill.dataset.catFilter || 'all';
      for (const p of $$('[data-cat-filter]')) p.classList.toggle('active', p === pill);
      vehAppSyncRailUI();
      refreshListsForCategory();
    });
  }

  for (const subPill of $$('[data-transit-subgroup]')) {
    subPill.addEventListener('click', () => {
      transitSubgroup = subPill.dataset.transitSubgroup || 'all_transit';
      for (const p of $$('[data-transit-subgroup]')) p.classList.toggle('active', p === subPill);
      refreshListsForCategory();
    });
  }

  for (const modeBtn of $$('[data-studio-mode]')) {
    modeBtn.addEventListener('click', () => {
      vehAppSwitchStudioMode(modeBtn.dataset.studioMode || 'vehicle');
    });
  }

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
    if (vehAppIsRailEnv(view.environment)) {
      trackState.mode = view.environment;
      trackState.curved = view.environment === 'rail_curved';
    }
    vehAppSyncRailUI();
    if (studioMode === 'trainset' || isRailConfig(state)) rebuild(false);
    else vehAppRebuildEnvironment();
  });

  for (const tBtn of $$('[data-track-mode]')) {
    tBtn.addEventListener('click', () => {
      const m = tBtn.dataset.trackMode || 'rail_straight';
      trackState.mode = m;
      trackState.curved = m === 'rail_curved';
      if (m !== 'rail_incline' && vehAppIsFixedGuidewayMode(view.environment)) {
        // Keep active street tram / monorail / cableway guideway and toggle straight vs curved
      } else {
        view.environment = m;
        const envSel = $('#environment-select');
        if (envSel) envSel.value = m;
      }
      vehAppSyncRailUI();
      rebuild(false);
    });
  }

  $('#track-curve-radius')?.addEventListener('input', (e) => {
    trackState.curveRadius = clamp(Number(e.target.value) || 48, 25, 150);
    const valEl = $('#track-curve-val');
    if (valEl) valEl.textContent = `${Math.round(trackState.curveRadius)}m`;
    if (view.environment === 'rail_curved' || trackState.curved) rebuild(false);
  });

  $('#btn-track-play')?.addEventListener('click', () => {
    trackState.playing = !trackState.playing;
    trackState.lastTickMs = performance.now();
    vehAppSyncRailUI();
  });

  $('#btn-track-reverse')?.addEventListener('click', () => {
    trackState.reverse = !trackState.reverse;
    vehAppSyncRailUI();
  });

  $('#btn-track-reset')?.addEventListener('click', () => {
    trackState.playing = false;
    trackState.leadS = 0;
    trackState.wheelSpinRad = 0;
    vehAppSyncRailUI();
    rebuild(true);
  });

  $('#track-speed')?.addEventListener('input', (e) => {
    trackState.speed = clamp(Number(e.target.value) || 6, 1, 18);
  });

  $('#track-follow')?.addEventListener('change', (e) => {
    trackState.followCamera = Boolean(e.target.checked);
  });

  $('#rail-doors-toggle')?.addEventListener('change', (e) => {
    trackState.doorsOpenPreview = Boolean(e.target.checked);
    state.railDoorsOpen = trackState.doorsOpenPreview ? 1 : 0;
    state.doorsOpen = trackState.doorsOpenPreview;
    if (studioMode === 'trainset') {
      for (const u of consistState.units) {
        u.config.railDoorsOpen = state.railDoorsOpen;
        u.config.doorsOpen = state.doorsOpen;
      }
      positionConsistOnRoute(
        vehicleRoot,
        trackState.activeRoute,
        trackState.leadS,
        trackState.wheelSpinRad,
        trackState.doorsOpenPreview ? 1 : 0,
        {
          pantographHeight: trackState.pantographRaised ? (state.railPantographHeight ?? 0.85) : 0
        }
      );
    } else {
      vehAppRefreshLivePose();
    }
    if (activeTab === 'doors') {
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    }
  });

  $('#rail-panto-toggle')?.addEventListener('change', (e) => {
    trackState.pantographRaised = Boolean(e.target.checked);
    state.railPantographHeight = trackState.pantographRaised ? 0.88 : 0.0;
    if (studioMode === 'trainset') {
      for (const u of consistState.units) {
        u.config.railPantographHeight = state.railPantographHeight;
      }
      positionConsistOnRoute(
        vehicleRoot,
        trackState.activeRoute,
        trackState.leadS,
        trackState.wheelSpinRad,
        trackState.doorsOpenPreview ? 1 : 0,
        { pantographHeight: state.railPantographHeight }
      );
    } else {
      vehAppRefreshLivePose();
    }
    if (activeTab === 'details') {
      renderControls(activeTab, $('#studio-controls'), state, locks, vehAppBuildControlContext());
    }
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

  const doBlueprint = () => {
    if (studioMode === 'trainset') exportConsistBlueprint(consistState, trackState.activeRoute, toast);
    else exportVehicleBlueprint(state, activeBlueprintName, toast);
  };
  const doFleet = () => exportTrafficFleetPack(state, 8, toast);
  const doJSON = () => exportVehicleJSON(state, activeBlueprintName, toast);
  const doGLB = () => {
    if (studioMode === 'trainset') {
      exportConsistGLB(consistState, trackState.activeRoute, trackState.leadS, ready, vehAppLoadGLTFExporter, toast, setStatus);
    } else {
      exportVehicleGLB(state, ready, activeBlueprintName, vehAppLoadGLTFExporter, toast, setStatus);
    }
  };

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
      handleVehicleFileImport(file, vehAppApplyImported, toast, vehAppApplyImportedConsist);
      e.target.value = '';
    }
  });
}

window.BCityVehicleBlueprint = {
  version: '1.1.0',
  schemaVersion: 'b.vehicle.v1',
  trainsetSchemaVersion: 'b.trainset.v1',
  archetypes: STYLES,
  presets: PRESETS,
  consistPresets: RAIL_DEFAULT_CONSISTS,
  getConfig: () => sanitiseConfig(state),
  getConsist: () => sanitiseConsist(consistState),
  generateBlueprint: (cfg) => generateVehicleBlueprint(cfg || state),
  validateBlueprint: (input) => validateVehicleBlueprint(input),
  createVehicleMesh: (cfg) => createCityVehicle(cfg || state),
  generateConsistBlueprint: (c, opts) => generateConsistBlueprint(c || consistState, opts),
  validateConsist: (c, route) => validateConsist(c || consistState, route),
  createConsistMesh: (c, opts) => createConsistMeshGroup(c || consistState, opts),
  loadPreset,
  loadConsistPreset: (id) => {
    consistState = createConsistFromPreset(id);
    selectedUnitIndex = 0;
    state = copy(consistState.units[0].config);
    vehAppSwitchStudioMode('trainset', 'consist');
  },
  setStudioMode: (mode) => vehAppSwitchStudioMode(mode),
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
