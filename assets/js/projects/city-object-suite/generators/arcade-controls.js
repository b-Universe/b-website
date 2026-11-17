import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { getObjectArcadeMarqueeMaterial } from '../materials/materials.js';

export const ARCADE_SCREEN_CHOICES = [
  ['arcade_attract', 'Attract-Mode Display'],
  ['arcade_title', 'Title Screen'],
  ['arcade_insert_coin', 'Insert-Coin Screen'],
  ['arcade_highscore', 'High-Score Table'],
  ['arcade_platform', 'Retro Platformer Scene'],
  ['arcade_shooter', 'Space Shooter Scene'],
  ['arcade_racing', 'Racing Highway Scene'],
  ['arcade_fighting', 'Fighting Vs Scene'],
  ['arcade_maze', 'Neon Maze Scene'],
  ['arcade_puzzle', 'Falling Block Puzzle'],
  ['arcade_rhythm', 'Rhythm Arrow Chart'],
  ['arcade_gameover', 'Game-Over Screen'],
  ['futuristic_hud', 'Futuristic Cyber Hud'],
  ['crt_arcade_off', 'Powered Off Crt']
];

export const ARCADE_CONTROL_LAYOUTS = [
  ['single_2btn', 'Single Joystick / 2 Buttons'],
  ['single_6btn', 'Single Joystick / 6 Buttons'],
  ['two_player_6btn', 'Two-Player Fighting Panel'],
  ['four_player', 'Four-Player Co-Op Panel'],
  ['six_player', 'Six-Player Oversized Panel'],
  ['trackball', 'Trackball Arcade Panel'],
  ['spinner', 'Spinner / Paddle Panel'],
  ['steering_wheel', 'Steering Wheel & Shifter'],
  ['light_gun_dual', 'Dual Light-Gun Holsters'],
  ['rhythm_keys', 'Rhythm Keys & Turntable'],
  ['fighting_pro', 'Pro Japanese Arcade Deck']
];

export function arcAddJoystick(batcher, x, y, z, style = 'ball_top', options = {}) {
  const shaftRole = options.shaftRole || 'chrome';
  const topRole = options.topRole || 'accent';
  const baseRole = options.baseRole || 'frame';
  const s = options.scale || 1;

  batcher.addCylinder(x, y + 0.004 * s, z, 0.026 * s, 0.028 * s, 0.008 * s, 10, 'y', baseRole, 'detail');
  if (style === 'flight_stick') {
    batcher.addCylinder(x, y + 0.048 * s, z, 0.011 * s, 0.014 * s, 0.088 * s, 8, 'y', darkOrRole(baseRole), 'detail');
    batcher.addBox(x, y + 0.086 * s, z - 0.012 * s, 0.024 * s, 0.03 * s, 0.032 * s, { materialRole: topRole, layer: 'detail' });
    batcher.addBox(x, y + 0.095 * s, z + 0.014 * s, 0.014 * s, 0.018 * s, 0.014 * s, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  const h = style === 'mini' ? 0.036 * s : style === 'bat_top' ? 0.056 * s : 0.048 * s;
  batcher.addCylinder(x, y + h * 0.5, z, 0.0055 * s, 0.0055 * s, h, 8, 'y', shaftRole, 'detail');
  if (style === 'bat_top') {
    batcher.addCylinder(x, y + h + 0.014 * s, z, 0.013 * s, 0.009 * s, 0.032 * s, 10, 'y', topRole, 'detail');
  } else {
    const r = style === 'mini' ? 0.012 * s : 0.017 * s;
    batcher.addChamferBox(x, y + h + r * 0.65, z, r * 1.9, r * 1.9, r * 1.9, r * 0.55, { materialRole: topRole, layer: 'detail' });
  }
}

function darkOrRole(r) {
  return r || 'frame';
}

export function arcAddPushbuttons(batcher, x, y, z, count = 6, style = 'standard', options = {}) {
  const n = clamp(Math.round(count || 0), 0, 8);
  const roleA = options.primaryBtnRole || 'neonGlow';
  const roleB = options.secondaryBtnRole || 'accent';
  const bezelRole = options.bezelRole || 'frame';
  const s = options.scale || 1;
  const cols = n <= 3 ? n : Math.ceil(n / 2);
  const rows = n <= 3 ? 1 : 2;
  const pitchX = (style === 'impact' ? 0.058 : 0.032) * s;
  const pitchZ = (style === 'impact' ? 0.052 : 0.034) * s;
  const radius = (style === 'impact' ? 0.022 : style === 'mini' ? 0.009 : 0.0125) * s;

  let drawn = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols && drawn < n; col++) {
      drawn++;
      if (options.missingButtonIndex && drawn === options.missingButtonIndex) continue;
      const bx = x + (col - (cols - 1) * 0.5) * pitchX;
      const bz = z + (row - (rows - 1) * 0.5) * pitchZ + (col === 0 ? 0.003 * s : 0);
      const role = style === 'illuminated'
        ? (drawn % 2 === 1 ? 'signalGreen' : 'signalAmber')
        : (row === 0 ? roleA : roleB);
      batcher.addCylinder(bx, y + 0.004 * s, bz, radius * 1.18, radius * 1.18, 0.007 * s, 8, 'y', bezelRole, 'detail');
      batcher.addCylinder(bx, y + 0.009 * s, bz, radius * 0.9, radius * 0.85, 0.009 * s, 8, 'y', role, 'detail');
    }
  }
}

