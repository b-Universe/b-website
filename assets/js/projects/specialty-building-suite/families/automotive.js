import { clamp, roundNum } from '../../utils.js';
import { registerSpecialtyFamily } from '../../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerEntranceClearance,
  registerLaneClearance
} from '../../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial } from '../../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addRollUpGarageDoor,
  addSignboardUnit,
  addWindowAdDecals
} from '../../geometry/arch-primitives.js';

function buildGasStationStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors: 1,
    floorHeight: cfg.floorHeight,
    forceStorefront: true,
    transparentGlass: Boolean(cfg.interiorDisplay)
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Storefront window advertisement decals (drink, snack, ice, coffee, lottery, open 24h)
  const adDensity = cfg.windowAdDensity !== undefined ? cfg.windowAdDensity : 0.72;
  if (cfg.includeWindowAds && adDensity > 0.02) {
    const leftSpan = Math.max(1.2, w * 0.34);
    const rightSpan = Math.max(1.2, w * 0.34);
    addWindowAdDecals(mainBuildingGroup, -w * 0.28, 1.45, d * 0.5 + 0.08, leftSpan, 1.4, cfg, adDensity, cfg.seed + 11);
    addWindowAdDecals(mainBuildingGroup, w * 0.28, 1.45, d * 0.5 + 0.08, rightSpan, 1.4, cfg, adDensity, cfg.seed + 29);
  }

  // Optional Attached Repair Garage Wing on Right Side
  let rightWingEnd = w * 0.5;
  if (cfg.includeGarageBay) {
    const gw = 5.4;
    const gd = Math.min(d + 1.2, 8.8);
    const gh = Math.max(cfg.floorHeight, 4.1);
    const gx = w * 0.5 + gw * 0.5;
    const gz = -0.2;
    const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 31, 2, 1);
    addBox(attachedGroup, gx, gh * 0.5, gz, gw, gh, gd, wallMat);
    addBox(attachedGroup, gx, gh + 0.14, gz, gw + 0.2, 0.28, gd + 0.2, solidMaterial(cfg.trimColor));
    addRollUpGarageDoor(attachedGroup, gx, 0, gz + gd * 0.5, 3.2, 2.8, cfg, { openRatio: 0.45 });
    const gEnt = {
      id: 'gas_garage_bay',
      role: 'garage',
      label: 'Service Garage Bay',
      position: { x: roundNum(gx, 3), y: 0, z: roundNum(gz + gd * 0.5, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: 3.4,
      height: 2.8
    };
    ctx.entrances.push(gEnt);
    registerEntranceClearance(placementCtx, gEnt);
    registerBuildingFootprint(placementCtx, {
      id: 'attached_garage',
      minX: gx - gw * 0.5,
      maxX: gx + gw * 0.5,
      minZ: gz - gd * 0.5,
      maxZ: gz + gd * 0.5,
      maxY: gh
    });
    ctx.attachedStructures.push({ id: 'attached_garage', type: 'repair_bay', width: gw, depth: gd });
    rightWingEnd = gx + gw * 0.5;
  }

  // Optional Drive-Thru Car Wash Tunnel on Left Side
  if (cfg.includeCarWash) {
    const cw = 4.8;
    const cd = 9.5;
    const ch = 3.9;
    const cx = -w * 0.5 - cw * 0.5 - 0.3;
    const cz = 0;
    const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 53, 2, 1);
    addBox(attachedGroup, cx, ch * 0.5, cz, cw, ch, cd, wallMat);
    addBox(attachedGroup, cx, ch + 0.15, cz, cw + 0.2, 0.3, cd + 0.2, solidMaterial(cfg.accentColor));
    addRollUpGarageDoor(attachedGroup, cx, 0, cz + cd * 0.5, 3.1, 2.85, cfg, { openRatio: 0.78 });
    addRollUpGarageDoor(attachedGroup, cx, 0, cz - cd * 0.5, 3.1, 2.85, cfg, { rotY: Math.PI, openRatio: 0.78 });
    addSignboardUnit(attachedGroup, cx, ch - 0.35, cz + cd * 0.5 + 0.12, 3.4, 0.68, 'CAR WASH', cfg.secondaryColor, '#ffffff', cfg);
    registerBuildingFootprint(placementCtx, {
      id: 'car_wash_tunnel',
      minX: cx - cw * 0.5,
      maxX: cx + cw * 0.5,
      minZ: cz - cd * 0.5,
      maxZ: cz + cd * 0.5,
      maxY: ch
    });
    registerLaneClearance(placementCtx, {
      id: 'car_wash_lane',
      kind: 'drive_thru',
      minX: cx - 2.0,
      maxX: cx + 2.0,
      minZ: cz - cd * 0.5 - 3.5,
      maxZ: cz + cd * 0.5 + 4.5
    });
    ctx.attachedStructures.push({ id: 'car_wash_tunnel', type: 'car_wash', width: cw, depth: cd });
  }

  // Fuel Pump Canopy + Columns + Concrete Islands
  const rowCount = clamp(cfg.pumpRowCount || 1, 1, 3);
  const pumpsPerRow = clamp(cfg.pumpCount || 2, 1, 4);
  const canopyW = clamp(cfg.canopyWidth || Math.max(8.5, pumpsPerRow * 3.6 + 2.2), 5.5, 24);
  const canopyD = clamp(cfg.canopyDepth || (rowCount * 3.8 + 1.8), 4.0, 14);
  const canopyH = clamp(cfg.canopyHeight || 4.6, 3.6, 6.8);
  const canopyZ = d * 0.5 + 3.2 + canopyD * 0.5;
  const canopyX = 0;

  const fasciaMat = solidMaterial(cfg.accentColor || '#d93c2b');
  const deckMat = solidMaterial('#eef2f6');
  const colMat = solidMaterial(cfg.secondaryColor || '#2c4a6e');
  const lightMat = emissiveMaterial('#fff2c4', 0.9, cfg.lightingTime);

  // Canopy roof & fascia band
  addBox(attachedGroup, canopyX, canopyH + 0.28, canopyZ, canopyW, 0.56, canopyD, deckMat);
  addBox(attachedGroup, canopyX, canopyH + 0.28, canopyZ + canopyD * 0.5 + 0.04, canopyW + 0.08, 0.42, 0.08, fasciaMat);
  addBox(attachedGroup, canopyX, canopyH + 0.28, canopyZ - canopyD * 0.5 - 0.04, canopyW + 0.08, 0.42, 0.08, fasciaMat);
  addBox(attachedGroup, canopyX - canopyW * 0.5 - 0.04, canopyH + 0.28, canopyZ, 0.08, 0.42, canopyD + 0.08, fasciaMat);
  addBox(attachedGroup, canopyX + canopyW * 0.5 + 0.04, canopyH + 0.28, canopyZ, 0.08, 0.42, canopyD + 0.08, fasciaMat);

  if (cfg.includeIlluminatedSigns !== false) {
    addSignboardUnit(attachedGroup, canopyX, canopyH + 0.28, canopyZ + canopyD * 0.5 + 0.14, Math.min(canopyW * 0.52, 5.4), 0.46, cfg.signText || 'STARFUEL', cfg.secondaryColor, '#ffffff', cfg);
  }

  // Structural canopy columns + recessed LED panels + pump islands
  ctx._pumpAnchors = [];
  for (let rIdx = 0; rIdx < rowCount; rIdx++) {
    const rz = rowCount === 1
      ? canopyZ
      : canopyZ - canopyD * 0.28 + (rIdx / (rowCount - 1)) * (canopyD * 0.56);

    // Reserve drive lane clearance beside each pump row
    registerLaneClearance(placementCtx, {
      id: `fuel_lane_${rIdx}_front`,
      kind: 'fuel_lane',
      minX: canopyX - canopyW * 0.55,
      maxX: canopyX + canopyW * 0.55,
      minZ: rz + 0.85,
      maxZ: rz + 2.4
    });

    // Support columns at ends of each row
    for (const sx of [-1, 1]) {
      const colX = canopyX + sx * (canopyW * 0.36);
      addBox(attachedGroup, colX, canopyH * 0.5, rz, 0.38, canopyH, 0.38, colMat);
      addBox(attachedGroup, colX, 0.48, rz, 0.54, 0.96, 0.54, solidMaterial('#e0a422'));
    }

    // Concrete pump island slab
    const islandW = Math.max(2.6, pumpsPerRow * 3.1);
    addBox(attachedGroup, canopyX, 0.08, rz, islandW, 0.16, 1.15, solidMaterial('#9da4ab'));

    // Canopy downlights above each pump
    for (let p = 0; p < pumpsPerRow; p++) {
      const px = pumpsPerRow === 1
        ? canopyX
        : canopyX - islandW * 0.34 + (p / (pumpsPerRow - 1)) * (islandW * 0.68);
      addBox(attachedGroup, px, canopyH - 0.02, rz, 0.72, 0.05, 0.52, lightMat, { cast: false });
      const anchorId = `fuel_island_${rIdx}_${p}`;
      registerAnchor(placementCtx, {
        id: anchorId,
        category: 'fuel_island',
        position: [px, 0.16, rz],
        surfaceY: 0.16,
        rotationY: 0
      });
      ctx._pumpAnchors.push({ anchorId, px, rz, rIdx, p });
    }
  }

  ctx.attachedStructures.push({
    id: 'fuel_canopy',
    type: 'canopy',
    width: canopyW,
    depth: canopyD,
    height: canopyH,
    rows: rowCount,
    pumpsPerRow
  });

  // Main building footprint
  registerBuildingFootprint(placementCtx, {
    id: 'main_store',
    minX: -w * 0.5,
    maxX: w * 0.5,
    minZ: -d * 0.5,
    maxZ: d * 0.5,
    maxY: cfg.floorHeight
  });

  ctx.buildingBounds = {
    width: Math.max(w, canopyW, rightWingEnd + w * 0.5),
    depth: d,
    height: Math.max(cfg.floorHeight + 0.5, canopyH + 0.6)
  };
  ctx.lotOptions = { rearMargin: 4.5 };
}

function planGasStationObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [];
  const pumpPreset = cfg.architecturalEra === '1960s_1970s'
    ? 'retro_1970s_fuel_pump'
    : cfg.architecturalEra === 'retro_futuristic' || cfg.architecturalEra === 'futuristic'
      ? 'futuristic_energy_dispenser'
      : cfg.includeDieselPumps
        ? 'diesel_truck_pump'
        : 'modern_fuel_dispenser';

  for (const pa of (ctx._pumpAnchors || [])) {
    specs.push({
      familyId: 'fuel_station_pump',
      presetId: pumpPreset,
      groupKey: 'fueling',
      anchorId: pa.anchorId,
      localOffset: [0, 0, 0],
      allowInLane: true,
      overrides: { signText: cfg.signText.split(' ')[0] || 'STARFUEL' }
    });
    // Trash bin & windshield caddy beside outer pumps
    if (pa.p === 0) {
      specs.push({
        familyId: 'gas_station_amenities',
        presetId: 'windshield_squeegee_trash_caddy',
        groupKey: 'fueling',
        anchorId: pa.anchorId,
        localOffset: [-1.1, 0, 0],
        allowInLane: true,
        minDensity: 0.35
      });
    }
    // Protective bollards at island ends
    if (pa.p === 0 || pa.p === (cfg.pumpCount - 1)) {
      specs.push({
        familyId: 'bollard_railing',
        presetId: 'heritage_cast_bollard',
        groupKey: 'fueling',
        anchorId: pa.anchorId,
        localOffset: [pa.p === 0 ? -1.45 : 1.45, 0, 0.36],
        allowInLane: true,
        minDensity: 0.4
      });
    }
  }

  // Storefront propane cage & ice freezer
  if (cfg.includePropaneCage) {
    specs.push({
      familyId: 'gas_station_amenities',
      presetId: 'propane_cylinder_exchange_cage',
      groupKey: 'site_amenities',
      anchorId: 'storefront_left',
      localOffset: [-0.9, 0, 0]
    });
  }
  if (cfg.includeIceFreezer) {
    specs.push({
      familyId: 'gas_station_amenities',
      presetId: 'bagged_ice_freezer_box',
      groupKey: 'site_amenities',
      anchorId: 'storefront_left',
      localOffset: [0.85, 0, 0]
    });
  }
  if (cfg.includeAirPump && lotLayout.enabled) {
    specs.push({
      familyId: 'gas_station_amenities',
      presetId: 'air_tire_inflation_station',
      groupKey: 'site_amenities',
      position: [lotLayout.bounds.maxX - 2.2, 0.02, -cfg.depth * 0.25],
      rotationY: -Math.PI / 2
    });
  }
  if (cfg.includeVacuumStation && lotLayout.enabled) {
    specs.push({
      familyId: 'gas_station_amenities',
      presetId: 'coin_car_vacuum_station',
      groupKey: 'site_amenities',
      position: [lotLayout.bounds.maxX - 2.2, 0.02, cfg.depth * 0.25],
      rotationY: -Math.PI / 2
    });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({
      familyId: 'gas_station_amenities',
      presetId: 'gas_price_pylon_sign',
      groupKey: 'signage_lighting',
      anchorId: 'roadside_sign_corner',
      localOffset: [0, 0, 0],
      overrides: { signText: cfg.signText.split(' ')[0] || 'STARFUEL' }
    });
  }
  if (lotLayout.enabled) {
    specs.push({
      familyId: 'newspaper_box',
      presetId: 'classic_newspaper_honor_box',
      groupKey: 'site_amenities',
      anchorId: 'storefront_right',
      localOffset: [1.1, 0, 0],
      minDensity: 0.55
    });
  }
  if (cfg.includeGarageBay) {
    specs.push({
      familyId: 'auto_garage_equipment',
      presetId: 'stacked_tire_display_rack',
      groupKey: 'service_equipment',
      position: [cfg.width * 0.5 + 5.8, 0.02, 0.8],
      rotationY: Math.PI / 2
    });
  }

  return specs;
}

function buildAutoRepairGarageStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const bays = clamp(cfg.garageBayCount || 3, 1, 5);
  const bayW = clamp(cfg.bayWidth || 4.0, 3.2, 5.2);
  const bayH = clamp(cfg.bayHeight || 3.4, 2.7, 4.6);
  const shopW = Math.max(cfg.width, bays * bayW + 1.8);
  const shopD = cfg.depth;
  const shopH = Math.max(cfg.floorHeight, bayH + 1.1);

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 19, 3, 1);
  const trimMat = solidMaterial(cfg.trimColor || '#2b323a');
  addBox(mainBuildingGroup, 0, shopH * 0.5, 0, shopW, shopH, shopD, wallMat);
  addBox(mainBuildingGroup, 0, shopH + 0.18, 0, shopW + 0.2, 0.36, shopD + 0.2, trimMat);

  // Garage service bays across front facade
  const openRatio = clamp(cfg.garageDoorOpenRatio ?? 0.4, 0, 0.85);
  for (let i = 0; i < bays; i++) {
    const bx = -((bays - 1) * bayW) * 0.5 + i * bayW;
    addRollUpGarageDoor(mainBuildingGroup, bx, 0, shopD * 0.5, bayW - 0.55, bayH, cfg, { openRatio });
    const bayEnt = {
      id: `garage_bay_${i}`,
      role: 'garage',
      label: `Service Bay ${i + 1}`,
      position: { x: roundNum(bx, 3), y: 0, z: roundNum(shopD * 0.5, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: bayW - 0.5,
      height: bayH
    };
    ctx.entrances.push(bayEnt);
    registerEntranceClearance(placementCtx, bayEnt);
    registerAnchor(placementCtx, {
      id: `bay_front_${i}`,
      category: 'equipment_frontage',
      position: [bx, 0, shopD * 0.5 + 0.2],
      surfaceY: 0,
      rotationY: 0
    });
  }

  // Attached customer reception office on left side
  if (cfg.includeOfficeWing) {
    const ow = clamp(cfg.officeWidth || 5.2, 3.6, 8.5);
    const od = Math.max(4.5, shopD * 0.72);
    const oh = Math.min(shopH, 3.5);
    const ox = -shopW * 0.5 - ow * 0.5;
    const oz = shopD * 0.5 - od * 0.5;
    const officeShell = addStandardBuildingShell(attachedGroup, ctx, {
      x: ox,
      z: oz,
      width: ow,
      depth: od,
      floors: 1,
      floorHeight: oh,
      entranceCount: 1,
      includeSign: false,
      skipRearService: true,
      forceStorefront: true
    });
    ctx.entrances.push(...officeShell.entrances);
    registerBuildingFootprint(placementCtx, {
      id: 'reception_office',
      minX: ox - ow * 0.5,
      maxX: ox + ow * 0.5,
      minZ: oz - od * 0.5,
      maxZ: oz + od * 0.5,
      maxY: oh
    });
    ctx.attachedStructures.push({ id: 'reception_office', type: 'office_wing', width: ow, depth: od });
  }

  // Overhead shop sign
  addSignboardUnit(mainBuildingGroup, 0, shopH - 0.45, shopD * 0.5 + 0.1, Math.min(shopW * 0.72, 9.5), 0.85, cfg.signText || 'METRO AUTO REPAIR', cfg.secondaryColor, '#ffffff', cfg);

  // Exhaust ventilation stacks on roof
  for (let i = 0; i < Math.min(3, bays); i++) {
    const sx = -shopW * 0.3 + i * (shopW * 0.3);
    addCylinder(mainBuildingGroup, sx, shopH + 0.9, -shopD * 0.25, 0.16, 0.18, 1.3, solidMaterial('#78828c'), 8);
  }

  registerBuildingFootprint(placementCtx, {
    id: 'main_garage',
    minX: -shopW * 0.5,
    maxX: shopW * 0.5,
    minZ: -shopD * 0.5,
    maxZ: shopD * 0.5,
    maxY: shopH
  });

  ctx.roofTopY = shopH + 0.36;
  ctx.buildingBounds = { width: shopW, depth: shopD, height: shopH + 0.4 };
  ctx.lotOptions = { fencedServiceYard: true, rearMargin: 5.0 };
}

function planAutoRepairObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [];

  // Hydraulic lift & tool chest visible inside/at open bay or service yard
  specs.push({
    familyId: 'auto_garage_equipment',
    presetId: 'two_post_hydraulic_car_lift',
    groupKey: 'service_equipment',
    position: [0, 0, cfg.depth * 0.5 - 1.6],
    rotationY: 0,
    allowInsideBuilding: true,
    allowInEntrance: true
  });
  specs.push({
    familyId: 'auto_garage_equipment',
    presetId: 'rolling_mechanic_tool_cabinet',
    groupKey: 'service_equipment',
    position: [-cfg.width * 0.42, 0, cfg.depth * 0.5 + 1.15],
    rotationY: 0
  });
  specs.push({
    familyId: 'auto_garage_equipment',
    presetId: 'stacked_tire_display_rack',
    groupKey: 'service_equipment',
    position: [cfg.width * 0.46, 0, cfg.depth * 0.5 + 1.1],
    rotationY: -Math.PI / 4
  });

  if (lotLayout.enabled) {
    specs.push({
      familyId: 'auto_garage_equipment',
      presetId: 'oil_change_drum_cart',
      groupKey: 'service_equipment',
      anchorId: 'service_yard_dumpster',
      localOffset: [2.2, 0, 0]
    });
    specs.push({
      familyId: 'bollard_railing',
      presetId: 'heritage_cast_bollard',
      groupKey: 'site_amenities',
      position: [-cfg.width * 0.48, 0, cfg.depth * 0.5 + 0.55],
      rotationY: 0
    });
    specs.push({
      familyId: 'bollard_railing',
      presetId: 'heritage_cast_bollard',
      groupKey: 'site_amenities',
      position: [cfg.width * 0.48, 0, cfg.depth * 0.5 + 0.55],
      rotationY: 0
    });
  }

  return specs;
}

