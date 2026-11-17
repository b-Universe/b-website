import { clamp } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint,
  registerLaneClearance
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial, emissiveMaterial } from '../materials/materials.js';
import {
  addBox,
  addCylinder,
  addStandardBuildingShell,
  addRollUpGarageDoor,
  addSignboardUnit,
  addAwning,
  addWindowAdDecals
} from '../geometry/arch-primitives.js';

function buildCostumeShopStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.5;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: Boolean(cfg.interiorDisplay !== false),
    entranceAwning: true,
    signY: floors * fh - 0.34
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Theatrical display window pedestals & colorful cape/hero showcase backing
  const plinthMat = solidMaterial(cfg.trimColor || '#262b38');
  const spotlightMat = emissiveMaterial('#ffe8a3', 1.0);
  if (cfg.interiorDisplay !== false) {
    addBox(attachedGroup, -w * 0.27, 0.22, d * 0.34, Math.min(2.2, w * 0.28), 0.36, 1.35, plinthMat);
    addBox(attachedGroup, w * 0.27, 0.22, d * 0.34, Math.min(2.2, w * 0.28), 0.36, 1.35, plinthMat);
    addBox(attachedGroup, -w * 0.27, 2.38, d * 0.36, 0.6, 0.08, 0.25, spotlightMat, { cast: false });
    addBox(attachedGroup, w * 0.27, 2.38, d * 0.36, 0.6, 0.08, 0.25, spotlightMat, { cast: false });

    registerAnchor(placementCtx, {
      id: 'costume_mannequin_left',
      category: 'interior_display',
      position: [-w * 0.27, 0.4, d * 0.35],
      surfaceY: 0.4,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'costume_rack_right',
      category: 'interior_display',
      position: [w * 0.27, 0.4, d * 0.34],
      surfaceY: 0.4,
      rotationY: -0.2
    });
  }

  // Projecting whimsical mask/star blade sign
  addSignboardUnit(attachedGroup, -w * 0.5 - 0.58, 2.85, d * 0.35, 1.05, 1.35, 'Costumes', cfg.accentColor, '#ffffff', cfg, { rotY: Math.PI / 2 });

  ctx.buildingBounds = { width: w + 0.8, depth: d, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 3.4 };
}

