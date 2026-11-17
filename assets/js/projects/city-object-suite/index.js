import { $, $$, copy, roundNum } from './utils.js';
import {
  BLUEPRINT_SCHEMA_VERSION,
  ASSEMBLY_SCHEMA_VERSION,
  FAVORITES_KEY,
  SPACE_GROUPS,
  OBJECT_CATEGORIES,
  ATTACHMENT_PROFILES,
  ARCHITECTURAL_STYLES,
  SIZE_CLASSES,
  FUNCTIONAL_ROLES,
  CONDITION_LEVELS,
  VARIATION_MODES,
  LOCATION_CONTEXTS,
  ENVIRONMENT_TAGS
} from './core/categories.js';
import {
  getObjectFamily,
  getAllObjectFamilies,
  getObjectPreset,
  getAllObjectPresets,
  getPresetsForFamily,
  getCategoryMeta,
  getAllCatalogTags,
  getAllEnvironmentTags,
  searchCatalog,
  buildDefaultConfigForFamily,
  sanitiseObjectConfig,
  applyObjectPresetWithLocks,
  hasObjectFamily,
  registerGeneratorModule,
  runRegisteredGeneratorModules
} from './core/registry.js';
import { generateObjectBlueprint, validateObjectBlueprint, checkBlueprintCompatibility } from './core/blueprints.js';
import {
  applyObjectSeedVariation,
  generateVariationCandidates,
  randomizeObjectSettings
} from './core/variation.js';
import {
  ensureCityObjectRegistry,
  buildSingleObjectGroup,
  buildCityObject,
  registerCompositeAssemblies
} from './core/assemblies.js';
import { OBJECT_MATERIAL_FAMILIES, URBAN_PALETTES, generateObjectPalette } from './materials/palettes.js';
import {
  setObjectMaxAnisotropy,
  clearObjectMaterialCache,
  resolveObjectMaterialBundle,
  reapplyObjectMaterials
} from './materials/materials.js';
import {
  disposeObjectGroup,
  rebuildObjectEnvironment,
  rebuildObjectDebugOverlay,
  resetObjectCameraForFocus,
  snapshotObjectPreview,
  toggleObjTheatreMode,
  isObjFullscreenActive,
  toggleObjFullscreenViewport,
  exitObjFullscreenViewport,
  handleObjFullscreenChange,
  handleObjStudioKeydown
} from './studio/preview.js';
import {
  renderCatalogFilterControls,
  renderCatalogResults,
  renderVariationBrowser
} from './studio/catalog-ui.js';
import {
  initCatalogThumbnailView,
  openCatalogThumbnailView,
  closeCatalogThumbnailView
} from './studio/catalog-thumbnail-view.js';
import { renderObjectControlsPanel } from './studio/controls-ui.js';
import {
  exportCityObjectGLB,
  exportCityObjectBlueprint,
  exportCityAssemblyPack,
  applyImportedObjectData,
  handleObjectFileImport
} from './studio/export.js';

ensureCityObjectRegistry();

export {
  ensureCityObjectRegistry,
  buildSingleObjectGroup,
  buildCityObject,
  registerCompositeAssemblies,
  getObjectFamily,
  getAllObjectFamilies,
  getObjectPreset,
  getAllObjectPresets,
  getPresetsForFamily,
  getCategoryMeta,
  getAllCatalogTags,
  getAllEnvironmentTags,
  searchCatalog,
  buildDefaultConfigForFamily,
  sanitiseObjectConfig,
  applyObjectPresetWithLocks,
  generateObjectBlueprint,
  validateObjectBlueprint,
  applyObjectSeedVariation,
  generateVariationCandidates,
  randomizeObjectSettings,
  setObjectMaxAnisotropy,
  clearObjectMaterialCache,
  resolveObjectMaterialBundle,
  reapplyObjectMaterials,
  rebuildObjectEnvironment,
  rebuildObjectDebugOverlay,
  OBJECT_CATEGORIES,
  ATTACHMENT_PROFILES,
  ARCHITECTURAL_STYLES,
  SIZE_CLASSES,
  FUNCTIONAL_ROLES,
  CONDITION_LEVELS,
  VARIATION_MODES,
  LOCATION_CONTEXTS,
  ENVIRONMENT_TAGS,
  URBAN_PALETTES,
  OBJECT_MATERIAL_FAMILIES
};

