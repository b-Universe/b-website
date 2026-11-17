import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function holPickBulbRole(idx, scheme, lit) {
  if (!lit) {
    if (scheme === 'warm_white' || scheme === 'icy_winter') return 'whiteTrim';
    return idx % 2 === 0 ? 'primary' : 'accent';
  }
  if (scheme === 'warm_white') return 'lampGlow';
  if (scheme === 'icy_winter') return idx % 2 === 0 ? 'neonGlow' : 'lampGlow';
  if (scheme === 'red_green') return idx % 2 === 0 ? 'signalRed' : 'signalGreen';
  if (scheme === 'gold_crimson') return idx % 2 === 0 ? 'lampGlow' : 'signalRed';
  const multi = ['signalRed', 'signalGreen', 'lampGlow', 'signalAmber', 'neonGlow'];
  return multi[idx % multi.length];
}

function holAddStarTopper(b, cx, cy, cz, scale = 0.22, lit = true) {
  const role = lit ? 'lampGlow' : 'brass';
  b.addBox(cx, cy, cz, scale, scale, scale * 0.22, { materialRole: role, layer: 'detail' });
  b.addBox(cx, cy, cz, scale, scale, scale * 0.22, { materialRole: role, layer: 'detail', rotZDeg: 45 });
  b.addCylinder(cx, cy - scale * 0.55, cz, 0.02, 0.032, scale * 0.45, 6, 'y', 'brass', 'detail');
}

function holAddGiftBox(b, cx, cy, cz, w, h, d, wrapRole = 'safetyRed', ribbonRole = 'lampGlow') {
  b.addBox(cx, cy + h * 0.5, cz, w, h, d, { materialRole: wrapRole, layer: 'body' });
  b.addBox(cx, cy + h * 0.5, cz, w + 0.012, h + 0.012, Math.min(w, d) * 0.16, { materialRole: ribbonRole, layer: 'detail' });
  b.addBox(cx, cy + h * 0.5, cz, Math.min(w, d) * 0.16, h + 0.012, d + 0.012, { materialRole: ribbonRole, layer: 'detail' });
  b.addBox(cx, cy + h + 0.025, cz, w * 0.28, 0.04, 0.04, { materialRole: ribbonRole, layer: 'detail', rotZDeg: 25 });
  b.addBox(cx, cy + h + 0.025, cz, w * 0.28, 0.04, 0.04, { materialRole: ribbonRole, layer: 'detail', rotZDeg: -25 });
}

function holAddRedBow(b, cx, cy, cz, scale = 0.22, role = 'safetyRed') {
  b.addBox(cx, cy, cz, scale * 0.28, scale * 0.26, scale * 0.18, { materialRole: role, layer: 'detail' });
  b.addBox(cx - scale * 0.34, cy + scale * 0.06, cz, scale * 0.52, scale * 0.24, scale * 0.12, { materialRole: role, layer: 'detail', rotZDeg: 22 });
  b.addBox(cx + scale * 0.34, cy + scale * 0.06, cz, scale * 0.52, scale * 0.24, scale * 0.12, { materialRole: role, layer: 'detail', rotZDeg: -22 });
  b.addBox(cx - scale * 0.16, cy - scale * 0.36, cz, scale * 0.14, scale * 0.52, scale * 0.06, { materialRole: role, layer: 'detail', rotZDeg: -14 });
  b.addBox(cx + scale * 0.16, cy - scale * 0.36, cz, scale * 0.14, scale * 0.52, scale * 0.06, { materialRole: role, layer: 'detail', rotZDeg: 14 });
}

function holAddCurvedCandyCane(b, sx, dir, h, lit) {
  const caneRole = (seg) => (seg % 2 === 0 ? (lit ? 'signalRed' : 'safetyRed') : 'whiteTrim');
  b.addCylinder(sx, 0.05, 0, 0.22, 0.26, 0.1, 10, 'y', 'whiteTrim', 'body');
  const tubeR = 0.085;
  const archR = clamp(h * 0.12, 0.16, 0.26);
  const curveY = h - archR - 0.06;
  const shaftSegs = 6;
  const shaftStart = 0.09;
  const shaftStep = (curveY - shaftStart) / shaftSegs;
  let segIdx = 0;

  for (let i = 0; i < shaftSegs; i++) {
    const y0 = shaftStart + i * shaftStep;
    const y1 = shaftStart + (i + 1) * shaftStep;
    b.addPipeSegment(sx, y0, 0, sx, y1, 0, tubeR, 12, caneRole(segIdx++), 'body', true);
  }

  // Smooth continuous semicircular J-hook arch along XY with slightly inset joint fillers
  const hookSegs = 9;
  const maxTheta = Math.PI * 1.12;
  const arcCenterX = sx + dir * archR;
  for (let i = 0; i < hookSegs; i++) {
    const t0 = i / hookSegs;
    const t1 = (i + 1) / hookSegs;
    const a0 = t0 * maxTheta;
    const a1 = t1 * maxTheta;
    const x0 = arcCenterX - dir * archR * Math.cos(a0);
    const y0 = curveY + archR * Math.sin(a0);
    const x1 = arcCenterX - dir * archR * Math.cos(a1);
    const y1 = curveY + archR * Math.sin(a1);
    const role = caneRole(segIdx++);
    b.addPipeSegment(x0, y0, 0, x1, y1, 0, tubeR, 12, role, 'body', true);
    b.addCylinder(x0, y0, 0, tubeR * 0.84, tubeR * 0.96, tubeR * 1.15, 10, 'z', role, 'body');
  }
  const endX = arcCenterX - dir * archR * Math.cos(maxTheta);
  const endY = curveY + archR * Math.sin(maxTheta);
  b.addCylinder(endX, endY, 0, tubeR * 0.72, tubeR * 0.96, tubeR * 0.55, 10, 'z', caneRole(segIdx), 'detail');

  // Festive holly collar & ribbon bow wrapped tightly around cane shaft
  const bowY = curveY * 0.68;
  b.addPrismRing(sx, bowY, 0, tubeR + 0.025, tubeR - 0.005, 0.075, 12, 'y', 'signalGreen', 'detail');
  holAddRedBow(b, sx, bowY - 0.01, tubeR + 0.032, 0.24, 'safetyRed');
  b.addCylinder(sx, bowY - 0.04, tubeR + 0.055, 0.032, 0.032, 0.04, 8, 'y', 'brass', 'detail');
}

