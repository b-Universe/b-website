import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function gymBuildStrengthEquipment(group, cfg, b) {
  const mode = cfg.strengthStyle || 'squat_rack';
  const w = clamp(cfg.width || 1.45, 0.75, 2.4);
  const h = clamp(cfg.height || 2.15, 0.85, 2.55);
  const d = clamp(cfg.depth || 1.25, 0.55, 2.1);

  if (mode === 'squat_rack') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.45), 0.04, 0, 0.09, 0.08, d, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx * (w * 0.45), h * 0.5, -d * 0.36, 0.08, h, 0.08, { materialRole: 'primary', layer: 'body' });
      b.addBox(sx * (w * 0.45), h * 0.5, d * 0.32, 0.08, h, 0.08, { materialRole: 'primary', layer: 'body' });
      // Safety spotter arms
      b.addBox(sx * (w * 0.45), 0.78, 0.05, 0.07, 0.07, d * 0.72, { materialRole: 'accent', layer: 'detail' });
    }
    b.addBox(0, h - 0.06, -d * 0.36, w * 0.9, 0.07, 0.07, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, h - 0.08, d * 0.32, 0.025, 0.025, w * 0.92, 8, 'x', 'chrome', 'detail');
    // Olympic barbell + weight plates
    b.addCylinder(0, 1.38, d * 0.3, 0.02, 0.02, w * 1.38, 8, 'x', 'chrome', 'detail');
    for (const sx of [-1, 1]) {
      b.addCylinder(sx * (w * 0.58), 1.38, d * 0.3, 0.21, 0.21, 0.06, 12, 'x', 'rubber', 'detail');
      b.addCylinder(sx * (w * 0.64), 1.38, d * 0.3, 0.17, 0.17, 0.05, 12, 'x', 'accent', 'detail');
    }
    return;
  }

  if (mode === 'dumbbell_rack') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.46), h * 0.46, 0, 0.07, h * 0.92, d * 0.84, { materialRole: 'frame', layer: 'body' });
    }
    b.addBox(0, h * 0.35, 0.04, w, 0.06, d * 0.56, { materialRole: 'secondary', layer: 'body', rotXDeg: 14 });
    b.addBox(0, h * 0.74, -0.04, w, 0.06, d * 0.56, { materialRole: 'secondary', layer: 'body', rotXDeg: 14 });
    const pairs = Math.max(3, Math.floor(w / 0.32));
    for (const ty of [h * 0.44, h * 0.83]) {
      for (let i = 0; i < pairs; i++) {
        const dx = -w * 0.36 + (pairs > 1 ? (i / (pairs - 1)) * (w * 0.72) : 0);
        b.addCylinder(dx, ty, 0, 0.02, 0.02, 0.28, 6, 'z', 'chrome', 'detail');
        b.addCylinder(dx, ty, -0.1, 0.075, 0.075, 0.07, 8, 'z', 'rubber', 'detail');
        b.addCylinder(dx, ty, 0.1, 0.075, 0.075, 0.07, 8, 'z', 'rubber', 'detail');
      }
    }
    return;
  }

  if (mode === 'bench_press') {
    b.addBox(0, 0.22, 0, 0.12, 0.08, d * 0.92, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.44, 0.1, 0.32, 0.09, d * 0.78, { materialRole: 'upholstery', layer: 'body' });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.42), 0.72, -d * 0.34, 0.07, 1.32, 0.07, { materialRole: 'primary', layer: 'body' });
    }
    b.addCylinder(0, 1.18, -d * 0.34, 0.02, 0.02, w * 1.28, 8, 'x', 'chrome', 'detail');
    for (const sx of [-1, 1]) {
      b.addCylinder(sx * (w * 0.54), 1.18, -d * 0.34, 0.2, 0.2, 0.06, 12, 'x', 'rubber', 'detail');
    }
    return;
  }

  if (mode === 'cable_crossover') {
    for (const sx of [-1, 1]) {
      const px = sx * (w * 0.46);
      b.addBox(px, h * 0.5, 0, 0.32, h, 0.38, { materialRole: 'frame', layer: 'body' });
      b.addBox(px, h * 0.44, 0.02, 0.22, h * 0.62, 0.24, { materialRole: 'darkMetal', layer: 'detail' });
    }
    b.addBox(0, h - 0.08, 0, w * 0.94, 0.11, 0.14, { materialRole: 'primary', layer: 'body' });
    return;
  }

  // Kettlebell & plyo box station
  b.addBox(-w * 0.26, 0.3, 0, 0.6, 0.6, 0.5, { materialRole: 'wood', layer: 'body' });
  b.addBox(w * 0.26, 0.44, 0, w * 0.46, 0.88, d * 0.6, { materialRole: 'frame', layer: 'body' });
  for (let i = 0; i < 3; i++) {
    const kx = w * 0.12 + i * 0.14;
    b.addCylinder(kx, 0.96, 0, 0.06, 0.08, 0.14, 10, 'y', 'rubber', 'detail');
  }
}

