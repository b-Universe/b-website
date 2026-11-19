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
  addDoorUnit,
  addFacadeWindows,
  addRoofStructure,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function buildHospitalClinicStructure(ctx) {
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
    entranceAwning: false,
    signY: floors * fh - 0.36
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Main Hospital Drop-Off Portico Canopy + Signature Red Medical Cross
  const canopyMat = solidMaterial(cfg.trimColor || '#2f455c');
  const postMat = solidMaterial('#d8e0e6');
  const crossRed = emissiveMaterial('#e62e2e', 1.0);
  addBox(attachedGroup, 0, 3.15, d * 0.5 + 1.45, 5.2, 0.34, 2.9, canopyMat);
  addBox(attachedGroup, -2.2, 1.55, d * 0.5 + 2.65, 0.28, 3.0, 0.28, postMat);
  addBox(attachedGroup, 2.2, 1.55, d * 0.5 + 2.65, 0.28, 3.0, 0.28, postMat);

  // Illuminated Red Cross above main entrance
  addBox(attachedGroup, 0, Math.min(floors * fh - 1.1, 4.4), d * 0.5 + 0.14, 0.42, 1.35, 0.12, crossRed, { cast: false });
  addBox(attachedGroup, 0, Math.min(floors * fh - 1.1, 4.4), d * 0.5 + 0.14, 1.35, 0.42, 0.12, crossRed, { cast: false });

  // Secondary Patient Wings (L / H layout for hospitals)
  let totalWidth = w;
  if (cfg.includeSideWings) {
    const ww = 6.2;
    const wd = d + 3.4;
    const wFloors = Math.max(1, floors - 1);
    const wh = wFloors * fh;
    const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + 41, 2, wFloors);

    for (const side of [-1, 1]) {
      const wx = side * (w * 0.5 + ww * 0.5 - 0.2);
      const wz = 0.6;
      addBox(attachedGroup, wx, wh * 0.5, wz, ww, wh, wd, wallMat);
      addBox(attachedGroup, wx, wh + 0.14, wz, ww + 0.2, 0.28, wd + 0.2, canopyMat);
      addFacadeWindows(attachedGroup, 'front', wx, wz + wd * 0.5, ww, { ...cfg, floors: wFloors }, ctx.r);
      addFacadeWindows(attachedGroup, 'back', wx, wz - wd * 0.5, ww, { ...cfg, floors: wFloors }, ctx.r);
      addFacadeWindows(attachedGroup, side < 0 ? 'left' : 'right', wx + side * ww * 0.5, wz, wd, { ...cfg, floors: wFloors }, ctx.r);
      registerBuildingFootprint(placementCtx, {
        id: side < 0 ? 'hospital_west_wing' : 'hospital_east_wing',
        minX: wx - ww * 0.5,
        maxX: wx + ww * 0.5,
        minZ: wz - wd * 0.5,
        maxZ: wz + wd * 0.5,
        maxY: wh
      });
    }
    totalWidth = w + ww * 2;
  }

  // Dedicated Ambulance / ER Emergency Drop-off Canopy & Door on Right End
  if (cfg.includeEmergencyBay !== false) {
    const ex = (cfg.includeSideWings ? w * 0.5 + 5.8 : w * 0.5) + 0.02;
    const ez = 0.8;
    const erCanopyW = 3.8;
    const erCanopyD = 5.4;
    addDoorUnit(attachedGroup, ex, 0, ez, 2.2, 2.4, cfg, { rotY: Math.PI / 2, solidDoor: false });
    addBox(attachedGroup, ex + erCanopyW * 0.5, 3.25, ez, erCanopyW, 0.34, erCanopyD, solidMaterial('#c92a2a'));
    addBox(attachedGroup, ex + erCanopyW - 0.24, 1.6, ez + erCanopyD * 0.4, 0.28, 3.1, 0.28, postMat);
    addBox(attachedGroup, ex + erCanopyW - 0.24, 1.6, ez - erCanopyD * 0.4, 0.28, 3.1, 0.28, postMat);
    addSignboardUnit(attachedGroup, ex + erCanopyW * 0.5, 3.6, ez + erCanopyD * 0.5 + 0.06, 3.2, 0.58, 'Emergency', '#9e1919', '#ffffff', cfg);

    const erEnt = {
      id: 'emergency_ambulance_bay',
      role: 'emergency',
      label: 'Emergency Ambulance Entrance',
      position: { x: roundNum(ex, 3), y: 0, z: roundNum(ez, 3) },
      normal: { x: 1, y: 0, z: 0 },
      width: 3.0,
      height: 2.5
    };
    ctx.entrances.push(erEnt);
    registerEntranceClearance(placementCtx, erEnt);
    registerLaneClearance(placementCtx, {
      id: 'ambulance_dropoff_lane',
      kind: 'ambulance',
      minX: ex + 0.2,
      maxX: ex + erCanopyW + 0.6,
      minZ: ez - erCanopyD,
      maxZ: ez + erCanopyD
    });
    totalWidth += erCanopyW * 2;
  }

  // Optional Rooftop Helipad Deck
  if (cfg.includeHelipad) {
    const ry = shell.roofTopY;
    addBox(attachedGroup, 0, ry + 0.12, 0, 6.4, 0.2, 6.4, solidMaterial('#3a424b'));
    addBox(attachedGroup, -0.75, ry + 0.23, 0, 0.36, 0.04, 2.4, solidMaterial('#f2c14e'));
    addBox(attachedGroup, 0.75, ry + 0.23, 0, 0.36, 0.04, 2.4, solidMaterial('#f2c14e'));
    addBox(attachedGroup, 0, ry + 0.23, 0, 1.5, 0.04, 0.36, solidMaterial('#f2c14e'));
    for (const sx of [-2.9, 2.9]) {
      for (const sz of [-2.9, 2.9]) {
        addBox(attachedGroup, sx, ry + 0.26, sz, 0.24, 0.12, 0.24, emissiveMaterial('#22c55e', 1.1), { cast: false });
      }
    }
  }

  registerAnchor(placementCtx, {
    id: 'ambulance_dropoff_curb',
    category: 'sidewalk',
    position: [0, 0.04, d * 0.5 + 3.2],
    surfaceY: 0.04,
    rotationY: 0
  });

  ctx.buildingBounds = { width: totalWidth, depth: d + 3.5, height: shell.roofTopY + 0.8 };
  ctx.lotOptions = { rearMargin: 5.0 };
}

function planHospitalObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'street_bench', presetId: 'downtown_metal_slat_bench', groupKey: 'seating_patio', anchorId: 'entrance_main', localOffset: [-2.8, 0, 1.1] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.8, 0, 1.1] },
    { familyId: 'emergency_safety', presetId: 'municipal_red_fire_hydrant', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [1.4, 0, 0] }
  ];
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'newspaper_box', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'hospital_clinic',
  categoryId: 'emergency_healthcare',
  categories: ['emergency_healthcare', 'civic_government'],
  label: 'Hospitals & Urgent Care Clinics',
  description: 'Neighborhood clinics, urgent care centers, multi-wing community hospitals, and regional trauma hospitals.',
  environmentTags: ['medical', 'civic', 'urban', 'suburban'],
  supportedLotTypes: ['civic_plaza', 'multi_building_facility', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['seating_patio', 'site_amenities', 'rooftop_mep', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    { key: 'includeSideWings', label: 'Lateral Patient Wings', type: 'boolean' },
    { key: 'includeEmergencyBay', label: 'Emergency Ambulance Canopy', type: 'boolean' },
    { key: 'includeHelipad', label: 'Rooftop Helipad', type: 'boolean' }
  ],
  defaults: {
    width: 15.8,
    depth: 10.2,
    floors: 3,
    floorHeight: 3.6,
    exteriorMaterial: 'concrete',
    primaryColor: '#dde2e7',
    trimColor: '#24486b',
    accentColor: '#d92b2b',
    signText: 'Mercy General Hospital',
    includeSideWings: true,
    includeEmergencyBay: true,
    includeHelipad: true,
    includeServiceEntrance: true,
    includeRooftopHvac: true,
    lotType: 'multi_building_facility',
    frontSetback: 9.0
  },
  presets: [
    { id: 'neighborhood_clinic', label: 'Neighborhood Medical Clinic', environmentTags: ['medical', 'urban'], params: { width: 11.2, depth: 8.2, floors: 1, includeSideWings: false, includeEmergencyBay: false, includeHelipad: false, exteriorMaterial: 'brick', primaryColor: '#b56e5c', signText: 'Oakwood Family Clinic', lotType: 'standalone_commercial' } },
    { id: 'urgent_care_center', label: 'Urgent Care Medical Center', environmentTags: ['medical', 'suburban'], params: { width: 13.4, depth: 8.8, floors: 1, includeSideWings: false, includeEmergencyBay: true, includeHelipad: false, primaryColor: '#e6eaee', accentColor: '#e63946', signText: 'RapidCare Urgent Care', lotType: 'standalone_commercial' } },
    { id: 'community_multi_wing_hospital', label: 'Community Multi-Wing Hospital', environmentTags: ['medical', 'suburban', 'civic'], params: { width: 15.6, depth: 10.2, floors: 3, includeSideWings: true, includeEmergencyBay: true, includeHelipad: false, signText: 'Harbor Community Hospital' } },
    { id: 'large_regional_hospital', label: 'Large Regional Trauma Hospital', environmentTags: ['medical', 'downtown', 'civic'], params: { width: 18.4, depth: 11.4, floors: 4, includeSideWings: true, includeEmergencyBay: true, includeHelipad: true, signText: 'Metro Trauma Center' } },
    { id: 'modern_glass_hospital', label: 'Modern Glass Medical Center', environmentTags: ['medical', 'modern', 'downtown'], params: { width: 16.8, depth: 10.6, floors: 4, windowStyle: 'modern', primaryColor: '#cfd8df', trimColor: '#1b3b5a', accentColor: '#00a8e8', includeHelipad: true, signText: 'Paragon Medical Pavilion' } },
    { id: 'older_brick_hospital', label: 'Historic Brick Civic Hospital', environmentTags: ['medical', 'retro', 'urban'], params: { width: 15.0, depth: 9.8, floors: 3, architecturalEra: 'historical', exteriorMaterial: 'brick', primaryColor: '#8d4337', trimColor: '#d4cab8', windowStyle: 'sash', includeHelipad: false, signText: 'St. Jude Memorial Hospital' } }
  ],
  buildStructure: buildHospitalClinicStructure,
  planObjects: planHospitalObjects
});

