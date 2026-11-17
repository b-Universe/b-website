import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function ricBuildResidentialEntry(group, cfg, b, mats, meta) {
  const style = cfg.fixtureStyle || 'intercom_buzzer_panel';
  const w = clamp(cfg.width || 0.34, 0.22, 1.8);
  const h = clamp(cfg.height || 0.48, 0.26, 3.2);
  const d = clamp(cfg.depth || 0.14, 0.1, 1.1);
  const isWall = cfg.attachmentProfile === 'wall_mounted';
  const zBase = isWall ? d * 0.5 : 0;

  if (style === 'intercom_buzzer_panel') {
    b.addBox(0, 0, zBase * 0.4, w + 0.04, h + 0.04, 0.025, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, 0, zBase, w, h, d * 0.75, 0.015, { materialRole: 'secondary', layer: 'body' });
    const rows = Math.max(2, Math.round(cfg.buttonRows || 4));
    const cols = Math.max(1, Math.round(cfg.buttonCols || 2));
    const frontZ = zBase + d * 0.4;
    b.addBox(0, h * 0.28, frontZ, w * 0.62, h * 0.18, 0.015, { materialRole: 'darkMetal', layer: 'detail' });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = -w * 0.26 + (cols > 1 ? (c / (cols - 1)) * w * 0.52 : w * 0.26);
        const by = h * 0.08 - r * (h * 0.48 / rows);
        b.addBox(bx, by, frontZ, 0.032, 0.018, 0.014, { materialRole: 'brass', layer: 'detail' });
      }
    }
    meta.interaction = { interactable: true, actionType: 'ring_intercom', buzzerCount: rows * cols };
    return;
  }

  if (style === 'exterior_ac_condenser') {
    const cy = isWall ? 0 : h * 0.5 + 0.06;
    if (cfg.wallBrackets && isWall) {
      b.addBox(-w * 0.36, -h * 0.48, d * 0.48, 0.05, 0.05, d * 0.95, { materialRole: 'frame', layer: 'body' });
      b.addBox(w * 0.36, -h * 0.48, d * 0.48, 0.05, 0.05, d * 0.95, { materialRole: 'frame', layer: 'body' });
      b.addBox(-w * 0.36, -h * 0.65, 0.03, 0.05, 0.36, 0.05, { materialRole: 'frame', layer: 'detail' });
      b.addBox(w * 0.36, -h * 0.65, 0.03, 0.05, 0.36, 0.05, { materialRole: 'frame', layer: 'detail' });
    } else if (!isWall) {
      b.addBox(0, 0.03, 0, w + 0.1, 0.06, d + 0.1, { materialRole: 'concrete', layer: 'body' });
    }
    b.addChamferBox(0, cy, zBase, w, h, d, 0.02, { materialRole: 'primary', layer: 'body' });
    const fanR = Math.min(w, h) * 0.35;
    const fz = zBase + d * 0.5 + 0.015;
    b.addPrismRing(-w * 0.12, cy, fz, fanR, fanR * 0.85, 0.03, 12, 'z', 'frame', 'detail');
    const blades = Math.max(4, Math.round(cfg.fanGrilleBlades || 6));
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2;
      b.addBox(
        -w * 0.12 + Math.cos(a) * fanR * 0.44,
        cy + Math.sin(a) * fanR * 0.44,
        fz - 0.005,
        fanR * 0.72,
        0.028,
        0.012,
        { materialRole: 'darkMetal', layer: 'detail', rotZ: a }
      );
    }
    b.addBox(w * 0.32, cy, fz, w * 0.22, h * 0.75, 0.018, { materialRole: 'secondary', layer: 'detail' });
    return;
  }

  if (style === 'security_camera_mount') {
    b.addCylinder(0, 0, 0.02, 0.08, 0.09, 0.04, 10, 'z', 'frame', 'body');
    b.addBox(0, 0, 0.14, 0.055, 0.055, 0.24, { materialRole: 'frame', layer: 'body' });
    const tilt = degToRad(clamp(cfg.cameraTiltDeg ?? -22, -45, 20));
    b.addCylinder(0, -0.02, 0.28, 0.075, 0.068, 0.26, 8, 'z', 'primary', 'body');
    b.addBox(0, 0.04, 0.3, 0.17, 0.04, 0.28, { materialRole: 'secondary', layer: 'detail', rotX: tilt });
    b.addCylinder(0, -0.02, 0.42, 0.05, 0.05, 0.03, 8, 'z', 'glass', 'detail');
    b.addBox(0.04, 0.01, 0.42, 0.022, 0.022, 0.02, { materialRole: 'safetyRed', layer: 'detail' });
    return;
  }

  if (style === 'fire_escape_ladder') {
    const ladH = Math.max(1.8, h);
    const ladW = Math.max(0.45, Math.min(w, 0.72));
    b.addBox(-ladW * 0.5, ladH * 0.5, 0.18, 0.045, ladH, 0.045, { materialRole: 'frame', layer: 'body' });
    b.addBox(ladW * 0.5, ladH * 0.5, 0.18, 0.045, ladH, 0.045, { materialRole: 'frame', layer: 'body' });
    const rungs = Math.max(5, Math.round(ladH / 0.3));
    for (let i = 0; i < rungs; i++) {
      const ry = 0.25 + (i / Math.max(1, rungs - 1)) * (ladH - 0.45);
      b.addCylinder(0, ry, 0.18, 0.016, 0.016, ladW, 6, 'x', 'frame', 'body');
    }
    b.addBox(-ladW * 0.5, ladH * 0.25, 0.09, 0.04, 0.04, 0.18, { materialRole: 'frame', layer: 'detail' });
    b.addBox(ladW * 0.5, ladH * 0.25, 0.09, 0.04, 0.04, 0.18, { materialRole: 'frame', layer: 'detail' });
    b.addBox(-ladW * 0.5, ladH * 0.78, 0.09, 0.04, 0.04, 0.18, { materialRole: 'frame', layer: 'detail' });
    b.addBox(ladW * 0.5, ladH * 0.78, 0.09, 0.04, 0.04, 0.18, { materialRole: 'frame', layer: 'detail' });
    return;
  }

  if (style === 'door_canopy_hood') {
    b.addTrapezoidBox(0, 0, d * 0.5, w, d, w, d * 0.2, h * 0.45, { materialRole: 'primary', layer: 'body', topOffsetZ: -d * 0.4 });
    b.addBox(-w * 0.44, -h * 0.25, d * 0.36, 0.045, 0.045, d * 0.7, { materialRole: 'frame', layer: 'detail', rotXDeg: 32 });
    b.addBox(w * 0.44, -h * 0.25, d * 0.36, 0.045, 0.045, d * 0.7, { materialRole: 'frame', layer: 'detail', rotXDeg: 32 });
    return;
  }

  // Porch planter urn
  b.addBox(0, 0.06, 0, w * 0.6, 0.12, w * 0.6, { materialRole: 'concrete', layer: 'body' });
  b.addCylinder(0, 0.32, 0, w * 0.34, w * 0.22, 0.4, 10, 'y', 'concrete', 'body');
  b.addCylinder(0, 0.64, 0, w * 0.28, w * 0.34, 0.26, 8, 'y', 'foliage', 'detail');
}

