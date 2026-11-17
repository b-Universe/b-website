import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane, objCreateScreenPlane } from '../geometry/primitives.js';

function csvAddSilhouetteFigure(b, x, y, z, kind, role) {
  // Stylized low-poly geometric restroom figure in shallow relief
  b.addCylinder(x, y + 0.056, z, 0.015, 0.015, 0.012, 10, 'z', role, 'detail');
  if (kind === 'female') {
    b.addTrapezoidBox(x, y + 0.014, z, 0.044, 0.012, 0.022, 0.012, 0.048, { materialRole: role, layer: 'detail' });
    b.addBox(x - 0.008, y - 0.024, z, 0.01, 0.032, 0.012, { materialRole: role, layer: 'detail' });
    b.addBox(x + 0.008, y - 0.024, z, 0.01, 0.032, 0.012, { materialRole: role, layer: 'detail' });
  } else {
    b.addBox(x, y + 0.018, z, 0.032, 0.042, 0.012, { materialRole: role, layer: 'detail' });
    b.addBox(x - 0.008, y - 0.02, z, 0.011, 0.038, 0.012, { materialRole: role, layer: 'detail' });
    b.addBox(x + 0.008, y - 0.02, z, 0.011, 0.038, 0.012, { materialRole: role, layer: 'detail' });
  }
}

