import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function tcsmBuildCubicleJobProp(group, cfg, b, mats, meta) {
  const type = cfg.kitType || 'call_center_carrel';
  const w = clamp(cfg.width || 1.28, 0.36, 1.85);
  const d = clamp(cfg.depth || 0.86, 0.14, 1.25);
  const h = clamp(cfg.height || 1.48, 0.28, 1.85);

  if (type === 'call_center_carrel') {
    const cw = clamp(w, 1.05, 1.55);
    const cd = clamp(d, 0.72, 0.96);
    const wallH = clamp(h, 1.32, 1.68);
    // Acoustic 3-sided partition wrap + compact desk
    b.addBox(0, wallH * 0.5, -cd * 0.48, cw, wallH, 0.06, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(-cw * 0.48, wallH * 0.5, 0, 0.06, wallH, cd, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(cw * 0.48, wallH * 0.5, 0, 0.06, wallH, cd, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(0, wallH + 0.015, -cd * 0.48, cw + 0.04, 0.03, 0.07, { materialRole: 'frame', layer: 'detail' });
    b.addBox(0, 0.74, -0.04, cw - 0.08, 0.04, cd - 0.1, { materialRole: 'primary', layer: 'body' });
    // Dual monitor + VoIP phone console + headset hanger
    b.addBox(-0.18, 0.98, -cd * 0.25, 0.44, 0.28, 0.025, { materialRole: 'darkMetal', layer: 'body' });
    objCreateScreenPlane(group, 'spreadsheet', 0.4, 0.24, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -0.18,
      y: 0.98,
      z: -cd * 0.25 + 0.016
    });
    b.addBox(0.32, 0.79, -0.05, 0.24, 0.07, 0.22, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 18 });
    objCreateScreenPlane(group, 'terminal', 0.14, 0.07, '#4de2ff', cfg.condition, cfg.seed + 5, {
      x: 0.32,
      y: 0.83,
      z: -0.04,
      rotX: -Math.PI * 0.34
    });
    b.addBox(-cw * 0.43, 1.15, -0.08, 0.04, 0.03, 0.08, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(-cw * 0.42, 1.07, -0.08, 0.036, 0.036, 0.04, 10, 'x', 'accent', 'detail');
    meta.snapAnchors.push({ id: 'agent_seat', position: [0, 0, cd * 0.5 + 0.28], normal: [0, 0, 1] });
  } else if (type === 'paper_stack_kit') {
    // Tabletop overflowing inbox, skew stacks & folders (y = 0)
    b.addBox(-0.16, 0.015, 0.02, 0.26, 0.03, 0.32, { materialRole: 'frame', layer: 'detail' });
    for (let i = 0; i < 6; i++) {
      b.addBox(-0.16 + (i % 2) * 0.012, 0.045 + i * 0.024, 0.02, 0.21, 0.02, 0.27, {
        materialRole: i === 2 || i === 4 ? 'accent' : 'whiteTrim',
        layer: 'detail',
        rotYDeg: (i - 2.5) * 4
      });
    }
    b.addBox(0.14, 0.09, -0.05, 0.22, 0.18, 0.28, { materialRole: 'whiteTrim', layer: 'detail', rotYDeg: -6 });
    b.addBox(0.14, 0.2, -0.05, 0.22, 0.04, 0.28, { materialRole: 'safetyRed', layer: 'detail', rotYDeg: 8 });
    b.addCylinder(0.28, 0.05, 0.14, 0.04, 0.036, 0.1, 10, 'y', 'whiteTrim', 'detail');
  } else if (type === 'cubicle_memo_rack') {
    const rw = clamp(w, 0.72, 1.18);
    const rh = clamp(h, 0.42, 0.65);
    const cz = cfg.attachmentProfile === 'wall_mounted' ? 0.03 : 0;
    const cy = cfg.attachmentProfile === 'wall_mounted' ? 0 : 1.18;
    b.addBox(0, cy, cz, rw, rh, 0.03, { materialRole: 'frame', layer: 'body' });
    b.addBox(-rw * 0.18, cy, cz + 0.015, rw * 0.56, rh - 0.06, 0.02, { materialRole: 'wood', layer: 'body' });
    const noteRoles = ['warningYellow', 'signalAmber', 'signalGreen', 'whiteTrim'];
    for (let i = 0; i < 4; i++) {
      b.addBox(-rw * 0.36 + i * 0.11, cy + (i % 2 === 0 ? 0.08 : -0.06), cz + 0.028, 0.085, 0.085, 0.008, {
        materialRole: noteRoles[i],
        layer: 'detail',
        rotZDeg: (i - 1.5) * 5
      });
    }
    b.addBox(rw * 0.26, cy - 0.05, cz + 0.045, rw * 0.28, rh * 0.72, 0.05, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(rw * 0.26, cy + 0.06, cz + 0.05, rw * 0.22, rh * 0.55, 0.016, { materialRole: 'accent', layer: 'detail' });
  } else if (type === 'mailroom_parcel_cart') {
    const mw = clamp(w, 0.54, 0.78);
    const md = clamp(d, 0.88, 1.25);
    const mh = clamp(h, 0.96, 1.18);
    b.addCasterWheels(0, 0, mw * 0.85, md * 0.84, 0.055, 'rubber', 'frame', 0);
    b.addBox(0, 0.22, 0, mw, 0.035, md, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.68, 0, mw, 0.035, md, { materialRole: 'chrome', layer: 'body' });
    b.addSupportLegs(0, 0.14, mh, mw - 0.04, md - 0.04, 0.03, 'chrome', 0);
    b.addBox(0, mh, md * 0.48, mw, 0.035, 0.035, { materialRole: 'accent', layer: 'detail' });
    // Corrugated parcel boxes & bundled interoffice mail envelopes
    b.addBox(-0.1, 0.82, -0.18, mw * 0.52, 0.24, 0.34, { materialRole: 'wood', layer: 'detail' });
    b.addBox(0.12, 0.78, 0.2, mw * 0.42, 0.16, 0.28, { materialRole: 'wood', layer: 'detail', rotYDeg: 8 });
    b.addBox(0, 0.34, 0.12, mw * 0.66, 0.22, 0.38, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(0, 0.34, -0.25, mw * 0.62, 0.2, 0.26, { materialRole: 'secondary', layer: 'detail' });
  } else if (type === 'watercooler_bulletin_nook') {
    const nw = clamp(w, 1.15, 1.55);
    // Framed cork bulletin noticeboard beside freestanding bottled water cooler & cup caddy
    b.addBox(-nw * 0.22, 1.28, -0.18, nw * 0.58, 0.92, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(-nw * 0.22, 1.28, -0.16, nw * 0.52, 0.84, 0.02, { materialRole: 'wood', layer: 'body' });
    b.addBox(-nw * 0.34, 1.38, -0.14, 0.18, 0.24, 0.008, { materialRole: 'whiteTrim', layer: 'detail', rotZDeg: -3 });
    b.addBox(-nw * 0.12, 1.24, -0.14, 0.2, 0.22, 0.008, { materialRole: 'warningYellow', layer: 'detail', rotZDeg: 4 });
    // Water cooler unit on right side
    b.addChamferBox(nw * 0.26, 0.5, 0, 0.38, 1.0, 0.38, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(nw * 0.26, 1.2, 0, 0.14, 0.14, 0.34, 12, 'y', 'glass', 'detail');
    b.addBox(nw * 0.21, 0.74, 0.2, 0.024, 0.032, 0.025, { materialRole: 'accent', layer: 'detail' });
    b.addBox(nw * 0.31, 0.74, 0.2, 0.024, 0.032, 0.025, { materialRole: 'safetyRed', layer: 'detail' });
    b.addCylinder(nw * 0.47, 0.72, 0, 0.045, 0.045, 0.28, 10, 'y', 'whiteTrim', 'detail');
  } else if (type === 'celebration_cake_cart') {
    const cw = clamp(w, 0.6, 0.85);
    const cd = clamp(d, 0.82, 1.08);
    b.addCasterWheels(0, 0, cw * 0.84, cd * 0.84, 0.045, 'rubber', 'frame', 0);
    b.addBox(0, 0.24, 0, cw, 0.032, cd, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.78, 0, cw, 0.035, cd, { materialRole: 'chrome', layer: 'body' });
    b.addSupportLegs(0, 0.1, 0.92, cw - 0.05, cd - 0.05, 0.028, 'chrome', 0);
    // Frosted rectangular birthday/retirement sheet cake + red party cups + plates
    b.addBox(-0.04, 0.85, -0.08, 0.44, 0.1, 0.34, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(-0.04, 0.91, -0.08, 0.45, 0.025, 0.35, { materialRole: 'accent', layer: 'detail' });
    for (let i = -1; i <= 1; i++) {
      b.addCylinder(-0.04 + i * 0.1, 0.95, -0.08, 0.008, 0.008, 0.06, 6, 'y', 'signalAmber', 'detail');
    }
    b.addCylinder(0.08, 0.87, 0.28, 0.048, 0.036, 0.14, 10, 'y', 'safetyRed', 'detail');
    b.addCylinder(-0.14, 0.82, 0.28, 0.1, 0.1, 0.04, 12, 'y', 'whiteTrim', 'detail');
  } else {
    // ergonomic_ball_chair_footrest
    b.addCylinder(0, 0.025, 0, 0.28, 0.3, 0.04, 12, 'y', 'frame', 'body');
    b.addCylinder(0, 0.34, 0, 0.24, 0.24, 0.36, 14, 'y', 'accent', 'body');
    b.addCylinder(0, 0.56, 0, 0.15, 0.24, 0.09, 14, 'y', 'accent', 'body');
    b.addCylinder(0, 0.12, 0, 0.15, 0.24, 0.09, 14, 'y', 'accent', 'body');
    // Tilted ergonomic under-desk footrest + anti-fatigue mat
    b.addBox(0, 0.05, -0.46, 0.44, 0.06, 0.32, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 18 });
    b.addBox(0, 0.012, 0.02, 0.75, 0.02, 0.65, { materialRole: 'rubber', layer: 'body' });
  }

  meta.interaction = { interactable: true, actionType: type };
}

function tcsmBuildElectricianEquipment(group, cfg, b, mats, meta) {
  const type = cfg.equipType || 'open_circuit_breaker_panel';
  const w = clamp(cfg.width || 0.95, 0.45, 2.25);
  const d = clamp(cfg.depth || 0.62, 0.16, 1.15);
  const h = clamp(cfg.height || 1.65, 0.65, 2.45);

  if (type === 'open_circuit_breaker_panel') {
    const pw = clamp(w, 0.56, 0.92);
    const ph = clamp(h, 0.78, 1.35);
    const cz = cfg.attachmentProfile === 'wall_mounted' ? 0.08 : 0;
    const cy = cfg.attachmentProfile === 'wall_mounted' ? 0 : 1.15;
    if (cfg.attachmentProfile !== 'wall_mounted') {
      b.addBox(0, 0.78, -0.02, pw * 0.85, 1.56, 0.06, { materialRole: 'frame', layer: 'body' });
    }
    b.addBox(0, cy, cz, pw, ph, 0.14, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, cy, cz + 0.072, pw - 0.08, ph - 0.1, 0.016, { materialRole: 'darkMetal', layer: 'body' });
    // Copper main busbars & vertical breaker switches + hinged open cabinet door
    b.addBox(-0.04, cy, cz + 0.082, 0.028, ph * 0.7, 0.018, { materialRole: 'copper', layer: 'detail' });
    b.addBox(0.04, cy, cz + 0.082, 0.028, ph * 0.7, 0.018, { materialRole: 'copper', layer: 'detail' });
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const by = cy - ph * 0.28 + (r / (rows - 1)) * (ph * 0.56);
      b.addBox(-0.14, by, cz + 0.086, 0.14, 0.045, 0.024, { materialRole: r === 2 ? 'safetyRed' : 'frame', layer: 'detail' });
      b.addBox(0.14, by, cz + 0.086, 0.14, 0.045, 0.024, { materialRole: r === 4 ? 'signalGreen' : 'frame', layer: 'detail' });
    }
    b.addBox(-pw * 0.5 - 0.18, cy, cz + 0.26, pw * 0.88, ph - 0.04, 0.024, {
      materialRole: 'secondary',
      layer: 'body',
      rotYDeg: -68
    });
    b.addCylinder(-0.14, cy + ph * 0.65, cz, 0.022, 0.022, 0.28, 8, 'y', 'chrome', 'detail');
    b.addCylinder(0.14, cy + ph * 0.65, cz, 0.022, 0.022, 0.28, 8, 'y', 'chrome', 'detail');
  } else if (type === 'wire_spool_cart') {
    const cw = clamp(w, 0.68, 0.96);
    const ch = clamp(h, 1.05, 1.38);
    b.addCasterWheels(0, 0, cw * 0.8, 0.48, 0.075, 'rubber', 'frame', 0);
    b.addBox(-cw * 0.44, ch * 0.54, 0, 0.045, ch * 0.9, 0.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(cw * 0.44, ch * 0.54, 0, 0.045, ch * 0.9, 0.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.2, 0, cw * 0.92, 0.045, 0.46, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, ch, 0.14, cw * 0.92, 0.04, 0.04, { materialRole: 'accent', layer: 'detail' });
    // Two horizontal arbor bars holding 4 colored cable spools
    const rows = [
      { ry: 0.48, spools: [['safetyRed', -0.18], ['warningYellow', 0.18]] },
      { ry: 0.86, spools: [['accent', -0.18], ['signalGreen', 0.18]] }
    ];
    for (const row of rows) {
      b.addCylinder(0, row.ry, 0, 0.016, 0.016, cw * 0.96, 8, 'x', 'chrome', 'detail');
      for (const [role, sx] of row.spools) {
        b.addCylinder(sx - 0.13, row.ry, 0, 0.15, 0.15, 0.018, 12, 'x', 'wood', 'detail');
        b.addCylinder(sx + 0.13, row.ry, 0, 0.15, 0.15, 0.018, 12, 'x', 'wood', 'detail');
        b.addCylinder(sx, row.ry, 0, 0.115, 0.115, 0.24, 12, 'x', role, 'body');
      }
    }
  } else if (type === 'switchgear_cabinet') {
    const sw = clamp(w, 1.15, 1.95);
    const sd = clamp(d, 0.68, 0.98);
    const sh = clamp(h, 1.85, 2.28);
    b.addBox(0, 0.06, 0, sw + 0.04, 0.12, sd + 0.04, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, sh * 0.5 + 0.04, 0, sw, sh - 0.08, sd, 0.016, { materialRole: 'primary', layer: 'body' });
    b.addBox(-sw * 0.24, sh * 0.52, sd * 0.5 + 0.014, sw * 0.44, sh - 0.24, 0.022, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(sw * 0.24, sh * 0.52, sd * 0.5 + 0.014, sw * 0.44, sh - 0.24, 0.022, { materialRole: 'secondary', layer: 'detail' });
    // Rotary disconnect handle + meters + louvers
    b.addBox(sw * 0.4, sh * 0.62, sd * 0.5 + 0.032, 0.09, 0.22, 0.04, { materialRole: 'warningYellow', layer: 'detail' });
    b.addBox(sw * 0.4, sh * 0.62, sd * 0.5 + 0.056, 0.04, 0.14, 0.04, { materialRole: 'safetyRed', layer: 'detail', rotZDeg: 28 });
    b.addLouverGrille(-sw * 0.24, sh * 0.28, sd * 0.5 + 0.026, sw * 0.34, 0.24, 5, 'z', 'frame', 'detail');
    b.addLouverGrille(sw * 0.24, sh * 0.28, sd * 0.5 + 0.026, sw * 0.34, 0.24, 5, 'z', 'frame', 'detail');
    objCreateSignPlane(group, cfg.signText || 'High Voltage', Math.min(sw * 0.5, 0.72), 0.22, '#e8b228', '#14171a', {
      x: -sw * 0.24,
      y: sh * 0.76,
      z: sd * 0.5 + 0.03
    });
  } else if (type === 'fiberglass_step_ladder') {
    const lw = clamp(w, 0.58, 0.78);
    const lh = clamp(h, 1.55, 2.15);
    const leanDeg = 14;
    // Twin yellow fiberglass front A-rails & rear aluminum struts
    for (const side of [-1, 1]) {
      b.addBox(side * lw * 0.44, lh * 0.5, 0.24, 0.05, lh, 0.075, { materialRole: 'warningYellow', layer: 'body', rotXDeg: -leanDeg });
      b.addBox(side * lw * 0.44, lh * 0.5, -0.24, 0.042, lh, 0.055, { materialRole: 'chrome', layer: 'body', rotXDeg: leanDeg });
    }
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const sy = 0.26 + (s / (steps - 1)) * (lh - 0.48);
      const sz = 0.42 - (s / (steps - 1)) * 0.34;
      b.addBox(0, sy, sz, lw * 0.86, 0.028, 0.09, { materialRole: 'chrome', layer: 'detail' });
    }
    // Molded top tool holster cap + cordless drill resting in slot
    b.addBox(0, lh - 0.02, 0, lw * 0.94, 0.055, 0.22, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0.08, lh + 0.05, 0, 0.16, 0.06, 0.06, { materialRole: 'accent', layer: 'detail' });
  } else if (type === 'spider_box_light') {
    // Portable jobsite Gfci power spider box + raised telescoping floodlight tripod head
    b.addChamferBox(0, 0.24, 0.12, 0.52, 0.4, 0.46, 0.015, { materialRole: 'warningYellow', layer: 'body' });
    b.addBox(-0.28, 0.26, 0.12, 0.035, 0.44, 0.5, { materialRole: 'frame', layer: 'body' });
    b.addBox(0.28, 0.26, 0.12, 0.035, 0.44, 0.5, { materialRole: 'frame', layer: 'body' });
    for (let i = -1; i <= 1; i++) {
      b.addCylinder(i * 0.12, 0.22, 0.36, 0.038, 0.038, 0.04, 10, 'z', 'darkMetal', 'detail');
      b.addBox(i * 0.12, 0.32, 0.36, 0.05, 0.025, 0.02, { materialRole: i === 0 ? 'safetyRed' : 'signalGreen', layer: 'detail' });
    }
    // Floodlight mast & dual yellow work flood heads
    b.addCylinder(0, 1.05, -0.05, 0.026, 0.034, 1.35, 8, 'y', 'chrome', 'body');
    b.addBox(0, 1.72, -0.05, 0.56, 0.045, 0.045, { materialRole: 'frame', layer: 'detail' });
    for (const fx of [-0.18, 0.18]) {
      b.addBox(fx, 1.82, -0.04, 0.22, 0.16, 0.12, { materialRole: 'warningYellow', layer: 'body' });
      b.addBox(fx, 1.82, 0.025, 0.18, 0.12, 0.016, { materialRole: 'lampGlow', layer: 'detail' });
    }
    meta.lightSources.push({ id: 'jobsite_flood', position: [0, 1.82, 0.15], color: '#fff3d4', radius: 2.8, enabled: true });
  } else {
    // overhead_cable_tray
    const tw = clamp(w, 1.25, 2.25);
    const cz = cfg.attachmentProfile === 'wall_mounted' ? 0.24 : 0;
    const cy = cfg.attachmentProfile === 'wall_mounted' ? 0 : 1.85;
    if (cfg.attachmentProfile !== 'wall_mounted') {
      b.addCylinder(-tw * 0.4, 0.94, 0, 0.024, 0.024, 1.88, 8, 'y', 'frame', 'body');
      b.addCylinder(tw * 0.4, 0.94, 0, 0.024, 0.024, 1.88, 8, 'y', 'frame', 'body');
    }
    // Ladder tray rails & rungs + heavy copper & conduit pipe bundles
    b.addBox(0, cy, cz - 0.14, tw, 0.06, 0.024, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, cy, cz + 0.14, tw, 0.06, 0.024, { materialRole: 'chrome', layer: 'body' });
    for (let i = -3; i <= 3; i++) {
      b.addBox(i * (tw * 0.13), cy - 0.02, cz, 0.024, 0.02, 0.28, { materialRole: 'chrome', layer: 'detail' });
    }
    b.addPipeSegment(-tw * 0.5, cy + 0.03, cz - 0.06, tw * 0.5, cy + 0.03, cz - 0.06, 0.025, 8, 'copper', 'detail');
    b.addPipeSegment(-tw * 0.5, cy + 0.03, cz, tw * 0.5, cy + 0.03, cz, 0.022, 8, 'accent', 'detail');
    b.addPipeSegment(-tw * 0.5, cy + 0.03, cz + 0.06, tw * 0.5, cy + 0.03, cz + 0.06, 0.026, 8, 'darkMetal', 'detail');
    if (cfg.attachmentProfile === 'wall_mounted') {
      b.addBox(-tw * 0.36, cy - 0.06, 0.12, 0.04, 0.04, 0.26, { materialRole: 'frame', layer: 'body' });
      b.addBox(tw * 0.36, cy - 0.06, 0.12, 0.04, 0.04, 0.26, { materialRole: 'frame', layer: 'body' });
    }
  }

  meta.interaction = { interactable: true, actionType: type };
}

function tcsmBuildPlumbingHvacEquipment(group, cfg, b, mats, meta) {
  const type = cfg.plumbType || 'commercial_water_heater_manifold';
  const w = clamp(cfg.width || 1.05, 0.44, 1.85);
  const d = clamp(cfg.depth || 0.78, 0.4, 1.35);
  const h = clamp(cfg.height || 1.78, 0.65, 2.35);

  if (type === 'commercial_water_heater_manifold') {
    const tr = clamp(w * 0.34, 0.24, 0.38);
    const th = clamp(h, 1.45, 2.05);
    // Steel containment drip pan + tall cylindrical tank + expansion tank
    b.addCylinder(0, 0.03, 0, tr + 0.08, tr + 0.08, 0.06, 14, 'y', 'chrome', 'body');
    b.addCylinder(0, th * 0.48, 0, tr, tr, th * 0.84, 16, 'y', 'primary', 'body');
    b.addCylinder(0, th * 0.93, 0, tr * 0.34, tr * 0.88, 0.12, 14, 'y', 'chrome', 'detail');
    b.addCylinder(0, th + 0.12, 0, tr * 0.3, tr * 0.3, 0.34, 12, 'y', 'chrome', 'body');
    // Copper hot & cold riser pipes with red/blue valve handwheels + thermal expansion bottle
    b.addPipeSegment(-tr * 0.52, th * 0.9, 0.08, -tr * 0.52, th + 0.25, 0.08, 0.022, 8, 'copper', 'detail');
    b.addPipeSegment(tr * 0.52, th * 0.9, 0.08, tr * 0.52, th + 0.25, 0.08, 0.022, 8, 'copper', 'detail');
    b.addValveWheel(-tr * 0.52, th * 0.98, 0.1, 0.055, 0.05, 'z', 'safetyRed', 'brass');
    b.addValveWheel(tr * 0.52, th * 0.98, 0.1, 0.055, 0.05, 'z', 'accent', 'brass');
    b.addCylinder(-tr - 0.22, th * 0.56, 0, 0.12, 0.12, 0.42, 12, 'y', 'secondary', 'body');
    b.addBox(0, th * 0.35, tr + 0.03, 0.18, 0.26, 0.07, { materialRole: 'darkMetal', layer: 'detail' });
  } else if (type === 'motorized_drain_snake') {
    const sw = clamp(w, 0.52, 0.72);
    b.addCasterWheels(0, 0, sw * 0.8, 0.6, 0.095, 'rubber', 'frame', 0);
    b.addBox(-sw * 0.38, 0.58, -0.14, 0.045, 0.95, 0.045, { materialRole: 'frame', layer: 'body', rotXDeg: -22 });
    b.addBox(sw * 0.38, 0.58, -0.14, 0.045, 0.95, 0.045, { materialRole: 'frame', layer: 'body', rotXDeg: -22 });
    b.addBox(0, 1.0, -0.32, sw * 0.82, 0.04, 0.04, { materialRole: 'accent', layer: 'detail' });
    // Angled rotary steel auger drum + electric drive motor + foot pedal
    b.addCylinder(0, 0.48, 0.04, 0.22, 0.22, 0.36, 14, 'z', 'primary', 'body');
    b.addCylinder(0, 0.48, 0.28, 0.05, 0.09, 0.14, 10, 'z', 'chrome', 'detail');
    b.addPipeSegment(0, 0.48, 0.32, 0.05, 0.16, 0.54, 0.018, 8, 'darkMetal', 'detail');
    b.addBox(0, 0.22, -0.06, 0.22, 0.18, 0.22, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0.28, 0.035, 0.24, 0.12, 0.05, 0.16, { materialRole: 'warningYellow', layer: 'detail', rotXDeg: 18 });
  } else if (type === 'tripod_pipe_vise') {
    const pw = clamp(w, 0.85, 1.15);
    const th = 0.88;
    // 3 splayed orange/red tripod legs + folding steel tray shelf + top cast plate + pipe
    b.addBox(0, th, 0, 0.46, 0.045, 0.42, { materialRole: 'primary', layer: 'body' });
    b.addBox(-0.22, th * 0.5, 0.2, 0.045, 0.94, 0.045, { materialRole: 'primary', layer: 'body', rotXDeg: -14, rotZDeg: -14 });
    b.addBox(0.22, th * 0.5, 0.2, 0.045, 0.94, 0.045, { materialRole: 'primary', layer: 'body', rotXDeg: -14, rotZDeg: 14 });
    b.addBox(0, th * 0.5, -0.26, 0.045, 0.94, 0.045, { materialRole: 'primary', layer: 'body', rotXDeg: 18 });
    b.addBox(0, th * 0.38, 0, 0.44, 0.025, 0.4, { materialRole: 'frame', layer: 'body' });
    // Chain yoke vise & long horizontal galvanized steel pipe being threaded
    b.addBox(-0.08, th + 0.06, 0.08, 0.14, 0.12, 0.14, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(0.08, th + 0.08, 0.08, 0.032, 0.032, pw, 10, 'x', 'chrome', 'detail');
    b.addBox(-pw * 0.45, th + 0.08, 0.08, 0.09, 0.16, 0.12, { materialRole: 'safetyRed', layer: 'detail' });
  } else if (type === 'booster_sump_skid') {
    const sw = clamp(w, 0.95, 1.45);
    const sd = clamp(d, 0.68, 0.96);
    b.addBox(0, 0.05, 0, sw, 0.1, sd, { materialRole: 'frame', layer: 'body' });
    for (const px of [-sw * 0.25, sw * 0.25]) {
      b.addCylinder(px, 0.28, -0.1, 0.13, 0.13, 0.34, 12, 'z', 'accent', 'body');
      b.addCylinder(px, 0.28, 0.16, 0.14, 0.14, 0.14, 12, 'z', 'primary', 'body');
      b.addPipeSegment(px, 0.38, 0.16, px, 0.72, 0.16, 0.032, 10, 'copper', 'detail');
      b.addFlangeAndBolts(px, 0.56, 0.16, 0.036, 'y', 'frame', 'secondary');
      b.addValveWheel(px + 0.06, 0.62, 0.22, 0.055, 0.05, 'z', 'safetyRed', 'brass');
    }
    b.addPipeSegment(-sw * 0.36, 0.72, 0.16, sw * 0.36, 0.72, 0.16, 0.036, 10, 'copper', 'detail');
    b.addBox(0, 0.85, -sd * 0.32, 0.38, 0.48, 0.18, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.94, -sd * 0.22, 0.04, 0.04, 0.02, { materialRole: 'signalGreen', layer: 'detail' });
  } else if (type === 'brazing_torch_cart') {
    b.addCasterWheels(0, 0, 0.44, 0.1, 0.1, 'rubber', 'frame', -0.06);
    b.addBox(0, 0.03, 0.14, 0.48, 0.04, 0.32, { materialRole: 'frame', layer: 'body' });
    b.addBox(-0.2, 0.64, -0.06, 0.035, 1.15, 0.035, { materialRole: 'frame', layer: 'body' });
    b.addBox(0.2, 0.64, -0.06, 0.035, 1.15, 0.035, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 1.2, -0.1, 0.44, 0.035, 0.035, { materialRole: 'frame', layer: 'detail' });
    // Green Oxygen cylinder & Red Acetylene tank + brass regulators + hose
    b.addCylinder(-0.12, 0.64, 0.12, 0.095, 0.095, 1.14, 12, 'y', 'signalGreen', 'body');
    b.addCylinder(0.12, 0.52, 0.12, 0.105, 0.105, 0.88, 12, 'y', 'safetyRed', 'body');
    b.addCylinder(-0.12, 1.26, 0.12, 0.032, 0.032, 0.08, 8, 'y', 'brass', 'detail');
    b.addCylinder(0.12, 1.02, 0.12, 0.032, 0.032, 0.08, 8, 'y', 'brass', 'detail');
    b.addPrismRing(0, 0.84, 0.24, 0.16, 0.13, 0.028, 12, 'z', 'safetyRed', 'detail');
  } else if (type === 'rolling_tool_chest') {
    const cw = clamp(w, 0.92, 1.48);
    const cd = clamp(d, 0.48, 0.64);
    const ch = clamp(h, 0.98, 1.42);
    b.addCasterWheels(0, 0, cw * 0.86, cd * 0.82, 0.055, 'rubber', 'frame', 0);
    b.addChamferBox(0, 0.1 + (ch - 0.1) * 0.5, 0, cw, ch - 0.1, cd, 0.015, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, ch + 0.018, 0, cw - 0.04, 0.025, cd - 0.04, { materialRole: 'rubber', layer: 'detail' });
    b.addBox(cw * 0.56, ch * 0.82, 0, 0.03, 0.03, cd * 0.72, { materialRole: 'chrome', layer: 'detail' });
    const drawers = 6;
    const dh = (ch - 0.22) / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = 0.18 + dh * 0.5 + i * dh;
      b.addBox(0, dy, cd * 0.5 + 0.01, cw - 0.08, dh * 0.8, 0.018, { materialRole: 'safetyRed', layer: 'detail' });
      b.addBox(0, dy + dh * 0.24, cd * 0.5 + 0.024, cw - 0.12, 0.02, 0.02, { materialRole: 'chrome', layer: 'detail' });
    }
  } else {
    // industrial_wet_dry_shop_vacuum
    const vr = clamp(w * 0.34, 0.2, 0.28);
    b.addCasterWheels(0, 0, vr * 1.6, vr * 1.6, 0.038, 'rubber', 'frame', 0);
    b.addCylinder(0, 0.36, 0, vr, vr * 0.92, 0.56, 14, 'y', 'primary', 'body');
    b.addCylinder(0, 0.7, 0, vr * 0.96, vr * 1.04, 0.14, 14, 'y', 'darkMetal', 'body');
    b.addBox(0, 0.81, 0, 0.18, 0.06, 0.05, { materialRole: 'accent', layer: 'detail' });
    // Corrugated suction hose + floor squeegee wand
    b.addPipeSegment(0, 0.42, vr + 0.02, vr + 0.14, 0.26, 0.18, 0.026, 8, 'darkMetal', 'detail');
    b.addPipeSegment(vr + 0.14, 0.26, 0.18, vr + 0.18, 0.05, 0.36, 0.024, 8, 'darkMetal', 'detail');
    b.addBox(vr + 0.18, 0.03, 0.4, 0.28, 0.045, 0.09, { materialRole: 'frame', layer: 'detail' });
  }

  meta.interaction = { interactable: true, actionType: type };
}

function tcsmBuildSimsRecreationProp(group, cfg, b, mats, meta) {
  const type = cfg.recreationType || 'panoramic_tropical_aquarium';
  const w = clamp(cfg.width || 1.65, 0.48, 2.55);
  const d = clamp(cfg.depth || 0.62, 0.34, 1.48);
  const h = clamp(cfg.height || 1.56, 0.76, 2.25);

  if (type === 'panoramic_tropical_aquarium') {
    const aw = clamp(w, 1.35, 2.25);
    const ad = clamp(d, 0.48, 0.68);
    const cabH = 0.76;
    const tankH = clamp(h - cabH - 0.12, 0.56, 0.85);
    b.addChamferBox(0, cabH * 0.5, 0, aw, cabH, ad, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(-aw * 0.24, cabH * 0.5, ad * 0.5 + 0.01, aw * 0.42, cabH - 0.14, 0.02, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(aw * 0.24, cabH * 0.5, ad * 0.5 + 0.01, aw * 0.42, cabH - 0.14, 0.02, { materialRole: 'secondary', layer: 'detail' });
    // Glowing cyan water glass box + gravel floor + coral rocks + colorful stylized fish
    b.addBox(0, cabH + 0.03, 0, aw - 0.08, 0.05, ad - 0.08, { materialRole: 'wood', layer: 'detail' });
    b.addBox(0, cabH + tankH * 0.5, -ad * 0.42, aw - 0.08, tankH - 0.04, 0.02, { materialRole: 'holoEnergy', layer: 'body' });
    b.addBox(0, cabH + tankH * 0.5, ad * 0.44, aw - 0.06, tankH, 0.025, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-aw * 0.46, cabH + tankH * 0.5, 0, 0.04, tankH, ad - 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(aw * 0.46, cabH + tankH * 0.5, 0, 0.04, tankH, ad - 0.06, { materialRole: 'frame', layer: 'body' });
    // Coral & aquatic plants + low-poly tropical fish
    b.addCylinder(-aw * 0.28, cabH + 0.18, 0.02, 0.04, 0.075, 0.28, 8, 'y', 'foliage', 'detail');
    b.addCylinder(aw * 0.26, cabH + 0.16, -0.04, 0.06, 0.09, 0.24, 8, 'y', 'safetyRed', 'detail');
    const fish = [
      [-aw * 0.22, cabH + tankH * 0.62, 0.08, 'signalAmber'],
      [0.05, cabH + tankH * 0.45, -0.06, 'safetyRed'],
      [aw * 0.25, cabH + tankH * 0.7, 0.04, 'warningYellow']
    ];
    for (const [fx, fy, fz, role] of fish) {
      b.addBox(fx, fy, fz, 0.11, 0.055, 0.028, { materialRole: role, layer: 'detail' });
      b.addBox(fx - 0.075, fy, fz, 0.04, 0.07, 0.012, { materialRole: role, layer: 'detail', rotZDeg: 22 });
    }
    b.addBox(0, cabH + tankH + 0.06, 0, aw + 0.02, 0.12, ad + 0.02, { materialRole: 'primary', layer: 'body' });
    meta.lightSources.push({ id: 'aquarium_glow', position: [0, cabH + tankH * 0.5, 0.15], color: '#4de2ff', radius: 1.8, enabled: true });
  } else if (type === 'retro_neon_bubble_jukebox') {
    const jw = clamp(w, 0.82, 1.08);
    const jd = clamp(d, 0.58, 0.72);
    const jh = clamp(h, 1.48, 1.72);
    b.addBox(0, jh * 0.36, 0, jw, jh * 0.72, jd, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, jh * 0.72, 0, jw * 0.49, jw * 0.49, jd, 14, 'z', 'primary', 'body');
    // Outer rainbow neon arch halo + chrome grille slats + selector track window
    b.addPrismRing(0, jh * 0.72, jd * 0.5 + 0.02, jw * 0.46, jw * 0.36, 0.055, 14, 'z', 'signalAmber', 'detail');
    b.addPrismRing(0, jh * 0.72, jd * 0.5 + 0.026, jw * 0.35, jw * 0.27, 0.045, 14, 'z', 'holoEnergy', 'detail');
    b.addBox(-jw * 0.44, jh * 0.38, jd * 0.5 + 0.016, 0.075, jh * 0.62, 0.04, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(jw * 0.44, jh * 0.38, jd * 0.5 + 0.016, 0.075, jh * 0.62, 0.04, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(0, jh * 0.56, jd * 0.5 + 0.015, jw * 0.62, 0.22, 0.03, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(0, jh * 0.26, jd * 0.5 + 0.014, jw * 0.56, 0.32, 0.025, { materialRole: 'brass', layer: 'detail' });
    meta.lightSources.push({ id: 'jukebox_neon', position: [0, jh * 0.72, jd * 0.5 + 0.2], color: '#ff9f43', radius: 2.0, enabled: true });
  } else if (type === 'billiards_pool_table') {
    const pw = clamp(w, 2.05, 2.55);
    const pd = clamp(d, 1.18, 1.48);
    const th = 0.79;
    b.addSupportLegs(0, 0, th - 0.16, pw * 0.82, pd * 0.78, 0.14, 'primary', 0);
    b.addBox(0, th - 0.1, 0, pw - 0.06, 0.16, pd - 0.06, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, th - 0.01, 0, pw - 0.18, 0.03, pd - 0.18, { materialRole: 'foliage', layer: 'body' });
    // Raised hardwood cushion rails + 6 black leather pockets
    b.addBox(0, th + 0.02, -pd * 0.47, pw, 0.055, 0.12, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, th + 0.02, pd * 0.47, pw, 0.055, 0.12, { materialRole: 'primary', layer: 'body' });
    b.addBox(-pw * 0.47, th + 0.02, 0, 0.12, 0.055, pd - 0.2, { materialRole: 'primary', layer: 'body' });
    b.addBox(pw * 0.47, th + 0.02, 0, 0.12, 0.055, pd - 0.2, { materialRole: 'primary', layer: 'body' });
    for (const px of [-pw * 0.45, 0, pw * 0.45]) {
      for (const pz of [-pd * 0.45, pd * 0.45]) {
        b.addCylinder(px, th + 0.02, pz, 0.055, 0.055, 0.06, 10, 'y', 'darkMetal', 'detail');
      }
    }
    // Racked billiard balls triangle & two pool cues resting across rail
    const rackRoles = ['safetyRed', 'signalAmber', 'accent', 'warningYellow', 'darkMetal'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c <= r; c++) {
        b.addCylinder(-0.42 - r * 0.05, th + 0.026, (c - r * 0.5) * 0.055, 0.024, 0.024, 0.04, 8, 'y', rackRoles[(r + c) % rackRoles.length], 'detail');
      }
    }
    b.addCylinder(0.45, th + 0.026, 0, 0.024, 0.024, 0.04, 8, 'y', 'whiteTrim', 'detail');
    b.addPipeSegment(-0.2, th + 0.06, pd * 0.48, 0.95, th + 0.06, pd * 0.28, 0.012, 8, 'wood', 'detail');
  } else if (type === 'foosball_table') {
    const fw = clamp(w, 1.32, 1.56);
    const fd = clamp(d, 0.72, 0.88);
    const th = 0.88;
    b.addSupportLegs(0, 0, th - 0.22, fw * 0.84, fd * 0.82, 0.085, 'frame', 0);
    b.addBox(0, th - 0.12, 0, fw, 0.26, fd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, th - 0.02, 0, fw - 0.14, 0.03, fd - 0.12, { materialRole: 'foliage', layer: 'body' });
    // 6 chrome steel foosball player rods with rubber handles & blocky players
    for (let i = 0; i < 6; i++) {
      const rx = -fw * 0.38 + (i / 5) * (fw * 0.76);
      const isHome = i % 2 === 0;
      const sideOffset = isHome ? 0.14 : -0.14;
      b.addCylinder(rx, th + 0.045, sideOffset, 0.012, 0.012, fd + 0.42, 8, 'z', 'chrome', 'detail');
      b.addCylinder(rx, th + 0.045, sideOffset + (isHome ? 0.44 : -0.44), 0.024, 0.024, 0.11, 8, 'z', 'darkMetal', 'detail');
      for (const pz of [-0.16, 0, 0.16]) {
        b.addBox(rx, th + 0.03, pz, 0.028, 0.095, 0.032, { materialRole: isHome ? 'safetyRed' : 'accent', layer: 'detail' });
      }
    }
  } else if (type === 'grandfather_clock') {
    const cw = clamp(w, 0.48, 0.64);
    const cd = clamp(d, 0.34, 0.44);
    const ch = clamp(h, 1.95, 2.25);
    b.addBox(0, 0.12, 0, cw + 0.06, 0.24, cd + 0.06, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ch * 0.5, 0, cw * 0.86, ch - 0.5, cd * 0.88, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ch * 0.44, cd * 0.45, cw * 0.52, ch * 0.42, 0.016, { materialRole: 'glass', layer: 'detail' });
    // Hanging brass pendulum disc & twin chime weights inside glass door
    b.addCylinder(0, ch * 0.48, cd * 0.4, 0.008, 0.008, ch * 0.32, 6, 'y', 'brass', 'detail');
    b.addCylinder(0, ch * 0.3, cd * 0.4, 0.065, 0.065, 0.024, 12, 'z', 'brass', 'detail');
    // Clock dial face + ornate swan pediment hood
    b.addBox(0, ch - 0.24, 0, cw + 0.05, 0.48, cd + 0.05, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, ch - 0.24, cd * 0.54, cw * 0.34, cw * 0.34, 0.024, 14, 'z', 'whiteTrim', 'detail');
    b.addPrismRing(0, ch - 0.24, cd * 0.55, cw * 0.37, cw * 0.32, 0.028, 14, 'z', 'brass', 'detail');
    b.addCylinder(0, ch + 0.04, 0, 0.025, 0.035, 0.14, 10, 'y', 'brass', 'detail');
  } else if (type === 'painting_easel') {
    const ew = clamp(w, 0.65, 0.92);
    const eh = clamp(h, 1.65, 1.92);
    // Tripod A-frame wooden artist easel + angled stretched canvas with colorful artwork + shelf
    b.addBox(-0.22, eh * 0.48, 0.06, 0.04, eh, 0.04, { materialRole: 'wood', layer: 'body', rotXDeg: 10, rotZDeg: -8 });
    b.addBox(0.22, eh * 0.48, 0.06, 0.04, eh, 0.04, { materialRole: 'wood', layer: 'body', rotXDeg: 10, rotZDeg: 8 });
    b.addBox(0, eh * 0.46, -0.26, 0.04, eh * 0.95, 0.04, { materialRole: 'wood', layer: 'body', rotXDeg: -20 });
    b.addBox(0, 0.78, 0.08, ew * 0.78, 0.04, 0.1, { materialRole: 'wood', layer: 'body' });
    // Stretched art canvas + stylized painted geometric landscape
    b.addBox(0, 1.18, 0.02, ew * 0.85, 0.72, 0.032, { materialRole: 'whiteTrim', layer: 'body', rotXDeg: 10 });
    b.addBox(0, 1.28, 0.04, ew * 0.74, 0.3, 0.012, { materialRole: 'accent', layer: 'detail', rotXDeg: 10 });
    b.addBox(0, 1.06, 0.06, ew * 0.74, 0.2, 0.012, { materialRole: 'foliage', layer: 'detail', rotXDeg: 10 });
    b.addCylinder(0.14, 1.34, 0.036, 0.075, 0.075, 0.014, 10, 'z', 'signalAmber', 'detail');
  } else if (type === 'upright_piano_bench') {
    const pw = clamp(w, 1.38, 1.62);
    const pd = clamp(d, 0.56, 0.68);
    const ph = clamp(h, 1.12, 1.32);
    // Upright lacquered piano body + jutting keyboard shelf + music stand + brass pedals
    b.addChamferBox(0, ph * 0.5, -0.1, pw, ph, pd * 0.62, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.72, 0.14, pw - 0.04, 0.1, pd * 0.48, { materialRole: 'primary', layer: 'body' });
    b.addSupportLegs(0, 0, 0.68, pw - 0.18, 0.1, 0.06, 'primary', 0.26);
    // White & black piano keybed
    b.addBox(0, 0.78, 0.18, pw - 0.14, 0.026, 0.2, { materialRole: 'whiteTrim', layer: 'detail' });
    for (let k = -8; k <= 8; k++) {
      if (Math.abs(k % 7) !== 0 && Math.abs(k % 7) !== 3) {
        b.addBox(k * 0.072, 0.795, 0.14, 0.026, 0.022, 0.11, { materialRole: 'darkMetal', layer: 'detail' });
      }
    }
    b.addBox(0, 0.98, 0.06, 0.44, 0.26, 0.015, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: -14 });
    for (const bx of [-0.08, 0, 0.08]) {
      b.addBox(bx, 0.04, -0.02, 0.035, 0.02, 0.08, { materialRole: 'brass', layer: 'detail' });
    }
    // Companion padded piano bench positioned at z = +0.52
    b.addBox(0, 0.46, 0.56, pw * 0.56, 0.06, 0.34, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.5, 0.56, pw * 0.52, 0.04, 0.3, { materialRole: 'upholstery', layer: 'detail' });
    b.addSupportLegs(0, 0, 0.44, pw * 0.46, 0.24, 0.045, 'primary', 0.56);
    meta.snapAnchors.push({ id: 'pianist_bench', position: [0, 0, 0.56], normal: [0, 0, 1] });
  } else if (type === 'retro_tilt_pinball') {
    const pw = clamp(w, 0.68, 0.82);
    const pd = clamp(d, 1.25, 1.48);
    // 4 tall chrome legs + sloped pinball playfield cabinet + upright backbox marquee
    b.addSupportLegs(0, 0, 0.84, pw - 0.08, pd * 0.78, 0.042, 'chrome', 0);
    b.addBox(0, 0.96, 0.04, pw, 0.28, pd * 0.86, { materialRole: 'primary', layer: 'body', rotXDeg: 6 });
    b.addBox(0, 1.11, 0.04, pw - 0.06, 0.02, pd * 0.78, { materialRole: 'glass', layer: 'detail', rotXDeg: 6 });
    // Glowing internal playfield bumpers inside sloped cabinet
    b.addCylinder(-0.14, 1.05, -0.18, 0.055, 0.055, 0.04, 10, 'y', 'safetyRed', 'detail');
    b.addCylinder(0.14, 1.05, -0.18, 0.055, 0.055, 0.04, 10, 'y', 'signalAmber', 'detail');
    b.addCylinder(0, 1.04, -0.05, 0.065, 0.065, 0.04, 10, 'y', 'holoEnergy', 'detail');
    // Upright lit marquee backglass box
    b.addBox(0, 1.46, -pd * 0.36, pw + 0.06, 0.68, 0.24, { materialRole: 'primary', layer: 'body' });
    objCreateScreenPlane(group, 'futuristic_hud', pw - 0.04, 0.56, '#ff9f43', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.46,
      z: -pd * 0.36 + 0.125
    });
    b.addCylinder(pw * 0.32, 0.9, pd * 0.48, 0.02, 0.02, 0.09, 8, 'z', 'chrome', 'detail');
    meta.lightSources.push({ id: 'pinball_marquee', position: [0, 1.46, -pd * 0.1], color: '#ffad4d', radius: 1.5, enabled: true });
  } else if (type === 'cast_iron_safe') {
    const sw = clamp(w, 0.66, 0.92);
    const sd = clamp(d, 0.58, 0.78);
    const sh = clamp(h, 0.88, 1.32);
    b.addCasterWheels(0, 0, sw * 0.74, sd * 0.74, 0.045, 'frame', 'frame', 0);
    b.addChamferBox(0, 0.08 + (sh - 0.08) * 0.5, 0, sw, sh - 0.08, sd, 0.02, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, sh * 0.54, sd * 0.5 + 0.018, sw - 0.1, sh - 0.22, 0.035, { materialRole: 'primary', layer: 'body' });
    // Heavy hinge barrels + 3-spoke brass vault wheel + combination dial
    b.addCylinder(sw * 0.46, sh * 0.74, sd * 0.52, 0.025, 0.025, 0.12, 10, 'y', 'brass', 'detail');
    b.addCylinder(sw * 0.46, sh * 0.34, sd * 0.52, 0.025, 0.025, 0.12, 10, 'y', 'brass', 'detail');
    b.addValveWheel(-0.08, sh * 0.52, sd * 0.53, 0.11, 0.05, 'z', 'brass', 'chrome');
    b.addCylinder(0.14, sh * 0.68, sd * 0.54, 0.048, 0.048, 0.026, 12, 'z', 'chrome', 'detail');
  } else {
    // observatory_tripod_telescope
    const th = clamp(h, 1.35, 1.72);
    // 3 splayed oak tripod legs + accessory tray + brass/enamel refractor optical tube
    b.addBox(-0.24, 0.62, 0.22, 0.042, 1.24, 0.042, { materialRole: 'wood', layer: 'body', rotXDeg: -16, rotZDeg: -14 });
    b.addBox(0.24, 0.62, 0.22, 0.042, 1.24, 0.042, { materialRole: 'wood', layer: 'body', rotXDeg: -16, rotZDeg: 14 });
    b.addBox(0, 0.62, -0.3, 0.042, 1.24, 0.042, { materialRole: 'wood', layer: 'body', rotXDeg: 20 });
    b.addCylinder(0, 0.66, 0, 0.14, 0.14, 0.025, 10, 'y', 'frame', 'detail');
    b.addCylinder(0, 1.24, 0, 0.065, 0.075, 0.16, 10, 'y', 'darkMetal', 'body');
    // Angled telescope barrel pointing up (+32 deg pitch)
    b.addBox(0, th * 0.88, 0, 0.11, 0.11, 0.96, { materialRole: 'primary', layer: 'body', rotXDeg: -32 });
    b.addBox(0, th * 0.88 + 0.25, 0.42, 0.125, 0.125, 0.18, { materialRole: 'brass', layer: 'detail', rotXDeg: -32 });
    b.addCylinder(0, th * 0.88 - 0.25, -0.44, 0.024, 0.024, 0.14, 8, 'y', 'darkMetal', 'detail');
  }

  meta.interaction = { interactable: true, actionType: type };
}

export function registerTradesCubiclesAndSimsMiscFamilies() {
  registerObjectFamily({
    id: 'cubicle_job_workstation_kit',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors'],
    subcategory: 'Cubicles & Office Partitions',
    subcategories: [
      'Cubicles & Office Partitions',
      'Desktop Accessories',
      'Breakrooms & Employee Amenities',
      'Filing, Storage & Mailrooms',
      'Office Chairs & Seating'
    ],
    label: 'Cubicle Job, Call Center & Mailroom Props',
    description: 'Acoustic call center phone carrels, overworked paperwork piles, cubicle hanging organizers, mailroom parcel carts, watercooler bulletin nooks, celebration cake carts, and yoga-ball chairs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['call_center', 'office', 'breakroom', 'coworking'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['cubicle', 'call_center', 'paperwork', 'mailroom', 'watercooler', 'cake_cart', 'yoga_ball'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Cubicle Job Prop' },
      {
        key: 'kitType',
        name: 'Office Kit Type',
        type: 'select',
        options: [
          ['call_center_carrel', 'Call Center Acoustic Phone Carrel'],
          ['paper_stack_kit', 'Overworked Inbox Paperwork Stack'],
          ['cubicle_memo_rack', 'Cubicle Hanging Memo & File Rack'],
          ['mailroom_parcel_cart', 'Rolling Mailroom Parcel Cart'],
          ['watercooler_bulletin_nook', 'Watercooler & Noticeboard Nook'],
          ['celebration_cake_cart', 'Office Birthday Sheet Cake Cart'],
          ['ergonomic_ball_chair_footrest', 'Stability Ball Chair & Footrest']
        ],
        default: 'call_center_carrel'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.36, max: 1.85, step: 0.05, unit: 'm', default: 1.28 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.14, max: 1.25, step: 0.04, unit: 'm', default: 0.86 },
      { key: 'height', name: 'Height', type: 'number', min: 0.28, max: 1.85, step: 0.04, unit: 'm', default: 1.48 }
    ],
    presets: [
      {
        id: 'call_center_phone_carrel',
        label: 'Call Center Acoustic Phone Carrel',
        subcategory: 'Cubicles & Office Partitions',
        paletteFamily: 'budget_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d4cec2',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#56697a',
        accentColor: '#3687c4',
        frameColor: '#2c333b',
        params: { kitType: 'call_center_carrel', width: 1.25, depth: 0.84, height: 1.48 }
      },
      {
        id: 'overworked_paper_stack_kit',
        label: 'Tabletop Overflowing Paperwork & Inbox',
        subcategory: 'Desktop Accessories',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#adb6bf',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f2f0e6',
        accentColor: '#3b73a8',
        frameColor: '#252a30',
        params: { kitType: 'paper_stack_kit', width: 0.62, depth: 0.4, height: 0.32 }
      },
      {
        id: 'cubicle_hanging_memo_organizer',
        label: 'Cubicle Wall Hanging Memo & Pocket Organizer',
        subcategory: 'Cubicles & Office Partitions',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#5d6b78',
        secondaryMaterial: 'plastic',
        secondaryColor: '#384654',
        accentColor: '#3ec7e8',
        frameColor: '#252c34',
        params: { kitType: 'cubicle_memo_rack', width: 0.92, height: 0.52 }
      },
      {
        id: 'rolling_mailroom_parcel_cart',
        label: 'Rolling Wire Mailroom & Parcel Cart',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'industrial_loft_office',
        condition: 'lightly_worn',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#58697a',
        accentColor: '#2e6a9c',
        frameColor: '#252b30',
        params: { kitType: 'mailroom_parcel_cart', width: 0.64, depth: 1.02, height: 1.06 }
      },
      {
        id: 'office_watercooler_bulletin_nook',
        label: 'Watercooler & Cork Noticeboard Nook',
        subcategory: 'Breakrooms & Employee Amenities',
        paletteFamily: 'budget_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e4e8ec',
        secondaryMaterial: 'wood',
        secondaryColor: '#b38352',
        accentColor: '#36749e',
        frameColor: '#303840',
        params: { kitType: 'watercooler_bulletin_nook', width: 1.38, depth: 0.52, height: 1.72 }
      },
      {
        id: 'office_celebration_cake_cart',
        label: 'Breakroom Birthday Sheet Cake Cart',
        subcategory: 'Breakrooms & Employee Amenities',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#d0d8e0',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f5f2eb',
        accentColor: '#cf426e',
        frameColor: '#262d36',
        params: { kitType: 'celebration_cake_cart', width: 0.7, depth: 0.94, height: 0.96 }
      },
      {
        id: 'ergonomic_ball_chair_footrest',
        label: 'Ergonomic Stability Ball Chair & Footrest',
        subcategory: 'Office Chairs & Seating',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'rubber',
        primaryColor: '#24292e',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#48525c',
        accentColor: '#2ea68d',
        frameColor: '#1d2229',
        params: { kitType: 'ergonomic_ball_chair_footrest', width: 0.62, depth: 0.72, height: 0.64 }
      }
    ],
    buildGeometry: tcsmBuildCubicleJobProp
  });

  registerObjectFamily({
    id: 'electrician_repair_equipment',
    categoryId: '26_trades_plumbing_electrical',
    categories: ['26_trades_plumbing_electrical', '03_utilities', 'office_public_interiors'],
    subcategory: 'Electrical Panels & Distribution',
    subcategories: [
      'Electrical Panels & Distribution',
      'Repair Tools, Ladders & Carts',
      'Interior Building Infrastructure'
    ],
    label: 'Electrician Panels, Spool Carts & High-Voltage Gear',
    description: 'Open circuit breaker panels with copper bus bars, rolling multi-wire spool carts, switchgear cabinets, fiberglass ladders, jobsite spider floodlight boxes, and overhead cable trays.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'both',
    environmentTags: ['electrical_room', 'utility_room', 'industrial_interior'],
    architecturalStyle: 'industrial',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['electrician', 'breaker', 'wire_spool', 'switchgear', 'ladder', 'spider_box', 'cable_tray', 'mep'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Electrical & Trade Gear' },
      {
        key: 'equipType',
        name: 'Electrical Unit',
        type: 'select',
        options: [
          ['open_circuit_breaker_panel', 'Open Circuit Breaker Panel'],
          ['wire_spool_cart', 'Electrician Wire Spool Cart'],
          ['switchgear_cabinet', 'High-Voltage Switchgear Cabinet'],
          ['fiberglass_step_ladder', 'Fiberglass Electrician Step Ladder'],
          ['spider_box_light', 'Jobsite Spider Box & Work Light'],
          ['overhead_cable_tray', 'Overhead Ladder Cable Tray']
        ],
        default: 'open_circuit_breaker_panel'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.45, max: 2.25, step: 0.05, unit: 'm', default: 0.88 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.16, max: 1.15, step: 0.04, unit: 'm', default: 0.56 },
      { key: 'height', name: 'Height', type: 'number', min: 0.65, max: 2.45, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'signText', name: 'Safety Placard', type: 'text', default: 'High Voltage' }
    ],
    presets: [
      {
        id: 'open_circuit_breaker_panel',
        label: 'Open Main Circuit Breaker Panel & Copper Bus',
        subcategory: 'Electrical Panels & Distribution',
        attachmentProfile: 'wall_mounted',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#69747e',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#7f8a94',
        accentColor: '#e0a124',
        frameColor: '#252a30',
        params: { equipType: 'open_circuit_breaker_panel', width: 0.68, height: 1.05 }
      },
      {
        id: 'electrician_wire_spool_cart',
        label: 'Rolling 4-Spool Thhn Wire Caddy Cart',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'plastic',
        primaryColor: '#336791',
        secondaryMaterial: 'wood',
        secondaryColor: '#9e7248',
        accentColor: '#e07b28',
        frameColor: '#262b30',
        params: { equipType: 'wire_spool_cart', width: 0.8, height: 1.18 }
      },
      {
        id: 'high_voltage_switchgear_cabinet',
        label: 'Industrial High-Voltage Switchgear Enclosure',
        subcategory: 'Electrical Panels & Distribution',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#5c6670',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#6f7b87',
        accentColor: '#e8b228',
        frameColor: '#22272c',
        params: { equipType: 'switchgear_cabinet', width: 1.48, depth: 0.82, height: 2.08, signText: 'High Voltage 480v' }
      },
      {
        id: 'fiberglass_electrician_step_ladder',
        label: '6-Foot Insulated Fiberglass Step Ladder',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'plastic',
        primaryColor: '#e8b228',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#2e6a9c',
        frameColor: '#23282e',
        params: { equipType: 'fiberglass_step_ladder', width: 0.66, height: 1.85 }
      },
      {
        id: 'jobsite_power_spider_box_light',
        label: 'Jobsite Power Spider Box & Flood Tower',
        subcategory: 'Electrical Panels & Distribution',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e8b228',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#cf342b',
        frameColor: '#21262c',
        params: { equipType: 'spider_box_light', width: 0.62, depth: 0.58, height: 1.92 }
      },
      {
        id: 'overhead_cable_tray_conduit_run',
        label: 'Wall-Bracketed Cable Ladder Tray & Conduits',
        subcategory: 'Electrical Panels & Distribution',
        attachmentProfile: 'wall_mounted',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#98a3ad',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#48525c',
        accentColor: '#36749e',
        frameColor: '#2c3238',
        params: { equipType: 'overhead_cable_tray', width: 1.85 }
      }
    ],
    buildGeometry: tcsmBuildElectricianEquipment
  });

  registerObjectFamily({
    id: 'plumbing_hvac_repair_equipment',
    categoryId: '26_trades_plumbing_electrical',
    categories: ['26_trades_plumbing_electrical', '03_utilities', 'office_public_interiors'],
    subcategory: 'Plumbing, Boilers & Pumps',
    subcategories: [
      'Plumbing, Boilers & Pumps',
      'Repair Tools, Ladders & Carts',
      'Interior Building Infrastructure'
    ],
    label: 'Plumbing, Water Heaters, Pipe Vises & Tool Chests',
    description: 'Commercial gas water heaters with copper manifolds, motorized drum drain snakes, tripod chain pipe vises, duplex booster pump skids, oxy-acetylene brazing carts, rolling red tool chests, and shop vacs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    environmentTags: ['plumbing_mechanical', 'utility_room', 'industrial_interior'],
    architecturalStyle: 'industrial',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['plumbing', 'water_heater', 'drain_snake', 'pipe_vise', 'sump_pump', 'welding', 'tool_chest', 'shop_vac'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Plumbing & Repair Unit' },
      {
        key: 'plumbType',
        name: 'Plumbing / Shop Unit',
        type: 'select',
        options: [
          ['commercial_water_heater_manifold', 'Commercial Water Heater & Copper Manifold'],
          ['motorized_drain_snake', 'Motorized Drum Drain Snake'],
          ['tripod_pipe_vise', 'Tripod Chain Pipe Vise & Threader'],
          ['booster_sump_skid', 'Duplex Booster Pump Skid'],
          ['brazing_torch_cart', 'Oxy-Acetylene Brazing Torch Cart'],
          ['rolling_tool_chest', 'Rolling 6-Drawer Mechanic Tool Chest'],
          ['industrial_wet_dry_shop_vacuum', 'Industrial Wet-Dry Shop Vacuum']
        ],
        default: 'commercial_water_heater_manifold'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.44, max: 1.85, step: 0.05, unit: 'm', default: 1.05 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.4, max: 1.35, step: 0.04, unit: 'm', default: 0.78 },
      { key: 'height', name: 'Height', type: 'number', min: 0.65, max: 2.35, step: 0.05, unit: 'm', default: 1.78 }
    ],
    presets: [
      {
        id: 'commercial_water_heater_manifold',
        label: 'Commercial Boiler Water Heater & Copper Riser',
        subcategory: 'Plumbing, Boilers & Pumps',
        locationContext: 'interior',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#4c5e70',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#8d969e',
        accentColor: '#2e6a9c',
        frameColor: '#252a30',
        params: { plumbType: 'commercial_water_heater_manifold', width: 0.96, height: 1.85 }
      },
      {
        id: 'motorized_drum_drain_snake',
        label: 'Motorized Drum Sewer Drain Auger Cart',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf342b',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#e0a124',
        frameColor: '#23272c',
        params: { plumbType: 'motorized_drain_snake', width: 0.62, depth: 0.76 }
      },
      {
        id: 'tripod_chain_pipe_vise_rig',
        label: 'Plumber Tripod Chain Pipe Vise & Pipe',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#d95826',
        secondaryMaterial: 'cast_iron',
        secondaryColor: '#2c3238',
        accentColor: '#cf342b',
        frameColor: '#21262c',
        params: { plumbType: 'tripod_pipe_vise', width: 1.08, height: 0.96 }
      },
      {
        id: 'duplex_booster_sump_pump_skid',
        label: 'Mechanical Room Duplex Booster Pump Skid',
        subcategory: 'Plumbing, Boilers & Pumps',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#365878',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#7b858f',
        accentColor: '#2d6847',
        frameColor: '#20262b',
        params: { plumbType: 'booster_sump_skid', width: 1.18, depth: 0.82 }
      },
      {
        id: 'brazing_torch_welding_cylinder_cart',
        label: 'Oxy-Acetylene Pipe Brazing Torch Cart',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2a6b49',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#8f2e28',
        accentColor: '#e0a124',
        frameColor: '#24292e',
        params: { plumbType: 'brazing_torch_cart', width: 0.56, depth: 0.52 }
      },
      {
        id: 'rolling_multi_drawer_tool_chest',
        label: 'Rolling 6-Drawer Steel Mechanic Tool Chest',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'interior',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c9342b',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#d6dde4',
        accentColor: '#21262c',
        frameColor: '#1c2026',
        params: { plumbType: 'rolling_tool_chest', width: 1.12, depth: 0.54, height: 1.06 }
      },
      {
        id: 'industrial_wet_dry_shop_vacuum',
        label: 'Heavy Duty Wet-Dry Contractor Shop Vac',
        subcategory: 'Repair Tools, Ladders & Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'plastic',
        primaryColor: '#c93a2e',
        secondaryMaterial: 'plastic',
        secondaryColor: '#262b30',
        accentColor: '#e8b228',
        frameColor: '#1f2328',
        params: { plumbType: 'industrial_wet_dry_shop_vacuum', width: 0.54, depth: 0.56, height: 0.82 }
      }
    ],
    buildGeometry: tcsmBuildPlumbingHvacEquipment
  });

  registerObjectFamily({
    id: 'sims_recreation_misc_prop',
    categoryId: '27_sims_everyday_misc',
    categories: ['27_sims_everyday_misc', 'office_public_interiors'],
    subcategory: 'Game Room & Breakroom Fun',
    subcategories: [
      'Game Room & Breakroom Fun',
      'Hobbies, Music & Arts',
      'Lobbies, Decor & Collectibles',
      'Office Decorations & Miscellaneous Props',
      'Breakrooms & Employee Amenities'
    ],
    label: 'Everyday, Recreation & Sims-Inspired Props',
    description: 'Panoramic illuminated tropical aquariums, retro neon jukeboxes, billiards pool tables, foosball tables, grandfather clocks, artist easels, upright pianos, pinball machines, iron safes, and telescopes.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['recreation_room', 'breakroom', 'lobby', 'residential_interior', 'office'],
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'decorative',
    tags: ['sims', 'aquarium', 'jukebox', 'pool_table', 'foosball', 'clock', 'easel', 'piano', 'pinball', 'safe', 'telescope'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Everyday & Recreation Prop' },
      {
        key: 'recreationType',
        name: 'Object Type',
        type: 'select',
        options: [
          ['panoramic_tropical_aquarium', 'Panoramic Tropical Fish Aquarium'],
          ['retro_neon_bubble_jukebox', 'Retro Neon Bubble Jukebox'],
          ['billiards_pool_table', 'Breakroom Felt Billiards Pool Table'],
          ['foosball_table', 'Rec-Room Arcade Foosball Table'],
          ['grandfather_clock', 'Heritage Brass Grandfather Clock'],
          ['painting_easel', 'Artist Tripod Canvas Easel'],
          ['upright_piano_bench', 'Classic Upright Piano & Bench'],
          ['retro_tilt_pinball', 'Retro Tilted Marquee Pinball'],
          ['cast_iron_safe', 'Cast-Iron Vault Combination Safe'],
          ['observatory_tripod_telescope', 'Observatory Refractor Telescope']
        ],
        default: 'panoramic_tropical_aquarium'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.48, max: 2.55, step: 0.05, unit: 'm', default: 1.65 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.34, max: 1.48, step: 0.04, unit: 'm', default: 0.62 },
      { key: 'height', name: 'Height', type: 'number', min: 0.76, max: 2.25, step: 0.05, unit: 'm', default: 1.56 }
    ],
    presets: [
      {
        id: 'panoramic_tropical_aquarium',
        label: 'Lit Panoramic Lobby Fish Aquarium',
        subcategory: 'Lobbies, Decor & Collectibles',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'new',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#452b1c',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#5c3b27',
        accentColor: '#4de2ff',
        frameColor: '#1f252b',
        params: { recreationType: 'panoramic_tropical_aquarium', width: 1.85, depth: 0.58, height: 1.54 }
      },
      {
        id: 'retro_neon_bubble_jukebox',
        label: 'Retro Neon Arch Bubble Jukebox',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8c4b27',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#d9e0e6',
        accentColor: '#ffb84d',
        frameColor: '#261e18',
        params: { recreationType: 'retro_neon_bubble_jukebox', width: 0.94, depth: 0.64, height: 1.58 }
      },
      {
        id: 'breakroom_billiards_pool_table',
        label: 'Office Breakroom Mahogany Billiards Table',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#59321c',
        secondaryMaterial: 'wood',
        secondaryColor: '#754326',
        accentColor: '#368049',
        frameColor: '#241710',
        params: { recreationType: 'billiards_pool_table', width: 2.28, depth: 1.32, height: 0.84 }
      },
      {
        id: 'rec_room_foosball_table',
        label: 'Employee Lounge Chrome-Rod Foosball Table',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#2d3742',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#3891cf',
        frameColor: '#1c2128',
        params: { recreationType: 'foosball_table', width: 1.44, depth: 0.8, height: 0.92 }
      },
      {
        id: 'heritage_grandfather_clock',
        label: 'Heritage Walnut & Brass Grandfather Clock',
        subcategory: 'Lobbies, Decor & Collectibles',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#54301b',
        secondaryMaterial: 'brass',
        secondaryColor: '#c99a3a',
        accentColor: '#c49a3c',
        frameColor: '#261810',
        params: { recreationType: 'grandfather_clock', width: 0.56, depth: 0.38, height: 2.12 }
      },
      {
        id: 'studio_painting_easel_canvas',
        label: 'Studio Oak Tripod Easel & Painted Canvas',
        subcategory: 'Hobbies, Music & Arts',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#a8784c',
        secondaryMaterial: 'wood',
        secondaryColor: '#f2eee4',
        accentColor: '#3b82b8',
        frameColor: '#4d3522',
        params: { recreationType: 'painting_easel', width: 0.78, depth: 0.68, height: 1.78 }
      },
      {
        id: 'classic_upright_piano_bench',
        label: 'Classic Upright Acoustic Piano & Bench',
        subcategory: 'Hobbies, Music & Arts',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#3b2114',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#522929',
        accentColor: '#c49a3c',
        frameColor: '#1f120b',
        params: { recreationType: 'upright_piano_bench', width: 1.48, depth: 0.62, height: 1.22 }
      },
      {
        id: 'retro_tilt_pinball_machine',
        label: 'Breakroom Retro Tilted Marquee Pinball',
        subcategory: 'Game Room & Breakroom Fun',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2d4b7a',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#f5b836',
        frameColor: '#1d222b',
        params: { recreationType: 'retro_tilt_pinball', width: 0.74, depth: 1.36, height: 1.78 }
      },
      {
        id: 'cast_iron_combination_safe',
        label: 'Heavy Cast-Iron Brass-Wheel Vault Safe',
        subcategory: 'Lobbies, Decor & Collectibles',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'cast_iron',
        primaryColor: '#2d353d',
        secondaryMaterial: 'brass',
        secondaryColor: '#c99a3a',
        accentColor: '#c99a3a',
        frameColor: '#1e2329',
        params: { recreationType: 'cast_iron_safe', width: 0.78, depth: 0.66, height: 1.08 }
      },
      {
        id: 'observatory_tripod_telescope',
        label: 'Brass & Oak Refractor Stargazing Telescope',
        subcategory: 'Hobbies, Music & Arts',
        locationContext: 'both',
        paletteFamily: 'classic_executive',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#edf1f5',
        secondaryMaterial: 'wood',
        secondaryColor: '#7d502d',
        accentColor: '#c99a3a',
        frameColor: '#252b30',
        params: { recreationType: 'observatory_tripod_telescope', width: 0.78, depth: 0.78, height: 1.58 }
      }
    ],
    buildGeometry: tcsmBuildSimsRecreationProp
  });
}
