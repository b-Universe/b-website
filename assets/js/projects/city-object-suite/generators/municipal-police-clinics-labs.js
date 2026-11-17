import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function mpclBuildPoliceStationProp(group, cfg, b, mats, meta) {
  const type = cfg.propType || 'mugshot_booking_station';
  const w = clamp(cfg.width || 1.85, 0.72, 3.25);
  const d = clamp(cfg.depth || 0.9, 0.18, 1.65);
  const h = clamp(cfg.height || 2.15, 0.75, 2.55);

  if (type === 'mugshot_booking_station') {
    const bw = clamp(w, 1.45, 2.25);
    const bh = clamp(h, 2.05, 2.4);
    b.addBox(0.25, 0.04, 0, bw * 0.68, 0.08, 0.85, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0.25, bh * 0.5 + 0.04, -0.34, bw * 0.68, bh - 0.08, 0.08, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0.25, bh + 0.02, -0.34, bw * 0.72, 0.08, 0.12, { materialRole: 'frame', layer: 'detail' });
    // Metric height ruled bands every 0.15m from 0.9m to 2.05m
    for (let y = 0.95; y <= 2.02; y += 0.15) {
      b.addBox(0.25, y, -0.296, bw * 0.62, 0.014, 0.012, { materialRole: 'darkMetal', layer: 'detail' });
    }
    objCreateSignPlane(group, cfg.signText || 'Precinct 04 Booking', bw * 0.6, 0.24, '#1c3354', '#ffffff', {
      x: 0.25,
      y: bh - 0.16,
      z: -0.29
    });
    // Booking placard stand & facing mugshot tripod camera
    b.addCylinder(0.75, 0.48, -0.1, 0.025, 0.03, 0.88, 8, 'y', 'chrome', 'detail');
    b.addBox(0.75, 0.98, -0.1, 0.26, 0.18, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, 'Case #409-B', 0.23, 0.14, '#1b2026', '#f2f5f8', { x: 0.75, y: 0.98, z: -0.084 });
    // Camera tripod at front edge + left ink/scanner terminal pedestal
    b.addBox(0.25, 0.014, 0.42, 0.28, 0.012, 0.28, { materialRole: 'frame', layer: 'detail' });
    b.addCylinder(0.25, 0.68, 0.42, 0.028, 0.038, 1.32, 8, 'y', 'darkMetal', 'detail');
    b.addBox(0.25, 1.4, 0.42, 0.18, 0.14, 0.2, { materialRole: 'darkMetal', layer: 'body' });
    b.addCylinder(0.25, 1.4, 0.3, 0.048, 0.055, 0.08, 10, 'z', 'chrome', 'detail');
    b.addBox(0.25, 1.56, 0.42, 0.22, 0.1, 0.08, { materialRole: 'lampGlow', layer: 'detail' });
    // Left fingerprinting booking kiosk pedestal
    b.addChamferBox(-bw * 0.36, 0.52, -0.08, 0.48, 1.04, 0.46, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addBox(-bw * 0.36, 1.06, -0.05, 0.22, 0.03, 0.18, { materialRole: 'glass', layer: 'detail' });
    b.addBox(-bw * 0.36, 1.26, -0.22, 0.4, 0.28, 0.03, { materialRole: 'darkMetal', layer: 'body' });
    objCreateScreenPlane(group, 'info_display', 0.35, 0.22, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -bw * 0.36,
      y: 1.26,
      z: -0.2
    });
    meta.snapAnchors.push(
      { id: 'subject_mark', position: [0.25, 0.08, 0], normal: [0, 1, 0] },
      { id: 'officer_kiosk', position: [-bw * 0.36, 0, 0.55], normal: [0, 0, 1] }
    );
  } else if (type === 'holding_cell_front') {
    const cw = clamp(w, 1.8, 3.2);
    const cd = clamp(d, 0.48, 1.35);
    const ch = clamp(h, 2.05, 2.48);
    // Floor curb & top steel lock beam
    b.addBox(0, 0.06, 0.22, cw, 0.12, 0.22, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0, ch - 0.08, 0.22, cw, 0.16, 0.2, { materialRole: 'frame', layer: 'body' });
    b.addBox(-cw * 0.48, ch * 0.5, 0.22, 0.08, ch, 0.16, { materialRole: 'frame', layer: 'body' });
    b.addBox(cw * 0.48, ch * 0.5, 0.22, 0.08, ch, 0.16, { materialRole: 'frame', layer: 'body' });
    // Center mullion post + sliding door leaf offset
    const splitX = -cw * 0.06;
    b.addBox(splitX, ch * 0.5, 0.22, 0.075, ch, 0.14, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, ch * 0.52, 0.22, cw * 0.94, 0.05, 0.1, { materialRole: 'darkMetal', layer: 'detail' });
    const barCount = Math.max(10, Math.round(cw * 7));
    const doorOffset = cfg.hasCellDoor === false ? 0.36 : 0;
    for (let i = 1; i < barCount; i++) {
      const bx = -cw * 0.46 + (i / barCount) * (cw * 0.92);
      const inDoor = bx > splitX && bx < splitX + cw * 0.44;
      const drawX = inDoor ? bx + doorOffset * 0.45 : bx;
      if (drawX < cw * 0.46) {
        b.addCylinder(drawX, ch * 0.5, inDoor ? 0.26 : 0.21, 0.018, 0.018, ch - 0.22, 8, 'y', 'darkMetal', 'body');
      }
    }
    // Cell lock box + meal pass tray
    b.addBox(splitX + 0.09, 1.08, 0.26, 0.12, 0.22, 0.12, { materialRole: 'accent', layer: 'detail' });
    b.addBox(-cw * 0.26, 0.98, 0.22, 0.34, 0.04, 0.26, { materialRole: 'chrome', layer: 'detail' });
    // Interior bolted steel bunk bench behind bars
    b.addBox(0, 0.44, -cd * 0.28, cw * 0.72, 0.06, 0.52, { materialRole: 'secondary', layer: 'body' });
    b.addBox(-cw * 0.28, 0.22, -cd * 0.28, 0.06, 0.42, 0.42, { materialRole: 'frame', layer: 'body' });
    b.addBox(cw * 0.28, 0.22, -cd * 0.28, 0.06, 0.42, 0.42, { materialRole: 'frame', layer: 'body' });
  } else if (type === 'interrogation_table') {
    const tw = clamp(w, 1.15, 1.65);
    const td = clamp(d, 0.78, 1.05);
    const th = 0.76;
    // Heavy steel floor-bolted pedestal table
    b.addBox(0, th - 0.025, 0, tw, 0.05, td, { materialRole: 'primary', layer: 'body' });
    b.addBox(-tw * 0.35, (th - 0.05) * 0.5, 0, 0.09, th - 0.05, td * 0.65, { materialRole: 'frame', layer: 'body' });
    b.addBox(tw * 0.35, (th - 0.05) * 0.5, 0, 0.09, th - 0.05, td * 0.65, { materialRole: 'frame', layer: 'body' });
    b.addBox(-tw * 0.35, 0.02, 0, 0.18, 0.04, td * 0.8, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(tw * 0.35, 0.02, 0, 0.18, 0.04, td * 0.8, { materialRole: 'darkMetal', layer: 'detail' });
    // Center welded steel restraint ring + audio tape recorder + manila case file
    b.addBox(0, th + 0.012, 0.1, 0.08, 0.02, 0.08, { materialRole: 'chrome', layer: 'detail' });
    b.addPrismRing(0, th + 0.045, 0.1, 0.036, 0.022, 0.016, 10, 'y', 'chrome', 'detail');
    b.addBox(-0.26, th + 0.035, -0.08, 0.24, 0.065, 0.18, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(-0.31, th + 0.072, -0.08, 0.032, 0.032, 0.014, 10, 'y', 'chrome', 'detail');
    b.addCylinder(-0.21, th + 0.072, -0.08, 0.032, 0.032, 0.014, 10, 'y', 'chrome', 'detail');
    b.addBox(0.28, th + 0.02, -0.1, 0.26, 0.035, 0.32, { materialRole: 'wood', layer: 'detail', rotYDeg: -10 });
    // Matching pair of austere bolted steel chairs
    for (const side of [-1, 1]) {
      const cz = side * (td * 0.5 + 0.24);
      b.addSupportLegs(0, 0, 0.44, 0.38, 0.36, 0.03, 'frame', cz);
      b.addBox(0, 0.45, cz, 0.42, 0.032, 0.4, { materialRole: 'secondary', layer: 'body' });
      b.addBox(0, 0.66, cz + side * 0.19, 0.42, 0.38, 0.03, { materialRole: 'secondary', layer: 'body' });
    }
    meta.snapAnchors.push(
      { id: 'detective_seat', position: [0, 0, -td * 0.5 - 0.32], normal: [0, 0, -1] },
      { id: 'suspect_seat', position: [0, 0, td * 0.5 + 0.32], normal: [0, 0, 1] }
    );
  } else if (type === 'evidence_locker') {
    const ew = clamp(w, 1.05, 1.95);
    const ed = clamp(d, 0.48, 0.72);
    const eh = clamp(h, 1.75, 2.22);
    b.addBox(0, 0.04, 0, ew, 0.08, ed, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, eh - 0.03, 0, ew, 0.06, ed, { materialRole: 'frame', layer: 'body' });
    b.addBox(-ew * 0.48, eh * 0.5, 0, 0.05, eh, ed, { materialRole: 'primary', layer: 'body' });
    b.addBox(ew * 0.48, eh * 0.5, 0, 0.05, eh, ed, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, eh * 0.5, -ed * 0.48, ew - 0.06, eh - 0.06, 0.03, { materialRole: 'primary', layer: 'body' });
    const cols = ew > 1.45 ? 3 : 2;
    const rows = 4;
    const colW = (ew - 0.1) / cols;
    const rowH = (eh - 0.14) / rows;
    for (let c = 0; c < cols; c++) {
      const cx = -ew * 0.5 + 0.05 + colW * 0.5 + c * colW;
      if (c > 0) {
        b.addBox(cx - colW * 0.5, eh * 0.5, 0, 0.03, eh - 0.08, ed - 0.04, { materialRole: 'frame', layer: 'body' });
      }
      for (let r = 0; r < rows; r++) {
        const ry = 0.08 + rowH * 0.5 + r * rowH;
        b.addBox(cx, ry - rowH * 0.48, 0, colW - 0.03, 0.024, ed - 0.05, { materialRole: 'secondary', layer: 'body' });
        // Wire mesh grille door bars + sealed evidence boxes inside
        b.addBox(cx - colW * 0.42, ry, ed * 0.48, 0.022, rowH - 0.03, 0.025, { materialRole: 'frame', layer: 'body' });
        b.addBox(cx + colW * 0.42, ry, ed * 0.48, 0.022, rowH - 0.03, 0.025, { materialRole: 'frame', layer: 'body' });
        b.addBox(cx, ry + rowH * 0.42, ed * 0.48, colW - 0.04, 0.022, 0.025, { materialRole: 'frame', layer: 'body' });
        for (let m = -1; m <= 1; m++) {
          b.addBox(cx + m * (colW * 0.24), ry, ed * 0.48, 0.01, rowH - 0.08, 0.01, { materialRole: 'darkMetal', layer: 'detail' });
          b.addBox(cx, ry + m * (rowH * 0.24), ed * 0.48, colW - 0.08, 0.01, 0.01, { materialRole: 'darkMetal', layer: 'detail' });
        }
        b.addBox(cx + colW * 0.34, ry, ed * 0.49, 0.035, 0.055, 0.024, { materialRole: 'brass', layer: 'detail' });
        if ((c + r) % 2 === 0) {
          b.addBox(cx, ry - rowH * 0.16, 0.02, colW * 0.68, rowH * 0.48, ed * 0.65, { materialRole: 'wood', layer: 'body' });
          b.addBox(cx, ry - rowH * 0.16, ed * 0.35, colW * 0.69, 0.03, 0.015, { materialRole: 'safetyRed', layer: 'detail' });
        }
      }
    }
    objCreateSignPlane(group, 'Evidence Only', Math.min(ew * 0.6, 0.9), 0.16, '#8c221d', '#ffffff', {
      x: 0,
      y: eh - 0.12,
      z: ed * 0.5 + 0.015
    });
  } else if (type === 'detective_board') {
    const bw = clamp(w, 1.35, 2.25);
    const bh = clamp(h, 1.05, 1.45);
    const isWall = cfg.attachmentProfile === 'wall_mounted';
    const boardY = isWall ? 0.05 : 1.32;
    const boardZ = isWall ? 0.045 : 0;
    if (!isWall) {
      b.addBox(-bw * 0.42, 0.98, 0, 0.045, 1.92, 0.045, { materialRole: 'frame', layer: 'body' });
      b.addBox(bw * 0.42, 0.98, 0, 0.045, 1.92, 0.045, { materialRole: 'frame', layer: 'body' });
      b.addBox(-bw * 0.42, 0.04, 0, 0.06, 0.08, 0.52, { materialRole: 'frame', layer: 'body' });
      b.addBox(bw * 0.42, 0.04, 0, 0.06, 0.08, 0.52, { materialRole: 'frame', layer: 'body' });
      b.addCasterWheels(0, 0, bw * 0.84, 0.46, 0.032, 'rubber', 'frame', 0);
    }
    // Cork pinboard + aluminum perimeter
    b.addBox(0, boardY, boardZ, bw, bh, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, boardY, boardZ + 0.016, bw - 0.08, bh - 0.08, 0.022, { materialRole: 'wood', layer: 'body' });
    // Pinned suspect photos & index documents
    const pins = [
      [-bw * 0.34, boardY + bh * 0.22, 0.18, 0.22],
      [-bw * 0.08, boardY + bh * 0.25, 0.22, 0.18],
      [bw * 0.26, boardY + bh * 0.2, 0.2, 0.24],
      [-bw * 0.22, boardY - bh * 0.14, 0.22, 0.2],
      [bw * 0.06, boardY - bh * 0.12, 0.26, 0.2],
      [bw * 0.32, boardY - bh * 0.18, 0.18, 0.2]
    ];
    for (let i = 0; i < pins.length; i++) {
      const [px, py, pw, ph] = pins[i];
      b.addBox(px, py, boardZ + 0.032, pw, ph, 0.008, { materialRole: 'whiteTrim', layer: 'detail', rotZDeg: (i % 2 === 0 ? 4 : -5) });
      b.addCylinder(px, py + ph * 0.38, boardZ + 0.04, 0.012, 0.012, 0.016, 8, 'z', 'safetyRed', 'detail');
      if (cfg.showCrimeStrings !== false && i < pins.length - 1) {
        const next = pins[i + 1];
        b.addPipeSegment(px, py + ph * 0.35, boardZ + 0.042, next[0], next[1] + next[3] * 0.35, boardZ + 0.042, 0.004, 6, 'safetyRed', 'detail', true);
      }
    }
    objCreateSignPlane(group, cfg.signText || 'Case Investigation', Math.min(bw * 0.56, 0.95), 0.14, '#212c38', '#ffffff', {
      x: 0,
      y: boardY + bh * 0.44,
      z: boardZ + 0.036
    });
  } else if (type === 'duty_gear_locker') {
    const lw = clamp(w, 0.9, 1.35);
    const ld = clamp(d, 0.52, 0.68);
    const lh = clamp(h, 1.85, 2.15);
    b.addBox(0, lh * 0.5, -0.02, lw, lh, ld - 0.04, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.04, 0.02, lw, 0.08, ld + 0.02, { materialRole: 'frame', layer: 'body' });
    // Right door closed + left door ajar revealing tactical vest & helmet
    b.addBox(lw * 0.24, lh * 0.52, ld * 0.49, lw * 0.46, lh - 0.12, 0.024, { materialRole: 'secondary', layer: 'body' });
    b.addLouverGrille(lw * 0.24, lh * 0.82, ld * 0.505, lw * 0.34, 0.14, 4, 'z', 'frame', 'detail');
    b.addBox(lw * 0.06, lh * 0.52, ld * 0.51, 0.025, 0.12, 0.025, { materialRole: 'chrome', layer: 'detail' });
    // Left bay open door rotated out
    b.addBox(-lw * 0.56, lh * 0.52, ld * 0.56, lw * 0.44, lh - 0.12, 0.024, { materialRole: 'secondary', layer: 'body', rotYDeg: -38 });
    // Interior shelf helmet, duty vest & radio charger
    b.addBox(-lw * 0.24, lh * 0.76, 0, lw * 0.42, 0.025, ld * 0.75, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(-lw * 0.24, lh * 0.86, 0.05, 0.11, 0.14, 0.16, 10, 'y', 'darkMetal', 'detail');
    b.addBox(-lw * 0.24, lh * 0.54, 0.04, 0.28, 0.34, 0.16, { materialRole: 'accent', layer: 'detail' });
    b.addBox(-lw * 0.16, lh * 0.26, 0.08, 0.14, 0.08, 0.12, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(-lw * 0.16, lh * 0.32, 0.08, 0.008, 0.008, 0.09, 6, 'y', 'signalGreen', 'detail');
  } else if (type === 'dispatch_console') {
    const dw = clamp(w, 1.55, 2.45);
    const dd = clamp(d, 0.78, 1.05);
    const deskH = 0.76;
    b.addChamferBox(0, deskH, 0, dw, 0.045, dd, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addBox(-dw * 0.4, deskH * 0.5, 0, 0.08, deskH - 0.04, dd * 0.85, { materialRole: 'frame', layer: 'body' });
    b.addBox(dw * 0.4, deskH * 0.5, 0, 0.08, deskH - 0.04, dd * 0.85, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, deskH * 0.52, -dd * 0.36, dw * 0.82, deskH * 0.55, 0.05, { materialRole: 'secondary', layer: 'body' });
    // Raised 3-monitor command bridge + status lights + radio handset
    b.addBox(0, deskH + 0.1, -dd * 0.24, dw * 0.84, 0.16, 0.22, { materialRole: 'darkMetal', layer: 'body' });
    for (let i = -1; i <= 1; i++) {
      const mx = i * (dw * 0.28);
      const yaw = -i * 0.22;
      b.addBox(mx, deskH + 0.36, -dd * 0.22 + Math.abs(i) * 0.05, 0.48, 0.32, 0.028, { materialRole: 'darkMetal', layer: 'body', rotY: yaw });
      objCreateScreenPlane(group, i === 0 ? 'security_cctv' : (i < 0 ? 'info_display' : 'futuristic_hud'), 0.44, 0.28, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed + i * 7, {
        x: mx + Math.sin(yaw) * 0.016,
        y: deskH + 0.36,
        z: -dd * 0.22 + Math.abs(i) * 0.05 + Math.cos(yaw) * 0.016,
        rotY: yaw
      });
    }
    b.addCylinder(dw * 0.36, deskH + 0.23, -dd * 0.24, 0.045, 0.052, 0.1, 10, 'y', 'signalRed', 'detail');
    b.addBox(0, deskH + 0.038, dd * 0.16, 0.48, 0.025, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
    meta.lightSources.push({ id: 'dispatch_beacon', position: [dw * 0.36, deskH + 0.32, -dd * 0.24], color: '#ff3b30', radius: 1.5, enabled: true });
    meta.snapAnchors.push({ id: 'operator_seat', position: [0, 0, dd * 0.5 + 0.35], normal: [0, 0, 1] });
  } else if (type === 'police_call_box') {
    const bw = clamp(w, 1.05, 1.55);
    const bd = clamp(d, 1.05, 1.55);
    const bh = clamp(h, 2.25, 2.85);
    const bodyH = bh - 0.34;
    // Stepped plinth base & four fluted corner pillars
    b.addBox(0, 0.04, 0, bw + 0.08, 0.08, bd + 0.08, { materialRole: 'frame', layer: 'body' });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.addBox(sx * (bw * 0.46), 0.08 + bodyH * 0.5, sz * (bd * 0.46), 0.12, bodyH, 0.12, { materialRole: 'primary', layer: 'body' });
      }
    }
    // Main recessed cabinet core + lower & middle door panels on all 4 sides
    b.addBox(0, 0.08 + bodyH * 0.5, 0, bw * 0.88, bodyH - 0.06, bd * 0.88, { materialRole: 'primary', layer: 'body' });
    const panelHeights = [0.42, 0.92, 1.38];
    for (const py of panelHeights) {
      for (const side of [1, -1]) {
        b.addBox(-bw * 0.21, py, side * (bd * 0.45), bw * 0.34, 0.36, 0.03, { materialRole: 'secondary', layer: 'detail' });
        b.addBox(bw * 0.21, py, side * (bd * 0.45), bw * 0.34, 0.36, 0.03, { materialRole: 'secondary', layer: 'detail' });
        b.addBox(side * (bw * 0.45), py, -bd * 0.21, 0.03, 0.36, bd * 0.34, { materialRole: 'secondary', layer: 'detail' });
        b.addBox(side * (bw * 0.45), py, bd * 0.21, 0.03, 0.36, bd * 0.34, { materialRole: 'secondary', layer: 'detail' });
      }
    }
    // White telephone instruction plaque & pull-to-open phone recess + brass door handle
    b.addBox(-bw * 0.21, 1.38, bd * 0.475, bw * 0.26, 0.28, 0.015, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addCylinder(bw * 0.21, 1.38, bd * 0.475, 0.095, 0.095, 0.018, 12, 'z', 'whiteTrim', 'detail');
    b.addBox(bw * 0.04, 1.05, bd * 0.48, 0.028, 0.1, 0.03, { materialRole: 'brass', layer: 'detail' });
    // Upper 6-pane frosted windows on all 4 facades
    const winY = bodyH * 0.77 + 0.06;
    const winH = 0.42;
    for (const side of [1, -1]) {
      for (const wx of [-bw * 0.21, bw * 0.21]) {
        b.addBox(wx, winY, side * (bd * 0.455), bw * 0.34, winH, 0.025, { materialRole: 'glass', layer: 'detail' });
        b.addBox(wx, winY, side * (bd * 0.47), bw * 0.35, 0.02, 0.014, { materialRole: 'whiteTrim', layer: 'detail' });
        b.addBox(wx, winY, side * (bd * 0.47), 0.02, winH, 0.014, { materialRole: 'whiteTrim', layer: 'detail' });
      }
      for (const wz of [-bd * 0.21, bd * 0.21]) {
        b.addBox(side * (bw * 0.455), winY, wz, 0.025, winH, bd * 0.34, { materialRole: 'glass', layer: 'detail' });
        b.addBox(side * (bw * 0.47), winY, wz, 0.014, 0.02, bd * 0.35, { materialRole: 'whiteTrim', layer: 'detail' });
      }
    }
    // Iconic transom sign band + Police Box signage on front & back
    const signY = 0.08 + bodyH - 0.06;
    b.addBox(0, signY, 0, bw + 0.04, 0.18, bd + 0.04, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, signY + 0.11, 0, bw + 0.09, 0.045, bd + 0.09, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Police Box', bw * 0.82, 0.13, '#10161e', '#f5f8fc', {
      x: 0,
      y: signY,
      z: bd * 0.5 + 0.026
    });
    objCreateSignPlane(group, cfg.signText || 'Police Box', bw * 0.82, 0.13, '#10161e', '#f5f8fc', {
      x: 0,
      y: signY,
      z: -bd * 0.5 - 0.026,
      rotY: Math.PI
    });
    // Stepped pyramid roof & glowing top beacon lamp
    b.addTrapezoidBox(0, signY + 0.19, 0, bw * 0.92, bd * 0.92, bw * 0.28, bd * 0.28, 0.14, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, signY + 0.34, 0, 0.072, 0.082, 0.16, 8, 'y', 'lampGlow', 'detail');
    b.addCone(0, signY + 0.44, 0, 0.09, 0.05, 8, 'primary', 'detail');
    meta.lightSources.push({ id: 'police_box_beacon', position: [0, signY + 0.34, 0], color: '#d9ecff', radius: 2.2, enabled: true });
  } else {
    // armory_rack
    const aw = clamp(w, 1.1, 1.75);
    const ad = clamp(d, 0.5, 0.72);
    const ah = clamp(h, 1.85, 2.25);
    b.addBox(0, ah * 0.5, 0, aw, ah, ad, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, ah * 0.5, 0.02, aw - 0.1, ah - 0.14, ad - 0.04, { materialRole: 'darkMetal', layer: 'body' });
    const bayCount = Math.max(4, Math.round(aw * 4));
    for (let i = 0; i < bayCount; i++) {
      const gx = -aw * 0.36 + (i / Math.max(1, bayCount - 1)) * (aw * 0.72);
      b.addBox(gx, ah * 0.58, 0, 0.032, 0.78, 0.08, { materialRole: 'primary', layer: 'detail' });
      b.addBox(gx, ah * 0.32, 0.02, 0.026, 0.16, 0.12, { materialRole: 'chrome', layer: 'detail' });
    }
    // Lower Pelican tactical gear cases + keypad access box on side pillar
    b.addBox(-aw * 0.22, 0.22, 0.04, aw * 0.38, 0.22, ad * 0.7, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(aw * 0.22, 0.22, 0.04, aw * 0.38, 0.22, ad * 0.7, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(aw * 0.22, 0.34, 0.04, 0.08, 0.025, 0.06, { materialRole: 'warningYellow', layer: 'detail' });
    b.addBox(aw * 0.49, ah * 0.62, ad * 0.36, 0.06, 0.2, 0.14, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(aw * 0.495, ah * 0.68, ad * 0.44, 0.02, 0.03, 0.02, { materialRole: 'signalGreen', layer: 'detail' });
  }

  meta.interaction = { interactable: true, actionType: type };
}

function mpclBuildCourthouseProp(group, cfg, b, mats, meta) {
  const type = cfg.civicType || 'dmv_teller_window';
  const w = clamp(cfg.width || 2.4, 0.72, 3.6);
  const d = clamp(cfg.depth || 0.9, 0.46, 1.45);
  const h = clamp(cfg.height || 1.92, 0.76, 2.25);

  if (type === 'dmv_teller_window') {
    const baseH = 0.94;
    const bays = Math.round(clamp(cfg.bayCount || 2, 1, 4));
    b.addBox(0, baseH * 0.5, 0.22, w, baseH, 0.24, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, baseH + 0.02, 0.18, w + 0.05, 0.045, 0.5, 0.008, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.74, -0.22, w - 0.08, 0.04, 0.46, { materialRole: 'secondary', layer: 'body' });
    const glassH = clamp(h - baseH, 0.75, 1.15);
    const bayW = (w - 0.12) / bays;
    b.addBox(0, baseH + glassH + 0.04, 0.22, w + 0.02, 0.08, 0.1, { materialRole: 'frame', layer: 'body' });
    b.addBox(-w * 0.48, baseH + glassH * 0.5, 0.22, 0.055, glassH, 0.09, { materialRole: 'frame', layer: 'body' });
    b.addBox(w * 0.48, baseH + glassH * 0.5, 0.22, 0.055, glassH, 0.09, { materialRole: 'frame', layer: 'body' });
    for (let i = 0; i < bays; i++) {
      const bx = -w * 0.5 + 0.06 + bayW * 0.5 + i * bayW;
      b.addBox(bx, baseH + glassH * 0.5, 0.22, bayW - 0.05, glassH - 0.04, 0.018, { materialRole: 'glass', layer: 'detail' });
      b.addCylinder(bx, baseH + 0.36, 0.236, 0.068, 0.068, 0.024, 10, 'z', 'chrome', 'detail');
      b.addBox(bx, baseH + 0.048, 0.24, 0.28, 0.025, 0.18, { materialRole: 'darkMetal', layer: 'detail' });
      if (i < bays - 1) {
        b.addBox(bx + bayW * 0.5, baseH + glassH * 0.5, 0.22, 0.05, glassH, 0.09, { materialRole: 'frame', layer: 'body' });
      }
    }
    objCreateSignPlane(group, cfg.signText || 'Dmv Windows 01-03', Math.min(w * 0.72, 1.65), 0.2, '#1f456e', '#ffffff', {
      x: 0,
      y: baseH + glassH + 0.05,
      z: 0.28
    });
  } else if (type === 'judge_dais_bench') {
    const jw = clamp(w, 2.2, 3.6);
    const jd = clamp(d, 0.95, 1.45);
    const stepH = 0.28;
    const benchH = 1.18;
    // Raised platform dais + steps
    b.addBox(0, stepH * 0.5, -0.05, jw + 0.36, stepH, jd + 0.36, { materialRole: 'wood', layer: 'body' });
    b.addBox(-jw * 0.5 - 0.3, 0.08, -0.1, 0.28, 0.16, 0.56, { materialRole: 'wood', layer: 'body' });
    // Carved walnut bench panels + fluted pilasters + wing returns
    b.addBox(0, stepH + benchH * 0.5, jd * 0.42, jw, benchH, 0.18, { materialRole: 'primary', layer: 'body' });
    b.addBox(-jw * 0.48, stepH + benchH * 0.5, 0, 0.16, benchH, jd * 0.95, { materialRole: 'primary', layer: 'body' });
    b.addBox(jw * 0.48, stepH + benchH * 0.5, 0, 0.16, benchH, jd * 0.95, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, stepH + benchH + 0.025, jd * 0.42, jw + 0.12, 0.05, 0.36, 0.01, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, stepH + 0.76, -0.04, jw - 0.22, 0.045, jd * 0.72, { materialRole: 'secondary', layer: 'body' });
    for (let i = -2; i <= 2; i++) {
      b.addBox(i * (jw * 0.21), stepH + benchH * 0.5, jd * 0.51, 0.075, benchH - 0.06, 0.04, { materialRole: 'secondary', layer: 'detail' });
    }
    b.addCylinder(0, stepH + 0.62, jd * 0.525, 0.15, 0.15, 0.03, 12, 'z', 'brass', 'detail');
    // Judge gavel, sounding block & green banker lamp on inner bench
    b.addCylinder(0.28, stepH + 0.8, 0.04, 0.06, 0.068, 0.032, 10, 'y', 'wood', 'detail');
    b.addCylinder(-0.38, stepH + 0.8, -0.12, 0.065, 0.08, 0.03, 10, 'y', 'brass', 'detail');
    b.addCylinder(-0.38, stepH + 0.95, -0.12, 0.015, 0.018, 0.28, 8, 'y', 'brass', 'detail');
    b.addBox(-0.38, stepH + 1.1, -0.06, 0.18, 0.075, 0.1, { materialRole: 'signalGreen', layer: 'detail' });
    meta.snapAnchors.push({ id: 'judge_seat', position: [0, stepH, -0.45], normal: [0, 0, -1] });
  } else if (type === 'courtroom_pew') {
    const pw = clamp(w, 1.8, 3.4);
    const pd = clamp(d, 0.54, 0.68);
    const legH = 0.44;
    b.addBox(-pw * 0.48, 0.5, 0, 0.07, 1.0, pd, { materialRole: 'primary', layer: 'body' });
    b.addBox(pw * 0.48, 0.5, 0, 0.07, 1.0, pd, { materialRole: 'primary', layer: 'body' });
    if (pw > 2.4) {
      b.addBox(0, 0.24, 0, 0.06, 0.48, pd * 0.85, { materialRole: 'primary', layer: 'body' });
    }
    b.addBox(0, legH, 0.03, pw - 0.1, 0.045, pd - 0.12, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, legH + 0.035, 0.03, pw - 0.12, 0.04, pd - 0.16, { materialRole: 'upholstery', layer: 'detail' });
    b.addBox(0, 0.74, -pd * 0.4, pw - 0.1, 0.54, 0.045, { materialRole: 'wood', layer: 'body', rotXDeg: -8 });
    b.addBox(0, 1.02, -pd * 0.43, pw - 0.04, 0.055, 0.075, { materialRole: 'primary', layer: 'body' });
  } else if (type === 'council_lectern') {
    const lw = clamp(w, 0.68, 0.96);
    const ld = clamp(d, 0.5, 0.68);
    const lh = clamp(h, 1.12, 1.24);
    b.addBox(0, 0.04, 0, lw + 0.06, 0.08, ld + 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, lh * 0.5, 0, lw * 0.88, lh - 0.12, ld * 0.8, { materialRole: 'wood', layer: 'body' });
    b.addChamferBox(0, lh - 0.04, 0, lw + 0.08, 0.05, ld + 0.08, 0.01, { materialRole: 'primary', layer: 'body', rotXDeg: 10 });
    b.addCylinder(0, lh * 0.64, ld * 0.415, 0.12, 0.12, 0.022, 12, 'z', 'brass', 'detail');
    // Gooseneck mics & timer screen
    b.addCylinder(-lw * 0.24, lh + 0.12, ld * 0.1, 0.008, 0.01, 0.24, 6, 'y', 'chrome', 'detail');
    b.addCylinder(lw * 0.24, lh + 0.12, ld * 0.1, 0.008, 0.01, 0.24, 6, 'y', 'chrome', 'detail');
    objCreateScreenPlane(group, 'terminal', 0.18, 0.08, '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: lh - 0.01,
      z: -ld * 0.18,
      rotX: -Math.PI * 0.4
    });
  } else if (type === 'blueprint_flat_file') {
    const fw = clamp(w, 1.15, 1.48);
    const fd = clamp(d, 0.82, 1.05);
    const fh = clamp(h, 0.9, 1.18);
    b.addBox(0, 0.08, 0, fw - 0.06, 0.16, fd - 0.06, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, (fh + 0.16) * 0.5, 0, fw, fh - 0.16, fd, 0.01, { materialRole: 'primary', layer: 'body' });
    const drawers = 6;
    const dh = (fh - 0.24) / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = 0.2 + dh * 0.5 + i * dh;
      b.addBox(0, dy, fd * 0.5 + 0.01, fw - 0.08, dh * 0.78, 0.02, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(0, dy, fd * 0.5 + 0.025, 0.24, 0.018, 0.025, { materialRole: 'chrome', layer: 'detail' });
      b.addBox(-fw * 0.3, dy, fd * 0.5 + 0.022, 0.08, 0.026, 0.01, { materialRole: 'brass', layer: 'detail' });
    }
    // Blueprint rolls resting on top + unrolled drafting plan sheet
    b.addBox(0, fh + 0.008, 0, fw * 0.64, 0.01, fd * 0.62, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addCylinder(-fw * 0.34, fh + 0.036, -fd * 0.1, 0.035, 0.035, fd * 0.74, 10, 'z', 'whiteTrim', 'detail');
    b.addCylinder(-fw * 0.34, fh + 0.036, -fd * 0.1, 0.038, 0.038, 0.04, 10, 'z', 'accent', 'detail');
  } else {
    // dmv_photo_stand
    const pw = clamp(w, 1.05, 1.45);
    b.addBox(0, 0.03, -0.35, pw, 0.06, 0.34, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(-pw * 0.44, 1.05, -0.35, 0.025, 0.025, 2.0, 8, 'y', 'chrome', 'body');
    b.addCylinder(pw * 0.44, 1.05, -0.35, 0.025, 0.025, 2.0, 8, 'y', 'chrome', 'body');
    b.addBox(0, 1.38, -0.34, pw * 0.84, 1.32, 0.03, { materialRole: 'accent', layer: 'body' });
    // Front applicant stool & camera flash tower
    b.addCylinder(0, 0.26, 0.02, 0.028, 0.032, 0.5, 8, 'y', 'chrome', 'body');
    b.addCylinder(0, 0.02, 0.02, 0.2, 0.22, 0.04, 10, 'y', 'frame', 'body');
    b.addCylinder(0, 0.52, 0.02, 0.17, 0.17, 0.055, 12, 'y', 'darkMetal', 'body');
    b.addBox(0, 0.02, 0.56, 0.34, 0.04, 0.34, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, 0.78, 0.56, 0.032, 0.038, 1.5, 8, 'y', 'darkMetal', 'body');
    b.addBox(0, 1.56, 0.56, 0.24, 0.18, 0.16, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 1.72, 0.56, 0.26, 0.12, 0.08, { materialRole: 'lampGlow', layer: 'detail' });
  }

  meta.interaction = { interactable: true, actionType: type };
}

function mpclBuildWaitingRoomAmenity(group, cfg, b, mats, meta) {
  const type = cfg.amenityType || 'ticket_stand';
  const w = clamp(cfg.width || 0.76, 0.32, 1.35);
  const d = clamp(cfg.depth || 0.54, 0.12, 1.15);
  const h = clamp(cfg.height || 1.42, 0.48, 1.85);

  if (type === 'ticket_stand') {
    b.addCylinder(0, 0.025, 0, 0.2, 0.22, 0.05, 12, 'y', 'frame', 'body');
    b.addCylinder(0, 0.64, 0, 0.024, 0.028, 1.24, 10, 'y', 'chrome', 'body');
    // Classic red snail-shell ticket dispenser housing + white ticket curl
    b.addCylinder(0, 1.3, 0.02, 0.12, 0.12, 0.09, 12, 'x', 'safetyRed', 'body');
    b.addBox(0, 1.24, 0.1, 0.075, 0.09, 0.08, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, 1.18, 0.14, 0.048, 0.085, 0.012, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: 28 });
    b.addBox(0, 1.52, 0, 0.34, 0.22, 0.025, { materialRole: 'frame', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Take A Number', 0.31, 0.19, '#193554', '#ffffff', {
      x: 0,
      y: 1.52,
      z: 0.016
    });
    if (cfg.hasSecondaryTray !== false) {
      b.addBox(0.18, 0.98, 0, 0.18, 0.14, 0.14, { materialRole: 'darkMetal', layer: 'detail' });
      b.addCylinder(0.18, 0.98, 0, 0.11, 0.11, 0.02, 10, 'y', 'chrome', 'detail');
    }
  } else if (type === 'kids_bead_table') {
    const kw = clamp(w, 0.68, 0.95);
    const kd = clamp(d, 0.68, 0.95);
    const th = 0.46;
    b.addCylinder(0, th, 0, kw * 0.48, kw * 0.5, 0.055, 14, 'y', 'wood', 'body');
    b.addSupportLegs(0, 0, th - 0.02, kw * 0.6, kd * 0.6, 0.042, 'accent', 0);
    // Colorful wire arches & sliding wooden bead blocks
    const arches = [
      { ox: -kw * 0.18, oz: -0.06, wSpan: 0.24, peak: 0.34, role: 'safetyRed' },
      { ox: kw * 0.08, oz: 0.08, wSpan: 0.28, peak: 0.4, role: 'signalGreen' },
      { ox: kw * 0.16, oz: -0.1, wSpan: 0.22, peak: 0.28, role: 'signalAmber' }
    ];
    for (const arch of arches) {
      b.addPipeSegment(arch.ox - arch.wSpan * 0.5, th + 0.03, arch.oz, arch.ox - arch.wSpan * 0.25, th + arch.peak, arch.oz, 0.008, 6, arch.role, 'detail');
      b.addPipeSegment(arch.ox - arch.wSpan * 0.25, th + arch.peak, arch.oz, arch.ox + arch.wSpan * 0.25, th + arch.peak, arch.oz, 0.008, 6, arch.role, 'detail');
      b.addPipeSegment(arch.ox + arch.wSpan * 0.25, th + arch.peak, arch.oz, arch.ox + arch.wSpan * 0.5, th + 0.03, arch.oz, 0.008, 6, arch.role, 'detail');
      b.addBox(arch.ox, th + arch.peak, arch.oz, 0.048, 0.042, 0.042, { materialRole: 'accent', layer: 'detail', rotZDeg: 22 });
      b.addCylinder(arch.ox - arch.wSpan * 0.28, th + arch.peak * 0.62, arch.oz, 0.025, 0.025, 0.035, 8, 'y', arch.role, 'detail');
    }
    if (cfg.hasSecondaryTray !== false) {
      b.addCylinder(-kw * 0.42, 0.14, kd * 0.42, 0.12, 0.14, 0.28, 10, 'y', 'primary', 'body');
      b.addCylinder(kw * 0.42, 0.14, -kd * 0.42, 0.12, 0.14, 0.28, 10, 'y', 'accent', 'body');
    }
  } else if (type === 'bp_kiosk') {
    // Pharmacy / clinic automated blood pressure kiosk with seat + cuff arm tunnel
    b.addBox(0, 0.03, 0, 1.05, 0.06, 0.72, { materialRole: 'frame', layer: 'body' });
    b.addBox(-0.24, 0.26, 0, 0.46, 0.42, 0.52, { materialRole: 'secondary', layer: 'body' });
    b.addBox(-0.24, 0.48, 0, 0.44, 0.05, 0.48, { materialRole: 'upholstery', layer: 'detail' });
    b.addBox(-0.24, 0.72, -0.22, 0.44, 0.44, 0.07, { materialRole: 'upholstery', layer: 'detail' });
    b.addChamferBox(0.24, 0.74, -0.04, 0.48, 1.38, 0.52, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(0.18, 0.74, 0.18, 0.26, 0.22, 0.34, { materialRole: 'darkMetal', layer: 'body', rotXDeg: -14 });
    b.addCylinder(0.18, 0.74, 0.24, 0.085, 0.095, 0.28, 12, 'z', 'accent', 'detail');
    objCreateScreenPlane(group, 'info_display', 0.34, 0.24, cfg.emissiveColor || '#38b6d6', cfg.condition, cfg.seed, {
      x: 0.24,
      y: 1.18,
      z: 0.23
    });
  } else if (type === 'coffee_hospitality_station') {
    const cw = clamp(w, 0.95, 1.45);
    const cd = clamp(d, 0.52, 0.7);
    const ch = 0.88;
    b.addChamferBox(0, ch * 0.5, 0, cw, ch, cd, 0.01, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ch + 0.02, 0, cw + 0.04, 0.04, cd + 0.04, { materialRole: 'secondary', layer: 'body' });
    // Twin insulated coffee pump urns + cup tower + sugar caddy
    for (const px of [-cw * 0.26, -cw * 0.04]) {
      b.addCylinder(px, ch + 0.22, -0.05, 0.085, 0.092, 0.36, 12, 'y', 'chrome', 'detail');
      b.addBox(px, ch + 0.42, -0.05, 0.11, 0.04, 0.11, { materialRole: 'darkMetal', layer: 'detail' });
      b.addCylinder(px, ch + 0.3, 0.055, 0.018, 0.018, 0.05, 8, 'z', 'darkMetal', 'detail');
    }
    b.addBox(cw * 0.24, ch + 0.16, -0.08, 0.16, 0.26, 0.16, { materialRole: 'frame', layer: 'detail' });
    b.addCylinder(cw * 0.24, ch + 0.32, -0.08, 0.042, 0.036, 0.1, 10, 'y', 'whiteTrim', 'detail');
    b.addBox(cw * 0.38, ch + 0.09, 0.08, 0.18, 0.1, 0.24, { materialRole: 'wood', layer: 'detail' });
    b.addBox(cw * 0.28, ch * 0.65, cd * 0.5 + 0.008, 0.16, 0.14, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
  } else if (type === 'wall_pamphlet_rack') {
    const rw = clamp(w, 0.64, 1.05);
    const rh = clamp(h, 0.72, 1.08);
    const wallZ = cfg.attachmentProfile === 'wall_mounted' ? 0.04 : 0.02;
    if (cfg.attachmentProfile !== 'wall_mounted') {
      b.addBox(0, 0.025, 0, rw * 0.85, 0.05, 0.36, { materialRole: 'frame', layer: 'body' });
      b.addBox(-rw * 0.38, 0.82, -0.02, 0.04, 1.6, 0.05, { materialRole: 'frame', layer: 'body' });
      b.addBox(rw * 0.38, 0.82, -0.02, 0.04, 1.6, 0.05, { materialRole: 'frame', layer: 'body' });
    }
    const baseY = cfg.attachmentProfile === 'wall_mounted' ? 0.05 : 1.08;
    b.addBox(0, baseY, wallZ, rw, rh, 0.035, { materialRole: 'primary', layer: 'body' });
    const cols = 3;
    const rows = 3;
    const pRoles = ['accent', 'safetyRed', 'signalGreen', 'signalAmber', 'whiteTrim'];
    for (let r = 0; r < rows; r++) {
      const py = baseY - rh * 0.3 + r * (rh * 0.3);
      for (let c = 0; c < cols; c++) {
        const px = -rw * 0.3 + c * (rw * 0.3);
        b.addBox(px, py + 0.03, wallZ + 0.035, rw * 0.2, 0.18, 0.016, { materialRole: pRoles[(r + c) % pRoles.length], layer: 'detail' });
        b.addBox(px, py - 0.03, wallZ + 0.052, rw * 0.24, 0.09, 0.035, { materialRole: 'glass', layer: 'detail' });
      }
    }
    objCreateSignPlane(group, 'Patient Info', rw * 0.78, 0.12, '#1f597d', '#ffffff', {
      x: 0,
      y: baseY + rh * 0.44,
      z: wallZ + 0.022
    });
  } else if (type === 'height_weight_scale') {
    b.addBox(0, 0.05, 0, 0.36, 0.1, 0.44, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.105, 0.03, 0.3, 0.015, 0.32, { materialRole: 'rubber', layer: 'detail' });
    b.addCylinder(0, 0.72, -0.18, 0.028, 0.035, 1.28, 8, 'y', 'chrome', 'body');
    b.addBox(0, 1.38, -0.16, 0.38, 0.06, 0.08, { materialRole: 'brass', layer: 'detail' });
    b.addBox(0.08, 1.38, -0.11, 0.06, 0.048, 0.03, { materialRole: 'darkMetal', layer: 'detail' });
    // Extendable stadiometer rod + swing arm
    b.addCylinder(0, 1.68, -0.18, 0.014, 0.014, 0.72, 8, 'y', 'chrome', 'body');
    b.addBox(0, 1.98, -0.05, 0.04, 0.024, 0.26, { materialRole: 'chrome', layer: 'detail' });
  } else {
    // snellen_eye_chart
    const isWall = cfg.attachmentProfile === 'wall_mounted';
    const cy = isWall ? 0.05 : 1.48;
    const cz = isWall ? 0.04 : 0;
    if (!isWall) {
      b.addCylinder(0, 0.02, 0, 0.22, 0.24, 0.04, 10, 'y', 'frame', 'body');
      b.addCylinder(0, 0.75, 0, 0.025, 0.028, 1.44, 8, 'y', 'chrome', 'body');
    }
    b.addBox(0, cy, cz, 0.44, 0.68, 0.065, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, cy, cz + 0.035, 0.38, 0.62, 0.012, { materialRole: 'lampGlow', layer: 'detail' });
    objCreateSignPlane(group, 'E  F P  T O Z', 0.36, 0.56, '#f6fafd', '#14191f', {
      x: 0,
      y: cy + 0.04,
      z: cz + 0.045,
      lit: true
    });
    b.addBox(-0.08, cy - 0.24, cz + 0.044, 0.14, 0.03, 0.012, { materialRole: 'signalGreen', layer: 'detail' });
    b.addBox(0.08, cy - 0.24, cz + 0.044, 0.14, 0.03, 0.012, { materialRole: 'signalRed', layer: 'detail' });
  }

  meta.interaction = { interactable: true, actionType: type };
}

function mpclBuildLabApparatus(group, cfg, b, mats, meta) {
  const type = cfg.labApparatusType || 'glovebox_isolator';
  const w = clamp(cfg.width || 1.45, 0.38, 2.25);
  const d = clamp(cfg.depth || 0.88, 0.32, 1.45);
  const h = clamp(cfg.height || 1.68, 0.42, 2.32);

  if (type === 'glovebox_isolator') {
    const gw = clamp(w, 1.15, 1.85);
    const gd = clamp(d, 0.72, 0.96);
    b.addSupportLegs(0, 0, 0.76, gw - 0.14, gd - 0.14, 0.055, 'frame', 0);
    b.addBox(0, 0.78, 0, gw, 0.045, gd, { materialRole: 'frame', layer: 'body' });
    // Stainless chamber + sloped tempered glass face + 2 circular glove ports
    b.addBox(-0.1, 1.24, -0.04, gw * 0.76, 0.88, gd * 0.82, { materialRole: 'primary', layer: 'body' });
    b.addBox(-0.1, 1.28, gd * 0.38, gw * 0.72, 0.68, 0.025, { materialRole: 'glass', layer: 'detail', rotXDeg: -10 });
    for (const gx of [-0.34, 0.14]) {
      b.addPrismRing(gx, 1.14, gd * 0.41, 0.115, 0.088, 0.045, 12, 'z', 'darkMetal', 'detail');
      b.addCylinder(gx, 1.14, gd * 0.31, 0.065, 0.082, 0.18, 10, 'z', 'rubber', 'detail');
    }
    // Side cylindrical vacuum airlock antechamber + top Hepa pressure box
    b.addCylinder(gw * 0.42, 1.12, 0, 0.16, 0.16, 0.36, 12, 'x', 'chrome', 'body');
    b.addBox(-0.1, 1.76, -0.06, gw * 0.56, 0.18, gd * 0.56, { materialRole: 'secondary', layer: 'detail' });
    b.addCylinder(-0.26, 1.76, gd * 0.24, 0.045, 0.045, 0.03, 10, 'z', 'whiteTrim', 'detail');
  } else if (type === 'gas_cylinder_rack') {
    const rw = clamp(w, 0.75, 1.35);
    const rd = clamp(d, 0.46, 0.68);
    const tanks = Math.round(clamp(cfg.tankCount || 2, 1, 4));
    b.addBox(0, 0.04, 0, rw, 0.08, rd, { materialRole: 'frame', layer: 'body' });
    b.addBox(-rw * 0.46, 0.58, -rd * 0.38, 0.05, 1.12, 0.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(rw * 0.46, 0.58, -rd * 0.38, 0.05, 1.12, 0.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.92, -rd * 0.38, rw, 0.06, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.92, rd * 0.34, rw, 0.022, 0.022, { materialRole: 'darkMetal', layer: 'detail' });
    const tankRoles = ['primary', 'signalGreen', 'accent', 'secondary'];
    for (let i = 0; i < tanks; i++) {
      const tx = tanks === 1 ? 0 : -rw * 0.32 + (i / (tanks - 1)) * (rw * 0.64);
      const role = tankRoles[i % tankRoles.length];
      b.addCylinder(tx, 0.72, 0, 0.115, 0.115, 1.24, 12, 'y', role, 'body');
      b.addCylinder(tx, 1.4, 0, 0.04, 0.115, 0.14, 12, 'y', role, 'body');
      b.addCylinder(tx, 1.51, 0, 0.025, 0.028, 0.09, 8, 'y', 'brass', 'detail');
      b.addCylinder(tx + 0.04, 1.53, 0.05, 0.036, 0.036, 0.022, 10, 'z', 'whiteTrim', 'detail');
      b.addValveWheel(tx, 1.56, 0, 0.042, 0.04, 'y', 'accent', 'brass');
    }
  } else if (type === 'glassware_distillation') {
    const gw = clamp(w, 0.62, 0.92);
    // Tabletop stand base (y = 0)
    b.addBox(-gw * 0.22, 0.015, 0, 0.28, 0.03, 0.22, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(-gw * 0.28, 0.3, -0.06, 0.01, 0.01, 0.56, 8, 'y', 'chrome', 'body');
    b.addCylinder(-gw * 0.22, 0.12, 0.01, 0.08, 0.07, 0.12, 10, 'y', 'primary', 'body');
    b.addCylinder(-gw * 0.22, 0.22, 0.01, 0.055, 0.085, 0.14, 12, 'y', 'glass', 'detail');
    // Sloped Liebig condenser tube & receiving Erlenmeyer flask
    b.addPipeSegment(-gw * 0.22, 0.36, 0.01, gw * 0.14, 0.24, 0.01, 0.024, 10, 'glass', 'detail');
    b.addCylinder(gw * 0.18, 0.1, 0.02, 0.035, 0.075, 0.16, 10, 'y', 'glass', 'detail');
    b.addCylinder(gw * 0.18, 0.05, 0.02, 0.06, 0.068, 0.06, 10, 'y', 'signalGreen', 'detail');
    // Test tube rack with colorful sample tubes
    b.addBox(gw * 0.34, 0.06, -0.06, 0.18, 0.11, 0.08, { materialRole: 'wood', layer: 'body' });
    const tRoles = ['signalAmber', 'holoEnergy', 'safetyRed', 'signalGreen'];
    for (let i = 0; i < 4; i++) {
      b.addCylinder(gw * 0.28 + i * 0.038, 0.09, -0.06, 0.011, 0.011, 0.14, 8, 'y', tRoles[i], 'detail');
    }
  } else if (type === 'cryo_dewar_tank') {
    const cr = clamp(w * 0.45, 0.26, 0.38);
    const ch = clamp(h, 1.15, 1.55);
    b.addCasterWheels(0, 0, cr * 1.4, cr * 1.4, 0.04, 'rubber', 'frame', 0);
    b.addCylinder(0, 0.12, 0, cr * 1.02, cr * 1.02, 0.05, 14, 'y', 'frame', 'body');
    b.addCylinder(0, 0.14 + ch * 0.38, 0, cr, cr, ch * 0.72, 16, 'y', 'chrome', 'body');
    b.addPrismRing(0, 0.14 + ch * 0.75, 0, cr * 1.02, cr * 0.85, 0.12, 16, 'y', 'secondary', 'detail');
    b.addCylinder(0, 0.14 + ch * 0.84, 0, 0.05, 0.05, 0.18, 10, 'y', 'copper', 'detail');
    b.addValveWheel(0, 0.14 + ch * 0.92, 0.08, 0.065, 0.06, 'z', 'safetyRed', 'brass');
    b.addValveWheel(-0.1, 0.14 + ch * 0.86, 0, 0.055, 0.06, 'x', 'accent', 'brass');
    objCreateSignPlane(group, 'Cryo Ln2', 0.24, 0.12, '#1f4e78', '#ffffff', {
      x: 0,
      y: 0.14 + ch * 0.48,
      z: cr + 0.012
    });
  } else if (type === 'pcr_electrophoresis_kit') {
    const kw = clamp(w, 0.56, 0.82);
    // Benchtop Thermal Cycler Pcr block
    b.addChamferBox(-kw * 0.22, 0.12, 0, 0.32, 0.22, 0.34, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addBox(-kw * 0.22, 0.24, -0.02, 0.28, 0.045, 0.26, { materialRole: 'secondary', layer: 'detail' });
    objCreateScreenPlane(group, 'info_display', 0.16, 0.09, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: -kw * 0.22,
      y: 0.16,
      z: 0.175
    });
    // Acrylic Dna Electrophoresis gel box + glowing lane bands + pipette carousel
    b.addBox(kw * 0.2, 0.045, 0.04, 0.24, 0.08, 0.18, { materialRole: 'glass', layer: 'body' });
    b.addBox(kw * 0.2, 0.032, 0.04, 0.18, 0.015, 0.13, { materialRole: 'holoEnergy', layer: 'detail' });
    b.addBox(kw * 0.2, 0.11, -0.14, 0.2, 0.16, 0.12, { materialRole: 'darkMetal', layer: 'body' });
    b.addCylinder(kw * 0.36, 0.14, -0.12, 0.055, 0.075, 0.26, 10, 'y', 'chrome', 'detail');
  } else if (type === 'cleanroom_air_shower') {
    const sw = clamp(w, 1.35, 1.75);
    const sd = clamp(d, 1.05, 1.35);
    const sh = clamp(h, 2.08, 2.35);
    // Stainless walkthrough decontamination plenum booth
    b.addBox(-sw * 0.41, sh * 0.5, 0, sw * 0.18, sh, sd, { materialRole: 'primary', layer: 'body' });
    b.addBox(sw * 0.41, sh * 0.5, 0, sw * 0.18, sh, sd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, sh - 0.14, 0, sw, 0.28, sd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, sh - 0.28, 0, sw * 0.62, 0.02, sd * 0.85, { materialRole: 'lampGlow', layer: 'detail' });
    // Clear strip entry/exit panels + internal air jet nozzles
    b.addBox(-sw * 0.18, sh * 0.44, sd * 0.48, sw * 0.26, sh * 0.84, 0.018, { materialRole: 'glass', layer: 'detail' });
    b.addBox(sw * 0.18, sh * 0.44, sd * 0.48, sw * 0.26, sh * 0.84, 0.018, { materialRole: 'glass', layer: 'detail' });
    for (const ny of [0.75, 1.15, 1.55]) {
      b.addCylinder(-sw * 0.31, ny, 0, 0.025, 0.032, 0.035, 8, 'x', 'chrome', 'detail');
      b.addCylinder(sw * 0.31, ny, 0, 0.025, 0.032, 0.035, 8, 'x', 'chrome', 'detail');
    }
    b.addLouverGrille(-sw * 0.41, sh * 0.24, sd * 0.505, 0.16, 0.24, 4, 'z', 'frame', 'detail');
    b.addCylinder(sw * 0.42, sh + 0.06, sd * 0.4, 0.035, 0.04, 0.1, 10, 'y', 'signalGreen', 'detail');
    objCreateScreenPlane(group, 'info_display', 0.18, 0.14, '#4de2ff', cfg.condition, cfg.seed, {
      x: sw * 0.42,
      y: 1.32,
      z: sd * 0.506
    });
    meta.lightSources.push({ id: 'air_shower_dome', position: [0, sh - 0.35, 0], color: '#ffffff', radius: 1.8, enabled: true });
  } else if (type === 'test_tube_beaker_rack') {
    const rw = clamp(w, 0.34, 0.72);
    const rd = clamp(d, 0.18, 0.38);
    const rh = clamp(h, 0.2, 0.38);
    // Two-tier test tube rack frame (left side)
    const rackW = rw * 0.58;
    const rackX = -rw * 0.18;
    b.addBox(rackX, 0.015, 0, rackW, 0.025, rd * 0.76, { materialRole: 'frame', layer: 'body' });
    b.addBox(rackX, rh * 0.54, 0, rackW, 0.02, rd * 0.72, { materialRole: 'frame', layer: 'body' });
    for (const px of [rackX - rackW * 0.45, rackX + rackW * 0.45]) {
      b.addCylinder(px, rh * 0.28, -rd * 0.26, 0.012, 0.012, rh * 0.54, 8, 'y', 'secondary', 'body');
      b.addCylinder(px, rh * 0.28, rd * 0.26, 0.012, 0.012, rh * 0.54, 8, 'y', 'secondary', 'body');
    }
    const cols = 5;
    const reagentRoles = ['holoEnergy', 'accent', 'signalGreen', 'signalAmber', 'safetyRed'];
    for (let row = 0; row < 2; row++) {
      const tz = (row === 0 ? -1 : 1) * (rd * 0.14);
      for (let col = 0; col < cols; col++) {
        const tx = rackX - rackW * 0.32 + (col / (cols - 1)) * (rackW * 0.64);
        const tubeH = rh * 0.78;
        const fillH = tubeH * (0.36 + ((col + row * 2) % 4) * 0.13);
        const chemRole = reagentRoles[(col + row) % reagentRoles.length];
        b.addCylinder(tx, 0.03 + tubeH * 0.5, tz, 0.014, 0.014, tubeH, 8, 'y', 'glass', 'detail');
        b.addCylinder(tx, 0.03 + fillH * 0.5, tz, 0.011, 0.011, fillH, 8, 'y', chemRole, 'detail');
        if ((col + row) % 2 === 0) {
          b.addCylinder(tx, 0.03 + tubeH + 0.01, tz, 0.016, 0.013, 0.024, 8, 'y', 'rubber', 'detail');
        }
      }
    }
    // Graduated cylinder & Erlenmeyer beaker alongside the rack
    const bx = rw * 0.28;
    b.addCylinder(bx - 0.05, rh * 0.45, -0.04, 0.02, 0.02, rh * 0.88, 10, 'y', 'glass', 'detail');
    b.addCylinder(bx - 0.05, 0.012, -0.04, 0.038, 0.042, 0.02, 8, 'y', 'frame', 'detail');
    b.addCylinder(bx - 0.05, rh * 0.26, -0.04, 0.016, 0.016, rh * 0.48, 8, 'y', 'holoEnergy', 'detail');
    b.addCylinder(bx + 0.06, 0.075, 0.04, 0.026, 0.058, 0.14, 10, 'y', 'glass', 'detail');
    b.addCylinder(bx + 0.06, 0.042, 0.04, 0.04, 0.052, 0.072, 10, 'y', 'accent', 'detail');
  } else {
    // yellow_flammable_chemical_cabinet
    const cw = clamp(w, 0.92, 1.25);
    const cd = clamp(d, 0.48, 0.62);
    const ch = clamp(h, 1.52, 1.85);
    b.addChamferBox(0, ch * 0.5, 0, cw, ch, cd, 0.012, { materialRole: 'warningYellow', layer: 'body' });
    b.addBox(0, 0.04, 0, cw + 0.02, 0.08, cd + 0.02, { materialRole: 'frame', layer: 'body' });
    b.addBox(-cw * 0.24, ch * 0.52, cd * 0.5 + 0.01, cw * 0.46, ch - 0.16, 0.02, { materialRole: 'warningYellow', layer: 'detail' });
    b.addBox(cw * 0.24, ch * 0.52, cd * 0.5 + 0.01, cw * 0.46, ch - 0.16, 0.02, { materialRole: 'warningYellow', layer: 'detail' });
    b.addBox(cw * 0.05, ch * 0.52, cd * 0.5 + 0.026, 0.04, 0.14, 0.025, { materialRole: 'chrome', layer: 'detail' });
    b.addCylinder(-cw * 0.51, ch * 0.78, 0, 0.04, 0.04, 0.025, 10, 'x', 'darkMetal', 'detail');
    b.addCylinder(cw * 0.51, ch * 0.26, 0, 0.04, 0.04, 0.025, 10, 'x', 'darkMetal', 'detail');
    objCreateSignPlane(group, cfg.signText || 'Flammable Keep Clear', cw * 0.72, 0.22, '#9e1c16', '#fff2c4', {
      x: 0,
      y: ch * 0.82,
      z: cd * 0.5 + 0.026
    });
  }

  meta.interaction = { interactable: true, actionType: type };
}

export function registerMunicipalPoliceClinicsAndLabsFamilies() {
  registerObjectFamily({
    id: 'police_station_booking_cell',
    categoryId: '22_police_municipal',
    categories: ['22_police_municipal', '14_safety', 'office_public_interiors'],
    subcategory: 'Police Booking & Holding',
    subcategories: [
      'Police Booking & Holding',
      'Investigation & Evidence',
      'Public Service & Civic Facilities',
      'Security & Access Control',
      'Security Booths'
    ],
    label: 'Police Precinct, Booking & Call Box Props',
    description: 'Mugshot height-chart booking station, iron holding cell bars & bunk, interrogation table with cuff ring, mesh evidence locker, detective yarn case board, duty gear locker, 911 dispatch console, armory rack, and classic blue police call box.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['police_station', 'security', 'municipal', 'office'],
    architecturalStyle: 'municipal',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['police', 'precinct', 'mugshot', 'holding_cell', 'interrogation', 'evidence', 'detective', 'dispatch', 'armory', 'tardis', 'call_box'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Police Station Setup' },
      {
        key: 'propType',
        name: 'Precinct Station Prop',
        type: 'select',
        options: [
          ['mugshot_booking_station', 'Mugshot & Booking Station'],
          ['holding_cell_front', 'Holding Cell Bar Partition'],
          ['interrogation_table', 'Interrogation Room Table & Ring'],
          ['evidence_locker', 'Mesh Evidence Storage Locker'],
          ['detective_board', 'Detective Yarn Case Board'],
          ['duty_gear_locker', 'Patrol Officer Duty Gear Locker'],
          ['dispatch_console', 'Emergency 911 Dispatch Desk'],
          ['armory_rack', 'Tactical Armory Storage Rack'],
          ['police_call_box', 'Classic Blue Police Call Box']
        ],
        default: 'mugshot_booking_station'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.72, max: 3.25, step: 0.05, unit: 'm', default: 1.85 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.18, max: 1.65, step: 0.04, unit: 'm', default: 0.9 },
      { key: 'height', name: 'Height', type: 'number', min: 0.75, max: 2.85, step: 0.05, unit: 'm', default: 2.15 },
      { key: 'hasCellDoor', name: 'Cell Door Closed', type: 'boolean', default: true },
      { key: 'showCrimeStrings', name: 'Detective Yarn Links', type: 'boolean', default: true },
      { key: 'signText', name: 'Header Placard', type: 'text', default: 'Precinct 04 Booking' }
    ],
    presets: [
      {
        id: 'police_mugshot_booking_station',
        label: 'Police Mugshot & Fingerprint Booking Bay',
        subcategory: 'Police Booking & Holding',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c4159',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#cfd6de',
        accentColor: '#d9a234',
        frameColor: '#20262e',
        params: { propType: 'mugshot_booking_station', width: 1.9, height: 2.2, signText: 'Precinct 04 Height' }
      },
      {
        id: 'precinct_holding_cell_front',
        label: 'Precinct Iron Holding Cell Front & Bunk',
        subcategory: 'Police Booking & Holding',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'cast_iron',
        primaryColor: '#485059',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#9ea7b0',
        accentColor: '#d99e26',
        frameColor: '#22272d',
        params: { propType: 'holding_cell_front', width: 2.65, depth: 1.05, height: 2.32, hasCellDoor: true }
      },
      {
        id: 'interrogation_room_table_rig',
        label: 'Interrogation Room Bolted Table & Chairs',
        subcategory: 'Investigation & Evidence',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#aeb5bc',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#4a535c',
        accentColor: '#36587a',
        frameColor: '#1f2429',
        params: { propType: 'interrogation_table', width: 1.38, depth: 0.92 }
      },
      {
        id: 'evidence_mesh_storage_locker',
        label: 'Wire-Mesh Evidence Cage Locker',
        subcategory: 'Investigation & Evidence',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#4c5763',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d969e',
        accentColor: '#cf342b',
        frameColor: '#22272e',
        params: { propType: 'evidence_locker', width: 1.65, depth: 0.62, height: 2.08 }
      },
      {
        id: 'detective_string_case_board',
        label: 'Detective Evidence Pin & Yarn Case Board',
        subcategory: 'Investigation & Evidence',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#9ea7b0',
        secondaryMaterial: 'wood',
        secondaryColor: '#b38352',
        accentColor: '#cf342b',
        frameColor: '#2a3036',
        params: { propType: 'detective_board', width: 1.75, height: 1.18, showCrimeStrings: true, signText: 'Homicide Task Force' }
      },
      {
        id: 'officer_duty_gear_locker',
        label: 'Patrol Officer Duty Gear & Radio Locker',
        subcategory: 'Police Booking & Holding',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2e4157',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#3d5066',
        accentColor: '#336791',
        frameColor: '#1e242b',
        params: { propType: 'duty_gear_locker', width: 1.12, depth: 0.58, height: 1.98 }
      },
      {
        id: 'emergency_911_dispatch_desk',
        label: 'Emergency 911 Radio Dispatch Console',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#333b45',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#697887',
        accentColor: '#38b6d6',
        frameColor: '#1b2026',
        params: { propType: 'dispatch_console', width: 2.05, depth: 0.92 }
      },
      {
        id: 'tactical_armory_storage_rack',
        label: 'Precinct Armory Secure Response Rack',
        subcategory: 'Security & Access Control',
        paletteFamily: 'industrial',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#343b42',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#4c5749',
        accentColor: '#e0a124',
        frameColor: '#1c2024',
        params: { propType: 'armory_rack', width: 1.45, depth: 0.62, height: 2.08 }
      },
      {
        id: 'vintage_police_telephone_call_box',
        label: 'Classic Blue Police Telephone Call Box',
        subcategory: 'Security Booths',
        locationContext: 'both',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_wood',
        primaryColor: '#1b3e6e',
        secondaryMaterial: 'painted_wood',
        secondaryColor: '#234c85',
        accentColor: '#dcecff',
        frameColor: '#181e24',
        params: { propType: 'police_call_box', width: 1.24, depth: 1.24, height: 2.68, signText: 'Police Box' }
      }
    ],
    buildGeometry: mpclBuildPoliceStationProp
  });

  registerObjectFamily({
    id: 'municipal_courthouse_hearing',
    categoryId: '22_police_municipal',
    categories: ['22_police_municipal', 'office_public_interiors'],
    subcategory: 'Courthouses & Hearings',
    subcategories: ['Courthouses & Hearings', 'Public Service & Civic Facilities'],
    label: 'Courthouse, Judge Bench & Dmv Windows',
    description: 'Glass Dmv/clerk teller counter windows, raised oak judge dais bench with gavel, courtroom gallery pews, city council lectern, flat-file blueprint drawers, and Dmv photo backdrop.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['courthouse', 'municipal', 'public_service', 'office', 'lobby'],
    architecturalStyle: 'municipal',
    sizeClass: 'large',
    functionalRole: 'functional',
    tags: ['courthouse', 'judge', 'gavel', 'pew', 'dmv', 'teller', 'lectern', 'blueprint', 'civic'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Civic Hall Fixture' },
      {
        key: 'civicType',
        name: 'Civic Hall Type',
        type: 'select',
        options: [
          ['dmv_teller_window', 'Dmv Glass Teller Window'],
          ['judge_dais_bench', 'Judge Raised Oak Dais Bench'],
          ['courtroom_pew', 'Courtroom Gallery Wood Pew'],
          ['council_lectern', 'City Council Speaker Lectern'],
          ['blueprint_flat_file', 'Municipal Blueprint Flat File'],
          ['dmv_photo_stand', 'Dmv License Photo Rig']
        ],
        default: 'dmv_teller_window'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.72, max: 3.6, step: 0.08, unit: 'm', default: 2.45 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.46, max: 1.45, step: 0.04, unit: 'm', default: 0.92 },
      { key: 'height', name: 'Height', type: 'number', min: 0.76, max: 2.25, step: 0.04, unit: 'm', default: 1.92 },
      { key: 'bayCount', name: 'Window Bays', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      { key: 'signText', name: 'Counter Banner', type: 'text', default: 'Dmv Windows 01-03' }
    ],
    presets: [
      {
        id: 'dmv_glass_teller_window',
        label: 'Dmv & Clerk Multi-Bay Teller Window',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#8d969e',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#d4cfc4',
        accentColor: '#255c8f',
        frameColor: '#2b323b',
        params: { civicType: 'dmv_teller_window', width: 2.8, height: 1.96, bayCount: 3, signText: 'Dmv Windows 01-03' }
      },
      {
        id: 'courthouse_judge_dais_bench',
        label: 'Courthouse Judge Oak Dais Bench & Gavel',
        subcategory: 'Courthouses & Hearings',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c3520',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#734329',
        accentColor: '#c49a3c',
        frameColor: '#291a12',
        params: { civicType: 'judge_dais_bench', width: 3.05, depth: 1.25 }
      },
      {
        id: 'courtroom_gallery_wood_pew',
        label: 'Courtroom Spectator Oak Gallery Pew',
        subcategory: 'Courthouses & Hearings',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#693c24',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#3a5743',
        accentColor: '#c49a3c',
        frameColor: '#2e1c13',
        params: { civicType: 'courtroom_pew', width: 2.65, depth: 0.62 }
      },
      {
        id: 'city_council_speaker_lectern',
        label: 'City Council Sealed Speaker Lectern',
        subcategory: 'Courthouses & Hearings',
        paletteFamily: 'classic_executive',
        condition: 'new',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#54321e',
        secondaryMaterial: 'brass',
        secondaryColor: '#c99a3a',
        accentColor: '#3885a6',
        frameColor: '#211812',
        params: { civicType: 'council_lectern', width: 0.84, depth: 0.58, height: 1.2 }
      },
      {
        id: 'municipal_blueprint_flat_file',
        label: 'Records Room Blueprint Flat-File Cabinet',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#6d7882',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#8d969e',
        accentColor: '#2e70a6',
        frameColor: '#283038',
        params: { civicType: 'blueprint_flat_file', width: 1.32, depth: 0.92, height: 1.05 }
      },
      {
        id: 'dmv_license_photo_backdrop',
        label: 'Dmv Driver License Photo & Stool Rig',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#aeb7bf',
        secondaryMaterial: 'fabric',
        secondaryColor: '#296094',
        accentColor: '#296094',
        frameColor: '#21272e',
        params: { civicType: 'dmv_photo_stand', width: 1.25 }
      }
    ],
    buildGeometry: mpclBuildCourthouseProp
  });

  registerObjectFamily({
    id: 'waiting_room_amenity_prop',
    categoryId: '23_clinics_waiting',
    categories: ['23_clinics_waiting', 'office_public_interiors'],
    subcategory: 'Waiting Room Amenities',
    subcategories: [
      'Waiting Room Amenities',
      'Waiting Rooms & Public Lobbies',
      'Medical Office & Professional Waiting Areas'
    ],
    label: 'Waiting Room, Clinic & Hospitality Amenities',
    description: 'Take-a-number ticket dispenser stand, pediatric bead-maze table, blood pressure kiosk, lobby coffee hospitality bar, wall pamphlet rack, doctor weight scale, and Snellen eye chart.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['waiting_room', 'clinic', 'medical', 'lobby', 'public_service'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['waiting_room', 'clinic', 'ticket', 'kids_table', 'blood_pressure', 'scale', 'eye_chart', 'pamphlets'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Waiting Room Amenity' },
      {
        key: 'amenityType',
        name: 'Amenity Unit',
        type: 'select',
        options: [
          ['ticket_stand', 'Take-A-Number Ticket Stand'],
          ['kids_bead_table', 'Kids Bead-Maze Activity Table'],
          ['bp_kiosk', 'Automated Blood Pressure Kiosk'],
          ['coffee_hospitality_station', 'Lobby Coffee Hospitality Bar'],
          ['wall_pamphlet_rack', 'Medical Info Brochure Rack'],
          ['height_weight_scale', 'Doctor Balance Beam Scale'],
          ['snellen_eye_chart', 'Snellen Optometry Light Chart']
        ],
        default: 'ticket_stand'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.36, max: 1.35, step: 0.04, unit: 'm', default: 0.52 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.14, max: 1.15, step: 0.04, unit: 'm', default: 0.52 },
      { key: 'height', name: 'Height', type: 'number', min: 0.48, max: 1.85, step: 0.04, unit: 'm', default: 1.48 },
      { key: 'hasSecondaryTray', name: 'Include Companion Detail', type: 'boolean', default: true },
      { key: 'signText', name: 'Header Text', type: 'text', default: 'Take A Number' }
    ],
    presets: [
      {
        id: 'take_a_number_ticket_stand',
        label: 'Queue Take-A-Number Ticket Stand',
        subcategory: 'Waiting Room Amenities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#d9dde2',
        accentColor: '#cf342b',
        frameColor: '#252c34',
        params: { amenityType: 'ticket_stand', width: 0.46, signText: 'Please Take Number' }
      },
      {
        id: 'kids_waiting_room_bead_table',
        label: 'Pediatric Waiting Room Bead-Maze Table',
        subcategory: 'Waiting Room Amenities',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#d9b98c',
        secondaryMaterial: 'plastic',
        secondaryColor: '#54a3d4',
        accentColor: '#3694cc',
        frameColor: '#3b4a57',
        params: { amenityType: 'kids_bead_table', width: 0.84, depth: 0.84, hasSecondaryTray: true }
      },
      {
        id: 'automated_blood_pressure_kiosk',
        label: 'Clinic & Pharmacy Blood Pressure Kiosk',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e8eff5',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#36749e',
        accentColor: '#2ea68d',
        frameColor: '#364554',
        params: { amenityType: 'bp_kiosk', width: 1.05, depth: 0.72 }
      },
      {
        id: 'lobby_coffee_hospitality_station',
        label: 'Waiting Lobby Complimentary Coffee Bar',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#69452c',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#dfd8cc',
        accentColor: '#336791',
        frameColor: '#262b30',
        params: { amenityType: 'coffee_hospitality_station', width: 1.18, depth: 0.58 }
      },
      {
        id: 'wall_medical_pamphlet_rack',
        label: 'Clinic Patient Brochure Pocket Rack',
        subcategory: 'Waiting Room Amenities',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce3eb',
        secondaryMaterial: 'glass',
        secondaryColor: '#b0d0e2',
        accentColor: '#2c82b5',
        frameColor: '#3e4e5c',
        params: { amenityType: 'wall_pamphlet_rack', width: 0.76, height: 0.88 }
      },
      {
        id: 'clinic_height_weight_stadiometer',
        label: 'Exam Room Balance Beam Height-Weight Scale',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e2e8ee',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#36749e',
        frameColor: '#303942',
        params: { amenityType: 'height_weight_scale', width: 0.4, depth: 0.46 }
      },
      {
        id: 'optometry_snellen_chart_rig',
        label: 'Optometry Illuminated Snellen Eye Chart',
        subcategory: 'Medical Office & Professional Waiting Areas',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dfe6ed',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#f5f8fa',
        accentColor: '#2ea68d',
        frameColor: '#2e3a45',
        params: { amenityType: 'snellen_eye_chart', width: 0.44, height: 0.68 }
      }
    ],
    buildGeometry: mpclBuildWaitingRoomAmenity
  });

  registerObjectFamily({
    id: 'laboratory_apparatus_station',
    categoryId: '24_labs_research',
    categories: ['24_labs_research', 'office_public_interiors'],
    subcategory: 'Scientific Analyzers & Glassware',
    subcategories: [
      'Wet Labs & Fume Hoods',
      'Scientific Analyzers & Glassware',
      'Cleanroom & Safety Stations',
      'Futuristic & Superhero Office Technology'
    ],
    label: 'Lab Glassware, Glovebox, Cryo & Cleanroom Props',
    description: 'Sealed containment glovebox isolator, chained pressurized gas cylinder rack, distillation glassware set, cryo Ln2 dewar, Pcr gel electrophoresis kit, cleanroom air shower, and yellow flammable cabinet.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['laboratory', 'medical', 'industrial_interior'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['lab', 'science', 'glovebox', 'cryo', 'gas_cylinders', 'glassware', 'pcr', 'cleanroom', 'flammable'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Laboratory Apparatus' },
      {
        key: 'labApparatusType',
        name: 'Apparatus Unit',
        type: 'select',
        options: [
          ['glovebox_isolator', 'Containment Glovebox Isolator'],
          ['gas_cylinder_rack', 'Chained Lab Gas Cylinder Rack'],
          ['glassware_distillation', 'Benchtop Distillation Glassware'],
          ['cryo_dewar_tank', 'Cryogenic Ln2 Dewar Tank'],
          ['pcr_electrophoresis_kit', 'Pcr & Gel Electrophoresis Kit'],
          ['cleanroom_air_shower', 'Cleanroom Air Shower Booth'],
          ['flammable_chemical_cabinet', 'Yellow Flammable Storage Cabinet'],
          ['test_tube_beaker_rack', 'Chemical Tubes & Beaker Rack']
        ],
        default: 'glovebox_isolator'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.34, max: 2.25, step: 0.04, unit: 'm', default: 1.45 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.18, max: 1.45, step: 0.04, unit: 'm', default: 0.88 },
      { key: 'height', name: 'Height', type: 'number', min: 0.22, max: 2.32, step: 0.04, unit: 'm', default: 1.68 },
      { key: 'tankCount', name: 'Gas Cylinder Count', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      { key: 'signText', name: 'Hazard Placard', type: 'text', default: 'Flammable Keep Clear' }
    ],
    presets: [
      {
        id: 'sealed_glovebox_biosafety_isolator',
        label: 'Containment Anaerobic Glovebox Isolator',
        subcategory: 'Cleanroom & Safety Stations',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#cfd7df',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#e4ebf2',
        accentColor: '#3694cc',
        frameColor: '#2d3742',
        params: { labApparatusType: 'glovebox_isolator', width: 1.55, depth: 0.86 }
      },
      {
        id: 'chained_gas_cylinder_regulator_rack',
        label: 'Chained Lab Gas Cylinders & Regulators',
        subcategory: 'Wet Labs & Fume Hoods',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3b648f',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#788490',
        accentColor: '#e0a124',
        frameColor: '#262b30',
        params: { labApparatusType: 'gas_cylinder_rack', width: 0.96, depth: 0.56, tankCount: 3 }
      },
      {
        id: 'chemistry_distillation_glassware_set',
        label: 'Chemistry Ring-Stand Distillation Glassware',
        subcategory: 'Scientific Analyzers & Glassware',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd8e0',
        secondaryMaterial: 'glass',
        secondaryColor: '#90c7de',
        accentColor: '#36cc9f',
        frameColor: '#2b343d',
        params: { labApparatusType: 'glassware_distillation', width: 0.72, depth: 0.36, height: 0.56 }
      },
      {
        id: 'cryogenic_liquid_nitrogen_dewar',
        label: 'Cryogenic Liquid Nitrogen Dewar Vessel',
        subcategory: 'Wet Labs & Fume Hoods',
        paletteFamily: 'futuristic_ops_center',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#dce4ec',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#4d7699',
        accentColor: '#4de2ff',
        frameColor: '#232c36',
        params: { labApparatusType: 'cryo_dewar_tank', width: 0.72, height: 1.38 }
      },
      {
        id: 'benchtop_pcr_electrophoresis_kit',
        label: 'Benchtop Pcr Cycler & Gel Electrophoresis',
        subcategory: 'Scientific Analyzers & Glassware',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e6edf4',
        secondaryMaterial: 'glass',
        secondaryColor: '#8ec4de',
        accentColor: '#4de2ff',
        frameColor: '#21272e',
        params: { labApparatusType: 'pcr_electrophoresis_kit', width: 0.68, depth: 0.38, height: 0.36 }
      },
      {
        id: 'cleanroom_entry_air_shower',
        label: 'Cleanroom Walkthrough Air-Shower Tunnel',
        subcategory: 'Cleanroom & Safety Stations',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#edf2f7',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#3ec7e8',
        frameColor: '#36434f',
        params: { labApparatusType: 'cleanroom_air_shower', width: 1.56, depth: 1.18, height: 2.2 }
      },
      {
        id: 'yellow_flammable_chemical_cabinet',
        label: 'Safety Yellow Flammable Solvent Cabinet',
        subcategory: 'Cleanroom & Safety Stations',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e8b228',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#d99e1e',
        accentColor: '#cf342b',
        frameColor: '#23282e',
        params: { labApparatusType: 'flammable_chemical_cabinet', width: 1.08, depth: 0.54, height: 1.68, signText: 'Flammable Keep Clear' }
      },
      {
        id: 'chemical_tubes_beaker_rack',
        label: 'Chemical Test-Tube & Beaker Rack',
        subcategory: 'Scientific Analyzers & Glassware',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce4ec',
        secondaryMaterial: 'painted_wood',
        secondaryColor: '#9c7852',
        accentColor: '#43d98e',
        frameColor: '#36414d',
        params: { labApparatusType: 'test_tube_beaker_rack', width: 0.48, depth: 0.24, height: 0.28 }
      }
    ],
    buildGeometry: mpclBuildLabApparatus
  });
}
