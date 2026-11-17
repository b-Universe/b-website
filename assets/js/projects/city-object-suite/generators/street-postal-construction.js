import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function spcAddArchMailbox(b, cx, cy, cz, w = 0.22, h = 0.24, len = 0.5, bodyRole = 'primary', doorRole = 'secondary', flagRaised = true) {
  // Lower rectangular body + arched barrel top along z axis
  b.addBox(cx, cy + h * 0.28, cz, w, h * 0.56, len, { materialRole: bodyRole, layer: 'body' });
  b.addCylinder(cx, cy + h * 0.56, cz, w * 0.5, w * 0.5, len, 10, 'z', bodyRole, 'body');
  // Front pull-down door + tab handle
  b.addBox(cx, cy + h * 0.34, cz + len * 0.506, w * 0.9, h * 0.58, 0.02, { materialRole: doorRole, layer: 'detail' });
  b.addBox(cx, cy + h * 0.62, cz + len * 0.525, 0.06, 0.025, 0.025, { materialRole: 'chrome', layer: 'detail' });
  // Side signal flag
  const flagX = cx + w * 0.515;
  if (flagRaised) {
    b.addBox(flagX, cy + h * 0.72, cz + len * 0.2, 0.014, 0.16, 0.024, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(flagX, cy + h * 0.79, cz + len * 0.23, 0.016, 0.048, 0.068, { materialRole: 'safetyRed', layer: 'detail' });
  } else {
    b.addBox(flagX, cy + h * 0.36, cz - len * 0.04, 0.014, 0.024, 0.16, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(flagX, cy + h * 0.37, cz - len * 0.14, 0.016, 0.055, 0.065, { materialRole: 'safetyRed', layer: 'detail' });
  }
}

function spcAddWheel(b, cx, cy, cz, r = 0.28, thick = 0.18, axis = 'x') {
  b.addCylinder(cx, cy, cz, r, r, thick, 12, axis, 'rubber', 'body');
  b.addCylinder(cx, cy, cz, r * 0.52, r * 0.52, thick + 0.02, 10, axis, 'chrome', 'detail');
  b.addCylinder(cx, cy, cz, r * 0.2, r * 0.2, thick + 0.036, 8, axis, 'frame', 'detail');
}

function spcAddTrackBelt(b, cx, cy, cz, len = 1.65, beltW = 0.26, beltH = 0.36) {
  const r = beltH * 0.5;
  const span = Math.max(0.4, len - beltH);
  b.addBox(cx, cy, cz, beltW, beltH, span, { materialRole: 'rubber', layer: 'body' });
  b.addBox(cx, cy, cz, beltW * 0.72, beltH * 0.58, span * 1.04, { materialRole: 'frame', layer: 'detail' });
  b.addCylinder(cx, cy, cz + span * 0.5, r, r, beltW, 10, 'x', 'rubber', 'body');
  b.addCylinder(cx, cy, cz - span * 0.5, r, r, beltW, 10, 'x', 'rubber', 'body');
  b.addCylinder(cx, cy, cz + span * 0.5, r * 0.58, r * 0.58, beltW + 0.02, 8, 'x', 'frame', 'detail');
  b.addCylinder(cx, cy, cz - span * 0.5, r * 0.58, r * 0.58, beltW + 0.02, 8, 'x', 'frame', 'detail');
  for (const rz of [-span * 0.22, 0, span * 0.22]) {
    b.addCylinder(cx, cy - r * 0.38, cz + rz, r * 0.34, r * 0.34, beltW + 0.015, 8, 'x', 'darkMetal', 'detail');
  }
}

function spcBuildStreetMailboxes(group, cfg, b) {
  const mode = cfg.mailboxStyle || 'rfd_twin_rural_post';
  const w = clamp(cfg.width || 0.75, 0.34, 1.85);
  const h = clamp(cfg.height || 1.28, 0.42, 1.65);
  const d = clamp(cfg.depth || 0.55, 0.16, 0.85);
  const flagUp = cfg.flagRaised !== false;
  const labelText = String(cfg.signText || '408').trim() || '408';

  if (mode === 'rfd_twin_rural_post') {
    const postH = h * 0.84;
    b.addBox(0, postH * 0.5, 0, 0.11, postH, 0.11, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, postH - 0.05, 0, w, 0.08, 0.11, { materialRole: 'wood', layer: 'body' });
    b.addPipeSegment(0, postH - 0.34, 0, -w * 0.36, postH - 0.05, 0, 0.032, 6, 'wood', 'body');
    b.addPipeSegment(0, postH - 0.34, 0, w * 0.36, postH - 0.05, 0, 0.032, 6, 'wood', 'body');
    spcAddArchMailbox(b, -w * 0.3, postH, 0.02, 0.22, 0.24, 0.48, 'primary', 'secondary', flagUp);
    spcAddArchMailbox(b, w * 0.3, postH, 0.02, 0.22, 0.24, 0.48, 'accent', 'secondary', !flagUp);
    // Newspaper tube underneath
    b.addBox(-w * 0.3, postH - 0.14, 0.02, 0.16, 0.12, 0.42, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  if (mode === 'stone_brick_pillar_mailbox') {
    const baseW = clamp(w, 0.52, 0.82);
    b.addBox(0, 0.09, 0, baseW + 0.08, 0.18, baseW + 0.08, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0, h * 0.48 + 0.06, 0, baseW, h * 0.78, baseW, { materialRole: 'brick', layer: 'body' });
    // Tiered limestone cap + ball finial
    b.addTrapezoidBox(0, h - 0.06, 0, baseW + 0.12, baseW + 0.12, baseW * 0.7, baseW * 0.7, 0.14, { materialRole: 'stone', layer: 'body' });
    // Brass mail door & newspaper slot
    b.addBox(0, h * 0.62, baseW * 0.505, 0.26, 0.22, 0.025, { materialRole: 'brass', layer: 'detail' });
    b.addBox(0, h * 0.65, baseW * 0.522, 0.18, 0.035, 0.015, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, labelText, 0.24, 0.11, '#262b31', '#f3e1a6', {
      x: 0,
      y: h * 0.38,
      z: baseW * 0.506
    });
    return;
  }

  if (mode === 'victorian_cast_post_box') {
    const colR = clamp(w * 0.36, 0.2, 0.32);
    b.addCylinder(0, 0.1, 0, colR * 1.18, colR * 1.24, 0.2, 12, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.48, 0, colR, colR * 1.05, h * 0.68, 12, 'y', 'primary', 'body');
    b.addPrismRing(0, h * 0.78, 0, colR * 1.14, colR * 0.96, 0.06, 12, 'y', 'accent', 'detail');
    b.addCylinder(0, h * 0.88, 0, colR * 0.72, colR * 1.12, 0.14, 12, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.97, 0, 0.03, 0.08, 0.08, 8, 'y', 'accent', 'detail');
    // Mail posting aperture hood & schedule plate
    b.addBox(0, h * 0.68, colR * 0.98, 0.26, 0.09, 0.06, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, labelText, 0.22, 0.18, '#f4efe2', '#1d2228', {
      x: 0,
      y: h * 0.46,
      z: colR * 1.02
    });
    return;
  }

  if (mode === 'mounted_porch_drop_mailbox') {
    // Wall-mounted backplate at z = 0 facing +z
    const boxD = clamp(d, 0.14, 0.28);
    b.addBox(0, h * 0.56, boxD * 0.5, w, h * 0.72, boxD, { materialRole: 'primary', layer: 'body' });
    b.addTrapezoidBox(0, h * 0.94, boxD * 0.58, w + 0.04, boxD + 0.05, w + 0.02, boxD * 0.4, 0.09, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, h * 0.82, boxD + 0.012, w * 0.76, 0.04, 0.015, { materialRole: 'brass', layer: 'detail' });
    objCreateSignPlane(group, labelText, w * 0.52, 0.11, '#232830', '#e9d38e', {
      x: 0,
      y: h * 0.54,
      z: boxD + 0.014
    });
    // Twin brass hooks holding rolled newspaper below
    for (const sx of [-w * 0.28, w * 0.28]) {
      b.addBox(sx, h * 0.15, boxD * 0.42, 0.025, 0.08, boxD * 0.5, { materialRole: 'brass', layer: 'detail' });
    }
    b.addCylinder(0, h * 0.14, boxD * 0.52, 0.038, 0.038, w * 0.82, 8, 'x', 'whiteTrim', 'detail');
    return;
  }

  if (mode === 'quad_suburban_wooden_rack') {
    const rackH = h * 0.8;
    for (const sx of [-w * 0.44, w * 0.44]) {
      b.addBox(sx, rackH * 0.5, 0, 0.09, rackH, 0.09, { materialRole: 'wood', layer: 'body' });
    }
    b.addBox(0, rackH - 0.04, 0, w * 1.05, 0.07, 0.16, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, rackH * 0.34, 0, w * 0.92, 0.05, 0.22, { materialRole: 'wood', layer: 'detail' });
    const count = 4;
    for (let i = 0; i < count; i++) {
      const bx = -w * 0.38 + (i / (count - 1)) * (w * 0.76);
      spcAddArchMailbox(b, bx, rackH, 0.03, 0.2, 0.22, 0.46, i % 2 === 0 ? 'primary' : 'frame', 'secondary', i === 1 && flagUp);
    }
    return;
  }

  // Curbside drive-up snorkel courier drop-off
  b.addBox(0, 0.03, 0, w * 0.92, 0.06, d * 0.92, { materialRole: 'concrete', layer: 'body' });
  b.addBox(0, h * 0.48, -0.02, w * 0.78, h * 0.84, d * 0.76, { materialRole: 'primary', layer: 'body' });
  // Extended driver-reach snorkel hood + pull lever
  b.addTrapezoidBox(0, h * 0.86, d * 0.24, w * 0.74, d * 0.9, w * 0.74, d * 0.45, 0.26, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, h * 0.88, d * 0.62, w * 0.64, 0.14, 0.04, { materialRole: 'accent', layer: 'detail', rotXDeg: -24 });
  b.addBox(0, h * 0.56, d * 0.37, w * 0.78, 0.07, 0.02, { materialRole: 'warningYellow', layer: 'detail' });
  objCreateSignPlane(group, labelText, w * 0.58, 0.18, '#1b3d69', '#ffffff', {
    x: 0,
    y: h * 0.69,
    z: d * 0.375
  });
}

function spcBuildStreetRegulatorySigns(group, cfg, b) {
  const mode = cfg.signArchetype || 'speed_limit_sign';
  const poleH = clamp(cfg.poleHeight || 2.85, 1.8, 5.2);
  const w = clamp(cfg.width || 0.78, 0.55, 2.8);
  const signText = String(cfg.signText || '35').trim() || '35';
  const subText = String(cfg.subText || 'Speed Limit').trim() || 'Speed Limit';
  const lit = cfg.lampLit !== false;

  if (mode === 'speed_limit_sign') {
    b.addCylinder(0, poleH * 0.5, 0, 0.042, 0.046, poleH, 8, 'y', 'chrome', 'body');
    b.addCylinder(0, 0.06, 0, 0.11, 0.13, 0.12, 8, 'y', 'concrete', 'body');
    const plateH = clamp(w * 1.32, 0.78, 1.35);
    const py = poleH - plateH * 0.48;
    b.addBox(0, py, 0.048, w, plateH, 0.026, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, py, 0.044, w + 0.03, plateH + 0.03, 0.016, { materialRole: 'frame', layer: 'detail' });
    objCreateSignPlane(group, subText, w * 0.88, plateH * 0.28, '#f2f4f7', '#171b20', {
      x: 0,
      y: py + plateH * 0.28,
      z: 0.065
    });
    objCreateSignPlane(group, signText, w * 0.88, plateH * 0.56, '#f2f4f7', '#171b20', {
      x: 0,
      y: py - plateH * 0.16,
      z: 0.065
    });
    return;
  }

  if (mode === 'interstate_mileage_gantry') {
    const span = clamp(w, 1.45, 2.8);
    const boardH = clamp(span * 0.54, 0.9, 1.38);
    for (const sx of [-span * 0.36, span * 0.36]) {
      b.addCylinder(sx, poleH * 0.5, 0, 0.058, 0.065, poleH, 8, 'y', 'chrome', 'body');
      b.addCylinder(sx, 0.12, 0, 0.15, 0.17, 0.24, 10, 'y', 'concrete', 'body');
    }
    const by = poleH - boardH * 0.48;
    b.addBox(0, by, 0.06, span, boardH, 0.045, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, by, 0.056, span + 0.05, boardH + 0.05, 0.03, { materialRole: 'whiteTrim', layer: 'detail' });
    objCreateSignPlane(group, signText, span * 0.92, boardH * 0.46, '#1a5c3a', '#ffffff', {
      x: 0,
      y: by + boardH * 0.2,
      z: 0.088
    });
    objCreateSignPlane(group, subText, span * 0.92, boardH * 0.36, '#1a5c3a', '#f2f4f7', {
      x: 0,
      y: by - boardH * 0.24,
      z: 0.088
    });
    return;
  }

  if (mode === 'low_clearance_bridge_sign') {
    b.addBox(0, poleH * 0.5, 0, 0.11, poleH, 0.11, { materialRole: 'wood', layer: 'body' });
    const py = poleH - 0.52;
    // Diamond yellow warning sign above + weight limit plate below
    b.addBox(0, py + 0.3, 0.065, 0.68, 0.68, 0.025, { materialRole: 'warningYellow', layer: 'body', rotZDeg: 45 });
    objCreateSignPlane(group, signText, 0.62, 0.28, '#e8b228', '#15181c', {
      x: 0,
      y: py + 0.3,
      z: 0.082
    });
    b.addBox(0, py - 0.42, 0.065, 0.72, 0.46, 0.025, { materialRole: 'whiteTrim', layer: 'body' });
    objCreateSignPlane(group, subText, 0.66, 0.38, '#f2f4f7', '#15181c', {
      x: 0,
      y: py - 0.42,
      z: 0.082
    });
    // Amber flasher beacon on top
    b.addCylinder(0, poleH + 0.09, 0.04, 0.075, 0.09, 0.14, 10, 'y', lit ? 'lampGlow' : 'warningYellow', 'detail');
    return;
  }

  if (mode === 'one_way_do_not_enter') {
    b.addCylinder(0, poleH * 0.5, 0, 0.042, 0.046, poleH, 8, 'y', 'chrome', 'body');
    const oy = poleH - 0.24;
    b.addBox(0, oy, 0.05, 0.92, 0.32, 0.025, { materialRole: 'darkMetal', layer: 'body' });
    objCreateSignPlane(group, signText, 0.84, 0.25, '#191d22', '#ffffff', {
      x: 0,
      y: oy,
      z: 0.068
    });
    // Lower no-parking sign
    const ny = oy - 0.56;
    b.addBox(0, ny, 0.05, 0.54, 0.72, 0.025, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, ny + 0.24, 0.064, 0.48, 0.16, 0.01, { materialRole: 'safetyRed', layer: 'detail' });
    objCreateSignPlane(group, subText, 0.48, 0.38, '#f2f4f7', '#b82520', {
      x: 0,
      y: ny - 0.1,
      z: 0.068
    });
    return;
  }

  if (mode === 'school_zone_flasher_sign') {
    b.addCylinder(0, poleH * 0.5, 0, 0.045, 0.05, poleH, 8, 'y', 'chrome', 'body');
    const py = poleH - 0.55;
    b.addBox(0, py, 0.055, 0.76, 0.76, 0.025, { materialRole: 'warningYellow', layer: 'body', rotZDeg: 45 });
    objCreateSignPlane(group, signText, 0.7, 0.28, '#dbe026', '#16191d', {
      x: 0,
      y: py,
      z: 0.072
    });
    // Dual flashing beacons above & below + solar panel top
    for (const by of [poleH + 0.12, py - 0.58]) {
      b.addBox(0, by, 0.07, 0.26, 0.24, 0.14, { materialRole: 'frame', layer: 'detail' });
      b.addCylinder(0, by, 0.145, 0.085, 0.085, 0.04, 10, 'z', lit ? 'warningYellow' : 'darkMetal', 'detail');
    }
    b.addBox(0, poleH + 0.32, -0.04, 0.48, 0.04, 0.36, { materialRole: 'primary', layer: 'detail', rotXDeg: 28 });
    return;
  }

  if (mode === 'railroad_crossbuck_gate') {
    b.addCylinder(0, 0.14, 0, 0.2, 0.24, 0.28, 10, 'y', 'concrete', 'body');
    b.addCylinder(0, poleH * 0.5, 0, 0.065, 0.075, poleH, 10, 'y', 'chrome', 'body');
    // X crossbuck blades
    const cy = poleH - 0.38;
    b.addBox(0, cy, 0.07, 1.15, 0.22, 0.028, { materialRole: 'whiteTrim', layer: 'body', rotZDeg: 35 });
    b.addBox(0, cy, 0.095, 1.15, 0.22, 0.028, { materialRole: 'whiteTrim', layer: 'body', rotZDeg: -35 });
    objCreateSignPlane(group, signText, 0.78, 0.16, '#f2f4f7', '#15181c', {
      x: 0,
      y: cy,
      z: 0.115
    });
    // Twin horizontal flasher lights + top bell housing
    b.addBox(0, cy - 0.46, 0.075, 0.86, 0.055, 0.055, { materialRole: 'frame', layer: 'detail' });
    for (const lx of [-0.34, 0.34]) {
      b.addCylinder(lx, cy - 0.46, 0.11, 0.12, 0.12, 0.1, 10, 'z', 'frame', 'detail');
      b.addCylinder(lx, cy - 0.46, 0.16, 0.09, 0.09, 0.02, 10, 'z', lit ? 'signalRed' : 'darkMetal', 'detail');
    }
    b.addCylinder(0, poleH + 0.08, 0, 0.11, 0.13, 0.14, 10, 'y', 'chrome', 'detail');
    return;
  }

  // Trailer-mounted radar speed feedback sign
  b.addBox(0, 0.42, 0, 1.28, 0.12, 1.65, { materialRole: 'frame', layer: 'body' });
  b.addBox(0, 0.42, 1.05, 0.14, 0.1, 0.65, { materialRole: 'frame', layer: 'body' });
  spcAddWheel(b, -0.72, 0.32, 0, 0.32, 0.18, 'x');
  spcAddWheel(b, 0.72, 0.32, 0, 0.32, 0.18, 'x');
  b.addBox(0, 0.7, -0.22, 0.92, 0.48, 0.56, { materialRole: 'accent', layer: 'body' });
  b.addCylinder(0, 1.38, -0.22, 0.05, 0.055, 1.5, 8, 'y', 'frame', 'body');
  b.addBox(0, 1.72, -0.14, 0.86, 1.04, 0.14, { materialRole: 'whiteTrim', layer: 'body' });
  objCreateSignPlane(group, subText, 0.78, 0.26, '#f2f4f7', '#15181c', {
    x: 0,
    y: 2.05,
    z: -0.06
  });
  objCreateScreenPlane(group, 'info_display', 0.72, 0.48, cfg.emissiveColor || '#ffae2b', cfg.condition, cfg.seed, {
    x: 0,
    y: 1.54,
    z: -0.055
  });
  b.addBox(0, 2.38, -0.18, 0.96, 0.04, 0.64, { materialRole: 'primary', layer: 'detail', rotXDeg: 20 });
}

function spcBuildHeavyConstructionVehicles(group, cfg, b) {
  const mode = cfg.vehicleStyle || 'tracked_mini_excavator';
  const w = clamp(cfg.width || 1.55, 0.95, 2.9);
  const d = clamp(cfg.depth || 2.55, 1.25, 4.2);
  const h = clamp(cfg.height || 2.35, 1.25, 3.6);
  const lit = cfg.lampLit !== false;

  if (mode === 'tracked_mini_excavator') {
    spcAddTrackBelt(b, -w * 0.38, 0.2, 0.12, d * 0.76, 0.28, 0.38);
    spcAddTrackBelt(b, w * 0.38, 0.2, 0.12, d * 0.76, 0.28, 0.38);
    b.addBox(0, 0.26, 0.12, w * 0.62, 0.22, d * 0.45, { materialRole: 'frame', layer: 'body' });
    // Front dozer backfill blade
    b.addBox(0, 0.24, d * 0.56, w * 0.96, 0.32, 0.08, { materialRole: 'accent', layer: 'detail' });
    // Slewing upper cab + engine counterweight + translucent cab windows
    b.addBox(0, 0.68, -0.06, w * 0.76, 0.44, d * 0.58, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.74, -d * 0.36, w * 0.78, 0.48, 0.36, 0.04, { materialRole: 'accent', layer: 'body' });
    const cabX = -w * 0.12;
    b.addBox(cabX, 1.42, -0.06, w * 0.48, 1.05, 0.98, { materialRole: 'glass', layer: 'detail' });
    b.addBox(cabX, 1.96, -0.06, w * 0.52, 0.07, 1.04, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(cabX, 2.06, -0.18, 0.06, 0.07, 0.12, 8, 'y', lit ? 'lampGlow' : 'warningYellow', 'detail');
    // Articulated excavator boom + stick + hydraulic rams + bucket
    const bx = w * 0.26;
    b.addPipeSegment(bx, 0.76, 0.36, bx, 1.88, 1.15, 0.11, 8, 'primary', 'body');
    b.addPipeSegment(bx, 1.88, 1.15, bx, 0.85, 1.75, 0.09, 8, 'primary', 'body');
    b.addPipeSegment(bx, 1.15, 0.38, bx, 1.68, 0.92, 0.04, 8, 'chrome', 'detail');
    b.addTrapezoidBox(bx, 0.62, 1.84, 0.42, 0.48, 0.32, 0.3, 0.38, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 25 });
    return;
  }

  if (mode === 'skid_steer_loader') {
    for (const sx of [-w * 0.42, w * 0.42]) {
      spcAddWheel(b, sx, 0.3, 0.56, 0.3, 0.22, 'x');
      spcAddWheel(b, sx, 0.3, -0.56, 0.3, 0.22, 'x');
    }
    b.addBox(0, 0.54, -0.1, w * 0.72, 0.5, 1.56, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 1.28, -0.08, w * 0.64, 0.96, 1.02, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, 1.78, -0.08, w * 0.68, 0.08, 1.08, { materialRole: 'frame', layer: 'body' });
    for (const sx of [-w * 0.38, w * 0.38]) {
      b.addPipeSegment(sx, 0.86, -0.68, sx, 1.18, 0.18, 0.065, 8, 'accent', 'body');
      b.addPipeSegment(sx, 1.18, 0.18, sx, 0.34, 1.02, 0.065, 8, 'accent', 'body');
    }
    // Wide toothed loader scoop bucket
    b.addBox(0, 0.26, 1.24, w * 1.06, 0.42, 0.58, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.09, 1.52, w * 1.06, 0.06, 0.2, { materialRole: 'frame', layer: 'detail' });
    for (const lx of [-w * 0.24, w * 0.24]) {
      b.addCylinder(lx, 1.72, 0.46, 0.055, 0.055, 0.05, 8, 'z', lit ? 'lampGlow' : 'whiteTrim', 'detail');
    }
    return;
  }

  if (mode === 'drum_asphalt_roller') {
    // Massive wide steel front compactor drum
    b.addCylinder(0, 0.46, d * 0.34, 0.46, 0.46, w * 0.94, 14, 'x', 'chrome', 'body');
    b.addBox(0, 0.68, d * 0.34, w * 1.02, 0.09, 0.86, { materialRole: 'frame', layer: 'body' });
    // Rear treaded drive wheels & engine bay
    for (const sx of [-w * 0.38, w * 0.38]) {
      spcAddWheel(b, sx, 0.42, -d * 0.36, 0.42, 0.26, 'x');
    }
    b.addBox(0, 0.88, -d * 0.16, w * 0.66, 0.52, d * 0.72, { materialRole: 'primary', layer: 'body' });
    b.addLouverGrille(-w * 0.34, 0.92, -d * 0.3, 0.42, 0.26, 4, 'x', 'darkMetal', 'detail');
    // Operator station + Rops canopy + amber strobe
    b.addBox(0, 1.32, 0.02, 0.4, 0.22, 0.38, { materialRole: 'rubber', layer: 'detail' });
    for (const sx of [-w * 0.28, w * 0.28]) {
      b.addBox(sx, 1.88, -0.1, 0.06, 1.5, 0.06, { materialRole: 'frame', layer: 'body' });
    }
    b.addBox(0, 2.64, -0.05, w * 0.68, 0.08, 0.98, { materialRole: 'accent', layer: 'body' });
    b.addCylinder(0, 2.74, 0.2, 0.06, 0.07, 0.12, 8, 'y', lit ? 'lampGlow' : 'warningYellow', 'detail');
    return;
  }

  if (mode === 'towable_cement_mixer') {
    for (const sx of [-w * 0.42, w * 0.42]) {
      spcAddWheel(b, sx, 0.28, 0, 0.28, 0.16, 'x');
    }
    b.addBox(0, 0.42, -0.15, w * 0.72, 0.1, 1.55, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.24, -0.88, 0.09, 0.44, 0.09, { materialRole: 'frame', layer: 'body' });
    // Belt-drive motor housing
    b.addBox(-w * 0.14, 0.74, -0.45, 0.46, 0.48, 0.52, { materialRole: 'accent', layer: 'body' });
    b.addLouverGrille(-w * 0.38, 0.76, -0.45, 0.32, 0.24, 4, 'x', 'darkMetal', 'detail');
    // Tilted rotating steel mixing drum
    b.addCylinder(0.08, 1.04, 0.15, 0.36, 0.44, 0.56, 12, 'y', 'primary', 'body');
    b.addCylinder(0.08, 1.44, 0.26, 0.24, 0.36, 0.34, 12, 'y', 'primary', 'body');
    b.addCylinder(0.08, 1.62, 0.29, 0.24, 0.24, 0.04, 12, 'y', 'darkMetal', 'detail');
    // Tilt handwheel
    b.addPrismRing(w * 0.44, 0.92, 0.1, 0.24, 0.2, 0.035, 10, 'x', 'chrome', 'detail');
    return;
  }

  if (mode === 'telescopic_boom_scissor_lift') {
    for (const sx of [-w * 0.42, w * 0.42]) {
      spcAddWheel(b, sx, 0.2, d * 0.34, 0.2, 0.14, 'x');
      spcAddWheel(b, sx, 0.2, -d * 0.34, 0.2, 0.14, 'x');
    }
    b.addBox(0, 0.36, 0, w * 0.86, 0.32, d * 0.88, { materialRole: 'primary', layer: 'body' });
    // 3-tier scissor X-pantograph linkage
    const tiers = 3;
    const baseLiftY = 0.52;
    const topDeckY = clamp(h - 0.98, 1.55, 2.55);
    const tierH = (topDeckY - baseLiftY) / tiers;
    for (let t = 0; t < tiers; t++) {
      const y0 = baseLiftY + t * tierH;
      const y1 = y0 + tierH;
      for (const sx of [-w * 0.34, w * 0.34]) {
        b.addPipeSegment(sx, y0, -d * 0.32, sx, y1, d * 0.32, 0.032, 6, 'accent', 'body');
        b.addPipeSegment(sx, y0, d * 0.32, sx, y1, -d * 0.32, 0.032, 6, 'accent', 'body');
      }
    }
    // Work platform deck + full perimeter safety rails + joystick control box
    b.addBox(0, topDeckY, 0, w * 0.94, 0.1, d * 0.92, { materialRole: 'darkMetal', layer: 'body' });
    for (const sx of [-w * 0.44, w * 0.44]) {
      b.addBox(sx, topDeckY + 0.5, 0, 0.04, 0.98, d * 0.88, { materialRole: 'warningYellow', layer: 'detail' });
    }
    for (const sz of [-d * 0.43, d * 0.43]) {
      b.addBox(0, topDeckY + 0.5, sz, w * 0.88, 0.98, 0.04, { materialRole: 'warningYellow', layer: 'detail' });
    }
    b.addBox(w * 0.36, topDeckY + 0.88, d * 0.38, 0.18, 0.18, 0.18, { materialRole: 'frame', layer: 'detail' });
    return;
  }

  // Highway flashing arrow-board workzone trailer
  for (const sx of [-w * 0.44, w * 0.44]) {
    spcAddWheel(b, sx, 0.3, 0, 0.3, 0.18, 'x');
  }
  b.addBox(0, 0.44, 0.15, w * 0.72, 0.12, 1.85, { materialRole: 'frame', layer: 'body' });
  b.addBox(0, 0.72, -0.18, w * 0.54, 0.46, 0.76, { materialRole: 'accent', layer: 'body' });
  b.addCylinder(0, 1.48, -0.18, 0.06, 0.065, 1.65, 8, 'y', 'frame', 'body');
  const boardY = 2.28;
  b.addBox(0, boardY, -0.12, w * 1.15, 0.96, 0.12, { materialRole: 'darkMetal', layer: 'body' });
  // Glowing amber directional arrow chevron lights on board front
  const lampRole = lit ? 'warningYellow' : 'frame';
  b.addBox(0, boardY, -0.05, w * 0.72, 0.09, 0.025, { materialRole: lampRole, layer: 'detail' });
  b.addBox(w * 0.24, boardY + 0.14, -0.05, w * 0.34, 0.08, 0.025, { materialRole: lampRole, layer: 'detail', rotZDeg: -38 });
  b.addBox(w * 0.24, boardY - 0.14, -0.05, w * 0.34, 0.08, 0.025, { materialRole: lampRole, layer: 'detail', rotZDeg: 38 });
}

export function registerStreetPostalConstructionFamilies() {
  registerObjectFamily({
    id: 'street_neighborhood_mailboxes',
    categoryId: '01_postal',
    categories: ['01_postal', '10_residential'],
    subcategory: 'Residential Mailboxes',
    subcategories: ['Residential Mailboxes', 'Street Collection', 'Parcel Lockers'],
    label: 'Neighborhood & Street Mailboxes',
    description: 'Twin rural post mailboxes, masonry brick pillar mailbox vaults, Victorian cast-iron post boxes, wall porch drop boxes, quad roadside racks, and drive-up chutes.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    locationContext: 'exterior',
    environmentTags: ['street', 'residential_interior', 'courtyard', 'outdoor_plaza'],
    tags: ['mailbox', 'postal', 'neighborhood', 'letterbox', 'brick', 'victorian', 'courier', 'street'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'brick', 'stone', 'brass', 'safetyRed'],
    schema: [
      { group: 'Mailbox Design', tab: 'structure' },
      {
        key: 'mailboxStyle',
        label: 'Mailbox Archetype',
        type: 'select',
        tab: 'structure',
        default: 'rfd_twin_rural_post',
        options: [
          ['rfd_twin_rural_post', 'Twin Rural Delivery Post'],
          ['stone_brick_pillar_mailbox', 'Brick Pillar Mailbox Vault'],
          ['victorian_cast_post_box', 'Victorian Cast-Iron Post Box'],
          ['mounted_porch_drop_mailbox', 'Wall-Mounted Porch Mailbox'],
          ['quad_suburban_wooden_rack', 'Quad Suburban Roadside Rack'],
          ['drive_up_courier_dropoff', 'Curbside Drive-Up Chute']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.34, max: 1.85, step: 0.04, unit: 'm', default: 0.85 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.42, max: 1.65, step: 0.04, unit: 'm', default: 1.28 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.16, max: 0.85, step: 0.04, unit: 'm', default: 0.56 },
      { key: 'flagRaised', label: 'Red Signal Flag Raised', type: 'toggle', tab: 'details', default: true },
      { key: 'signText', label: 'Number / Label Text', type: 'text', tab: 'details', default: '408', maxLength: 18 }
    ],
    presets: [
      { id: 'twin_rural_post_mailbox', label: 'Twin Rural Post Mailboxes', locationContext: 'exterior', paletteFamily: 'wood_office_executive', primaryColor: '#252b33', woodColor: '#8d5b34', accentColor: '#c9d1d9', params: { mailboxStyle: 'rfd_twin_rural_post', width: 0.88, height: 1.26, depth: 0.54, flagRaised: true } },
      { id: 'masonry_brick_pillar_mailbox', label: 'Brick Pillar Mailbox Vault', locationContext: 'exterior', paletteFamily: 'park_heritage', concreteColor: '#b8b3a8', params: { mailboxStyle: 'stone_brick_pillar_mailbox', width: 0.64, height: 1.38, depth: 0.64, signText: '1420' } },
      { id: 'victorian_pillar_post_box', label: 'Victorian Cast Pillar Post Box', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#a62626', accentColor: '#d4a63a', frameColor: '#1f2328', params: { mailboxStyle: 'victorian_cast_post_box', width: 0.62, height: 1.52, depth: 0.62, signText: 'Post Box' } },
      { id: 'wall_porch_drop_mailbox', label: 'Wall Porch Drop Mailbox', attachmentProfile: 'wall_mounted', locationContext: 'both', paletteFamily: 'older_metropolitan', primaryColor: '#242b33', secondaryColor: '#98a3ad', params: { mailboxStyle: 'mounted_porch_drop_mailbox', width: 0.42, height: 0.48, depth: 0.18, signText: 'Mail' } },
      { id: 'quad_roadside_mailbox_rack', label: 'Quad Roadside Mailbox Rack', locationContext: 'exterior', paletteFamily: 'park_heritage', primaryColor: '#2a333d', woodColor: '#996a3f', secondaryColor: '#b5bfc9', params: { mailboxStyle: 'quad_suburban_wooden_rack', width: 1.56, height: 1.24, depth: 0.56, flagRaised: true } },
      { id: 'drive_up_snorkel_dropbox', label: 'Drive-Up Snorkel Mail Chute', locationContext: 'exterior', paletteFamily: 'municipal', primaryColor: '#214d87', accentColor: '#e5a832', params: { mailboxStyle: 'drive_up_courier_dropoff', width: 0.72, height: 1.36, depth: 0.68, signText: 'Mail Drop' } }
    ],
    buildGeometry: spcBuildStreetMailboxes
  });

  registerObjectFamily({
    id: 'street_regulatory_signage',
    categoryId: '05_traffic',
    categories: ['05_traffic', '12_construction', '08_advertising'],
    subcategory: 'Traffic Signals & Signs',
    subcategories: ['Traffic Signals & Signs', 'Road Barriers', 'Sidewalk Signs'],
    label: 'Speed, Mileage & Street Signage',
    description: 'Speed limit sign posts, highway distance and mileage gantries, bridge low-clearance and weight signs, one-way/no-parking blades, school flashers, railroad crossbucks, and radar speed trailers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'pole_mounted'],
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    locationContext: 'exterior',
    environmentTags: ['street', 'highway', 'construction_zone', 'outdoor_plaza'],
    tags: ['street_sign', 'speed_limit', 'mileage', 'highway', 'clearance', 'one_way', 'railroad', 'radar'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'concrete', 'chrome', 'lampGlow', 'warningYellow', 'signalRed'],
    schema: [
      { group: 'Sign Archetype', tab: 'structure' },
      {
        key: 'signArchetype',
        label: 'Sign Style',
        type: 'select',
        tab: 'structure',
        default: 'speed_limit_sign',
        options: [
          ['speed_limit_sign', 'Speed Limit Sign Post'],
          ['interstate_mileage_gantry', 'Highway Distance & Mileage Sign'],
          ['low_clearance_bridge_sign', 'Bridge Clearance & Weight Sign'],
          ['one_way_do_not_enter', 'One-Way & No-Parking Post'],
          ['school_zone_flasher_sign', 'School Crossing Flasher Post'],
          ['railroad_crossbuck_gate', 'Railroad Crossbuck & Lights'],
          ['electronic_radar_speed_trailer', 'Trailer Radar Speed Display']
        ]
      },
      { key: 'poleHeight', label: 'Pole Height', type: 'range', tab: 'structure', min: 1.8, max: 5.2, step: 0.1, unit: 'm', default: 2.85 },
      { key: 'width', label: 'Sign Width', type: 'range', tab: 'structure', min: 0.55, max: 2.8, step: 0.05, unit: 'm', default: 0.78 },
      { key: 'signText', label: 'Main Sign Text', type: 'text', tab: 'details', default: '35', maxLength: 24 },
      { key: 'subText', label: 'Secondary Text', type: 'text', tab: 'details', default: 'Speed Limit', maxLength: 24 },
      { key: 'lampLit', label: 'Flasher Beacons Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'urban_speed_limit_35_sign', label: 'Speed Limit 35 Sign Post', locationContext: 'exterior', paletteFamily: 'municipal', params: { signArchetype: 'speed_limit_sign', poleHeight: 2.85, width: 0.76, signText: '35', subText: 'Speed Limit' } },
      { id: 'highway_speed_limit_65_sign', label: 'Highway Speed Limit 65 Sign', locationContext: 'exterior', paletteFamily: 'municipal', params: { signArchetype: 'speed_limit_sign', poleHeight: 3.15, width: 0.88, signText: '65', subText: 'Speed Limit' } },
      { id: 'highway_mileage_distance_sign', label: 'Highway Distance & Mileage Sign', locationContext: 'exterior', paletteFamily: 'municipal', primaryColor: '#1a5c3a', params: { signArchetype: 'interstate_mileage_gantry', poleHeight: 3.6, width: 2.25, signText: 'Downtown   12 Mi', subText: 'Metro Port 48 Mi' } },
      { id: 'bridge_low_clearance_sign', label: 'Bridge Low-Clearance & Weight Sign', locationContext: 'exterior', paletteFamily: 'industrial', woodColor: '#785738', params: { signArchetype: 'low_clearance_bridge_sign', poleHeight: 3.05, width: 0.78, signText: '12 Ft 6 In', subText: 'Weight 10 Tons', lampLit: true } },
      { id: 'one_way_no_parking_post', label: 'One-Way & No-Parking Post', locationContext: 'exterior', paletteFamily: 'municipal', params: { signArchetype: 'one_way_do_not_enter', poleHeight: 2.8, width: 0.92, signText: 'One Way ->', subText: 'No Parking' } },
      { id: 'school_zone_flasher_post', label: 'School Zone Flasher Sign', locationContext: 'exterior', paletteFamily: 'municipal', primaryColor: '#20364a', params: { signArchetype: 'school_zone_flasher_sign', poleHeight: 3.25, width: 0.8, signText: 'School 20', lampLit: true } },
      { id: 'railroad_crossbuck_signal', label: 'Railroad Crossbuck & Lights', locationContext: 'exterior', paletteFamily: 'municipal', params: { signArchetype: 'railroad_crossbuck_gate', poleHeight: 3.35, width: 1.15, signText: 'Railroad Crossing', lampLit: true } },
      { id: 'radar_speed_feedback_trailer', label: 'Trailer Radar Speed Sign', locationContext: 'exterior', paletteFamily: 'industrial', primaryColor: '#252d36', accentColor: '#e69824', params: { signArchetype: 'electronic_radar_speed_trailer', poleHeight: 2.45, width: 0.95, subText: 'Your Speed 34', lampLit: true } }
    ],
    buildGeometry: spcBuildStreetRegulatorySigns
  });

  registerObjectFamily({
    id: 'construction_heavy_vehicles',
    categoryId: '12_construction',
    categories: ['12_construction', '11_industrial', '26_trades_plumbing_electrical'],
    subcategory: 'Site Equipment',
    subcategories: ['Site Equipment', 'Barricades & Fencing', 'Handling Carts'],
    label: 'Specialty Construction Equipment',
    description: 'Compact tracked mini-excavators, wheeled skid-steer loaders, vibratory asphalt rollers, towable concrete mixers, electric scissor lifts, and highway arrow-board trailers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    locationContext: 'exterior',
    environmentTags: ['construction_zone', 'street', 'highway', 'industrial'],
    tags: ['excavator', 'skid_steer', 'roller', 'cement_mixer', 'scissor_lift', 'arrow_board', 'construction', 'vehicle'],
    materialSlots: ['primary', 'accent', 'frame', 'glass', 'rubber', 'chrome', 'lampGlow', 'warningYellow'],
    schema: [
      { group: 'Equipment Model', tab: 'structure' },
      {
        key: 'vehicleStyle',
        label: 'Machine Type',
        type: 'select',
        tab: 'structure',
        default: 'tracked_mini_excavator',
        options: [
          ['tracked_mini_excavator', 'Compact Tracked Mini-Excavator'],
          ['skid_steer_loader', 'Wheeled Skid-Steer Loader'],
          ['drum_asphalt_roller', 'Ride-On Vibratory Asphalt Roller'],
          ['towable_cement_mixer', 'Towable Concrete Cement Mixer'],
          ['telescopic_boom_scissor_lift', 'Electric Scissor Lift Platform'],
          ['arrow_board_workzone_trailer', 'Highway Arrow-Board Trailer']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.95, max: 2.9, step: 0.05, unit: 'm', default: 1.58 },
      { key: 'depth', label: 'Length / Depth', type: 'range', tab: 'structure', min: 1.25, max: 4.2, step: 0.05, unit: 'm', default: 2.65 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 1.25, max: 3.6, step: 0.05, unit: 'm', default: 2.35 },
      { key: 'lampLit', label: 'Beacons & Matrix Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'tracked_mini_excavator', label: 'Compact Tracked Mini-Excavator', locationContext: 'exterior', paletteFamily: 'industrial', primaryColor: '#e09a1e', accentColor: '#293038', frameColor: '#24292e', params: { vehicleStyle: 'tracked_mini_excavator', width: 1.62, depth: 2.85, height: 2.35, lampLit: true } },
      { id: 'wheeled_skid_steer_loader', label: 'Wheeled Skid-Steer Bucket Loader', locationContext: 'exterior', paletteFamily: 'industrial', primaryColor: '#e57b1e', accentColor: '#2d333b', frameColor: '#22272c', params: { vehicleStyle: 'skid_steer_loader', width: 1.65, depth: 2.75, height: 1.98, lampLit: true } },
      { id: 'vibratory_asphalt_roller', label: 'Ride-On Vibratory Asphalt Roller', locationContext: 'exterior', paletteFamily: 'industrial', primaryColor: '#d9a120', accentColor: '#cf3c2b', frameColor: '#252a30', params: { vehicleStyle: 'drum_asphalt_roller', width: 1.58, depth: 2.85, height: 2.72, lampLit: true } },
      { id: 'towable_concrete_cement_mixer', label: 'Towable Concrete Cement Mixer', locationContext: 'both', paletteFamily: 'industrial', primaryColor: '#d96624', accentColor: '#2c343d', frameColor: '#25292e', params: { vehicleStyle: 'towable_cement_mixer', width: 1.38, depth: 2.15, height: 1.72 } },
      { id: 'electric_scissor_lift_platform', label: 'Electric Scissor Lift Platform', locationContext: 'both', paletteFamily: 'industrial', primaryColor: '#c94328', accentColor: '#364452', frameColor: '#252b31', params: { vehicleStyle: 'telescopic_boom_scissor_lift', width: 1.32, depth: 2.35, height: 2.95 } },
      { id: 'highway_arrow_board_trailer', label: 'Highway Arrow-Board Trailer', locationContext: 'exterior', paletteFamily: 'industrial', primaryColor: '#262d36', accentColor: '#e67d22', frameColor: '#1f252b', params: { vehicleStyle: 'arrow_board_workzone_trailer', width: 1.95, depth: 2.45, height: 2.78, lampLit: true } }
    ],
    buildGeometry: spcBuildHeavyConstructionVehicles
  });
}