let objState = buildDefaultConfigForFamily('commercial_dumpster', 'standard_green_dumpster');
let objActiveTab = 'structure';
const objLocks = new Set();
const objFavorites = new Set();

const objCatalogUiState = {
  query: '',
  filters: {
    spaceGroup: 'all',
    categoryId: 'all',
    subcategory: 'all',
    attachmentProfile: 'all',
    architecturalStyle: 'all',
    sizeClass: 'all',
    functionalRole: 'all',
    tag: 'all',
    locationContext: 'all',
    environmentTag: 'all',
    favoritesOnly: false
  }
};

const objView = {
  stage: 'auto',
  helpers: {
    grid: true,
    humanScale: true,
    wall: false,
    sidewalk: false,
    parkingSpace: false
  },
  autoRotate: false,
  silhouetteMode: false,
  wireframe: false,
  debugOverlay: false,
  theatre: false,
  fullscreen: false
};

let objRenderer = null;
let objScene = null;
let objCamera = null;
let objOrbit = null;
let objPropRoot = null;
let objEnvRoot = null;
let objDebugRoot = null;
let objHemiLight = null;
let objKeyLight = null;
let objRimLight = null;
let objReady = false;
let objRebuildTimer = null;

function objAppToast(msg) {
  const wrap = $('#studio-toasts');
  if (!wrap || !msg) return;
  const el = document.createElement('div');
  el.className = 'studio-toast';
  el.textContent = String(msg);
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function objAppLoadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((id) => objFavorites.add(id));
  } catch {
    // Ignore storage read errors
  }
}

function objAppSaveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(objFavorites)));
  } catch {
    // Ignore storage write errors
  }
}

function objAppLoadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script')).find((s) => s.src === url);
    if (existing) {
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

async function objAppEnsureThree() {
  if (typeof THREE === 'undefined') {
    await objAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
  }
  if (!THREE.OrbitControls) {
    await objAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
  }
  if (!THREE.GLTFExporter) {
    await objAppLoadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js');
  }
}

function objAppUpdateLighting() {
  if (!objScene || !objHemiLight || !objKeyLight || !objRimLight) return;
  const mode = objState.lightingTime || 'day';
  if (mode === 'golden_hour') {
    objScene.background.set('#2b2434');
    objHemiLight.color.set('#ffe0b5');
    objHemiLight.groundColor.set('#302536');
    objHemiLight.intensity = 0.72;
    objKeyLight.color.set('#ffb86b');
    objKeyLight.intensity = 1.15;
    objRimLight.color.set('#6aa2d9');
    objRimLight.intensity = 0.42;
  } else if (mode === 'dusk') {
    objScene.background.set('#141c2c');
    objHemiLight.color.set('#6e89b8');
    objHemiLight.groundColor.set('#141821');
    objHemiLight.intensity = 0.45;
    objKeyLight.color.set('#9ab8e8');
    objKeyLight.intensity = 0.65;
    objRimLight.color.set('#4de2ff');
    objRimLight.intensity = 0.55;
  } else if (mode === 'night') {
    objScene.background.set('#0b1019');
    objHemiLight.color.set('#364c6b');
    objHemiLight.groundColor.set('#0a0e14');
    objHemiLight.intensity = 0.34;
    objKeyLight.color.set('#6284b5');
    objKeyLight.intensity = 0.44;
    objRimLight.color.set('#4de2ff');
    objRimLight.intensity = 0.62;
  } else {
    objScene.background.set('#132030');
    objHemiLight.color.set('#d8ecff');
    objHemiLight.groundColor.set('#22303e');
    objHemiLight.intensity = 0.78;
    objKeyLight.color.set('#fff5e6');
    objKeyLight.intensity = 1.05;
    objRimLight.color.set('#7fd4ff');
    objRimLight.intensity = 0.4;
  }
}

function objAppUpdateHud(bp) {
  if (!bp) return;
  const dim = bp.dimensions || {};
  const stats = bp.geometryStats || {};
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setTxt('hud-dims', `${roundNum(dim.widthMeters, 2)}m × ${roundNum(dim.heightMeters, 2)}m × ${roundNum(dim.depthMeters, 2)}m`);
  setTxt('hud-tris', `${stats.triangleCount || 0} Tris · ${stats.meshCount || 0} Meshes`);
  setTxt('hud-attach', `${bp.placement?.attachmentLabel || 'Ground-Standing'} · ${bp.condition?.label || 'Clean'}`);
  setTxt('hud-bunits', `${roundNum(dim.bGameUnits?.width || 0, 1)} × ${roundNum(dim.bGameUnits?.depth || 0, 1)} × ${roundNum(dim.bGameUnits?.height || 0, 1)} B`);
}

function objAppRebuildObject(options = {}) {
  if (!objReady || !objPropRoot) return;
  disposeObjectGroup(objPropRoot);

  const built = buildCityObject(objState, {
    locks: objLocks,
    lightingTime: objState.lightingTime
  });
  objPropRoot.add(built);

  if (objView.silhouetteMode || objView.wireframe) {
    reapplyObjectMaterials(objPropRoot, objState, objView);
  }

  const bp = built.userData?.blueprint || built.blueprint;
  objPropRoot.userData.blueprint = bp;

  rebuildObjectEnvironment(objEnvRoot, objState, objView, bp);
  rebuildObjectDebugOverlay(objDebugRoot, built, objView);
  objAppUpdateHud(bp);

  if (options.refocusCamera) {
    resetObjectCameraForFocus(objCamera, objOrbit, bp, built);
  }

  if (!options.skipControlRerender) {
    objAppRenderRightPanel(bp);
  }
}

function objAppScheduleRebuild(options = {}) {
  clearTimeout(objRebuildTimer);
  objRebuildTimer = setTimeout(() => {
    objAppRebuildObject(options);
  }, options.immediate ? 0 : 28);
}

function objAppResizeStage() {
  if (!objRenderer || !objCamera) return;
  const stageEl = $('#object-canvas-wrap');
  if (!stageEl) return;
  const w = Math.max(240, stageEl.clientWidth || 640);
  const h = Math.max(220, stageEl.clientHeight || 480);
  objRenderer.setSize(w, h, false);
  objCamera.aspect = w / h;
  objCamera.updateProjectionMatrix();
}

function objAppRenderCatalog() {
  renderCatalogFilterControls(objCatalogUiState, () => {
    objAppRenderCatalog();
  });
  renderCatalogResults(objState, objCatalogUiState, objFavorites, {
    onSelectPreset: (presetId) => objAppLoadPreset(presetId),
    onToggleFavorite: (famId) => {
      if (objFavorites.has(famId)) objFavorites.delete(famId);
      else objFavorites.add(famId);
      objAppSaveFavorites();
      objAppRenderCatalog();
    }
  });
  renderVariationBrowser(objState, objLocks, {
    onApplyVariation: (cfg, label) => {
      objState = sanitiseObjectConfig(cfg);
      objAppRenderCatalog();
      objAppRebuildObject({ refocusCamera: false });
      objAppToast(`Applied ${label}`);
    }
  });
}

function objAppRenderRightPanel(bp = null) {
  const currentBp = bp || objPropRoot?.userData?.blueprint || null;
  renderObjectControlsPanel(objState, objView, objLocks, objActiveTab, currentBp, {
    onToggleLock: (key) => {
      if (objLocks.has(key)) objLocks.delete(key);
      else objLocks.add(key);
      objAppRenderRightPanel(currentBp);
    },
    onChangeField: (key, val, opts = {}) => {
      const nextPatch = { ...objState, [key]: val };
      if (objState.familyId === 'computer_workstation' && !objLocks.has('attachmentProfile')) {
        if (key === 'workstationStyle' && val === 'server_rack') {
          nextPatch.attachmentProfile = 'ground_standing';
        } else if (key === 'deskStyle' && nextPatch.workstationStyle !== 'server_rack') {
          nextPatch.attachmentProfile = val === 'none' ? 'surface_placed' : 'ground_standing';
        } else if (key === 'workstationStyle' && val !== 'server_rack' && (!nextPatch.deskStyle || nextPatch.deskStyle === 'none')) {
          nextPatch.attachmentProfile = 'surface_placed';
        }
      }
      objState = sanitiseObjectConfig(nextPatch);
      if (key === 'lightingTime') objAppUpdateLighting();
      if (!opts.skipControlRerender && (opts.rerenderControls || key === 'paletteFamily')) {
        objAppRenderRightPanel(currentBp);
      }
      if (key === 'seed' || key === 'condition' || key === 'paletteFamily') {
        renderVariationBrowser(objState, objLocks, {
          onApplyVariation: (cfg, label) => {
            objState = sanitiseObjectConfig(cfg);
            objAppRenderCatalog();
            objAppRebuildObject({ refocusCamera: false });
            objAppToast(`Applied ${label}`);
          }
        });
      }
      objAppScheduleRebuild({
        refocusCamera: key === 'attachmentProfile' || key === 'deskStyle' || key === 'workstationStyle',
        skipControlRerender: Boolean(opts.skipControlRerender)
      });
    },
    onApplyPalette: (pal) => {
      const merged = { ...objState };
      for (const [k, v] of Object.entries(pal)) {
        if (!objLocks.has(k)) merged[k] = v;
      }
      objState = sanitiseObjectConfig(merged);
      objAppRenderRightPanel(currentBp);
      renderVariationBrowser(objState, objLocks, {
        onApplyVariation: (cfg, label) => {
          objState = sanitiseObjectConfig(cfg);
          objAppRenderCatalog();
          objAppRebuildObject({ refocusCamera: false });
          objAppToast(`Applied ${label}`);
        }
      });
      objAppRebuildObject();
      objAppToast(`Applied Palette: ${pal.paletteFamily}`);
    },
    onChangeStage: (stageId) => {
      objView.stage = stageId;
      rebuildObjectEnvironment(objEnvRoot, objState, objView, currentBp);
    },
    onToggleHelper: (helperKey, enabled) => {
      objView.helpers[helperKey] = Boolean(enabled);
      rebuildObjectEnvironment(objEnvRoot, objState, objView, currentBp);
    },
    onRandomizeScope: (scope) => {
      objState = randomizeObjectSettings(objState, scope, objLocks);
      objAppRenderCatalog();
      objAppRebuildObject();
      objAppToast(`Randomized ${scope}`);
    },
    onExportGlb: () => exportCityObjectGLB(objPropRoot?.children?.[0], objState, objAppToast),
    onExportBlueprint: () => exportCityObjectBlueprint(objPropRoot?.children?.[0], objState, objAppToast),
    onExportPack: () => exportCityAssemblyPack(objState, objLocks, objAppToast),
    onTriggerImport: () => $('#file-import')?.click(),
    onRefreshSaved: (msg) => {
      objAppRenderRightPanel(currentBp);
      if (msg) objAppToast(msg);
    },
    onLoadSavedConfig: (cfg, name) => {
      objState = sanitiseObjectConfig(cfg);
      objAppRenderCatalog();
      objAppRebuildObject({ refocusCamera: true });
      objAppToast(`Loaded "${name}"`);
    }
  });
}

export function objAppLoadPreset(presetId) {
  objState = applyObjectPresetWithLocks(objState, presetId, objLocks);
  objAppRenderCatalog();
  objAppRebuildObject({ refocusCamera: true });
}

function objAppInitUI() {
  objAppLoadFavorites();

  // Search and catalog filter bindings
  $('#catalog-search-input')?.addEventListener('input', (e) => {
    objCatalogUiState.query = e.target.value || '';
    objAppRenderCatalog();
  });

  $('#catalog-subcategory-select')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.subcategory = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-attachment')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.attachmentProfile = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-style')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.architecturalStyle = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-size')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.sizeClass = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-role')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.functionalRole = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-tag')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.tag = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-location')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.locationContext = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-env-tag')?.addEventListener('change', (e) => {
    objCatalogUiState.filters.environmentTag = e.target.value || 'all';
    objAppRenderCatalog();
  });

  $('#filter-favs-btn')?.addEventListener('click', (e) => {
    objCatalogUiState.filters.favoritesOnly = !objCatalogUiState.filters.favoritesOnly;
    e.currentTarget.classList.toggle('active', objCatalogUiState.filters.favoritesOnly);
    objAppRenderCatalog();
  });

  $('#btn-facets-toggle')?.addEventListener('click', (e) => {
    const drawer = $('#catalog-facets-drawer');
    if (!drawer) return;
    const open = drawer.classList.toggle('open');
    e.currentTarget.classList.toggle('active', open);
  });

  $('#btn-clear-filters')?.addEventListener('click', () => {
    objCatalogUiState.query = '';
    objCatalogUiState.filters = {
      spaceGroup: 'all',
      categoryId: 'all',
      subcategory: 'all',
      attachmentProfile: 'all',
      architecturalStyle: 'all',
      sizeClass: 'all',
      functionalRole: 'all',
      tag: 'all',
      locationContext: 'all',
      environmentTag: 'all',
      favoritesOnly: false
    };
    const searchEl = $('#catalog-search-input');
    if (searchEl) searchEl.value = '';
    $('#filter-favs-btn')?.classList.remove('active');
    ['#filter-location', '#filter-env-tag', '#filter-attachment', '#filter-style', '#filter-size', '#filter-role', '#filter-tag'].forEach((sel) => {
      const node = $(sel);
      if (node) node.value = 'all';
    });
    objAppRenderCatalog();
  });

  // Tabs
  $$('.studio-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      objActiveTab = tab.dataset.tab || 'structure';
      $$('.studio-tab').forEach((t) => t.classList.toggle('active', t === tab));
      objAppRenderRightPanel();
    });
  });

  // Top & viewport toolbar controls
  $('#btn-randomize-all')?.addEventListener('click', () => {
    objState = randomizeObjectSettings(objState, 'all', objLocks);
    objAppRenderCatalog();
    objAppRebuildObject({ refocusCamera: true });
    objAppToast('Randomized Unlocked Properties');
  });

  $('#btn-variation-seed')?.addEventListener('click', () => {
    if (!objLocks.has('seed')) {
      objState.seed = Math.floor(Math.random() * 900000) + 10000;
    }
    objState = applyObjectSeedVariation(objState, objLocks);
    objAppRenderCatalog();
    objAppRebuildObject();
    objAppToast(`Variation Seed #${objState.seed}`);
  });

  $('#btn-refresh-variations')?.addEventListener('click', () => {
    if (!objLocks.has('seed')) {
      objState.seed = ((objState.seed || 1024) + 373) % 999999 + 1;
    }
    objAppRenderCatalog();
    objAppRebuildObject();
  });

  $('#btn-reset-cam')?.addEventListener('click', () => {
    const bp = objPropRoot?.userData?.blueprint;
    resetObjectCameraForFocus(objCamera, objOrbit, bp, objPropRoot?.children?.[0]);
  });

  $('#btn-rotate')?.addEventListener('click', (e) => {
    objView.autoRotate = !objView.autoRotate;
    if (objOrbit) objOrbit.autoRotate = objView.autoRotate;
    e.currentTarget.classList.toggle('active', objView.autoRotate);
  });

  const toggleSilhouetteFn = () => {
    objView.silhouetteMode = !objView.silhouetteMode;
    $('#btn-silhouette')?.classList.toggle('active', objView.silhouetteMode);
    reapplyObjectMaterials(objPropRoot, objState, objView);
    objAppToast(objView.silhouetteMode ? 'Silhouette Clay Mode On' : 'Silhouette Mode Off');
  };
  $('#btn-silhouette')?.addEventListener('click', toggleSilhouetteFn);

  $('#btn-wireframe')?.addEventListener('click', (e) => {
    objView.wireframe = !objView.wireframe;
    e.currentTarget.classList.toggle('active', objView.wireframe);
    reapplyObjectMaterials(objPropRoot, objState, objView);
  });

  const toggleDebugFn = () => {
    objView.debugOverlay = !objView.debugOverlay;
    $('#btn-debug-overlay')?.classList.toggle('active', objView.debugOverlay);
    rebuildObjectDebugOverlay(objDebugRoot, objPropRoot?.children?.[0], objView);
    objAppToast(objView.debugOverlay ? 'Placement & Collision Gizmos On' : 'Debug Gizmos Off');
  };
  $('#btn-debug-overlay')?.addEventListener('click', toggleDebugFn);

  const toggleHumanFn = () => {
    objView.helpers.humanScale = !objView.helpers.humanScale;
    const bp = objPropRoot?.userData?.blueprint;
    rebuildObjectEnvironment(objEnvRoot, objState, objView, bp);
    objAppRenderRightPanel(bp);
    objAppToast(objView.helpers.humanScale ? 'Human Scale Reference Shown' : 'Human Scale Hidden');
  };

  $('#lighting-select')?.addEventListener('change', (e) => {
    objState.lightingTime = e.target.value || 'day';
    objAppUpdateLighting();
    objAppRebuildObject();
  });

  const doSnapshot = () => snapshotObjectPreview(objRenderer, objScene, objCamera, objState, objAppToast);
  $('#btn-stage-snapshot')?.addEventListener('click', doSnapshot);

  const toggleTheatre = () => toggleObjTheatreMode(objView, objAppToast, objAppResizeStage);
  const toggleFullscreen = () => toggleObjFullscreenViewport(objView, objAppToast, objAppResizeStage);
  const exitFullscreen = () => exitObjFullscreenViewport(objView, objAppToast, objAppResizeStage);

  $('#btn-theatre')?.addEventListener('click', toggleTheatre);
  $('#btn-theatre-quick')?.addEventListener('click', toggleTheatre);
  $('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  $('#btn-fullscreen-quick')?.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => handleObjFullscreenChange(objView, objAppResizeStage));
  document.addEventListener('keydown', (e) => {
    const ctvModal = $('#catalog-view-modal');
    if (ctvModal && !ctvModal.hidden) return;
    handleObjStudioKeydown(e, {
      toggleFullscreen,
      toggleTheatre,
      toggleDebug: toggleDebugFn,
      toggleSilhouette: toggleSilhouetteFn,
      toggleHumanScale: toggleHumanFn,
      snapshot: doSnapshot,
      exitFullscreen
    });
  });

  initCatalogThumbnailView({
    getActivePresetId: () => objState.presetId || '',
    onSelectPreset: (presetId) => {
      objCatalogUiState.query = '';
      objCatalogUiState.filters.spaceGroup = 'all';
      objCatalogUiState.filters.categoryId = 'all';
      objCatalogUiState.filters.subcategory = 'all';
      const searchEl = $('#catalog-search-input');
      if (searchEl) searchEl.value = '';
      objAppLoadPreset(presetId);
      const preset = getObjectPreset(presetId);
      objAppToast(`Loaded "${preset?.label || presetId}" For Customization`);
      $('#object-canvas')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  $('#btn-export-glb-top')?.addEventListener('click', () => {
    exportCityObjectGLB(objPropRoot?.children?.[0], objState, objAppToast);
  });

  $('#btn-export-bp-top')?.addEventListener('click', () => {
    exportCityObjectBlueprint(objPropRoot?.children?.[0], objState, objAppToast);
  });

  $('#btn-import-top')?.addEventListener('click', () => $('#file-import')?.click());
  $('#file-import')?.addEventListener('change', (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      handleObjectFileImport(
        file,
        objState,
        objLocks,
        (nextCfg) => {
          objState = nextCfg;
          objAppRenderCatalog();
          objAppRebuildObject({ refocusCamera: true });
        },
        objAppToast
      );
      e.target.value = '';
    }
  });

  objAppRenderCatalog();
  objAppRenderRightPanel();
}

async function objAppInitScene() {
  const canvas = $('#object-canvas');
  if (!canvas) return;

  try {
    await objAppEnsureThree();
  } catch (err) {
    console.error('Three.js load failed:', err);
    objAppToast('Failed To Load 3d Renderer');
    return;
  }

  objRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  objRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  objRenderer.shadowMap.enabled = true;
  objRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setObjectMaxAnisotropy(objRenderer.capabilities.getMaxAnisotropy());

  objScene = new THREE.Scene();
  objScene.background = new THREE.Color('#132030');

  objCamera = new THREE.PerspectiveCamera(42, 1.33, 0.05, 180);
  objCamera.position.set(3.2, 2.3, 3.6);

  objOrbit = new THREE.OrbitControls(objCamera, canvas);
  objOrbit.enableDamping = true;
  objOrbit.dampingFactor = 0.08;
  objOrbit.minDistance = 0.25;
  objOrbit.maxDistance = 42;
  objOrbit.maxPolarAngle = Math.PI * 0.495;

  objHemiLight = new THREE.HemisphereLight('#d8ecff', '#22303e', 0.78);
  objScene.add(objHemiLight);

  objKeyLight = new THREE.DirectionalLight('#fff5e6', 1.05);
  objKeyLight.position.set(6, 11, 7);
  objKeyLight.castShadow = true;
  objKeyLight.shadow.mapSize.set(1024, 1024);
  objKeyLight.shadow.camera.near = 0.5;
  objKeyLight.shadow.camera.far = 36;
  objKeyLight.shadow.camera.left = -7;
  objKeyLight.shadow.camera.right = 7;
  objKeyLight.shadow.camera.top = 7;
  objKeyLight.shadow.camera.bottom = -7;
  objScene.add(objKeyLight);

  objRimLight = new THREE.DirectionalLight('#7fd4ff', 0.4);
  objRimLight.position.set(-7, 5, -6);
  objScene.add(objRimLight);

  objEnvRoot = new THREE.Group();
  objEnvRoot.name = 'ObjectEnvRoot';
  objScene.add(objEnvRoot);

  objPropRoot = new THREE.Group();
  objPropRoot.name = 'ObjectPropRoot';
  objScene.add(objPropRoot);

  objDebugRoot = new THREE.Group();
  objDebugRoot.name = 'ObjectDebugRoot';
  objScene.add(objDebugRoot);

  objAppUpdateLighting();
  objAppResizeStage();
  window.addEventListener('resize', objAppResizeStage);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => objAppResizeStage());
    const wrap = $('#object-canvas-wrap');
    if (wrap) ro.observe(wrap);
  }

  objReady = true;
  objAppRebuildObject({ refocusCamera: true });

  const tick = () => {
    requestAnimationFrame(tick);
    if (objOrbit) objOrbit.update();
    if (objRenderer && objScene && objCamera) {
      objRenderer.render(objScene, objCamera);
    }
  };
  requestAnimationFrame(tick);
}

