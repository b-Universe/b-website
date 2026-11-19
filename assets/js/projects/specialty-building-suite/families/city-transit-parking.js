import { clamp, roundNum } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerEntranceClearance,
  registerLaneClearance,
  registerRoofBound
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial, glassMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function addTransitClockBadge(parent, x, y, z, radius, trimMat, faceMat) {
  addCylinder(parent, x, y, z, radius + 0.08, radius + 0.08, 0.14, trimMat, 12, { rotX: Math.PI / 2 });
  addCylinder(parent, x, y, z + 0.06, radius, radius, 0.06, faceMat, 12, { rotX: Math.PI / 2, cast: false });
}

function buildTransitStationStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 22, 10, 48);
  const d = clamp(cfg.depth || 9.5, 6, 24);
  const fh = cfg.floorHeight || 4.4;
  const mode = cfg.transitMode || 'bus_terminal';
  const bays = clamp(cfg.platformBays || 3, 2, 5);

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors: 1,
    floorHeight: fh,
    forceStorefront: true,
    entranceCount: 2,
    entranceAwning: false,
    signY: fh - 0.36
  });
  ctx.entrances.push(...shell.entrances);

  const steelMat = solidMaterial(cfg.trimColor || '#26323d');
  const accentMat = solidMaterial(cfg.accentColor || '#1f77b4');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime });
  const clockFaceMat = emissiveMaterial('#fff4d6', 0.9, cfg.lightingTime);
  const concMat = surfaceMaterial('concrete', '#8c949c', cfg.condition, cfg.seed + 13, 3, 2);

  // Projecting station clock & illuminated destination sign on headhouse front
  addTransitClockBadge(attachedGroup, 0, fh + 0.55, d * 0.5 + 0.16, 0.65, steelMat, clockFaceMat);

  let topY = shell.roofTopY + 1.25;
  let totalDepth = d;
  let totalSpanW = w;

  if (mode === 'elevated_metro') {
    // Upper Elevated Viaduct Concourse Deck carried on concrete piers
    const deckY = fh + 2.2;
    const deckW = Math.max(w + 8, 28);
    const deckD = 7.4;
    addBox(attachedGroup, 0, deckY, -0.5, deckW, 0.48, deckD, concMat);
    for (const px of [-deckW * 0.36, -deckW * 0.12, deckW * 0.12, deckW * 0.36]) {
      addCylinder(attachedGroup, px, deckY * 0.5, -0.5, 0.55, 0.65, deckY, concMat, 8);
    }
    // Elevated glass concourse canopy + rail guideway track beams
    addBox(attachedGroup, 0, deckY + 2.6, -0.5, deckW * 0.86, 0.22, deckD * 0.92, steelMat);
    addBox(attachedGroup, 0, deckY + 1.4, -0.5 + deckD * 0.44, deckW * 0.86, 2.1, 0.14, glassMat);
    addBox(attachedGroup, 0, deckY + 0.34, -0.5 + deckD * 0.34, deckW, 0.12, 0.25, accentMat);
    totalSpanW = deckW;
    topY = deckY + 3.0;
  } else if (mode === 'subway_headhouse') {
    // Bold angled steel-and-glass station pavilion canopy extending over front plaza
    addBox(attachedGroup, 0, fh + 0.45, d * 0.5 + 1.6, w * 0.92, 0.22, 4.0, steelMat);
    addBox(attachedGroup, -w * 0.38, fh * 0.52, d * 0.5 + 3.3, 0.26, fh, 0.26, accentMat);
    addBox(attachedGroup, w * 0.38, fh * 0.52, d * 0.5 + 3.3, 0.26, fh, 0.26, accentMat);
    addSignboardUnit(attachedGroup, 0, fh + 0.62, d * 0.5 + 3.62, 5.2, 0.72, cfg.signText || 'Metro Station', '#16202a', '#ffd166', cfg);
    totalDepth = d + 3.8;
  } else if (cfg.includePlatformCanopy !== false) {
    // Bus Terminal / Union Rail Boarding Islands + Cantilever Canopy on Rear Side
    const platW = Math.max(w, bays * 5.4);
    const platD = 6.2;
    const pz = -d * 0.5 - platD * 0.5 - 0.1;
    addBox(attachedGroup, 0, 0.12, pz, platW, 0.24, platD, concMat);
    // Yellow passenger safety edge strip
    addBox(attachedGroup, 0, 0.245, pz - platD * 0.44, platW, 0.04, 0.34, solidMaterial('#f2c14e'), { cast: false });
    // Cantilevered steel boarding roof over platform bays
    addBox(attachedGroup, 0, 3.85, pz, platW, 0.22, platD * 0.88, steelMat);
    for (let b = 0; b <= bays; b++) {
      const bx = -platW * 0.44 + (b / bays) * (platW * 0.88);
      addBox(attachedGroup, bx, 1.95, pz + platD * 0.2, 0.24, 3.7, 0.24, accentMat);
    }
    registerBuildingFootprint(placementCtx, {
      id: 'transit_boarding_platform',
      minX: -platW * 0.5,
      maxX: platW * 0.5,
      minZ: pz - platD * 0.5,
      maxZ: pz + platD * 0.5,
      maxY: 4.1
    });
    registerLaneClearance(placementCtx, {
      id: 'transit_bus_rail_lane',
      kind: 'bus_lane',
      minX: -platW * 0.55,
      maxX: platW * 0.55,
      minZ: pz - platD * 0.5 - 4.2,
      maxZ: pz - platD * 0.5
    });
    registerAnchor(placementCtx, {
      id: 'transit_platform_shelter',
      category: 'sidewalk',
      position: [-platW * 0.22, 0.24, pz],
      surfaceY: 0.24,
      rotationY: Math.PI
    });
    registerAnchor(placementCtx, {
      id: 'transit_platform_board',
      category: 'sidewalk',
      position: [platW * 0.22, 0.24, pz + 0.5],
      surfaceY: 0.24,
      rotationY: 0
    });
    totalSpanW = Math.max(w, platW);
    totalDepth = d + platD + 1.0;
  }

  registerBuildingFootprint(placementCtx, { id: 'transit_headhouse', minX: -w * 0.5, maxX: w * 0.5, minZ: -d * 0.5, maxZ: d * 0.5, maxY: fh });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.45, maxX: w * 0.45, minZ: -d * 0.45, maxZ: d * 0.45, y: shell.roofTopY });

  ctx.roofTopY = shell.roofTopY;
  ctx.buildingBounds = { width: totalSpanW, depth: totalDepth, height: topY };
  ctx.lotOptions = { rearMargin: 5.2 };
}

function planTransitStationObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'transit_shelter', presetId: 'transit_ticket_vending_machine', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.6, 0, 0.8] },
    { familyId: 'bike_rack', presetId: 'city_bike_share_dock_station', groupKey: 'site_amenities', anchorId: 'sidewalk_front_right', localOffset: [-1.8, 0, 0] },
    { familyId: 'bollard_railing', presetId: 'downtown_street_clock', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [1.5, 0, 0] },
    { familyId: 'newspaper_box', presetId: 'quad_newspaper_box_row', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [3.4, 0, 0.8] }
  ];
  if (cfg.transitMode === 'subway_headhouse') {
    specs.push({
      familyId: 'transit_shelter',
      presetId: 'subway_stair_entrance_railing',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_left',
      localOffset: [3.2, 0, -1.6]
    });
  } else if (cfg.includePlatformCanopy !== false && cfg.transitMode !== 'elevated_metro') {
    specs.push(
      { familyId: 'transit_shelter', presetId: 'metro_glass_bus_shelter', groupKey: 'site_amenities', anchorId: 'transit_platform_shelter', localOffset: [0, 0, 0], allowInsideBuilding: true },
      { familyId: 'transit_shelter', presetId: 'electronic_bus_arrival_board', groupKey: 'signage_lighting', anchorId: 'transit_platform_board', localOffset: [0, 0, 0], allowInsideBuilding: true }
    );
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'newspaper_box', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'transit_station',
  categoryId: 'automotive_transport',
  categories: ['automotive_transport', 'municipal_community'],
  label: 'Transit Stations & Bus Terminals',
  description: 'Municipal bus terminals, historic union rail depots, elevated metro viaduct stations, and subway plaza headhouses.',
  environmentTags: ['transit', 'downtown', 'urban', 'civic'],
  supportedLotTypes: ['standalone_commercial', 'civic_plaza', 'roadside_service', 'compact_urban', 'none'],
  defaultObjectGroups: ['site_amenities', 'signage_lighting', 'seating_patio', 'rooftop_mep'],
  featureSchema: [
    {
      key: 'transitMode',
      label: 'Transit Station Mode',
      type: 'select',
      options: [
        ['bus_terminal', 'Municipal Bus Terminal'],
        ['train_depot', 'Rail / Union Depot'],
        ['elevated_metro', 'Elevated Metro Station'],
        ['subway_headhouse', 'Subway Plaza Headhouse']
      ]
    },
    { key: 'platformBays', label: 'Boarding Platform Bays', type: 'range', min: 2, max: 5, step: 1 },
    { key: 'includePlatformCanopy', label: 'Covered Boarding Platform', type: 'boolean' }
  ],
  defaults: {
    width: 22,
    depth: 9.5,
    floors: 1,
    floorHeight: 4.5,
    exteriorMaterial: 'concrete',
    primaryColor: '#7a8794',
    secondaryColor: '#d9dfe6',
    trimColor: '#22303d',
    accentColor: '#1f77b4',
    signText: 'Central Transit Terminal',
    transitMode: 'bus_terminal',
    platformBays: 3,
    includePlatformCanopy: true,
    lotType: 'standalone_commercial',
    lotWidth: 46,
    lotDepth: 34,
    frontSetback: 8.5,
    parkingCount: 4
  },
  presets: [
    {
      id: 'municipal_bus_terminal',
      label: 'Municipal Bus Terminal',
      environmentTags: ['transit', 'urban'],
      params: { width: 22, depth: 9.5, transitMode: 'bus_terminal', platformBays: 4, primaryColor: '#6f7c88', accentColor: '#2563eb', signText: 'Central Bus Terminal' }
    },
    {
      id: 'elevated_metro_station',
      label: 'Elevated Metro Viaduct Station',
      environmentTags: ['transit', 'downtown'],
      params: { width: 16, depth: 8.5, transitMode: 'elevated_metro', primaryColor: '#566473', accentColor: '#e85d04', signText: 'Skyrail Metro Station', lotType: 'civic_plaza' }
    },
    {
      id: 'historic_union_train_depot',
      label: 'Historic Brick Union Rail Depot',
      environmentTags: ['transit', 'retro', 'civic'],
      params: { width: 24, depth: 10.5, floorHeight: 4.8, architecturalEra: 'early_20th', transitMode: 'train_depot', exteriorMaterial: 'brick', primaryColor: '#8d4337', trimColor: '#dcd2c0', windowStyle: 'arched', roofStyle: 'hip', platformBays: 4, signText: 'Union Rail Depot' }
    },
    {
      id: 'modern_intermodal_transit_hub',
      label: 'Modern Intermodal Transit Hub',
      environmentTags: ['transit', 'downtown', 'superhero_city'],
      params: { width: 26, depth: 11, floorHeight: 4.8, transitMode: 'bus_terminal', exteriorMaterial: 'glass', primaryColor: '#486581', accentColor: '#00a8e8', windowStyle: 'modern', platformBays: 5, signText: 'Paragon Transit Center', lotWidth: 54, lotDepth: 38 }
    },
    {
      id: 'subway_plaza_headhouse',
      label: 'Urban Subway Plaza Headhouse',
      environmentTags: ['transit', 'downtown', 'urban'],
      params: { width: 13, depth: 8, floorHeight: 4.2, transitMode: 'subway_headhouse', exteriorMaterial: 'glass', primaryColor: '#364958', accentColor: '#22c55e', lotType: 'civic_plaza', lotWidth: 30, lotDepth: 26, signText: 'Downtown Metro Entrance' }
    }
  ],
  buildStructure: buildTransitStationStructure,
  planObjects: planTransitStationObjects
});

function buildParkingGarageStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 24, 14, 48);
  const d = clamp(cfg.depth || 16, 10, 32);
  const levels = clamp(cfg.deckLevels || 4, 2, 7);
  const levelH = clamp(cfg.floorHeight || 3.1, 2.8, 3.8);
  const totalH = levels * levelH;

  const concMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, 3, Math.max(1, levels - 1));
  const deckDark = solidMaterial('#2a3038');
  const spandrelMat = solidMaterial(cfg.secondaryColor || '#b8c0c8');
  const trimMat = solidMaterial(cfg.trimColor || '#2e3842');
  const stripeMat = solidMaterial(cfg.accentColor || '#f2c14e');

  // Ground base slab
  addBox(mainBuildingGroup, 0, 0.1, 0, w, 0.2, d, concMat);

  // Stacked open concrete parking decks with horizontal spandrel barriers + dark floor shadows
  for (let l = 1; l <= levels; l++) {
    const sy = l * levelH;
    addBox(mainBuildingGroup, 0, sy - 0.14, 0, w, 0.28, d, concMat);
    addBox(mainBuildingGroup, 0, sy + 0.01, 0, w - 0.4, 0.04, d - 0.4, deckDark, { cast: false });
    // Spandrel barrier rails along all 4 sides
    addBox(mainBuildingGroup, 0, sy - 0.14 + 0.56, d * 0.5 - 0.14, w, 0.92, 0.26, spandrelMat);
    addBox(mainBuildingGroup, 0, sy - 0.14 + 0.56, -d * 0.5 + 0.14, w, 0.92, 0.26, spandrelMat);
    addBox(mainBuildingGroup, -w * 0.5 + 0.14, sy - 0.14 + 0.56, 0, 0.26, 0.92, d, spandrelMat);
    addBox(mainBuildingGroup, w * 0.5 - 0.14, sy - 0.14 + 0.56, 0, 0.26, 0.92, d, spandrelMat);
    if (l < levels) {
      // Interior sloped ramp segment visible between decks
      addBox(attachedGroup, 0, sy - levelH * 0.5, -d * 0.12, w * 0.38, 0.24, d * 0.55, concMat, { rotZ: 0.22 });
    }
  }

  // Structural perimeter concrete columns
  const colsX = Math.max(4, Math.round(w / 5.5));
  for (let i = 0; i < colsX; i++) {
    const cx = -w * 0.47 + (i / (colsX - 1)) * (w * 0.94);
    addBox(mainBuildingGroup, cx, totalH * 0.5, d * 0.5 - 0.18, 0.44, totalH, 0.44, trimMat);
    addBox(mainBuildingGroup, cx, totalH * 0.5, -d * 0.5 + 0.18, 0.44, totalH, 0.44, trimMat);
  }
  for (const sz of [-d * 0.25, 0, d * 0.25]) {
    addBox(mainBuildingGroup, -w * 0.5 + 0.18, totalH * 0.5, sz, 0.44, totalH, 0.44, trimMat);
    addBox(mainBuildingGroup, w * 0.5 - 0.18, totalH * 0.5, sz, 0.44, totalH, 0.44, trimMat);
  }

  // Ground-floor vehicle entry/exit portals & clearance warning bar
  const portalOffset = Math.min(w * 0.22, 4.2);
  addBox(attachedGroup, 0, levelH * 0.86, d * 0.5 + 0.12, portalOffset * 2 + 3.6, 0.34, 0.28, stripeMat);
  addSignboardUnit(attachedGroup, 0, levelH + 0.35, d * 0.5 + 0.18, 4.8, 0.72, cfg.signText || 'Public Parking', '#1d3557', '#ffd166', cfg);

  // Enclosed Elevator & Stair Core Tower on right corner rising above roof deck
  const coreW = 3.6;
  const coreD = 3.8;
  const coreH = totalH + 3.2;
  const coreX = w * 0.5 - coreW * 0.5 + 0.15;
  const coreZ = d * 0.5 - coreD * 0.5 + 0.2;
  addBox(attachedGroup, coreX, coreH * 0.5, coreZ, coreW, coreH, coreD, concMat);
  addBox(attachedGroup, coreX, coreH * 0.52, coreZ + coreD * 0.5 + 0.04, 1.35, coreH * 0.72, 0.08, glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime }));
  addBox(attachedGroup, coreX, coreH + 0.14, coreZ, coreW + 0.25, 0.28, coreD + 0.25, trimMat);
  addSignboardUnit(attachedGroup, coreX, Math.min(coreH - 0.9, totalH + 1.4), coreZ + coreD * 0.5 + 0.12, 2.4, 0.95, 'P', '#1d4e89', '#ffffff', cfg);

  // Optional ground-floor corner retail storefront bay
  if (cfg.includeRetailGround) {
    addBox(attachedGroup, -w * 0.32, levelH * 0.48, d * 0.5 + 0.08, w * 0.28, levelH * 0.85, 0.2, glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime }));
  }

  // Register vehicle portals & main stair entry
  const mainEnt = {
    id: 'garage_stair_core',
    role: 'main',
    label: 'Elevator & Stair Tower Entrance',
    position: { x: roundNum(coreX, 3), y: 0, z: roundNum(coreZ + coreD * 0.5, 3) },
    normal: { x: 0, y: 0, z: 1 },
    width: 1.8,
    height: 2.3
  };
  const entryLane = {
    id: 'garage_vehicle_entry',
    role: 'garage',
    label: 'Parking Vehicle Entry Portal',
    position: { x: roundNum(-portalOffset * 0.65, 3), y: 0, z: roundNum(d * 0.5, 3) },
    normal: { x: 0, y: 0, z: 1 },
    width: 3.4,
    height: levelH * 0.85
  };
  const exitLane = {
    id: 'garage_vehicle_exit',
    role: 'garage',
    label: 'Parking Vehicle Exit Portal',
    position: { x: roundNum(portalOffset * 0.45, 3), y: 0, z: roundNum(d * 0.5, 3) },
    normal: { x: 0, y: 0, z: 1 },
    width: 3.4,
    height: levelH * 0.85
  };
  ctx.entrances.push(mainEnt, entryLane, exitLane);
  registerEntranceClearance(placementCtx, mainEnt);
  registerEntranceClearance(placementCtx, entryLane);
  registerEntranceClearance(placementCtx, exitLane);

  registerLaneClearance(placementCtx, {
    id: 'garage_front_apron_lane',
    kind: 'driveway',
    minX: -portalOffset - 2.2,
    maxX: portalOffset + 2.2,
    minZ: d * 0.5 + 0.2,
    maxZ: d * 0.5 + 5.5
  });
  registerAnchor(placementCtx, { id: 'entrance_main', category: 'entrance', position: [coreX, 0, coreZ + coreD * 0.5 + 0.8], surfaceY: 0, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'garage_gate_post', category: 'sidewalk', position: [-portalOffset * 0.1, 0, d * 0.5 + 1.8], surfaceY: 0, rotationY: 0 });
  registerBuildingFootprint(placementCtx, { id: 'parking_garage_body', minX: -w * 0.5, maxX: w * 0.5, minZ: -d * 0.5, maxZ: d * 0.5, maxY: totalH });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.42, maxX: w * 0.42, minZ: -d * 0.42, maxZ: d * 0.42, y: totalH });
  registerAnchor(placementCtx, { id: 'roof_main', category: 'roof', position: [-w * 0.15, totalH, 0], surfaceY: totalH, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'roof_center', category: 'roof', position: [0, totalH, 0], surfaceY: totalH, rotationY: 0 });

  ctx.roofTopY = totalH;
  ctx.buildingBounds = { width: w + 0.6, depth: d + 1.0, height: coreH + 0.4 };
  ctx.lotOptions = { rearMargin: 3.6 };
}

function planParkingGarageObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'parking_meter', presetId: 'parking_gate_barrier_arm', groupKey: 'site_amenities', anchorId: 'garage_gate_post', localOffset: [0, 0, 0], allowInLane: true },
    { familyId: 'parking_meter', presetId: 'solar_pay_and_display_kiosk', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.8, 0, 0.4] },
    { familyId: 'emergency_safety', presetId: 'checkpoint_security_booth', groupKey: 'site_amenities', anchorId: 'garage_gate_post', localOffset: [0, 0, 1.4], allowInLane: true },
    { familyId: 'traffic_sign_signal', presetId: 'concrete_jersey_barrier', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] }
  ];
  if (cfg.includeRoofSolar) {
    specs.push({
      familyId: 'rooftop_hvac',
      presetId: 'commercial_solar_panel_array',
      groupKey: 'rooftop_mep',
      anchorId: 'roof_center',
      placementLayer: 'roof',
      localOffset: [-2.0, 0, 0]
    });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'newspaper_box', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'parking_garage',
  categoryId: 'automotive_transport',
  categories: ['automotive_transport', 'commercial_services'],
  label: 'Multi-Story Parking Garages',
  description: 'Open-deck concrete parking structures with interior ramps, stair towers, gate barriers, rooftop solar, and ground retail.',
  environmentTags: ['downtown', 'urban', 'medical', 'transit'],
  supportedLotTypes: ['compact_urban', 'standalone_commercial', 'corner_commercial', 'none'],
  defaultObjectGroups: ['site_amenities', 'rooftop_mep', 'signage_lighting', 'waste_utility'],
  featureSchema: [
    { key: 'deckLevels', label: 'Parking Deck Levels', type: 'range', min: 2, max: 7, step: 1 },
    { key: 'includeRoofSolar', label: 'Rooftop Solar Panel Canopy', type: 'boolean' },
    { key: 'includeRetailGround', label: 'Ground-Floor Retail Bay', type: 'boolean' }
  ],
  defaults: {
    width: 24,
    depth: 16,
    floors: 5,
    floorHeight: 3.1,
    exteriorMaterial: 'concrete',
    primaryColor: '#8d959d',
    secondaryColor: '#b7c0c8',
    trimColor: '#2e3842',
    accentColor: '#f2c14e',
    signText: 'Downtown Parking Deck',
    deckLevels: 5,
    includeRoofSolar: false,
    includeRetailGround: false,
    includeRooftopHvac: false,
    lotType: 'compact_urban',
    lotWidth: 34,
    lotDepth: 28,
    frontSetback: 6.0,
    parkingCount: 0
  },
  presets: [
    {
      id: 'downtown_concrete_parking_deck',
      label: 'Downtown Concrete Parking Deck',
      environmentTags: ['downtown', 'urban'],
      params: { width: 24, depth: 16, deckLevels: 5, primaryColor: '#879099', signText: 'Central Parking Garage' }
    },
    {
      id: 'modern_hospital_transit_garage',
      label: 'Solar-Topped Medical / Transit Garage',
      environmentTags: ['medical', 'transit', 'downtown'],
      params: { width: 26, depth: 17, deckLevels: 6, includeRoofSolar: true, primaryColor: '#a8b2bc', accentColor: '#22c55e', signText: 'Medical Center Parking' }
    },
    {
      id: 'compact_urban_parking_structure',
      label: 'Mixed-Use Urban Parking Deck',
      environmentTags: ['urban', 'downtown'],
      params: { width: 19, depth: 14, deckLevels: 3, includeRetailGround: true, primaryColor: '#75808a', accentColor: '#e07a32', signText: 'Market Street Parking', lotWidth: 28, lotDepth: 24 }
    },
    {
      id: 'retro_spiral_ramp_garage',
      label: '1970s Brutalist City Garage',
      environmentTags: ['retro', 'downtown'],
      params: { width: 22, depth: 16, deckLevels: 4, architecturalEra: '1960s_1970s', primaryColor: '#918c82', secondaryColor: '#736f67', signText: 'Municipal Garage B' }
    }
  ],
  buildStructure: buildParkingGarageStructure,
  planObjects: planParkingGarageObjects
});
