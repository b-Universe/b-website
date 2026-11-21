import { INFRA_BLUEPRINT_SCHEMA_VERSION, INFRA_GENERATOR_META } from './config.js';
import { infra$, infra$$ } from './utils.js';
import { infraCanRedo, infraCanUndo, infraExecuteCommand, infraRedo, infraUndo } from './core/network-graph.js';
import {
  infraGenerateAssemblyBlueprint,
  infraGenerateBlueprint,
  infraHydrateDocumentFromBlueprint,
  infraValidateBlueprint
} from './core/blueprints.js';
import { infraSolveNetwork } from './core/solver.js';
import { infraEnsureRegistry } from './families/register-all.js';
import { infraGetReferenceScene } from './presets/reference-scenes.js';
import { matApplyViewOverrides, matSetMaxAnisotropy } from './materials/materials.js';
import { infraBuildScene } from './geometry/assembler.js';
import {
  prvAttachFallbackOrbit,
  prvDisposeObject,
  prvRebuildDebugOverlay,
  prvRebuildEnvironment,
  prvSetCameraFocus,
  prvSnapshotPNG,
  prvUpdateLighting
} from './studio/preview.js';
import { edCreateNetworkEditor } from './studio/network-editor.js';
import { uiRenderCatalogPanel, uiRenderInspectorPanel, uiRenderModeBar } from './studio/controls-ui.js';
import {
  expDeleteFromVault,
  expExportAssemblyJSON,
  expExportBlueprintJSON,
  expExportGLB,
  expImportJSONFile,
  expLoadVaultList,
  expSaveToVault
} from './studio/export.js';
import { wsSwitchMode } from './studio/workspace-modes.js';

let appDoc = null;
let appActiveTab = 'inspector';
let appRenderer = null;
let appScene = null;
let appCamera = null;
let appOrbit = null;
let appSceneRoot = null;
let appEnvRoot = null;
let appDebugRoot = null;
let appHemiLight = null;
let appKeyLight = null;
let appRimLight = null;
let appEditor = null;
let appReady = false;
let appLiveTimer = null;

const appView = {
  lightingTime: 'day',
  showGrid: true,
  silhouetteMode: false,
  wireframe: false,
  autoRotate: false,
  theatre: false,
  debugOverlays: true,
  debugNodes: true,
  debugPorts: true,
  debugCenterlines: true,
  debugCrossings: true,
  debugClearances: true,
  debugMasks: false,
  humanRef: false
};

const appExportOpts = {
  exportUnits: 'meters',
  exportAxis: 'y_up'
};

function appToast(msg) {
  const wrap = infra$('#infra-toasts');
  if (!wrap || !msg) return;
  const el = document.createElement('div');
  el.className = 'infra-toast';
  el.textContent = String(msg);
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

function appSetStatus(msg) {
  const el = infra$('#infra-status');
  if (el) el.textContent = String(msg || '');
}

function appLoadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve(url);
    s.onerror = () => reject(new Error(`Failed script: ${url}`));
    document.head.appendChild(s);
  });
}

async function appLoadFirstWorking(urls) {
  for (const url of urls) {
    try {
      await appLoadScript(url);
      return true;
    } catch {
      // Try next fallback URL
    }
  }
  return false;
}

async function appEnsureThree() {
  if (typeof THREE === 'undefined') {
    const ok = await appLoadFirstWorking([
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      '/scripts/vendor/three.min.js'
    ]);
    if (!ok || typeof THREE === 'undefined') {
      throw new Error('Could not load Three.js r128');
    }
  }
  if (!THREE.OrbitControls) {
    await appLoadFirstWorking([
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
      'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
    ]);
  }
}

async function appEnsureGLTFExporter() {
  if (typeof THREE !== 'undefined' && THREE.GLTFExporter) return true;
  return appLoadFirstWorking([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
    '/scripts/vendor/GLTFExporter.js'
  ]);
}

