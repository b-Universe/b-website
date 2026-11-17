import { tree$, tree$$, treeRng32 } from './utils.js';
import { TREE_BASE, TREE_BLUEPRINT_SCHEMA_VERSION, TREE_B_UNITS_PER_METER, applyTreePresetWithLocks, sanitiseTreeConfig } from './config.js';
import { SPECIES_DEFAULT_PRESETS, TREE_PRESETS, TREE_SPECIES, getSpeciesMeta } from './core/species.js';
import { generateTreeBlueprint, validateTreeBlueprint } from './core/blueprints.js';
import { applyTreeSeedVariation, randomizeTreeSettings } from './core/variation.js';
import { TREE_SEASON_PALETTES } from './materials/palettes.js';
import { clearTreeMaterialCache, setTreeSilhouetteAndWireframe } from './materials/materials.js';
import { buildTreeBillboardMesh, buildTreeHemisphereGeo, generateTreeLodData } from './geometry/lods.js';
import {
  getPlacedDetailMeta,
  sanitisePlacedDetail,
  scatterPlacedDetailsOnObject3D
} from './geometry/details.js';
import { countTreeObjectStats, createProceduralTree } from './geometry/tree.js';
import {
  OffscreenTreeAtlasBaker,
  applyTreeLightingMode,
  applyTreeWindSway,
  buildHumanScaleReference,
  buildPlacementCursorHelper,
  buildTreeDebugGizmos,
  disposeTreeHierarchy,
  rebuildAmbientParticles,
  rebuildTreeEnvironment,
  tickAmbientParticles,
  updatePlacementCursorHelper
} from './studio/preview.js';
import { disposeTreeCatalogThumbs, initTreeCatalogModal } from './studio/catalog-modal.js';
import {
  renderCustomPresetsList,
  renderPresetLibrary,
  renderSpeciesPicker,
  renderTreeControlsTab,
  renderVariationStrip,
  saveCustomTreePreset
} from './studio/controls.js';
import {
  captureTreeSnapshotPNG,
  downloadTreeAtlasPNG,
  exportAllTreeLODsBundle,
  exportBiomeGrovePackJSON,
  exportTreeAsGLB,
  exportTreeBlueprintJSON,
  exportTreeSettingsJSON,
  parseImportedTreeJSON
} from './studio/export.js';

