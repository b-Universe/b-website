import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function ospBuildFilingCabinet(group, cfg, b, mats, meta) {
  const type = cfg.cabinetType || 'vertical_drawer';
  const drawers = Math.max(2, Math.round(cfg.drawerCount || 4));
  const w = clamp(cfg.width || (type === 'lateral_wide' || type === 'blueprint_flat_file' ? 0.94 : 0.46), 0.36, 1.35);
  const d = clamp(cfg.depth || 0.62, 0.42, 0.85);
  const h = clamp(cfg.height || (type === 'rolling_pedestal' ? 0.62 : (type === 'blueprint_flat_file' ? 0.88 : 1.34)), 0.52, 2.05);
  const openIdx = Math.round(cfg.openDrawerIndex || 0);
  const hasCasters = type === 'rolling_pedestal';
  const baseY = hasCasters ? 0.055 : 0.03;

  if (hasCasters) {
    b.addCasterWheels(0, 0, w - 0.08, d - 0.08, 0.024, 'rubber', 'frame');
  } else {
    b.addBox(0, baseY * 0.5, 0, w - 0.02, baseY, d - 0.02, { materialRole: 'frame', layer: 'body' });
  }

  const bodyH = Math.max(0.4, h - baseY);
  b.addChamferBox(0, baseY + bodyH * 0.5, 0, w, bodyH, d, 0.01, { materialRole: 'primary', layer: 'body' });

  if (type === 'tall_supply_cupboard') {
    const doorW = (w - 0.04) * 0.5;
    b.addBox(-doorW * 0.5 - 0.004, baseY + bodyH * 0.5, d * 0.5 + 0.008, doorW, bodyH - 0.04, 0.018, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(doorW * 0.5 + 0.004, baseY + bodyH * 0.5, d * 0.5 + 0.008, doorW, bodyH - 0.04, 0.018, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(-0.024, baseY + bodyH * 0.52, d * 0.5 + 0.022, 0.016, 0.14, 0.018, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0.024, baseY + bodyH * 0.52, d * 0.5 + 0.022, 0.016, 0.14, 0.018, { materialRole: 'chrome', layer: 'detail' });
  } else if (type === 'fireproof_safe_cabinet') {
    b.addBox(0, baseY + bodyH * 0.5, d * 0.5 + 0.012, w - 0.06, bodyH - 0.06, 0.024, { materialRole: 'secondary', layer: 'detail' });
    b.addCylinder(0, baseY + bodyH * 0.58, d * 0.5 + 0.032, 0.048, 0.054, 0.026, 12, 'z', 'chrome', 'detail');
    b.addBox(w * 0.24, baseY + bodyH * 0.44, d * 0.5 + 0.028, 0.032, 0.16, 0.024, { materialRole: 'chrome', layer: 'detail' });
  } else {
    const dwH = (bodyH - 0.06) / drawers;
    for (let i = 0; i < drawers; i++) {
      const pull = openIdx === i + 1 ? Math.min(0.28, d * 0.46) : 0;
      const dy = baseY + bodyH - 0.03 - (i + 0.5) * dwH;
      const dz = d * 0.5 + 0.01 + pull;
      b.addBox(0, dy, dz, w - 0.036, dwH - 0.016, 0.02, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(0, dy + dwH * 0.14, dz + 0.016, Math.min(w * 0.46, 0.22), 0.014, 0.016, { materialRole: 'chrome', layer: 'detail' });
      if (type !== 'blueprint_flat_file' && dwH > 0.16) {
        b.addBox(0, dy + dwH * 0.3, dz + 0.012, 0.075, 0.03, 0.008, { materialRole: 'brass', layer: 'detail' });
        b.addBox(0, dy + dwH * 0.3, dz + 0.015, 0.058, 0.02, 0.005, { materialRole: 'whiteTrim', layer: 'detail' });
      }
      if (pull > 0) {
        const trayD = d * 0.72;
        b.addBox(0, dy - dwH * 0.24, dz - trayD * 0.5, w - 0.06, 0.02, trayD, { materialRole: 'frame', layer: 'detail' });
        b.addBox(-w * 0.44, dy - dwH * 0.06, dz - trayD * 0.5, 0.016, dwH * 0.48, trayD, { materialRole: 'frame', layer: 'detail' });
        b.addBox(w * 0.44, dy - dwH * 0.06, dz - trayD * 0.5, 0.016, dwH * 0.48, trayD, { materialRole: 'frame', layer: 'detail' });
        for (let f = 0; f < 4; f++) {
          b.addBox(0, dy + 0.02, dz - 0.06 - f * 0.055, w - 0.12, dwH * 0.65, 0.012, {
            materialRole: f % 2 === 0 ? 'accent' : 'whiteTrim',
            layer: 'detail'
          });
        }
      }
    }
    if (cfg.topLock !== false) {
      b.addCylinder(w * 0.38, baseY + bodyH - 0.025, d * 0.5 + 0.012, 0.011, 0.011, 0.014, 8, 'z', 'chrome', 'detail');
    }
  }

  meta.interaction = { interactable: true, actionType: 'open_filing_drawer', drawerCount: drawers, openDrawerIndex: openIdx };
}

function ospBuildShelvingAndMailroom(group, cfg, b, mats, meta) {
  const type = cfg.unitType || 'bookcase_office';
  const w = clamp(cfg.width || 1.15, 0.55, 2.2);
  const d = clamp(cfg.depth || 0.38, 0.28, 0.75);
  const h = clamp(cfg.height || 1.95, 0.85, 2.35);
  const tiers = Math.max(2, Math.round(cfg.shelfCount || 5));

  if (type === 'supply_rolling_cart') {
    const ch = clamp(h, 0.8, 1.15);
    b.addCasterWheels(0, 0, w - 0.1, d - 0.1, 0.036, 'rubber', 'frame');
    b.addSupportLegs(0, 0.07, ch, w - 0.06, d - 0.06, 0.032, 'chrome');
    b.addBox(0, 0.2, 0, w, 0.03, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ch * 0.68, 0, w, 0.03, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.5 - 0.03, ch * 0.86, 0, 0.025, 0.025, d * 0.75, { materialRole: 'rubber', layer: 'detail' });
    b.addBox(-0.18, ch * 0.68 + 0.12, 0, 0.36, 0.21, d * 0.76, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0.2, ch * 0.68 + 0.09, 0.03, 0.28, 0.15, d * 0.62, { materialRole: 'whiteTrim', layer: 'detail' });
  } else if (type === 'mailroom_sorting_pigeonholes') {
    const counterY = 0.88;
    b.addBox(0, counterY * 0.5, 0, w, counterY, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, counterY + 0.018, 0.03, w + 0.04, 0.036, d + 0.06, { materialRole: 'secondary', layer: 'body' });
    const cols = Math.max(3, Math.round(cfg.pigeonholeCols || 5));
    const upperH = Math.max(0.65, h - counterY);
    const upperD = d * 0.68;
    const upperZ = -d * 0.16;
    b.addBox(0, counterY + upperH * 0.5, upperZ - upperD * 0.5 + 0.01, w, upperH, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.49, counterY + upperH * 0.5, upperZ, 0.024, upperH, upperD, { materialRole: 'primary', layer: 'body' });
    b.addBox(w * 0.49, counterY + upperH * 0.5, upperZ, 0.024, upperH, upperD, { materialRole: 'primary', layer: 'body' });
    for (let c = 1; c < cols; c++) {
      const dx = -w * 0.5 + (c / cols) * w;
      b.addBox(dx, counterY + upperH * 0.5, upperZ, 0.018, upperH, upperD, { materialRole: 'secondary', layer: 'body' });
    }
    const rows = Math.max(3, tiers);
    for (let r = 1; r <= rows; r++) {
      const sy = counterY + (r / rows) * upperH;
      b.addBox(0, sy, upperZ, w - 0.02, 0.018, upperD, { materialRole: 'secondary', layer: 'body' });
      if (r < rows) {
        const slotW = w / cols;
        b.addBox(-w * 0.5 + ((r % cols) + 0.5) * slotW, sy - 0.04, upperZ + 0.03, slotW * 0.68, 0.035, upperD * 0.65, { materialRole: 'whiteTrim', layer: 'detail' });
      }
    }
  } else {
    // Bookcase or Industrial archive rack
    const isRack = type === 'industrial_archive_rack';
    if (isRack) {
      b.addSupportLegs(0, 0, h, w - 0.05, d - 0.05, 0.042, 'frame');
    } else {
      b.addBox(-w * 0.48, h * 0.5, 0, 0.034, h, d, { materialRole: 'primary', layer: 'body' });
      b.addBox(w * 0.48, h * 0.5, 0, 0.034, h, d, { materialRole: 'primary', layer: 'body' });
      b.addBox(0, h * 0.5, -d * 0.48, w, h, 0.02, { materialRole: 'secondary', layer: 'body' });
    }
    for (let t = 0; t < tiers; t++) {
      const sy = 0.08 + (t / (tiers - 1)) * (h - 0.12);
      b.addBox(0, sy, 0, w - 0.02, 0.028, d - 0.01, { materialRole: isRack ? 'secondary' : 'primary', layer: 'body' });
      if (t < tiers - 1 && cfg.populateItems !== false) {
        if (isRack) {
          const boxCount = Math.max(2, Math.floor(w / 0.36));
          for (let k = 0; k < boxCount; k++) {
            const bx = -w * 0.36 + (k / Math.max(1, boxCount - 1)) * (w * 0.72);
            b.addBox(bx, sy + 0.13, 0.01, 0.28, 0.22, d * 0.78, { materialRole: 'whiteTrim', layer: 'detail' });
            b.addBox(bx, sy + 0.15, d * 0.41, 0.14, 0.05, 0.006, { materialRole: 'accent', layer: 'detail' });
          }
        } else {
          // Book clusters + binders
          const segs = 3;
          for (let k = 0; k < segs; k++) {
            const bx = -w * 0.34 + k * (w * 0.32);
            const role = k % 2 === 0 ? 'accent' : 'upholstery';
            b.addBox(bx, sy + 0.13, 0.02, 0.16, 0.22, d * 0.66, { materialRole: role, layer: 'detail' });
            b.addBox(bx + 0.1, sy + 0.11, 0.02, 0.035, 0.19, d * 0.64, { materialRole: 'whiteTrim', layer: 'detail' });
          }
        }
      }
    }
  }

  meta.interaction = { interactable: true, actionType: 'browse_storage_unit', tiers };
}

function ospBuildCubiclePartition(group, cfg, b, mats, meta) {
  const layout = cfg.partitionLayout || 'single_panel';
  const len = clamp(cfg.width || 1.55, 0.75, 2.4);
  const h = clamp(cfg.height || 1.48, 0.42, 2.25);
  const thick = clamp(cfg.thickness || 0.065, 0.03, 0.12);
  const hasGlass = Boolean(cfg.glassTop);

  if (layout === 'desk_privacy_screen') {
    b.addChamferBox(0, h * 0.5, 0, len, h, thick * 0.7, 0.008, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(-len * 0.36, -0.02, 0, 0.04, 0.08, 0.055, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(len * 0.36, -0.02, 0, 0.04, 0.08, 0.055, { materialRole: 'chrome', layer: 'detail' });
    meta.surfaceRelationship = { isSupportSurface: false, targetType: 'desk_edge', attachSurface: 'rear_edge' };
    return;
  }

  const buildPanel = (cx, cz, pw, rotY = 0) => {
    const fabricH = hasGlass ? h * 0.72 : h - 0.04;
    b.addBox(cx, fabricH * 0.5 + 0.02, cz, pw, fabricH, thick, { materialRole: 'upholstery', layer: 'body', rotY });
    b.addBox(cx, 0.03, cz, pw + 0.01, 0.06, thick + 0.01, { materialRole: 'frame', layer: 'body', rotY });
    b.addBox(cx, h - 0.02, cz, pw + 0.01, 0.04, thick + 0.01, { materialRole: 'frame', layer: 'body', rotY });
    if (hasGlass) {
      const glH = h * 0.24;
      b.addBox(cx, fabricH + 0.02 + glH * 0.5, cz, pw - 0.04, glH, 0.014, { materialRole: 'glass', layer: 'detail', rotY });
    }
    const px = Math.cos(rotY) * (pw * 0.5);
    const pz = -Math.sin(rotY) * (pw * 0.5);
    b.addBox(cx - px, h * 0.5, cz - pz, thick + 0.02, h, thick + 0.02, { materialRole: 'frame', layer: 'body', rotY });
    b.addBox(cx + px, h * 0.5, cz + pz, thick + 0.02, h, thick + 0.02, { materialRole: 'frame', layer: 'body', rotY });
  };

  if (layout === 'rolling_whiteboard_divider') {
    b.addBox(-len * 0.46, 0.04, 0, 0.08, 0.05, 0.48, { materialRole: 'frame', layer: 'body' });
    b.addBox(len * 0.46, 0.04, 0, 0.08, 0.05, 0.48, { materialRole: 'frame', layer: 'body' });
    b.addCasterWheels(0, 0, len * 0.9, 0.42, 0.022, 'rubber', 'frame');
    b.addBox(-len * 0.47, h * 0.52, 0, 0.045, h - 0.08, 0.045, { materialRole: 'frame', layer: 'body' });
    b.addBox(len * 0.47, h * 0.52, 0, 0.045, h - 0.08, 0.045, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.58, 0, len - 0.08, h * 0.66, 0.036, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, h * 0.24, 0.03, len * 0.55, 0.025, 0.045, { materialRole: 'chrome', layer: 'detail' });
  } else if (layout === 'corner_l_panel') {
    buildPanel(0, -len * 0.5, len, 0);
    buildPanel(-len * 0.5, 0, len, degToRad(90));
  } else if (layout === 'u_bay_cubicle') {
    buildPanel(0, -len * 0.5, len, 0);
    buildPanel(-len * 0.5, 0, len * 0.9, degToRad(90));
    buildPanel(len * 0.5, 0, len * 0.9, degToRad(90));
    if (cfg.overheadBin) {
      b.addBox(0, h * 0.78, -len * 0.5 + 0.18, len * 0.78, 0.24, 0.3, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(0, h * 0.52, -len * 0.5 + 0.04, len * 0.72, 0.34, 0.02, { materialRole: 'accent', layer: 'detail' });
    }
  } else {
    buildPanel(0, 0, len, 0);
    if (cfg.baseFeet) {
      b.addBox(-len * 0.44, 0.015, 0, 0.06, 0.03, 0.42, { materialRole: 'frame', layer: 'body' });
      b.addBox(len * 0.44, 0.015, 0, 0.06, 0.03, 0.42, { materialRole: 'frame', layer: 'body' });
    }
  }

  meta.snapAnchors.push(
    { id: 'east_link', position: [len * 0.5, 0, 0], normal: [1, 0, 0] },
    { id: 'west_link', position: [-len * 0.5, 0, 0], normal: [-1, 0, 0] },
    { id: 'desk_bay_front', position: [0, 0, 0.42], normal: [0, 0, 1] }
  );
  meta.interaction = { interactable: true, actionType: 'snap_partition_bay' };
}

function ospBuildCoworkingAndTraining(group, cfg, b, mats, meta) {
  const type = cfg.itemType || 'wall_whiteboard';
  const w = clamp(cfg.width || 1.65, 0.55, 2.4);
  const h = clamp(cfg.height || 1.05, 0.72, 2.25);

  if (type === 'wall_whiteboard') {
    const cz = 0.022;
    b.addBox(0, 0, cz, w, h, 0.028, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0, cz + 0.008, w - 0.05, h - 0.05, 0.02, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, -h * 0.5 + 0.012, cz + 0.04, w * 0.42, 0.024, 0.055, { materialRole: 'chrome', layer: 'detail' });
    // Colored diagram boxes + sticky notes + markers
    b.addBox(-w * 0.25, h * 0.14, cz + 0.022, 0.22, 0.14, 0.004, { materialRole: 'accent', layer: 'detail' });
    b.addBox(w * 0.12, -0.04, cz + 0.022, 0.28, 0.16, 0.004, { materialRole: 'upholstery', layer: 'detail' });
    b.addBox(-w * 0.1, -h * 0.5 + 0.036, cz + 0.045, 0.08, 0.022, 0.018, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(0.06, -h * 0.5 + 0.036, cz + 0.045, 0.08, 0.022, 0.018, { materialRole: 'signalGreen', layer: 'detail' });
  } else if (type === 'speaker_lectern') {
    const lw = clamp(w, 0.56, 0.9);
    const lh = clamp(h, 1.02, 1.25);
    b.addBox(0, 0.025, 0, lw, 0.05, 0.52, { materialRole: 'frame', layer: 'body' });
    b.addTrapezoidBox(0, lh * 0.52, 0, lw * 0.72, 0.36, lw * 0.84, 0.44, lh - 0.12, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, lh - 0.02, 0.04, lw + 0.06, 0.04, 0.54, 0.008, { materialRole: 'secondary', layer: 'body', rotXDeg: 14 });
    // Mic gooseneck
    b.addPipeSegment(lw * 0.26, lh, -0.05, lw * 0.2, lh + 0.2, 0.08, 0.008, 6, 'darkMetal', 'detail');
    objCreateSignPlane(group, cfg.signText || 'Keynote Stage', lw * 0.72, 0.14, cfg.accentColor || '#1e3952', '#ffffff', {
      x: 0,
      y: lh * 0.64,
      z: 0.23
    });
  } else if (type === 'acoustic_phone_booth') {
    const bw = clamp(w, 0.95, 1.35);
    const bh = clamp(h, 2.0, 2.28);
    const bd = 1.0;
    b.addBox(0, 0.03, 0, bw, 0.06, bd, { materialRole: 'carpet', layer: 'body' });
    b.addBox(0, bh - 0.03, 0, bw, 0.06, bd, { materialRole: 'primary', layer: 'body' });
    b.addBox(-bw * 0.5 + 0.04, bh * 0.5, 0, 0.08, bh - 0.06, bd, { materialRole: 'primary', layer: 'body' });
    b.addBox(bw * 0.5 - 0.04, bh * 0.5, 0, 0.08, bh - 0.06, bd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, bh * 0.5, -bd * 0.5 + 0.04, bw - 0.16, bh - 0.06, 0.08, { materialRole: 'upholstery', layer: 'body' });
    // Interior desk + overhead glow + glass front frame
    b.addBox(0, 0.98, -0.18, bw - 0.22, 0.035, 0.36, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(0, bh - 0.07, 0, bw * 0.45, 0.02, 0.45, { materialRole: 'lampGlow', layer: 'detail' });
    b.addBox(0, bh * 0.5, bd * 0.48, bw - 0.2, bh - 0.16, 0.018, { materialRole: 'glass', layer: 'detail' });
    b.addBox(bw * 0.32, bh * 0.48, bd * 0.51, 0.025, 0.28, 0.03, { materialRole: 'chrome', layer: 'detail' });
  } else {
    // Training nested folding table
    const tw = clamp(w, 1.1, 1.85);
    const td = 0.55;
    const th = 0.74;
    b.addCasterWheels(0, 0, tw * 0.88, td * 0.78, 0.024, 'rubber', 'frame');
    b.addBox(-tw * 0.44, th * 0.48, 0, 0.045, th - 0.06, 0.055, { materialRole: 'chrome', layer: 'body' });
    b.addBox(tw * 0.44, th * 0.48, 0, 0.045, th - 0.06, 0.055, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, th - 0.02, 0, tw, 0.036, td, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, th * 0.62, -td * 0.36, tw - 0.12, 0.28, 0.018, { materialRole: 'secondary', layer: 'body' });
  }

  meta.interaction = { interactable: true, actionType: 'use_coworking_prop', itemType: type };
}

function ospBuildLibraryStudyFixture(group, cfg, b, mats, meta) {
  const type = cfg.libraryType || 'study_carrel_desk';
  const w = clamp(cfg.width || 1.05, 0.56, 1.85);
  const d = clamp(cfg.depth || 0.72, 0.42, 0.92);
  const h = clamp(cfg.height || 1.38, 0.95, 1.88);

  if (type === 'study_carrel_desk') {
    const deskH = 0.74;
    b.addBox(0, deskH, 0, w, 0.036, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.48, h * 0.5, 0, 0.036, h, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(w * 0.48, h * 0.5, 0, 0.036, h, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.5, -d * 0.48, w, h, 0.03, { materialRole: 'secondary', layer: 'body' });
    // Upper reading shelf & task light strip
    b.addBox(0, deskH + 0.36, -d * 0.3, w - 0.06, 0.028, d * 0.36, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, deskH + 0.33, -d * 0.3, w * 0.62, 0.02, 0.04, { materialRole: 'lampGlow', layer: 'detail' });
    b.addBox(-w * 0.2, deskH + 0.09, -0.05, 0.24, 0.14, 0.18, { materialRole: 'accent', layer: 'detail' });
    b.addBox(w * 0.18, deskH + 0.04, 0.08, 0.26, 0.035, 0.2, { materialRole: 'whiteTrim', layer: 'detail' });
    meta.lightSources.push({ id: 'carrel_reading_lamp', position: [0, deskH + 0.3, -d * 0.2], color: '#fff2c4', radius: 1.5 });
  } else if (type === 'book_drop_return_bin') {
    const bw = clamp(w, 0.58, 0.88);
    const bd = clamp(d, 0.54, 0.78);
    const bh = clamp(h, 1.05, 1.38);
    b.addChamferBox(0, bh * 0.46, 0, bw, bh * 0.92, bd, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, bh * 0.94, 0, bw + 0.04, 0.18, bd + 0.04, 0.025, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, bh * 0.84, bd * 0.5 + 0.022, bw * 0.72, 0.12, 0.045, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, bh * 0.84, bd * 0.5 + 0.046, bw * 0.62, 0.045, 0.014, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, 'Book Return', bw * 0.74, 0.18, cfg.accentColor || '#1e4266', '#ffffff', {
      x: 0,
      y: bh * 0.56,
      z: bd * 0.5 + 0.02
    });
  } else if (type === 'sloped_book_trolley') {
    const cw = clamp(w, 0.72, 1.05);
    const cd = clamp(d, 0.42, 0.54);
    const ch = clamp(h, 0.98, 1.18);
    b.addCasterWheels(0, 0, cw - 0.1, cd - 0.08, 0.042, 'rubber', 'frame');
    b.addBox(-cw * 0.46, ch * 0.54, 0, 0.036, ch * 0.88, cd, { materialRole: 'primary', layer: 'body' });
    b.addBox(cw * 0.46, ch * 0.54, 0, 0.036, ch * 0.88, cd, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(-cw * 0.49, ch * 0.88, 0, 0.018, 0.018, cd * 0.82, 8, 'z', 'chrome', 'detail');
    const bookColors = ['accent', 'upholstery', 'secondary', 'whiteTrim'];
    for (let t = 0; t < 3; t++) {
      const sy = 0.24 + t * 0.31;
      b.addBox(0, sy, 0, cw - 0.06, 0.024, cd * 0.88, { materialRole: 'secondary', layer: 'body', rotXDeg: 10 });
      b.addBox(0, sy + 0.06, -cd * 0.16, cw - 0.06, 0.12, 0.022, { materialRole: 'primary', layer: 'body' });
      for (let bk = 0; bk < 5; bk++) {
        const bx = -cw * 0.34 + bk * (cw * 0.16);
        b.addBox(bx, sy + 0.11, 0.02, 0.045, 0.18 + (bk % 2) * 0.03, cd * 0.56, {
          materialRole: bookColors[(t + bk) % bookColors.length],
          layer: 'detail',
          rotXDeg: 10
        });
      }
    }
  } else if (type === 'card_catalog_cabinet') {
    const cw = clamp(w, 0.88, 1.25);
    const cd = clamp(d, 0.48, 0.62);
    const ch = clamp(h, 1.28, 1.56);
    const legH = 0.36;
    b.addSupportLegs(0, 0, legH, cw - 0.1, cd - 0.08, 0.045, 'primary');
    const bodyH = ch - legH;
    b.addChamferBox(0, legH + bodyH * 0.5, 0, cw, bodyH, cd, 0.012, { materialRole: 'primary', layer: 'body' });
    const cols = 6;
    const rows = 5;
    const dwW = (cw - 0.08) / cols;
    const dwH = (bodyH - 0.08) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = -cw * 0.5 + 0.04 + dwW * (c + 0.5);
        const dy = legH + 0.04 + dwH * (r + 0.5);
        b.addBox(dx, dy, cd * 0.5 + 0.008, dwW - 0.014, dwH - 0.014, 0.014, { materialRole: 'secondary', layer: 'detail' });
        b.addBox(dx, dy - 0.018, cd * 0.5 + 0.018, dwW * 0.38, 0.024, 0.01, { materialRole: 'brass', layer: 'detail' });
      }
    }
  } else if (type === 'rfid_self_checkout_kiosk') {
    const kw = clamp(w, 0.56, 0.78);
    const kh = clamp(h, 1.42, 1.68);
    b.addChamferBox(0, 0.44, 0, kw, 0.88, 0.56, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.9, 0.04, kw + 0.06, 0.036, 0.64, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.922, 0.12, kw * 0.64, 0.014, 0.34, { materialRole: 'signalGreen', layer: 'detail' });
    b.addBox(0, (kh - 0.9) * 0.5 + 0.9, -0.18, kw * 0.72, kh - 0.9, 0.14, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, kh - 0.24, -0.06, kw * 0.66, 0.36, 0.03, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: -14 });
    objCreateScreenPlane(group, 'desktop_ui', kw * 0.58, 0.28, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: kh - 0.24,
      z: -0.042,
      rotX: degToRad(-14)
    });
    objCreateSignPlane(group, 'Self-Checkout', kw * 0.68, 0.12, cfg.accentColor || '#265c8c', '#ffffff', {
      x: 0,
      y: 0.62,
      z: 0.29
    });
  } else if (type === 'security_gate_pedestal_pair') {
    const span = clamp(w, 1.0, 1.75);
    const gh = clamp(h, 1.48, 1.82);
    for (const sx of [-span * 0.44, span * 0.44]) {
      b.addBox(sx, 0.02, 0, 0.16, 0.04, 0.52, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx, gh * 0.5, -0.2, 0.055, gh, 0.055, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, gh * 0.5, 0.2, 0.055, gh, 0.055, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, gh * 0.5, 0, 0.025, gh - 0.08, 0.36, { materialRole: 'glass', layer: 'detail' });
      b.addBox(sx, gh - 0.04, 0, 0.075, 0.05, 0.46, { materialRole: 'primary', layer: 'body' });
      b.addBox(sx, gh - 0.01, 0.16, 0.04, 0.018, 0.08, { materialRole: 'signalGreen', layer: 'detail' });
    }
  } else {
    // periodical_display_rack
    const rw = clamp(w, 0.85, 1.45);
    const rh = clamp(h, 1.25, 1.72);
    b.addBox(-rw * 0.47, rh * 0.5, 0, 0.036, rh, 0.44, { materialRole: 'primary', layer: 'body' });
    b.addBox(rw * 0.47, rh * 0.5, 0, 0.036, rh, 0.44, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, rh * 0.5, -0.2, rw, rh, 0.024, { materialRole: 'primary', layer: 'body' });
    const shelves = 4;
    const roles = ['accent', 'upholstery', 'warningYellow', 'whiteTrim'];
    for (let i = 0; i < shelves; i++) {
      const sy = 0.28 + i * ((rh - 0.45) / (shelves - 1));
      b.addBox(0, sy, 0.02, rw - 0.06, 0.24, 0.025, { materialRole: 'secondary', layer: 'body', rotXDeg: -18 });
      b.addBox(0, sy - 0.105, 0.08, rw - 0.06, 0.024, 0.11, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(0, sy - 0.082, 0.13, rw - 0.06, 0.028, 0.012, { materialRole: 'frame', layer: 'detail' });
      for (let m = 0; m < 4; m++) {
        const mx = -rw * 0.34 + m * (rw * 0.225);
        b.addBox(mx, sy + 0.012, 0.044, rw * 0.18, 0.21, 0.014, { materialRole: roles[(i + m) % roles.length], layer: 'detail', rotXDeg: -18 });
      }
    }
  }

  meta.interaction = { interactable: true, actionType: 'use_library_fixture', libraryType: type };
}

export function registerOfficeStorageAndPartitionsFamilies() {
  registerObjectFamily({
    id: 'filing_cabinet',
    categoryId: 'office_public_interiors',
    subcategory: 'Filing, Storage & Mailrooms',
    subcategories: ['Filing, Storage & Mailrooms'],
    label: 'Filing Cabinets, Safes & Storage',
    description: 'Vertical and lateral steel filing cabinets with openable drawers, rolling pedestals, supply cupboards, and map chests.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'storage_room', 'utility_room', 'municipal', 'medical'],
    architecturalStyle: 'budget_office',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['filing_cabinet', 'drawers', 'storage', 'safe', 'locker', 'records'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Cabinet Format' },
      {
        key: 'cabinetType',
        name: 'Cabinet Type',
        type: 'select',
        options: [
          ['vertical_drawer', 'Vertical Filing Cabinet'],
          ['lateral_wide', 'Wide Lateral File Cabinet'],
          ['rolling_pedestal', 'Under-Desk Rolling Pedestal'],
          ['tall_supply_cupboard', 'Steel Supply Cupboard'],
          ['fireproof_safe_cabinet', 'Fireproof Security Safe'],
          ['blueprint_flat_file', 'Architectural Flat-File Chest']
        ],
        default: 'vertical_drawer'
      },
      { key: 'drawerCount', name: 'Drawer Count', type: 'number', min: 2, max: 6, step: 1, default: 4 },
      { key: 'width', name: 'Width', type: 'number', min: 0.36, max: 1.35, step: 0.04, unit: 'm', default: 0.46 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.42, max: 0.85, step: 0.04, unit: 'm', default: 0.62 },
      { key: 'height', name: 'Height', type: 'number', min: 0.52, max: 2.05, step: 0.05, unit: 'm', default: 1.34 },
      { group: 'Drawer State' },
      { key: 'openDrawerIndex', name: 'Open Drawer Index', type: 'number', min: 0, max: 5, step: 1, default: 0 },
      { key: 'topLock', name: 'Key Lock Cylinder', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'standard_4drawer_vertical_file',
        label: '4-Drawer Vertical Filing Cabinet',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#7a838c',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#8d969f',
        accentColor: '#d9b56c',
        frameColor: '#485057',
        params: { cabinetType: 'vertical_drawer', drawerCount: 4, width: 0.46, height: 1.34, openDrawerIndex: 0 }
      },
      {
        id: 'wide_lateral_records_cabinet',
        label: 'Wide Lateral File Cabinet',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cfd5db',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#dce2e8',
        accentColor: '#3675a8',
        frameColor: '#39414a',
        params: { cabinetType: 'lateral_wide', drawerCount: 3, width: 0.94, height: 1.06, openDrawerIndex: 1 }
      },
      {
        id: 'rolling_underdesk_pedestal',
        label: 'Mobile 3-Drawer Pedestal',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#374049',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#47525e',
        accentColor: '#408fd1',
        frameColor: '#22272c',
        params: { cabinetType: 'rolling_pedestal', drawerCount: 3, width: 0.42, depth: 0.54, height: 0.62 }
      },
      {
        id: 'tall_stationery_cupboard',
        label: 'Double-Door Supply Cupboard',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#707b85',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#859099',
        accentColor: '#c98836',
        frameColor: '#464f57',
        params: { cabinetType: 'tall_supply_cupboard', width: 0.92, depth: 0.48, height: 1.85 }
      },
      {
        id: 'fireproof_record_safe',
        label: 'Fireproof Combo Security Safe',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#3c434a',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#525b63',
        accentColor: '#d99e36',
        frameColor: '#21262b',
        params: { cabinetType: 'fireproof_safe_cabinet', width: 0.64, depth: 0.6, height: 1.05 }
      },
      {
        id: 'blueprint_flat_file_chest',
        label: '6-Drawer Blueprint Map Chest',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#5d6b75',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#73828d',
        accentColor: '#3c85b8',
        frameColor: '#333b42',
        params: { cabinetType: 'blueprint_flat_file', drawerCount: 6, width: 1.15, depth: 0.78, height: 0.88, openDrawerIndex: 2 }
      }
    ],
    buildGeometry: ospBuildFilingCabinet
  });

  registerObjectFamily({
    id: 'office_shelving_mailroom',
    categoryId: 'office_public_interiors',
    subcategory: 'Filing, Storage & Mailrooms',
    subcategories: ['Filing, Storage & Mailrooms'],
    label: 'Mailroom Sorters, Bookcases & Racks',
    description: 'Pigeonhole mailroom sorters, populated office bookcases, bankers box archive racks, and delivery carts.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'storage_room', 'library', 'utility_room', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['bookcase', 'shelving', 'mailroom', 'archive', 'cart', 'pigeonholes'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Unit Geometry' },
      {
        key: 'unitType',
        name: 'Storage Type',
        type: 'select',
        options: [
          ['bookcase_office', 'Office Bookcase'],
          ['mailroom_sorting_pigeonholes', 'Mailroom Sorter Console'],
          ['industrial_archive_rack', 'Archive Bankers Box Rack'],
          ['supply_rolling_cart', 'Rolling Mail & Supply Cart']
        ],
        default: 'bookcase_office'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.55, max: 2.2, step: 0.05, unit: 'm', default: 1.15 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.28, max: 0.75, step: 0.04, unit: 'm', default: 0.38 },
      { key: 'height', name: 'Height', type: 'number', min: 0.85, max: 2.35, step: 0.05, unit: 'm', default: 1.95 },
      { key: 'shelfCount', name: 'Shelf Tiers', type: 'number', min: 2, max: 7, step: 1, default: 5 },
      { key: 'pigeonholeCols', name: 'Mail Sorter Columns', type: 'number', min: 3, max: 8, step: 1, default: 5 },
      { key: 'populateItems', name: 'Populate Books & Boxes', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'executive_mahogany_bookcase',
        label: 'Executive Wood Bookcase',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c341f',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#482817',
        accentColor: '#36688f',
        frameColor: '#291a10',
        params: { unitType: 'bookcase_office', width: 1.1, height: 1.95, shelfCount: 5 }
      },
      {
        id: 'library_double_bookcase',
        label: 'Public Library Tall Shelving',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b98f61',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#a37b50',
        accentColor: '#2d688f',
        frameColor: '#3b332c',
        params: { unitType: 'bookcase_office', width: 1.65, height: 2.15, shelfCount: 6 }
      },
      {
        id: 'mailroom_pigeonhole_station',
        label: 'Corporate Mailroom Sorter Station',
        paletteFamily: 'budget_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d0c9bd',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#8d969f',
        accentColor: '#386f9c',
        frameColor: '#424b54',
        params: { unitType: 'mailroom_sorting_pigeonholes', width: 1.5, depth: 0.56, height: 1.95, shelfCount: 4, pigeonholeCols: 5 }
      },
      {
        id: 'archive_bankers_box_rack',
        label: 'Archive Room Steel Rack',
        paletteFamily: 'industrial_loft_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#58626b',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8b959e',
        accentColor: '#2e6da6',
        frameColor: '#333a42',
        params: { unitType: 'industrial_archive_rack', width: 1.4, depth: 0.5, height: 1.9, shelfCount: 4 }
      },
      {
        id: 'rolling_mail_supply_cart',
        label: 'Two-Tier Mailroom Delivery Cart',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#46525e',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c4cdd6',
        accentColor: '#c98842',
        frameColor: '#2c333b',
        params: { unitType: 'supply_rolling_cart', width: 0.92, depth: 0.52, height: 0.95 }
      },
      {
        id: 'open_office_low_credenza',
        label: 'Low Laminate Credenza Shelf',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e2dcd2',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#cbc4b9',
        accentColor: '#34688f',
        frameColor: '#3c434a',
        params: { unitType: 'bookcase_office', width: 1.5, depth: 0.42, height: 0.92, shelfCount: 3 }
      }
    ],
    buildGeometry: ospBuildShelvingAndMailroom
  });

  registerObjectFamily({
    id: 'cubicle_partition',
    categoryId: 'office_public_interiors',
    subcategory: 'Cubicles & Office Partitions',
    subcategories: ['Cubicles & Office Partitions'],
    label: 'Cubicle Walls, Screens & Dividers',
    description: 'Acoustic fabric panels, glass transoms, L/U cubicle bays, mobile whiteboard dividers, and clamp desk screens.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'furniture_attached'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['cubicle', 'partition', 'divider', 'acoustic', 'privacy_screen', 'whiteboard'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Partition Geometry' },
      {
        key: 'partitionLayout',
        name: 'Layout Mode',
        type: 'select',
        options: [
          ['single_panel', 'Single Partition Wall'],
          ['corner_l_panel', 'L-Corner Partition'],
          ['u_bay_cubicle', '3-Wall Cubicle Bay'],
          ['rolling_whiteboard_divider', 'Rolling Whiteboard Divider'],
          ['desk_privacy_screen', 'Desk Clamp Privacy Screen']
        ],
        default: 'single_panel'
      },
      { key: 'width', name: 'Panel Span', type: 'number', min: 0.75, max: 2.4, step: 0.05, unit: 'm', default: 1.55 },
      { key: 'height', name: 'Panel Height', type: 'number', min: 0.42, max: 2.25, step: 0.05, unit: 'm', default: 1.48 },
      { key: 'thickness', name: 'Wall Thickness', type: 'number', min: 0.03, max: 0.12, step: 0.01, unit: 'm', default: 0.065 },
      { group: 'Trim & Storage' },
      { key: 'glassTop', name: 'Upper Glass Transom', type: 'boolean', default: false },
      { key: 'baseFeet', name: 'Freestanding Stabilizer Feet', type: 'boolean', default: true },
      { key: 'overheadBin', name: 'Cubicle Overhead Binder', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'fabric_glass_cubicle_wall',
        label: 'Fabric & Glass Cubicle Panel',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#5c6670',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#6b7d8f',
        accentColor: '#3b7bb0',
        frameColor: '#454e57',
        params: { partitionLayout: 'single_panel', width: 1.55, height: 1.52, glassTop: true, baseFeet: true }
      },
      {
        id: 'full_u_bay_cubicle_enclosure',
        label: '3-Wall Standard Office Cubicle',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#8d877c',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#c9c2b6',
        accentColor: '#47688a',
        frameColor: '#585f66',
        params: { partitionLayout: 'u_bay_cubicle', width: 1.75, height: 1.55, glassTop: false, overheadBin: true }
      },
      {
        id: 'l_corner_cubicle_divider',
        label: 'L-Shaped Corner Cubicle Wing',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#4e6378',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd6de',
        accentColor: '#3996db',
        frameColor: '#444c54',
        params: { partitionLayout: 'corner_l_panel', width: 1.5, height: 1.4, glassTop: true }
      },
      {
        id: 'mobile_whiteboard_room_divider',
        label: 'Rolling Whiteboard Partition',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#c8d0d8',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f5f7fa',
        accentColor: '#2d99d6',
        frameColor: '#38414a',
        params: { partitionLayout: 'rolling_whiteboard_divider', width: 1.65, height: 1.85 }
      },
      {
        id: 'acoustic_desk_clamp_screen',
        label: 'Clamp-On Acoustic Desk Screen',
        attachmentProfile: 'furniture_attached',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#387d76',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#44968d',
        accentColor: '#f0aa42',
        frameColor: '#98a3ad',
        params: { partitionLayout: 'desk_privacy_screen', width: 1.35, height: 0.45, glassTop: false }
      },
      {
        id: 'retro_90s_beige_cubicle_wall',
        label: '1990s Beige Acoustic Wall',
        paletteFamily: 'retro_90s_office',
        condition: 'lightly_worn',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#aba391',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#c9c1af',
        accentColor: '#665b4c',
        frameColor: '#696256',
        params: { partitionLayout: 'single_panel', width: 1.5, height: 1.62, glassTop: false, baseFeet: true }
      }
    ],
    buildGeometry: ospBuildCubiclePartition
  });

  registerObjectFamily({
    id: 'coworking_training_furniture',
    categoryId: 'office_public_interiors',
    subcategory: 'Coworking, Training & Shared Workspaces',
    subcategories: ['Coworking, Training & Shared Workspaces'],
    label: 'Whiteboards, Lecterns & Focus Booths',
    description: 'Wall-mounted presentation whiteboards, speaker podiums, nesting training tables, and soundproof phone booths.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['coworking', 'conference', 'office', 'library', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['whiteboard', 'lectern', 'podium', 'phone_booth', 'training', 'coworking'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Workspace Prop' },
      {
        key: 'itemType',
        name: 'Item Type',
        type: 'select',
        options: [
          ['wall_whiteboard', 'Wall-Mounted Whiteboard'],
          ['speaker_lectern', 'Presentation Podium / Lectern'],
          ['acoustic_phone_booth', 'Acoustic Focus Phone Booth'],
          ['training_table', 'Rolling Training Desk']
        ],
        default: 'wall_whiteboard'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.55, max: 2.4, step: 0.05, unit: 'm', default: 1.65 },
      { key: 'height', name: 'Height', type: 'number', min: 0.72, max: 2.25, step: 0.05, unit: 'm', default: 1.05 },
      { key: 'signText', name: 'Placard / Banner Text', type: 'text', maxLength: 24, default: 'Keynote Stage' }
    ],
    presets: [
      {
        id: 'wall_conference_whiteboard',
        label: 'Magnetic Wall Whiteboard',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd6de',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f5f7fa',
        accentColor: '#3687c9',
        frameColor: '#66717d',
        params: { itemType: 'wall_whiteboard', width: 1.85, height: 1.1 }
      },
      {
        id: 'acoustic_solo_phone_booth',
        label: 'Coworking Soundproof Phone Booth',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#ba9266',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#364f66',
        accentColor: '#3aa69b',
        frameColor: '#262d36',
        params: { itemType: 'acoustic_phone_booth', width: 1.05, height: 2.2 }
      },
      {
        id: 'corporate_speaker_lectern',
        label: 'Presentation Podium & Mic',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c3621',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#73442a',
        accentColor: '#1f4469',
        frameColor: '#23282e',
        params: { itemType: 'speaker_lectern', width: 0.68, height: 1.16, signText: 'City Summit' }
      },
      {
        id: 'nested_training_desk',
        label: 'Rolling Classroom Training Table',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#eceff2',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#cfd6de',
        accentColor: '#3a7fb8',
        frameColor: '#8d969f',
        params: { itemType: 'training_table', width: 1.5, height: 0.74 }
      },
      {
        id: 'civic_hearing_lectern',
        label: 'Municipal Public Comment Lectern',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#aa7b4c',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#855a34',
        accentColor: '#2b547e',
        frameColor: '#282d33',
        params: { itemType: 'speaker_lectern', width: 0.64, height: 1.14, signText: 'Public Hearing' }
      }
    ],
    buildGeometry: ospBuildCoworkingAndTraining
  });

  registerObjectFamily({
    id: 'library_study_fixture',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '25_malls_libraries'],
    subcategory: 'Filing, Storage & Mailrooms',
    subcategories: ['Filing, Storage & Mailrooms', 'Coworking, Training & Shared Workspaces', 'Desks & Workstations', 'Library Study & Checkouts'],
    label: 'Library Study Carrels, Book Carts & Checkout',
    description: 'Privacy wooden study carrels, book return drop bins, sloped book carts, 30-drawer card catalogs, Rfid checkouts, and periodical racks.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['library', 'public_service', 'coworking', 'office'],
    architecturalStyle: 'municipal',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['library', 'carrel', 'book_cart', 'book_drop', 'card_catalog', 'rfid', 'periodical'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Library Fixture' },
      {
        key: 'libraryType',
        name: 'Fixture Class',
        type: 'select',
        options: [
          ['study_carrel_desk', 'Wooden Study Carrel Booth'],
          ['book_drop_return_bin', 'Book Return Drop Bin'],
          ['sloped_book_trolley', 'Rolling Sloped Book Cart'],
          ['card_catalog_cabinet', '30-Drawer Card Catalog'],
          ['rfid_self_checkout_kiosk', 'Rfid Self-Checkout Kiosk'],
          ['security_gate_pedestal_pair', 'Rfid Book Security Gate Pair'],
          ['periodical_display_rack', 'Periodical & Magazine Rack']
        ],
        default: 'study_carrel_desk'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.56, max: 1.85, step: 0.05, unit: 'm', default: 1.05 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.42, max: 0.92, step: 0.04, unit: 'm', default: 0.72 },
      { key: 'height', name: 'Height', type: 'number', min: 0.95, max: 1.88, step: 0.04, unit: 'm', default: 1.38 }
    ],
    presets: [
      {
        id: 'library_wood_study_carrel',
        label: 'Library Privacy Study Carrel',
        subcategory: 'Desks & Workstations',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b38659',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#9c7148',
        accentColor: '#2d5c82',
        frameColor: '#3d332a',
        params: { libraryType: 'study_carrel_desk', width: 1.04, depth: 0.74, height: 1.36 }
      },
      {
        id: 'library_book_return_drop_box',
        label: 'Library Book Return Drop Bin',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c527a',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#487099',
        accentColor: '#1f4469',
        frameColor: '#232b33',
        params: { libraryType: 'book_drop_return_bin', width: 0.68, depth: 0.62, height: 1.24 }
      },
      {
        id: 'library_sloped_book_truck',
        label: 'Rolling Library Reshelving Book Cart',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3f5f82',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#56799e',
        accentColor: '#c9563c',
        frameColor: '#252b30',
        params: { libraryType: 'sloped_book_trolley', width: 0.86, depth: 0.46, height: 1.08 }
      },
      {
        id: 'vintage_library_card_catalog',
        label: '30-Drawer Library Card Catalog',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'classic_executive',
        condition: 'lightly_worn',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#7a4928',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#945d36',
        accentColor: '#c99b3b',
        frameColor: '#3b2416',
        params: { libraryType: 'card_catalog_cabinet', width: 1.06, depth: 0.52, height: 1.42 }
      },
      {
        id: 'library_rfid_checkout_station',
        label: 'Library Self-Checkout Rfid Kiosk',
        subcategory: 'Coworking, Training & Shared Workspaces',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e4e8ed',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#b58b60',
        accentColor: '#2d75a8',
        frameColor: '#2c343d',
        params: { libraryType: 'rfid_self_checkout_kiosk', width: 0.64, depth: 0.58, height: 1.54 }
      },
      {
        id: 'library_anti_theft_gate_pair',
        label: 'Library Rfid Security Gate Pair',
        subcategory: 'Coworking, Training & Shared Workspaces',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'glass',
        secondaryColor: '#7fb5cf',
        accentColor: '#36c982',
        frameColor: '#2e3640',
        params: { libraryType: 'security_gate_pedestal_pair', width: 1.35, depth: 0.52, height: 1.66 }
      },
      {
        id: 'library_periodical_magazine_rack',
        label: 'Slanted Periodical & Newspaper Rack',
        subcategory: 'Filing, Storage & Mailrooms',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b58859',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#9e7246',
        accentColor: '#2b5c82',
        frameColor: '#3d332a',
        params: { libraryType: 'periodical_display_rack', width: 1.15, depth: 0.48, height: 1.48 }
      }
    ],
    buildGeometry: ospBuildLibraryStudyFixture
  });
}
