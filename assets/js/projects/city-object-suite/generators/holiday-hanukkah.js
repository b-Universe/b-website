import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function hanAddStarOfDavid(b, cx, cy, cz, r = 0.14, tubeR = 0.012, role = 'neonGlow', layer = 'detail') {
  for (let tri = 0; tri < 2; tri++) {
    const baseAngle = tri === 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    const zOff = tri === 0 ? cz : cz + 0.003;
    const pts = [];
    for (let k = 0; k < 3; k++) {
      const a = baseAngle + k * ((Math.PI * 2) / 3);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, zOff]);
    }
    for (let k = 0; k < 3; k++) {
      const p0 = pts[k];
      const p1 = pts[(k + 1) % 3];
      b.addPipeSegment(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], tubeR, 6, role, layer, true);
    }
  }
}

function hanAddMenorahBranchCandle(b, cx, cupY, cz, candleH, candleR, cupRole = 'brass', candleRole = 'whiteTrim', isLit = true) {
  const cupH = candleR * 1.15;
  b.addCylinder(cx, cupY + cupH * 0.5, cz, candleR * 1.48, candleR * 1.04, cupH, 8, 'y', cupRole, 'detail');
  b.addCylinder(cx, cupY + cupH + candleH * 0.5, cz, candleR * 0.9, candleR * 0.96, candleH, 8, 'y', candleRole, 'detail');
  if (isLit) {
    b.addCone(cx, cupY + cupH + candleH + candleR * 1.15, cz, candleR * 0.95, candleR * 2.35, 6, 'lampGlow', 'detail');
  }
}

function hanAddHanukkiah(b, cx, cy, cz, w, h, metalRole = 'brass', style = 'curved_classic', litNights = 8, lit = true) {
  const baseH = h * 0.13;
  const stemTop = h * 0.78;
  const branchCupY = cy + h * 0.65;
  const shamashCupY = cy + stemTop;
  const tubeR = clamp(h * 0.028, 0.01, 0.045);
  const candleR = clamp(w * 0.025, 0.011, 0.04);
  const candleH = clamp(h * 0.16, 0.065, 0.36);

  // Stepped hexagonal base & center column rising to elevated shamash branch
  b.addCylinder(cx, cy + baseH * 0.25, cz, w * 0.22, w * 0.28, baseH * 0.5, 6, 'y', metalRole, 'body');
  b.addCylinder(cx, cy + baseH * 0.72, cz, w * 0.12, w * 0.19, baseH * 0.48, 6, 'y', metalRole, 'body');
  b.addCylinder(cx, cy + stemTop * 0.52, cz, tubeR * 1.25, tubeR * 1.55, stemTop * 0.9, 8, 'y', metalRole, 'body');

  if (style === 'modern_angled') {
    b.addBox(cx, cy + h * 0.32, cz, w * 0.09, h * 0.06, w * 0.09, { materialRole: 'primary', layer: 'detail' });
  } else {
    hanAddStarOfDavid(b, cx, cy + h * 0.42, cz + tubeR * 1.4, clamp(w * 0.08, 0.032, 0.14), clamp(tubeR * 0.45, 0.005, 0.015), 'primary', 'detail');
  }

  // Right-to-left branch ordering so litNights lights candles symmetrically right to left
  const branchX = [];
  for (let k = 3; k >= 0; k--) {
    branchX.push({ k, dx: (k + 1) * (w * 0.112) });
  }
  for (let k = 0; k < 4; k++) {
    branchX.push({ k, dx: -(k + 1) * (w * 0.112) });
  }

  const nights = clamp(Math.round(litNights ?? 8), 0, 8);
  const steps = 5;
  for (let i = 0; i < branchX.length; i++) {
    const item = branchX[i];
    const junctionY = cy + h * (0.28 + (3 - item.k) * 0.055);
    if (style === 'modern_angled') {
      const endY = branchCupY - candleR * 0.8;
      b.addPipeSegment(cx, junctionY, cz, cx + item.dx, endY, cz, tubeR, 8, metalRole, 'body', true);
      b.addPipeSegment(cx + item.dx, endY, cz, cx + item.dx, branchCupY, cz, tubeR, 8, metalRole, 'body', true);
      b.addCylinder(cx + item.dx, endY, cz, tubeR * 1.55, tubeR * 1.55, tubeR * 1.4, 8, 'y', 'primary', 'detail');
    } else {
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const t1 = (s + 1) / steps;
        const x0 = cx + item.dx * Math.sin(t0 * Math.PI * 0.5);
        const y0 = junctionY + (branchCupY - junctionY) * (1 - Math.cos(t0 * Math.PI * 0.5));
        const x1 = cx + item.dx * Math.sin(t1 * Math.PI * 0.5);
        const y1 = junctionY + (branchCupY - junctionY) * (1 - Math.cos(t1 * Math.PI * 0.5));
        b.addPipeSegment(x0, y0, cz, x1, y1, cz, tubeR, 8, metalRole, 'body', true);
      }
    }
    const candleLit = lit && i < nights;
    const waxRole = i % 2 === 0 ? 'whiteTrim' : 'primary';
    hanAddMenorahBranchCandle(b, cx + item.dx, branchCupY, cz, candleH, candleR, metalRole, waxRole, candleLit);
  }

  // Elevated center Shamash (9th candle)
  hanAddMenorahBranchCandle(b, cx, shamashCupY, cz, candleH * 1.08, candleR * 1.05, metalRole, 'whiteTrim', lit && nights > 0);
}