function holAddNutcrackerFigure(b, opts = {}) {
  const cx = opts.cx || 0;
  const cy = opts.cy || 0;
  const cz = opts.cz || 0;
  const s = opts.scale || 1.0;
  const tunicRole = opts.tunicRole || 'safetyRed';
  const trouserRole = opts.trouserRole || 'primary';
  const hatType = opts.hatType || 'shako';
  const accessory = opts.accessory || 'saber';
  const hasCape = Boolean(opts.cape);
  const jawOpen = clamp(opts.jawOpen !== undefined ? opts.jawOpen : 0.035, 0.015, 0.07);
  const lit = opts.lit !== false;

  // Stepped octagonal display plinth with brass collar trim
  b.addCylinder(cx, cy + 0.045 * s, cz, 0.22 * s, 0.25 * s, 0.09 * s, 10, 'y', 'wood', 'body');
  b.addCylinder(cx, cy + 0.095 * s, cz, 0.21 * s, 0.22 * s, 0.025 * s, 10, 'y', 'brass', 'detail');

  // High glossy boots with brass cuffs + trousers
  for (const lx of [-0.085 * s, 0.085 * s]) {
    b.addBox(cx + lx, cy + 0.13 * s, cz + 0.03 * s, 0.1 * s, 0.06 * s, 0.16 * s, { materialRole: 'darkMetal', layer: 'body' });
    b.addCylinder(cx + lx, cy + 0.23 * s, cz, 0.056 * s, 0.054 * s, 0.18 * s, 8, 'y', 'darkMetal', 'body');
    b.addCylinder(cx + lx, cy + 0.31 * s, cz, 0.064 * s, 0.06 * s, 0.035 * s, 8, 'y', 'brass', 'detail');
    b.addCylinder(cx + lx, cy + 0.42 * s, cz, 0.052 * s, 0.052 * s, 0.2 * s, 8, 'y', trouserRole, 'body');
  }

  // Tailored military tunic + skirt tails + brass waist belt + crossed gold braid frogs
  b.addTrapezoidBox(cx, cy + 0.56 * s, cz, 0.31 * s, 0.22 * s, 0.27 * s, 0.19 * s, 0.15 * s, { materialRole: tunicRole, layer: 'body' });
  b.addBox(cx, cy + 0.78 * s, cz, 0.29 * s, 0.32 * s, 0.2 * s, { materialRole: tunicRole, layer: 'body' });
  b.addBox(cx, cy + 0.64 * s, cz, 0.31 * s, 0.065 * s, 0.22 * s, { materialRole: 'darkMetal', layer: 'detail' });
  b.addBox(cx, cy + 0.64 * s, cz + 0.115 * s, 0.095 * s, 0.075 * s, 0.02 * s, { materialRole: 'brass', layer: 'detail' });
  // Chest placket + gold braids & buttons
  b.addBox(cx, cy + 0.8 * s, cz + 0.104 * s, 0.055 * s, 0.26 * s, 0.012 * s, { materialRole: 'whiteTrim', layer: 'detail' });
  for (let row = 0; row < 3; row++) {
    const ry = cy + (0.73 + row * 0.075) * s;
    b.addBox(cx, ry, cz + 0.108 * s, 0.19 * s, 0.018 * s, 0.014 * s, { materialRole: 'brass', layer: 'detail' });
    b.addCylinder(cx, ry, cz + 0.115 * s, 0.016 * s, 0.016 * s, 0.014 * s, 8, 'z', 'brass', 'detail');
  }

  // Royal fringed shoulder epaulets
  for (const sx of [-1, 1]) {
    b.addBox(cx + sx * 0.175 * s, cy + 0.94 * s, cz, 0.09 * s, 0.04 * s, 0.13 * s, { materialRole: 'brass', layer: 'detail', rotZDeg: -sx * 12 });
    b.addCylinder(cx + sx * 0.215 * s, cy + 0.91 * s, cz, 0.022 * s, 0.022 * s, 0.13 * s, 6, 'z', 'lampGlow', 'detail');
  }

  // Optional sweeping royal cape
  if (hasCape) {
    b.addTrapezoidBox(cx, cy + 0.56 * s, cz - 0.135 * s, 0.44 * s, 0.05 * s, 0.3 * s, 0.04 * s, 0.74 * s, { materialRole: 'safetyRed', layer: 'detail', rotXDeg: 8 });
    b.addBox(cx, cy + 0.93 * s, cz - 0.06 * s, 0.34 * s, 0.07 * s, 0.18 * s, { materialRole: 'whiteTrim', layer: 'detail' });
  }

  // Articulated arms & white-gloved hands
  const armRightAngle = (accessory === 'saber' || accessory === 'scepter' || accessory === 'rapier' || accessory === 'lantern') ? -24 : 0;
  b.addBox(cx - 0.2 * s, cy + 0.76 * s, cz, 0.08 * s, 0.32 * s, 0.08 * s, { materialRole: tunicRole, layer: 'body' });
  b.addCylinder(cx - 0.2 * s, cy + 0.59 * s, cz, 0.044 * s, 0.044 * s, 0.03 * s, 8, 'y', 'brass', 'detail');
  b.addBox(cx - 0.2 * s, cy + 0.54 * s, cz + 0.02 * s, 0.065 * s, 0.07 * s, 0.08 * s, { materialRole: 'whiteTrim', layer: 'detail' });

  b.addBox(cx + 0.2 * s, cy + 0.78 * s, cz + (armRightAngle ? 0.06 * s : 0), 0.08 * s, 0.32 * s, 0.08 * s, { materialRole: tunicRole, layer: 'body', rotXDeg: armRightAngle });
  b.addCylinder(cx + 0.2 * s, cy + 0.62 * s, cz + (armRightAngle ? 0.12 * s : 0), 0.044 * s, 0.044 * s, 0.03 * s, 8, 'y', 'brass', 'detail');
  b.addBox(cx + 0.2 * s, cy + 0.57 * s, cz + (armRightAngle ? 0.14 * s : 0.02 * s), 0.065 * s, 0.07 * s, 0.08 * s, { materialRole: 'whiteTrim', layer: 'detail' });

  // Head collar & Nutcracker / Mouse King head
  b.addCylinder(cx, cy + 0.96 * s, cz, 0.08 * s, 0.095 * s, 0.06 * s, 8, 'y', 'whiteTrim', 'detail');
  const headY = cy + 1.09 * s;
  if (hatType === 'mouse_crown') {
    b.addBox(cx, headY, cz, 0.2 * s, 0.22 * s, 0.2 * s, { materialRole: 'frame', layer: 'body' });
    b.addTrapezoidBox(cx, headY - 0.02 * s, cz + 0.14 * s, 0.13 * s, 0.14 * s, 0.06 * s, 0.14 * s, 0.09 * s, { materialRole: 'secondary', layer: 'body', rotXDeg: 85 });
    b.addCylinder(cx, headY - 0.01 * s, cz + 0.22 * s, 0.025 * s, 0.025 * s, 0.025 * s, 8, 'z', 'safetyRed', 'detail');
    for (const sx of [-1, 1]) {
      b.addCylinder(cx + sx * 0.12 * s, headY + 0.11 * s, cz - 0.02 * s, 0.075 * s, 0.075 * s, 0.03 * s, 10, 'z', 'frame', 'body');
      b.addCylinder(cx + sx * 0.12 * s, headY + 0.11 * s, cz - 0.004 * s, 0.048 * s, 0.048 * s, 0.012 * s, 10, 'z', 'safetyRed', 'detail');
      b.addCylinder(cx + sx * 0.05 * s, headY + 0.04 * s, cz + 0.105 * s, 0.018 * s, 0.018 * s, 0.016 * s, 8, 'z', 'signalRed', 'detail');
    }
    // Seven-point crooked gold Mouse King crown
    b.addCylinder(cx, headY + 0.14 * s, cz, 0.11 * s, 0.095 * s, 0.07 * s, 10, 'y', 'brass', 'body');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.addCone(cx + Math.cos(a) * 0.08 * s, headY + 0.21 * s, cz + Math.sin(a) * 0.08 * s, 0.02 * s, 0.085 * s, 6, i % 2 === 0 ? 'brass' : 'lampGlow', 'detail');
    }
  } else {
    // Upper face block + rear cracking lever + recessed mouth + hinged toothy jaw
    b.addBox(cx, headY + 0.035 * s, cz, 0.21 * s, 0.165 * s, 0.19 * s, { materialRole: 'secondary', layer: 'body' });
    b.addBox(cx, headY - 0.045 * s, cz - 0.02 * s, 0.18 * s, 0.065 * s, 0.14 * s, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(cx, headY - (0.078 + jawOpen * 0.4) * s, cz + 0.01 * s, 0.185 * s, 0.065 * s, 0.175 * s, { materialRole: 'secondary', layer: 'body' });
    // Crisp white blocky Nutcracker teeth strip
    b.addBox(cx, headY - 0.04 * s, cz + 0.092 * s, 0.125 * s, 0.026 * s, 0.015 * s, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(cx, headY - (0.068 + jawOpen * 0.4) * s, cz + 0.092 * s, 0.125 * s, 0.024 * s, 0.015 * s, { materialRole: 'whiteTrim', layer: 'detail' });
    // Rear wooden nutcracker lever
    b.addBox(cx, headY - 0.07 * s, cz - 0.13 * s, 0.042 * s, 0.18 * s, 0.075 * s, { materialRole: 'wood', layer: 'detail', rotXDeg: 18 });
    // Sculpted nose bridge, rosy cheeks, eyes & bushy eyebrows
    b.addBox(cx, headY + 0.02 * s, cz + 0.11 * s, 0.035 * s, 0.055 * s, 0.04 * s, { materialRole: 'secondary', layer: 'detail' });
    for (const sx of [-1, 1]) {
      b.addBox(cx + sx * 0.052 * s, headY + 0.055 * s, cz + 0.096 * s, 0.042 * s, 0.028 * s, 0.012 * s, { materialRole: 'whiteTrim', layer: 'detail' });
      b.addBox(cx + sx * 0.052 * s, headY + 0.055 * s, cz + 0.104 * s, 0.02 * s, 0.02 * s, 0.01 * s, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(cx + sx * 0.055 * s, headY + 0.084 * s, cz + 0.102 * s, 0.052 * s, 0.018 * s, 0.018 * s, { materialRole: 'whiteTrim', layer: 'detail', rotZDeg: -sx * 12 });
      b.addCylinder(cx + sx * 0.072 * s, headY + 0.015 * s, cz + 0.096 * s, 0.024 * s, 0.024 * s, 0.012 * s, 8, 'z', 'safetyRed', 'detail');
      // Handlebar mustache wings
      b.addBox(cx + sx * 0.068 * s, headY - 0.015 * s, cz + 0.108 * s, 0.11 * s, 0.028 * s, 0.024 * s, { materialRole: 'whiteTrim', layer: 'detail', rotZDeg: sx * 16 });
    }
    // White side hair curls + pointed beard on lower jaw
    for (const sx of [-1, 1]) {
      b.addBox(cx + sx * 0.112 * s, headY + 0.02 * s, cz, 0.035 * s, 0.18 * s, 0.16 * s, { materialRole: 'whiteTrim', layer: 'detail' });
    }
    b.addTrapezoidBox(cx, headY - 0.16 * s, cz + 0.07 * s, 0.06 * s, 0.04 * s, 0.14 * s, 0.05 * s, 0.16 * s, { materialRole: 'whiteTrim', layer: 'detail' });

    if (hatType === 'crown') {
      b.addCylinder(cx, headY + 0.15 * s, cz, 0.125 * s, 0.108 * s, 0.08 * s, 10, 'y', 'brass', 'body');
      b.addCylinder(cx, headY + 0.135 * s, cz, 0.115 * s, 0.115 * s, 0.035 * s, 10, 'y', 'safetyRed', 'detail');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.addCone(cx + Math.cos(a) * 0.098 * s, headY + 0.22 * s, cz + Math.sin(a) * 0.098 * s, 0.024 * s, 0.09 * s, 6, 'brass', 'detail');
        b.addCylinder(cx + Math.cos(a) * 0.098 * s, headY + 0.265 * s, cz + Math.sin(a) * 0.098 * s, 0.016 * s, 0.016 * s, 0.022 * s, 6, 'y', lit ? 'lampGlow' : 'safetyRed', 'detail');
      }
    } else {
      // Classic tall guard Shako hat with visor, gold star plate & feather plume
      b.addCylinder(cx, headY + 0.125 * s, cz + 0.05 * s, 0.12 * s, 0.12 * s, 0.022 * s, 10, 'y', 'darkMetal', 'detail');
      b.addCylinder(cx, headY + 0.26 * s, cz, 0.138 * s, 0.115 * s, 0.26 * s, 10, 'y', 'darkMetal', 'body');
      b.addCylinder(cx, headY + 0.155 * s, cz, 0.12 * s, 0.12 * s, 0.036 * s, 10, 'y', 'brass', 'detail');
      b.addCylinder(cx, headY + 0.26 * s, cz + 0.118 * s, 0.038 * s, 0.038 * s, 0.02 * s, 8, 'z', lit ? 'lampGlow' : 'brass', 'detail');
      b.addCylinder(cx, headY + 0.43 * s, cz + 0.02 * s, 0.038 * s, 0.022 * s, 0.11 * s, 8, 'y', 'whiteTrim', 'detail');
    }
  }

  // Held accessories (saber, scepter, snare drum, lantern staff, or rapier)
  if (accessory === 'saber' || accessory === 'rapier') {
    b.addCylinder(cx + 0.21 * s, cy + 0.56 * s, cz + 0.14 * s, 0.012 * s, 0.015 * s, 0.78 * s, 6, 'y', 'chrome', 'detail');
    b.addCylinder(cx + 0.21 * s, cy + 0.52 * s, cz + 0.14 * s, 0.038 * s, 0.038 * s, 0.025 * s, 8, 'y', 'brass', 'detail');
  } else if (accessory === 'scepter') {
    b.addCylinder(cx + 0.21 * s, cy + 0.62 * s, cz + 0.14 * s, 0.016 * s, 0.016 * s, 0.94 * s, 8, 'y', 'brass', 'detail');
    b.addCylinder(cx + 0.21 * s, cy + 1.12 * s, cz + 0.14 * s, 0.048 * s, 0.048 * s, 0.075 * s, 10, 'y', lit ? 'lampGlow' : 'brass', 'detail');
  } else if (accessory === 'lantern') {
    b.addCylinder(cx + 0.22 * s, cy + 0.74 * s, cz + 0.14 * s, 0.018 * s, 0.02 * s, 1.28 * s, 8, 'y', 'brass', 'detail');
    b.addBox(cx + 0.22 * s, cy + 1.38 * s, cz + 0.22 * s, 0.035 * s, 0.035 * s, 0.16 * s, { materialRole: 'brass', layer: 'detail' });
    b.addCylinder(cx + 0.22 * s, cy + 1.24 * s, cz + 0.28 * s, 0.08 * s, 0.06 * s, 0.18 * s, 8, 'y', lit ? 'lampGlow' : 'glass', 'detail');
    b.addCone(cx + 0.22 * s, cy + 1.37 * s, cz + 0.28 * s, 0.095 * s, 0.08 * s, 8, 'darkMetal', 'detail');
  } else if (accessory === 'drum') {
    b.addCylinder(cx - 0.16 * s, cy + 0.58 * s, cz + 0.14 * s, 0.14 * s, 0.14 * s, 0.15 * s, 12, 'y', 'safetyRed', 'body');
    b.addCylinder(cx - 0.16 * s, cy + 0.655 * s, cz + 0.14 * s, 0.145 * s, 0.145 * s, 0.022 * s, 12, 'y', 'whiteTrim', 'detail');
    b.addCylinder(cx - 0.16 * s, cy + 0.505 * s, cz + 0.14 * s, 0.145 * s, 0.145 * s, 0.022 * s, 12, 'y', 'brass', 'detail');
    b.addBox(cx - 0.1 * s, cy + 0.69 * s, cz + 0.18 * s, 0.016 * s, 0.016 * s, 0.22 * s, { materialRole: 'wood', layer: 'detail', rotXDeg: 28, rotYDeg: -20 });
    b.addBox(cx + 0.12 * s, cy + 0.66 * s, cz + 0.14 * s, 0.016 * s, 0.016 * s, 0.22 * s, { materialRole: 'wood', layer: 'detail', rotXDeg: 28, rotYDeg: 35 });
  }
}

function holBuildStringLights(group, cfg, b, mats, meta) {
  const mode = cfg.strandStyle || 'facade_eave_c9_lights';
  const w = clamp(cfg.width || 3.2, 0.75, 6.5);
  const h = clamp(cfg.height || 0.9, 0.28, 2.8);
  const sag = clamp(cfg.sagAmount ?? 0.12, 0, 0.42);
  const bulbCount = Math.max(4, Math.round(cfg.bulbCount || 14));
  const scheme = cfg.lightColorScheme || 'multicolor';
  const lit = cfg.lampLit !== false;

  meta.passable = true;
  meta.surfaceRelationship = {
    attachMode: 'surface_stick',
    canAttachToBuildings: true,
    canAttachToObjects: true,
    supportsWrapAround: mode === 'object_wrap_spiral_lights',
    passable: true,
    spanWidthMeters: Number(w.toFixed(3)),
    stickNormal: (cfg.attachmentProfile === 'ceiling_mounted' || cfg.attachmentProfile === 'hanging') ? [0, -1, 0] : [0, 0, 1]
  };
  meta.snapAnchors.push(
    { id: 'clip_left', position: [-w * 0.48, 0, 0], normal: [0, 0, 1] },
    { id: 'clip_center', position: [0, 0, 0], normal: [0, 0, 1] },
    { id: 'clip_right', position: [w * 0.48, 0, 0], normal: [0, 0, 1] }
  );

  if (mode === 'facade_eave_c9_lights') {
    // Adhesive mounting clip strip & top rail flush against z = 0 facing +z
    const clipCount = Math.max(3, Math.round(w / 0.85) + 1);
    for (let c = 0; c < clipCount; c++) {
      const cx = -w * 0.5 + (clipCount > 1 ? (c / (clipCount - 1)) * w : 0);
      b.addBox(cx, 0, 0.015, 0.036, 0.036, 0.03, { materialRole: 'frame', layer: 'detail' });
    }
    const segs = bulbCount - 1;
    for (let i = 0; i < bulbCount; i++) {
      const t = i / Math.max(1, segs);
      const bx = -w * 0.5 + t * w;
      const arcPhase = (t * Math.max(2, Math.round(w / 1.1))) % 1;
      const drop = Math.sin(arcPhase * Math.PI) * sag;
      const by = -drop;
      if (i < bulbCount - 1) {
        const nt = (i + 1) / Math.max(1, segs);
        const nx = -w * 0.5 + nt * w;
        const nPhase = (nt * Math.max(2, Math.round(w / 1.1))) % 1;
        const nby = -Math.sin(nPhase * Math.PI) * sag;
        b.addPipeSegment(bx, by, 0.025, nx, nby, 0.025, 0.008, 6, 'signalGreen', 'body');
      }
      b.addCylinder(bx, by - 0.024, 0.032, 0.014, 0.014, 0.03, 6, 'y', 'signalGreen', 'detail');
      b.addCone(bx, by - 0.072, 0.032, 0.022, -0.068, 6, holPickBulbRole(i, scheme, lit), 'detail');
    }
    if (lit) {
      meta.lightSources.push({ id: 'strand_glow', type: 'point', positionMeters: [0, -0.08, 0.25], color: '#ffe6a3', intensity: 1.4, rangeMeters: Math.max(3.5, w * 1.4), enabled: true });
    }
    return;
  }

  if (mode === 'icicle_drop_lights') {
    b.addBox(0, 0, 0.018, w, 0.024, 0.024, { materialRole: 'whiteTrim', layer: 'body' });
    const cols = Math.max(6, Math.round(bulbCount * 1.1));
    for (let i = 0; i < cols; i++) {
      const ix = -w * 0.48 + (cols > 1 ? (i / (cols - 1)) * (w * 0.96) : 0);
      const dropLen = h * (0.42 + ((i * 37) % 5) * 0.14);
      const bulbsOnDrop = Math.max(2, Math.round(dropLen / 0.15));
      b.addPipeSegment(ix, 0, 0.024, ix, -dropLen, 0.024, 0.006, 6, 'whiteTrim', 'body');
      for (let j = 0; j < bulbsOnDrop; j++) {
        const by = -((j + 0.8) / bulbsOnDrop) * dropLen;
        b.addCylinder(ix, by, 0.028, 0.014, 0.008, 0.048, 6, 'y', holPickBulbRole(i + j, scheme, lit), 'detail');
      }
    }
    if (lit) {
      meta.lightSources.push({ id: 'icicle_glow', type: 'point', positionMeters: [0, -h * 0.35, 0.25], color: scheme === 'icy_winter' ? '#bfe6ff' : '#fff0c7', intensity: 1.35, rangeMeters: 4.5, enabled: true });
    }
    return;
  }

  if (mode === 'festoon_swag_garland_lights') {
    const swags = Math.max(2, Math.round(w / 1.15));
    const stepsPerSwag = 5;
    for (let s = 0; s < swags; s++) {
      const x0 = -w * 0.5 + (s / swags) * w;
      const x1 = -w * 0.5 + ((s + 1) / swags) * w;
      holAddRedBow(b, x0, 0, 0.09, 0.24, 'safetyRed');
      for (let k = 0; k < stepsPerSwag; k++) {
        const t0 = k / stepsPerSwag;
        const t1 = (k + 1) / stepsPerSwag;
        const px0 = x0 + (x1 - x0) * t0;
        const py0 = -Math.sin(t0 * Math.PI) * Math.max(0.16, sag * 1.4);
        const px1 = x0 + (x1 - x0) * t1;
        const py1 = -Math.sin(t1 * Math.PI) * Math.max(0.16, sag * 1.4);
        b.addPipeSegment(px0, py0, 0.055, px1, py1, 0.055, 0.068, 8, 'foliage', 'body');
        b.addCylinder((px0 + px1) * 0.5, (py0 + py1) * 0.5 - 0.02, 0.125, 0.016, 0.016, 0.028, 6, 'z', holPickBulbRole(s * 7 + k, scheme, lit), 'detail');
      }
    }
    holAddRedBow(b, w * 0.5, 0, 0.09, 0.24, 'safetyRed');
    if (lit) {
      meta.lightSources.push({ id: 'garland_glow', type: 'point', positionMeters: [0, -0.18, 0.3], color: '#ffe09e', intensity: 1.3, rangeMeters: 4.0, enabled: true });
    }
    return;
  }

  if (mode === 'window_frame_light_border') {
    // 4-sided rectangular stick-on border light loop anchored on z = 0
    const hw = w * 0.5;
    const hh = h * 0.5;
    const corners = [
      [-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]
    ];
    for (let c = 0; c < 4; c++) {
      const a = corners[c];
      const n = corners[(c + 1) % 4];
      b.addBox(a[0], a[1], 0.015, 0.04, 0.04, 0.03, { materialRole: 'frame', layer: 'detail' });
      b.addPipeSegment(a[0], a[1], 0.024, n[0], n[1], 0.024, 0.009, 6, 'signalGreen', 'body');
      const segLen = Math.hypot(n[0] - a[0], n[1] - a[1]);
      const count = Math.max(3, Math.round(segLen / 0.18));
      for (let j = 1; j < count; j++) {
        const t = j / count;
        const px = a[0] + (n[0] - a[0]) * t;
        const py = a[1] + (n[1] - a[1]) * t;
        b.addCylinder(px, py, 0.035, 0.015, 0.015, 0.024, 6, 'z', holPickBulbRole(c * 9 + j, scheme, lit), 'detail');
      }
    }
    if (lit) {
      meta.lightSources.push({ id: 'window_border_glow', type: 'point', positionMeters: [0, 0, 0.25], color: '#ffe5a8', intensity: 1.2, rangeMeters: 3.5, enabled: true });
    }
    return;
  }

  if (mode === 'object_wrap_spiral_lights') {
    // Helical wrap string of lights designed to hug columns, poles, trees, or props
    const radius = clamp(w * 0.24, 0.14, 0.85);
    const wrapH = clamp(h, 0.8, 3.2);
    const turns = clamp(cfg.spiralTurns || 4.5, 2, 9);
    const steps = Math.max(20, bulbCount * 2);
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const a0 = t0 * turns * Math.PI * 2;
      const a1 = t1 * turns * Math.PI * 2;
      const x0 = Math.cos(a0) * radius;
      const z0 = Math.sin(a0) * radius;
      const y0 = t0 * wrapH;
      const x1 = Math.cos(a1) * radius;
      const z1 = Math.sin(a1) * radius;
      const y1 = t1 * wrapH;
      b.addPipeSegment(x0, y0, z0, x1, y1, z1, 0.008, 6, 'signalGreen', 'body');
      if (i % 2 === 0) {
        b.addCylinder(x0, y0, z0, 0.018, 0.018, 0.028, 6, 'y', holPickBulbRole(i / 2, scheme, lit), 'detail');
      }
    }
    // Top and bottom clip collars
    b.addPrismRing(0, 0.04, 0, radius + 0.02, radius - 0.01, 0.03, 12, 'y', 'frame', 'detail');
    b.addPrismRing(0, wrapH - 0.02, 0, radius + 0.02, radius - 0.01, 0.03, 12, 'y', 'frame', 'detail');
    if (lit) {
      meta.lightSources.push({ id: 'spiral_wrap_glow', type: 'point', positionMeters: [0, wrapH * 0.5, 0], color: '#ffe299', intensity: 1.5, rangeMeters: 4.0, enabled: true });
    }
    return;
  }

  // Overhead catenary street/patio festoon string span
  for (const sx of [-w * 0.5, w * 0.5]) {
    b.addBox(sx, 0, 0, 0.045, 0.045, 0.045, { materialRole: 'frame', layer: 'detail' });
  }
  const steps = Math.max(8, bulbCount);
  const droop = Math.max(0.22, sag * 1.8);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const x0 = -w * 0.5 + t0 * w;
    const y0 = -Math.sin(t0 * Math.PI) * droop;
    const x1 = -w * 0.5 + t1 * w;
    const y1 = -Math.sin(t1 * Math.PI) * droop;
    b.addPipeSegment(x0, y0, 0, x1, y1, 0, 0.01, 6, 'darkMetal', 'body');
    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5;
    b.addCylinder(mx, my - 0.03, 0, 0.014, 0.014, 0.035, 6, 'y', 'darkMetal', 'detail');
    b.addCylinder(mx, my - 0.075, 0, 0.028, 0.022, 0.055, 8, 'y', holPickBulbRole(i, scheme, lit), 'detail');
  }
  if (lit) {
    meta.lightSources.push({ id: 'festoon_span_glow', type: 'point', positionMeters: [0, -droop, 0], color: '#ffdf9e', intensity: 1.6, rangeMeters: Math.max(4.5, w * 1.5), enabled: true });
  }
}

