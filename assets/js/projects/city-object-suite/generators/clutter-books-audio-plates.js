import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane, objCreateScreenPlane } from '../geometry/primitives.js';

function cbapBuildPantryAndBarConsumables(group, cfg, b) {
  const kind = cfg.consumableStyle || 'aluminum_beer_cans';
  const w = clamp(cfg.width || 0.34, 0.14, 0.65);
  const h = clamp(cfg.height || 0.28, 0.12, 0.45);
  const d = clamp(cfg.depth || 0.24, 0.12, 0.45);

  if (kind === 'aluminum_beer_cans') {
    // 6-pack aluminum beverage cans + cardboard carrier base & silver pull-tab lids
    const carrierW = 0.22;
    const carrierD = 0.15;
    b.addBox(0, 0.036, 0, carrierW, 0.068, carrierD, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.095, 0, carrierW * 0.94, 0.09, 0.012, { materialRole: 'secondary', layer: 'detail' });
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = (col - 1) * 0.068;
        const cz = (row === 0 ? -0.036 : 0.036);
        const bodyRole = (col + row) % 2 === 0 ? 'primary' : 'accent';
        b.addCylinder(cx, 0.072, cz, 0.029, 0.029, 0.125, 10, 'y', bodyRole, 'body');
        b.addCylinder(cx, 0.138, cz, 0.026, 0.029, 0.012, 10, 'y', 'chrome', 'detail');
        b.addBox(cx + 0.008, 0.146, cz, 0.014, 0.004, 0.01, { materialRole: 'chrome', layer: 'detail' });
      }
    }
    return;
  }

  if (kind === 'milk_cartons') {
    // Tall half-gallon + half-pint gable-top milk cartons
    const specs = [
      { x: -0.055, z: 0, cw: 0.095, ch: 0.19, cd: 0.095, role: 'whiteTrim', cap: 'safetyRed' },
      { x: 0.065, z: 0.02, cw: 0.072, ch: 0.14, cd: 0.072, role: 'whiteTrim', cap: 'accent' }
    ];
    for (const m of specs) {
      b.addBox(m.x, m.ch * 0.42, m.z, m.cw, m.ch * 0.84, m.cd, { materialRole: m.role, layer: 'body' });
      b.addBox(m.x, m.ch * 0.46, m.z + m.cd * 0.504, m.cw * 0.84, m.ch * 0.46, 0.004, { materialRole: m.cap, layer: 'detail' });
      b.addTrapezoidBox(m.x, m.ch * 0.9, m.z, m.cw, m.cd, m.cw, 0.014, m.ch * 0.18, { materialRole: m.role, layer: 'body' });
      b.addBox(m.x, m.ch * 1.01, m.z, m.cw, 0.018, 0.014, { materialRole: m.role, layer: 'detail' });
      b.addCylinder(m.x + m.cw * 0.2, m.ch * 0.92, m.z + m.cd * 0.24, 0.012, 0.012, 0.014, 8, 'y', m.cap, 'detail');
    }
    return;
  }

  if (kind === 'cereal_boxes') {
    const boxes = [
      { x: -0.14, z: -0.02, ry: -0.12, bw: 0.18, bh: 0.28, bd: 0.065, role: 'warningYellow', tag: 'Crunchies' },
      { x: 0.02, z: 0.02, ry: 0.05, bw: 0.19, bh: 0.3, bd: 0.068, role: 'safetyRed', tag: 'Oats Plus' },
      { x: 0.17, z: -0.03, ry: 0.18, bw: 0.17, bh: 0.27, bd: 0.062, role: 'accent', tag: 'Choco Bites' }
    ];
    for (const c of boxes) {
      b.addBox(c.x, c.bh * 0.5, c.z, c.bw, c.bh, c.bd, { materialRole: c.role, layer: 'body', rotY: c.ry });
      b.addBox(c.x, c.bh * 0.52, c.z + Math.cos(c.ry) * (c.bd * 0.51), c.bw * 0.72, c.bh * 0.24, 0.006, {
        materialRole: 'whiteTrim',
        layer: 'detail',
        rotY: c.ry
      });
    }
    return;
  }

  if (kind === 'alcohol_bottles') {
    // Assortment of amber whiskey, green wine, clear vodka & rum bottles
    // Square amber whiskey bottle
    b.addBox(-0.14, 0.1, 0, 0.075, 0.2, 0.075, { materialRole: 'warningYellow', layer: 'body' });
    b.addCylinder(-0.14, 0.24, 0, 0.016, 0.022, 0.075, 8, 'y', 'warningYellow', 'body');
    b.addCylinder(-0.14, 0.285, 0, 0.019, 0.019, 0.022, 8, 'y', 'wood', 'detail');
    b.addBox(-0.14, 0.11, 0.04, 0.055, 0.075, 0.005, { materialRole: 'whiteTrim', layer: 'detail' });
    // Tall green wine bottle
    b.addCylinder(-0.04, 0.1, 0.02, 0.038, 0.038, 0.2, 10, 'y', 'signalGreen', 'body');
    b.addCylinder(-0.04, 0.23, 0.02, 0.014, 0.036, 0.065, 10, 'y', 'signalGreen', 'body');
    b.addCylinder(-0.04, 0.28, 0.02, 0.014, 0.014, 0.045, 8, 'y', 'safetyRed', 'detail');
    b.addBox(-0.04, 0.11, 0.059, 0.048, 0.08, 0.004, { materialRole: 'whiteTrim', layer: 'detail' });
    // Clear frosted spirits bottle
    b.addCylinder(0.06, 0.12, -0.02, 0.036, 0.034, 0.24, 10, 'y', 'glass', 'body');
    b.addCylinder(0.06, 0.265, -0.02, 0.015, 0.022, 0.055, 8, 'y', 'chrome', 'detail');
    // Rounded dark liquor decanter
    b.addCylinder(0.16, 0.085, 0.01, 0.032, 0.045, 0.17, 10, 'y', 'accent', 'body');
    b.addCylinder(0.16, 0.2, 0.01, 0.014, 0.016, 0.06, 8, 'y', 'accent', 'body');
    b.addCylinder(0.16, 0.238, 0.01, 0.018, 0.018, 0.02, 8, 'y', 'brass', 'detail');
    return;
  }

  // chrome_diner_napkin_dispenser
  const nw = clamp(w, 0.14, 0.22);
  const nh = clamp(h, 0.14, 0.22);
  const nd = clamp(d, 0.12, 0.18);
  b.addBox(0, 0.01, 0, nw + 0.02, 0.018, nd + 0.02, { materialRole: 'darkMetal', layer: 'body' });
  b.addBox(0, nh * 0.48, 0, nw, nh * 0.9, nd * 0.72, { materialRole: 'chrome', layer: 'body' });
  b.addBox(0, nh * 0.5, nd * 0.38, nw * 0.84, nh * 0.78, 0.012, { materialRole: 'chrome', layer: 'detail' });
  b.addBox(0, nh * 0.5, -nd * 0.38, nw * 0.84, nh * 0.78, 0.012, { materialRole: 'chrome', layer: 'detail' });
  // Pop-up white folded napkins sticking out of both front & back slots
  b.addBox(0, nh * 0.62, nd * 0.4, nw * 0.58, nh * 0.36, 0.01, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: 10 });
  b.addBox(0, nh * 0.62, -nd * 0.4, nw * 0.58, nh * 0.36, 0.01, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: -10 });
}