export function registerAutomotiveFamilies() {
  registerSpecialtyFamily({
    id: 'gas_station',
    categoryId: 'automotive_transport',
    categories: ['automotive_transport', 'retail_shopping'],
    label: 'Gas Stations & Convenience Stores',
    description: 'Fueling stations with pump canopies, island dispensers, window advertisement collages, propane cages, ice freezers, price pylons, and optional repair bays or car washes.',
    environmentTags: ['highway', 'urban', 'suburban', 'retro', 'service'],
    supportedLotTypes: ['roadside_service', 'corner_commercial', 'standalone_commercial', 'compact_urban', 'none'],
    defaultObjectGroups: ['fueling', 'site_amenities', 'waste_utility', 'rooftop_mep', 'signage_lighting'],
    defaults: {
      width: 11.5,
      depth: 7.5,
      floors: 1,
      floorHeight: 3.6,
      lotType: 'roadside_service',
      lotWidth: 26,
      lotDepth: 24,
      frontSetback: 11.5,
      sideSetback: 5.0,
      pumpCount: 2,
      pumpRowCount: 1,
      canopyWidth: 11.0,
      canopyDepth: 5.5,
      canopyHeight: 4.7,
      windowAdDensity: 0.72,
      includeGarageBay: false,
      includeCarWash: false,
      includeDieselPumps: false,
      includePropaneCage: true,
      includeIceFreezer: true,
      includeAirPump: true,
      includeVacuumStation: true,
      includeRoadsideSign: true
    },
    featureSchema: [
      { group: 'Fuel Canopy & Pumps' },
      { key: 'pumpCount', label: 'Pumps Per Row', type: 'range', min: 1, max: 4, step: 1 },
      { key: 'pumpRowCount', label: 'Pump Row Count', type: 'range', min: 1, max: 3, step: 1 },
      { key: 'canopyWidth', label: 'Canopy Width', type: 'range', min: 5.5, max: 24, step: 0.5, unit: 'm' },
      { key: 'canopyDepth', label: 'Canopy Depth', type: 'range', min: 4.0, max: 14, step: 0.5, unit: 'm' },
      { key: 'canopyHeight', label: 'Canopy Roof Height', type: 'range', min: 3.6, max: 6.8, step: 0.1, unit: 'm' },
      { key: 'includeDieselPumps', label: 'Heavy Diesel Dispensers', type: 'boolean' },
      { group: 'Station Attachments & Ads' },
      { key: 'includeGarageBay', label: 'Attached Repair Garage', type: 'boolean' },
      { key: 'includeCarWash', label: 'Attached Car Wash Tunnel', type: 'boolean' },
      { key: 'windowAdDensity', label: 'Window Ad Density', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'includePropaneCage', label: 'Propane Exchange Cage', type: 'boolean' },
      { key: 'includeIceFreezer', label: 'Bagged Ice Freezer', type: 'boolean' },
      { key: 'includeAirPump', label: 'Air & Tire Station', type: 'boolean' },
      { key: 'includeVacuumStation', label: 'Vacuum Station', type: 'boolean' },
      { key: 'includeRoadsideSign', label: 'Roadside Price Pylon', type: 'boolean' }
    ],
    presets: [
      {
        id: 'modern_corporate_gas_station',
        label: 'Modern Corporate Gas Station',
        description: 'Clean contemporary convenience store with illuminated canopy, 2 pump rows, and full amenities.',
        environmentTags: ['urban', 'suburban', 'highway'],
        params: {
          architecturalEra: 'contemporary',
          exteriorMaterial: 'mixed_commercial',
          primaryColor: '#e2e8ef',
          secondaryColor: '#1d4f8c',
          accentColor: '#d93c2b',
          signText: 'STARFUEL MART',
          pumpRowCount: 2,
          pumpCount: 2,
          canopyWidth: 12.5,
          canopyDepth: 8.5,
          windowAdDensity: 0.72
        }
      },
      {
        id: 'small_roadside_gas_station',
        label: 'Small Roadside Gas Station',
        params: {
          width: 8.0,
          depth: 6.0,
          lotWidth: 20,
          lotDepth: 19,
          frontSetback: 9.0,
          pumpRowCount: 1,
          pumpCount: 2,
          canopyWidth: 8.5,
          canopyDepth: 4.8,
          signText: 'ROUTE 9 FUEL',
          primaryColor: '#d9d2c5',
          secondaryColor: '#2d5c48',
          accentColor: '#d98a22',
          windowAdDensity: 0.55
        }
      },
      {
        id: '1970s_neighborhood_gas_station',
        label: '1970s Neighborhood Gas Station',
        environmentTags: ['retro', 'suburban'],
        params: {
          architecturalEra: '1960s_1970s',
          exteriorMaterial: 'tile',
          primaryColor: '#ebe3d1',
          secondaryColor: '#c94c2c',
          accentColor: '#e6a825',
          signText: 'SUNSET SERVICE',
          includeGarageBay: true,
          pumpRowCount: 1,
          pumpCount: 2,
          windowAdDensity: 0.45
        }
      },
      {
        id: '1980s_1990s_convenience_gas_station',
        label: '1980s/1990s Convenience Gas Station',
        environmentTags: ['retro', 'urban'],
        params: {
          architecturalEra: '1980s_1990s',
          exteriorMaterial: 'brick',
          primaryColor: '#9e5440',
          secondaryColor: '#1e4a7a',
          accentColor: '#e03c31',
          signText: 'QUICKSTOP 24',
          pumpRowCount: 1,
          pumpCount: 3,
          canopyWidth: 13.0,
          windowAdDensity: 0.92
        }
      },
      {
        id: 'large_highway_travel_stop',
        label: 'Large Highway Travel Stop',
        environmentTags: ['highway'],
        params: {
          width: 18.0,
          depth: 10.5,
          lotWidth: 38,
          lotDepth: 32,
          frontSetback: 14.5,
          pumpRowCount: 3,
          pumpCount: 4,
          canopyWidth: 19.0,
          canopyDepth: 12.5,
          canopyHeight: 5.4,
          includeDieselPumps: true,
          parkingCount: 14,
          signText: 'INTERSTATE TRAVEL PLAZA'
        }
      },
      {
        id: 'independent_corner_gas_station',
        label: 'Independent Corner Gas Station',
        params: {
          lotType: 'corner_commercial',
          cornerLot: true,
          sidewalkConfig: 'corner_wrap',
          width: 9.5,
          depth: 6.5,
          signText: 'CORNER PUMP',
          primaryColor: '#c9ced4',
          secondaryColor: '#2f6b4f',
          accentColor: '#d99a26'
        }
      },
      {
        id: 'gas_station_with_repair_garage',
        label: 'Gas Station With Repair Garage',
        params: {
          includeGarageBay: true,
          width: 9.5,
          depth: 7.0,
          lotWidth: 28,
          signText: 'APEX GAS & AUTO',
          primaryColor: '#d9d5cc',
          secondaryColor: '#364d63',
          accentColor: '#c43e2b'
        }
      },
      {
        id: 'gas_station_with_car_wash',
        label: 'Gas Station With Car Wash',
        params: {
          includeCarWash: true,
          lotWidth: 30,
          sideSetback: 7.5,
          signText: 'BUBBLE JET FUEL',
          primaryColor: '#e2ebf2',
          secondaryColor: '#1b73b8',
          accentColor: '#24b898'
        }
      },
      {
        id: 'urban_compact_gas_station',
        label: 'Urban Compact Gas Station',
        environmentTags: ['urban', 'downtown'],
        params: {
          lotType: 'compact_urban',
          width: 7.5,
          depth: 5.5,
          lotWidth: 16,
          lotDepth: 16,
          frontSetback: 7.5,
          pumpRowCount: 1,
          pumpCount: 2,
          canopyWidth: 8.0,
          canopyDepth: 4.5,
          parkingCount: 2,
          signText: 'METRO MINI FUEL'
        }
      },
      {
        id: 'truck_oriented_fueling_station',
        label: 'Truck-Oriented Fueling Station',
        environmentTags: ['highway', 'industrial'],
        params: {
          includeDieselPumps: true,
          canopyHeight: 6.0,
          canopyWidth: 16.0,
          canopyDepth: 9.5,
          pumpRowCount: 2,
          pumpCount: 3,
          exteriorMaterial: 'metal_siding',
          primaryColor: '#5c6670',
          secondaryColor: '#2b343d',
          accentColor: '#d98c24',
          signText: 'BIG RIG DIESEL'
        }
      },
      {
        id: 'small_rural_filling_station',
        label: 'Small Rural Filling Station',
        params: {
          width: 7.0,
          depth: 5.5,
          roofStyle: 'pitched',
          roofPitchHeight: 1.8,
          exteriorMaterial: 'painted_wood',
          primaryColor: '#c9b38c',
          secondaryColor: '#7a3b2e',
          accentColor: '#b8422b',
          pumpRowCount: 1,
          pumpCount: 1,
          canopyWidth: 6.0,
          canopyDepth: 4.2,
          includeVacuumStation: false,
          signText: 'VALLEY FILLING POST'
        }
      },
      {
        id: 'abandoned_gas_station',
        label: 'Abandoned Gas Station',
        params: {
          condition: 'abandoned',
          architecturalEra: '1960s_1970s',
          exteriorMaterial: 'concrete',
          primaryColor: '#8c897e',
          secondaryColor: '#5c4b42',
          accentColor: '#7a4438',
          includeIlluminatedSigns: false,
          exteriorLighting: false,
          windowAdDensity: 0.25,
          signText: 'CLOSED FUEL'
        }
      },
      {
        id: 'retro_futuristic_fueling_station',
        label: 'Retro-Futuristic Fueling Station',
        environmentTags: ['superhero_city', 'retro'],
        params: {
          architecturalEra: 'retro_futuristic',
          exteriorMaterial: 'tile',
          primaryColor: '#dfe9f2',
          secondaryColor: '#136b80',
          accentColor: '#22d3ee',
          canopyHeight: 5.1,
          signageStyle: 'neon_marquee',
          signText: 'ATOMIX ENERGY'
        }
      }
    ],
    buildStructure: buildGasStationStructure,
    planObjects: planGasStationObjects
  });

  registerSpecialtyFamily({
    id: 'auto_repair_garage',
    categoryId: 'automotive_transport',
    categories: ['automotive_transport', 'commercial_services'],
    label: 'Auto Repair Garages',
    description: 'Dedicated automotive service centers with multiple roll-up service bays, hydraulic lifts, reception offices, tire racks, and fenced service yards.',
    environmentTags: ['urban', 'suburban', 'industrial', 'service'],
    supportedLotTypes: ['standalone_commercial', 'industrial_service', 'roadside_service', 'none'],
    defaultObjectGroups: ['service_equipment', 'site_amenities', 'waste_utility', 'rooftop_mep', 'signage_lighting'],
    defaults: {
      width: 14.0,
      depth: 10.0,
      floors: 1,
      floorHeight: 4.5,
      exteriorMaterial: 'concrete',
      primaryColor: '#989fa6',
      secondaryColor: '#254a78',
      accentColor: '#d94c2b',
      lotType: 'standalone_commercial',
      lotWidth: 26,
      lotDepth: 22,
      frontSetback: 8.5,
      garageBayCount: 3,
      bayWidth: 4.0,
      bayHeight: 3.4,
      garageDoorOpenRatio: 0.45,
      includeOfficeWing: true,
      officeWidth: 5.2
    },
    featureSchema: [
      { group: 'Service Bays & Workshop' },
      { key: 'garageBayCount', label: 'Garage Bay Count', type: 'range', min: 1, max: 5, step: 1 },
      { key: 'bayWidth', label: 'Bay Width', type: 'range', min: 3.2, max: 5.2, step: 0.2, unit: 'm' },
      { key: 'bayHeight', label: 'Bay Door Height', type: 'range', min: 2.7, max: 4.6, step: 0.1, unit: 'm' },
      { key: 'garageDoorOpenRatio', label: 'Door Open Amount', type: 'range', min: 0, max: 0.85, step: 0.05 },
      { key: 'includeOfficeWing', label: 'Attached Customer Office', type: 'boolean' },
      { key: 'officeWidth', label: 'Office Width', type: 'range', min: 3.6, max: 8.5, step: 0.2, unit: 'm' }
    ],
    presets: [
      {
        id: 'neighborhood_mechanic',
        label: 'Neighborhood Mechanic',
        params: { garageBayCount: 3, includeOfficeWing: true, signText: 'TONY\'S GARAGE', exteriorMaterial: 'brick', primaryColor: '#8d4c3b' }
      },
      {
        id: 'small_two_bay_garage',
        label: 'Small Two-Bay Garage',
        params: { garageBayCount: 2, width: 9.6, depth: 8.5, includeOfficeWing: false, signText: 'TWO-BAY AUTO' }
      },
      {
        id: 'tire_and_wheel_shop',
        label: 'Tire & Wheel Shop',
        params: { garageBayCount: 4, primaryColor: '#e2e6eb', secondaryColor: '#1f4e8c', accentColor: '#e09a22', signText: 'METRO TIRE & WHEEL' }
      },
      {
        id: 'body_repair_shop',
        label: 'Body Repair Shop',
        params: { garageBayCount: 4, exteriorMaterial: 'metal_siding', primaryColor: '#6b7580', secondaryColor: '#b83c2b', signText: 'PRECISION COLLISION' }
      },
      {
        id: 'large_automotive_service_center',
        label: 'Large Automotive Service Center',
        params: { garageBayCount: 5, width: 22.0, depth: 12.0, lotWidth: 34, lotDepth: 26, signText: 'PARAGON AUTO CENTER' }
      },
      {
        id: 'old_fashioned_repair_garage',
        label: 'Old-Fashioned Repair Garage',
        params: { architecturalEra: '1940s_1950s', exteriorMaterial: 'brick', primaryColor: '#9c5a44', secondaryColor: '#2d5444', roofStyle: 'stepped', signText: 'OLDE SERVICE GARAGE' }
      },
      {
        id: 'automotive_inspection_station',
        label: 'Automotive Inspection Station',
        params: { garageBayCount: 2, garageDoorOpenRatio: 0.75, secondaryColor: '#265c8a', signText: 'STATE INSPECTION BAY' }
      },
      {
        id: 'commercial_fleet_garage',
        label: 'Commercial Fleet Garage',
        params: { lotType: 'industrial_service', garageBayCount: 4, bayHeight: 4.2, floorHeight: 5.2, exteriorMaterial: 'industrial_steel', signText: 'FLEET MAINTENANCE' }
      },
      {
        id: 'vehicle_detailing_garage',
        label: 'Vehicle Detailing Garage',
        params: { garageBayCount: 2, condition: 'new', primaryColor: '#2b323b', secondaryColor: '#1994b8', signText: 'GLOSS AUTO DETAIL' }
      },
      {
        id: 'garage_with_attached_office',
        label: 'Garage With Attached Office',
        params: { garageBayCount: 3, includeOfficeWing: true, officeWidth: 6.4, signText: 'CITY MOTORS & OFFICE' }
      }
    ],
    buildStructure: buildAutoRepairGarageStructure,
    planObjects: planAutoRepairObjects
  });
}
