import { INFRA_B_UNITS_PER_METER, INFRA_STORAGE_KEY } from '../config.js';
import {
  infraGenerateAssemblyBlueprint,
  infraGenerateBlueprint,
  infraHydrateDocumentFromBlueprint,
  infraValidateBlueprint
} from '../core/blueprints.js';
import { infraSlugify } from '../utils.js';

function expTriggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function expBuildExportRoot(sceneRoot, options = {}) {
  const wrap = new THREE.Group();
  wrap.name = `InfraExport_${infraSlugify(options.name || 'network')}`;

  if (sceneRoot) {
    for (const child of sceneRoot.children) {
      if (child.name === 'LayerE_DebugAndContext' || child.userData?.layer === 'LayerE_DebugAndContext') continue;
      wrap.add(child.clone(true));
    }
  }

  if (options.exportUnits === 'b_units') {
    wrap.scale.setScalar(INFRA_B_UNITS_PER_METER);
  }
  if (options.exportAxis === 'z_up') {
    wrap.rotation.x = Math.PI / 2;
  }
  wrap.updateMatrixWorld(true);
  return wrap;
}

export function expExportBlueprintJSON(doc, sceneRoot, toast) {
  const bp = sceneRoot?.userData?.blueprint || infraGenerateBlueprint(doc, sceneRoot?.userData?.solved || {}, sceneRoot?.userData?.stats || {});
  const baseName = `${infraSlugify(doc?.name || 'infrastructure')}-${doc?.seed || 2026}`;
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  expTriggerDownload(blob, `${baseName}.infrastructure.json`);
  if (toast) toast(`Exported ${baseName}.infrastructure.json`);
  return bp;
}

export function expExportAssemblyJSON(doc, sceneRoot, toast) {
  const asm = infraGenerateAssemblyBlueprint(doc, sceneRoot?.userData?.solved || {}, sceneRoot?.userData?.stats || {});
  const baseName = `${infraSlugify(doc?.name || 'assembly')}-${doc?.seed || 2026}`;
  const blob = new Blob([JSON.stringify(asm, null, 2)], { type: 'application/json' });
  expTriggerDownload(blob, `${baseName}.assembly.json`);
  if (toast) toast(`Exported ${baseName}.assembly.json (${asm.externalPorts.length} external ports)`);
  return asm;
}

export async function expExportGLB(doc, sceneRoot, options, loadGltfExporterFn, toast, setStatus) {
  if (!sceneRoot) {
    if (toast) toast('Nothing to export yet');
    return;
  }
  if (typeof loadGltfExporterFn === 'function') {
    await loadGltfExporterFn();
  }
  if (typeof THREE === 'undefined' || !THREE.GLTFExporter) {
    if (toast) toast('GLTFExporter unavailable');
    return;
  }

  const exportRoot = expBuildExportRoot(sceneRoot, {
    name: doc?.name,
    exportUnits: options?.exportUnits || 'meters',
    exportAxis: options?.exportAxis || 'y_up'
  });
  const baseName = `${infraSlugify(doc?.name || 'infrastructure')}-${doc?.seed || 2026}`;
  const exporter = new THREE.GLTFExporter();
  if (setStatus) setStatus('Exporting binary .GLB...');

  try {
    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          expTriggerDownload(blob, `${baseName}.glb`);
          if (toast) toast(`Exported ${baseName}.glb`);
        } else {
          const json = JSON.stringify(result, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          expTriggerDownload(blob, `${baseName}.gltf`);
          if (toast) toast(`Exported ${baseName}.gltf`);
        }
        if (setStatus) setStatus('Ready');
      },
      { binary: true, onlyVisible: true }
    );
  } catch (err) {
    console.error('GLB export error:', err);
    if (toast) toast('GLB export failed');
    if (setStatus) setStatus('GLB export failed');
  }
}

export function expParseImportedJSON(rawText) {
  const parsed = JSON.parse(rawText);
  const check = infraValidateBlueprint(parsed);
  if (!check.valid) {
    throw new Error(check.errors.join('; '));
  }
  const hydrated = infraHydrateDocumentFromBlueprint(parsed);
  return { blueprint: parsed, hydrated, warnings: check.warnings };
}

export function expImportJSONFile(file, onApplyDoc, toast) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const { hydrated, warnings } = expParseImportedJSON(String(reader.result || ''));
      onApplyDoc(hydrated);
      if (toast) {
        const msg = warnings.length
          ? `Imported "${hydrated.name}" (${warnings.length} warning)`
          : `Imported "${hydrated.name}"`;
        toast(msg);
      }
    } catch (err) {
      console.error('Blueprint import failed:', err);
      if (toast) toast(`Import rejected: ${err?.message || 'Invalid JSON'}`);
    }
  };
  reader.readAsText(file);
}

export function expLoadVaultList() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(INFRA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function expSaveToVault(name, doc, sceneRoot, toast) {
  try {
    if (typeof localStorage === 'undefined') return [];
    const bp = sceneRoot?.userData?.blueprint || infraGenerateBlueprint(doc, sceneRoot?.userData?.solved || {}, sceneRoot?.userData?.stats || {});
    const list = expLoadVaultList();
    const label = String(name || doc?.name || 'Custom Network').trim();
    list.unshift({
      id: `vault_${Date.now()}`,
      name: label,
      savedAt: new Date().toISOString(),
      blueprint: bp
    });
    const trimmed = list.slice(0, 20);
    localStorage.setItem(INFRA_STORAGE_KEY, JSON.stringify(trimmed));
    if (toast) toast(`Saved "${label}" to local library`);
    return trimmed;
  } catch (err) {
    if (toast) toast(`Save failed: ${err?.message || 'Storage error'}`);
    return expLoadVaultList();
  }
}

export function expDeleteFromVault(vaultId) {
  try {
    if (typeof localStorage === 'undefined') return [];
    const list = expLoadVaultList().filter((item) => item.id !== vaultId);
    localStorage.setItem(INFRA_STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}