function showTreeToast(message, iconClass = 'fa-check-circle') {
  const container = tree$('#tree-toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.innerHTML = `<i class="fas ${iconClass}" style="color: var(--accent);"></i><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'all 0.25s ease';
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

const runtime = {
  config: sanitiseTreeConfig(TREE_PRESETS.lumbridge_oak),
  locks: new Set(),
  activeTab: 'form',
  activeCategory: 'all',
  presetQuery: '',
  viewMode: 'single',
  singleLod: 0,
  forestQuality: 'dynamic',
  forestCount: 120,
  forestMixedBiome: false,
  showGrid: true,
  wireframe: false,
  silhouetteMode: false,
  debugGizmos: false,
  humanScale: false,
  autoRotate: false,
  isometricCam: false,
  theatreMode: false,
  placementMode: false,
  detailCategory: 'all',
  detailBrush: {
    kind: 'paper_lantern',
    color: '#ff9f1c',
    accentColor: '#2b2d42',
    scale: 1.0,
    hangLength: 0.45,
    emissive: true
  }
};

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let lights = null;
let contentGroup = null;
let groundGroup = null;
let debugGroup = null;
let humanGroup = null;
let particleGroup = null;
let placementCursorGroup = null;
let placementRaycaster = null;
let placementPointerDownPos = null;
let atlasBaker = null;
let resizeObserver = null;
let animFrameId = null;
let lastFrameMs = 0;
let startElapsedMs = 0;
let cachedLod0Data = null;

function updateViewportHud(tris, verts, instances, activeTree) {
  const tEl = tree$('#hud-tris');
  const vEl = tree$('#hud-verts');
  const iEl = tree$('#hud-instances');
  const dEl = tree$('#hud-dims');
  const bEl = tree$('#hud-bunits');

  if (tEl) tEl.textContent = tris.toLocaleString();
  if (vEl) vEl.textContent = verts.toLocaleString();
  if (iEl) iEl.textContent = instances.toLocaleString();

  if (activeTree && activeTree.userData && activeTree.userData.blueprint) {
    const bp = activeTree.userData.blueprint;
    const m = bp.bounds.meters;
    const bu = bp.bounds.bGameUnits;
    if (dEl) dEl.textContent = `${m.width.toFixed(1)}m × ${m.length.toFixed(1)}m × ${m.height.toFixed(1)}m`;
    if (bEl) bEl.textContent = `${bu.width.toFixed(0)} × ${bu.length.toFixed(0)} × ${bu.height.toFixed(0)} B`;
  }
}

function updateBlueprintSummaryPanel(bp) {
  const el = tree$('#blueprint-summary-readout');
  if (!el || !bp) return;
  const m = bp.bounds.meters;
  const bu = bp.bounds.bGameUnits;
  el.innerHTML = `
    <div><span>Template</span><code>${bp.templateId}</code></div>
    <div><span>Revision</span><code>${bp.revisionHash}</code></div>
    <div><span>Meters</span><strong>${m.width.toFixed(2)} × ${m.length.toFixed(2)} × ${m.height.toFixed(2)} m</strong></div>
    <div><span>B Units</span><strong>${bu.width.toFixed(1)} × ${bu.length.toFixed(1)} × ${bu.height.toFixed(1)} B</strong></div>
    <div><span>Trunk Collider</span><strong>r=${bp.collisionBounds.trunkCylinder.radius}m · h=${bp.collisionBounds.trunkCylinder.height}m</strong></div>
    <div><span>Harvest Ring</span><strong>r=${bp.interaction.harvestRingRadius}m (${bp.interaction.woodcuttingTier})</strong></div>
  `;
}

function rebuildTreeScene() {
  if (!contentGroup || !atlasBaker) return;

  disposeTreeHierarchy(contentGroup);
  disposeTreeHierarchy(debugGroup);
  disposeTreeHierarchy(humanGroup);

  const cfg = sanitiseTreeConfig(runtime.config);
  runtime.config = cfg;

  applyTreeLightingMode(scene, lights, cfg.lightingMode);

  cachedLod0Data = generateTreeLodData(cfg, 0, 0);
  atlasBaker.bake(cachedLod0Data, cfg.atlasRes);

  const overlayCards = tree$('#lod-cards-overlay');
  if (overlayCards) {
    overlayCards.classList.toggle('visible', runtime.viewMode === 'compare');
  }

  let primaryTreeForHud = null;

  if (runtime.viewMode === 'single') {
    const groundR = Math.max(5.5, cfg.spread * 1.45);
    rebuildTreeEnvironment(groundGroup, cfg.environmentStage, runtime.showGrid, groundR, cfg);

    const treeObj = createProceduralTree(cfg, {
      lodLevel: runtime.singleLod,
      lod0Data: cachedLod0Data,
      atlasTexture: atlasBaker.sharedTexture,
      wireframe: runtime.wireframe,
      silhouetteMode: runtime.silhouetteMode
    });
    contentGroup.add(treeObj);
    primaryTreeForHud = treeObj;

    const stats = countTreeObjectStats(treeObj);
    updateViewportHud(stats.tris, stats.verts, 1, treeObj);
    updateBlueprintSummaryPanel(treeObj.userData.blueprint);
    rebuildAmbientParticles(particleGroup, cfg, cfg.spread, cfg.height);

    if (runtime.debugGizmos) {
      debugGroup.add(buildTreeDebugGizmos(treeObj));
    }
    if (runtime.humanScale) {
      const ref = buildHumanScaleReference();
      ref.position.set(Math.max(1.4, cachedLod0Data.layout.baseRadius + 1.15), 0, 0.8);
      humanGroup.add(ref);
    }
  } else if (runtime.viewMode === 'compare') {
    const spacing = Math.max(4.5, cfg.spread * 1.45);
    rebuildTreeEnvironment(groundGroup, cfg.environmentStage, runtime.showGrid, spacing * 2.3, cfg);
    disposeTreeHierarchy(particleGroup);

    const offsets = [-1.5 * spacing, -0.5 * spacing, 0.5 * spacing, 1.5 * spacing];
    let totalTris = 0;
    let totalVerts = 0;
    let lod0Tris = 1;

    for (let lod = 0; lod < 4; lod++) {
      const obj = createProceduralTree(cfg, {
        lodLevel: lod,
        lod0Data: cachedLod0Data,
        atlasTexture: atlasBaker.sharedTexture,
        wireframe: runtime.wireframe,
        silhouetteMode: runtime.silhouetteMode
      });
      obj.position.set(offsets[lod], 0, 0);
      contentGroup.add(obj);
      if (lod === 0) primaryTreeForHud = obj;

      const ringGeo = new THREE.RingGeometry(cfg.spread * 0.42, cfg.spread * 0.48, 16);
      ringGeo.rotateX(-Math.PI / 2);
      ringGeo.translate(offsets[lod], 0.03, 0);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e0ff, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.userData = { _ownedMat: true };
      contentGroup.add(ringMesh);

      const st = countTreeObjectStats(obj);
      if (lod === 0) lod0Tris = Math.max(1, st.tris);
      totalTris += st.tris;
      totalVerts += st.verts;

      const pct = Math.round((st.tris / lod0Tris) * 100);
      const cardEl = tree$(`#card-lod${lod}-stats`);
      if (cardEl) cardEl.textContent = `${st.tris.toLocaleString()} Tris • ${pct}%`;
    }

    updateViewportHud(totalTris, totalVerts, 4, primaryTreeForHud);
    if (primaryTreeForHud) updateBlueprintSummaryPanel(primaryTreeForHud.userData.blueprint);

    if (runtime.humanScale) {
      const ref = buildHumanScaleReference();
      ref.position.set(offsets[0] - Math.max(1.5, cfg.spread * 0.5), 0, 1.2);
      humanGroup.add(ref);
    }
  } else if (runtime.viewMode === 'forest') {
    const count = runtime.forestCount;
    const forestRadius = Math.max(18, Math.sqrt(count) * cfg.spread * 0.92);
    rebuildTreeEnvironment(groundGroup, cfg.environmentStage, runtime.showGrid, forestRadius * 1.15, cfg);
    rebuildAmbientParticles(particleGroup, cfg, forestRadius * 0.45, cfg.height * 1.2);

    const variationPoolSize = 6;
    const poolLod0 = [];
    const poolLod1 = [];
    const poolHemi = [];
    const secondarySpeciesIds = ['oak', 'birch', 'pine', 'bush'];

    for (let v = 0; v < variationPoolSize; v++) {
      let variantCfg = cfg;
      if (runtime.forestMixedBiome && v >= 3) {
        const altSp = secondarySpeciesIds[(v - 3) % secondarySpeciesIds.length];
        const altPreset = TREE_PRESETS[SPECIES_DEFAULT_PRESETS[altSp]] || cfg;
        variantCfg = sanitiseTreeConfig({
          ...altPreset,
          season: cfg.season,
          colorLeaf1: v === 4 ? cfg.colorLeaf2 : altPreset.colorLeaf1,
          seed: cfg.seed + v * 173
        });
      }
      const d0 = v === 0 ? cachedLod0Data : generateTreeLodData(variantCfg, 0, v + 1);
      const d1 = generateTreeLodData(variantCfg, 1, v + 1);
      const hGeo = buildTreeHemisphereGeo(variantCfg, d0, v + 1);
      poolLod0.push(d0);
      poolLod1.push(d1);
      poolHemi.push(hGeo);
    }

    const flatMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: runtime.wireframe,
      color: runtime.silhouetteMode ? 0xd0d8e0 : 0xffffff
    });
    const ownedForestMat = { _ownedMat: true };

    const rng = treeRng32(cfg.seed + 9001);
    let totalTris = 0;
    let totalVerts = 0;

    for (let i = 0; i < count; i++) {
      const frac = (i + 0.5) / count;
      const r = Math.sqrt(frac) * forestRadius * (0.88 + (rng() - 0.5) * 0.22);
      const theta = i * 2.399963 + (rng() - 0.5) * 0.45;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const scale = 0.80 + rng() * 0.42;
      const rotY = rng() * Math.PI * 2;
      const poolIdx = i % variationPoolSize;

      let chosenLod = 0;
      let forceStyle = null;

      if (runtime.forestQuality === 'lod0') chosenLod = 0;
      else if (runtime.forestQuality === 'lod1') chosenLod = 1;
      else if (runtime.forestQuality === 'lod2-billboard') {
        chosenLod = 2;
        forceStyle = 'billboard';
      } else if (runtime.forestQuality === 'lod2-hemisphere') {
        chosenLod = 2;
        forceStyle = 'hemisphere';
      } else if (runtime.forestQuality === 'lod3') chosenLod = 3;
      else if (runtime.forestQuality === 'split') chosenLod = x < 0 ? 0 : 2;
      else {
        const normDist = r / forestRadius;
        if (normDist < 0.30) chosenLod = 0;
        else if (normDist < 0.58) chosenLod = 1;
        else if (normDist < 0.84) chosenLod = 2;
        else chosenLod = 3;
      }

      let inst;
      if (chosenLod === 0) {
        inst = new THREE.Mesh(poolLod0[poolIdx].mergedGeo, flatMat);
        inst.userData = i === 0 ? ownedForestMat : {};
      } else if (chosenLod === 1) {
        inst = new THREE.Mesh(poolLod1[poolIdx].mergedGeo, flatMat);
        inst.userData = i === 0 ? ownedForestMat : {};
      } else if (chosenLod === 2) {
        const style = forceStyle || cfg.lod2Style;
        if (style === 'hemisphere') {
          inst = new THREE.Mesh(poolHemi[poolIdx], flatMat);
        } else if (style === 'billboard') {
          inst = buildTreeBillboardMesh(poolLod0[0], atlasBaker.sharedTexture, {
            includeIsoCap: true,
            species: cfg.species,
            wireframe: runtime.wireframe
          });
        } else {
          inst = new THREE.Group();
          inst.add(new THREE.Mesh(poolHemi[poolIdx], flatMat));
          inst.add(buildTreeBillboardMesh(poolLod0[0], atlasBaker.sharedTexture, {
            includeIsoCap: false,
            species: cfg.species,
            wireframe: runtime.wireframe
          }));
        }
      } else {
        const proxy = createProceduralTree(cfg, {
          lodLevel: 3,
          lod0Data: poolLod0[0],
          atlasTexture: atlasBaker.sharedTexture,
          wireframe: runtime.wireframe
        });
        inst = proxy;
      }

      inst.position.set(x, 0, z);
      inst.rotation.y = rotY;
      inst.scale.setScalar(scale);
      inst.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = chosenLod <= 1;
          m.receiveShadow = true;
        }
      });
      contentGroup.add(inst);

      const st = countTreeObjectStats(inst);
      totalTris += st.tris;
      totalVerts += st.verts;
    }

    const refBp = generateTreeBlueprint(cfg, { layout: cachedLod0Data.layout });
    updateViewportHud(totalTris, totalVerts, count, { userData: { blueprint: refBp } });
    updateBlueprintSummaryPanel(refBp);
  }
}