function cbapBuildBooksAndDocuments(group, cfg, b) {
  const mode = cfg.stackMode || 'neat_vertical_stack';
  const count = Math.round(clamp(cfg.bookCount || 5, 2, 8));
  const bookRoles = ['primary', 'accent', 'secondary', 'safetyRed', 'wood'];

  if (mode === 'neat_vertical_stack') {
    let curY = 0;
    for (let i = 0; i < count; i++) {
      const bw = 0.24 - i * 0.01;
      const bd = 0.3 - i * 0.012;
      const bh = 0.042 - (i % 2) * 0.008;
      const role = bookRoles[i % bookRoles.length];
      b.addBox(0, curY + bh * 0.5, 0, bw, bh, bd, { materialRole: role, layer: 'body' });
      // Ivory recessed pages between top and bottom cover boards
      b.addBox(0.012, curY + bh * 0.5, 0.008, bw - 0.02, bh * 0.76, bd - 0.02, { materialRole: 'whiteTrim', layer: 'detail' });
      curY += bh;
    }
    return;
  }

  if (mode === 'crisscross_pile') {
    let curY = 0;
    for (let i = 0; i < count; i++) {
      const bw = 0.23 - (i % 3) * 0.015;
      const bd = 0.29 - (i % 2) * 0.02;
      const bh = 0.038 + (i % 2) * 0.008;
      const ry = ((i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.22));
      const ox = (i % 2 === 0 ? 0.015 : -0.018);
      const role = bookRoles[(i + 1) % bookRoles.length];
      b.addBox(ox, curY + bh * 0.5, 0, bw, bh, bd, { materialRole: role, layer: 'body', rotY: ry });
      b.addBox(ox + Math.cos(ry) * 0.01, curY + bh * 0.5, -Math.sin(ry) * 0.01, bw - 0.022, bh * 0.74, bd - 0.022, {
        materialRole: 'whiteTrim',
        layer: 'detail',
        rotY: ry
      });
      curY += bh;
    }
    return;
  }

  if (mode === 'leaning_bookend_row') {
    const step = 0.052;
    const totalW = count * step + 0.14;
    b.addBox(-totalW * 0.5 + 0.02, 0.09, 0, 0.014, 0.18, 0.16, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(totalW * 0.5 - 0.02, 0.09, 0, 0.014, 0.18, 0.16, { materialRole: 'darkMetal', layer: 'body' });
    for (let i = 0; i < count; i++) {
      const bx = -totalW * 0.5 + 0.055 + i * step;
      const bh = 0.24 + (i % 3) * 0.028;
      const isLast = i === count - 1;
      const tilt = isLast ? -0.18 : 0;
      const role = bookRoles[i % bookRoles.length];
      b.addBox(bx + (isLast ? 0.016 : 0), bh * 0.5, 0, 0.04, bh, 0.2, {
        materialRole: role,
        layer: 'body',
        rotZ: tilt
      });
      b.addBox(bx + (isLast ? 0.016 : 0), bh * 0.5, 0.01, 0.032, bh - 0.016, 0.18, {
        materialRole: 'whiteTrim',
        layer: 'detail',
        rotZ: tilt
      });
    }
    return;
  }

  if (mode === 'folders_and_papers') {
    // Manila folders, tabbed files, skewed document stack & pen
    const folderCols = ['warningYellow', 'accent', 'signalGreen'];
    for (let i = 0; i < 3; i++) {
      const fy = 0.008 + i * 0.018;
      const ry = (i - 1) * 0.14;
      b.addBox(-0.04 + i * 0.025, fy, 0.01, 0.24, 0.012, 0.31, { materialRole: folderCols[i], layer: 'body', rotY: ry });
      b.addBox(-0.04 + i * 0.025, fy + 0.004, 0.01, 0.21, 0.006, 0.28, { materialRole: 'whiteTrim', layer: 'detail', rotY: ry });
    }
    // Separate angled page fan + blue clipboard on right
    b.addBox(0.18, 0.008, -0.02, 0.22, 0.014, 0.3, { materialRole: 'primary', layer: 'body', rotY: -0.22 });
    b.addBox(0.18, 0.018, -0.02, 0.19, 0.008, 0.26, { materialRole: 'whiteTrim', layer: 'detail', rotY: -0.22 });
    b.addBox(0.18, 0.026, -0.13, 0.09, 0.016, 0.03, { materialRole: 'chrome', layer: 'detail', rotY: -0.22 });
    return;
  }

  // tied_archive_document_bundles
  for (let i = 0; i < 2; i++) {
    const ox = (i === 0 ? -0.14 : 0.14);
    b.addBox(ox, 0.08, 0, 0.23, 0.16, 0.31, { materialRole: 'whiteTrim', layer: 'body', rotYDeg: i === 0 ? 4 : -6 });
    b.addBox(ox, 0.08, 0, 0.236, 0.166, 0.018, { materialRole: 'wood', layer: 'detail', rotYDeg: i === 0 ? 4 : -6 });
    b.addBox(ox, 0.08, 0, 0.018, 0.166, 0.316, { materialRole: 'wood', layer: 'detail', rotYDeg: i === 0 ? 4 : -6 });
    b.addBox(ox, 0.166, 0.04, 0.09, 0.006, 0.055, { materialRole: 'safetyRed', layer: 'detail', rotYDeg: i === 0 ? 4 : -6 });
  }
}

function cbapBuildClocksGlobesAndPhones(group, cfg, b, mats, meta) {
  const type = cfg.accessoryType || 'led_digital_clock';

  if (type === 'led_digital_clock') {
    b.addTrapezoidBox(0, 0.042, 0, 0.22, 0.13, 0.2, 0.09, 0.084, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.086, -0.01, 0.12, 0.01, 0.036, { materialRole: 'chrome', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || '12:45 Pm', 0.15, 0.05, '#120808', cfg.emissiveColor || '#ff4a3d', {
      x: 0,
      y: 0.046,
      z: 0.056,
      rotX: -0.22,
      lit: true
    });
    return;
  }

  if (type === 'flip_tile_retro_clock') {
    b.addCylinder(0, 0.015, 0, 0.065, 0.075, 0.025, 10, 'y', 'chrome', 'body');
    b.addCylinder(0, 0.045, 0, 0.018, 0.022, 0.05, 8, 'y', 'chrome', 'body');
    b.addChamferBox(0, 0.115, 0, 0.21, 0.1, 0.095, 0.016, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0.115, 0.115, 0, 0.018, 0.018, 0.02, 8, 'x', 'brass', 'detail');
    objCreateSignPlane(group, cfg.signText || '08:30 Am', 0.155, 0.06, '#14171c', '#f5f8fc', {
      x: 0,
      y: 0.115,
      z: 0.051
    });
    return;
  }

  if (type === 'antique_stand_globe') {
    // Three-legged walnut floor stand + brass meridian ring + tilted terrestrial globe
    b.addCylinder(0, 0.22, 0, 0.18, 0.18, 0.022, 12, 'y', 'wood', 'body');
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.addBox(Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2, 0.042, 0.68, 0.042, { materialRole: 'wood', layer: 'body' });
    }
    b.addCylinder(0, 0.68, 0, 0.24, 0.24, 0.032, 14, 'y', 'wood', 'body');
    b.addPrismRing(0, 0.94, 0, 0.24, 0.215, 0.018, 16, 'z', 'brass', 'detail');
    b.addCylinder(0, 0.94, 0, 0.2, 0.14, 0.22, 12, 'y', 'primary', 'body');
    b.addCylinder(0, 1.07, 0, 0.14, 0.06, 0.075, 12, 'y', 'primary', 'body');
    b.addCylinder(0, 0.81, 0, 0.06, 0.14, 0.075, 12, 'y', 'primary', 'body');
    b.addCylinder(0, 0.94, 0, 0.205, 0.205, 0.04, 12, 'y', 'accent', 'detail');
    return;
  }

  if (type === 'desk_brass_axis_globe') {
    b.addCylinder(0, 0.015, 0, 0.09, 0.1, 0.03, 12, 'y', 'wood', 'body');
    b.addCylinder(0, 0.055, 0, 0.018, 0.022, 0.06, 8, 'y', 'brass', 'detail');
    b.addPrismRing(0, 0.21, 0, 0.145, 0.13, 0.012, 14, 'z', 'brass', 'detail');
    b.addCylinder(0, 0.21, 0, 0.12, 0.08, 0.13, 12, 'y', 'primary', 'body');
    b.addCylinder(0, 0.29, 0, 0.08, 0.03, 0.045, 12, 'y', 'primary', 'body');
    b.addCylinder(0, 0.13, 0, 0.03, 0.08, 0.045, 12, 'y', 'primary', 'body');
    return;
  }

  if (type === 'vintage_rotary_phone') {
    b.addTrapezoidBox(0, 0.045, 0, 0.21, 0.23, 0.17, 0.18, 0.088, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, 0.08, 0.065, 0.048, 0.048, 0.016, 12, 'y', 'whiteTrim', 'detail');
    b.addCylinder(0, 0.09, 0.065, 0.044, 0.044, 0.01, 12, 'y', 'chrome', 'detail');
    b.addBox(-0.045, 0.105, -0.04, 0.024, 0.045, 0.024, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0.045, 0.105, -0.04, 0.024, 0.045, 0.024, { materialRole: 'chrome', layer: 'detail' });
    // Handset bar + receiver/mouthpiece bells
    b.addBox(0, 0.135, -0.04, 0.22, 0.028, 0.036, { materialRole: 'primary', layer: 'detail' });
    b.addCylinder(-0.085, 0.118, -0.04, 0.028, 0.032, 0.032, 10, 'y', 'primary', 'detail');
    b.addCylinder(0.085, 0.118, -0.04, 0.028, 0.032, 0.032, 10, 'y', 'primary', 'detail');
    return;
  }

  if (type === 'wall_corridor_phone') {
    // Wall mounted steel faceplate & hung handset (back at z = 0)
    b.addBox(0, 0, 0.02, 0.18, 0.28, 0.04, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0.032, 0.02, 0.048, 0.075, 0.12, 0.018, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-0.048, 0.01, 0.056, 0.038, 0.21, 0.036, { materialRole: 'primary', layer: 'detail' });
    b.addCylinder(-0.048, 0.085, 0.045, 0.024, 0.024, 0.03, 8, 'z', 'primary', 'detail');
    b.addCylinder(-0.048, -0.065, 0.045, 0.024, 0.024, 0.03, 8, 'z', 'primary', 'detail');
    return;
  }

  if (type === 'cordless_handset_dock') {
    b.addChamferBox(0, 0.026, 0, 0.13, 0.045, 0.15, 0.01, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.12, -0.01, 0.052, 0.18, 0.026, { materialRole: 'primary', layer: 'detail', rotXDeg: -16 });
    b.addBox(0, 0.148, 0.008, 0.04, 0.042, 0.006, { materialRole: 'screen', layer: 'detail', rotXDeg: -16 });
    return;
  }

  // executive_multiline_speakerphone
  b.addTrapezoidBox(0, 0.04, 0, 0.27, 0.24, 0.25, 0.2, 0.075, { materialRole: 'darkMetal', layer: 'body' });
  b.addBox(0.038, 0.082, 0.03, 0.15, 0.018, 0.14, { materialRole: 'frame', layer: 'detail', rotXDeg: 18 });
  objCreateScreenPlane(group, 'info_display', 0.11, 0.045, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
    x: 0.038,
    y: 0.098,
    z: -0.055,
    rotX: -0.42
  });
  b.addBox(-0.085, 0.095, 0.005, 0.045, 0.032, 0.21, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 12 });
  meta.interaction = { interactable: true, actionType: 'answer_phone' };
}