export function arcAddTrackball(batcher, x, y, z, radius = 0.042, options = {}) {
  batcher.addBox(x, y + 0.006, z, radius * 2.7, 0.014, radius * 2.7, { materialRole: options.bezelRole || 'frame', layer: 'detail' });
  batcher.addChamferBox(x, y + radius * 0.52, z, radius * 1.85, radius * 1.85, radius * 1.85, radius * 0.5, { materialRole: options.ballRole || 'secondary', layer: 'detail' });
}

export function arcAddSpinner(batcher, x, y, z, radius = 0.02, options = {}) {
  batcher.addCylinder(x, y + 0.005, z, radius * 1.35, radius * 1.35, 0.01, 10, 'y', 'frame', 'detail');
  batcher.addCylinder(x, y + 0.02, z, radius, radius * 0.96, 0.024, 12, 'y', options.dialRole || 'chrome', 'detail');
}

export function arcAddPaddleController(batcher, x, y, z, options = {}) {
  batcher.addBox(x, y + 0.01, z, 0.08, 0.02, 0.06, { materialRole: 'frame', layer: 'detail' });
  arcAddSpinner(batcher, x - 0.016, y + 0.02, z, 0.016, options);
  arcAddPushbuttons(batcher, x + 0.022, y + 0.02, z, 1, 'standard', { scale: 0.9 });
}

export function arcAddSteeringWheel(batcher, x, y, z, tiltDeg = 22, radius = 0.145, options = {}) {
  const rimRole = options.rimRole || 'rubber';
  const spokeRole = options.spokeRole || 'chrome';
  const rx = degToRad(tiltDeg);
  batcher.addCylinder(x, y, z - 0.05, 0.036, 0.044, 0.12, 10, 'z', 'frame', 'detail');
  batcher.addBox(x, y, z, radius * 1.7, 0.022, 0.022, { materialRole: spokeRole, rotX: rx, layer: 'detail' });
  batcher.addBox(x, y - radius * 0.45, z, 0.024, radius * 0.9, 0.022, { materialRole: spokeRole, rotX: rx, layer: 'detail' });
  batcher.addCylinder(x, y, z + 0.01, 0.034, 0.034, 0.026, 10, 'z', options.hornRole || 'accent', 'detail');

  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ox = Math.cos(a) * radius;
    const oy = Math.sin(a) * radius * Math.cos(rx);
    const oz = -Math.sin(a) * radius * Math.sin(rx);
    batcher.addBox(x + ox, y + oy, z + oz, 0.024, 0.024, 0.024, { materialRole: rimRole, rotZ: a, layer: 'detail' });
  }
}

export function arcAddMotorcycleHandlebars(batcher, x, y, z, width = 0.5, options = {}) {
  batcher.addCylinder(x, y - 0.03, z, 0.024, 0.028, 0.09, 8, 'y', 'frame', 'detail');
  batcher.addCylinder(x, y + 0.02, z, 0.015, 0.015, width, 10, 'x', 'chrome', 'detail');
  batcher.addCylinder(x - width * 0.42, y + 0.02, z, 0.02, 0.02, 0.11, 10, 'x', 'rubber', 'detail');
  batcher.addCylinder(x + width * 0.42, y + 0.02, z, 0.02, 0.02, 0.11, 10, 'x', 'rubber', 'detail');
  batcher.addBox(x, y + 0.025, z + 0.03, 0.12, 0.04, 0.05, { materialRole: options.podRole || 'accent', layer: 'detail' });
}