function holBuildTreesAndWreaths(group, cfg, b, mats, meta) {
  const mode = cfg.treeStyle || 'classic_decorated_christmas_tree';
  const w = clamp(cfg.width || 1.35, 0.36, 3.4);
  const h = clamp(cfg.height || 2.35, 0.52, 5.2);
  const scheme = cfg.lightColorScheme || 'multicolor';
  const lit = cfg.lampLit !== false;

  if (mode === 'classic_decorated_christmas_tree' || mode === 'town_square_mega_tree') {
    const isMega = mode === 'town_square_mega_tree';
    const baseR = w * 0.46;
    if (isMega) {
      // Octagonal wooden plaza tree barrier fence
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.addBox(Math.cos(a) * (baseR * 1.08), 0.24, Math.sin(a) * (baseR * 1.08), baseR * 0.78, 0.48, 0.06, {
          materialRole: 'safetyRed',
          layer: 'body',
          rotYDeg: -(a * 180) / Math.PI + 90
        });
      }
    } else {
      b.addCylinder(0, 0.06, 0, baseR * 0.44, baseR * 0.52, 0.12, 8, 'y', 'safetyRed', 'body');
    }
    b.addCylinder(0, h * 0.24, 0, 0.11, 0.15, h * 0.48, 8, 'y', 'wood', 'body');
    const tiers = isMega ? 6 : 5;
    let lightIdx = 0;
    for (let t = 0; t < tiers; t++) {
      const frac = t / tiers;
      const tierY = h * (0.3 + frac * 0.58);
      const tierH = h * (isMega ? 0.24 : 0.28) * (1 - frac * 0.42);
      const tierR = baseR * (1 - frac * 0.76);
      b.addCone(0, tierY, 0, tierR, tierH, 10, 'foliage', 'body');
      const baubles = Math.max(4, Math.round(10 - t * 1.3));
      for (let k = 0; k < baubles; k++) {
        const angle = (k / baubles) * Math.PI * 2 + t * 0.55;
        const bx = Math.cos(angle) * (tierR * 0.88);
        const bz = Math.sin(angle) * (tierR * 0.88);
        const by = tierY - tierH * 0.26;
        b.addCylinder(bx, by, bz, 0.025, 0.025, 0.038, 6, 'y', holPickBulbRole(lightIdx++, scheme, lit), 'detail');
        if (k % 2 === 0 && t < tiers - 1) {
          b.addBox(bx * 0.92, by + 0.08, bz * 0.92, 0.065, 0.065, 0.065, { materialRole: k % 4 === 0 ? 'brass' : 'accent', layer: 'detail' });
        }
      }
    }
    holAddStarTopper(b, 0, h - 0.04, 0, clamp(h * 0.11, 0.16, 0.45), lit);
    if (!isMega) {
      holAddGiftBox(b, -baseR * 0.52, 0, baseR * 0.44, 0.34, 0.24, 0.3, 'safetyRed', 'lampGlow');
      holAddGiftBox(b, baseR * 0.48, 0, baseR * 0.38, 0.28, 0.2, 0.26, 'primary', 'accent');
      holAddGiftBox(b, 0.06, 0, -baseR * 0.52, 0.3, 0.26, 0.28, 'accent', 'safetyRed');
    }
    if (lit) {
      meta.lightSources.push({ id: 'tree_star_glow', type: 'point', positionMeters: [0, h * 0.75, 0], color: '#ffe59c', intensity: 2.0, rangeMeters: Math.max(4.5, h * 1.8), enabled: true });
    }
    return;
  }

  if (mode === 'tabletop_mini_christmas_tree') {
    const potH = h * 0.24;
    b.addCylinder(0, potH * 0.5, 0, w * 0.34, w * 0.26, potH, 10, 'y', 'safetyRed', 'body');
    for (let t = 0; t < 3; t++) {
      const ty = potH + h * (0.2 + t * 0.22);
      const tr = w * 0.44 * (1 - t * 0.28);
      const th = h * 0.32 * (1 - t * 0.2);
      b.addCone(0, ty, 0, tr, th, 8, 'foliage', 'body');
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + t * 0.6;
        b.addCylinder(Math.cos(a) * tr * 0.85, ty - th * 0.25, Math.sin(a) * tr * 0.85, 0.015, 0.015, 0.025, 6, 'y', holPickBulbRole(t * 5 + k, scheme, lit), 'detail');
      }
    }
    holAddStarTopper(b, 0, h - 0.02, 0, 0.11, lit);
    return;
  }

  if (mode === 'wall_pine_wreath_bow') {
    // Wall-mounted ring centered at z = 0 facing +z
    const outerR = clamp(w * 0.46, 0.25, 0.75);
    const innerR = outerR * 0.52;
    const cy = 0;
    b.addPrismRing(0, cy, 0.055, outerR, innerR, 0.1, 14, 'z', 'foliage', 'body');
    const lights = 10;
    const midR = (outerR + innerR) * 0.5;
    for (let i = 0; i < lights; i++) {
      const a = (i / lights) * Math.PI * 2;
      b.addCylinder(Math.cos(a) * midR, cy + Math.sin(a) * midR, 0.11, 0.018, 0.018, 0.026, 6, 'z', holPickBulbRole(i, scheme, lit), 'detail');
    }
    holAddRedBow(b, 0, cy + outerR * 0.78, 0.12, outerR * 0.62, 'safetyRed');
    if (lit) {
      meta.lightSources.push({ id: 'wreath_glow', type: 'point', positionMeters: [0, cy, 0.24], color: '#ffe19c', intensity: 1.0, rangeMeters: 2.8, enabled: true });
    }
    return;
  }

  // Holiday decorated streetlamp post with spiraling garland & wreath
  const postH = clamp(h, 2.2, 4.2);
  b.addCylinder(0, 0.16, 0, 0.18, 0.24, 0.32, 10, 'y', 'frame', 'body');
  b.addCylinder(0, postH * 0.48, 0, 0.055, 0.08, postH * 0.86, 10, 'y', 'frame', 'body');
  // Spiraling garland wraps up the post
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const a0 = t0 * Math.PI * 6;
    const a1 = t1 * Math.PI * 6;
    const y0 = 0.35 + t0 * (postH * 0.62);
    const y1 = 0.35 + t1 * (postH * 0.62);
    b.addPipeSegment(Math.cos(a0) * 0.095, y0, Math.sin(a0) * 0.095, Math.cos(a1) * 0.095, y1, Math.sin(a1) * 0.095, 0.032, 6, 'foliage', 'detail');
    if (i % 2 === 0) {
      b.addCylinder(Math.cos(a0) * 0.125, y0, Math.sin(a0) * 0.125, 0.015, 0.015, 0.024, 6, 'y', holPickBulbRole(i, scheme, lit), 'detail');
    }
  }
  b.addPrismRing(0, postH * 0.64, 0.09, 0.24, 0.13, 0.07, 12, 'z', 'foliage', 'detail');
  holAddRedBow(b, 0, postH * 0.64 + 0.18, 0.13, 0.22, 'safetyRed');
  // Lantern head + warm glowing panes
  b.addTrapezoidBox(0, postH - 0.18, 0, 0.22, 0.22, 0.34, 0.34, 0.34, { materialRole: lit ? 'lampGlow' : 'glass', layer: 'detail' });
  b.addCone(0, postH + 0.07, 0, 0.26, 0.16, 8, 'frame', 'body');
  if (lit) {
    meta.lightSources.push({ id: 'holiday_post_glow', type: 'point', positionMeters: [0, postH - 0.16, 0], color: '#ffe394', intensity: 1.8, rangeMeters: 5.5, enabled: true });
  }
}

