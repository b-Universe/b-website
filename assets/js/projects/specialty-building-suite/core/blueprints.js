import { copy, roundNum, hashBlueprintString } from '../utils.js';
import { BLUEPRINT_SCHEMA_VERSION, B_UNITS_PER_METER, GENERATOR_META } from '../config.js';
import { getSpecialtyFamily, getSpecialtyPreset, sanitiseSpecialtyConfig } from './registry.js';

export function vecToBGameUnits(x = 0, y = 0, z = 0) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 3),
    y: roundNum(-z * B_UNITS_PER_METER, 3),
    z: roundNum(y * B_UNITS_PER_METER, 3)
  };
}

function measureBox3(root) {
  let min = { x: 0, y: 0, z: 0 };
  let max = { x: 0, y: 0, z: 0 };
  let meshCount = 0;
  let triangleCount = 0;

  if (root) {
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      meshCount += 1;
      const pos = obj.geometry.attributes?.position;
      const idx = obj.geometry.index;
      if (idx) triangleCount += Math.floor(idx.count / 3);
      else if (pos) triangleCount += Math.floor(pos.count / 3);
    });
    if (meshCount > 0 && typeof THREE !== 'undefined' && THREE.Box3) {
      const box = new THREE.Box3().setFromObject(root);
      if (!box.isEmpty()) {
        min = { x: roundNum(box.min.x, 4), y: roundNum(box.min.y, 4), z: roundNum(box.min.z, 4) };
        max = { x: roundNum(box.max.x, 4), y: roundNum(box.max.y, 4), z: roundNum(box.max.z, 4) };
      }
    }
  }

  return {
    meshCount,
    triangleCount,
    min,
    max,
    size: {
      x: roundNum(Math.max(0, max.x - min.x), 4),
      y: roundNum(Math.max(0, max.y - min.y), 4),
      z: roundNum(Math.max(0, max.z - min.z), 4)
    },
    center: {
      x: roundNum((min.x + max.x) * 0.5, 4),
      y: roundNum((min.y + max.y) * 0.5, 4),
      z: roundNum((min.z + max.z) * 0.5, 4)
    }
  };
}