function ricBuildIndustrialCargo(group, cfg, b, mats, meta) {
  const style = cfg.cargoStyle || 'wooden_pallet_stack';
  const w = clamp(cfg.width || 1.2, 0.36, 1.85);
  const h = clamp(cfg.height || 0.75, 0.18, 2.35);
  const d = clamp(cfg.depth || 1.0, 0.36, 2.45);
  const stack = Math.max(1, Math.round(cfg.stackCount || 3));

  if (style === 'wooden_pallet_stack') {
    const palH = 0.15;
    for (let s = 0; s < stack; s++) {
      const py = s * palH;
      for (const rz of [-d * 0.42, 0, d * 0.42]) {
        b.addBox(0, py + 0.015, rz, w, 0.03, 0.1, { materialRole: 'wood', layer: 'body' });
        for (const rx of [-w * 0.42, 0, w * 0.42]) {
          b.addBox(rx, py + 0.068, rz, 0.1, 0.08, 0.1, { materialRole: 'wood', layer: 'body' });
        }
      }
      b.addSlattedArray(0, py + 0.125, 0, d * 0.88, Math.max(4, Math.round(cfg.slatCount || 5)), w, 0.025, 0.1, 'z', 'wood', 'body');
    }
    return;
  }

  if (style === 'slatted_shipping_crate') {
    b.addBox(0, h * 0.5, 0, w - 0.06, h - 0.06, d - 0.06, { materialRole: 'wood', layer: 'body' });
    const fT = 0.06;
    b.addSupportLegs(0, 0, h, w - fT, d - fT, fT, 'wood');
    b.addBox(0, fT * 0.5, d * 0.5, w, fT, fT, { materialRole: 'wood', layer: 'detail' });
    b.addBox(0, h - fT * 0.5, d * 0.5, w, fT, fT, { materialRole: 'wood', layer: 'detail' });
    b.addBox(0, h * 0.5, d * 0.5, Math.hypot(w, h) * 0.85, fT, fT * 0.7, {
      materialRole: 'wood',
      layer: 'detail',
      rotZ: Math.atan2(h, w)
    });
    if (cfg.hazardSymbol) {
      const dia = Math.min(w, h) * 0.34;
      for (const side of [1, -1]) {
        const pz = side * (d * 0.5 + 0.01);
        b.addBox(0, h * 0.5, pz, dia, dia, 0.012, { materialRole: 'darkMetal', layer: 'detail', rotZDeg: 45 });
        b.addBox(0, h * 0.5, pz + side * 0.004, dia * 0.84, dia * 0.84, 0.01, { materialRole: 'warningYellow', layer: 'detail', rotZDeg: 45 });
        b.addBox(0, h * 0.5, pz + side * 0.008, dia * 0.14, dia * 0.44, 0.01, { materialRole: 'safetyRed', layer: 'detail' });
        b.addBox(0, h * 0.5 - dia * 0.28, pz + side * 0.008, dia * 0.14, dia * 0.12, 0.01, { materialRole: 'safetyRed', layer: 'detail' });
      }
      for (const sx of [1, -1]) {
        const px = sx * (w * 0.5 + 0.01);
        b.addBox(px, h * 0.5, 0, 0.012, dia, dia, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 45 });
        b.addBox(px + sx * 0.004, h * 0.5, 0, 0.01, dia * 0.84, dia * 0.84, { materialRole: 'warningYellow', layer: 'detail', rotXDeg: 45 });
      }
    }
    if (cfg.tarpCover) {
      b.addTrapezoidBox(0, h + 0.05, 0, w + 0.06, d + 0.06, w * 0.94, d * 0.94, 0.12, { materialRole: 'fabric', layer: 'detail' });
    }
    return;
  }

  if (style === 'steel_cargo_drums') {
    const drumCount = Math.min(4, Math.max(1, stack));
    const r = Math.min(w, d) * 0.24;
    const drumH = Math.max(0.75, Math.min(1.05, h));
    const coords = drumCount === 1
      ? [[0, 0]]
      : drumCount === 2
        ? [[-r * 1.15, 0], [r * 1.15, 0]]
        : [[-r * 1.15, -r * 1.1], [r * 1.15, -r * 1.1], [0, r * 1.1]];
    const ribs = Math.max(2, Math.round(cfg.drumRibs || 3));
    for (let i = 0; i < coords.length; i++) {
      const [dx, dz] = coords[i];
      const role = i % 2 === 0 ? 'primary' : 'accent';
      b.addCylinder(dx, drumH * 0.5, dz, r, r, drumH, 12, 'y', role, 'body');
      for (let rb = 0; rb < ribs; rb++) {
        const ry = drumH * (0.18 + (rb / (ribs - 1)) * 0.64);
        b.addCylinder(dx, ry, dz, r * 1.06, r * 1.06, 0.035, 12, 'y', 'frame', 'detail');
      }
    }
    return;
  }

  if (style === 'hand_truck_dolly') {
    b.addCylinder(-w * 0.4, 0.14, -d * 0.2, 0.14, 0.14, 0.06, 10, 'x', 'rubber', 'body');
    b.addCylinder(w * 0.4, 0.14, -d * 0.2, 0.14, 0.14, 0.06, 10, 'x', 'rubber', 'body');
    b.addBox(0, 0.04, d * 0.15, w * 0.72, 0.04, d * 0.45, { materialRole: 'frame', layer: 'body' });
    b.addBox(-w * 0.34, h * 0.55, -d * 0.1, 0.045, h, 0.045, { materialRole: 'primary', layer: 'body', rotXDeg: -10 });
    b.addBox(w * 0.34, h * 0.55, -d * 0.1, 0.045, h, 0.045, { materialRole: 'primary', layer: 'body', rotXDeg: -10 });
    b.addBox(0, h * 0.98, -d * 0.19, w * 0.72, 0.045, 0.045, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.28, d * 0.12, w * 0.54, 0.42, 0.38, { materialRole: 'wood', layer: 'detail' });
    return;
  }

  if (style === 'cable_wooden_reel') {
    const reelR = Math.min(h, d) * 0.48;
    const reelW = w * 0.62;
    const fillMap = { sparse: 0.36, half: 0.62, full: 0.88 };
    const fillFactor = fillMap[cfg.spoolFill] || 0.78;
    const wireR = reelR * fillFactor;
    const wireRole = cfg.spoolFill === 'full' ? 'copper' : 'rubber';
    b.addCylinder(-reelW * 0.5, reelR, 0, reelR, reelR, 0.07, 12, 'x', 'wood', 'body');
    b.addCylinder(reelW * 0.5, reelR, 0, reelR, reelR, 0.07, 12, 'x', 'wood', 'body');
    // Inner wooden drum core visible on low-fill spools
    b.addCylinder(0, reelR, 0, reelR * 0.28, reelR * 0.28, reelW - 0.05, 10, 'x', 'wood', 'body');
    // Wound cable mass + textured rib rings
    b.addCylinder(0, reelR, 0, wireR, wireR, reelW - 0.07, 12, 'x', wireRole, 'body');
    const coilRings = cfg.spoolFill === 'sparse' ? 3 : cfg.spoolFill === 'half' ? 5 : 7;
    for (let i = 0; i < coilRings; i++) {
      const rx = -reelW * 0.36 + (i / Math.max(1, coilRings - 1)) * (reelW * 0.72);
      b.addCylinder(rx, reelR, 0, wireR * 1.03, wireR * 1.03, 0.04, 12, 'x', 'frame', 'detail');
    }
    // Axle arbor hole & hub
    b.addCylinder(0, reelR, 0, reelR * 0.16, reelR * 0.16, reelW + 0.06, 8, 'x', 'frame', 'detail');
    // Trailing loose cable tail on the ground
    b.addPipeSegment(0, reelR - wireR * 0.85, wireR * 0.35, reelW * 0.55, 0.025, reelR * 0.75, 0.02, 8, wireRole, 'detail', true);
    return;
  }

  if (style === 'insulation_metal_roll') {
    const isMetal = cfg.rollVariant === 'plate_metal';
    const count = Math.min(3, Math.max(1, stack));
    const rad = Math.min(h, d) * 0.42;
    const len = w * 0.88;
    const rollRole = isMetal ? 'chrome' : 'accent';
    for (let i = 0; i < count; i++) {
      const rz = count === 1 ? 0 : (-0.5 + i / (count - 1)) * (d * 0.55);
      const chockW = len * 0.82;
      b.addBox(0, 0.045, rz - rad * 0.52, chockW, 0.09, 0.09, { materialRole: 'wood', layer: 'body' });
      b.addBox(0, 0.045, rz + rad * 0.52, chockW, 0.09, 0.09, { materialRole: 'wood', layer: 'body' });
      const cy = 0.06 + rad;
      if (isMetal) {
        b.addPrismRing(0, cy, rz, rad, rad * 0.38, len, 14, 'x', 'chrome', 'body');
        for (const sx of [-len * 0.32, 0, len * 0.32]) {
          b.addPrismRing(sx, cy, rz, rad * 1.025, rad * 0.96, 0.03, 14, 'x', 'darkMetal', 'detail');
        }
      } else {
        b.addCylinder(0, cy, rz, rad, rad, len, 12, 'x', rollRole, 'body');
        b.addCylinder(0, cy, rz, rad * 0.22, rad * 0.22, len + 0.02, 8, 'x', 'wood', 'detail');
        for (const sx of [-len * 0.32, len * 0.32]) {
          b.addCylinder(sx, cy, rz, rad * 1.03, rad * 1.03, 0.04, 12, 'x', 'whiteTrim', 'detail');
        }
      }
    }
    return;
  }

  if (style === 'safety_gas_can_cluster') {
    const count = Math.min(3, Math.max(1, stack));
    const canW = 0.22;
    const canD = 0.28;
    const canH = 0.34;
    for (let i = 0; i < count; i++) {
      const cx = count === 1 ? 0 : (i - (count - 1) * 0.5) * 0.31;
      const cz = (i % 2 === 0 ? 0.02 : -0.04);
      const role = i === 1 ? 'warningYellow' : 'safetyRed';
      b.addChamferBox(cx, canH * 0.42, cz, canW, canH * 0.78, canD, 0.02, { materialRole: role, layer: 'body' });
      b.addTrapezoidBox(cx, canH * 0.87, cz, canW * 0.9, canD * 0.9, canW * 0.45, canD * 0.68, canH * 0.14, { materialRole: role, layer: 'body' });
      // Top carry handle & pour spout
      b.addBox(cx, canH * 0.97, cz - 0.03, 0.035, 0.035, 0.13, { materialRole: role, layer: 'detail' });
      b.addCylinder(cx + 0.04, canH * 1.01, cz + 0.075, 0.014, 0.024, 0.11, 8, 'y', 'warningYellow', 'detail');
      // Embossed X reinforcement panel on sides
      b.addBox(cx + canW * 0.505, canH * 0.42, cz, 0.012, canH * 0.48, 0.024, { materialRole: role, layer: 'detail', rotXDeg: 40 });
      b.addBox(cx + canW * 0.505, canH * 0.42, cz, 0.012, canH * 0.48, 0.024, { materialRole: role, layer: 'detail', rotXDeg: -40 });
    }
    return;
  }

  if (style === 'counterbalance_forklift') {
    const fw = clamp(w, 0.95, 1.45);
    const fh = clamp(h, 1.85, 2.3);
    const fd = clamp(d, 1.65, 2.35);
    // Drive & steer wheels
    for (const wx of [-fw * 0.48, fw * 0.48]) {
      b.addCylinder(wx, 0.21, fd * 0.18, 0.21, 0.21, 0.14, 12, 'x', 'rubber', 'body');
      b.addCylinder(wx, 0.21, fd * 0.18, 0.1, 0.1, 0.15, 8, 'x', 'secondary', 'detail');
    }
    for (const wx of [-fw * 0.41, fw * 0.41]) {
      b.addCylinder(wx, 0.16, -fd * 0.34, 0.16, 0.16, 0.11, 10, 'x', 'rubber', 'body');
      b.addCylinder(wx, 0.16, -fd * 0.34, 0.08, 0.08, 0.12, 8, 'x', 'secondary', 'detail');
    }
    // Lower chassis & heavy rounded rear counterweight
    b.addBox(0, 0.42, -fd * 0.08, fw * 0.88, 0.44, fd * 0.58, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.56, -fd * 0.33, fw * 0.86, 0.58, fd * 0.24, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.48, -fd * 0.45, fw * 0.78, 0.09, 0.025, { materialRole: 'safetyRed', layer: 'detail' });
    // Operator cab floor, padded seat, steering column, control levers
    b.addBox(0, 0.66, fd * 0.02, fw * 0.68, 0.04, fd * 0.36, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.88, -fd * 0.06, 0.42, 0.1, 0.38, { materialRole: 'upholstery', layer: 'detail' });
    b.addBox(0, 1.12, -fd * 0.19, 0.4, 0.42, 0.08, { materialRole: 'upholstery', layer: 'detail', rotXDeg: -10 });
    b.addCylinder(0, 1.04, fd * 0.12, 0.032, 0.04, 0.52, 8, 'y', 'darkMetal', 'detail');
    b.addPrismRing(0, 1.28, fd * 0.08, 0.14, 0.11, 0.026, 10, 'y', 'frame', 'detail');
    b.addCylinder(0.14, 1.08, fd * 0.11, 0.01, 0.012, 0.18, 6, 'y', 'accent', 'detail');
    // ROPS overhead guard cage + amber safety beacon
    const roofY = fh - 0.18;
    b.addBox(-fw * 0.38, (0.64 + roofY) * 0.5, fd * 0.14, 0.055, roofY - 0.64, 0.055, { materialRole: 'frame', layer: 'body', rotXDeg: -6 });
    b.addBox(fw * 0.38, (0.64 + roofY) * 0.5, fd * 0.14, 0.055, roofY - 0.64, 0.055, { materialRole: 'frame', layer: 'body', rotXDeg: -6 });
    b.addBox(-fw * 0.38, (0.8 + roofY) * 0.5, -fd * 0.25, 0.055, roofY - 0.8, 0.055, { materialRole: 'frame', layer: 'body' });
    b.addBox(fw * 0.38, (0.8 + roofY) * 0.5, -fd * 0.25, 0.055, roofY - 0.8, 0.055, { materialRole: 'frame', layer: 'body' });
    b.addBox(-fw * 0.38, roofY, -fd * 0.06, 0.055, 0.055, fd * 0.44, { materialRole: 'frame', layer: 'body' });
    b.addBox(fw * 0.38, roofY, -fd * 0.06, 0.055, 0.055, fd * 0.44, { materialRole: 'frame', layer: 'body' });
    b.addSlattedArray(0, roofY, -fd * 0.06, fd * 0.38, 6, fw * 0.8, 0.032, 0.038, 'z', 'frame', 'body');
    b.addCylinder(0, roofY + 0.08, -fd * 0.24, 0.045, 0.055, 0.1, 8, 'y', 'signalAmber', 'detail');
    if (meta && meta.lightSources) {
      meta.lightSources.push({ position: [0, roofY + 0.09, -fd * 0.24], color: '#ffae2b', intensity: 0.45, type: 'beacon' });
    }
    // Front lifting mast, hydraulic cylinder & forged steel forks
    const mastZ = fd * 0.27;
    const mastH = fh - 0.08;
    b.addBox(-fw * 0.3, mastH * 0.5 + 0.1, mastZ, 0.075, mastH, 0.09, { materialRole: 'frame', layer: 'body' });
    b.addBox(fw * 0.3, mastH * 0.5 + 0.1, mastZ, 0.075, mastH, 0.09, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, mastH * 0.48 + 0.1, mastZ + 0.02, 0.04, 0.045, mastH * 0.86, 8, 'y', 'chrome', 'detail');
    // Fork carriage & backrest
    const forkBaseY = 0.22;
    b.addBox(0, forkBaseY + 0.24, mastZ + 0.07, fw * 0.72, 0.48, 0.045, { materialRole: 'frame', layer: 'body' });
    const forkLen = fd * 0.48;
    for (const fx of [-fw * 0.22, fw * 0.22]) {
      b.addBox(fx, forkBaseY + 0.16, mastZ + 0.11, 0.095, 0.32, 0.036, { materialRole: 'darkMetal', layer: 'body' });
      b.addBox(fx, forkBaseY, mastZ + 0.11 + forkLen * 0.5, 0.095, 0.036, forkLen, { materialRole: 'darkMetal', layer: 'body' });
    }
    // Work headlights
    for (const lx of [-fw * 0.35, fw * 0.35]) {
      b.addBox(lx, roofY - 0.18, fd * 0.18, 0.07, 0.055, 0.06, { materialRole: 'lampGlow', layer: 'detail' });
    }
    objCreateSignPlane(group, 'Forklift', 0.36, 0.12, '#d89b1c', '#181c22', {
      x: 0,
      y: 0.6,
      z: -fd * 0.455,
      rotY: Math.PI
    });
    return;
  }

  // Rolling warehouse cage
  b.addCasterWheels(0, 0, w * 0.82, d * 0.82, 0.07, 'rubber', 'frame');
  b.addBox(0, 0.18, 0, w, 0.06, d, { materialRole: 'frame', layer: 'body' });
  b.addSupportLegs(0, 0.18, h, w - 0.06, d - 0.06, 0.045, 'frame');
  b.addBox(0, h * 0.58, -d * 0.48, w, h * 0.68, 0.025, { materialRole: 'secondary', layer: 'detail' });
}

