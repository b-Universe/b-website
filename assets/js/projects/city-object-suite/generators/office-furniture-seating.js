import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

export function ofsBuildOfficeDesk(group, cfg, b, mats, meta) {
  const style = cfg.deskStyle || 'rectangular';
  const rawW = clamp(cfg.width || 1.5, 0.9, 2.4);
  const w = style === 'u_shaped' ? Math.max(rawW, 2.05) : rawW;
  const d = clamp(cfg.depth || 0.75, 0.52, 1.15);
  const h = clamp(cfg.height || 0.74, 0.65, 1.18);
  const topT = clamp(cfg.topThickness || 0.036, 0.02, 0.07);
  const pedestalSide = cfg.pedestalConfig || 'right_single';
  const openDrawerIdx = Math.round(cfg.openDrawer || 0);
  const isStanding = style === 'standing_adjustable';
  const topY = h - topT * 0.5;
  const underTopY = h - topT;

  // Main work surface
  b.addChamferBox(0, topY, 0, w, topT, d, 0.008, { materialRole: 'primary', layer: 'body' });

  // Return wings for L-shaped (right side) or open-center U-shaped (left + right arms) desks
  const wingLen = clamp(cfg.returnLength || (style === 'u_shaped' ? 1.3 : 1.05), 0.6, 1.65);
  const wingD = style === 'u_shaped'
    ? clamp(Math.min(d * 0.64, w * 0.24), 0.42, 0.52)
    : clamp(d * 0.78, 0.46, 0.78);
  if (style === 'l_shaped' || style === 'u_shaped') {
    const rx = w * 0.5 - wingD * 0.5;
    const rz = d * 0.5 + wingLen * 0.5;
    b.addChamferBox(rx, topY, rz, wingD, topT, wingLen, 0.008, { materialRole: 'primary', layer: 'body' });
    b.addBox(rx, underTopY * 0.5, d * 0.5 + wingLen - 0.06, wingD - 0.05, underTopY, 0.045, { materialRole: 'secondary', layer: 'body' });
  }
  if (style === 'u_shaped') {
    const lx = -w * 0.5 + wingD * 0.5;
    const lz = d * 0.5 + wingLen * 0.5;
    b.addChamferBox(lx, topY, lz, wingD, topT, wingLen, 0.008, { materialRole: 'primary', layer: 'body' });
    b.addBox(lx, underTopY * 0.5, d * 0.5 + wingLen - 0.06, wingD - 0.05, underTopY, 0.045, { materialRole: 'secondary', layer: 'body' });
  }

  // Cable grommets on surface
  if (cfg.cableGrommets) {
    b.addCylinder(-w * 0.34, h + 0.003, -d * 0.32, 0.032, 0.035, 0.008, 8, 'y', 'darkMetal', 'detail');
    b.addCylinder(w * 0.34, h + 0.003, -d * 0.32, 0.032, 0.035, 0.008, 8, 'y', 'darkMetal', 'detail');
  }

  // Framing, legs, or standing lift columns
  if (style === 'executive_solid' || style === 'teacher_desk') {
    const panelInsetX = w * 0.46;
    b.addBox(-panelInsetX, underTopY * 0.5, 0, 0.045, underTopY, d - 0.06, { materialRole: 'secondary', layer: 'body' });
    b.addBox(panelInsetX, underTopY * 0.5, 0, 0.045, underTopY, d - 0.06, { materialRole: 'secondary', layer: 'body' });
  } else if (isStanding) {
    const colX = w * 0.38;
    for (const sx of [-colX, colX]) {
      b.addBox(sx, 0.025, 0, 0.075, 0.045, d * 0.86, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx, (underTopY - 0.04) * 0.35 + 0.04, 0, 0.075, underTopY * 0.62, 0.075, { materialRole: 'frame', layer: 'body' });
      b.addBox(sx, underTopY * 0.72, 0, 0.058, underTopY * 0.52, 0.058, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, underTopY - 0.025, 0, 0.06, 0.03, d * 0.74, { materialRole: 'frame', layer: 'detail' });
    }
    b.addBox(0, underTopY - 0.035, -0.05, w * 0.74, 0.04, 0.04, { materialRole: 'frame', layer: 'detail' });
    // Motorized keypad controller under right front edge
    b.addBox(w * 0.35, underTopY - 0.02, d * 0.46, 0.11, 0.025, 0.055, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(w * 0.35, underTopY - 0.02, d * 0.49, 0.03, 0.012, 0.008, { materialRole: 'signalGreen', layer: 'detail' });
  } else if (style === 'drafting_table') {
    const tiltRad = degToRad(clamp(cfg.surfaceTiltDeg || 16, 0, 35));
    b.addSupportLegs(0, 0, underTopY - 0.04, w * 0.82, d * 0.76, 0.05, 'frame');
    b.addBox(0, underTopY + 0.025, d * 0.44, w * 0.94, 0.025, 0.03, { materialRole: 'chrome', layer: 'detail', rotX: -tiltRad });
  } else {
    b.addSupportLegs(0, 0, underTopY, w - 0.08, d - 0.08, 0.044, 'frame');
    b.addBox(0, underTopY - 0.03, -d * 0.44, w - 0.12, 0.045, 0.03, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, underTopY - 0.03, d * 0.4, w - 0.12, 0.035, 0.025, { materialRole: 'frame', layer: 'body' });
  }

  // Modesty panel
  if (cfg.modestyPanel && !isStanding) {
    const modH = clamp(underTopY * 0.56, 0.28, 0.48);
    b.addBox(0, underTopY - modH * 0.5 - 0.02, -d * 0.42, w - 0.14, modH, 0.024, { materialRole: 'secondary', layer: 'body' });
  }

  // Keyboard tray
  if (cfg.keyboardTray) {
    b.addBox(-0.08, underTopY - 0.055, d * 0.5 + 0.08, 0.56, 0.018, 0.24, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-0.14, underTopY - 0.04, d * 0.5 + 0.08, 0.34, 0.014, 0.12, { materialRole: 'frame', layer: 'detail' });
  }

  // Drawer pedestals
  const drawPedestal = (px, pz, pedW, pedD, drawerCount) => {
    const pedH = Math.min(underTopY - 0.06, 0.62);
    const pedBottom = style === 'executive_solid' ? 0.04 : underTopY - pedH;
    const pedCY = pedBottom + pedH * 0.5;
    b.addBox(px, pedCY, pz, pedW, pedH, pedD, { materialRole: 'secondary', layer: 'body' });
    const dwH = (pedH - 0.04) / drawerCount;
    for (let i = 0; i < drawerCount; i++) {
      const pull = openDrawerIdx === i + 1 ? 0.16 : 0;
      const dy = pedBottom + pedH - 0.025 - (i + 0.5) * dwH;
      const dz = pz + pedD * 0.5 + 0.012 + pull;
      b.addBox(px, dy, dz, pedW - 0.025, dwH - 0.015, 0.02, { materialRole: 'accent', layer: 'detail' });
      b.addBox(px, dy + dwH * 0.12, dz + 0.018, pedW * 0.34, 0.014, 0.016, { materialRole: 'chrome', layer: 'detail' });
      if (pull > 0) {
        b.addBox(px, dy - dwH * 0.1, dz - pedD * 0.28, pedW - 0.05, dwH * 0.72, pedD * 0.55, { materialRole: 'whiteTrim', layer: 'detail' });
      }
    }
  };

  const pedWStd = style === 'u_shaped' ? clamp(wingD - 0.06, 0.32, 0.44) : clamp(w * 0.26, 0.34, 0.46);
  const pedDStd = style === 'u_shaped' ? clamp(wingLen * 0.52, 0.36, 0.56) : (d - 0.09);
  const pedZStd = style === 'u_shaped' ? (d * 0.5 + wingLen - pedDStd * 0.5 - 0.09) : 0.01;
  const pedXOff = style === 'u_shaped' ? (w * 0.5 - wingD * 0.5) : (w * 0.5 - 0.24);

  if (pedestalSide === 'left_single' || pedestalSide === 'dual') {
    drawPedestal(-pedXOff, pedZStd, pedWStd, pedDStd, 3);
  }
  if (pedestalSide === 'right_single' || pedestalSide === 'dual') {
    drawPedestal(pedXOff, pedZStd, pedWStd, pedDStd, 3);
  }

  // Hutch / overhead bookshelf on executive or cubicle desks
  if (cfg.overheadHutch) {
    const hutchH = 0.48;
    const hutchD = clamp(d * 0.42, 0.26, 0.38);
    const hz = -d * 0.5 + hutchD * 0.5;
    b.addBox(-w * 0.48 + 0.02, h + hutchH * 0.5, hz, 0.035, hutchH, hutchD, { materialRole: 'secondary', layer: 'body' });
    b.addBox(w * 0.48 - 0.02, h + hutchH * 0.5, hz, 0.035, hutchH, hutchD, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, h + hutchH - 0.018, hz, w - 0.02, 0.035, hutchD, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h + hutchH * 0.5, -d * 0.5 + 0.012, w - 0.04, hutchH - 0.02, 0.02, { materialRole: 'frame', layer: 'detail' });
  }

  meta.surfaceRelationship = {
    isSupportSurface: true,
    surfaceHeightMeters: h,
    usableAreaSqM: Number((w * d * 0.85).toFixed(3))
  };
  meta.snapAnchors.push(
    { id: 'monitor_slot', position: [0, h, -d * 0.24], normal: [0, 1, 0] },
    { id: 'keyboard_slot', position: [0, h, d * 0.18], normal: [0, 1, 0] },
    { id: 'lamp_slot', position: [-w * 0.36, h, -d * 0.22], normal: [0, 1, 0] },
    { id: 'chair_dock', position: [0, 0, d * 0.65], normal: [0, 0, 1] }
  );
  meta.interaction = { interactable: true, actionType: 'desk_workstation', surfaceHeightMeters: h };
}

function ofsBuildOfficeChair(group, cfg, b, mats, meta) {
  const style = cfg.chairStyle || 'ergonomic_task';
  const seatW = clamp(cfg.seatWidth || 0.5, 0.4, 0.66);
  const seatD = clamp(cfg.seatDepth || 0.48, 0.38, 0.6);
  const seatH = clamp(cfg.seatHeight || 0.46, 0.38, 0.58);
  const backH = clamp(cfg.backrestHeight || 0.54, 0.32, 0.78);
  const armrestStyle = cfg.armrestStyle || 'adjustable_t';
  const hasWheels = cfg.casterBase !== false && style !== 'visitor_sled' && style !== 'drafting_stool';
  const isSled = style === 'visitor_sled';
  const isStool = style === 'drafting_stool';
  const effSeatH = isStool ? Math.max(seatH, 0.66) : seatH;

  // Base geometry: 5-star caster spider vs sled rails
  if (isSled) {
    const legX = seatW * 0.45;
    for (const sx of [-legX, legX]) {
      b.addBox(sx, 0.016, 0, 0.028, 0.028, seatD + 0.06, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, effSeatH * 0.48, seatD * 0.42, 0.028, effSeatH - 0.04, 0.028, { materialRole: 'chrome', layer: 'body' });
    }
    b.addBox(0, 0.016, -seatD * 0.44, legX * 2, 0.024, 0.024, { materialRole: 'chrome', layer: 'body' });
  } else {
    const spokes = 5;
    const armLen = clamp(seatW * 0.62, 0.26, 0.38);
    const hubY = 0.085;
    b.addCylinder(0, hubY, 0, 0.046, 0.054, 0.06, 8, 'y', 'chrome', 'body');
    for (let i = 0; i < spokes; i++) {
      const ang = (i / spokes) * Math.PI * 2;
      const dx = Math.sin(ang);
      const dz = Math.cos(ang);
      b.addPipeSegment(0, hubY, 0, dx * armLen, 0.055, dz * armLen, 0.018, 6, 'chrome', 'body');
      if (hasWheels) {
        b.addCylinder(dx * armLen, 0.026, dz * armLen, 0.026, 0.026, 0.024, 8, 'x', 'rubber', 'detail', ang);
      } else {
        b.addCylinder(dx * armLen, 0.016, dz * armLen, 0.024, 0.028, 0.026, 8, 'y', 'rubber', 'detail');
      }
    }
    const liftH = effSeatH - 0.14;
    b.addCylinder(0, hubY + liftH * 0.5, 0, 0.026, 0.032, liftH, 8, 'y', 'darkMetal', 'body');
    if (isStool) {
      // Chrome footring
      const r = armLen * 0.82;
      for (let i = 0; i < 8; i++) {
        const a1 = (i / 8) * Math.PI * 2;
        const a2 = ((i + 1) / 8) * Math.PI * 2;
        b.addPipeSegment(Math.sin(a1) * r, 0.25, Math.cos(a1) * r, Math.sin(a2) * r, 0.25, Math.cos(a2) * r, 0.011, 6, 'chrome', 'detail');
      }
    }
    // Tilt mechanism box & lever
    b.addBox(0, effSeatH - 0.055, 0, 0.18, 0.05, 0.2, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(seatW * 0.34, effSeatH - 0.065, 0.04, 0.16, 0.012, 0.018, { materialRole: 'frame', layer: 'detail' });
  }

  // Seat cushion
  const cushionT = style === 'executive_leather' ? 0.11 : 0.075;
  b.addChamferBox(0, effSeatH, 0, seatW, cushionT, seatD, 0.018, { materialRole: 'upholstery', layer: 'body' });
  b.addBox(0, effSeatH - cushionT * 0.45, 0, seatW * 0.92, 0.022, seatD * 0.9, { materialRole: 'darkMetal', layer: 'body' });

  // Spine bracket + Backrest
  const spineZ = -seatD * 0.46;
  b.addBox(0, effSeatH + backH * 0.28, spineZ - 0.02, 0.065, backH * 0.58, 0.03, { materialRole: 'frame', layer: 'body', rotXDeg: -8 });
  const backCY = effSeatH + cushionT * 0.4 + backH * 0.5;
  const backMat = style === 'ergonomic_task' ? 'upholstery' : 'secondary';
  b.addChamferBox(0, backCY, spineZ + 0.015, seatW * 0.88, backH, 0.065, 0.018, { materialRole: backMat, layer: 'body', rotXDeg: -6 });
  if (cfg.lumbarPad) {
    b.addChamferBox(0, effSeatH + backH * 0.28, spineZ + 0.045, seatW * 0.72, 0.11, 0.036, 0.012, { materialRole: 'accent', layer: 'detail' });
  }
  if (cfg.headrest || style === 'executive_leather') {
    b.addChamferBox(0, effSeatH + backH + 0.11, spineZ - 0.015, seatW * 0.56, 0.14, 0.055, 0.016, { materialRole: 'upholstery', layer: 'detail', rotXDeg: 6 });
  }

  // Armrests
  if (armrestStyle !== 'none') {
    const ax = seatW * 0.52;
    for (const sx of [-ax, ax]) {
      b.addBox(sx, effSeatH + 0.09, 0.02, 0.032, 0.22, 0.036, { materialRole: 'frame', layer: 'body' });
      if (armrestStyle === 'loop_fixed') {
        b.addBox(sx, effSeatH + 0.2, -0.02, 0.048, 0.036, seatD * 0.62, { materialRole: 'frame', layer: 'body' });
        b.addBox(sx, effSeatH + 0.12, -seatD * 0.28, 0.032, 0.18, 0.036, { materialRole: 'frame', layer: 'body' });
      } else {
        b.addChamferBox(sx, effSeatH + 0.2, 0.04, 0.068, 0.028, 0.26, 0.008, { materialRole: 'rubber', layer: 'detail' });
      }
    }
  }

  meta.snapAnchors.push({ id: 'seat_center', position: [0, effSeatH + cushionT * 0.5, 0], normal: [0, 1, 0] });
  meta.interaction = {
    interactable: true,
    actionType: 'sit_office_chair',
    seatPosition: [0, Number((effSeatH + cushionT * 0.5).toFixed(3)), 0],
    seatHeightMeters: Number((effSeatH + cushionT * 0.5).toFixed(3))
  };
}

function ofsBuildWaitingSeating(group, cfg, b, mats, meta) {
  const style = cfg.seatingStyle || 'tandem_beam';
  const seats = clamp(Math.round(cfg.seatCount || 3), 1, 6);
  const stdSeatW = clamp(cfg.unitWidth || 0.54, 0.45, 0.72);
  const isTandem = style === 'tandem_beam' || style === 'tandem_accessible';
  const reqHandicap = Math.max(0, Math.round(cfg.accessibleSeatCount || 0));
  const handicapCount = style === 'tandem_accessible'
    ? Math.max(1, Math.min(seats, reqHandicap || 1))
    : Math.min(seats, reqHandicap);
  const wideSeatW = clamp(stdSeatW * 1.6, 0.82, 0.98);
  const seatGap = 0.06;
  const seatWidths = [];
  for (let s = 0; s < seats; s++) {
    seatWidths.push(s < handicapCount ? wideSeatW : stdSeatW);
  }
  const tandemTotalW = seatWidths.reduce((sum, sw) => sum + sw, 0) + Math.max(0, seats - 1) * seatGap;
  const w = isTandem ? tandemTotalW : clamp(cfg.unitWidth || seats * 0.62, 0.7, 2.4);
  const d = clamp(cfg.depth || 0.66, 0.52, 0.92);
  const seatH = 0.44;

  if (isTandem) {
    // Airport/hospital/DMV horizontal steel beam bench supporting standard & wide bariatric/handicap bays
    b.addBox(0, seatH - 0.12, 0, w * 0.94, 0.06, 0.07, { materialRole: 'frame', layer: 'body' });
    const legCount = Math.max(2, Math.ceil(w / 1.05) + 1);
    for (let i = 0; i < legCount; i++) {
      const lx = legCount === 1 ? 0 : -w * 0.44 + (i / (legCount - 1)) * (w * 0.88);
      b.addBox(lx, 0.02, 0, 0.055, 0.04, d * 0.88, { materialRole: 'chrome', layer: 'body' });
      b.addBox(lx, (seatH - 0.12) * 0.5, 0, 0.05, seatH - 0.14, 0.06, { materialRole: 'chrome', layer: 'body' });
    }
    let cursorX = -w * 0.5;
    if (cfg.dividingArmrests) {
      b.addBox(-w * 0.5 - 0.015, seatH + 0.12, 0.02, 0.028, 0.2, d * 0.5, { materialRole: 'chrome', layer: 'detail' });
    }
    for (let s = 0; s < seats; s++) {
      const sw = seatWidths[s];
      const isWide = s < handicapCount;
      const sx = cursorX + sw * 0.5;
      const cushionThick = isWide ? 0.08 : 0.065;
      const seatDepthScale = isWide ? 0.74 : 0.68;
      const backH = isWide ? 0.44 : 0.4;
      b.addChamferBox(sx, seatH, 0.04, sw - 0.04, cushionThick, d * seatDepthScale, 0.014, { materialRole: 'upholstery', layer: 'body' });
      b.addChamferBox(sx, seatH + 0.24, -d * 0.3, sw - 0.04, backH, 0.055, 0.014, { materialRole: 'upholstery', layer: 'body', rotXDeg: -7 });
      if (isWide) {
        // Dual under-seat structural frame + accessible top backrest band
        b.addBox(sx - sw * 0.24, seatH - 0.05, 0, 0.036, 0.04, d * 0.58, { materialRole: 'frame', layer: 'detail' });
        b.addBox(sx + sw * 0.24, seatH - 0.05, 0, 0.036, 0.04, d * 0.58, { materialRole: 'frame', layer: 'detail' });
        b.addBox(sx, seatH + 0.4, -d * 0.31, sw * 0.66, 0.045, 0.064, { materialRole: 'accent', layer: 'detail', rotXDeg: -7 });
      }
      if (cfg.dividingArmrests) {
        const armX = s === seats - 1 ? (w * 0.5 + 0.015) : (cursorX + sw + seatGap * 0.5);
        b.addBox(armX, seatH + 0.12, 0.02, 0.028, 0.2, d * 0.5, { materialRole: 'chrome', layer: 'detail' });
      }
      cursorX += sw + seatGap;
    }
  } else if (style === 'modular_cube_ottoman') {
    b.addSupportLegs(0, 0, 0.08, w - 0.08, d - 0.08, 0.04, 'chrome');
    b.addChamferBox(0, 0.26, 0, w, 0.36, d, 0.025, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(0, 0.26, 0, w + 0.004, 0.012, d + 0.004, { materialRole: 'accent', layer: 'detail' });
  } else if (style === 'corner_sectional_lounge') {
    const mainW = Math.max(1.8, w);
    const wingLen = clamp(d * 2.05, 1.35, 2.0);
    const legH = 0.11;
    // Main back run + right-side return chaise/wing
    b.addSupportLegs(0, 0, legH, mainW - 0.14, d - 0.14, 0.045, 'chrome', -d * 0.22);
    b.addSupportLegs(mainW * 0.5 - d * 0.5, 0, legH, d - 0.14, wingLen - 0.14, 0.045, 'chrome', wingLen * 0.22);
    b.addBox(0, 0.2, -d * 0.22, mainW, 0.16, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(mainW * 0.5 - d * 0.5, 0.2, wingLen * 0.22, d, 0.16, wingLen, { materialRole: 'primary', layer: 'body' });
    // Continuous seat cushions + backrests
    b.addChamferBox(-d * 0.16, 0.34, -d * 0.14, mainW - d * 0.36, 0.13, d * 0.78, 0.018, { materialRole: 'accent', layer: 'detail' });
    b.addChamferBox(mainW * 0.5 - d * 0.55, 0.34, wingLen * 0.24, d * 0.78, 0.13, wingLen - 0.24, 0.018, { materialRole: 'accent', layer: 'detail' });
    b.addChamferBox(0, 0.54, -d * 0.62, mainW, 0.52, 0.16, 0.02, { materialRole: 'upholstery', layer: 'body' });
    b.addChamferBox(mainW * 0.5 - 0.08, 0.54, wingLen * 0.18, 0.16, 0.52, wingLen + 0.16, 0.02, { materialRole: 'upholstery', layer: 'body' });
    // Corner integrated wood magazine top & left end table cap
    b.addChamferBox(-mainW * 0.5 - 0.16, 0.42, -d * 0.22, 0.32, 0.045, d * 0.92, 0.01, { materialRole: 'wood', layer: 'detail' });
    b.addBox(-mainW * 0.5 - 0.16, 0.21, -d * 0.22, 0.24, 0.38, d * 0.72, { materialRole: 'frame', layer: 'body' });
  } else if (style === 'high_back_privacy_pod') {
    const pw = Math.max(1.35, w);
    const pd = clamp(d + 0.18, 0.76, 1.05);
    const wallH = 1.28;
    b.addSupportLegs(0, 0, 0.1, pw - 0.14, pd - 0.14, 0.04, 'chrome');
    b.addBox(0, 0.19, 0, pw, 0.16, pd, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.34, 0.05, pw - 0.18, 0.13, pd * 0.74, 0.018, { materialRole: 'accent', layer: 'detail' });
    // High acoustic surround wings
    b.addChamferBox(0, wallH * 0.5 + 0.1, -pd * 0.44, pw, wallH - 0.1, 0.09, 0.018, { materialRole: 'upholstery', layer: 'body' });
    b.addChamferBox(-pw * 0.47, wallH * 0.48 + 0.1, 0.02, 0.09, wallH - 0.12, pd * 0.96, 0.018, { materialRole: 'upholstery', layer: 'body' });
    b.addChamferBox(pw * 0.47, wallH * 0.48 + 0.1, 0.02, 0.09, wallH - 0.12, pd * 0.96, 0.018, { materialRole: 'upholstery', layer: 'body' });
    // Swivel tablet arm inside booth
    b.addCylinder(pw * 0.32, 0.48, pd * 0.12, 0.018, 0.018, 0.3, 8, 'y', 'chrome', 'detail');
    b.addChamferBox(pw * 0.26, 0.64, pd * 0.22, 0.34, 0.022, 0.24, 0.006, { materialRole: 'wood', layer: 'detail' });
  } else if (style === 'mall_atrium_planter_bench') {
    const span = clamp(Math.max(1.55, w), 1.55, 2.35);
    const planterSpan = span * 0.54;
    const planterH = 0.72;
    b.addChamferBox(0, planterH * 0.5, 0, planterSpan, planterH, planterSpan, 0.04, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0, planterH + 0.01, 0, planterSpan - 0.12, 0.03, planterSpan - 0.12, { materialRole: 'darkMetal', layer: 'detail' });
    // Wrap-around wooden seating ring supported by steel struts
    const ringOff = planterSpan * 0.5 + 0.19;
    for (const [bx, bz, bw, bd] of [
      [0, ringOff, span, 0.34],
      [0, -ringOff, span, 0.34],
      [-ringOff, 0, 0.34, planterSpan + 0.04],
      [ringOff, 0, 0.34, planterSpan + 0.04]
    ]) {
      b.addChamferBox(bx, seatH, bz, bw, 0.06, bd, 0.012, { materialRole: 'wood', layer: 'body' });
    }
    b.addSupportLegs(0, 0, seatH - 0.02, span - 0.22, span - 0.22, 0.045, 'frame');
    // Indoor atrium tree & lush tiered foliage inside planter
    b.addCylinder(0, planterH + 0.48, 0, 0.055, 0.085, 0.96, 8, 'y', 'wood', 'body');
    b.addChamferBox(0, planterH + 1.05, 0, planterSpan * 0.82, 0.38, planterSpan * 0.82, 0.08, { materialRole: 'foliage', layer: 'detail' });
    b.addChamferBox(0, planterH + 1.32, 0, planterSpan * 0.56, 0.3, planterSpan * 0.56, 0.07, { materialRole: 'foliage', layer: 'detail' });
  } else {
    // Lobby sofa / club armchair / curved modular sofa
    b.addSupportLegs(0, 0, 0.11, w - 0.12, d - 0.12, 0.045, style === 'club_armchair' ? 'wood' : 'chrome');
    b.addBox(0, 0.21, 0, w, 0.18, d, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.52, -d * 0.41, w, 0.52, 0.16, 0.02, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(-w * 0.5 + 0.08, 0.41, 0.02, 0.15, 0.38, d * 0.94, { materialRole: 'upholstery', layer: 'body' });
    b.addBox(w * 0.5 - 0.08, 0.41, 0.02, 0.15, 0.38, d * 0.94, { materialRole: 'upholstery', layer: 'body' });
    const cCount = style === 'club_armchair' ? 1 : Math.max(2, seats);
    const cw = (w - 0.32) / cCount;
    for (let i = 0; i < cCount; i++) {
      const cx = -(w - 0.32) * 0.5 + cw * 0.5 + i * cw;
      b.addChamferBox(cx, 0.36, 0.05, cw - 0.015, 0.14, d * 0.76, 0.018, { materialRole: 'accent', layer: 'detail' });
    }
  }

  meta.interaction = {
    interactable: true,
    actionType: 'sit_lobby_seating',
    seatCount: style === 'club_armchair' ? 1 : seats,
    seatHeightMeters: seatH
  };
}

function ofsBuildConferenceTable(group, cfg, b, mats, meta) {
  const shape = cfg.tableShape || 'racetrack_oval';
  const len = clamp(cfg.length || 3.2, 1.4, 6.0);
  const wid = clamp(cfg.width || 1.25, 0.85, 2.0);
  const h = clamp(cfg.height || 0.75, 0.7, 1.05);
  const topT = clamp(cfg.topThickness || 0.048, 0.03, 0.09);
  const underY = h - topT;

  if (shape === 'round_huddle') {
    const r = len * 0.42;
    b.addCylinder(0, h - topT * 0.5, 0, r, r, topT, 16, 'y', 'primary', 'body');
    b.addCylinder(0, 0.02, 0, r * 0.48, r * 0.52, 0.04, 12, 'y', 'chrome', 'body');
    b.addCylinder(0, underY * 0.5, 0, 0.08, 0.1, underY, 10, 'y', 'frame', 'body');
  } else {
    const chamfer = shape === 'racetrack_oval' || shape === 'boat_shaped' ? Math.min(wid * 0.16, 0.24) : 0.012;
    b.addChamferBox(0, h - topT * 0.5, 0, len, topT, wid, chamfer, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, underY - 0.03, 0, len * 0.72, 0.045, wid * 0.45, { materialRole: 'frame', layer: 'body' });
    const pedCount = len > 3.6 ? 3 : 2;
    for (let i = 0; i < pedCount; i++) {
      const px = pedCount === 1 ? 0 : -len * 0.34 + (i / (pedCount - 1)) * (len * 0.68);
      if (cfg.baseStyle === 'chrome_trestle') {
        b.addBox(px, 0.02, 0, 0.07, 0.04, wid * 0.66, { materialRole: 'chrome', layer: 'body' });
        b.addBox(px, underY * 0.5, 0, 0.08, underY, 0.12, { materialRole: 'chrome', layer: 'body' });
      } else {
        b.addCylinder(px, underY * 0.5, 0, 0.14, 0.18, underY, 10, 'y', 'secondary', 'body');
        b.addBox(px, 0.02, 0, 0.32, 0.04, wid * 0.58, { materialRole: 'frame', layer: 'body' });
      }
    }
  }

  // Recessed tabletop media & power box
  if (cfg.mediaPowerHub !== false) {
    const hubs = len > 3.2 ? 2 : 1;
    for (let i = 0; i < hubs; i++) {
      const hx = hubs === 1 ? 0 : (i === 0 ? -len * 0.22 : len * 0.22);
      b.addBox(hx, h + 0.004, 0, 0.26, 0.01, 0.14, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(hx - 0.06, h + 0.01, 0, 0.04, 0.006, 0.04, { materialRole: 'chrome', layer: 'detail' });
      b.addBox(hx + 0.06, h + 0.01, 0, 0.04, 0.006, 0.04, { materialRole: 'chrome', layer: 'detail' });
    }
  }

  // Integrated speakerphone / mic puck or presentation screen on tabletop
  if (cfg.centerSpeakerphone) {
    b.addCylinder(0.28, h + 0.014, 0, 0.095, 0.115, 0.028, 6, 'y', 'darkMetal', 'detail');
    b.addCylinder(0.28, h + 0.029, 0, 0.035, 0.035, 0.005, 6, 'y', 'signalGreen', 'detail');
  }
  if (cfg.tabletopDisplay) {
    b.addBox(-0.4, h + 0.18, -0.05, 0.44, 0.28, 0.025, { materialRole: 'frame', layer: 'detail', rotXDeg: -16 });
    objCreateScreenPlane(group, 'spreadsheet', 0.4, 0.24, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -0.4,
      y: h + 0.18,
      z: -0.036,
      rotX: degToRad(-16)
    });
  }

  if (styleConditionSignNeeded(cfg)) {
    objCreateSignPlane(group, cfg.signText || 'Boardroom A', 0.34, 0.08, cfg.accentColor || '#1f364d', '#ffffff', {
      x: 0,
      y: h + 0.05,
      z: wid * 0.36,
      rotX: degToRad(-25)
    });
  }

  meta.surfaceRelationship = {
    isSupportSurface: true,
    surfaceHeightMeters: h,
    usableAreaSqM: Number((len * wid * 0.85).toFixed(3))
  };
  meta.snapAnchors.push({ id: 'center_presentation', position: [0, h, 0], normal: [0, 1, 0] });
  meta.interaction = { interactable: true, actionType: 'meeting_table', surfaceHeightMeters: h };
}

function styleConditionSignNeeded(cfg) {
  return Boolean(cfg.roomPlacard);
}

export function registerOfficeFurnitureAndSeatingFamilies() {
  registerObjectFamily({
    id: 'office_desk',
    categoryId: 'office_public_interiors',
    subcategory: 'Desks & Workstations',
    subcategories: ['Desks & Workstations'],
    label: 'Office Desks & Workstations',
    description: 'Rectangular employee desks, L/U executive desks, standing sit-stand desks, and drafting tables.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'reception', 'library', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'functional',
    surfaceRelationship: { isSupportSurface: true, defaultSurfaceHeight: 0.74 },
    tags: ['desk', 'workstation', 'office', 'executive', 'standing_desk', 'table'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Desk Structure' },
      {
        key: 'deskStyle',
        name: 'Desk Style',
        type: 'select',
        options: [
          ['rectangular', 'Standard Rectangular'],
          ['executive_solid', 'Executive Panel Desk'],
          ['l_shaped', 'L-Shaped Corner Desk'],
          ['u_shaped', 'U-Shaped Executive Suite'],
          ['standing_adjustable', 'Motorized Standing Desk'],
          ['drafting_table', 'Architect Drafting Table'],
          ['teacher_desk', 'Single-Pedestal Classroom Desk']
        ],
        default: 'rectangular'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.9, max: 2.4, step: 0.05, unit: 'm', default: 1.5 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.52, max: 1.15, step: 0.05, unit: 'm', default: 0.75 },
      { key: 'height', name: 'Worktop Height', type: 'number', min: 0.65, max: 1.18, step: 0.02, unit: 'm', default: 0.74 },
      { key: 'returnLength', name: 'L/U Return Wing', type: 'number', min: 0.6, max: 1.65, step: 0.05, unit: 'm', default: 1.05 },
      { group: 'Drawers & Hardware' },
      {
        key: 'pedestalConfig',
        name: 'Drawer Pedestals',
        type: 'select',
        options: [
          ['none', 'Open Frame'],
          ['right_single', 'Right Pedestal'],
          ['left_single', 'Left Pedestal'],
          ['dual', 'Dual Pedestals']
        ],
        default: 'right_single'
      },
      { key: 'openDrawer', name: 'Open Drawer Index', type: 'number', min: 0, max: 3, step: 1, default: 0 },
      { key: 'modestyPanel', name: 'Modesty Panel', type: 'boolean', default: true },
      { key: 'keyboardTray', name: 'Slide Keyboard Tray', type: 'boolean', default: false },
      { key: 'cableGrommets', name: 'Desktop Grommets', type: 'boolean', default: true },
      { key: 'overheadHutch', name: 'Overhead Hutch Shelf', type: 'boolean', default: false },
      { key: 'surfaceTiltDeg', name: 'Drafting Tilt', type: 'number', min: 0, max: 35, step: 1, unit: 'deg', default: 16 }
    ],
    presets: [
      {
        id: 'standard_employee_desk',
        label: 'Standard Office Desk',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d5cdc0',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#b9b2a7',
        accentColor: '#4c5e70',
        frameMaterial: 'painted_aluminum',
        frameColor: '#363e47',
        params: { deskStyle: 'rectangular', width: 1.5, depth: 0.75, height: 0.74, pedestalConfig: 'right_single' }
      },
      {
        id: 'executive_mahogany_desk',
        label: 'Large Executive Desk',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#59331f',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#4a2919',
        accentColor: '#c79b42',
        frameColor: '#2a1c14',
        params: { deskStyle: 'executive_solid', width: 1.95, depth: 0.92, height: 0.76, pedestalConfig: 'dual', modestyPanel: true }
      },
      {
        id: 'l_shaped_manager_desk',
        label: 'L-Shaped Corner Desk',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#bd9266',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#e0d9ce',
        accentColor: '#355c7d',
        frameColor: '#32383f',
        params: { deskStyle: 'l_shaped', width: 1.65, depth: 0.75, returnLength: 1.15, pedestalConfig: 'left_single' }
      },
      {
        id: 'u_shaped_executive_station',
        label: 'U-Shaped Executive Suite',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#693c23',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#542f1b',
        accentColor: '#b08b3b',
        frameColor: '#29221d',
        params: { deskStyle: 'u_shaped', width: 2.1, depth: 0.72, returnLength: 1.3, pedestalConfig: 'dual', overheadHutch: true }
      },
      {
        id: 'motorized_standing_desk',
        label: 'Height-Adjustable Standing Desk',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#f0f2f5',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#dfe4ea',
        accentColor: '#3694db',
        frameColor: '#2d343b',
        params: { deskStyle: 'standing_adjustable', width: 1.45, depth: 0.72, height: 1.06, pedestalConfig: 'none', modestyPanel: false }
      },
      {
        id: 'budget_government_desk',
        label: 'Budget Metal Government Desk',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#c9c4b8',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#7b848c',
        accentColor: '#8d969e',
        frameColor: '#454c54',
        params: { deskStyle: 'rectangular', width: 1.4, depth: 0.72, pedestalConfig: 'dual', openDrawer: 2, keyboardTray: true }
      },
      {
        id: 'architect_drafting_desk',
        label: 'Architect Drafting Table',
        paletteFamily: 'industrial_loft_office',
        condition: 'lightly_worn',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#d0ac7e',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#5a636b',
        accentColor: '#31373d',
        frameColor: '#2c3136',
        params: { deskStyle: 'drafting_table', width: 1.35, depth: 0.85, height: 0.92, pedestalConfig: 'none', surfaceTiltDeg: 18 }
      },
      {
        id: 'compact_writing_desk',
        label: 'Small Writing & Hutch Desk',
        paletteFamily: 'budget_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b7895a',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#d9d2c5',
        accentColor: '#4e677a',
        frameColor: '#394047',
        params: { deskStyle: 'rectangular', width: 1.15, depth: 0.6, pedestalConfig: 'right_single', overheadHutch: true }
      }
    ],
    buildGeometry: ofsBuildOfficeDesk
  });

  registerObjectFamily({
    id: 'office_chair',
    categoryId: 'office_public_interiors',
    subcategory: 'Office Chairs & Seating',
    subcategories: ['Office Chairs & Seating'],
    label: 'Office Chairs & Task Seating',
    description: 'Swivel task chairs, breathable mesh chairs, high-back executive chairs, and visitor sled chairs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'conference', 'reception', 'library'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['chair', 'office_chair', 'ergonomic', 'executive', 'stool', 'seating'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Chair Proportions' },
      {
        key: 'chairStyle',
        name: 'Chair Type',
        type: 'select',
        options: [
          ['ergonomic_task', 'Ergonomic Mesh Task Chair'],
          ['executive_leather', 'Executive High-Back Chair'],
          ['visitor_sled', 'Visitor Sled Armchair'],
          ['drafting_stool', 'Tall Drafting Stool']
        ],
        default: 'ergonomic_task'
      },
      { key: 'seatWidth', name: 'Seat Width', type: 'number', min: 0.4, max: 0.66, step: 0.02, unit: 'm', default: 0.5 },
      { key: 'seatDepth', name: 'Seat Depth', type: 'number', min: 0.38, max: 0.6, step: 0.02, unit: 'm', default: 0.48 },
      { key: 'seatHeight', name: 'Seat Height', type: 'number', min: 0.38, max: 0.58, step: 0.02, unit: 'm', default: 0.46 },
      { key: 'backrestHeight', name: 'Backrest Height', type: 'number', min: 0.32, max: 0.78, step: 0.02, unit: 'm', default: 0.54 },
      { group: 'Armrests & Hardware' },
      {
        key: 'armrestStyle',
        name: 'Armrests',
        type: 'select',
        options: [
          ['adjustable_t', 'T-Style Padded Arms'],
          ['loop_fixed', 'Conference Loop Arms'],
          ['none', 'Armless']
        ],
        default: 'adjustable_t'
      },
      { key: 'casterBase', name: 'Caster Wheels', type: 'boolean', default: true },
      { key: 'lumbarPad', name: 'Lumbar Support Cushion', type: 'boolean', default: true },
      { key: 'headrest', name: 'Attach Headrest', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'ergonomic_mesh_task_chair',
        label: 'Ergonomic Mesh Task Chair',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#252a30',
        secondaryMaterial: 'mesh_upholstery',
        secondaryColor: '#2f3942',
        accentColor: '#3a7cb8',
        frameColor: '#21262c',
        params: { chairStyle: 'ergonomic_task', armrestStyle: 'adjustable_t', lumbarPad: true }
      },
      {
        id: 'executive_leather_highback',
        label: 'Executive Leather High-Back',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'faux_leather',
        primaryColor: '#2c221d',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#3d2e26',
        accentColor: '#b58d3c',
        frameColor: '#25282c',
        params: { chairStyle: 'executive_leather', seatWidth: 0.58, backrestHeight: 0.72, headrest: true, armrestStyle: 'loop_fixed' }
      },
      {
        id: 'conference_swivel_chair',
        label: 'Conference Swivel Chair',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#455463',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#566778',
        accentColor: '#8d9ba8',
        frameColor: '#2a3036',
        params: { chairStyle: 'ergonomic_task', backrestHeight: 0.46, armrestStyle: 'loop_fixed', lumbarPad: false }
      },
      {
        id: 'budget_cloth_task_chair',
        label: 'Budget Blue Task Chair',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#282d33',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#2e5178',
        accentColor: '#3d6999',
        frameColor: '#23282e',
        params: { chairStyle: 'ergonomic_task', seatWidth: 0.46, backrestHeight: 0.4, armrestStyle: 'none', casterBase: true }
      },
      {
        id: 'visitor_sled_armchair',
        label: 'Visitor Sled Side Chair',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#4e6878',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#5c788a',
        accentColor: '#9fb0bd',
        frameColor: '#8f9aa3',
        params: { chairStyle: 'visitor_sled', backrestHeight: 0.44, armrestStyle: 'loop_fixed', casterBase: false, lumbarPad: false }
      },
      {
        id: 'tall_drafting_stool',
        label: 'Lab & Drafting Tall Stool',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#23272c',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#363c42',
        accentColor: '#d98a2b',
        frameColor: '#1f2429',
        params: { chairStyle: 'drafting_stool', seatHeight: 0.68, backrestHeight: 0.36, armrestStyle: 'none', lumbarPad: false }
      }
    ],
    buildGeometry: ofsBuildOfficeChair
  });

  registerObjectFamily({
    id: 'waiting_seating',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '23_clinics_waiting', '25_malls_libraries', '22_police_municipal'],
    subcategory: 'Waiting Rooms & Public Lobbies',
    subcategories: [
      'Waiting Rooms & Public Lobbies',
      'Medical Office & Professional Waiting Areas',
      'Office Chairs & Seating',
      'Mall Concourses & Kiosks',
      'Courthouses & Hearings'
    ],
    label: 'Lobby & Waiting Room Seating',
    description: 'Linked tandem beam chairs, upholstered lobby sofas, club chairs, and modular ottoman benches.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['waiting_room', 'lobby', 'reception', 'medical', 'clinic', 'municipal', 'mall', 'library'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['waiting_room', 'sofa', 'lobby', 'bench', 'tandem_chairs', 'medical', 'clinic', 'mall'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Seating Layout' },
      {
        key: 'seatingStyle',
        name: 'Seating Format',
        type: 'select',
        options: [
          ['tandem_beam', 'Linked Tandem Beam Row'],
          ['tandem_accessible', 'Accessible / Handicap Tandem Row'],
          ['lobby_sofa', 'Upholstered Lobby Sofa'],
          ['club_armchair', 'Lobby Club Armchair'],
          ['modular_cube_ottoman', 'Modular Cube Bench'],
          ['corner_sectional_lounge', 'Corner Waiting Sectional'],
          ['high_back_privacy_pod', 'High-Back Privacy Lounge Pod'],
          ['mall_atrium_planter_bench', 'Atrium Planter Bench']
        ],
        default: 'tandem_beam'
      },
      { key: 'seatCount', name: 'Seat Capacity', type: 'number', min: 1, max: 6, step: 1, default: 3 },
      { key: 'accessibleSeatCount', name: 'Large Handicap Seats', type: 'number', min: 0, max: 3, step: 1, default: 0 },
      { key: 'unitWidth', name: 'Unit Width / Bay', type: 'number', min: 0.45, max: 2.2, step: 0.05, unit: 'm', default: 0.54 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.52, max: 0.92, step: 0.04, unit: 'm', default: 0.66 },
      { group: 'Details' },
      { key: 'dividingArmrests', name: 'Chrome Dividing Arms', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'compact_tandem_two_seat',
        label: '2-Seat Tandem Waiting Bench',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c2cbd4',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#3a6280',
        accentColor: '#5c8fb5',
        frameColor: '#6d7782',
        params: { seatingStyle: 'tandem_beam', seatCount: 2, accessibleSeatCount: 0, unitWidth: 0.54, dividingArmrests: true }
      },
      {
        id: 'medical_tandem_three_seat',
        label: 'Clinic 3-Seat Tandem Bench',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#bcc5ce',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#3f7699',
        accentColor: '#6999b8',
        frameColor: '#798591',
        params: { seatingStyle: 'tandem_beam', seatCount: 3, accessibleSeatCount: 0, unitWidth: 0.54, dividingArmrests: true }
      },
      {
        id: 'municipal_four_seat_beam',
        label: 'DMV 4-Seat Metal Waiting Row',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#5e6b78',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#3a4652',
        accentColor: '#d19838',
        frameColor: '#454f59',
        params: { seatingStyle: 'tandem_beam', seatCount: 4, accessibleSeatCount: 0, unitWidth: 0.52, dividingArmrests: true }
      },
      {
        id: 'dmv_five_seat_waiting_row',
        label: 'Dmv 5-Seat Metal Waiting Row',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#5a6774',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#37434f',
        accentColor: '#c9933a',
        frameColor: '#3f4954',
        params: { seatingStyle: 'tandem_beam', seatCount: 5, accessibleSeatCount: 0, unitWidth: 0.52, dividingArmrests: true }
      },
      {
        id: 'accessible_one_handicap_row',
        label: 'Waiting Row (1 Large Handicap Seat)',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c0c8d0',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#366f94',
        accentColor: '#2f8ae0',
        frameColor: '#6c7782',
        params: { seatingStyle: 'tandem_accessible', seatCount: 3, accessibleSeatCount: 1, unitWidth: 0.54, dividingArmrests: true }
      },
      {
        id: 'accessible_two_handicap_row',
        label: 'Waiting Row (2 Large Handicap Seats)',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c0c8d0',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#366f94',
        accentColor: '#2f8ae0',
        frameColor: '#6c7782',
        params: { seatingStyle: 'tandem_accessible', seatCount: 3, accessibleSeatCount: 2, unitWidth: 0.54, dividingArmrests: true }
      },
      {
        id: 'accessible_three_handicap_row',
        label: 'Waiting Row (3 Large Handicap Seats)',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c0c8d0',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#366f94',
        accentColor: '#2f8ae0',
        frameColor: '#6c7782',
        params: { seatingStyle: 'tandem_accessible', seatCount: 3, accessibleSeatCount: 3, unitWidth: 0.54, dividingArmrests: true }
      },
      {
        id: 'executive_lobby_sofa',
        label: 'Corporate Lobby 3-Seat Sofa',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'new',
        primaryMaterial: 'faux_leather',
        primaryColor: '#3a2b22',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#4c382d',
        accentColor: '#5e4537',
        frameColor: '#b59457',
        params: { seatingStyle: 'lobby_sofa', seatCount: 3, unitWidth: 2.05, depth: 0.84, dividingArmrests: false }
      },
      {
        id: 'reception_club_armchair',
        label: 'Reception Lounge Club Chair',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#3f5368',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#4e6780',
        accentColor: '#66819c',
        frameColor: '#6e4a2f',
        params: { seatingStyle: 'club_armchair', seatCount: 1, unitWidth: 0.84, depth: 0.8, dividingArmrests: false }
      },
      {
        id: 'coworking_cube_ottoman',
        label: 'Modular Lounge Ottoman Bench',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#2d7a73',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#368f86',
        accentColor: '#f0b24d',
        frameColor: '#333a42',
        params: { seatingStyle: 'modular_cube_ottoman', seatCount: 2, unitWidth: 1.25, depth: 0.62, dividingArmrests: false }
      },
      {
        id: 'waiting_corner_sectional_sofa',
        label: 'Modular Waiting Room Corner Sectional',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d9d2c7',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#355c78',
        accentColor: '#487ea3',
        frameColor: '#8d969f',
        woodColor: '#a67b50',
        params: { seatingStyle: 'corner_sectional_lounge', seatCount: 5, unitWidth: 2.05, depth: 0.78, dividingArmrests: false }
      },
      {
        id: 'acoustic_waiting_lounge_pod',
        label: 'High-Back Privacy Waiting Lounge',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'upholstery_fabric',
        primaryColor: '#3b4f66',
        secondaryMaterial: 'upholstery_fabric',
        secondaryColor: '#4e6682',
        accentColor: '#e09a3e',
        frameColor: '#2a333d',
        woodColor: '#b58a5e',
        params: { seatingStyle: 'high_back_privacy_pod', seatCount: 2, unitWidth: 1.5, depth: 0.82, dividingArmrests: false }
      },
      {
        id: 'mall_atrium_planter_bench',
        label: 'Atrium Planter Wrap-Around Bench',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'polished_stone',
        primaryColor: '#d4cfc6',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#a87b4c',
        accentColor: '#3f7d47',
        frameColor: '#333b42',
        concreteColor: '#c9c4ba',
        woodColor: '#a87b4c',
        params: { seatingStyle: 'mall_atrium_planter_bench', seatCount: 6, unitWidth: 2.0, depth: 0.9, dividingArmrests: false }
      }
    ],
    buildGeometry: ofsBuildWaitingSeating
  });

  registerObjectFamily({
    id: 'conference_table',
    categoryId: 'office_public_interiors',
    subcategory: 'Conference & Meeting Rooms',
    subcategories: ['Conference & Meeting Rooms', 'Desks & Workstations'],
    label: 'Conference & Meeting Tables',
    description: 'Long boardroom tables, boat-shaped meeting tables, and round huddle tables with cable hubs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['conference', 'office', 'coworking', 'municipal'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'large',
    functionalRole: 'functional',
    surfaceRelationship: { isSupportSurface: true, defaultSurfaceHeight: 0.75 },
    tags: ['conference', 'boardroom', 'meeting_table', 'huddle', 'speakerphone'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Table Geometry' },
      {
        key: 'tableShape',
        name: 'Tabletop Shape',
        type: 'select',
        options: [
          ['racetrack_oval', 'Racetrack Boardroom'],
          ['rectangular', 'Architectural Rectangle'],
          ['boat_shaped', 'Executive Boat Table'],
          ['round_huddle', 'Round Huddle Table']
        ],
        default: 'racetrack_oval'
      },
      { key: 'length', name: 'Length', type: 'number', min: 1.4, max: 6.0, step: 0.1, unit: 'm', default: 3.2 },
      { key: 'width', name: 'Width', type: 'number', min: 0.85, max: 2.0, step: 0.05, unit: 'm', default: 1.25 },
      { key: 'height', name: 'Height', type: 'number', min: 0.7, max: 1.05, step: 0.02, unit: 'm', default: 0.75 },
      { key: 'topThickness', name: 'Slab Thickness', type: 'number', min: 0.03, max: 0.09, step: 0.005, unit: 'm', default: 0.048 },
      { group: 'Base & Tech Hubs' },
      {
        key: 'baseStyle',
        name: 'Base Style',
        type: 'select',
        options: [
          ['column_pedestal', 'Cylindrical Pedestals'],
          ['chrome_trestle', 'Chrome Trestle Legs']
        ],
        default: 'column_pedestal'
      },
      { key: 'mediaPowerHub', name: 'Tabletop Power Boxes', type: 'boolean', default: true },
      { key: 'centerSpeakerphone', name: 'Conference Speakerphone', type: 'boolean', default: true },
      { key: 'tabletopDisplay', name: 'Desktop Mini Monitor', type: 'boolean', default: false },
      { key: 'roomPlacard', name: 'Reserved Nameplate', type: 'boolean', default: false },
      { key: 'signText', name: 'Placard Label', type: 'text', maxLength: 24, default: 'Boardroom A' }
    ],
    presets: [
      {
        id: 'executive_ten_seat_boardroom',
        label: '10-Seat Executive Boardroom Table',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c341f',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#482817',
        accentColor: '#c4963c',
        frameColor: '#25292e',
        params: { tableShape: 'boat_shaped', length: 4.0, width: 1.45, baseStyle: 'column_pedestal', mediaPowerHub: true, centerSpeakerphone: true }
      },
      {
        id: 'modern_six_seat_conference',
        label: 'Modern 6-Seat Meeting Table',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#eef1f5',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#cfd6de',
        accentColor: '#2f6d9e',
        frameColor: '#434b54',
        params: { tableShape: 'racetrack_oval', length: 2.7, width: 1.2, baseStyle: 'chrome_trestle', centerSpeakerphone: true }
      },
      {
        id: 'glass_steel_conference_table',
        label: 'Tech Studio Presentation Table',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#c9a67d',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#b8c3cd',
        accentColor: '#3694db',
        frameColor: '#2c343d',
        params: { tableShape: 'rectangular', length: 3.1, width: 1.3, baseStyle: 'chrome_trestle', tabletopDisplay: true }
      },
      {
        id: 'small_round_huddle_table',
        label: 'Small Round Huddle Table',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e6eaef',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c4cdd6',
        accentColor: '#2f8c7a',
        frameColor: '#343b42',
        params: { tableShape: 'round_huddle', length: 2.4, width: 1.0, mediaPowerHub: false, centerSpeakerphone: true }
      },
      {
        id: 'civic_hearing_table',
        label: 'Municipal Council Table',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#694128',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#52321e',
        accentColor: '#2e5980',
        frameColor: '#262b30',
        params: { tableShape: 'rectangular', length: 3.6, width: 1.15, roomPlacard: true, signText: 'City Clerk Desk' }
      },
      {
        id: 'standing_height_meeting_table',
        label: 'High-Top Standup Huddle Table',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b38152',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#454e57',
        accentColor: '#d98a2b',
        frameColor: '#22262b',
        params: { tableShape: 'rectangular', length: 2.2, width: 1.0, height: 1.02, baseStyle: 'chrome_trestle', centerSpeakerphone: false }
      }
    ],
    buildGeometry: ofsBuildConferenceTable
  });
}