function holBuildOutdoorYardDisplays(group, cfg, b, mats, meta) {
  const mode = cfg.yardStyle || 'classic_winter_snowman';
  const w = clamp(cfg.width || 1.25, 0.6, 2.8);
  const h = clamp(cfg.height || 1.85, 0.85, 2.85);
  const lit = cfg.lampLit !== false;

  if (mode === 'classic_winter_snowman') {
    const rBot = w * 0.4;
    const rMid = rBot * 0.74;
    const rHead = rMid * 0.72;
    const yBot = rBot * 0.85;
    const yMid = yBot + rBot * 0.72 + rMid * 0.68;
    const yHead = yMid + rMid * 0.72 + rHead * 0.68;
    for (const part of [{ y: yBot, r: rBot }, { y: yMid, r: rMid }, { y: yHead, r: rHead }]) {
      b.addCylinder(0, part.y, 0, part.r * 0.75, part.r * 0.98, part.r * 1.15, 12, 'y', 'whiteTrim', 'body');
      b.addCylinder(0, part.y + part.r * 0.56, 0, part.r * 0.28, part.r * 0.75, part.r * 0.36, 12, 'y', 'whiteTrim', 'body');
      b.addCylinder(0, part.y - part.r * 0.56, 0, part.r * 0.98, part.r * 0.32, part.r * 0.36, 12, 'y', 'whiteTrim', 'body');
    }
    // Red wool scarf + trailing end
    b.addPrismRing(0, yHead - rHead * 0.75, 0, rHead * 1.05, rHead * 0.5, 0.09, 12, 'y', 'safetyRed', 'detail');
    b.addBox(rHead * 0.42, yMid + rMid * 0.38, rMid * 0.72, 0.1, 0.34, 0.06, { materialRole: 'safetyRed', layer: 'detail', rotXDeg: -14 });
    // Charcoal buttons, carrot nose & twig arms
    for (const by of [yMid + 0.08, yMid - 0.12, yBot + 0.18]) {
      b.addCylinder(0, by, rMid * 0.94, 0.032, 0.032, 0.025, 8, 'z', 'darkMetal', 'detail');
    }
    for (const ex of [-rHead * 0.34, rHead * 0.34]) {
      b.addCylinder(ex, yHead + rHead * 0.18, rHead * 0.88, 0.026, 0.026, 0.025, 8, 'z', 'darkMetal', 'detail');
    }
    b.addCone(0, yHead, rHead * 1.05, 0.042, 0.22, 8, 'accent', 'detail', 'z');
    b.addPipeSegment(-rMid * 0.82, yMid + 0.08, 0, -rMid * 1.75, yMid + 0.36, 0.08, 0.024, 6, 'wood', 'detail');
    b.addPipeSegment(rMid * 0.82, yMid + 0.08, 0, rMid * 1.75, yMid + 0.36, 0.08, 0.024, 6, 'wood', 'detail');
    // Black top hat + red ribbon band
    const hatY = yHead + rHead * 0.72;
    b.addCylinder(0, hatY, 0, rHead * 1.25, rHead * 1.25, 0.035, 12, 'y', 'darkMetal', 'body');
    b.addCylinder(0, hatY + 0.18, 0, rHead * 0.8, rHead * 0.74, 0.32, 12, 'y', 'darkMetal', 'body');
    b.addCylinder(0, hatY + 0.05, 0, rHead * 0.83, rHead * 0.83, 0.065, 12, 'y', 'safetyRed', 'detail');
    return;
  }

  if (mode === 'lit_wireframe_reindeer_sleigh') {
    const glowRole = lit ? 'lampGlow' : 'brass';
    // Glowing reindeer standing in front (+z)
    const rz = 0.65;
    for (const lx of [-0.14, 0.14]) {
      b.addPipeSegment(lx, 0, rz + 0.22, lx, 0.66, rz + 0.18, 0.024, 6, glowRole, 'body');
      b.addPipeSegment(lx, 0, rz - 0.22, lx, 0.66, rz - 0.18, 0.024, 6, glowRole, 'body');
    }
    b.addCylinder(0, 0.72, rz, 0.18, 0.2, 0.68, 10, 'z', glowRole, 'body');
    b.addPipeSegment(0, 0.78, rz + 0.26, 0, 1.18, rz + 0.44, 0.08, 8, glowRole, 'body');
    b.addBox(0, 1.26, rz + 0.54, 0.18, 0.18, 0.28, { materialRole: glowRole, layer: 'body' });
    b.addCylinder(0, 1.26, rz + 0.7, 0.036, 0.036, 0.04, 8, 'z', 'signalRed', 'detail');
    for (const ax of [-0.08, 0.08]) {
      b.addPipeSegment(ax, 1.35, rz + 0.48, ax * 2.8, 1.66, rz + 0.44, 0.018, 6, glowRole, 'detail');
    }
    // Red-and-gold gift sleigh behind (-z)
    const sz = -0.58;
    for (const rx of [-0.34, 0.34]) {
      b.addBox(rx, 0.04, sz, 0.04, 0.06, 1.05, { materialRole: 'brass', layer: 'body' });
      b.addPipeSegment(rx, 0.06, sz - 0.35, rx, 0.28, sz - 0.32, 0.025, 6, 'brass', 'detail');
      b.addPipeSegment(rx, 0.06, sz + 0.35, rx, 0.28, sz + 0.32, 0.025, 6, 'brass', 'detail');
    }
    b.addBox(0, 0.38, sz, 0.74, 0.32, 0.92, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, 0.66, sz - 0.42, 0.76, 0.42, 0.08, { materialRole: 'safetyRed', layer: 'body', rotXDeg: 18 });
    holAddGiftBox(b, -0.15, 0.54, sz, 0.28, 0.26, 0.28, 'signalGreen', 'lampGlow');
    holAddGiftBox(b, 0.18, 0.54, sz + 0.08, 0.24, 0.22, 0.24, 'accent', 'safetyRed');
    if (lit) {
      meta.lightSources.push({ id: 'reindeer_glow', type: 'point', positionMeters: [0, 1.05, 0.65], color: '#ffe59c', intensity: 1.7, rangeMeters: 5.0, enabled: true });
    }
    return;
  }

  if (mode === 'giant_candy_cane_pair') {
    for (const sx of [-w * 0.34, w * 0.34]) {
      const dir = sx < 0 ? 1 : -1;
      holAddCurvedCandyCane(b, sx, dir, h, lit);
    }
    return;
  }

  if (mode === 'santa_workshop_north_pole_sign') {
    b.addCylinder(0, 0.08, 0, 0.32, 0.38, 0.16, 12, 'y', 'whiteTrim', 'body');
    const segs = 8;
    const poleH = h * 0.85;
    for (let i = 0; i < segs; i++) {
      b.addCylinder(0, 0.16 + (i + 0.5) * (poleH / segs), 0, 0.065, 0.065, poleH / segs, 10, 'y', i % 2 === 0 ? 'safetyRed' : 'whiteTrim', 'body');
    }
    b.addCylinder(0, poleH + 0.24, 0, 0.14, 0.14, 0.22, 10, 'y', lit ? 'lampGlow' : 'brass', 'detail');
    b.addBox(0.18, poleH - 0.14, 0, 0.76, 0.2, 0.035, { materialRole: 'wood', layer: 'body', rotZDeg: 6 });
    objCreateSignPlane(group, 'North Pole', 0.7, 0.16, '#8b2420', '#ffffff', { x: 0.18, y: poleH - 0.14, z: 0.022, rotZ: 0.1 });
    b.addBox(-0.18, poleH - 0.42, 0, 0.72, 0.2, 0.035, { materialRole: 'wood', layer: 'body', rotZDeg: -5 });
    objCreateSignPlane(group, 'Workshop', 0.66, 0.16, '#1f5e39', '#ffffff', { x: -0.18, y: poleH - 0.42, z: 0.022, rotZ: -0.09 });
    return;
  }

  // Giant yard gift trio
  holAddGiftBox(b, -w * 0.24, 0, 0.08, w * 0.44, h * 0.66, w * 0.44, 'safetyRed', 'lampGlow');
  holAddGiftBox(b, w * 0.24, 0, 0.14, w * 0.38, h * 0.5, w * 0.38, 'signalGreen', 'safetyRed');
  holAddGiftBox(b, 0.04, 0, -w * 0.24, w * 0.36, h * 0.85, w * 0.36, 'accent', 'lampGlow');
}

