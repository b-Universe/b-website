import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateGroundDecal } from '../geometry/primitives.js';

function resAddPipePolyline(b, pts, radius, sides, materialRole, layer) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    b.addPipeSegment(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], radius, sides, materialRole, layer);
  }
}

function resBuildChairSeating(group, cfg, b, mats, meta) {
  const style = cfg.chairStyle || 'dining_wood_slat';
  const w = clamp(Number(cfg.width) || 0.52, 0.36, 1.05);
  const d = clamp(Number(cfg.depth) || 0.52, 0.34, 1.05);
  const seatH = clamp(Number(cfg.seatHeight) || 0.46, 0.34, 0.8);
  const backH = clamp(Number(cfg.backHeight) || 0.46, 0.0, 0.72);
  const seatThick = cfg.cushionSeat !== false ? 0.055 : 0.032;

  if (style === 'beanbag') {
    b.addCylinder(0, 0.16, 0, w * 0.48, w * 0.52, 0.32, 12, 'y', 'upholstery', 'body');
    b.addCylinder(0, 0.38, -0.06, w * 0.34, w * 0.45, 0.22, 12, 'y', 'upholstery', 'body');
    b.addCylinder(0, 0.46, -0.16, w * 0.24, w * 0.34, 0.2, 12, 'y', 'accent', 'detail');
    meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, 0.3, 0.04] };
    return;
  }

  if (style === 'barstool_swivel' || style === 'saddle_stool' || style === 'vanity_stool') {
    const sh = style === 'barstool_swivel' ? clamp(seatH, 0.64, 0.8) : style === 'saddle_stool' ? clamp(seatH, 0.56, 0.74) : clamp(seatH, 0.42, 0.52);
    if (style === 'barstool_swivel') {
      b.addCylinder(0, 0.015, 0, 0.2, 0.22, 0.03, 12, 'y', 'chrome', 'body');
      b.addCylinder(0, sh * 0.5, 0, 0.032, 0.036, sh - 0.04, 10, 'y', 'chrome', 'body');
      b.addCylinder(0, sh * 0.32, 0, 0.19, 0.19, 0.016, 14, 'y', 'chrome', 'detail');
      b.addCylinder(0, sh, 0, w * 0.44, w * 0.46, 0.085, 14, 'y', 'upholstery', 'body');
      if (backH > 0.06) {
        b.addBox(0, sh + backH * 0.35, -w * 0.38, w * 0.65, Math.min(0.24, backH * 0.55), 0.045, { materialRole: 'upholstery', layer: 'body', rotXDeg: -8 });
        b.addBox(0, sh + backH * 0.2, -w * 0.42, 0.04, backH * 0.4, 0.025, { materialRole: 'chrome', layer: 'detail' });
      }
    } else if (style === 'saddle_stool') {
      b.addSupportLegs(0, 0, sh - 0.04, w * 0.86, d * 0.78, 0.036, 'wood');
      b.addBox(0, sh * 0.34, -d * 0.34, w * 0.76, 0.028, 0.028, { materialRole: 'wood', layer: 'detail' });
      b.addBox(0, sh * 0.34, d * 0.34, w * 0.76, 0.028, 0.028, { materialRole: 'wood', layer: 'detail' });
      b.addBox(-w * 0.38, sh * 0.42, 0, 0.028, 0.028, d * 0.68, { materialRole: 'wood', layer: 'detail' });
      b.addBox(w * 0.38, sh * 0.42, 0, 0.028, 0.028, d * 0.68, { materialRole: 'wood', layer: 'detail' });
      b.addChamferBox(0, sh, 0, w, 0.052, d * 0.78, 0.014, { materialRole: 'wood', layer: 'body' });
    } else {
      b.addSupportLegs(0, 0, sh - 0.05, w * 0.88, d * 0.84, 0.034, 'frame');
      b.addBox(0, sh - 0.04, 0, w * 0.9, 0.04, d * 0.86, { materialRole: 'frame', layer: 'body' });
      b.addChamferBox(0, sh + 0.015, 0, w * 0.94, 0.085, d * 0.9, 0.02, { materialRole: 'upholstery', layer: 'body' });
    }
    meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, sh + 0.04, 0] };
    return;
  }

  if (style === 'wingback' || style === 'recliner' || style === 'midcentury_lounge') {
    const rw = clamp(w, 0.74, 1.02);
    const rd = clamp(d, 0.76, 1.0);
    const armRole = style === 'midcentury_lounge' ? 'wood' : 'upholstery';
    if (style === 'midcentury_lounge') {
      b.addSupportLegs(0, 0, seatH * 0.56, rw * 0.82, rd * 0.82, 0.036, 'wood');
      b.addBox(0, seatH * 0.62, 0, rw * 0.86, 0.05, rd * 0.86, { materialRole: 'wood', layer: 'body' });
    } else {
      b.addSupportLegs(0, 0, 0.1, rw * 0.84, rd * 0.84, 0.044, 'wood');
    }
    const baseY = style === 'midcentury_lounge' ? seatH * 0.66 : 0.1;
    b.addChamferBox(0, (seatH + baseY) * 0.5, 0.02, rw * 0.92, seatH - baseY, rd * 0.9, 0.025, { materialRole: 'upholstery', layer: 'body' });
    b.addChamferBox(0, seatH + 0.05, 0.04, rw * 0.7, 0.11, rd * 0.76, 0.022, { materialRole: 'fabric', layer: 'detail' });
    for (const ax of [-rw * 0.42, rw * 0.42]) {
      b.addChamferBox(ax, seatH + 0.14, 0.02, 0.14, 0.28, rd * 0.86, 0.024, { materialRole: armRole, layer: 'body' });
    }
    const topBackH = Math.max(0.48, backH);
    b.addChamferBox(0, seatH + topBackH * 0.48, -rd * 0.36, rw * 0.76, topBackH, 0.14, 0.025, {
      materialRole: 'upholstery',
      layer: 'body',
      rotXDeg: -14
    });
    if (style === 'wingback') {
      for (const wx of [-rw * 0.41, rw * 0.41]) {
        b.addChamferBox(wx, seatH + topBackH * 0.68, -rd * 0.24, 0.08, topBackH * 0.56, 0.22, 0.015, { materialRole: 'upholstery', layer: 'detail' });
      }
    }
    if (style === 'recliner') {
      b.addBox(-rw * 0.49 - 0.02, seatH + 0.06, 0.08, 0.025, 0.08, 0.03, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(0, seatH * 0.48, rd * 0.46, rw * 0.66, seatH * 0.55, 0.06, { materialRole: 'upholstery', layer: 'detail', rotXDeg: 14 });
    }
    meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, seatH + 0.08, 0.04] };
    return;
  }

  if (style === 'adirondack') {
    const aw = clamp(w, 0.66, 0.88);
    const ad = clamp(d, 0.76, 0.96);
    for (const ax of [-aw * 0.38, aw * 0.38]) {
      b.addBox(ax, 0.2, 0, 0.04, 0.09, ad * 0.92, { materialRole: 'wood', layer: 'body', rotXDeg: 18 });
      b.addBox(ax, 0.38, 0.28, 0.045, 0.38, 0.06, { materialRole: 'wood', layer: 'body' });
      b.addBox(ax, 0.56, 0.02, 0.11, 0.032, ad * 0.78, { materialRole: 'wood', layer: 'body' });
    }
    for (let s = 0; s < 5; s++) {
      const sz = -ad * 0.22 + s * 0.105;
      b.addBox(0, 0.32 - s * 0.02, sz, aw * 0.74, 0.024, 0.075, { materialRole: 'wood', layer: 'body', rotXDeg: -16 });
    }
    for (let k = -2; k <= 2; k++) {
      b.addBox(k * (aw * 0.13), 0.72, -ad * 0.28, 0.072, 0.76 - Math.abs(k) * 0.05, 0.024, {
        materialRole: 'wood',
        layer: 'body',
        rotXDeg: -26
      });
    }
    meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, 0.36, 0.06] };
    return;
  }

  if (style === 'entry_bench') {
    const bw = clamp(w, 0.95, 1.45);
    const bd = clamp(d, 0.36, 0.48);
    b.addSupportLegs(0, 0, seatH - 0.04, bw * 0.92, bd * 0.86, 0.046, 'wood');
    b.addBox(0, 0.14, 0, bw * 0.9, 0.024, bd * 0.82, { materialRole: 'wood', layer: 'detail' });
    for (const bx of [-bw * 0.28, 0, bw * 0.28]) {
      b.addBox(bx, 0.24, 0, bw * 0.24, 0.18, bd * 0.74, { materialRole: 'accent', layer: 'detail' });
    }
    b.addChamferBox(0, seatH, 0, bw, 0.06, bd, 0.012, { materialRole: 'upholstery', layer: 'body' });
    meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, seatH + 0.03, 0] };
    return;
  }

  // Standard dining chair variants: dining_wood_slat, upholstered_dining, windsor_spindle, rocking_chair
  const frameRole = style === 'upholstered_dining' ? 'frame' : 'wood';
  const legSpreadW = w * 0.88;
  const legSpreadD = d * 0.86;
  const legLift = style === 'rocking_chair' ? 0.06 : 0;

  if (style === 'rocking_chair') {
    for (const rx of [-legSpreadW * 0.46, legSpreadW * 0.46]) {
      resAddPipePolyline(b, [[rx, 0.06, -d * 0.48], [rx, 0.025, 0], [rx, 0.06, d * 0.48]], 0.022, 8, 'wood', 'body');
    }
  }
  b.addSupportLegs(0, legLift, seatH - 0.02 - legLift, legSpreadW, legSpreadD, 0.036, frameRole);
  b.addBox(0, seatH - 0.025, 0, w * 0.9, 0.038, d * 0.88, { materialRole: frameRole, layer: 'body' });
  b.addChamferBox(0, seatH + seatThick * 0.45, 0.01, w * 0.96, seatThick, d * 0.94, 0.012, {
    materialRole: cfg.cushionSeat !== false ? 'upholstery' : frameRole,
    layer: 'body'
  });

  if (backH > 0.08) {
    const backTiltRad = degToRad(-7);
    for (const bx of [-legSpreadW * 0.44, legSpreadW * 0.44]) {
      b.addBox(bx, seatH + backH * 0.5, -d * 0.42, 0.038, backH, 0.038, { materialRole: frameRole, layer: 'body', rotX: backTiltRad });
    }
    b.addBox(0, seatH + backH - 0.045, -d * 0.45, w * 0.92, 0.08, 0.032, { materialRole: frameRole, layer: 'body', rotX: backTiltRad });
    if (style === 'upholstered_dining') {
      b.addChamferBox(0, seatH + backH * 0.56, -d * 0.42, w * 0.86, backH * 0.72, 0.062, 0.015, {
        materialRole: 'upholstery',
        layer: 'body',
        rotX: backTiltRad
      });
    } else if (style === 'windsor_spindle') {
      for (let s = -2; s <= 2; s++) {
        b.addCylinder(s * (w * 0.14), seatH + backH * 0.48, -d * 0.42, 0.011, 0.011, backH * 0.88, 6, 'y', 'wood', 'detail');
      }
    } else {
      for (let s = 0; s < 3; s++) {
        b.addBox(0, seatH + 0.14 + s * (backH * 0.24), -d * 0.42, w * 0.78, 0.045, 0.022, { materialRole: 'wood', layer: 'detail', rotX: backTiltRad });
      }
    }
    if (cfg.includeArmrests || style === 'rocking_chair') {
      for (const ax of [-w * 0.46, w * 0.46]) {
        b.addBox(ax, seatH + 0.21, -0.02, 0.042, 0.03, d * 0.76, { materialRole: frameRole, layer: 'detail' });
        b.addBox(ax, seatH + 0.1, d * 0.3, 0.032, 0.2, 0.032, { materialRole: frameRole, layer: 'detail' });
      }
    }
  }
  meta.interaction = { interactable: true, actionType: 'sit', seatPosition: [0, seatH + seatThick, 0.02] };
}