function refreshAllUI() {
  const cfg = runtime.config;
  const seedInput = tree$('#param-seed');
  if (seedInput) seedInput.value = cfg.seed;

  const atlasBadge = tree$('#atlas-res-badge');
  if (atlasBadge) atlasBadge.textContent = `${cfg.atlasRes}×${cfg.atlasRes}`;

  const placeLabel = tree$('#placement-active-label');
  if (placeLabel) placeLabel.textContent = getPlacedDetailMeta(runtime.detailBrush.kind).label;
  const placeBanner = tree$('#placement-mode-banner');
  if (placeBanner) placeBanner.hidden = !runtime.placementMode;

  const lightingSel = tree$('#lighting-select');
  if (lightingSel) lightingSel.value = cfg.lightingMode;

  const envSel = tree$('#environment-select');
  if (envSel) envSel.value = cfg.environmentStage;

  renderSpeciesPicker(
    cfg.species,
    runtime.activeCategory,
    (speciesId) => {
      const presetKey = SPECIES_DEFAULT_PRESETS[speciesId];
      const preset = TREE_PRESETS[presetKey];
      if (!preset) return;
      runtime.config = applyTreePresetWithLocks(runtime.config, preset, runtime.locks);
      refreshAllUI();
      rebuildTreeScene();
    },
    (catId) => {
      runtime.activeCategory = catId;
      refreshAllUI();
    }
  );

  renderTreeControlsTab(runtime.activeTab, runtime.config, runtime.locks, {
    onFieldChange: (key, val) => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, [key]: val });
      if (key === 'lightingMode' || key === 'environmentStage' || key === 'atlasRes') {
        const lSel = tree$('#lighting-select');
        if (lSel) lSel.value = runtime.config.lightingMode;
        const eSel = tree$('#environment-select');
        if (eSel) eSel.value = runtime.config.environmentStage;
        const aBadge = tree$('#atlas-res-badge');
        if (aBadge) aBadge.textContent = `${runtime.config.atlasRes}×${runtime.config.atlasRes}`;
      }
      rebuildTreeScene();
      renderVariationStrip(runtime.config, runtime.locks, applyVariantConfig);
    },
    onSelectSeason: (seasonKey) => {
      const pal = TREE_SEASON_PALETTES[seasonKey];
      if (!pal) return;
      runtime.config = sanitiseTreeConfig({
        ...runtime.config,
        season: seasonKey,
        colorLeaf1: pal.leaf1,
        colorLeaf2: pal.leaf2,
        colorBark: runtime.config.species === 'birch' ? runtime.config.colorBark : pal.bark,
        colorAccent: pal.accent,
        snow: pal.snow
      });
      refreshAllUI();
      rebuildTreeScene();
    },
    detailBrush: runtime.detailBrush,
    detailCategory: runtime.detailCategory,
    placementMode: runtime.placementMode,
    onSelectDetailCategory: (catId) => {
      runtime.detailCategory = catId;
      refreshAllUI();
    },
    onSelectDetailKind: (kindId) => {
      const m = getPlacedDetailMeta(kindId);
      runtime.detailBrush = {
        kind: m.id,
        color: m.defaultColor,
        accentColor: m.defaultAccent,
        scale: m.defaultScale,
        hangLength: m.defaultHang,
        emissive: Boolean(m.defaultEmissive)
      };
      refreshAllUI();
    },
    onDetailBrushChange: (key, val) => {
      runtime.detailBrush = { ...runtime.detailBrush, [key]: val };
    },
    onTogglePlacementMode: () => togglePlacementMode(),
    onScatterDetails: () => {
      const activeTree = contentGroup && contentGroup.children.find((c) => c.userData && c.userData.blueprint);
      const layout = cachedLod0Data ? cachedLod0Data.layout : null;
      const added = scatterPlacedDetailsOnObject3D(activeTree, runtime.config, layout, runtime.detailBrush, 6);
      runtime.config = sanitiseTreeConfig({
        ...runtime.config,
        placedDetails: [...(runtime.config.placedDetails || []), ...added]
      });
      refreshAllUI();
      rebuildTreeScene();
      showTreeToast(`Scattered ${added.length} × ${getPlacedDetailMeta(runtime.detailBrush.kind).label}`, 'fa-wand-magic-sparkles');
    },
    onUndoDetail: () => {
      const list = Array.isArray(runtime.config.placedDetails) ? runtime.config.placedDetails : [];
      if (list.length === 0) return;
      runtime.config = sanitiseTreeConfig({
        ...runtime.config,
        placedDetails: list.slice(0, -1)
      });
      refreshAllUI();
      rebuildTreeScene();
    },
    onClearDetails: () => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, placedDetails: [] });
      refreshAllUI();
      rebuildTreeScene();
      showTreeToast('Cleared All Placed Details', 'fa-trash');
    },
    onRemoveDetail: (id) => {
      const next = (runtime.config.placedDetails || []).filter((d) => d.id !== id);
      runtime.config = sanitiseTreeConfig({ ...runtime.config, placedDetails: next });
      refreshAllUI();
      rebuildTreeScene();
    }
  });

  renderPresetLibrary(runtime.activeCategory, runtime.presetQuery, loadPresetIntoStudio);
  renderCustomPresetsList(loadPresetIntoStudio);
  renderVariationStrip(runtime.config, runtime.locks, applyVariantConfig);
}

