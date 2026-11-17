import { clamp, roundNum } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerEntranceClearance,
  registerLaneClearance
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addRollUpGarageDoor,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function buildWarehouseDistributionStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const fh = Math.max(cfg.floorHeight || 5.2, 4.2);

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, 3, 2);
  const trimMat = solidMaterial(cfg.trimColor || '#38414a');

  // Main warehouse volume + elevated concrete dock foundation apron along front
  const dockH = 0.85;
  addBox(mainBuildingGroup, 0, dockH * 0.5, 0.9, w + 0.4, dockH, d + 2.2, solidMaterial('#7c848c'));
  addBox(mainBuildingGroup, 0, dockH + fh * 0.5, 0, w, fh, d, wallMat);
  addBox(mainBuildingGroup, 0, dockH + fh + 0.16, 0, w + 0.25, 0.32, d + 0.25, trimMat);

  // Sawtooth skylight ridges
  const ridges = 3;
  for (let i = 0; i < ridges; i++) {
    const rz = -d * 0.3 + (i / (ridges - 1)) * (d * 0.6);
    addBox(attachedGroup, 0, dockH + fh + 0.55, rz, w * 0.84, 0.55, 1.35, solidMaterial('#6c8496'));
  }

  // Elevated Loading Dock Doors with Rubber Dock Shelters
  const dockCount = clamp(cfg.dockCount || 3, 1, 4);
  const dockSpan = w * 0.72;
  const shelterMat = solidMaterial('#1f252b');
  for (let i = 0; i < dockCount; i++) {
    const dx = -w * 0.08 - dockSpan * 0.5 + (i + 0.5) * (dockSpan / dockCount);
    addRollUpGarageDoor(attachedGroup, dx, dockH, d * 0.5, 2.8, 3.0, cfg, { openRatio: i === 0 ? 0.5 : 0.05 });
    // Dock shelter pads + yellow rubber bumpers
    addBox(attachedGroup, dx - 1.52, dockH + 1.55, d * 0.5 + 0.16, 0.22, 3.1, 0.32, shelterMat);
    addBox(attachedGroup, dx + 1.52, dockH + 1.55, d * 0.5 + 0.16, 0.22, 3.1, 0.32, shelterMat);
    addBox(attachedGroup, dx, dockH + 3.1, d * 0.5 + 0.16, 3.25, 0.24, 0.36, shelterMat);

    const dEnt = {
      id: `loading_dock_${i}`,
      role: 'loading_dock',
      label: `Loading Dock Bay ${i + 1}`,
      position: { x: roundNum(dx, 3), y: dockH, z: roundNum(d * 0.5 + 1.1, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: 3.2,
      height: 3.0
    };
    ctx.entrances.push(dEnt);
    registerEntranceClearance(placementCtx, dEnt);
  }

  // Side Shipping Office Pod + Stair Access
  addBox(attachedGroup, w * 0.5 + 1.6, 1.8, d * 0.22, 3.2, 3.6, 4.4, surfaceMaterial('concrete', cfg.secondaryColor || '#bfc6cd', cfg.condition, cfg.seed + 19, 1, 1));
  addSignboardUnit(attachedGroup, 0, dockH + fh - 0.35, d * 0.5 + 0.14, 5.2, 0.72, cfg.signText || 'Metro Logistics Hub', cfg.trimColor || '#263038', '#ffffff', cfg);

  registerBuildingFootprint(placementCtx, {
    id: 'warehouse_main_block',
    minX: -w * 0.5 - 0.2,
    maxX: w * 0.5 + 3.2,
    minZ: -d * 0.5 - 0.2,
    maxZ: d * 0.5 + 2.0,
    maxY: dockH + fh + 0.6
  });
  registerAnchor(placementCtx, { id: 'entrance_main', category: 'entrance', position: [w * 0.5 + 1.6, 0, d * 0.22 + 2.4], surfaceY: 0, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'dock_yard_pallet', category: 'service_yard', position: [w * 0.38, dockH, d * 0.5 + 0.95], surfaceY: dockH, rotationY: 0 });

  ctx.roofTopY = dockH + fh + 0.32;
  ctx.buildingBounds = { width: w + 3.6, depth: d + 2.4, height: dockH + fh + 0.9 };
  ctx.lotOptions = { rearMargin: 5.5, industrialFence: true };
}

function planWarehouseObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'industrial_cargo', presetId: 'stacked_wooden_pallets', groupKey: 'service_equipment', anchorId: 'dock_yard_pallet', localOffset: [0, 0, 0] },
    { familyId: 'industrial_cargo', presetId: 'warehouse_counterbalance_forklift', groupKey: 'service_equipment', anchorId: 'entrance_main', localOffset: [0.2, 0, 1.8] },
    { familyId: 'industrial_cargo', presetId: 'heavy_shipping_crate', groupKey: 'service_equipment', anchorId: 'entrance_main', localOffset: [-1.4, 0, -3.5] }
  ];
  if (cfg.includeDumpsters) {
    specs.push({ familyId: 'commercial_dumpster', presetId: 'roll_off_construction_dumpster', groupKey: 'waste_utility', anchorId: 'service_yard_dumpster', localOffset: [0, 0, 0] });
  }
  if (cfg.includeUtilityPipes) {
    specs.push({ familyId: 'utility_cabinet', presetId: 'green_pad_transformer', groupKey: 'waste_utility', position: [-cfg.width * 0.5 - 1.2, 0.02, -cfg.depth * 0.3], rotationY: 0 });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'warehouse_distribution',
  categoryId: 'industrial_infrastructure',
  categories: ['industrial_infrastructure', 'commercial_services'],
  label: 'Warehouses & Distribution Hubs',
  description: 'Urban freight warehouses, multi-bay distribution hubs, and brick loading facilities.',
  environmentTags: ['industrial', 'urban', 'suburban'],
  supportedLotTypes: ['industrial_service', 'multi_building_facility', 'none'],
  defaultObjectGroups: ['service_equipment', 'waste_utility'],
  featureSchema: [
    { key: 'dockCount', label: 'Loading Dock Bays', type: 'range', min: 1, max: 4, step: 1 }
  ],
  defaults: {
    width: 17.5, depth: 11.4, floors: 1, floorHeight: 5.4, roofStyle: 'sawtooth', exteriorMaterial: 'corrugated_metal', primaryColor: '#697480', secondaryColor: '#cfd6dc', accentColor: '#e07a24', signText: 'Apex Logistics Hub', dockCount: 3, lotType: 'industrial_service', frontSetback: 9.0
  },
  presets: [
    { id: 'small_urban_warehouse', label: 'Small Urban Brick Warehouse', environmentTags: ['urban', 'industrial'], params: { width: 13.0, depth: 9.2, floorHeight: 4.6, exteriorMaterial: 'brick', primaryColor: '#7d3d34', dockCount: 2, signText: 'Harbor Storage Co.' } },
    { id: 'regional_distribution_hub', label: 'Regional Distribution Hub', environmentTags: ['industrial'], params: { width: 20.0, depth: 12.6, floorHeight: 5.8, dockCount: 4, primaryColor: '#5c6873', accentColor: '#0077b6', signText: 'Continental Freight' } },
    { id: 'freight_loading_warehouse', label: 'Cross-Dock Freight Warehouse', environmentTags: ['industrial'], params: { width: 17.6, depth: 10.8, floorHeight: 5.2, dockCount: 3, primaryColor: '#7a838c', signText: 'Portside Cargo Terminal' } },
    { id: 'abandoned_brick_warehouse', label: 'Abandoned Industrial Warehouse', environmentTags: ['industrial', 'retro'], params: { width: 15.2, depth: 10.4, exteriorMaterial: 'brick', primaryColor: '#63423b', condition: 'abandoned', dockCount: 2, windowStyle: 'industrial', signText: 'Old Foundry Storage' } }
  ],
  buildStructure: buildWarehouseDistributionStructure,
  planObjects: planWarehouseObjects
});

function buildWaterTreatmentStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width, 8.0, 14.0);
  const d = clamp(cfg.depth, 6.0, 10.0);
  const fh = 4.2;

  // Pump & Control Operations House slightly left of center
  const ctrlX = -4.2;
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    x: ctrlX,
    z: -1.6,
    floors: 1,
    floorHeight: fh,
    entranceAwning: false,
    signY: fh - 0.34
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Circular Clarifier Basins on Right Side with rotating skimmer bridges
  const tankMat = surfaceMaterial('concrete', '#8d969e', cfg.condition, cfg.seed + 19, 3, 1);
  const waterMat = surfaceMaterial('concrete', '#2e7d9b', 'clean', cfg.seed + 41, 2, 2);
  const steelMat = solidMaterial('#45515e');
  const pipeMat = solidMaterial(cfg.accentColor || '#2c7bb6');

  const basinCount = clamp(cfg.clarifierCount || 2, 1, 2);
  const basinRadius = 3.2;
  let rightMax = ctrlX + w * 0.5;

  for (let b = 0; b < basinCount; b++) {
    const bx = ctrlX + w * 0.5 + 4.4;
    const bz = basinCount === 1 ? -1.0 : (-3.4 + b * 7.0);
    addCylinder(attachedGroup, bx, 0.72, bz, basinRadius, basinRadius + 0.12, 1.44, tankMat, 14);
    addCylinder(attachedGroup, bx, 1.24, bz, basinRadius - 0.24, basinRadius - 0.24, 0.2, waterMat, 14, { cast: false });
    // Center pier + rotating catwalk bridge truss across basin
    addCylinder(attachedGroup, bx, 0.95, bz, 0.42, 0.48, 1.85, tankMat, 8);
    addBox(attachedGroup, bx, 1.68, bz, basinRadius * 1.98, 0.16, 0.74, steelMat);
    addBox(attachedGroup, bx, 2.08, bz + 0.34, basinRadius * 1.98, 0.62, 0.05, steelMat);
    addBox(attachedGroup, bx, 2.08, bz - 0.34, basinRadius * 1.98, 0.62, 0.05, steelMat);

    // Overhead Transfer Pipe connecting Control Building to Clarifier Basin
    addCylinder(attachedGroup, (ctrlX + w * 0.5 + bx) * 0.5, 2.35, bz, 0.18, 0.18, Math.abs(bx - (ctrlX + w * 0.5)) + 0.6, pipeMat, 8, { rotZ: Math.PI / 2 });

    registerBuildingFootprint(placementCtx, {
      id: `clarifier_basin_${b}`,
      minX: bx - basinRadius,
      maxX: bx + basinRadius,
      minZ: bz - basinRadius,
      maxZ: bz + basinRadius,
      maxY: 2.4
    });
    rightMax = Math.max(rightMax, bx + basinRadius);
  }

  // Chemical Silo Tank beside Pump House
  const siloX = ctrlX - w * 0.5 - 2.0;
  addCylinder(attachedGroup, siloX, 2.2, -1.6, 1.25, 1.25, 4.4, solidMaterial('#cbd4dc'), 12);
  addCylinder(attachedGroup, siloX, 4.55, -1.6, 0.25, 1.28, 0.45, pipeMat, 12);
  registerBuildingFootprint(placementCtx, {
    id: 'chemical_silo_tank',
    minX: siloX - 1.3,
    maxX: siloX + 1.3,
    minZ: -2.9,
    maxZ: -0.3,
    maxY: 4.8
  });

  ctx.buildingBounds = {
    width: Math.max(w + 6, rightMax - (siloX - 1.5)),
    depth: Math.max(d + 2, 14.2),
    height: 5.0
  };
  ctx.lotOptions = { rearMargin: 4.5, industrialFence: true };
}

