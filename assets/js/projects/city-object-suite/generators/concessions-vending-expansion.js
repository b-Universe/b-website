import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function cveAddHollowBay(b, w, bodyH, d, baseY, winX, winY, winW, winH, bodyRole = 'primary', backRole = 'darkMetal') {
  const topY = baseY + bodyH;
  const winLeft = winX - winW * 0.5;
  const winRight = winX + winW * 0.5;
  const winBot = winY - winH * 0.5;
  const winTop = winY + winH * 0.5;
  const rearD = d * 0.56;
  const rearZ = -d * 0.5 + rearD * 0.5;
  const frontD = d - rearD;
  const frontZ = d * 0.5 - frontD * 0.5;

  b.addBox(0, baseY + bodyH * 0.5, rearZ, w, bodyH, rearD, { materialRole: bodyRole, layer: 'body' });
  b.addBox(winX, winY, rearZ + rearD * 0.5 + 0.01, winW, winH, 0.02, { materialRole: backRole, layer: 'body' });

  const botH = Math.max(0.08, winBot - baseY);
  b.addBox(0, baseY + botH * 0.5, frontZ, w, botH, frontD, { materialRole: bodyRole, layer: 'body' });
  const topH = Math.max(0.08, topY - winTop);
  b.addBox(0, winTop + topH * 0.5, frontZ, w, topH, frontD, { materialRole: bodyRole, layer: 'body' });

  const leftW = Math.max(0.03, winLeft - (-w * 0.5));
  b.addBox(-w * 0.5 + leftW * 0.5, winY, frontZ, leftW, winH, frontD, { materialRole: bodyRole, layer: 'body' });
  const rightW = Math.max(0.03, w * 0.5 - winRight);
  b.addBox(w * 0.5 - rightW * 0.5, winY, frontZ, rightW, winH, frontD, { materialRole: bodyRole, layer: 'body' });
}

function cveAddPretzelLoop(b, cx, cy, cz, scale = 1.0) {
  b.addPrismRing(cx, cy, cz, 0.055 * scale, 0.032 * scale, 0.016 * scale, 8, 'z', 'wood', 'detail');
  b.addBox(cx, cy, cz + 0.008 * scale, 0.078 * scale, 0.016 * scale, 0.014 * scale, { materialRole: 'wood', layer: 'detail', rotZDeg: 36 });
  b.addBox(cx, cy, cz + 0.008 * scale, 0.078 * scale, 0.016 * scale, 0.014 * scale, { materialRole: 'wood', layer: 'detail', rotZDeg: -36 });
  b.addBox(cx - 0.02 * scale, cy + 0.024 * scale, cz + 0.015 * scale, 0.01, 0.01, 0.008, { materialRole: 'whiteTrim', layer: 'detail' });
  b.addBox(cx + 0.022 * scale, cy - 0.018 * scale, cz + 0.015 * scale, 0.01, 0.01, 0.008, { materialRole: 'whiteTrim', layer: 'detail' });
}