export function arcAddThrottleLever(batcher, x, y, z, options = {}) {
  batcher.addBox(x, y + 0.015, z, 0.055, 0.03, 0.11, { materialRole: 'frame', layer: 'detail' });
  batcher.addCylinder(x, y + 0.065, z, 0.008, 0.008, 0.09, 8, 'y', 'chrome', 'detail');
  batcher.addCylinder(x, y + 0.11, z, 0.018, 0.018, 0.05, 10, 'x', options.knobRole || 'accent', 'detail');
}

export function arcAddFootPedals(batcher, cx, y, cz, count = 2, options = {}) {
  const n = clamp(Math.round(count || 2), 1, 3);
  const spread = 0.11;
  for (let i = 0; i < n; i++) {
    const px = cx + (i - (n - 1) * 0.5) * spread;
    batcher.addBox(px, y + 0.035, cz, 0.068, 0.11, 0.024, {
      materialRole: i === 0 ? 'chrome' : 'frame',
      rotXDeg: -28,
      layer: 'detail'
    });
  }
}

export function arcAddLightGun(batcher, x, y, z, mounted = false, options = {}) {
  const role = options.gunRole || 'accent';
  if (mounted) {
    batcher.addCylinder(x, y + 0.045, z, 0.022, 0.028, 0.09, 10, 'y', 'frame', 'detail');
    batcher.addBox(x, y + 0.11, z - 0.04, 0.044, 0.056, 0.24, { materialRole: role, layer: 'detail' });
    batcher.addCylinder(x, y + 0.11, z - 0.18, 0.016, 0.02, 0.1, 10, 'z', 'chrome', 'detail');
    batcher.addBox(x, y + 0.07, z + 0.02, 0.032, 0.065, 0.04, { materialRole: 'frame', rotXDeg: 18, layer: 'detail' });
    return;
  }
  batcher.addBox(x, y + 0.03, z + 0.03, 0.05, 0.06, 0.07, { materialRole: 'frame', layer: 'detail' });
  batcher.addBox(x, y + 0.065, z, 0.036, 0.048, 0.21, { materialRole: role, rotXDeg: -14, layer: 'detail' });
  batcher.addBox(x, y + 0.032, z + 0.045, 0.028, 0.06, 0.034, { materialRole: 'rubber', rotXDeg: 18, layer: 'detail' });
}

export function arcAddCoinDoor(batcher, cx, cy, cz, w = 0.28, h = 0.36, options = {}) {
  const slotCount = clamp(Math.round(options.coinSlots ?? 2), 1, 4);
  const paymentStyle = options.paymentStyle || 'coin';
  const doorRole = options.doorRole || 'frame';
  batcher.addBox(cx, cy, cz, w, h, 0.02, { materialRole: doorRole, layer: 'body' });
  batcher.addBox(cx, cy, cz + 0.012, w * 0.88, h * 0.88, 0.012, { materialRole: 'secondary', layer: 'detail' });

  if (paymentStyle === 'coin' || paymentStyle === 'hybrid') {
    const pitch = (w * 0.68) / Math.max(1, slotCount);
    for (let i = 0; i < slotCount; i++) {
      const sx = cx + (i - (slotCount - 1) * 0.5) * pitch;
      batcher.addBox(sx, cy + h * 0.18, cz + 0.022, Math.min(0.048, pitch * 0.72), 0.075, 0.014, { materialRole: 'accent', layer: 'detail' });
      batcher.addBox(sx, cy + h * 0.18, cz + 0.03, 0.01, 0.036, 0.008, { materialRole: 'neonGlow', layer: 'detail' });
      batcher.addBox(sx, cy - h * 0.22, cz + 0.02, 0.04, 0.048, 0.012, { materialRole: 'chrome', layer: 'detail' });
    }
  }

  if (paymentStyle === 'card' || paymentStyle === 'hybrid') {
    const rx = paymentStyle === 'hybrid' ? cx + w * 0.58 : cx;
    const ry = paymentStyle === 'hybrid' ? cy + h * 0.42 : cy + h * 0.14;
    batcher.addBox(rx, ry, cz + 0.025, 0.085, 0.11, 0.024, { materialRole: 'primary', layer: 'detail' });
    batcher.addBox(rx, ry + 0.022, cz + 0.039, 0.062, 0.034, 0.006, { materialRole: 'signalGreen', layer: 'detail' });
    batcher.addBox(rx, ry - 0.022, cz + 0.039, 0.056, 0.022, 0.008, { materialRole: 'neonGlow', layer: 'detail' });
  }

  if (options.includeTicketDispenser) {
    batcher.addBox(cx - w * 0.68, cy - h * 0.1, cz + 0.022, 0.09, 0.13, 0.028, { materialRole: 'chrome', layer: 'detail' });
    batcher.addBox(cx - w * 0.68, cy - h * 0.12, cz + 0.042, 0.045, 0.05, 0.018, { materialRole: 'warningYellow', layer: 'detail' });
  }

  return {
    coinSlotPosition: [cx, cy + h * 0.18, cz + 0.03]
  };
}