function resBuildSofaLounger(group, cfg, b, mats, meta) {
  const style = cfg.sofaStyle || 'three_seat_sofa';
  const w = clamp(Number(cfg.width) || 2.05, 1.35, 3.1);
  const d = clamp(Number(cfg.depth) || 0.92, 0.78, 1.75);
  const seatH = 0.44;
  const backH = clamp(Number(cfg.backHeight) || 0.84, 0.68, 0.98);
  const cushions = Math.round(clamp(Number(cfg.cushionCount) || (style === 'loveseat' ? 2 : 3), 2, 4));
  const sofaMat = style === 'futon_frame' ? 'wood' : 'primary';
  const cushionMat = style === 'futon_frame' ? 'accent' : 'upholstery';

  b.addSupportLegs(0, 0, 0.1, w * 0.92, d * 0.84, 0.048, 'wood');
  b.addChamferBox(0, 0.24, 0, w, 0.24, d * 0.94, 0.015, { materialRole: sofaMat, layer: 'body' });

  const armW = style === 'futon_frame' ? 0.08 : 0.18;
  const innerW = w - armW * 2;
  for (const ax of [-w * 0.5 + armW * 0.5, w * 0.5 - armW * 0.5]) {
    b.addChamferBox(ax, 0.46, 0.02, armW, 0.36, d * 0.92, 0.02, { materialRole: sofaMat, layer: 'body' });
  }

  // Backrest frame + upper back cushions
  b.addChamferBox(0, backH * 0.58, -d * 0.37, w * 0.96, backH * 0.68, 0.18, 0.022, { materialRole: sofaMat, layer: 'body' });
  const cW = innerW / cushions;
  for (let i = 0; i < cushions; i++) {
    const cx = -innerW * 0.5 + cW * (i + 0.5);
    b.addChamferBox(cx, seatH - 0.02, 0.05, cW - 0.016, 0.13, d * 0.74, 0.02, { materialRole: cushionMat, layer: 'body' });
    b.addChamferBox(cx, seatH + 0.22, -d * 0.24, cW - 0.018, 0.36, 0.14, 0.02, {
      materialRole: cushionMat,
      layer: 'detail',
      rotXDeg: -10
    });
  }

  if (style === 'l_sectional') {
    const extD = Math.max(0.75, d * 0.86);
    b.addSupportLegs(w * 0.5 - cW * 0.5, 0, 0.1, cW, extD, 0.044, 'wood');
    b.addChamferBox(w * 0.5 - cW * 0.5 - armW * 0.4, 0.24, d * 0.5 + extD * 0.36, cW, 0.24, extD * 0.84, 0.015, { materialRole: sofaMat, layer: 'body' });
    b.addChamferBox(w * 0.5 - cW * 0.5 - armW * 0.4, seatH - 0.02, d * 0.5 + extD * 0.36, cW - 0.02, 0.13, extD * 0.8, 0.02, { materialRole: cushionMat, layer: 'detail' });
  }

  if (cfg.throwPillows !== false) {
    b.addChamferBox(-innerW * 0.42, seatH + 0.16, -d * 0.1, 0.34, 0.28, 0.12, 0.025, { materialRole: 'accent', layer: 'detail', rotYDeg: 22, rotZDeg: 8 });
    b.addChamferBox(innerW * 0.42, seatH + 0.16, -d * 0.1, 0.34, 0.28, 0.12, 0.025, { materialRole: 'accent', layer: 'detail', rotYDeg: -22, rotZDeg: -8 });
  }
  meta.interaction = { interactable: true, actionType: 'sit_sofa', seatPosition: [0, seatH + 0.05, 0.08] };
}