function gymBuildCardioEquipment(group, cfg, b) {
  const mode = cfg.cardioStyle || 'treadmill';
  const w = clamp(cfg.width || 0.88, 0.55, 1.35);
  const h = clamp(cfg.height || 1.45, 0.72, 1.95);
  const d = clamp(cfg.depth || 1.92, 1.0, 2.45);

  if (mode === 'treadmill') {
    b.addBox(0, 0.11, 0.08, w, 0.14, d * 0.9, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.185, 0.12, w * 0.72, 0.02, d * 0.76, { materialRole: 'rubber', layer: 'detail' });
    b.addBox(0, 0.2, -d * 0.34, w * 0.92, 0.24, 0.34, { materialRole: 'primary', layer: 'body' });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.43), h * 0.54, -d * 0.3, 0.07, h * 0.84, 0.1, { materialRole: 'secondary', layer: 'body', rotXDeg: -10 });
      b.addBox(sx * (w * 0.43), h * 0.72, -d * 0.14, 0.06, 0.06, 0.42, { materialRole: 'chrome', layer: 'detail' });
    }
    b.addBox(0, h * 0.9, -d * 0.24, w * 0.84, 0.26, 0.24, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 28 });
    objCreateScreenPlane(group, 'info_display', w * 0.58, 0.2, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.92,
      z: -d * 0.14,
      rotX: -0.45
    });
    return;
  }

  if (mode === 'exercise_bike') {
    b.addBox(0, 0.05, 0, w * 0.75, 0.08, d * 0.88, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, 0.34, -d * 0.22, 0.22, 0.22, 0.08, 12, 'x', 'primary', 'body');
    b.addBox(0, 0.62, 0.05, 0.1, 0.55, 0.14, { materialRole: 'frame', layer: 'body', rotXDeg: -16 });
    // Seat post + saddle
    b.addBox(0, 0.74, d * 0.24, 0.07, 0.52, 0.07, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, 1.0, d * 0.24, 0.18, 0.07, 0.24, { materialRole: 'upholstery', layer: 'detail' });
    // Handlebar stem + console
    b.addBox(0, 0.94, -d * 0.24, 0.07, 0.62, 0.07, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, 1.24, -d * 0.24, w * 0.72, 0.05, 0.22, { materialRole: 'rubber', layer: 'detail' });
    objCreateScreenPlane(group, 'info_display', 0.26, 0.16, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.29,
      z: -d * 0.22,
      rotX: -0.4
    });
    return;
  }

  if (mode === 'elliptical') {
    b.addBox(0, 0.08, 0, w * 0.8, 0.1, d * 0.9, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, 0.4, -d * 0.28, 0.28, 0.28, 0.18, 12, 'x', 'primary', 'body');
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.3), 0.3, 0.14, 0.18, 0.06, 0.42, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(sx * (w * 0.4), h * 0.55, -d * 0.12, 0.05, h * 0.84, 0.06, { materialRole: 'chrome', layer: 'detail', rotXDeg: 10 });
    }
    b.addBox(0, h * 0.85, -d * 0.28, w * 0.62, 0.24, 0.18, { materialRole: 'darkMetal', layer: 'body' });
    return;
  }

  // Indoor rowing machine
  b.addBox(0, 0.28, 0.14, 0.14, 0.12, d * 0.82, { materialRole: 'secondary', layer: 'body' });
  b.addBox(0, 0.36, 0.12, 0.28, 0.07, 0.28, { materialRole: 'upholstery', layer: 'detail' });
  b.addCylinder(0, 0.42, -d * 0.34, 0.26, 0.26, 0.18, 12, 'x', 'primary', 'body');
  b.addBox(0, 0.12, d * 0.48, w * 0.6, 0.08, 0.08, { materialRole: 'frame', layer: 'body' });
}