export function arcAddControlPanel(batcher, cx, topY, cz, panelW, panelD, layoutPreset = 'two_player_6btn', options = {}) {
  const layout = String(layoutPreset || 'two_player_6btn');
  const deckH = options.deckHeight || 0.075;
  const damaged = Boolean(options.damaged);
  const startButtons = options.playerCount || (layout.includes('four') ? 4 : layout.includes('six') ? 6 : layout.includes('two') || layout.includes('fighting_pro') ? 2 : 1);

  batcher.addBox(cx, topY - deckH * 0.5, cz, panelW, deckH, panelD, { materialRole: options.deckRole || 'secondary', layer: 'body' });
  batcher.addBox(cx, topY - deckH * 0.25, cz + panelD * 0.5 + 0.008, panelW, deckH * 0.5, 0.018, { materialRole: options.trimRole || 'accent', layer: 'detail' });

  const py = topY + 0.002;
  const ctrlPositions = [];

  if (layout === 'steering_wheel') {
    arcAddSteeringWheel(batcher, cx - panelW * 0.12, py + 0.12, cz + 0.02, 24, 0.135);
    arcAddThrottleLever(batcher, cx + panelW * 0.28, py, cz + 0.02);
    arcAddPushbuttons(batcher, cx + panelW * 0.12, py, cz - panelD * 0.2, 2, 'illuminated');
  } else if (layout === 'light_gun_dual') {
    arcAddLightGun(batcher, cx - panelW * 0.25, py, cz + 0.04, false, { gunRole: 'accent' });
    arcAddLightGun(batcher, cx + panelW * 0.25, py, cz + 0.04, false, { gunRole: 'neonGlow' });
    arcAddPushbuttons(batcher, cx, py, cz - panelD * 0.24, 2, 'illuminated');
  } else if (layout === 'trackball') {
    arcAddTrackball(batcher, cx, py, cz + 0.02, 0.042);
    arcAddPushbuttons(batcher, cx - panelW * 0.26, py, cz + 0.02, 3, 'standard');
    arcAddPushbuttons(batcher, cx + panelW * 0.26, py, cz + 0.02, 3, 'standard');
  } else if (layout === 'spinner') {
    arcAddSpinner(batcher, cx - panelW * 0.18, py, cz + 0.02, 0.022);
    arcAddPaddleController(batcher, cx + panelW * 0.18, py, cz + 0.02);
    arcAddPushbuttons(batcher, cx, py, cz + 0.02, 2, 'standard');
  } else if (layout === 'rhythm_keys') {
    const keyCount = Math.max(5, Math.min(9, Math.floor((panelW * 0.65) / 0.055)));
    for (let k = 0; k < keyCount; k++) {
      const kx = cx + (k - (keyCount - 1) * 0.5) * 0.052;
      batcher.addBox(kx, py + 0.01, cz + 0.03, 0.038, 0.022, 0.09, {
        materialRole: k % 2 === 0 ? 'secondary' : 'neonGlow',
        layer: 'detail'
      });
    }
    arcAddSpinner(batcher, cx - panelW * 0.36, py, cz + 0.01, 0.055, { dialRole: 'frame' });
    arcAddSpinner(batcher, cx + panelW * 0.36, py, cz + 0.01, 0.055, { dialRole: 'frame' });
  } else if (layout === 'single_2btn' || layout === 'single_6btn') {
    const btnCount = layout === 'single_2btn' ? 2 : 6;
    arcAddJoystick(batcher, cx - panelW * 0.18, py, cz + 0.02, options.joystickStyle || 'ball_top');
    arcAddPushbuttons(batcher, cx + panelW * 0.14, py, cz + 0.02, btnCount, 'standard', {
      missingButtonIndex: damaged ? 2 : 0
    });
    ctrlPositions.push([cx - panelW * 0.18, py, cz + 0.02]);
  } else {
    const stations = layout === 'six_player' ? 6 : layout === 'four_player' ? 4 : 2;
    const btnPer = stations >= 4 ? 3 : 6;
    const joyStyle = layout === 'fighting_pro' ? 'ball_top' : options.joystickStyle || 'bat_top';
    const margin = 0.12;
    const usable = Math.max(0.32, panelW - margin * 2);
    const stationW = usable / stations;
    for (let p = 0; p < stations; p++) {
      const sx = cx - usable * 0.5 + stationW * (p + 0.5);
      const scale = stations >= 4 ? 0.82 : 1.0;
      const joyOffset = stations >= 4 ? -0.055 : -0.085;
      const btnOffset = stations >= 4 ? 0.048 : 0.075;
      arcAddJoystick(batcher, sx + joyOffset, py, cz + 0.02, joyStyle, {
        scale,
        topRole: p % 2 === 0 ? 'accent' : 'neonGlow'
      });
      arcAddPushbuttons(batcher, sx + btnOffset, py, cz + 0.02, btnPer, 'standard', {
        scale,
        primaryBtnRole: p % 2 === 0 ? 'neonGlow' : 'accent',
        secondaryBtnRole: p % 2 === 0 ? 'accent' : 'secondary',
        missingButtonIndex: damaged && p === 1 ? 2 : 0
      });
      ctrlPositions.push([sx, py, cz + 0.02]);
    }
  }

  // Player start buttons on upper strip
  for (let i = 0; i < Math.min(4, startButtons); i++) {
    const bx = cx - panelW * 0.34 + i * 0.055;
    batcher.addCylinder(bx, py + 0.006, cz - panelD * 0.3, 0.011, 0.011, 0.012, 8, 'y', 'secondary', 'detail');
  }

  return { controlPositions: ctrlPositions };
}

