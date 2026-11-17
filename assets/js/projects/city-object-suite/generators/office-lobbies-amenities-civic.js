import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';

function olacBuildReceptionCounter(group, cfg, b, mats, meta) {
  const shape = cfg.counterShape || 'curved_wave';
  const w = clamp(cfg.width || 2.8, 1.6, 3.8);
  const d = clamp(cfg.depth || 0.95, 0.75, 1.35);
  const h = clamp(cfg.height || 1.12, 1.06, 1.18);
  const deskH = 0.75;

  if (shape === 'curved_wave') {
    const segs = 9;
    const zApex = d * 0.36;
    const radius = Math.max(2.2, w * 1.15);
    const halfArc = Math.asin(clamp((w * 0.48) / radius, 0.18, 0.7));
    const arcCenterZ = zApex - radius;
    const stepTheta = (2 * halfArc) / (segs - 1);
    const chordW = 2 * radius * Math.sin(stepTheta * 0.5);
    const rPlinth = radius - 0.14;
    const chordPlinth = 2 * rPlinth * Math.sin(stepTheta * 0.5);
    const rDesk = radius - 0.28;
    const chordDesk = 2 * rDesk * Math.sin(stepTheta * 0.5);
    const rChrome = radius + 0.078;
    const rLedge = radius + 0.04;
    const chordLedge = 2 * rLedge * Math.sin(stepTheta * 0.5);
    for (let i = 0; i < segs; i++) {
      const theta = ((i / (segs - 1)) - 0.5) * 2 * halfArc;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      b.addBox(rPlinth * sinT, 0.04, arcCenterZ + rPlinth * cosT, chordPlinth + 0.04, 0.08, 0.46, { materialRole: 'frame', layer: 'body', rotY: theta });
      b.addBox(rDesk * sinT, deskH, arcCenterZ + rDesk * cosT, chordDesk + 0.04, 0.04, d * 0.54, { materialRole: 'secondary', layer: 'body', rotY: theta });
      b.addBox(radius * sinT, h * 0.5, arcCenterZ + radius * cosT, chordW + 0.04, h - 0.04, 0.14, { materialRole: 'primary', layer: 'body', rotY: theta });
      b.addBox(rChrome * sinT, h * 0.24, arcCenterZ + rChrome * cosT, chordW + 0.025, 0.032, 0.022, { materialRole: 'chrome', layer: 'detail', rotY: theta });
      if (cfg.riserLedge !== false) {
        b.addChamferBox(rLedge * sinT, h, arcCenterZ + rLedge * cosT, chordLedge + 0.045, 0.042, 0.32, 0.008, { materialRole: 'accent', layer: 'body', rotY: theta });
      }
    }
    for (const endSign of [-1, 1]) {
      const thetaEnd = endSign * halfArc;
      const rSide = radius - 0.2;
      b.addBox(rSide * Math.sin(thetaEnd), h * 0.46, arcCenterZ + rSide * Math.cos(thetaEnd), 0.07, h - 0.08, d * 0.62, {
        materialRole: 'primary',
        layer: 'body',
        rotY: thetaEnd
      });
    }
  } else {
    // Kickplate plinth & Employee side worktop
    b.addBox(0, 0.04, 0, w - 0.08, 0.08, d - 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, deskH, -d * 0.14, w - 0.1, 0.04, d * 0.72, { materialRole: 'secondary', layer: 'body' });
    if (shape === 'l_shaped') {
      b.addBox(0, h * 0.5, d * 0.32, w, h - 0.04, 0.16, { materialRole: 'primary', layer: 'body' });
      b.addBox(w * 0.5 - 0.16, h * 0.5, -d * 0.15, 0.32, h - 0.04, d * 0.85, { materialRole: 'primary', layer: 'body' });
      if (cfg.riserLedge !== false) {
        b.addChamferBox(0, h, d * 0.34, w + 0.06, 0.045, 0.34, 0.01, { materialRole: 'accent', layer: 'body' });
      }
    } else if (shape === 'glass_window_teller') {
      const baseWallH = 0.94;
      b.addBox(0, baseWallH * 0.5, d * 0.3, w, baseWallH, 0.16, { materialRole: 'primary', layer: 'body' });
      b.addChamferBox(0, baseWallH + 0.02, d * 0.28, w + 0.04, 0.045, 0.38, 0.008, { materialRole: 'secondary', layer: 'body' });
      // Security glazing & chrome speaking grille ports
      const winH = 0.88;
      const panes = w > 2.4 ? 3 : 2;
      const paneW = (w - 0.14) / panes;
      b.addBox(-w * 0.48, baseWallH + winH * 0.5, d * 0.28, 0.05, winH, 0.06, { materialRole: 'frame', layer: 'body' });
      b.addBox(w * 0.48, baseWallH + winH * 0.5, d * 0.28, 0.05, winH, 0.06, { materialRole: 'frame', layer: 'body' });
      for (let i = 0; i < panes; i++) {
        const px = -w * 0.5 + 0.07 + paneW * 0.5 + i * paneW;
        b.addBox(px, baseWallH + winH * 0.5, d * 0.28, paneW - 0.04, winH - 0.04, 0.018, { materialRole: 'glass', layer: 'detail' });
        b.addCylinder(px, baseWallH + 0.36, d * 0.295, 0.065, 0.065, 0.026, 10, 'z', 'chrome', 'detail');
        if (i < panes - 1) {
          b.addBox(px + paneW * 0.5, baseWallH + winH * 0.5, d * 0.28, 0.045, winH, 0.06, { materialRole: 'frame', layer: 'body' });
        }
      }
      b.addBox(0, baseWallH + winH + 0.025, d * 0.28, w + 0.02, 0.05, 0.07, { materialRole: 'frame', layer: 'body' });
    } else {
      // straight_concierge
      b.addBox(0, h * 0.5, d * 0.32, w, h - 0.04, 0.16, { materialRole: 'primary', layer: 'body' });
      b.addBox(-w * 0.47, h * 0.5, 0, 0.08, h - 0.04, d * 0.88, { materialRole: 'primary', layer: 'body' });
      b.addBox(w * 0.47, h * 0.5, 0, 0.08, h - 0.04, d * 0.88, { materialRole: 'primary', layer: 'body' });
      if (cfg.riserLedge !== false) {
        b.addChamferBox(0, h, d * 0.34, w + 0.06, 0.045, 0.34, 0.01, { materialRole: 'accent', layer: 'body' });
      }
    }
  }

  // Optional desktop monitor terminals on inner desk
  const terms = Math.round(cfg.terminalCount || 1);
  for (let i = 0; i < terms; i++) {
    const mx = terms === 1 ? -0.35 : (i === 0 ? -w * 0.22 : w * 0.22);
    b.addBox(mx, deskH + 0.12, -d * 0.04, 0.045, 0.2, 0.045, { materialRole: 'frame', layer: 'detail' });
    b.addBox(mx, deskH + 0.24, -d * 0.02, 0.46, 0.28, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateScreenPlane(group, 'info_display', 0.42, 0.24, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: mx,
      y: deskH + 0.24,
      z: -d * 0.02 - 0.015,
      rotY: Math.PI
    });
  }

  // Front reception sign placard
  if (cfg.frontSignage !== false) {
    const signW = shape === 'curved_wave' ? Math.min(w * 0.36, 0.96) : Math.min(w * 0.55, 1.35);
    const signZ = shape === 'curved_wave' ? d * 0.36 + 0.088 : d * 0.41;
    if (shape === 'curved_wave') {
      b.addBox(0, 0.62, d * 0.36 + 0.072, signW + 0.03, 0.3, 0.024, { materialRole: 'frame', layer: 'detail' });
    }
    objCreateSignPlane(group, cfg.signText || 'Reception Desk', signW, 0.28, cfg.accentColor || '#1e3952', '#ffffff', {
      x: 0,
      y: 0.62,
      z: signZ
    });
  }

  meta.snapAnchors.push(
    { id: 'employee_seat', position: [0, 0, -0.55], normal: [0, 0, -1] },
    { id: 'visitor_counter', position: [0, 0, d * 0.5 + 0.45], normal: [0, 0, 1] },
    { id: 'monitor_mount', position: [-0.35, deskH, -d * 0.1], normal: [0, 1, 0] }
  );
  meta.interaction = {
    interactable: true,
    actionType: 'reception_desk',
    employeePosition: [0, 0, -0.55],
    visitorPosition: [0, 0, Number((d * 0.5 + 0.45).toFixed(3))]
  };
}