function applyVariantConfig(variantCfg) {
  runtime.config = applyTreePresetWithLocks(runtime.config, variantCfg, runtime.locks);
  refreshAllUI();
  rebuildTreeScene();
}

function loadPresetIntoStudio(preset, label = null) {
  runtime.config = applyTreePresetWithLocks(runtime.config, preset, runtime.locks);
  refreshAllUI();
  rebuildTreeScene();
  showTreeToast(`Loaded ${label || preset.name || 'Preset'}`, 'fa-tree');
}

function initViewport() {
  const container = tree$('#canvas-container');
  const canvas = tree$('#tree-canvas');
  if (!container || !canvas) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x091018, 0.0085);

  camera = new THREE.PerspectiveCamera(45, Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight), 0.1, 450);
  camera.position.set(9, 7.5, 12);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 3.0, 0);
  controls.maxPolarAngle = Math.PI * 0.495;

  const hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x1d2b1f, 0.68);
  const sunLight = new THREE.DirectionalLight(0xfff4d6, 0.88);
  sunLight.position.set(18, 28, 16);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 95;
  const d = 34;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;

  const rimLight = new THREE.DirectionalLight(0x00e0ff, 0.25);
  rimLight.position.set(-15, 10, -12);

  scene.add(hemiLight, sunLight, rimLight);
  lights = { hemiLight, sunLight, rimLight };

  groundGroup = new THREE.Group();
  contentGroup = new THREE.Group();
  debugGroup = new THREE.Group();
  humanGroup = new THREE.Group();
  particleGroup = new THREE.Group();
  placementCursorGroup = buildPlacementCursorHelper();
  placementRaycaster = new THREE.Raycaster();
  scene.add(groundGroup, contentGroup, debugGroup, humanGroup, particleGroup, placementCursorGroup);

  const getActiveTreeAndTargets = () => {
    const activeTree = contentGroup && contentGroup.children.find((c) => c.userData && c.userData.blueprint);
    const meshes = [];
    if (activeTree) {
      activeTree.traverse((n) => {
        if (n.isMesh && (n.name === 'TrunkAndLimbs' || n.name === 'CanopyFoliage')) {
          meshes.push(n);
        }
      });
    }
    return { activeTree, meshes };
  };

  const raycastTreeAtClientPoint = (clientX, clientY) => {
    if (!placementRaycaster || !camera) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const { activeTree, meshes } = getActiveTreeAndTargets();
    if (!activeTree || meshes.length === 0) return null;

    activeTree.updateMatrixWorld(true);
    placementRaycaster.setFromCamera(ndc, camera);
    const hits = placementRaycaster.intersectObjects(meshes, false);
    if (!hits || hits.length === 0) return null;

    const hit = hits[0];
    const worldNorm = hit.face
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : new THREE.Vector3(0, 1, 0);

    const invTree = new THREE.Matrix4().copy(activeTree.matrixWorld).invert();
    const normMat = new THREE.Matrix3().getNormalMatrix(invTree);
    const localPoint = hit.point.clone().applyMatrix4(invTree);
    const localNormal = worldNorm.clone().applyMatrix3(normMat).normalize();

    return {
      worldPoint: hit.point.clone(),
      worldNormal: worldNorm,
      localPoint,
      localNormal
    };
  };

  canvas.addEventListener('pointermove', (e) => {
    if (!runtime.placementMode) return;
    const res = raycastTreeAtClientPoint(e.clientX, e.clientY);
    if (res) {
      updatePlacementCursorHelper(placementCursorGroup, res.worldPoint, res.worldNormal, runtime.detailBrush);
    } else {
      updatePlacementCursorHelper(placementCursorGroup, null);
    }
  });

  canvas.addEventListener('pointerleave', () => {
    updatePlacementCursorHelper(placementCursorGroup, null);
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (!runtime.placementMode || e.button !== 0) return;
    placementPointerDownPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!runtime.placementMode || e.button !== 0 || !placementPointerDownPos) return;
    const dragDist = Math.hypot(e.clientX - placementPointerDownPos.x, e.clientY - placementPointerDownPos.y);
    placementPointerDownPos = null;
    if (dragDist >= 6) return;

    const res = raycastTreeAtClientPoint(e.clientX, e.clientY);
    if (!res) return;

    const currentList = Array.isArray(runtime.config.placedDetails) ? runtime.config.placedDetails : [];

    // Shift+Click removes the closest placed item near the clicked spot
    if (e.shiftKey) {
      if (currentList.length === 0) return;
      let nearestIdx = currentList.length - 1;
      let bestDist = Infinity;
      currentList.forEach((d, idx) => {
        const dist = Math.hypot(
          d.position.x - res.localPoint.x,
          d.position.y - res.localPoint.y,
          d.position.z - res.localPoint.z
        );
        if (dist < bestDist) {
          bestDist = dist;
          nearestIdx = idx;
        }
      });
      const removed = currentList[nearestIdx];
      runtime.config = sanitiseTreeConfig({
        ...runtime.config,
        placedDetails: currentList.filter((_, idx) => idx !== nearestIdx)
      });
      refreshAllUI();
      rebuildTreeScene();
      showTreeToast(`Removed ${getPlacedDetailMeta(removed.kind).label}`, 'fa-trash');
      return;
    }

    const meta = getPlacedDetailMeta(runtime.detailBrush.kind);
    const nextItem = sanitisePlacedDetail({
      id: `det_${Date.now().toString(36)}_${currentList.length + 1}`,
      kind: meta.id,
      position: { x: res.localPoint.x, y: res.localPoint.y, z: res.localPoint.z },
      normal: { x: res.localNormal.x, y: res.localNormal.y, z: res.localNormal.z },
      scale: runtime.detailBrush.scale,
      hangLength: runtime.detailBrush.hangLength,
      color: runtime.detailBrush.color,
      accentColor: runtime.detailBrush.accentColor,
      emissive: runtime.detailBrush.emissive,
      rotation: ((currentList.length + 1) * 1.37) % (Math.PI * 2)
    }, currentList.length);

    runtime.config = sanitiseTreeConfig({
      ...runtime.config,
      placedDetails: [...currentList, nextItem]
    });
    refreshAllUI();
    rebuildTreeScene();
    showTreeToast(`Placed ${meta.label} (${res.localPoint.y.toFixed(1)}m)`, 'fa-sparkles');
  });

  window.addEventListener('resize', onViewportResize);
}