function appUpdateHud() {
  const stats = appSceneRoot?.userData?.stats || {};
  const diag = appSceneRoot?.userData?.diagnostics || { status: 'valid', errorCount: 0, warningCount: 0 };
  const geo = appSceneRoot?.userData?.geoAudit;
  const crossings = appSceneRoot?.userData?.solved?.crossings || [];

  const hudStats = infra$('#infra-hud-stats');
  if (hudStats) {
    hudStats.textContent = `${appDoc.nodes.length} nodes · ${appDoc.edges.length} segments · ${crossings.length} 3D crossings · ${stats.triangleCount || 0} tris`;
  }
  const hudDiag = infra$('#infra-hud-diag');
  if (hudDiag) {
    hudDiag.className = `infra-hud-pill ${diag.errorCount > 0 ? 'err' : diag.warningCount > 0 ? 'warn' : 'ok'}`;
    const zCount = geo?.coplanarOverlapCount ?? 0;
    hudDiag.textContent = diag.errorCount > 0
      ? `${diag.errorCount} Error(s)`
      : diag.warningCount > 0
        ? `${diag.warningCount} Warning(s) · Z-Fight: ${zCount}`
        : `Valid · 0 Z-Fight`;
  }

  const undoBtn = infra$('#btn-undo-top');
  const redoBtn = infra$('#btn-redo-top');
  if (undoBtn) undoBtn.disabled = !infraCanUndo(appDoc);
  if (redoBtn) redoBtn.disabled = !infraCanRedo(appDoc);
}

function appRefreshOverlays() {
  if (!appDebugRoot || !appDoc) return;
  prvRebuildDebugOverlay(appDebugRoot, appDoc, appSceneRoot?.userData?.solved || null, {
    enabled: appView.debugOverlays,
    nodes: appView.debugNodes,
    ports: appView.debugPorts,
    centerlines: appView.debugCenterlines,
    crossings: appView.debugCrossings,
    clearances: appView.debugClearances,
    terrainMasks: appView.debugMasks,
    humanRef: appView.humanRef
  });
}

function appRebuildScene(statusMsg = null) {
  if (!appReady || !appScene || !appDoc) return;
  if (appSceneRoot) {
    appScene.remove(appSceneRoot);
    prvDisposeObject(appSceneRoot);
  }
  appSceneRoot = infraBuildScene(appDoc, { auditGeometry: true });
  matApplyViewOverrides(appSceneRoot, appView);
  appScene.add(appSceneRoot);
  appRefreshOverlays();
  appUpdateHud();
  if (statusMsg) appSetStatus(statusMsg);
}

function appRenderPanels() {
  const ctx = appBuildUIContext();
  uiRenderModeBar(infra$('#infra-mode-bar'), appDoc, (mode) => {
    const res = wsSwitchMode(appDoc, mode, appToast);
    if (res.switched) {
      appRebuildAll(`Switched to ${mode} mode`);
      prvSetCameraFocus('overview', appCamera, appOrbit, appDoc);
    }
  });
  uiRenderCatalogPanel(infra$('#infra-catalog-body'), appDoc, ctx);
  uiRenderInspectorPanel(infra$('#infra-inspector-body'), appActiveTab, appDoc, appSceneRoot, ctx);
}

function appRebuildAll(statusMsg = null) {
  appRebuildScene(statusMsg);
  appRenderPanels();
}

function appScheduleLiveRebuild() {
  clearTimeout(appLiveTimer);
  appLiveTimer = setTimeout(() => {
    appRebuildScene();
  }, 16);
}

function appBuildUIContext() {
  return {
    exportOpts: appExportOpts,
    getDoc: () => appDoc,
    getCanvas: () => infra$('#infra-canvas'),
    getCamera: () => appCamera,
    getOrbit: () => appOrbit,
    getScene: () => appScene,
    getDebugRoot: () => appDebugRoot,
    getSolved: () => appSceneRoot?.userData?.solved || null,
    toast: appToast,
    setStatus: appSetStatus,
    rebuildLivePreview: appScheduleLiveRebuild,
    rebuildAll: (msg) => appRebuildAll(msg),
    onSelectionChanged: () => {
      appRefreshOverlays();
      appRenderPanels();
    },
    renderInspector: () => uiRenderInspectorPanel(infra$('#infra-inspector-body'), appActiveTab, appDoc, appSceneRoot, appBuildUIContext()),
    resetCamera: (focus = 'overview') => prvSetCameraFocus(focus, appCamera, appOrbit, appDoc),
    undo: () => {
      if (infraUndo(appDoc).ok) appRebuildAll('Undid edit');
    },
    redo: () => {
      if (infraRedo(appDoc).ok) appRebuildAll('Redid edit');
    },
    exportBlueprint: () => expExportBlueprintJSON(appDoc, appSceneRoot, appToast),
    exportAssembly: () => expExportAssemblyJSON(appDoc, appSceneRoot, appToast),
    exportGLB: () => expExportGLB(appDoc, appSceneRoot, appExportOpts, appEnsureGLTFExporter, appToast, appSetStatus),
    triggerImport: () => infra$('#infra-file-import')?.click(),
    getVault: expLoadVaultList,
    saveVault: (name) => {
      expSaveToVault(name, appDoc, appSceneRoot, appToast);
      appRenderPanels();
    },
    loadVault: (vaultId) => {
      const found = expLoadVaultList().find((v) => v.id === vaultId);
      if (!found?.blueprint) return;
      try {
        const hydrated = infraHydrateDocumentFromBlueprint(found.blueprint);
        infraExecuteCommand(appDoc, { type: 'REPLACE_DOCUMENT', nextDoc: hydrated });
        appRebuildAll(`Loaded "${found.name}"`);
        prvSetCameraFocus('overview', appCamera, appOrbit, appDoc);
      } catch (err) {
        appToast(`Could not load blueprint: ${err.message}`);
      }
    },
    deleteVault: (vaultId) => {
      expDeleteFromVault(vaultId);
      appRenderPanels();
    }
  };
}