function hanAddDreidel(b, cx, cy, cz, scale = 1.0, bodyRole = 'primary', trimRole = 'chrome') {
  // Bottom spinning tip touching cy
  b.addCylinder(cx, cy + 0.08 * scale, cz, 0.14 * scale, 0.008 * scale, 0.16 * scale, 8, 'y', trimRole, 'body');
  b.addChamferBox(cx, cy + 0.27 * scale, cz, 0.28 * scale, 0.22 * scale, 0.28 * scale, 0.025 * scale, { materialRole: bodyRole, layer: 'body' });
  const faceDist = 0.143 * scale;
  b.addBox(cx, cy + 0.27 * scale, cz + faceDist, 0.15 * scale, 0.14 * scale, 0.012 * scale, { materialRole: trimRole, layer: 'detail' });
  b.addBox(cx, cy + 0.27 * scale, cz - faceDist, 0.15 * scale, 0.14 * scale, 0.012 * scale, { materialRole: trimRole, layer: 'detail' });
  b.addBox(cx + faceDist, cy + 0.27 * scale, cz, 0.012 * scale, 0.14 * scale, 0.15 * scale, { materialRole: trimRole, layer: 'detail' });
  b.addBox(cx - faceDist, cy + 0.27 * scale, cz, 0.012 * scale, 0.14 * scale, 0.15 * scale, { materialRole: trimRole, layer: 'detail' });
  b.addCylinder(cx, cy + 0.45 * scale, cz, 0.036 * scale, 0.044 * scale, 0.16 * scale, 8, 'y', trimRole, 'body');
  b.addCylinder(cx, cy + 0.54 * scale, cz, 0.024 * scale, 0.042 * scale, 0.035 * scale, 8, 'y', bodyRole, 'detail');
}

function hanAddSufganiyotLatkesPlatter(b, cx, cy, cz, scale = 1.0) {
  b.addCylinder(cx, cy + 0.016 * scale, cz, 0.28 * scale, 0.24 * scale, 0.032 * scale, 12, 'y', 'whiteTrim', 'body');
  b.addPrismRing(cx, cy + 0.028 * scale, cz, 0.285 * scale, 0.245 * scale, 0.018 * scale, 12, 'y', 'primary', 'detail');

  // Stacked golden potato latkes
  const latkeOffsets = [[-0.1, -0.05, 0], [-0.14, 0.06, 0.025], [-0.05, 0.05, 0.025], [-0.1, 0.01, 0.05]];
  for (const off of latkeOffsets) {
    b.addCylinder(cx + off[0] * scale, cy + (0.045 + off[2]) * scale, cz + off[1] * scale, 0.062 * scale, 0.065 * scale, 0.024 * scale, 10, 'y', 'warningYellow', 'detail');
  }

  // Dip bowls (applesauce & sour cream)
  b.addCylinder(cx - 0.04 * scale, cy + 0.055 * scale, cz - 0.14 * scale, 0.065 * scale, 0.05 * scale, 0.048 * scale, 10, 'y', 'whiteTrim', 'detail');
  b.addCylinder(cx - 0.04 * scale, cy + 0.072 * scale, cz - 0.14 * scale, 0.052 * scale, 0.052 * scale, 0.016 * scale, 10, 'y', 'accent', 'detail');

  // 3 powdered sufganiyot jelly donuts
  const donutCoords = [[0.11, 0.04], [0.05, 0.13], [0.15, -0.08]];
  for (const dc of donutCoords) {
    const dx = cx + dc[0] * scale;
    const dz = cz + dc[1] * scale;
    b.addCylinder(dx, cy + 0.056 * scale, dz, 0.052 * scale, 0.058 * scale, 0.048 * scale, 10, 'y', 'warningYellow', 'detail');
    b.addCylinder(dx, cy + 0.08 * scale, dz, 0.042 * scale, 0.048 * scale, 0.014 * scale, 10, 'y', 'whiteTrim', 'detail');
    b.addCylinder(dx, cy + 0.088 * scale, dz, 0.018 * scale, 0.022 * scale, 0.014 * scale, 8, 'y', 'safetyRed', 'detail');
  }
}

