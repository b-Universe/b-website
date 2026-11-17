import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function thgAddPumpkin(b, cx, cy, cz, r = 0.2, h = 0.24, role = 'accent') {
  b.addCylinder(cx, cy + h * 0.45, cz, r * 0.78, r * 0.88, h * 0.65, 10, 'y', role, 'body');
  b.addCylinder(cx, cy + h * 0.84, cz, r * 0.36, r * 0.78, h * 0.26, 10, 'y', role, 'body');
  b.addCylinder(cx, cy + h * 0.12, cz, r * 0.88, r * 0.45, h * 0.22, 10, 'y', role, 'body');
  // Ribbed low-poly pumpkin ridges & curly stem
  for (let i = 0; i < 4; i++) {
    b.addCylinder(cx, cy + h * 0.48, cz, r * 0.94, r * 0.94, h * 0.56, 8, 'y', role, 'detail', (i * Math.PI) / 4);
  }
  b.addPipeSegment(cx, cy + h * 0.92, cz, cx + r * 0.14, cy + h * 1.18, cz, Math.max(0.016, r * 0.12), 6, 'foliage', 'detail');
}

function thgAddHayBale(b, cx, cy, cz, w = 0.86, h = 0.42, d = 0.48, rotYDeg = 0) {
  b.addChamferBox(cx, cy + h * 0.5, cz, w, h, d, 0.025, { materialRole: 'warningYellow', layer: 'body', rotYDeg });
  for (const sx of [-w * 0.24, w * 0.24]) {
    b.addBox(cx + sx, cy + h * 0.5, cz, 0.02, h + 0.012, d + 0.012, { materialRole: 'wood', layer: 'detail', rotYDeg });
  }
}

function thgAddRoastedTurkeyPlatter(b, cx, cy, cz, scale = 1.0) {
  // Oval silver serving platter + garnished roasted turkey
  b.addCylinder(cx, cy + 0.014 * scale, cz, 0.29 * scale, 0.24 * scale, 0.028 * scale, 12, 'y', 'chrome', 'body');
  b.addChamferBox(cx, cy + 0.11 * scale, cz, 0.28 * scale, 0.16 * scale, 0.36 * scale, 0.04 * scale, { materialRole: 'wood', layer: 'body' });
  b.addCylinder(cx, cy + 0.18 * scale, cz, 0.1 * scale, 0.13 * scale, 0.22 * scale, 10, 'z', 'accent', 'body');
  for (const sx of [-1, 1]) {
    // Plump legs & drumsticks with white paper frills
    b.addPipeSegment(cx + sx * 0.12 * scale, cy + 0.11 * scale, cz - 0.04 * scale, cx + sx * 0.15 * scale, cy + 0.18 * scale, cz + 0.17 * scale, 0.048 * scale, 8, 'wood', 'detail');
    b.addCylinder(cx + sx * 0.15 * scale, cy + 0.2 * scale, cz + 0.21 * scale, 0.03 * scale, 0.024 * scale, 0.055 * scale, 8, 'z', 'whiteTrim', 'detail');
    // Tucked wings & parsley/cranberry rim garnish
    b.addBox(cx + sx * 0.15 * scale, cy + 0.1 * scale, cz - 0.08 * scale, 0.05 * scale, 0.08 * scale, 0.14 * scale, { materialRole: 'wood', layer: 'detail' });
    b.addCylinder(cx + sx * 0.21 * scale, cy + 0.038 * scale, cz + 0.04 * scale, 0.04 * scale, 0.04 * scale, 0.025 * scale, 8, 'y', 'foliage', 'detail');
    b.addCylinder(cx + sx * 0.18 * scale, cy + 0.042 * scale, cz - 0.14 * scale, 0.026 * scale, 0.026 * scale, 0.024 * scale, 8, 'y', 'safetyRed', 'detail');
  }
}