function holBuildIndoorMantelGifts(group, cfg, b, mats, meta) {
  const mode = cfg.indoorStyle || 'fireplace_stockings_mantel';
  const w = clamp(cfg.width || 1.65, 0.38, 2.4);
  const d = clamp(cfg.depth || 0.56, 0.24, 0.95);
  const h = clamp(cfg.height || 1.35, 0.26, 2.2);
  const lit = cfg.lampLit !== false;

  if (mode === 'fireplace_stockings_mantel') {
    b.addBox(0, 0.05, 0.12, w + 0.14, 0.1, d + 0.22, { materialRole: 'stone', layer: 'body' });
    b.addBox(-w * 0.36, h * 0.46, 0, w * 0.24, h * 0.78, d * 0.86, { materialRole: 'brick', layer: 'body' });
    b.addBox(w * 0.36, h * 0.46, 0, w * 0.24, h * 0.78, d * 0.86, { materialRole: 'brick', layer: 'body' });
    b.addBox(0, h * 0.82, 0, w * 0.96, h * 0.24, d * 0.86, { materialRole: 'brick', layer: 'body' });
    b.addBox(0, h * 0.42, -d * 0.32, w * 0.52, h * 0.68, d * 0.2, { materialRole: 'darkMetal', layer: 'body' });
    // Timber mantel shelf + upper chimney breast + glowing Yule logs
    b.addBox(0, h * 0.96, 0.04, w + 0.12, 0.08, d + 0.08, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, h + 0.32, -0.04, w * 0.76, 0.56, d * 0.72, { materialRole: 'stone', layer: 'body' });
    for (let i = 0; i < 3; i++) {
      b.addCylinder(0, 0.16, 0, 0.055, 0.06, 0.46, 8, 'x', 'wood', 'detail', (i - 1) * 0.35);
    }
    if (lit) {
      b.addCone(0, 0.3, 0, 0.16, 0.26, 8, 'lampGlow', 'detail');
      b.addCone(0, 0.24, 0, 0.22, 0.14, 8, 'warningYellow', 'detail');
      meta.lightSources.push({ id: 'hearth_fire_glow', type: 'point', positionMeters: [0, 0.45, 0.35], color: '#ffae52', intensity: 1.8, rangeMeters: 5.0, enabled: true });
    }
    // Draped lit garland across mantel & 4 hanging stockings
    b.addBox(0, h * 1.02, d * 0.46, w * 0.96, 0.12, 0.12, { materialRole: 'foliage', layer: 'detail' });
    for (let s = 0; s < 4; s++) {
      const sx = -w * 0.3 + (s / 3) * (w * 0.6);
      b.addBox(sx, h * 0.9, d * 0.51, 0.12, 0.07, 0.04, { materialRole: 'whiteTrim', layer: 'detail' });
      b.addBox(sx, h * 0.76, d * 0.51, 0.11, 0.22, 0.04, { materialRole: s % 2 === 0 ? 'safetyRed' : 'signalGreen', layer: 'detail' });
      b.addBox(sx + 0.04, h * 0.64, d * 0.51, 0.16, 0.08, 0.04, { materialRole: s % 2 === 0 ? 'safetyRed' : 'signalGreen', layer: 'detail' });
    }
    return;
  }

  if (mode === 'wrapped_presents_pile') {
    holAddGiftBox(b, -w * 0.2, 0, 0.04, w * 0.42, h * 0.68, d * 0.48, 'safetyRed', 'lampGlow');
    holAddGiftBox(b, w * 0.22, 0, 0.08, w * 0.36, h * 0.48, d * 0.44, 'signalGreen', 'accent');
    holAddGiftBox(b, 0.02, 0, -d * 0.22, w * 0.38, h * 0.85, d * 0.38, 'primary', 'lampGlow');
    holAddGiftBox(b, -w * 0.18, h * 0.68, 0.04, w * 0.24, h * 0.32, d * 0.26, 'accent', 'safetyRed');
    return;
  }

  if (mode === 'holiday_nutcracker_soldier') {
    holAddNutcrackerFigure(b, {
      scale: h / 1.48,
      tunicRole: 'safetyRed',
      trouserRole: 'primary',
      hatType: 'shako',
      accessory: 'saber',
      cape: false,
      jawOpen: 0.038,
      lit
    });
    return;
  }

  // Advent & pinecone holiday tabletop centerpiece (surface_placed)
  b.addCylinder(0, 0.018, 0, w * 0.48, w * 0.44, 0.036, 12, 'y', 'brass', 'body');
  b.addPrismRing(0, 0.07, 0, w * 0.42, w * 0.2, 0.08, 12, 'y', 'foliage', 'body');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const cx = Math.cos(a) * (w * 0.3);
    const cz = Math.sin(a) * (w * 0.3);
    const ch = h * (0.55 + (i % 2) * 0.18);
    b.addCylinder(cx, 0.06 + ch * 0.5, cz, 0.032, 0.032, ch, 10, 'y', i % 2 === 0 ? 'safetyRed' : 'whiteTrim', 'body');
    if (lit) {
      b.addCone(cx, 0.08 + ch + 0.03, cz, 0.018, 0.055, 6, 'lampGlow', 'detail');
    }
  }
}