export function arcAddCRTMonitorAssembly(parent, batcher, cx, cy, cz, screenW, screenH, cfg, options = {}) {
  const tiltDeg = options.tiltDeg ?? -22;
  const tiltRad = degToRad(tiltDeg);
  const style = options.screenStyle || 'crt_curved';
  const mode = options.screenMode || 'arcade_platform';
  const bezelThick = clamp(Number(options.bezelThickness) || 0.04, 0.02, 0.09);
  const bezelRole = options.bezelRole || 'frame';

  const rotOffset = (lx, ly, lz) => {
    const cr = Math.cos(tiltRad);
    const sr = Math.sin(tiltRad);
    return [cx + lx, cy + ly * cr - lz * sr, cz + ly * sr + lz * cr];
  };

  // Outer bezel shroud aligned in monitor local plane
  const [tbX, tbY, tbZ] = rotOffset(0, screenH * 0.5 + bezelThick * 0.5, 0);
  batcher.addBox(tbX, tbY, tbZ, screenW + bezelThick * 2, bezelThick, 0.08, {
    materialRole: bezelRole,
    rotX: tiltRad,
    layer: 'body'
  });
  const [bbX, bbY, bbZ] = rotOffset(0, -screenH * 0.5 - bezelThick * 0.5, 0);
  batcher.addBox(bbX, bbY, bbZ, screenW + bezelThick * 2, bezelThick, 0.08, {
    materialRole: bezelRole,
    rotX: tiltRad,
    layer: 'body'
  });
  const [lbX, lbY, lbZ] = rotOffset(-screenW * 0.5 - bezelThick * 0.5, 0, 0);
  batcher.addBox(lbX, lbY, lbZ, bezelThick, screenH, 0.08, {
    materialRole: bezelRole,
    rotX: tiltRad,
    layer: 'body'
  });
  const [rbX, rbY, rbZ] = rotOffset(screenW * 0.5 + bezelThick * 0.5, 0, 0);
  batcher.addBox(rbX, rbY, rbZ, bezelThick, screenH, 0.08, {
    materialRole: bezelRole,
    rotX: tiltRad,
    layer: 'body'
  });

  if (style === 'crt_curved') {
    const [bkX, bkY, bkZ] = rotOffset(0, 0, -0.045);
    batcher.addBox(bkX, bkY, bkZ, screenW, screenH, 0.075, {
      materialRole: bezelRole,
      rotX: tiltRad,
      layer: 'body'
    });
  }

  const faceOffset = style === 'lcd_flat' ? 0.032 : 0.018;
  const [scrX, scrY, scrZ] = rotOffset(0, 0, faceOffset);
  const plane = objCreateScreenPlane(
    parent,
    mode,
    screenW,
    screenH,
    cfg.emissiveColor || '#4de2ff',
    cfg.condition || 'clean',
    cfg.seed || 101,
    {
      x: scrX,
      y: scrY,
      z: scrZ,
      rotX: tiltRad,
      name: options.name || `ArcadeScreen_${mode}`,
      role: options.screenRole || 'primary_game_screen',
      shape: style === 'crt_curved' ? 'curved_crt' : 'flat_lcd',
      isCurvedCRT: style === 'crt_curved'
    }
  );
  return plane;
}

