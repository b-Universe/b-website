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
  addStandardBuildingShell,
  addDoorUnit,
  addFacadeWindows,
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
      addFacadeWindows(attachedGroup, wx, wz, ww, wd, wFloors, fh, cfg, [], []);
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
    specs.push({ familyId: 'cafe_storefront', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
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