export function generateSpecialtyBlueprint(rawCfg, assemblyData = {}) {
  const settings = sanitiseSpecialtyConfig(rawCfg);
  const fam = getSpecialtyFamily(settings.familyId);
  const preset = getSpecialtyPreset(settings.presetId);

  const buildingStats = measureBox3(assemblyData.layerA);
  const lotStats = measureBox3(assemblyData.layerB);
  const objectsStats = measureBox3(assemblyData.layerC);
  const fullStats = measureBox3(assemblyData.root);

  const identityPayload = JSON.stringify({
    familyId: settings.familyId,
    presetId: settings.presetId,
    seed: settings.seed,
    variationStrength: settings.variationStrength,
    width: settings.width,
    depth: settings.depth,
    floors: settings.floors,
    floorHeight: settings.floorHeight,
    lotType: settings.lotType
  });
  const tplHash = hashBlueprintString(identityPayload).slice(0, 12);
  const revHash = hashBlueprintString(JSON.stringify(settings));

  const anchors = assemblyData.placementCtx
    ? Array.from(assemblyData.placementCtx.anchors.values())
    : [];

  const entrances = (assemblyData.entrances || []).map((e, i) => ({
    id: e.id || `entrance_${i}`,
    role: e.role || 'main',
    label: e.label || 'Public Entrance',
    positionMeters: {
      x: roundNum(e.position?.x || 0, 4),
      y: roundNum(e.position?.y || 0, 4),
      z: roundNum(e.position?.z || 0, 4)
    },
    bGamePosition: vecToBGameUnits(e.position?.x || 0, e.position?.y || 0, e.position?.z || 0),
    normal: e.normal || { x: 0, y: 0, z: 1 },
    widthMeters: roundNum(e.width || 1.8, 3),
    heightMeters: roundNum(e.height || 2.3, 3),
    approachMeters: e.approach || {
      x: roundNum((e.position?.x || 0) + (e.normal?.x || 0) * 1.4, 4),
      y: roundNum(e.position?.y || 0, 4),
      z: roundNum((e.position?.z || 0) + (e.normal?.z || 0) * 1.4, 4)
    }
  }));

  const blueprint = {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: { ...GENERATOR_META },
    templateId: `spec_bldg_${settings.familyId}_${settings.seed}_${tplHash}`,
    templateRevision: `rev_${revHash}`,
    name: String(assemblyData.name || `${preset?.label || fam?.label || settings.familyId} #${settings.seed}`),
    categoryId: fam?.categoryId || 'commercial_services',
    familyId: settings.familyId,
    presetId: settings.presetId,
    purpose: fam?.label || settings.familyId,
    architecturalEra: settings.architecturalEra,
    condition: settings.condition,
    seed: settings.seed,
    settings: copy(settings),
    bounds: {
      fullPropertyMeters: fullStats,
      buildingMeters: buildingStats,
      lotMeters: lotStats,
      bGameUnits: {
        min: vecToBGameUnits(fullStats.min.x, fullStats.min.y, fullStats.max.z),
        max: vecToBGameUnits(fullStats.max.x, fullStats.max.y, fullStats.min.z),
        size: {
          x: roundNum(fullStats.size.x * B_UNITS_PER_METER, 3),
          y: roundNum(fullStats.size.z * B_UNITS_PER_METER, 3),
          z: roundNum(fullStats.size.y * B_UNITS_PER_METER, 3)
        }
      }
    },
    geometryStats: {
      totalTriangles: fullStats.triangleCount,
      totalMeshes: fullStats.meshCount,
      buildingTriangles: buildingStats.triangleCount,
      lotTriangles: lotStats.triangleCount,
      objectsTriangles: objectsStats.triangleCount
    },
    layers: {
      layerA_BuildingStructure: {
        enabled: settings.includeBuildingLayer,
        attachedStructures: assemblyData.attachedStructures || [],
        interiorDisplayZones: assemblyData.interiorDisplayZones || []
      },
      layerB_PropertyLot: assemblyData.lotLayout || { enabled: false, lotType: 'none' },
      layerC_EnvironmentalObjects: {
        enabled: settings.includeObjectsLayer,
        availableGroups: assemblyData.availableObjectGroups || [],
        placedCount: (assemblyData.placedObjects || []).length
      }
    },
    entrances,
    placementAnchors: anchors,
    objectDependencies: assemblyData.placedObjects || [],
    missingObjectDependencies: assemblyData.missingDependencies || [],
    placementDiagnostics: assemblyData.placementCtx?.diagnostics || {
      placedCount: 0,
      nudgedCount: 0,
      rejectedCollisions: [],
      missingDependencies: []
    },
    materials: {
      exteriorMaterial: settings.exteriorMaterial,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      trimColor: settings.trimColor,
      glassColor: settings.glassColor
    }
  };

  return blueprint;
}

export function validateSpecialtyBlueprint(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Blueprint payload is not an object'], settings: null };
  }

  // Support both full blueprint and exported settings wrapper
  const candidateSettings = data.settings || data.config || (data.familyId ? data : null);
  if (!candidateSettings || !candidateSettings.familyId) {
    errors.push('Missing familyId in specialty building blueprint/settings');
    return { valid: false, errors, settings: null };
  }

  if (data.schemaVersion && data.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${data.schemaVersion}`);
  }

  if (data.schemaVersion === BLUEPRINT_SCHEMA_VERSION) {
    if (!data.templateId) errors.push('Missing templateId');
    if (!data.bounds || !data.bounds.buildingMeters) errors.push('Missing bounds.buildingMeters');
    if (!Array.isArray(data.entrances)) errors.push('Missing entrances array');
    if (!data.layers || !data.layers.layerA_BuildingStructure || !data.layers.layerB_PropertyLot || !data.layers.layerC_EnvironmentalObjects) {
      errors.push('Missing three-layer metadata structure');
    }
  }

  const fam = getSpecialtyFamily(candidateSettings.familyId);
  if (!fam) {
    errors.push(`Unknown specialty building family: ${candidateSettings.familyId}`);
  }

  const sanitised = sanitiseSpecialtyConfig(candidateSettings);
  return {
    valid: errors.length === 0,
    errors,
    settings: sanitised,
    blueprint: data.schemaVersion === BLUEPRINT_SCHEMA_VERSION ? data : null
  };
}