function resBuildDiningSideTable(group, cfg, b, mats, meta) {
  const style = cfg.tableStyle || 'rect_dining';
  const w = clamp(Number(cfg.width) || 1.65, 0.42, 2.4);
  const d = clamp(Number(cfg.depth) || 0.95, 0.42, 1.35);
  const h = clamp(Number(cfg.height) || 0.76, 0.36, 0.88);
  const topRole = style === 'glass_coffee' ? 'glass' : style === 'chrome_dinette' ? 'whiteTrim' : 'wood';
  const baseRole = style === 'chrome_dinette' || style === 'glass_coffee' ? 'chrome' : style === 'console_hall' ? 'frame' : 'wood';

  if (style === 'round_pedestal' || style === 'round_end' || style === 'bistro_drop_leaf') {
    const r = Math.min(w, d) * 0.5;
    b.addCylinder(0, 0.025, 0, r * 0.48, r * 0.56, 0.05, 16, 'y', baseRole, 'body');
    b.addCylinder(0, h * 0.5, 0, r * 0.12, r * 0.16, h - 0.06, 12, 'y', baseRole, 'body');
    b.addCylinder(0, h - 0.022, 0, r, r, 0.044, 24, 'y', topRole, 'body');
    b.addCylinder(0, h - 0.055, 0, r * 0.72, r * 0.72, 0.03, 18, 'y', baseRole, 'detail');
  } else if (style === 'farmhouse_trestle') {
    b.addBox(-w * 0.36, 0.05, 0, 0.12, 0.1, d * 0.78, { materialRole: 'wood', layer: 'body' });
    b.addBox(w * 0.36, 0.05, 0, 0.12, 0.1, d * 0.78, { materialRole: 'wood', layer: 'body' });
    b.addBox(-w * 0.36, h * 0.5, 0, 0.11, h - 0.08, 0.16, { materialRole: 'wood', layer: 'body' });
    b.addBox(w * 0.36, h * 0.5, 0, 0.11, h - 0.08, 0.16, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.24, 0, w * 0.74, 0.06, 0.08, { materialRole: 'wood', layer: 'detail' });
    b.addChamferBox(0, h - 0.025, 0, w, 0.05, d, 0.01, { materialRole: 'wood', layer: 'body' });
  } else if (style === 'nightstand') {
    b.addSupportLegs(0, 0, 0.1, w * 0.88, d * 0.86, 0.036, 'wood');
    b.addBox(0, (h + 0.1) * 0.5, 0, w * 0.94, h - 0.12, d * 0.92, { materialRole: 'primary', layer: 'body' });
    const drawers = 2;
    const dh = (h - 0.18) / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = 0.14 + (i + 0.5) * dh;
      b.addBox(0, dy, d * 0.465, w * 0.82, dh - 0.025, 0.02, { materialRole: 'wood', layer: 'detail' });
      b.addCylinder(0, dy, d * 0.485, 0.014, 0.014, 0.024, 8, 'z', 'brass', 'detail');
    }
    b.addChamferBox(0, h - 0.015, 0, w + 0.03, 0.032, d + 0.03, 0.008, { materialRole: 'wood', layer: 'body' });
  } else if (style === 'tv_snack_tray') {
    b.addBox(-w * 0.42, h * 0.5, 0, 0.024, h, d * 0.08, { materialRole: 'wood', layer: 'body', rotXDeg: 22 });
    b.addBox(-w * 0.42, h * 0.5, 0, 0.024, h, d * 0.08, { materialRole: 'wood', layer: 'body', rotXDeg: -22 });
    b.addBox(w * 0.42, h * 0.5, 0, 0.024, h, d * 0.08, { materialRole: 'wood', layer: 'body', rotXDeg: 22 });
    b.addBox(w * 0.42, h * 0.5, 0, 0.024, h, d * 0.08, { materialRole: 'wood', layer: 'body', rotXDeg: -22 });
    b.addChamferBox(0, h - 0.015, 0, w, 0.028, d, 0.008, { materialRole: 'wood', layer: 'body' });
  } else {
    // rect_dining, chrome_dinette, wood_coffee, glass_coffee, square_end, console_hall
    b.addSupportLegs(0, 0, h - 0.04, w * 0.9, d * 0.88, 0.044, baseRole);
    b.addBox(0, h - 0.065, 0, w * 0.88, 0.055, d * 0.84, { materialRole: baseRole, layer: 'body' });
    b.addChamferBox(0, h - 0.02, 0, w, 0.042, d, 0.01, { materialRole: topRole, layer: 'body' });
    if (style === 'chrome_dinette') {
      b.addBox(0, h - 0.02, 0, w + 0.016, 0.024, d + 0.016, { materialRole: 'chrome', layer: 'detail' });
    }
    if (cfg.lowerShelf) {
      b.addBox(0, Math.min(0.2, h * 0.36), 0, w * 0.84, 0.024, d * 0.78, { materialRole: 'wood', layer: 'detail' });
    }
  }
  meta.surfaceRelationship = { canHostSmallProps: true, topSurfaceY: h };
}

function resBuildBedroomStorage(group, cfg, b, mats, meta) {
  const type = cfg.unitType || 'queen_bed';
  const w = clamp(Number(cfg.width) || 1.68, 0.65, 2.2);
  const d = clamp(Number(cfg.depth) || 2.1, 0.4, 2.25);
  const h = clamp(Number(cfg.height) || 1.15, 0.45, 2.15);

  if (type === 'queen_bed' || type === 'twin_bed') {
    const bedW = type === 'twin_bed' ? Math.min(w, 1.12) : w;
    b.addSupportLegs(0, 0, 0.14, bedW * 0.94, d * 0.94, 0.05, 'wood');
    b.addBox(0, 0.24, 0, bedW, 0.16, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.64, -d * 0.48, bedW + 0.04, h - 0.12, 0.07, { materialRole: 'wood', layer: 'body' });
    b.addChamferBox(0, 0.42, 0.02, bedW - 0.08, 0.22, d - 0.1, 0.025, { materialRole: 'whiteTrim', layer: 'body' });
    b.addChamferBox(0, 0.44, 0.24, bedW - 0.05, 0.23, d * 0.65, 0.025, { materialRole: 'upholstery', layer: 'detail' });
    const pillows = type === 'twin_bed' ? 1 : 2;
    for (let i = 0; i < pillows; i++) {
      const px = pillows === 1 ? 0 : (i === 0 ? -bedW * 0.22 : bedW * 0.22);
      b.addChamferBox(px, 0.56, -d * 0.3, bedW * (pillows === 1 ? 0.56 : 0.36), 0.1, 0.34, 0.024, { materialRole: 'accent', layer: 'detail' });
    }
    meta.interaction = { interactable: true, actionType: 'sleep', seatPosition: [0, 0.54, 0] };
    return;
  }

  if (type === 'bunk_bed') {
    b.addSupportLegs(0, 0, h, w * 0.95, d * 0.95, 0.06, 'wood');
    for (const by of [0.36, 1.24]) {
      b.addBox(0, by, 0, w, 0.12, d, { materialRole: 'wood', layer: 'body' });
      b.addChamferBox(0, by + 0.13, 0, w - 0.1, 0.16, d - 0.12, 0.02, { materialRole: 'upholstery', layer: 'body' });
    }
    b.addBox(w * 0.52, h * 0.5, d * 0.26, 0.06, h - 0.1, 0.05, { materialRole: 'frame', layer: 'detail' });
    for (let r = 0; r < 5; r++) {
      b.addBox(w * 0.52, 0.28 + r * 0.32, d * 0.26, 0.04, 0.03, 0.32, { materialRole: 'wood', layer: 'detail' });
    }
    return;
  }

  if (type === 'tv_media_console') {
    b.addSupportLegs(0, 0, 0.12, w * 0.9, d * 0.85, 0.04, 'wood');
    b.addBox(0, 0.32, 0, w, 0.38, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.32, d * 0.06, w * 0.42, 0.3, d * 0.9, { materialRole: 'darkMetal', layer: 'detail' });
    const tvW = Math.min(w * 0.72, 1.24);
    const tvH = tvW * 0.56;
    b.addBox(0, 0.56, 0, 0.28, 0.03, 0.18, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(0, 0.64, 0, 0.05, 0.14, 0.04, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(0, 0.7 + tvH * 0.5, 0, tvW, tvH, 0.035, { materialRole: 'darkMetal', layer: 'body' });
    objCreateScreenPlane(group, cfg.screenMode || 'arcade_attract', tvW - 0.04, tvH - 0.04, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 77, {
      x: 0,
      y: 0.7 + tvH * 0.5,
      z: 0.02,
      role: 'living_room_tv'
    });
    return;
  }

  // tall_chest, wide_credenza, wardrobe_closet
  b.addBox(0, 0.04, 0, w - 0.06, 0.08, d - 0.06, { materialRole: 'frame', layer: 'body' });
  b.addBox(0, h * 0.5, 0, w, h - 0.06, d, { materialRole: 'wood', layer: 'body' });
  if (type === 'wardrobe_closet') {
    for (const dx of [-w * 0.24, w * 0.24]) {
      b.addBox(dx, h * 0.5, d * 0.5 + 0.012, w * 0.46, h - 0.14, 0.02, { materialRole: 'primary', layer: 'detail' });
      b.addBox(dx > 0 ? -0.05 : 0.05, h * 0.52, d * 0.5 + 0.03, 0.018, 0.16, 0.02, { materialRole: 'brass', layer: 'detail' });
    }
  } else {
    const rows = type === 'tall_chest' ? 5 : 3;
    const cols = type === 'tall_chest' ? 1 : 2;
    const drH = (h - 0.16) / rows;
    const drW = (w - 0.12) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = (c - (cols - 1) * 0.5) * drW;
        const dy = 0.1 + (r + 0.5) * drH;
        b.addBox(dx, dy, d * 0.5 + 0.01, drW - 0.03, drH - 0.025, 0.02, { materialRole: 'primary', layer: 'detail' });
        b.addBox(dx, dy, d * 0.5 + 0.026, 0.09, 0.016, 0.018, { materialRole: 'brass', layer: 'detail' });
      }
    }
  }
}

