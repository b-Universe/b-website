import { clamp, roundNum } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerEntranceClearance,
  registerLaneClearance
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addRollUpGarageDoor,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function buildPolicePrecinctStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 2;
  const fh = cfg.floorHeight || 3.6;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: false,
    entranceAwning: false,
    signY: floors * fh - 0.36
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Civic entrance projection portico + illuminated blue police beacons
  const stoneMat = solidMaterial(cfg.secondaryColor || '#b7bec4');
  const trimMat = solidMaterial(cfg.trimColor || '#1e2c3e');
  const blueLamp = emissiveMaterial('#2b8cff', 1.15);

  addBox(attachedGroup, 0, 0.14, d * 0.5 + 0.95, 4.8, 0.28, 1.9, stoneMat);
  addBox(attachedGroup, 0, 3.05, d * 0.5 + 0.95, 4.9, 0.36, 1.95, trimMat);
  addBox(attachedGroup, -2.0, 1.55, d * 0.5 + 1.72, 0.36, 2.8, 0.36, stoneMat);
  addBox(attachedGroup, 2.0, 1.55, d * 0.5 + 1.72, 0.36, 2.8, 0.36, stoneMat);
  addCylinder(attachedGroup, -2.0, 3.1, d * 0.5 + 1.72, 0.14, 0.14, 0.42, blueLamp, 8, { cast: false });
  addCylinder(attachedGroup, 2.0, 3.1, d * 0.5 + 1.72, 0.14, 0.14, 0.42, blueLamp, 8, { cast: false });
  addSignboardUnit(attachedGroup, 0, 3.45, d * 0.5 + 1.88, 3.8, 0.62, 'Police Precinct', '#152236', '#ffffff', cfg);

  // Flagpole beside plaza entrance
  const poleMat = solidMaterial('#cfd8df');
  addCylinder(attachedGroup, -w * 0.42, 3.2, d * 0.5 + 1.7, 0.05, 0.08, 6.4, poleMat, 8);
  addBox(attachedGroup, -w * 0.42 + 0.6, 5.8, d * 0.5 + 1.7, 1.15, 0.68, 0.05, solidMaterial('#1e4d92'));

  // Attached Secure Cruiser Garage Wing on Right Side
  let rightBound = w * 0.5;
  if (cfg.includeGarageBay !== false) {
    const bays = clamp(cfg.garageBays || 2, 1, 3);
    const gw = bays * 4.0 + 0.8;
    const gd = Math.max(7.2, d * 0.85);
    const gh = 4.1;
    const gx = w * 0.5 + gw * 0.5;
    const gz = -0.3;

    const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 31, 2, 1);
    addBox(attachedGroup, gx, gh * 0.5, gz, gw, gh, gd, wallMat);
    addBox(attachedGroup, gx, gh + 0.16, gz, gw + 0.2, 0.32, gd + 0.2, trimMat);

    for (let b = 0; b < bays; b++) {
      const bx = gx - gw * 0.5 + 0.4 + (b + 0.5) * ((gw - 0.8) / bays);
      addRollUpGarageDoor(attachedGroup, bx, 0, gz + gd * 0.5, 3.2, 2.9, cfg, { openRatio: b === 0 ? 0.4 : 0.0, doorColor: '#6f7c8a' });
      const gEnt = {
        id: `precinct_garage_${b}`,
        role: 'garage',
        label: `Cruiser Garage Bay ${b + 1}`,
        position: { x: roundNum(bx, 3), y: 0, z: roundNum(gz + gd * 0.5, 3) },
        normal: { x: 0, y: 0, z: 1 },
        width: 3.4,
        height: 2.9
      };
      ctx.entrances.push(gEnt);
      registerEntranceClearance(placementCtx, gEnt);
    }

    registerBuildingFootprint(placementCtx, {
      id: 'precinct_garage_wing',
      minX: gx - gw * 0.5,
      maxX: gx + gw * 0.5,
      minZ: gz - gd * 0.5,
      maxZ: gz + gd * 0.5,
      maxY: gh
    });
    rightBound = gx + gw * 0.5;
  }

  // Rooftop communications array platform
  const ry = shell.roofTopY;
  addBox(attachedGroup, w * 0.16, ry + 0.25, -d * 0.18, 2.4, 0.5, 2.4, trimMat);
  if (cfg.includeHelipad) {
    addBox(attachedGroup, -w * 0.12, ry + 0.1, 0, 5.8, 0.16, 5.8, solidMaterial('#3a424b'));
    addBox(attachedGroup, -w * 0.12 - 0.65, ry + 0.19, 0, 0.32, 0.04, 2.2, solidMaterial('#f2c14e'));
    addBox(attachedGroup, -w * 0.12 + 0.65, ry + 0.19, 0, 0.32, 0.04, 2.2, solidMaterial('#f2c14e'));
    addBox(attachedGroup, -w * 0.12, ry + 0.19, 0, 1.4, 0.04, 0.32, solidMaterial('#f2c14e'));
  }

  ctx.buildingBounds = {
    width: rightBound + w * 0.5,
    depth: d + 1.8,
    height: shell.roofTopY + 1.5
  };
  ctx.lotOptions = {
    rearMargin: 5.2,
    industrialFence: Boolean(cfg.fencedMotorPool)
  };
}

function planPolicePrecinctObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.6, 0, 1.55] },
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.6, 0, 1.55] },
    { familyId: 'emergency_safety', presetId: 'campus_emergency_call_box', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [1.4, 0, 0] }
  ];

  if (cfg.includeRooftopComms !== false) {
    specs.push({ familyId: 'rooftop_hvac', presetId: 'cellular_antenna_sector_mast', groupKey: 'rooftop_mep', anchorId: 'roof_center', placementLayer: 'roof', localOffset: [cfg.width * 0.16, 0.45, -cfg.depth * 0.18] });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({
      familyId: 'cafe_storefront',
      presetId: 'illuminated_city_ad_totem',
      groupKey: 'signage_lighting',
      anchorId: 'roadside_sign_corner',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'police_precinct',
  categoryId: 'civic_government',
  categories: ['civic_government', 'emergency_healthcare'],
  label: 'Police Stations & Precincts',
  description: 'Neighborhood police stations, brick precincts, modern headquarters, and high-security precincts.',
  environmentTags: ['civic', 'urban', 'downtown', 'suburban', 'superhero_city'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'compact_urban', 'multi_building_facility', 'none'],
  defaultObjectGroups: ['site_amenities', 'rooftop_mep', 'waste_utility', 'signage_lighting', 'seating_patio'],
  featureSchema: [
    { key: 'includeGarageBay', label: 'Attached Cruiser Garage Wing', type: 'boolean' },
    { key: 'garageBays', label: 'Cruiser Garage Bays', type: 'range', min: 1, max: 3, step: 1 },
    { key: 'fencedMotorPool', label: 'Fenced Motor Pool Perimeter', type: 'boolean' },
    { key: 'includeRooftopComms', label: 'Rooftop Radio / Comms Mast', type: 'boolean' },
    { key: 'includeHelipad', label: 'Rooftop Helipad Pad', type: 'boolean' }
  ],
  defaults: {
    width: 14.8,
    depth: 9.8,
    floors: 2,
    floorHeight: 3.6,
    exteriorMaterial: 'brick',
    primaryColor: '#7a453c',
    secondaryColor: '#c5cbd1',
    trimColor: '#1d2d44',
    accentColor: '#2b6cb0',
    signText: 'Precinct 14 Police',
    includeGarageBay: true,
    garageBays: 2,
    fencedMotorPool: true,
    includeRooftopComms: true,
    includeHelipad: false,
    includeServiceEntrance: true,
    includeRooftopHvac: true,
    lotType: 'civic_plaza',
    frontSetback: 7.5
  },
  presets: [
    { id: 'neighborhood_police_station', label: 'Neighborhood Police Station', environmentTags: ['civic', 'urban'], params: { width: 11.4, depth: 8.2, floors: 1, garageBays: 1, primaryColor: '#8d5347', signText: 'Harbor Police Station' } },
    { id: 'urban_police_precinct', label: 'Urban Downtown Police Precinct', environmentTags: ['civic', 'downtown'], params: { width: 15.2, depth: 10.0, floors: 3, exteriorMaterial: 'limestone', primaryColor: '#b3aba0', trimColor: '#1a2639', garageBays: 2, signText: 'Central Precinct' } },
    { id: 'older_brick_precinct', label: 'Historic Brick Police Precinct', environmentTags: ['civic', 'retro', 'urban'], params: { width: 13.6, depth: 9.2, floors: 2, architecturalEra: 'historical', exteriorMaterial: 'brick', primaryColor: '#6b342e', windowStyle: 'arched', garageBays: 2, signText: 'Oldtown Precinct 4' } },
    { id: 'modern_police_hq', label: 'Modern Police Headquarters', environmentTags: ['civic', 'modern', 'superhero_city'], params: { width: 18.0, depth: 11.4, floors: 3, exteriorMaterial: 'concrete', primaryColor: '#586573', accentColor: '#1e88e5', garageBays: 3, includeHelipad: true, signText: 'Metro Police HQ' } },
    { id: 'suburban_police_station', label: 'Suburban Police Substation', environmentTags: ['civic', 'suburban'], params: { width: 12.6, depth: 8.8, floors: 1, roofStyle: 'hip', exteriorMaterial: 'stone_brick', primaryColor: '#8f7d6a', garageBays: 2, signText: 'Oakwood Police Dept', lotType: 'standalone_commercial' } },
    { id: 'futuristic_security_precinct', label: 'Paragon City Security Precinct', environmentTags: ['superhero_city', 'futuristic'], params: { width: 16.0, depth: 10.6, floors: 3, architecturalEra: 'futuristic', exteriorMaterial: 'metal_panel', primaryColor: '#2f3d4c', accentColor: '#00c2ff', garageBays: 2, includeHelipad: true, signText: 'Sector 7 Security' } }
  ],
  buildStructure: buildPolicePrecinctStructure,
  planObjects: planPolicePrecinctObjects
});

function buildBankFinancialStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = Math.max(cfg.floorHeight || 4.0, 3.6);

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    entranceAwning: false,
    signY: floors * fh - 0.35
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  const stoneMat = solidMaterial(cfg.secondaryColor || '#dfd8cc');
  // Classical temple columns & pediment or Deco fins
  if (cfg.bankStyle === 'classical_stone') {
    const colCount = 4;
    for (let i = 0; i < colCount; i++) {
      const cx = -w * 0.34 + (i / (colCount - 1)) * (w * 0.68);
      addCylinder(attachedGroup, cx, fh * 0.5, d * 0.5 + 0.55, 0.24, 0.28, fh - 0.2, stoneMat, 10);
    }
    addBox(attachedGroup, 0, fh + 0.25, d * 0.5 + 0.55, w * 0.82, 0.42, 1.35, stoneMat);
    addBox(attachedGroup, 0, 0.14, d * 0.5 + 0.75, w * 0.84, 0.28, 1.5, stoneMat);
  }

  // Heavy Reinforced Concrete Vault Wing projecting out side/rear
  addBox(attachedGroup, -w * 0.5 - 0.85, 2.2, -d * 0.1, 1.7, 4.2, d * 0.55, solidMaterial('#7d858c'));

  let rightExtra = 0;
  if (cfg.includeDriveThru) {
    const cw = 3.4;
    const ch = 3.4;
    addBox(attachedGroup, w * 0.5 + cw * 0.5, ch, 0, cw, 0.34, d * 0.88, solidMaterial(cfg.trimColor || '#26323e'));
    addBox(attachedGroup, w * 0.5 + cw - 0.2, ch * 0.5, d * 0.3, 0.24, ch, 0.24, stoneMat);
    addBox(attachedGroup, w * 0.5 + cw - 0.2, ch * 0.5, -d * 0.3, 0.24, ch, 0.24, stoneMat);
    registerLaneClearance(placementCtx, {
      id: 'bank_teller_lane',
      kind: 'drive_thru',
      minX: w * 0.5 + 0.3,
      maxX: w * 0.5 + cw + 0.5,
      minZ: -d * 0.5 - 3,
      maxZ: d * 0.5 + 3
    });
    rightExtra = cw;
  }

  ctx.buildingBounds = { width: w + rightExtra + 1.8, depth: d + 1.4, height: shell.roofTopY + 0.5 };
  ctx.lotOptions = { rearMargin: 4.0 };
}

function planBankFinancialObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'bank_atm_machines', presetId: 'through_wall_bank_atm', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.4, 0, 0.1] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.5, 0, 0.8] },
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.4, 0, 1.1] }
  ];
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'cafe_storefront', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'bank_financial',
  categoryId: 'civic_government',
  categories: ['civic_government', 'commercial_services'],
  label: 'Banks & Financial Branches',
  description: 'Neoclassical stone banks, Art Deco branches, modern glass banks, and drive-thru teller banks.',
  environmentTags: ['downtown', 'urban', 'suburban', 'civic'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'compact_urban', 'corner_commercial', 'none'],
  defaultObjectGroups: ['site_amenities', 'signage_lighting'],
  featureSchema: [
    { key: 'bankStyle', label: 'Bank Architecture', type: 'select', options: [
      { id: 'classical_stone', label: 'Classical Stone Pillars' },
      { id: 'modern_branch', label: 'Modern Corporate Branch' }
    ] },
    { key: 'includeDriveThru', label: 'Drive-Thru Teller Canopy', type: 'boolean' }
  ],
  defaults: {
    width: 13.5,
    depth: 9.2,
    floors: 1,
    floorHeight: 4.4,
    exteriorMaterial: 'limestone',
    primaryColor: '#d4cab8',
    secondaryColor: '#e6dfd3',
    trimColor: '#2a333d',
    accentColor: '#2e6f40',
    signageStyle: 'engraved_stone',
    signText: 'First National Trust',
    bankStyle: 'classical_stone',
    includeDriveThru: false,
    lotType: 'civic_plaza'
  },
  presets: [
    { id: 'classic_stone_bank', label: 'Classical Limestone Temple Bank', environmentTags: ['downtown', 'civic'], params: { width: 14.0, depth: 9.6, floors: 1, floorHeight: 4.8, bankStyle: 'classical_stone', signText: 'First Union Vault' } },
    { id: 'art_deco_branch_bank', label: 'Art Deco Downtown Bank', environmentTags: ['downtown', 'retro'], params: { width: 13.0, depth: 9.0, floors: 2, floorHeight: 3.9, architecturalEra: '1920s_1930s', roofStyle: 'stepped', primaryColor: '#cfc1a8', accentColor: '#b58d3d', signText: 'Metropolis Bank' } },
    { id: 'modern_glass_bank', label: 'Modern Glass Corporate Bank', environmentTags: ['downtown', 'modern'], params: { width: 14.2, depth: 9.2, floors: 2, bankStyle: 'modern_branch', exteriorMaterial: 'concrete', primaryColor: '#4c5866', accentColor: '#0077b6', signText: 'Pacific Crest Bank' } },
    { id: 'drive_thru_bank', label: 'Suburban Drive-Thru Branch', environmentTags: ['suburban'], params: { width: 12.2, depth: 8.4, floors: 1, bankStyle: 'modern_branch', exteriorMaterial: 'brick', primaryColor: '#9b5848', accentColor: '#2e6f40', includeDriveThru: true, signText: 'Harbor Savings Bank', lotType: 'standalone_commercial' } }
  ],
  buildStructure: buildBankFinancialStructure,
  planObjects: planBankFinancialObjects
});

function buildPostOfficeStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const fh = cfg.floorHeight || 3.8;
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, { width: w, depth: d, floors: 1, floorHeight: fh, signY: fh - 0.34 });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  addCylinder(attachedGroup, -w * 0.4, 2.8, d * 0.5 + 1.2, 0.05, 0.07, 5.6, solidMaterial('#d6dde4'), 8);
  addRollUpGarageDoor(attachedGroup, w * 0.5 + 0.04, 0.8, -d * 0.15, 2.8, 2.7, cfg, { rotY: Math.PI / 2, openRatio: 0.25 });
  ctx.buildingBounds = { width: w + 0.4, depth: d + 1.2, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 4.5 };
}

function planPostOfficeObjects(ctx) {
  const { cfg } = ctx;
  return [
    { familyId: 'postal_drop_box', presetId: 'blue_street_collection_box', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.0, 0, 0.7] },
    { familyId: 'mailbox_cluster', presetId: 'cbu_pedestal_standard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.1, 0, 0.6] },
    ...(cfg.includeDumpsters ? [{ familyId: 'commercial_dumpster', presetId: 'standard_green_dumpster', groupKey: 'waste_utility', anchorId: 'service_yard_dumpster', localOffset: [0, 0, 0] }] : [])
  ];
}

registerSpecialtyFamily({
  id: 'post_office',
  categoryId: 'civic_government',
  categories: ['civic_government', 'municipal_community'],
  label: 'Post Offices & Mail Depots',
  description: 'Civic post offices, neighborhood parcel branches, and regional mail sorting centers.',
  environmentTags: ['civic', 'urban', 'suburban'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'industrial_service', 'none'],
  defaultObjectGroups: ['site_amenities', 'waste_utility'],
  featureSchema: [],
  defaults: {
    width: 12.6, depth: 8.8, floors: 1, floorHeight: 3.8, exteriorMaterial: 'brick', primaryColor: '#9b5848', accentColor: '#1d4e89', signText: 'City Post Office', lotType: 'civic_plaza'
  },
  presets: [
    { id: 'neighborhood_post_office', label: 'Neighborhood Post Office', environmentTags: ['urban', 'civic'], params: { width: 11.4, depth: 8.2, signText: 'Harbor Post Office' } },
    { id: 'classic_civic_post_office', label: 'Classic Stone Civic Post Office', environmentTags: ['downtown', 'civic'], params: { width: 14.2, depth: 9.6, exteriorMaterial: 'limestone', primaryColor: '#cec5b5', windowStyle: 'arched', signText: 'General Post Office' } },
    { id: 'mail_distribution_center', label: 'Parcel Distribution Depot', environmentTags: ['industrial', 'civic'], params: { width: 16.5, depth: 11.5, exteriorMaterial: 'concrete', primaryColor: '#7b848c', lotType: 'industrial_service', signText: 'Parcel Distribution Hub' } }
  ],
  buildStructure: buildPostOfficeStructure,
  planObjects: planPostOfficeObjects
});

function buildNewsRadioStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 2;
  const fh = cfg.floorHeight || 3.5;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, { width: w, depth: d, floors, floorHeight: fh, signY: floors * fh - 0.34 });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Rooftop broadcast antenna tower spire
  const ry = shell.roofTopY;
  const spireMat = solidMaterial('#c83e37');
  const legMat = solidMaterial('#dfe6ec');
  addBox(attachedGroup, 0, ry + 1.2, -d * 0.15, 1.4, 2.4, 1.4, legMat);
  addCylinder(attachedGroup, 0, ry + 4.4, -d * 0.15, 0.08, 0.45, 4.4, spireMat, 6);
  addCylinder(attachedGroup, 0, ry + 6.8, -d * 0.15, 0.14, 0.14, 0.25, emissiveMaterial('#ff2e2e', 1.2), 6, { cast: false });

  registerAnchor(placementCtx, { id: 'broadcast_dish_spot', category: 'roof', position: [-w * 0.25, ry, 0.4], surfaceY: ry, rotationY: 0 });
  ctx.buildingBounds = { width: w, depth: d, height: ry + 7.0 };
  ctx.lotOptions = { rearMargin: 3.5 };
}

function planNewsRadioObjects(ctx) {
  return [
    { familyId: 'rooftop_hvac', presetId: 'rooftop_satellite_dish_array', groupKey: 'rooftop_mep', anchorId: 'broadcast_dish_spot', localOffset: [0, 0, 0] },
    { familyId: 'newspaper_box', presetId: 'quad_newspaper_box_row', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.2, 0, 0.4] }
  ];
}