function gymBuildFunctionalFacilities(group, cfg, b) {
  const mode = cfg.facilityStyle || 'punching_bag';
  const w = clamp(cfg.width || 1.2, 0.6, 2.8);
  const h = clamp(cfg.height || 2.1, 1.0, 2.5);
  const d = clamp(cfg.depth || 0.95, 0.38, 1.8);

  if (mode === 'punching_bag') {
    b.addBox(0, 0.05, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.5, -d * 0.36, 0.11, h, 0.11, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h - 0.06, 0, 0.11, 0.1, d * 0.8, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, h * 0.55, d * 0.18, 0.22, 0.22, 1.05, 12, 'y', 'safetyRed', 'body');
    b.addCylinder(0, h - 0.26, d * 0.18, 0.02, 0.02, 0.32, 6, 'y', 'chrome', 'detail');
    return;
  }

  if (mode === 'pullup_tower') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.4), 0.05, 0, 0.08, 0.08, d, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx * (w * 0.4), h * 0.5, -d * 0.18, 0.08, h, 0.08, { materialRole: 'primary', layer: 'body' });
      b.addBox(sx * (w * 0.4), 1.15, d * 0.18, 0.06, 0.06, 0.55, { materialRole: 'chrome', layer: 'detail' });
    }
    b.addCylinder(0, h - 0.06, -d * 0.1, 0.024, 0.024, w * 1.05, 8, 'x', 'chrome', 'detail');
    b.addBox(0, 1.25, -d * 0.12, w * 0.42, 0.46, 0.08, { materialRole: 'upholstery', layer: 'detail' });
    return;
  }

  if (mode === 'locker_bank') {
    const doors = Math.max(2, Math.round(w / 0.42));
    b.addBox(0, h * 0.5, 0, w, h, d, { materialRole: 'primary', layer: 'body' });
    for (let i = 0; i < doors; i++) {
      const lx = -w * 0.5 + (i + 0.5) * (w / doors);
      b.addBox(lx, h * 0.5, d * 0.505, (w / doors) - 0.04, h - 0.1, 0.02, { materialRole: 'secondary', layer: 'detail' });
      b.addLouverGrille(lx, h * 0.82, d * 0.52, (w / doors) * 0.55, 0.18, 4, 'z', 'frame', 'detail');
    }
    return;
  }

  // Bottle refill & drinking fountain station
  b.addBox(0, h * 0.45, 0, w * 0.55, h * 0.9, d * 0.65, { materialRole: 'chrome', layer: 'body' });
  b.addBox(0, h * 0.72, d * 0.34, w * 0.36, 0.38, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
  objCreateSignPlane(group, 'REFILL', w * 0.32, 0.12, '#186245', '#ffffff', {
    x: 0,
    y: h * 0.88,
    z: d * 0.35
  });
}

