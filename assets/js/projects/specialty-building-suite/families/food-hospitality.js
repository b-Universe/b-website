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
  addSignboardUnit,
  addDoorUnit,
  addAwning,
  addWindowAdDecals
} from '../geometry/arch-primitives.js';

function buildRestaurantStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.4;

  const isKiosk = cfg.restaurantStyle === 'walkup_kiosk';
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: !isKiosk,
    transparentGlass: Boolean(cfg.interiorDisplay),
    entranceAwning: true,
    signY: floors * fh - 0.35
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Walk-up ordering window counter if food shack / walk-up stand
  if (isKiosk) {
    const trimMat = solidMaterial(cfg.trimColor || '#2f3842');
    const shelfMat = solidMaterial('#cfd8df');
    addBox(mainBuildingGroup, 0, 1.08, d * 0.5 + 0.35, Math.min(w * 0.65, 3.2), 0.14, 0.56, shelfMat);
    addBox(mainBuildingGroup, 0, 1.72, d * 0.5 + 0.08, Math.min(w * 0.62, 3.0), 1.15, 0.1, solidMaterial('#1c242c'));
    addAwning(mainBuildingGroup, 0, 2.55, d * 0.5, Math.min(w * 0.72, 3.4), 1.35, 0.42, cfg.accentColor);
    addBox(mainBuildingGroup, -Math.min(w * 0.3, 1.4), 0.54, d * 0.5 + 0.32, 0.12, 1.0, 0.12, trimMat);
    addBox(mainBuildingGroup, Math.min(w * 0.3, 1.4), 0.54, d * 0.5 + 0.32, 0.12, 1.0, 0.12, trimMat);
  }

  // Retro chrome / diner trim bands
  if (cfg.restaurantStyle === 'retro_diner') {
    const chromeMat = solidMaterial('#dce4ec');
    addBox(mainBuildingGroup, 0, 0.92, d * 0.5 + 0.07, w + 0.18, 0.1, 0.08, chromeMat);
    addBox(mainBuildingGroup, 0, fh - 0.15, d * 0.5 + 0.09, w + 0.22, 0.14, 0.1, chromeMat);
    const neonMat = emissiveMaterial(cfg.accentColor, 0.9);
    addBox(mainBuildingGroup, 0, fh + 0.06, d * 0.5 + 0.12, w * 0.86, 0.08, 0.08, neonMat, { cast: false });
  }

  // Front window menu/promo decals
  if (cfg.includeWindowAds && (cfg.windowAdDensity || 0) > 0.05 && !isKiosk) {
    addWindowAdDecals(mainBuildingGroup, -w * 0.28, 1.5, d * 0.5 + 0.09, Math.max(1.2, w * 0.32), 1.2, cfg, cfg.windowAdDensity, cfg.seed + 71);
  }

  // Kitchen exhaust hood & duct stack
  if (cfg.includeKitchenExhaust !== false) {
    const metalMat = solidMaterial('#8c98a4');
    const ductDark = solidMaterial('#5c6670');
    const exX = -w * 0.26;
    const exZ = -d * 0.22;
    const roofY = shell.roofTopY;
    addBox(attachedGroup, exX, roofY + 0.48, exZ, 1.35, 0.92, 1.25, metalMat);
    addCylinder(attachedGroup, exX, roofY + 1.05, exZ, 0.58, 0.68, 0.42, ductDark, 8);
    // Exterior wall grease trap / rear exhaust riser
    addBox(attachedGroup, exX, Math.min(floors * fh, 2.8) * 0.5, -d * 0.5 - 0.24, 0.54, Math.min(floors * fh, 2.8), 0.44, metalMat);
  }

  // Attached Drive-Thru Canopy & Service Window on Right Side
  let rightBound = w * 0.5;
  if (cfg.includeDriveThru) {
    const canopyW = 3.2;
    const canopyD = Math.min(6.4, d + 0.8);
    const canopyH = 3.25;
    const cx = w * 0.5 + canopyW * 0.5;
    const fasciaMat = solidMaterial(cfg.accentColor);
    const roofMat = solidMaterial(cfg.trimColor || '#38414a');

    addBox(attachedGroup, cx, canopyH, 0, canopyW, 0.34, canopyD, roofMat);
    addBox(attachedGroup, cx, canopyH, canopyD * 0.5 + 0.03, canopyW + 0.1, 0.24, 0.08, fasciaMat);
    addBox(attachedGroup, w * 0.5 + 0.08, 1.62, 0.6, 0.12, 1.05, 1.45, solidMaterial('#202932'));
    addAwning(attachedGroup, w * 0.5 + 0.06, 2.38, 0.6, 1.65, 0.72, 0.26, cfg.accentColor, { rotY: Math.PI / 2 });
    // Support posts along outer lane curb
    for (const pz of [-canopyD * 0.38, canopyD * 0.38]) {
      addBox(attachedGroup, w * 0.5 + canopyW - 0.2, canopyH * 0.5, pz, 0.22, canopyH, 0.22, solidMaterial(cfg.trimColor || '#343e48'));
    }
    registerLaneClearance(placementCtx, {
      id: 'restaurant_drivethru_lane',
      kind: 'drive_thru',
      minX: w * 0.5 + 0.4,
      maxX: w * 0.5 + canopyW + 0.5,
      minZ: -d * 0.5 - 3.5,
      maxZ: d * 0.5 + 3.5
    });
    registerAnchor(placementCtx, {
      id: 'drivethru_menu_anchor',
      category: 'roadside',
      position: [w * 0.5 + canopyW - 0.4, 0.02, -d * 0.48 - 1.2],
      surfaceY: 0.02,
      rotationY: Math.PI * 0.9
    });
    rightBound = w * 0.5 + canopyW;
  }

  // Optional Outdoor Covered Patio Pad & Pergola
  let frontExtra = 0;
  let patioMeta = null;
  if (cfg.includePatio) {
    const pSide = cfg.patioPlacement === 'side_left' ? 'side_left' : 'front';
    const pw = pSide === 'front' ? Math.max(4.6, w * 0.78) : 4.6;
    const pd = pSide === 'front' ? 4.2 : Math.max(5.2, d * 0.85);
    const px = pSide === 'front' ? 0 : -w * 0.5 - pw * 0.5 - 0.2;
    const pz = pSide === 'front' ? d * 0.5 + pd * 0.5 + 0.15 : 0;

    const deckMat = surfaceMaterial('tile', cfg.secondaryColor || '#8c6e54', cfg.condition, cfg.seed + 19, 3, 2);
    const railMat = solidMaterial(cfg.trimColor || '#323a42');
    addBox(attachedGroup, px, 0.08, pz, pw, 0.16, pd, deckMat);

    // Low perimeter rails + pergola posts
    addBox(attachedGroup, px - pw * 0.5 + 0.08, 0.52, pz, 0.12, 0.85, pd, railMat);
    addBox(attachedGroup, px + pw * 0.5 - 0.08, 0.52, pz, 0.12, 0.85, pd, railMat);
    if (pSide === 'front') {
      addBox(attachedGroup, px - pw * 0.3, 0.52, pz + pd * 0.5 - 0.08, pw * 0.36, 0.85, 0.12, railMat);
      addBox(attachedGroup, px + pw * 0.3, 0.52, pz + pd * 0.5 - 0.08, pw * 0.36, 0.85, 0.12, railMat);
      frontExtra = pd;
    }

    if (cfg.patioCovered !== false) {
      const pergH = 2.75;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(attachedGroup, px + sx * (pw * 0.45), pergH * 0.5, pz + sz * (pd * 0.44), 0.14, pergH, 0.14, railMat);
        }
      }
      addAwning(attachedGroup, px, pergH, pSide === 'front' ? d * 0.5 + 0.2 : pz - pd * 0.45, pw - 0.2, pd * 0.9, 0.34, cfg.accentColor);
    }

    registerBuildingFootprint(placementCtx, {
      id: 'restaurant_patio_deck',
      minX: px - pw * 0.5,
      maxX: px + pw * 0.5,
      minZ: pz - pd * 0.5,
      maxZ: pz + pd * 0.5,
      maxY: 2.8
    });

    const tableCols = clamp(Math.floor(pw / 2.2), 1, 4);
    for (let t = 0; t < tableCols; t++) {
      const tx = px - pw * 0.32 + (tableCols > 1 ? (t / (tableCols - 1)) * (pw * 0.64) : 0);
      registerAnchor(placementCtx, {
        id: `patio_table_${t}`,
        category: 'patio',
        position: [tx, 0.16, pz],
        surfaceY: 0.16,
        rotationY: 0
      });
    }
    patioMeta = { x: px, z: pz, width: pw, depth: pd, tableCount: tableCols };
  }

  ctx._patioMeta = patioMeta;
  ctx.buildingBounds = {
    width: Math.max(w, rightBound + w * 0.5),
    depth: d + frontExtra,
    height: shell.roofTopY + 1.1
  };
  ctx.lotOptions = {
    rearMargin: 4.4,
    patio: patioMeta
  };
}

function planRestaurantObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [];

  if (cfg.includePatio && ctx._patioMeta) {
    const cnt = ctx._patioMeta.tableCount || 2;
    for (let i = 0; i < cnt; i++) {
      specs.push({
        familyId: 'cafe_storefront',
        presetId: 'paris_bistro_table_chairs',
        groupKey: 'seating_patio',
        anchorId: `patio_table_${i}`,
        localOffset: [0, 0, 0]
      });
    }
  }

  if (cfg.includeDriveThru) {
    specs.push({
      familyId: 'retail_specialty_displays',
      presetId: 'drive_thru_menu_speaker_board',
      groupKey: 'signage_lighting',
      anchorId: 'drivethru_menu_anchor',
      localOffset: [0, 0, 0],
      allowInLane: true
    });
  }

  if (cfg.includeMenuBoard !== false) {
    specs.push({
      familyId: 'cafe_storefront',
      presetId: 'sidewalk_a_frame_sign',
      groupKey: 'site_amenities',
      anchorId: 'entrance_main',
      localOffset: [-1.7, 0, 0.4]
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
  id: 'restaurant',
  categoryId: 'food_hospitality',
  categories: ['food_hospitality', 'retail_shopping'],
  label: 'Restaurants & Diners',
  description: 'Food shacks, walk-up stands, diners, drive-thrus, fast food, bistros, and multi-story restaurants.',
  environmentTags: ['urban', 'downtown', 'suburban', 'highway', 'retro'],
  supportedLotTypes: ['standalone_commercial', 'roadside_service', 'compact_urban', 'corner_commercial', 'small_suburban', 'none'],
  defaultObjectGroups: ['seating_patio', 'site_amenities', 'waste_utility', 'rooftop_mep', 'signage_lighting'],
  featureSchema: [
    { key: 'restaurantStyle', label: 'Kitchen Style', type: 'select', options: [
      { id: 'standard_casual', label: 'Casual Restaurant' },
      { id: 'retro_diner', label: 'Retro Neon Diner' },
      { id: 'walkup_kiosk', label: 'Walk-Up Food Stand' },
      { id: 'fine_dining', label: 'Upscale Bistro / Dining' }
    ] },
    { key: 'patioPlacement', label: 'Patio Placement', type: 'select', options: [
      { id: 'front', label: 'Front Sidewalk Patio' },
      { id: 'side_left', label: 'Side Covered Patio' }
    ] },
    { key: 'includePatio', label: 'Outdoor Dining Patio', type: 'boolean' },
    { key: 'patioCovered', label: 'Patio Awning Cover', type: 'boolean' },
    { key: 'includeDriveThru', label: 'Drive-Thru Lane & Canopy', type: 'boolean' },
    { key: 'includeKitchenExhaust', label: 'Kitchen Exhaust Hood', type: 'boolean' },
    { key: 'includeMenuBoard', label: 'Sidewalk Menu Sign', type: 'boolean' }
  ],
  defaults: {
    width: 11.2,
    depth: 7.6,
    floors: 1,
    floorHeight: 3.45,
    roofStyle: 'flat',
    exteriorMaterial: 'brick',
    primaryColor: '#a64d3c',
    secondaryColor: '#e7dfd3',
    accentColor: '#e59a24',
    signText: 'Starlight Diner',
    restaurantStyle: 'standard_casual',
    patioPlacement: 'front',
    includePatio: true,
    patioCovered: true,
    includeDriveThru: false,
    includeKitchenExhaust: true,
    includeMenuBoard: true,
    includeWindowAds: true,
    windowAdDensity: 0.45,
    includeDumpsters: true,
    includeRooftopHvac: true,
    lotType: 'standalone_commercial'
  },
  presets: [
    {
      id: 'small_roadside_food_shack',
      label: 'Small Roadside Food Shack',
      environmentTags: ['highway', 'retro'],
      params: { width: 5.4, depth: 4.2, floorHeight: 2.9, restaurantStyle: 'walkup_kiosk', roofStyle: 'shed', exteriorMaterial: 'wood_siding', primaryColor: '#c95638', accentColor: '#f2b830', signText: 'Bayside Shack', lotType: 'roadside_service', includePatio: true, includeDriveThru: false, frontSetback: 4.5 }
    },
    {
      id: 'walk_up_food_stand',
      label: 'Walk-Up Food Stand',
      environmentTags: ['urban', 'suburban'],
      params: { width: 4.6, depth: 3.8, floorHeight: 2.85, restaurantStyle: 'walkup_kiosk', roofStyle: 'flat', exteriorMaterial: 'painted_stucco', primaryColor: '#e5e0d5', accentColor: '#2d936c', signText: 'Quick Bite', lotType: 'compact_urban', frontSetback: 3.5, parkingConfig: 'none', includePatio: true }
    },
    {
      id: 'tiny_neighborhood_restaurant',
      label: 'Tiny Neighborhood Restaurant',
      environmentTags: ['urban'],
      params: { width: 7.4, depth: 6.2, floorHeight: 3.25, restaurantStyle: 'standard_casual', exteriorMaterial: 'brick', primaryColor: '#91463a', accentColor: '#2b6cb0', signText: 'Nook Cafe & Grill', lotType: 'compact_urban', includePatio: true, frontSetback: 4.5 }
    },
    {
      id: 'fast_food_restaurant',
      label: 'Fast-Food Restaurant',
      environmentTags: ['suburban', 'highway'],
      params: { width: 12.2, depth: 8.2, floorHeight: 3.6, restaurantStyle: 'standard_casual', roofStyle: 'flat', exteriorMaterial: 'painted_stucco', primaryColor: '#e8e2d8', accentColor: '#d93829', signageStyle: 'illuminated_fascia', signText: 'King Burger', includeDriveThru: true, includePatio: true, parkingConfig: 'wrap_around', lotType: 'standalone_commercial', frontSetback: 7.5 }
    },
    {
      id: 'drive_thru_restaurant',
      label: 'Drive-Thru Restaurant',
      environmentTags: ['suburban', 'highway'],
      params: { width: 10.6, depth: 7.2, floorHeight: 3.5, exteriorMaterial: 'concrete', primaryColor: '#cbd2d9', accentColor: '#e8871e', signText: 'Express Tacos', includeDriveThru: true, includePatio: false, lotType: 'roadside_service', frontSetback: 7.0 }
    },
    {
      id: 'classic_1950s_diner',
      label: 'Classic 1950s Retro Diner',
      environmentTags: ['retro', 'urban', 'highway'],
      params: { width: 13.4, depth: 6.6, floorHeight: 3.45, architecturalEra: '1940s_1950s', restaurantStyle: 'retro_diner', exteriorMaterial: 'metal_panel', primaryColor: '#cfd8df', accentColor: '#e03e52', signageStyle: 'neon_marquee', signText: 'Comet Chrome Diner', includePatio: false, includeBenches: true, lotType: 'roadside_service' }
    },
    {
      id: 'family_sitdown_restaurant',
      label: 'Family Sit-Down Restaurant',
      environmentTags: ['suburban'],
      params: { width: 14.5, depth: 9.2, floorHeight: 3.7, roofStyle: 'hip', exteriorMaterial: 'stone_brick', primaryColor: '#8f694b', accentColor: '#3d704d', signText: 'Cedar Grillhouse', includePatio: true, patioPlacement: 'side_left', includeLandscaping: true, parkingConfig: 'front_row', lotType: 'standalone_commercial', frontSetback: 8.0 }
    },
    {
      id: 'upscale_fine_dining',
      label: 'Upscale Fine-Dining Restaurant',
      environmentTags: ['downtown', 'urban'],
      params: { width: 13.0, depth: 9.4, floors: 2, floorHeight: 3.5, restaurantStyle: 'fine_dining', roofStyle: 'mansard', exteriorMaterial: 'limestone', primaryColor: '#cbbba3', trimColor: '#232830', accentColor: '#9c7a3c', windowStyle: 'arched', signageStyle: 'engraved_stone', signText: 'Maison Aurelia', includeWindowAds: false, includePatio: true, lotType: 'compact_urban' }
    },
    {
      id: 'urban_bistro_storefront',
      label: 'Urban Bistro Storefront',
      environmentTags: ['urban', 'downtown'],
      params: { width: 9.2, depth: 7.4, floors: 2, floorHeight: 3.3, restaurantStyle: 'fine_dining', exteriorMaterial: 'brick', primaryColor: '#8b4338', accentColor: '#1f4e5f', signText: 'Rue Bistro', includePatio: true, lotType: 'compact_urban', frontSetback: 4.8, parkingConfig: 'none' }
    },
    {
      id: 'pizza_restaurant',
      label: 'Neighborhood Pizza Parlor',
      environmentTags: ['urban', 'suburban'],
      params: { width: 9.8, depth: 7.2, floorHeight: 3.4, exteriorMaterial: 'brick', primaryColor: '#a24134', accentColor: '#367d39', signageStyle: 'neon_marquee', signText: 'Marco Slices', includePatio: true, windowAdDensity: 0.55 }
    },
    {
      id: 'bakery_pastry_shop',
      label: 'Corner Bakery & Pastry',
      environmentTags: ['urban', 'suburban'],
      params: { width: 8.6, depth: 6.8, floorHeight: 3.35, exteriorMaterial: 'painted_stucco', primaryColor: '#f0dfc8', accentColor: '#b35c44', signText: 'Golden Crust Bakery', includePatio: true, cornerLot: true, lotType: 'corner_commercial', includeWindowAds: false }
    },
    {
      id: 'sandwich_shop',
      label: 'Deli & Sandwich Shop',
      environmentTags: ['downtown', 'urban'],
      params: { width: 8.2, depth: 6.4, floorHeight: 3.3, exteriorMaterial: 'brick', primaryColor: '#b86c43', accentColor: '#2e6f40', signText: 'Subway Harbor Deli', includePatio: false, lotType: 'compact_urban' }
    },
    {
      id: 'multi_story_urban_restaurant',
      label: 'Multi-Story Urban Restaurant',
      environmentTags: ['downtown', 'urban', 'nightlife'],
      params: { width: 12.6, depth: 8.8, floors: 3, floorHeight: 3.4, exteriorMaterial: 'brick', primaryColor: '#763b33', trimColor: '#252a30', accentColor: '#c98832', windowStyle: 'sash', signageStyle: 'blade_sign', signText: 'Oldtown Steakhouse', includePatio: true, lotType: 'compact_urban' }
    },
    {
      id: 'corner_commercial_restaurant',
      label: 'Corner Commercial Restaurant',
      environmentTags: ['urban', 'downtown'],
      params: { width: 11.4, depth: 8.2, floors: 2, floorHeight: 3.4, exteriorMaterial: 'stone_brick', primaryColor: '#987c62', accentColor: '#b83c32', signText: 'Liberty Corner Grill', cornerLot: true, sidewalkConfig: 'corner_wrap', lotType: 'corner_commercial', includePatio: true }
    }
  ],
  buildStructure: buildRestaurantStructure,
  planObjects: planRestaurantObjects
});

function buildBarTavernStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.4;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: false,
    transparentGlass: false,
    entranceAwning: true,
    signY: floors * fh - 0.35
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Heavy wood or stone pub vestibule + glowing neon window tubes
  const neonMat = emissiveMaterial(cfg.accentColor || '#ff3b7f', 1.15);
  addBox(mainBuildingGroup, -w * 0.26, 1.85, d * 0.5 + 0.08, 1.1, 0.42, 0.06, neonMat, { cast: false });
  addBox(mainBuildingGroup, w * 0.26, 1.85, d * 0.5 + 0.08, 1.1, 0.42, 0.06, neonMat, { cast: false });

  if (cfg.architecturalEra === 'western' || cfg.signageStyle === 'blade_sign') {
    // Projecting marquee blade or western false-front battlement
    addSignboardUnit(attachedGroup, -w * 0.5 - 0.65, 2.8, d * 0.4, 1.1, 1.7, 'TAVERN', cfg.trimColor || '#1d2229', cfg.accentColor, cfg, { rotY: Math.PI / 2 });
  }

  // Optional Outdoor Beer Garden / Patio on Right Side
  let extraRight = 0;
  let patioMeta = null;
  if (cfg.includePatio) {
    const pw = 4.8;
    const pd = Math.max(5.0, d * 0.85);
    const px = w * 0.5 + pw * 0.5 + 0.15;
    const pz = 0;
    const deckMat = surfaceMaterial('concrete', '#585c60', cfg.condition, cfg.seed + 37, 2, 2);
    const fenceMat = solidMaterial(cfg.trimColor || '#3c3024');
    addBox(attachedGroup, px, 0.08, pz, pw, 0.16, pd, deckMat);
    addBox(attachedGroup, px + pw * 0.5 - 0.08, 0.72, pz, 0.12, 1.25, pd, fenceMat);
    addBox(attachedGroup, px, 0.72, pz + pd * 0.5 - 0.08, pw, 1.25, 0.12, fenceMat);
    addBox(attachedGroup, px, 0.72, pz - pd * 0.5 + 0.08, pw, 1.25, 0.12, fenceMat);

    // String light posts
    for (const sz of [-pd * 0.4, pd * 0.4]) {
      addCylinder(attachedGroup, px + pw * 0.44, 1.5, pz + sz, 0.05, 0.06, 2.8, fenceMat, 6);
    }
    registerBuildingFootprint(placementCtx, {
      id: 'bar_beer_garden',
      minX: px - pw * 0.5,
      maxX: px + pw * 0.5,
      minZ: pz - pd * 0.5,
      maxZ: pz + pd * 0.5,
      maxY: 2.9
    });
    for (let t = 0; t < 2; t++) {
      registerAnchor(placementCtx, {
        id: `bar_patio_${t}`,
        category: 'patio',
        position: [px, 0.16, pz - 1.4 + t * 2.8],
        surfaceY: 0.16,
        rotationY: 0
      });
    }
    extraRight = pw + 0.2;
    patioMeta = { x: px, z: pz, width: pw, depth: pd };
  }

  // Optional Rooftop Lounge Railing
  if (cfg.includeRooftopBar) {
    const ry = shell.roofTopY;
    const railMat = solidMaterial(cfg.trimColor || '#262b33');
    addBox(attachedGroup, 0, ry + 0.48, d * 0.5 - 0.15, w - 0.3, 0.96, 0.08, railMat);
    addBox(attachedGroup, -w * 0.5 + 0.15, ry + 0.48, 0, 0.08, 0.96, d - 0.3, railMat);
    addBox(attachedGroup, w * 0.5 - 0.15, ry + 0.48, 0, 0.08, 0.96, d - 0.3, railMat);
    registerAnchor(placementCtx, {
      id: 'bar_rooftop_table',
      category: 'roof',
      position: [0, ry + 0.05, 0.6],
      surfaceY: ry + 0.05,
      rotationY: 0
    });
  }

  ctx._barPatio = patioMeta;
  ctx.buildingBounds = {
    width: w + extraRight,
    depth: d,
    height: shell.roofTopY + 1.0
  };
  ctx.lotOptions = { rearMargin: 3.8, patio: patioMeta };
}