function ricBuildConstructionSite(group, cfg, b, mats, meta) {
  const style = cfg.equipStyle || 'sawhorse_barricade';
  const w = clamp(cfg.width || 1.8, 0.9, 3.2);
  const h = clamp(cfg.height || 1.15, 0.85, 3.8);
  const d = clamp(cfg.depth || 0.75, 0.45, 1.8);

  if (style === 'sawhorse_barricade') {
    const tiltDeg = 16;
    const tiltRad = degToRad(tiltDeg);
    const legCenterZ = Math.min(d * 0.34, h * 0.5 * Math.tan(tiltRad));
    const legLen = h / Math.cos(tiltRad);
    for (const lx of [-w * 0.4, w * 0.4]) {
      b.addBox(lx, h * 0.5, legCenterZ, 0.055, legLen, 0.055, { materialRole: 'frame', layer: 'body', rotXDeg: -tiltDeg });
      b.addBox(lx, h * 0.5, -legCenterZ, 0.055, legLen, 0.055, { materialRole: 'frame', layer: 'body', rotXDeg: tiltDeg });
      b.addBox(lx, h - 0.02, 0, 0.07, 0.05, 0.09, { materialRole: 'darkMetal', layer: 'detail' });
    }
    const plankCount = cfg.warningStripes ? 2 : 1;
    for (let p = 0; p < plankCount; p++) {
      const py = h * (0.8 - p * 0.28);
      const faceOffset = (h - py) * Math.tan(tiltRad) + 0.038;
      const segs = 5;
      for (let s = 0; s < segs; s++) {
        const sx = -w * 0.5 + (s + 0.5) * (w / segs);
        const stripeRole = s % 2 === 0 ? 'accent' : 'whiteTrim';
        b.addBox(sx, py, faceOffset, w / segs, 0.18, 0.036, {
          materialRole: stripeRole,
          layer: 'body',
          rotXDeg: -tiltDeg
        });
        b.addBox(sx, py, -faceOffset, w / segs, 0.18, 0.036, {
          materialRole: stripeRole,
          layer: 'body',
          rotXDeg: tiltDeg
        });
      }
    }
    if (cfg.flasherBeacons) {
      b.addCylinder(-w * 0.36, h + 0.08, 0, 0.055, 0.055, 0.12, 8, 'y', 'signalAmber', 'detail');
      b.addCylinder(w * 0.36, h + 0.08, 0, 0.055, 0.055, 0.12, 8, 'y', 'signalAmber', 'detail');
      meta.lightSources.push({ id: 'barricade_flasher', position: [0, h + 0.1, 0], color: '#ff9d1a', radius: 2.0 });
    }
    if (cfg.sandbagBallast) {
      const footZ = legCenterZ * 1.85;
      for (const lx of [-w * 0.4, w * 0.4]) {
        b.addBox(lx, 0.07, footZ, 0.24, 0.14, 0.22, { materialRole: 'concrete', layer: 'detail' });
        b.addBox(lx, 0.07, -footZ, 0.24, 0.14, 0.22, { materialRole: 'concrete', layer: 'detail' });
      }
    }
    return;
  }

  if (style === 'scaffold_frame_bay') {
    const tiers = Math.max(1, Math.round(cfg.tierCount || 2));
    const tierH = Math.max(1.1, h / tiers);
    const totalH = tiers * tierH;
    b.addSupportLegs(0, 0, totalH, w, d, 0.055, 'primary');
    for (let t = 0; t < tiers; t++) {
      const topY = (t + 1) * tierH;
      b.addBox(0, topY, 0, w - 0.04, 0.05, d * 0.86, { materialRole: 'wood', layer: 'body' });
      b.addBox(0, topY + 0.5, d * 0.5, w, 0.035, 0.035, { materialRole: 'primary', layer: 'detail' });
      b.addBox(0, topY + 0.5, -d * 0.5, w, 0.035, 0.035, { materialRole: 'primary', layer: 'detail' });
    }
    return;
  }

  if (style === 'portable_generator_light') {
    b.addCylinder(-w * 0.32, 0.22, d * 0.48, 0.22, 0.22, 0.08, 10, 'z', 'rubber', 'body');
    b.addCylinder(-w * 0.32, 0.22, -d * 0.48, 0.22, 0.22, 0.08, 10, 'z', 'rubber', 'body');
    b.addChamferBox(0, 0.62, 0, w * 0.85, 0.72, d * 0.85, 0.03, { materialRole: 'primary', layer: 'body' });
    const mastH = Math.max(2.0, h);
    b.addCylinder(0, mastH * 0.5 + 0.3, 0, 0.045, 0.06, mastH - 0.5, 8, 'y', 'secondary', 'body');
    const heads = Math.max(1, Math.round(cfg.floodlightHeads || 2));
    b.addBox(0, mastH, 0, heads * 0.34, 0.06, 0.06, { materialRole: 'frame', layer: 'body' });
    for (let i = 0; i < heads; i++) {
      const lx = -((heads - 1) * 0.28) * 0.5 + i * 0.28;
      b.addBox(lx, mastH + 0.1, 0.06, 0.2, 0.16, 0.14, { materialRole: 'frame', layer: 'detail' });
      b.addBox(lx, mastH + 0.1, 0.14, 0.16, 0.12, 0.02, { materialRole: 'lampGlow', layer: 'detail' });
      meta.lightSources.push({ id: `work_flood_${i}`, position: [lx, mastH + 0.1, 0.18], color: '#fff2c4', radius: 6.0 });
    }
    return;
  }

  if (style === 'temp_fence_panel') {
    b.addBox(-w * 0.48, 0.04, 0, 0.18, 0.08, 0.55, { materialRole: 'concrete', layer: 'body' });
    b.addBox(w * 0.48, 0.04, 0, 0.18, 0.08, 0.55, { materialRole: 'concrete', layer: 'body' });
    b.addCylinder(-w * 0.48, h * 0.5 + 0.04, 0, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(w * 0.48, h * 0.5 + 0.04, 0, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(0, h + 0.02, 0, 0.028, 0.028, w, 8, 'x', 'secondary', 'body');
    b.addBox(0, h * 0.52, 0, w - 0.08, h * 0.86, 0.02, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  // Brick & cement materials pallet
  b.addBox(0, 0.07, 0, w, 0.14, d, { materialRole: 'wood', layer: 'body' });
  b.addBox(-w * 0.2, 0.42, 0, w * 0.44, 0.56, d * 0.82, { materialRole: 'brick', layer: 'body' });
  b.addBox(w * 0.24, 0.34, 0, w * 0.38, 0.4, d * 0.72, { materialRole: 'concrete', layer: 'body' });
  if (cfg.warningStripes) {
    objCreateSignPlane(group, 'Caution Work', 0.42, 0.16, '#e8b228', '#171c22', {
      x: 0,
      y: 0.48,
      z: d * 0.42
    });
  }
}

export function registerResidentialIndustrialAndConstructionFamilies() {
  registerObjectFamily({
    id: 'residential_entry',
    categoryId: '10_residential',
    subcategory: 'Entry Panels',
    subcategories: ['Entry Panels', 'Wall Condensers', 'Exterior Safety & Trim'],
    label: 'Residential Entry & Exterior Unit',
    description: 'Apartment intercom panels, wall-mounted AC condensers, security cameras, and fire escape ladders.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'residential',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['residential', 'apartment', 'intercom', 'ac', 'camera', 'ladder', 'wall', 'door'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Residential Fixture' },
      {
        key: 'fixtureStyle',
        name: 'Fixture Type',
        type: 'select',
        options: [
          ['intercom_buzzer_panel', 'Apartment Intercom Panel'],
          ['exterior_ac_condenser', 'Exterior AC Condenser'],
          ['security_camera_mount', 'Wall Security Camera'],
          ['fire_escape_ladder', 'Fire Escape Ladder Segment'],
          ['door_canopy_hood', 'Entry Door Canopy Hood'],
          ['porch_planter_urn', 'Porch Planter Urn']
        ],
        default: 'intercom_buzzer_panel'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.22, max: 1.8, step: 0.04, unit: 'm', default: 0.34 },
      { key: 'height', name: 'Height', type: 'number', min: 0.26, max: 3.2, step: 0.04, unit: 'm', default: 0.48 },
      { key: 'depth', name: 'Depth / Projection', type: 'number', min: 0.1, max: 1.1, step: 0.04, unit: 'm', default: 0.14 },
      { group: 'Hardware Details' },
      { key: 'buttonRows', name: 'Intercom Rows', type: 'number', min: 2, max: 8, step: 1, default: 4 },
      { key: 'buttonCols', name: 'Intercom Columns', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      { key: 'cameraTiltDeg', name: 'Camera Tilt', type: 'number', min: -45, max: 20, step: 5, unit: 'deg', default: -20 },
      { key: 'fanGrilleBlades', name: 'AC Fan Blades', type: 'number', min: 4, max: 10, step: 1, default: 6 },
      { key: 'wallBrackets', name: 'Wall Support Brackets', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'brass_apartment_intercom',
        label: 'Brass Apartment Intercom Panel',
        subcategory: 'Entry Panels',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#c99a3a',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#d4ad5a',
        frameColor: '#25292e',
        params: { fixtureStyle: 'intercom_buzzer_panel', width: 0.32, height: 0.46, depth: 0.1, buttonRows: 5, buttonCols: 2 }
      },
      {
        id: 'wall_mounted_ac_condenser',
        label: 'Wall-Mounted AC Condenser',
        subcategory: 'Wall Condensers',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'residential',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#d2d5d8',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#98a0a8',
        frameColor: '#363c42',
        params: { fixtureStyle: 'exterior_ac_condenser', width: 0.85, height: 0.62, depth: 0.36, fanGrilleBlades: 6, wallBrackets: true }
      },
      {
        id: 'ptz_security_camera_mount',
        label: 'Wall Security Camera Mount',
        subcategory: 'Exterior Safety & Trim',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce3ea',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#2c343d',
        frameColor: '#242a32',
        params: { fixtureStyle: 'security_camera_mount', width: 0.24, height: 0.26, depth: 0.32, cameraTiltDeg: -22 }
      },
      {
        id: 'iron_fire_escape_ladder',
        label: 'Iron Fire Escape Ladder',
        subcategory: 'Exterior Safety & Trim',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'older_metropolitan',
        condition: 'weathered',
        primaryMaterial: 'cast_iron',
        primaryColor: '#252a30',
        frameColor: '#202429',
        params: { fixtureStyle: 'fire_escape_ladder', width: 0.56, height: 2.6, depth: 0.22 }
      }
    ],
    buildGeometry: ricBuildResidentialEntry
  });

  registerObjectFamily({
    id: 'industrial_cargo',
    categoryId: '11_industrial',
    categories: ['11_industrial', '12_construction', '26_trades_plumbing_electrical'],
    subcategory: 'Pallets & Crates',
    subcategories: ['Pallets & Crates', 'Barrels & Reels', 'Handling Carts', 'Site Equipment', 'Repair Tools, Ladders & Carts'],
    label: 'Warehouse Cargo, Pallets, Reels & Forklift',
    description: 'Stacked wooden pallets, hazard crates, cargo drums, insulation/metal rolls, gas cans, cable reels, and counterbalance forklifts.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'industrial',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['industrial', 'warehouse', 'pallet', 'crate', 'hazard', 'barrel', 'drum', 'spool', 'insulation', 'metal', 'gas can', 'forklift'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Cargo Type & Size' },
      {
        key: 'cargoStyle',
        name: 'Cargo Prop Type',
        type: 'select',
        options: [
          ['wooden_pallet_stack', 'Stacked Wooden Pallets'],
          ['slatted_shipping_crate', 'Slatted Shipping Crate'],
          ['steel_cargo_drums', 'Steel Cargo Drums'],
          ['hand_truck_dolly', 'Warehouse Hand Truck'],
          ['rolling_warehouse_cage', 'Rolling Warehouse Cage'],
          ['cable_wooden_reel', 'Wooden Cable Reel'],
          ['insulation_metal_roll', 'Giant Insulation / Metal Roll'],
          ['safety_gas_can_cluster', 'Safety Fuel Gas Cans'],
          ['counterbalance_forklift', 'Counterbalance Forklift']
        ],
        default: 'wooden_pallet_stack'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.36, max: 1.85, step: 0.05, unit: 'm', default: 1.2 },
      { key: 'height', name: 'Height', type: 'number', min: 0.18, max: 2.35, step: 0.05, unit: 'm', default: 0.75 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.36, max: 2.45, step: 0.05, unit: 'm', default: 1.0 },
      { group: 'Packing & Cargo Details' },
      { key: 'stackCount', name: 'Stack / Unit Count', type: 'number', min: 1, max: 5, step: 1, default: 3 },
      { key: 'slatCount', name: 'Pallet Deck Slats', type: 'number', min: 4, max: 9, step: 1, default: 5 },
      { key: 'drumRibs', name: 'Drum Ribs', type: 'number', min: 2, max: 4, step: 1, default: 3 },
      {
        key: 'spoolFill',
        name: 'Wire Spool Fullness',
        type: 'select',
        options: [
          ['full', 'Full Copper Coil'],
          ['half', 'Half Wound'],
          ['sparse', 'Mostly Empty Core']
        ],
        default: 'full'
      },
      {
        key: 'rollVariant',
        name: 'Roll Material Variant',
        type: 'select',
        options: [
          ['insulation', 'Pink Fiberglass Insulation'],
          ['plate_metal', 'Coiled Sheet Plate Metal']
        ],
        default: 'insulation'
      },
      { key: 'hazardSymbol', name: 'Hazard Diamond Placard', type: 'boolean', default: false },
      { key: 'tarpCover', name: 'Tarp Cover', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'stacked_wooden_pallets',
        label: 'Stacked Wooden Pallets',
        subcategory: 'Pallets & Crates',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'wood',
        primaryColor: '#946b42',
        woodColor: '#946b42',
        params: { cargoStyle: 'wooden_pallet_stack', width: 1.2, height: 0.45, depth: 1.0, stackCount: 3, slatCount: 5 }
      },
      {
        id: 'heavy_shipping_crate',
        label: 'Slatted Shipping Crate',
        subcategory: 'Pallets & Crates',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#9e7648',
        woodColor: '#9e7648',
        params: { cargoStyle: 'slatted_shipping_crate', width: 1.15, height: 1.05, depth: 1.15, tarpCover: false }
      },
      {
        id: 'industrial_oil_drums',
        label: 'Steel Cargo Oil Drums',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2f5e8a',
        accentColor: '#d98a2b',
        frameColor: '#23282d',
        params: { cargoStyle: 'steel_cargo_drums', width: 1.25, height: 0.92, depth: 1.15, stackCount: 3, drumRibs: 3 }
      },
      {
        id: 'warehouse_hand_truck',
        label: 'Warehouse Hand Truck Dolly',
        subcategory: 'Handling Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c23c2d',
        frameColor: '#252a30',
        params: { cargoStyle: 'hand_truck_dolly', width: 0.6, height: 1.25, depth: 0.6 }
      },
      {
        id: 'cable_spool_reel',
        label: 'Industrial Cable Spool Reel',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'wood',
        primaryColor: '#8d643b',
        woodColor: '#8d643b',
        params: { cargoStyle: 'cable_wooden_reel', spoolFill: 'half', width: 0.95, height: 1.1, depth: 1.1 }
      },
      {
        id: 'wire_spool_full_copper',
        label: 'Giant Wire Spool (Full Copper Coil)',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#9c6e42',
        woodColor: '#9c6e42',
        params: { cargoStyle: 'cable_wooden_reel', spoolFill: 'full', width: 1.15, height: 1.35, depth: 1.35 }
      },
      {
        id: 'wire_spool_low_fill',
        label: 'Giant Wire Spool (Mostly Empty)',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'wood',
        primaryColor: '#7a5837',
        woodColor: '#7a5837',
        params: { cargoStyle: 'cable_wooden_reel', spoolFill: 'sparse', width: 1.05, height: 1.2, depth: 1.2 }
      },
      {
        id: 'hazard_danger_symbol_crate',
        label: 'Shipping Crate With Hazard Placard',
        subcategory: 'Pallets & Crates',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'wood',
        primaryColor: '#9c7143',
        woodColor: '#9c7143',
        params: { cargoStyle: 'slatted_shipping_crate', hazardSymbol: true, width: 1.15, height: 1.05, depth: 1.15 }
      },
      {
        id: 'giant_fiberglass_insulation_roll',
        label: 'Giant Roll Of Fiberglass Insulation',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#d9c5a0',
        accentColor: '#e87fa8',
        woodColor: '#8c663f',
        params: { cargoStyle: 'insulation_metal_roll', rollVariant: 'insulation', stackCount: 1, width: 1.5, height: 1.05, depth: 1.05 }
      },
      {
        id: 'giant_sheet_metal_coil_roll',
        label: 'Giant Plate Sheet Metal Coil Roll',
        subcategory: 'Barrels & Reels',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#b5c0c9',
        woodColor: '#785738',
        params: { cargoStyle: 'insulation_metal_roll', rollVariant: 'plate_metal', stackCount: 1, width: 1.38, height: 1.15, depth: 1.15 }
      },
      {
        id: 'safety_fuel_gas_cans',
        label: 'Safety Fuel & Diesel Gas Cans',
        subcategory: 'Handling Carts',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c9382e',
        accentColor: '#e3b229',
        params: { cargoStyle: 'safety_gas_can_cluster', stackCount: 2, width: 0.72, height: 0.44, depth: 0.46 }
      },
      {
        id: 'warehouse_counterbalance_forklift',
        label: 'Industrial Counterbalance Forklift',
        subcategory: 'Site Equipment',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e39a1c',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#c6cdd4',
        accentColor: '#d94c26',
        frameColor: '#252a30',
        params: { cargoStyle: 'counterbalance_forklift', width: 1.18, height: 2.15, depth: 2.2 }
      }
    ],
    buildGeometry: ricBuildIndustrialCargo
  });

  registerObjectFamily({
    id: 'construction_site',
    categoryId: '12_construction',
    categories: ['12_construction', '26_trades_plumbing_electrical'],
    subcategory: 'Barricades & Fencing',
    subcategories: ['Barricades & Fencing', 'Scaffolding', 'Site Equipment', 'Repair Tools, Ladders & Carts'],
    label: 'Construction Barrier & Rig',
    description: 'Sawhorse barricades, modular scaffolding, portable light towers, and temporary fencing.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'industrial',
    sizeClass: 'medium',
    functionalRole: 'safety',
    tags: ['construction', 'barrier', 'scaffold', 'worklight', 'fence', 'maintenance', 'orange'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Site Equipment' },
      {
        key: 'equipStyle',
        name: 'Equipment Type',
        type: 'select',
        options: [
          ['sawhorse_barricade', 'Sawhorse Street Barricade'],
          ['scaffold_frame_bay', 'Scaffold Frame Section'],
          ['portable_generator_light', 'Portable Work Light Tower'],
          ['temp_fence_panel', 'Temporary Site Fence'],
          ['brick_cement_pallet', 'Brick & Cement Pallet']
        ],
        default: 'sawhorse_barricade'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.9, max: 3.2, step: 0.1, unit: 'm', default: 1.8 },
      { key: 'height', name: 'Height', type: 'number', min: 0.85, max: 3.8, step: 0.1, unit: 'm', default: 1.15 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.45, max: 1.8, step: 0.05, unit: 'm', default: 0.75 },
      { group: 'Details' },
      { key: 'tierCount', name: 'Scaffold Tiers', type: 'number', min: 1, max: 3, step: 1, default: 2 },
      { key: 'warningStripes', name: 'High-Vis Stripes', type: 'boolean', default: true },
      { key: 'flasherBeacons', name: 'Amber Flashers', type: 'boolean', default: true },
      { key: 'sandbagBallast', name: 'Sandbag Ballast', type: 'boolean', default: true },
      { key: 'floodlightHeads', name: 'Floodlight Heads', type: 'number', min: 1, max: 4, step: 1, default: 2 }
    ],
    presets: [
      {
        id: 'striped_sawhorse_barricade',
        label: 'Striped Sawhorse Barricade',
        subcategory: 'Barricades & Fencing',
        locationContext: 'both',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e06324',
        accentColor: '#e86f28',
        frameColor: '#363d45',
        params: { equipStyle: 'sawhorse_barricade', width: 1.8, height: 1.1, depth: 0.72, warningStripes: true, flasherBeacons: true, sandbagBallast: true }
      },
      {
        id: 'modular_scaffold_section',
        label: 'Modular Scaffold Section',
        subcategory: 'Scaffolding',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3a628c',
        woodColor: '#966f46',
        params: { equipStyle: 'scaffold_frame_bay', width: 2.2, height: 3.2, depth: 1.25, tierCount: 2 }
      },
      {
        id: 'portable_light_tower_generator',
        label: 'Portable Work Light Generator',
        subcategory: 'Site Equipment',
        locationContext: 'exterior',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#d99a26',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#9aa4ad',
        params: { equipStyle: 'portable_generator_light', width: 1.25, height: 3.2, depth: 0.9, floodlightHeads: 2 }
      },
      {
        id: 'temp_construction_fence',
        label: 'Temporary Construction Fence',
        subcategory: 'Barricades & Fencing',
        locationContext: 'exterior',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#8d969e',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#9ea7b0',
        accentColor: '#e06b26',
        params: { equipStyle: 'temp_fence_panel', width: 2.5, height: 1.9, depth: 0.6 }
      }
    ],
    buildGeometry: ricBuildConstructionSite
  });
}