function olacBuildBreakroomEquipment(group, cfg, b, mats, meta) {
  const type = cfg.applianceType || 'water_cooler';
  const w = clamp(cfg.width || 0.38, 0.3, 1.65);
  const d = clamp(cfg.depth || 0.4, 0.3, 0.85);
  const h = clamp(cfg.height || 1.38, 0.32, 2.05);
  const doorRad = degToRad(clamp(cfg.doorOpenAngle || 0, 0, 65));

  if (type === 'water_cooler') {
    const cw = clamp(w, 0.32, 0.42);
    const cd = clamp(d, 0.32, 0.42);
    const bodyH = 0.96;
    b.addChamferBox(0, bodyH * 0.5, 0, cw, bodyH, cd, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, bodyH * 0.68, cd * 0.5 + 0.01, cw * 0.68, 0.2, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-0.06, bodyH * 0.72, cd * 0.5 + 0.032, 0.024, 0.032, 0.028, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0.06, bodyH * 0.72, cd * 0.5 + 0.032, 0.024, 0.032, 0.028, { materialRole: 'safetyRed', layer: 'detail' });
    // Clear blue 5-gallon water jug
    b.addCylinder(0, bodyH + 0.04, 0, cw * 0.36, cw * 0.22, 0.08, 12, 'y', 'glass', 'body');
    b.addCylinder(0, bodyH + 0.24, 0, cw * 0.38, cw * 0.38, 0.32, 12, 'y', 'glass', 'body');
  } else if (type === 'refrigerator') {
    const fw = clamp(w, 0.65, 0.98);
    const fd = clamp(d, 0.62, 0.82);
    const fh = clamp(h, 1.45, 1.95);
    b.addChamferBox(0, fh * 0.5, 0, fw, fh, fd, 0.015, { materialRole: 'primary', layer: 'body' });
    const hingeX = -fw * 0.48;
    const swingZ = fd * 0.5 + 0.016 + Math.sin(doorRad) * (fw * 0.46);
    const swingX = hingeX + Math.cos(doorRad) * (fw * 0.48);
    b.addBox(0, fh * 0.82, fd * 0.5 + 0.014, fw - 0.03, fh * 0.3, 0.025, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(swingX, fh * 0.34, swingZ, fw - 0.03, fh * 0.62, 0.025, { materialRole: 'secondary', layer: 'detail', rotY: -doorRad });
    b.addBox(fw * 0.38, fh * 0.8, fd * 0.5 + 0.036, 0.018, fh * 0.16, 0.024, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(swingX + Math.cos(doorRad) * (fw * 0.36), fh * 0.42, swingZ + 0.02, 0.018, fh * 0.24, 0.024, { materialRole: 'chrome', layer: 'detail', rotY: -doorRad });
  } else if (type === 'microwave') {
    const mw = clamp(w, 0.44, 0.62);
    const mh = clamp(h, 0.26, 0.38);
    const md = clamp(d, 0.32, 0.46);
    b.addChamferBox(0, mh * 0.5, 0, mw, mh, md, 0.01, { materialRole: 'primary', layer: 'body' });
    b.addBox(-mw * 0.12, mh * 0.5, md * 0.5 + 0.008, mw * 0.64, mh * 0.74, 0.014, { materialRole: 'glass', layer: 'detail' });
    b.addBox(mw * 0.34, mh * 0.5, md * 0.5 + 0.008, mw * 0.2, mh * 0.74, 0.014, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(mw * 0.22, mh * 0.5, md * 0.5 + 0.024, 0.016, mh * 0.48, 0.02, { materialRole: 'chrome', layer: 'detail' });
  } else if (type === 'coffee_station') {
    const kw = clamp(w, 0.38, 0.62);
    const kh = clamp(h, 0.38, 0.56);
    const kd = clamp(d, 0.34, 0.48);
    b.addChamferBox(0, kh * 0.5, -0.04, kw, kh, kd * 0.75, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.02, kd * 0.14, kw, 0.04, kd * 0.42, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, kh * 0.78, kd * 0.18, kw * 0.85, kh * 0.36, kd * 0.35, { materialRole: 'darkMetal', layer: 'body' });
    // Twin glass coffee carafes
    b.addCylinder(-kw * 0.22, 0.11, kd * 0.16, 0.068, 0.078, 0.14, 10, 'y', 'glass', 'detail');
    b.addCylinder(kw * 0.22, 0.11, kd * 0.16, 0.068, 0.078, 0.14, 10, 'y', 'glass', 'detail');
    b.addBox(0, kh * 0.46, kd * 0.32, kw * 0.45, 0.06, 0.014, { materialRole: 'signalAmber', layer: 'detail' });
  } else if (type === 'vending_machine') {
    const vw = clamp(w, 0.85, 1.25);
    const vd = clamp(d, 0.72, 0.92);
    const vh = clamp(h, 1.75, 2.05);
    b.addChamferBox(0, vh * 0.5, 0, vw, vh, vd, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(-vw * 0.12, vh * 0.58, vd * 0.5 + 0.012, vw * 0.58, vh * 0.56, 0.02, { materialRole: 'glass', layer: 'detail' });
    for (let r = 0; r < 4; r++) {
      b.addBox(-vw * 0.12, vh * 0.38 + r * 0.24, vd * 0.46, vw * 0.5, 0.03, 0.06, { materialRole: 'accent', layer: 'detail' });
    }
    b.addBox(vw * 0.32, vh * 0.62, vd * 0.5 + 0.012, 0.16, 0.28, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-vw * 0.12, vh * 0.16, vd * 0.5 + 0.014, vw * 0.58, 0.18, 0.03, { materialRole: 'darkMetal', layer: 'detail' });
  } else {
    // sink_counter kitchenette base cabinet
    const sw = clamp(w, 1.1, 1.85);
    const sd = clamp(d, 0.56, 0.72);
    const sh = clamp(h, 0.85, 0.94);
    b.addBox(0, sh * 0.46, 0, sw, sh * 0.92, sd - 0.04, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, sh - 0.02, 0, sw + 0.04, 0.04, sd + 0.04, 0.008, { materialRole: 'secondary', layer: 'body' });
    b.addBox(-sw * 0.22, sh + 0.004, 0, 0.46, 0.016, 0.4, { materialRole: 'chrome', layer: 'detail' });
    b.addPipeSegment(-sw * 0.22, sh + 0.01, -0.22, -sw * 0.22, sh + 0.22, -0.14, 0.014, 6, 'chrome', 'detail');
    b.addBox(0, sh + 0.06, -sd * 0.48, sw + 0.02, 0.1, 0.03, { materialRole: 'secondary', layer: 'detail' });
  }

  meta.interaction = { interactable: true, actionType: 'use_breakroom_appliance', applianceType: type };
}

function olacBuildInteriorSignage(group, cfg, b, mats, meta) {
  const style = cfg.signStyle || 'lobby_totem';
  const w = clamp(cfg.width || 0.72, 0.2, 1.45);
  const h = clamp(cfg.height || 1.75, 0.14, 2.25);
  const labelText = cfg.signText || 'Directory';
  const lit = cfg.illuminated !== false;

  if (style === 'ceiling_exit_box') {
    const sw = clamp(w, 0.34, 0.54);
    const sh = clamp(h, 0.18, 0.28);
    b.addBox(-sw * 0.34, -0.14, 0, 0.018, 0.28, 0.018, { materialRole: 'chrome', layer: 'body' });
    b.addBox(sw * 0.34, -0.14, 0, 0.018, 0.28, 0.018, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, -0.28 - sh * 0.5, 0, sw, sh, 0.05, { materialRole: 'whiteTrim', layer: 'body' });
    objCreateSignPlane(group, labelText || 'Exit ->', sw * 0.9, sh * 0.82, '#ffffff', cfg.accentColor || '#cf2e26', {
      x: 0,
      y: -0.28 - sh * 0.5,
      z: 0.028,
      lit,
      doubleSided: true,
      backOffset: 0.056
    });
  } else if (style === 'corridor_blade') {
    const sw = clamp(w, 0.65, 1.25);
    const sh = clamp(h, 0.22, 0.38);
    b.addBox(-sw * 0.35, -0.18, 0, 0.02, 0.36, 0.02, { materialRole: 'chrome', layer: 'body' });
    b.addBox(sw * 0.35, -0.18, 0, 0.02, 0.36, 0.02, { materialRole: 'chrome', layer: 'body' });
    b.addChamferBox(0, -0.36 - sh * 0.5, 0, sw, sh, 0.045, 0.008, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, labelText, sw * 0.9, sh * 0.78, cfg.primaryColor || '#1e3952', '#ffffff', {
      x: 0,
      y: -0.36 - sh * 0.5,
      z: 0.026,
      lit,
      doubleSided: true,
      backOffset: 0.052
    });
  } else if (style === 'room_placard' || style === 'wall_directory') {
    const sw = clamp(w, 0.22, 0.95);
    const sh = clamp(h, 0.14, 1.2);
    b.addBox(0, 0, 0.018, sw, sh, 0.028, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0, 0.032, sw * 0.92, sh * 0.88, 0.008, { materialRole: 'accent', layer: 'detail' });
    objCreateSignPlane(group, labelText, sw * 0.86, sh * 0.78, cfg.accentColor || '#22384f', '#ffffff', {
      x: 0,
      y: 0,
      z: 0.039,
      lit: false
    });
  } else if (style === 'tabletop_tent') {
    const sw = clamp(w, 0.22, 0.42);
    const sh = clamp(h, 0.12, 0.22);
    b.addBox(0, sh * 0.45, 0.02, sw, sh, 0.012, { materialRole: 'primary', layer: 'body', rotXDeg: -14 });
    b.addBox(0, sh * 0.45, -0.02, sw, sh, 0.012, { materialRole: 'primary', layer: 'body', rotXDeg: 14 });
    objCreateSignPlane(group, labelText, sw * 0.86, sh * 0.72, '#f5f7fa', '#1e2730', {
      x: 0,
      y: sh * 0.47,
      z: 0.03,
      rotX: degToRad(-14)
    });
  } else {
    // lobby_totem directory monument
    const sw = clamp(w, 0.58, 0.95);
    const sh = clamp(h, 1.55, 2.2);
    b.addBox(0, 0.025, 0, sw + 0.1, 0.05, 0.42, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, sh * 0.5, 0, sw, sh - 0.05, 0.18, 0.02, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, labelText, sw * 0.84, 0.26, cfg.accentColor || '#1d3c59', '#ffffff', {
      x: 0,
      y: sh - 0.24,
      z: 0.095,
      lit
    });
    objCreateScreenPlane(group, 'info_display', sw * 0.82, sh * 0.56, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: sh * 0.46,
      z: 0.095
    });
  }
}

function olacBuildSecurityAccessControl(group, cfg, b, mats, meta) {
  const type = cfg.deviceType || 'optical_turnstile';
  const w = clamp(cfg.width || 1.35, 0.12, 1.85);
  const h = clamp(cfg.height || 1.02, 0.18, 2.3);
  const open = Boolean(cfg.gateOpen);

  if (type === 'optical_turnstile') {
    const laneHalf = clamp(w * 0.44, 0.45, 0.65);
    const podD = 1.25;
    for (const sx of [-laneHalf, laneHalf]) {
      b.addChamferBox(sx, h * 0.5, 0, 0.18, h, podD, 0.02, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, h + 0.015, 0, 0.2, 0.03, podD + 0.02, { materialRole: 'darkMetal', layer: 'detail' });
      b.addBox(sx, h + 0.032, podD * 0.36, 0.1, 0.01, 0.1, { materialRole: open ? 'signalGreen' : 'signalAmber', layer: 'detail' });
    }
    const wingW = laneHalf - 0.12;
    const wingYaw = open ? degToRad(84) : 0;
    b.addBox(-wingW * 0.5 - 0.08, h * 0.65, 0, wingW, h * 0.48, 0.016, { materialRole: 'glass', layer: 'detail', rotY: wingYaw });
    b.addBox(wingW * 0.5 + 0.08, h * 0.65, 0, wingW, h * 0.48, 0.016, { materialRole: 'glass', layer: 'detail', rotY: -wingYaw });
  } else if (type === 'metal_detector_arch') {
    const aw = clamp(w, 0.85, 1.1);
    const ah = clamp(h, 2.0, 2.28);
    const ad = 0.58;
    b.addBox(-aw * 0.46, ah * 0.5, 0, 0.11, ah, ad, { materialRole: 'primary', layer: 'body' });
    b.addBox(aw * 0.46, ah * 0.5, 0, 0.11, ah, ad, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ah - 0.1, 0, aw + 0.04, 0.2, ad + 0.02, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, ah - 0.06, ad * 0.5 + 0.015, 0.26, 0.06, 0.015, { materialRole: 'signalGreen', layer: 'detail' });
  } else if (type === 'belt_stanchion_single_end' || type === 'belt_stanchion_pair') {
    const addStanchionPost = (px, withSign) => {
      b.addCylinder(px, 0.02, 0, 0.15, 0.17, 0.04, 12, 'y', 'frame', 'body');
      b.addCylinder(px, h * 0.48, 0, 0.032, 0.036, h, 10, 'y', 'chrome', 'body');
      b.addCylinder(px, h - 0.04, 0, 0.042, 0.042, 0.08, 10, 'y', 'darkMetal', 'detail');
      if (withSign) {
        const signW = 0.24;
        const signH = 0.32;
        const signY = h + 0.22;
        b.addCylinder(px, h + 0.04, 0, 0.014, 0.014, 0.08, 8, 'y', 'chrome', 'detail');
        b.addBox(px, signY, 0, signW + 0.024, signH + 0.024, 0.02, { materialRole: 'chrome', layer: 'detail' });
        objCreateSignPlane(group, cfg.signText || 'Please Wait Here', signW, signH, cfg.accentColor || '#1e3952', '#ffffff', {
          x: px,
          y: signY,
          z: 0.012,
          doubleSided: true
        });
      }
    };
    const beltSpan = clamp(cfg.beltLength || (type === 'belt_stanchion_single_end' ? w : Math.max(0.85, w)), 0.45, 2.8);
    if (type === 'belt_stanchion_single_end') {
      addStanchionPost(0, Boolean(cfg.includeTopSign));
      if (cfg.extendTrailingBelt !== false) {
        b.addBox(beltSpan * 0.5, h - 0.04, 0, beltSpan, 0.055, 0.01, { materialRole: 'accent', layer: 'detail' });
        b.addBox(beltSpan + 0.018, h - 0.04, 0, 0.036, 0.068, 0.024, { materialRole: 'chrome', layer: 'detail' });
        meta.snapAnchors.push(
          { id: 'belt_attach_next', position: [beltSpan, h - 0.04, 0], normal: [1, 0, 0] },
          { id: 'belt_cassette_in', position: [-0.042, h - 0.04, 0], normal: [-1, 0, 0] }
        );
      }
    } else {
      const poles = Math.round(clamp(cfg.poleCount || 2, 1, 8));
      const gap = poles > 1 && !cfg.beltLength ? clamp(w / (poles - 1), 0.75, 2.2) : beltSpan;
      const totalSpan = (poles - 1) * gap;
      const startX = -totalSpan * 0.5;
      for (let i = 0; i < poles; i++) {
        const px = startX + i * gap;
        addStanchionPost(px, Boolean(cfg.includeTopSign) && i === 0);
        if (i < poles - 1) {
          b.addBox(px + gap * 0.5, h - 0.04, 0, gap - 0.04, 0.055, 0.012, { materialRole: 'accent', layer: 'detail' });
        }
      }
      if (cfg.extendTrailingBelt) {
        const lastX = startX + totalSpan;
        b.addBox(lastX + gap * 0.5, h - 0.04, 0, gap, 0.055, 0.01, { materialRole: 'accent', layer: 'detail' });
        b.addBox(lastX + gap + 0.018, h - 0.04, 0, 0.036, 0.068, 0.024, { materialRole: 'chrome', layer: 'detail' });
        meta.snapAnchors.push({ id: 'belt_attach_next', position: [lastX + gap, h - 0.04, 0], normal: [1, 0, 0] });
      }
    }
  } else if (type === 'tripod_turnstile_gate') {
    const chW = 0.28;
    const chH = clamp(h, 0.88, 1.12);
    const chD = clamp(cfg.beltLength || 0.96, 0.72, 1.35);
    const bodyX = -0.26;
    b.addChamferBox(bodyX, chH * 0.5, 0, chW, chH, chD, 0.018, { materialRole: 'primary', layer: 'body' });
    b.addBox(bodyX, chH + 0.012, 0, chW + 0.02, 0.024, chD + 0.02, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(bodyX, chH + 0.026, chD * 0.32, 0.14, 0.01, 0.18, { materialRole: open ? 'signalGreen' : 'signalRed', layer: 'detail' });
    b.addBox(bodyX, chH - 0.06, chD * 0.51, 0.15, 0.16, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
    // Rotating 3-arm stainless tripod barrier spanning aisle toward +X
    const hubX = bodyX + chW * 0.5 + 0.04;
    const hubY = chH * 0.74;
    b.addCylinder(hubX + 0.015, hubY - 0.015, 0, 0.072, 0.072, 0.09, 12, 'x', 'darkMetal', 'detail');
    const armLen = 0.54;
    const basePhase = open ? degToRad(60) : 0;
    for (let i = 0; i < 3; i++) {
      const ang = basePhase + (i * Math.PI * 2) / 3;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const dx = 0.5 + 0.5 * ca;
      const dy = -0.5 + 0.5 * ca;
      const dz = 0.707 * sa;
      b.addPipeSegment(
        hubX + 0.03,
        hubY - 0.01,
        0,
        hubX + 0.03 + dx * armLen,
        hubY - 0.01 + dy * armLen,
        dz * armLen,
        0.018,
        8,
        'chrome',
        'detail'
      );
    }
    if (cfg.includeTopSign) {
      b.addCylinder(bodyX, chH + 0.14, -chD * 0.28, 0.014, 0.014, 0.24, 8, 'y', 'chrome', 'detail');
      b.addBox(bodyX, chH + 0.34, -chD * 0.28, 0.28, 0.22, 0.02, { materialRole: 'frame', layer: 'detail' });
      objCreateSignPlane(group, cfg.signText || 'Scan Pass', 0.25, 0.19, cfg.accentColor || '#1e5239', '#ffffff', {
        x: bodyX,
        y: chH + 0.34,
        z: -chD * 0.28 + 0.012,
        doubleSided: true
      });
    }
  } else if (type === 'wall_badge_reader') {
    const rw = clamp(w, 0.09, 0.18);
    const rh = clamp(h, 0.14, 0.26);
    b.addChamferBox(0, 0, 0.02, rw, rh, 0.032, 0.006, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, -0.01, 0.038, rw * 0.68, rh * 0.5, 0.008, { materialRole: 'frame', layer: 'detail' });
    b.addBox(0, rh * 0.34, 0.038, rw * 0.42, 0.014, 0.01, { materialRole: open ? 'signalGreen' : 'signalRed', layer: 'detail' });
  } else if (type === 'dome_camera') {
    b.addCylinder(0, -0.025, 0, 0.095, 0.105, 0.05, 12, 'y', 'whiteTrim', 'body');
    b.addCylinder(0, -0.085, 0, 0.072, 0.028, 0.075, 12, 'y', 'darkMetal', 'detail');
    b.addCylinder(0.05, -0.04, 0.06, 0.008, 0.008, 0.01, 6, 'y', 'signalRed', 'detail');
  } else {
    // baggage_xray conveyor scanner
    const xw = clamp(w, 1.35, 2.2);
    const xd = 0.85;
    const xh = clamp(h, 1.15, 1.35);
    b.addBox(0, 0.36, 0, xw, 0.72, xd * 0.84, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.74, 0, xw + 0.55, 0.06, xd * 0.68, { materialRole: 'rubber', layer: 'body' });
    b.addChamferBox(0, xh * 0.72, 0, xw * 0.62, xh * 0.54, xd, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(-xw * 0.31, xh * 0.72, 0, 0.02, xh * 0.42, xd * 0.64, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(xw * 0.31, xh * 0.72, 0, 0.02, xh * 0.42, xd * 0.64, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateScreenPlane(group, 'security_cctv', 0.34, 0.22, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0.15,
      y: xh + 0.16,
      z: xd * 0.42
    });
  }

  meta.interaction = { interactable: true, actionType: 'badge_access_scan', deviceType: type };
}

function olacBuildInteriorInfrastructure(group, cfg, b, mats, meta) {
  const type = cfg.infraType || 'elevator_doors';
  const w = clamp(cfg.width || 1.65, 0.16, 2.25);
  const h = clamp(cfg.height || 2.25, 0.12, 2.45);
  const doorGap = clamp(cfg.doorGapOpen || 0, 0, 0.45);

  if (type === 'elevator_doors') {
    const ew = clamp(w, 1.25, 1.95);
    const eh = clamp(h, 2.05, 2.38);
    // Wall header & side jambs starting at z = 0
    b.addBox(-ew * 0.5 - 0.09, eh * 0.5, 0.055, 0.18, eh + 0.08, 0.11, { materialRole: 'frame', layer: 'body' });
    b.addBox(ew * 0.5 + 0.09, eh * 0.5, 0.055, 0.18, eh + 0.08, 0.11, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, eh + 0.06, 0.055, ew + 0.36, 0.12, 0.11, { materialRole: 'frame', layer: 'body' });
    const leafW = ew * 0.5 - doorGap * 0.5;
    if (leafW > 0.12) {
      b.addBox(-ew * 0.25 - doorGap * 0.25, eh * 0.5, 0.025, leafW, eh - 0.02, 0.04, { materialRole: 'chrome', layer: 'body' });
      b.addBox(ew * 0.25 + doorGap * 0.25, eh * 0.5, 0.025, leafW, eh - 0.02, 0.04, { materialRole: 'chrome', layer: 'body' });
    }
    // Call button box + Up/Down Lantern above
    b.addBox(ew * 0.5 + 0.24, 1.05, 0.03, 0.11, 0.22, 0.04, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(ew * 0.5 + 0.24, 1.08, 0.052, 0.03, 0.03, 0.01, { materialRole: 'signalGreen', layer: 'detail' });
    b.addBox(0, eh + 0.2, 0.04, 0.34, 0.12, 0.05, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-0.07, eh + 0.2, 0.068, 0.06, 0.05, 0.01, { materialRole: 'signalAmber', layer: 'detail' });
  } else if (type === 'ceiling_troffer_light') {
    const tw = clamp(w, 0.58, 1.25);
    const td = 0.6;
    b.addBox(0, -0.025, 0, tw, 0.05, td, { materialRole: 'frame', layer: 'body' });
    const panelRole = cfg.lampLit === false ? 'whiteTrim' : 'lampGlow';
    b.addBox(0, -0.052, 0, tw - 0.06, 0.012, td - 0.06, { materialRole: panelRole, layer: 'detail' });
  } else if (type === 'ceiling_hvac_diffuser') {
    const dw = clamp(w, 0.45, 0.68);
    b.addBox(0, -0.02, 0, dw, 0.04, dw, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, -0.042, 0, dw * 0.72, 0.018, dw * 0.72, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(0, -0.054, 0, dw * 0.42, 0.016, dw * 0.42, { materialRole: 'whiteTrim', layer: 'detail' });
  } else if (type === 'fire_extinguisher_cabinet') {
    const fw = 0.34;
    const fh = 0.72;
    b.addBox(0, 0, 0.06, fw, fh, 0.12, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, 0.02, 0.124, fw * 0.72, fh * 0.65, 0.014, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(0, -0.04, 0.08, 0.075, 0.075, 0.44, 10, 'y', 'safetyRed', 'detail');
  } else if (type === 'steam_radiator') {
    const rw = clamp(w, 0.7, 1.35);
    const rh = clamp(h, 0.52, 0.76);
    const fins = Math.max(6, Math.round(rw / 0.09));
    b.addBox(0, 0.07, 0, rw, 0.04, 0.14, { materialRole: 'frame', layer: 'body' });
    for (let i = 0; i < fins; i++) {
      const fx = -rw * 0.46 + (i / (fins - 1)) * (rw * 0.92);
      b.addChamferBox(fx, rh * 0.5 + 0.04, 0, 0.048, rh, 0.17, 0.012, { materialRole: 'primary', layer: 'body' });
    }
    b.addCylinder(rw * 0.54, 0.1, 0, 0.032, 0.032, 0.06, 8, 'y', 'brass', 'detail');
  } else {
    // fire_alarm_strobe
    b.addBox(0, 0, 0.028, 0.14, 0.22, 0.056, { materialRole: 'safetyRed', layer: 'body' });
    b.addBox(0, 0.055, 0.062, 0.07, 0.055, 0.03, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(0, -0.04, 0.06, 0.075, 0.055, 0.02, { materialRole: 'chrome', layer: 'detail' });
  }
}

function olacBuildCleaningMaintenance(group, cfg, b, mats, meta) {
  const type = cfg.maintType || 'mop_bucket_cart';
  const w = clamp(cfg.width || 0.52, 0.3, 1.35);
  const h = clamp(cfg.height || 0.96, 0.62, 1.35);

  if (type === 'wet_floor_sign') {
    const sw = clamp(w, 0.3, 0.4);
    const sh = clamp(h, 0.58, 0.76);
    const tiltDeg = 16;
    const tiltRad = degToRad(tiltDeg);
    const panelCY = sh * 0.46;
    const panelZ = Math.max(0.09, sh * 0.46 * Math.sin(tiltRad));
    b.addBox(0, panelCY, panelZ, sw, sh, 0.02, { materialRole: 'warningYellow', layer: 'body', rotXDeg: -tiltDeg });
    b.addBox(0, panelCY, -panelZ, sw, sh, 0.02, { materialRole: 'warningYellow', layer: 'body', rotXDeg: tiltDeg });
    b.addBox(0, sh * 0.91, 0, sw * 0.76, 0.03, 0.042, { materialRole: 'warningYellow', layer: 'detail' });
    const dAlong = sh * 0.06;
    const signNormalOffset = 0.013;
    const signY = panelCY + dAlong * Math.cos(tiltRad) + signNormalOffset * Math.sin(tiltRad);
    const signZ = panelZ - dAlong * Math.sin(tiltRad) + signNormalOffset * Math.cos(tiltRad);
    objCreateSignPlane(group, 'Wet Floor', sw * 0.78, sh * 0.36, '#e8b228', '#15181c', {
      x: 0,
      y: signY,
      z: signZ,
      rotX: -tiltRad
    });
    objCreateSignPlane(group, 'Wet Floor', sw * 0.78, sh * 0.36, '#e8b228', '#15181c', {
      x: 0,
      y: signY,
      z: -signZ,
      rotY: Math.PI,
      rotX: tiltRad,
      name: 'ObjectSignFace_Back'
    });
  } else if (type === 'mop_bucket_cart') {
    b.addCasterWheels(0, 0, 0.36, 0.48, 0.028, 'rubber', 'frame');
    b.addTrapezoidBox(0, 0.26, 0, 0.34, 0.42, 0.4, 0.5, 0.38, { materialRole: 'warningYellow', layer: 'body' });
    b.addBox(0, 0.52, -0.14, 0.3, 0.18, 0.2, { materialRole: 'darkMetal', layer: 'detail' });
    b.addPipeSegment(0.08, 0.35, -0.08, 0.14, 1.28, -0.18, 0.015, 6, 'wood', 'detail');
  } else if (type === 'recycling_trio_bin') {
    const tw = clamp(w, 0.95, 1.35);
    const bw = tw / 3 - 0.02;
    const roles = ['darkMetal', 'accent', 'signalGreen'];
    for (let i = 0; i < 3; i++) {
      const bx = -tw * 0.5 + (bw + 0.02) * (i + 0.5);
      b.addChamferBox(bx, h * 0.48, 0, bw, h, 0.38, 0.012, { materialRole: 'primary', layer: 'body' });
      b.addBox(bx, h + 0.015, 0, bw + 0.01, 0.03, 0.4, { materialRole: roles[i], layer: 'detail' });
    }
  } else if (type === 'upright_vacuum') {
    b.addBox(0, 0.055, 0.14, 0.34, 0.1, 0.22, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, 0.52, 0, 0.09, 0.08, 0.72, 10, 'y', 'secondary', 'body');
    b.addPipeSegment(0, 0.88, 0, 0, 1.12, -0.08, 0.016, 6, 'frame', 'detail');
  } else {
    // custodial_cart
    const cw = clamp(w, 0.5, 0.65);
    b.addCasterWheels(0, 0, cw * 0.82, 0.88, 0.04, 'rubber', 'frame');
    b.addBox(0, 0.08, 0, cw, 0.05, 1.05, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.55, 0.06, cw * 0.92, 0.85, 0.52, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, 0.5, -0.34, 0.18, 0.16, 0.72, 10, 'y', 'warningYellow', 'detail');
  }
}

function olacBuildOfficeDecor(group, cfg, b, mats, meta) {
  const type = cfg.decorType || 'potted_floor_plant';
  const w = clamp(cfg.width || 0.55, 0.18, 1.45);
  const h = clamp(cfg.height || 1.45, 0.25, 1.85);

  if (type === 'potted_floor_plant') {
    const potH = clamp(h * 0.34, 0.3, 0.54);
    b.addCylinder(0, potH * 0.5, 0, w * 0.44, w * 0.34, potH, 12, 'y', 'secondary', 'body');
    b.addCylinder(0, potH - 0.02, 0, w * 0.38, w * 0.38, 0.04, 10, 'y', 'darkMetal', 'detail');
    b.addCylinder(0, potH + h * 0.26, 0, 0.028, 0.036, h * 0.52, 8, 'y', 'wood', 'body');
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const ly = potH + h * 0.34 + (i % 3) * 0.16;
      b.addBox(Math.sin(ang) * 0.16, ly, Math.cos(ang) * 0.16, 0.2, 0.02, 0.34, {
        materialRole: 'foliage',
        layer: 'detail',
        rotY: ang,
        rotXDeg: 28
      });
    }
  } else if (type === 'trough_planter') {
    const pw = clamp(w, 0.9, 1.45);
    const ph = clamp(h, 0.52, 0.88);
    b.addChamferBox(0, ph * 0.42, 0, pw, ph * 0.84, 0.38, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ph * 0.88, 0, pw * 0.88, 0.26, 0.26, { materialRole: 'foliage', layer: 'detail' });
  } else if (type === 'framed_wall_art') {
    b.addBox(0, 0, 0.02, w, h, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0, 0.038, w * 0.86, h * 0.82, 0.014, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(-w * 0.14, 0.06, 0.048, w * 0.32, h * 0.42, 0.01, { materialRole: 'accent', layer: 'detail' });
    b.addBox(w * 0.18, -0.08, 0.048, w * 0.26, h * 0.3, 0.01, { materialRole: 'primary', layer: 'detail' });
  } else if (type === 'coat_rack_stand') {
    b.addCylinder(0, 0.02, 0, 0.24, 0.26, 0.04, 12, 'y', 'wood', 'body');
    b.addCylinder(0, h * 0.5, 0, 0.028, 0.04, h, 8, 'y', 'wood', 'body');
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      b.addPipeSegment(0, h * 0.88, 0, Math.sin(ang) * 0.16, h * 0.96, Math.cos(ang) * 0.16, 0.01, 6, 'brass', 'detail');
    }
  } else if (type === 'wall_clock') {
    const r = clamp(w * 0.5, 0.14, 0.24);
    b.addCylinder(0, 0, 0.024, r, r, 0.048, 16, 'z', 'frame', 'body');
    b.addCylinder(0, 0, 0.048, r * 0.86, r * 0.86, 0.01, 16, 'z', 'whiteTrim', 'detail');
    b.addBox(0, r * 0.25, 0.056, 0.012, r * 0.5, 0.008, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(r * 0.2, 0, 0.056, r * 0.4, 0.012, 0.008, { materialRole: 'darkMetal', layer: 'detail' });
  } else {
    // desk_trophy_globe
    b.addCylinder(0, 0.03, 0, 0.075, 0.09, 0.06, 10, 'y', 'wood', 'body');
    b.addCylinder(0, 0.12, 0, 0.016, 0.016, 0.12, 8, 'y', 'brass', 'body');
    b.addCylinder(0, 0.23, 0, 0.072, 0.055, 0.14, 12, 'y', 'brass', 'detail');
  }
}

function olacBuildCivicMedicalFacility(group, cfg, b, mats, meta) {
  const type = cfg.facilityType || 'ticket_kiosk';
  const w = clamp(cfg.width || 0.56, 0.36, 1.8);
  const h = clamp(cfg.height || 1.48, 0.72, 2.05);

  if (type === 'ticket_kiosk') {
    b.addCylinder(0, 0.025, 0, 0.24, 0.26, 0.05, 12, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.44, 0, 0.06, 0.08, h * 0.82, 10, 'y', 'primary', 'body');
    b.addChamferBox(0, h * 0.92, 0.04, 0.38, 0.44, 0.18, 0.015, { materialRole: 'secondary', layer: 'body', rotXDeg: -14 });
    objCreateScreenPlane(group, cfg.screenMode || 'info_display', 0.3, 0.24, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.96,
      z: 0.13,
      rotX: degToRad(-14)
    });
    b.addBox(0, h * 0.78, 0.14, 0.14, 0.03, 0.04, { materialRole: 'safetyRed', layer: 'detail' });
  } else if (type === 'voting_booth') {
    const bw = clamp(w, 0.68, 0.9);
    b.addSupportLegs(0, 0, 0.86, bw * 0.86, 0.52, 0.036, 'chrome');
    b.addBox(0, 0.88, 0, bw, 0.04, 0.58, { materialRole: 'primary', layer: 'body' });
    b.addBox(-bw * 0.48, 1.32, 0, 0.03, 0.88, 0.58, { materialRole: 'secondary', layer: 'body' });
    b.addBox(bw * 0.48, 1.32, 0, 0.03, 0.88, 0.58, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 1.32, -0.275, bw, 0.88, 0.03, { materialRole: 'secondary', layer: 'body' });
    const tiltDeg = 32;
    const tiltRad = degToRad(tiltDeg);
    b.addBox(0, 1.06, -0.08, bw * 0.58, 0.34, 0.03, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: -tiltDeg });
    objCreateScreenPlane(group, 'kiosk_menu', bw * 0.52, 0.28, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.06 + 0.018 * Math.sin(tiltRad),
      z: -0.08 + 0.018 * Math.cos(tiltRad),
      rotX: -tiltRad,
      role: 'voting_touchscreen'
    });
  } else if (type === 'bank_rope_stanchion') {
    const span = clamp(w, 1.0, 1.85);
    for (const sx of [-span * 0.46, span * 0.46]) {
      b.addCylinder(sx, 0.02, 0, 0.16, 0.17, 0.04, 12, 'y', 'brass', 'body');
      b.addCylinder(sx, h * 0.48, 0, 0.028, 0.032, h, 10, 'y', 'brass', 'body');
      b.addCylinder(sx, h + 0.04, 0, 0.042, 0.042, 0.06, 10, 'y', 'brass', 'detail');
    }
    b.addPipeSegment(-span * 0.46, h * 0.86, 0, 0, h * 0.68, 0, 0.022, 8, 'fabric', 'detail');
    b.addPipeSegment(0, h * 0.68, 0, span * 0.46, h * 0.86, 0, 0.022, 8, 'fabric', 'detail');
  } else if (type === 'medical_scale') {
    b.addChamferBox(0, 0.045, 0.06, 0.36, 0.09, 0.44, 0.01, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 0.095, 0.06, 0.28, 0.01, 0.34, { materialRole: 'rubber', layer: 'detail' });
    b.addCylinder(0, 0.78, -0.14, 0.03, 0.035, 1.48, 8, 'y', 'chrome', 'body');
    b.addBox(0.02, 1.46, -0.06, 0.38, 0.06, 0.08, { materialRole: 'chrome', layer: 'detail' });
  } else if (type === 'vitals_monitor_cart') {
    b.addCasterWheels(0, 0, 0.44, 0.44, 0.03, 'rubber', 'frame');
    b.addCylinder(0, 0.62, 0, 0.036, 0.042, 1.08, 10, 'y', 'chrome', 'body');
    b.addBox(0, 0.82, 0.08, 0.36, 0.04, 0.26, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 1.24, 0, 0.36, 0.28, 0.16, 0.014, { materialRole: 'whiteTrim', layer: 'body' });
    objCreateScreenPlane(group, cfg.screenMode || 'info_display', 0.3, 0.2, cfg.emissiveColor || '#3be882', cfg.condition, cfg.seed, {
      x: 0,
      y: 1.24,
      z: 0.085
    });
  } else if (type === 'wheelchair_transport') {
    const ww = clamp(w, 0.56, 0.72);
    const halfX = ww * 0.44;
    // Large rear drive wheels & smaller front swivel casters
    for (const sx of [-halfX - 0.04, halfX + 0.04]) {
      b.addCylinder(sx, 0.29, -0.14, 0.29, 0.29, 0.036, 16, 'x', 'rubber', 'body');
      b.addCylinder(sx + (sx > 0 ? 0.022 : -0.022), 0.29, -0.14, 0.21, 0.21, 0.014, 14, 'x', 'chrome', 'detail');
      b.addCylinder(sx, 0.29, -0.14, 0.045, 0.045, 0.055, 10, 'x', 'chrome', 'detail');
    }
    for (const sx of [-halfX, halfX]) {
      b.addCylinder(sx, 0.085, 0.25, 0.085, 0.085, 0.03, 12, 'x', 'rubber', 'body');
      b.addBox(sx, 0.19, 0.25, 0.032, 0.22, 0.036, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx, 0.58, -0.22, 0.032, 0.72, 0.032, { materialRole: 'chrome', layer: 'body' });
      b.addPipeSegment(sx, 0.94, -0.22, sx, 0.96, -0.35, 0.018, 8, 'rubber', 'detail');
      b.addBox(sx, 0.66, 0.02, 0.036, 0.036, 0.44, { materialRole: 'rubber', layer: 'detail' });
      b.addBox(sx, 0.48, 0.2, 0.028, 0.36, 0.028, { materialRole: 'chrome', layer: 'body' });
      b.addBox(sx * 0.62, 0.14, 0.36, halfX * 0.68, 0.018, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
    }
    b.addBox(0, 0.35, -0.14, ww * 0.88, 0.026, 0.026, { materialRole: 'chrome', layer: 'body' });
    b.addChamferBox(0, 0.48, 0.01, ww * 0.76, 0.055, 0.42, 0.012, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.72, -0.2, ww * 0.76, 0.38, 0.05, 0.012, { materialRole: 'primary', layer: 'body' });
  } else if (type === 'sanitizer_totem_stand') {
    const sh = clamp(h, 1.18, 1.55);
    b.addCylinder(0, 0.02, 0, 0.18, 0.2, 0.04, 14, 'y', 'frame', 'body');
    b.addCylinder(0, sh * 0.45, 0, 0.028, 0.034, sh * 0.88, 10, 'y', 'chrome', 'body');
    b.addChamferBox(0, sh * 0.72, 0.05, 0.16, 0.28, 0.12, 0.012, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, sh * 0.68, 0.115, 0.07, 0.09, 0.014, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0, sh * 0.56, 0.08, 0.16, 0.02, 0.12, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(0, sh * 0.94, 0.01, 0.28, 0.24, 0.024, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, 'Sanitize Hands', 0.24, 0.18, cfg.accentColor || '#2e709e', '#ffffff', {
      x: 0,
      y: sh * 0.94,
      z: 0.026,
      lit: true
    });
  } else if (type === 'waiting_magazine_toy_rack') {
    const rw = clamp(w, 0.62, 1.15);
    const rh = clamp(h, 1.05, 1.45);
    b.addBox(-rw * 0.46, rh * 0.5, 0, 0.04, rh, 0.36, { materialRole: 'primary', layer: 'body' });
    b.addBox(rw * 0.46, rh * 0.5, 0, 0.04, rh, 0.36, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.16, 0, rw - 0.06, 0.24, 0.34, { materialRole: 'secondary', layer: 'body' });
    const paletteRoles = ['accent', 'warningYellow', 'signalGreen'];
    for (let tier = 0; tier < 3; tier++) {
      const ty = 0.48 + tier * 0.26;
      b.addBox(0, ty, 0.02, rw - 0.06, 0.2, 0.03, { materialRole: 'primary', layer: 'body', rotXDeg: -20 });
      b.addBox(0, ty - 0.085, 0.07, rw - 0.06, 0.024, 0.11, { materialRole: 'chrome', layer: 'detail' });
      b.addBox(0, ty - 0.064, 0.12, rw - 0.06, 0.026, 0.012, { materialRole: 'frame', layer: 'detail' });
      for (let m = 0; m < 3; m++) {
        const mx = -rw * 0.28 + m * (rw * 0.28);
        b.addBox(mx, ty + 0.012, 0.044, rw * 0.22, 0.18, 0.016, { materialRole: paletteRoles[(tier + m) % 3], layer: 'detail', rotXDeg: -20 });
      }
    }
    objCreateSignPlane(group, 'Health Guides', rw * 0.72, 0.12, cfg.accentColor || '#2e709e', '#ffffff', {
      x: 0,
      y: rh - 0.08,
      z: 0.19
    });
  } else if (type === 'wall_queue_display_board') {
    const bw = clamp(w, 0.72, 1.45);
    const bh = clamp(h, 0.36, 0.72);
    b.addChamferBox(0, 0, 0.045, bw, bh, 0.085, 0.012, { materialRole: 'darkMetal', layer: 'body' });
    objCreateScreenPlane(group, cfg.screenMode || 'info_display', bw * 0.88, bh * 0.56, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: -bh * 0.12,
      z: 0.09
    });
    objCreateSignPlane(group, 'Now Serving: A-42', bw * 0.86, bh * 0.22, cfg.accentColor || '#1e4266', '#ffffff', {
      x: 0,
      y: bh * 0.3,
      z: 0.09,
      lit: true
    });
  } else {
    // clinic_window_counter
    const cw = clamp(w, 1.35, 1.85);
    b.addBox(0, 0.48, 0, cw, 0.96, 0.64, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, 0.98, 0.06, cw + 0.06, 0.04, 0.78, 0.008, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, 1.38, 0.14, cw - 0.1, 0.72, 0.02, { materialRole: 'glass', layer: 'detail' });
    objCreateSignPlane(group, 'Patient Check-In', 0.68, 0.18, cfg.accentColor || '#2e709e', '#ffffff', {
      x: 0,
      y: 0.68,
      z: 0.33
    });
  }

  meta.interaction = { interactable: true, actionType: 'use_facility_prop', facilityType: type };
}

function olacBuildClinicExamEquipment(group, cfg, b, mats, meta) {
  const type = cfg.equipType || 'exam_table';
  const w = clamp(cfg.width || 0.72, 0.32, 1.95);
  const h = clamp(cfg.height || 0.84, 0.42, 2.05);
  const backTilt = degToRad(clamp(cfg.backrestAngle ?? 26, 0, 58));

  if (type === 'exam_table') {
    const len = clamp(cfg.length || 1.82, 1.45, 2.1);
    const tw = clamp(w, 0.64, 0.88);
    // Step drawer cabinet base
    b.addChamferBox(0, 0.34, 0, tw - 0.06, 0.68, len * 0.62, 0.014, { materialRole: 'primary', layer: 'body' });
    for (let d = 0; d < 2; d++) {
      b.addBox(-tw * 0.5 + 0.008, 0.24 + d * 0.26, -0.05, 0.02, 0.22, len * 0.48, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(-tw * 0.5 - 0.012, 0.24 + d * 0.26, -0.05, 0.016, 0.025, 0.14, { materialRole: 'chrome', layer: 'detail' });
    }
    b.addBox(0, 0.12, len * 0.38, tw * 0.72, 0.18, 0.26, { materialRole: 'chrome', layer: 'detail' });
    // Padded vinyl mattress + hinged backrest
    b.addChamferBox(0, 0.74, len * 0.14, tw, 0.1, len * 0.54, 0.022, { materialRole: 'accent', layer: 'body' });
    const headLen = len * 0.4;
    const hingeZ = -len * 0.13;
    b.addChamferBox(
      0,
      0.74 + Math.sin(backTilt) * (headLen * 0.48),
      hingeZ - Math.cos(backTilt) * (headLen * 0.48),
      tw,
      0.1,
      headLen,
      0.022,
      { materialRole: 'accent', layer: 'body', rotX: backTilt }
    );
    // Sanitary exam paper dispenser roll
    b.addCylinder(0, 0.81 + Math.sin(backTilt) * headLen, hingeZ - Math.cos(backTilt) * headLen, 0.055, 0.055, tw * 0.78, 12, 'z', 'whiteTrim', 'detail');
  } else if (type === 'iv_drip_stand') {
    const sh = clamp(h, 1.55, 2.05);
    b.addCylinder(0, 0.04, 0, 0.04, 0.04, 0.08, 10, 'y', 'chrome', 'body');
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.addBox(Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14, 0.26, 0.028, 0.032, { materialRole: 'chrome', layer: 'body', rotY: -a });
      b.addCylinder(Math.cos(a) * 0.25, 0.02, Math.sin(a) * 0.25, 0.02, 0.02, 0.024, 8, 'x', 'rubber', 'detail');
    }
    b.addCylinder(0, sh * 0.48, 0, 0.022, 0.028, sh * 0.92, 10, 'y', 'chrome', 'body');
    b.addChamferBox(0, sh * 0.58, 0.07, 0.18, 0.22, 0.12, 0.01, { materialRole: 'whiteTrim', layer: 'body' });
    objCreateScreenPlane(group, 'info_display', 0.12, 0.08, cfg.emissiveColor || '#3be882', cfg.condition, cfg.seed, {
      x: 0,
      y: sh * 0.6,
      z: 0.135
    });
    b.addBox(0, sh * 0.94, 0, 0.34, 0.02, 0.02, { materialRole: 'chrome', layer: 'detail' });
    b.addChamferBox(-0.14, sh * 0.84, 0, 0.09, 0.16, 0.04, 0.01, { materialRole: 'glass', layer: 'detail' });
    b.addChamferBox(0.14, sh * 0.86, 0, 0.09, 0.14, 0.04, 0.01, { materialRole: 'glass', layer: 'detail' });
  } else if (type === 'privacy_curtain_screen') {
    const ph = clamp(h, 1.55, 1.88);
    const pw = clamp(w / 3, 0.48, 0.68);
    const panels = [
      { cx: -pw * 0.92, cz: 0.12, ry: 22 },
      { cx: 0, cz: 0, ry: 0 },
      { cx: pw * 0.92, cz: 0.12, ry: -22 }
    ];
    for (const p of panels) {
      b.addBox(p.cx, ph * 0.52, p.cz, pw, ph - 0.14, 0.025, { materialRole: 'accent', layer: 'body', rotYDeg: p.ry });
      b.addBox(p.cx, 0.06, p.cz, pw + 0.02, 0.024, 0.036, { materialRole: 'chrome', layer: 'body', rotYDeg: p.ry });
      b.addBox(p.cx, ph - 0.05, p.cz, pw + 0.02, 0.024, 0.036, { materialRole: 'chrome', layer: 'body', rotYDeg: p.ry });
      b.addCylinder(p.cx - pw * 0.45, 0.022, p.cz, 0.022, 0.022, 0.028, 8, 'x', 'rubber', 'detail');
      b.addCylinder(p.cx + pw * 0.45, 0.022, p.cz, 0.022, 0.022, 0.028, 8, 'x', 'rubber', 'detail');
    }
  } else if (type === 'xray_light_viewer') {
    const bw = clamp(w, 0.46, 0.98);
    const bh = clamp(h, 0.44, 0.62);
    b.addChamferBox(0, 0, 0.04, bw, bh, 0.075, 0.01, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0, 0.08, bw * 0.9, bh * 0.82, 0.012, { materialRole: 'lampGlow', layer: 'detail' });
    b.addBox(-bw * 0.2, 0, 0.09, bw * 0.34, bh * 0.66, 0.008, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(bw * 0.2, 0, 0.09, bw * 0.34, bh * 0.66, 0.008, { materialRole: 'darkMetal', layer: 'detail' });
    meta.lightSources.push({ id: 'xray_lightbox_glow', position: [0, 0, 0.2], color: '#dff6ff', radius: 1.8 });
  } else if (type === 'defibrillator_wall_station') {
    b.addChamferBox(0, 0, 0.075, 0.38, 0.42, 0.14, 0.01, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(0, 0.02, 0.148, 0.3, 0.28, 0.014, { materialRole: 'glass', layer: 'detail' });
    b.addChamferBox(0, 0, 0.08, 0.2, 0.2, 0.07, 0.01, { materialRole: 'safetyRed', layer: 'detail' });
    b.addBox(0, 0.16, 0.148, 0.18, 0.055, 0.012, { materialRole: 'safetyRed', layer: 'detail' });
    objCreateSignPlane(group, 'Aed Station', 0.26, 0.075, '#cf342b', '#ffffff', {
      x: 0,
      y: -0.15,
      z: 0.152
    });
  } else {
    // biohazard_sharps_hamper
    const bw = clamp(w, 0.36, 0.56);
    const bh = clamp(h, 0.62, 0.88);
    b.addChamferBox(0, bh * 0.48, 0, bw, bh * 0.86, bw * 0.88, 0.016, { materialRole: 'safetyRed', layer: 'body' });
    b.addChamferBox(0, bh * 0.94, -0.02, bw + 0.02, 0.08, bw * 0.9, 0.014, { materialRole: 'safetyRed', layer: 'body', rotXDeg: -10 });
    b.addBox(0, 0.03, bw * 0.48, bw * 0.42, 0.024, 0.08, { materialRole: 'chrome', layer: 'detail' });
    objCreateSignPlane(group, 'Biohazard', bw * 0.68, 0.14, '#cf342b', '#f7df4a', {
      x: 0,
      y: bh * 0.55,
      z: bw * 0.45
    });
  }

  meta.interaction = { interactable: true, actionType: 'use_clinic_equipment', equipType: type };
}

function olacBuildMallConcourseFixture(group, cfg, b, mats, meta) {
  const type = cfg.fixtureType || 'island_retail_kiosk';
  const w = clamp(cfg.width || 2.4, 0.52, 3.6);
  const h = clamp(cfg.height || 2.25, 0.95, 2.8);
  const d = clamp(cfg.depth || 1.6, 0.42, 3.6);

  if (type === 'island_retail_kiosk') {
    const counterH = 0.98;
    b.addBox(0, 0.04, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
    // Perimeter display counters leaving rear entry opening
    b.addBox(0, counterH * 0.5, d * 0.5 - 0.18, w, counterH, 0.36, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.5 + 0.18, counterH * 0.5, 0, 0.36, counterH, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(w * 0.5 - 0.18, counterH * 0.5, 0, 0.36, counterH, d, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, counterH + 0.18, d * 0.5 - 0.18, w * 0.92, 0.34, 0.3, { materialRole: 'glass', layer: 'detail' });
    // Corner canopy pylons + glowing fascia ring
    for (const px of [-w * 0.46, w * 0.46]) {
      for (const pz of [-d * 0.44, d * 0.44]) {
        b.addCylinder(px, h * 0.5, pz, 0.045, 0.045, h, 8, 'y', 'chrome', 'body');
      }
    }
    b.addChamferBox(0, h - 0.12, 0, w + 0.16, 0.24, d + 0.16, 0.025, { materialRole: 'secondary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Mobile & Gift Kiosk', Math.min(w * 0.78, 1.8), 0.22, cfg.accentColor || '#1e466e', '#ffffff', {
      x: 0,
      y: h - 0.12,
      z: d * 0.5 + 0.09,
      lit: true,
      doubleSided: true,
      backOffset: d + 0.18
    });
  } else if (type === 'interactive_wayfinding_map') {
    const kw = clamp(w, 0.75, 1.25);
    const kh = clamp(h, 1.65, 2.2);
    b.addChamferBox(0, 0.05, 0, kw + 0.18, 0.1, 0.56, 0.02, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, kh * 0.52, 0, kw, kh - 0.1, 0.22, 0.025, { materialRole: 'primary', layer: 'body' });
    objCreateScreenPlane(group, 'info_display', kw * 0.82, kh * 0.56, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: kh * 0.48,
      z: 0.116
    });
    objCreateSignPlane(group, cfg.signText || 'Mall Map Directory', kw * 0.82, 0.24, cfg.accentColor || '#1d4d73', '#ffffff', {
      x: 0,
      y: kh - 0.22,
      z: 0.116,
      lit: true
    });
  } else if (type === 'atm_cash_machine') {
    const aw = clamp(w, 0.56, 0.82);
    const ah = clamp(h, 1.45, 1.82);
    const ad = clamp(d, 0.52, 0.78);
    b.addChamferBox(0, ah * 0.5, 0, aw, ah, ad, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ah * 0.64, ad * 0.5 + 0.02, aw * 0.84, ah * 0.44, 0.06, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateScreenPlane(group, 'login', aw * 0.52, 0.26, cfg.emissiveColor || '#3ad47f', cfg.condition, cfg.seed, {
      x: -aw * 0.08,
      y: ah * 0.68,
      z: ad * 0.5 + 0.055
    });
    b.addBox(-aw * 0.08, ah * 0.48, ad * 0.5 + 0.07, aw * 0.38, 0.04, 0.12, { materialRole: 'chrome', layer: 'detail', rotXDeg: 22 });
    b.addBox(aw * 0.26, ah * 0.62, ad * 0.5 + 0.056, 0.08, 0.04, 0.02, { materialRole: 'signalGreen', layer: 'detail' });
    b.addBox(0, ah * 0.36, ad * 0.5 + 0.025, aw * 0.48, 0.05, 0.03, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || '24Hr Atm Cash', aw * 0.78, 0.16, cfg.accentColor || '#265c8c', '#ffffff', {
      x: 0,
      y: ah - 0.12,
      z: ad * 0.5 + 0.02,
      lit: true
    });
  } else if (type === 'photo_booth_cabin') {
    const bw = clamp(w, 1.15, 1.45);
    const bh = clamp(h, 1.95, 2.2);
    const bd = clamp(d, 0.86, 1.05);
    b.addBox(0, 0.03, 0, bw, 0.06, bd, { materialRole: 'frame', layer: 'body' });
    b.addBox(-bw * 0.5 + 0.05, bh * 0.5, 0, 0.1, bh, bd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, bh * 0.5, -bd * 0.5 + 0.04, bw, bh, 0.08, { materialRole: 'primary', layer: 'body' });
    b.addBox(bw * 0.5 - 0.26, bh * 0.5, 0, 0.52, bh, bd, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, bh - 0.05, 0, bw, 0.1, bd, { materialRole: 'primary', layer: 'body' });
    b.addBox(-bw * 0.22, 0.48, 0, 0.34, 0.06, 0.38, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(-bw * 0.1, bh * 0.58, bd * 0.5 - 0.02, bw * 0.52, bh * 0.76, 0.03, { materialRole: 'fabric', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Instant Photos', bw * 0.65, 0.22, cfg.accentColor || '#c93830', '#ffffff', {
      x: 0,
      y: bh - 0.18,
      z: bd * 0.5 + 0.018,
      lit: true
    });
  } else if (type === 'claw_arcade_machine') {
    const cw = clamp(w, 0.75, 1.05);
    const ch = clamp(h, 1.85, 2.15);
    const cd = clamp(d, 0.75, 1.0);
    b.addBox(0, ch * 0.22, 0, cw, ch * 0.44, cd, { materialRole: 'primary', layer: 'body' });
    for (const sx of [-cw * 0.46, cw * 0.46]) {
      for (const sz of [-cd * 0.46, cd * 0.46]) {
        b.addBox(sx, ch * 0.66, sz, 0.07, ch * 0.48, 0.07, { materialRole: 'frame', layer: 'body' });
      }
    }
    b.addBox(0, ch * 0.66, 0, cw - 0.06, ch * 0.44, cd - 0.06, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, ch * 0.94, 0, cw + 0.04, 0.18, cd + 0.04, { materialRole: 'accent', layer: 'body' });
    b.addBox(0, ch * 0.46, cd * 0.5 + 0.08, cw * 0.72, 0.09, 0.16, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(-0.14, ch * 0.53, cd * 0.5 + 0.1, 0.015, 0.025, 0.08, 8, 'y', 'safetyRed', 'detail');
    objCreateSignPlane(group, cfg.signText || 'Prize Claw', cw * 0.78, 0.14, cfg.accentColor || '#d63e6c', '#ffffff', {
      x: 0,
      y: ch * 0.94,
      z: cd * 0.5 + 0.03,
      lit: true
    });
  } else if (type === 'food_court_tray_bin') {
    const bw = clamp(w, 0.58, 0.82);
    const bh = clamp(h, 1.1, 1.32);
    const bd = clamp(d, 0.54, 0.72);
    b.addChamferBox(0, bh * 0.48, 0, bw, bh * 0.96, bd, 0.015, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, bh * 0.56, bd * 0.5 + 0.012, bw * 0.72, 0.22, 0.024, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(0, bh - 0.02, 0, bw + 0.04, 0.04, bd + 0.04, { materialRole: 'secondary', layer: 'body' });
    b.addBox(-bw * 0.44, bh + 0.08, 0, 0.03, 0.14, bd * 0.92, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(bw * 0.44, bh + 0.08, 0, 0.03, 0.14, bd * 0.92, { materialRole: 'chrome', layer: 'detail' });
    b.addBox(0, bh + 0.04, 0.02, bw * 0.65, 0.045, bd * 0.62, { materialRole: 'accent', layer: 'detail' });
    objCreateSignPlane(group, 'Return Trays', bw * 0.74, 0.14, cfg.accentColor || '#265c8c', '#ffffff', {
      x: 0,
      y: bh * 0.82,
      z: bd * 0.5 + 0.018
    });
  } else {
    // escalator_balustrade_bay
    const ew = clamp(w, 1.15, 1.45);
    const runLen = clamp(d, 2.2, 3.6);
    const rise = clamp(h, 1.25, 2.15);
    const pitchRad = Math.atan2(rise, runLen);
    const diagLen = Math.hypot(runLen, rise);
    b.addBox(0, rise * 0.42, 0, ew, 0.34, diagLen, { materialRole: 'darkMetal', layer: 'body', rotX: -pitchRad });
    for (const sx of [-ew * 0.48, ew * 0.48]) {
      b.addBox(sx, rise * 0.42 + 0.48, 0, 0.04, 0.74, diagLen, { materialRole: 'glass', layer: 'detail', rotX: -pitchRad });
      b.addBox(sx, rise * 0.42 + 0.86, 0, 0.085, 0.055, diagLen + 0.24, { materialRole: 'rubber', layer: 'body', rotX: -pitchRad });
    }
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1) - 0.5;
      b.addBox(0, rise * 0.44 + t * rise + 0.14, t * runLen, ew * 0.84, 0.08, runLen / steps, { materialRole: 'chrome', layer: 'detail' });
    }
  }

  meta.interaction = { interactable: true, actionType: 'use_mall_fixture', fixtureType: type };
}

export function registerOfficeLobbiesAmenitiesAndCivicFamilies() {
  registerObjectFamily({
    id: 'reception_counter',
    categoryId: 'office_public_interiors',
    subcategory: 'Reception & Front Desks',
    subcategories: ['Reception & Front Desks'],
    label: 'Reception & Check-In Counters',
    description: 'Curved corporate front desks, L-shaped hotel counters, concierge stations, and municipal teller windows.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['reception', 'lobby', 'medical', 'public_service', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'large',
    functionalRole: 'commerce',
    tags: ['reception', 'front_desk', 'lobby', 'check_in', 'concierge', 'teller'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Counter Geometry' },
      {
        key: 'counterShape',
        name: 'Counter Shape',
        type: 'select',
        options: [
          ['curved_wave', 'Curved Wave Front'],
          ['l_shaped', 'L-Shaped Lobby Return'],
          ['straight_concierge', 'Straight Security Desk'],
          ['glass_window_teller', 'Glazed Teller Counter']
        ],
        default: 'curved_wave'
      },
      { key: 'width', name: 'Width', type: 'number', min: 1.6, max: 3.8, step: 0.1, unit: 'm', default: 2.8 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.75, max: 1.35, step: 0.05, unit: 'm', default: 0.95 },
      { key: 'height', name: 'Countertop Height', type: 'number', min: 1.06, max: 1.18, step: 0.02, unit: 'm', default: 1.12 },
      { group: 'Signage & Terminals' },
      { key: 'riserLedge', name: 'Transaction Riser Ledge', type: 'boolean', default: true },
      { key: 'frontSignage', name: 'Front Brand Signage', type: 'boolean', default: true },
      { key: 'signText', name: 'Front Sign Label', type: 'text', maxLength: 24, default: 'Reception Desk' },
      { key: 'terminalCount', name: 'Employee Monitors', type: 'number', min: 0, max: 2, step: 1, default: 1 }
    ],
    presets: [
      {
        id: 'curved_corporate_reception_desk',
        label: 'Curved Corporate Reception Desk',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'new',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c341f',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#e5dfd5',
        accentColor: '#d9dde2',
        frameColor: '#23282e',
        params: { counterShape: 'curved_wave', width: 2.8, height: 1.12, terminalCount: 1, signText: 'Apex Tower Lobby' }
      },
      {
        id: 'l_shaped_lobby_front_desk',
        label: 'L-Shaped Lobby Front Desk',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#bd9468',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#edeff2',
        accentColor: '#2d5c82',
        frameColor: '#363d45',
        params: { counterShape: 'l_shaped', width: 2.6, depth: 1.05, terminalCount: 2, signText: 'Welcome Center' }
      },
      {
        id: 'security_concierge_station',
        label: 'Lobby Security Concierge Station',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#303942',
        secondaryMaterial: 'polished_stone',
        secondaryColor: '#cfd6de',
        accentColor: '#3b82bd',
        frameColor: '#1e242b',
        params: { counterShape: 'straight_concierge', width: 2.2, terminalCount: 2, signText: 'Security Check-In' }
      },
      {
        id: 'hotel_check_in_counter',
        label: 'Hospitality Stone Check-In Counter',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'clean',
        primaryMaterial: 'polished_stone',
        primaryColor: '#cfc8bd',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#543320',
        accentColor: '#b5924c',
        frameColor: '#2c2520',
        params: { counterShape: 'straight_concierge', width: 3.1, terminalCount: 2, signText: 'Guest Registration' }
      },
      {
        id: 'medical_clinic_check_in',
        label: 'Medical Clinic Reception Counter',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#edf1f5',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#c9a982',
        accentColor: '#2e709e',
        frameColor: '#667582',
        params: { counterShape: 'curved_wave', width: 2.5, terminalCount: 2, signText: 'Patient Reception' }
      },
      {
        id: 'municipal_window_counter',
        label: 'Civic Window Teller Counter',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#667480',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#d9d3c7',
        accentColor: '#2a567d',
        frameColor: '#363f47',
        params: { counterShape: 'glass_window_teller', width: 3.0, terminalCount: 2, signText: 'Permit Services' }
      }
    ],
    buildGeometry: olacBuildReceptionCounter
  });

  registerObjectFamily({
    id: 'breakroom_equipment',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '27_sims_everyday_misc'],
    subcategory: 'Breakrooms & Employee Amenities',
    subcategories: ['Breakrooms & Employee Amenities', 'Lobbies, Decor & Collectibles'],
    label: 'Breakroom Appliances & Kitchenettes',
    description: 'Water coolers with translucent jugs, fridges, microwaves, coffee makers, vending machines, and sink cabinets.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['breakroom', 'office', 'coworking', 'lobby'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['breakroom', 'water_cooler', 'coffee', 'fridge', 'vending', 'microwave'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Appliance Profile' },
      {
        key: 'applianceType',
        name: 'Appliance Type',
        type: 'select',
        options: [
          ['water_cooler', '5-Gallon Water Cooler'],
          ['refrigerator', 'Breakroom Refrigerator'],
          ['microwave', 'Countertop Microwave'],
          ['coffee_station', 'Dual-Carafe Coffee Brewer'],
          ['vending_machine', 'Glass-Front Snack Machine'],
          ['sink_counter', 'Kitchenette Sink Cabinet']
        ],
        default: 'water_cooler'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.3, max: 1.85, step: 0.04, unit: 'm', default: 0.38 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.3, max: 0.85, step: 0.04, unit: 'm', default: 0.4 },
      { key: 'height', name: 'Height', type: 'number', min: 0.26, max: 2.05, step: 0.04, unit: 'm', default: 1.38 },
      { key: 'doorOpenAngle', name: 'Door Swing Angle', type: 'number', min: 0, max: 65, step: 5, unit: 'deg', default: 0 }
    ],
    presets: [
      {
        id: 'bottled_water_cooler_dispenser',
        label: 'Bottled Water Cooler Dispenser',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#edf0f2',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd6de',
        accentColor: '#3688cf',
        frameColor: '#252b30',
        params: { applianceType: 'water_cooler', width: 0.36, depth: 0.38, height: 1.36 }
      },
      {
        id: 'office_refrigerator_freezer',
        label: 'Stainless Office Refrigerator',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#b9c2cc',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#3a7bb8',
        frameColor: '#30363d',
        params: { applianceType: 'refrigerator', width: 0.78, depth: 0.7, height: 1.72, doorOpenAngle: 0 }
      },
      {
        id: 'breakroom_countertop_microwave',
        label: 'Countertop Office Microwave',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2e353d',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#b8c2cc',
        accentColor: '#3da873',
        frameColor: '#1f2328',
        params: { applianceType: 'microwave', width: 0.52, depth: 0.38, height: 0.32 }
      },
      {
        id: 'commercial_coffee_brewer_station',
        label: 'Commercial Dual-Carafe Coffee Maker',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#adb6bf',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#262b30',
        accentColor: '#e0892b',
        frameColor: '#1f2328',
        params: { applianceType: 'coffee_station', width: 0.44, depth: 0.38, height: 0.46 }
      },
      {
        id: 'snack_drink_vending_machine',
        label: 'Breakroom Snack Vending Machine',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c3d4f',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a3ad',
        accentColor: '#e08b36',
        frameColor: '#1c242e',
        params: { applianceType: 'vending_machine', width: 1.05, depth: 0.82, height: 1.88 }
      },
      {
        id: 'breakroom_sink_cabinet_unit',
        label: 'Breakroom Sink & Counter Cabinet',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d4cdc2',
        secondaryMaterial: 'polished_stone',
        secondaryColor: '#e5e9ed',
        accentColor: '#3a7bb8',
        frameColor: '#3c434a',
        params: { applianceType: 'sink_counter', width: 1.45, depth: 0.62, height: 0.9 }
      }
    ],
    buildGeometry: olacBuildBreakroomEquipment
  });

  registerObjectFamily({
    id: 'interior_wayfinding_sign',
    categoryId: 'office_public_interiors',
    subcategory: 'Signs, Information & Wayfinding',
    subcategories: ['Signs, Information & Wayfinding'],
    label: 'Wayfinding Directories & Exit Signs',
    description: 'Lobby directory totems, ceiling illuminated Exit boxes, corridor hanging signs, and door placards.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'ceiling_mounted', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['lobby', 'office', 'municipal', 'medical', 'public_service'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    tags: ['sign', 'exit_sign', 'directory', 'wayfinding', 'placard', 'lobby'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Sign Format' },
      {
        key: 'signStyle',
        name: 'Wayfinding Style',
        type: 'select',
        options: [
          ['lobby_totem', 'Lobby Directory Monolith'],
          ['ceiling_exit_box', 'Ceiling Lit Exit Box'],
          ['wall_directory', 'Wall Floor Directory'],
          ['room_placard', 'Door Number Placard'],
          ['corridor_blade', 'Hanging Corridor Sign'],
          ['tabletop_tent', 'Desktop Welcome Tent']
        ],
        default: 'lobby_totem'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.2, max: 1.45, step: 0.04, unit: 'm', default: 0.72 },
      { key: 'height', name: 'Height', type: 'number', min: 0.14, max: 2.25, step: 0.05, unit: 'm', default: 1.75 },
      { key: 'signText', name: 'Display Text', type: 'text', maxLength: 24, default: 'Floor Directory' },
      { key: 'illuminated', name: 'Backlit Illuminated', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'lobby_directory_totem_board',
        label: 'Digital Lobby Directory Totem',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#28333d',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#1d4d73',
        frameColor: '#192129',
        params: { signStyle: 'lobby_totem', width: 0.76, height: 1.85, signText: 'Building Directory' }
      },
      {
        id: 'illuminated_ceiling_exit_sign',
        label: 'Ceiling Lit Exit Sign Box',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#f2f4f7',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd6de',
        accentColor: '#cf2e26',
        frameColor: '#363d45',
        params: { signStyle: 'ceiling_exit_box', width: 0.42, height: 0.22, signText: 'Exit ->' }
      },
      {
        id: 'wall_room_number_placard',
        label: 'Suite Door Number Placard',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#36434f',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd6de',
        accentColor: '#2b577d',
        frameColor: '#252b30',
        params: { signStyle: 'room_placard', width: 0.28, height: 0.2, signText: 'Suite 402' }
      },
      {
        id: 'elevator_floor_directory_plaques',
        label: 'Wall Tenant Floor Directory',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#aeb7c0',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#2d3742',
        accentColor: '#224566',
        frameColor: '#21262c',
        params: { signStyle: 'wall_directory', width: 0.68, height: 0.95, signText: 'Floors 1 - 12' }
      },
      {
        id: 'corridor_hanging_directional_sign',
        label: 'Ceiling Hanging Corridor Sign',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#214563',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c4cdd6',
        accentColor: '#3a7bb8',
        frameColor: '#1f2833',
        params: { signStyle: 'corridor_blade', width: 0.96, height: 0.28, signText: 'Restrooms & Elevators' }
      },
      {
        id: 'desk_reception_welcome_sign',
        label: 'Tabletop Sign-In Tent Placard',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2d3742',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#d6dde4',
        accentColor: '#2f6896',
        frameColor: '#21262c',
        params: { signStyle: 'tabletop_tent', width: 0.28, height: 0.16, signText: 'Please Sign In' }
      }
    ],
    buildGeometry: olacBuildInteriorSignage
  });

  registerObjectFamily({
    id: 'security_access_control',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '22_police_municipal', '25_malls_libraries'],
    subcategory: 'Security & Access Control',
    subcategories: ['Security & Access Control', 'Police Booking & Holding', 'Investigation & Evidence'],
    label: 'Turnstiles, Metal Detectors & Scanners',
    description: 'Optical lobby badge gates, walk-through metal detectors, X-ray conveyors, wall Rfid readers, and dome Cctv.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'ceiling_mounted'],
    locationContext: 'interior',
    environmentTags: ['security', 'lobby', 'municipal', 'public_service', 'laboratory', 'clinic', 'mall'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'safety',
    tags: ['turnstile', 'security', 'metal_detector', 'cctv', 'badge_reader', 'xray'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Security Hardware' },
      {
        key: 'deviceType',
        name: 'Device Class',
        type: 'select',
        options: [
          ['optical_turnstile', 'Optical Badge Turnstile Lane'],
          ['tripod_turnstile_gate', 'Mechanical Tripod Turnstile Gate'],
          ['metal_detector_arch', 'Walk-Through Metal Detector'],
          ['belt_stanchion_single_end', 'Single Stanchion + Loose Belt'],
          ['belt_stanchion_pair', 'Retractable Belt Queue Stanchions'],
          ['wall_badge_reader', 'Wall Rfid Badge Reader'],
          ['dome_camera', 'Ceiling Dome Cctv Camera'],
          ['baggage_xray', 'Baggage X-Ray Conveyor']
        ],
        default: 'optical_turnstile'
      },
      { key: 'width', name: 'Width / Span', type: 'number', min: 0.12, max: 3.2, step: 0.04, unit: 'm', default: 1.35 },
      { key: 'height', name: 'Height', type: 'number', min: 0.18, max: 2.3, step: 0.04, unit: 'm', default: 1.02 },
      { key: 'poleCount', name: 'Stanchion Poles', type: 'number', min: 1, max: 8, step: 1, unit: 'poles', default: 2 },
      { key: 'beltLength', name: 'Belt / Lane Length', type: 'number', min: 0.45, max: 2.8, step: 0.05, unit: 'm', default: 1.5 },
      { key: 'extendTrailingBelt', name: 'Extend Loose Trailing Belt', type: 'boolean', default: true },
      { key: 'includeTopSign', name: 'Include Stanchion Sign Frame', type: 'boolean', default: false },
      { key: 'signText', name: 'Stanchion Sign Text', type: 'text', default: 'Please Wait Here' },
      { key: 'gateOpen', name: 'Granted / Gate Open', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'optical_badge_turnstile_gate',
        label: 'Optical Glass Lobby Turnstile',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'glass',
        secondaryColor: '#69b0cf',
        accentColor: '#3ad47f',
        frameColor: '#252b30',
        params: { deviceType: 'optical_turnstile', width: 1.3, height: 1.0, gateOpen: false }
      },
      {
        id: 'mechanical_tripod_turnstile_gate',
        label: 'Subway / Facility Tripod Turnstile Gate',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c4cdd6',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#48525e',
        accentColor: '#2a6f9c',
        frameColor: '#23282e',
        params: { deviceType: 'tripod_turnstile_gate', width: 0.9, height: 0.98, beltLength: 0.98, includeTopSign: false, gateOpen: false }
      },
      {
        id: 'walk_through_metal_detector_arch',
        label: 'Civic Walk-Through Metal Detector',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#5c6670',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#3c434a',
        accentColor: '#36c968',
        frameColor: '#282e34',
        params: { deviceType: 'metal_detector_arch', width: 0.96, height: 2.2 }
      },
      {
        id: 'retractable_belt_stanchion_single',
        label: 'Single Queue Stanchion + Loose Belt',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c4cdd6',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#23282e',
        accentColor: '#2a5a85',
        frameColor: '#1f2328',
        params: { deviceType: 'belt_stanchion_single_end', width: 1.5, height: 0.94, beltLength: 1.5, extendTrailingBelt: true, includeTopSign: false }
      },
      {
        id: 'retractable_belt_stanchion_pair',
        label: 'Retractable Belt Stanchion Pair',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c4cdd6',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#23282e',
        accentColor: '#2a5a85',
        frameColor: '#1f2328',
        params: { deviceType: 'belt_stanchion_pair', width: 1.5, height: 0.94, poleCount: 2, beltLength: 1.5 }
      },
      {
        id: 'retractable_belt_stanchion_line',
        label: '4-Pole Extended Queue Stanchion Line',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#23282e',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#1a1e24',
        accentColor: '#c23a32',
        frameColor: '#181c20',
        params: { deviceType: 'belt_stanchion_pair', width: 3.1, height: 0.94, poleCount: 4, beltLength: 1.05, extendTrailingBelt: false }
      },
      {
        id: 'retractable_belt_stanchion_sign',
        label: 'Queue Stanchion Line With Top Sign',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c4cdd6',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#23282e',
        accentColor: '#1e4a73',
        frameColor: '#1f2328',
        params: { deviceType: 'belt_stanchion_single_end', width: 1.4, height: 0.94, beltLength: 1.4, extendTrailingBelt: true, includeTopSign: true, signText: 'Please Wait Here' }
      },
      {
        id: 'wall_rfid_badge_reader_pad',
        label: 'Wall Rfid Proximity Reader',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#1f2429',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#48525e',
        accentColor: '#32d96c',
        frameColor: '#181c20',
        params: { deviceType: 'wall_badge_reader', width: 0.12, height: 0.18, gateOpen: true }
      },
      {
        id: 'interior_dome_cctv_camera',
        label: 'Ceiling Recessed Security Dome',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#f2f4f7',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#1c2026',
        accentColor: '#d93028',
        frameColor: '#282d33',
        params: { deviceType: 'dome_camera', width: 0.2, height: 0.18 }
      },
      {
        id: 'xray_baggage_scanner_conveyor',
        label: 'Security Baggage X-Ray Belt',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#596673',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a3ad',
        accentColor: '#e08b36',
        frameColor: '#2b323b',
        params: { deviceType: 'baggage_xray', width: 1.75, height: 1.25 }
      }
    ],
    buildGeometry: olacBuildSecurityAccessControl
  });

  registerObjectFamily({
    id: 'interior_building_infrastructure',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '26_trades_plumbing_electrical'],
    subcategory: 'Interior Building Infrastructure',
    subcategories: ['Interior Building Infrastructure', 'Electrical Panels & Distribution', 'Plumbing, Boilers & Pumps'],
    label: 'Elevators, Ceiling Lights & Fire Safety',
    description: 'Brushed steel elevator doors, ceiling Led troffers, Hvac diffusers, fire cabinets, radiators, and pull stations.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'ceiling_mounted', 'ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'lobby', 'municipal', 'commercial', 'residential_interior'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['elevator', 'ceiling_light', 'troffer', 'hvac', 'fire_extinguisher', 'radiator'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Infrastructure Element' },
      {
        key: 'infraType',
        name: 'System Element',
        type: 'select',
        options: [
          ['elevator_doors', 'Elevator Doors & Call Panel'],
          ['ceiling_troffer_light', 'Ceiling Led Troffer Light'],
          ['ceiling_hvac_diffuser', 'Ceiling Hvac Diffuser Grille'],
          ['fire_extinguisher_cabinet', 'Wall Fire Extinguisher Box'],
          ['steam_radiator', 'Cast-Iron Office Radiator'],
          ['fire_alarm_strobe', 'Fire Alarm Pull & Strobe']
        ],
        default: 'elevator_doors'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.16, max: 2.25, step: 0.05, unit: 'm', default: 1.65 },
      { key: 'height', name: 'Height', type: 'number', min: 0.12, max: 2.45, step: 0.05, unit: 'm', default: 2.25 },
      { key: 'doorGapOpen', name: 'Elevator Door Gap', type: 'number', min: 0, max: 0.45, step: 0.05, unit: 'm', default: 0 },
      { key: 'lampLit', name: 'Troffer Lamp Lit', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'elevator_double_doors_call_panel',
        label: 'Stainless Elevator Doors & Lantern',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#aeb7c0',
        accentColor: '#e09b36',
        frameColor: '#363d45',
        params: { infraType: 'elevator_doors', width: 1.6, height: 2.24, doorGapOpen: 0 }
      },
      {
        id: 'recessed_ceiling_led_troffer',
        label: 'Recessed Ceiling Led Troffer',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e6eaef',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#f5f7fa',
        accentColor: '#fff2c4',
        frameColor: '#cfd6de',
        params: { infraType: 'ceiling_troffer_light', width: 1.18, height: 0.14, lampLit: true }
      },
      {
        id: 'wall_fire_extinguisher_cabinet',
        label: 'Wall Fire Extinguisher Cabinet',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf342b',
        secondaryMaterial: 'glass',
        secondaryColor: '#8db4c9',
        accentColor: '#ffffff',
        frameColor: '#a3241d',
        params: { infraType: 'fire_extinguisher_cabinet', width: 0.34, height: 0.72 }
      },
      {
        id: 'cast_iron_office_radiator',
        label: 'Vintage Cast-Iron Steam Radiator',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'retro_80s_office',
        condition: 'lightly_worn',
        primaryMaterial: 'cast_iron',
        primaryColor: '#adb2b8',
        secondaryMaterial: 'cast_iron',
        secondaryColor: '#8d9299',
        accentColor: '#c99a3a',
        frameColor: '#484d52',
        params: { infraType: 'steam_radiator', width: 1.05, height: 0.64 }
      },
      {
        id: 'ceiling_hvac_square_diffuser',
        label: 'Ceiling Square Hvac Diffuser',
        attachmentProfile: 'ceiling_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#edf1f5',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#d0d7de',
        accentColor: '#7a8896',
        frameColor: '#b9c2cc',
        params: { infraType: 'ceiling_hvac_diffuser', width: 0.58, height: 0.12 }
      },
      {
        id: 'wall_fire_alarm_pull_strobe',
        label: 'Wall Fire Pull & Horn Strobe',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf342b',
        secondaryMaterial: 'plastic',
        secondaryColor: '#f2f4f7',
        accentColor: '#e8b228',
        frameColor: '#9e2119',
        params: { infraType: 'fire_alarm_strobe', width: 0.16, height: 0.24 }
      }
    ],
    buildGeometry: olacBuildInteriorInfrastructure
  });

  registerObjectFamily({
    id: 'cleaning_maintenance_prop',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '26_trades_plumbing_electrical', '27_sims_everyday_misc'],
    subcategory: 'Cleaning & Maintenance',
    subcategories: ['Cleaning & Maintenance', 'Repair Tools, Ladders & Carts'],
    label: 'Janitorial Carts, Cones & Bins',
    description: 'Yellow mop buckets, wet floor A-frames, indoor 3-stream recycling stations, custodial carts, and vacuums.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'lobby', 'utility_room', 'public_service'],
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['janitor', 'mop_bucket', 'wet_floor', 'recycling', 'vacuum', 'custodial'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Equipment Choice' },
      {
        key: 'maintType',
        name: 'Maintenance Prop',
        type: 'select',
        options: [
          ['mop_bucket_cart', 'Wringer Mop Bucket'],
          ['wet_floor_sign', 'A-Frame Wet Floor Sign'],
          ['recycling_trio_bin', '3-Stream Indoor Recycling Trio'],
          ['custodial_cart', 'Janitor Supply Cart'],
          ['upright_vacuum', 'Commercial Upright Vacuum']
        ],
        default: 'mop_bucket_cart'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.3, max: 1.35, step: 0.05, unit: 'm', default: 0.52 },
      { key: 'height', name: 'Height', type: 'number', min: 0.58, max: 1.35, step: 0.04, unit: 'm', default: 0.96 }
    ],
    presets: [
      {
        id: 'janitor_mop_bucket_wringer_cart',
        label: 'Yellow Mop & Wringer Cart',
        paletteFamily: 'municipal_office',
        condition: 'lightly_worn',
        primaryMaterial: 'plastic',
        primaryColor: '#e8b228',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#363d45',
        accentColor: '#c98836',
        frameColor: '#252a30',
        params: { maintType: 'mop_bucket_cart', width: 0.48, height: 0.92 }
      },
      {
        id: 'yellow_wet_floor_caution_cone',
        label: 'A-Frame Wet Floor Sign',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'plastic',
        primaryColor: '#ebba34',
        secondaryMaterial: 'plastic',
        secondaryColor: '#1f2328',
        accentColor: '#cf342b',
        frameColor: '#23282e',
        params: { maintType: 'wet_floor_sign', width: 0.34, height: 0.66 }
      },
      {
        id: 'office_recycling_trash_trio',
        label: '3-Stream Indoor Waste & Recycling',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#56606b',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a3ad',
        accentColor: '#327cc9',
        frameColor: '#2a3036',
        params: { maintType: 'recycling_trio_bin', width: 1.15, height: 0.86 }
      },
      {
        id: 'custodial_utility_barrel_cart',
        label: 'Custodial Cleaning Supply Cart',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#3c434a',
        secondaryMaterial: 'plastic',
        secondaryColor: '#e8b228',
        accentColor: '#2d6ea8',
        frameColor: '#23282e',
        params: { maintType: 'custodial_cart', width: 0.56, height: 0.98 }
      },
      {
        id: 'commercial_upright_vacuum',
        label: 'Commercial Corridor Vacuum',
        paletteFamily: 'industrial_loft_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#2c333b',
        secondaryMaterial: 'fabric',
        secondaryColor: '#b83d35',
        accentColor: '#e8b228',
        frameColor: '#1e2328',
        params: { maintType: 'upright_vacuum', width: 0.36, height: 1.12 }
      }
    ],
    buildGeometry: olacBuildCleaningMaintenance
  });

  registerObjectFamily({
    id: 'office_decor_prop',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '27_sims_everyday_misc'],
    subcategory: 'Office Decorations & Miscellaneous Props',
    subcategories: ['Office Decorations & Miscellaneous Props', 'Lobbies, Decor & Collectibles'],
    label: 'Indoor Plants, Wall Art & Awards',
    description: 'Potted floor planters, divider troughs, framed wall art, coat racks, wall clocks, and desktop trophies.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['office', 'lobby', 'reception', 'conference', 'residential_interior'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'decorative',
    tags: ['plant', 'planter', 'wall_art', 'clock', 'coat_rack', 'trophy', 'decor'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Decor Selection' },
      {
        key: 'decorType',
        name: 'Decor Type',
        type: 'select',
        options: [
          ['potted_floor_plant', 'Potted Indoor Floor Plant'],
          ['trough_planter', 'Corridor Trough Planter'],
          ['framed_wall_art', 'Framed Wall Artwork'],
          ['coat_rack_stand', 'Standing Coat Rack'],
          ['wall_clock', 'Analog Office Wall Clock'],
          ['desk_trophy_globe', 'Desktop Brass Award Trophy']
        ],
        default: 'potted_floor_plant'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.18, max: 1.45, step: 0.04, unit: 'm', default: 0.55 },
      { key: 'height', name: 'Height', type: 'number', min: 0.25, max: 1.85, step: 0.05, unit: 'm', default: 1.45 }
    ],
    presets: [
      {
        id: 'potted_fiddle_leaf_office_plant',
        label: 'Potted Ceramic Indoor Office Plant',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'polished_stone',
        primaryColor: '#cfd6de',
        secondaryMaterial: 'polished_stone',
        secondaryColor: '#e8ebef',
        accentColor: '#3f7c46',
        frameColor: '#2e343b',
        params: { decorType: 'potted_floor_plant', width: 0.54, height: 1.48 }
      },
      {
        id: 'rectangular_lobby_divider_planter',
        label: 'Modular Office Planter Divider',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#485461',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#b89066',
        accentColor: '#458a4c',
        frameColor: '#2d353d',
        params: { decorType: 'trough_planter', width: 1.25, height: 0.72 }
      },
      {
        id: 'framed_corporate_wall_art',
        label: 'Framed Abstract Wall Art',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#466e94',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f5f7fa',
        accentColor: '#d98932',
        frameColor: '#2b221b',
        params: { decorType: 'framed_wall_art', width: 1.05, height: 0.76 }
      },
      {
        id: 'standing_coat_umbrella_rack',
        label: 'Brass-Hook Wood Coat Stand',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c3621',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#482817',
        accentColor: '#c99b3b',
        frameColor: '#2c1f16',
        params: { decorType: 'coat_rack_stand', width: 0.48, height: 1.75 }
      },
      {
        id: 'wall_analog_office_clock',
        label: 'Standard Analog Wall Clock',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#252a30',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#f5f7fa',
        accentColor: '#cf342b',
        frameColor: '#1f2328',
        params: { decorType: 'wall_clock', width: 0.36, height: 0.36 }
      },
      {
        id: 'tabletop_award_trophy_globe',
        label: 'Executive Desktop Gold Trophy',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'new',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#4f2d1c',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#d9b54c',
        accentColor: '#c99b3b',
        frameColor: '#291a10',
        params: { decorType: 'desk_trophy_globe', width: 0.18, height: 0.32 }
      }
    ],
    buildGeometry: olacBuildOfficeDecor
  });

  registerObjectFamily({
    id: 'civic_medical_facility_prop',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '22_police_municipal', '23_clinics_waiting'],
    subcategory: 'Public Service & Civic Facilities',
    subcategories: ['Public Service & Civic Facilities', 'Medical Office & Professional Waiting Areas', 'Courthouses & Hearings', 'Waiting Room Amenities'],
    label: 'Civic Queue Kiosks & Medical Props',
    description: 'Take-a-number ticket kiosks, voting booths, velvet rope barriers, medical scales, wheelchairs, sanitizer stands, and queue boards.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['public_service', 'medical', 'clinic', 'municipal', 'waiting_room', 'lobby'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['civic', 'medical', 'clinic', 'kiosk', 'queue', 'voting', 'scale', 'vitals', 'wheelchair', 'sanitizer'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Facility Prop Type' },
      {
        key: 'facilityType',
        name: 'Facility Unit',
        type: 'select',
        options: [
          ['ticket_kiosk', 'Take-A-Number Ticket Kiosk'],
          ['voting_booth', 'Civic Voting Privacy Booth'],
          ['bank_rope_stanchion', 'Velvet Rope Queue Barrier'],
          ['medical_scale', 'Clinic Mechanical Weight Scale'],
          ['vitals_monitor_cart', 'Rolling Clinic Vitals Cart'],
          ['clinic_window_counter', 'Pharmacy / Intake Glass Counter'],
          ['wheelchair_transport', 'Patient Transport Wheelchair'],
          ['sanitizer_totem_stand', 'Hand Sanitizer Dispenser Stand'],
          ['waiting_magazine_toy_rack', 'Waiting Room Magazine Rack'],
          ['wall_queue_display_board', 'Wall Queue Status Display']
        ],
        default: 'ticket_kiosk'
      },
      { key: 'width', name: 'Width / Span', type: 'number', min: 0.36, max: 1.85, step: 0.05, unit: 'm', default: 0.56 },
      { key: 'height', name: 'Height', type: 'number', min: 0.36, max: 2.05, step: 0.04, unit: 'm', default: 1.48 },
      {
        key: 'screenMode',
        name: 'Display State',
        type: 'select',
        options: [
          ['info_display', 'Ticket / Vitals Telemetry'],
          ['desktop_ui', 'Check-In Kiosk Ui'],
          ['off', 'Powered Off']
        ],
        default: 'info_display'
      }
    ],
    presets: [
      {
        id: 'queue_ticket_dispenser_kiosk',
        label: 'Dmv Queue Ticket Touch Kiosk',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#486078',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#ced6de',
        accentColor: '#cf342b',
        frameColor: '#252d36',
        params: { facilityType: 'ticket_kiosk', width: 0.44, height: 1.48, screenMode: 'info_display' }
      },
      {
        id: 'civic_voting_privacy_booth',
        label: 'Municipal Polling Privacy Booth',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#cfd6de',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#2d537a',
        accentColor: '#b83d35',
        frameColor: '#8d9aa6',
        params: { facilityType: 'voting_booth', width: 0.78, height: 1.78 }
      },
      {
        id: 'roped_bank_queue_barrier',
        label: 'Brass Velvet Rope Queue Stanchions',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'luxury_corporate_lobby',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c99b3b',
        secondaryMaterial: 'fabric',
        secondaryColor: '#9e2620',
        accentColor: '#9e2620',
        frameColor: '#8f6c22',
        params: { facilityType: 'bank_rope_stanchion', width: 1.5, height: 0.96 }
      },
      {
        id: 'medical_exam_scale_station',
        label: 'Medical Height & Weight Scale',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#edf1f5',
        accentColor: '#2f729e',
        frameColor: '#252a30',
        params: { facilityType: 'medical_scale', width: 0.42, height: 1.54 }
      },
      {
        id: 'clinic_rolling_vitals_monitor',
        label: 'Clinic Rolling Vitals Monitor Cart',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#eef2f5',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c4cdd6',
        accentColor: '#36c982',
        frameColor: '#36404a',
        params: { facilityType: 'vitals_monitor_cart', width: 0.48, height: 1.42, screenMode: 'info_display' }
      },
      {
        id: 'pharmacy_pickup_partition_counter',
        label: 'Clinic Intake & Pharmacy Counter',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e6ecf2',
        secondaryMaterial: 'light_office_wood',
        secondaryColor: '#c9a67d',
        accentColor: '#2d729e',
        frameColor: '#4e5d6b',
        params: { facilityType: 'clinic_window_counter', width: 1.65, height: 1.74 }
      },
      {
        id: 'clinic_patient_wheelchair',
        label: 'Clinic Patient Transport Wheelchair',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'faux_leather',
        primaryColor: '#294866',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c9d2db',
        accentColor: '#3988c4',
        frameColor: '#252c33',
        params: { facilityType: 'wheelchair_transport', width: 0.66, height: 0.96 }
      },
      {
        id: 'lobby_hand_sanitizer_stand',
        label: 'Touchless Hand Sanitizer Stand',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce3eb',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#2b77ab',
        frameColor: '#262d36',
        params: { facilityType: 'sanitizer_totem_stand', width: 0.38, height: 1.36 }
      },
      {
        id: 'waiting_room_magazine_rack',
        label: 'Waiting Room Magazine & Brochure Stand',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#b58a5e',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#e6e0d5',
        accentColor: '#2e709e',
        frameColor: '#4a545e',
        params: { facilityType: 'waiting_magazine_toy_rack', width: 0.84, height: 1.28 }
      },
      {
        id: 'wall_queue_now_serving_board',
        label: "Wall 'Now Serving' Queue Display",
        attachmentProfile: 'wall_mounted',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'municipal_office',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#252b32',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#3d4854',
        accentColor: '#21517a',
        frameColor: '#1a1f24',
        params: { facilityType: 'wall_queue_display_board', width: 1.12, height: 0.52, screenMode: 'info_display' }
      }
    ],
    buildGeometry: olacBuildCivicMedicalFacility
  });

  registerObjectFamily({
    id: 'clinic_exam_equipment',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '23_clinics_waiting'],
    subcategory: 'Medical Office & Professional Waiting Areas',
    subcategories: ['Medical Office & Professional Waiting Areas', 'Waiting Room Amenities'],
    label: 'Clinic Exam Tables, Iv Stands & Med Cabinets',
    description: 'Adjustable clinic exam tables, rolling Iv infusion pumps, folding privacy screens, wall X-ray viewers, Aed stations, and sharps hampers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['medical', 'clinic', 'waiting_room', 'public_service'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['clinic', 'medical', 'exam_table', 'iv_drip', 'xray', 'aed', 'sharps', 'privacy_screen'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Medical Equipment' },
      {
        key: 'equipType',
        name: 'Equipment Unit',
        type: 'select',
        options: [
          ['exam_table', 'Padded Clinical Exam Table'],
          ['iv_drip_stand', 'Rolling Iv Infusion Stand'],
          ['privacy_curtain_screen', '3-Panel Privacy Screen'],
          ['xray_light_viewer', 'Wall X-Ray Film Lightbox'],
          ['defibrillator_wall_station', 'Wall Aed Defibrillator Cabinet'],
          ['biohazard_sharps_hamper', 'Biohazard & Sharps Bin']
        ],
        default: 'exam_table'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.32, max: 1.95, step: 0.04, unit: 'm', default: 0.72 },
      { key: 'length', name: 'Table Length', type: 'number', min: 1.2, max: 2.1, step: 0.05, unit: 'm', default: 1.82 },
      { key: 'height', name: 'Height', type: 'number', min: 0.38, max: 2.05, step: 0.04, unit: 'm', default: 0.84 },
      { key: 'backrestAngle', name: 'Exam Backrest Tilt', type: 'number', min: 0, max: 58, step: 2, unit: 'deg', default: 26 }
    ],
    presets: [
      {
        id: 'clinic_padded_exam_table',
        label: 'Adjustable Clinic Exam Table',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e8edf2',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#d0d8e0',
        accentColor: '#36749e',
        frameColor: '#5d6b78',
        params: { equipType: 'exam_table', width: 0.74, length: 1.84, backrestAngle: 28 }
      },
      {
        id: 'rolling_iv_infusion_stand',
        label: 'Rolling Iv Drip & Pump Stand',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#edf1f5',
        accentColor: '#3ad48a',
        frameColor: '#48525c',
        params: { equipType: 'iv_drip_stand', width: 0.52, height: 1.92 }
      },
      {
        id: 'folding_medical_privacy_screen',
        label: '3-Panel Medical Privacy Screen',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cbd4de',
        secondaryMaterial: 'fabric',
        secondaryColor: '#8eb8cf',
        accentColor: '#72a4bf',
        frameColor: '#5c6670',
        params: { equipType: 'privacy_curtain_screen', width: 1.72, height: 1.76 }
      },
      {
        id: 'wall_xray_film_lightbox',
        label: 'Wall Illuminated X-Ray Viewer',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#e5ebf0',
        accentColor: '#7be0ff',
        frameColor: '#48525c',
        params: { equipType: 'xray_light_viewer', width: 0.86, height: 0.52 }
      },
      {
        id: 'wall_aed_first_aid_cabinet',
        label: 'Wall Aed & First-Aid Cabinet',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'municipal_office',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#edf1f5',
        secondaryMaterial: 'glass',
        secondaryColor: '#98bdd1',
        accentColor: '#cf342b',
        frameColor: '#9e2119',
        params: { equipType: 'defibrillator_wall_station', width: 0.38, height: 0.42 }
      },
      {
        id: 'clinic_biohazard_sharps_station',
        label: 'Biohazard & Sharps Disposal Unit',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'plastic',
        primaryColor: '#cf342b',
        secondaryMaterial: 'plastic',
        secondaryColor: '#e8edf2',
        accentColor: '#f5ce42',
        frameColor: '#252b30',
        params: { equipType: 'biohazard_sharps_hamper', width: 0.44, height: 0.78 }
      }
    ],
    buildGeometry: olacBuildClinicExamEquipment
  });

  registerObjectFamily({
    id: 'mall_concourse_fixture',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '25_malls_libraries'],
    subcategory: 'Waiting Rooms & Public Lobbies',
    subcategories: [
      'Waiting Rooms & Public Lobbies',
      'Public Service & Civic Facilities',
      'Signs, Information & Wayfinding',
      'Mall Concourses & Kiosks',
      'Retail & Arcade Attractions'
    ],
    label: 'Mall Kiosks, Directories & Concourse Props',
    description: 'Shopping mall island kiosks, touchscreen directory maps, Atm cash machines, photo booths, claw machines, tray bins, and escalator bays.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    environmentTags: ['mall', 'commercial', 'lobby', 'public_service', 'waiting_room'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    tags: ['mall', 'kiosk', 'atm', 'directory', 'photo_booth', 'arcade', 'food_court', 'escalator'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Concourse Fixture' },
      {
        key: 'fixtureType',
        name: 'Fixture Style',
        type: 'select',
        options: [
          ['island_retail_kiosk', 'Mall Island Retail Kiosk'],
          ['interactive_wayfinding_map', 'Interactive Mall Map Totem'],
          ['atm_cash_machine', 'Freestanding Atm Cash Machine'],
          ['photo_booth_cabin', 'Instant Photo Booth Cabin'],
          ['claw_arcade_machine', 'Prize Claw Arcade Machine'],
          ['food_court_tray_bin', 'Food Court Tray-Return Bin'],
          ['escalator_balustrade_bay', 'Glass Escalator Balustrade Bay']
        ],
        default: 'island_retail_kiosk'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.52, max: 3.6, step: 0.05, unit: 'm', default: 2.4 },
      { key: 'depth', name: 'Depth / Run', type: 'number', min: 0.42, max: 3.6, step: 0.05, unit: 'm', default: 1.6 },
      { key: 'height', name: 'Height / Rise', type: 'number', min: 0.95, max: 2.8, step: 0.05, unit: 'm', default: 2.25 },
      { key: 'signText', name: 'Kiosk Banner Text', type: 'text', maxLength: 24, default: 'Center Court' }
    ],
    presets: [
      {
        id: 'mall_island_retail_kiosk',
        label: 'Mall Retail Island Kiosk Booth',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#e2dbd0',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#2d4b69',
        accentColor: '#3687c4',
        frameColor: '#2a323b',
        params: { fixtureType: 'island_retail_kiosk', width: 2.5, depth: 1.65, height: 2.35, signText: 'Tech & Accessories' }
      },
      {
        id: 'mall_interactive_map_directory',
        label: "Mall 'You Are Here' Map Kiosk",
        subcategory: 'Signs, Information & Wayfinding',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#273440',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#1d4d73',
        frameColor: '#182028',
        params: { fixtureType: 'interactive_wayfinding_map', width: 0.92, depth: 0.56, height: 1.98, signText: 'Mall Directory' }
      },
      {
        id: 'mall_lobby_atm_machine',
        label: 'Lobby & Mall Atm Cash Machine',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#294869',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#9aa5b0',
        accentColor: '#256ba1',
        frameColor: '#1d242b',
        params: { fixtureType: 'atm_cash_machine', width: 0.66, depth: 0.64, height: 1.62, signText: 'Metro Bank Atm' }
      },
      {
        id: 'mall_instant_photo_booth',
        label: 'Mall Instant Photo Booth Cabin',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2d3742',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#d9dfe6',
        accentColor: '#c93830',
        frameColor: '#1c2229',
        params: { fixtureType: 'photo_booth_cabin', width: 1.28, depth: 0.96, height: 2.08, signText: 'Photo Strips' }
      },
      {
        id: 'mall_arcade_claw_cabinet',
        label: 'Mall Prize Claw Arcade Machine',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf426e',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#e8ecf2',
        accentColor: '#f2b830',
        frameColor: '#222830',
        params: { fixtureType: 'claw_arcade_machine', width: 0.86, depth: 0.86, height: 2.02, signText: 'Prize Claw' }
      },
      {
        id: 'food_court_tray_trash_receptacle',
        label: 'Food Court Tray-Return Trash Bin',
        subcategory: 'Public Service & Civic Facilities',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#9e754c',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd6de',
        accentColor: '#265c8c',
        frameColor: '#2a3036',
        params: { fixtureType: 'food_court_tray_bin', width: 0.68, depth: 0.62, height: 1.22, signText: 'Trash & Trays' }
      },
      {
        id: 'mall_glass_escalator_bay',
        label: 'Mall Atrium Glass Escalator Bay',
        subcategory: 'Waiting Rooms & Public Lobbies',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#cfd7e0',
        secondaryMaterial: 'glass',
        secondaryColor: '#7cb5cf',
        accentColor: '#2d6896',
        frameColor: '#21272e',
        params: { fixtureType: 'escalator_balustrade_bay', width: 1.28, depth: 3.1, height: 1.65 }
      }
    ],
    buildGeometry: olacBuildMallConcourseFixture
  });
}