registerSpecialtyFamily({
  id: 'news_radio_building',
  categoryId: 'commercial_services',
  categories: ['commercial_services', 'civic_government', 'industrial_infrastructure'],
  label: 'News Offices & Radio Stations',
  description: 'Local newspaper offices, retro AM/FM radio studios, and broadcast media buildings.',
  environmentTags: ['downtown', 'urban', 'superhero_city', 'retro'],
  supportedLotTypes: ['compact_urban', 'civic_plaza', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['rooftop_mep', 'site_amenities'],
  featureSchema: [],
  defaults: { width: 12.2, depth: 8.6, floors: 2, floorHeight: 3.5, exteriorMaterial: 'concrete', primaryColor: '#6d7782', accentColor: '#d93829', signText: 'Daily Planet Dispatch', lotType: 'compact_urban' },
  presets: [
    { id: 'local_newspaper_office', label: 'Local Newspaper Office', environmentTags: ['urban', 'superhero_city'], params: { width: 11.8, depth: 8.4, floors: 2, exteriorMaterial: 'brick', primaryColor: '#8d473a', accentColor: '#2563eb', signText: 'City Gazette Press' } },
    { id: 'retro_radio_station', label: 'Retro 1950s Radio Station', environmentTags: ['retro', 'urban'], params: { width: 10.6, depth: 7.8, floors: 1, architecturalEra: '1940s_1950s', exteriorMaterial: 'painted_stucco', primaryColor: '#e4dac8', accentColor: '#c93838', signageStyle: 'neon_marquee', signText: 'WPAR 940 AM Radio' } },
    { id: 'modern_broadcast_building', label: 'Modern Media Broadcast HQ', environmentTags: ['downtown', 'modern'], params: { width: 14.4, depth: 9.6, floors: 3, primaryColor: '#485461', accentColor: '#00a8e8', signText: 'Metro News Network', lotType: 'civic_plaza' } }
  ],
  buildStructure: buildNewsRadioStructure,
  planObjects: planNewsRadioObjects
});

function buildFireStationStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const bays = clamp(cfg.garageBays || 2, 1, 3);
  const fh = 4.6;

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, 2, 1);
  const trimMat = solidMaterial(cfg.trimColor || '#d4cab8');
  addBox(mainBuildingGroup, 0, fh * 0.5, 0, w, fh, d, wallMat);
  addBox(mainBuildingGroup, 0, fh + 0.18, 0, w + 0.25, 0.36, d + 0.25, trimMat);

  // Tall Red Fire Apparatus Garage Bays across front
  const baySpan = w * 0.68;
  for (let b = 0; b < bays; b++) {
    const bx = -w * 0.14 - baySpan * 0.5 + (b + 0.5) * (baySpan / bays);
    addRollUpGarageDoor(attachedGroup, bx, 0, d * 0.5, 3.25, 3.6, cfg, { openRatio: b === 0 ? 0.45 : 0.0, doorColor: '#c92a2a' });
    const fEnt = {
      id: `fire_apparatus_bay_${b}`,
      role: 'garage',
      label: `Fire Engine Bay ${b + 1}`,
      position: { x: roundNum(bx, 3), y: 0, z: roundNum(d * 0.5, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: 3.4,
      height: 3.6
    };
    ctx.entrances.push(fEnt);
    registerEntranceClearance(placementCtx, fEnt);
  }

  // Personnel door + tall Hose Drying Watch Tower on right end
  addBox(attachedGroup, w * 0.36, fh + 1.8, -d * 0.1, 3.2, 3.6, 3.2, wallMat);
  addBox(attachedGroup, w * 0.36, fh + 3.7, -d * 0.1, 3.4, 0.26, 3.4, trimMat);
  addCylinder(attachedGroup, w * 0.36, fh + 4.05, -d * 0.1, 0.22, 0.22, 0.45, emissiveMaterial('#ff2b2b', 1.25), 8, { cast: false });
  addSignboardUnit(attachedGroup, -w * 0.1, fh - 0.18, d * 0.5 + 0.14, Math.min(w * 0.58, 5.2), 0.65, cfg.signText || 'Engine Company 7', '#1f252b', '#ffd166', cfg);

  registerBuildingFootprint(placementCtx, {
    id: 'fire_station_main',
    minX: -w * 0.5,
    maxX: w * 0.5,
    minZ: -d * 0.5,
    maxZ: d * 0.5,
    maxY: fh + 3.8
  });
  registerAnchor(placementCtx, { id: 'entrance_main', category: 'entrance', position: [w * 0.36, 0, d * 0.5 + 0.5], surfaceY: 0, rotationY: 0 });
  ctx.roofTopY = fh + 0.36;
  ctx.buildingBounds = { width: w, depth: d, height: fh + 4.3 };
  ctx.lotOptions = { rearMargin: 4.5 };
}

function planFireStationObjects(ctx) {
  return [
    { familyId: 'emergency_safety', presetId: 'municipal_red_fire_hydrant', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] },
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.4, 0, 0.6] },
    { familyId: 'commercial_dumpster', presetId: 'standard_green_dumpster', groupKey: 'waste_utility', anchorId: 'service_yard_dumpster', localOffset: [0, 0, 0] }
  ];
}