function appResizeViewport() {
  if (!appRenderer || !appCamera) return;
  const stage = infra$('#infra-stage');
  if (!stage) return;
  const w = Math.max(320, stage.clientWidth);
  const h = Math.max(280, stage.clientHeight);
  appRenderer.setSize(w, h, false);
  appCamera.aspect = w / h;
  appCamera.updateProjectionMatrix();
}

function appBindUIEvents() {
  // Inspector tabs
  infra$$('[data-insp-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      appActiveTab = tabBtn.dataset.inspTab;
      infra$$('[data-insp-tab]').forEach((b) => b.classList.toggle('active', b === tabBtn));
      uiRenderInspectorPanel(infra$('#infra-inspector-body'), appActiveTab, appDoc, appSceneRoot, appBuildUIContext());
    });
  });

  // Editor tools
  infra$$('[data-editor-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.editorTool;
      infra$$('[data-editor-tool]').forEach((b) => b.classList.toggle('active', b === btn));
      appEditor?.setTool(tool);
      appSetStatus(`Tool: ${btn.textContent.trim()}`);
    });
  });

  infra$('#sel-corridor-mode')?.addEventListener('change', (e) => {
    appEditor?.setCorridorMode(e.target.value);
    appSetStatus(`New corridor mode: ${e.target.value.replace(/_/g, ' ')}`);
  });

  // Camera focuses
  infra$$('[data-cam-focus]').forEach((btn) => {
    btn.addEventListener('click', () => prvSetCameraFocus(btn.dataset.camFocus, appCamera, appOrbit, appDoc));
  });

  // Top & footer action controls
  infra$('#btn-undo-top')?.addEventListener('click', () => {
    if (infraUndo(appDoc).ok) appRebuildAll('Undid edit');
  });
  infra$('#btn-redo-top')?.addEventListener('click', () => {
    if (infraRedo(appDoc).ok) appRebuildAll('Redid edit');
  });

  infra$('#btn-export-bp-top')?.addEventListener('click', () => expExportBlueprintJSON(appDoc, appSceneRoot, appToast));
  infra$('#btn-export-glb-top')?.addEventListener('click', () =>
    expExportGLB(appDoc, appSceneRoot, appExportOpts, appEnsureGLTFExporter, appToast, appSetStatus)
  );
  infra$('#btn-import-top')?.addEventListener('click', () => infra$('#infra-file-import')?.click());
  infra$('#infra-file-import')?.addEventListener('change', (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      expImportJSONFile(
        file,
        (hydrated) => {
          infraExecuteCommand(appDoc, { type: 'REPLACE_DOCUMENT', nextDoc: hydrated });
          appRebuildAll(`Imported "${hydrated.name}"`);
          prvSetCameraFocus('overview', appCamera, appOrbit, appDoc);
        },
        appToast
      );
      e.target.value = '';
    }
  });

  infra$('#btn-snapshot')?.addEventListener('click', () => prvSnapshotPNG(appRenderer, appScene, appCamera, appDoc, appToast));

  const toggleTheatre = () => {
    appView.theatre = !appView.theatre;
    document.body.classList.toggle('infra-theatre-mode', appView.theatre);
    infra$('#btn-theatre')?.classList.toggle('active', appView.theatre);
    setTimeout(appResizeViewport, 60);
  };
  infra$('#btn-theatre')?.addEventListener('click', toggleTheatre);

  const toggleFullscreen = () => {
    const stage = infra$('#infra-stage');
    if (!stage) return;
    if (!document.fullscreenElement) stage.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  infra$('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => setTimeout(appResizeViewport, 60));

  // Debug & view toggles
  const bindChk = (id, key, onChange) => {
    const el = infra$(id);
    if (!el) return;
    el.checked = Boolean(appView[key]);
    el.addEventListener('change', () => {
      appView[key] = Boolean(el.checked);
      onChange();
    });
  };
  bindChk('#chk-grid', 'showGrid', () => prvRebuildEnvironment(appEnvRoot, appView.showGrid));
  bindChk('#chk-debug', 'debugOverlays', appRefreshOverlays);
  bindChk('#chk-dbg-nodes', 'debugNodes', appRefreshOverlays);
  bindChk('#chk-dbg-ports', 'debugPorts', appRefreshOverlays);
  bindChk('#chk-dbg-lines', 'debugCenterlines', appRefreshOverlays);
  bindChk('#chk-dbg-crossings', 'debugCrossings', appRefreshOverlays);
  bindChk('#chk-dbg-clearances', 'debugClearances', appRefreshOverlays);
  bindChk('#chk-dbg-masks', 'debugMasks', appRefreshOverlays);
  bindChk('#chk-human-ref', 'humanRef', appRefreshOverlays);
  bindChk('#chk-silhouette', 'silhouetteMode', () => matApplyViewOverrides(appSceneRoot, appView));
  bindChk('#chk-wireframe', 'wireframe', () => matApplyViewOverrides(appSceneRoot, appView));

  infra$('#sel-lighting')?.addEventListener('change', (e) => {
    appView.lightingTime = e.target.value || 'day';
    prvUpdateLighting(appView.lightingTime, appScene, appHemiLight, appKeyLight, appRimLight);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (infraRedo(appDoc).ok) appRebuildAll('Redid edit');
      } else if (infraUndo(appDoc).ok) {
        appRebuildAll('Undid edit');
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (infraRedo(appDoc).ok) appRebuildAll('Redid edit');
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 's') {
      appView.silhouetteMode = !appView.silhouetteMode;
      const el = infra$('#chk-silhouette');
      if (el) el.checked = appView.silhouetteMode;
      matApplyViewOverrides(appSceneRoot, appView);
    } else if (k === 'e') {
      appView.debugOverlays = !appView.debugOverlays;
      const el = infra$('#chk-debug');
      if (el) el.checked = appView.debugOverlays;
      appRefreshOverlays();
    } else if (k === 'h') {
      appView.humanRef = !appView.humanRef;
      const el = infra$('#chk-human-ref');
      if (el) el.checked = appView.humanRef;
      appRefreshOverlays();
    } else if (k === 'w') {
      appView.wireframe = !appView.wireframe;
      const el = infra$('#chk-wireframe');
      if (el) el.checked = appView.wireframe;
      matApplyViewOverrides(appSceneRoot, appView);
    } else if (k === 't') {
      toggleTheatre();
    } else if (k === 'f') {
      toggleFullscreen();
    } else if (k === 'p') {
      prvSnapshotPNG(appRenderer, appScene, appCamera, appDoc, appToast);
    } else if (k === 'delete' || k === 'backspace') {
      if (appDoc?.selection?.kind === 'node') {
        infraExecuteCommand(appDoc, { type: 'DELETE_NODE', nodeId: appDoc.selection.id });
        appRebuildAll('Deleted node');
      } else if (appDoc?.selection?.kind === 'edge') {
        infraExecuteCommand(appDoc, { type: 'DELETE_EDGE', edgeId: appDoc.selection.id });
        appRebuildAll('Deleted road segment');
      }
    }
  });
}

