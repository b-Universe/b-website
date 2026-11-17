import { clamp } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, glassMaterial, emissiveMaterial } from '../materials/materials.js';
import {
  addBox,
  addStandardBuildingShell,
  addSignboardUnit,
  addAwning
} from '../geometry/arch-primitives.js';

function buildGymFitnessStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = Math.max(cfg.floorHeight || 4.3, 3.6);

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: Boolean(cfg.interiorDisplay !== false),
    entranceAwning: false,
    signY: floors * fh - 0.35
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Athletic canopy + bold energetic accent stripe
  const trimMat = solidMaterial(cfg.trimColor || '#262d36');
  const accentMat = solidMaterial(cfg.accentColor || '#e63946');
  addBox(attachedGroup, 0, 2.75, d * 0.5 + 0.65, 3.6, 0.24, 1.3, trimMat);
  addBox(attachedGroup, 0, 2.86, d * 0.5 + 1.28, 3.64, 0.1, 0.1, accentMat);
  addBox(attachedGroup, 0, fh - 0.58, d * 0.5 + 0.08, w + 0.16, 0.18, 0.1, accentMat);

  // Illuminated clock / 24h emblem badge
  if (cfg.is24Hour) {
    addSignboardUnit(attachedGroup, -w * 0.38, 2.7, d * 0.5 + 0.14, 1.6, 0.62, 'Open 24h', '#161b22', '#3bf0b8', cfg);
  }

  // Interior raised rubber mat platform + visible floor zones for City Object Suite gym equipment
  if (cfg.interiorDisplay !== false) {
    const floorMat = surfaceMaterial('concrete', '#2b3036', 'clean', cfg.seed + 11, 2, 2);
    const matY = 0.06;
    // Recessed dark floor pad behind front glass
    addBox(attachedGroup, 0, matY, d * 0.2, w - 0.8, 0.08, d * 0.55, floorMat, { cast: false });
    const count = clamp(Math.floor((w - 2) / 2.2), 2, 5);
    for (let i = 0; i < count; i++) {
      const ix = -w * 0.35 + (count > 1 ? (i / (count - 1)) * (w * 0.7) : 0);
      registerAnchor(placementCtx, {
        id: `gym_interior_slot_${i}`,
        category: 'interior_display',
        position: [ix, 0.1, d * 0.32],
        surfaceY: 0.1,
        rotationY: 0
      });
    }
    registerAnchor(placementCtx, {
      id: 'gym_locker_slot',
      category: 'interior_display',
      position: [-w * 0.36, 0.1, 0],
      surfaceY: 0.1,
      rotationY: Math.PI / 2
    });
  }

  // Industrial rooftop air-handling ducts
  const ductMat = solidMaterial('#8c96a2');
  const ry = shell.roofTopY;
  addBox(attachedGroup, -w * 0.2, ry + 0.38, -d * 0.15, Math.min(w * 0.55, 6.2), 0.44, 0.64, ductMat);
  addBox(attachedGroup, w * 0.18, ry + 0.38, d * 0.12, Math.min(w * 0.42, 4.4), 0.44, 0.64, ductMat);

  // Optional Outdoor Turf / Functional Training Area on Right Side
  let rightExtra = 0;
  if (cfg.includeOutdoorTurf) {
    const tw = 5.2;
    const td = Math.max(6.4, d * 0.88);
    const tx = w * 0.5 + tw * 0.5 + 0.2;
    const turfMat = surfaceMaterial('stucco', '#2c8a4b', 'clean', cfg.seed + 29, 3, 4);
    const fenceMat = solidMaterial(cfg.trimColor || '#2f3842');
    addBox(attachedGroup, tx, 0.05, 0, tw, 0.1, td, turfMat);
    addBox(attachedGroup, tx + tw * 0.5 - 0.06, 0.65, 0, 0.1, 1.2, td, fenceMat);
    addBox(attachedGroup, tx, 0.65, td * 0.5 - 0.06, tw, 1.2, 0.1, fenceMat);
    addBox(attachedGroup, tx, 0.65, -td * 0.5 + 0.06, tw, 1.2, 0.1, fenceMat);
    registerBuildingFootprint(placementCtx, {
      id: 'gym_outdoor_turf',
      minX: tx - tw * 0.5,
      maxX: tx + tw * 0.5,
      minZ: -td * 0.5,
      maxZ: td * 0.5,
      maxY: 1.5
    });
    registerAnchor(placementCtx, {
      id: 'gym_turf_rig',
      category: 'patio',
      position: [tx, 0.1, 0],
      surfaceY: 0.1,
      rotationY: 0
    });
    rightExtra = tw + 0.25;
  }

  ctx.buildingBounds = {
    width: w + rightExtra,
    depth: d,
    height: shell.roofTopY + 0.9
  };
  ctx.lotOptions = { rearMargin: 4.0 };
}

function planGymFitnessObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [];

  if (cfg.interiorDisplay !== false) {
    const style = cfg.gymStyle || 'commercial';
    const slots = clamp(Math.floor((cfg.width - 2) / 2.2), 2, 5);
    for (let i = 0; i < slots; i++) {
      let fam = i % 2 === 0 ? 'gym_cardio_equipment' : 'gym_strength_equipment';
      let preset = i % 2 === 0 ? 'commercial_treadmill' : 'squat_power_rack_barbell';
      if (style === 'boxing_martial') {
        fam = i % 2 === 0 ? 'gym_functional_facilities' : 'gym_strength_equipment';
        preset = i % 2 === 0 ? 'heavy_punching_bag_stand' : 'dumbbell_weight_rack';
      } else if (i === 1) {
        preset = 'upright_exercise_spin_bike';
      } else if (i === 2) {
        preset = 'dumbbell_weight_rack';
      } else if (i === 3) {
        preset = 'elliptical_cross_trainer';
      } else if (i >= 4) {
        preset = 'olympic_bench_press';
      }
      specs.push({
        familyId: fam,
        presetId: preset,
        groupKey: 'interior_display',
        anchorId: `gym_interior_slot_${i}`,
        localOffset: [0, 0, 0]
      });
    }
    specs.push({
      familyId: 'gym_functional_facilities',
      presetId: 'gym_steel_locker_bank',
      groupKey: 'interior_display',
      anchorId: 'gym_locker_slot',
      localOffset: [0, 0, 0]
    });
  }

  if (cfg.includeOutdoorTurf) {
    specs.push({
      familyId: 'gym_functional_facilities',
      presetId: 'pullup_dip_tower',
      groupKey: 'seating_patio',
      anchorId: 'gym_turf_rig',
      localOffset: [0, 0, 0]
    });
  }

  specs.push({
    familyId: 'bike_rack',
    presetId: 'stainless_u_loop_rack',
    groupKey: 'site_amenities',
    anchorId: 'entrance_main',
    localOffset: [2.2, 0, 0.35]
  });

  if (cfg.includeVendingMachines !== false) {
    specs.push({
      familyId: 'soda_vending_machines',
      presetId: 'slim_energy_drink_vendor',
      groupKey: 'site_amenities',
      anchorId: 'entrance_main',
      localOffset: [-2.1, 0, 0.25],
      minDensity: 0.4
    });
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
  id: 'gym_fitness',
  categoryId: 'entertainment_recreation',
  categories: ['entertainment_recreation', 'commercial_services'],
  label: 'Gyms & Fitness Centers',
  description: 'Neighborhood gyms, commercial fitness clubs, warehouse gyms, boxing/martial arts studios, and rec centers.',
  environmentTags: ['urban', 'downtown', 'suburban', 'industrial'],
  supportedLotTypes: ['standalone_commercial', 'compact_urban', 'small_suburban', 'industrial_service', 'none'],
  defaultObjectGroups: ['interior_display', 'site_amenities', 'rooftop_mep', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    { key: 'gymStyle', label: 'Gym Discipline', type: 'select', options: [
      { id: 'commercial', label: 'Commercial Fitness' },
      { id: 'boxing_martial', label: 'Boxing / Martial Arts' },
      { id: 'warehouse_strength', label: 'Warehouse Strength' },
      { id: 'wellness_yoga', label: 'Yoga & Studio' }
    ] },
    { key: 'interiorDisplay', label: 'Transparent Window Equipment Display', type: 'boolean' },
    { key: 'includeOutdoorTurf', label: 'Outdoor Functional Turf Yard', type: 'boolean' },
    { key: 'is24Hour', label: 'Open 24h Badge', type: 'boolean' }
  ],
  defaults: {
    width: 14.0,
    depth: 9.6,
    floors: 1,
    floorHeight: 4.4,
    roofStyle: 'flat',
    exteriorMaterial: 'concrete',
    primaryColor: '#48525e',
    secondaryColor: '#d0d7de',
    trimColor: '#21262d',
    accentColor: '#e63946',
    signText: 'Ironworks Athletic Club',
    gymStyle: 'commercial',
    interiorDisplay: true,
    includeOutdoorTurf: false,
    is24Hour: true,
    includeVendingMachines: true,
    includeRooftopHvac: true,
    includeDumpsters: true,
    lotType: 'standalone_commercial',
    frontSetback: 7.0
  },
  presets: [
    { id: 'small_neighborhood_gym', label: 'Small Neighborhood Gym', environmentTags: ['urban'], params: { width: 10.4, depth: 7.6, floorHeight: 3.9, exteriorMaterial: 'brick', primaryColor: '#8d4739', accentColor: '#e08e36', signText: 'Local Barbell Gym', lotType: 'compact_urban', frontSetback: 4.5 } },
    { id: 'modern_commercial_fitness', label: 'Modern Commercial Fitness Center', environmentTags: ['suburban', 'urban'], params: { width: 15.6, depth: 10.2, floorHeight: 4.6, exteriorMaterial: 'concrete', primaryColor: '#3f4a56', accentColor: '#00a8e8', signText: 'Apex Fitness', includeOutdoorTurf: true, parkingConfig: 'front_row' } },
    { id: 'large_warehouse_gym', label: 'Large Warehouse Strength Gym', environmentTags: ['industrial'], params: { width: 17.5, depth: 12.0, floorHeight: 5.2, roofStyle: 'sawtooth', exteriorMaterial: 'corrugated_metal', primaryColor: '#565e66', accentColor: '#e85d04', gymStyle: 'warehouse_strength', signText: 'Foundry Powerhouse', lotType: 'industrial_service', includeOutdoorTurf: true } },
    { id: 'boxing_gym', label: 'Classic Boxing Gym', environmentTags: ['urban', 'retro'], params: { width: 10.8, depth: 8.2, floorHeight: 4.1, exteriorMaterial: 'brick', primaryColor: '#73312b', accentColor: '#d92b2b', gymStyle: 'boxing_martial', windowStyle: 'industrial', signText: 'Southside Boxing Club', lotType: 'compact_urban' } },
    { id: 'martial_arts_studio', label: 'Martial Arts Dojo Studio', environmentTags: ['urban', 'suburban'], params: { width: 9.8, depth: 7.4, floorHeight: 3.8, exteriorMaterial: 'painted_stucco', primaryColor: '#e6dfd3', accentColor: '#9e2a2b', gymStyle: 'boxing_martial', signText: 'Dragon Crest Dojo', lotType: 'small_suburban' } },
    { id: 'yoga_studio', label: 'Sunlit Yoga & Wellness Studio', environmentTags: ['urban', 'suburban'], params: { width: 9.4, depth: 7.2, floorHeight: 3.7, exteriorMaterial: 'wood_siding', primaryColor: '#d4bfa6', accentColor: '#528f73', gymStyle: 'wellness_yoga', is24Hour: false, signText: 'Willow Mind & Body', includeLandscaping: true, lotType: 'small_suburban' } },
    { id: 'luxury_fitness_club', label: 'Luxury Health & Athletic Club', environmentTags: ['downtown', 'modern'], params: { width: 15.2, depth: 10.6, floors: 2, floorHeight: 4.0, exteriorMaterial: 'limestone', primaryColor: '#cfc5b4', accentColor: '#b58d3d', signText: 'Vanguard Athletic', lotType: 'civic_plaza', is24Hour: false } },
    { id: 'community_recreation_center', label: 'Community Recreation Center', environmentTags: ['civic', 'suburban'], params: { width: 16.4, depth: 11.4, floorHeight: 4.5, roofStyle: 'pitched', exteriorMaterial: 'brick', primaryColor: '#995343', accentColor: '#2c6e91', signText: 'Harbor Rec Center', includeOutdoorTurf: true, lotType: 'civic_plaza', is24Hour: false } },
    { id: 'multi_story_urban_gym', label: 'Multi-Story Urban Fitness Tower', environmentTags: ['downtown', 'urban'], params: { width: 12.2, depth: 8.8, floors: 3, floorHeight: 3.7, exteriorMaterial: 'concrete', primaryColor: '#37414d', accentColor: '#39d353', signText: 'Metro Core Fitness', lotType: 'compact_urban' } },
    { id: 'twentyfour_hour_gym', label: '24-Hour Express Fitness', environmentTags: ['suburban', 'urban'], params: { width: 11.2, depth: 7.8, floorHeight: 3.9, exteriorMaterial: 'metal_panel', primaryColor: '#2c3242', accentColor: '#f72585', signText: 'Pulse 24 Fitness', is24Hour: true, lightingTime: 'night' } }
  ],
  buildStructure: buildGymFitnessStructure,
  planObjects: planGymFitnessObjects
});

function buildNewsstandKioskStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = clamp(cfg.width, 2.4, 7.0);
  const d = clamp(cfg.depth, 2.0, 5.2);
  const fh = clamp(cfg.floorHeight, 2.6, 3.6);

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, 1, 1);
  const trimMat = solidMaterial(cfg.trimColor || '#262d33');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { transparent: true, lightingTime: cfg.lightingTime });

  addBox(mainBuildingGroup, 0, fh * 0.5, 0, w, fh, d, wallMat);
  addBox(mainBuildingGroup, 0, fh + 0.14, 0, w + 0.48, 0.24, d + 0.52, trimMat);

  // Open counter bay + protective folding shutters
  addBox(mainBuildingGroup, 0, 0.98, d * 0.5 + 0.22, w * 0.84, 0.12, 0.44, solidMaterial('#c8cfd6'));
  addBox(mainBuildingGroup, 0, 1.65, d * 0.5 + 0.04, w * 0.78, 1.15, 0.08, glassMat, { cast: false });
  addAwning(mainBuildingGroup, 0, 2.38, d * 0.5, w + 0.2, 1.1, 0.36, cfg.accentColor);

  // Magazine display stepped racks tucked right along lower front apron
  const rackMat = solidMaterial('#3a424d');
  for (let tier = 0; tier < 3; tier++) {
    addBox(attachedGroup, -w * 0.22, 0.28 + tier * 0.22, d * 0.5 + 0.26 - tier * 0.07, w * 0.4, 0.2, 0.12, rackMat);
  }

  addSignboardUnit(mainBuildingGroup, 0, fh - 0.1, d * 0.5 + 0.28, w * 0.92, 0.56, cfg.signText || 'City Newsstand', cfg.trimColor || '#1e242b', '#ffd166', cfg);

  const ent = {
    id: 'kiosk_counter',
    role: 'main',
    label: 'Customer Counter Window',
    position: { x: 0, y: 0, z: d * 0.5 },
    normal: { x: 0, y: 0, z: 1 },
    width: w * 0.8,
    height: 2.2
  };
  ctx.entrances.push(ent);
  registerBuildingFootprint(placementCtx, {
    id: 'newsstand_kiosk_body',
    minX: -w * 0.5,
    maxX: w * 0.5,
    minZ: -d * 0.5,
    maxZ: d * 0.5,
    maxY: fh + 0.3
  });
  registerAnchor(placementCtx, {
    id: 'entrance_main',
    category: 'entrance',
    position: [0, 0, d * 0.5 + 0.6],
    surfaceY: 0,
    rotationY: 0
  });
  ctx.roofTopY = fh + 0.26;
  ctx.buildingBounds = { width: w, depth: d, height: fh + 0.6 };
  ctx.lotOptions = { rearMargin: 1.8 };
}

function planNewsstandObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    {
      familyId: 'newspaper_box',
      presetId: cfg.newspaperBoxCount > 1 ? 'quad_newspaper_box_row' : 'classic_newspaper_honor_box',
      groupKey: 'site_amenities',
      position: [cfg.width * 0.5 + 0.65, 0.08, cfg.depth * 0.2],
      rotationY: 0
    },
    {
      familyId: 'wheeled_bin',
      presetId: 'wire_mesh_sidewalk_basket',
      groupKey: 'waste_utility',
      position: [-cfg.width * 0.5 - 0.55, 0.08, cfg.depth * 0.35],
      rotationY: 0
    }
  ];
  return specs;
}

registerSpecialtyFamily({
  id: 'newsstand_kiosk',
  categoryId: 'retail_shopping',
  categories: ['retail_shopping', 'entertainment_recreation', 'commercial_services'],
  label: 'Newsstands & Street Kiosks',
  description: 'Compact sidewalk newsstands, corner kiosks, transit booths, and vintage street stands.',
  environmentTags: ['urban', 'downtown', 'retro'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'civic_plaza', 'none'],
  defaultObjectGroups: ['site_amenities', 'waste_utility', 'seating_patio'],
  featureSchema: [
    { key: 'newspaperBoxCount', label: 'Newspaper Box Bank', type: 'range', min: 1, max: 3, step: 1 }
  ],
  defaults: {
    width: 3.8,
    depth: 2.6,
    floors: 1,
    floorHeight: 2.9,
    exteriorMaterial: 'metal_panel',
    primaryColor: '#2d5a47',
    trimColor: '#1b2622',
    accentColor: '#d64541',
    signText: 'Daily Herald Newsstand',
    newspaperBoxCount: 2,
    includeDumpsters: false,
    includeRooftopHvac: false,
    lotType: 'compact_urban',
    frontSetback: 3.2,
    sideSetback: 2.0,
    parkingConfig: 'none'
  },
  presets: [
    { id: 'small_sidewalk_newsstand', label: 'Small Sidewalk Newsstand', environmentTags: ['downtown', 'urban'], params: { width: 3.2, depth: 2.2, primaryColor: '#2d5a47', accentColor: '#e0533c', signText: 'Metro News' } },
    { id: 'corner_newspaper_kiosk', label: 'Corner Newspaper Kiosk', environmentTags: ['downtown', 'urban'], params: { width: 3.6, depth: 2.6, exteriorMaterial: 'painted_stucco', primaryColor: '#364958', accentColor: '#e6b83a', cornerLot: true, lotType: 'corner_commercial', signText: 'Corner Press' } },
    { id: 'enclosed_newspaper_shop', label: 'Enclosed Corner Magazine Shop', environmentTags: ['urban'], params: { width: 5.4, depth: 4.0, exteriorMaterial: 'brick', primaryColor: '#8f4739', accentColor: '#2c6b4f', signText: 'Magazines & Tobacco' } },
    { id: 'transit_newsstand', label: 'Transit Plaza News Kiosk', environmentTags: ['downtown', 'modern'], params: { width: 4.2, depth: 2.6, exteriorMaterial: 'concrete', primaryColor: '#4c5864', accentColor: '#1f77b4', signText: 'Station News & Tickets', lotType: 'civic_plaza' } },
    { id: 'vintage_street_stand', label: 'Vintage Brass Street Stand', environmentTags: ['retro', 'urban'], params: { width: 3.4, depth: 2.4, architecturalEra: 'historical', exteriorMaterial: 'wood_siding', primaryColor: '#69432d', accentColor: '#a63232', signText: 'City Gazette Stand' } }
  ],
  buildStructure: buildNewsstandKioskStructure,
  planObjects: planNewsstandObjects
});