registerSpecialtyFamily({
  id: 'fire_station',
  categoryId: 'emergency_healthcare',
  categories: ['emergency_healthcare', 'civic_government', 'municipal_community'],
  label: 'Fire Stations & Apparatus Houses',
  description: 'Historic brick firehouses, municipal apparatus bay stations, and hose-tower rescue stations.',
  environmentTags: ['civic', 'urban', 'suburban'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'industrial_service', 'none'],
  defaultObjectGroups: ['site_amenities', 'waste_utility'],
  featureSchema: [
    { key: 'garageBays', label: 'Apparatus Bays', type: 'range', min: 1, max: 3, step: 1 }
  ],
  defaults: {
    width: 14.6, depth: 10.2, floors: 1, floorHeight: 4.6, exteriorMaterial: 'brick', primaryColor: '#913830', trimColor: '#dcd4c6', accentColor: '#d92626', signText: 'Engine Company 7', garageBays: 2, lotType: 'standalone_commercial', frontSetback: 8.5
  },
  presets: [
    { id: 'brick_neighborhood_firehouse', label: 'Historic Brick Neighborhood Firehouse', environmentTags: ['urban', 'civic', 'retro'], params: { width: 12.6, depth: 9.6, garageBays: 2, primaryColor: '#8d362d', signText: 'Ladder Co. 4' } },
    { id: 'municipal_apparatus_station', label: '3-Bay Municipal Fire Station', environmentTags: ['suburban', 'civic'], params: { width: 17.0, depth: 11.2, garageBays: 3, exteriorMaterial: 'stone_brick', primaryColor: '#8f5a4a', signText: 'Station 12 Fire Rescue' } },
    { id: 'modern_fire_rescue_hq', label: 'Modern Fire & Rescue HQ', environmentTags: ['civic', 'modern'], params: { width: 16.0, depth: 10.8, garageBays: 3, exteriorMaterial: 'concrete', primaryColor: '#69727c', trimColor: '#c92a2a', signText: 'Metro Fire Command' } }
  ],
  buildStructure: buildFireStationStructure,
  planObjects: planFireStationObjects
});
