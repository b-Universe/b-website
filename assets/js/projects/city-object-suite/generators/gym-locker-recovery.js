import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';

function glrAddOlympicPlate(b, x, y, z, r, thick, axis, role = 'rubber') {
  b.addCylinder(x, y, z, r, r, thick, 12, axis, role, 'detail');
  b.addCylinder(x, y, z, r * 0.28, r * 0.28, thick + 0.01, 8, axis, 'chrome', 'detail');
}

function glrBuildSpecialtyMachines(group, cfg, b) {
  const mode = cfg.machineStyle || 'angled_leg_press';
  const w = clamp(cfg.width || 1.35, 0.75, 2.35);
  const d = clamp(cfg.depth || 2.05, 0.85, 2.45);
  const h = clamp(cfg.height || 1.65, 1.05, 2.45);

  if (mode === 'angled_leg_press') {
    b.addBox(0, 0.04, 0, w * 0.68, 0.08, d, { materialRole: 'frame', layer: 'body' });
    // Angled 45-degree linear guide rails
    for (const sx of [-1, 1]) {
      b.addPipeSegment(sx * (w * 0.24), 0.36, 0.28, sx * (w * 0.24), h * 0.9, -d * 0.38, 0.028, 8, 'chrome', 'body');
      b.addBox(sx * (w * 0.28), h * 0.44, -d * 0.34, 0.07, h * 0.86, 0.08, { materialRole: 'primary', layer: 'body' });
      // Weight loading horns on top carriage
      b.addCylinder(sx * (w * 0.36), h * 0.66, -d * 0.08, 0.022, 0.022, 0.32, 8, 'x', 'chrome', 'detail');
      glrAddOlympicPlate(b, sx * (w * 0.4), h * 0.66, -d * 0.08, 0.21, 0.05, 'x', 'rubber');
      glrAddOlympicPlate(b, sx * (w * 0.46), h * 0.66, -d * 0.08, 0.17, 0.045, 'x', 'accent');
    }
    // Angled footplate carriage
    b.addBox(0, h * 0.68, -d * 0.1, w * 0.56, 0.42, 0.06, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 45 });
    // Padded seat & angled backrest
    b.addBox(0, 0.38, d * 0.18, w * 0.34, 0.09, 0.38, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(0, 0.62, d * 0.38, w * 0.34, 0.48, 0.09, { materialRole: 'upholstery', layer: 'body', rotXDeg: -28 });
    return;
  }

  if (mode === 'lat_pulldown_low_row') {
    b.addBox(0, 0.04, 0, w * 0.72, 0.08, d * 0.9, { materialRole: 'frame', layer: 'body' });
    // Rear weight stack cage & brick plates
    const stackZ = -d * 0.3;
    b.addBox(0, h * 0.48, stackZ, w * 0.44, h * 0.94, 0.32, { materialRole: 'primary', layer: 'body' });
    for (let i = 0; i < 8; i++) {
      b.addBox(0, 0.22 + i * 0.12, stackZ, w * 0.32, 0.075, 0.2, { materialRole: 'darkMetal', layer: 'detail' });
    }
    b.addCylinder(0, 0.58, stackZ + 0.12, 0.014, 0.014, 0.06, 6, 'z', 'accent', 'detail');
    // Overhead pulley arm + hanging wide lat bar
    b.addBox(0, h - 0.06, -0.02, 0.1, 0.1, d * 0.72, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, h - 0.36, d * 0.26, 0.014, 0.014, w * 0.82, 8, 'x', 'chrome', 'detail');
    b.addCylinder(0, h - 0.2, d * 0.26, 0.008, 0.008, 0.3, 6, 'y', 'darkMetal', 'detail');
    // Padded seat + thigh roller pads + low-row footplate
    b.addBox(0, 0.48, d * 0.2, w * 0.34, 0.08, 0.42, { materialRole: 'upholstery', layer: 'body' });
    b.addCylinder(0, 0.68, d * 0.12, 0.065, 0.065, 0.38, 10, 'x', 'upholstery', 'detail');
    b.addBox(0, 0.24, stackZ + 0.22, w * 0.36, 0.24, 0.05, { materialRole: 'frame', layer: 'detail', rotXDeg: 20 });
    return;
  }

  if (mode === 'olympic_plate_tree_barbell') {
    b.addBox(0, 0.04, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.48, -0.1, 0.12, h * 0.88, 0.1, { materialRole: 'primary', layer: 'body', rotXDeg: 10 });
    b.addBox(0, h * 0.48, 0.1, 0.12, h * 0.88, 0.1, { materialRole: 'primary', layer: 'body', rotXDeg: -10 });
    b.addBox(0, h * 0.92, 0, 0.18, 0.08, 0.24, { materialRole: 'frame', layer: 'body' });
    // 3 tiers of plate storage pegs
    const tiers = [
      { y: 0.32, r: 0.22, role: 'rubber' },
      { y: 0.72, r: 0.18, role: 'accent' },
      { y: 1.08, r: 0.13, role: 'primary' }
    ];
    for (const t of tiers) {
      b.addCylinder(0, t.y, 0, 0.022, 0.022, w * 0.84, 8, 'x', 'chrome', 'detail');
      for (const sx of [-1, 1]) {
        glrAddOlympicPlate(b, sx * (w * 0.26), t.y, 0, t.r, 0.048, 'x', t.role);
        glrAddOlympicPlate(b, sx * (w * 0.34), t.y, 0, t.r * 0.88, 0.042, 'x', 'rubber');
      }
    }
    // Vertical barbell storage holders
    for (const sx of [-1, 1]) {
      b.addCylinder(sx * (w * 0.36), 0.18, d * 0.34, 0.036, 0.036, 0.26, 8, 'y', 'frame', 'body');
      b.addCylinder(sx * (w * 0.36), h * 0.62, d * 0.34, 0.018, 0.018, h * 1.15, 8, 'y', 'chrome', 'detail');
    }
    return;
  }

  if (mode === 'smith_squat_cage') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.44), 0.04, 0, 0.09, 0.08, d, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx * (w * 0.44), h * 0.5, -d * 0.38, 0.08, h, 0.08, { materialRole: 'primary', layer: 'body' });
      b.addBox(sx * (w * 0.44), h * 0.5, d * 0.34, 0.08, h, 0.08, { materialRole: 'primary', layer: 'body' });
      b.addCylinder(sx * (w * 0.38), h * 0.5, 0.08, 0.02, 0.02, h - 0.16, 8, 'y', 'chrome', 'detail');
      glrAddOlympicPlate(b, sx * (w * 0.56), 1.32, 0.08, 0.2, 0.055, 'x', 'accent');
    }
    b.addBox(0, h - 0.06, -d * 0.38, w * 0.9, 0.08, 0.08, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, h - 0.06, d * 0.34, 0.022, 0.022, w * 0.92, 8, 'x', 'chrome', 'detail');
    b.addCylinder(0, 1.32, 0.08, 0.02, 0.02, w * 1.34, 8, 'x', 'chrome', 'detail');
    return;
  }

  // Preacher curl bench + 3-tier medicine ball tree
  const bx = -w * 0.18;
  b.addBox(bx, 0.04, 0, w * 0.44, 0.07, d * 0.85, { materialRole: 'frame', layer: 'body' });
  b.addBox(bx, 0.48, d * 0.22, 0.3, 0.08, 0.3, { materialRole: 'upholstery', layer: 'body' });
  b.addBox(bx, 0.92, -d * 0.12, 0.54, 0.36, 0.09, { materialRole: 'upholstery', layer: 'body', rotXDeg: 38 });
  b.addCylinder(bx, 0.82, -d * 0.28, 0.016, 0.016, 0.86, 8, 'x', 'chrome', 'detail');
  // 3-tier medicine ball tree beside it
  const rx = w * 0.3;
  b.addBox(rx, 0.72, 0, 0.1, 1.4, 0.36, { materialRole: 'frame', layer: 'body' });
  for (let i = 0; i < 3; i++) {
    const ry = 0.28 + i * 0.42;
    const br = 0.14 - i * 0.018;
    b.addBox(rx, ry - br, 0.14, 0.26, 0.03, 0.24, { materialRole: 'primary', layer: 'detail' });
    b.addCylinder(rx, ry, 0.16, br * 0.7, br, br * 1.1, 10, 'y', i === 1 ? 'accent' : 'rubber', 'detail');
  }
}

