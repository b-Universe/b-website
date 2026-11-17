import { clamp } from '../utils.js';
import { registerSpecialtyFamily } from '../core/registry.js';
import {
  registerAnchor,
  registerBuildingFootprint
} from '../core/placement-anchors.js';
import { solidMaterial, surfaceMaterial } from '../materials/materials.js';
import {
  addBox,
  addStandardBuildingShell,
  addSignboardUnit
} from '../geometry/arch-primitives.js';

function buildHotelMotelStructure(ctx) {
  const { cfg, mainBuildingGroup, attachedGroup, placementCtx } = ctx;
  const w = cfg.width;
  const d = cfg.depth;
  const floors = cfg.floors || 2;
  const fh = cfg.floorHeight || 3.2;

  const shell = addStandardBuildingShell(mainBuildingGroup, ctx, {
    width: w,
    depth: d,
    floors,
    floorHeight: fh,
    entranceAwning: false,
    signY: floors * fh - 0.32
  });
  ctx.entrances.push(...shell.entrances);
  ctx.roofTopY = shell.roofTopY;

  const trimMat = solidMaterial(cfg.trimColor || '#2b3440');
  const railMat = solidMaterial('#ced6de');

  // Front porte-cochere drop-off canopy
  if (cfg.includePorteCochere !== false) {
    const cw = Math.min(5.6, w * 0.44);
    const cd = 3.2;
    const ch = 3.25;
    addBox(attachedGroup, 0, ch, d * 0.5 + cd * 0.5, cw, 0.34, cd, trimMat);
    addBox(attachedGroup, -cw * 0.44, ch * 0.5, d * 0.5 + cd - 0.22, 0.32, ch, 0.32, trimMat);
    addBox(attachedGroup, cw * 0.44, ch * 0.5, d * 0.5 + cd - 0.22, 0.32, ch, 0.32, trimMat);
    addSignboardUnit(attachedGroup, 0, ch + 0.1, d * 0.5 + cd + 0.08, cw * 0.86, 0.56, cfg.signText || 'Starlight Hotel', cfg.primaryColor, '#ffffff', cfg);
  }

  // Exterior Motel Walkway Gallery & Stairs OR Hotel Balconies per upper floor
  if (cfg.lodgingStyle === 'exterior_motel' && floors >= 2) {
    for (let f = 1; f < floors; f++) {
      const wy = f * fh;
      addBox(attachedGroup, 0, wy, d * 0.5 + 0.72, w - 0.2, 0.14, 1.4, solidMaterial('#78828c'));
      addBox(attachedGroup, 0, wy + 0.52, d * 0.5 + 1.38, w - 0.2, 0.92, 0.06, railMat);
    }
    // Exterior end staircase steps
    for (let s = 0; s < 6; s++) {
      addBox(attachedGroup, -w * 0.5 - 0.6, (s + 0.5) * (fh / 6), d * 0.5 + 0.9 - s * 0.28, 1.0, 0.16, 0.32, solidMaterial('#68727c'));
    }
  } else if (cfg.includeBalconies && floors >= 2) {
    const balCols = clamp(Math.floor(w / 3.4), 2, 5);
    for (let f = 1; f < floors; f++) {
      const wy = f * fh;
      for (let c = 0; c < balCols; c++) {
        const bx = -w * 0.36 + (balCols > 1 ? (c / (balCols - 1)) * (w * 0.72) : 0);
        addBox(attachedGroup, bx, wy + 0.06, d * 0.5 + 0.55, 2.2, 0.14, 1.05, trimMat);
        addBox(attachedGroup, bx, wy + 0.56, d * 0.5 + 1.04, 2.2, 0.92, 0.06, railMat);
        addBox(attachedGroup, bx - 1.06, wy + 0.56, d * 0.5 + 0.55, 0.06, 0.92, 1.0, railMat);
        addBox(attachedGroup, bx + 1.06, wy + 0.56, d * 0.5 + 0.55, 0.06, 0.92, 1.0, railMat);
      }
    }
  }

  // Optional Courtyard Pool Deck on Right Side
  let extraRight = 0;
  if (cfg.includePoolDeck) {
    const pw = 6.2;
    const pd = Math.max(7.2, d * 0.95);
    const px = w * 0.5 + pw * 0.5 + 0.25;
    addBox(attachedGroup, px, 0.06, 0, pw, 0.12, pd, surfaceMaterial('plaza_stone', '#d4cab8', 'clean', cfg.seed + 19, 3, 4));
    addBox(attachedGroup, px, 0.13, 0, pw * 0.65, 0.06, pd * 0.68, solidMaterial('#3aa6d8'), { cast: false });
    addBox(attachedGroup, px + pw * 0.5 - 0.08, 0.62, 0, 0.1, 1.1, pd, trimMat);
    registerBuildingFootprint(placementCtx, {
      id: 'hotel_pool_deck',
      minX: px - pw * 0.5,
      maxX: px + pw * 0.5,
      minZ: -pd * 0.5,
      maxZ: pd * 0.5,
      maxY: 1.5
    });
    registerAnchor(placementCtx, {
      id: 'hotel_pool_lounger_spot',
      category: 'patio',
      position: [px - pw * 0.34, 0.12, -pd * 0.25],
      surfaceY: 0.12,
      rotationY: Math.PI / 2
    });
    extraRight = pw + 0.3;
  }

  ctx.buildingBounds = { width: w + extraRight, depth: d + 3.4, height: shell.roofTopY + 0.6 };
  ctx.lotOptions = { rearMargin: 4.0 };
}

