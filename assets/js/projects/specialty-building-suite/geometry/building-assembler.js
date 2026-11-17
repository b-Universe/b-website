import { copy, roundNum } from '../utils.js';
import { getSpecialtyFamily, getSpecialtyPreset, sanitiseSpecialtyConfig } from '../core/registry.js';
import { createBuildingRngStreams, applySeedVariation } from '../core/seeded-generation.js';
import {
  createPlacementContext,
  registerBuildingFootprint,
  registerRoofBound,
  registerAnchor
} from '../core/placement-anchors.js';
import { computeLotLayout } from '../core/lot-layout.js';
import { buildLayerCObjects } from '../core/object-integration.js';
import { generateSpecialtyBlueprint } from '../core/blueprints.js';
import { buildLotLayerMesh } from './lot-mesh.js';

export function createSpecialtyBuilding(rawCfg = {}, options = {}) {
  const baseCfg = sanitiseSpecialtyConfig(rawCfg);
  const cfg = options.skipVariation ? baseCfg : applySeedVariation(baseCfg, options.locks || new Set());
  const fam = getSpecialtyFamily(cfg.familyId);
  if (!fam) {
    throw new Error(`Unknown specialty building family: ${cfg.familyId}`);
  }
  const preset = getSpecialtyPreset(cfg.presetId);
  const streams = createBuildingRngStreams(cfg.seed + (options.seedOffset || 0) * 97);

  const root = new THREE.Group();
  root.name = `SpecialtyBuilding_${fam.id}`;

  const layerA = new THREE.Group();
  layerA.name = 'LayerA_BuildingStructure';
  const mainBuildingGroup = new THREE.Group();
  mainBuildingGroup.name = 'MainBuilding';
  const attachedGroup = new THREE.Group();
  attachedGroup.name = 'AttachedStructures';
  layerA.add(mainBuildingGroup);
  layerA.add(attachedGroup);

  const placementCtx = createPlacementContext(cfg);

  const context = {
    cfg,
    family: fam,
    preset,
    streams,
    r: streams.structure,
    root,
    layerA,
    mainBuildingGroup,
    attachedGroup,
    placementCtx,
    entrances: [],
    attachedStructures: [],
    interiorDisplayZones: [],
    lotOptions: {},
    buildingBounds: {
      width: cfg.width,
      depth: cfg.depth,
      height: cfg.floors * cfg.floorHeight
    }
  };

  // Build Layer A (Building Structure)
  if (typeof fam.buildStructure === 'function') {
    fam.buildStructure(context);
  }

  // Register primary footprint & roof bound if family didn't register custom ones
  if (placementCtx.buildingFootprints.length === 0) {
    registerBuildingFootprint(placementCtx, {
      id: 'main_building',
      minX: -context.buildingBounds.width * 0.5,
      maxX: context.buildingBounds.width * 0.5,
      minZ: -context.buildingBounds.depth * 0.5,
      maxZ: context.buildingBounds.depth * 0.5,
      maxY: context.buildingBounds.height
    });
  }
  if (placementCtx.roofBounds.length === 0) {
    const roofY = context.roofTopY || context.buildingBounds.height;
    registerRoofBound(placementCtx, {
      id: 'main_roof',
      minX: -context.buildingBounds.width * 0.5,
      maxX: context.buildingBounds.width * 0.5,
      minZ: -context.buildingBounds.depth * 0.5,
      maxZ: context.buildingBounds.depth * 0.5,
      y: roofY
    });
    if (!placementCtx.anchors.has('roof_main')) {
      registerAnchor(placementCtx, {
        id: 'roof_main',
        category: 'roof',
        position: [0, roofY, 0],
        surfaceY: roofY,
        rotationY: 0
      });
    }
    if (!placementCtx.anchors.has('roof_center')) {
      registerAnchor(placementCtx, {
        id: 'roof_center',
        category: 'roof',
        position: [0, roofY, 0],
        surfaceY: roofY,
        rotationY: 0
      });
    }
  }

  // Build Layer B (Property / Lot)
  const lotLayout = computeLotLayout(cfg, context.buildingBounds, placementCtx, context.lotOptions);
  const layerB = buildLotLayerMesh(lotLayout, cfg);

  // Plan Layer C (Environmental Objects from City Object Suite)
  const objectSpecs = [];
  if (typeof fam.planObjects === 'function') {
    const famSpecs = fam.planObjects(context, lotLayout) || [];
    objectSpecs.push(...famSpecs);
  }

  // Shared contextual objects driven by common checkboxes
  if (cfg.includeRooftopHvac) {
    objectSpecs.push({
      familyId: 'rooftop_hvac',
      presetId: 'commercial_rooftop_hvac_rtu',
      groupKey: 'rooftop_mep',
      anchorId: 'roof_main',
      placementLayer: 'roof',
      localOffset: [-context.buildingBounds.width * 0.2, 0, -context.buildingBounds.depth * 0.12]
    });
  }
  if (cfg.includeRoofAccess) {
    objectSpecs.push({
      familyId: 'rooftop_hvac',
      presetId: 'rooftop_access_stair_headhouse',
      groupKey: 'rooftop_mep',
      anchorId: 'roof_main',
      placementLayer: 'roof',
      localOffset: [context.buildingBounds.width * 0.24, 0, -context.buildingBounds.depth * 0.16]
    });
  }
  if (cfg.includeDumpsters && lotLayout.enabled && lotLayout.serviceYard) {
    objectSpecs.push({
      familyId: 'commercial_dumpster',
      presetId: cfg.condition === 'abandoned' || cfg.condition === 'neglected' ? 'rusted_alley_dumpster' : 'standard_green_dumpster',
      groupKey: 'waste_utility',
      anchorId: 'service_yard_dumpster',
      localOffset: [0, 0, 0]
    });
  }
  if (cfg.includeUtilityPipes) {
    objectSpecs.push({
      familyId: 'exposed_pipes',
      presetId: 'building_wall_pipe_cluster',
      groupKey: 'waste_utility',
      anchorId: 'wall_rear_utility',
      placementLayer: 'wall',
      localOffset: [0, 0, 0]
    });
    objectSpecs.push({
      familyId: 'utility_cabinet',
      presetId: 'street_telecom_cabinet',
      groupKey: 'waste_utility',
      anchorId: 'wall_rear_utility',
      localOffset: [1.65, 0, 0.45],
      minDensity: 0.45
    });
  }
  if (cfg.includeSecurityCameras) {
    objectSpecs.push({
      familyId: 'residential_entry',
      presetId: 'ptz_security_camera_mount',
      groupKey: 'signage_lighting',
      placementLayer: 'wall',
      position: [context.buildingBounds.width * 0.44, Math.min(3.3, cfg.floorHeight * 0.9), context.buildingBounds.depth * 0.5 + 0.05],
      rotationY: 0,
      allowElevated: true
    });
  }
  if (cfg.includeBenches && lotLayout.enabled && lotLayout.sidewalks.length > 0) {
    objectSpecs.push({
      familyId: 'street_bench',
      presetId: cfg.architecturalEra === 'early_20th' || cfg.architecturalEra === '1940s_1950s' ? 'classic_park_wood_bench' : 'downtown_metal_slat_bench',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_left',
      localOffset: [0, 0, 0],
      minDensity: 0.35
    });
  }
  if (cfg.includeOutdoorVending && lotLayout.enabled) {
    objectSpecs.push({
      familyId: 'soda_vending_machines',
      presetId: 'classic_can_soda_vending',
      groupKey: 'site_amenities',
      anchorId: 'storefront_right',
      localOffset: [0, 0, 0],
      minDensity: 0.45
    });
  }
  if (cfg.exteriorLighting && lotLayout.enabled && lotLayout.sidewalks.length > 0) {
    objectSpecs.push({
      familyId: 'streetlight',
      presetId: cfg.architecturalEra === 'early_20th' ? 'heritage_acorn_streetlamp' : 'modern_highway_cobrahead',
      groupKey: 'signage_lighting',
      anchorId: 'sidewalk_front_right',
      localOffset: [1.2, 0, 0],
      rotationY: Math.PI
    });
  }

  const layerCResult = buildLayerCObjects(objectSpecs, placementCtx, cfg, options);

  // Respect layer visibility toggles
  layerA.visible = cfg.includeBuildingLayer !== false;
  layerB.visible = cfg.includeLot !== false && lotLayout.enabled;
  layerCResult.group.visible = cfg.includeObjectsLayer !== false;

  if (cfg.includeBuildingLayer !== false) root.add(layerA);
  if (cfg.includeLot !== false && lotLayout.enabled) root.add(layerB);
  if (cfg.includeObjectsLayer !== false) root.add(layerCResult.group);

  const blueprint = generateSpecialtyBlueprint(cfg, {
    name: options.name,
    root,
    layerA,
    layerB,
    layerC: layerCResult.group,
    entrances: context.entrances,
    attachedStructures: context.attachedStructures,
    interiorDisplayZones: context.interiorDisplayZones,
    lotLayout,
    placementCtx,
    placedObjects: layerCResult.placedRecords,
    missingDependencies: layerCResult.missingDependencies,
    availableObjectGroups: layerCResult.availableGroups
  });

  root.userData = {
    familyId: cfg.familyId,
    presetId: cfg.presetId,
    seed: cfg.seed,
    settings: copy(cfg),
    blueprint,
    placementCtx,
    entrances: blueprint.entrances,
    availableObjectGroups: layerCResult.availableGroups
  };

  return root;
}