function addHospitalMassBlock(parent, x, baseY, z, w, d, floors, fh, cfg, r, seedOffset = 0) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z);
  const totalH = floors * fh;
  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed + seedOffset, Math.max(2, Math.round(w / 4)), Math.max(1, floors));
  const trimMat = solidMaterial(cfg.trimColor || '#1f456e');

  addBox(g, 0, totalH * 0.5, 0, w, totalH, d, wallMat);
  for (let f = 1; f < floors; f++) {
    addBox(g, 0, f * fh, 0, w + 0.16, 0.14, d + 0.16, trimMat);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, sx * (w * 0.5), totalH * 0.5, sz * (d * 0.5), 0.3, totalH, 0.3, trimMat);
    }
  }

  const subCfg = { ...cfg, floors, floorHeight: fh };
  addFacadeWindows(g, 'front', 0, d * 0.5, w, subCfg, r);
  addFacadeWindows(g, 'back', 0, -d * 0.5, w, subCfg, r);
  addFacadeWindows(g, 'left', -w * 0.5, 0, d, subCfg, r);
  addFacadeWindows(g, 'right', w * 0.5, 0, d, subCfg, r);

  const localRoofTop = addRoofStructure(g, 0, totalH, 0, w, d, subCfg);
  parent.add(g);
  return baseY + localRoofTop;
}

function buildLargeHospitalStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx, r } = ctx;
  const w = clamp(cfg.width || 28, 16, 48);
  const d = clamp(cfg.depth || 15, 10, 32);
  const totalFloors = clamp(cfg.floors || 6, 4, 12);
  const fh = cfg.floorHeight || 3.6;
  const podiumFloors = 2;
  const podiumH = podiumFloors * fh;
  const upperFloors = Math.max(2, totalFloors - podiumFloors);

  // 1. Two-story clinical podium base
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors: podiumFloors,
    floorHeight: fh,
    entranceAwning: false,
    signY: podiumH - 0.35
  });
  ctx.entrances.push(...shell.entrances);

  const trimMat = solidMaterial(cfg.trimColor || '#1f456e');
  const postMat = solidMaterial(cfg.secondaryColor || '#d8e0e6');
  const crossRed = emissiveMaterial(cfg.accentColor || '#e62e2e', 1.1, cfg.lightingTime);
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night' || cfg.lightingTime === 'dusk', { lightingTime: cfg.lightingTime });

  // Double-height glazed lobby curtain bay & grand drop-off porte-cochere
  addBox(attachedGroup, 0, podiumH * 0.48, d * 0.5 + 0.16, Math.min(8.4, w * 0.34), podiumH * 0.86, 0.35, glassMat);
  const canopyW = Math.min(9.2, w * 0.38);
  const canopyD = 4.2;
  addBox(attachedGroup, 0, 3.55, d * 0.5 + canopyD * 0.5, canopyW, 0.42, canopyD, trimMat);
  for (const cx of [-canopyW * 0.44, -canopyW * 0.16, canopyW * 0.16, canopyW * 0.44]) {
    addBox(attachedGroup, cx, 1.72, d * 0.5 + canopyD - 0.25, 0.32, 3.35, 0.32, postMat);
  }
  addBox(attachedGroup, 0, 0.12, d * 0.5 + canopyD * 0.48, canopyW + 1.2, 0.24, canopyD + 0.4, postMat);

  // 2. Upper Inpatient Towers driven by campusLayout
  const layout = cfg.campusLayout || 'twin_towers';
  let topTowerY = shell.roofTopY;
  let maxDepth = d + canopyD + 0.6;
  let leftExtent = -w * 0.5;
  let rightExtent = w * 0.5;
  let helipadPos = { x: 0, z: 0 };

  if (layout === 'h_campus') {
    const spineTop = addHospitalMassBlock(attachedGroup, 0, podiumH, -d * 0.12, w * 0.56, d * 0.52, upperFloors, fh, cfg, r, 11);
    const wingW = Math.max(5.8, w * 0.24);
    const wingD = d + 4.4;
    const westTop = addHospitalMassBlock(attachedGroup, -w * 0.4, 0, 0.4, wingW, wingD, totalFloors - 1, fh, cfg, r, 23);
    const eastTop = addHospitalMassBlock(attachedGroup, w * 0.4, 0, 0.4, wingW, wingD, totalFloors - 1, fh, cfg, r, 37);
    registerBuildingFootprint(placementCtx, { id: 'hospital_west_bar', minX: -w * 0.4 - wingW * 0.5, maxX: -w * 0.4 + wingW * 0.5, minZ: 0.4 - wingD * 0.5, maxZ: 0.4 + wingD * 0.5, maxY: westTop });
    registerBuildingFootprint(placementCtx, { id: 'hospital_east_bar', minX: w * 0.4 - wingW * 0.5, maxX: w * 0.4 + wingW * 0.5, minZ: 0.4 - wingD * 0.5, maxZ: 0.4 + wingD * 0.5, maxY: eastTop });
    leftExtent = Math.min(leftExtent, -w * 0.4 - wingW * 0.5);
    rightExtent = Math.max(rightExtent, w * 0.4 + wingW * 0.5);
    maxDepth = Math.max(maxDepth, wingD + 2.0);
    topTowerY = spineTop;
    helipadPos = { x: 0, z: -d * 0.12 };
  } else if (layout === 'cruciform_tower') {
    const coreW = Math.max(9.6, w * 0.44);
    const coreD = Math.max(9.6, d * 0.68);
    const coreTop = addHospitalMassBlock(attachedGroup, 0, podiumH, 0, coreW, coreD, upperFloors + 1, fh, cfg, r, 19);
    const armW = Math.max(7.2, w * 0.88);
    const armD = Math.max(5.4, d * 0.36);
    addHospitalMassBlock(attachedGroup, 0, podiumH, 0, armW, armD, Math.max(2, upperFloors - 1), fh, cfg, r, 29);
    const depthArmW = Math.max(5.4, coreW * 0.52);
    const depthArmD = d + 3.2;
    addHospitalMassBlock(attachedGroup, 0, podiumH, 0, depthArmW, depthArmD, Math.max(2, upperFloors - 1), fh, cfg, r, 41);
    maxDepth = Math.max(maxDepth, depthArmD + 1.5);
    topTowerY = coreTop;
    helipadPos = { x: 0, z: 0 };
  } else if (layout === 'l_pavilion') {
    const mainTop = addHospitalMassBlock(attachedGroup, w * 0.1, podiumH, -d * 0.08, w * 0.72, d * 0.72, upperFloors, fh, cfg, r, 17);
    const wingW = Math.max(6.8, w * 0.28);
    const wingD = d + 4.8;
    const wingX = -w * 0.5 + wingW * 0.45;
    const wingTop = addHospitalMassBlock(attachedGroup, wingX, 0, 1.4, wingW, wingD, Math.max(3, totalFloors - 1), fh, cfg, r, 43);
    registerBuildingFootprint(placementCtx, { id: 'hospital_l_pavilion', minX: wingX - wingW * 0.5, maxX: wingX + wingW * 0.5, minZ: 1.4 - wingD * 0.5, maxZ: 1.4 + wingD * 0.5, maxY: wingTop });
    leftExtent = Math.min(leftExtent, wingX - wingW * 0.5);
    maxDepth = Math.max(maxDepth, wingD + 2.5);
    topTowerY = mainTop;
    helipadPos = { x: w * 0.1, z: -d * 0.08 };
  } else {
    // twin_towers default
    const towerW = Math.max(7.4, w * 0.38);
    const towerD = Math.max(7.4, d * 0.72);
    const offset = w * 0.24;
    const leftTop = addHospitalMassBlock(attachedGroup, -offset, podiumH, -d * 0.06, towerW, towerD, upperFloors, fh, cfg, r, 13);
    const rightTop = addHospitalMassBlock(attachedGroup, offset, podiumH, -d * 0.06, towerW, towerD, upperFloors, fh, cfg, r, 31);
    // Glazed central elevator atrium spine linking both towers
    const linkW = Math.max(2.6, offset * 2 - towerW + 1.2);
    const linkH = upperFloors * fh * 0.92;
    addBox(attachedGroup, 0, podiumH + linkH * 0.5, -d * 0.06, linkW, linkH, towerD * 0.62, glassMat);
    addBox(attachedGroup, 0, podiumH + linkH + 0.14, -d * 0.06, linkW + 0.2, 0.28, towerD * 0.66, trimMat);
    topTowerY = Math.max(leftTop, rightTop);
    helipadPos = { x: offset, z: -d * 0.06 };
  }

  // Glowing oversized hospital cross emblem mounted prominently on upper facade
  const emblemY = Math.max(podiumH + 2.2, topTowerY - 2.4);
  const emblemX = layout === 'twin_towers' ? -w * 0.24 : 0;
  const emblemZ = layout === 'twin_towers' ? d * 0.3 + 0.18 : d * 0.34 + 0.18;
  addBox(attachedGroup, emblemX, emblemY, emblemZ, 0.56, 1.9, 0.14, crossRed, { cast: false });
  addBox(attachedGroup, emblemX, emblemY, emblemZ, 1.9, 0.56, 0.14, crossRed, { cast: false });

  // Mechanical penthouse & stair bulkhead on top tower
  addBox(attachedGroup, helipadPos.x - 2.6, topTowerY + 0.7, helipadPos.z - 1.8, 3.2, 1.4, 2.8, solidMaterial('#78828c'));

  // 3. Elevated Rooftop Helipad
  let maxH = topTowerY + 1.6;
  if (cfg.includeHelipad !== false) {
    const hx = helipadPos.x;
    const hz = helipadPos.z;
    const deckY = topTowerY + 0.72;
    for (const sx of [-2.4, 2.4]) {
      for (const sz of [-2.4, 2.4]) {
        addBox(attachedGroup, hx + sx, topTowerY + 0.34, hz + sz, 0.32, 0.68, 0.32, trimMat);
      }
    }
    addBox(attachedGroup, hx, deckY, hz, 7.2, 0.24, 7.2, solidMaterial('#3a424b'));
    addBox(attachedGroup, hx - 0.9, deckY + 0.14, hz, 0.42, 0.05, 2.9, solidMaterial('#f2c14e'));
    addBox(attachedGroup, hx + 0.9, deckY + 0.14, hz, 0.42, 0.05, 2.9, solidMaterial('#f2c14e'));
    addBox(attachedGroup, hx, deckY + 0.14, hz, 1.8, 0.05, 0.42, solidMaterial('#f2c14e'));
    for (const sx of [-3.3, 3.3]) {
      for (const sz of [-3.3, 3.3]) {
        addBox(attachedGroup, hx + sx, deckY + 0.2, hz + sz, 0.26, 0.16, 0.26, emissiveMaterial('#22c55e', 1.2, cfg.lightingTime), { cast: false });
      }
    }
    // Safety perimeter apron & windsock mast
    addCylinder(attachedGroup, hx + 3.4, deckY + 0.85, hz - 3.3, 0.05, 0.07, 1.6, postMat, 6);
    addCylinder(attachedGroup, hx + 3.7, deckY + 1.45, hz - 3.3, 0.14, 0.07, 0.65, solidMaterial('#f97316'), 6, { rotZ: Math.PI / 2 });
    maxH = deckY + 1.8;
  }

  // 4. Multi-Bay Covered Ambulance Trauma Canopy & Hall on Right Flank
  if (cfg.includeEmergencyBay !== false) {
    const bays = clamp(cfg.ambulanceBays || 2, 1, 3);
    const ex = rightExtent + 0.02;
    const ez = 0.6;
    const erW = 4.6;
    const erD = bays * 3.8 + 1.4;
    addDoorUnit(attachedGroup, ex, 0, ez, 2.8, 2.6, cfg, { rotY: Math.PI / 2, solidDoor: false });
    addBox(attachedGroup, ex + erW * 0.5, 3.55, ez, erW, 0.42, erD, solidMaterial('#b82525'));
    for (let b = 0; b <= bays; b++) {
      const bz = ez - erD * 0.44 + (b / bays) * (erD * 0.88);
      addBox(attachedGroup, ex + erW - 0.26, 1.75, bz, 0.3, 3.3, 0.3, postMat);
    }
    addSignboardUnit(attachedGroup, ex + erW * 0.5, 3.92, ez + erD * 0.5 + 0.08, 3.8, 0.62, 'Emergency Trauma', '#8c1616', '#ffffff', cfg);
    addCylinder(attachedGroup, ex + erW - 0.3, 3.95, ez + erD * 0.46, 0.16, 0.16, 0.32, crossRed, 8, { cast: false });

    const erEnt = {
      id: 'large_hospital_er_trauma',
      role: 'emergency',
      label: `Trauma Ambulance Bay (${bays} Lanes)`,
      position: { x: roundNum(ex, 3), y: 0, z: roundNum(ez, 3) },
      normal: { x: 1, y: 0, z: 0 },
      width: erD * 0.72,
      height: 2.8
    };
    ctx.entrances.push(erEnt);
    registerEntranceClearance(placementCtx, erEnt);
    registerLaneClearance(placementCtx, {
      id: 'large_hospital_ambulance_lane',
      kind: 'ambulance',
      minX: ex + 0.25,
      maxX: ex + erW + 1.2,
      minZ: ez - erD * 0.65,
      maxZ: ez + erD * 0.65
    });
    rightExtent += erW + 0.5;
  }

  // 5. Attached Multi-Level Parking Deck or Diagnostic Annex + Elevated Glass Skybridge
  if (cfg.includeParkingDeck || cfg.includeSkybridge) {
    const laneGap = 4.6;
    const deckW = cfg.includeParkingDeck ? 9.8 : 7.8;
    const deckD = Math.max(10.5, d * 0.88);
    const deckFloors = cfg.includeParkingDeck ? 3 : 2;
    const deckH = deckFloors * 3.1;
    const px = leftExtent - laneGap - deckW * 0.5;
    const pz = 0.2;

    if (cfg.includeParkingDeck) {
      const deckMat = surfaceMaterial('concrete', '#788088', cfg.condition, cfg.seed + 61, 3, 2);
      const railMat = solidMaterial('#aeb6be');
      addBox(attachedGroup, px, 0.12, pz, deckW, 0.24, deckD, deckMat);
      for (let l = 1; l <= deckFloors; l++) {
        const ly = l * 3.1;
        addBox(attachedGroup, px, ly - 0.14, pz, deckW, 0.28, deckD, deckMat);
        // Perimeter parapet spandrel bumpers
        addBox(attachedGroup, px, ly + 0.42, pz + deckD * 0.5 - 0.12, deckW, 0.84, 0.22, railMat);
        addBox(attachedGroup, px, ly + 0.42, pz - deckD * 0.5 + 0.12, deckW, 0.84, 0.22, railMat);
        addBox(attachedGroup, px - deckW * 0.5 + 0.12, ly + 0.42, pz, 0.22, 0.84, deckD, railMat);
        addBox(attachedGroup, px + deckW * 0.5 - 0.12, ly + 0.42, pz, 0.22, 0.84, deckD, railMat);
      }
      for (const sx of [-1, 0, 1]) {
        for (const sz of [-1, 1]) {
          addBox(attachedGroup, px + sx * (deckW * 0.44), deckH * 0.5, pz + sz * (deckD * 0.44), 0.36, deckH, 0.36, trimMat);
        }
      }
      // Corner elevator/stair core with signage
      addBox(attachedGroup, px + deckW * 0.36, (deckH + 2.4) * 0.5, pz + deckD * 0.38, 2.4, deckH + 2.4, 2.4, surfaceMaterial('concrete', cfg.primaryColor, cfg.condition, cfg.seed + 71, 1, 2));
      addSignboardUnit(attachedGroup, px, 3.05, pz + deckD * 0.5 + 0.12, 3.4, 0.62, 'Hospital Parking', '#1d3557', '#ffffff', cfg);
      const parkEnt = {
        id: 'hospital_parking_deck_portal',
        role: 'garage',
        label: 'Visitor Parking Deck Entry',
        position: { x: roundNum(px - deckW * 0.12, 3), y: 0, z: roundNum(pz + deckD * 0.5, 3) },
        normal: { x: 0, y: 0, z: 1 },
        width: 4.2,
        height: 2.6
      };
      ctx.entrances.push(parkEnt);
      registerEntranceClearance(placementCtx, parkEnt);
    } else {
      addHospitalMassBlock(attachedGroup, px, 0, pz, deckW, deckD, 2, fh, cfg, r, 73);
      addSignboardUnit(attachedGroup, px, 2 * fh - 0.4, pz + deckD * 0.5 + 0.12, 4.2, 0.62, 'Outpatient Pavilion', trimMat.color ? cfg.trimColor : '#1f456e', '#ffffff', cfg);
    }

    registerBuildingFootprint(placementCtx, {
      id: 'hospital_west_complex',
      minX: px - deckW * 0.5,
      maxX: px + deckW * 0.5,
      minZ: pz - deckD * 0.5,
      maxZ: pz + deckD * 0.5,
      maxY: deckH
    });
    registerLaneClearance(placementCtx, {
      id: 'hospital_skybridge_drive_lane',
      kind: 'driveway',
      minX: px + deckW * 0.5 + 0.2,
      maxX: leftExtent - 0.2,
      minZ: -deckD * 0.6,
      maxZ: deckD * 0.6 + 2.0
    });

    // Elevated Glass Skybridge spanning drive lane cleanly at 2nd floor level
    if (cfg.includeSkybridge) {
      const spanLen = (leftExtent - (px + deckW * 0.5)) + 0.6;
      const midX = (px + deckW * 0.5 + leftExtent) * 0.5;
      const bridgeY = fh * 1.48;
      addBox(attachedGroup, midX, bridgeY - 0.95, 0.2, spanLen, 0.28, 2.9, trimMat);
      addBox(attachedGroup, midX, bridgeY + 1.05, 0.2, spanLen, 0.26, 2.9, trimMat);
      addBox(attachedGroup, midX, bridgeY + 0.05, 0.2, spanLen, 1.75, 2.65, glassMat);
    }

    leftExtent = px - deckW * 0.5;
  }

  // 6. Cryogenic Medical Oxygen Silo Yard on Rear Right
  if (cfg.includeOxygenYard !== false) {
    const oxX = w * 0.36;
    const oxZ = -d * 0.5 - 2.1;
    const tankMat = solidMaterial('#eef2f6');
    const bandMat = solidMaterial('#1d70b8');
    addBox(attachedGroup, oxX, 0.08, oxZ, 3.6, 0.16, 2.2, solidMaterial('#8d969e'));
    for (const sx of [-0.95, 0.95]) {
      addCylinder(attachedGroup, oxX + sx, 2.15, oxZ, 0.62, 0.62, 4.1, tankMat, 10);
      addCylinder(attachedGroup, oxX + sx, 3.4, oxZ, 0.64, 0.64, 0.34, bandMat, 10);
    }
    addCylinder(attachedGroup, oxX, 1.15, oxZ + 0.95, 0.1, 0.1, 1.9, solidMaterial('#6c7680'), 8, { rotX: Math.PI / 2 });
    registerBuildingFootprint(placementCtx, {
      id: 'hospital_oxygen_yard',
      minX: oxX - 1.9,
      maxX: oxX + 1.9,
      minZ: oxZ - 1.2,
      maxZ: oxZ + 1.2,
      maxY: 4.3
    });
  }

  registerBuildingFootprint(placementCtx, {
    id: 'large_hospital_podium',
    minX: -w * 0.5,
    maxX: w * 0.5,
    minZ: -d * 0.5,
    maxZ: d * 0.5,
    maxY: podiumH
  });
  registerRoofBound(placementCtx, {
    id: 'main_roof',
    minX: -w * 0.45,
    maxX: w * 0.45,
    minZ: -d * 0.45,
    maxZ: d * 0.45,
    y: topTowerY
  });
  registerAnchor(placementCtx, { id: 'roof_main', category: 'roof', position: [-w * 0.2, topTowerY, -d * 0.1], surfaceY: topTowerY, rotationY: 0 });
  registerAnchor(placementCtx, { id: 'roof_center', category: 'roof', position: [0, topTowerY, 0], surfaceY: topTowerY, rotationY: 0 });

  ctx.roofTopY = topTowerY;
  ctx.buildingBounds = {
    width: Math.max(w, rightExtent - leftExtent),
    depth: Math.max(maxDepth, d + canopyD + 2.4),
    height: maxH
  };
  ctx.lotOptions = { rearMargin: 6.0 };
}

function planLargeHospitalObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'emergency_safety', presetId: 'checkpoint_security_booth', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-6.0, 0, 1.8] },
    { familyId: 'emergency_safety', presetId: 'campus_emergency_call_box', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [4.6, 0, 1.8] },
    { familyId: 'emergency_safety', presetId: 'municipal_red_fire_hydrant', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-3.4, 0, 2.2] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [3.4, 0, 2.2] },
    { familyId: 'street_bench', presetId: 'downtown_metal_slat_bench', groupKey: 'seating_patio', anchorId: 'entrance_main', localOffset: [-4.6, 0, 3.6] },
    { familyId: 'bike_rack', presetId: 'stainless_u_loop_rack', groupKey: 'site_amenities', anchorId: 'sidewalk_front_right', localOffset: [-1.4, 0, 0] }
  ];
  if (lotLayout.enabled && (cfg.frontSetback || 0) >= 8.5) {
    specs.push({
      familyId: 'park_planter',
      presetId: 'ornamental_plaza_fountain',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_left',
      localOffset: [4.5, 0, -2.5]
    });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({
      familyId: 'newspaper_box',
      presetId: 'illuminated_city_ad_totem',
      groupKey: 'signage_lighting',
      anchorId: 'roadside_sign_corner',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'large_hospital_complex',
  categoryId: 'emergency_healthcare',
  categories: ['emergency_healthcare', 'civic_government'],
  label: 'Large Hospitals & Medical Complexes',
  description: 'Multi-tower metropolitan hospitals, teaching medical centers, trauma towers with skybridges, parking decks, and rooftop helipads.',
  environmentTags: ['medical', 'civic', 'downtown', 'urban', 'campus', 'superhero_city'],
  supportedLotTypes: ['multi_building_facility', 'civic_plaza', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['site_amenities', 'seating_patio', 'rooftop_mep', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    {
      key: 'campusLayout',
      label: 'Hospital Massing Layout',
      type: 'select',
      options: [
        ['twin_towers', 'Twin Patient Towers'],
        ['h_campus', 'H-Shape Medical Campus'],
        ['cruciform_tower', 'Cruciform Trauma Tower'],
        ['l_pavilion', 'L-Wing Medical Pavilion']
      ]
    },
    { key: 'includeSkybridge', label: 'Elevated Glass Skybridge', type: 'boolean' },
    { key: 'includeParkingDeck', label: 'Attached Visitor Parking Deck', type: 'boolean' },
    { key: 'includeHelipad', label: 'Elevated Rooftop Helipad', type: 'boolean' },
    { key: 'ambulanceBays', label: 'Ambulance Trauma Bays', type: 'range', min: 1, max: 3, step: 1 },
    { key: 'includeOxygenYard', label: 'Cryogenic Oxygen Tank Silos', type: 'boolean' }
  ],
  defaults: {
    width: 28,
    depth: 15,
    floors: 6,
    floorHeight: 3.6,
    exteriorMaterial: 'concrete',
    primaryColor: '#dde3e8',
    secondaryColor: '#eef2f6',
    trimColor: '#1f456e',
    accentColor: '#d92626',
    signText: 'Metro General Hospital',
    campusLayout: 'twin_towers',
    includeSkybridge: true,
    includeParkingDeck: true,
    includeHelipad: true,
    ambulanceBays: 2,
    includeEmergencyBay: true,
    includeOxygenYard: true,
    includeServiceEntrance: true,
    includeRooftopHvac: true,
    lotType: 'multi_building_facility',
    lotWidth: 60,
    lotDepth: 42,
    frontSetback: 11.5,
    parkingCount: 12
  },
  presets: [
    {
      id: 'metro_general_hospital',
      label: 'Metro General Hospital',
      environmentTags: ['medical', 'downtown', 'civic'],
      params: { width: 28, depth: 15, floors: 6, campusLayout: 'twin_towers', exteriorMaterial: 'concrete', primaryColor: '#dde3e8', trimColor: '#1f456e', accentColor: '#d92626', includeSkybridge: true, includeParkingDeck: true, includeHelipad: true, ambulanceBays: 2, lotWidth: 60, lotDepth: 42, frontSetback: 11.5, signText: 'Metro General Hospital' }
    },
    {
      id: 'university_teaching_hospital',
      label: 'University Teaching Medical Center',
      environmentTags: ['medical', 'campus', 'urban'],
      params: { width: 30, depth: 16, floors: 7, campusLayout: 'h_campus', exteriorMaterial: 'brick', primaryColor: '#9c5648', secondaryColor: '#d8cfc0', trimColor: '#25394f', includeSkybridge: true, includeParkingDeck: true, includeHelipad: true, ambulanceBays: 2, lotWidth: 64, lotDepth: 46, frontSetback: 12, signText: 'University Medical Center' }
    },
    {
      id: 'level_one_trauma_tower',
      label: 'Level-One Trauma & Surgical Tower',
      environmentTags: ['medical', 'downtown', 'civic'],
      params: { width: 24, depth: 16, floors: 8, campusLayout: 'cruciform_tower', exteriorMaterial: 'concrete', primaryColor: '#cfd8df', trimColor: '#1e354d', accentColor: '#e62e2e', includeSkybridge: false, includeParkingDeck: true, includeHelipad: true, ambulanceBays: 3, lotWidth: 58, lotDepth: 42, signText: 'Central Trauma Hospital' }
    },
    {
      id: 'paragon_futuristic_medcenter',
      label: 'Paragon City Med-Center',
      environmentTags: ['medical', 'superhero_city', 'downtown'],
      params: { width: 28, depth: 15, floors: 7, architecturalEra: 'futuristic', campusLayout: 'twin_towers', exteriorMaterial: 'glass', primaryColor: '#4a708b', trimColor: '#1e2c3b', accentColor: '#00c2ff', includeSkybridge: true, includeParkingDeck: true, includeHelipad: true, ambulanceBays: 2, lotWidth: 62, lotDepth: 42, signText: 'Paragon Med-Center' }
    },
    {
      id: 'historic_civic_infirmary',
      label: 'Historic Grand Civic Hospital',
      environmentTags: ['medical', 'civic', 'retro'],
      params: { width: 26, depth: 14.5, floors: 5, architecturalEra: 'early_20th', campusLayout: 'h_campus', exteriorMaterial: 'decorative_masonry', primaryColor: '#a87d63', trimColor: '#dcd2c0', windowStyle: 'arched', includeSkybridge: false, includeParkingDeck: false, includeHelipad: false, ambulanceBays: 2, lotType: 'civic_plaza', lotWidth: 52, lotDepth: 38, signText: 'St. Jude Grand Hospital' }
    },
    {
      id: 'regional_specialty_pavilion',
      label: 'Regional Heart & Surgical Pavilion',
      environmentTags: ['medical', 'suburban', 'urban'],
      params: { width: 25, depth: 14, floors: 5, campusLayout: 'l_pavilion', exteriorMaterial: 'concrete', primaryColor: '#e2e6ea', trimColor: '#22577a', accentColor: '#e03e52', windowStyle: 'modern', includeSkybridge: true, includeParkingDeck: true, includeHelipad: true, ambulanceBays: 2, lotWidth: 56, lotDepth: 40, signText: 'Harbor Surgical Institute' }
    }
  ],
  buildStructure: buildLargeHospitalStructure,
  planObjects: planLargeHospitalObjects
});