function resBuildKitchenAppliance(group, cfg, b, mats, meta) {
  const type = cfg.applianceType || 'double_fridge';
  const w = clamp(Number(cfg.width) || 0.86, 0.55, 1.55);
  const d = clamp(Number(cfg.depth) || 0.78, 0.48, 0.98);
  const h = clamp(Number(cfg.height) || 1.82, 0.85, 2.08);

  if (type === 'double_fridge' || type === 'retro_fridge') {
    const cr = type === 'retro_fridge' ? 0.075 : 0.02;
    b.addChamferBox(0, h * 0.5, 0, w, h, d, cr, { materialRole: 'primary', layer: 'body' });
    if (type === 'double_fridge') {
      b.addBox(-w * 0.25, h * 0.52, d * 0.5 + 0.012, w * 0.47, h * 0.9, 0.025, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(w * 0.25, h * 0.52, d * 0.5 + 0.012, w * 0.47, h * 0.9, 0.025, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(-w * 0.25, h * 0.54, d * 0.5 + 0.03, w * 0.22, 0.34, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
      b.addCylinder(-0.045, h * 0.56, d * 0.5 + 0.045, 0.012, 0.012, 0.56, 8, 'y', 'chrome', 'detail');
      b.addCylinder(0.045, h * 0.56, d * 0.5 + 0.045, 0.012, 0.012, 0.56, 8, 'y', 'chrome', 'detail');
    } else {
      b.addChamferBox(0, h * 0.78, d * 0.5 + 0.01, w * 0.92, h * 0.34, 0.03, 0.015, { materialRole: 'primary', layer: 'detail' });
      b.addChamferBox(0, h * 0.32, d * 0.5 + 0.01, w * 0.92, h * 0.52, 0.03, 0.015, { materialRole: 'primary', layer: 'detail' });
      b.addBox(w * 0.32, h * 0.76, d * 0.5 + 0.035, 0.08, 0.028, 0.03, { materialRole: 'chrome', layer: 'detail' });
      b.addBox(w * 0.32, h * 0.42, d * 0.5 + 0.035, 0.08, 0.028, 0.03, { materialRole: 'chrome', layer: 'detail' });
    }
    return;
  }

  if (type === 'stove_oven') {
    b.addBox(0, 0.45, 0, w, 0.9, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 1.06, -d * 0.44, w, 0.32, 0.09, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, 0.48, d * 0.5 + 0.015, w * 0.86, 0.48, 0.03, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(0, 0.68, d * 0.5 + 0.045, 0.014, 0.014, w * 0.72, 8, 'z', 'chrome', 'detail');
    for (const [bx, bz] of [[-w * 0.24, -d * 0.2], [w * 0.24, -d * 0.2], [-w * 0.24, d * 0.2], [w * 0.24, d * 0.2]]) {
      b.addCylinder(bx, 0.915, bz, 0.11, 0.11, 0.025, 12, 'y', 'darkMetal', 'detail');
    }
    return;
  }

  if (type === 'counter_microwave_kit') {
    b.addBox(-0.14, 0.17, 0, 0.52, 0.34, 0.38, { materialRole: 'chrome', layer: 'body' });
    b.addBox(-0.18, 0.17, 0.195, 0.32, 0.24, 0.015, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0.05, 0.17, 0.195, 0.09, 0.24, 0.015, { materialRole: 'darkMetal', layer: 'detail' });
    b.addChamferBox(0.28, 0.11, 0, 0.2, 0.21, 0.28, 0.02, { materialRole: 'accent', layer: 'body' });
    return;
  }

  if (type === 'kitchen_island' || type === 'sink_cabinet') {
    b.addBox(0, 0.44, 0, w, 0.88, d, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.91, 0, w + 0.06, 0.055, d + 0.08, 0.01, {
      materialRole: type === 'kitchen_island' ? 'wood' : 'stone',
      layer: 'body'
    });
    if (type === 'sink_cabinet') {
      b.addBox(0, 0.942, 0.04, w * 0.58, 0.02, d * 0.62, { materialRole: 'chrome', layer: 'detail' });
      resAddPipePolyline(b, [[0, 0.94, -d * 0.22], [0, 1.18, -d * 0.22], [0, 1.2, -d * 0.06], [0, 1.12, -d * 0.04]], 0.016, 8, 'chrome', 'detail');
    }
    return;
  }

  // china_pantry_hutch
  b.addBox(0, 0.44, 0, w, 0.88, d, { materialRole: 'wood', layer: 'body' });
  b.addBox(0, 1.44, -d * 0.12, w * 0.96, 1.12, d * 0.72, { materialRole: 'wood', layer: 'body' });
  b.addBox(0, 1.44, d * 0.25, w * 0.88, 0.96, 0.025, { materialRole: 'glass', layer: 'detail' });
}

function resBuildBathLaundry(group, cfg, b, mats, meta) {
  const type = cfg.fixtureType || 'porcelain_toilet';
  const w = clamp(Number(cfg.width) || 0.68, 0.44, 1.65);
  const d = clamp(Number(cfg.depth) || 0.68, 0.42, 0.95);

  if (type === 'porcelain_toilet') {
    b.addCylinder(0, 0.18, 0.08, 0.16, 0.19, 0.36, 12, 'y', 'whiteTrim', 'body');
    b.addCylinder(0, 0.38, 0.12, 0.18, 0.21, 0.06, 14, 'y', 'whiteTrim', 'body');
    b.addChamferBox(0, 0.6, -0.18, 0.42, 0.36, 0.2, 0.02, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(-0.16, 0.785, -0.18, 0.06, 0.02, 0.04, { materialRole: 'chrome', layer: 'detail' });
  } else if (type === 'vanity_sink_mirror') {
    b.addBox(0, 0.42, 0, w, 0.84, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, 0.86, 0, w + 0.03, 0.05, d + 0.03, { materialRole: 'stone', layer: 'body' });
    b.addCylinder(0, 0.9, 0.04, 0.18, 0.22, 0.06, 14, 'y', 'whiteTrim', 'detail');
    b.addBox(0, 1.46, -d * 0.46, w * 0.88, 0.76, 0.035, { materialRole: 'glass', layer: 'detail' });
  } else if (type === 'soaking_bathtub') {
    b.addChamferBox(0, 0.3, 0, w, 0.56, d, 0.06, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, 0.42, 0, w - 0.16, 0.36, d - 0.16, { materialRole: 'glass', layer: 'detail' });
    resAddPipePolyline(b, [[-w * 0.44, 0.58, 0], [-w * 0.44, 0.74, 0], [-w * 0.34, 0.7, 0]], 0.018, 8, 'chrome', 'detail');
  } else if (type === 'ironing_board') {
    b.addBox(0, 0.46, 0, w * 0.86, 0.025, 0.03, { materialRole: 'chrome', layer: 'body', rotZDeg: 38 });
    b.addBox(0, 0.46, 0, w * 0.86, 0.025, 0.03, { materialRole: 'chrome', layer: 'body', rotZDeg: -38 });
    b.addChamferBox(0, 0.88, 0, w, 0.04, d * 0.6, 0.015, { materialRole: 'upholstery', layer: 'body' });
  } else {
    // washer_front / stacked_laundry
    const stackH = type === 'stacked_laundry' ? 1.72 : 0.88;
    b.addChamferBox(0, stackH * 0.5, 0, w, stackH, d, 0.02, { materialRole: 'whiteTrim', layer: 'body' });
    const doors = type === 'stacked_laundry' ? [0.46, 1.28] : [0.44];
    for (const dy of doors) {
      b.addCylinder(0, dy, d * 0.5 + 0.02, w * 0.28, w * 0.28, 0.04, 16, 'z', 'darkMetal', 'detail');
      b.addCylinder(0, dy, d * 0.5 + 0.035, w * 0.21, w * 0.21, 0.03, 16, 'z', 'glass', 'detail');
      b.addBox(0, dy + 0.34, d * 0.5 + 0.01, w * 0.84, 0.1, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
    }
  }
}

function resBuildHouseholdDecor(group, cfg, b, mats, meta) {
  const type = cfg.decorType || 'floor_lamp';
  const w = clamp(Number(cfg.width) || 0.55, 0.25, 2.6);
  const h = clamp(Number(cfg.height) || 1.65, 0.02, 2.3);
  const d = clamp(Number(cfg.depth) || 0.55, 0.25, 2.0);
  const lit = cfg.lampLit !== false;

  if (type === 'floor_lamp' || type === 'table_lamp') {
    if (type === 'floor_lamp') {
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        b.addPipeSegment(Math.cos(ang) * 0.22, 0.02, Math.sin(ang) * 0.22, 0, h * 0.72, 0, 0.018, 6, 'wood', 'body');
      }
      b.addCylinder(0, h * 0.84, 0, 0.24, 0.18, 0.34, 16, 'y', lit ? 'lampGlow' : 'fabric', 'body');
      if (lit) meta.lightSources.push({ id: 'floor_lamp_glow', position: [0, h * 0.82, 0], color: '#ffe394', radius: 3.4 });
    } else {
      b.addCylinder(0, 0.14, 0, 0.11, 0.07, 0.28, 12, 'y', 'accent', 'body');
      b.addCylinder(0, 0.38, 0, 0.18, 0.12, 0.22, 14, 'y', lit ? 'lampGlow' : 'fabric', 'body');
      if (lit) meta.lightSources.push({ id: 'table_lamp_glow', position: [0, 0.38, 0], color: '#ffe394', radius: 2.2 });
    }
  } else if (type === 'area_rug') {
    objCreateGroundDecal(group, 'asphalt_oil', w, d, cfg.accentColor || '#8c4236', cfg.condition, cfg.seed || 33, { y: 0.008, materialRole: 'carpet' });
    b.addBox(0, 0.006, 0, w, 0.012, d, { materialRole: 'carpet', layer: 'body' });
    b.addBox(0, 0.008, 0, w * 0.8, 0.012, d * 0.76, { materialRole: 'accent', layer: 'detail' });
  } else if (type === 'grandfather_clock') {
    b.addChamferBox(0, h * 0.5, 0, 0.52, h, 0.34, 0.02, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, h * 0.76, 0.178, 0.26, 0.26, 0.016, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addCylinder(0, h * 0.44, 0.18, 0.055, 0.055, 0.02, 12, 'z', 'brass', 'detail');
  } else if (type === 'potted_houseplant') {
    b.addCylinder(0, 0.18, 0, 0.14, 0.19, 0.36, 12, 'y', 'accent', 'body');
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      b.addBox(Math.cos(ang) * 0.14, 0.56 + (i % 2) * 0.08, Math.sin(ang) * 0.14, 0.18, 0.03, 0.26, {
        materialRole: 'foliage',
        layer: 'detail',
        rotY: ang,
        rotXDeg: 28
      });
    }
  } else if (type === 'coat_rack') {
    b.addCylinder(0, 0.02, 0, 0.22, 0.24, 0.04, 12, 'y', 'wood', 'body');
    b.addCylinder(0, h * 0.5, 0, 0.026, 0.038, h, 10, 'y', 'wood', 'body');
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      b.addBox(Math.cos(ang) * 0.1, h - 0.1, Math.sin(ang) * 0.1, 0.18, 0.024, 0.024, { materialRole: 'brass', layer: 'detail', rotY: ang });
    }
  } else if (type === 'laundry_hamper') {
    b.addCylinder(0, 0.32, 0, 0.2, 0.24, 0.64, 12, 'y', 'wood', 'body');
    b.addCylinder(0, 0.65, 0, 0.25, 0.25, 0.04, 12, 'y', 'accent', 'detail');
  } else {
    // mantel_fireplace
    b.addBox(0, h * 0.45, 0, w, h * 0.9, d, { materialRole: 'brick', layer: 'body' });
    b.addBox(0, 0.36, d * 0.14, w * 0.56, 0.54, d * 0.76, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(0, 0.24, d * 0.16, w * 0.32, 0.18, 0.16, { materialRole: 'signalAmber', layer: 'detail' });
    b.addChamferBox(0, h * 0.93, 0.04, w + 0.12, 0.09, d + 0.1, 0.012, { materialRole: 'wood', layer: 'body' });
    meta.lightSources.push({ id: 'hearth_ember', position: [0, 0.34, d * 0.38], color: '#ff8a2b', radius: 3.6 });
  }
}

export function registerResidentialHouseholdFamilies() {
  registerObjectFamily({
    id: 'residential_chair_seating',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Residential Chairs & Lounge Seating',
    label: 'Residential Chairs, Recliners & Stools',
    description: 'Wooden dining chairs, wingback armchairs, living room recliners, barstools, vanity stools, rocking chairs, beanbags, and patio loungers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'seating',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'living_room', 'dining_room', 'kitchen', 'bedroom', 'patio'],
    tags: ['chair', 'dining_chair', 'armchair', 'recliner', 'stool', 'barstool', 'rocker', 'residential'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Chair Geometry', tab: 'structure' },
      {
        key: 'chairStyle',
        label: 'Chair Design',
        type: 'select',
        tab: 'structure',
        default: 'dining_wood_slat',
        options: [
          ['dining_wood_slat', 'Wood Slat Dining Chair'],
          ['upholstered_dining', 'Upholstered Dining Chair'],
          ['windsor_spindle', 'Windsor Spindle Chair'],
          ['wingback', 'Wingback Reading Armchair'],
          ['recliner', 'Plush Living Room Recliner'],
          ['midcentury_lounge', 'Mid-Century Shell Chair'],
          ['rocking_chair', 'Wooden Rocking Chair'],
          ['barstool_swivel', 'Swivel Kitchen Barstool'],
          ['saddle_stool', 'Backless Counter Stool'],
          ['vanity_stool', 'Tufted Vanity Stool'],
          ['beanbag', 'Soft Beanbag Lounger'],
          ['adirondack', 'Patio Adirondack Lounger'],
          ['entry_bench', 'Entryway Storage Bench']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.36, max: 1.4, step: 0.02, unit: 'm', default: 0.52 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.34, max: 1.0, step: 0.02, unit: 'm', default: 0.52 },
      { key: 'seatHeight', label: 'Seat Height', type: 'range', tab: 'structure', min: 0.34, max: 0.8, step: 0.02, unit: 'm', default: 0.46 },
      { key: 'backHeight', label: 'Backrest Height', type: 'range', tab: 'details', min: 0.0, max: 0.72, step: 0.02, unit: 'm', default: 0.46 },
      { key: 'cushionSeat', label: 'Cushioned Seat', type: 'boolean', tab: 'details', default: true },
      { key: 'includeArmrests', label: 'Armrests', type: 'boolean', tab: 'details', default: false }
    ],
    presets: [
      { id: 'wood_slat_dining_chair', label: 'Classic Wood Slat Dining Chair', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { chairStyle: 'dining_wood_slat', width: 0.48, depth: 0.5, seatHeight: 0.46, backHeight: 0.48, cushionSeat: false } },
      { id: 'upholstered_dining_chair', label: 'Upholstered High-Back Dining Chair', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { chairStyle: 'upholstered_dining', width: 0.5, depth: 0.52, seatHeight: 0.46, backHeight: 0.5, cushionSeat: true } },
      { id: 'windsor_spindle_dining_chair', label: 'Windsor Spindle Dining Chair', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { chairStyle: 'windsor_spindle', width: 0.5, depth: 0.48, seatHeight: 0.45, backHeight: 0.48, cushionSeat: false } },
      { id: 'living_wingback_armchair', label: 'Classic Wingback Armchair', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { chairStyle: 'wingback', width: 0.84, depth: 0.86, seatHeight: 0.44, backHeight: 0.66 } },
      { id: 'plush_recliner_chair', label: 'Living Room Plush Recliner', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { chairStyle: 'recliner', width: 0.92, depth: 0.94, seatHeight: 0.46, backHeight: 0.62 } },
      { id: 'midcentury_shell_armchair', label: 'Mid-Century Lounge Armchair', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', params: { chairStyle: 'midcentury_lounge', width: 0.78, depth: 0.8, seatHeight: 0.42, backHeight: 0.48 } },
      { id: 'porch_wood_rocking_chair', label: 'Wooden Porch Rocking Chair', locationContext: 'both', paletteFamily: 'wood_office_executive', params: { chairStyle: 'rocking_chair', width: 0.64, depth: 0.78, seatHeight: 0.44, backHeight: 0.64, cushionSeat: false } },
      { id: 'swivel_kitchen_barstool', label: 'Swivel Kitchen Island Barstool', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { chairStyle: 'barstool_swivel', width: 0.44, depth: 0.44, seatHeight: 0.74, backHeight: 0.24 } },
      { id: 'backless_saddle_counter_stool', label: 'Wood Saddle Counter Stool', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { chairStyle: 'saddle_stool', width: 0.46, depth: 0.38, seatHeight: 0.62, backHeight: 0 } },
      { id: 'padded_bedroom_vanity_stool', label: 'Padded Bedroom Vanity Stool', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { chairStyle: 'vanity_stool', width: 0.44, depth: 0.4, seatHeight: 0.46, backHeight: 0 } },
      { id: 'soft_media_beanbag_chair', label: 'Soft Media Room Beanbag', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', params: { chairStyle: 'beanbag', width: 0.86, depth: 0.86, seatHeight: 0.36 } },
      { id: 'patio_adirondack_lounger', label: 'Slatted Patio Adirondack Chair', locationContext: 'both', paletteFamily: 'wood_office_executive', params: { chairStyle: 'adirondack', width: 0.76, depth: 0.88, seatHeight: 0.38, backHeight: 0.56 } },
      { id: 'entryway_boot_storage_bench', label: 'Mudroom Coat & Shoe Bench', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { chairStyle: 'entry_bench', width: 1.18, depth: 0.42, seatHeight: 0.48, backHeight: 0 } }
    ],
    buildGeometry: resBuildChairSeating
  });

  registerObjectFamily({
    id: 'residential_sofa_lounger',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Sofas, Loveseats & Sectionals',
    label: 'Sofas, Loveseats & Living Sectionals',
    description: 'Three-seat sofas, apartment loveseats, L-shaped corner sectionals, chaises, wood-frame futons, and leather couches.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'large',
    functionalRole: 'seating',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'living_room', 'lobby'],
    tags: ['sofa', 'couch', 'loveseat', 'sectional', 'futon', 'residential'],
    schema: [
      { group: 'Sofa Profile', tab: 'structure' },
      {
        key: 'sofaStyle',
        label: 'Sofa Type',
        type: 'select',
        tab: 'structure',
        default: 'three_seat_sofa',
        options: [
          ['three_seat_sofa', 'Three-Seat Sofa'],
          ['loveseat', 'Two-Seat Loveseat'],
          ['l_sectional', 'L-Shaped Corner Sectional'],
          ['futon_frame', 'Wood-Frame Studio Futon'],
          ['leather_club', 'Classic Club Sofa']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 1.35, max: 3.1, step: 0.05, unit: 'm', default: 2.05 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.78, max: 1.75, step: 0.04, unit: 'm', default: 0.92 },
      { key: 'backHeight', label: 'Backrest Height', type: 'range', tab: 'structure', min: 0.68, max: 0.98, step: 0.02, unit: 'm', default: 0.84 },
      { key: 'cushionCount', label: 'Seat Cushions', type: 'range', tab: 'details', min: 2, max: 4, step: 1, default: 3 },
      { key: 'throwPillows', label: 'Throw Pillows', type: 'boolean', tab: 'details', default: true }
    ],
    presets: [
      { id: 'classic_3seat_living_sofa', label: 'Three-Seat Living Room Sofa', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { sofaStyle: 'three_seat_sofa', width: 2.1, depth: 0.92, cushionCount: 3 } },
      { id: 'apartment_2seat_loveseat', label: 'Apartment Two-Seat Loveseat', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { sofaStyle: 'loveseat', width: 1.5, depth: 0.88, cushionCount: 2 } },
      { id: 'corner_l_sectional_sofa', label: 'L-Shaped Living Sectional', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { sofaStyle: 'l_sectional', width: 2.65, depth: 0.94, cushionCount: 4 } },
      { id: 'studio_wood_futon_couch', label: 'Studio Wood-Frame Futon', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { sofaStyle: 'futon_frame', width: 1.9, depth: 0.96, cushionCount: 2 } },
      { id: 'leather_club_couch', label: 'Tufted Leather Club Sofa', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { sofaStyle: 'leather_club', width: 2.15, depth: 0.94, cushionCount: 3 } }
    ],
    buildGeometry: resBuildSofaLounger
  });

  registerObjectFamily({
    id: 'residential_dining_side_table',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Dining, Coffee & Side Tables',
    label: 'Dining, Coffee, End & Accent Tables',
    description: 'Family rectangular and round dining tables, farmhouse trestle tables, retro dinettes, glass and wood coffee tables, end tables, nightstands, and console tables.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'dining_room', 'living_room', 'bedroom', 'kitchen', 'patio'],
    tags: ['table', 'dining_table', 'coffee_table', 'end_table', 'nightstand', 'console', 'residential'],
    schema: [
      { group: 'Table Design', tab: 'structure' },
      {
        key: 'tableStyle',
        label: 'Table Type',
        type: 'select',
        tab: 'structure',
        default: 'rect_dining',
        options: [
          ['rect_dining', 'Rectangular Dining Table'],
          ['round_pedestal', 'Round Pedestal Dining Table'],
          ['farmhouse_trestle', 'Country Trestle Farmhouse Table'],
          ['chrome_dinette', '1950s Chrome Kitchen Dinette'],
          ['wood_coffee', 'Living Room Wood Coffee Table'],
          ['glass_coffee', 'Modern Glass Coffee Table'],
          ['square_end', 'Living Room Square End Table'],
          ['round_end', 'Small Round Accent Table'],
          ['nightstand', 'Two-Drawer Bedside Nightstand'],
          ['console_hall', 'Entryway Console Table'],
          ['tv_snack_tray', 'Folding Tv Tray Table']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.42, max: 2.4, step: 0.04, unit: 'm', default: 1.65 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.42, max: 1.35, step: 0.04, unit: 'm', default: 0.95 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.36, max: 0.88, step: 0.02, unit: 'm', default: 0.76 },
      { key: 'lowerShelf', label: 'Include Lower Shelf', type: 'boolean', tab: 'details', default: false }
    ],
    presets: [
      { id: 'family_rect_dining_table', label: 'Six-Person Rectangular Dining Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'rect_dining', width: 1.85, depth: 0.96, height: 0.76 } },
      { id: 'round_pedestal_dining_table', label: 'Round Pedestal Dining Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'round_pedestal', width: 1.25, depth: 1.25, height: 0.76 } },
      { id: 'farmhouse_trestle_table', label: 'Country Trestle Farmhouse Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'farmhouse_trestle', width: 2.1, depth: 1.0, height: 0.76 } },
      { id: 'retro_chrome_dinette_table', label: '1950s Chrome-Trim Dinette Table', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', params: { tableStyle: 'chrome_dinette', width: 1.35, depth: 0.85, height: 0.75 } },
      { id: 'living_wood_coffee_table', label: 'Living Room Drawer Coffee Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'wood_coffee', width: 1.25, depth: 0.66, height: 0.44, lowerShelf: true } },
      { id: 'modern_glass_coffee_table', label: 'Modern Glass-Top Coffee Table', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { tableStyle: 'glass_coffee', width: 1.2, depth: 0.68, height: 0.42 } },
      { id: 'square_sofa_end_table', label: 'Square Sofa Side End Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'square_end', width: 0.56, depth: 0.56, height: 0.58, lowerShelf: true } },
      { id: 'round_bistro_accent_table', label: 'Small Round Accent / Bistro Table', locationContext: 'both', paletteFamily: 'modern_corporate', params: { tableStyle: 'round_end', width: 0.64, depth: 0.64, height: 0.68 } },
      { id: 'bedside_nightstand_2drawer', label: 'Two-Drawer Bedside Nightstand', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'nightstand', width: 0.54, depth: 0.46, height: 0.6 } },
      { id: 'entry_hall_console_table', label: 'Narrow Hallway Console Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'console_hall', width: 1.32, depth: 0.42, height: 0.82, lowerShelf: true } },
      { id: 'folding_tv_snack_tray', label: 'Folding Wood Tv Tray Table', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { tableStyle: 'tv_snack_tray', width: 0.52, depth: 0.42, height: 0.64 } }
    ],
    buildGeometry: resBuildDiningSideTable
  });

  registerObjectFamily({
    id: 'residential_bedroom_storage',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Beds, Dressers & Home Storage',
    label: 'Beds, Dressers, Wardrobes & Media Stands',
    description: 'Queen platform beds, twin frames, wooden bunk beds, multi-drawer dressers, double wardrobes, and living room Tv media stands.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'large',
    functionalRole: 'storage',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'bedroom', 'living_room'],
    tags: ['bed', 'dresser', 'wardrobe', 'tv_stand', 'bunk_bed', 'residential'],
    schema: [
      { group: 'Bedroom & Storage Unit', tab: 'structure' },
      {
        key: 'unitType',
        label: 'Furniture Unit',
        type: 'select',
        tab: 'structure',
        default: 'queen_bed',
        options: [
          ['queen_bed', 'Queen Platform Bed'],
          ['twin_bed', 'Single Twin Wood Bed'],
          ['bunk_bed', 'Two-Tier Bunk Bed'],
          ['tall_chest', 'Tall Five-Drawer Dresser'],
          ['wide_credenza', 'Wide Six-Drawer Credenza'],
          ['wardrobe_closet', 'Double-Door Wardrobe Closet'],
          ['tv_media_console', 'Tv & Media Console Unit']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.65, max: 2.2, step: 0.05, unit: 'm', default: 1.68 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.4, max: 2.25, step: 0.05, unit: 'm', default: 2.1 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.45, max: 2.15, step: 0.05, unit: 'm', default: 1.15 }
    ],
    presets: [
      { id: 'queen_platform_bed', label: 'Queen Upholstered Platform Bed', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'queen_bed', width: 1.68, depth: 2.12, height: 1.12 } },
      { id: 'single_twin_wood_bed', label: 'Single Twin Wooden Bed', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'twin_bed', width: 1.08, depth: 2.04, height: 0.98 } },
      { id: 'two_tier_kids_bunk_bed', label: 'Two-Tier Wood Bunk Bed', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'bunk_bed', width: 1.08, depth: 2.04, height: 1.78 } },
      { id: 'tall_5drawer_chest', label: 'Tall Five-Drawer Chest', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'tall_chest', width: 0.88, depth: 0.48, height: 1.24 } },
      { id: 'wide_6drawer_bedroom_dresser', label: 'Wide Six-Drawer Dresser', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'wide_credenza', width: 1.48, depth: 0.5, height: 0.86 } },
      { id: 'double_door_wardrobe_closet', label: 'Double-Door Wardrobe Closet', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { unitType: 'wardrobe_closet', width: 1.12, depth: 0.58, height: 1.98 } },
      { id: 'living_room_tv_stand', label: 'Living Room Media Stand & Tv', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { unitType: 'tv_media_console', width: 1.64, depth: 0.46, height: 0.54 } }
    ],
    buildGeometry: resBuildBedroomStorage
  });

  registerObjectFamily({
    id: 'residential_kitchen_appliance',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Kitchen Appliances & Counters',
    label: 'Kitchen Appliances, Islands & Cabinets',
    description: 'Double-door and retro refrigerators, four-burner stove ranges, microwave/toaster sets, butcher-block islands, kitchen sinks, and china hutches.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    sizeClass: 'medium',
    functionalRole: 'utility',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'kitchen', 'breakroom'],
    tags: ['fridge', 'stove', 'kitchen', 'island', 'sink', 'microwave', 'residential'],
    schema: [
      { group: 'Kitchen Fixture', tab: 'structure' },
      {
        key: 'applianceType',
        label: 'Appliance / Cabinet',
        type: 'select',
        tab: 'structure',
        default: 'double_fridge',
        options: [
          ['double_fridge', 'Double-Door Refrigerator'],
          ['retro_fridge', 'Retro Curved Kitchen Fridge'],
          ['stove_oven', 'Four-Burner Gas Range'],
          ['counter_microwave_kit', 'Countertop Microwave & Toaster'],
          ['kitchen_island', 'Butcher-Block Kitchen Island'],
          ['sink_cabinet', 'Base Sink Cabinet & Faucet'],
          ['china_pantry_hutch', 'Glass-Front China & Pantry Hutch']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.55, max: 1.55, step: 0.04, unit: 'm', default: 0.88 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.48, max: 0.98, step: 0.04, unit: 'm', default: 0.78 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.85, max: 2.08, step: 0.04, unit: 'm', default: 1.84 }
    ],
    presets: [
      { id: 'stainless_double_refrigerator', label: 'Modern Double-Door Refrigerator', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { applianceType: 'double_fridge', width: 0.9, depth: 0.8, height: 1.84 } },
      { id: 'retro_pastel_kitchen_fridge', label: 'Retro Curved Kitchen Fridge', locationContext: 'interior', paletteFamily: 'retro_arcade_90s_bright', params: { applianceType: 'retro_fridge', width: 0.74, depth: 0.72, height: 1.66 } },
      { id: 'four_burner_stove_oven', label: 'Four-Burner Stove & Oven', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { applianceType: 'stove_oven', width: 0.78, depth: 0.7, height: 1.18 } },
      { id: 'microwave_toaster_counter_kit', label: 'Countertop Microwave & Toaster Rig', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { applianceType: 'counter_microwave_kit', width: 0.82, depth: 0.48, height: 0.85 } },
      { id: 'butcher_block_kitchen_island', label: 'Butcher-Block Kitchen Island', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { applianceType: 'kitchen_island', width: 1.45, depth: 0.86, height: 0.92 } },
      { id: 'base_kitchen_sink_cabinet', label: 'Base Kitchen Sink & Faucet', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { applianceType: 'sink_cabinet', width: 0.98, depth: 0.66, height: 0.92 } },
      { id: 'glass_china_pantry_hutch', label: 'Glass-Front China & Pantry Hutch', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { applianceType: 'china_pantry_hutch', width: 1.18, depth: 0.52, height: 1.98 } }
    ],
    buildGeometry: resBuildKitchenAppliance
  });

  registerObjectFamily({
    id: 'residential_bath_laundry',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Bathroom & Laundry Fixtures',
    label: 'Bathroom & Laundry Room Fixtures',
    description: 'Porcelain toilets, bathroom mirror vanities, soaking tubs, front-load washing machines, stacked washer/dryers, and folding ironing boards.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    sizeClass: 'medium',
    functionalRole: 'utility',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'bathroom', 'laundry_room'],
    tags: ['toilet', 'bathtub', 'vanity', 'washer', 'dryer', 'ironing_board', 'residential'],
    schema: [
      { group: 'Bath & Laundry Unit', tab: 'structure' },
      {
        key: 'fixtureType',
        label: 'Fixture Type',
        type: 'select',
        tab: 'structure',
        default: 'porcelain_toilet',
        options: [
          ['porcelain_toilet', 'Porcelain Flush Toilet'],
          ['vanity_sink_mirror', 'Bathroom Vanity & Mirror'],
          ['soaking_bathtub', 'Soaking Porcelain Bathtub'],
          ['washer_front', 'Front-Load Washing Machine'],
          ['stacked_laundry', 'Stacked Washer & Dryer'],
          ['ironing_board', 'Folding Ironing Board']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.44, max: 1.65, step: 0.04, unit: 'm', default: 0.68 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.42, max: 0.95, step: 0.04, unit: 'm', default: 0.68 }
    ],
    presets: [
      { id: 'porcelain_flush_toilet', label: 'Two-Piece Porcelain Toilet', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { fixtureType: 'porcelain_toilet', width: 0.46, depth: 0.68 } },
      { id: 'bath_vanity_mirror_sink', label: 'Bathroom Vanity & Mirror', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { fixtureType: 'vanity_sink_mirror', width: 0.88, depth: 0.54 } },
      { id: 'porcelain_soaking_bathtub', label: 'Porcelain Soaking Bathtub', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { fixtureType: 'soaking_bathtub', width: 1.56, depth: 0.78 } },
      { id: 'front_load_washer_unit', label: 'Front-Load Automatic Washer', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { fixtureType: 'washer_front', width: 0.68, depth: 0.7 } },
      { id: 'stacked_washer_dryer_tower', label: 'Stacked Washer / Dryer Tower', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { fixtureType: 'stacked_laundry', width: 0.7, depth: 0.72 } },
      { id: 'folding_ironing_board_rig', label: 'Padded Folding Ironing Board', locationContext: 'interior', paletteFamily: 'modern_corporate', params: { fixtureType: 'ironing_board', width: 1.18, depth: 0.58 } }
    ],
    buildGeometry: resBuildBathLaundry
  });

  registerObjectFamily({
    id: 'residential_household_decor',
    categoryId: '29_residential_household',
    categories: ['29_residential_household'],
    subcategory: 'Home Lighting, Decor & Clutter',
    label: 'Household Lamps, Rugs, Clocks & Hearth',
    description: 'Tripod floor lamps, bedside table lamps, woven area rugs, grandfather clocks, potted houseplants, coat racks, laundry hampers, and brick fireplaces.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    sizeClass: 'small',
    functionalRole: 'decoration',
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'living_room', 'bedroom', 'dining_room'],
    tags: ['lamp', 'rug', 'clock', 'plant', 'coat_rack', 'hamper', 'fireplace', 'residential'],
    schema: [
      { group: 'Household Accent', tab: 'structure' },
      {
        key: 'decorType',
        label: 'Decor Prop',
        type: 'select',
        tab: 'structure',
        default: 'floor_lamp',
        options: [
          ['floor_lamp', 'Tripod Living Room Floor Lamp'],
          ['table_lamp', 'Ceramic & Shade Table Lamp'],
          ['area_rug', 'Woven Geometric Area Rug'],
          ['grandfather_clock', 'Wood Grandfather Clock'],
          ['potted_houseplant', 'Potted Indoor Houseplant'],
          ['coat_rack', 'Standing Coat & Hat Rack'],
          ['laundry_hamper', 'Woven Laundry Hamper'],
          ['mantel_fireplace', 'Brick & Timber Fireplace Hearth']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.25, max: 2.6, step: 0.05, unit: 'm', default: 0.55 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.25, max: 2.0, step: 0.05, unit: 'm', default: 0.55 },
      { key: 'height', label: 'Height', type: 'range', tab: 'structure', min: 0.02, max: 2.3, step: 0.04, unit: 'm', default: 1.65 },
      { key: 'lampLit', label: 'Lamp Emissive Lit', type: 'boolean', tab: 'details', default: true }
    ],
    presets: [
      { id: 'tripod_living_floor_lamp', label: 'Warm Shade Tripod Floor Lamp', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'floor_lamp', width: 0.54, depth: 0.54, height: 1.68, lampLit: true } },
      { id: 'bedside_ceramic_table_lamp', label: 'Bedside Ceramic Table Lamp', attachmentProfile: 'surface_placed', locationContext: 'interior', paletteFamily: 'clean_medical_office', params: { decorType: 'table_lamp', width: 0.36, depth: 0.36, height: 0.52, lampLit: true } },
      { id: 'woven_living_area_rug', label: 'Woven Living Room Area Rug', attachmentProfile: 'ground_embedded', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'area_rug', width: 2.4, depth: 1.65, height: 0.02 } },
      { id: 'carved_grandfather_clock', label: 'Carved Wood Grandfather Clock', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'grandfather_clock', width: 0.56, depth: 0.36, height: 2.08 } },
      { id: 'potted_living_houseplant', label: 'Ceramic Potted Houseplant', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'potted_houseplant', width: 0.5, depth: 0.5, height: 0.96 } },
      { id: 'standing_entry_coat_rack', label: 'Standing Coat & Umbrella Stand', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'coat_rack', width: 0.48, depth: 0.48, height: 1.78 } },
      { id: 'wicker_bedroom_laundry_hamper', label: 'Woven Bedroom Laundry Hamper', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'laundry_hamper', width: 0.48, depth: 0.48, height: 0.66 } },
      { id: 'brick_mantel_fireplace_hearth', label: 'Brick & Timber Living Fireplace', locationContext: 'interior', paletteFamily: 'wood_office_executive', params: { decorType: 'mantel_fireplace', width: 1.72, depth: 0.62, height: 1.48 } }
    ],
    buildGeometry: resBuildHouseholdDecor
  });
}
