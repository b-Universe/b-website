import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function bkpAddLowPolySphere(b, cx, cy, cz, r, materialRole = 'secondary', layer = 'detail') {
  b.addCylinder(cx, cy, cz, r * 0.72, r * 0.96, r * 0.62, 10, 'y', materialRole, layer);
  b.addCylinder(cx, cy + r * 0.44, cz, r * 0.32, r * 0.72, r * 0.34, 10, 'y', materialRole, layer);
  b.addCylinder(cx, cy - r * 0.44, cz, r * 0.96, r * 0.36, r * 0.34, 10, 'y', materialRole, layer);
}

function bkpAddTowelFold(b, cx, cy, cz, w, d, h, role = 'fabric') {
  b.addChamferBox(cx, cy + h * 0.5, cz, w, h, d, 0.012, { materialRole: role, layer: 'detail' });
  b.addBox(cx, cy + h * 0.25, cz + d * 0.46, w * 0.92, 0.008, 0.015, { materialRole: 'whiteTrim', layer: 'detail' });
}

function bkpBuildBathroomFixtures(group, cfg, b) {
  const mode = cfg.bathroomStyle || 'walk_in_glass_shower';
  const w = clamp(cfg.width || 1.15, 0.35, 2.2);
  const d = clamp(cfg.depth || 0.95, 0.22, 1.35);
  const h = clamp(cfg.height || 2.1, 0.35, 2.45);
  const lit = cfg.lampLit !== false;

  if (mode === 'walk_in_glass_shower') {
    const panH = 0.09;
    b.addBox(0, panH * 0.5, 0, w, panH, d, { materialRole: 'stone', layer: 'body' });
    b.addBox(0, panH + 0.006, 0, w - 0.1, 0.012, d - 0.1, { materialRole: 'secondary', layer: 'detail' });
    b.addCylinder(0, panH + 0.014, 0, 0.055, 0.055, 0.012, 10, 'y', 'chrome', 'detail');

    // Back and left tiled wet walls
    const wallT = 0.06;
    b.addBox(0, h * 0.5, -d * 0.5 + wallT * 0.5, w, h, wallT, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.5 + wallT * 0.5, h * 0.5, 0, wallT, h, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.58, -d * 0.5 + wallT + 0.008, w - 0.12, 0.12, 0.012, { materialRole: 'accent', layer: 'detail' });

    // Translucent glass enclosure + chrome frame rails
    const glassH = h - panH - 0.05;
    const glassMidY = panH + glassH * 0.5;
    b.addBox(w * 0.5 - 0.018, glassMidY, 0, 0.016, glassH, d - 0.04, { materialRole: 'glass', layer: 'detail' });
    b.addBox(w * 0.5 - 0.018, h - 0.03, 0, 0.036, 0.04, d, { materialRole: 'chrome', layer: 'body' });
    b.addBox(w * 0.5 - 0.018, panH + 0.02, 0, 0.036, 0.04, d, { materialRole: 'chrome', layer: 'body' });

    // Hinged front glass door + vertical pull handle
    b.addBox(-0.04, glassMidY, d * 0.5 - 0.018, w * 0.72, glassH, 0.016, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-0.04, h - 0.03, d * 0.5 - 0.018, w - 0.08, 0.038, 0.038, { materialRole: 'chrome', layer: 'body' });
    b.addCylinder(w * 0.24, 1.05, d * 0.5 + 0.025, 0.012, 0.012, 0.42, 8, 'y', 'chrome', 'detail');

    // Overhead rain showerhead + mixing valve
    b.addCylinder(0, h * 0.72, -d * 0.5 + wallT + 0.02, 0.014, 0.014, 0.58, 8, 'y', 'chrome', 'detail');
    b.addCylinder(0, h * 0.88, -d * 0.5 + wallT + 0.18, 0.012, 0.012, 0.34, 8, 'z', 'chrome', 'detail');
    b.addCylinder(0, h * 0.84, -d * 0.5 + wallT + 0.32, 0.13, 0.04, 0.04, 10, 'y', 'chrome', 'detail');
    b.addCylinder(0, 1.08, -d * 0.5 + wallT + 0.03, 0.06, 0.06, 0.025, 10, 'z', 'chrome', 'detail');

    // Corner shampoo caddy
    b.addBox(-w * 0.36, 1.04, -d * 0.36, 0.22, 0.02, 0.22, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(-w * 0.39, 1.14, -d * 0.37, 0.028, 0.028, 0.16, 8, 'y', 'accent', 'detail');
    b.addCylinder(-w * 0.32, 1.12, -d * 0.36, 0.024, 0.024, 0.13, 8, 'y', 'secondary', 'detail');
    return;
  }

  if (mode === 'clawfoot_tub') {
    const legH = 0.16;
    const tubH = clamp(h * 0.44, 0.46, 0.68);
    // 4 sculpted clawfoot legs
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addCylinder(sx * (w * 0.36), legH * 0.5, sz * (d * 0.3), 0.026, 0.042, legH, 8, 'y', 'chrome', 'detail');
      }
    }
    // Outer enamel tub shell + stepped top lip
    b.addChamferBox(0, legH + tubH * 0.46, 0, w * 0.92, tubH * 0.88, d * 0.84, 0.1, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, legH + tubH * 0.9, 0, w, 0.055, d * 0.92, 0.06, { materialRole: 'secondary', layer: 'body' });
    // Inner dark recessed basin floor
    b.addBox(0, legH + tubH * 0.86, 0, w * 0.78, 0.04, d * 0.68, { materialRole: 'stone', layer: 'detail' });
    // Wooden bath caddy across rim + soap + candle
    b.addBox(0.08, legH + tubH * 0.95, 0, 0.24, 0.024, d * 0.96, { materialRole: 'wood', layer: 'detail' });
    b.addCylinder(0.08, legH + tubH * 1.0, 0.08, 0.035, 0.035, 0.07, 8, 'y', 'accent', 'detail');
    // Freestanding gooseneck filler pipe
    b.addCylinder(-w * 0.44, 0.45, -d * 0.42, 0.045, 0.07, 0.04, 10, 'y', 'chrome', 'detail');
    b.addCylinder(-w * 0.44, 0.48, -d * 0.42, 0.018, 0.018, 0.9, 8, 'y', 'chrome', 'detail');
    b.addCylinder(-w * 0.36, 0.92, -d * 0.34, 0.016, 0.016, 0.2, 8, 'z', 'chrome', 'detail');
    return;
  }

  if (mode === 'pedestal_sink_mirror') {
    const basinH = 0.84;
    b.addCylinder(0, 0.05, 0.02, 0.15, 0.2, 0.1, 10, 'y', 'primary', 'body');
    b.addCylinder(0, basinH * 0.48, 0.02, 0.1, 0.13, basinH * 0.76, 10, 'y', 'primary', 'body');
    b.addChamferBox(0, basinH, 0.04, w, 0.16, d, 0.04, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, basinH + 0.06, 0.07, w * 0.72, 0.05, d * 0.58, { materialRole: 'stone', layer: 'detail' });
    // Faucet + handles
    b.addCylinder(0, basinH + 0.14, -d * 0.28, 0.014, 0.016, 0.15, 8, 'y', 'chrome', 'detail');
    b.addCylinder(0, basinH + 0.2, -d * 0.18, 0.011, 0.011, 0.16, 8, 'z', 'chrome', 'detail');
    b.addCylinder(-0.1, basinH + 0.11, -d * 0.28, 0.02, 0.02, 0.05, 8, 'y', 'chrome', 'detail');
    b.addCylinder(0.1, basinH + 0.11, -d * 0.28, 0.02, 0.02, 0.05, 8, 'y', 'chrome', 'detail');
    // Wall mirror above
    const mirrorW = w * 0.86;
    const mirrorH = clamp(h * 0.46, 0.65, 1.15);
    const mirrorY = 1.48;
    b.addBox(0, mirrorY, -d * 0.42, mirrorW, mirrorH, 0.035, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, mirrorY, -d * 0.4, mirrorW - 0.07, mirrorH - 0.07, 0.02, { materialRole: 'glass', layer: 'detail' });
    if (lit) {
      b.addBox(0, mirrorY + mirrorH * 0.5 + 0.06, -d * 0.34, mirrorW * 0.55, 0.045, 0.08, { materialRole: 'lampGlow', layer: 'detail' });
    }
    return;
  }

  if (mode === 'double_vanity_sconce') {
    const cabH = 0.84;
    b.addBox(0, 0.045, 0.02, w - 0.04, 0.09, d - 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, cabH * 0.5 + 0.03, 0, w - 0.02, cabH - 0.08, d - 0.02, { materialRole: 'wood', layer: 'body' });
    // Twin cabinet door pairs & center drawers
    for (const sx of [-0.34, -0.14, 0.14, 0.34]) {
      b.addBox(sx * w, cabH * 0.48, d * 0.495, w * 0.18, cabH * 0.66, 0.02, { materialRole: 'primary', layer: 'detail' });
      b.addCylinder(sx * w, cabH * 0.58, d * 0.515, 0.009, 0.009, 0.11, 6, 'y', 'chrome', 'detail');
    }
    // Stone counter + twin basins & faucets
    b.addBox(0, cabH + 0.025, 0.015, w + 0.03, 0.05, d + 0.03, { materialRole: 'stone', layer: 'body' });
    b.addBox(0, cabH + 0.09, -d * 0.46, w + 0.03, 0.09, 0.03, { materialRole: 'stone', layer: 'detail' });
    for (const bx of [-w * 0.28, w * 0.28]) {
      b.addBox(bx, cabH + 0.042, 0.03, w * 0.28, 0.025, d * 0.56, { materialRole: 'secondary', layer: 'detail' });
      b.addCylinder(bx, cabH + 0.11, -d * 0.26, 0.014, 0.016, 0.13, 8, 'y', 'chrome', 'detail');
      b.addCylinder(bx, cabH + 0.16, -d * 0.18, 0.01, 0.01, 0.13, 8, 'z', 'chrome', 'detail');
    }
    // Wide beveled mirror & 3 globe sconces
    b.addBox(0, 1.5, -d * 0.45, w * 0.94, 0.88, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 1.5, -d * 0.43, w * 0.88, 0.8, 0.02, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, 2.02, -d * 0.42, w * 0.86, 0.045, 0.06, { materialRole: 'chrome', layer: 'detail' });
    for (const gx of [-w * 0.3, 0, w * 0.3]) {
      b.addCylinder(gx, 2.0, -d * 0.33, 0.012, 0.012, 0.1, 8, 'z', 'chrome', 'detail');
      bkpAddLowPolySphere(b, gx, 1.98, -d * 0.27, 0.055, lit ? 'lampGlow' : 'secondary', 'detail');
    }
    return;
  }

  if (mode === 'medicine_cabinet_towel_bar') {
    // Wall-mounted backplane at z = 0 facing +z
    const cabH = clamp(h, 0.65, 1.05);
    const cabD = clamp(d, 0.14, 0.28);
    b.addBox(0, cabH * 0.5 + 0.18, cabD * 0.5, w, cabH, cabD, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, cabH * 0.5 + 0.18, cabD + 0.012, w - 0.04, cabH - 0.04, 0.024, { materialRole: 'frame', layer: 'detail' });
    b.addBox(0, cabH * 0.5 + 0.18, cabD + 0.022, w - 0.1, cabH - 0.1, 0.015, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(w * 0.38, cabH * 0.5 + 0.18, cabD + 0.045, 0.014, 0.014, 0.03, 8, 'z', 'chrome', 'detail');
    // Lower towel bar + hanging hand towel
    b.addCylinder(-w * 0.36, 0.08, cabD * 0.45, 0.012, 0.012, cabD * 0.75, 8, 'z', 'chrome', 'detail');
    b.addCylinder(w * 0.36, 0.08, cabD * 0.45, 0.012, 0.012, cabD * 0.75, 8, 'z', 'chrome', 'detail');
    b.addCylinder(0, 0.08, cabD * 0.75, 0.012, 0.012, w * 0.78, 8, 'x', 'chrome', 'detail');
    b.addChamferBox(0, -0.05, cabD * 0.75, w * 0.42, 0.26, 0.042, 0.01, { materialRole: 'fabric', layer: 'detail' });
    return;
  }

  if (mode === 'heated_towel_warmer') {
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.44), 0.025, 0, 0.05, 0.05, d, { materialRole: 'chrome', layer: 'body' });
      b.addCylinder(sx * (w * 0.44), h * 0.5, 0, 0.016, 0.016, h, 8, 'y', 'chrome', 'body');
    }
    const rungs = 5;
    for (let i = 0; i < rungs; i++) {
      const ry = 0.34 + (i / (rungs - 1)) * (h - 0.44);
      b.addCylinder(0, ry, 0, 0.012, 0.012, w * 0.88, 8, 'x', 'chrome', 'body');
    }
    // Draped heated towels
    b.addChamferBox(-w * 0.16, h * 0.72, 0.01, w * 0.44, 0.44, 0.045, 0.012, { materialRole: 'fabric', layer: 'detail' });
    b.addChamferBox(w * 0.2, h * 0.48, -0.01, w * 0.32, 0.36, 0.04, 0.012, { materialRole: 'accent', layer: 'detail' });
    b.addBox(w * 0.44, 0.2, d * 0.2, 0.022, 0.032, 0.022, { materialRole: 'neonGlow', layer: 'detail' });
    return;
  }

  if (mode === 'bath_toiletries_tray') {
    // Surface-placed countertop vanity tray
    b.addBox(0, 0.012, 0, w, 0.024, d, { materialRole: 'wood', layer: 'body' });
    b.addCylinder(-w * 0.28, 0.09, -0.02, 0.035, 0.038, 0.14, 10, 'y', 'accent', 'detail');
    b.addCylinder(-w * 0.28, 0.175, -0.02, 0.012, 0.012, 0.04, 8, 'y', 'chrome', 'detail');
    b.addCylinder(0, 0.075, 0.02, 0.032, 0.028, 0.11, 10, 'y', 'glass', 'detail');
    b.addCylinder(-0.01, 0.13, 0.02, 0.008, 0.008, 0.09, 6, 'y', 'primary', 'detail');
    b.addCylinder(0.015, 0.135, 0.02, 0.008, 0.008, 0.095, 6, 'y', 'secondary', 'detail');
    bkpAddTowelFold(b, w * 0.24, 0.024, 0, w * 0.34, d * 0.65, 0.055, 'fabric');
    return;
  }

  // Bathroom hamper, digital scale & toilet paper stand
  const hx = -w * 0.22;
  b.addBox(hx, 0.34, 0, w * 0.44, 0.64, d * 0.72, { materialRole: 'wood', layer: 'body' });
  b.addBox(hx, 0.67, 0, w * 0.46, 0.04, d * 0.74, { materialRole: 'fabric', layer: 'detail' });
  // Glass bathroom scale beside hamper
  const sx = w * 0.24;
  b.addBox(sx, 0.018, 0.1, 0.34, 0.036, 0.32, { materialRole: 'glass', layer: 'body' });
  b.addBox(sx, 0.039, -0.01, 0.14, 0.008, 0.055, { materialRole: 'neonGlow', layer: 'detail' });
  // Freestanding toilet-paper & spare roll caddy
  const tx = w * 0.36;
  b.addCylinder(tx, 0.02, -0.18, 0.1, 0.11, 0.04, 10, 'y', 'chrome', 'body');
  b.addCylinder(tx, 0.32, -0.18, 0.014, 0.014, 0.58, 8, 'y', 'chrome', 'body');
  b.addCylinder(tx + 0.06, 0.56, -0.18, 0.055, 0.055, 0.11, 10, 'x', 'whiteTrim', 'detail');
  b.addCylinder(tx, 0.18, -0.18, 0.055, 0.055, 0.11, 10, 'y', 'whiteTrim', 'detail');
}

