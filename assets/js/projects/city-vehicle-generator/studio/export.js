import { copy, pick, rng32 } from '../utils.js';
import { BASE, PRESETS, STYLES, sanitiseConfig, getStyle } from '../config.js';
import { generateCoherentPalette } from '../materials/palettes.js';
import { generateVehicleBlueprint, validateVehicleBlueprint } from '../core/blueprints.js';
import { createCityVehicle } from '../geometry/vehicle.js';

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

export function safeVehicleName(cfg, customName = null) {
  const base = customName || cfg.signText || cfg.style || 'city-vehicle';
  return String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'city-vehicle';
}

export function exportVehicleBlueprint(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const bp = generateVehicleBlueprint(cfg);
  const name = safeVehicleName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  fileDownload(`${name}.vehicle.json`, blob);
  if (toast) toast(`Exported Blueprint: ${name}.vehicle.json`);
  return bp;
}

export function exportVehicleJSON(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const payload = {
    type: 'b-city-vehicle-settings',
    schemaVersion: 'b.vehicle.v1',
    config: copy(cfg)
  };
  const name = safeVehicleName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  fileDownload(`${name}-settings.json`, blob);
  if (toast) toast(`Exported Settings: ${name}-settings.json`);
  return payload;
}

export function buildTrafficFleetPack(state, count = 8) {
  const seedInt = (Number(state?.seed) || 1024) >>> 0;
  const r = rng32(seedInt + 991);
  const fleetPool = [
    'sedan',
    'compact_car',
    'taxi',
    'suv',
    'delivery_van',
    'city_bus',
    'police',
    'food_truck',
    'convertible',
    'pickup',
    'box_truck',
    'tow_truck',
    'garbage_truck',
    'ambulance'
  ];

  const targetCount = Math.max(1, Math.min(32, Math.round(Number(count) || 8)));
  const vehicles = [];
  for (let i = 0; i < targetCount; i++) {
    const archId = i < fleetPool.length ? fleetPool[i] : pick(r, STYLES).id;
    const arch = getStyle(archId);
    const presetBase = PRESETS[arch.preset] || PRESETS.sedan;
    const vSeed = seedInt + (i + 1) * 137;
    const vr = rng32(vSeed);
    const roleVariant = presetBase.roleVariant || 'civilian';
    const palFamily = roleVariant === 'civilian'
      ? pick(vr, ['civilian_neutrals', 'civic_colors', 'muted_industrial'])
      : (presetBase.paletteFamily || 'service_utility');
    const pal = generateCoherentPalette(palFamily, vSeed + 17, roleVariant);
    const cfg = sanitiseConfig({
      ...BASE,
      ...presetBase,
      ...pal,
      style: arch.id,
      seed: vSeed,
      colorVariation: Number((0.05 + vr() * 0.1).toFixed(2))
    });
    vehicles.push(generateVehicleBlueprint(cfg));
  }

  return {
    type: 'b-city-traffic-fleet-pack',
    schemaVersion: 'b.vehicle.v1',
    seed: seedInt,
    vehicleCount: vehicles.length,
    generatedAt: new Date().toISOString(),
    vehicles
  };
}

export function exportTrafficFleetPack(state, count = 8, toast = null) {
  const payload = buildTrafficFleetPack(state, count);
  if (typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    fileDownload(`city-traffic-fleet-${payload.seed}.fleet.json`, blob);
  }
  if (toast) toast(`Exported Fleet Pack (${payload.vehicleCount} Vehicles)`);
  return payload;
}

function expDisposeTempGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.userData?._tex) obj.userData._tex.dispose();
    if (obj.userData?._ownedMat && obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export async function exportVehicleGLB(state, ready, activeBlueprintName, loadExporterFn, toast, setStatus) {
  if (!ready) {
    if (toast) toast('Wait For 3d Preview Before Exporting Model');
    return;
  }
  try {
    if (setStatus) setStatus('Preparing Glb Exporter...');
    await loadExporterFn();
    const cfg = sanitiseConfig(state);
    const exportGroup = createCityVehicle(cfg);
    exportGroup.updateMatrixWorld(true);

    const exporter = new THREE.GLTFExporter();
    const name = safeVehicleName(cfg, activeBlueprintName);
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
    console.error('City Vehicle Glb Export Error:', err);
    if (toast) toast(`Model Export Error: ${err.message}`);
    if (setStatus) setStatus('Export Failed');
  }
}

export function applyImportedVehicleData(parsed, sourceLabel = 'Imported Vehicle', applyFn = null, toast = null) {
  const res = validateVehicleBlueprint(parsed);
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

export function handleVehicleFileImport(file, onApply, toast) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const cleanName = file.name.replace(/\.(vehicle\.)?json$/i, '');
      applyImportedVehicleData(parsed, cleanName, onApply, toast);
    } catch (err) {
      if (toast) toast(`Invalid Json File: ${err.message}`);
    }
  };
  reader.readAsText(file);
}