async function appInitStudio() {
  infraEnsureRegistry();
  appDoc = infraGetReferenceScene('ref_urban_road_network');
  appBindUIEvents();

  const canvas = infra$('#infra-canvas');
  const stage = infra$('#infra-stage');
  if (!canvas || !stage) return;

  try {
    appSetStatus('Loading 3D engine...');
    await appEnsureThree();

    appRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    appRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    appRenderer.shadowMap.enabled = true;
    appRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    matSetMaxAnisotropy(Math.min(4, appRenderer.capabilities?.getMaxAnisotropy?.() || 1));

    appScene = new THREE.Scene();
    appCamera = new THREE.PerspectiveCamera(46, Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight), 0.2, 600);
    appCamera.position.set(42, 34, 46);

    if (THREE.OrbitControls) {
      appOrbit = new THREE.OrbitControls(appCamera, canvas);
      appOrbit.enableDamping = true;
      appOrbit.dampingFactor = 0.08;
      appOrbit.maxPolarAngle = Math.PI * 0.49;
    } else {
      appOrbit = prvAttachFallbackOrbit(appCamera, canvas, new THREE.Vector3(0, 1, 0));
    }

    appHemiLight = new THREE.HemisphereLight(0xdff2ff, 0x3b444f, 0.78);
    appKeyLight = new THREE.DirectionalLight(0xfff5e0, 0.95);
    appKeyLight.position.set(36, 56, 28);
    appKeyLight.castShadow = true;
    appKeyLight.shadow.mapSize.set(1024, 1024);
    appKeyLight.shadow.camera.near = 2;
    appKeyLight.shadow.camera.far = 180;
    const d = 55;
    appKeyLight.shadow.camera.left = -d;
    appKeyLight.shadow.camera.right = d;
    appKeyLight.shadow.camera.top = d;
    appKeyLight.shadow.camera.bottom = -d;
    appRimLight = new THREE.DirectionalLight(0x88bbee, 0.35);
    appRimLight.position.set(-40, 22, -32);

    appScene.add(appHemiLight, appKeyLight, appRimLight);
    prvUpdateLighting(appView.lightingTime, appScene, appHemiLight, appKeyLight, appRimLight);

    appEnvRoot = new THREE.Group();
    appEnvRoot.name = 'StudioEnvironment';
    appDebugRoot = new THREE.Group();
    appDebugRoot.name = 'LayerE_DebugAndContext';
    appScene.add(appEnvRoot, appDebugRoot);

    prvRebuildEnvironment(appEnvRoot, appView.showGrid);

    appEditor = edCreateNetworkEditor(appBuildUIContext());
    appEditor.attach(canvas);

    appReady = true;
    appResizeViewport();
    window.addEventListener('resize', appResizeViewport);

    appRebuildAll('Ready — Reference Scene A loaded');
    prvSetCameraFocus('overview', appCamera, appOrbit, appDoc);

    const animate = () => {
      requestAnimationFrame(animate);
      appOrbit?.update();
      appRenderer?.render(appScene, appCamera);
    };
    animate();
  } catch (err) {
    console.error('Infrastructure Studio init error:', err);
    appSetStatus(`Init failed: ${err.message}`);
  }
}