function bkpBuildKitchenPrep(group, cfg, b) {
  const mode = cfg.kitchenStyle || 'builtin_dishwasher';
  const w = clamp(cfg.width || 0.9, 0.45, 2.6);
  const d = clamp(cfg.depth || 0.68, 0.28, 1.25);
  const h = clamp(cfg.height || 0.9, 0.25, 2.35);
  const lit = cfg.lampLit !== false;

  if (mode === 'builtin_dishwasher') {
    b.addBox(0, 0.05, -0.03, w - 0.04, 0.1, d - 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.5 + 0.02, 0, w, h - 0.06, d - 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.48, d * 0.49, w - 0.04, h - 0.16, 0.03, { materialRole: 'secondary', layer: 'detail' });
    // Tubular stainless pull handle + top fascia console
    b.addCylinder(0, h * 0.77, d * 0.54, 0.014, 0.014, w * 0.78, 8, 'x', 'chrome', 'detail');
    b.addBox(0, h * 0.89, d * 0.495, w - 0.06, 0.075, 0.035, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(w * 0.26, h * 0.89, d * 0.515, 0.12, 0.025, 0.01, { materialRole: 'neonGlow', layer: 'detail' });
    b.addBox(0, h + 0.02, 0.01, w + 0.02, 0.04, d + 0.02, { materialRole: 'stone', layer: 'body' });
    return;
  }

  if (mode === 'chimney_range_hood') {
    // Wall-mounted backplane at z = 0 facing +z
    const ductW = clamp(w * 0.34, 0.24, 0.44);
    const ductD = clamp(d * 0.52, 0.22, 0.36);
    const canopyH = clamp(h * 0.36, 0.24, 0.42);
    const ductH = Math.max(0.32, h - canopyH);
    b.addBox(0, canopyH + ductH * 0.5, ductD * 0.5, ductW, ductH, ductD, { materialRole: 'secondary', layer: 'body' });
    b.addTrapezoidBox(0, canopyH * 0.5, d * 0.5, w, d, ductW + 0.08, ductD + 0.04, canopyH, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.04, d * 0.5, w + 0.02, 0.06, d + 0.02, { materialRole: 'chrome', layer: 'detail' });
    // Underside grease baffle filters & task light
    for (const fx of [-w * 0.24, w * 0.24]) {
      b.addBox(fx, 0.012, d * 0.48, w * 0.38, 0.016, d * 0.66, { materialRole: 'frame', layer: 'detail' });
    }
    b.addBox(0, 0.014, d * 0.18, w * 0.72, 0.016, 0.08, { materialRole: lit ? 'lampGlow' : 'secondary', layer: 'detail' });
    b.addBox(0, 0.05, d + 0.015, 0.26, 0.036, 0.015, { materialRole: 'darkMetal', layer: 'detail' });
    return;
  }

  if (mode === 'cabinet_run_glass_uppers') {
    const baseH = 0.88;
    const upperBottom = 1.38;
    const upperH = Math.max(0.55, h - upperBottom);
    const upperD = d * 0.62;
    // Lower base cabinets + drawers + quartz countertop
    b.addBox(0, 0.045, 0.02, w - 0.04, 0.09, d - 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, baseH * 0.5 + 0.03, 0, w, baseH - 0.06, d, { materialRole: 'wood', layer: 'body' });
    const bays = Math.max(2, Math.round(w / 0.58));
    for (let i = 0; i < bays; i++) {
      const bx = -w * 0.5 + (i + 0.5) * (w / bays);
      const bw = (w / bays) - 0.05;
      b.addBox(bx, baseH - 0.12, d * 0.505, bw, 0.14, 0.02, { materialRole: 'primary', layer: 'detail' });
      b.addBox(bx, baseH * 0.42, d * 0.505, bw, baseH * 0.52, 0.02, { materialRole: 'primary', layer: 'detail' });
      b.addCylinder(bx, baseH - 0.12, d * 0.525, 0.008, 0.008, 0.12, 6, 'x', 'chrome', 'detail');
      // Upper glass-front display cabinet bays with stacked bowls/plates visible inside
      b.addBox(bx, upperBottom + upperH * 0.5, -d * 0.5 + upperD * 0.5, bw + 0.03, upperH, upperD, { materialRole: 'wood', layer: 'body' });
      b.addBox(bx, upperBottom + upperH * 0.35, -d * 0.5 + upperD * 0.48, bw * 0.72, 0.024, upperD * 0.72, { materialRole: 'secondary', layer: 'detail' });
      b.addCylinder(bx - bw * 0.18, upperBottom + upperH * 0.43, -d * 0.5 + upperD * 0.5, 0.11, 0.11, 0.06, 10, 'y', 'whiteTrim', 'detail');
      b.addCylinder(bx + bw * 0.18, upperBottom + upperH * 0.22, -d * 0.5 + upperD * 0.5, 0.09, 0.07, 0.11, 10, 'y', 'accent', 'detail');
      b.addBox(bx, upperBottom + upperH * 0.5, -d * 0.5 + upperD + 0.01, bw - 0.04, upperH - 0.08, 0.018, { materialRole: 'glass', layer: 'detail' });
    }
    b.addBox(0, baseH + 0.025, 0.015, w + 0.03, 0.05, d + 0.03, { materialRole: 'stone', layer: 'body' });
    b.addBox(0, (baseH + upperBottom) * 0.5, -d * 0.48, w, upperBottom - baseH, 0.03, { materialRole: 'secondary', layer: 'body' });
    if (lit) {
      b.addBox(0, upperBottom - 0.015, -d * 0.5 + upperD * 0.5, w * 0.86, 0.02, 0.06, { materialRole: 'lampGlow', layer: 'detail' });
    }
    return;
  }

  if (mode === 'glass_wine_beverage_cooler') {
    b.addBox(0, h * 0.5, 0, w, h, d, { materialRole: 'frame', layer: 'body' });
    b.addLouverGrille(0, 0.07, d * 0.505, w * 0.88, 0.1, 4, 'z', 'darkMetal', 'detail');
    // Interior wine shelves & bottles visible through glass door
    const shelves = 4;
    for (let s = 0; s < shelves; s++) {
      const sy = 0.22 + s * ((h - 0.34) / shelves);
      b.addBox(0, sy, -0.02, w * 0.82, 0.022, d * 0.72, { materialRole: 'wood', layer: 'detail' });
      const bottles = Math.max(2, Math.floor((w * 0.72) / 0.13));
      for (let k = 0; k < bottles; k++) {
        const bx = -w * 0.3 + (bottles > 1 ? (k / (bottles - 1)) * (w * 0.6) : 0);
        b.addCylinder(bx, sy + 0.055, -0.02, 0.036, 0.038, 0.24, 8, 'z', k % 2 === 0 ? 'accent' : 'primary', 'detail');
      }
    }
    if (lit) {
      b.addBox(0, h - 0.07, d * 0.1, w * 0.72, 0.02, 0.04, { materialRole: 'neonGlow', layer: 'detail' });
    }
    // Framed translucent glass door + vertical handle
    b.addBox(0, h * 0.55, d * 0.505, w - 0.05, h - 0.18, 0.022, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(w * 0.42, h * 0.55, d * 0.545, 0.012, 0.012, h * 0.66, 8, 'y', 'chrome', 'detail');
    return;
  }

  if (mode === 'espresso_mixer_counter_bar') {
    // Surface-placed countertop appliances side-by-side
    const mx = -w * 0.24;
    // Retro tilt-head stand mixer
    b.addBox(mx, 0.02, 0, 0.22, 0.04, 0.3, { materialRole: 'accent', layer: 'body' });
    b.addBox(mx, 0.16, -0.08, 0.11, 0.24, 0.12, { materialRole: 'accent', layer: 'body' });
    b.addChamferBox(mx, 0.29, 0, 0.13, 0.11, 0.3, 0.02, { materialRole: 'accent', layer: 'body' });
    b.addCylinder(mx, 0.11, 0.06, 0.1, 0.07, 0.14, 12, 'y', 'chrome', 'detail');
    // Semi-auto espresso maker + cup tray + mugs
    const ex = w * 0.22;
    b.addBox(ex, 0.02, 0, 0.3, 0.04, 0.28, { materialRole: 'chrome', layer: 'body' });
    b.addBox(ex, 0.2, -0.05, 0.28, 0.32, 0.18, { materialRole: 'primary', layer: 'body' });
    b.addBox(ex, 0.31, 0.07, 0.26, 0.08, 0.12, { materialRole: 'chrome', layer: 'body' });
    b.addCylinder(ex - 0.04, 0.23, 0.06, 0.028, 0.024, 0.05, 10, 'y', 'darkMetal', 'detail');
    b.addCylinder(ex + 0.03, 0.23, 0.12, 0.01, 0.01, 0.11, 8, 'z', 'wood', 'detail');
    b.addCylinder(ex - 0.04, 0.075, 0.07, 0.028, 0.024, 0.07, 8, 'y', 'whiteTrim', 'detail');
    b.addCylinder(ex + 0.07, 0.38, -0.05, 0.03, 0.026, 0.075, 8, 'y', 'secondary', 'detail');
    return;
  }

  if (mode === 'breakfast_peninsula_stools') {
    const cH = 0.96;
    b.addBox(0, cH * 0.48, -d * 0.12, w, cH - 0.04, d * 0.56, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, cH, 0, w + 0.04, 0.055, d * 0.86, { materialRole: 'stone', layer: 'body' });
    b.addBox(-w * 0.5 + 0.03, cH * 0.5, 0, 0.06, cH, d * 0.86, { materialRole: 'stone', layer: 'body' });
    // Wine cubbies on right gable end
    for (let i = 0; i < 3; i++) {
      b.addBox(w * 0.5 - 0.02, 0.28 + i * 0.22, -d * 0.12, 0.06, 0.14, d * 0.42, { materialRole: 'wood', layer: 'detail' });
    }
    // Two tucked backless barstools
    const stoolCount = Math.max(2, Math.floor(w / 0.65));
    for (let i = 0; i < stoolCount; i++) {
      const sx = -w * 0.3 + (stoolCount > 1 ? (i / (stoolCount - 1)) * (w * 0.6) : 0);
      const sz = d * 0.32;
      b.addPedestalPost(sx, 0, sz, 0.18, 0.032, 0.64, { baseRole: 'frame', postRole: 'chrome' });
      b.addPrismRing(sx, 0.24, sz, 0.16, 0.135, 0.02, 10, 'y', 'chrome', 'detail');
      b.addCylinder(sx, 0.68, sz, 0.18, 0.17, 0.075, 12, 'y', 'upholstery', 'body');
    }
    return;
  }

  if (mode === 'butcher_block_prep_cart') {
    b.addCasterWheels(0, 0, w - 0.14, d - 0.14, 0.045, 'rubber', 'chrome', 0);
    b.addSupportLegs(0, 0.09, h - 0.07, w - 0.12, d - 0.12, 0.065, 'wood', 0);
    b.addSlattedArray(0, 0.24, 0, d * 0.68, 5, w * 0.86, 0.026, 0.065, 'z', 'wood', 'body');
    b.addBox(0, h - 0.16, 0, w * 0.9, 0.16, d * 0.88, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h - 0.035, 0, w, 0.07, d, { materialRole: 'wood', layer: 'body' });
    // Copper stockpot on lower shelf & side towel rail
    b.addCylinder(-w * 0.14, 0.34, 0, 0.13, 0.13, 0.16, 10, 'y', 'accent', 'detail');
    b.addCylinder(w * 0.54, h - 0.15, 0, 0.012, 0.012, d * 0.72, 8, 'z', 'chrome', 'detail');
    return;
  }

  // Knife block, cutting board & cast-iron skillet prep clutter (surface_placed)
  b.addBox(-w * 0.24, 0.13, 0, 0.13, 0.24, 0.2, { materialRole: 'wood', layer: 'body', rotXDeg: 22 });
  for (let i = 0; i < 4; i++) {
    b.addBox(-w * 0.24 + (i - 1.5) * 0.025, 0.24, -0.05, 0.018, 0.09, 0.035, { materialRole: i % 2 === 0 ? 'darkMetal' : 'chrome', layer: 'detail', rotXDeg: 22 });
  }
  b.addBox(0.02, 0.018, 0.04, 0.34, 0.032, 0.24, { materialRole: 'wood', layer: 'body' });
  b.addCylinder(w * 0.26, 0.035, 0, 0.13, 0.11, 0.065, 12, 'y', 'darkMetal', 'detail');
  b.addBox(w * 0.44, 0.055, 0, 0.18, 0.022, 0.032, { materialRole: 'darkMetal', layer: 'detail', rotZDeg: 8 });
  b.addCylinder(0.05, 0.065, -0.05, 0.045, 0.045, 0.09, 10, 'y', 'whiteTrim', 'detail');
}

function bkpBuildPatioOutdoor(group, cfg, b) {
  const mode = cfg.patioStyle || 'propane_bbq_grill';
  const w = clamp(cfg.width || 1.45, 0.65, 2.8);
  const d = clamp(cfg.depth || 0.75, 0.55, 2.2);
  const h = clamp(cfg.height || 1.25, 0.45, 2.55);
  const lit = cfg.lampLit !== false;

  if (mode === 'propane_bbq_grill') {
    b.addCasterWheels(0, 0, w * 0.44, d * 0.74, 0.045, 'rubber', 'frame', 0);
    // Lower stainless cabinet + twin doors
    b.addBox(0, 0.46, 0, w * 0.52, 0.72, d * 0.8, { materialRole: 'frame', layer: 'body' });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.125), 0.46, d * 0.41, w * 0.23, 0.66, 0.025, { materialRole: 'secondary', layer: 'detail' });
      b.addCylinder(sx * (w * 0.04), 0.52, d * 0.44, 0.009, 0.009, 0.16, 6, 'y', 'chrome', 'detail');
      // Fold-out prep side shelves
      b.addBox(sx * (w * 0.39), 0.85, 0, w * 0.24, 0.04, d * 0.76, { materialRole: 'secondary', layer: 'body' });
    }
    // Recessed side burner on right shelf
    b.addCylinder(w * 0.39, 0.88, 0, 0.09, 0.09, 0.02, 10, 'y', 'darkMetal', 'detail');
    // Cookbox + rotary burner knobs
    b.addBox(0, 0.89, 0, w * 0.54, 0.18, d * 0.82, { materialRole: 'darkMetal', layer: 'body' });
    for (let i = 0; i < 4; i++) {
      const kx = -w * 0.18 + i * (w * 0.12);
      b.addCylinder(kx, 0.89, d * 0.43, 0.022, 0.022, 0.025, 10, 'z', 'chrome', 'detail');
    }
    // Domed roll-top hood + thermometer dial + handle
    b.addTrapezoidBox(0, 1.09, 0, w * 0.54, d * 0.8, w * 0.5, d * 0.48, 0.22, { materialRole: 'secondary', layer: 'body' });
    b.addCylinder(0, 1.04, d * 0.43, 0.012, 0.012, w * 0.46, 8, 'x', 'chrome', 'detail');
    b.addCylinder(0, 1.12, d * 0.34, 0.032, 0.032, 0.02, 10, 'z', lit ? 'lampGlow' : 'whiteTrim', 'detail');
    return;
  }

  if (mode === 'charcoal_kettle_grill') {
    const gx = -w * 0.2;
    b.addCylinder(gx - 0.18, 0.09, 0.16, 0.09, 0.09, 0.04, 12, 'x', 'rubber', 'detail');
    b.addCylinder(gx - 0.18, 0.09, -0.16, 0.09, 0.09, 0.04, 12, 'x', 'rubber', 'detail');
    b.addPipeSegment(gx - 0.18, 0.09, 0.15, gx - 0.08, 0.62, 0.12, 0.016, 8, 'chrome', 'body');
    b.addPipeSegment(gx - 0.18, 0.09, -0.15, gx - 0.08, 0.62, -0.12, 0.016, 8, 'chrome', 'body');
    b.addPipeSegment(gx + 0.22, 0.02, 0, gx + 0.14, 0.62, 0, 0.016, 8, 'chrome', 'body');
    b.addCylinder(gx, 0.32, 0, 0.18, 0.16, 0.03, 12, 'y', 'chrome', 'detail');
    // Glossy enamel kettle bowl & lid
    b.addCylinder(gx, 0.68, 0, 0.32, 0.18, 0.22, 14, 'y', 'primary', 'body');
    b.addCylinder(gx, 0.89, 0, 0.18, 0.32, 0.2, 14, 'y', 'primary', 'body');
    b.addBox(gx, 1.02, 0, 0.14, 0.04, 0.04, { materialRole: 'wood', layer: 'detail' });
    // Accompanying cedar charcoal side caddy table
    const tx = w * 0.26;
    b.addSupportLegs(tx, 0, 0.78, w * 0.36, d * 0.62, 0.05, 'frame', 0);
    b.addBox(tx, 0.78, 0, w * 0.42, 0.045, d * 0.72, { materialRole: 'wood', layer: 'body' });
    b.addBox(tx, 0.3, 0, w * 0.38, 0.03, d * 0.64, { materialRole: 'frame', layer: 'body' });
    b.addBox(tx, 0.45, 0, 0.24, 0.28, 0.16, { materialRole: 'accent', layer: 'detail' });
    return;
  }

  if (mode === 'adirondack_porch_chair') {
    // Low-slung sloped stringers + front legs + fanned backrest slats
    for (const sx of [-1, 1]) {
      b.addBox(sx * (w * 0.38), 0.26, d * 0.24, 0.07, 0.52, 0.07, { materialRole: 'wood', layer: 'body' });
      b.addBox(sx * (w * 0.38), 0.18, -0.02, 0.06, 0.09, d * 0.92, { materialRole: 'wood', layer: 'body', rotXDeg: 18 });
      // Wide paddle armrests
      b.addBox(sx * (w * 0.41), 0.53, 0.04, 0.16, 0.035, d * 0.72, { materialRole: 'primary', layer: 'body' });
    }
    b.addSlattedArray(0, 0.3, 0.02, d * 0.5, 5, w * 0.7, 0.03, 0.075, 'z', 'primary', 'body', 0.26);
    // 7 fanned Adirondack backrest slats
    const slats = 7;
    for (let i = 0; i < slats; i++) {
      const t = (i / (slats - 1)) - 0.5;
      const sx = t * (w * 0.54);
      const sy = 0.62 + (1 - Math.abs(t) * 1.1) * 0.08;
      b.addBox(sx, sy, -d * 0.28, 0.075, 0.74 - Math.abs(t) * 0.12, 0.026, { materialRole: 'primary', layer: 'body', rotXDeg: -22, rotZDeg: -t * 18 });
    }
    b.addChamferBox(0, 0.43, -0.06, w * 0.56, 0.2, 0.12, 0.02, { materialRole: 'upholstery', layer: 'detail', rotXDeg: -16 });
    return;
  }

  if (mode === 'a_frame_porch_swing') {
    const beamY = h - 0.08;
    for (const sx of [-1, 1]) {
      const px = sx * (w * 0.46);
      b.addPipeSegment(px, 0, -d * 0.45, px, beamY, 0, 0.042, 8, 'frame', 'body');
      b.addPipeSegment(px, 0, d * 0.45, px, beamY, 0, 0.042, 8, 'frame', 'body');
      b.addBox(px, beamY * 0.45, 0, 0.04, 0.05, d * 0.56, { materialRole: 'frame', layer: 'body' });
    }
    b.addBox(0, beamY, 0, w, 0.08, 0.09, { materialRole: 'frame', layer: 'body' });
    // Suspended two-seat wooden porch swing + cushions
    const sw = w * 0.68;
    const seatY = 0.46;
    b.addBox(0, seatY, 0.03, sw, 0.05, 0.52, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, seatY + 0.3, -0.22, sw, 0.54, 0.05, { materialRole: 'wood', layer: 'body', rotXDeg: -12 });
    for (const sx of [-1, 1]) {
      b.addBox(sx * (sw * 0.48), seatY + 0.15, 0, 0.05, 0.24, 0.52, { materialRole: 'wood', layer: 'body' });
      b.addPipeSegment(sx * (sw * 0.46), seatY + 0.22, -0.16, sx * (sw * 0.42), beamY, 0, 0.012, 6, 'chrome', 'detail');
      b.addPipeSegment(sx * (sw * 0.46), seatY + 0.1, 0.2, sx * (sw * 0.42), beamY, 0, 0.012, 6, 'chrome', 'detail');
    }
    b.addChamferBox(0, seatY + 0.06, 0.04, sw * 0.92, 0.08, 0.46, 0.02, { materialRole: 'upholstery', layer: 'detail' });
    b.addBox(-sw * 0.34, seatY + 0.22, -0.12, 0.24, 0.22, 0.1, { materialRole: 'accent', layer: 'detail', rotZDeg: 8 });
    return;
  }

  if (mode === 'wicker_chaise_lounger') {
    b.addSupportLegs(0, 0, 0.22, w * 0.84, d * 0.86, 0.055, 'frame', 0);
    b.addBox(0, 0.24, 0, w, 0.07, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.31, d * 0.16, w * 0.92, 0.08, d * 0.64, { materialRole: 'upholstery', layer: 'detail' });
    // Propped backrest frame & cushion
    b.addBox(0, 0.46, -d * 0.32, w * 0.96, 0.055, d * 0.38, { materialRole: 'wood', layer: 'body', rotXDeg: 38 });
    b.addBox(0, 0.51, -d * 0.3, w * 0.9, 0.08, d * 0.36, { materialRole: 'upholstery', layer: 'detail', rotXDeg: 38 });
    b.addCylinder(0, 0.62, -d * 0.42, 0.055, 0.055, w * 0.68, 10, 'x', 'accent', 'detail');
    // Slide-out drink shelf
    b.addBox(w * 0.62, 0.24, -0.05, 0.26, 0.03, 0.26, { materialRole: 'wood', layer: 'detail' });
    return;
  }

  if (mode === 'stone_fire_pit') {
    const outerR = Math.min(w, d) * 0.44;
    const blocks = 12;
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < blocks; i++) {
        const a = ((i + ring * 0.5) / blocks) * Math.PI * 2;
        const bx = Math.cos(a) * outerR;
        const bz = Math.sin(a) * outerR;
        b.addBox(bx, 0.11 + ring * 0.18, bz, (outerR * 0.52), 0.16, 0.22, { materialRole: ring === 0 ? 'concrete' : 'stone', layer: 'body', rotYDeg: -(a * 180) / Math.PI + 90 });
      }
    }
    b.addPrismRing(0, 0.42, 0, outerR + 0.14, outerR - 0.12, 0.06, 12, 'y', 'stone', 'body');
    b.addCylinder(0, 0.14, 0, outerR - 0.12, outerR - 0.12, 0.12, 12, 'y', 'darkMetal', 'body');
    // Charred logs & warm campfire glow
    for (let i = 0; i < 3; i++) {
      b.addCylinder(0, 0.25, 0, 0.048, 0.055, outerR * 0.95, 7, 'x', 'wood', 'detail', (i * Math.PI) / 3);
    }
    if (lit) {
      b.addCone(0, 0.36, 0, 0.16, 0.28, 8, 'lampGlow', 'detail');
      b.addCone(0, 0.3, 0, 0.22, 0.16, 8, 'warningYellow', 'detail');
    }
    return;
  }

  if (mode === 'patio_dining_umbrella') {
    const tableR = Math.min(w, d) * 0.3;
    const tableH = 0.74;
    b.addCylinder(0, tableH, 0, tableR, tableR, 0.05, 10, 'y', 'wood', 'body');
    b.addPedestalPost(0, 0, 0, tableR * 0.45, 0.045, tableH - 0.02, { baseRole: 'frame', postRole: 'frame' });
    // Tall aluminum market umbrella
    const poleH = clamp(h, 1.9, 2.55);
    b.addCylinder(0, poleH * 0.5, 0, 0.024, 0.024, poleH, 8, 'y', 'chrome', 'body');
    b.addCone(0, poleH - 0.16, 0, Math.min(w, d) * 0.48, 0.42, 8, 'accent', 'body');
    b.addCylinder(0, poleH + 0.07, 0, 0.035, 0.035, 0.05, 8, 'y', 'wood', 'detail');
    // 4 tucked radial patio chairs
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const dist = tableR + 0.34;
      const cx = Math.cos(a) * dist;
      const cz = Math.sin(a) * dist;
      const rot = (-(a * 180) / Math.PI) - 90;
      b.addBox(cx, 0.44, cz, 0.46, 0.05, 0.44, { materialRole: 'frame', layer: 'body', rotYDeg: rot });
      b.addBox(cx + Math.cos(a) * 0.2, 0.68, cz + Math.sin(a) * 0.2, 0.44, 0.46, 0.045, { materialRole: 'primary', layer: 'body', rotYDeg: rot });
      b.addCylinder(cx, 0.22, cz, 0.03, 0.18, 0.42, 6, 'y', 'frame', 'body');
    }
    return;
  }

  // Terracotta planters, patio beverage cooler chest & twin bamboo tiki torches
  b.addBox(-w * 0.3, 0.22, 0, 0.62, 0.44, 0.44, { materialRole: 'wood', layer: 'body' });
  b.addBox(-w * 0.3, 0.44, 0, 0.54, 0.04, 0.36, { materialRole: 'concrete', layer: 'detail' });
  bkpAddLowPolySphere(b, -w * 0.38, 0.56, 0, 0.16, 'foliage', 'detail');
  bkpAddLowPolySphere(b, -w * 0.22, 0.58, 0.02, 0.18, 'foliage', 'detail');
  // Beverage cooler chest on stand
  const kx = w * 0.08;
  b.addSupportLegs(kx, 0, 0.36, 0.5, 0.34, 0.04, 'frame', 0);
  b.addBox(kx, 0.54, 0, 0.56, 0.34, 0.38, { materialRole: 'accent', layer: 'body' });
  b.addBox(kx, 0.72, 0, 0.58, 0.06, 0.4, { materialRole: 'whiteTrim', layer: 'detail' });
  // Twin bamboo tiki torches
  for (const tz of [-0.28, 0.28]) {
    const tx = w * 0.42;
    b.addCylinder(tx, 0.76, tz, 0.024, 0.032, 1.52, 8, 'y', 'wood', 'body');
    b.addCylinder(tx, 1.56, tz, 0.075, 0.045, 0.16, 8, 'y', 'brick', 'detail');
    if (lit) {
      b.addCone(tx, 1.7, tz, 0.048, 0.14, 7, 'lampGlow', 'detail');
    }
  }
}

