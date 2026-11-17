import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane, objCreateScreenPlane } from '../geometry/primitives.js';

function srdBuildSpecialtyDisplay(group, cfg, b) {
  const mode = cfg.displayStyle || 'costume_mannequin';
  const w = clamp(cfg.width || 0.72, 0.45, 2.2);
  const h = clamp(cfg.height || 1.85, 0.65, 2.65);
  const d = clamp(cfg.depth || 0.56, 0.35, 1.85);

  if (mode === 'costume_mannequin') {
    // Display pedestal + stylized superhero costume mannequin + cape
    b.addCylinder(0, 0.09, 0, w * 0.45, w * 0.48, 0.18, 12, 'y', 'concrete', 'body');
    b.addCylinder(-0.1, 0.56, 0, 0.065, 0.05, 0.76, 8, 'y', 'secondary', 'body');
    b.addCylinder(0.1, 0.56, 0, 0.065, 0.05, 0.76, 8, 'y', 'secondary', 'body');
    b.addBox(0, 1.18, 0, 0.36, 0.48, 0.2, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 1.32, 0.105, 0.12, 0.12, 0.02, { materialRole: 'warningYellow', layer: 'detail' });
    // Arms
    b.addBox(-0.24, 1.18, 0, 0.09, 0.44, 0.09, { materialRole: 'primary', layer: 'body', rotZDeg: 10 });
    b.addBox(0.24, 1.18, 0, 0.09, 0.44, 0.09, { materialRole: 'primary', layer: 'body', rotZDeg: -10 });
    // Head + cowl silhouette
    b.addCylinder(0, 1.56, 0, 0.095, 0.095, 0.2, 10, 'y', 'primary', 'body');
    // Flowing cape
    b.addTrapezoidBox(0, 0.92, -0.14, 0.34, 0.04, 0.56, 0.06, 0.98, { materialRole: 'accent', layer: 'detail', rotXDeg: 8 });
    return;
  }

  if (mode === 'costume_rack') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.46), 0.04, 0, 0.06, 0.06, d * 0.82, { materialRole: 'chrome', layer: 'body' });
      b.addCylinder(sx * (w * 0.46), h * 0.5, 0, 0.024, 0.024, h - 0.08, 8, 'y', 'chrome', 'body');
    }
    b.addCylinder(0, h - 0.08, 0, 0.025, 0.025, w * 0.96, 8, 'x', 'chrome', 'body');
    const items = Math.max(4, Math.floor(w / 0.22));
    const roles = ['primary', 'accent', 'secondary', 'signalGreen', 'warningYellow'];
    for (let i = 0; i < items; i++) {
      const ix = -w * 0.36 + (items > 1 ? (i / (items - 1)) * (w * 0.72) : 0);
      b.addBox(ix, h * 0.54, 0, 0.09, h * 0.58, 0.38, { materialRole: roles[i % roles.length], layer: 'detail' });
    }
    return;
  }

  if (mode === 'drive_thru_menu') {
    b.addBox(0, 0.12, 0, w * 0.85, 0.24, 0.34, { materialRole: 'concrete', layer: 'body' });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.36), h * 0.48, 0, 0.1, h * 0.85, 0.14, { materialRole: 'frame', layer: 'body' });
    }
    b.addBox(0, h * 0.62, 0, w, h * 0.62, 0.22, { materialRole: 'darkMetal', layer: 'body' });
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.86, h * 0.48, cfg.emissiveColor || '#ffe38c', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.62,
      z: 0.115
    });
    // Order speaker grille beside menu
    b.addBox(-w * 0.62, 1.12, 0, 0.26, 0.54, 0.22, { materialRole: 'primary', layer: 'body' });
    b.addLouverGrille(-w * 0.62, 1.18, 0.115, 0.16, 0.16, 4, 'z', 'darkMetal', 'detail');
    return;
  }

  if (mode === 'pharmacy_shelves' || mode === 'apothecary_cabinet') {
    const isApoth = mode === 'apothecary_cabinet';
    const bodyRole = isApoth ? 'wood' : 'whiteTrim';
    b.addBox(0, h * 0.5, -d * 0.38, w, h, 0.06, { materialRole: bodyRole, layer: 'body' });
    b.addBox(-w * 0.48, h * 0.5, 0, 0.05, h, d, { materialRole: bodyRole, layer: 'body' });
    b.addBox(w * 0.48, h * 0.5, 0, 0.05, h, d, { materialRole: bodyRole, layer: 'body' });
    const shelves = 4;
    const jarRoles = isApoth ? ['signalGreen', 'brass', 'copper', 'primary'] : ['whiteTrim', 'accent', 'signalGreen', 'primary'];
    for (let s = 0; s < shelves; s++) {
      const sy = 0.24 + (s / (shelves - 1)) * (h - 0.52);
      b.addBox(0, sy, 0, w - 0.08, 0.04, d - 0.04, { materialRole: bodyRole, layer: 'body' });
      const bottles = Math.max(3, Math.floor(w / 0.24));
      for (let i = 0; i < bottles; i++) {
        const bx = -w * 0.38 + (bottles > 1 ? (i / (bottles - 1)) * (w * 0.76) : 0);
        b.addCylinder(bx, sy + 0.11, 0.04, 0.045, 0.045, 0.16, 8, 'y', jarRoles[(i + s) % jarRoles.length], 'detail');
      }
    }
    if (isApoth) {
      objCreateSignPlane(group, cfg.signText || 'APOTHECARY', w * 0.78, 0.18, '#2b1e14', '#f2d084', {
        x: 0,
        y: h - 0.12,
        z: d * 0.48
      });
    }
    return;
  }

  if (mode === 'luggage_cart') {
    b.addBox(0, 0.15, 0, w, 0.08, d, { materialRole: 'carpet', layer: 'body' });
    b.addBox(0, 0.11, 0, w + 0.06, 0.06, d + 0.06, { materialRole: 'brass', layer: 'detail' });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addCylinder(sx * (w * 0.42), 0.06, sz * (d * 0.42), 0.055, 0.055, 0.04, 8, 'x', 'rubber', 'detail');
      }
    }
    // Arching brass cage frame
    b.addCylinder(-w * 0.44, h * 0.5, 0, 0.025, 0.025, h * 0.85, 8, 'y', 'brass', 'body');
    b.addCylinder(w * 0.44, h * 0.5, 0, 0.025, 0.025, h * 0.85, 8, 'y', 'brass', 'body');
    b.addCylinder(0, h * 0.92, 0, 0.026, 0.026, w * 0.9, 8, 'x', 'brass', 'body');
    // Stacked suitcases
    b.addBox(-0.12, 0.34, 0, 0.48, 0.3, 0.36, { materialRole: 'primary', layer: 'detail' });
    b.addBox(0.18, 0.3, 0.04, 0.36, 0.22, 0.32, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  // Poolside lounger + side table
  b.addBox(0, 0.24, 0.15, w * 0.82, 0.07, d * 0.65, { materialRole: 'whiteTrim', layer: 'body' });
  b.addBox(0, 0.46, -d * 0.3, w * 0.82, 0.07, d * 0.38, { materialRole: 'whiteTrim', layer: 'body', rotXDeg: 38 });
  for (const sx of [-1, 1]) {
    b.addBox(sx * (w * 0.34), 0.12, d * 0.36, 0.05, 0.24, 0.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(sx * (w * 0.34), 0.12, -d * 0.32, 0.05, 0.24, 0.05, { materialRole: 'frame', layer: 'body' });
  }
}

export function registerSpecialtyRetailDisplayFamilies() {
  registerObjectFamily({
    id: 'retail_specialty_displays',
    categoryId: '09_commercial',
    categories: ['09_commercial', '25_malls_libraries', '23_clinics_waiting'],
    subcategory: 'Storefront Attachments',
    subcategories: ['Storefront Attachments', 'Mall Concourses & Kiosks', 'Waiting Room Amenities'],
    label: 'Specialty Retail, Menu & Hotel Props',
    description: 'Superhero costume mannequins, clothing racks, drive-thru menu speaker boards, pharmacy shelves, apothecary cabinets, hotel luggage carts, and pool loungers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'commercial',
    environmentTags: ['commercial_strip', 'downtown', 'hospitality'],
    tags: ['mannequin', 'costume', 'menu', 'drive-thru', 'pharmacy', 'apothecary', 'hotel', 'luggage'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood'],
    schema: [
      { group: 'Display & Fixture' },
      {
        key: 'displayStyle',
        name: 'Fixture Type',
        type: 'select',
        options: [
          ['costume_mannequin', 'Superhero Costume Mannequin'],
          ['costume_rack', 'Costume & Apparel Rack'],
          ['drive_thru_menu', 'Drive-Thru Menu & Speaker Board'],
          ['pharmacy_shelves', 'Pharmacy Prescription Shelf Bay'],
          ['apothecary_cabinet', 'Vintage Apothecary Bottle Cabinet'],
          ['luggage_cart', 'Hotel Brass Luggage Cart'],
          ['pool_lounger', 'Hotel Poolside Lounge Chair']
        ],
        default: 'costume_mannequin'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.45, max: 2.2, step: 0.05, unit: 'm', default: 0.72 },
      { key: 'height', name: 'Height', type: 'number', min: 0.65, max: 2.65, step: 0.05, unit: 'm', default: 1.85 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.35, max: 1.85, step: 0.05, unit: 'm', default: 0.56 },
      { key: 'signText', name: 'Sign Text', type: 'text', default: 'APOTHECARY' }
    ],
    presets: [
      {
        id: 'superhero_costume_mannequin',
        label: 'Superhero Costume Mannequin',
        subcategory: 'Storefront Attachments',
        paletteFamily: 'superhero_city',
        condition: 'new',
        primaryColor: '#1f5ec7',
        accentColor: '#d93228',
        params: { displayStyle: 'costume_mannequin', width: 0.68, height: 1.75, depth: 0.54 }
      },
      {
        id: 'costume_clothing_display_rack',
        label: 'Costume & Cape Display Rack',
        subcategory: 'Storefront Attachments',
        paletteFamily: 'superhero_city',
        condition: 'clean',
        primaryColor: '#2564bd',
        accentColor: '#d9342b',
        params: { displayStyle: 'costume_rack', width: 1.42, height: 1.62, depth: 0.56 }
      },
      {
        id: 'drive_thru_menu_speaker_board',
        label: 'Drive-Thru Menu & Speaker Board',
        subcategory: 'Storefront Attachments',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryColor: '#c9342b',
        params: { displayStyle: 'drive_thru_menu', width: 1.65, height: 2.05, depth: 0.44 }
      },
      {
        id: 'pharmacy_prescription_shelf_bay',
        label: 'Pharmacy Medicine Shelf Bay',
        subcategory: 'Waiting Room Amenities',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryColor: '#2a7bb8',
        accentColor: '#3cb371',
        params: { displayStyle: 'pharmacy_shelves', width: 1.45, height: 1.95, depth: 0.44 }
      },
      {
        id: 'apothecary_herb_bottle_cabinet',
        label: 'Vintage Apothecary Bottle Cabinet',
        subcategory: 'Storefront Attachments',
        paletteFamily: 'vintage_brick',
        condition: 'lightly_worn',
        woodColor: '#6b4226',
        params: { displayStyle: 'apothecary_cabinet', width: 1.45, height: 2.08, depth: 0.48, signText: 'APOTHECARY' }
      },
      {
        id: 'hotel_brass_luggage_cart',
        label: 'Hotel Brass Luggage Cart',
        subcategory: 'Mall Concourses & Kiosks',
        paletteFamily: 'corporate_lobby',
        condition: 'new',
        primaryColor: '#5c3a28',
        accentColor: '#9c2d2d',
        params: { displayStyle: 'luggage_cart', width: 1.18, height: 1.85, depth: 0.64 }
      },
      {
        id: 'poolside_lounge_chair_table',
        label: 'Hotel Poolside Lounger',
        subcategory: 'Mall Concourses & Kiosks',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        params: { displayStyle: 'pool_lounger', width: 0.78, height: 0.85, depth: 1.78 }
      }
    ],
    buildGeometry: srdBuildSpecialtyDisplay
  });
}