function planWaterTreatmentObjects(ctx) {
  const { cfg } = ctx;
  return [
    { familyId: 'utility_cabinet', presetId: 'green_pad_transformer', groupKey: 'waste_utility', anchorId: 'entrance_main', localOffset: [2.8, 0, -0.4] },
    { familyId: 'exposed_pipes', presetId: 'industrial_steam_manifold', groupKey: 'service_equipment', position: [-cfg.width * 0.35, 0.02, 2.6], rotationY: 0 },
    { familyId: 'commercial_dumpster', presetId: 'industrial_blue_dumpster', groupKey: 'waste_utility', anchorId: 'service_yard_dumpster', localOffset: [0, 0, 0] }
  ];
}

registerSpecialtyFamily({
  id: 'water_treatment_plant',
  categoryId: 'municipal_community',
  categories: ['municipal_community', 'industrial_infrastructure'],
  label: 'Water Treatment & Pumping Facilities',
  description: 'Multi-building water treatment compounds with pump houses, circular clarifier basins, pipe manifolds, and silos.',
  environmentTags: ['industrial', 'civic'],
  supportedLotTypes: ['multi_building_facility', 'industrial_service', 'none'],
  defaultObjectGroups: ['waste_utility', 'service_equipment'],
  featureSchema: [
    { key: 'clarifierCount', label: 'Clarifier Basins', type: 'range', min: 1, max: 2, step: 1 }
  ],
  defaults: {
    width: 9.6, depth: 7.4, floors: 1, floorHeight: 4.2, exteriorMaterial: 'concrete', primaryColor: '#8d969f', accentColor: '#2c7bb6', signText: 'Municipal Water Treatment', clarifierCount: 2, lotType: 'multi_building_facility', frontSetback: 7.5
  },
  presets: [
    { id: 'municipal_clarifier_plant', label: 'Municipal Clarifier & Filter Plant', environmentTags: ['civic', 'industrial'], params: { width: 9.8, depth: 7.4, clarifierCount: 2, signText: 'City Water Works' } },
    { id: 'industrial_pump_station', label: 'Industrial Booster Pump Station', environmentTags: ['industrial'], params: { width: 8.6, depth: 6.6, clarifierCount: 1, primaryColor: '#6f7882', accentColor: '#e85d04', signText: 'Sector 4 Pump Station' } },
    { id: 'regional_filtration_facility', label: 'Regional Treatment Complex', environmentTags: ['civic', 'industrial'], params: { width: 11.2, depth: 8.0, clarifierCount: 2, signText: 'Metro Water Reclamation' } }
  ],
  buildStructure: buildWaterTreatmentStructure,
  planObjects: planWaterTreatmentObjects
});

function buildRepairShopStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const fh = cfg.floorHeight || 3.4;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, { width: w, depth: d, floors: 1, floorHeight: fh, forceStorefront: true, entranceAwning: true, signY: fh - 0.34 });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  addSignboardUnit(attachedGroup, -w * 0.5 - 0.5, 2.7, d * 0.3, 0.9, 1.1, 'REPAIR', cfg.accentColor, '#ffffff', cfg, { rotY: Math.PI / 2 });
  ctx.buildingBounds = { width: w + 0.6, depth: d, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 3.2 };
}

function planRepairShopObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'bike_rack', presetId: 'stainless_u_loop_rack', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.9, 0, 0.4] }
  ];
  if (cfg.includeServiceBench !== false) {
    specs.push({ familyId: 'auto_garage_equipment', presetId: 'rolling_mechanic_tool_cabinet', groupKey: 'service_equipment', anchorId: 'entrance_main', localOffset: [2.1, 0, 0.25] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'repair_shop',
  categoryId: 'commercial_services',
  categories: ['commercial_services', 'retail_shopping'],
  label: 'General Repair & Fix-It Shops',
  description: 'Electronics repair shops, bicycle workshops, and small appliance service storefronts.',
  environmentTags: ['urban', 'suburban'],
  supportedLotTypes: ['compact_urban', 'small_suburban', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['site_amenities', 'service_equipment', 'waste_utility'],
  featureSchema: [
    { key: 'includeServiceBench', label: 'Sidewalk Tool & Workshop Display', type: 'boolean' }
  ],
  defaults: {
    width: 8.6, depth: 6.6, floors: 1, floorHeight: 3.4, exteriorMaterial: 'brick', primaryColor: '#8d5342', accentColor: '#2563eb', signText: 'Apex Repair & Electronics', includeServiceBench: true, lotType: 'compact_urban'
  },
  presets: [
    { id: 'electronics_repair_shop', label: 'Electronics & Computer Repair', environmentTags: ['urban'], params: { width: 8.6, depth: 6.6, primaryColor: '#566473', accentColor: '#00a8e8', signText: 'Circuit Fix Electronics' } },
    { id: 'bicycle_repair_workshop', label: 'Bicycle Repair & Tune-Up Shop', environmentTags: ['urban', 'suburban'], params: { width: 9.0, depth: 6.8, exteriorMaterial: 'painted_stucco', primaryColor: '#dcd2c0', accentColor: '#2a9d8f', signText: 'Spoke & Sprocket Cyclery' } },
    { id: 'appliance_watch_service', label: 'Appliance & Watch Repair Shop', environmentTags: ['urban', 'retro'], params: { width: 7.8, depth: 6.0, primaryColor: '#8c4b3c', accentColor: '#c98832', signText: 'Tick-Tock & Appliance Fix' } }
  ],
  buildStructure: buildRepairShopStructure,
  planObjects: planRepairShopObjects
});