export function registerBathroomKitchenPatioFamilies() {
  registerObjectFamily({
    id: 'bathroom_fixtures_accessories',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Bathroom & Laundry Fixtures',
    label: 'Bathroom Showers, Tubs & Vanity Props',
    description: 'Walk-in translucent glass shower stalls, clawfoot bathtubs, pedestal sinks, double-sink lighted vanities, wall medicine cabinets, towel warmers, and bath clutter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'surface_placed'],
    sizeClass: 'medium',
    functionalRole: 'utility',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'bathroom', 'locker_room'],
    tags: ['bathroom', 'shower', 'glass', 'bathtub', 'vanity', 'mirror', 'towel', 'scale', 'residential'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'glass', 'stone', 'fabric', 'chrome', 'neonGlow'],
    schema: [
      { group: 'Bathroom Fixture', tab: 'structure' },
      {
        key: 'bathroomStyle',
        label: 'Fixture Type',
        type: 'select',
        tab: 'structure',
        default: 'walk_in_glass_shower',
        options: [
          ['walk_in_glass_shower', 'Walk-In Glass Shower Stall'],
          ['clawfoot_tub', 'Freestanding Clawfoot Bathtub'],
          ['pedestal_sink_mirror', 'Pedestal Sink & Wall Mirror'],
          ['double_vanity_sconce', 'Master Double Vanity & Sconces'],
          ['medicine_cabinet_towel_bar', 'Wall Medicine Cabinet & Towel Bar'],
          ['heated_towel_warmer', 'Heated Towel Warmer Rack'],
          ['bath_hamper_scale_caddy', 'Hamper, Scale & Bath Caddy'],
          ['bath_toiletries_tray', 'Countertop Toiletries & Soap Tray']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.35, max: 2.2, step: 0.05, unit: 'm', default: 1.15 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.22, max: 1.35, step: 0.05, unit: 'm', default: 0.98 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.35, max: 2.45, step: 0.05, unit: 'm', default: 2.15 },
      { key: 'lampLit', label: 'Sconce / Display Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'walk_in_glass_shower_stall', label: 'Walk-In Glass Shower Stall', locationContext: 'interior', paletteFamily: 'clean_medical_office', primaryColor: '#cfd8df', secondaryColor: '#e8eef2', accentColor: '#4c93b5', params: { bathroomStyle: 'walk_in_glass_shower', width: 1.18, depth: 1.02, height: 2.15, lampLit: true } },
      { id: 'freestanding_clawfoot_bathtub', label: 'Freestanding Clawfoot Bathtub', locationContext: 'interior', paletteFamily: 'clean_medical_office', primaryColor: '#f2f4f6', secondaryColor: '#dce3e8', accentColor: '#d99a4a', params: { bathroomStyle: 'clawfoot_tub', width: 1.58, depth: 0.78, height: 0.95 } },
      { id: 'pedestal_porcelain_sink_mirror', label: 'Pedestal Sink & Wall Mirror', locationContext: 'interior', paletteFamily: 'clean_medical_office', primaryColor: '#eef2f5', secondaryColor: '#f8fafc', params: { bathroomStyle: 'pedestal_sink_mirror', width: 0.64, depth: 0.52, height: 1.9, lampLit: true } },
      { id: 'master_double_vanity_sconce', label: 'Master Double-Sink Vanity', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#5c6b78', woodColor: '#7b5233', params: { bathroomStyle: 'double_vanity_sconce', width: 1.68, depth: 0.56, height: 2.1, lampLit: true } },
      { id: 'wall_medicine_cabinet_mirror', label: 'Wall Medicine Cabinet & Towel', attachmentProfile: 'wall_mounted', locationContext: 'interior', paletteFamily: 'clean_medical_office', primaryColor: '#e2e7ec', accentColor: '#46829e', params: { bathroomStyle: 'medicine_cabinet_towel_bar', width: 0.68, depth: 0.22, height: 0.85 } },
      { id: 'heated_chrome_towel_warmer', label: 'Heated Towel Warmer Rack', locationContext: 'interior', paletteFamily: 'modern_corporate', accentColor: '#3f7c99', params: { bathroomStyle: 'heated_towel_warmer', width: 0.64, depth: 0.34, height: 1.28 } },
      { id: 'bath_hamper_digital_scale', label: 'Bath Hamper, Scale & Stand', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#a67a51', accentColor: '#6d8b9e', params: { bathroomStyle: 'bath_hamper_scale_caddy', width: 1.05, depth: 0.52, height: 0.72 } },
      { id: 'vanity_toiletries_soap_tray', label: 'Countertop Toiletries Tray', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'clean_medical_office', accentColor: '#5aa6b8', params: { bathroomStyle: 'bath_toiletries_tray', width: 0.42, depth: 0.24, height: 0.22 } }
    ],
    buildGeometry: bkpBuildBathroomFixtures
  });

  registerObjectFamily({
    id: 'kitchen_prep_appliances',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Kitchen Appliances & Counters',
    label: 'Kitchen Dishwashers, Hoods & Prep Bars',
    description: 'Built-in dishwashers, chimney range hoods, glass-upper cabinet runs, translucent wine coolers, espresso/mixer stations, breakfast peninsulas, and prep carts.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'surface_placed'],
    sizeClass: 'medium',
    functionalRole: 'utility',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'kitchen', 'breakroom'],
    tags: ['kitchen', 'dishwasher', 'range_hood', 'cabinets', 'wine_cooler', 'espresso', 'mixer', 'peninsula'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'glass', 'stone', 'upholstery', 'chrome', 'neonGlow'],
    schema: [
      { group: 'Kitchen Appliance', tab: 'structure' },
      {
        key: 'kitchenStyle',
        label: 'Kitchen Piece',
        type: 'select',
        tab: 'structure',
        default: 'builtin_dishwasher',
        options: [
          ['builtin_dishwasher', 'Built-In Stainless Dishwasher'],
          ['chimney_range_hood', 'Pyramid Chimney Range Hood'],
          ['cabinet_run_glass_uppers', 'Base & Glass-Upper Cabinet Run'],
          ['glass_wine_beverage_cooler', 'Glass Wine & Beverage Cooler'],
          ['espresso_mixer_counter_bar', 'Espresso & Stand Mixer Bar'],
          ['breakfast_peninsula_stools', 'Breakfast Peninsula & Barstools'],
          ['butcher_block_prep_cart', 'Rolling Butcher-Block Prep Cart'],
          ['knife_block_cookware_set', 'Knife Block, Board & Skillet']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.45, max: 2.6, step: 0.05, unit: 'm', default: 0.72 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.28, max: 1.25, step: 0.05, unit: 'm', default: 0.66 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.25, max: 2.35, step: 0.05, unit: 'm', default: 0.9 },
      { key: 'lampLit', label: 'Cooklight / Interior Led Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'stainless_builtin_dishwasher', label: 'Built-In Stainless Dishwasher', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#56606a', secondaryColor: '#b7c1ca', params: { kitchenStyle: 'builtin_dishwasher', width: 0.64, depth: 0.64, height: 0.88 } },
      { id: 'stainless_chimney_range_hood', label: 'Pyramid Chimney Range Hood', attachmentProfile: 'wall_mounted', locationContext: 'interior', paletteFamily: 'modern_corporate', secondaryColor: '#aeb9c4', params: { kitchenStyle: 'chimney_range_hood', width: 0.88, depth: 0.52, height: 1.05, lampLit: true } },
      { id: 'kitchen_cabinet_glass_uppers', label: 'Cabinet Run With Glass Uppers', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#eceff2', woodColor: '#8d5b34', accentColor: '#4e89a8', params: { kitchenStyle: 'cabinet_run_glass_uppers', width: 2.1, depth: 0.64, height: 2.22, lampLit: true } },
      { id: 'dual_zone_glass_wine_cooler', label: 'Dual-Zone Glass Wine Cooler', locationContext: 'interior', paletteFamily: 'modern_corporate', frameColor: '#1f252c', woodColor: '#b88b5a', accentColor: '#912d3c', emissiveColor: '#36c9ff', params: { kitchenStyle: 'glass_wine_beverage_cooler', width: 0.68, depth: 0.62, height: 1.28, lampLit: true } },
      { id: 'espresso_stand_mixer_bar', label: 'Espresso & Stand Mixer Set', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#384654', accentColor: '#cc453d', params: { kitchenStyle: 'espresso_mixer_counter_bar', width: 0.82, depth: 0.36, height: 0.42 } },
      { id: 'granite_breakfast_peninsula', label: 'Breakfast Peninsula & Barstools', locationContext: 'interior', paletteFamily: 'modern_corporate', primaryColor: '#3c4b59', secondaryColor: '#7a5238', params: { kitchenStyle: 'breakfast_peninsula_stools', width: 1.85, depth: 1.05, height: 0.98 } },
      { id: 'rolling_butcher_block_cart', label: 'Rolling Butcher-Block Prep Cart', locationContext: 'interior', paletteFamily: 'wood_office_executive', primaryColor: '#4c7066', woodColor: '#b8824c', accentColor: '#c96f40', params: { kitchenStyle: 'butcher_block_prep_cart', width: 0.92, depth: 0.58, height: 0.9 } },
      { id: 'knife_block_skillet_prep', label: 'Knife Block & Skillet Prep Set', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'wood_office_executive', woodColor: '#9c6c42', params: { kitchenStyle: 'knife_block_cookware_set', width: 0.72, depth: 0.34, height: 0.3 } }
    ],
    buildGeometry: bkpBuildKitchenPrep
  });

  registerObjectFamily({
    id: 'patio_outdoor_living',
    categoryId: '29_residential_household',
    categories: ['29_residential_household', '13_parks', '09_commercial'],
    subcategory: 'Patio & Outdoor Living',
    subcategories: ['Patio & Outdoor Living', 'Benches & Tables', 'Planters & Tree Grates', 'Cafe Seating'],
    label: 'Patio Grills, Loungers & Fire Pits',
    description: 'Backyard propane and charcoal barbecue grills, slatted Adirondack chairs, A-frame porch swings, wicker chaise loungers, stacked-stone fire pits, patio umbrellas, and tiki planters.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'large',
    functionalRole: 'furniture',
    locationContext: 'exterior',
    environmentTags: ['patio', 'residential_interior', 'park', 'courtyard', 'outdoor_plaza'],
    tags: ['patio', 'grill', 'barbecue', 'adirondack', 'porch_swing', 'lounger', 'fire_pit', 'umbrella', 'tiki'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame', 'wood', 'stone', 'concrete', 'upholstery', 'foliage', 'chrome'],
    schema: [
      { group: 'Patio Feature', tab: 'structure' },
      {
        key: 'patioStyle',
        label: 'Patio Object',
        type: 'select',
        tab: 'structure',
        default: 'propane_bbq_grill',
        options: [
          ['propane_bbq_grill', 'Propane Barbecue Grill Station'],
          ['charcoal_kettle_grill', 'Charcoal Kettle Grill & Table'],
          ['adirondack_porch_chair', 'Slatted Adirondack Patio Chair'],
          ['a_frame_porch_swing', 'Suspended A-Frame Porch Swing'],
          ['wicker_chaise_lounger', 'Poolside Wicker Chaise Lounger'],
          ['stone_fire_pit', 'Stacked-Stone Outdoor Fire Pit'],
          ['patio_dining_umbrella', 'Patio Table, Umbrella & Chairs'],
          ['terracotta_planter_tiki', 'Planters, Cooler & Tiki Torches']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.65, max: 2.8, step: 0.05, unit: 'm', default: 1.48 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.55, max: 2.2, step: 0.05, unit: 'm', default: 0.72 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.45, max: 2.55, step: 0.05, unit: 'm', default: 1.24 },
      { key: 'lampLit', label: 'Fire / Torch Glow Lit', type: 'toggle', tab: 'details', default: true }
    ],
    presets: [
      { id: 'propane_barbecue_grill_station', label: 'Stainless Propane Barbecue Grill', locationContext: 'exterior', paletteFamily: 'modern_corporate', secondaryColor: '#b5bfc9', frameColor: '#252a30', params: { patioStyle: 'propane_bbq_grill', width: 1.48, depth: 0.68, height: 1.24, lampLit: true } },
      { id: 'charcoal_kettle_grill_caddy', label: 'Charcoal Kettle Grill & Table', locationContext: 'exterior', paletteFamily: 'retro_arcade_90s_bright', primaryColor: '#b8322c', woodColor: '#9c6c42', accentColor: '#e09a38', params: { patioStyle: 'charcoal_kettle_grill', width: 1.38, depth: 0.74, height: 1.06 } },
      { id: 'slatted_adirondack_chair', label: 'Slatted Adirondack Patio Chair', locationContext: 'exterior', paletteFamily: 'park_heritage', primaryColor: '#2f6c78', woodColor: '#96633c', secondaryColor: '#d9d0be', params: { patioStyle: 'adirondack_porch_chair', width: 0.84, depth: 0.92, height: 0.96 } },
      { id: 'suspended_a_frame_porch_swing', label: 'Suspended A-Frame Porch Swing', locationContext: 'exterior', paletteFamily: 'wood_office_executive', woodColor: '#8d5b34', frameColor: '#2e353d', secondaryColor: '#d8cbb5', accentColor: '#c2543e', params: { patioStyle: 'a_frame_porch_swing', width: 2.15, depth: 1.28, height: 1.88 } },
      { id: 'poolside_wicker_chaise_lounger', label: 'Poolside Wicker Chaise Lounger', locationContext: 'exterior', paletteFamily: 'park_heritage', woodColor: '#7a583d', secondaryColor: '#f0ece1', accentColor: '#2e88a6', params: { patioStyle: 'wicker_chaise_lounger', width: 0.78, depth: 1.98, height: 0.82 } },
      { id: 'stacked_stone_fire_pit', label: 'Stacked-Stone Outdoor Fire Pit', locationContext: 'exterior', paletteFamily: 'civic_stone', concreteColor: '#8f887d', woodColor: '#5c3c24', params: { patioStyle: 'stone_fire_pit', width: 1.32, depth: 1.32, height: 0.5, lampLit: true } },
      { id: 'patio_umbrella_dining_set', label: 'Patio Table, Umbrella & 4 Chairs', locationContext: 'exterior', paletteFamily: 'park_heritage', primaryColor: '#3a5448', woodColor: '#9c683d', accentColor: '#d4683b', params: { patioStyle: 'patio_dining_umbrella', width: 2.35, depth: 2.35, height: 2.42 } },
      { id: 'patio_planters_cooler_tiki', label: 'Planters, Cooler & Tiki Torches', locationContext: 'exterior', paletteFamily: 'park_heritage', woodColor: '#8e5e38', accentColor: '#2a859e', params: { patioStyle: 'terracotta_planter_tiki', width: 1.72, depth: 0.86, height: 1.75, lampLit: true } }
    ],
    buildGeometry: bkpBuildPatioOutdoor
  });
}