function holBuildNutcrackerCollection(group, cfg, b, mats, meta) {
  const mode = cfg.nutcrackerStyle || 'royal_nutcracker_king';
  const w = clamp(cfg.width || 0.72, 0.34, 1.85);
  const h = clamp(cfg.height || 1.68, 0.28, 2.35);
  const jawOpen = clamp(cfg.jawOpenAmount ?? 0.04, 0.015, 0.07);
  const lit = cfg.lampLit !== false;

  if (mode === 'royal_nutcracker_king') {
    holAddNutcrackerFigure(b, {
      scale: h / 1.5,
      tunicRole: 'primary',
      trouserRole: 'safetyRed',
      hatType: 'crown',
      accessory: 'scepter',
      cape: true,
      jawOpen,
      lit
    });
    if (lit) {
      meta.lightSources.push({ id: 'king_scepter_glow', type: 'point', positionMeters: [0.22, h * 0.75, 0.22], color: '#ffe59c', intensity: 1.0, rangeMeters: 2.8, enabled: true });
    }
    return;
  }

  if (mode === 'drummer_boy_nutcracker') {
    holAddNutcrackerFigure(b, {
      scale: h / 1.54,
      tunicRole: 'signalGreen',
      trouserRole: 'primary',
      hatType: 'shako',
      accessory: 'drum',
      cape: false,
      jawOpen,
      lit
    });
    return;
  }

  if (mode === 'giant_porch_guard_nutcracker') {
    // Porch sentry standing atop a tall holiday gift block with glowing lantern staff
    const pedH = clamp(h * 0.2, 0.3, 0.48);
    holAddGiftBox(b, 0, 0, 0, 0.54, pedH, 0.54, 'safetyRed', 'brass');
    holAddNutcrackerFigure(b, {
      cy: pedH,
      scale: (h - pedH) / 1.56,
      tunicRole: 'safetyRed',
      trouserRole: 'primary',
      hatType: 'shako',
      accessory: 'lantern',
      cape: true,
      jawOpen,
      lit
    });
    if (lit) {
      meta.lightSources.push({ id: 'porch_guard_lantern', type: 'point', positionMeters: [0.24, h * 0.8, 0.32], color: '#ffe394', intensity: 1.6, rangeMeters: 4.5, enabled: true });
    }
    return;
  }

  if (mode === 'tabletop_nutcracker_trio') {
    // Shared carved oak tabletop mantel bar holding 3 colorful mini nutcrackers (surface_placed)
    b.addBox(0, 0.018, 0, w, 0.036, 0.22, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.038, 0, w - 0.02, 0.01, 0.2, { materialRole: 'brass', layer: 'detail' });
    const figScale = clamp((h - 0.04) / 1.54, 0.16, 0.36);
    holAddNutcrackerFigure(b, { cx: -w * 0.3, cy: 0.04, scale: figScale, tunicRole: 'safetyRed', trouserRole: 'primary', hatType: 'shako', accessory: 'saber', jawOpen, lit });
    holAddNutcrackerFigure(b, { cx: 0, cy: 0.04, scale: figScale * 1.12, tunicRole: 'primary', trouserRole: 'safetyRed', hatType: 'crown', accessory: 'scepter', cape: true, jawOpen, lit });
    holAddNutcrackerFigure(b, { cx: w * 0.3, cy: 0.04, scale: figScale, tunicRole: 'signalGreen', trouserRole: 'primary', hatType: 'shako', accessory: 'drum', jawOpen, lit });
    return;
  }

  if (mode === 'nutcracker_ballet_music_box') {
    // Octagonal inlaid mahogany music box with brass wind-up key & ballet prince + ballerina inside arch
    const baseH = h * 0.34;
    b.addCylinder(0, baseH * 0.5, 0, w * 0.44, w * 0.5, baseH, 8, 'y', 'wood', 'body');
    b.addCylinder(0, baseH + 0.015, 0, w * 0.46, w * 0.46, 0.03, 8, 'y', 'brass', 'detail');
    // Wind-up brass key on right side
    b.addCylinder(w * 0.48, baseH * 0.5, 0, 0.012, 0.012, 0.08, 8, 'x', 'brass', 'detail');
    b.addPrismRing(w * 0.53, baseH * 0.5, 0, 0.042, 0.024, 0.014, 8, 'z', 'brass', 'detail');
    // Miniature stage Nutcracker Prince & Sugar Plum dancer
    holAddNutcrackerFigure(b, { cx: -w * 0.12, cy: baseH + 0.03, scale: (h - baseH) * 0.48, tunicRole: 'safetyRed', trouserRole: 'primary', hatType: 'crown', accessory: 'saber', jawOpen, lit });
    b.addCylinder(w * 0.14, baseH + 0.14, 0, 0.035, 0.042, 0.14, 8, 'y', 'accent', 'body');
    b.addCylinder(w * 0.14, baseH + 0.12, 0, 0.095, 0.055, 0.035, 10, 'y', 'whiteTrim', 'detail');
    b.addCylinder(w * 0.14, baseH + 0.24, 0, 0.032, 0.032, 0.06, 8, 'y', 'secondary', 'detail');
    // Ornate golden ballet arch frame overhead
    b.addPipeSegment(-w * 0.38, baseH + 0.02, 0, -w * 0.38, h * 0.86, 0, 0.016, 6, 'brass', 'body');
    b.addPipeSegment(w * 0.38, baseH + 0.02, 0, w * 0.38, h * 0.86, 0, 0.016, 6, 'brass', 'body');
    b.addPipeSegment(-w * 0.38, h * 0.86, 0, 0, h * 0.98, 0, 0.016, 6, 'brass', 'body');
    b.addPipeSegment(w * 0.38, h * 0.86, 0, 0, h * 0.98, 0, 0.016, 6, 'brass', 'body');
    holAddStarTopper(b, 0, h, 0, 0.085, lit);
    return;
  }

  // Seven-crown Mouse King villain figure
  holAddNutcrackerFigure(b, {
    scale: h / 1.54,
    tunicRole: 'primary',
    trouserRole: 'frame',
    hatType: 'mouse_crown',
    accessory: 'rapier',
    cape: true,
    jawOpen,
    lit
  });
}