function thgBuildThanksgivingHarvest(group, cfg, b, mats, meta) {
  const mode = cfg.harvestStyle || 'proud_tail_feathered_turkey';
  const w = clamp(cfg.width || 1.25, 0.65, 2.45);
  const h = clamp(cfg.height || 1.35, 0.48, 2.55);
  const lit = cfg.lampLit !== false;

  if (mode === 'proud_tail_feathered_turkey') {
    const s = h / 1.22;
    b.addCylinder(0, 0.045 * s, 0, 0.42 * s, 0.48 * s, 0.09 * s, 10, 'y', 'wood', 'body');
    // Splayed orange legs & webbed feet
    for (const lx of [-0.14 * s, 0.14 * s]) {
      b.addCylinder(lx, 0.24 * s, 0.02 * s, 0.025 * s, 0.028 * s, 0.3 * s, 8, 'y', 'warningYellow', 'body');
      b.addBox(lx, 0.1 * s, 0.06 * s, 0.11 * s, 0.03 * s, 0.15 * s, { materialRole: 'warningYellow', layer: 'detail' });
    }
    // Plump chestnut turkey body & tucked wing pads
    b.addCylinder(0, 0.5 * s, 0.04 * s, 0.25 * s, 0.31 * s, 0.52 * s, 12, 'z', 'wood', 'body');
    for (const sx of [-1, 1]) {
      b.addChamferBox(sx * 0.29 * s, 0.52 * s, 0, 0.08 * s, 0.22 * s, 0.38 * s, 0.02 * s, { materialRole: 'primary', layer: 'detail', rotZDeg: sx * 12 });
    }
    // Arched neck, head, bright red wattle/snood & yellow beak
    b.addPipeSegment(0, 0.62 * s, 0.24 * s, 0, 0.92 * s, 0.32 * s, 0.085 * s, 8, 'wood', 'body');
    b.addCylinder(0, 0.96 * s, 0.33 * s, 0.095 * s, 0.1 * s, 0.14 * s, 10, 'y', 'wood', 'body');
    b.addCone(0, 0.95 * s, 0.47 * s, 0.04 * s, 0.12 * s, 8, 'warningYellow', 'detail', 'z');
    b.addBox(0, 0.87 * s, 0.42 * s, 0.045 * s, 0.12 * s, 0.045 * s, { materialRole: 'safetyRed', layer: 'detail' });
    for (const ex of [-0.065 * s, 0.065 * s]) {
      b.addCylinder(ex, 0.99 * s, 0.39 * s, 0.018 * s, 0.018 * s, 0.018 * s, 8, 'z', 'darkMetal', 'detail');
    }
    // Pilgrim buckle hat
    b.addCylinder(0, 1.04 * s, 0.33 * s, 0.16 * s, 0.16 * s, 0.028 * s, 10, 'y', 'darkMetal', 'detail');
    b.addCylinder(0, 1.15 * s, 0.33 * s, 0.1 * s, 0.09 * s, 0.2 * s, 10, 'y', 'darkMetal', 'body');
    b.addBox(0, 1.09 * s, 0.43 * s, 0.065 * s, 0.055 * s, 0.018 * s, { materialRole: 'brass', layer: 'detail' });
    // Iconic 9-feather semicircular fanned harvest tail
    const featherRoles = ['safetyRed', 'warningYellow', 'accent', 'wood', 'safetyRed', 'wood', 'accent', 'warningYellow', 'safetyRed'];
    for (let i = 0; i < 9; i++) {
      const t = (i / 8) - 0.5;
      const a = t * Math.PI * 0.88;
      const fx = Math.sin(a) * 0.34 * s;
      const fy = 0.66 * s + Math.cos(a) * 0.36 * s;
      b.addBox(fx, fy, -0.26 * s, 0.14 * s, 0.48 * s, 0.036 * s, {
        materialRole: featherRoles[i],
        layer: 'body',
        rotZDeg: -(a * 180) / Math.PI,
        rotXDeg: -10
      });
    }
    if (lit) {
      meta.lightSources.push({ id: 'turkey_porch_glow', type: 'point', positionMeters: [0, 0.85 * s, 0.45 * s], color: '#ffcb73', intensity: 1.1, rangeMeters: 3.5, enabled: true });
    }
    return;
  }

  if (mode === 'straw_bale_pumpkin_scarecrow') {
    thgAddHayBale(b, -w * 0.22, 0, -0.08, 0.82, 0.38, 0.46, 8);
    thgAddHayBale(b, w * 0.2, 0, -0.1, 0.78, 0.38, 0.44, -12);
    thgAddHayBale(b, 0, 0.38, -0.1, 0.76, 0.34, 0.42, 2);
    // Wooden scarecrow pole, plaid coat, straw cuffs & floppy pointed hat
    const sy = 0.72;
    b.addBox(0.08, sy + 0.46, -0.06, 0.08, 1.35, 0.08, { materialRole: 'wood', layer: 'body' });
    b.addBox(0.08, sy + 0.68, -0.04, 1.05, 0.075, 0.075, { materialRole: 'wood', layer: 'body' });
    b.addTrapezoidBox(0.08, sy + 0.52, -0.02, 0.34, 0.2, 0.28, 0.18, 0.46, { materialRole: 'primary', layer: 'body' });
    b.addBox(0.08, sy + 0.68, -0.02, 0.96, 0.16, 0.14, { materialRole: 'safetyRed', layer: 'detail' });
    // Burlap scarecrow head & pointed harvest hat
    b.addCylinder(0.08, sy + 0.9, -0.02, 0.13, 0.14, 0.24, 10, 'y', 'warningYellow', 'body');
    b.addCylinder(0.08, sy + 1.02, -0.02, 0.26, 0.26, 0.035, 10, 'y', 'wood', 'body');
    b.addCone(0.08, sy + 1.2, -0.02, 0.16, 0.34, 8, 'wood', 'body');
    // Harvest pumpkins clustered at feet
    thgAddPumpkin(b, -0.34, 0, 0.34, 0.22, 0.26, 'accent');
    thgAddPumpkin(b, 0.32, 0, 0.36, 0.18, 0.22, 'accent');
    thgAddPumpkin(b, 0.02, 0, 0.42, 0.15, 0.18, 'whiteTrim');
    return;
  }

  if (mode === 'autumn_harvest_porch_arch') {
    // Wall-mounted autumn foliage & pumpkin banner anchored flush at z = 0
    const span = clamp(w, 0.9, 2.4);
    b.addBox(0, 0, 0.04, span, 0.14, 0.08, { materialRole: 'wood', layer: 'body' });
    const leaves = Math.max(8, Math.round(span * 7));
    for (let i = 0; i < leaves; i++) {
      const lx = -span * 0.46 + (i / (leaves - 1)) * (span * 0.92);
      const drop = Math.abs(lx) > span * 0.34 ? -0.18 : 0;
      b.addBox(lx, drop + 0.02, 0.085, 0.13, 0.13, 0.05, { materialRole: i % 3 === 0 ? 'safetyRed' : i % 3 === 1 ? 'warningYellow' : 'accent', layer: 'detail', rotZDeg: (i % 2 === 0 ? 18 : -18) });
      if (lit && i % 2 === 0) {
        b.addCylinder(lx, drop - 0.03, 0.115, 0.016, 0.016, 0.026, 6, 'z', 'lampGlow', 'detail');
      }
    }
    for (const px of [-span * 0.44, span * 0.44]) {
      thgAddPumpkin(b, px, -0.26, 0.09, 0.11, 0.13, 'accent');
    }
    b.addBox(0, -0.18, 0.035, 0.72, 0.22, 0.03, { materialRole: 'wood', layer: 'body' });
    objCreateSignPlane(group, 'Give Thanks', 0.66, 0.18, '#5c3318', '#fae2b8', {
      x: 0,
      y: -0.18,
      z: 0.055
    });
    if (lit) {
      meta.lightSources.push({ id: 'harvest_banner_glow', type: 'point', positionMeters: [0, 0, 0.28], color: '#ffcf78', intensity: 1.2, rangeMeters: 3.5, enabled: true });
    }
    return;
  }

  if (mode === 'wheelbarrow_harvest_gourds') {
    // Cedar wheelbarrow loaded with ribbed pumpkins & autumn corn
    b.addCylinder(0, 0.24, 0.76, 0.24, 0.24, 0.09, 12, 'x', 'frame', 'body');
    for (const sx of [-1, 1]) {
      b.addPipeSegment(sx * 0.22, 0.24, 0.76, sx * 0.34, 0.66, -0.78, 0.032, 8, 'wood', 'body');
      b.addPipeSegment(sx * 0.26, 0.42, -0.34, sx * 0.26, 0, -0.38, 0.028, 6, 'frame', 'body');
    }
    b.addTrapezoidBox(0, 0.5, 0.12, 0.52, 0.66, 0.74, 0.94, 0.32, { materialRole: 'wood', layer: 'body', rotXDeg: 6 });
    thgAddPumpkin(b, -0.14, 0.62, 0.2, 0.2, 0.24, 'accent');
    thgAddPumpkin(b, 0.16, 0.62, 0.18, 0.18, 0.22, 'accent');
    thgAddPumpkin(b, 0, 0.64, -0.08, 0.17, 0.2, 'whiteTrim');
    thgAddPumpkin(b, 0.02, 0.84, 0.08, 0.14, 0.17, 'warningYellow');
    return;
  }

  // Harvest market & farmstand barrel signpost
  b.addCylinder(0, 0.26, 0, 0.3, 0.26, 0.52, 10, 'y', 'wood', 'body');
  b.addPrismRing(0, 0.16, 0, 0.295, 0.275, 0.035, 10, 'y', 'darkMetal', 'detail');
  b.addPrismRing(0, 0.42, 0, 0.31, 0.29, 0.035, 10, 'y', 'darkMetal', 'detail');
  b.addBox(0, h * 0.52, 0, 0.11, h * 0.96, 0.11, { materialRole: 'wood', layer: 'body' });
  thgAddPumpkin(b, -0.36, 0, 0.14, 0.17, 0.2, 'accent');
  thgAddPumpkin(b, 0.34, 0, 0.18, 0.14, 0.17, 'warningYellow');
  b.addBox(0.16, h * 0.82, 0, 0.84, 0.22, 0.038, { materialRole: 'wood', layer: 'body', rotZDeg: 5 });
  objCreateSignPlane(group, 'Harvest Feast', 0.76, 0.17, '#753118', '#fff0cf', { x: 0.16, y: h * 0.82, z: 0.024, rotZ: 0.08 });
  b.addBox(-0.16, h * 0.6, 0, 0.78, 0.22, 0.038, { materialRole: 'wood', layer: 'body', rotZDeg: -6 });
  objCreateSignPlane(group, 'Pumpkin Patch', 0.7, 0.17, '#4f5e24', '#fff0cf', { x: -0.16, y: h * 0.6, z: 0.024, rotZ: -0.1 });
  if (lit) {
    b.addCylinder(0.42, h * 0.88, 0, 0.075, 0.065, 0.16, 8, 'y', 'lampGlow', 'detail');
  }
}