function csvBuildRestroomDoorsAndSigns(group, cfg, b) {
  const mode = cfg.signMode || 'restroom_door';
  const variant = cfg.genderVariant || 'male';
  const defaultLabel = variant === 'female'
    ? 'Women'
    : variant === 'family'
      ? 'Family Restroom'
      : variant === 'unisex'
        ? 'Restroom'
        : 'Men';
  const signLabel = cfg.signText || defaultLabel;

  if (mode === 'restroom_door') {
    const w = clamp(cfg.width || 0.96, 0.78, 1.35);
    const h = clamp(cfg.height || 2.12, 1.95, 2.35);
    const d = clamp(cfg.depth || 0.14, 0.1, 0.22);
    // Door casing frame + threshold plate
    b.addBox(-w * 0.47, h * 0.5, 0, 0.075, h, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(w * 0.47, h * 0.5, 0, 0.075, h, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h - 0.038, 0, w, 0.076, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.012, 0, w - 0.08, 0.024, d * 0.9, { materialRole: 'chrome', layer: 'detail' });
    // Door leaf + stainless kickplate & push-pull bar
    const leafW = w - 0.14;
    const leafH = h - 0.09;
    b.addBox(0, leafH * 0.5 + 0.015, 0, leafW, leafH, 0.055, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.16, 0.031, leafW - 0.04, 0.24, 0.008, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, 0.16, -0.031, leafW - 0.04, 0.24, 0.008, { materialRole: 'chrome', layer: 'detail' });
    // Push plate + vertical pull handle + deadbolt escutcheon
    b.addBox(leafW * 0.34, 1.04, 0.032, 0.09, 0.32, 0.008, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(leafW * 0.34, 1.04, 0.056, 0.022, 0.22, 0.024, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(leafW * 0.34, 1.18, 0.036, 0.018, 0.018, 0.014, 10, 'z', 'brass', 'detail');
    // Door closer arm on top rail + lower privacy vent louver
    b.addBox(-leafW * 0.18, h - 0.12, 0.045, 0.22, 0.055, 0.042, { materialRole: 'frame', layer: 'detail' });
    b.addLouverGrille(0, 0.44, 0.032, leafW * 0.62, 0.22, 5, 'z', 'frame', 'detail');
    // Restroom plaque mounted at eye height
    const plaqueY = 1.54;
    b.addChamferBox(0, plaqueY, 0.038, 0.24, 0.26, 0.016, 0.005, { materialRole: 'accent', layer: 'detail' });
    if (variant === 'unisex') {
      csvAddSilhouetteFigure(b, -0.04, plaqueY + 0.02, 0.048, 'male', 'whiteTrim');
      csvAddSilhouetteFigure(b, 0.04, plaqueY + 0.02, 0.048, 'female', 'whiteTrim');
    } else if (variant === 'family') {
      csvAddSilhouetteFigure(b, -0.052, plaqueY + 0.02, 0.048, 'female', 'whiteTrim');
      csvAddSilhouetteFigure(b, 0.052, plaqueY + 0.02, 0.048, 'male', 'whiteTrim');
      b.addCylinder(0, plaqueY - 0.01, 0.048, 0.011, 0.011, 0.012, 8, 'z', 'whiteTrim', 'detail');
    } else {
      csvAddSilhouetteFigure(b, 0, plaqueY + 0.02, 0.048, variant, 'whiteTrim');
    }
    objCreateSignPlane(group, signLabel, 0.22, 0.065, '#193554', '#f4f8fc', {
      x: 0,
      y: plaqueY - 0.082,
      z: 0.048
    });
    return;
  }

  if (mode === 'hanging_blade_sign') {
    const w = clamp(cfg.width || 0.54, 0.36, 0.85);
    const h = clamp(cfg.height || 0.22, 0.16, 0.36);
    const d = clamp(cfg.depth || 0.12, 0.08, 0.18);
    // Projecting aluminum ceiling/wall mount bracket + lit sign box
    b.addBox(0, h * 0.5 + 0.08, 0, 0.14, 0.025, 0.14, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(-w * 0.28, h * 0.5 + 0.03, 0, 0.012, 0.012, 0.1, 8, 'y', 'chrome', 'detail');
    b.addCylinder(w * 0.28, h * 0.5 + 0.03, 0, 0.012, 0.012, 0.1, 8, 'y', 'chrome', 'detail');
    b.addChamferBox(0, 0, 0, w, h, d * 0.65, 0.012, { materialRole: 'frame', layer: 'body' });
    objCreateSignPlane(group, signLabel, w - 0.05, h - 0.04, '#1b4775', '#ffffff', {
      x: 0,
      y: 0,
      z: d * 0.34,
      lit: true,
      doubleSided: true,
      backOffset: d * 0.68
    });
    return;
  }

  // Bathroom wall plaque sign (wall_mounted, back plate at z = 0)
  const pw = clamp(cfg.width || 0.28, 0.2, 0.48);
  const ph = clamp(cfg.height || 0.32, 0.22, 0.52);
  b.addChamferBox(0, 0, 0.014, pw, ph, 0.024, 0.008, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, 0, 0.027, pw - 0.024, ph - 0.024, 0.006, { materialRole: 'secondary', layer: 'detail' });
  if (variant === 'unisex') {
    csvAddSilhouetteFigure(b, -pw * 0.17, 0.035, 0.033, 'male', 'whiteTrim');
    csvAddSilhouetteFigure(b, pw * 0.17, 0.035, 0.033, 'female', 'whiteTrim');
  } else if (variant === 'family') {
    csvAddSilhouetteFigure(b, -pw * 0.22, 0.035, 0.033, 'female', 'whiteTrim');
    csvAddSilhouetteFigure(b, pw * 0.22, 0.035, 0.033, 'male', 'whiteTrim');
    b.addBox(0, 0.01, 0.033, 0.02, 0.048, 0.012, { materialRole: 'whiteTrim', layer: 'detail' });
  } else {
    csvAddSilhouetteFigure(b, 0, 0.035, 0.033, variant, 'whiteTrim');
  }
  objCreateSignPlane(group, signLabel, pw * 0.84, ph * 0.24, '#162f4a', '#ffffff', {
    x: 0,
    y: -ph * 0.3,
    z: 0.032
  });
}

function csvBuildBankAtmMachines(group, cfg, b, mats, meta) {
  const style = cfg.atmStyle || 'corner_slim_atm';
  const w = clamp(cfg.width || 0.64, 0.48, 1.05);
  const h = clamp(cfg.height || 1.54, 1.15, 1.92);
  const d = clamp(cfg.depth || 0.54, 0.24, 0.86);
  const signLabel = cfg.signText || 'Atm Cash';

  if (style === 'thru_wall_atm') {
    const faceW = clamp(w, 0.72, 1.05);
    const faceH = clamp(h, 1.1, 1.45);
    // Wall bezel recess frame (z = 0 mounted back)
    b.addBox(0, 0, 0.028, faceW, faceH, 0.055, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0, 0.06, faceW - 0.08, faceH - 0.1, 0.04, { materialRole: 'darkMetal', layer: 'body' });
    // Bank header backlit marquee + privacy side blinders
    b.addBox(0, faceH * 0.36, 0.11, faceW - 0.1, 0.18, 0.09, { materialRole: 'accent', layer: 'body' });
    objCreateSignPlane(group, signLabel, faceW - 0.14, 0.14, '#133d6e', '#ffffff', {
      x: 0,
      y: faceH * 0.36,
      z: 0.158,
      lit: true
    });
    b.addBox(-faceW * 0.32, 0.06, 0.13, 0.025, 0.34, 0.16, { materialRole: 'frame', layer: 'detail' });
    b.addBox(faceW * 0.32, 0.06, 0.13, 0.025, 0.34, 0.16, { materialRole: 'frame', layer: 'detail' });
    // ATM touchscreen display + card slot + green halo + cash shutter
    objCreateScreenPlane(group, 'kiosk_menu', faceW * 0.44, 0.26, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -faceW * 0.08,
      y: 0.08,
      z: 0.084
    });
    b.addBox(faceW * 0.23, 0.08, 0.095, 0.065, 0.09, 0.032, { materialRole: 'signalGreen', layer: 'detail' });
    // Tilted keypad tray + receipt printer slot + cash dispenser mouth
    b.addBox(0, -0.15, 0.14, faceW * 0.68, 0.045, 0.18, { materialRole: 'chrome', layer: 'body', rotXDeg: 18 });
    b.addBox(-faceW * 0.1, -0.128, 0.16, 0.14, 0.015, 0.11, { materialRole: 'secondary', layer: 'detail', rotXDeg: 18 });
    b.addBox(0, -0.32, 0.095, faceW * 0.44, 0.085, 0.05, { materialRole: 'frame', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'atm_withdraw' };
    return;
  }

  if (style === 'island_dual_kiosk_atm') {
    b.addChamferBox(0, 0.04, 0, w * 1.08, 0.08, d * 1.12, 0.015, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, 0.48, -0.02, w * 0.88, 0.84, d * 0.86, 0.03, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 1.14, -0.05, w * 0.9, 0.56, d * 0.68, 0.025, { materialRole: 'secondary', layer: 'body' });
    // Illuminated bank spire tower header
    b.addBox(0, h - 0.16, -d * 0.12, w * 0.72, 0.28, d * 0.34, { materialRole: 'accent', layer: 'body' });
    objCreateSignPlane(group, signLabel, w * 0.64, 0.2, '#133d6e', '#ffffff', {
      x: 0,
      y: h - 0.16,
      z: d * 0.055,
      lit: true
    });
    // Tilted kiosk touchscreen + NFC tap pad + side privacy shields
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.54, 0.3, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.14,
      z: d * 0.295,
      rotX: -0.14
    });
    b.addBox(-w * 0.38, 1.14, d * 0.24, 0.024, 0.36, 0.18, { materialRole: 'glass', layer: 'detail' });
    b.addBox(w * 0.38, 1.14, d * 0.24, 0.024, 0.36, 0.18, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-w * 0.14, 0.88, d * 0.26, 0.18, 0.04, 0.16, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 22 });
    b.addBox(w * 0.2, 0.89, d * 0.27, 0.08, 0.025, 0.09, { materialRole: 'holoEnergy', layer: 'detail', rotXDeg: 22 });
    b.addBox(0, 0.66, d * 0.42, w * 0.48, 0.085, 0.04, { materialRole: 'chrome', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'atm_withdraw' };
    return;
  }

  // corner_slim_atm (classic convenience store/arcade ATM)
  b.addBox(0, 0.42, 0, w, 0.84, d, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, 1.06, -d * 0.08, w * 0.96, 0.46, d * 0.82, { materialRole: 'secondary', layer: 'body' });
  b.addTrapezoidBox(0, 1.38, -d * 0.05, w * 0.96, d * 0.82, w * 0.92, d * 0.68, 0.22, { materialRole: 'accent', layer: 'body' });
  objCreateSignPlane(group, signLabel, w * 0.78, 0.15, '#b82520', '#ffffff', {
    x: 0,
    y: 1.38,
    z: d * 0.34,
    lit: true
  });
  objCreateScreenPlane(group, 'kiosk_menu', w * 0.48, 0.22, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
    x: -w * 0.08,
    y: 1.09,
    z: d * 0.335
  });
  b.addBox(w * 0.24, 1.08, d * 0.34, 0.06, 0.08, 0.025, { materialRole: 'signalGreen', layer: 'detail' });
  b.addBox(0, 0.86, d * 0.4, w * 0.56, 0.04, 0.14, { materialRole: 'chrome', layer: 'detail', rotXDeg: 18 });
  b.addBox(0, 0.68, d * 0.505, w * 0.44, 0.08, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
  meta.interaction = { interactable: true, actionType: 'atm_withdraw' };
}

function csvBuildSodaAndVendingMachines(group, cfg, b, mats, meta) {
  const kind = cfg.vendingStyle || 'classic_can_soda';
  const w = clamp(cfg.width || 0.94, 0.46, 1.25);
  const h = clamp(cfg.height || 1.88, 0.64, 2.15);
  const d = clamp(cfg.depth || 0.78, 0.42, 0.95);
  const signLabel = cfg.signText || 'Ice Cold Soda';

  if (kind === 'countertop_soda_fountain') {
    const fw = clamp(w, 0.46, 0.84);
    const fh = clamp(h, 0.58, 0.86);
    const fd = clamp(d, 0.44, 0.68);
    // Stainless steel lower drip shelf & recessed cup bay
    b.addBox(0, 0.04, 0, fw, 0.08, fd, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.084, fd * 0.25, fw * 0.88, 0.012, fd * 0.38, { materialRole: 'darkMetal', layer: 'detail' });
    // Main upper chilled chest & flavor marquee hood
    b.addBox(0, fh * 0.55, -fd * 0.12, fw, fh * 0.82, fd * 0.72, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, fh * 0.74, fd * 0.14, fw, fh * 0.46, fd * 0.34, { materialRole: 'secondary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Fountain Drinks', fw * 0.86, fh * 0.26, '#b82520', '#ffffff', {
      x: 0,
      y: fh * 0.8,
      z: fd * 0.315,
      lit: true
    });
    // 4 beverage dispense valves + colored flavor levers + ice push-chute
    const valves = 4;
    const leverRoles = ['safetyRed', 'warningYellow', 'signalGreen', 'accent'];
    for (let i = 0; i < valves; i++) {
      const vx = -fw * 0.34 + (i / (valves - 1)) * (fw * 0.68);
      b.addCylinder(vx, fh * 0.47, fd * 0.22, 0.022, 0.018, 0.065, 8, 'y', 'darkMetal', 'detail');
      b.addBox(vx, fh * 0.38, fd * 0.18, 0.038, 0.09, 0.018, { materialRole: leverRoles[i], layer: 'detail' });
      b.addBox(vx, fh * 0.57, fd * 0.32, 0.075, 0.04, 0.014, { materialRole: leverRoles[i], layer: 'detail' });
    }
    b.addBox(0, fh * 0.38, fd * 0.25, 0.09, 0.1, 0.02, { materialRole: 'chrome', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'pour_soda' };
    return;
  }

  // Full-size standing vending units
  b.addBox(-w * 0.42, 0.03, -d * 0.38, 0.06, 0.06, 0.06, { materialRole: 'darkMetal', layer: 'body' });
  b.addBox(w * 0.42, 0.03, -d * 0.38, 0.06, 0.06, 0.06, { materialRole: 'darkMetal', layer: 'body' });
  b.addBox(-w * 0.42, 0.03, d * 0.38, 0.06, 0.06, 0.06, { materialRole: 'darkMetal', layer: 'body' });
  b.addBox(w * 0.42, 0.03, d * 0.38, 0.06, 0.06, 0.06, { materialRole: 'darkMetal', layer: 'body' });

  const bodyH = h - 0.06;
  b.addChamferBox(0, 0.06 + bodyH * 0.5, 0, w, bodyH, d, 0.018, { materialRole: 'primary', layer: 'body' });

  if (kind === 'classic_can_soda') {
    // Large glowing soda billboard front + right-hand selector column + chrome pickup flap
    b.addBox(-w * 0.13, 0.06 + bodyH * 0.56, d * 0.495, w * 0.64, bodyH * 0.7, 0.025, { materialRole: 'accent', layer: 'detail' });
    objCreateSignPlane(group, signLabel, w * 0.58, bodyH * 0.62, '#c72620', '#fff7e8', {
      x: -w * 0.13,
      y: 0.06 + bodyH * 0.56,
      z: d * 0.512,
      lit: true
    });
    b.addBox(w * 0.31, 0.06 + bodyH * 0.56, d * 0.495, w * 0.22, bodyH * 0.68, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
    const btnColors = ['safetyRed', 'accent', 'signalGreen', 'warningYellow', 'holoEnergy'];
    for (let i = 0; i < 5; i++) {
      const by = bodyH * 0.8 - i * 0.11;
      b.addBox(w * 0.31, by, d * 0.515, w * 0.14, 0.055, 0.018, { materialRole: btnColors[i], layer: 'detail' });
    }
    b.addBox(w * 0.31, bodyH * 0.28, d * 0.515, 0.08, 0.1, 0.02, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(-w * 0.1, 0.26, d * 0.49, w * 0.62, 0.18, 0.04, { materialRole: 'chrome', layer: 'detail' });
  } else if (kind === 'glass_spiral_snack') {
    // Illuminated interior showcase cavity + glass pane + stocked product shelves
    const winW = w * 0.64;
    const winH = bodyH * 0.68;
    const winY = 0.06 + bodyH * 0.58;
    b.addBox(-w * 0.12, winY, d * 0.35, winW, winH, d * 0.28, { materialRole: 'darkMetal', layer: 'body' });
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = winY - winH * 0.36 + shelf * (winH * 0.23);
      b.addBox(-w * 0.12, sy, d * 0.36, winW - 0.04, 0.016, d * 0.24, { materialRole: 'chrome', layer: 'detail' });
      const itemRoles = ['safetyRed', 'warningYellow', 'accent', 'signalGreen'];
      for (let item = 0; item < 4; item++) {
        const ix = -w * 0.12 - winW * 0.34 + item * (winW * 0.22);
        b.addBox(ix, sy + 0.07, d * 0.4, 0.085, 0.12, 0.055, { materialRole: itemRoles[(shelf + item) % 4], layer: 'detail' });
      }
    }
    b.addBox(-w * 0.12, winY, d * 0.502, winW, winH, 0.014, { materialRole: 'glass', layer: 'detail' });
    b.addBox(w * 0.32, winY + 0.05, d * 0.49, w * 0.2, 0.58, 0.03, { materialRole: 'frame', layer: 'detail' });
    objCreateScreenPlane(group, 'info_display', w * 0.16, 0.12, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: w * 0.32,
      y: winY + 0.2,
      z: d * 0.512
    });
    b.addBox(0, 0.25, d * 0.495, w * 0.78, 0.18, 0.04, { materialRole: 'darkMetal', layer: 'detail' });
  } else if (kind === 'hot_coffee_vendor') {
    objCreateSignPlane(group, cfg.signText || 'Fresh Brew', w * 0.8, 0.26, '#382214', '#ffe7bf', {
      x: 0,
      y: h - 0.26,
      z: d * 0.512,
      lit: true
    });
    objCreateScreenPlane(group, 'kiosk_menu', w * 0.46, 0.32, '#f5b841', cfg.condition, cfg.seed, {
      x: -w * 0.14,
      y: bodyH * 0.62,
      z: d * 0.512
    });
    // Recessed stainless cup dispensing chamber + stacked cup sleeve holder
    b.addBox(0, 0.72, d * 0.44, w * 0.44, 0.28, 0.14, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(0, 0.65, d * 0.44, 0.036, 0.028, 0.1, 10, 'y', 'whiteTrim', 'detail');
    b.addBox(w * 0.28, bodyH * 0.6, d * 0.505, 0.16, 0.36, 0.03, { materialRole: 'darkMetal', layer: 'detail' });
  } else if (kind === 'frozen_icecream_vending') {
    b.addBox(-w * 0.12, bodyH * 0.58, d * 0.498, w * 0.64, bodyH * 0.58, 0.016, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-w * 0.12, bodyH * 0.58, d * 0.36, w * 0.58, bodyH * 0.52, 0.18, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(-w * 0.12, bodyH * 0.48, d * 0.42, w * 0.48, 0.035, 0.04, { materialRole: 'chrome', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Frozen Treats', w * 0.82, 0.24, '#1b6ca8', '#ffffff', {
      x: 0,
      y: h - 0.24,
      z: d * 0.512,
      lit: true
    });
    b.addBox(w * 0.31, bodyH * 0.58, d * 0.502, w * 0.18, 0.42, 0.03, { materialRole: 'accent', layer: 'detail' });
    b.addBox(-w * 0.12, 0.28, d * 0.495, w * 0.52, 0.16, 0.04, { materialRole: 'chrome', layer: 'detail' });
  } else {
    // energy_drink_tower_vending
    const tw = clamp(w, 0.58, 0.82);
    b.addChamferBox(0, 0.06 + bodyH * 0.5, 0, tw, bodyH, d, 0.03, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.06 + bodyH * 0.56, d * 0.49, tw * 0.72, bodyH * 0.72, 0.02, { materialRole: 'glass', layer: 'detail' });
    for (let r = 0; r < 4; r++) {
      const sy = bodyH * 0.36 + r * 0.26;
      b.addBox(0, sy, d * 0.36, tw * 0.64, 0.014, 0.18, { materialRole: 'chrome', layer: 'detail' });
      for (let c = -1; c <= 1; c++) {
        b.addCylinder(c * (tw * 0.18), sy + 0.08, d * 0.4, 0.026, 0.026, 0.14, 8, 'y', 'holoEnergy', 'detail');
      }
    }
    b.addBox(-tw * 0.42, bodyH * 0.56, d * 0.48, 0.025, bodyH * 0.72, 0.025, { materialRole: 'neonGlow', layer: 'detail' });
    b.addBox(tw * 0.42, bodyH * 0.56, d * 0.48, 0.025, bodyH * 0.72, 0.025, { materialRole: 'neonGlow', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Energy Boost', tw * 0.76, 0.18, '#121821', '#4de2ff', {
      x: 0,
      y: h - 0.16,
      z: d * 0.512,
      lit: true
    });
  }

  meta.interaction = { interactable: true, actionType: 'vend_item' };
}

function csvBuildCashRegisters(group, cfg, b, mats, meta) {
  const style = cfg.registerStyle || 'retail_pos_drawer';
  const w = clamp(cfg.width || 0.46, 0.34, 0.78);
  const h = clamp(cfg.height || 0.38, 0.28, 0.54);
  const d = clamp(cfg.depth || 0.42, 0.32, 0.56);

  if (style === 'vintage_brass_register') {
    // Ornate wooden base cash drawer + stepped brass machine + customer price flag marquee
    b.addBox(0, 0.06, 0, w, 0.12, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.06, d * 0.506, w * 0.86, 0.08, 0.012, { materialRole: 'brass', layer: 'detail' });
    b.addCylinder(0, 0.06, d * 0.516, 0.012, 0.012, 0.016, 8, 'z', 'darkMetal', 'detail');
    b.addTrapezoidBox(0, 0.21, -0.02, w * 0.86, d * 0.78, w * 0.76, d * 0.52, 0.19, { materialRole: 'brass', layer: 'body' });
    // Angled mechanical key rows
    for (let r = 0; r < 3; r++) {
      for (let k = -2; k <= 2; k++) {
        b.addCylinder(k * 0.045, 0.15 + r * 0.028, d * 0.22 - r * 0.045, 0.012, 0.012, 0.016, 8, 'y', 'whiteTrim', 'detail');
      }
    }
    // Side brass crank handle
    b.addCylinder(w * 0.45, 0.2, -0.02, 0.015, 0.015, 0.06, 8, 'x', 'brass', 'detail');
    b.addBox(w * 0.49, 0.24, -0.02, 0.018, 0.1, 0.022, { materialRole: 'wood', layer: 'detail' });
    // Glass display window with price flag
    b.addBox(0, 0.36, -0.06, w * 0.62, 0.12, 0.08, { materialRole: 'brass', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || '$12.50', w * 0.48, 0.075, '#191919', '#fff3c4', {
      x: 0,
      y: 0.36,
      z: -0.018
    });
    meta.interaction = { interactable: true, actionType: 'open_cash_drawer' };
    return;
  }

  if (style === 'touchscreen_checkout_rig') {
    const rw = clamp(w, 0.48, 0.72);
    // Steel POS drawer
    b.addBox(0, 0.05, -0.04, rw * 0.78, 0.1, d * 0.88, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, 0.05, d * 0.405, rw * 0.74, 0.075, 0.012, { materialRole: 'chrome', layer: 'detail' });
    // Swivel stand + dual cashier & customer touchscreen displays
    b.addCylinder(-rw * 0.1, 0.19, -0.04, 0.026, 0.032, 0.18, 8, 'y', 'frame', 'body');
    b.addBox(-rw * 0.1, 0.31, -0.02, rw * 0.52, 0.24, 0.032, { materialRole: 'darkMetal', layer: 'body', rotXDeg: -22 });
    objCreateScreenPlane(group, 'kiosk_menu', rw * 0.47, 0.2, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -rw * 0.1,
      y: 0.31,
      z: -0.002,
      rotX: -0.384
    });
    // Pinpad card terminal + barcode scanner gun cradle on right side
    b.addBox(rw * 0.32, 0.04, 0.1, 0.11, 0.06, 0.15, { materialRole: 'frame', layer: 'detail', rotXDeg: 18 });
    b.addBox(rw * 0.32, 0.075, 0.09, 0.08, 0.012, 0.07, { materialRole: 'screen', layer: 'detail', rotXDeg: 18 });
    b.addCylinder(rw * 0.44, 0.07, -0.06, 0.02, 0.028, 0.14, 8, 'y', 'darkMetal', 'detail');
    meta.interaction = { interactable: true, actionType: 'checkout_pos' };
    return;
  }

  // retail_pos_drawer
  b.addBox(0, 0.05, 0, w, 0.1, d, { materialRole: 'frame', layer: 'body' });
  b.addTrapezoidBox(0, 0.16, -0.02, w * 0.92, d * 0.86, w * 0.84, d * 0.62, 0.12, { materialRole: 'primary', layer: 'body' });
  // Keypad grid + thermal receipt roll
  b.addBox(-w * 0.12, 0.21, 0.08, w * 0.56, 0.025, d * 0.34, { materialRole: 'secondary', layer: 'detail', rotXDeg: 18 });
  b.addBox(w * 0.28, 0.25, -0.08, 0.09, 0.08, 0.12, { materialRole: 'primary', layer: 'detail' });
  b.addBox(w * 0.28, 0.31, -0.07, 0.055, 0.05, 0.008, { materialRole: 'whiteTrim', layer: 'detail' });
  // Pop-up LED display turret
  b.addCylinder(w * 0.24, 0.29, -0.15, 0.016, 0.016, 0.16, 8, 'y', 'darkMetal', 'detail');
  b.addBox(w * 0.24, 0.38, -0.15, 0.18, 0.075, 0.036, { materialRole: 'darkMetal', layer: 'detail' });
  objCreateSignPlane(group, cfg.signText || '$04.99', 0.15, 0.05, '#0c1a14', '#4ef29b', {
    x: w * 0.24,
    y: 0.38,
    z: -0.128,
    lit: true
  });
  meta.interaction = { interactable: true, actionType: 'open_cash_drawer' };
}

function csvBuildIndoorTrashCans(group, cfg, b) {
  const style = cfg.binStyle || 'tall_square_swing';
  const w = clamp(cfg.width || 0.42, 0.26, 0.58);
  const h = clamp(cfg.height || 0.78, 0.32, 0.98);
  const d = clamp(cfg.depth || 0.42, 0.26, 0.58);

  if (style === 'short_step_pedal_bin') {
    const bw = clamp(w, 0.28, 0.42);
    const bh = clamp(h, 0.34, 0.52);
    const bd = clamp(d, 0.26, 0.38);
    b.addChamferBox(0, bh * 0.46, 0, bw, bh * 0.9, bd, 0.016, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.02, 0, bw + 0.02, 0.035, bd + 0.02, { materialRole: 'darkMetal', layer: 'body' });
    // Protruding foot step pedal & lid hinge
    b.addBox(0, 0.035, bd * 0.53, bw * 0.38, 0.025, 0.06, { materialRole: 'rubber', layer: 'detail' });
    b.addChamferBox(0, bh * 0.94, 0, bw + 0.014, 0.045, bd + 0.014, 0.012, { materialRole: 'darkMetal', layer: 'detail' });
    return;
  }

  if (style === 'round_dome_open_bin') {
    const r = Math.min(w, d) * 0.48;
    const cylH = clamp(h, 0.55, 0.94) * 0.72;
    b.addCylinder(0, 0.02, 0, r * 1.04, r * 1.05, 0.04, 14, 'y', 'rubber', 'body');
    b.addCylinder(0, 0.04 + cylH * 0.5, 0, r, r * 0.94, cylH, 14, 'y', 'primary', 'body');
    // Chrome open-top funnel dome cap
    b.addCylinder(0, 0.04 + cylH + 0.08, 0, r * 0.52, r * 1.02, 0.16, 14, 'y', 'chrome', 'detail');
    b.addCylinder(0, 0.04 + cylH + 0.145, 0, r * 0.44, r * 0.44, 0.03, 12, 'y', 'darkMetal', 'detail');
    return;
  }

  if (style === 'wire_mesh_wastebasket') {
    const topR = Math.min(w, d) * 0.48;
    const botR = topR * 0.74;
    const wh = clamp(h, 0.3, 0.46);
    b.addCylinder(0, 0.012, 0, botR, botR, 0.02, 12, 'y', 'darkMetal', 'body');
    b.addPrismRing(0, wh, 0, topR, topR * 0.88, 0.02, 12, 'y', 'frame', 'body');
    b.addPrismRing(0, wh * 0.52, 0, (topR + botR) * 0.5, (topR + botR) * 0.46, 0.014, 12, 'y', 'frame', 'detail');
    // Vertical steel mesh struts
    const struts = 10;
    for (let i = 0; i < struts; i++) {
      const a = (i / struts) * Math.PI * 2;
      const x0 = Math.cos(a) * botR;
      const z0 = Math.sin(a) * botR;
      const x1 = Math.cos(a) * topR;
      const z1 = Math.sin(a) * topR;
      b.addPipeSegment(x0, 0.02, z0, x1, wh, z1, 0.008, 6, 'darkMetal', 'detail', true);
    }
    // Crumpled office papers sitting inside the bottom
    b.addBox(-0.03, 0.06, 0.02, 0.065, 0.06, 0.065, { materialRole: 'whiteTrim', layer: 'detail', rotYDeg: 25, rotXDeg: 18 });
    b.addBox(0.04, 0.055, -0.03, 0.055, 0.05, 0.06, { materialRole: 'whiteTrim', layer: 'detail', rotYDeg: -40 });
    return;
  }

  // tall_square_swing
  const bodyH = h * 0.76;
  b.addTrapezoidBox(0, bodyH * 0.5, 0, w * 0.84, d * 0.84, w, d, bodyH, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, bodyH + 0.02, 0, w + 0.025, 0.04, d + 0.025, { materialRole: 'frame', layer: 'detail' });
  // Angled hood with front swinging push door
  b.addTrapezoidBox(0, bodyH + (h - bodyH) * 0.48, 0, w + 0.01, d + 0.01, w * 0.8, d * 0.8, h - bodyH, { materialRole: 'secondary', layer: 'body' });
  b.addBox(0, bodyH + (h - bodyH) * 0.42, d * 0.44, w * 0.62, (h - bodyH) * 0.58, 0.02, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 16 });
}

export function registerCommerceSignageAndVendingFamilies() {
  registerObjectFamily({
    id: 'restroom_doors_signs',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '25_malls_libraries', '09_commercial', '29_residential_household'],
    subcategory: 'Signs, Information & Wayfinding',
    subcategories: [
      'Signs, Information & Wayfinding',
      'Interior Building Infrastructure',
      'Bathroom & Laundry Fixtures',
      'Storefront Attachments'
    ],
    label: 'Restroom Doors & Bathroom Signs',
    description: 'Commercial restroom entry doors, male/female/family/unisex tactile bathroom wall plaques, and projecting corridor blade signs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'ceiling_mounted'],
    locationContext: 'interior',
    environmentTags: ['office', 'mall', 'restaurant', 'lobby'],
    architecturalStyle: 'modern',
    sizeClass: 'small',
    functionalRole: 'signage',
    tags: ['restroom', 'bathroom', 'door', 'sign', 'male', 'female', 'family', 'unisex', 'plaque'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Restroom Fixture' },
      {
        key: 'signMode',
        name: 'Fixture Type',
        type: 'select',
        options: [
          ['restroom_door', 'Commercial Restroom Door'],
          ['bathroom_wall_sign', 'Wall Bathroom Sign Plaque'],
          ['hanging_blade_sign', 'Hanging Restroom Blade Sign']
        ],
        default: 'restroom_door'
      },
      {
        key: 'genderVariant',
        name: 'Restroom Designation',
        type: 'select',
        options: [
          ['male', 'Men / Male'],
          ['female', 'Women / Female'],
          ['family', 'Family Restroom'],
          ['unisex', 'Unisex / All Gender']
        ],
        default: 'male'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.2, max: 1.35, step: 0.04, unit: 'm', default: 0.96 },
      { key: 'height', name: 'Height', type: 'number', min: 0.16, max: 2.35, step: 0.04, unit: 'm', default: 2.12 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.04, max: 0.22, step: 0.02, unit: 'm', default: 0.14 },
      { key: 'signText', name: 'Sign Text', type: 'text', default: 'Men' }
    ],
    presets: [
      {
        id: 'restroom_door_men',
        label: 'Restroom Entry Door (Men)',
        subcategory: 'Interior Building Infrastructure',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d6440',
        accentColor: '#244d78',
        frameColor: '#262d36',
        params: { signMode: 'restroom_door', genderVariant: 'male', signText: 'Men', width: 0.96, height: 2.12 }
      },
      {
        id: 'restroom_door_women',
        label: 'Restroom Entry Door (Women)',
        subcategory: 'Interior Building Infrastructure',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d6440',
        accentColor: '#7a2c53',
        frameColor: '#262d36',
        params: { signMode: 'restroom_door', genderVariant: 'female', signText: 'Women', width: 0.96, height: 2.12 }
      },
      {
        id: 'restroom_door_unisex_family',
        label: 'Family & Unisex Restroom Door',
        subcategory: 'Interior Building Infrastructure',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#7d8a96',
        accentColor: '#236b6e',
        frameColor: '#222830',
        params: { signMode: 'restroom_door', genderVariant: 'family', signText: 'Family Restroom', width: 1.04, height: 2.12 }
      },
      {
        id: 'bathroom_sign_male',
        label: 'Male Restroom Wall Plaque Sign',
        subcategory: 'Signs, Information & Wayfinding',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'corporate_lobby',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#1f446b',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#275482',
        params: { signMode: 'bathroom_wall_sign', genderVariant: 'male', signText: 'Men', width: 0.28, height: 0.34, depth: 0.04 }
      },
      {
        id: 'bathroom_sign_female',
        label: 'Female Restroom Wall Plaque Sign',
        subcategory: 'Signs, Information & Wayfinding',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'corporate_lobby',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#6b2449',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#822d59',
        params: { signMode: 'bathroom_wall_sign', genderVariant: 'female', signText: 'Women', width: 0.28, height: 0.34, depth: 0.04 }
      },
      {
        id: 'bathroom_sign_unisex',
        label: 'Unisex All-Gender Wall Plaque Sign',
        subcategory: 'Signs, Information & Wayfinding',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#215966',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#2b6f7f',
        params: { signMode: 'bathroom_wall_sign', genderVariant: 'unisex', signText: 'All Gender', width: 0.32, height: 0.34, depth: 0.04 }
      },
      {
        id: 'hanging_restroom_blade_sign',
        label: 'Illuminated Corridor Restrooms Blade Sign',
        subcategory: 'Signs, Information & Wayfinding',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#242b33',
        frameColor: '#1c2128',
        params: { signMode: 'hanging_blade_sign', genderVariant: 'unisex', signText: 'Restrooms', width: 0.58, height: 0.22, depth: 0.12 }
      }
    ],
    buildGeometry: csvBuildRestroomDoorsAndSigns
  });

  registerObjectFamily({
    id: 'bank_atm_machines',
    categoryId: '09_commercial',
    categories: ['09_commercial', 'office_public_interiors', '25_malls_libraries'],
    subcategory: 'Vending & Heaters',
    subcategories: ['Vending & Heaters', 'Public Service & Civic Facilities', 'Mall Concourses & Kiosks'],
    label: 'Atm Machines & Cash Kiosks',
    description: 'Through-wall stainless bank Atms, slim corner convenience Atms, and freestanding island lobby banking kiosks.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['atm', 'bank', 'cash', 'kiosk', 'money', 'lobby', 'mall'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Atm Variant' },
      {
        key: 'atmStyle',
        name: 'Atm Cabinet Style',
        type: 'select',
        options: [
          ['corner_slim_atm', 'Slim Corner Cash Atm'],
          ['thru_wall_atm', 'Through-Wall Stainless Bank Atm'],
          ['island_dual_kiosk_atm', 'Modern Lobby Island Atm Kiosk']
        ],
        default: 'corner_slim_atm'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.48, max: 1.05, step: 0.04, unit: 'm', default: 0.64 },
      { key: 'height', name: 'Height', type: 'number', min: 1.15, max: 1.92, step: 0.04, unit: 'm', default: 1.54 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.24, max: 0.86, step: 0.04, unit: 'm', default: 0.54 },
      { key: 'signText', name: 'Header Canopy Text', type: 'text', default: 'Atm Cash' }
    ],
    presets: [
      {
        id: 'through_wall_bank_atm',
        label: 'Through-Wall Stainless Bank Atm',
        subcategory: 'Public Service & Civic Facilities',
        attachmentProfile: 'wall_mounted',
        locationContext: 'both',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#b9c4cf',
        accentColor: '#194f8a',
        frameColor: '#222830',
        params: { atmStyle: 'thru_wall_atm', width: 0.84, height: 1.24, depth: 0.26, signText: 'Bank Atm 24Hr' }
      },
      {
        id: 'convenience_corner_atm',
        label: 'Slim Corner Convenience Cash Atm',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'contemporary_tech',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c343d',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#c7d0d9',
        accentColor: '#c92a24',
        params: { atmStyle: 'corner_slim_atm', width: 0.56, height: 1.54, depth: 0.5, signText: 'Atm Cash' }
      },
      {
        id: 'modern_island_lobby_atm',
        label: 'Modern Island Lobby Atm Kiosk',
        subcategory: 'Mall Concourses & Kiosks',
        paletteFamily: 'corporate_lobby',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce3eb',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#eef3f8',
        accentColor: '#1e5b96',
        frameColor: '#232a33',
        params: { atmStyle: 'island_dual_kiosk_atm', width: 0.72, height: 1.84, depth: 0.68, signText: 'Express Bank' }
      }
    ],
    buildGeometry: csvBuildBankAtmMachines
  });

  registerObjectFamily({
    id: 'soda_vending_machines',
    categoryId: '09_commercial',
    categories: ['09_commercial', 'office_public_interiors', '25_malls_libraries', 'arcades_entertainment'],
    subcategory: 'Vending & Heaters',
    subcategories: [
      'Vending & Heaters',
      'Breakrooms & Employee Amenities',
      'Food, Candy & Refreshments',
      'Mall Concourses & Kiosks'
    ],
    label: 'Soda Dispensers & Vending Machines',
    description: 'Countertop soda fountains and full-size beverage, spiral snack, hot coffee, frozen novelty, and energy drink vending machines.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'both',
    architecturalStyle: 'modern',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['soda', 'vending', 'fountain', 'snacks', 'coffee', 'drink', 'dispenser', 'machine'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Vending Type' },
      {
        key: 'vendingStyle',
        name: 'Vending Model',
        type: 'select',
        options: [
          ['countertop_soda_fountain', 'Countertop Soda Fountain'],
          ['classic_can_soda', 'Full-Size Classic Can Soda Machine'],
          ['glass_spiral_snack', 'Glass-Front Spiral Snack Machine'],
          ['hot_coffee_vendor', 'Self-Serve Hot Coffee Vendor'],
          ['frozen_icecream_vending', 'Frozen Ice Cream Novelty Vendor'],
          ['energy_drink_tower_vending', 'Slim Neon Energy Drink Tower']
        ],
        default: 'classic_can_soda'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.46, max: 1.25, step: 0.04, unit: 'm', default: 0.94 },
      { key: 'height', name: 'Height', type: 'number', min: 0.58, max: 2.15, step: 0.04, unit: 'm', default: 1.88 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.42, max: 0.95, step: 0.04, unit: 'm', default: 0.78 },
      { key: 'signText', name: 'Marquee Sign Text', type: 'text', default: 'Ice Cold Soda' }
    ],
    presets: [
      {
        id: 'countertop_soda_dispenser',
        label: 'Countertop 4-Valve Soda Fountain',
        subcategory: 'Food, Candy & Refreshments',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'arcade_neon_80s',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7df',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#262d36',
        accentColor: '#d9322b',
        params: { vendingStyle: 'countertop_soda_fountain', width: 0.64, height: 0.74, depth: 0.56, signText: 'Fountain Drinks' }
      },
      {
        id: 'classic_can_soda_vending',
        label: 'Classic Full-Size Can Soda Machine',
        subcategory: 'Vending & Heaters',
        paletteFamily: 'arcade_neon_80s',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#b82520',
        accentColor: '#e6b830',
        params: { vendingStyle: 'classic_can_soda', width: 0.92, height: 1.88, depth: 0.78, signText: 'Ice Cold Cans' }
      },
      {
        id: 'glass_front_spiral_vending',
        label: 'Glass-Front Spiral Snack Machine',
        subcategory: 'Breakrooms & Employee Amenities',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#262c34',
        accentColor: '#3ec7e8',
        params: { vendingStyle: 'glass_spiral_snack', width: 1.04, height: 1.88, depth: 0.82, signText: 'Fresh Snacks' }
      },
      {
        id: 'hot_coffee_beverage_vending',
        label: 'Hot Coffee & Espresso Bar Vendor',
        subcategory: 'Breakrooms & Employee Amenities',
        paletteFamily: 'cafe_warm',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#36261d',
        accentColor: '#d48d3b',
        params: { vendingStyle: 'hot_coffee_vendor', width: 0.82, height: 1.84, depth: 0.74, signText: 'Fresh Brew' }
      },
      {
        id: 'frozen_icecream_vending',
        label: 'Frozen Ice Cream Novelty Vendor',
        subcategory: 'Mall Concourses & Kiosks',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e6eff7',
        accentColor: '#2d89c7',
        params: { vendingStyle: 'frozen_icecream_vending', width: 0.94, height: 1.88, depth: 0.8, signText: 'Frozen Treats' }
      },
      {
        id: 'slim_energy_drink_vendor',
        label: 'Neon Energy Drink Tower Vendor',
        subcategory: 'Food, Candy & Refreshments',
        paletteFamily: 'arcade_neon_90s',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#1b2029',
        accentColor: '#38e8b0',
        emissiveColor: '#38e8b0',
        params: { vendingStyle: 'energy_drink_tower_vending', width: 0.68, height: 1.96, depth: 0.72, signText: 'Energy Boost' }
      }
    ],
    buildGeometry: csvBuildSodaAndVendingMachines
  });

  registerObjectFamily({
    id: 'retail_cash_registers',
    categoryId: '09_commercial',
    categories: ['09_commercial', 'office_public_interiors', '25_malls_libraries'],
    subcategory: 'Storefront Attachments',
    subcategories: [
      'Storefront Attachments',
      'Mall Concourses & Kiosks',
      'Office Decorations & Miscellaneous Props',
      'Retail & Arcade Attractions'
    ],
    label: 'Cash Registers & Pos Terminals',
    description: 'Antique ornate brass cash registers, classic countertop button registers with receipt rolls, and dual-screen Pos checkout rigs.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'micro',
    functionalRole: 'functional',
    tags: ['cash register', 'pos', 'checkout', 'till', 'brass', 'shop', 'store'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Register Model' },
      {
        key: 'registerStyle',
        name: 'Register Variant',
        type: 'select',
        options: [
          ['retail_pos_drawer', 'Classic Countertop Register'],
          ['vintage_brass_register', 'Antique Brass Cash Register'],
          ['touchscreen_checkout_rig', 'Dual-Screen Pos Checkout Rig']
        ],
        default: 'retail_pos_drawer'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.34, max: 0.78, step: 0.02, unit: 'm', default: 0.46 },
      { key: 'height', name: 'Height', type: 'number', min: 0.28, max: 0.54, step: 0.02, unit: 'm', default: 0.38 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.32, max: 0.56, step: 0.02, unit: 'm', default: 0.42 },
      { key: 'signText', name: 'Price Display', type: 'text', default: '$04.99' }
    ],
    presets: [
      {
        id: 'vintage_brass_cash_register',
        label: 'Antique Ornate Brass Cash Register',
        subcategory: 'Storefront Attachments',
        paletteFamily: 'heritage_brick',
        condition: 'clean',
        primaryMaterial: 'brass',
        primaryColor: '#c99b3c',
        woodColor: '#694326',
        params: { registerStyle: 'vintage_brass_register', width: 0.44, height: 0.42, depth: 0.38, signText: '$12.50' }
      },
      {
        id: 'retail_pos_drawer_register',
        label: 'Classic Countertop Register & Receipt',
        subcategory: 'Retail & Arcade Attractions',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#c9cfd6',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a1ab',
        frameColor: '#2d333b',
        params: { registerStyle: 'retail_pos_drawer', width: 0.46, height: 0.38, depth: 0.42, signText: '$04.99' }
      },
      {
        id: 'touchscreen_checkout_lane_rig',
        label: 'Modern Touchscreen Pos Checkout Rig',
        subcategory: 'Mall Concourses & Kiosks',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#252b33',
        accentColor: '#3ec7e8',
        params: { registerStyle: 'touchscreen_checkout_rig', width: 0.56, height: 0.42, depth: 0.44 }
      }
    ],
    buildGeometry: csvBuildCashRegisters
  });

  registerObjectFamily({
    id: 'indoor_trash_cans',
    categoryId: '02_waste',
    categories: ['02_waste', 'office_public_interiors', '29_residential_household'],
    subcategory: 'Street Litter Bins',
    subcategories: ['Street Litter Bins', 'Recycling Stations', 'Cleaning & Maintenance', 'Home Lighting, Decor & Clutter'],
    label: 'Indoor Trash Cans & Wastebaskets',
    description: 'Tall square swing-top bins, short stainless foot-pedal cans, round dome commercial trash cans, and wire-mesh desk wastebaskets.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    architecturalStyle: 'modern',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['trash', 'bin', 'wastebasket', 'garbage', 'wire mesh', 'pedal', 'round', 'square'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Trash Can Style' },
      {
        key: 'binStyle',
        name: 'Bin Shape & Lid',
        type: 'select',
        options: [
          ['tall_square_swing', 'Tall Square Swing-Lid Bin'],
          ['short_step_pedal_bin', 'Short Stainless Pedal Bin'],
          ['round_dome_open_bin', 'Round Dome Open Commercial Bin'],
          ['wire_mesh_wastebasket', 'Wire-Mesh Desk Wastebasket']
        ],
        default: 'tall_square_swing'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.26, max: 0.58, step: 0.02, unit: 'm', default: 0.42 },
      { key: 'height', name: 'Height', type: 'number', min: 0.3, max: 0.98, step: 0.02, unit: 'm', default: 0.78 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.26, max: 0.58, step: 0.02, unit: 'm', default: 0.42 }
    ],
    presets: [
      {
        id: 'tall_square_swing_trash_can',
        label: 'Tall Square Swing-Top Trash Can',
        subcategory: 'Cleaning & Maintenance',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#5c6670',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#3b424a',
        params: { binStyle: 'tall_square_swing', width: 0.44, height: 0.86, depth: 0.44 }
      },
      {
        id: 'short_step_pedal_bin',
        label: 'Short Stainless Step-Pedal Trash Bin',
        subcategory: 'Home Lighting, Decor & Clutter',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7df',
        params: { binStyle: 'short_step_pedal_bin', width: 0.32, height: 0.42, depth: 0.3 }
      },
      {
        id: 'round_dome_open_trash_can',
        label: 'Round Commercial Dome Trash Can',
        subcategory: 'Street Litter Bins',
        paletteFamily: 'corporate_lobby',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#262d36',
        params: { binStyle: 'round_dome_open_bin', width: 0.48, height: 0.84, depth: 0.48 }
      },
      {
        id: 'wire_mesh_desk_wastebasket',
        label: 'Wire-Mesh Office Desk Wastebasket',
        subcategory: 'Cleaning & Maintenance',
        paletteFamily: 'contemporary_tech',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b3138',
        frameColor: '#1f2429',
        params: { binStyle: 'wire_mesh_wastebasket', width: 0.3, height: 0.36, depth: 0.3 }
      }
    ],
    buildGeometry: csvBuildIndoorTrashCans
  });
}