function cveBuildSpecialtyVending(group, cfg, b, mats, meta) {
  const mode = cfg.specialtyVendStyle || 'gumball_capsule_rack';
  const w = clamp(cfg.width || 0.96, 0.55, 1.45);
  const h = clamp(cfg.height || 1.68, 1.05, 2.25);
  const d = clamp(cfg.depth || 0.65, 0.36, 1.05);
  const signLabel = cfg.signText || 'Quick Vend';
  const lit = cfg.lampLit !== false;

  if (mode === 'gumball_capsule_rack') {
    b.addCylinder(0, 0.04, 0, w * 0.34, w * 0.4, 0.08, 10, 'y', 'frame', 'body');
    b.addCylinder(-w * 0.24, 0.38, 0, 0.035, 0.04, 0.66, 8, 'y', 'chrome', 'body');
    b.addCylinder(w * 0.24, 0.38, 0, 0.035, 0.04, 0.66, 8, 'y', 'chrome', 'body');
    b.addBox(0, 0.72, 0, w * 0.92, 0.06, d * 0.56, { materialRole: 'frame', layer: 'body' });
    const gumballColors = ['safetyRed', 'warningYellow', 'signalGreen', 'neonGlow', 'accent'];
    for (let i = 0; i < 3; i++) {
      const gx = (i - 1) * (w * 0.3);
      b.addBox(gx, 0.88, 0, w * 0.24, 0.26, d * 0.46, { materialRole: 'primary', layer: 'body' });
      b.addCylinder(gx, 0.88, d * 0.24, 0.038, 0.038, 0.03, 10, 'z', 'chrome', 'detail');
      b.addBox(gx, 0.8, d * 0.24, 0.06, 0.05, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(gx, 1.18, 0, w * 0.22, 0.32, d * 0.42, { materialRole: 'glass', layer: 'detail' });
      for (let k = 0; k < 5; k++) {
        const angle = (k / 5) * Math.PI * 2 + i;
        b.addCylinder(gx + Math.cos(angle) * 0.042, 1.1 + (k % 3) * 0.045, Math.sin(angle) * 0.042, 0.026, 0.026, 0.032, 8, 'y', gumballColors[(i + k) % 5], 'detail');
      }
      b.addBox(gx, 1.36, 0, w * 0.25, 0.045, d * 0.46, { materialRole: 'accent', layer: 'body' });
      b.addCylinder(gx, 1.4, 0, 0.022, 0.022, 0.04, 8, 'y', 'chrome', 'detail');
    }
    meta.interaction = { interactable: true, actionType: 'vend_capsule' };
    return;
  }

  if (mode === 'media_rental_kiosk') {
    b.addBox(0, 0.04, 0, w * 0.96, 0.08, d * 0.92, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, h * 0.46 + 0.04, 0, w, h * 0.84, d * 0.84, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h - 0.14, d * 0.04, w + 0.08, 0.28, d * 0.9, { materialRole: 'accent', layer: 'body' });
    objCreateSignPlane(group, signLabel || 'Rent & Return', w * 0.88, 0.2, '#b82424', '#ffffff', {
      x: 0,
      y: h - 0.14,
      z: d * 0.495,
      lit
    });
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.56, 0.46, cfg.emissiveColor || '#ffe14d', cfg.condition, cfg.seed, {
      x: -w * 0.12,
      y: h * 0.58,
      z: d * 0.435
    });
    b.addBox(w * 0.28, h * 0.56, d * 0.43, 0.16, 0.34, 0.04, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-w * 0.06, 0.64, d * 0.43, w * 0.58, 0.06, 0.03, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(w * 0.52, h * 0.42, 0, 0.18, 0.34, 0.34, { materialRole: 'primary', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'rent_media' };
    return;
  }

  if (mode === 'hot_pizza_ramen_vending') {
    const winW = w * 0.56;
    const winH = h * 0.36;
    const winX = -w * 0.14;
    const winY = h * 0.6;
    cveAddHollowBay(b, w, h - 0.06, d, 0.06, winX, winY, winW, winH, 'primary', 'darkMetal');
    // Interior oven carousel & golden pizza slices under warm lamp
    b.addCylinder(winX, winY - 0.08, d * 0.28, winW * 0.36, winW * 0.36, 0.03, 12, 'y', 'chrome', 'detail');
    b.addCylinder(winX, winY - 0.055, d * 0.28, winW * 0.3, winW * 0.32, 0.025, 12, 'y', 'warningYellow', 'detail');
    b.addCylinder(winX, winY - 0.04, d * 0.28, winW * 0.24, winW * 0.24, 0.012, 12, 'y', 'safetyRed', 'detail');
    if (lit) {
      b.addBox(winX, winY + winH * 0.42, d * 0.28, winW * 0.8, 0.025, 0.04, { materialRole: 'lampGlow', layer: 'detail' });
      meta.lightSources.push({ id: 'pizza_oven_glow', type: 'point', positionMeters: [winX, winY, d * 0.36], color: '#ffcb73', intensity: 1.35, rangeMeters: 3.5, enabled: true });
    }
    b.addBox(winX, winY, d * 0.495, winW - 0.01, winH - 0.01, 0.016, { materialRole: 'glass', layer: 'detail' });
    objCreateSignPlane(group, signLabel || 'Hot Pizza', w * 0.84, 0.22, '#a8221e', '#fff7e0', {
      x: 0,
      y: h - 0.16,
      z: d * 0.506,
      lit
    });
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.2, 0.34, cfg.emissiveColor || '#ffaa3b', cfg.condition, cfg.seed, {
      x: w * 0.32,
      y: winY,
      z: d * 0.508
    });
    // Wide flat pizza box heated chute slot
    b.addBox(winX, 0.44, d * 0.48, winW * 0.92, 0.09, 0.06, { materialRole: 'chrome', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'vend_hot_food' };
    return;
  }

  if (mode === 'retro_pull_knob_candy_vend') {
    const legH = 0.52;
    b.addSupportLegs(0, 0, legH, w - 0.12, d - 0.12, 0.045, 'chrome', 0);
    const cabH = h - legH;
    const winW = w * 0.84;
    const winH = cabH * 0.46;
    const winY = legH + cabH * 0.66;
    cveAddHollowBay(b, w, cabH, d, legH, 0, winY, winW, winH, 'primary', 'whiteTrim');
    for (let i = 0; i < 6; i++) {
      const px = -winW * 0.41 + i * (winW * 0.164);
      b.addBox(px, winY, d * 0.34, 0.085, winH * 0.72, 0.04, { materialRole: i % 2 === 0 ? 'safetyRed' : 'accent', layer: 'detail' });
      // Tactile pull knob on sloped mechanical apron below window
      b.addCylinder(px, legH + cabH * 0.28, d * 0.52, 0.016, 0.016, 0.05, 8, 'z', 'chrome', 'detail');
      b.addCylinder(px, legH + cabH * 0.28, d * 0.555, 0.028, 0.024, 0.024, 10, 'z', 'chrome', 'detail');
    }
    b.addBox(0, winY, d * 0.495, winW - 0.01, winH - 0.01, 0.014, { materialRole: 'glass', layer: 'detail' });
    objCreateSignPlane(group, signLabel || 'Candy Pull', w * 0.78, 0.14, '#7d2020', '#fff4d9', {
      x: 0,
      y: h - 0.12,
      z: d * 0.506,
      lit
    });
    b.addBox(0, legH + 0.12, d * 0.5, winW * 0.86, 0.12, 0.05, { materialRole: 'chrome', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'vend_candy' };
    return;
  }

  if (mode === 'cotton_candy_robo_vending') {
    const winW = w * 0.66;
    const winH = h * 0.54;
    const winX = -w * 0.1;
    const winY = 0.08 + h * 0.52;
    cveAddHollowBay(b, w, h - 0.04, d, 0.04, winX, winY, winW, winH, 'primary', 'whiteTrim');
    // Spinning stainless sugar bowl, robotic arm, & fluffy pink/cyan cotton candy dome
    b.addCylinder(winX, winY - winH * 0.32, d * 0.26, 0.18, 0.14, 0.14, 12, 'y', 'chrome', 'detail');
    b.addCylinder(winX, winY - 0.04, d * 0.3, 0.095, 0.045, 0.16, 10, 'y', 'accent', 'detail');
    b.addPipeSegment(winX - 0.18, winY + 0.12, d * 0.24, winX, winY - 0.02, d * 0.3, 0.02, 8, 'chrome', 'detail');
    b.addBox(winX, winY, d * 0.495, winW - 0.01, winH - 0.01, 0.014, { materialRole: 'glass', layer: 'detail' });
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.2, 0.36, cfg.emissiveColor || '#ff6ec7', cfg.condition, cfg.seed, {
      x: w * 0.32,
      y: winY,
      z: d * 0.508
    });
    objCreateSignPlane(group, signLabel || 'Cotton Candy', w * 0.82, 0.2, '#b83286', '#ffffff', {
      x: 0,
      y: h - 0.14,
      z: d * 0.506,
      lit
    });
    if (lit) {
      meta.lightSources.push({ id: 'cotton_candy_chamber', type: 'point', positionMeters: [winX, winY, d * 0.34], color: '#ffc2ec', intensity: 1.2, rangeMeters: 3.2, enabled: true });
    }
    meta.interaction = { interactable: true, actionType: 'vend_cotton_candy' };
    return;
  }

  // exterior_bagged_ice_merchandiser
  const freezerH = clamp(h * 0.78, 1.15, 1.65);
  const winW = w * 0.86;
  const winH = freezerH * 0.52;
  const winY = 0.08 + freezerH * 0.56;
  cveAddHollowBay(b, w, freezerH, d, 0.08, 0, winY, winW, winH, 'primary', 'whiteTrim');
  // Stacked bagged ice bundles visible inside glass freezer doors
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      b.addChamferBox(col * (winW * 0.28), winY - 0.14 + row * 0.22, d * 0.32, 0.26, 0.18, 0.2, 0.025, { materialRole: 'whiteTrim', layer: 'detail' });
    }
  }
  b.addBox(-winW * 0.24, winY, d * 0.495, winW * 0.46, winH - 0.02, 0.016, { materialRole: 'glass', layer: 'detail' });
  b.addBox(winW * 0.24, winY, d * 0.495, winW * 0.46, winH - 0.02, 0.016, { materialRole: 'glass', layer: 'detail' });
  b.addLouverGrille(0, 0.24, d * 0.495, w * 0.82, 0.2, 4, 'z', 'frame', 'detail');
  // Top rooftop signboard ('Ice')
  b.addBox(0, freezerH + 0.22, d * 0.15, w * 0.94, 0.32, 0.12, { materialRole: 'accent', layer: 'body' });
  objCreateSignPlane(group, signLabel || 'Ice', w * 0.86, 0.24, '#13579e', '#ffffff', {
    x: 0,
    y: freezerH + 0.22,
    z: d * 0.22,
    lit
  });
  meta.interaction = { interactable: true, actionType: 'take_ice_bag' };
}