if (typeof window !== 'undefined') {
  window.BInfrastructureGenerator = {
    version: INFRA_GENERATOR_META.version,
    schemaVersion: INFRA_BLUEPRINT_SCHEMA_VERSION,
    ensureRegistry: infraEnsureRegistry,
    getDocument: () => appDoc,
    executeCommand: (cmd) => {
      const res = infraExecuteCommand(appDoc, cmd);
      if (res.ok) appRebuildAll();
      return res;
    },
    undo: () => {
      const res = infraUndo(appDoc);
      if (res.ok) appRebuildAll('Undid edit');
      return res;
    },
    redo: () => {
      const res = infraRedo(appDoc);
      if (res.ok) appRebuildAll('Redid edit');
      return res;
    },
    solve: (doc) => infraSolveNetwork(doc || appDoc),
    buildScene: (doc, opts) => infraBuildScene(doc || appDoc, opts),
    generateBlueprint: (doc) => {
      const target = doc || appDoc;
      const solved = infraSolveNetwork(target);
      return infraGenerateBlueprint(target, solved, appSceneRoot?.userData?.stats || {});
    },
    generateAssemblyBlueprint: (doc) => {
      const target = doc || appDoc;
      const solved = infraSolveNetwork(target);
      return infraGenerateAssemblyBlueprint(target, solved, appSceneRoot?.userData?.stats || {});
    },
    validateBlueprint: infraValidateBlueprint,
    hydrateBlueprint: infraHydrateDocumentFromBlueprint,
    loadReferenceScene: (id) => {
      const next = infraGetReferenceScene(id);
      if (appDoc) {
        infraExecuteCommand(appDoc, { type: 'REPLACE_DOCUMENT', nextDoc: next });
        appRebuildAll(`Loaded ${next.name}`);
      }
      return next;
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', appInitStudio);
    } else {
      appInitStudio();
    }
  }
}