function planCostumeShopObjects(ctx) {
  const { cfg } = ctx;
  const specs = [];
  if (cfg.interiorDisplay !== false) {
    specs.push(
      { familyId: 'retail_specialty_displays', presetId: 'superhero_costume_mannequin', groupKey: 'interior_display', anchorId: 'costume_mannequin_left', localOffset: [0, 0, 0] },
      { familyId: 'retail_specialty_displays', presetId: 'costume_clothing_display_rack', groupKey: 'interior_display', anchorId: 'costume_rack_right', localOffset: [0, 0, 0] }
    );
  }
  specs.push({
    familyId: 'cafe_storefront',
    presetId: 'sidewalk_a_frame_sign',
    groupKey: 'site_amenities',
    anchorId: 'entrance_main',
    localOffset: [1.5, 0, 0.4]
  });
  if (cfg.includeDumpsters) {
    specs.push({
      familyId: 'wheeled_bin',
      presetId: 'wheeled_household_trash',
      groupKey: 'waste_utility',
      anchorId: 'service_yard_dumpster',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'costume_shop',
  categoryId: 'retail_shopping',
  categories: ['retail_shopping', 'entertainment_recreation'],
  label: 'Costume & Superhero Merch Shops',
  description: 'Costume boutiques, hero merch stores, comic shops, and theatrical rental houses.',
  environmentTags: ['urban', 'downtown', 'superhero_city', 'retro'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'small_suburban', 'none'],
  defaultObjectGroups: ['interior_display', 'site_amenities', 'waste_utility'],
  featureSchema: [
    { key: 'interiorDisplay', label: 'Showroom Window Mannequins', type: 'boolean' }
  ],
  defaults: {
    width: 9.0,
    depth: 6.8,
    floors: 2,
    floorHeight: 3.4,
    exteriorMaterial: 'brick',
    primaryColor: '#5c416e',
    trimColor: '#252936',
    accentColor: '#f2b705',
    signText: 'Paragon Costumes',
    interiorDisplay: true,
    includeWindowAds: false,
    lotType: 'compact_urban'
  },
  presets: [
    { id: 'small_costume_shop', label: 'Small Neighborhood Costume Shop', environmentTags: ['urban'], params: { width: 7.6, depth: 6.0, floors: 1, primaryColor: '#6d4c7d', accentColor: '#f4a261', signText: 'Masquerade Costumes' } },
    { id: 'comic_costume_store', label: 'Comic & Costume Store', environmentTags: ['urban', 'superhero_city'], params: { width: 9.2, depth: 6.8, floors: 2, primaryColor: '#2c4c7e', accentColor: '#e63946', signText: 'Star City Comics & Capes' } },
    { id: 'superhero_merch_shop', label: 'Superhero Apparel & Merch Shop', environmentTags: ['downtown', 'superhero_city'], params: { width: 10.2, depth: 7.4, floors: 2, exteriorMaterial: 'concrete', primaryColor: '#2b3445', accentColor: '#f5b82e', signageStyle: 'illuminated_fascia', signText: 'Hero Gear Emporium' } },
    { id: 'vintage_costume_boutique', label: 'Vintage Costume Boutique', environmentTags: ['retro', 'urban'], params: { width: 8.2, depth: 6.4, floors: 2, architecturalEra: 'historical', exteriorMaterial: 'brick', primaryColor: '#7a3b48', accentColor: '#d4a34a', windowStyle: 'arched', signText: 'Velvet Stage Boutique' } },
    { id: 'theater_costume_supply', label: 'Theater Costume Supply Warehouse', environmentTags: ['urban', 'downtown'], params: { width: 11.4, depth: 8.2, floors: 2, primaryColor: '#52495e', accentColor: '#c93b5b', signText: 'Grand Stage Costumers' } }
  ],
  buildStructure: buildCostumeShopStructure,
  planObjects: planCostumeShopObjects
});

function buildPharmacyApothecaryStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.4;
  const isVintage = cfg.pharmacyStyle === 'vintage_apothecary';

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: Boolean(cfg.interiorDisplay !== false),
    entranceAwning: true,
    signY: floors * fh - 0.32
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Signature Illuminated Green Pharmacy Cross (or Vintage Mortar Emblem)
  const crossColor = isVintage ? '#2e8b57' : '#22c55e';
  const crossMat = emissiveMaterial(crossColor, 1.0);
  const frameMat = solidMaterial(cfg.trimColor || '#263038');
  const cx = -w * 0.5 - 0.45;
  const cy = 2.95;
  const cz = d * 0.34;
  addBox(attachedGroup, cx, cy, cz, 0.14, 0.92, 0.34, frameMat);
  addBox(attachedGroup, cx, cy, cz, 0.16, 0.78, 0.24, crossMat, { cast: false });
  addBox(attachedGroup, cx, cy, cz, 0.16, 0.24, 0.78, crossMat, { cast: false });

  if (isVintage) {
    // Timber brackets + ornate vintage hanging lanterns beside door
    const lanternMat = emissiveMaterial('#ffb85c', 0.9);
    for (const sx of [-1.25, 1.25]) {
      addBox(attachedGroup, sx, 2.35, d * 0.5 + 0.14, 0.2, 0.34, 0.2, lanternMat, { cast: false });
    }
    registerAnchor(placementCtx, {
      id: 'pharmacy_cabinet_slot',
      category: 'interior_display',
      position: [-w * 0.25, 0.08, d * 0.25],
      surfaceY: 0.08,
      rotationY: 0
    });
  } else {
    registerAnchor(placementCtx, {
      id: 'pharmacy_cabinet_slot',
      category: 'interior_display',
      position: [-w * 0.25, 0.08, d * 0.25],
      surfaceY: 0.08,
      rotationY: 0
    });
  }

  let rightExtra = 0;
  if (cfg.includeDriveThru) {
    const cw = 3.2;
    const ch = 3.2;
    addBox(attachedGroup, w * 0.5 + cw * 0.5, ch, 0, cw, 0.32, d, solidMaterial(cfg.trimColor || '#323a44'));
    addBox(attachedGroup, w * 0.5 + cw - 0.2, ch * 0.5, d * 0.35, 0.22, ch, 0.22, solidMaterial(cfg.trimColor || '#323a44'));
    addBox(attachedGroup, w * 0.5 + cw - 0.2, ch * 0.5, -d * 0.35, 0.22, ch, 0.22, solidMaterial(cfg.trimColor || '#323a44'));
    addBox(attachedGroup, w * 0.5 + 0.08, 1.55, 0.4, 0.12, 1.0, 1.3, solidMaterial('#1c242c'));
    registerLaneClearance(placementCtx, {
      id: 'pharmacy_drivethru_lane',
      kind: 'drive_thru',
      minX: w * 0.5 + 0.3,
      maxX: w * 0.5 + cw + 0.4,
      minZ: -d * 0.5 - 3,
      maxZ: d * 0.5 + 3
    });
    rightExtra = cw;
  }

  ctx.buildingBounds = { width: w + rightExtra + 0.6, depth: d, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 3.8 };
}

function planPharmacyObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const isVintage = cfg.pharmacyStyle === 'vintage_apothecary';
  const specs = [
    {
      familyId: 'retail_specialty_displays',
      presetId: isVintage ? 'apothecary_herb_bottle_cabinet' : 'pharmacy_prescription_shelf_bay',
      groupKey: 'interior_display',
      anchorId: 'pharmacy_cabinet_slot',
      localOffset: [0, 0, 0]
    },
    {
      familyId: 'park_planter',
      presetId: 'architectural_concrete_planter',
      groupKey: 'site_amenities',
      anchorId: 'entrance_main',
      localOffset: [1.8, 0, 0.25]
    }
  ];
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
  id: 'pharmacy_apothecary',
  categoryId: 'retail_shopping',
  categories: ['retail_shopping', 'emergency_healthcare'],
  label: 'Pharmacies & Apothecaries',
  description: 'Modern neighborhood & chain pharmacies, drive-thru drugstores, and vintage herbal apothecaries.',
  environmentTags: ['urban', 'suburban', 'medical', 'retro'],
  supportedLotTypes: ['standalone_commercial', 'compact_urban', 'corner_commercial', 'small_suburban', 'none'],
  defaultObjectGroups: ['interior_display', 'site_amenities', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    { key: 'pharmacyStyle', label: 'Pharmacy Era Style', type: 'select', options: [
      { id: 'modern_pharmacy', label: 'Modern Drugstore' },
      { id: 'vintage_apothecary', label: 'Vintage Wood Apothecary' }
    ] },
    { key: 'includeDriveThru', label: 'Prescription Drive-Thru Lane', type: 'boolean' }
  ],
  defaults: {
    width: 11.4,
    depth: 8.2,
    floors: 1,
    floorHeight: 3.5,
    exteriorMaterial: 'brick',
    primaryColor: '#d9d3c7',
    trimColor: '#2b3640',
    accentColor: '#22a35a',
    signText: 'Greenleaf Pharmacy',
    pharmacyStyle: 'modern_pharmacy',
    includeDriveThru: false,
    interiorDisplay: true,
    includeDumpsters: true,
    lotType: 'corner_commercial'
  },
  presets: [
    { id: 'neighborhood_pharmacy', label: 'Neighborhood Corner Pharmacy', environmentTags: ['urban', 'medical'], params: { width: 10.2, depth: 7.4, primaryColor: '#c9beae', accentColor: '#209e58', signText: 'Harbor Chemist Pharmacy', cornerLot: true } },
    { id: 'chain_pharmacy', label: 'Modern Chain Pharmacy', environmentTags: ['suburban', 'medical'], params: { width: 14.5, depth: 9.8, exteriorMaterial: 'concrete', primaryColor: '#e2e5e9', accentColor: '#d93829', signText: 'MedCare Drugstore', lotType: 'standalone_commercial', parkingConfig: 'front_row' } },
    { id: 'pharmacy_drivethru', label: 'Drive-Thru Community Pharmacy', environmentTags: ['suburban', 'medical'], params: { width: 12.2, depth: 8.6, exteriorMaterial: 'painted_stucco', primaryColor: '#e6dfd3', accentColor: '#259b5c', signText: 'CarePlus Rx Drive-Thru', includeDriveThru: true, lotType: 'standalone_commercial' } },
    { id: 'vintage_apothecary', label: 'Vintage Brass & Oak Apothecary', environmentTags: ['retro', 'urban'], params: { width: 8.4, depth: 6.4, floors: 2, architecturalEra: 'historical', exteriorMaterial: 'wood_siding', primaryColor: '#5c3c28', trimColor: '#2b1e16', accentColor: '#2e8b57', windowStyle: 'arched', pharmacyStyle: 'vintage_apothecary', signText: 'Olde Towne Apothecary', lotType: 'compact_urban' } },
    { id: 'herbal_apothecary_shop', label: 'Botanical Herbal Shop', environmentTags: ['urban', 'retro'], params: { width: 7.8, depth: 6.0, exteriorMaterial: 'stone_brick', primaryColor: '#8d7a64', accentColor: '#3f7d4c', windowStyle: 'arched', pharmacyStyle: 'vintage_apothecary', signText: 'Sage & Mortar Herbals', lotType: 'compact_urban' } }
  ],
  buildStructure: buildPharmacyApothecaryStructure,
  planObjects: planPharmacyObjects
});

function buildHardwareSupplyStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const fh = Math.max(cfg.floorHeight || 4.0, 3.6);

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors: 1,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: false,
    entranceAwning: true,
    signY: fh - 0.35
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Loading roll-up door on side wall
  addRollUpGarageDoor(attachedGroup, w * 0.5 + 0.04, 0, -d * 0.15, 2.8, 2.9, cfg, { rotY: Math.PI / 2, openRatio: 0.45 });

  // Outdoor Lumber Yard Shed & Cantilever Racks on Left Side
  let leftExtra = 0;
  if (cfg.includeLumberYard !== false) {
    const yw = 5.6;
    const yd = d + 0.6;
    const yx = -w * 0.5 - yw * 0.5 - 0.3;
    const concreteMat = surfaceMaterial('concrete', '#787f85', cfg.condition, cfg.seed + 23, 2, 2);
    const steelMat = solidMaterial('#3a424c');
    const woodMat = solidMaterial('#cfa163');

    addBox(attachedGroup, yx, 0.06, 0, yw, 0.12, yd, concreteMat);
    // Shed roof over outer lumber racks
    for (const sz of [-yd * 0.36, 0, yd * 0.36]) {
      addBox(attachedGroup, yx - yw * 0.35, 1.85, sz, 0.16, 3.6, 0.16, steelMat);
      addBox(attachedGroup, yx - yw * 0.05, 1.2, sz, 1.8, 0.1, 0.14, steelMat);
      addBox(attachedGroup, yx - yw * 0.05, 2.3, sz, 1.8, 0.1, 0.14, steelMat);
    }
    // Timber stacks on racks
    addBox(attachedGroup, yx - yw * 0.05, 1.55, 0, 1.4, 0.52, yd * 0.72, woodMat);
    addBox(attachedGroup, yx - yw * 0.05, 2.65, 0, 1.35, 0.45, yd * 0.7, solidMaterial('#b8894c'));
    addBox(attachedGroup, yx - yw * 0.18, 3.65, 0, 3.2, 0.18, yd + 0.3, solidMaterial(cfg.accentColor || '#c94c24'));

    registerBuildingFootprint(placementCtx, {
      id: 'hardware_lumber_shed',
      minX: yx - yw * 0.5,
      maxX: yx + yw * 0.5,
      minZ: -yd * 0.5,
      maxZ: yd * 0.5,
      maxY: 3.8
    });
    registerAnchor(placementCtx, {
      id: 'lumber_yard_pallet',
      category: 'service_yard',
      position: [yx + yw * 0.2, 0.12, yd * 0.25],
      surfaceY: 0.12,
      rotationY: 0
    });
    leftExtra = yw + 0.3;
  }

  ctx.buildingBounds = { width: w + leftExtra, depth: d, height: shell.roofTopY + 0.5 };
  ctx.lotOptions = { rearMargin: 4.5, industrialFence: cfg.includeLumberYard !== false };
}