export function registerHolidayChristmasFamilies() {
  registerObjectFamily({
    id: 'holiday_string_lights',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'String Lights & Eave Strands',
    subcategories: ['String Lights & Eave Strands', 'Home Lighting, Decor & Clutter'],
    label: 'Stick-On Building & Object String Lights',
    description: 'Attachable Christmas C9 light strands, hanging icicle curtains, lit pine garland swags, rectangular window frame borders, pole/object wrap spirals, and overhead festoon spans.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'furniture_attached', 'hanging', 'roof_mounted', 'ceiling_mounted'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'both',
    environmentTags: ['holiday', 'christmas', 'winter', 'street', 'patio', 'residential_interior'],
    tags: ['christmas', 'string_lights', 'icicles', 'garland', 'holiday', 'eaves', 'building_lights', 'wrap_lights'],
    materialSlots: ['primary', 'accent', 'frame', 'foliage', 'neonGlow', 'signalRed', 'signalGreen', 'lampGlow'],
    schema: [
      { group: 'String Light Style', tab: 'structure' },
      {
        key: 'strandStyle',
        label: 'Strand Archetype',
        type: 'select',
        tab: 'structure',
        default: 'facade_eave_c9_lights',
        options: [
          ['facade_eave_c9_lights', 'Building Eave C9 Light Strand'],
          ['icicle_drop_lights', 'Hanging Icicle Curtain Lights'],
          ['festoon_swag_garland_lights', 'Lit Pine Garland Swag Strand'],
          ['window_frame_light_border', 'Window & Door Perimeter Border'],
          ['object_wrap_spiral_lights', 'Pole / Column / Object Wrap Spiral'],
          ['hanging_street_festoon_span', 'Overhead Street Festoon Span']
        ]
      },
      { key: 'width', label: 'Span / Wrap Width', type: 'range', tab: 'structure', min: 0.75, max: 6.5, step: 0.1, unit: 'm', default: 3.2 },
      { key: 'height', label: 'Drop / Wrap Height', type: 'range', tab: 'structure', min: 0.28, max: 2.8, step: 0.05, unit: 'm', default: 0.72 },
      { key: 'bulbCount', label: 'Bulb Density', type: 'range', tab: 'structure', min: 4, max: 28, step: 1, default: 14 },
      { key: 'sagAmount', label: 'Wire Sag Droop', type: 'range', tab: 'structure', min: 0, max: 0.42, step: 0.02, unit: 'm', default: 0.12 },
      { key: 'spiralTurns', label: 'Spiral Wrap Turns', type: 'range', tab: 'structure', min: 2, max: 9, step: 0.5, default: 4.5 },
      { group: 'Illumination', tab: 'details' },
      {
        key: 'lightColorScheme',
        label: 'Bulb Color Scheme',
        type: 'select',
        tab: 'details',
        default: 'multicolor',
        options: [
          ['multicolor', 'Classic Multicolor Holiday'],
          ['warm_white', 'Warm White Incandescent'],
          ['icy_winter', 'Icy Blue & Frost White'],
          ['red_green', 'Candy Red & Emerald'],
          ['gold_crimson', 'Warm Gold & Crimson']
        ]
      },
      { key: 'lampLit', label: 'Lights Powered On', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'eave_c9_multicolor_strand', label: 'Building Eave C9 Multicolor Lights', locationContext: 'exterior', paletteFamily: 'modern_corporate', params: { strandStyle: 'facade_eave_c9_lights', width: 3.4, height: 0.35, bulbCount: 16, sagAmount: 0.12, lightColorScheme: 'multicolor', lampLit: true } },
      { id: 'eave_c9_warm_white_strand', label: 'Building Eave Warm White Lights', locationContext: 'exterior', paletteFamily: 'modern_corporate', params: { strandStyle: 'facade_eave_c9_lights', width: 3.4, height: 0.35, bulbCount: 16, sagAmount: 0.1, lightColorScheme: 'warm_white', lampLit: true } },
      { id: 'hanging_icicle_curtain_lights', label: 'Roofline Icicle Curtain Lights', locationContext: 'exterior', paletteFamily: 'clean_medical_office', emissiveColor: '#8ad8ff', params: { strandStyle: 'icicle_drop_lights', width: 3.0, height: 0.85, bulbCount: 16, lightColorScheme: 'icy_winter', lampLit: true } },
      { id: 'lit_pine_garland_swag_strand', label: 'Stick-On Lit Pine Garland Swag', attachmentProfile: 'furniture_attached', locationContext: 'both', paletteFamily: 'park_heritage', params: { strandStyle: 'festoon_swag_garland_lights', width: 3.0, height: 0.45, bulbCount: 14, sagAmount: 0.16, lightColorScheme: 'gold_crimson', lampLit: true } },
      { id: 'window_border_string_lights', label: 'Window Frame Perimeter Lights', locationContext: 'both', paletteFamily: 'modern_corporate', params: { strandStyle: 'window_frame_light_border', width: 1.45, height: 1.85, bulbCount: 16, lightColorScheme: 'warm_white', lampLit: true } },
      { id: 'column_object_wrap_lights', label: 'Column & Object Wrap Spiral Lights', attachmentProfile: 'furniture_attached', locationContext: 'both', paletteFamily: 'modern_corporate', params: { strandStyle: 'object_wrap_spiral_lights', width: 1.0, height: 2.2, bulbCount: 18, spiralTurns: 5.5, lightColorScheme: 'multicolor', lampLit: true } },
      { id: 'street_festoon_overhead_lights', label: 'Overhead Street Festoon String', attachmentProfile: 'hanging', locationContext: 'exterior', paletteFamily: 'modern_corporate', params: { strandStyle: 'hanging_street_festoon_span', width: 4.4, height: 0.65, bulbCount: 12, sagAmount: 0.24, lightColorScheme: 'warm_white', lampLit: true } }
    ],
    buildGeometry: holBuildStringLights
  });

  registerObjectFamily({
    id: 'holiday_christmas_trees_wreaths',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Christmas Trees & Wreaths',
    subcategories: ['Christmas Trees & Wreaths', 'Home Lighting, Decor & Clutter'],
    label: 'Christmas Trees, Wreaths & Light Posts',
    description: 'Decorated evergreen Christmas trees with stars and presents, plaza mega trees, tabletop mini trees, wall pine wreaths with bows, and garland-wrapped holiday lamp posts.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'surface_placed'],
    sizeClass: 'large',
    functionalRole: 'decorative',
    locationContext: 'both',
    environmentTags: ['holiday', 'christmas', 'winter', 'living_room', 'lobby', 'outdoor_plaza'],
    tags: ['christmas_tree', 'wreath', 'evergreen', 'star', 'garland', 'holiday_post', 'ornaments'],
    materialSlots: ['primary', 'accent', 'frame', 'wood', 'foliage', 'brass', 'safetyRed', 'lampGlow'],
    schema: [
      { group: 'Tree & Wreath', tab: 'structure' },
      {
        key: 'treeStyle',
        label: 'Holiday Piece',
        type: 'select',
        tab: 'structure',
        default: 'classic_decorated_christmas_tree',
        options: [
          ['classic_decorated_christmas_tree', 'Classic Decorated Christmas Tree'],
          ['town_square_mega_tree', 'Town Square Mega Holiday Tree'],
          ['tabletop_mini_christmas_tree', 'Tabletop Mini Pine Tree'],
          ['wall_pine_wreath_bow', 'Wall Pine Wreath & Red Bow'],
          ['lighted_garland_lamp_post', 'Holiday Garland Streetlamp Post']
        ]
      },
      { key: 'width', label: 'Width / Spread', type: 'range', tab: 'structure', min: 0.36, max: 3.4, step: 0.05, unit: 'm', default: 1.4 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.52, max: 5.2, step: 0.05, unit: 'm', default: 2.38 },
      {
        key: 'lightColorScheme',
        label: 'Light Scheme',
        type: 'select',
        tab: 'details',
        default: 'multicolor',
        options: [
          ['multicolor', 'Classic Multicolor'],
          ['warm_white', 'Warm White'],
          ['gold_crimson', 'Gold & Crimson'],
          ['icy_winter', 'Icy Blue & White']
        ]
      },
      { key: 'lampLit', label: 'Tree & Star Lights Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'classic_decorated_christmas_tree', label: 'Classic Decorated Christmas Tree', locationContext: 'interior', paletteFamily: 'park_heritage', primaryColor: '#2759a6', accentColor: '#e5b83b', params: { treeStyle: 'classic_decorated_christmas_tree', width: 1.45, height: 2.38, lightColorScheme: 'multicolor', lampLit: true } },
      { id: 'plaza_town_square_mega_tree', label: 'Town Square Giant Holiday Tree', locationContext: 'exterior', paletteFamily: 'park_heritage', primaryColor: '#204f96', accentColor: '#f2c144', params: { treeStyle: 'town_square_mega_tree', width: 2.8, height: 4.6, lightColorScheme: 'gold_crimson', lampLit: true } },
      { id: 'tabletop_mini_evergreen_tree', label: 'Tabletop Mini Pine Tree', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'park_heritage', params: { treeStyle: 'tabletop_mini_christmas_tree', width: 0.44, height: 0.68, lightColorScheme: 'warm_white', lampLit: true } },
      { id: 'wall_holiday_pine_wreath', label: 'Lit Wall Pine Wreath & Bow', attachmentProfile: 'wall_mounted', locationContext: 'both', paletteFamily: 'park_heritage', params: { treeStyle: 'wall_pine_wreath_bow', width: 0.92, height: 0.92, lightColorScheme: 'gold_crimson', lampLit: true } },
      { id: 'holiday_garland_lamp_post', label: 'Holiday Garland Streetlamp Post', locationContext: 'exterior', paletteFamily: 'older_metropolitan', frameColor: '#20262c', params: { treeStyle: 'lighted_garland_lamp_post', width: 0.62, height: 3.25, lightColorScheme: 'warm_white', lampLit: true } }
    ],
    buildGeometry: holBuildTreesAndWreaths
  });

  registerObjectFamily({
    id: 'holiday_outdoor_yard_displays',
    categoryId: '30_holidays',
    categories: ['30_holidays'],
    subcategory: 'Outdoor Lawn & Porch Displays',
    label: 'Snowmen, Reindeer Sleighs & Lawn Props',
    description: 'Top-hat yard snowmen, glowing wireframe reindeer and sleighs, giant striped candy cane arches, North Pole signposts, and illuminated yard gift stacks.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'exterior',
    environmentTags: ['holiday', 'christmas', 'winter', 'patio', 'street', 'outdoor_plaza'],
    tags: ['snowman', 'reindeer', 'sleigh', 'candy_cane', 'north_pole', 'lawn_decor', 'christmas'],
    materialSlots: ['primary', 'accent', 'wood', 'brass', 'safetyRed', 'lampGlow', 'signalRed', 'signalGreen'],
    schema: [
      { group: 'Yard Display', tab: 'structure' },
      {
        key: 'yardStyle',
        label: 'Display Archetype',
        type: 'select',
        tab: 'structure',
        default: 'classic_winter_snowman',
        options: [
          ['classic_winter_snowman', 'Top-Hat Carrot-Nose Snowman'],
          ['lit_wireframe_reindeer_sleigh', 'Glowing Reindeer & Gift Sleigh'],
          ['giant_candy_cane_pair', 'Giant Candy Cane Pair'],
          ['santa_workshop_north_pole_sign', 'North Pole Workshop Signpost'],
          ['giant_yard_gift_stack', 'Illuminated Yard Gift Trio']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.6, max: 2.8, step: 0.05, unit: 'm', default: 1.2 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.85, max: 2.85, step: 0.05, unit: 'm', default: 1.85 },
      { key: 'lampLit', label: 'Holiday Lights Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'yard_top_hat_snowman', label: 'Top-Hat Carrot-Nose Snowman', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', accentColor: '#e87824', params: { yardStyle: 'classic_winter_snowman', width: 1.15, height: 1.85 } },
      { id: 'glowing_reindeer_and_sleigh', label: 'Lit Reindeer & Gift Sleigh', locationContext: 'exterior', paletteFamily: 'park_heritage', accentColor: '#e6b238', params: { yardStyle: 'lit_wireframe_reindeer_sleigh', width: 1.2, height: 1.72, lampLit: true } },
      { id: 'giant_candy_cane_pillars', label: 'Giant Illuminated Candy Canes', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', params: { yardStyle: 'giant_candy_cane_pair', width: 1.35, height: 1.95, lampLit: true } },
      { id: 'north_pole_workshop_signpost', label: 'North Pole Directional Signpost', locationContext: 'exterior', paletteFamily: 'wood_office_executive', woodColor: '#785032', params: { yardStyle: 'santa_workshop_north_pole_sign', width: 1.1, height: 2.25, lampLit: true } },
      { id: 'illuminated_yard_gift_trio', label: 'Oversized Yard Gift Stack', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', accentColor: '#d9a434', params: { yardStyle: 'giant_yard_gift_stack', width: 1.25, height: 1.05 } }
    ],
    buildGeometry: holBuildOutdoorYardDisplays
  });

  registerObjectFamily({
    id: 'holiday_indoor_mantel_gifts',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Indoor Mantle, Gifts & Tabletop',
    subcategories: ['Indoor Mantle, Gifts & Tabletop', 'Home Lighting, Decor & Clutter'],
    label: 'Holiday Hearth, Stockings & Gifts',
    description: 'Stone hearth fireplaces with lit garlands and hung stockings, wrapped gift stacks, standing wooden nutcracker soldiers, and Advent candle centerpieces.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'interior',
    environmentTags: ['holiday', 'christmas', 'winter', 'living_room', 'dining_room', 'residential_interior'],
    tags: ['fireplace', 'stockings', 'gifts', 'presents', 'nutcracker', 'candles', 'christmas', 'mantel'],
    materialSlots: ['primary', 'accent', 'wood', 'brick', 'stone', 'brass', 'safetyRed', 'lampGlow'],
    schema: [
      { group: 'Indoor Holiday Piece', tab: 'structure' },
      {
        key: 'indoorStyle',
        label: 'Holiday Piece',
        type: 'select',
        tab: 'structure',
        default: 'fireplace_stockings_mantel',
        options: [
          ['fireplace_stockings_mantel', 'Stone Hearth & Hung Stockings'],
          ['wrapped_presents_pile', 'Wrapped Holiday Gifts Stack'],
          ['holiday_nutcracker_soldier', 'Standing Nutcracker Soldier'],
          ['festive_advent_candle_centerpiece', 'Advent Candle Centerpiece']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.38, max: 2.4, step: 0.05, unit: 'm', default: 1.72 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.24, max: 0.95, step: 0.04, unit: 'm', default: 0.58 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.26, max: 2.2, step: 0.05, unit: 'm', default: 1.42 },
      { key: 'lampLit', label: 'Hearth / Candles Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'hearth_fireplace_stockings', label: 'Hearth Fireplace & Stockings', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#7b502e', concreteColor: '#8d887e', params: { indoorStyle: 'fireplace_stockings_mantel', width: 1.78, depth: 0.58, height: 1.42, lampLit: true } },
      { id: 'wrapped_holiday_gifts_pile', label: 'Wrapped Holiday Gifts Stack', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#2860a8', accentColor: '#e5b232', params: { indoorStyle: 'wrapped_presents_pile', width: 0.72, depth: 0.58, height: 0.44 } },
      { id: 'standing_wooden_nutcracker', label: 'Standing Nutcracker Soldier', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#254c8f', secondaryColor: '#f2d4b5', params: { indoorStyle: 'holiday_nutcracker_soldier', width: 0.48, depth: 0.46, height: 1.48, lampLit: true } },
      { id: 'advent_pine_candle_centerpiece', label: 'Advent Candle Centerpiece', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'park_heritage', params: { indoorStyle: 'festive_advent_candle_centerpiece', width: 0.56, depth: 0.56, height: 0.34, lampLit: true } }
    ],
    buildGeometry: holBuildIndoorMantelGifts
  });

  registerObjectFamily({
    id: 'holiday_nutcracker_collection',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Nutcrackers & Holiday Figures',
    subcategories: ['Nutcrackers & Holiday Figures', 'Indoor Mantle, Gifts & Tabletop', 'Outdoor Lawn & Porch Displays'],
    label: 'Royal Nutcrackers & Ballet Collection',
    description: 'Crowned Nutcracker King with cape and scepter, drummer boy soldier, giant lit porch guard nutcracker, mantel mini trio, wind-up ballet music box, and Seven-Crown Mouse King.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'both',
    environmentTags: ['holiday', 'christmas', 'winter', 'living_room', 'lobby', 'outdoor_plaza'],
    tags: ['nutcracker', 'king', 'drummer', 'mouse_king', 'music_box', 'porch_guard', 'christmas', 'ballet'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'brass', 'chrome', 'safetyRed', 'lampGlow'],
    schema: [
      { group: 'Nutcracker Model', tab: 'structure' },
      {
        key: 'nutcrackerStyle',
        label: 'Figure Style',
        type: 'select',
        tab: 'structure',
        default: 'royal_nutcracker_king',
        options: [
          ['royal_nutcracker_king', 'Royal Crowned Nutcracker King'],
          ['drummer_boy_nutcracker', 'Carved Drummer Soldier'],
          ['giant_porch_guard_nutcracker', 'Giant Lit Porch Guard Nutcracker'],
          ['tabletop_nutcracker_trio', 'Tabletop Mini Nutcracker Trio'],
          ['nutcracker_ballet_music_box', 'Nutcracker Ballet Music Box'],
          ['seven_crown_mouse_king', 'Seven-Crown Mouse King Villain']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.34, max: 1.85, step: 0.04, unit: 'm', default: 0.62 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.28, max: 2.35, step: 0.05, unit: 'm', default: 1.56 },
      { key: 'jawOpenAmount', label: 'Cracking Jaw Opening', type: 'range', tab: 'details', min: 0.015, max: 0.07, step: 0.005, default: 0.04 },
      { key: 'lampLit', label: 'Lantern / Crown Jewels Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'royal_nutcracker_king', label: 'Royal Crowned Nutcracker King', locationContext: 'both', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#2d3f91', secondaryColor: '#f2d4b5', accentColor: '#e5b232', params: { nutcrackerStyle: 'royal_nutcracker_king', width: 0.56, height: 1.58, jawOpenAmount: 0.042, lampLit: true } },
      { id: 'drummer_boy_nutcracker', label: 'Christmas Drummer Nutcracker', locationContext: 'both', paletteFamily: 'park_heritage', primaryColor: '#254c8f', secondaryColor: '#f2d4b5', accentColor: '#d9a434', params: { nutcrackerStyle: 'drummer_boy_nutcracker', width: 0.54, height: 1.52, jawOpenAmount: 0.036, lampLit: true } },
      { id: 'giant_porch_guard_nutcracker', label: 'Giant Lit Porch Guard Nutcracker', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#224785', secondaryColor: '#f2d4b5', accentColor: '#e8b638', params: { nutcrackerStyle: 'giant_porch_guard_nutcracker', width: 0.68, height: 2.18, jawOpenAmount: 0.045, lampLit: true } },
      { id: 'tabletop_nutcracker_trio', label: 'Mantel Mini Nutcracker Trio', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#254c8f', secondaryColor: '#f2d4b5', params: { nutcrackerStyle: 'tabletop_nutcracker_trio', width: 0.78, height: 0.44, jawOpenAmount: 0.035, lampLit: true } },
      { id: 'nutcracker_ballet_music_box', label: 'Nutcracker Ballet Music Box', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#7b4828', secondaryColor: '#f2d4b5', accentColor: '#e08ca6', params: { nutcrackerStyle: 'nutcracker_ballet_music_box', width: 0.46, height: 0.48, jawOpenAmount: 0.03, lampLit: true } },
      { id: 'seven_crown_mouse_king', label: 'Seven-Crown Mouse King Villain', locationContext: 'both', paletteFamily: 'modern_corporate', primaryColor: '#562b73', secondaryColor: '#b3aba2', frameColor: '#5b6068', params: { nutcrackerStyle: 'seven_crown_mouse_king', width: 0.56, height: 1.56, jawOpenAmount: 0.04, lampLit: true } }
    ],
    buildGeometry: holBuildNutcrackerCollection
  });
}
