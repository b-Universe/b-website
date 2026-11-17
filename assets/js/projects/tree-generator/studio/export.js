import { tree$, treeCopy, treeSlugify } from '../utils.js';
import { TREE_B_UNITS_PER_METER, TREE_BLUEPRINT_SCHEMA_VERSION, TREE_CONFIG_KEYS, sanitiseTreeConfig } from '../config.js';
import { checkTreeBlueprintCompatibility, generateTreeBlueprint } from '../core/blueprints.js';
import { buildBiomeGrovePack } from '../core/variation.js';
import { createProceduralTree } from '../geometry/tree.js';
import { disposeTreeHierarchy } from './preview.js';

export function triggerTreeDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportTreeAsGLB(object3D, filename, options = {}, showToast = null) {
  if (!THREE.GLTFExporter) {
    if (showToast) showToast('GltfExporter not loaded yet.', 'fa-exclamation-triangle');
    return;
  }

  let exportRoot = object3D;
  let clonedForTransform = false;

  if (options.convertToBUnits) {
    exportRoot = object3D.clone(true);
    exportRoot.scale.setScalar(TREE_B_UNITS_PER_METER);
    exportRoot.rotation.x = Math.PI / 2;
    exportRoot.updateMatrixWorld(true);
    clonedForTransform = true;
  }

  const exporter = new THREE.GLTFExporter();
  exporter.parse(
    exportRoot,
    (result) => {
      if (clonedForTransform) disposeTreeHierarchy(exportRoot);
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        triggerTreeDownloadBlob(blob, filename);
      } else {
        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        triggerTreeDownloadBlob(blob, filename.replace('.glb', '.gltf'));
      }
      if (showToast) showToast(`Exported ${filename}`, 'fa-cube');
    },
    { binary: true }
  );
}

export function exportTreeBlueprintJSON(state, showToast = null) {
  const cfg = sanitiseTreeConfig(state);
  const bp = generateTreeBlueprint(cfg);
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  const filename = `b_tree_${treeSlugify(cfg.species)}_${cfg.seed}.tree.json`;
  triggerTreeDownloadBlob(blob, filename);
  if (showToast) showToast(`Exported Blueprint: ${filename}`, 'fa-drafting-compass');
  return bp;
}

export function exportTreeSettingsJSON(state, showToast = null) {
  const cfg = sanitiseTreeConfig(state);
  const payload = {
    type: 'b-tree-settings',
    schemaVersion: TREE_BLUEPRINT_SCHEMA_VERSION,
    config: treeCopy(cfg)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const filename = `b_tree_preset_${treeSlugify(cfg.species)}_${cfg.seed}.json`;
  triggerTreeDownloadBlob(blob, filename);
  if (showToast) showToast(`Exported Settings: ${filename}`, 'fa-file-code');
  return payload;
}

export function exportBiomeGrovePackJSON(state, count = 12, showToast = null) {
  const pack = buildBiomeGrovePack(state, count);
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const filename = `b_biome_grove_${treeSlugify(state.species)}_${pack.seed}.grove.json`;
  triggerTreeDownloadBlob(blob, filename);
  if (showToast) showToast(`Exported Grove Pack (${pack.treeCount} Trees)`, 'fa-trees');
  return pack;
}

export function exportAllTreeLODsBundle(state, cachedLod0Data, sharedAtlasTex, showToast = null) {
  const cfg = sanitiseTreeConfig(state);
  const bundleGroup = new THREE.Group();
  bundleGroup.name = `BRemastered_${cfg.species}_${cfg.season}_${cfg.seed}`;

  for (let lod = 0; lod < 4; lod++) {
    const mesh = createProceduralTree(cfg, {
      lodLevel: lod,
      lod0Data: cachedLod0Data,
      atlasTexture: sharedAtlasTex
    });
    mesh.name = `${cfg.species}_LOD${lod}`;
    mesh.position.set(lod * Math.max(3.0, cfg.spread * 1.45), 0, 0);
    bundleGroup.add(mesh);
  }

  exportTreeAsGLB(
    bundleGroup,
    `b_tree_${cfg.species}_${cfg.season}_all_lods.glb`,
    { convertToBUnits: cfg.convertToBUnitsOnExport },
    showToast
  );
}

export function downloadTreeAtlasPNG(state, showToast = null) {
  const atlasCanvas = tree$('#atlas-canvas');
  if (!atlasCanvas) return;
  atlasCanvas.toBlob((blob) => {
    if (blob) {
      const fn = `b_tree_${state.species}_${state.season}_billboard_atlas.png`;
      triggerTreeDownloadBlob(blob, fn);
      if (showToast) showToast(`Downloaded ${fn}`, 'fa-image');
    }
  }, 'image/png');
}

export function captureTreeSnapshotPNG(renderer, scene, camera, state, showToast = null) {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (blob) {
      const fn = `b_tree_${state.species}_${state.season}_${state.seed}_preview.png`;
      triggerTreeDownloadBlob(blob, fn);
      if (showToast) showToast(`Saved Snapshot: ${fn}`, 'fa-camera');
    }
  }, 'image/png');
}

export function parseImportedTreeJSON(jsonText) {
  const parsed = JSON.parse(jsonText);
  const check = checkTreeBlueprintCompatibility(parsed);
  const cfgObj = check.extractedConfig || parsed;
  const clean = {};
  TREE_CONFIG_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(cfgObj, k)) {
      clean[k] = cfgObj[k];
    }
  });
  return {
    config: sanitiseTreeConfig(clean),
    issues: check.issues
  };
}