function planHardwareSupplyObjects(ctx) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'industrial_cargo', presetId: 'stacked_wooden_pallets', groupKey: 'service_equipment', anchorId: 'entrance_main', localOffset: [-2.4, 0, 0.35] },
    { familyId: 'gas_station_amenities', presetId: 'propane_cylinder_exchange_cage', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.4, 0, 0.3] }
  ];
  if (cfg.includeLumberYard !== false) {
    specs.push({
      familyId: 'industrial_cargo',
      presetId: 'warehouse_counterbalance_forklift',
      groupKey: 'service_equipment',
      anchorId: 'lumber_yard_pallet',
      localOffset: [0, 0, 0],
      minDensity: 0.4
    });
  }
  if (cfg.includeDumpsters) {
    specs.push({
      familyId: 'commercial_dumpster',
      presetId: 'roll_off_construction_dumpster',
      groupKey: 'waste_utility',
      anchorId: 'service_yard_dumpster',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'hardware_supply',
  categoryId: 'retail_shopping',
  categories: ['retail_shopping', 'industrial_infrastructure'],
  label: 'Hardware & Building Supply Stores',
  description: 'Neighborhood hardware shops, lumber yards, tool supply depots, and contractor warehouses.',
  environmentTags: ['suburban', 'industrial', 'urban'],
  supportedLotTypes: ['industrial_service', 'standalone_commercial', 'compact_urban', 'none'],
  defaultObjectGroups: ['service_equipment', 'site_amenities', 'waste_utility'],
  featureSchema: [
    { key: 'includeLumberYard', label: 'Outdoor Covered Lumber Rack Yard', type: 'boolean' }
  ],
  defaults: {
    width: 12.6,
    depth: 9.0,
    floors: 1,
    floorHeight: 4.1,
    exteriorMaterial: 'corrugated_metal',
    primaryColor: '#b89a74',
    accentColor: '#c94c24',
    signText: 'Valley Hardware & Lumber',
    includeLumberYard: true,
    includeDumpsters: true,
    lotType: 'industrial_service',
    frontSetback: 7.0
  },
  presets: [
    { id: 'neighborhood_hardware', label: 'Neighborhood Hardware Store', environmentTags: ['urban', 'suburban'], params: { width: 10.6, depth: 7.8, exteriorMaterial: 'brick', primaryColor: '#994c3d', accentColor: '#d97724', signText: 'Main Street Hardware', includeLumberYard: false, lotType: 'standalone_commercial' } },
    { id: 'lumber_supply_business', label: 'Lumber & Timber Supply Yard', environmentTags: ['industrial', 'suburban'], params: { width: 13.0, depth: 9.2, primaryColor: '#a68b67', accentColor: '#2d7a47', signText: 'Redwood Lumber Supply', includeLumberYard: true } },
    { id: 'industrial_tool_supply', label: 'Industrial Tool Supply Co.', environmentTags: ['industrial'], params: { width: 12.4, depth: 8.8, primaryColor: '#566270', accentColor: '#e85d04', signText: 'Heavy Duty Tool Supply', includeLumberYard: false } },
    { id: 'building_materials_retailer', label: 'Building Materials Depot', environmentTags: ['industrial', 'suburban'], params: { width: 14.8, depth: 10.2, primaryColor: '#6f7782', accentColor: '#e0532c', signText: 'Builders Supply Depot', includeLumberYard: true } }
  ],
  buildStructure: buildHardwareSupplyStructure,
  planObjects: planHardwareSupplyObjects
});

function buildPawnShopStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 1;
  const fh = cfg.floorHeight || 3.4;

  // Pawn shop forces security bars if high-security mode or windowStyle === 'barred'
  const origWinStyle = cfg.windowStyle;
  if (cfg.highSecurityBars !== false) cfg.windowStyle = 'barred';
  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    forceStorefront: true,
    transparentGlass: false,
    entranceAwning: false,
    signY: floors * fh - 0.34
  });
  cfg.windowStyle = origWinStyle;
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  // Roll-down steel security gate housings over front windows
  const shutterMat = solidMaterial('#4b545e');
  addBox(attachedGroup, -w * 0.27, 2.38, d * 0.5 + 0.14, Math.max(1.5, w * 0.3), 0.32, 0.26, shutterMat);
  addBox(attachedGroup, w * 0.27, 2.38, d * 0.5 + 0.14, Math.max(1.5, w * 0.3), 0.32, 0.26, shutterMat);

  // Heavy steel security door awning + bold neon sign
  addBox(attachedGroup, 0, 2.45, d * 0.5 + 0.55, 2.4, 0.18, 1.1, solidMaterial('#242930'));
  addSignboardUnit(attachedGroup, -w * 0.5 - 0.55, 2.8, d * 0.35, 0.95, 1.45, 'PAWN', '#1c2026', '#ffcc29', cfg, { rotY: Math.PI / 2 });

  if (cfg.includeWindowAds !== false) {
    addWindowAdDecals(mainBuildingGroup, -w * 0.27, 1.4, d * 0.5 + 0.11, Math.max(1.2, w * 0.3), 1.1, cfg, clamp(cfg.storefrontClutterDensity ?? 0.65, 0, 1), cfg.seed + 83);
  }

  ctx.buildingBounds = { width: w + 0.8, depth: d, height: shell.roofTopY + 0.4 };
  ctx.lotOptions = { rearMargin: 3.4 };
}