export function arcAddMarqueeBox(parent, batcher, cx, cy, cz, w, h, d, angleDeg, titleText, cfg, options = {}) {
  const rx = degToRad(angleDeg ?? 14);
  const damaged = cfg.condition === 'damaged' || Boolean(options.damaged);
  const lit = cfg.lampLit !== undefined ? Boolean(cfg.lampLit) : !damaged;
  batcher.addBox(cx, cy, cz, w, h, d, { materialRole: 'frame', rotX: rx, layer: 'body' });

  const mat = getObjectArcadeMarqueeMaterial(titleText, cfg.primaryColor || '#261b47', cfg.emissiveColor || '#4de2ff', {
    lit,
    damaged,
    seed: cfg.seed || 101
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.2, w - 0.04), Math.max(0.08, h - 0.03)), mat);
  face.position.set(cx, cy, cz + d * 0.5 + 0.006);
  face.rotation.x = rx;
  face.name = options.name || 'ArcadeMarqueeFace';
  face.userData = { layer: 'detail', materialRole: 'marqueeFace' };
  if (parent) parent.add(face);
  return face;
}

export function arcAddPlushOrToyPrize(batcher, x, y, z, kind = 'bear', s = 1, options = {}) {
  const role = options.role || 'accent';
  const secRole = options.secRole || 'whiteTrim';
  const k = String(kind || 'bear');

  if (k === 'ball') {
    batcher.addChamferBox(x, y + 0.055 * s, z, 0.11 * s, 0.11 * s, 0.11 * s, 0.035 * s, { materialRole: role, layer: 'detail' });
  } else if (k === 'capsule') {
    batcher.addCylinder(x, y + 0.025 * s, z, 0.036 * s, 0.032 * s, 0.048 * s, 10, 'y', role, 'detail');
    batcher.addCylinder(x, y + 0.062 * s, z, 0.036 * s, 0.032 * s, 0.032 * s, 10, 'y', 'glass', 'detail');
  } else if (k === 'gift_box') {
    batcher.addBox(x, y + 0.055 * s, z, 0.11 * s, 0.11 * s, 0.11 * s, { materialRole: role, layer: 'detail' });
    batcher.addBox(x, y + 0.056 * s, z, 0.118 * s, 0.024 * s, 0.118 * s, { materialRole: 'warningYellow', layer: 'detail' });
  } else if (k === 'car') {
    batcher.addBox(x, y + 0.028 * s, z, 0.13 * s, 0.042 * s, 0.075 * s, { materialRole: role, layer: 'detail' });
    batcher.addBox(x, y + 0.06 * s, z, 0.075 * s, 0.032 * s, 0.064 * s, { materialRole: secRole, layer: 'detail' });
    batcher.addCylinder(x - 0.04 * s, y + 0.015 * s, z, 0.018 * s, 0.018 * s, 0.082 * s, 8, 'z', 'darkMetal', 'detail');
    batcher.addCylinder(x + 0.04 * s, y + 0.015 * s, z, 0.018 * s, 0.018 * s, 0.082 * s, 8, 'z', 'darkMetal', 'detail');
  } else if (k === 'rocket') {
    batcher.addCylinder(x, y + 0.075 * s, z, 0.026 * s, 0.032 * s, 0.12 * s, 8, 'y', role, 'detail');
    batcher.addCone(x, y + 0.155 * s, z, 0.026 * s, 0.05 * s, 8, 'safetyRed', 'detail');
    batcher.addBox(x, y + 0.024 * s, z, 0.082 * s, 0.04 * s, 0.012 * s, { materialRole: 'warningYellow', layer: 'detail' });
  } else if (k === 'robot') {
    batcher.addBox(x, y + 0.065 * s, z, 0.078 * s, 0.088 * s, 0.058 * s, { materialRole: role, layer: 'detail' });
    batcher.addBox(x, y + 0.128 * s, z, 0.056 * s, 0.048 * s, 0.048 * s, { materialRole: 'chrome', layer: 'detail' });
    batcher.addBox(x, y + 0.13 * s, z + 0.026 * s, 0.038 * s, 0.014 * s, 0.008 * s, { materialRole: 'neonGlow', layer: 'detail' });
    batcher.addBox(x - 0.054 * s, y + 0.07 * s, z, 0.022 * s, 0.07 * s, 0.022 * s, { materialRole: role, layer: 'detail' });
    batcher.addBox(x + 0.054 * s, y + 0.07 * s, z, 0.022 * s, 0.07 * s, 0.022 * s, { materialRole: role, layer: 'detail' });
  } else {
    // Plush bear, rabbit, cat, or critter
    batcher.addChamferBox(x, y + 0.055 * s, z, 0.095 * s, 0.095 * s, 0.078 * s, 0.02 * s, { materialRole: role, layer: 'detail' });
    batcher.addChamferBox(x, y + 0.128 * s, z, 0.078 * s, 0.072 * s, 0.07 * s, 0.02 * s, { materialRole: role, layer: 'detail' });
    batcher.addBox(x, y + 0.118 * s, z + 0.036 * s, 0.036 * s, 0.026 * s, 0.016 * s, { materialRole: secRole, layer: 'detail' });
    if (k === 'rabbit') {
      batcher.addBox(x - 0.02 * s, y + 0.185 * s, z, 0.018 * s, 0.056 * s, 0.014 * s, { materialRole: role, layer: 'detail' });
      batcher.addBox(x + 0.02 * s, y + 0.185 * s, z, 0.018 * s, 0.056 * s, 0.014 * s, { materialRole: role, layer: 'detail' });
    } else if (k === 'cat') {
      batcher.addCone(x - 0.024 * s, y + 0.175 * s, z, 0.015 * s, 0.028 * s, 4, role, 'detail');
      batcher.addCone(x + 0.024 * s, y + 0.175 * s, z, 0.015 * s, 0.028 * s, 4, role, 'detail');
    } else {
      batcher.addCylinder(x - 0.028 * s, y + 0.165 * s, z, 0.016 * s, 0.016 * s, 0.012 * s, 8, 'z', role, 'detail');
      batcher.addCylinder(x + 0.028 * s, y + 0.165 * s, z, 0.016 * s, 0.016 * s, 0.012 * s, 8, 'z', role, 'detail');
    }
  }
}