function glrBuildLockerStudio(group, cfg, b) {
  const mode = cfg.studioStyle || 'locker_room_wood_bench';
  const w = clamp(cfg.width || 1.65, 0.48, 2.55);
  const d = clamp(cfg.depth || 0.52, 0.18, 1.85);
  const h = clamp(cfg.height || 0.48, 0.42, 2.35);

  if (mode === 'locker_room_wood_bench') {
    const legSpan = w * 0.76;
    for (const sx of [-1, 1]) {
      b.addBox(sx * (legSpan * 0.5), h * 0.48, 0, 0.07, h * 0.92, d * 0.82, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx * (legSpan * 0.5), 0.025, 0, 0.11, 0.05, d * 0.94, { materialRole: 'darkMetal', layer: 'body' });
    }
    b.addSlattedArray(0, h - 0.025, 0, d * 0.74, 4, w, 0.048, 0.085, 'z', 'wood', 'body');
    b.addBox(0, 0.16, 0, legSpan, 0.025, d * 0.58, { materialRole: 'frame', layer: 'detail' });
    // Folded clean gym towels + gym bag
    b.addChamferBox(-w * 0.28, h + 0.05, 0, 0.34, 0.09, 0.26, 0.015, { materialRole: 'fabric', layer: 'detail' });
    b.addChamferBox(w * 0.26, h + 0.12, 0, 0.46, 0.24, 0.28, 0.04, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  if (mode === 'yoga_mat_roller_rack') {
    b.addCasterWheels(0, 0, w - 0.1, d - 0.1, 0.04, 'rubber', 'frame', 0);
    b.addSupportLegs(0, 0.08, h, w - 0.08, d - 0.08, 0.045, 'frame', 0);
    for (const ty of [0.22, h * 0.62, h - 0.04]) {
      b.addBox(0, ty, 0, w - 0.04, 0.035, d - 0.04, { materialRole: 'primary', layer: 'body' });
    }
    // Rolled colorful yoga mats + foam rollers
    const slots = Math.max(4, Math.floor(w / 0.18));
    for (let i = 0; i < slots; i++) {
      const mx = -w * 0.36 + (slots > 1 ? (i / (slots - 1)) * (w * 0.72) : 0);
      b.addCylinder(mx, 0.56, 0, 0.055, 0.055, 0.64, 10, 'y', i % 2 === 0 ? 'accent' : 'fabric', 'detail');
      b.addCylinder(mx, h - 0.14, 0, 0.055, 0.055, d * 0.76, 10, 'z', 'rubber', 'detail');
    }
    return;
  }

  if (mode === 'locker_room_physician_scale') {
    b.addBox(0, 0.04, 0.06, w * 0.76, 0.08, d * 0.78, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.084, 0.06, w * 0.64, 0.015, d * 0.66, { materialRole: 'rubber', layer: 'detail' });
    b.addBox(0, h * 0.45, -d * 0.28, 0.075, h * 0.88, 0.075, { materialRole: 'chrome', layer: 'body' });
    // Balance beam + stadiometer height rod + digital readout
    b.addBox(0.08, h * 0.78, -d * 0.24, w * 0.85, 0.08, 0.07, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0.18, h * 0.78, -d * 0.18, 0.1, 0.06, 0.03, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0, h * 0.92, -d * 0.2, 0.24, 0.03, 0.26, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, h * 0.86, -d * 0.23, 0.2, 0.07, 0.02, { materialRole: 'neonGlow', layer: 'detail' });
    return;
  }

  if (mode === 'wall_studio_mirror_barre') {
    // Wall-mounted at z = 0 facing +z
    b.addBox(0, h * 0.5, 0.025, w, h, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.5, 0.042, w - 0.08, h - 0.08, 0.02, { materialRole: 'glass', layer: 'detail' });
    // Dual horizontal wooden ballet/stretching barres on chrome wall brackets
    for (const bx of [-w * 0.36, 0, w * 0.36]) {
      b.addCylinder(bx, 0.86, 0.11, 0.014, 0.014, 0.18, 8, 'z', 'chrome', 'detail');
      b.addCylinder(bx, 1.1, 0.11, 0.014, 0.014, 0.18, 8, 'z', 'chrome', 'detail');
    }
    b.addCylinder(0, 0.86, 0.2, 0.022, 0.022, w * 0.94, 10, 'x', 'wood', 'body');
    b.addCylinder(0, 1.1, 0.2, 0.022, 0.022, w * 0.94, 10, 'x', 'wood', 'body');
    return;
  }

  if (mode === 'cedar_sauna_heater_bench') {
    const lit = cfg.lampLit !== false;
    // Two-tier cedar sauna bench & slatted backrest
    b.addBox(0, 0.44, 0.22, w, 0.06, d * 0.38, { materialRole: 'wood', layer: 'body' });
    b.addBox(w * 0.18, 0.88, -0.18, w * 0.64, 0.06, d * 0.44, { materialRole: 'wood', layer: 'body' });
    b.addSupportLegs(0, 0, 0.42, w * 0.88, d * 0.3, 0.06, 'wood', 0.22);
    b.addSupportLegs(w * 0.18, 0, 0.86, w * 0.56, d * 0.36, 0.06, 'wood', -0.18);
    b.addSlattedArray(w * 0.18, 1.32, -d * 0.38, 0.36, 4, w * 0.62, 0.055, 0.03, 'y', 'wood', 'body');
    // Electric lava-rock sauna stove tucked on the left
    const hx = -w * 0.36;
    b.addBox(hx, 0.42, -0.18, 0.4, 0.78, 0.36, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(hx, 0.83, -0.18, 0.32, 0.08, 0.28, { materialRole: 'stone', layer: 'detail' });
    if (lit) {
      b.addBox(hx, 0.88, -0.18, 0.24, 0.04, 0.2, { materialRole: 'lampGlow', layer: 'detail' });
    }
    // Cedar sauna bucket + ladle
    b.addCylinder(0.18, 0.56, 0.22, 0.11, 0.09, 0.18, 10, 'y', 'wood', 'detail');
    return;
  }

  if (mode === 'wall_speed_bag_platform') {
    // Wall-mounted at z = 0 facing +z
    b.addBox(0, h * 0.5, 0.025, w, h, 0.04, { materialRole: 'frame', layer: 'body' });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.36), h * 0.48, d * 0.34, 0.05, 0.08, d * 0.64, { materialRole: 'frame', layer: 'body' });
    }
    b.addCylinder(0, h * 0.46, d * 0.48, w * 0.44, w * 0.44, 0.055, 14, 'y', 'wood', 'body');
    b.addCylinder(0, h * 0.4, d * 0.48, 0.028, 0.028, 0.07, 8, 'y', 'chrome', 'detail');
    // Red teardrop boxing speed bag
    b.addCylinder(0, h * 0.24, d * 0.48, 0.05, 0.11, 0.16, 12, 'y', 'safetyRed', 'detail');
    b.addCylinder(0, h * 0.12, d * 0.48, 0.11, 0.04, 0.1, 12, 'y', 'safetyRed', 'detail');
    return;
  }

  // Stainless gym towel dispensing & return cart
  b.addCasterWheels(0, 0, w - 0.1, d - 0.1, 0.045, 'rubber', 'frame', 0);
  b.addBox(0, h * 0.52, 0, w, h - 0.1, d, { materialRole: 'chrome', layer: 'body' });
  b.addBox(0, h - 0.16, 0.02, w - 0.08, 0.24, d - 0.06, { materialRole: 'darkMetal', layer: 'detail' });
  b.addChamferBox(-w * 0.18, h + 0.05, 0, 0.28, 0.1, d * 0.68, 0.015, { materialRole: 'fabric', layer: 'detail' });
  b.addChamferBox(w * 0.18, h + 0.05, 0, 0.28, 0.1, d * 0.68, 0.015, { materialRole: 'accent', layer: 'detail' });
}