function planPawnShopObjects(ctx) {
  const { cfg } = ctx;
  const clutter = clamp(cfg.storefrontClutterDensity ?? 0.65, 0, 1);
  const specs = [
    {
      familyId: 'arcade_neon_sign_decor',
      presetId: 'neon_open_window_sign',
      groupKey: 'signage_lighting',
      anchorId: 'entrance_main',
      localOffset: [1.3, 1.45, -0.25]
    }
  ];
  if (clutter >= 0.35) {
    specs.push({
      familyId: 'bike_rack',
      presetId: 'stainless_u_loop_rack',
      groupKey: 'site_amenities',
      anchorId: 'entrance_main',
      localOffset: [-2.1, 0, 0.35]
    });
  }
  if (clutter >= 0.6) {
    specs.push({
      familyId: 'newspaper_box',
      presetId: 'classic_newspaper_honor_box',
      groupKey: 'site_amenities',
      anchorId: 'sidewalk_front_right',
      localOffset: [0, 0, 0]
    });
  }
  if (cfg.includeDumpsters) {
    specs.push({
      familyId: 'commercial_dumpster',
      presetId: 'rusted_alley_dumpster',
      groupKey: 'waste_utility',
      anchorId: 'service_yard_dumpster',
      localOffset: [0, 0, 0]
    });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'pawn_shop',
  categoryId: 'retail_shopping',
  categories: ['retail_shopping', 'commercial_services'],
  label: 'Pawn & Secondhand Shops',
  description: 'Barred-window pawn shops, corner loan shops, security shops, and vintage secondhand stores.',
  environmentTags: ['urban', 'retro', 'nightlife'],
  supportedLotTypes: ['compact_urban', 'corner_commercial', 'standalone_commercial', 'none'],
  defaultObjectGroups: ['signage_lighting', 'site_amenities', 'waste_utility'],
  featureSchema: [
    { key: 'highSecurityBars', label: 'Security Window Bars & Shutters', type: 'boolean' },
    { key: 'storefrontClutterDensity', label: 'Storefront Clutter Density', type: 'range', min: 0, max: 1, step: 0.05 }
  ],
  defaults: {
    width: 8.6,
    depth: 6.8,
    floors: 1,
    floorHeight: 3.4,
    exteriorMaterial: 'brick',
    primaryColor: '#754b38',
    accentColor: '#f2b705',
    signageStyle: 'neon_marquee',
    signText: 'Gold Coin Pawn & Loan',
    condition: 'weathered',
    highSecurityBars: true,
    storefrontClutterDensity: 0.72,
    includeSecurityCameras: true,
    lotType: 'compact_urban'
  },
  presets: [
    { id: 'small_pawn_shop', label: 'Small Neighborhood Pawn Shop', environmentTags: ['urban'], params: { width: 7.8, depth: 6.2, primaryColor: '#6b4938', accentColor: '#e6b822', signText: 'Ace Pawn & Jewelry' } },
    { id: 'urban_corner_pawn_shop', label: 'Urban Corner Pawn Shop', environmentTags: ['urban', 'nightlife'], params: { width: 9.4, depth: 7.0, floors: 2, primaryColor: '#5c3b34', accentColor: '#ff4757', signText: 'Liberty Pawn & Cash', cornerLot: true, lotType: 'corner_commercial' } },
    { id: 'high_security_pawn_shop', label: 'High-Security Grated Pawn Shop', environmentTags: ['urban'], params: { width: 8.8, depth: 6.8, exteriorMaterial: 'concrete', primaryColor: '#5c646c', accentColor: '#f5b82e', highSecurityBars: true, storefrontClutterDensity: 0.85, signText: 'Iron Vault Pawn' } },
    { id: 'vintage_secondhand_shop', label: 'Vintage Secondhand & Curio Shop', environmentTags: ['retro', 'urban'], params: { width: 8.4, depth: 6.4, architecturalEra: '1960s_1970s', primaryColor: '#705841', accentColor: '#48a868', highSecurityBars: false, condition: 'worn', signText: 'Relic Secondhand Goods' } }
  ],
  buildStructure: buildPawnShopStructure,
  planObjects: planPawnShopObjects
});