export function registerArcadeControlsModule() {
  registerObjectFamily({
    id: 'arcade_control_rig',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Retro Electronics & Accessories',
    label: 'Arcade Control Hardware & Fight Sticks',
    description: 'Standalone USB fight sticks, tabletop trackball decks, service coin-door modules, and mounted light-gun holsters.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'tiny',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'game_store', 'residential_game_room'],
    tags: ['arcade', 'joystick', 'fight_stick', 'trackball', 'coin_door', 'light_gun', 'controls'],
    schema: [
      { group: 'Hardware Rig Type', tab: 'structure' },
      {
        key: 'rigType',
        label: 'Hardware Type',
        type: 'select',
        tab: 'structure',
        default: 'fight_stick',
        options: [
          ['fight_stick', 'Pro Tournament Fight Stick'],
          ['control_deck', 'Two-Player Tabletop Deck'],
          ['coin_door', 'Service Coin Door & Card Unit'],
          ['gun_holster', 'Twin Mounted Light-Gun Bracket']
        ]
      },
      {
        key: 'joystickStyle',
        label: 'Joystick Grip',
        type: 'select',
        tab: 'details',
        default: 'ball_top',
        options: [
          ['ball_top', 'Classic Ball-Top'],
          ['bat_top', 'American Bat-Top'],
          ['mini', 'Compact Mini Stick'],
          ['flight_stick', 'Trigger Flight Stick']
        ]
      },
      { key: 'width', label: 'Deck Width', type: 'range', tab: 'structure', min: 0.28, max: 0.88, step: 0.02, unit: 'm', default: 0.42 },
      { key: 'paymentStyle', label: 'Payment Mechanism', type: 'select', tab: 'details', default: 'hybrid', options: [['coin', 'Quarter / Token Slots'], ['card', 'Tap-Card Reader'], ['hybrid', 'Hybrid Coin + Card']] }
    ],
    presets: [
      { id: 'arcade_fight_stick_rig', label: 'Pro Tournament Fight Stick', locationContext: 'interior', values: { rigType: 'fight_stick', joystickStyle: 'ball_top', width: 0.42, paletteFamily: 'arcade_1990s_mall' } },
      { id: 'control_deck_demo_panel', label: 'Two-Player Arcade Control Deck', locationContext: 'interior', values: { rigType: 'control_deck', joystickStyle: 'bat_top', width: 0.72, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'coin_door_service_module', label: 'Coin Door & Card Reader Rig', locationContext: 'interior', values: { rigType: 'coin_door', width: 0.42, paymentStyle: 'hybrid', paletteFamily: 'modern_family_entertainment' } },
      { id: 'mounted_light_gun_holster', label: 'Light-Gun Holster Mount', locationContext: 'interior', values: { rigType: 'gun_holster', width: 0.48, paletteFamily: 'superhero_cyber_arcade' } }
    ],
    interaction: {
      interactable: true,
      actionType: 'arcade_hardware_module'
    },
    buildGeometry(group, cfg, batcher) {
      const rigType = cfg.rigType || 'fight_stick';
      const w = clamp(Number(cfg.width) || 0.42, 0.28, 0.88);
      if (rigType === 'coin_door') {
        batcher.addBox(0, 0.24, 0, w, 0.48, 0.24, { materialRole: 'frame', layer: 'body' });
        arcAddCoinDoor(batcher, 0, 0.24, 0.125, w * 0.78, 0.36, { coinSlots: 2, paymentStyle: cfg.paymentStyle || 'hybrid', includeTicketDispenser: true });
      } else if (rigType === 'gun_holster') {
        batcher.addBox(0, 0.08, 0, w, 0.16, 0.24, { materialRole: 'frame', layer: 'body' });
        arcAddLightGun(batcher, -w * 0.24, 0.16, 0.02, true, { gunRole: 'safetyRed' });
        arcAddLightGun(batcher, w * 0.24, 0.16, 0.02, true, { gunRole: 'neonGlow' });
      } else if (rigType === 'control_deck') {
        arcAddControlPanel(batcher, 0, 0.11, 0, w, 0.28, 'two_player_6btn', {
          joystickStyle: cfg.joystickStyle || 'bat_top',
          damaged: cfg.condition === 'damaged'
        });
      } else {
        arcAddControlPanel(batcher, 0, 0.085, 0, w, 0.24, 'single_6btn', {
          joystickStyle: cfg.joystickStyle || 'ball_top',
          deckHeight: 0.085,
          damaged: cfg.condition === 'damaged'
        });
      }
      objCreateSignPlane(
        group,
        rigType.replace(/_/g, ' '),
        Math.min(w * 0.75, 0.36),
        0.055,
        cfg.primaryColor || '#192238',
        cfg.emissiveColor || '#4de2ff',
        {
          x: 0,
          y: 0.035,
          z: 0.135,
          name: 'ControlRigLabel'
        }
      );
    }
  });
}