export function registerGymLockerRecoveryFamilies() {
  registerObjectFamily({
    id: 'gym_specialty_machines',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Gym, Fitness & Locker Room',
    subcategories: ['Gym, Fitness & Locker Room', 'Game Room & Breakroom Fun'],
    label: 'Gym Leg Press, Lat & Plate Machines',
    description: '45-degree plate-loaded leg press sled, selectorized lat pulldown and low-row tower, Olympic plate tree, Smith squat cage, and preacher curl medicine-ball station.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'large',
    functionalRole: 'recreation',
    locationContext: 'interior',
    environmentTags: ['gym', 'fitness', 'recreation_room'],
    tags: ['gym', 'leg_press', 'lat_pulldown', 'plate_tree', 'smith_machine', 'preacher_curl'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'upholstery', 'chrome', 'rubber'],
    schema: [
      { group: 'Gym Machine', tab: 'structure' },
      {
        key: 'machineStyle',
        label: 'Machine Style',
        type: 'select',
        tab: 'structure',
        default: 'angled_leg_press',
        options: [
          ['angled_leg_press', '45-Degree Plate Leg Press'],
          ['lat_pulldown_low_row', 'Lat Pulldown & Low-Row Tower'],
          ['olympic_plate_tree_barbell', 'Olympic Plate Tree & Barbells'],
          ['smith_squat_cage', 'Linear Guide Smith Cage'],
          ['preacher_curl_dip_station', 'Preacher Curl & Ball Tree']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.75, max: 2.35, step: 0.05, unit: 'm', default: 1.35 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.85, max: 2.45, step: 0.05, unit: 'm', default: 2.05 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 1.05, max: 2.45, step: 0.05, unit: 'm', default: 1.65 }
    ],
    presets: [
      { id: 'leg_press_45_machine', label: '45-Degree Plate Leg Press', locationContext: 'interior', paletteFamily: 'downtown_steel', primaryColor: '#2d3742', accentColor: '#d9534f', params: { machineStyle: 'angled_leg_press', width: 1.45, depth: 2.15, height: 1.55 } },
      { id: 'lat_pulldown_row_tower', label: 'Lat Pulldown & Low-Row Tower', locationContext: 'interior', paletteFamily: 'downtown_steel', primaryColor: '#2c3947', accentColor: '#e09a2b', params: { machineStyle: 'lat_pulldown_low_row', width: 1.15, depth: 1.85, height: 2.2 } },
      { id: 'olympic_weight_plate_tree', label: 'Olympic Plate Tree & Barbells', locationContext: 'interior', paletteFamily: 'downtown_steel', primaryColor: '#3a424c', accentColor: '#3488c2', params: { machineStyle: 'olympic_plate_tree_barbell', width: 1.12, depth: 0.88, height: 1.42 } },
      { id: 'linear_smith_squat_cage', label: 'Linear Guide Smith Cage', locationContext: 'interior', paletteFamily: 'downtown_steel', primaryColor: '#35485e', accentColor: '#c93832', params: { machineStyle: 'smith_squat_cage', width: 1.62, depth: 1.38, height: 2.18 } },
      { id: 'preacher_curl_medball_station', label: 'Preacher Curl & Ball Tree', locationContext: 'interior', paletteFamily: 'downtown_steel', primaryColor: '#333b44', accentColor: '#e3a62d', params: { machineStyle: 'preacher_curl_dip_station', width: 1.58, depth: 1.18, height: 1.46 } }
    ],
    buildGeometry: glrBuildSpecialtyMachines
  });

  registerObjectFamily({
    id: 'gym_locker_studio_recovery',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Gym, Fitness & Locker Room',
    subcategories: ['Gym, Fitness & Locker Room', 'Lobbies, Decor & Collectibles'],
    label: 'Gym Locker Bench, Sauna & Studio Props',
    description: 'Slatted oak locker benches, yoga mat and foam roller carts, balance-beam locker scales, studio mirror barres, cedar sauna benches, speed bags, and towel bins.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    sizeClass: 'medium',
    functionalRole: 'recreation',
    locationContext: 'interior',
    environmentTags: ['gym', 'locker_room', 'bathroom', 'fitness'],
    tags: ['locker_bench', 'yoga_mat', 'scale', 'studio_mirror', 'sauna', 'speed_bag', 'towel_bin'],
    materialSlots: ['primary', 'accent', 'frame', 'wood', 'glass', 'fabric', 'stone', 'chrome', 'neonGlow'],
    schema: [
      { group: 'Locker & Studio Gear', tab: 'structure' },
      {
        key: 'studioStyle',
        label: 'Facility Type',
        type: 'select',
        tab: 'structure',
        default: 'locker_room_wood_bench',
        options: [
          ['locker_room_wood_bench', 'Slatted Oak Locker Bench'],
          ['yoga_mat_roller_rack', 'Yoga Mat & Foam Roller Rack'],
          ['locker_room_physician_scale', 'Balance-Beam Locker Scale'],
          ['wall_studio_mirror_barre', 'Wall Studio Mirror & Barre'],
          ['cedar_sauna_heater_bench', 'Cedar Sauna Bench & Heater'],
          ['wall_speed_bag_platform', 'Wall Boxing Speed Bag'],
          ['gym_towel_return_cart', 'Gym Towel Return Cart']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.48, max: 2.55, step: 0.05, unit: 'm', default: 1.65 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.18, max: 1.85, step: 0.05, unit: 'm', default: 0.5 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.42, max: 2.35, step: 0.05, unit: 'm', default: 0.48 },
      { key: 'lampLit', label: 'Sauna Glow Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'oak_locker_room_bench', label: 'Slatted Oak Locker Bench', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#9c6c42', accentColor: '#2d6c8e', params: { studioStyle: 'locker_room_wood_bench', width: 1.68, depth: 0.48, height: 0.48 } },
      { id: 'yoga_mat_foam_roller_cart', label: 'Yoga Mat & Foam Roller Cart', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#485666', accentColor: '#4ea88f', params: { studioStyle: 'yoga_mat_roller_rack', width: 0.96, depth: 0.46, height: 1.24 } },
      { id: 'locker_balance_beam_scale', label: 'Balance-Beam Locker Scale', locationContext: 'interior', paletteFamily: 'clean_medical_office', primaryColor: '#dce3ea', accentColor: '#cc3d35', params: { studioStyle: 'locker_room_physician_scale', width: 0.52, depth: 0.56, height: 1.54 } },
      { id: 'studio_mirror_double_barre', label: 'Wall Studio Mirror & Barre', attachmentProfile: 'wall_mounted', locationContext: 'interior', paletteFamily: 'modern_corporate', woodColor: '#b38152', params: { studioStyle: 'wall_studio_mirror_barre', width: 2.1, depth: 0.24, height: 2.05 } },
      { id: 'cedar_sauna_bench_heater', label: 'Cedar Sauna Bench & Heater', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#b0723e', params: { studioStyle: 'cedar_sauna_heater_bench', width: 1.85, depth: 1.48, height: 1.56, lampLit: true } },
      { id: 'wall_boxing_speed_bag', label: 'Wall Boxing Speed Bag Rig', attachmentProfile: 'wall_mounted', locationContext: 'interior', paletteFamily: 'industrial_alley', woodColor: '#946238', params: { studioStyle: 'wall_speed_bag_platform', width: 0.64, depth: 0.72, height: 0.88 } },
      { id: 'gym_clean_towel_cart', label: 'Gym Towel Dispensing Cart', locationContext: 'interior', paletteFamily: 'clean_medical_office', accentColor: '#367591', params: { studioStyle: 'gym_towel_return_cart', width: 0.84, depth: 0.56, height: 1.02 } }
    ],
    buildGeometry: glrBuildLockerStudio
  });
}
