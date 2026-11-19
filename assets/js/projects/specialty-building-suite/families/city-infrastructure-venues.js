import { clamp, roundNum } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerEntranceClearance,
  registerRoofBound
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial, glassMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function buildPowerSubstationStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 11.5, 7, 30);
  const d = clamp(cfg.depth || 7.5, 5, 22);
  const fh = cfg.floorHeight || 4.4;
  const style = cfg.utilityStyle || 'grid_substation';

  // Control Switchgear Building on Left-Rear quadrant of compound
  const ctrlX = -w * 0.38;
  const ctrlZ = -2.2;
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w * 0.56,
    depth: d * 0.65,
    x: ctrlX,
    z: ctrlZ,
    floors: 1,
    floorHeight: fh,
    entranceAwning: false,
    signY: fh - 0.38
  });
  ctx.entrances.push(...shell.entrances);

  const concMat = surfaceMaterial('concrete', '#78828c', cfg.condition, cfg.seed + 19, 3, 2);
  const steelMat = solidMaterial('#45515e');
  const copperMat = solidMaterial('#a6633c');
  const ceramicMat = solidMaterial('#cbd4dc');
  const warnMat = solidMaterial(cfg.accentColor || '#e85d04');

  // Steam Cogeneration Boiler Wing & Smokestacks
  let topY = shell.roofTopY;
  if (style === 'steam_cogen_plant') {
    const bw = w * 0.42;
    const bd = d * 0.65;
    const bh = fh + 2.4;
    addBox(attachedGroup, ctrlX + w * 0.52, bh * 0.5, ctrlZ, bw, bh, bd, surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 31, 2, 2));
    for (const sz of [ctrlZ - bd * 0.24, ctrlZ + bd * 0.24]) {
      addCylinder(attachedGroup, ctrlX + w * 0.52, bh + 2.6, sz, 0.52, 0.72, 5.2, solidMaterial('#5a646e'), 10);
      addCylinder(attachedGroup, ctrlX + w * 0.52, bh + 4.8, sz, 0.55, 0.58, 0.75, warnMat, 10);
    }
    topY = bh + 5.2;
  }

  // Outdoor High-Voltage Transformer & Transmission Gantry Yard
  const txCount = clamp(cfg.transformerCount || 3, 2, 4);
  const yardX = w * 0.34;
  const yardW = txCount * 3.1 + 1.8;
  const yardD = Math.max(d, 9.2);
  addBox(attachedGroup, yardX, 0.08, 0.4, yardW, 0.16, yardD, concMat);

  for (let i = 0; i < txCount; i++) {
    const tx = yardX - yardW * 0.36 + (txCount > 1 ? (i / (txCount - 1)) * (yardW * 0.72) : 0);
    const tz = 0.2;
    // Heavy steel transformer oil tank + cooling radiator fin banks + ceramic bushings
    addBox(attachedGroup, tx, 1.15, tz, 1.75, 1.9, 1.55, solidMaterial('#4e5b68'));
    addBox(attachedGroup, tx - 0.96, 1.05, tz, 0.22, 1.4, 1.2, steelMat);
    addBox(attachedGroup, tx + 0.96, 1.05, tz, 0.22, 1.4, 1.2, steelMat);
    addCylinder(attachedGroup, tx, 2.25, tz + 0.35, 0.35, 0.35, 0.65, solidMaterial('#5c6975'), 8, { rotZ: Math.PI / 2 });
    for (const bx of [-0.45, 0, 0.45]) {
      addCylinder(attachedGroup, tx + bx, 2.55, tz - 0.2, 0.1, 0.16, 0.95, ceramicMat, 8);
      addCylinder(attachedGroup, tx + bx, 2.75, tz - 0.2, 0.18, 0.18, 0.1, warnMat, 8);
    }
  }

  // Steel Transmission Gantry Portal Towers & Busbars spanning Yard
  const gantryH = 6.2;
  for (const gx of [yardX - yardW * 0.45, yardX + yardW * 0.45]) {
    addBox(attachedGroup, gx, gantryH * 0.5, -yardD * 0.32, 0.34, gantryH, 0.34, steelMat);
    addBox(attachedGroup, gx, gantryH * 0.5, yardD * 0.32, 0.34, gantryH, 0.34, steelMat);
  }
  addBox(attachedGroup, yardX, gantryH - 0.2, -yardD * 0.32, yardW, 0.32, 0.32, steelMat);
  addBox(attachedGroup, yardX, gantryH - 0.2, yardD * 0.32, yardW, 0.32, 0.32, steelMat);
  for (const bz of [-yardD * 0.14, 0, yardD * 0.14]) {
    addCylinder(attachedGroup, yardX, gantryH - 0.5, bz, 0.05, 0.05, yardW * 0.94, copperMat, 6, { rotZ: Math.PI / 2 });
  }
  topY = Math.max(topY, gantryH + 0.4);

  // Solar & Battery Storage Rack Array when solar_battery_yard
  if (style === 'solar_battery_yard') {
    const pvMat = solidMaterial('#183a66');
    for (let r = 0; r < 2; r++) {
      addBox(attachedGroup, ctrlX + 0.5, 1.15, 2.2 + r * 2.2, w * 0.52, 0.1, 1.5, pvMat, { rotX: -0.32 });
      addBox(attachedGroup, ctrlX + 0.5, 0.55, 2.2 + r * 2.2, 0.14, 1.1, 0.14, steelMat);
    }
  }

  registerBuildingFootprint(placementCtx, { id: 'substation_ctrl', minX: ctrlX - w * 0.28, maxX: ctrlX + w * 0.28, minZ: ctrlZ - d * 0.34, maxZ: ctrlZ + d * 0.34, maxY: fh });
  registerBuildingFootprint(placementCtx, { id: 'substation_yard', minX: yardX - yardW * 0.5, maxX: yardX + yardW * 0.5, minZ: 0.4 - yardD * 0.5, maxZ: 0.4 + yardD * 0.5, maxY: gantryH });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: ctrlX - w * 0.25, maxX: ctrlX + w * 0.25, minZ: ctrlZ - d * 0.3, maxZ: ctrlZ + d * 0.3, y: shell.roofTopY });

  ctx.roofTopY = shell.roofTopY;
  ctx.buildingBounds = { width: Math.max(w, yardX + yardW * 0.5 - (ctrlX - w * 0.28)), depth: Math.max(d, yardD + 2.0), height: topY };
  ctx.lotOptions = { rearMargin: 4.5, fencedPerimeter: true, fenceHeight: 2.4 };
}

function planPowerSubstationObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'utility_cabinet', presetId: 'green_pad_transformer', groupKey: 'waste_utility', anchorId: 'entrance_main', localOffset: [-2.2, 0, 0.6] },
    { familyId: 'electrician_repair_equipment', presetId: 'high_voltage_switchgear_cabinet', groupKey: 'service_equipment', anchorId: 'entrance_main', localOffset: [2.2, 0, 0.4] },
    { familyId: 'electrician_repair_equipment', presetId: 'overhead_cable_tray_conduit_run', groupKey: 'service_equipment', anchorId: 'roof_main', placementLayer: 'roof', localOffset: [0, 0, 0] },
    { familyId: 'streetlight', presetId: 'wooden_power_utility_pole', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_right', localOffset: [0.8, 0, 0] }
  ];
  if (cfg.utilityStyle === 'steam_cogen_plant') {
    specs.push({ familyId: 'exposed_pipes', presetId: 'industrial_steam_manifold', groupKey: 'service_equipment', position: [0, 0, cfg.depth * 0.38], rotationY: 0 });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'power_substation',
  categoryId: 'industrial_infrastructure',
  categories: ['industrial_infrastructure', 'municipal_community'],
  label: 'Power Substations & Utility Plants',
  description: 'High-voltage electrical substations with step-up transformers and gantry towers, solar yards, and steam cogen plants.',
  environmentTags: ['industrial', 'urban', 'civic'],
  supportedLotTypes: ['industrial_service', 'multi_building_facility', 'none'],
  defaultObjectGroups: ['service_equipment', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    {
      key: 'utilityStyle',
      label: 'Facility Type',
      type: 'select',
      options: [
        ['grid_substation', 'High-Voltage Grid Substation'],
        ['urban_brick_substation', 'Urban Brick Substation'],
        ['solar_battery_yard', 'Solar & Battery Storage Yard'],
        ['steam_cogen_plant', 'Steam & Cogeneration Plant']
      ]
    },
    { key: 'transformerCount', label: 'Transformer Units', type: 'range', min: 2, max: 4, step: 1 }
  ],
  defaults: {
    width: 15.5,
    depth: 10.5,
    floors: 1,
    floorHeight: 4.4,
    exteriorMaterial: 'concrete',
    primaryColor: '#75808a',
    trimColor: '#36414c',
    accentColor: '#e85d04',
    signText: 'Sector 3 Grid Substation',
    utilityStyle: 'grid_substation',
    transformerCount: 3,
    includeDumpsters: false,
    lotType: 'industrial_service',
    lotWidth: 34,
    lotDepth: 26,
    frontSetback: 7.0,
    parkingCount: 2
  },
  presets: [
    {
      id: 'urban_brick_power_substation',
      label: 'Urban Brick Neighborhood Substation',
      environmentTags: ['urban', 'industrial'],
      params: { width: 14.5, depth: 9.5, utilityStyle: 'urban_brick_substation', exteriorMaterial: 'brick', primaryColor: '#8d4c3b', transformerCount: 2, signText: 'Harbor Power Substation' }
    },
    {
      id: 'high_voltage_grid_substation',
      label: 'High-Voltage Grid Substation',
      environmentTags: ['industrial', 'civic'],
      params: { width: 17, depth: 11.5, utilityStyle: 'grid_substation', transformerCount: 4, lotWidth: 38, lotDepth: 28, signText: 'Metro 138kv Substation' }
    },
    {
      id: 'municipal_solar_battery_yard',
      label: 'Municipal Solar & Battery Yard',
      environmentTags: ['civic', 'industrial'],
      params: { width: 16.5, depth: 11, utilityStyle: 'solar_battery_yard', primaryColor: '#d0d7de', accentColor: '#2563eb', transformerCount: 2, signText: 'GreenGrid Storage Yard' }
    },
    {
      id: 'industrial_steam_cogen_plant',
      label: 'Steam & Cogeneration Plant',
      environmentTags: ['industrial'],
      params: { width: 18, depth: 12, utilityStyle: 'steam_cogen_plant', exteriorMaterial: 'industrial_steel', primaryColor: '#566270', accentColor: '#d93829', transformerCount: 3, signText: 'City District Steam Plant' }
    }
  ],
  buildStructure: buildPowerSubstationStructure,
  planObjects: planPowerSubstationObjects
});

function buildCinemaTheaterStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 16, 10, 36);
  const d = clamp(cfg.depth || 20, 12, 38);
  const fh = cfg.floorHeight || 4.2;
  const hallH = fh * 2.1;

  // Front lobby foyer shell + dual public entrance portals
  const lobbyD = 5.4;
  const lobbyZ = d * 0.5 - lobbyD * 0.5;
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: lobbyD,
    x: 0,
    z: lobbyZ,
    floors: 2,
    floorHeight: fh * 0.85,
    forceStorefront: true,
    entranceCount: 2,
    entranceAwning: false,
    includeSign: false
  });
  ctx.entrances.push(...shell.entrances);

  // Rear tall windowless auditorium box stepped higher than lobby
  const audD = d - lobbyD + 0.4;
  const audZ = lobbyZ - lobbyD * 0.5 - audD * 0.5 + 0.2;
  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 29, 3, 2);
  const trimMat = solidMaterial(cfg.trimColor || '#222831');
  const accentMat = solidMaterial(cfg.accentColor || '#e63946');
  const neonMat = emissiveMaterial(cfg.accentColor || '#ffd166', 1.2, cfg.lightingTime);
  const bulbMat = emissiveMaterial('#fff3b0', 1.15, cfg.lightingTime);

  addBox(attachedGroup, 0, hallH * 0.5, audZ, w + 0.4, hallH, audD, wallMat);
  addBox(attachedGroup, 0, hallH + 0.22, audZ, w + 0.7, 0.44, audD + 0.4, trimMat);

  // Dramatic Cantilevered Illuminated Marquee Canopy over front sidewalk
  const mqW = Math.min(w * 0.78, 11.5);
  const mqH = 1.45;
  const mqD = 2.6;
  const mqZ = d * 0.5 + mqD * 0.5 - 0.1;
  addBox(attachedGroup, 0, 3.65, mqZ, mqW, mqH, mqD, trimMat);
  addBox(attachedGroup, 0, 3.65 + mqH * 0.48, mqZ, mqW + 0.16, 0.14, mqD + 0.16, neonMat, { cast: false });
  addBox(attachedGroup, 0, 3.65 - mqH * 0.48, mqZ, mqW + 0.16, 0.14, mqD + 0.16, bulbMat, { cast: false });
  addSignboardUnit(attachedGroup, 0, 3.65, mqZ + mqD * 0.5 + 0.08, mqW * 0.9, mqH * 0.74, cfg.signText || 'Grand Cinema', '#161b22', '#ffd166', cfg);

  // Vertical Art Deco / Retro Projecting Neon Blade Tower Sign
  const style = cfg.marqueeStyle || 'art_deco_blade';
  let topH = hallH + 0.6;
  if (style === 'art_deco_blade' || style === 'retro_neon_marquee') {
    addBox(attachedGroup, 0, hallH + 0.85, d * 0.5 + 0.85, 1.35, 6.4, 0.72, trimMat);
    addBox(attachedGroup, 0, hallH + 0.85, d * 0.5 + 1.24, 0.95, 5.8, 0.12, neonMat, { cast: false });
    addBox(attachedGroup, 0, hallH + 4.3, d * 0.5 + 0.85, 0.14, 1.4, 0.14, accentMat);
    topH = hallH + 5.1;
  }

  // Freestanding Central Glass-and-Brass Ticket Box Office Kiosk
  if (cfg.includeTicketBooth !== false) {
    const boothZ = d * 0.5 + 0.85;
    addBox(attachedGroup, 0, 0.55, boothZ, 1.65, 1.1, 1.55, accentMat);
    addBox(attachedGroup, 0, 1.62, boothZ, 1.5, 1.05, 1.4, glassMaterial(cfg.glassColor, true, { lightingTime: cfg.lightingTime }));
    addBox(attachedGroup, 0, 2.25, boothZ, 1.8, 0.24, 1.7, trimMat);
  }

  registerBuildingFootprint(placementCtx, { id: 'cinema_hall_full', minX: -w * 0.5 - 0.2, maxX: w * 0.5 + 0.2, minZ: -d * 0.5, maxZ: d * 0.5 + 1.6, maxY: hallH });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.45, maxX: w * 0.45, minZ: audZ - audD * 0.42, maxZ: audZ + audD * 0.42, y: hallH });
  registerAnchor(placementCtx, { id: 'roof_main', category: 'roof', position: [0, hallH + 0.2, audZ], surfaceY: hallH + 0.2, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'roof_center', category: 'roof', position: [0, hallH + 0.2, audZ], surfaceY: hallH + 0.2, rotationY: 0 });

  ctx.roofTopY = hallH;
  ctx.buildingBounds = { width: w + 0.6, depth: d + mqD, height: topH };
  ctx.lotOptions = { rearMargin: 4.0 };
}

function planCinemaTheaterObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'emergency_safety', presetId: 'steel_crowd_control_barrier', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.4, 0, 2.2] },
    { familyId: 'emergency_safety', presetId: 'steel_crowd_control_barrier', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [4.2, 0, 2.2] },
    { familyId: 'arcade_neon_sign_decor', presetId: 'neon_open_window_sign', groupKey: 'signage_lighting', anchorId: 'entrance_main', localOffset: [1.4, 2.1, -0.3], allowElevated: true }
  ];
  if (cfg.includePosterCases !== false) {
    specs.push(
      { familyId: 'newspaper_box', presetId: 'wall_mounted_poster_case', groupKey: 'signage_lighting', placementLayer: 'wall', position: [-cfg.width * 0.36, 1.35, cfg.depth * 0.5 + 0.08], rotationY: 0 },
      { familyId: 'newspaper_box', presetId: 'wall_mounted_poster_case', groupKey: 'signage_lighting', placementLayer: 'wall', position: [cfg.width * 0.36, 1.35, cfg.depth * 0.5 + 0.08], rotationY: 0 }
    );
  }
  if (cfg.includeExteriorLighting !== false && lotLayout.enabled) {
    specs.push({ familyId: 'streetlight', presetId: 'downtown_double_boulevard_lamp', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] });
  }
  if ((cfg.outdoorObjectDensity || 0) >= 0.5 && lotLayout.enabled) {
    specs.push({ familyId: 'vendor_cart', presetId: 'classic_hot_dog_cart', groupKey: 'site_amenities', anchorId: 'sidewalk_front_right', localOffset: [-1.6, 0, 0], minDensity: 0.5 });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'cinema_theater',
  categoryId: 'entertainment_recreation',
  categories: ['entertainment_recreation', 'civic_government'],
  label: 'Movie Theaters & Performing Arts',
  description: 'Art Deco movie palaces, retro neon cinemas, modern multiplexes, and classic performing arts playhouses.',
  environmentTags: ['downtown', 'urban', 'nightlife', 'retro'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'standalone_commercial', 'civic_plaza', 'none'],
  defaultObjectGroups: ['signage_lighting', 'site_amenities', 'waste_utility', 'rooftop_mep'],
  featureSchema: [
    {
      key: 'marqueeStyle',
      label: 'Marquee Style',
      type: 'select',
      options: [
        ['art_deco_blade', 'Art Deco Vertical Blade'],
        ['retro_neon_marquee', 'Retro Neon Marquee'],
        ['modern_multiplex', 'Modern Multiplex Glass'],
        ['stage_playhouse', 'Classic Performing Arts']
      ]
    },
    { key: 'includeTicketBooth', label: 'Outdoor Ticket Box Office', type: 'boolean' },
    { key: 'includePosterCases', label: 'Coming-Soon Poster Cases', type: 'boolean' }
  ],
  defaults: {
    width: 16,
    depth: 20,
    floors: 2,
    floorHeight: 4.1,
    exteriorMaterial: 'brick',
    primaryColor: '#7a332d',
    trimColor: '#1f252d',
    accentColor: '#ffd166',
    signageStyle: 'neon_marquee',
    signText: 'Majestic Palace Cinema',
    marqueeStyle: 'art_deco_blade',
    includeTicketBooth: true,
    includePosterCases: true,
    lightingTime: 'dusk',
    lotType: 'compact_urban',
    lotWidth: 26,
    lotDepth: 34,
    frontSetback: 6.5,
    parkingCount: 0
  },
  presets: [
    {
      id: 'art_deco_movie_palace',
      label: 'Art Deco Movie Palace',
      environmentTags: ['downtown', 'retro', 'nightlife'],
      params: { width: 16, depth: 21, architecturalEra: 'early_20th', marqueeStyle: 'art_deco_blade', exteriorMaterial: 'decorative_masonry', primaryColor: '#b38b67', accentColor: '#ffd166', signText: 'Orpheum Palace' }
    },
    {
      id: 'retro_neon_cinema',
      label: 'Retro 1950s Neon Cinema',
      environmentTags: ['retro', 'nightlife', 'urban'],
      params: { width: 15, depth: 19, architecturalEra: '1940s_1950s', marqueeStyle: 'retro_neon_marquee', exteriorMaterial: 'stucco', primaryColor: '#d9cbb8', accentColor: '#ff3b7f', lightingTime: 'night', signText: 'Starlight Drive Cinema' }
    },
    {
      id: 'modern_multiplex_cinema',
      label: 'Modern Suburban Multiplex',
      environmentTags: ['suburban', 'urban'],
      params: { width: 24, depth: 24, marqueeStyle: 'modern_multiplex', exteriorMaterial: 'concrete', primaryColor: '#3f4b59', accentColor: '#00a8e8', lotType: 'standalone_commercial', lotWidth: 48, lotDepth: 42, frontSetback: 10, parkingCount: 16, signText: 'Metroplex 12 Cinemas' }
    },
    {
      id: 'downtown_performing_arts_theater',
      label: 'Downtown Performing Arts Playhouse',
      environmentTags: ['downtown', 'civic'],
      params: { width: 18, depth: 20, marqueeStyle: 'stage_playhouse', exteriorMaterial: 'stone', primaryColor: '#cfc5b4', accentColor: '#c93b4b', signText: 'Lyric Symphony Hall', lotType: 'civic_plaza' }
    },
    {
      id: 'neighborhood_indie_cinema',
      label: 'Neighborhood Indie Theater',
      environmentTags: ['urban', 'nightlife'],
      params: { width: 12.5, depth: 16.5, marqueeStyle: 'retro_neon_marquee', exteriorMaterial: 'brick', primaryColor: '#693c35', accentColor: '#22c55e', signText: 'Bijou Indie Film' }
    }
  ],
  buildStructure: buildCinemaTheaterStructure,
  planObjects: planCinemaTheaterObjects
});

function buildCivicArenaStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 28, 16, 54);
  const d = clamp(cfg.depth || 22, 14, 42);
  const bowlH = clamp((cfg.floors || 2) * (cfg.floorHeight || 4.2), 7.2, 16.0);

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, 4, 2);
  const trimMat = solidMaterial(cfg.trimColor || '#263342');
  const accentMat = solidMaterial(cfg.accentColor || '#1f77b4');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime });

  // Main arena bowl volume
  addBox(mainBuildingGroup, 0, bowlH * 0.5, -1.0, w, bowlH, d - 2.0, wallMat);

  // Exterior structural rib buttress columns around bowl perimeter
  const ribs = clamp(Math.round(w / 4.2), 5, 10);
  for (let i = 0; i < ribs; i++) {
    const rx = -w * 0.46 + (i / (ribs - 1)) * (w * 0.92);
    addBox(attachedGroup, rx, bowlH * 0.54, d * 0.5 - 2.0, 0.45, bowlH * 1.04, 0.55, trimMat);
    addBox(attachedGroup, rx, bowlH * 0.54, -d * 0.5, 0.45, bowlH * 1.04, 0.55, trimMat);
  }

  // Glazed concourse lobby apron across front with multiple wide public doors
  const lobbyD = 3.8;
  const lobbyZ = d * 0.5 - 0.1;
  const lobbyH = 4.6;
  addBox(attachedGroup, 0, lobbyH * 0.5, lobbyZ, w * 0.82, lobbyH, lobbyD, glassMat);
  addBox(attachedGroup, 0, lobbyH + 0.25, lobbyZ + 0.4, w * 0.86, 0.5, lobbyD + 0.9, trimMat);
  addBox(attachedGroup, 0, lobbyH + 0.58, lobbyZ + lobbyD * 0.5 + 0.42, w * 0.82, 0.16, 0.16, accentMat);
  addSignboardUnit(attachedGroup, 0, lobbyH + 0.25, lobbyZ + lobbyD * 0.5 + 0.5, Math.min(w * 0.5, 9.0), 0.78, cfg.signText || 'Metro Civic Arena', '#142133', '#ffffff', cfg);

  const entCount = clamp(cfg.entranceCount || 3, 1, 3);
  for (let e = 0; e < entCount; e++) {
    const ex = entCount === 1 ? 0 : (-w * 0.26 + (e / (entCount - 1)) * (w * 0.52));
    const doorZ = lobbyZ + lobbyD * 0.5;
    addBox(attachedGroup, ex, 1.35, doorZ + 0.04, 2.6, 2.7, 0.12, trimMat);
    const ent = {
      id: e === 0 ? 'arena_main_concourse' : `arena_gate_${e + 1}`,
      role: e === 0 ? 'main' : 'secondary',
      label: `Concourse Gate ${e + 1}`,
      position: { x: roundNum(ex, 3), y: 0, z: roundNum(doorZ, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: 2.8,
      height: 2.7
    };
    ctx.entrances.push(ent);
    registerEntranceClearance(placementCtx, ent);
  }
  registerAnchor(placementCtx, { id: 'entrance_main', category: 'entrance', position: [0, 0, lobbyZ + lobbyD * 0.5 + 0.8], surfaceY: 0, rotationY: 0 });

  // Sculptural Arena Roof Crown
  let roofMaxY = bowlH;
  const roofKind = cfg.venueRoofStyle || 'barrel_vault';
  if (roofKind === 'geodesic_dome') {
    const rRadius = Math.min(w, d - 2) * 0.46;
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const rr = rRadius * (1 - t * 0.2);
      const nextR = rr * 0.82;
      addCylinder(attachedGroup, 0, bowlH + t * 1.15 + 0.6, -1.0, nextR, rr, 1.15, t % 2 === 0 ? accentMat : wallMat, 14);
    }
    roofMaxY = bowlH + tiers * 1.15 + 0.6;
  } else if (roofKind === 'modern_truss') {
    addBox(attachedGroup, 0, bowlH + 0.95, -1.0, w + 1.4, 1.2, d - 0.8, trimMat);
    addBox(attachedGroup, 0, bowlH + 1.85, -1.0, w * 0.6, 0.6, d * 0.45, glassMat);
    roofMaxY = bowlH + 2.2;
  } else {
    // barrel_vault ribs + stepped arch roof
    const steps = 5;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const bw = w * (1 - t * 0.12);
      const bd = (d - 2.2) * (1 - t * 0.72);
      addBox(attachedGroup, 0, bowlH + s * 0.62 + 0.32, -1.0, bw, 0.64, bd, s % 2 === 0 ? accentMat : trimMat);
    }
    roofMaxY = bowlH + steps * 0.62 + 0.4;
  }

  registerBuildingFootprint(placementCtx, { id: 'civic_arena_main', minX: -w * 0.5 - 0.3, maxX: w * 0.5 + 0.3, minZ: -d * 0.5, maxZ: lobbyZ + lobbyD * 0.5 + 0.4, maxY: roofMaxY });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.4, maxX: w * 0.4, minZ: -d * 0.35, maxZ: d * 0.25, y: bowlH });
  registerAnchor(placementCtx, { id: 'roof_main', category: 'roof', position: [-w * 0.22, bowlH, -1.0], surfaceY: bowlH, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'roof_center', category: 'roof', position: [0, bowlH, -1.0], surfaceY: bowlH, rotationY: 0 });

  ctx.roofTopY = bowlH;
  ctx.buildingBounds = { width: w + 1.6, depth: d + lobbyD * 0.5, height: roofMaxY };
  ctx.lotOptions = { rearMargin: 5.0 };
}

function planCivicArenaObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'emergency_safety', presetId: 'steel_crowd_control_barrier', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-4.5, 0, 1.4] },
    { familyId: 'emergency_safety', presetId: 'steel_crowd_control_barrier', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [4.5, 0, 1.4] },
    { familyId: 'bike_rack', presetId: 'city_bike_share_dock_station', groupKey: 'site_amenities', anchorId: 'sidewalk_front_right', localOffset: [-1.5, 0, 0] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-6.8, 0, 1.2] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [6.8, 0, 1.2] },
    { familyId: 'park_planter', presetId: 'park_drinking_fountain', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.4, 0, 1.6] }
  ];
  if (cfg.includeExteriorLighting !== false && lotLayout.enabled) {
    specs.push({ familyId: 'streetlight', presetId: 'downtown_double_boulevard_lamp', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'newspaper_box', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'civic_arena_rec',
  categoryId: 'municipal_community',
  categories: ['municipal_community', 'entertainment_recreation'],
  label: 'Civic Arenas & Convention Halls',
  description: 'Indoor sports arenas, convention halls, aquatic complexes, and multi-court community recreation centers.',
  environmentTags: ['civic', 'downtown', 'suburban', 'urban'],
  supportedLotTypes: ['civic_plaza', 'multi_building_facility', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['site_amenities', 'signage_lighting', 'rooftop_mep', 'waste_utility'],
  featureSchema: [
    {
      key: 'venueRoofStyle',
      label: 'Arena Roof Structure',
      type: 'select',
      options: [
        ['barrel_vault', 'Ribbed Barrel Vault'],
        ['geodesic_dome', 'Stepped Arena Dome'],
        ['modern_truss', 'Cantilever Steel Truss']
      ]
    },
    { key: 'includePlazaForecourt', label: 'Wide Event Plaza Apron', type: 'boolean' }
  ],
  defaults: {
    width: 30,
    depth: 24,
    floors: 2,
    floorHeight: 4.5,
    exteriorMaterial: 'concrete',
    primaryColor: '#5c6a78',
    trimColor: '#212b36',
    accentColor: '#1f77b4',
    signText: 'Paragon Civic Arena',
    venueRoofStyle: 'barrel_vault',
    includePlazaForecourt: true,
    entranceCount: 3,
    lotType: 'civic_plaza',
    lotWidth: 58,
    lotDepth: 46,
    frontSetback: 11.0,
    parkingCount: 14
  },
  presets: [
    {
      id: 'municipal_sports_arena',
      label: 'Municipal Sports & Concert Arena',
      environmentTags: ['civic', 'downtown'],
      params: { width: 32, depth: 26, venueRoofStyle: 'geodesic_dome', accentColor: '#e63946', signText: 'Metro Coliseum Arena', lotWidth: 64, lotDepth: 50 }
    },
    {
      id: 'civic_convention_hall',
      label: 'City Convention & Expo Center',
      environmentTags: ['downtown', 'civic'],
      params: { width: 34, depth: 24, venueRoofStyle: 'modern_truss', exteriorMaterial: 'glass', primaryColor: '#486078', accentColor: '#00a8e8', signText: 'City Convention Center', lotWidth: 64, lotDepth: 48 }
    },
    {
      id: 'indoor_aquatic_center',
      label: 'Municipal Aquatic & Natatorium Center',
      environmentTags: ['civic', 'suburban', 'campus'],
      params: { width: 26, depth: 21, venueRoofStyle: 'barrel_vault', exteriorMaterial: 'concrete', primaryColor: '#cbd6e0', accentColor: '#2a9d8f', signText: 'Harbor Aquatic Center' }
    },
    {
      id: 'neighborhood_community_center',
      label: 'Large Community Fieldhouse',
      environmentTags: ['civic', 'suburban', 'urban'],
      params: { width: 23, depth: 18, venueRoofStyle: 'barrel_vault', exteriorMaterial: 'brick', primaryColor: '#8d4c3b', accentColor: '#2d7a47', entranceCount: 2, lotWidth: 44, lotDepth: 36, signText: 'Oakwood Fieldhouse' }
    }
  ],
  buildStructure: buildCivicArenaStructure,
  planObjects: planCivicArenaObjects
});