function cbapBuildAudioSpeakers(group, cfg, b) {
  const style = cfg.speakerStyle || 'floor_tower_box';
  const w = clamp(cfg.width || 0.42, 0.16, 0.95);
  const h = clamp(cfg.height || 0.72, 0.18, 1.08);
  const d = clamp(cfg.depth || 0.34, 0.16, 0.56);

  if (style === 'hanging_pa_horn_bracket') {
    const sw = clamp(w, 0.32, 0.54);
    const sh = clamp(h, 0.24, 0.42);
    const sd = clamp(d, 0.24, 0.4);
    // Overhead/wall U-bracket yoke & tilted trapezoidal PA club speaker
    b.addBox(0, sh * 0.62, 0, sw * 0.6, 0.022, 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(-sw * 0.53, sh * 0.32, 0, 0.022, sh * 0.66, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(sw * 0.53, sh * 0.32, 0, 0.022, sh * 0.66, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addTrapezoidBox(0, 0, 0, sw, sd, sw * 0.76, sd * 0.76, sh, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 18 });
    b.addCylinder(-sw * 0.16, 0, sd * 0.46, sh * 0.28, sh * 0.24, 0.025, 12, 'z', 'frame', 'detail');
    b.addCylinder(sw * 0.22, sh * 0.12, sd * 0.46, sh * 0.14, sh * 0.1, 0.025, 10, 'z', 'accent', 'detail');
    return;
  }

  if (style === 'studio_monitor_pair') {
    const mw = 0.22;
    const mh = 0.34;
    const md = 0.24;
    for (const dir of [-1, 1]) {
      const mx = dir * (w * 0.32);
      const ry = -dir * 0.18;
      b.addChamferBox(mx, mh * 0.5, 0, mw, mh, md, 0.014, { materialRole: 'darkMetal', layer: 'body', rotY: ry });
      b.addCylinder(mx + Math.sin(ry) * (md * 0.48), mh * 0.38, Math.cos(ry) * (md * 0.48), 0.068, 0.048, 0.022, 12, 'z', 'warningYellow', 'detail', ry);
      b.addCylinder(mx + Math.sin(ry) * (md * 0.48), mh * 0.76, Math.cos(ry) * (md * 0.48), 0.034, 0.022, 0.02, 10, 'z', 'chrome', 'detail', ry);
    }
    return;
  }

  if (style === 'desktop_pc_speaker_set') {
    // 2.1 Desktop subwoofer box + 2 angled L/R satellite speakers
    b.addBox(0, 0.12, -0.02, 0.2, 0.24, 0.22, { materialRole: 'darkMetal', layer: 'body' });
    b.addCylinder(0, 0.11, 0.095, 0.068, 0.055, 0.018, 12, 'z', 'frame', 'detail');
    for (const dir of [-1, 1]) {
      const sx = dir * (w * 0.36);
      b.addTrapezoidBox(sx, 0.09, 0.03, 0.1, 0.1, 0.085, 0.08, 0.18, { materialRole: 'primary', layer: 'body', rotY: -dir * 0.15 });
      b.addCylinder(sx, 0.11, 0.08, 0.032, 0.026, 0.016, 10, 'z', 'chrome', 'detail');
      b.addCylinder(sx, 0.04, 0.082, 0.006, 0.006, 0.01, 6, 'z', 'holoEnergy', 'detail');
    }
    return;
  }

  // floor_tower_box (vintage wood hi-fi 3-way floor box speaker)
  b.addBox(0, h * 0.5, 0, w, h, d, { materialRole: 'wood', layer: 'body' });
  b.addBox(0, h * 0.5, d * 0.47, w - 0.04, h - 0.05, 0.025, { materialRole: 'darkMetal', layer: 'body' });
  // Big lower woofer, mid driver, upper tweeter + port
  b.addCylinder(0, h * 0.28, d * 0.49, w * 0.34, w * 0.22, 0.025, 14, 'z', 'frame', 'detail');
  b.addCylinder(0, h * 0.28, d * 0.504, w * 0.11, w * 0.11, 0.018, 10, 'z', 'darkMetal', 'detail');
  b.addCylinder(-w * 0.12, h * 0.64, d * 0.49, w * 0.16, w * 0.11, 0.022, 12, 'z', 'frame', 'detail');
  b.addCylinder(w * 0.18, h * 0.82, d * 0.49, w * 0.095, w * 0.075, 0.02, 10, 'z', 'chrome', 'detail');
}

function cbapBuildPizzaPlatesAndJukebox(group, cfg, b, mats, meta) {
  const mode = cfg.decorMode || 'embossed_license_plate';
  const w = clamp(cfg.width || 0.42, 0.26, 1.25);
  const h = clamp(cfg.height || 0.24, 0.12, 1.15);
  const d = clamp(cfg.depth || 0.06, 0.02, 0.55);

  if (mode === 'neon_pizza_slice_sign') {
    const sw = clamp(w, 0.44, 0.85);
    const sh = clamp(h, 0.52, 0.92);
    // Wall backing plate & glowing neon triangular slice border
    b.addBox(0, 0, 0.015, sw, sh, 0.024, { materialRole: 'darkMetal', layer: 'body' });
    b.addPipeSegment(-sw * 0.38, sh * 0.22, 0.036, 0, -sh * 0.38, 0.036, 0.014, 8, 'warningYellow', 'detail', true);
    b.addPipeSegment(sw * 0.38, sh * 0.22, 0.036, 0, -sh * 0.38, 0.036, 0.014, 8, 'warningYellow', 'detail', true);
    b.addPipeSegment(-sw * 0.4, sh * 0.24, 0.036, sw * 0.4, sh * 0.24, 0.036, 0.02, 8, 'neonGlow', 'detail', true);
    // Glowing neon pepperoni disks
    b.addCylinder(-0.08, 0.06, 0.036, 0.042, 0.042, 0.018, 10, 'z', 'safetyRed', 'detail');
    b.addCylinder(0.08, 0.04, 0.036, 0.038, 0.038, 0.018, 10, 'z', 'safetyRed', 'detail');
    b.addCylinder(0, -0.1, 0.036, 0.036, 0.036, 0.018, 10, 'z', 'safetyRed', 'detail');
    objCreateSignPlane(group, cfg.signText || 'Hot Pizza', sw * 0.82, 0.14, '#240b0a', '#ff5436', {
      x: 0,
      y: sh * 0.38,
      z: 0.034,
      lit: true
    });
    return;
  }

  if (mode === 'pizzeria_box_stack') {
    const bw = clamp(w, 0.36, 0.52);
    const boxH = 0.052;
    for (let i = 0; i < 3; i++) {
      const ry = (i === 1 ? 0.14 : i === 2 ? -0.12 : 0);
      b.addBox(0, boxH * 0.5 + i * boxH, 0, bw, boxH, bw, { materialRole: 'whiteTrim', layer: 'body', rotY: ry });
      b.addBox(0, boxH * 0.5 + i * boxH, bw * 0.505, bw * 0.92, 0.018, 0.008, { materialRole: 'safetyRed', layer: 'detail', rotY: ry });
    }
    // Open top box revealing 8-slice cheese & pepperoni pizza inside + angled open lid
    const topY = boxH * 3;
    b.addCylinder(0, topY + 0.012, 0, bw * 0.42, bw * 0.42, 0.016, 12, 'y', 'warningYellow', 'detail');
    for (const [px, pz] of [[-0.06, -0.05], [0.06, -0.04], [-0.04, 0.06], [0.06, 0.06]]) {
      b.addCylinder(px, topY + 0.022, pz, 0.024, 0.024, 0.008, 8, 'y', 'safetyRed', 'detail');
    }
    b.addBox(0, topY + bw * 0.38, -bw * 0.48, bw, 0.02, bw * 0.92, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: 72 });
    return;
  }

  if (mode === 'modern_wall_jukebox') {
    const jw = clamp(w, 0.68, 0.94);
    const jh = clamp(h, 0.92, 1.24);
    const jd = clamp(d, 0.22, 0.38);
    // Wall-mounted digital touchscreen jukebox cabinet + glowing halo arch
    b.addChamferBox(0, 0, jd * 0.5, jw, jh, jd, 0.035, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(-jw * 0.45, 0, jd * 0.96, 0.042, jh * 0.86, 0.03, { materialRole: 'neonGlow', layer: 'detail' });
    b.addBox(jw * 0.45, 0, jd * 0.96, 0.042, jh * 0.86, 0.03, { materialRole: 'neonGlow', layer: 'detail' });
    b.addBox(0, jh * 0.45, jd * 0.96, jw * 0.86, 0.048, 0.03, { materialRole: 'holoEnergy', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Digital Jukebox', jw * 0.66, 0.11, '#0e1726', '#4de2ff', {
      x: 0,
      y: jh * 0.35,
      z: jd + 0.008,
      lit: true
    });
    objCreateScreenPlane(group, 'kiosk_menu', jw * 0.68, jh * 0.42, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 0.05,
      z: jd + 0.008
    });
    // Bottom subwoofer grille + glowing bill/coin tray
    b.addBox(0, -jh * 0.32, jd * 0.97, jw * 0.72, 0.18, 0.03, { materialRole: 'frame', layer: 'detail' });
    b.addBox(jw * 0.22, -jh * 0.22, jd + 0.012, 0.1, 0.05, 0.015, { materialRole: 'signalGreen', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'select_music' };
    return;
  }

  // embossed_license_plate (wall_mounted at z = 0)
  const pw = clamp(w, 0.28, 0.46);
  const ph = clamp(h, 0.14, 0.24);
  const bg = cfg.plateBg || '#19355c';
  const fg = cfg.plateFg || '#f5c542';
  // Stamped outer aluminum bevel rim + central embossed field + 4 corner screw mounts
  b.addChamferBox(0, 0, 0.012, pw, ph, 0.018, 0.004, { materialRole: 'chrome', layer: 'body' });
  b.addBox(0, 0, 0.02, pw - 0.018, ph - 0.018, 0.008, { materialRole: 'primary', layer: 'body' });
  for (const sx of [-pw * 0.4, pw * 0.4]) {
    for (const sy of [-ph * 0.36, ph * 0.36]) {
      b.addCylinder(sx, sy, 0.025, 0.007, 0.007, 0.008, 6, 'z', 'chrome', 'detail');
    }
  }
  objCreateSignPlane(group, cfg.signText || '1Up Hero', pw - 0.026, ph - 0.026, bg, fg, {
    x: 0,
    y: 0,
    z: 0.026,
    lit: Boolean(cfg.neonLit)
  });
}

export function registerClutterBooksAudioAndPlatesFamilies() {
  registerObjectFamily({
    id: 'pantry_bar_consumables',
    categoryId: '29_residential_household',
    categories: ['29_residential_household', '09_commercial', 'office_public_interiors'],
    subcategory: 'Kitchen Appliances & Counters',
    subcategories: ['Kitchen Appliances & Counters', 'Breakrooms & Employee Amenities', 'Home Lighting, Decor & Clutter', 'Cafe Seating'],
    label: 'Cans, Cartons, Cereals, Bottles & Napkins',
    description: 'Beer can 6-packs, gable-top milk cartons, cereal box trios, bar liquor/wine bottles, and chrome diner napkin dispensers.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'micro',
    functionalRole: 'clutter',
    tags: ['beer', 'can', 'milk', 'carton', 'cereal', 'alcohol', 'bottle', 'napkin', 'dispenser', 'bar', 'kitchen'],
    materialSlots: ['primary', 'secondary', 'accent'],
    schema: [
      { group: 'Consumable Item' },
      {
        key: 'consumableStyle',
        name: 'Pack / Prop Type',
        type: 'select',
        options: [
          ['aluminum_beer_cans', 'Beer Can Six-Pack Carrier'],
          ['milk_cartons', 'Gable-Top Milk Cartons'],
          ['cereal_boxes', 'Breakfast Cereal Box Trio'],
          ['alcohol_bottles', 'Alcohol & Liquor Bottle Lineup'],
          ['chrome_diner_napkin_dispenser', 'Chrome Diner Napkin Dispenser']
        ],
        default: 'aluminum_beer_cans'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.14, max: 0.65, step: 0.02, unit: 'm', default: 0.34 },
      { key: 'height', name: 'Height', type: 'number', min: 0.12, max: 0.45, step: 0.02, unit: 'm', default: 0.28 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.12, max: 0.45, step: 0.02, unit: 'm', default: 0.24 }
    ],
    presets: [
      {
        id: 'aluminum_beer_can_pack',
        label: 'Six-Pack Aluminum Beer Cans',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'arcade_neon_80s',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#255c9e',
        secondaryMaterial: 'cardboard',
        secondaryColor: '#9e7448',
        accentColor: '#d9a426',
        params: { consumableStyle: 'aluminum_beer_cans', width: 0.24, height: 0.16, depth: 0.18 }
      },
      {
        id: 'gable_top_milk_carton',
        label: 'Gable-Top Fresh Milk Cartons',
        subcategory: 'Kitchen Appliances & Counters',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'whiteTrim',
        primaryColor: '#f2f6fa',
        accentColor: '#2a75c7',
        params: { consumableStyle: 'milk_cartons', width: 0.22, height: 0.22, depth: 0.14 }
      },
      {
        id: 'breakfast_cereal_box_trio',
        label: 'Colorful Breakfast Cereal Box Trio',
        subcategory: 'Kitchen Appliances & Counters',
        paletteFamily: 'residential_suburb',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e6b12e',
        accentColor: '#3685c7',
        params: { consumableStyle: 'cereal_boxes', width: 0.52, height: 0.32, depth: 0.14 }
      },
      {
        id: 'liquor_bottle_bar_lineup',
        label: 'Assorted Alcohol & Wine Bottles',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'heritage_brick',
        condition: 'clean',
        primaryMaterial: 'glass',
        primaryColor: '#3d693f',
        accentColor: '#b54c24',
        params: { consumableStyle: 'alcohol_bottles', width: 0.42, height: 0.32, depth: 0.12 }
      },
      {
        id: 'chrome_diner_napkin_dispenser',
        label: 'Chrome Countertop Napkin Dispenser',
        subcategory: 'Cafe Seating',
        paletteFamily: 'cafe_warm',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#d4dce3',
        params: { consumableStyle: 'chrome_diner_napkin_dispenser', width: 0.18, height: 0.18, depth: 0.14 }
      }
    ],
    buildGeometry: cbapBuildPantryAndBarConsumables
  });

  registerObjectFamily({
    id: 'books_folders_documents',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '25_malls_libraries', '29_residential_household'],
    subcategory: 'Desktop Accessories',
    subcategories: ['Desktop Accessories', 'Library Study & Checkouts', 'Filing, Storage & Mailrooms', 'Home Lighting, Decor & Clutter'],
    label: 'Book Stacks, Folders & Document Bundles',
    description: 'Neatly aligned book towers, crisscrossed book piles, bookend shelves, open Manila folders/papers, and tied archival document bundles.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'micro',
    functionalRole: 'clutter',
    tags: ['books', 'stack', 'folders', 'papers', 'documents', 'binders', 'library', 'desk'],
    materialSlots: ['primary', 'secondary', 'accent'],
    schema: [
      { group: 'Stack Arrangement' },
      {
        key: 'stackMode',
        name: 'Layout Style',
        type: 'select',
        options: [
          ['neat_vertical_stack', 'Neat Vertical Book Stack'],
          ['crisscross_pile', 'Crisscross Alternating Book Pile'],
          ['leaning_bookend_row', 'Upright Bookend Shelf Row'],
          ['folders_and_papers', 'Manila Folders & Scattered Papers'],
          ['tied_archive_document_bundles', 'Tied Archival Document Bundles']
        ],
        default: 'neat_vertical_stack'
      },
      { key: 'bookCount', name: 'Book Count', type: 'number', min: 2, max: 8, step: 1, default: 5 }
    ],
    presets: [
      {
        id: 'neat_vertical_book_stack',
        label: 'Neat Vertical Hardcover Book Stack',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'heritage_brick',
        condition: 'clean',
        primaryMaterial: 'painted_wood',
        primaryColor: '#2d4d73',
        secondaryMaterial: 'painted_wood',
        secondaryColor: '#5c3c24',
        accentColor: '#8c2d2d',
        params: { stackMode: 'neat_vertical_stack', bookCount: 5 }
      },
      {
        id: 'crisscross_book_pile',
        label: 'Crisscrossed Alternating Book Pile',
        subcategory: 'Library Study & Checkouts',
        paletteFamily: 'residential_suburb',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_wood',
        primaryColor: '#3a6646',
        secondaryMaterial: 'painted_wood',
        secondaryColor: '#754829',
        accentColor: '#c48329',
        params: { stackMode: 'crisscross_pile', bookCount: 6 }
      },
      {
        id: 'leaning_bookend_row',
        label: 'Upright Bookend Desk Row',
        subcategory: 'Library Study & Checkouts',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_wood',
        primaryColor: '#273c57',
        secondaryMaterial: 'painted_wood',
        secondaryColor: '#694127',
        accentColor: '#3b6b5c',
        params: { stackMode: 'leaning_bookend_row', bookCount: 6 }
      },
      {
        id: 'scattered_desk_papers_folders',
        label: 'Manila Folders & Desk Paper Sheaves',
        subcategory: 'Desktop Accessories',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#295782',
        accentColor: '#2d7a5b',
        params: { stackMode: 'folders_and_papers', bookCount: 4 }
      },
      {
        id: 'tied_archive_document_bundles',
        label: 'Tied Archival Document & File Bundles',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_wood',
        primaryColor: '#8a623c',
        params: { stackMode: 'tied_archive_document_bundles', bookCount: 3 }
      }
    ],
    buildGeometry: cbapBuildBooksAndDocuments
  });

  registerObjectFamily({
    id: 'desk_clocks_globes_phones',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '27_sims_everyday_misc', '29_residential_household'],
    subcategory: 'Desktop Accessories',
    subcategories: ['Desktop Accessories', 'Lobbies, Decor & Collectibles', 'Office Decorations & Miscellaneous Props', 'Home Lighting, Decor & Clutter'],
    label: 'Digital Clocks, Globes & Phone Varieties',
    description: 'Led digital & retro flip desk clocks, floor/tabletop antique brass globes, rotary phones, multiline office phones, corridor wall phones, and cordless handsets.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'micro',
    functionalRole: 'functional',
    tags: ['clock', 'digital', 'flip clock', 'globe', 'antique', 'phone', 'rotary', 'cordless', 'speakerphone'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Accessory Model' },
      {
        key: 'accessoryType',
        name: 'Clock / Globe / Phone Type',
        type: 'select',
        options: [
          ['led_digital_clock', 'Led Digital Desk Alarm Clock'],
          ['flip_tile_retro_clock', 'Retro Split-Flip Desk Clock'],
          ['antique_stand_globe', 'Antique Brass Floor Stand Globe'],
          ['desk_brass_axis_globe', 'Desktop Brass Axis World Globe'],
          ['vintage_rotary_phone', 'Classic Rotary Dial Desk Phone'],
          ['executive_multiline_speakerphone', 'Executive Multi-Line Office Phone'],
          ['wall_corridor_phone', 'Corridor Emergency Wall Phone'],
          ['cordless_handset_dock', 'Cordless Home Handset & Charger']
        ],
        default: 'led_digital_clock'
      },
      { key: 'signText', name: 'Clock Time Display', type: 'text', default: '12:45 Pm' }
    ],
    presets: [
      {
        id: 'led_digital_desk_clock',
        label: 'Red Led Digital Desk Alarm Clock',
        subcategory: 'Desktop Accessories',
        paletteFamily: 'retro_80s',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#232830',
        emissiveColor: '#ff4238',
        params: { accessoryType: 'led_digital_clock', signText: '12:45 Pm' }
      },
      {
        id: 'flip_tile_retro_clock',
        label: 'Retro Pedestal Split-Flip Clock',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'cafe_warm',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#d9692b',
        params: { accessoryType: 'flip_tile_retro_clock', signText: '08:30 Am' }
      },
      {
        id: 'antique_brass_stand_globe',
        label: 'Antique Floor-Stand Brass World Globe',
        subcategory: 'Lobbies, Decor & Collectibles',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'heritage_brick',
        condition: 'clean',
        primaryMaterial: 'painted_wood',
        primaryColor: '#c9a66b',
        accentColor: '#3b7561',
        woodColor: '#5c3920',
        params: { accessoryType: 'antique_stand_globe' }
      },
      {
        id: 'desk_brass_axis_globe',
        label: 'Desktop Brass Meridian World Globe',
        subcategory: 'Office Decorations & Miscellaneous Props',
        paletteFamily: 'heritage_brick',
        condition: 'clean',
        primaryMaterial: 'painted_wood',
        primaryColor: '#386f99',
        woodColor: '#694022',
        params: { accessoryType: 'desk_brass_axis_globe' }
      },
      {
        id: 'vintage_rotary_desk_phone',
        label: 'Vintage Rotary Dial Desk Phone',
        subcategory: 'Desktop Accessories',
        paletteFamily: 'heritage_brick',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#1f2329',
        params: { accessoryType: 'vintage_rotary_phone' }
      },
      {
        id: 'executive_multiline_speakerphone',
        label: 'Executive Multi-Line Conference Phone',
        subcategory: 'Desktop Accessories',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#293038',
        emissiveColor: '#4de2ff',
        params: { accessoryType: 'executive_multiline_speakerphone' }
      },
      {
        id: 'wall_corridor_corded_phone',
        label: 'Stainless Corridor Corded Wall Phone',
        subcategory: 'Public Service & Civic Facilities',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#22272e',
        params: { accessoryType: 'wall_corridor_phone' }
      },
      {
        id: 'cordless_home_handset_dock',
        label: 'Cordless Home Telephone & Dock',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#414a54',
        params: { accessoryType: 'cordless_handset_dock' }
      }
    ],
    buildGeometry: cbapBuildClocksGlobesAndPhones
  });

  registerObjectFamily({
    id: 'audio_speaker_systems',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment', 'office_public_interiors', '29_residential_household', '09_commercial'],
    subcategory: 'Retro Electronics & Accessories',
    subcategories: ['Retro Electronics & Accessories', 'Computers & Technology', 'Home Lighting, Decor & Clutter', 'Storefront Attachments'],
    label: 'Speakers: Hanging, Floor Box & Computer',
    description: 'Hanging ceiling bracket Pa horn speakers, vintage wooden 3-way floor box towers, studio monitor pairs, and 2.1 desktop computer speaker sets.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'ceiling_mounted', 'surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['speaker', 'audio', 'hanging', 'box', 'tower', 'studio', 'computer', 'subwoofer', 'pa'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Speaker Style' },
      {
        key: 'speakerStyle',
        name: 'Enclosure Variant',
        type: 'select',
        options: [
          ['floor_tower_box', '3-Way Floor Wood Box Speaker'],
          ['hanging_pa_horn_bracket', 'Hanging Ceiling Bracket Pa Speaker'],
          ['studio_monitor_pair', 'Studio Monitor Box Pair'],
          ['desktop_pc_speaker_set', '2.1 Desktop Computer Speakers']
        ],
        default: 'floor_tower_box'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.16, max: 0.95, step: 0.04, unit: 'm', default: 0.42 },
      { key: 'height', name: 'Height', type: 'number', min: 0.18, max: 1.08, step: 0.04, unit: 'm', default: 0.72 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.16, max: 0.56, step: 0.04, unit: 'm', default: 0.34 }
    ],
    presets: [
      {
        id: 'hanging_pa_horn_bracket_speaker',
        label: 'Hanging Ceiling-Bracket Pa Speaker',
        subcategory: 'Storefront Attachments',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'arcade_neon_80s',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#252a33',
        accentColor: '#3eb8ff',
        params: { speakerStyle: 'hanging_pa_horn_bracket', width: 0.44, height: 0.34, depth: 0.32 }
      },
      {
        id: 'floor_wood_tower_box_speaker',
        label: 'Retro Wood-Veneer 3-Way Box Speaker',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'cafe_warm',
        condition: 'lightly_worn',
        primaryMaterial: 'wood',
        primaryColor: '#7a4d29',
        woodColor: '#7a4d29',
        params: { speakerStyle: 'floor_tower_box', width: 0.38, height: 0.78, depth: 0.32 }
      },
      {
        id: 'studio_monitor_box_pair',
        label: 'Near-Field Studio Monitor Box Pair',
        subcategory: 'Retro Electronics & Accessories',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#242930',
        params: { speakerStyle: 'studio_monitor_pair', width: 0.68, height: 0.36, depth: 0.28 }
      },
      {
        id: 'desktop_pc_speaker_set',
        label: '2.1 Computer Speakers & Subwoofer',
        subcategory: 'Computers & Technology',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2d3540',
        emissiveColor: '#4de2ff',
        params: { speakerStyle: 'desktop_pc_speaker_set', width: 0.56, height: 0.24, depth: 0.24 }
      }
    ],
    buildGeometry: cbapBuildAudioSpeakers
  });

  registerObjectFamily({
    id: 'pizza_plates_jukebox_decor',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment', '27_sims_everyday_misc', '29_residential_household', '09_commercial'],
    subcategory: 'Signage, Lighting & Decorations',
    subcategories: [
      'Signage, Lighting & Decorations',
      'Lobbies, Decor & Collectibles',
      'Game Room & Breakroom Fun',
      'Home Lighting, Decor & Clutter',
      'Food, Candy & Refreshments'
    ],
    label: 'Pizza Decor, License Plates & Wall Jukebox',
    description: 'Neon pizza slice signs, stacked pizzeria boxes, themed hangable embossed gamer/hero/villain/gang license plates, and modern touchscreen wall jukeboxes.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'small',
    functionalRole: 'decorative',
    tags: ['pizza', 'license plate', 'vanity plate', 'gamer', 'hero', 'villain', 'jukebox', 'wall decor'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Decor Type' },
      {
        key: 'decorMode',
        name: 'Decor Piece',
        type: 'select',
        options: [
          ['embossed_license_plate', 'Hangable Embossed License Plate'],
          ['neon_pizza_slice_sign', 'Neon Pizza Slice Wall Sign'],
          ['pizzeria_box_stack', 'Pizzeria Box Stack & Open Pizza'],
          ['modern_wall_jukebox', 'Modern Digital Touchscreen Wall Jukebox']
        ],
        default: 'embossed_license_plate'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.26, max: 1.25, step: 0.02, unit: 'm', default: 0.36 },
      { key: 'height', name: 'Height', type: 'number', min: 0.14, max: 1.15, step: 0.02, unit: 'm', default: 0.19 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.02, max: 0.55, step: 0.02, unit: 'm', default: 0.04 },
      { key: 'signText', name: 'Plate / Sign Text', type: 'text', default: '1Up Hero' },
      { key: 'plateBg', name: 'Plate Background', type: 'color', default: '#19355c' },
      { key: 'plateFg', name: 'Plate Lettering Color', type: 'color', default: '#f5c542' },
      { key: 'neonLit', name: 'Emissive Neon Glow', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'neon_pizza_slice_wall_sign',
        label: 'Neon Pizza Slice Pizzeria Wall Sign',
        subcategory: 'Signage, Lighting & Decorations',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'arcade_neon_80s',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#241a29',
        emissiveColor: '#ff48a6',
        params: { decorMode: 'neon_pizza_slice_sign', width: 0.62, height: 0.72, depth: 0.06, signText: 'Hot Pizza', neonLit: true }
      },
      {
        id: 'pizzeria_box_stack_warmer',
        label: 'Checkered Pizza Box Stack & Open Pie',
        subcategory: 'Food, Candy & Refreshments',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'cafe_warm',
        condition: 'clean',
        primaryMaterial: 'whiteTrim',
        primaryColor: '#f5f2eb',
        params: { decorMode: 'pizzeria_box_stack', width: 0.44, height: 0.24, depth: 0.44 }
      },
      {
        id: 'gamer_plate_1up_hero',
        label: 'License Plate: 1Up Hero (Gamer)',
        subcategory: 'Lobbies, Decor & Collectibles',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'arcade_neon_90s',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#132a4f',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: '1Up Hero', plateBg: '#112a4a', plateFg: '#54f0ff', neonLit: true }
      },
      {
        id: 'hero_plate_caped_defender',
        label: 'License Plate: Justice 1 (Super Hero)',
        subcategory: 'Lobbies, Decor & Collectibles',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'corporate_lobby',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#1b3e82',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: 'Justice 1', plateBg: '#193b82', plateFg: '#ffd242' }
      },
      {
        id: 'villain_plate_doom_reign',
        label: 'License Plate: Dr Doom (Super Villain)',
        subcategory: 'Lobbies, Decor & Collectibles',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'industrial',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#5c1414',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: 'Dr Doom', plateBg: '#2b0f14', plateFg: '#ff4242' }
      },
      {
        id: 'gang_plate_neon_syndicate',
        label: 'License Plate: Syndicate (Street Crew)',
        subcategory: 'Home Lighting, Decor & Clutter',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'arcade_neon_80s',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#331b4d',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: 'Syndicate', plateBg: '#2e1647', plateFg: '#f2be35' }
      },
      {
        id: 'modern_plate_gg_ez',
        label: 'License Plate: Gg Ez 99 (Modern)',
        subcategory: 'Lobbies, Decor & Collectibles',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e8eef5',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: 'Gg Ez 99', plateBg: '#edf2f7', plateFg: '#162436' }
      },
      {
        id: 'funny_plate_outtatm',
        label: 'License Plate: Outtatim (Funny Retro)',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'retro_80s',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e3e8ed',
        params: { decorMode: 'embossed_license_plate', width: 0.38, height: 0.2, signText: 'Outtatim', plateBg: '#d9e3f0', plateFg: '#1d4a8a' }
      },
      {
        id: 'modern_wall_touch_jukebox',
        label: 'Modern Digital Wall-Mount Jukebox',
        subcategory: 'Game Room & Breakroom Fun',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'arcade_neon_90s',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#181e29',
        emissiveColor: '#4de2ff',
        params: { decorMode: 'modern_wall_jukebox', width: 0.78, height: 1.06, depth: 0.28, signText: 'Digital Jukebox', neonLit: true }
      }
    ],
    buildGeometry: cbapBuildPizzaPlatesAndJukebox
  });
}
