import { copy, roundNum } from '../utils.js';
import { validateAndReservePlacement, resolveSpecWorldPose } from './placement-anchors.js';

export const OBJECT_GROUP_LABELS = {
  fueling: 'Fueling & Pump Island Equipment',
  site_amenities: 'Site & Customer Amenities',
  waste_utility: 'Waste, Dumpsters & Utilities',
  rooftop_mep: 'Rooftop Hvac & Communications',
  seating_patio: 'Patio & Outdoor Seating',
  signage_lighting: 'Roadside Signs & Exterior Lighting',
  service_equipment: 'Garage, Dock & Workshop Equipment',
  interior_display: 'Visible Interior Window Displays'
};

export function resolveCityObjectApi(options = {}) {
  if ('cityObjectApi' in options) {
    const provided = options.cityObjectApi;
    if (provided && typeof provided.ensureCityObjectRegistry === 'function') {
      provided.ensureCityObjectRegistry();
    }
    return provided || null;
  }
  if (typeof globalThis !== 'undefined' && globalThis.BCityObjectSuite) {
    if (typeof globalThis.BCityObjectSuite.ensureCityObjectRegistry === 'function') {
      globalThis.BCityObjectSuite.ensureCityObjectRegistry();
    }
    return globalThis.BCityObjectSuite;
  }
  return null;
}

export function buildLayerCObjects(objectSpecs, placementCtx, cfg, options = {}) {
  const layerGroup = new THREE.Group();
  layerGroup.name = 'LayerC_EnvironmentalObjects';

  const api = resolveCityObjectApi(options);
  const disabledGroups = new Set(cfg.disabledObjectGroups || []);
  const density = cfg.outdoorObjectDensity !== undefined ? cfg.outdoorObjectDensity : 0.85;

  const placedRecords = [];
  const missingDependencies = [];
  const availableGroups = new Set();

  for (let idx = 0; idx < (objectSpecs || []).length; idx++) {
    const spec = objectSpecs[idx];
    if (!spec || !spec.familyId) continue;
    const groupKey = spec.groupKey || 'site_amenities';
    availableGroups.add(groupKey);

    if (!cfg.includeObjectsLayer) continue;
    if (disabledGroups.has(groupKey)) continue;
    if (spec.minDensity !== undefined && density < spec.minDensity) continue;

    if (!api) {
      missingDependencies.push({
        familyId: spec.familyId,
        presetId: spec.presetId || null,
        groupKey,
        reason: 'City Object Suite API is not loaded'
      });
      continue;
    }

    const hasFam = typeof api.hasObjectFamily === 'function'
      ? api.hasObjectFamily(spec.familyId)
      : Boolean(api.getObjectFamily?.(spec.familyId));

    if (!hasFam) {
      missingDependencies.push({
        familyId: spec.familyId,
        presetId: spec.presetId || null,
        groupKey,
        reason: `Missing City Object family "${spec.familyId}"`
      });
      continue;
    }

    let objCfg;
    try {
      objCfg = api.buildDefaultConfigForFamily(spec.familyId, spec.presetId || null);
    } catch (err) {
      missingDependencies.push({
        familyId: spec.familyId,
        presetId: spec.presetId || null,
        groupKey,
        reason: err?.message || 'Failed to resolve preset config'
      });
      continue;
    }

    objCfg.seed = spec.seed !== undefined ? spec.seed : ((cfg.seed || 2026) + (idx + 1) * 97);
    objCfg.lightingTime = cfg.lightingTime || 'day';
    objCfg.condition = spec.condition || cfg.condition || 'clean';
    objCfg.variationMode = 'subtle';
    if (spec.overrides) {
      Object.assign(objCfg, copy(spec.overrides));
    }
    if (spec.materialOverrides) {
      Object.assign(objCfg, copy(spec.materialOverrides));
    }

    let objGroup;
    try {
      objGroup = api.buildCityObject(objCfg, {
        lightingTime: cfg.lightingTime || 'day',
        applyVariation: spec.applyVariation !== false
      });
    } catch (err) {
      missingDependencies.push({
        familyId: spec.familyId,
        presetId: spec.presetId || null,
        groupKey,
        reason: err?.message || 'Failed to build City Object geometry'
      });
      continue;
    }

    // Measure object bounds for placement validation
    const box = new THREE.Box3().setFromObject(objGroup);
    const size = new THREE.Vector3();
    if (!box.isEmpty()) box.getSize(size);
    const halfExtents = {
      x: Math.max(0.15, size.x * 0.5),
      y: Math.max(0.15, size.y * 0.5),
      z: Math.max(0.15, size.z * 0.5)
    };

    // Align bottom to y=0 in local space for ground_standing / roof_mounted objects
    if (!box.isEmpty() && !spec.preserveLocalOriginY) {
      const bottomOffset = -box.min.y;
      if (Math.abs(bottomOffset) > 0.002 && Math.abs(bottomOffset) < 2.5) {
        for (const child of objGroup.children) {
          child.position.y += bottomOffset;
        }
      }
    }

    const placement = placementCtx
      ? validateAndReservePlacement(placementCtx, spec, halfExtents)
      : (() => {
        const p = resolveSpecWorldPose(placementCtx, spec);
        return { accepted: true, nudged: false, position: [p.x, p.y, p.z], rotationY: p.rotationY };
      })();

    if (!placement.accepted) {
      objGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      continue;
    }

    const scale = spec.scale || 1;
    objGroup.position.set(placement.position[0], placement.position[1], placement.position[2]);
    objGroup.rotation.y = placement.rotationY;
    if (scale !== 1) objGroup.scale.setScalar(scale);

    objGroup.name = `Prop_${spec.familyId}_${idx}`;
    objGroup.userData = {
      ...(objGroup.userData || {}),
      layer: 'LayerC_EnvironmentalObjects',
      groupKey,
      anchorId: spec.anchorId || null,
      sourceFamilyId: spec.familyId,
      sourcePresetId: objCfg.presetId || spec.presetId || null,
      seed: objCfg.seed
    };

    // Group into named subgroups per groupKey
    let subgroup = layerGroup.getObjectByName(`ObjectGroup_${groupKey}`);
    if (!subgroup) {
      subgroup = new THREE.Group();
      subgroup.name = `ObjectGroup_${groupKey}`;
      layerGroup.add(subgroup);
    }
    subgroup.add(objGroup);

    placedRecords.push({
      id: objGroup.name,
      familyId: spec.familyId,
      presetId: objCfg.presetId || spec.presetId || null,
      groupKey,
      anchorId: spec.anchorId || null,
      seed: objCfg.seed,
      positionMeters: placement.position,
      rotationY: roundNum(placement.rotationY, 4),
      scale,
      nudged: Boolean(placement.nudged),
      dimensionsMeters: {
        width: roundNum(size.x * scale, 3),
        height: roundNum(size.y * scale, 3),
        depth: roundNum(size.z * scale, 3)
      }
    });
  }

  if (placementCtx) {
    placementCtx.diagnostics.missingDependencies = missingDependencies;
  }

  return {
    group: layerGroup,
    placedRecords,
    missingDependencies,
    availableGroups: Array.from(availableGroups)
  };
}
