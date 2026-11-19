import { clamp } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerRoofBound
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial, glassMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addDoorUnit,
  addFacadeWindows,
  addRoofStructure,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function addCivicMassBlock(parent, x, baseY, z, w, d, floors, fh, cfg, r, seedOffset = 0) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z);
  const totalH = floors * fh;
  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + seedOffset, Math.max(2, Math.round(w / 4)), Math.max(1, floors));
  const trimMat = solidMaterial(cfg.trimColor || '#424b54');

  addBox(g, 0, totalH * 0.5, 0, w, totalH, d, wallMat);
  for (let f = 1; f < floors; f++) {
    addBox(g, 0, f * fh, 0, w + 0.14, 0.14, d + 0.14, trimMat);
  }
  const subCfg = { ...cfg, floors, floorHeight: fh };
  addFacadeWindows(g, 'front', 0, d * 0.5, w, subCfg, r);
  addFacadeWindows(g, 'back', 0, -d * 0.5, w, subCfg, r);
  addFacadeWindows(g, 'left', -w * 0.5, 0, d, subCfg, r);
  addFacadeWindows(g, 'right', w * 0.5, 0, d, subCfg, r);

  const roofTop = addRoofStructure(g, 0, totalH, 0, w, d, subCfg);
  parent.add(g);
  return baseY + roofTop;
}

function addCivicRotundaDome(parent, x, baseY, z, radius, trimMat, domeColor, accentMat) {
  const domeMat = solidMaterial(domeColor);
  addCylinder(parent, x, baseY + 1.15, z, radius, radius * 1.04, 2.3, trimMat, 12);
  addCylinder(parent, x, baseY + 2.55, z, radius * 0.88, radius * 1.0, 0.65, domeMat, 12);
  addCylinder(parent, x, baseY + 3.45, z, radius * 0.58, radius * 0.88, 1.15, domeMat, 12);
  addCylinder(parent, x, baseY + 4.35, z, radius * 0.22, radius * 0.58, 0.72, domeMat, 10);
  addCylinder(parent, x, baseY + 4.95, z, radius * 0.24, radius * 0.24, 0.55, trimMat, 8);
  addCylinder(parent, x, baseY + 5.75, z, 0.04, 0.16, 1.1, accentMat, 8);
  return baseY + 6.3;
}

function addCivicClockTowerCrown(parent, x, baseY, z, sizeW, towerH, wallMat, trimMat, faceMat) {
  addBox(parent, x, baseY + towerH * 0.5, z, sizeW, towerH, sizeW, wallMat);
  addBox(parent, x, baseY + towerH + 0.16, z, sizeW + 0.35, 0.32, sizeW + 0.35, trimMat);
  const faceY = baseY + towerH * 0.68;
  const off = sizeW * 0.5 + 0.06;
  addCylinder(parent, x, faceY, z + off, sizeW * 0.32, sizeW * 0.32, 0.1, faceMat, 12, { rotX: Math.PI / 2, cast: false });
  addCylinder(parent, x, faceY, z - off, sizeW * 0.32, sizeW * 0.32, 0.1, faceMat, 12, { rotX: Math.PI / 2, cast: false });
  addCylinder(parent, x + off, faceY, z, sizeW * 0.32, sizeW * 0.32, 0.1, faceMat, 12, { rotZ: Math.PI / 2, cast: false });
  addCylinder(parent, x - off, faceY, z, sizeW * 0.32, sizeW * 0.32, 0.1, faceMat, 12, { rotZ: Math.PI / 2, cast: false });
  // Stepped pyramid spire
  addCylinder(parent, x, baseY + towerH + 1.45, z, 0.12, sizeW * 0.62, 2.3, trimMat, 4, { rotY: Math.PI / 4 });
  return baseY + towerH + 2.6;
}

function addCivicFlagpole(parent, x, baseY, z, poleColor, flagColor) {
  addBox(parent, x, baseY + 0.25, z, 0.65, 0.5, 0.65, solidMaterial('#9da6b0'));
  addCylinder(parent, x, baseY + 3.4, z, 0.05, 0.08, 6.2, solidMaterial(poleColor), 8);
  addBox(parent, x + 0.62, baseY + 5.9, z, 1.18, 0.7, 0.05, solidMaterial(flagColor));
}

function buildCityHallStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx, r } = ctx;
  const w = clamp(cfg.width || 24, 14, 48);
  const d = clamp(cfg.depth || 13, 8, 30);
  const floors = clamp(cfg.floors || 3, 2, 10);
  const fh = cfg.floorHeight || 3.8;
  const totalH = floors * fh;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    entranceAwning: false,
    signY: Math.min(totalH - 0.38, fh * 1.15)
  });
  ctx.entrances.push(...shell.entrances);

  const stoneMat = solidMaterial(cfg.secondaryColor || '#dfd8cc');
  const trimMat = solidMaterial(cfg.trimColor || '#333d47');
  const accentMat = solidMaterial(cfg.accentColor || '#c99b3b');

  // Grand civic entry stairs + colonnade portico across front
  const porticoW = Math.min(w * 0.58, 12.6);
  const porticoD = 2.6;
  const stepCount = 3;
  for (let s = 0; s < stepCount; s++) {
    const t = s / stepCount;
    addBox(attachedGroup, 0, 0.1 + s * 0.18, d * 0.5 + porticoD * 0.5 + (stepCount - s) * 0.35, porticoW + (stepCount - s) * 0.65, 0.2, porticoD + 1.2 - t * 0.4, stoneMat);
  }
  const cols = clamp(cfg.porticoColumns || 6, 4, 8);
  const colH = Math.min(totalH - 0.45, fh * 2.05);
  for (let c = 0; c < cols; c++) {
    const cx = -porticoW * 0.44 + (c / Math.max(1, cols - 1)) * (porticoW * 0.88);
    addCylinder(attachedGroup, cx, 0.52 + colH * 0.5, d * 0.5 + porticoD - 0.28, 0.26, 0.32, colH, stoneMat, 10);
  }
  addBox(attachedGroup, 0, 0.52 + colH + 0.24, d * 0.5 + porticoD * 0.5, porticoW + 0.45, 0.48, porticoD + 0.35, stoneMat);

  // Triangular pediment tiers when classical/rotunda
  if (cfg.civicCrownStyle !== 'modern_cantilever') {
    for (let t = 0; t < 4; t++) {
      const tw = (porticoW + 0.2) * (1 - t * 0.22);
      addBox(attachedGroup, 0, 0.52 + colH + 0.55 + t * 0.26, d * 0.5 + porticoD * 0.52, tw, 0.24, porticoD * 0.85, trimMat);
    }
  }

  // Flanking Civic Wings
  let spanW = w;
  if (cfg.includeSideWings !== false && w >= 18) {
    const ww = clamp(w * 0.24, 4.4, 7.6);
    const wd = d + 1.8;
    const wFloors = Math.max(1, floors - 1);
    for (const side of [-1, 1]) {
      const wx = side * (w * 0.5 + ww * 0.5 - 0.15);
      const wingTop = addCivicMassBlock(attachedGroup, wx, 0, 0.2, ww, wd, wFloors, fh, cfg, r, 17 + (side > 0 ? 11 : 0));
      registerBuildingFootprint(placementCtx, {
        id: side < 0 ? 'civic_west_wing' : 'civic_east_wing',
        minX: wx - ww * 0.5,
        maxX: wx + ww * 0.5,
        minZ: 0.2 - wd * 0.5,
        maxZ: 0.2 + wd * 0.5,
        maxY: wingTop
      });
    }
    spanW = w + ww * 2;
  }

  // Civic Architectural Crown
  let topCrownY = shell.roofTopY;
  const crownStyle = cfg.civicCrownStyle || 'dome_rotunda';
  if (crownStyle === 'dome_rotunda') {
    topCrownY = addCivicRotundaDome(attachedGroup, 0, shell.roofTopY, 0, Math.min(w * 0.2, 4.2), stoneMat, cfg.accentColor || '#c99b3b', accentMat);
  } else if (crownStyle === 'clock_tower') {
    const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 5, 2, 2);
    const clockFaceMat = emissiveMaterial('#fff4d6', 0.9, cfg.lightingTime);
    topCrownY = addCivicClockTowerCrown(attachedGroup, 0, shell.roofTopY, d * 0.18, Math.min(w * 0.2, 3.8), 6.2, wallMat, trimMat, clockFaceMat);
  } else if (crownStyle === 'art_deco_stepped') {
    for (let s = 0; s < 3; s++) {
      const scale = 1 - s * 0.26;
      addBox(attachedGroup, 0, shell.roofTopY + 0.9 + s * 1.55, 0, w * 0.34 * scale, 1.55, d * 0.44 * scale, stoneMat);
    }
    addCylinder(attachedGroup, 0, shell.roofTopY + 5.8, 0, 0.08, 0.22, 2.2, accentMat, 8);
    topCrownY = shell.roofTopY + 6.9;
  } else {
    // modern_cantilever
    addBox(attachedGroup, 0, shell.roofTopY + 0.28, d * 0.25, w * 0.88, 0.44, d * 0.72, accentMat);
    topCrownY = shell.roofTopY + 0.5;
  }

  // Twin civic flagpoles flanking entry steps
  addCivicFlagpole(attachedGroup, -porticoW * 0.5 - 1.2, 0, d * 0.5 + porticoD + 0.6, '#d6dde4', cfg.accentColor || '#1e4d92');
  addCivicFlagpole(attachedGroup, porticoW * 0.5 + 1.2, 0, d * 0.5 + porticoD + 0.6, '#d6dde4', '#1e4d92');

  registerBuildingFootprint(placementCtx, {
    id: 'city_hall_main',
    minX: -w * 0.5,
    maxX: w * 0.5,
    minZ: -d * 0.5,
    maxZ: d * 0.5,
    maxY: totalH
  });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.45, maxX: w * 0.45, minZ: -d * 0.45, maxZ: d * 0.45, y: shell.roofTopY });

  ctx.roofTopY = shell.roofTopY;
  ctx.buildingBounds = { width: spanW, depth: d + porticoD + 2.2, height: topCrownY };
  ctx.lotOptions = { rearMargin: 4.5 };
}

function planCityHallObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-4.2, 0, 2.8] },
    { familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [4.2, 0, 2.8] },
    { familyId: 'bollard_railing', presetId: 'downtown_street_clock', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [1.8, 0, 0] },
    { familyId: 'street_bench', presetId: 'classic_park_wood_bench', groupKey: 'seating_patio', anchorId: 'sidewalk_front_right', localOffset: [-1.8, 0, 0] }
  ];
  if (lotLayout.enabled && (cfg.frontSetback || 0) >= 8.5) {
    specs.push({
      familyId: 'park_planter',
      presetId: 'ornamental_plaza_fountain',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_left',
      localOffset: [4.2, 0, -2.6]
    });
  }
  if (cfg.includeExteriorLighting !== false && lotLayout.enabled) {
    specs.push({ familyId: 'streetlight', presetId: 'downtown_double_boulevard_lamp', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [-0.9, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'city_hall_courthouse',
  categoryId: 'civic_government',
  categories: ['civic_government', 'municipal_community'],
  label: 'City Hall & Municipal Courthouses',
  description: 'Grand domed city halls, county courthouses, Art Deco municipal buildings, and historic town halls with clock towers.',
  environmentTags: ['civic', 'downtown', 'urban', 'superhero_city'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'compact_urban', 'none'],
  defaultObjectGroups: ['site_amenities', 'seating_patio', 'signage_lighting', 'rooftop_mep'],
  featureSchema: [
    {
      key: 'civicCrownStyle',
      label: 'Civic Crown Style',
      type: 'select',
      options: [
        ['dome_rotunda', 'Domed Rotunda'],
        ['clock_tower', 'Central Clock Tower'],
        ['art_deco_stepped', 'Stepped Art Deco Crown'],
        ['modern_cantilever', 'Modern Civic Canopy']
      ]
    },
    { key: 'porticoColumns', label: 'Portico Columns', type: 'range', min: 4, max: 8, step: 2 },
    { key: 'includeSideWings', label: 'Flanking Legislative Wings', type: 'boolean' }
  ],
  defaults: {
    width: 24,
    depth: 13,
    floors: 3,
    floorHeight: 3.9,
    exteriorMaterial: 'stone',
    primaryColor: '#cfc5b4',
    secondaryColor: '#e6dfd2',
    trimColor: '#36414c',
    accentColor: '#c99b3b',
    signageStyle: 'engraved_stone',
    signText: 'Paragon City Hall',
    civicCrownStyle: 'dome_rotunda',
    porticoColumns: 6,
    includeSideWings: true,
    includeRooftopHvac: true,
    lotType: 'civic_plaza',
    lotWidth: 52,
    lotDepth: 36,
    frontSetback: 10.5
  },
  presets: [
    {
      id: 'grand_domed_city_hall',
      label: 'Grand Domed City Hall',
      environmentTags: ['civic', 'downtown'],
      params: { width: 26, depth: 14, floors: 3, civicCrownStyle: 'dome_rotunda', porticoColumns: 6, exteriorMaterial: 'stone', primaryColor: '#d4cab8', accentColor: '#c99b3b', signText: 'City Hall' }
    },
    {
      id: 'classic_county_courthouse',
      label: 'Classic County Courthouse',
      environmentTags: ['civic', 'downtown'],
      params: { width: 22, depth: 13, floors: 3, civicCrownStyle: 'dome_rotunda', porticoColumns: 6, exteriorMaterial: 'stone', primaryColor: '#cbc0ad', accentColor: '#4c7a6b', signText: 'County Courthouse' }
    },
    {
      id: 'art_deco_municipal_building',
      label: 'Art Deco Municipal Building',
      environmentTags: ['civic', 'downtown', 'superhero_city'],
      params: { width: 24, depth: 13.5, floors: 4, architecturalEra: 'early_20th', civicCrownStyle: 'art_deco_stepped', porticoColumns: 4, exteriorMaterial: 'decorative_masonry', primaryColor: '#b8a996', accentColor: '#b58d3d', roofStyle: 'stepped', signText: 'Municipal Annex' }
    },
    {
      id: 'modern_civic_center',
      label: 'Modern Civic Center',
      environmentTags: ['civic', 'urban'],
      params: { width: 24, depth: 13, floors: 3, civicCrownStyle: 'modern_cantilever', porticoColumns: 4, exteriorMaterial: 'concrete', primaryColor: '#6f7d8c', accentColor: '#1f77b4', windowStyle: 'modern', signText: 'Civic Administration Center' }
    },
    {
      id: 'historic_town_hall',
      label: 'Historic Brick Clock Town Hall',
      environmentTags: ['civic', 'retro', 'suburban'],
      params: { width: 17, depth: 11, floors: 2, architecturalEra: 'early_20th', civicCrownStyle: 'clock_tower', porticoColumns: 4, exteriorMaterial: 'brick', primaryColor: '#8d4337', secondaryColor: '#e2d8c7', windowStyle: 'arched', includeSideWings: false, lotWidth: 36, lotDepth: 28, signText: 'Olde Town Hall' }
    }
  ],
  buildStructure: buildCityHallStructure,
  planObjects: planCityHallObjects
});

function buildLibraryMuseumStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 22, 12, 46);
  const d = clamp(cfg.depth || 13, 8, 30);
  const floors = clamp(cfg.floors || 2, 1, 6);
  const fh = cfg.floorHeight || 4.0;
  const totalH = floors * fh;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    entranceAwning: false,
    signY: Math.min(totalH - 0.38, fh + 0.35)
  });
  ctx.entrances.push(...shell.entrances);

  const trimMat = solidMaterial(cfg.trimColor || '#2f3a45');
  const stoneMat = solidMaterial(cfg.secondaryColor || '#e2dad0');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime });

  // Stepped entry plaza plinth
  addBox(attachedGroup, 0, 0.14, d * 0.5 + 1.15, Math.min(10, w * 0.48), 0.28, 2.3, stoneMat);

  // Decorative exhibition banner masts across front facade
  if (cfg.includeBannerPoles !== false) {
    const bannerColors = [cfg.accentColor || '#c94c24', '#2a7b9b', cfg.accentColor || '#c94c24', '#d9a441'];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const bx = -w * 0.38 + (i / (count - 1)) * (w * 0.76);
      if (Math.abs(bx) < 2.2) continue;
      addCylinder(attachedGroup, bx, Math.min(totalH * 0.5, 3.6), d * 0.5 + 0.32, 0.04, 0.04, Math.min(totalH * 0.75, 4.2), trimMat, 6);
      addBox(attachedGroup, bx, Math.min(totalH * 0.55, 3.8), d * 0.5 + 0.38, 0.65, 1.9, 0.04, solidMaterial(bannerColors[i % bannerColors.length]));
    }
  }

  let crownTopY = shell.roofTopY;
  const crown = cfg.culturalCrown || 'skylight_vault';
  if (crown === 'skylight_vault') {
    const vw = w * 0.58;
    const vd = d * 0.55;
    for (let s = 0; s < 4; s++) {
      const stepD = vd * (1 - s * 0.2);
      addBox(attachedGroup, 0, shell.roofTopY + 0.32 + s * 0.36, 0, vw, 0.38, stepD, glassMat);
    }
    crownTopY = shell.roofTopY + 1.85;
  } else if (crown === 'planetarium_dome') {
    const px = w * 0.5 + 4.4;
    const pRadius = 4.6;
    addCylinder(attachedGroup, px, 2.2, 0, pRadius, pRadius * 1.02, 4.4, surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 19, 3, 1), 16);
    addCylinder(attachedGroup, px, 4.85, 0, pRadius * 0.86, pRadius * 1.0, 0.95, stoneMat, 16);
    addCylinder(attachedGroup, px, 5.9, 0, pRadius * 0.55, pRadius * 0.86, 1.15, glassMat, 14);
    addCylinder(attachedGroup, px, 6.75, 0, 0.3, pRadius * 0.55, 0.6, trimMat, 12);
    registerBuildingFootprint(placementCtx, {
      id: 'planetarium_rotunda',
      minX: px - pRadius,
      maxX: px + pRadius,
      minZ: -pRadius,
      maxZ: pRadius,
      maxY: 7.0
    });
    crownTopY = Math.max(crownTopY, 7.1);
  } else if (crown === 'cantilever_gallery') {
    const gx = -w * 0.12;
    const gz = d * 0.5 + 1.4;
    const gh = Math.max(3.4, fh);
    addBox(attachedGroup, gx, totalH - gh * 0.45, gz, w * 0.62, gh, 2.8, solidMaterial(cfg.accentColor || '#264653'));
    addBox(attachedGroup, gx - w * 0.24, (totalH - gh) * 0.5, gz + 0.8, 0.42, totalH - gh, 0.42, trimMat);
    addBox(attachedGroup, gx + w * 0.24, (totalH - gh) * 0.5, gz + 0.8, 0.42, totalH - gh, 0.42, trimMat);
  } else {
    // classical_pediment
    for (let c = 0; c < 4; c++) {
      const cx = -3.0 + (c / 3) * 6.0;
      addCylinder(attachedGroup, cx, totalH * 0.46, d * 0.5 + 1.1, 0.24, 0.28, totalH * 0.86, stoneMat, 10);
    }
    addBox(attachedGroup, 0, totalH * 0.9 + 0.25, d * 0.5 + 0.65, 7.6, 0.44, 1.8, stoneMat);
  }

  registerBuildingFootprint(placementCtx, { id: 'library_museum_body', minX: -w * 0.5, maxX: w * 0.5, minZ: -d * 0.5, maxZ: d * 0.5, maxY: totalH });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.45, maxX: w * 0.45, minZ: -d * 0.45, maxZ: d * 0.45, y: shell.roofTopY });

  ctx.roofTopY = shell.roofTopY;
  ctx.buildingBounds = { width: crown === 'planetarium_dome' ? w + 9.2 : w, depth: d + 2.8, height: crownTopY };
  ctx.lotOptions = { rearMargin: 4.0 };
}

function planLibraryMuseumObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'street_bench', presetId: 'downtown_metal_slat_bench', groupKey: 'seating_patio', anchorId: 'entrance_main', localOffset: [-3.2, 0, 2.0] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [3.2, 0, 2.0] },
    { familyId: 'newspaper_box', presetId: 'sidewalk_a_frame_sign', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.8, 0, 1.4] },
    { familyId: 'bike_rack', presetId: 'city_bike_share_dock_station', groupKey: 'site_amenities', anchorId: 'sidewalk_front_right', localOffset: [-1.2, 0, 0] }
  ];
  if (lotLayout.enabled && (cfg.frontSetback || 0) >= 8.0) {
    specs.push({ familyId: 'park_planter', presetId: 'ornamental_plaza_fountain', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [4.0, 0, -2.2] });
  }
  if (cfg.includeExteriorLighting !== false && lotLayout.enabled) {
    specs.push({ familyId: 'streetlight', presetId: 'heritage_acorn_streetlamp', groupKey: 'signage_lighting', anchorId: 'sidewalk_front_left', localOffset: [-0.8, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'library_museum',
  categoryId: 'municipal_community',
  categories: ['municipal_community', 'civic_government', 'entertainment_recreation'],
  label: 'Public Libraries & Museums',
  description: 'Carnegie stone libraries, skylit natural history museums, cantilevered modern art galleries, and science planetariums.',
  environmentTags: ['civic', 'urban', 'downtown', 'campus'],
  supportedLotTypes: ['civic_plaza', 'standalone_commercial', 'compact_urban', 'none'],
  defaultObjectGroups: ['site_amenities', 'seating_patio', 'signage_lighting', 'rooftop_mep'],
  featureSchema: [
    {
      key: 'culturalCrown',
      label: 'Cultural Crown / Wing',
      type: 'select',
      options: [
        ['skylight_vault', 'Glass Skylight Atrium'],
        ['planetarium_dome', 'Planetarium Dome'],
        ['classical_pediment', 'Classical Pediment'],
        ['cantilever_gallery', 'Modern Cantilever Wing']
      ]
    },
    { key: 'includeBannerPoles', label: 'Exhibition Banner Poles', type: 'boolean' }
  ],
  defaults: {
    width: 22,
    depth: 13,
    floors: 2,
    floorHeight: 4.1,
    exteriorMaterial: 'stone',
    primaryColor: '#cfc5b4',
    secondaryColor: '#e6dfd3',
    trimColor: '#2d3742',
    accentColor: '#b84a39',
    signageStyle: 'engraved_stone',
    signText: 'Central Public Library',
    culturalCrown: 'skylight_vault',
    includeBannerPoles: true,
    lotType: 'civic_plaza',
    lotWidth: 48,
    lotDepth: 34,
    frontSetback: 9.5
  },
  presets: [
    {
      id: 'carnegie_public_library',
      label: 'Carnegie Stone Public Library',
      environmentTags: ['civic', 'urban', 'retro'],
      params: { width: 19, depth: 11.5, floors: 2, architecturalEra: 'early_20th', culturalCrown: 'classical_pediment', exteriorMaterial: 'stone', primaryColor: '#d4c9b8', windowStyle: 'arched', signText: 'Carnegie Public Library' }
    },
    {
      id: 'grand_natural_history_museum',
      label: 'Grand Natural History Museum',
      environmentTags: ['civic', 'downtown'],
      params: { width: 28, depth: 15, floors: 3, culturalCrown: 'skylight_vault', exteriorMaterial: 'stone', primaryColor: '#cfc3ae', accentColor: '#a63a2e', signText: 'Museum of Natural History', lotWidth: 56, lotDepth: 40 }
    },
    {
      id: 'modern_art_gallery',
      label: 'Modern Contemporary Art Gallery',
      environmentTags: ['urban', 'downtown'],
      params: { width: 22, depth: 12.5, floors: 2, culturalCrown: 'cantilever_gallery', exteriorMaterial: 'concrete', primaryColor: '#dde2e7', accentColor: '#1d4e6b', windowStyle: 'modern', signText: 'Metro Modern Art Gallery' }
    },
    {
      id: 'metropolitan_central_library',
      label: 'Metropolitan Central Library',
      environmentTags: ['civic', 'downtown', 'campus'],
      params: { width: 24, depth: 14, floors: 3, culturalCrown: 'skylight_vault', exteriorMaterial: 'decorative_masonry', primaryColor: '#b38e6d', accentColor: '#2b6cb0', signText: 'Metropolitan Library' }
    },
    {
      id: 'city_science_planetarium',
      label: 'City Science & Space Planetarium',
      environmentTags: ['civic', 'campus', 'urban'],
      params: { width: 20, depth: 13, floors: 2, culturalCrown: 'planetarium_dome', exteriorMaterial: 'concrete', primaryColor: '#566573', accentColor: '#00a8e8', signText: 'City Science Planetarium', lotWidth: 54, lotDepth: 36 }
    }
  ],
  buildStructure: buildLibraryMuseumStructure,
  planObjects: planLibraryMuseumObjects
});

function addCampusBasketballCourt(parent, x, z, w, d, fenceMat, rimColor) {
  const courtMat = solidMaterial('#2e3740');
  const lineMat = solidMaterial('#edf2f7');
  const postMat = solidMaterial('#3a424b');
  const boardMat = solidMaterial('#ffffff');
  const hoopMat = solidMaterial(rimColor || '#e85d04');

  addBox(parent, x, 0.04, z, w, 0.08, d, courtMat);
  // Boundary & center lines
  addBox(parent, x, 0.085, z, w - 0.8, 0.02, 0.08, lineMat, { cast: false });
  addBox(parent, x - w * 0.44, 0.085, z, 0.08, 0.02, d - 0.8, lineMat, { cast: false });
  addBox(parent, x + w * 0.44, 0.085, z, 0.08, 0.02, d - 0.8, lineMat, { cast: false });
  addBox(parent, x, 0.085, z - d * 0.44, w - 0.8, 0.02, 0.08, lineMat, { cast: false });
  addBox(parent, x, 0.085, z + d * 0.44, w - 0.8, 0.02, 0.08, lineMat, { cast: false });

  // Two basketball stanchions & backboards at ends
  for (const sz of [-1, 1]) {
    const bz = z + sz * (d * 0.42);
    addCylinder(parent, x, 1.6, bz + sz * 0.25, 0.08, 0.1, 3.2, postMat, 8);
    addBox(parent, x, 2.95, bz, 1.4, 0.9, 0.08, boardMat);
    addCylinder(parent, x, 2.68, bz - sz * 0.28, 0.24, 0.24, 0.05, hoopMat, 10);
  }

  // Low Perimeter Rec Fence
  addBox(parent, x - w * 0.5, 0.9, z, 0.06, 1.8, d, fenceMat);
  addBox(parent, x, 0.9, z - d * 0.5, w, 1.8, 0.06, fenceMat);
  addBox(parent, x, 0.9, z + d * 0.5, w, 1.8, 0.06, fenceMat);
}

function buildSchoolUniversityStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width || 22, 12, 48);
  const d = clamp(cfg.depth || 11.5, 7.5, 28);
  const floors = clamp(cfg.floors || 2, 1, 6);
  const fh = cfg.floorHeight || 3.6;
  const totalH = floors * fh;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    entranceAwning: false,
    signY: Math.min(totalH - 0.35, fh + 0.3)
  });
  ctx.entrances.push(...shell.entrances);

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 19, 3, 2);
  const stoneMat = solidMaterial(cfg.secondaryColor || '#e2d9c9');
  const trimMat = solidMaterial(cfg.trimColor || '#2c3947');

  // Arched / stone entry surround + front flagpole
  addBox(attachedGroup, 0, fh * 0.5, d * 0.5 + 0.28, 4.4, fh, 0.56, stoneMat);
  addCivicFlagpole(attachedGroup, -4.4, 0, d * 0.5 + 2.4, '#dce2e8', cfg.accentColor || '#1e4d92');

  let crownTop = shell.roofTopY;
  if (cfg.includeBellTower) {
    const faceMat = emissiveMaterial('#fff3d1', 0.85, cfg.lightingTime);
    crownTop = addCivicClockTowerCrown(attachedGroup, 0, shell.roofTopY, d * 0.1, 3.2, 4.8, wallMat, trimMat, faceMat);
  }

  let leftBound = -w * 0.5;
  let rightBound = w * 0.5;

  // Attached High-Ceiling Gymnasium / Auditorium Wing on Right Side
  if (cfg.includeGymWing) {
    const gw = 10.5;
    const gd = Math.max(d + 2.6, 13.5);
    const gh = Math.max(totalH, 6.8);
    const gx = w * 0.5 + gw * 0.5 - 0.1;
    addBox(attachedGroup, gx, gh * 0.5, -0.3, gw, gh, gd, wallMat);
    addRoofStructure(attachedGroup, gx, gh, -0.3, gw, gd, { ...cfg, roofStyle: 'flat' });
    // Clerestory gym windows high along walls
    const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime });
    addBox(attachedGroup, gx, gh - 1.1, -0.3 + gd * 0.5 + 0.04, gw * 0.72, 0.9, 0.08, glassMat, { cast: false });
    addDoorUnit(attachedGroup, gx, 0, -0.3 + gd * 0.5, 2.0, 2.3, cfg, { solidDoor: true });
    registerBuildingFootprint(placementCtx, { id: 'school_gym_wing', minX: gx - gw * 0.5, maxX: gx + gw * 0.5, minZ: -0.3 - gd * 0.5, maxZ: -0.3 + gd * 0.5, maxY: gh });
    rightBound = gx + gw * 0.5;
  }

  // Outdoor Basketball / Recreation Court on Left Side
  if (cfg.includeSportsCourt) {
    const cw = 8.4;
    const cd = Math.max(12.2, d + 1.0);
    const cx = -w * 0.5 - cw * 0.5 - 1.2;
    addCampusBasketballCourt(attachedGroup, cx, 0, cw, cd, solidMaterial('#687482'), cfg.accentColor);
    registerBuildingFootprint(placementCtx, { id: 'school_sports_court', minX: cx - cw * 0.5, maxX: cx + cw * 0.5, minZ: -cd * 0.5, maxZ: cd * 0.5, maxY: 3.5 });
    leftBound = cx - cw * 0.5;
  }

  registerBuildingFootprint(placementCtx, { id: 'school_main_hall', minX: -w * 0.5, maxX: w * 0.5, minZ: -d * 0.5, maxZ: d * 0.5, maxY: totalH });
  registerRoofBound(placementCtx, { id: 'main_roof', minX: -w * 0.45, maxX: w * 0.45, minZ: -d * 0.45, maxZ: d * 0.45, y: shell.roofTopY });

  ctx.roofTopY = shell.roofTopY;
  ctx.buildingBounds = { width: rightBound - leftBound, depth: Math.max(d, 14.5) + 1.5, height: crownTop };
  ctx.lotOptions = { rearMargin: 4.5 };
}

function planSchoolUniversityObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'bike_rack', presetId: 'serpentine_wave_bike_rack', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [3.2, 0, 1.4] },
    { familyId: 'emergency_safety', presetId: 'campus_emergency_call_box', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] },
    { familyId: 'park_planter', presetId: 'park_drinking_fountain', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-2.6, 0, 1.6] },
    { familyId: 'street_bench', presetId: 'classic_park_wood_bench', groupKey: 'seating_patio', anchorId: 'sidewalk_front_right', localOffset: [-1.4, 0, 0] }
  ];
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'newspaper_box', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'school_university',
  categoryId: 'municipal_community',
  categories: ['municipal_community', 'civic_government'],
  label: 'Schools & University Campus Halls',
  description: 'Elementary & high schools with gymnasiums and basketball courts, urban academies, and university academic halls.',
  environmentTags: ['campus', 'civic', 'suburban', 'urban'],
  supportedLotTypes: ['multi_building_facility', 'civic_plaza', 'standalone_commercial', 'compact_urban', 'none'],
  defaultObjectGroups: ['site_amenities', 'seating_patio', 'signage_lighting', 'rooftop_mep', 'waste_utility'],
  featureSchema: [
    { key: 'includeGymWing', label: 'Attached Gymnasium / Auditorium Wing', type: 'boolean' },
    { key: 'includeSportsCourt', label: 'Outdoor Basketball / Rec Court', type: 'boolean' },
    { key: 'includeBellTower', label: 'Central Clock / Bell Tower', type: 'boolean' }
  ],
  defaults: {
    width: 24,
    depth: 12,
    floors: 2,
    floorHeight: 3.6,
    exteriorMaterial: 'brick',
    primaryColor: '#994c3d',
    secondaryColor: '#e2d8c7',
    trimColor: '#2c3947',
    accentColor: '#1e4d92',
    signText: 'Paragon High School',
    includeGymWing: true,
    includeSportsCourt: true,
    includeBellTower: true,
    lotType: 'multi_building_facility',
    lotWidth: 56,
    lotDepth: 38,
    frontSetback: 9.0
  },
  presets: [
    {
      id: 'neighborhood_elementary_school',
      label: 'Neighborhood Elementary School',
      environmentTags: ['suburban', 'campus', 'civic'],
      params: { width: 20, depth: 11, floors: 2, includeGymWing: true, includeSportsCourt: true, includeBellTower: false, primaryColor: '#a65744', accentColor: '#2d7a47', signText: 'Oakridge Elementary' }
    },
    {
      id: 'classic_brick_high_school',
      label: 'Classic Brick High School Campus',
      environmentTags: ['suburban', 'urban', 'campus'],
      params: { width: 28, depth: 12.5, floors: 3, includeGymWing: true, includeSportsCourt: true, includeBellTower: true, primaryColor: '#8f3f34', lotWidth: 62, lotDepth: 42, signText: 'Central High School' }
    },
    {
      id: 'urban_charter_academy',
      label: 'Urban Charter School Building',
      environmentTags: ['urban', 'campus'],
      params: { width: 17, depth: 10.5, floors: 3, includeGymWing: false, includeSportsCourt: false, includeBellTower: false, exteriorMaterial: 'brick', lotType: 'compact_urban', lotWidth: 30, lotDepth: 24, signText: 'Harbor Charter Academy' }
    },
    {
      id: 'university_science_hall',
      label: 'University Science & Engineering Hall',
      environmentTags: ['campus', 'civic'],
      params: { width: 24, depth: 13, floors: 3, includeGymWing: false, includeSportsCourt: false, includeBellTower: true, exteriorMaterial: 'stone', primaryColor: '#cfc5b4', accentColor: '#2563eb', windowStyle: 'modern', lotType: 'civic_plaza', signText: 'Science Hall' }
    },
    {
      id: 'historic_collegiate_hall',
      label: 'Historic Collegiate Gothic Hall',
      environmentTags: ['campus', 'retro', 'civic'],
      params: { width: 22, depth: 12, floors: 3, architecturalEra: 'early_20th', includeGymWing: false, includeSportsCourt: false, includeBellTower: true, exteriorMaterial: 'brick', primaryColor: '#7a3b34', windowStyle: 'arched', roofStyle: 'pitched', lotType: 'civic_plaza', signText: 'Founders Hall' }
    }
  ],
  buildStructure: buildSchoolUniversityStructure,
  planObjects: planSchoolUniversityObjects
});