function cveBuildConcessionEquipment(group, cfg, b, mats, meta) {
  const mode = cfg.equipStyle || 'movie_theater_concession_counter';
  const w = clamp(cfg.width || 1.25, 0.46, 2.8);
  const h = clamp(cfg.height || 1.1, 0.42, 2.35);
  const d = clamp(cfg.depth || 0.72, 0.4, 1.15);
  const signLabel = cfg.signText || 'Concessions';
  const lit = cfg.lampLit !== false;

  if (mode === 'movie_theater_concession_counter') {
    const cntH = 0.96;
    b.addBox(0, 0.05, 0, w, 0.1, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, cntH * 0.5, -d * 0.08, w, cntH - 0.08, d * 0.82, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, cntH, 0, w + 0.06, 0.06, d + 0.04, { materialRole: 'secondary', layer: 'body' });
    // Front integrated glass boxed-candy showcase bay
    const caseW = w * 0.62;
    const caseH = 0.44;
    const caseY = cntH * 0.58;
    b.addBox(-w * 0.12, caseY, d * 0.36, caseW, caseH, 0.14, { materialRole: 'darkMetal', layer: 'detail' });
    for (let r = 0; r < 2; r++) {
      const sy = caseY - 0.11 + r * 0.18;
      b.addBox(-w * 0.12, sy, d * 0.38, caseW - 0.04, 0.015, 0.12, { materialRole: 'chrome', layer: 'detail' });
      for (let c = 0; c < 6; c++) {
        b.addBox(-w * 0.12 - caseW * 0.38 + c * (caseW * 0.15), sy + 0.05, d * 0.4, 0.085, 0.09, 0.04, {
          materialRole: (c + r) % 3 === 0 ? 'safetyRed' : (c + r) % 3 === 1 ? 'warningYellow' : 'accent',
          layer: 'detail'
        });
      }
    }
    b.addBox(-w * 0.12, caseY, d * 0.45, caseW, caseH, 0.014, { materialRole: 'glass', layer: 'detail' });
    // Overhead illuminated menu canopy supported by chrome posts
    const canopyH = clamp(h, 1.95, 2.35);
    for (const px of [-w * 0.44, w * 0.44]) {
      b.addCylinder(px, (cntH + canopyH) * 0.5, -d * 0.25, 0.028, 0.028, canopyH - cntH, 8, 'y', 'chrome', 'body');
    }
    b.addBox(0, canopyH - 0.16, -d * 0.12, w * 0.96, 0.34, 0.22, { materialRole: 'frame', layer: 'body' });
    objCreateSignPlane(group, signLabel || 'Popcorn & Drinks', w * 0.88, 0.26, '#8f1b24', '#ffe570', {
      x: 0,
      y: canopyH - 0.16,
      z: -d * 0.005,
      lit
    });
    if (lit) {
      b.addBox(-w * 0.12, caseY + caseH * 0.44, d * 0.38, caseW * 0.9, 0.018, 0.02, { materialRole: 'lampGlow', layer: 'detail' });
      meta.lightSources.push({ id: 'concession_case_glow', type: 'point', positionMeters: [0, canopyH - 0.35, 0.25], color: '#ffe5a3', intensity: 1.4, rangeMeters: 4.5, enabled: true });
    }
    meta.interaction = { interactable: true, actionType: 'arcade_concession', employeePosition: [0, 0, -0.85], customerInteractionPos: [0, 0, 0.85] };
    return;
  }

  if (mode === 'pretzel_warmer_rotisserie_case') {
    // Surface-placed tabletop glass pretzel warmer
    b.addBox(0, 0.04, 0, w, 0.08, d, { materialRole: 'chrome', layer: 'body' });
    for (const sx of [-w * 0.46, w * 0.46]) {
      for (const sz of [-d * 0.44, d * 0.44]) {
        b.addBox(sx, h * 0.5, sz, 0.028, h - 0.1, 0.028, { materialRole: 'chrome', layer: 'body' });
      }
    }
    b.addCylinder(0, h * 0.52, 0, 0.014, 0.014, h * 0.72, 8, 'y', 'chrome', 'detail');
    for (let t = 0; t < 2; t++) {
      const ty = 0.22 + t * 0.18;
      b.addPrismRing(0, ty, 0, w * 0.28, w * 0.22, 0.014, 10, 'y', 'chrome', 'detail');
      cveAddPretzelLoop(b, -w * 0.18, ty + 0.02, d * 0.14, 0.9);
      cveAddPretzelLoop(b, w * 0.18, ty + 0.02, -d * 0.1, 0.9);
    }
    b.addBox(0, h * 0.52, d * 0.46, w * 0.92, h - 0.18, 0.012, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, h * 0.52, -d * 0.46, w * 0.92, h - 0.18, 0.012, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-w * 0.46, h * 0.52, 0, 0.012, h - 0.18, d * 0.88, { materialRole: 'glass', layer: 'detail' });
    b.addBox(w * 0.46, h * 0.52, 0, 0.012, h - 0.18, d * 0.88, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, h - 0.05, 0, w + 0.02, 0.1, d + 0.02, { materialRole: 'accent', layer: 'body' });
    objCreateSignPlane(group, signLabel || 'Hot Pretzels', w * 0.84, 0.08, '#9e361c', '#fff7d4', {
      x: 0,
      y: h - 0.05,
      z: d * 0.5 + 0.015,
      lit
    });
    if (lit) {
      b.addBox(0, h - 0.11, 0, w * 0.6, 0.02, 0.05, { materialRole: 'lampGlow', layer: 'detail' });
      meta.lightSources.push({ id: 'pretzel_warmer_lamp', type: 'point', positionMeters: [0, h * 0.6, 0], color: '#ffd98a', intensity: 1.0, rangeMeters: 2.5, enabled: true });
    }
    meta.interaction = { interactable: true, actionType: 'grab_pretzel' };
    return;
  }

  if (mode === 'countertop_popcorn_popper') {
    b.addBox(0, 0.045, 0, w, 0.09, d, { materialRole: 'primary', layer: 'body' });
    for (const sx of [-w * 0.46, w * 0.46]) {
      for (const sz of [-d * 0.44, d * 0.44]) {
        b.addBox(sx, h * 0.5, sz, 0.026, h - 0.1, 0.026, { materialRole: 'chrome', layer: 'body' });
      }
    }
    // Heaped yellow popcorn bed + hanging stainless kettle
    b.addTrapezoidBox(0, 0.15, 0, w * 0.84, d * 0.78, w * 0.72, d * 0.64, 0.12, { materialRole: 'warningYellow', layer: 'detail' });
    b.addCylinder(0, h * 0.62, 0, 0.11, 0.13, 0.13, 10, 'y', 'chrome', 'detail');
    b.addBox(0, h * 0.52, d * 0.45, w * 0.9, h - 0.2, 0.012, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, h * 0.52, -d * 0.45, w * 0.9, h - 0.2, 0.012, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-w * 0.46, h * 0.52, 0, 0.012, h - 0.2, d * 0.86, { materialRole: 'glass', layer: 'detail' });
    b.addBox(w * 0.46, h * 0.52, 0, 0.012, h - 0.2, d * 0.86, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, h - 0.055, 0, w + 0.02, 0.11, d + 0.02, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, signLabel || 'Fresh Popcorn', w * 0.84, 0.085, '#b82420', '#ffe975', {
      x: 0,
      y: h - 0.055,
      z: d * 0.5 + 0.015,
      lit
    });
    if (lit) {
      meta.lightSources.push({ id: 'popcorn_popper_lamp', type: 'point', positionMeters: [0, h * 0.65, 0], color: '#ffe59c', intensity: 1.0, rangeMeters: 2.5, enabled: true });
    }
    meta.interaction = { interactable: true, actionType: 'grab_popcorn' };
    return;
  }

  if (mode === 'hot_dog_roller_sneeze_guard') {
    b.addBox(0, 0.08, 0, w, 0.16, d, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.08, d * 0.506, w * 0.78, 0.09, 0.016, { materialRole: 'darkMetal', layer: 'detail' });
    // 6 parallel stainless heating rollers with golden-brown hot dogs
    for (let i = 0; i < 6; i++) {
      const rz = -d * 0.32 + i * (d * 0.128);
      b.addCylinder(0, 0.175, rz, 0.014, 0.014, w * 0.88, 8, 'x', 'chrome', 'detail');
      if (i < 5) {
        for (const hx of [-w * 0.26, 0, w * 0.26]) {
          b.addCylinder(hx, 0.195, rz + d * 0.06, 0.018, 0.018, 0.14, 8, 'x', i % 2 === 0 ? 'wood' : 'accent', 'detail');
        }
      }
    }
    // Angled clear glass sneeze guard canopy
    b.addBox(0, 0.29, d * 0.44, w, 0.22, 0.014, { materialRole: 'glass', layer: 'detail', rotXDeg: 18 });
    b.addBox(0, 0.39, d * 0.12, w, 0.014, d * 0.64, { materialRole: 'glass', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'grab_hotdog' };
    return;
  }

  if (mode === 'condiment_napkin_straw_island') {
    b.addBox(0, 0.45, 0, w, 0.9, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.92, 0, w + 0.04, 0.05, d + 0.04, { materialRole: 'chrome', layer: 'body' });
    // Recessed trash drop flap on front face
    b.addBox(-w * 0.26, 0.66, d * 0.506, w * 0.32, 0.24, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
    // 3 condiment pump vats (Ketchup red, Mustard yellow, Nacho cheese orange)
    const pumps = ['safetyRed', 'warningYellow', 'accent'];
    for (let i = 0; i < 3; i++) {
      const px = -w * 0.34 + i * 0.18;
      b.addCylinder(px, 1.06, -d * 0.08, 0.072, 0.072, 0.22, 10, 'y', pumps[i], 'detail');
      b.addCylinder(px, 1.21, -d * 0.08, 0.012, 0.012, 0.1, 8, 'y', 'chrome', 'detail');
      b.addBox(px, 1.25, -d * 0.02, 0.025, 0.02, 0.12, { materialRole: 'chrome', layer: 'detail' });
    }
    // Cup sleeves, straw organizer & chrome napkin box
    b.addBox(w * 0.24, 1.04, 0, 0.26, 0.2, 0.24, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(w * 0.24, 1.18, 0, 0.055, 0.048, 0.18, 10, 'y', 'whiteTrim', 'detail');
    b.addBox(w * 0.42, 1.03, d * 0.14, 0.14, 0.18, 0.14, { materialRole: 'chrome', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'grab_condiments' };
    return;
  }

  // snow_cone_shaved_ice_booth (surface_placed)
  b.addBox(-w * 0.2, 0.04, 0, w * 0.52, 0.08, d, { materialRole: 'primary', layer: 'body' });
  b.addBox(-w * 0.2, 0.26, 0, w * 0.48, 0.36, d * 0.9, { materialRole: 'glass', layer: 'detail' });
  b.addCone(-w * 0.2, 0.16, 0, 0.13, 0.16, 10, 'whiteTrim', 'detail');
  b.addCylinder(-w * 0.2, 0.48, 0, 0.12, 0.14, 0.1, 10, 'y', 'chrome', 'body');
  // Stepped 4-bottle flavor syrup rack beside ice shaver
  b.addBox(w * 0.28, 0.06, 0, w * 0.38, 0.12, d * 0.85, { materialRole: 'wood', layer: 'body' });
  const syrups = ['safetyRed', 'neonGlow', 'signalGreen', 'warningYellow'];
  for (let i = 0; i < 4; i++) {
    const sx = w * 0.16 + i * 0.075;
    b.addCylinder(sx, 0.2, 0, 0.026, 0.028, 0.18, 8, 'y', syrups[i], 'detail');
  }
  meta.interaction = { interactable: true, actionType: 'make_snowcone' };
}

export function registerConcessionsAndVendingExpansionFamilies() {
  registerObjectFamily({
    id: 'specialty_vending_machines',
    categoryId: '09_commercial',
    categories: ['09_commercial', '25_malls_libraries', 'office_public_interiors', 'arcades_entertainment'],
    subcategory: 'Vending & Heaters',
    subcategories: [
      'Vending & Heaters',
      'Mall Concourses & Kiosks',
      'Food, Candy & Refreshments',
      'Breakrooms & Employee Amenities'
    ],
    label: 'Specialty & Mall Vending Kiosks',
    description: 'Triple gumball capsule racks, media rental kiosks, hot pizza vending cabinets, vintage pull-knob candy vendors, robotic cotton candy machines, and exterior ice chests.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    environmentTags: ['mall', 'arcade', 'commercial', 'lobby', 'bowling_alley', 'street', 'family_entertainment'],
    tags: ['vending', 'gumball', 'capsule', 'pizza', 'cotton_candy', 'ice', 'kiosk', 'candy'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'glass', 'chrome', 'neonGlow', 'lampGlow'],
    schema: [
      { group: 'Specialty Vending Model', tab: 'structure' },
      {
        key: 'specialtyVendStyle',
        label: 'Machine Type',
        type: 'select',
        tab: 'structure',
        default: 'gumball_capsule_rack',
        options: [
          ['gumball_capsule_rack', 'Triple Gumball & Capsule Rack'],
          ['media_rental_kiosk', 'Automated Media Rental Kiosk'],
          ['hot_pizza_ramen_vending', 'Hot Pizza & Meal Vending Kiosk'],
          ['retro_pull_knob_candy_vend', 'Retro Pull-Knob Candy Vendor'],
          ['cotton_candy_robo_vending', 'Robotic Cotton Candy Machine'],
          ['ice_bag_exterior_merchandiser', 'Bagged Ice Exterior Chest']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.55, max: 1.45, step: 0.04, unit: 'm', default: 0.96 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 1.05, max: 2.25, step: 0.04, unit: 'm', default: 1.68 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.36, max: 1.05, step: 0.04, unit: 'm', default: 0.65 },
      { key: 'signText', label: 'Header Sign Text', type: 'text', tab: 'details', default: 'Quick Vend', maxLength: 20 },
      { key: 'lampLit', label: 'Illumination Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'triple_gumball_capsule_rack', label: 'Triple Gumball & Capsule Rack', locationContext: 'both', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#cf342b', accentColor: '#e6b830', params: { specialtyVendStyle: 'gumball_capsule_rack', width: 0.96, height: 1.44, depth: 0.48, signText: 'Capsules' } },
      { id: 'automated_media_rental_kiosk', label: 'Automated Media Rental Kiosk', locationContext: 'both', paletteFamily: 'modern_corporate', primaryColor: '#a81e24', accentColor: '#cf2b32', params: { specialtyVendStyle: 'media_rental_kiosk', width: 0.96, height: 1.98, depth: 0.68, signText: 'Rent & Return', lampLit: true } },
      { id: 'hot_pizza_ramen_vending_kiosk', label: 'Hot Pizza & Meal Vending Kiosk', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#b52822', accentColor: '#f2a429', params: { specialtyVendStyle: 'hot_pizza_ramen_vending', width: 1.18, height: 2.02, depth: 0.86, signText: 'Hot Pizza', lampLit: true } },
      { id: 'retro_pull_knob_candy_vendor', label: 'Retro Pull-Knob Candy Vendor', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#4c7b8c', accentColor: '#e09a38', params: { specialtyVendStyle: 'retro_pull_knob_candy_vend', width: 0.92, height: 1.65, depth: 0.64, signText: 'Candy Pull', lampLit: true } },
      { id: 'cotton_candy_robot_kiosk', label: 'Robotic Cotton Candy Machine', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#c93a84', accentColor: '#ff7ec4', emissiveColor: '#75d6ff', params: { specialtyVendStyle: 'cotton_candy_robo_vending', width: 1.05, height: 2.05, depth: 0.84, signText: 'Cotton Candy', lampLit: true } },
      { id: 'exterior_bagged_ice_merchandiser', label: 'Exterior Bagged Ice Chest', locationContext: 'exterior', paletteFamily: 'clean_medical_office', primaryColor: '#dce3eb', accentColor: '#1b6ca8', params: { specialtyVendStyle: 'ice_bag_exterior_merchandiser', width: 1.38, height: 1.72, depth: 0.84, signText: 'Ice', lampLit: true } }
    ],
    buildGeometry: cveBuildSpecialtyVending
  });

  registerObjectFamily({
    id: 'concession_food_equipment',
    categoryId: '09_commercial',
    categories: ['09_commercial', 'arcades_entertainment', '25_malls_libraries'],
    subcategory: 'Cafe Seating',
    subcategories: ['Cafe Seating', 'Food, Candy & Refreshments', 'Mall Concourses & Kiosks', 'Vending & Heaters'],
    label: 'Concession Counters, Warmers & Popcorn',
    description: 'Cinema boxed-candy counters, glass pretzel warmers, tabletop glass popcorn poppers, hot dog roller sneeze guards, self-serve condiment islands, and shaved ice booths.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    environmentTags: ['arcade', 'mall', 'bowling_alley', 'family_entertainment', 'commercial', 'entertainment_venue'],
    tags: ['concession', 'theater', 'pretzel', 'popcorn', 'hotdog', 'condiments', 'shaved_ice', 'candy'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'glass', 'chrome', 'neonGlow', 'lampGlow'],
    schema: [
      { group: 'Concession Unit', tab: 'structure' },
      {
        key: 'equipStyle',
        label: 'Equipment Type',
        type: 'select',
        tab: 'structure',
        default: 'movie_theater_concession_counter',
        options: [
          ['movie_theater_concession_counter', 'Cinema Boxed-Candy Counter'],
          ['pretzel_warmer_rotisserie_case', 'Glass Pretzel Warmer Case'],
          ['countertop_popcorn_popper', 'Countertop Glass Popcorn Popper'],
          ['hot_dog_roller_sneeze_guard', 'Hot Dog Roller & Sneeze Guard'],
          ['condiment_napkin_straw_island', 'Self-Serve Condiment & Cup Island'],
          ['snow_cone_shaved_ice_booth', 'Shaved Ice & Syrup Rack']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.46, max: 2.8, step: 0.04, unit: 'm', default: 2.1 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.42, max: 2.35, step: 0.04, unit: 'm', default: 2.15 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.4, max: 1.15, step: 0.04, unit: 'm', default: 0.82 },
      { key: 'signText', label: 'Sign Text', type: 'text', tab: 'details', default: 'Concessions', maxLength: 20 },
      { key: 'lampLit', label: 'Warmers & Menu Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'cinema_concession_candy_counter', label: 'Cinema Candy & Menu Counter', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#253147', secondaryColor: '#dce3eb', accentColor: '#cf342b', params: { equipStyle: 'movie_theater_concession_counter', width: 2.25, height: 2.18, depth: 0.86, signText: 'Popcorn & Drinks', lampLit: true } },
      { id: 'countertop_pretzel_warmer_case', label: 'Countertop Glass Pretzel Warmer', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'modern_corporate', woodColor: '#9c6635', accentColor: '#b83c24', params: { equipStyle: 'pretzel_warmer_rotisserie_case', width: 0.52, height: 0.64, depth: 0.48, signText: 'Hot Pretzels', lampLit: true } },
      { id: 'countertop_glass_popcorn_popper', label: 'Tabletop Glass Popcorn Popper', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#c42b2b', params: { equipStyle: 'countertop_popcorn_popper', width: 0.56, height: 0.72, depth: 0.48, signText: 'Fresh Popcorn', lampLit: true } },
      { id: 'hot_dog_roller_sneeze_guard', label: 'Hot Dog Roller & Sneeze Guard', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'modern_corporate', woodColor: '#8c4e2a', accentColor: '#cf4826', params: { equipStyle: 'hot_dog_roller_sneeze_guard', width: 0.68, height: 0.44, depth: 0.52 } },
      { id: 'self_serve_condiment_cup_island', label: 'Condiment, Cup & Napkin Island', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#2d3744', accentColor: '#d97e26', params: { equipStyle: 'condiment_napkin_straw_island', width: 1.24, height: 1.32, depth: 0.68 } },
      { id: 'shaved_ice_syrup_counter_station', label: 'Shaved Ice & Syrup Rack', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#2885b8', woodColor: '#7b5233', params: { equipStyle: 'snow_cone_shaved_ice_booth', width: 0.72, height: 0.56, depth: 0.46 } }
    ],
    buildGeometry: cveBuildConcessionEquipment
  });
}