function hanAddBlueGiftBox(b, cx, cy, cz, w, h, d, wrapRole = 'primary', ribbonRole = 'whiteTrim') {
  b.addBox(cx, cy + h * 0.5, cz, w, h, d, { materialRole: wrapRole, layer: 'body' });
  b.addBox(cx, cy + h * 0.5, cz, w + 0.012, h + 0.012, Math.min(w, d) * 0.16, { materialRole: ribbonRole, layer: 'detail' });
  b.addBox(cx, cy + h * 0.5, cz, Math.min(w, d) * 0.16, h + 0.012, d + 0.012, { materialRole: ribbonRole, layer: 'detail' });
  b.addBox(cx, cy + h + 0.022, cz, w * 0.26, 0.036, 0.036, { materialRole: ribbonRole, layer: 'detail', rotZDeg: 24 });
  b.addBox(cx, cy + h + 0.022, cz, w * 0.26, 0.036, 0.036, { materialRole: ribbonRole, layer: 'detail', rotZDeg: -24 });
}

function hanBuildMenorahsAndLights(group, cfg, b, mats, meta) {
  const mode = cfg.hanukkahStyle || 'table_brass_menorah';
  const w = clamp(cfg.width || 0.58, 0.34, 5.2);
  const h = clamp(cfg.height || 0.52, 0.32, 3.8);
  const litNights = clamp(Math.round(cfg.litNights ?? 8), 0, 8);
  const lit = cfg.lampLit !== false;

  if (mode === 'table_brass_menorah') {
    hanAddHanukkiah(b, 0, 0, 0, w, h, 'brass', 'curved_classic', litNights, lit);
    if (lit && litNights > 0) {
      meta.lightSources.push({ id: 'menorah_candle_glow', type: 'point', positionMeters: [0, h * 0.88, 0.08], color: '#ffdf8e', intensity: 1.35, rangeMeters: 3.8, enabled: true });
    }
    return;
  }

  if (mode === 'modern_silver_menorah') {
    hanAddHanukkiah(b, 0, 0, 0, w, h, 'chrome', 'modern_angled', litNights, lit);
    if (lit && litNights > 0) {
      meta.lightSources.push({ id: 'silver_menorah_glow', type: 'point', positionMeters: [0, h * 0.88, 0.08], color: '#ffe5a3', intensity: 1.3, rangeMeters: 3.6, enabled: true });
    }
    return;
  }

  if (mode === 'giant_plaza_menorah') {
    const plinthH = clamp(h * 0.22, 0.45, 0.85);
    b.addBox(0, plinthH * 0.3, 0, w * 0.72, plinthH * 0.6, w * 0.72, { materialRole: 'stone', layer: 'body' });
    b.addBox(0, plinthH * 0.8, 0, w * 0.54, plinthH * 0.4, w * 0.54, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, 'Happy Hanukkah', w * 0.46, plinthH * 0.28, '#173e75', '#f6f8fa', {
      x: 0,
      y: plinthH * 0.8,
      z: w * 0.275
    });
    hanAddHanukkiah(b, 0, plinthH, 0, w * 0.92, h - plinthH, 'brass', 'modern_angled', litNights, lit);
    if (lit && litNights > 0) {
      meta.lightSources.push({ id: 'plaza_menorah_glow', type: 'point', positionMeters: [0, h * 0.92, 0.15], color: '#ffe38c', intensity: 2.2, rangeMeters: 6.5, enabled: true });
    }
    return;
  }

  if (mode === 'star_window_light_strand') {
    // Wall-mounted blue & white Star of David string lights flush at z = 0 facing +z
    const span = clamp(w, 0.95, 5.2);
    const drop = clamp(h, 0.4, 1.4);
    meta.passable = true;
    meta.surfaceRelationship = {
      attachMode: 'surface_stick',
      canAttachToBuildings: true,
      canAttachToObjects: true,
      passable: true,
      spanWidthMeters: Number(span.toFixed(3)),
      stickNormal: [0, 0, 1]
    };
    meta.snapAnchors.push(
      { id: 'clip_left', position: [-span * 0.48, 0, 0], normal: [0, 0, 1] },
      { id: 'clip_center', position: [0, 0, 0], normal: [0, 0, 1] },
      { id: 'clip_right', position: [span * 0.48, 0, 0], normal: [0, 0, 1] }
    );

    b.addBox(0, 0, 0.018, span, 0.025, 0.025, { materialRole: 'whiteTrim', layer: 'body' });
    const count = Math.max(5, Math.round(span / 0.36));
    for (let i = 0; i < count; i++) {
      const ix = -span * 0.46 + (count > 1 ? (i / (count - 1)) * (span * 0.92) : 0);
      const lineLen = drop * (0.45 + ((i % 3) * 0.24));
      b.addPipeSegment(ix, 0, 0.022, ix, -lineLen, 0.022, 0.006, 6, 'whiteTrim', 'body');
      const role = !lit ? 'primary' : (i % 2 === 0 ? 'neonGlow' : 'lampGlow');
      hanAddStarOfDavid(b, ix, -lineLen - 0.06, 0.028, 0.075, 0.009, role, 'detail');
      b.addCylinder(ix, -lineLen * 0.5, 0.026, 0.013, 0.013, 0.026, 6, 'z', role, 'detail');
    }
    if (lit) {
      meta.lightSources.push({ id: 'hanukkah_star_strand_glow', type: 'point', positionMeters: [0, -drop * 0.4, 0.25], color: '#a8d8ff', intensity: 1.4, rangeMeters: 4.5, enabled: true });
    }
    return;
  }

  // Wall-mounted royal blue & silver Hanukkah wreath & banner anchored flush at z = 0
  const outerR = clamp(w * 0.44, 0.28, 0.68);
  const innerR = outerR * 0.54;
  b.addPrismRing(0, 0, 0.055, outerR, innerR, 0.09, 14, 'z', 'primary', 'body');
  b.addPrismRing(0, 0, 0.068, outerR * 0.92, innerR * 1.05, 0.02, 14, 'z', 'chrome', 'detail');
  hanAddStarOfDavid(b, 0, 0, 0.075, innerR * 0.72, 0.014, lit ? 'neonGlow' : 'chrome', 'detail');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mr = (outerR + innerR) * 0.5;
    b.addCylinder(Math.cos(a) * mr, Math.sin(a) * mr, 0.11, 0.018, 0.018, 0.024, 6, 'z', lit ? (i % 2 === 0 ? 'lampGlow' : 'neonGlow') : 'whiteTrim', 'detail');
  }
  b.addBox(0, -outerR - 0.14, 0.04, outerR * 1.5, 0.22, 0.032, { materialRole: 'primary', layer: 'body' });
  objCreateSignPlane(group, 'Happy Hanukkah', outerR * 1.4, 0.18, '#173e75', '#ffffff', {
    x: 0,
    y: -outerR - 0.14,
    z: 0.06
  });
  if (lit) {
    meta.lightSources.push({ id: 'hanukkah_wreath_glow', type: 'point', positionMeters: [0, 0, 0.24], color: '#9ed2ff', intensity: 1.1, rangeMeters: 3.0, enabled: true });
  }
}