function planBarTavernObjects(ctx) {
  const { cfg } = ctx;
  const specs = [];
  if (cfg.includePatio && ctx._barPatio) {
    specs.push(
      { familyId: 'cafe_storefront', presetId: 'paris_bistro_table_chairs', groupKey: 'seating_patio', anchorId: 'bar_patio_0', localOffset: [0, 0, 0] },
      { familyId: 'cafe_storefront', presetId: 'paris_bistro_table_chairs', groupKey: 'seating_patio', anchorId: 'bar_patio_1', localOffset: [0, 0, 0] }
    );
  }
  if (cfg.includeRooftopBar) {
    specs.push({
      familyId: 'cafe_storefront',
      presetId: 'paris_bistro_table_chairs',
      groupKey: 'seating_patio',
      anchorId: 'bar_rooftop_table',
      placementLayer: 'roof',
      localOffset: [0, 0, 0]
    });
  }
  if (cfg.includeArcadeSignage) {
    specs.push({
      familyId: 'arcade_neon_sign_decor',
      presetId: 'neon_open_window_sign',
      groupKey: 'signage_lighting',
      anchorId: 'entrance_main',
      localOffset: [1.3, 1.4, -0.35],
      allowElevated: true
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'bar_tavern',
  categoryId: 'food_hospitality',
  categories: ['food_hospitality', 'entertainment_recreation'],
  label: 'Bars, Pubs & Taverns',
  description: 'Dive bars, neighborhood taverns, sports bars, rooftop lounges, neon bars, and arcade bars.',
  environmentTags: ['urban', 'downtown', 'nightlife', 'retro'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['seating_patio', 'signage_lighting', 'waste_utility', 'rooftop_mep'],
  featureSchema: [
    { key: 'includePatio', label: 'Outdoor Beer Garden Patio', type: 'boolean' },
    { key: 'includeRooftopBar', label: 'Rooftop Lounge Deck', type: 'boolean' },
    { key: 'includeArcadeSignage', label: 'Neon Window Sign', type: 'boolean' }
  ],
  defaults: {
    width: 9.6,
    depth: 7.4,
    floors: 1,
    floorHeight: 3.4,
    roofStyle: 'flat',
    exteriorMaterial: 'brick',
    primaryColor: '#5c2c28',
    trimColor: '#1f2328',
    accentColor: '#e94560',
    signageStyle: 'neon_marquee',
    signText: 'Brass Lantern Tap',
    lightingTime: 'dusk',
    includePatio: true,
    includeRooftopBar: false,
    includeArcadeSignage: true,
    includeWindowAds: false,
    includeDumpsters: true,
    lotType: 'compact_urban'
  },
  presets: [
    { id: 'neighborhood_dive_bar', label: 'Neighborhood Dive Bar', environmentTags: ['urban', 'nightlife'], params: { width: 8.2, depth: 6.4, primaryColor: '#4e352f', accentColor: '#ff385c', signText: 'Ollies Taproom', condition: 'worn', includePatio: false, frontSetback: 3.5 } },
    { id: 'classic_tavern', label: 'Classic Oak Tavern', environmentTags: ['urban', 'suburban'], params: { width: 10.4, depth: 7.6, floors: 2, exteriorMaterial: 'stone_brick', primaryColor: '#694e3c', accentColor: '#c98a3b', roofStyle: 'pitched', signText: 'Blackhorse Tavern', includePatio: true } },
    { id: 'sports_bar', label: 'Downtown Sports Bar', environmentTags: ['downtown', 'nightlife'], params: { width: 12.2, depth: 8.4, floors: 1, exteriorMaterial: 'brick', primaryColor: '#7a332d', accentColor: '#2d9cdb', signText: 'Overtime Bar & Grill', includePatio: true, lotType: 'corner_commercial', cornerLot: true } },
    { id: 'cocktail_lounge', label: 'Velvet Cocktail Lounge', environmentTags: ['downtown', 'nightlife'], params: { width: 9.4, depth: 7.2, exteriorMaterial: 'concrete', primaryColor: '#292e36', trimColor: '#a6894c', accentColor: '#f2c14e', signText: 'Midnight Lounge', includePatio: false } },
    { id: 'rooftop_bar', label: 'Two-Story Rooftop Bar', environmentTags: ['downtown', 'nightlife'], params: { width: 10.8, depth: 8.0, floors: 2, primaryColor: '#423846', accentColor: '#ff6b6b', signText: 'Skyline Tap', includeRooftopBar: true, includePatio: false } },
    { id: 'retro_neon_bar', label: 'Retro Neon Bar', environmentTags: ['retro', 'nightlife'], params: { width: 9.0, depth: 6.8, architecturalEra: '1980s_1990s', primaryColor: '#2c223c', accentColor: '#00d9c0', signageStyle: 'neon_marquee', signText: 'Starlight Club', lightingTime: 'night' } },
    { id: 'western_saloon', label: 'Historic False-Front Saloon', environmentTags: ['retro'], params: { width: 10.2, depth: 7.8, floors: 2, architecturalEra: 'historical', exteriorMaterial: 'wood_siding', primaryColor: '#8f623d', accentColor: '#d49a3a', roofStyle: 'stepped', signText: 'Silver Spur Saloon' } },
    { id: 'pub_beer_garden', label: 'Pub With Beer Garden', environmentTags: ['urban', 'suburban'], params: { width: 9.8, depth: 7.2, primaryColor: '#543c2c', accentColor: '#48a868', signText: 'Crown & Oak Pub', includePatio: true } },
    { id: 'corner_nightlife_bar', label: 'Corner Nightlife Bar', environmentTags: ['downtown', 'nightlife'], params: { width: 10.6, depth: 8.2, floors: 2, primaryColor: '#3d2838', accentColor: '#f72585', signText: 'Neon Corner', cornerLot: true, lotType: 'corner_commercial', sidewalkConfig: 'corner_wrap' } },
    { id: 'arcade_bar', label: 'Retro Arcade Bar', environmentTags: ['urban', 'nightlife', 'retro'], params: { width: 11.0, depth: 7.8, primaryColor: '#292c44', accentColor: '#a833ff', signageStyle: 'neon_marquee', signText: 'Quarter Up Barcade', includeArcadeSignage: true, lightingTime: 'night' } }
  ],
  buildStructure: buildBarTavernStructure,
  planObjects: planBarTavernObjects
});

function buildCafeBakeryStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.3;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: Boolean(cfg.interiorDisplay),
    entranceAwning: true,
    signY: floors * fh - 0.32
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Wide striped cafe awning + flower window boxes
  addAwning(mainBuildingGroup, 0, 2.55, d * 0.5, w * 0.88, 1.25, 0.42, cfg.accentColor);
  const planterMat = solidMaterial('#5c412f');
  const leafMat = solidMaterial('#45803d');
  addBox(mainBuildingGroup, -w * 0.28, 0.92, d * 0.5 + 0.18, w * 0.28, 0.24, 0.24, planterMat);
  addBox(mainBuildingGroup, -w * 0.28, 1.1, d * 0.5 + 0.18, w * 0.25, 0.18, 0.2, leafMat);

  let rightExtra = 0;
  if (cfg.includeDriveThru) {
    const cw = 3.0;
    const ch = 3.1;
    addBox(attachedGroup, w * 0.5 + cw * 0.5, ch, 0, cw, 0.28, d, solidMaterial(cfg.trimColor || '#333b44'));
    addBox(attachedGroup, w * 0.5 + cw - 0.18, ch * 0.5, d * 0.35, 0.2, ch, 0.2, solidMaterial(cfg.trimColor || '#333b44'));
    registerLaneClearance(placementCtx, {
      id: 'cafe_drivethru_lane',
      kind: 'drive_thru',
      minX: w * 0.5 + 0.3,
      maxX: w * 0.5 + cw + 0.4,
      minZ: -d * 0.5 - 3,
      maxZ: d * 0.5 + 3
    });
    rightExtra = cw;
  }

  let frontExtra = 0;
  let patioMeta = null;
  if (cfg.includePatio) {
    const pw = Math.max(4.4, w * 0.82);
    const pd = 3.6;
    const pz = d * 0.5 + pd * 0.5 + 0.15;
    addBox(attachedGroup, 0, 0.06, pz, pw, 0.12, pd, surfaceMaterial('plaza_stone', '#b3aba0', cfg.condition, cfg.seed + 19, 3, 2));
    registerAnchor(placementCtx, { id: 'cafe_patio_0', category: 'patio', position: [-pw * 0.26, 0.12, pz], surfaceY: 0.12, rotationY: 0 });
    registerAnchor(placementCtx, { id: 'cafe_patio_1', category: 'patio', position: [pw * 0.26, 0.12, pz], surfaceY: 0.12, rotationY: 0 });
    frontExtra = pd;
    patioMeta = { x: 0, z: pz, width: pw, depth: pd };
  }

  ctx._cafePatio = patioMeta;
  ctx.buildingBounds = { width: w + rightExtra, depth: d + frontExtra, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 3.4, patio: patioMeta };
}

function planCafeBakeryObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'cafe_storefront', presetId: 'sidewalk_a_frame_sign', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.4, 0, 0.5] }
  ];
  if (cfg.includePatio && ctx._cafePatio) {
    specs.push(
      { familyId: 'cafe_storefront', presetId: 'paris_bistro_table_chairs', groupKey: 'seating_patio', anchorId: 'cafe_patio_0', localOffset: [0, 0, 0] },
      { familyId: 'cafe_storefront', presetId: 'paris_bistro_table_chairs', groupKey: 'seating_patio', anchorId: 'cafe_patio_1', localOffset: [0, 0, 0] }
    );
  }
  if (cfg.includeDriveThru) {
    specs.push({
      familyId: 'retail_specialty_displays',
      presetId: 'drive_thru_menu_speaker_board',
      groupKey: 'signage_lighting',
      position: [cfg.width * 0.5 + 2.4, 0.02, -cfg.depth * 0.45 - 1.2],
      rotationY: Math.PI * 0.9,
      allowInLane: true
    });
  }
  if (cfg.includeLandscaping) {
    specs.push({
      familyId: 'park_planter',
      presetId: 'architectural_concrete_planter',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_right',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'cafe_bakery',
  categoryId: 'food_hospitality',
  categories: ['food_hospitality', 'retail_shopping'],
  label: 'Cafes, Coffee Shops & Bakeries',
  description: 'Compact coffee kiosks, neighborhood cafes, patio bakeries, and modern glass cafes.',
  environmentTags: ['urban', 'downtown', 'suburban'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'small_suburban', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['seating_patio', 'site_amenities', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    { key: 'includePatio', label: 'Sidewalk Bistro Patio', type: 'boolean' },
    { key: 'includeDriveThru', label: 'Express Drive-Thru Lane', type: 'boolean' }
  ],
  defaults: {
    width: 8.0,
    depth: 6.2,
    floors: 1,
    floorHeight: 3.3,
    exteriorMaterial: 'brick',
    primaryColor: '#a86a4c',
    accentColor: '#2e6f5e',
    signText: 'Roast & Crumb',
    includePatio: true,
    includeDriveThru: false,
    includeWindowAds: false,
    lotType: 'compact_urban',
    frontSetback: 5.5
  },
  presets: [
    { id: 'tiny_coffee_kiosk', label: 'Tiny Drive/Walk Coffee Kiosk', environmentTags: ['urban', 'suburban'], params: { width: 4.2, depth: 3.6, floorHeight: 2.95, exteriorMaterial: 'wood_siding', primaryColor: '#694a36', accentColor: '#d98c3f', signText: 'Bean Pod', includePatio: false, frontSetback: 3.5 } },
    { id: 'neighborhood_cafe', label: 'Neighborhood Cafe', environmentTags: ['urban'], params: { width: 8.0, depth: 6.2, primaryColor: '#9b5c42', accentColor: '#2f6b58', signText: 'Corner Espresso', includePatio: true } },
    { id: 'cafe_with_patio', label: 'Sunny Bistro Cafe With Patio', environmentTags: ['urban', 'downtown'], params: { width: 9.2, depth: 6.6, exteriorMaterial: 'painted_stucco', primaryColor: '#ebd9c0', accentColor: '#2f5d8a', signText: 'Cafe Soleil', includePatio: true, frontSetback: 6.5 } },
    { id: 'cafe_with_drivethru', label: 'Coffee Shop With Drive-Thru', environmentTags: ['suburban', 'highway'], params: { width: 8.6, depth: 6.4, exteriorMaterial: 'concrete', primaryColor: '#8d99a6', accentColor: '#26734d', signText: 'Morning Rush Coffee', includeDriveThru: true, includePatio: false, lotType: 'roadside_service' } },
    { id: 'bakery_cafe', label: 'Corner Bakery Cafe', environmentTags: ['urban', 'suburban'], params: { width: 8.8, depth: 6.8, exteriorMaterial: 'brick', primaryColor: '#b55f44', accentColor: '#c9882c', signText: 'Morning Loaf Bakery', cornerLot: true, lotType: 'corner_commercial', includePatio: true } },
    { id: 'modern_glass_cafe', label: 'Modern Glass Coffee Bar', environmentTags: ['downtown', 'modern'], params: { width: 9.6, depth: 6.8, floorHeight: 3.6, architecturalEra: 'modern_corporate', exteriorMaterial: 'concrete', primaryColor: '#58626e', accentColor: '#e07a32', signText: 'Third Wave Coffee', includePatio: true } }
  ],
  buildStructure: buildCafeBakeryStructure,
  planObjects: planCafeBakeryObjects
});