function thgBuildThanksgivingFeast(group, cfg, b, mats, meta) {
  const mode = cfg.feastStyle || 'roasted_turkey_platter';
  const w = clamp(cfg.width || 0.75, 0.36, 2.55);
  const d = clamp(cfg.depth || 0.56, 0.3, 1.35);
  const h = clamp(cfg.height || 0.38, 0.24, 1.25);
  const lit = cfg.lampLit !== false;

  if (mode === 'roasted_turkey_platter') {
    thgAddRoastedTurkeyPlatter(b, 0, 0, 0, clamp(w / 0.58, 0.8, 1.5));
    return;
  }

  if (mode === 'overflowing_harvest_cornucopia') {
    // Segmented curved woven wicker cornucopia flaring forward (+z) on y = 0
    const hornSegs = [
      { y: 0.07, z: -0.28, r: 0.045, role: 'wood' },
      { y: 0.14, z: -0.22, r: 0.075, role: 'wood' },
      { y: 0.19, z: -0.14, r: 0.115, role: 'wood' },
      { y: 0.2, z: -0.04, r: 0.16, role: 'wood' },
      { y: 0.19, z: 0.08, r: 0.2, role: 'wood' }
    ];
    for (let i = 0; i < hornSegs.length - 1; i++) {
      const a = hornSegs[i];
      const n = hornSegs[i + 1];
      b.addCylinder(0, (a.y + n.y) * 0.5, (a.z + n.z) * 0.5, n.r, a.r, Math.hypot(n.y - a.y, n.z - a.z) + 0.02, 10, 'z', 'wood', 'body');
    }
    b.addPrismRing(0, 0.19, 0.1, 0.21, 0.16, 0.04, 10, 'z', 'accent', 'detail');
    // Spilling harvest produce at mouth (+z)
    thgAddPumpkin(b, -0.08, 0, 0.2, 0.1, 0.12, 'accent');
    thgAddPumpkin(b, 0.1, 0, 0.24, 0.085, 0.1, 'whiteTrim');
    b.addCylinder(0.02, 0.06, 0.28, 0.045, 0.045, 0.07, 8, 'y', 'safetyRed', 'detail');
    b.addCylinder(-0.14, 0.045, 0.3, 0.032, 0.024, 0.14, 8, 'x', 'warningYellow', 'detail');
    return;
  }

  if (mode === 'pumpkin_pecan_pie_stand') {
    b.addCylinder(0, 0.015, 0, w * 0.48, w * 0.48, 0.03, 12, 'y', 'wood', 'body');
    // Crimped crust pumpkin pie with whipped cream dollop
    const px = -w * 0.2;
    b.addCylinder(px, 0.055, 0.02, 0.16, 0.14, 0.05, 12, 'y', 'warningYellow', 'body');
    b.addCylinder(px, 0.082, 0.02, 0.14, 0.14, 0.01, 12, 'y', 'accent', 'detail');
    b.addCone(px, 0.105, 0.02, 0.035, 0.045, 8, 'whiteTrim', 'detail');
    // Pecan pie & porcelain gravy boat
    const gx = w * 0.22;
    b.addCylinder(gx, 0.055, -0.04, 0.14, 0.12, 0.05, 12, 'y', 'wood', 'body');
    b.addBox(gx - 0.02, 0.07, 0.16, 0.14, 0.075, 0.085, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addCylinder(gx + 0.1, 0.07, 0.06, 0.055, 0.045, 0.065, 10, 'y', 'safetyRed', 'detail');
    return;
  }

  if (mode === 'thanksgiving_feast_dining_table') {
    const tableH = 0.76;
    b.addBox(0, tableH, 0, w, 0.055, d, { materialRole: 'wood', layer: 'body' });
    b.addSupportLegs(0, 0, tableH - 0.02, w - 0.16, d - 0.14, 0.075, 'wood', 0);
    // Crimson & gold holiday table runner + centerpiece roasted turkey & candelabra
    b.addBox(0, tableH + 0.03, 0, w * 0.88, 0.008, d * 0.34, { materialRole: 'safetyRed', layer: 'detail' });
    thgAddRoastedTurkeyPlatter(b, 0, tableH + 0.034, 0, 0.92);
    // Brass candelabra & warm candle glow at end
    b.addCylinder(-w * 0.32, tableH + 0.11, 0, 0.055, 0.07, 0.15, 8, 'y', 'brass', 'detail');
    for (const cz of [-0.08, 0, 0.08]) {
      b.addCylinder(-w * 0.32, tableH + 0.24, cz, 0.018, 0.018, 0.16, 8, 'y', 'whiteTrim', 'detail');
      if (lit) {
        b.addCone(-w * 0.32, tableH + 0.34, cz, 0.015, 0.045, 6, 'lampGlow', 'detail');
      }
    }
    // Harvest pie on opposite end + 4 tucked dining chairs + porcelain place plates
    b.addCylinder(w * 0.32, tableH + 0.06, 0, 0.14, 0.12, 0.045, 10, 'y', 'accent', 'detail');
    for (const cx of [-w * 0.28, w * 0.28]) {
      for (const side of [-1, 1]) {
        b.addCylinder(cx, tableH + 0.036, side * (d * 0.32), 0.11, 0.11, 0.014, 10, 'y', 'whiteTrim', 'detail');
        const chairZ = side * (d * 0.56);
        b.addBox(cx, 0.45, chairZ, 0.44, 0.048, 0.42, { materialRole: 'wood', layer: 'body' });
        b.addSupportLegs(cx, 0, 0.44, 0.36, 0.34, 0.042, 'wood', chairZ);
        b.addBox(cx, 0.72, chairZ + side * 0.19, 0.42, 0.5, 0.045, { materialRole: 'wood', layer: 'body' });
      }
    }
    if (lit) {
      meta.lightSources.push({ id: 'feast_candle_glow', type: 'point', positionMeters: [-w * 0.32, tableH + 0.42, 0], color: '#ffd98a', intensity: 1.4, rangeMeters: 4.0, enabled: true });
    }
    return;
  }

  // Pilgrim harvest mantel brass candelabra & mini gourds (surface_placed)
  b.addCylinder(0, 0.02, 0, 0.12, 0.14, 0.04, 10, 'y', 'brass', 'body');
  b.addCylinder(0, 0.14, 0, 0.025, 0.035, 0.22, 8, 'y', 'brass', 'body');
  b.addBox(0, 0.22, 0, w * 0.65, 0.025, 0.03, { materialRole: 'brass', layer: 'detail' });
  for (const cx of [-w * 0.28, 0, w * 0.28]) {
    const cy = cx === 0 ? 0.31 : 0.29;
    b.addCylinder(cx, cy, 0, 0.022, 0.022, 0.14, 8, 'y', 'warningYellow', 'detail');
    if (lit) {
      b.addCone(cx, cy + 0.095, 0, 0.016, 0.05, 6, 'lampGlow', 'detail');
    }
  }
  thgAddPumpkin(b, -w * 0.36, 0, 0.1, 0.075, 0.09, 'accent');
  thgAddPumpkin(b, w * 0.36, 0, 0.1, 0.07, 0.085, 'whiteTrim');
}

export function registerHolidayThanksgivingFamilies() {
  registerObjectFamily({
    id: 'holiday_thanksgiving_harvest',
    categoryId: '30_holidays',
    categories: ['30_holidays', '13_parks'],
    subcategory: 'Thanksgiving & Harvest',
    subcategories: ['Thanksgiving & Harvest', 'Outdoor Lawn & Porch Displays', 'Planters & Tree Grates'],
    label: 'Thanksgiving Turkeys, Scarecrows & Harvest',
    description: 'Fanned-tail Thanksgiving yard turkeys, hay bale pumpkin scarecrows, stick-on autumn leaf porch arches, pumpkin wheelbarrows, and harvest barrel signs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'exterior',
    environmentTags: ['holiday', 'thanksgiving', 'autumn', 'patio', 'outdoor_plaza', 'street'],
    tags: ['thanksgiving', 'turkey', 'scarecrow', 'hay_bale', 'pumpkin', 'wheelbarrow', 'autumn', 'harvest'],
    materialSlots: ['primary', 'accent', 'frame', 'wood', 'foliage', 'brass', 'safetyRed', 'warningYellow', 'lampGlow'],
    schema: [
      { group: 'Harvest Display', tab: 'structure' },
      {
        key: 'harvestStyle',
        label: 'Harvest Piece',
        type: 'select',
        tab: 'structure',
        default: 'proud_tail_feathered_turkey',
        options: [
          ['proud_tail_feathered_turkey', 'Fanned-Tail Strutting Turkey'],
          ['straw_bale_pumpkin_scarecrow', 'Hay Bale & Pumpkin Scarecrow'],
          ['autumn_harvest_porch_arch', 'Autumn Leaf & Give-Thanks Banner'],
          ['wheelbarrow_harvest_gourds', 'Pumpkin & Gourd Wheelbarrow'],
          ['turkey_trot_yard_pilgrim_sign', 'Harvest Market Barrel Signpost']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.65, max: 2.45, step: 0.05, unit: 'm', default: 1.25 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.48, max: 2.55, step: 0.05, unit: 'm', default: 1.35 },
      { key: 'lampLit', label: 'Autumn Glow Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'thanksgiving_strutting_turkey', label: 'Fanned-Tail Strutting Turkey', locationContext: 'both', paletteFamily: 'park_heritage', woodColor: '#784625', accentColor: '#e07a22', params: { harvestStyle: 'proud_tail_feathered_turkey', width: 1.15, height: 1.32, lampLit: true } },
      { id: 'hay_bale_pumpkin_scarecrow', label: 'Hay Bale & Pumpkin Scarecrow', locationContext: 'exterior', paletteFamily: 'park_heritage', primaryColor: '#2d5c4e', woodColor: '#6b492c', accentColor: '#e37b22', params: { harvestStyle: 'straw_bale_pumpkin_scarecrow', width: 1.48, height: 1.98 } },
      { id: 'autumn_leaf_porch_banner', label: 'Give-Thanks Leaf Porch Banner', attachmentProfile: 'wall_mounted', locationContext: 'both', paletteFamily: 'park_heritage', woodColor: '#694224', accentColor: '#de7822', params: { harvestStyle: 'autumn_harvest_porch_arch', width: 1.85, height: 0.56, lampLit: true } },
      { id: 'pumpkin_gourd_wheelbarrow', label: 'Pumpkin Harvest Wheelbarrow', locationContext: 'exterior', paletteFamily: 'wood_office_executive', woodColor: '#8c5a34', accentColor: '#e07622', params: { harvestStyle: 'wheelbarrow_harvest_gourds', width: 0.92, height: 1.05 } },
      { id: 'harvest_market_barrel_sign', label: 'Harvest Market Barrel Signpost', locationContext: 'exterior', paletteFamily: 'wood_office_executive', woodColor: '#7b4e2d', accentColor: '#e07a22', params: { harvestStyle: 'turkey_trot_yard_pilgrim_sign', width: 1.25, height: 2.15, lampLit: true } }
    ],
    buildGeometry: thgBuildThanksgivingHarvest
  });

  registerObjectFamily({
    id: 'holiday_thanksgiving_feast',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Thanksgiving & Harvest',
    subcategories: ['Thanksgiving & Harvest', 'Indoor Mantle, Gifts & Tabletop', 'Dining, Coffee & Side Tables'],
    label: 'Thanksgiving Feast Table & Cornucopias',
    description: 'Roasted turkey silver platters, overflowing wicker harvest cornucopias, pumpkin and pecan pie trays, full Thanksgiving banquet dining tables, and brass harvest candelabras.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'interior',
    environmentTags: ['holiday', 'thanksgiving', 'autumn', 'dining_room', 'kitchen', 'living_room', 'residential_interior'],
    tags: ['thanksgiving', 'feast', 'turkey_platter', 'cornucopia', 'pumpkin_pie', 'banquet', 'candelabra'],
    materialSlots: ['wood', 'accent', 'brass', 'chrome', 'foliage', 'safetyRed', 'warningYellow', 'lampGlow'],
    schema: [
      { group: 'Feast Piece', tab: 'structure' },
      {
        key: 'feastStyle',
        label: 'Feast Item',
        type: 'select',
        tab: 'structure',
        default: 'roasted_turkey_platter',
        options: [
          ['roasted_turkey_platter', 'Roasted Turkey Silver Platter'],
          ['overflowing_harvest_cornucopia', 'Overflowing Harvest Cornucopia'],
          ['pumpkin_pecan_pie_stand', 'Pumpkin & Pecan Pie Tray'],
          ['thanksgiving_feast_dining_table', 'Thanksgiving Banquet Dining Table'],
          ['pilgrim_harvest_mantel_candles', 'Harvest Brass Candelabra & Gourds']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.36, max: 2.55, step: 0.05, unit: 'm', default: 0.62 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.3, max: 1.35, step: 0.04, unit: 'm', default: 0.48 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.24, max: 1.25, step: 0.04, unit: 'm', default: 0.34 },
      { key: 'lampLit', label: 'Candles Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'roasted_turkey_silver_platter', label: 'Roasted Turkey Silver Platter', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#9c5a2c', accentColor: '#c97b36', params: { feastStyle: 'roasted_turkey_platter', width: 0.62, depth: 0.46, height: 0.28 } },
      { id: 'harvest_wicker_cornucopia', label: 'Overflowing Harvest Cornucopia', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#96643a', accentColor: '#e37b22', params: { feastStyle: 'overflowing_harvest_cornucopia', width: 0.56, depth: 0.64, height: 0.4 } },
      { id: 'pumpkin_pecan_pie_feast_tray', label: 'Pumpkin & Pecan Pie Tray', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#8d5b34', accentColor: '#cf6822', params: { feastStyle: 'pumpkin_pecan_pie_stand', width: 0.68, depth: 0.48, height: 0.24 } },
      { id: 'thanksgiving_banquet_table_set', label: 'Thanksgiving Banquet Dining Table', attachmentProfile: 'ground_standing', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#6e4526', accentColor: '#d97626', params: { feastStyle: 'thanksgiving_feast_dining_table', width: 2.15, depth: 1.05, height: 0.85, lampLit: true } },
      { id: 'harvest_brass_mantel_candelabra', label: 'Harvest Brass Candelabra & Gourds', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', accentColor: '#e07a22', params: { feastStyle: 'pilgrim_harvest_mantel_candles', width: 0.64, depth: 0.36, height: 0.42, lampLit: true } }
    ],
    buildGeometry: thgBuildThanksgivingFeast
  });
}
