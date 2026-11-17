import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane, objCreateScreenPlane } from '../geometry/primitives.js';

function gaeBuildFuelPump(group, cfg, b) {
  const style = cfg.pumpStyle || 'modern_dispenser';
  const w = clamp(cfg.width || 0.88, 0.62, 1.25);
  const h = clamp(cfg.height || 2.15, 1.55, 2.55);
  const d = clamp(cfg.depth || 0.54, 0.4, 0.78);

  // Steel island curb plinth
  b.addBox(0, 0.08, 0, w + 0.14, 0.16, d + 0.14, { materialRole: 'concrete', layer: 'body' });

  if (style === 'retro_1970s') {
    // Classic rounded-top rectangular retro pump
    b.addBox(0, 0.84, 0, w * 0.72, 1.36, d * 0.78, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 1.62, 0, w * 0.56, 0.24, d * 0.66, { materialRole: 'accent', layer: 'body' });
    b.addCylinder(0, 1.88, 0, w * 0.22, w * 0.22, 0.16, 12, 'z', 'lampGlow', 'detail');
    b.addBox(0, 1.12, d * 0.41, w * 0.52, 0.28, 0.03, { materialRole: 'chrome', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || '0.79 / GAL', w * 0.46, 0.2, '#141920', '#ffe38c', {
      x: 0,
      y: 1.12,
      z: d * 0.43,
      lit: true
    });
    // Hose & nozzle on side
    b.addBox(w * 0.41, 0.92, 0, 0.08, 0.46, 0.12, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(w * 0.46, 0.72, 0.06, 0.025, 0.025, 0.68, 8, 'y', 'rubber', 'detail');
    return;
  }

  // Modern / Diesel / Futuristic dual-column fuel dispenser
  const colW = w * 0.14;
  const bodyH = h * 0.42;
  b.addBox(0, 0.16 + bodyH * 0.5, 0, w * 0.84, bodyH, d * 0.78, { materialRole: 'primary', layer: 'body' });
  b.addBox(-w * 0.36, 0.16 + h * 0.48, 0, colW, h * 0.84, d * 0.64, { materialRole: 'secondary', layer: 'body' });
  b.addBox(w * 0.36, 0.16 + h * 0.48, 0, colW, h * 0.84, d * 0.64, { materialRole: 'secondary', layer: 'body' });

  // Upper illuminated valance header
  const topY = h - 0.18;
  b.addBox(0, topY, 0, w + 0.04, 0.32, d * 0.84, { materialRole: 'accent', layer: 'body' });
  const headerLabel = cfg.signText || (style === 'diesel_truck' ? 'DIESEL' : style === 'futuristic_cell' ? 'ENERGY' : 'STARFUEL');
  objCreateSignPlane(group, headerLabel, w * 0.82, 0.22, '#12263f', '#ffffff', {
    x: 0,
    y: topY,
    z: d * 0.425,
    lit: true,
    doubleSided: true,
    backOffset: d * 0.85
  });

  // Payment screen & grade buttons on both sides
  for (const sz of [1, -1]) {
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.42, 0.24, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.32,
      z: sz * (d * 0.4),
      rotY: sz > 0 ? 0 : Math.PI
    });
    b.addBox(-w * 0.15, 0.96, sz * (d * 0.4), 0.11, 0.07, 0.03, { materialRole: 'warningYellow', layer: 'detail' });
    b.addBox(0, 0.96, sz * (d * 0.4), 0.11, 0.07, 0.03, { materialRole: 'signalGreen', layer: 'detail' });
    b.addBox(w * 0.15, 0.96, sz * (d * 0.4), 0.11, 0.07, 0.03, { materialRole: 'safetyRed', layer: 'detail' });
  }

  // Dual fuel hoses & nozzles
  for (const sx of [-1, 1]) {
    b.addBox(sx * (w * 0.45), 1.04, 0, 0.07, 0.3, 0.14, { materialRole: 'frame', layer: 'detail' });
    b.addCylinder(sx * (w * 0.48), 1.38, 0.04, 0.022, 0.022, 0.72, 8, 'y', 'rubber', 'detail');
    b.addCylinder(sx * (w * 0.46), 0.92, 0.05, 0.022, 0.022, 0.64, 8, 'y', 'rubber', 'detail');
  }
}

