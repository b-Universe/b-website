import { $, copy } from '../utils.js';
import { sanitiseConfig, getStyle } from '../config.js';
import { generateSkyscraperBlueprint, validateSkyscraperBlueprint } from '../core/blueprints.js';
import { createSkyscraper } from '../geometry/skyscraper.js';

export function fileDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeSkyscraperName(cfg, customName = null) {
  const base = customName || cfg.signText || cfg.style || 'skyscraper';
  return String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'skyscraper';
}

export function exportSkyscraperBlueprint(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const bp = generateSkyscraperBlueprint(cfg);
  const name = safeSkyscraperName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  fileDownload(`${name}.skyscraper.json`, blob);
  if (toast) toast(`Exported Blueprint: ${name}.skyscraper.json`);
  return bp;
}

export function exportSkyscraperJSON(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const payload = {
    type: 'b-skyscraper-settings',
    schemaVersion: 'b.skyscraper.v1',
    config: copy(cfg)
  };
  const name = safeSkyscraperName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  fileDownload(`${name}-settings.json`, blob);
  if (toast) toast(`Exported Settings: ${name}-settings.json`);
  return payload;
}

function expDisposeTempGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.userData?._tex) obj.userData._tex.dispose();
  });
}

export async function exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporterFn, toast, setStatus) {
  if (!ready) {
    if (toast) toast('Wait For 3d Preview Before Exporting Model');
    return;
  }
  try {
    if (setStatus) setStatus('Preparing Glb Exporter...');
    await loadExporterFn();
    const cfg = sanitiseConfig(state);
    const exportGroup = createSkyscraper(cfg);
    exportGroup.updateMatrixWorld(true);

    const exporter = new THREE.GLTFExporter();
    const name = safeSkyscraperName(cfg, activeBlueprintName);
    if (setStatus) setStatus('Generating Binary Glb...');

    await new Promise((resolve, reject) => {
      try {
        exporter.parse(
          exportGroup,
          (result) => {
            const blob = result instanceof ArrayBuffer
              ? new Blob([result], { type: 'model/gltf-binary' })
              : new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
            fileDownload(`${name}.glb`, blob);
            if (toast) toast(`Exported 3d Model: ${name}.glb`);
            resolve();
          },
          { binary: true, onlyVisible: false }
        );
      } catch (err) {
        reject(err);
      }
    });
    expDisposeTempGroup(exportGroup);
    if (setStatus) setStatus('Model Export Complete');
  } catch (err) {
    console.error('Skyscraper Glb Export Error:', err);
    if (toast) toast(`Model Export Error: ${err.message}`);
    if (setStatus) setStatus('Export Failed');
  }
}

export function applyImportedSkyscraperData(parsed, sourceLabel = 'Imported Skyscraper', applyFn = null, toast = null) {
  const res = validateSkyscraperBlueprint(parsed);
  if (!res.ok) {
    if (toast) toast(`Import Rejected: ${res.errors.join('; ')}`);
    return res;
  }
  const styleDesc = getStyle(res.config.style);
  const labelName = res.config.signText || styleDesc.label;
  if (applyFn) {
    applyFn(res.config, labelName, res.config.style, sourceLabel);
  }
  if (toast) {
    const warnMsg = res.warnings.length ? ` (${res.warnings.length} Adjusted)` : '';
    toast(`Loaded ${sourceLabel}${warnMsg}`);
  }
  return res;
}

export function handleSkyscraperFileImport(file, onApply, toast) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const cleanName = file.name.replace(/\.(skyscraper\.)?json$/i, '');
      applyImportedSkyscraperData(parsed, cleanName, onApply, toast);
    } catch (err) {
      if (toast) toast(`Invalid Json File: ${err.message}`);
    }
  };
  reader.readAsText(file);
}