if (typeof window !== 'undefined') {
  window.BCityObjectSuite = {
    version: '1.0.0',
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    assemblySchemaVersion: ASSEMBLY_SCHEMA_VERSION,
    spaceGroups: SPACE_GROUPS,
    categories: OBJECT_CATEGORIES,
    attachmentProfiles: ATTACHMENT_PROFILES,
    ensureCityObjectRegistry,
    registerGeneratorModule,
    runRegisteredGeneratorModules,
    hasObjectFamily,
    getAllObjectFamilies,
    getObjectFamily,
    getAllObjectPresets,
    getObjectPreset,
    searchCatalog,
    buildDefaultConfigForFamily,
    sanitiseObjectConfig,
    buildCityObject,
    generateObjectBlueprint,
    validateObjectBlueprint,
    checkBlueprintCompatibility,
    applyImportedObjectData,
    getConfig: () => sanitiseObjectConfig(objState),
    loadPreset: (presetId) => objAppLoadPreset(presetId),
    openCatalogView: () => openCatalogThumbnailView(),
    closeCatalogView: () => closeCatalogThumbnailView()
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if ($('#object-canvas')) {
        objAppInitUI();
        objAppInitScene();
      }
    });
  } else if ($('#object-canvas')) {
    objAppInitUI();
    objAppInitScene();
  }
}