function hanBuildTraditionsAndFeast(group, cfg, b, mats, meta) {
  const mode = cfg.traditionStyle || 'dreidel_gelt_set';
  const w = clamp(cfg.width || 0.65, 0.34, 2.45);
  const d = clamp(cfg.depth || 0.48, 0.28, 1.35);
  const h = clamp(cfg.height || 0.42, 0.2, 1.85);
  const lit = cfg.lampLit !== false;

  if (mode === 'dreidel_gelt_set') {
    b.addBox(0, 0.016, 0, w, 0.032, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.034, 0, w - 0.04, 0.008, d - 0.04, { materialRole: 'primary', layer: 'detail' });
    hanAddDreidel(b, -w * 0.22, 0.038, 0.02, clamp(h / 0.38, 0.38, 0.65), 'primary', 'chrome');
    hanAddDreidel(b, 0.04, 0.038, -0.05, clamp(h / 0.44, 0.34, 0.56), 'accent', 'brass');
    // Stacks of golden Hanukkah gelt coins & blue velvet pouch
    const coinStacks = [[w * 0.26, 0.06, 5], [w * 0.35, -0.03, 3], [w * 0.16, -0.09, 4]];
    for (const st of coinStacks) {
      for (let c = 0; c < st[2]; c++) {
        b.addCylinder(st[0], 0.046 + c * 0.016, st[1], 0.034, 0.034, 0.012, 10, 'y', 'brass', 'detail');
      }
    }
    b.addCylinder(-w * 0.02, 0.088, 0.12, 0.055, 0.072, 0.1, 10, 'y', 'primary', 'detail');
    return;
  }

  if (mode === 'latkes_sufganiyot_tray') {
    hanAddSufganiyotLatkesPlatter(b, 0, 0, 0, clamp(w / 0.56, 0.85, 1.45));
    return;
  }

  if (mode === 'hanukkah_gifts_stack') {
    hanAddBlueGiftBox(b, -w * 0.2, 0, 0.05, w * 0.44, h * 0.66, d * 0.46, 'primary', 'whiteTrim');
    hanAddBlueGiftBox(b, w * 0.22, 0, 0.07, w * 0.38, h * 0.48, d * 0.42, 'whiteTrim', 'primary');
    hanAddBlueGiftBox(b, 0.02, 0, -d * 0.22, w * 0.4, h * 0.82, d * 0.4, 'accent', 'chrome');
    hanAddBlueGiftBox(b, -w * 0.18, h * 0.66, 0.05, w * 0.25, h * 0.3, d * 0.25, 'primary', 'brass');
    hanAddStarOfDavid(b, -w * 0.18, h * 1.06, 0.05, 0.06, 0.008, 'neonGlow', 'detail');
    return;
  }

  if (mode === 'giant_yard_dreidel') {
    // 1.55m outdoor illuminated royal-blue & silver dreidel sculpture on stone plinth
    const baseH = 0.18;
    b.addCylinder(0, baseH * 0.5, 0, w * 0.46, w * 0.52, baseH, 10, 'y', 'stone', 'body');
    const figS = clamp((h - baseH) / 0.58, 1.2, 3.0);
    hanAddDreidel(b, 0, baseH, 0, figS, 'primary', lit ? 'neonGlow' : 'chrome');
    hanAddStarOfDavid(b, 0, baseH + 0.27 * figS, 0.155 * figS, 0.075 * figS, 0.012, lit ? 'lampGlow' : 'brass', 'detail');
    if (lit) {
      meta.lightSources.push({ id: 'yard_dreidel_glow', type: 'point', positionMeters: [0, h * 0.62, 0.25], color: '#8ad4ff', intensity: 1.5, rangeMeters: 4.5, enabled: true });
    }
    return;
  }

  // Walnut Celebration Dining Table with lit Hanukkiah centerpiece, latkes platter & dreidels
  const tableH = 0.76;
  b.addBox(0, tableH, 0, w, 0.055, d, { materialRole: 'wood', layer: 'body' });
  b.addSupportLegs(0, 0, tableH - 0.02, w - 0.16, d - 0.14, 0.075, 'wood', 0);
  b.addBox(0, tableH + 0.03, 0, w * 0.88, 0.008, d * 0.34, { materialRole: 'primary', layer: 'detail' });
  hanAddHanukkiah(b, 0, tableH + 0.034, 0, 0.54, 0.44, 'brass', 'curved_classic', 8, lit);
  hanAddSufganiyotLatkesPlatter(b, -w * 0.28, tableH + 0.034, 0, 0.78);
  hanAddDreidel(b, w * 0.3, tableH + 0.034, 0.06, 0.34, 'primary', 'chrome');
  for (const cx of [-w * 0.28, w * 0.28]) {
    for (const side of [-1, 1]) {
      b.addCylinder(cx, tableH + 0.036, side * (d * 0.32), 0.1, 0.1, 0.014, 10, 'y', 'whiteTrim', 'detail');
      const chairZ = side * (d * 0.56);
      b.addBox(cx, 0.45, chairZ, 0.44, 0.048, 0.42, { materialRole: 'wood', layer: 'body' });
      b.addSupportLegs(cx, 0, 0.44, 0.36, 0.34, 0.042, 'wood', chairZ);
      b.addBox(cx, 0.72, chairZ + side * 0.19, 0.42, 0.5, 0.045, { materialRole: 'wood', layer: 'body' });
    }
  }
  if (lit) {
    meta.lightSources.push({ id: 'hanukkah_table_glow', type: 'point', positionMeters: [0, tableH + 0.48, 0], color: '#ffe194', intensity: 1.5, rangeMeters: 4.2, enabled: true });
  }
}