function onViewportResize() {
  const container = tree$('#canvas-container');
  if (!container || !renderer || !camera) return;
  const w = Math.max(100, container.clientWidth);
  const h = Math.max(100, container.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animateViewport(now = 0) {
  const canvas = tree$('#tree-canvas');
  if (!canvas || !canvas.isConnected) {
    if (typeof window.__disposeTreeGenerator === 'function') {
      window.__disposeTreeGenerator();
    }
    return;
  }

  animFrameId = requestAnimationFrame(animateViewport);
  if (!startElapsedMs) startElapsedMs = now;
  const dt = lastFrameMs ? Math.min(0.05, (now - lastFrameMs) / 1000) : 0.016;
  lastFrameMs = now;
  const elapsed = (now - startElapsedMs) / 1000;

  if (runtime.autoRotate && contentGroup) {
    contentGroup.rotation.y += 0.0045;
  }
  if (runtime.viewMode === 'single') {
    applyTreeWindSway(contentGroup, runtime.config, elapsed);
    tickAmbientParticles(particleGroup, dt, elapsed);
  }

  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function toggleTheatreMode() {
  runtime.theatreMode = !runtime.theatreMode;
  const shell = tree$('#tree-studio-shell');
  if (shell) shell.classList.toggle('theatre-mode', runtime.theatreMode);
  const btn = tree$('#btn-theatre');
  if (btn) btn.classList.toggle('active', runtime.theatreMode);
  setTimeout(onViewportResize, 50);
}

function toggleFullscreenMode() {
  const card = tree$('#tree-viewport-card');
  if (!card) return;
  if (!document.fullscreenElement) {
    if (card.requestFullscreen) card.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function toggleSilhouette() {
  runtime.silhouetteMode = !runtime.silhouetteMode;
  const btn = tree$('#btn-silhouette');
  if (btn) btn.classList.toggle('active', runtime.silhouetteMode);
  contentGroup.traverse((obj) => {
    if (obj.userData && obj.userData.blueprint) {
      setTreeSilhouetteAndWireframe(obj, runtime.config, {
        wireframe: runtime.wireframe,
        silhouetteMode: runtime.silhouetteMode
      });
    }
  });
  if (runtime.viewMode === 'forest') rebuildTreeScene();
}

function toggleDebugGizmos() {
  runtime.debugGizmos = !runtime.debugGizmos;
  const btn = tree$('#btn-debug-gizmos');
  if (btn) btn.classList.toggle('active', runtime.debugGizmos);
  rebuildTreeScene();
}

function toggleHumanScale() {
  runtime.humanScale = !runtime.humanScale;
  const btn = tree$('#btn-human-scale');
  if (btn) btn.classList.toggle('active', runtime.humanScale);
  rebuildTreeScene();
}

function toggleWireframe() {
  runtime.wireframe = !runtime.wireframe;
  const btn = tree$('#btn-wireframe');
  if (btn) btn.classList.toggle('active', runtime.wireframe);
  rebuildTreeScene();
}

function toggleIsoCam() {
  runtime.isometricCam = !runtime.isometricCam;
  const btn = tree$('#btn-iso-cam');
  if (btn) btn.classList.toggle('active', runtime.isometricCam);
  const hudCam = tree$('#hud-cam-mode');
  if (runtime.isometricCam) {
    const dist = runtime.viewMode === 'forest' ? 32 : (runtime.viewMode === 'compare' ? 22 : Math.max(10, runtime.config.height * 1.8));
    camera.position.set(dist * 0.85, dist * 0.95, dist * 0.85);
    controls.target.set(0, runtime.config.height * 0.35, 0);
    if (hudCam) hudCam.textContent = 'B Elevated Isometric (45°)';
  } else {
    camera.position.set(9, 7.5, 12);
    controls.target.set(0, runtime.config.height * 0.45, 0);
    if (hudCam) hudCam.textContent = 'Perspective Orbit';
  }
  controls.update();
}

function toggleTurntable() {
  runtime.autoRotate = !runtime.autoRotate;
  const btn = tree$('#btn-autorotate');
  if (btn) btn.classList.toggle('active', runtime.autoRotate);
  if (!runtime.autoRotate && contentGroup) contentGroup.rotation.y = 0;
}

function togglePlacementMode(forceState = null) {
  runtime.placementMode = forceState !== null ? Boolean(forceState) : !runtime.placementMode;

  if (runtime.placementMode && (runtime.viewMode !== 'single' || runtime.singleLod > 1)) {
    runtime.viewMode = 'single';
    runtime.singleLod = 0;
    const lodSel = tree$('#select-single-lod');
    if (lodSel) lodSel.value = '0';
    tree$$('.mode-pill').forEach((p) => p.classList.toggle('active', p.dataset.view === 'single'));
    const singleCtx = tree$('#single-context-controls');
    const forestCtx = tree$('#forest-context-controls');
    if (singleCtx) singleCtx.style.display = 'flex';
    if (forestCtx) forestCtx.style.display = 'none';
    rebuildTreeScene();
  }

  const btn = tree$('#btn-place-detail');
  if (btn) btn.classList.toggle('active', runtime.placementMode);

  const canvas = tree$('#tree-canvas');
  if (canvas) canvas.classList.toggle('is-placing', runtime.placementMode);

  const banner = tree$('#placement-mode-banner');
  if (banner) {
    banner.hidden = !runtime.placementMode;
    const label = tree$('#placement-active-label');
    if (label) label.textContent = getPlacedDetailMeta(runtime.detailBrush.kind).label;
  }

  if (!runtime.placementMode) {
    updatePlacementCursorHelper(placementCursorGroup, null);
  }

  refreshAllUI();
}

function bindUIEvents() {
  // Parameter tabs
  tree$$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      tree$$('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      runtime.activeTab = btn.dataset.tab;
      refreshAllUI();
    });
  });

  // Seed & Mutate
  const seedInput = tree$('#param-seed');
  if (seedInput) {
    seedInput.addEventListener('change', () => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, seed: parseInt(seedInput.value, 10) || 1337 });
      refreshAllUI();
      rebuildTreeScene();
    });
  }

  const mutateSeed = () => {
    const newSeed = Math.floor(100 + Math.random() * 998999);
    runtime.config = applyTreeSeedVariation({ ...runtime.config, seed: newSeed }, runtime.locks);
    refreshAllUI();
    rebuildTreeScene();
  };
  const diceBtn = tree$('#btn-seed-dice');
  if (diceBtn) diceBtn.addEventListener('click', mutateSeed);
  const mutateBtn = tree$('#btn-random-tree');
  if (mutateBtn) mutateBtn.addEventListener('click', mutateSeed);
  const reshuffleForestBtn = tree$('#btn-reshuffle-forest');
  if (reshuffleForestBtn) reshuffleForestBtn.addEventListener('click', mutateSeed);

  const randomAllBtn = tree$('#btn-randomize-all');
  if (randomAllBtn) {
    randomAllBtn.addEventListener('click', () => {
      runtime.config = randomizeTreeSettings('all', runtime.config, runtime.locks);
      refreshAllUI();
      rebuildTreeScene();
      showTreeToast('Randomized Unlocked Parameters', 'fa-random');
    });
  }

  tree$$('[data-random-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.randomCat;
      runtime.config = randomizeTreeSettings(cat, runtime.config, runtime.locks);
      refreshAllUI();
      rebuildTreeScene();
    });
  });

  // Refresh 6 Variation Cards
  const refreshVarsBtn = tree$('#btn-refresh-variations');
  if (refreshVarsBtn) {
    refreshVarsBtn.addEventListener('click', () => {
      runtime.config = sanitiseTreeConfig({
        ...runtime.config,
        seed: Math.floor(100 + Math.random() * 998999)
      });
      refreshAllUI();
      rebuildTreeScene();
    });
  }

  // View Mode Pills
  tree$$('.mode-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      tree$$('.mode-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      runtime.viewMode = pill.dataset.view;

      const singleCtx = tree$('#single-context-controls');
      const forestCtx = tree$('#forest-context-controls');
      if (singleCtx) singleCtx.style.display = runtime.viewMode === 'single' ? 'flex' : 'none';
      if (forestCtx) forestCtx.style.display = runtime.viewMode === 'forest' ? 'flex' : 'none';

      if (runtime.viewMode === 'single') {
        camera.position.set(8, 6.5, 11);
        controls.target.set(0, runtime.config.height * 0.45, 0);
      } else if (runtime.viewMode === 'compare') {
        camera.position.set(0, 8.5, 22);
        controls.target.set(0, runtime.config.height * 0.45, 0);
      } else {
        camera.position.set(0, 22, 34);
        controls.target.set(0, 2, 0);
      }
      controls.update();
      rebuildTreeScene();
    });
  });

  // Context selectors
  const singleLodSel = tree$('#select-single-lod');
  if (singleLodSel) {
    singleLodSel.addEventListener('change', (e) => {
      runtime.singleLod = parseInt(e.target.value, 10) || 0;
      rebuildTreeScene();
    });
  }

  const lod2Sel = tree$('#select-lod2-style');
  if (lod2Sel) {
    lod2Sel.addEventListener('change', (e) => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, lod2Style: e.target.value });
      rebuildTreeScene();
    });
  }

  const forestQualSel = tree$('#select-forest-quality');
  if (forestQualSel) {
    forestQualSel.addEventListener('change', (e) => {
      runtime.forestQuality = e.target.value;
      rebuildTreeScene();
    });
  }

  const forestCountEl = tree$('#param-forest-count');
  if (forestCountEl) {
    forestCountEl.addEventListener('input', (e) => {
      runtime.forestCount = parseInt(e.target.value, 10) || 120;
      const valEl = tree$('#val-forest-count');
      if (valEl) valEl.textContent = String(runtime.forestCount);
      rebuildTreeScene();
    });
  }

  const mixedBiomeEl = tree$('#toggle-mixed-biome');
  if (mixedBiomeEl) {
    mixedBiomeEl.addEventListener('change', (e) => {
      runtime.forestMixedBiome = e.target.checked;
      rebuildTreeScene();
    });
  }

  const lightingSel = tree$('#lighting-select');
  if (lightingSel) {
    lightingSel.addEventListener('change', (e) => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, lightingMode: e.target.value });
      refreshAllUI();
      rebuildTreeScene();
    });
  }

  const envSel = tree$('#environment-select');
  if (envSel) {
    envSel.addEventListener('change', (e) => {
      runtime.config = sanitiseTreeConfig({ ...runtime.config, environmentStage: e.target.value });
      refreshAllUI();
      rebuildTreeScene();
    });
  }

  const gridToggle = tree$('#ground-grid-toggle');
  if (gridToggle) {
    gridToggle.addEventListener('change', (e) => {
      runtime.showGrid = e.target.checked;
      rebuildTreeScene();
    });
  }

  // Viewport tool buttons
  const bindBtn = (id, fn) => {
    const el = tree$(id);
    if (el) el.addEventListener('click', fn);
  };
  bindBtn('#btn-iso-cam', toggleIsoCam);
  bindBtn('#btn-wireframe', toggleWireframe);
  bindBtn('#btn-autorotate', toggleTurntable);
  bindBtn('#btn-silhouette', toggleSilhouette);
  bindBtn('#btn-debug-gizmos', toggleDebugGizmos);
  bindBtn('#btn-human-scale', toggleHumanScale);
  bindBtn('#btn-place-detail', () => togglePlacementMode());
  bindBtn('#btn-exit-place-mode', () => togglePlacementMode(false));
  bindBtn('#btn-theatre', toggleTheatreMode);
  bindBtn('#btn-theatre-quick', toggleTheatreMode);
  bindBtn('#btn-fullscreen', toggleFullscreenMode);
  bindBtn('#btn-fullscreen-quick', toggleFullscreenMode);
  bindBtn('#btn-reset-camera', () => {
    runtime.isometricCam = false;
    camera.position.set(8, 6.5, 11);
    controls.target.set(0, runtime.config.height * 0.45, 0);
    controls.update();
  });

  // Preset search & custom preset saving
  const presetSearch = tree$('#preset-search-input');
  if (presetSearch) {
    presetSearch.addEventListener('input', (e) => {
      runtime.presetQuery = e.target.value || '';
      renderPresetLibrary(runtime.activeCategory, runtime.presetQuery, loadPresetIntoStudio);
    });
  }

  bindBtn('#btn-save-preset', () => {
    const input = tree$('#input-preset-name');
    const name = input ? input.value : '';
    if (!saveCustomTreePreset(name, runtime.config, () => {
      if (input) input.value = '';
      renderCustomPresetsList(loadPresetIntoStudio);
      showTreeToast(`Saved preset "${name.trim()}"`, 'fa-bookmark');
    })) {
      showTreeToast('Enter a name for your preset first.', 'fa-info-circle');
    }
  });

  // Export & Import actions
  const doExportActiveGLB = () => {
    const cfg = runtime.config;
    exportTreeAsGLB(
      contentGroup,
      `b_tree_${cfg.species}_${cfg.season}_seed${cfg.seed}.glb`,
      { convertToBUnits: cfg.convertToBUnitsOnExport },
      showTreeToast
    );
  };
  bindBtn('#btn-export-glb-top', doExportActiveGLB);
  bindBtn('#btn-export-current-glb', doExportActiveGLB);
  bindBtn('#btn-export-all-lods', () => exportAllTreeLODsBundle(runtime.config, cachedLod0Data, atlasBaker.sharedTexture, showTreeToast));
  bindBtn('#btn-download-atlas', () => downloadTreeAtlasPNG(runtime.config, showTreeToast));
  bindBtn('#btn-export-blueprint-top', () => exportTreeBlueprintJSON(runtime.config, showTreeToast));
  bindBtn('#btn-export-blueprint', () => exportTreeBlueprintJSON(runtime.config, showTreeToast));
  bindBtn('#btn-export-grove', () => exportBiomeGrovePackJSON(runtime.config, 12, showTreeToast));
  bindBtn('#btn-export-json', () => exportTreeSettingsJSON(runtime.config, showTreeToast));
  bindBtn('#btn-snapshot-top', () => captureTreeSnapshotPNG(renderer, scene, camera, runtime.config, showTreeToast));
  bindBtn('#btn-stage-snapshot', () => captureTreeSnapshotPNG(renderer, scene, camera, runtime.config, showTreeToast));

  bindBtn('#btn-import-json', () => {
    const f = tree$('#file-import-json');
    if (f) f.click();
  });

  const fileInput = tree$('#file-import-json');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const { config, issues } = parseImportedTreeJSON(ev.target.result);
          runtime.config = config;
          refreshAllUI();
          rebuildTreeScene();
          showTreeToast(issues.length ? `Imported with notes: ${issues[0]}` : `Loaded ${file.name}`, 'fa-file-import');
        } catch (_) {
          showTreeToast('Invalid JSON or .tree.json blueprint file.', 'fa-exclamation-triangle');
        }
      };
      reader.readAsText(file);
    });
  }

  // Hotkeys (ignored inside inputs/selects/textareas)
  window.__treeGeneratorKeyHandler = (e) => {
    const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = (e.key || '').toLowerCase();
    if (k === 's') toggleSilhouette();
    else if (k === 'e') toggleDebugGizmos();
    else if (k === 'h') toggleHumanScale();
    else if (k === 'd') togglePlacementMode();
    else if (k === 'w') toggleWireframe();
    else if (k === 'i') toggleIsoCam();
    else if (k === 'r') toggleTurntable();
    else if (k === 't') toggleTheatreMode();
    else if (k === 'f') toggleFullscreenMode();
    else if (k === 'p') captureTreeSnapshotPNG(renderer, scene, camera, runtime.config, showTreeToast);
    else if (k === 'escape' && runtime.placementMode) togglePlacementMode(false);
  };
  window.addEventListener('keydown', window.__treeGeneratorKeyHandler);
}