function gaeBuildGasStationAmenity(group, cfg, b) {
  const mode = cfg.amenityStyle || 'propane_cage';
  const w = clamp(cfg.width || 1.15, 0.45, 2.2);
  const h = clamp(cfg.height || 1.65, 0.85, 5.2);
  const d = clamp(cfg.depth || 0.78, 0.4, 1.4);

  if (mode === 'propane_cage') {
    b.addBox(0, 0.04, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h - 0.04, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
    // Corner posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addBox(sx * (w * 0.47), h * 0.5, sz * (d * 0.46), 0.05, h, 0.05, { materialRole: 'frame', layer: 'body' });
      }
    }
    // Mid shelf & propane tanks inside
    b.addBox(0, h * 0.5, 0, w - 0.06, 0.04, d - 0.06, { materialRole: 'secondary', layer: 'body' });
    const cols = Math.max(2, Math.floor(w / 0.36));
    for (const rowY of [0.1, h * 0.52]) {
      for (let i = 0; i < cols; i++) {
        const tx = -w * 0.34 + (cols > 1 ? (i / (cols - 1)) * (w * 0.68) : 0);
        b.addCylinder(tx, rowY + 0.22, 0, 0.13, 0.13, 0.4, 10, 'y', 'whiteTrim', 'detail');
        b.addCylinder(tx, rowY + 0.45, 0, 0.07, 0.09, 0.07, 8, 'y', 'safetyRed', 'detail');
      }
    }
    // Front wire bars & warning header
    for (let i = 1; i <= 5; i++) {
      const gx = -w * 0.42 + (i / 6) * (w * 0.84);
      b.addBox(gx, h * 0.5, d * 0.47, 0.018, h - 0.12, 0.018, { materialRole: 'secondary', layer: 'detail' });
    }
    objCreateSignPlane(group, cfg.signText || 'PROPANE EXCHANGE', w * 0.82, 0.2, '#b82520', '#ffffff', {
      x: 0,
      y: h - 0.18,
      z: d * 0.49
    });
    return;
  }

  if (mode === 'ice_freezer') {
    b.addBox(0, 0.06, 0, w, 0.12, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.52, 0, w, h * 0.88, d, { materialRole: 'whiteTrim', layer: 'body' });
    // Angled top/front insulated doors
    b.addBox(0, h * 0.84, d * 0.22, w - 0.08, 0.08, d * 0.56, { materialRole: 'secondary', layer: 'detail', rotXDeg: 28 });
    b.addBox(-w * 0.22, h * 0.88, d * 0.44, 0.14, 0.03, 0.04, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(w * 0.22, h * 0.88, d * 0.44, 0.14, 0.03, 0.04, { materialRole: 'chrome', layer: 'detail' });
    // Side compressor louver
    b.addLouverGrille(w * 0.505, 0.38, 0, 0.34, 0.36, 5, 'x', 'darkMetal', 'detail');
    objCreateSignPlane(group, cfg.signText || 'BAGGED ICE', w * 0.78, 0.32, '#135799', '#ffffff', {
      x: 0,
      y: h * 0.42,
      z: d * 0.505
    });
    return;
  }

  if (mode === 'air_pump' || mode === 'vacuum_station') {
    const isVac = mode === 'vacuum_station';
    b.addBox(0, 0.06, 0, w * 0.8, 0.12, d * 0.8, { materialRole: 'concrete', layer: 'body' });
    b.addCylinder(0, h * 0.48, 0, w * 0.34, w * 0.38, h * 0.78, 12, 'y', isVac ? 'primary' : 'accent', 'body');
    b.addCylinder(0, h * 0.9, 0, w * 0.37, w * 0.37, 0.14, 12, 'y', 'chrome', 'detail');
    b.addBox(0, h * 0.56, d * 0.34, w * 0.42, 0.26, 0.08, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(w * 0.4, h * 0.46, 0, 0.025, 0.025, h * 0.65, 8, 'y', 'rubber', 'detail');
    objCreateSignPlane(group, cfg.signText || (isVac ? 'VACUUM' : 'AIR / WATER'), w * 0.68, 0.16, '#183654', '#ffffff', {
      x: 0,
      y: h * 0.72,
      z: d * 0.39
    });
    return;
  }

  if (mode === 'windshield_caddy') {
    b.addBox(0, h * 0.42, 0, w, h * 0.84, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.9, 0, w + 0.04, 0.14, d + 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.68, d * 0.38, w * 0.72, 0.18, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(0, h * 0.96, -d * 0.18, w * 0.64, 0.12, 0.22, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  // Gas price pylon sign
  const pylonW = clamp(cfg.width || 1.55, 1.0, 2.6);
  const pylonH = clamp(cfg.height || 4.6, 2.8, 7.2);
  b.addBox(0, 0.14, 0, pylonW * 0.72, 0.28, 0.64, { materialRole: 'concrete', layer: 'body' });
  b.addCylinder(-pylonW * 0.26, pylonH * 0.48, 0, 0.09, 0.1, pylonH * 0.92, 8, 'y', 'frame', 'body');
  b.addCylinder(pylonW * 0.26, pylonH * 0.48, 0, 0.09, 0.1, pylonH * 0.92, 8, 'y', 'frame', 'body');
  // Top brand cabinet
  b.addBox(0, pylonH - 0.52, 0, pylonW, 0.86, 0.34, { materialRole: 'accent', layer: 'body' });
  objCreateSignPlane(group, cfg.signText || 'STARFUEL', pylonW - 0.16, 0.68, '#13315c', '#ffffff', {
    x: 0,
    y: pylonH - 0.52,
    z: 0.175,
    lit: true,
    doubleSided: true,
    backOffset: 0.35
  });
  // Price panel cabinet
  b.addBox(0, pylonH - 1.62, 0, pylonW * 0.92, 1.15, 0.28, { materialRole: 'darkMetal', layer: 'body' });
  objCreateSignPlane(group, 'REG 2.89  PREM 3.39', pylonW * 0.84, 0.96, '#0b1016', '#46f07e', {
    x: 0,
    y: pylonH - 1.62,
    z: 0.145,
    lit: true,
    doubleSided: true,
    backOffset: 0.29
  });
}

function gaeBuildAutoGarageEquipment(group, cfg, b) {
  const mode = cfg.garageEquipStyle || 'two_post_lift';
  const w = clamp(cfg.width || 2.9, 0.65, 3.8);
  const h = clamp(cfg.height || 3.4, 0.9, 4.2);
  const d = clamp(cfg.depth || 1.2, 0.5, 2.4);

  if (mode === 'two_post_lift') {
    const span = w;
    for (const sx of [-1, 1]) {
      const px = sx * (span * 0.46);
      b.addBox(px, 0.04, 0, 0.46, 0.08, 0.58, { materialRole: 'frame', layer: 'body' });
      b.addBox(px, h * 0.5, 0, 0.26, h, 0.28, { materialRole: 'primary', layer: 'body' });
      // Hydraulic carriage + swing lift arms
      b.addBox(px - sx * 0.14, 0.56, 0, 0.18, 0.72, 0.34, { materialRole: 'secondary', layer: 'body' });
      b.addBox(px - sx * 0.46, 0.24, 0.38, 0.68, 0.09, 0.11, { materialRole: 'warningYellow', layer: 'detail', rotYDeg: sx * 22 });
      b.addBox(px - sx * 0.46, 0.24, -0.38, 0.68, 0.09, 0.11, { materialRole: 'warningYellow', layer: 'detail', rotYDeg: -sx * 22 });
    }
    // Overhead safety crossbar
    b.addBox(0, h - 0.08, 0, span * 0.96, 0.14, 0.18, { materialRole: 'primary', layer: 'body' });
    b.addBox(-span * 0.46, 1.35, 0.18, 0.18, 0.34, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
    return;
  }

  if (mode === 'tool_chest') {
    b.addBox(0, h * 0.48, 0, w, h * 0.78, d, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, h * 0.9, 0, w + 0.04, 0.05, d + 0.04, { materialRole: 'chrome', layer: 'detail' });
    // Caster wheels
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addCylinder(sx * (w * 0.4), 0.07, sz * (d * 0.36), 0.065, 0.065, 0.05, 8, 'x', 'rubber', 'detail');
      }
    }
    // Drawers
    const drawers = 5;
    for (let i = 0; i < drawers; i++) {
      const dy = 0.2 + (i / drawers) * (h * 0.64);
      b.addBox(0, dy, d * 0.51, w * 0.88, 0.09, 0.02, { materialRole: 'chrome', layer: 'detail' });
    }
    return;
  }

  if (mode === 'tire_rack') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.46), h * 0.5, 0, 0.06, h, d * 0.86, { materialRole: 'frame', layer: 'body' });
    }
    const tiers = 2;
    for (let t = 0; t < tiers; t++) {
      const ty = 0.38 + t * (h * 0.46);
      b.addBox(0, ty - 0.18, d * 0.26, w - 0.08, 0.05, 0.05, { materialRole: 'secondary', layer: 'body' });
      b.addBox(0, ty - 0.18, -d * 0.26, w - 0.08, 0.05, 0.05, { materialRole: 'secondary', layer: 'body' });
      const tireCount = Math.max(3, Math.floor(w / 0.28));
      for (let i = 0; i < tireCount; i++) {
        const tx = -w * 0.38 + (tireCount > 1 ? (i / (tireCount - 1)) * (w * 0.76) : 0);
        b.addCylinder(tx, ty + 0.14, 0, 0.28, 0.28, 0.2, 12, 'x', 'rubber', 'detail');
        b.addCylinder(tx, ty + 0.14, 0, 0.14, 0.14, 0.21, 10, 'x', 'chrome', 'detail');
      }
    }
    return;
  }

  if (mode === 'engine_hoist') {
    b.addBox(-w * 0.35, 0.09, 0, 0.09, 0.09, d * 1.4, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(w * 0.35, 0.09, 0, 0.09, 0.09, d * 1.4, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, 0.09, -d * 0.62, w * 0.8, 0.1, 0.1, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, h * 0.5, -d * 0.56, 0.12, h * 0.92, 0.12, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, h * 0.86, 0, 0.11, 0.11, d * 1.32, { materialRole: 'safetyRed', layer: 'body', rotXDeg: -10 });
    b.addCylinder(0, h * 0.74, d * 0.56, 0.014, 0.014, 0.42, 6, 'y', 'chrome', 'detail');
    return;
  }

  // Oil drum pump cart
  b.addBox(0, 0.08, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
  b.addCylinder(-w * 0.22, 0.56, 0, 0.26, 0.26, 0.86, 12, 'y', 'primary', 'body');
  b.addCylinder(w * 0.22, 0.56, 0, 0.26, 0.26, 0.86, 12, 'y', 'accent', 'body');
  b.addCylinder(-w * 0.22, 1.12, 0, 0.04, 0.04, 0.32, 8, 'y', 'chrome', 'detail');
}

export function registerGasAndAutoEquipmentFamilies() {
  registerObjectFamily({
    id: 'fuel_station_pump',
    categoryId: '09_commercial',
    categories: ['09_commercial', '14_safety'],
    subcategory: 'Vending & Heaters',
    subcategories: ['Vending & Heaters', 'Storefront Attachments', 'Fire & Emergency'],
    label: 'Gas Station Fuel Pumps',
    description: 'Modern corporate, retro 1970s, truck diesel, and futuristic fueling pump islands with payment terminals and hoses.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'exterior',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'commercial',
    environmentTags: ['commercial_strip', 'highway', 'gas_station'],
    tags: ['gas', 'fuel', 'pump', 'dispenser', 'petrol', 'diesel', 'station'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Fuel Pump Style' },
      {
        key: 'pumpStyle',
        name: 'Dispenser Type',
        type: 'select',
        options: [
          ['modern_dispenser', 'Modern Dual-Side Dispenser'],
          ['retro_1970s', 'Retro 1970s Globe Pump'],
          ['diesel_truck', 'Heavy Truck Diesel Dispenser'],
          ['futuristic_cell', 'Futuristic Energy Cell Pump']
        ],
        default: 'modern_dispenser'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.62, max: 1.25, step: 0.04, unit: 'm', default: 0.88 },
      { key: 'height', name: 'Height', type: 'number', min: 1.55, max: 2.55, step: 0.05, unit: 'm', default: 2.15 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.4, max: 0.78, step: 0.04, unit: 'm', default: 0.54 },
      { key: 'signText', name: 'Brand Text', type: 'text', default: 'STARFUEL' }
    ],
    presets: [
      {
        id: 'modern_fuel_dispenser',
        label: 'Modern Fuel Dispenser',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#d9dfe6',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#303b48',
        accentColor: '#1f6bd6',
        params: { pumpStyle: 'modern_dispenser', width: 0.88, height: 2.15, depth: 0.54, signText: 'STARFUEL' }
      },
      {
        id: 'retro_1970s_fuel_pump',
        label: 'Retro 1970s Gas Pump',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'vintage_brick',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c9382c',
        accentColor: '#f2c14e',
        params: { pumpStyle: 'retro_1970s', width: 0.78, height: 1.98, depth: 0.5, signText: '0.79 / GAL' }
      },
      {
        id: 'diesel_truck_pump',
        label: 'Truck Stop Diesel Pump',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'industrial_alley',
        condition: 'weathered',
        primaryMaterial: 'painted_steel',
        primaryColor: '#36414c',
        accentColor: '#d98c24',
        params: { pumpStyle: 'diesel_truck', width: 0.96, height: 2.25, depth: 0.58, signText: 'DIESEL' }
      },
      {
        id: 'futuristic_energy_dispenser',
        label: 'Futuristic Energy Dispenser',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e4ecf2',
        accentColor: '#13b5c9',
        emissiveColor: '#4de2ff',
        params: { pumpStyle: 'futuristic_cell', width: 0.92, height: 2.28, depth: 0.52, signText: 'HYPERCELL' }
      }
    ],
    buildGeometry: gaeBuildFuelPump
  });

  registerObjectFamily({
    id: 'gas_station_amenities',
    categoryId: '09_commercial',
    categories: ['09_commercial', '08_advertising'],
    subcategory: 'Vending & Heaters',
    subcategories: ['Vending & Heaters', 'Advertising Panels'],
    label: 'Gas Station Amenities & Price Signs',
    description: 'Propane exchange cages, ice freezers, air/tire pumps, vacuum stations, windshield caddies, and roadside price pylons.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'exterior',
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'commercial',
    environmentTags: ['gas_station', 'commercial_strip'],
    tags: ['propane', 'ice', 'freezer', 'air', 'vacuum', 'price', 'pylon', 'gas station'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Station Equipment' },
      {
        key: 'amenityStyle',
        name: 'Equipment Type',
        type: 'select',
        options: [
          ['propane_cage', 'Propane Exchange Cage'],
          ['ice_freezer', 'Bagged Ice Freezer Box'],
          ['air_pump', 'Air & Tire Inflation Station'],
          ['vacuum_station', 'Coin Car Vacuum Station'],
          ['windshield_caddy', 'Windshield Washer & Trash Caddy'],
          ['price_pylon', 'Roadside Gas Price Pylon']
        ],
        default: 'propane_cage'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.45, max: 2.6, step: 0.05, unit: 'm', default: 1.2 },
      { key: 'height', name: 'Height', type: 'number', min: 0.85, max: 7.2, step: 0.1, unit: 'm', default: 1.6 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.4, max: 1.4, step: 0.05, unit: 'm', default: 0.72 },
      { key: 'signText', name: 'Sign Text', type: 'text', default: 'PROPANE' }
    ],
    presets: [
      {
        id: 'propane_cylinder_exchange_cage',
        label: 'Propane Cylinder Exchange Cage',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'industrial_alley',
        condition: 'clean',
        primaryColor: '#48525c',
        accentColor: '#c9342b',
        params: { amenityStyle: 'propane_cage', width: 1.24, height: 1.56, depth: 0.68, signText: 'PROPANE EXCHANGE' }
      },
      {
        id: 'bagged_ice_freezer_box',
        label: 'Bagged Ice Freezer Box',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryColor: '#eef3f7',
        accentColor: '#1b64ad',
        params: { amenityStyle: 'ice_freezer', width: 1.55, height: 1.38, depth: 0.84, signText: 'BAGGED ICE' }
      },
      {
        id: 'air_tire_inflation_station',
        label: 'Air & Tire Inflation Station',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'downtown_steel',
        condition: 'lightly_worn',
        accentColor: '#e0a422',
        params: { amenityStyle: 'air_pump', width: 0.56, height: 1.48, depth: 0.48, signText: 'AIR / TIRE' }
      },
      {
        id: 'coin_car_vacuum_station',
        label: 'Coin Car Vacuum Station',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'downtown_steel',
        condition: 'clean',
        primaryColor: '#255c99',
        params: { amenityStyle: 'vacuum_station', width: 0.68, height: 1.72, depth: 0.62, signText: 'VACUUM' }
      },
      {
        id: 'windshield_squeegee_trash_caddy',
        label: 'Windshield Washer & Trash Caddy',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'industrial_alley',
        condition: 'lightly_worn',
        primaryColor: '#374048',
        accentColor: '#2b77b8',
        params: { amenityStyle: 'windshield_caddy', width: 0.58, height: 1.02, depth: 0.52 }
      },
      {
        id: 'gas_price_pylon_sign',
        label: 'Roadside Gas Price Pylon Sign',
        subcategory: 'Advertising Panels',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        accentColor: '#1b5ec4',
        params: { amenityStyle: 'price_pylon', width: 1.65, height: 4.8, depth: 0.55, signText: 'STARFUEL' }
      }
    ],
    buildGeometry: gaeBuildGasStationAmenity
  });

  registerObjectFamily({
    id: 'auto_garage_equipment',
    categoryId: '26_trades_plumbing_electrical',
    categories: ['26_trades_plumbing_electrical', '11_industrial'],
    subcategory: 'Repair Tools, Ladders & Carts',
    subcategories: ['Repair Tools, Ladders & Carts', 'Handling Carts'],
    label: 'Auto Repair Garage Equipment',
    description: 'Two-post hydraulic vehicle lifts, rolling mechanic tool chests, tire racks, engine hoists, and oil drum service carts.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'industrial',
    sizeClass: 'large',
    functionalRole: 'utility',
    environmentTags: ['industrial_zone', 'garage', 'workshop'],
    tags: ['auto', 'garage', 'lift', 'tires', 'tool chest', 'engine hoist', 'mechanic'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Workshop Equipment' },
      {
        key: 'garageEquipStyle',
        name: 'Equipment Style',
        type: 'select',
        options: [
          ['two_post_lift', 'Two-Post Hydraulic Lift'],
          ['tool_chest', 'Rolling Mechanic Tool Chest'],
          ['tire_rack', 'Stacked Tire Storage Rack'],
          ['engine_hoist', 'Hydraulic Engine Hoist'],
          ['oil_drum_cart', 'Oil Drum Pump Station']
        ],
        default: 'two_post_lift'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.65, max: 3.8, step: 0.05, unit: 'm', default: 2.9 },
      { key: 'height', name: 'Height', type: 'number', min: 0.9, max: 4.2, step: 0.1, unit: 'm', default: 3.4 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.5, max: 2.4, step: 0.05, unit: 'm', default: 1.2 }
    ],
    presets: [
      {
        id: 'two_post_hydraulic_car_lift',
        label: 'Two-Post Hydraulic Car Lift',
        subcategory: 'Repair Tools, Ladders & Carts',
        paletteFamily: 'industrial_alley',
        condition: 'lightly_worn',
        primaryColor: '#235c9c',
        secondaryColor: '#98a3ad',
        params: { garageEquipStyle: 'two_post_lift', width: 3.05, height: 3.5, depth: 1.1 }
      },
      {
        id: 'rolling_mechanic_tool_cabinet',
        label: 'Rolling Mechanic Tool Chest',
        subcategory: 'Repair Tools, Ladders & Carts',
        paletteFamily: 'industrial_alley',
        condition: 'clean',
        primaryColor: '#c4322b',
        params: { garageEquipStyle: 'tool_chest', width: 1.35, height: 1.15, depth: 0.62 }
      },
      {
        id: 'stacked_tire_display_rack',
        label: 'Stacked Tire Display Rack',
        subcategory: 'Handling Carts',
        paletteFamily: 'industrial_alley',
        condition: 'lightly_worn',
        secondaryColor: '#5c6670',
        params: { garageEquipStyle: 'tire_rack', width: 1.85, height: 1.85, depth: 0.68 }
      },
      {
        id: 'hydraulic_engine_hoist_crane',
        label: 'Hydraulic Engine Hoist Crane',
        subcategory: 'Repair Tools, Ladders & Carts',
        paletteFamily: 'industrial_alley',
        condition: 'lightly_worn',
        params: { garageEquipStyle: 'engine_hoist', width: 1.05, height: 1.65, depth: 1.35 }
      },
      {
        id: 'oil_change_drum_cart',
        label: 'Oil Change Drum Pump Station',
        subcategory: 'Handling Carts',
        paletteFamily: 'industrial_alley',
        condition: 'weathered',
        primaryColor: '#2a5f8a',
        accentColor: '#d99a26',
        params: { garageEquipStyle: 'oil_drum_cart', width: 1.25, height: 1.25, depth: 0.7 }
      }
    ],
    buildGeometry: gaeBuildAutoGarageEquipment
  });
}