export function registerHolidayHanukkahFamilies() {
  registerObjectFamily({
    id: 'holiday_hanukkah_menorahs_lights',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Hanukkah & Festival of Lights',
    subcategories: ['Hanukkah & Festival of Lights', 'String Lights & Eave Strands', 'Outdoor Lawn & Porch Displays'],
    label: 'Hanukkah Menorahs & Star Lights',
    description: '9-branch curved brass and modern silver Hanukkiah menorahs with 0-to-8 night candle lighting, giant public plaza menorahs, stick-on Star of David lights, and blue-and-silver door wreaths.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing', 'wall_mounted', 'furniture_attached'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'both',
    environmentTags: ['holiday', 'hanukkah', 'winter', 'living_room', 'lobby', 'outdoor_plaza', 'street'],
    tags: ['hanukkah', 'menorah', 'hanukkiah', 'candles', 'star_of_david', 'string_lights', 'wreath'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'stone', 'brass', 'chrome', 'neonGlow', 'lampGlow'],
    schema: [
      { group: 'Menorah & Light Style', tab: 'structure' },
      {
        key: 'hanukkahStyle',
        label: 'Piece Archetype',
        type: 'select',
        tab: 'structure',
        default: 'table_brass_menorah',
        options: [
          ['table_brass_menorah', 'Classic Brass 9-Branch Menorah'],
          ['modern_silver_menorah', 'Modern Silver & Blue Menorah'],
          ['giant_plaza_menorah', 'Giant Public Plaza Menorah'],
          ['star_window_light_strand', 'Stick-On Star Of David Lights'],
          ['hanukkah_door_wreath_banner', 'Blue & Silver Door Wreath']
        ]
      },
      { key: 'width', label: 'Width / Span', type: 'range', tab: 'structure', min: 0.34, max: 5.2, step: 0.05, unit: 'm', default: 0.56 },
      { key: 'height', label: 'Height / Drop', type: 'range', tab: 'structure', min: 0.32, max: 3.8, step: 0.05, unit: 'm', default: 0.52 },
      { key: 'litNights', label: 'Nights Lit (0-8 + Shamash)', type: 'range', tab: 'details', min: 0, max: 8, step: 1, default: 8 },
      { key: 'lampLit', label: 'Candles / Lights On', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'classic_brass_table_menorah', label: 'Classic Brass Table Menorah', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#1f4f9c', params: { hanukkahStyle: 'table_brass_menorah', width: 0.56, height: 0.52, litNights: 8, lampLit: true } },
      { id: 'silver_modern_window_menorah', label: 'Modern Silver Window Menorah', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#1e54a8', params: { hanukkahStyle: 'modern_silver_menorah', width: 0.58, height: 0.5, litNights: 8, lampLit: true } },
      { id: 'giant_plaza_public_menorah', label: 'Giant Public Plaza Menorah', attachmentProfile: 'ground_standing', locationContext: 'exterior', paletteFamily: 'modern_corporate', primaryColor: '#173e75', params: { hanukkahStyle: 'giant_plaza_menorah', width: 1.75, height: 3.35, litNights: 8, lampLit: true } },
      { id: 'hanukkah_star_window_lights', label: 'Stick-On Star Of David Lights', attachmentProfile: 'wall_mounted', locationContext: 'both', paletteFamily: 'clean_medical_office', primaryColor: '#2560ba', emissiveColor: '#78c6ff', params: { hanukkahStyle: 'star_window_light_strand', width: 2.8, height: 0.72, litNights: 8, lampLit: true } },
      { id: 'hanukkah_door_wreath_banner', label: 'Hanukkah Blue & Silver Wreath', attachmentProfile: 'wall_mounted', locationContext: 'both', paletteFamily: 'modern_corporate', primaryColor: '#1d4d99', emissiveColor: '#75c4ff', params: { hanukkahStyle: 'hanukkah_door_wreath_banner', width: 0.92, height: 1.1, litNights: 8, lampLit: true } }
    ],
    buildGeometry: hanBuildMenorahsAndLights
  });

  registerObjectFamily({
    id: 'holiday_hanukkah_traditions_feast',
    categoryId: '30_holidays',
    categories: ['30_holidays', '29_residential_household'],
    subcategory: 'Hanukkah & Festival of Lights',
    subcategories: ['Hanukkah & Festival of Lights', 'Indoor Mantle, Gifts & Tabletop', 'Outdoor Lawn & Porch Displays', 'Dining, Coffee & Side Tables'],
    label: 'Hanukkah Dreidels, Latkes & Gifts',
    description: 'Oak trays with wooden and brass dreidels and gelt coins, potato latke and jelly sufganiyot platters, wrapped blue-and-silver gift stacks, giant lit yard dreidels, and celebration dining tables.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing'],
    sizeClass: 'medium',
    functionalRole: 'decorative',
    locationContext: 'both',
    environmentTags: ['holiday', 'hanukkah', 'winter', 'dining_room', 'living_room', 'kitchen', 'patio'],
    tags: ['hanukkah', 'dreidel', 'gelt', 'latkes', 'sufganiyot', 'gifts', 'feast_table'],
    materialSlots: ['primary', 'secondary', 'accent', 'wood', 'brass', 'chrome', 'neonGlow', 'lampGlow', 'safetyRed', 'warningYellow'],
    schema: [
      { group: 'Tradition Piece', tab: 'structure' },
      {
        key: 'traditionStyle',
        label: 'Hanukkah Item',
        type: 'select',
        tab: 'structure',
        default: 'dreidel_gelt_set',
        options: [
          ['dreidel_gelt_set', 'Dreidels & Gold Gelt Coins Tray'],
          ['latkes_sufganiyot_tray', 'Latkes & Sufganiyot Platter'],
          ['hanukkah_gifts_stack', 'Blue & Silver Wrapped Gifts'],
          ['giant_yard_dreidel', 'Giant Illuminated Yard Dreidel'],
          ['hanukkah_feast_table', 'Hanukkah Celebration Dining Table']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.34, max: 2.45, step: 0.05, unit: 'm', default: 0.62 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.28, max: 1.35, step: 0.04, unit: 'm', default: 0.46 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.2, max: 1.85, step: 0.04, unit: 'm', default: 0.38 },
      { key: 'lampLit', label: 'Lights & Candles Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'dreidel_and_gelt_coins_set', label: 'Dreidels & Gelt Coins Tray', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#1e54a8', accentColor: '#3a86d6', params: { traditionStyle: 'dreidel_gelt_set', width: 0.56, depth: 0.42, height: 0.28 } },
      { id: 'sufganiyot_latkes_feast_platter', label: 'Latkes & Sufganiyot Platter', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#1f4e99', accentColor: '#d97a26', params: { traditionStyle: 'latkes_sufganiyot_tray', width: 0.6, depth: 0.54, height: 0.22 } },
      { id: 'hanukkah_blue_silver_gifts_stack', label: 'Blue & Silver Wrapped Gifts', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#1e54a8', accentColor: '#5c9ee6', params: { traditionStyle: 'hanukkah_gifts_stack', width: 0.68, depth: 0.56, height: 0.42 } },
      { id: 'giant_yard_dreidel_display', label: 'Giant Lit Yard Dreidel', attachmentProfile: 'ground_standing', locationContext: 'exterior', paletteFamily: 'modern_corporate', primaryColor: '#1b50a3', emissiveColor: '#75c4ff', params: { traditionStyle: 'giant_yard_dreidel', width: 0.96, height: 1.55, lampLit: true } },
      { id: 'hanukkah_celebration_dining_table', label: 'Hanukkah Celebration Dining Table', attachmentProfile: 'ground_standing', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#694124', primaryColor: '#1f4f9c', params: { traditionStyle: 'hanukkah_feast_table', width: 2.1, depth: 1.02, height: 0.85, lampLit: true } }
    ],
    buildGeometry: hanBuildTraditionsAndFeast
  });
}