function planHotelMotelObjects(ctx, lotLayout) {
  const { cfg } = ctx;
  const specs = [
    { familyId: 'retail_specialty_displays', presetId: 'hotel_brass_luggage_cart', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [-1.8, 0, 1.3] },
    { familyId: 'park_planter', presetId: 'architectural_concrete_planter', groupKey: 'site_amenities', anchorId: 'entrance_main', localOffset: [2.2, 0, 1.2] }
  ];
  if (cfg.includePoolDeck) {
    specs.push({ familyId: 'retail_specialty_displays', presetId: 'poolside_lounge_chair_table', groupKey: 'seating_patio', anchorId: 'hotel_pool_lounger_spot', localOffset: [0, 0, 0] });
  }
  if (cfg.includeVendingMachines !== false) {
    specs.push({ familyId: 'soda_vending_machines', presetId: 'classic_can_soda_vending', groupKey: 'site_amenities', anchorId: 'sidewalk_front_left', localOffset: [0, 0, 0] });
  }
  if (cfg.includeRoadsideSign && lotLayout.enabled) {
    specs.push({ familyId: 'cafe_storefront', presetId: 'illuminated_city_ad_totem', groupKey: 'signage_lighting', anchorId: 'roadside_sign_corner', localOffset: [0, 0, 0] });
  }
  return specs;
}