function startTreeStudio() {
  if (typeof window.__disposeTreeGenerator === 'function') {
    window.__disposeTreeGenerator();
  }

  atlasBaker = new OffscreenTreeAtlasBaker(runtime.config.atlasRes);
  initViewport();
  bindUIEvents();
  initTreeCatalogModal((preset) => loadPresetIntoStudio(preset));
  refreshAllUI();
  rebuildTreeScene();
  animateViewport(0);

  const container = tree$('#canvas-container');
  if ('ResizeObserver' in window && container) {
    resizeObserver = new ResizeObserver(() => onViewportResize());
    resizeObserver.observe(container);
  }

  window.BTreeBlueprint = {
    schemaVersion: TREE_BLUEPRINT_SCHEMA_VERSION,
    bUnitsPerMeter: TREE_B_UNITS_PER_METER,
    species: TREE_SPECIES,
    presets: TREE_PRESETS,
    generateBlueprint: generateTreeBlueprint,
    validateBlueprint: validateTreeBlueprint,
    createTree: createProceduralTree,
    getActiveBlueprint: () => generateTreeBlueprint(runtime.config)
  };

  window.__disposeTreeGenerator = () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (window.__treeGeneratorKeyHandler) {
      window.removeEventListener('keydown', window.__treeGeneratorKeyHandler);
      window.__treeGeneratorKeyHandler = null;
    }
    window.removeEventListener('resize', onViewportResize);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (controls) {
      controls.dispose();
      controls = null;
    }
    disposeTreeHierarchy(contentGroup);
    disposeTreeHierarchy(groundGroup);
    disposeTreeHierarchy(debugGroup);
    disposeTreeHierarchy(humanGroup);
    disposeTreeHierarchy(particleGroup);
    disposeTreeHierarchy(placementCursorGroup);
    clearTreeMaterialCache();
    disposeTreeCatalogThumbs();
    if (atlasBaker) {
      atlasBaker.dispose();
      atlasBaker = null;
    }
    if (scene) {
      scene.clear();
      scene = null;
    }
    if (renderer) {
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (_) {}
      renderer = null;
    }
  };
}

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && existing.hasAttribute('data-loaded')) {
      resolve();
      return;
    }
    const script = existing || document.createElement('script');
    if (!existing) {
      script.src = src;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    }, { once: true });
    script.addEventListener('error', reject, { once: true });
  });
}

async function ensureDependencies() {
  if (!window.THREE) await loadScript(THREE_URL);
  if (!window.THREE.OrbitControls) await loadScript(ORBIT_URL);
  if (!window.THREE.GLTFExporter) await loadScript(GLTF_URL);
  return window.THREE;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  ensureDependencies().then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startTreeStudio, { once: true });
    } else {
      startTreeStudio();
    }
  }).catch((err) => {
    console.error('Tree Generator dependency loading error:', err);
  });
}