export function registerGymEquipmentFamilies() {
  registerObjectFamily({
    id: 'gym_strength_equipment',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Game Room & Breakroom Fun',
    subcategories: ['Game Room & Breakroom Fun', 'Office Decorations & Miscellaneous Props'],
    label: 'Gym Strength & Weight Equipment',
    description: 'Squat power racks with barbells, dumbbell weight racks, bench press stations, cable crossovers, and kettlebell/plyo stations.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'recreation',
    environmentTags: ['gym', 'fitness', 'recreation'],
    tags: ['gym', 'squat', 'dumbbell', 'weights', 'bench press', 'barbell', 'fitness'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'upholstery'],
    schema: [
      { group: 'Strength Equipment' },
      {
        key: 'strengthStyle',
        name: 'Station Type',
        type: 'select',
        options: [
          ['squat_rack', 'Squat / Power Rack'],
          ['dumbbell_rack', 'Dumbbell Weight Rack'],
          ['bench_press', 'Olympic Bench Press'],
          ['cable_crossover', 'Cable Crossover Machine'],
          ['kettlebell_plyo', 'Kettlebell & Plyo Box Station']
        ],
        default: 'squat_rack'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.75, max: 2.4, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'height', name: 'Height', type: 'number', min: 0.85, max: 2.55, step: 0.05, unit: 'm', default: 2.15 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.55, max: 2.1, step: 0.05, unit: 'm', default: 1.25 }
    ],
    presets: [
      {
        id: 'squat_power_rack_barbell',
        label: 'Squat Power Rack & Barbell',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryColor: '#2a333d',
        accentColor: '#d93829',
        params: { strengthStyle: 'squat_rack', width: 1.48, height: 2.22, depth: 1.35 }
      },
      {
        id: 'dumbbell_weight_rack',
        label: 'Two-Tier Dumbbell Rack',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'downtown_steel',
        condition: 'clean',
        secondaryColor: '#56616c',
        params: { strengthStyle: 'dumbbell_rack', width: 1.85, height: 0.92, depth: 0.65 }
      },
      {
        id: 'olympic_bench_press',
        label: 'Olympic Bench Press',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryColor: '#252d36',
        secondaryColor: '#1f2328',
        params: { strengthStyle: 'bench_press', width: 1.32, height: 1.35, depth: 1.55 }
      },
      {
        id: 'cable_crossover_machine',
        label: 'Cable Crossover Machine',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryColor: '#3a4654',
        params: { strengthStyle: 'cable_crossover', width: 2.35, height: 2.25, depth: 0.82 }
      },
      {
        id: 'kettlebell_plyo_station',
        label: 'Kettlebell & Plyo Station',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'park_heritage',
        condition: 'clean',
        params: { strengthStyle: 'kettlebell_plyo', width: 1.35, height: 1.1, depth: 0.65 }
      }
    ],
    buildGeometry: gymBuildStrengthEquipment
  });

  registerObjectFamily({
    id: 'gym_cardio_equipment',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Game Room & Breakroom Fun',
    subcategories: ['Game Room & Breakroom Fun'],
    label: 'Gym Cardio Machines',
    description: 'Commercial treadmills, upright spin/exercise bikes, elliptical cross trainers, and indoor rowing machines.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'recreation',
    environmentTags: ['gym', 'fitness'],
    tags: ['treadmill', 'bike', 'elliptical', 'rower', 'cardio', 'gym'],
    materialSlots: ['primary', 'secondary', 'frame', 'upholstery'],
    schema: [
      { group: 'Cardio Machine' },
      {
        key: 'cardioStyle',
        name: 'Machine Type',
        type: 'select',
        options: [
          ['treadmill', 'Commercial Treadmill'],
          ['exercise_bike', 'Upright Spin / Exercise Bike'],
          ['elliptical', 'Elliptical Cross Trainer'],
          ['rowing_machine', 'Indoor Rowing Machine']
        ],
        default: 'treadmill'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.55, max: 1.35, step: 0.05, unit: 'm', default: 0.88 },
      { key: 'height', name: 'Height', type: 'number', min: 0.72, max: 1.95, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'depth', name: 'Depth', type: 'number', min: 1.0, max: 2.45, step: 0.05, unit: 'm', default: 1.92 }
    ],
    presets: [
      {
        id: 'commercial_treadmill',
        label: 'Commercial Gym Treadmill',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryColor: '#2d3540',
        secondaryColor: '#6d7885',
        params: { cardioStyle: 'treadmill', width: 0.9, height: 1.48, depth: 2.02 }
      },
      {
        id: 'upright_exercise_spin_bike',
        label: 'Upright Spin Exercise Bike',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryColor: '#cf342b',
        params: { cardioStyle: 'exercise_bike', width: 0.64, height: 1.32, depth: 1.22 }
      },
      {
        id: 'elliptical_cross_trainer',
        label: 'Elliptical Cross Trainer',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryColor: '#374657',
        params: { cardioStyle: 'elliptical', width: 0.78, height: 1.65, depth: 1.85 }
      },
      {
        id: 'indoor_rowing_machine',
        label: 'Indoor Rowing Machine',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'downtown_steel',
        condition: 'clean',
        primaryColor: '#244b7a',
        params: { cardioStyle: 'rowing_machine', width: 0.64, height: 0.88, depth: 2.2 }
      }
    ],
    buildGeometry: gymBuildCardioEquipment
  });

  registerObjectFamily({
    id: 'gym_functional_facilities',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Lobbies, Decor & Collectibles',
    subcategories: ['Lobbies, Decor & Collectibles', 'Game Room & Breakroom Fun', 'Breakrooms & Employee Amenities'],
    label: 'Gym Functional & Locker Facilities',
    description: 'Heavy punching bag stands, pull-up/dip towers, steel gym locker banks, and water bottle refill stations.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'recreation',
    environmentTags: ['gym', 'fitness', 'boxing'],
    tags: ['punching bag', 'boxing', 'pullup', 'locker', 'fountain', 'gym'],
    materialSlots: ['primary', 'secondary', 'frame', 'upholstery'],
    schema: [
      { group: 'Gym Facility' },
      {
        key: 'facilityStyle',
        name: 'Facility Type',
        type: 'select',
        options: [
          ['punching_bag', 'Heavy Punching Bag Stand'],
          ['pullup_tower', 'Pull-Up & Dip Station'],
          ['locker_bank', 'Steel Gym Locker Bank'],
          ['bottle_refill', 'Water Bottle Refill Station']
        ],
        default: 'punching_bag'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.6, max: 2.8, step: 0.05, unit: 'm', default: 1.2 },
      { key: 'height', name: 'Height', type: 'number', min: 1.0, max: 2.5, step: 0.05, unit: 'm', default: 2.15 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.38, max: 1.8, step: 0.05, unit: 'm', default: 1.05 }
    ],
    presets: [
      {
        id: 'heavy_punching_bag_stand',
        label: 'Heavy Punching Bag Stand',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'industrial_alley',
        condition: 'lightly_worn',
        params: { facilityStyle: 'punching_bag', width: 1.15, height: 2.18, depth: 1.28 }
      },
      {
        id: 'pullup_dip_tower',
        label: 'Pull-Up & Dip Tower',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'downtown_steel',
        condition: 'clean',
        primaryColor: '#2d3742',
        params: { facilityStyle: 'pullup_tower', width: 1.18, height: 2.15, depth: 1.08 }
      },
      {
        id: 'gym_steel_locker_bank',
        label: 'Gym Steel Locker Bank',
        subcategory: 'Lobbies, Decor & Collectibles',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryColor: '#3a5778',
        secondaryColor: '#4c6d91',
        params: { facilityStyle: 'locker_bank', width: 1.72, height: 1.92, depth: 0.48 }
      },
      {
        id: 'bottle_refill_drinking_station',
        label: 'Gym Bottle Refill Station',
        subcategory: 'Breakrooms & Employee Amenities',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        params: { facilityStyle: 'bottle_refill', width: 0.68, height: 1.48, depth: 0.44 }
      }
    ],
    buildGeometry: gymBuildFunctionalFacilities
  });
}