registerSpecialtyFamily({
  id: 'hotel_motel',
  categoryId: 'lodging_accommodation',
  categories: ['lodging_accommodation', 'food_hospitality'],
  label: 'Hotels, Motels & Motor Lodges',
  description: 'Roadside motels, exterior-corridor lodges, modern business hotels, boutique hotels, and pool resorts.',
  environmentTags: ['highway', 'suburban', 'urban', 'downtown', 'retro'],
  supportedLotTypes: ['standalone_commercial', 'roadside_service', 'compact_urban', 'civic_plaza', 'none'],
  defaultObjectGroups: ['site_amenities', 'seating_patio', 'rooftop_mep', 'waste_utility', 'signage_lighting'],
  featureSchema: [
    { key: 'lodgingStyle', label: 'Corridor Style', type: 'select', options: [
      { id: 'exterior_motel', label: 'Exterior Corridor Motel' },
      { id: 'interior_hotel', label: 'Interior Corridor Hotel' }
    ] },
    { key: 'includePorteCochere', label: 'Porte-Cochere Arrival Canopy', type: 'boolean' },
    { key: 'includeBalconies', label: 'Guest Room Balconies', type: 'boolean' },
    { key: 'includePoolDeck', label: 'Pool Courtyard Deck', type: 'boolean' }
  ],
  defaults: {
    width: 17.5,
    depth: 9.0,
    floors: 2,
    floorHeight: 3.15,
    exteriorMaterial: 'painted_stucco',
    primaryColor: '#d6ccb8',
    trimColor: '#2e4052',
    accentColor: '#e07a32',
    signText: 'Starlight Motor Inn',
    lodgingStyle: 'exterior_motel',
    includePorteCochere: true,
    includeBalconies: false,
    includePoolDeck: true,
    includeRooftopHvac: true,
    includeDumpsters: true,
    lotType: 'standalone_commercial',
    frontSetback: 8.0
  },
  presets: [
    { id: 'small_roadside_motel', label: 'Small Highway Roadside Motel', environmentTags: ['highway', 'retro'], params: { width: 15.2, depth: 7.4, floors: 1, lodgingStyle: 'exterior_motel', includePoolDeck: false, primaryColor: '#dfd3be', accentColor: '#d9483b', signText: 'Sunset Route Motel', lotType: 'roadside_service' } },
    { id: 'classic_exterior_corridor_motel', label: '2-Story Exterior-Corridor Motel', environmentTags: ['highway', 'suburban', 'retro'], params: { width: 18.6, depth: 8.2, floors: 2, lodgingStyle: 'exterior_motel', includePoolDeck: true, primaryColor: '#e3d5be', accentColor: '#2a9d8f', signText: 'Palms Oasis Motel' } },
    { id: 'retro_1960s_motor_lodge', label: 'Retro 1960s Neon Motor Lodge', environmentTags: ['retro', 'highway'], params: { width: 17.2, depth: 8.0, floors: 2, architecturalEra: '1960s_1970s', lodgingStyle: 'exterior_motel', signageStyle: 'neon_marquee', accentColor: '#e63946', lightingTime: 'dusk', signText: 'Flamingo Motor Lodge' } },
    { id: 'modern_business_hotel', label: 'Modern Corporate Hotel', environmentTags: ['downtown', 'modern'], params: { width: 16.4, depth: 10.4, floors: 4, floorHeight: 3.3, lodgingStyle: 'interior_hotel', exteriorMaterial: 'concrete', primaryColor: '#566473', accentColor: '#0077b6', includeBalconies: false, includePoolDeck: false, signText: 'Meridian Business Hotel', lotType: 'compact_urban' } },
    { id: 'boutique_urban_hotel', label: 'Boutique Balcony Hotel', environmentTags: ['urban', 'downtown'], params: { width: 14.2, depth: 9.2, floors: 3, lodgingStyle: 'interior_hotel', exteriorMaterial: 'brick', primaryColor: '#8d4c3e', windowStyle: 'arched', includeBalconies: true, includePoolDeck: false, signText: 'The Sovereign Boutique', lotType: 'compact_urban' } },
    { id: 'luxury_hotel', label: 'Grand Resort & Pool Hotel', environmentTags: ['downtown', 'modern'], params: { width: 19.2, depth: 10.8, floors: 4, floorHeight: 3.4, lodgingStyle: 'interior_hotel', exteriorMaterial: 'limestone', primaryColor: '#ddd2bf', accentColor: '#c99b3b', includeBalconies: true, includePoolDeck: true, signText: 'Grand Aurelia Hotel', lotType: 'civic_plaza' } }
  ],
  buildStructure: buildHotelMotelStructure,
  planObjects: planHotelMotelObjects
});
