import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function pslrBuildParkPlanter(group, cfg, b, mats, meta) {
  const style = cfg.parkStyle || 'concrete_street_planter';
  const w = clamp(cfg.width || 1.25, 0.6, 2.6);
  const h = clamp(cfg.height || 0.65, 0.08, 2.1);
  const d = clamp(cfg.depth || 1.25, 0.6, 2.6);
  const rim = clamp(cfg.rimThickness || 0.1, 0.05, 0.18);
  const shape = cfg.shape || 'rectangular';

  if (style === 'cast_iron_tree_grate') {
    const r = Math.min(w, d) * 0.5;
    b.addPrismRing(0, 0.02, 0, r, r * 0.34, 0.04, 8, 'y', 'frame', 'body');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.addBox(Math.cos(a) * r * 0.66, 0.025, Math.sin(a) * r * 0.66, r * 0.58, 0.025, 0.04, {
        materialRole: 'frame',
        layer: 'detail',
        rotY: -a
      });
    }
    if (cfg.treeGuardCage) {
      const guardH = Math.max(0.85, h);
      const gr = r * 0.42;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.addCylinder(Math.cos(a) * gr, guardH * 0.5, Math.sin(a) * gr, 0.018, 0.018, guardH, 6, 'y', 'frame', 'detail');
      }
      b.addPrismRing(0, guardH, 0, gr + 0.02, gr - 0.02, 0.04, 6, 'y', 'frame', 'detail');
      b.addPrismRing(0, guardH * 0.5, 0, gr + 0.02, gr - 0.02, 0.04, 6, 'y', 'frame', 'detail');
    }
    return;
  }

  if (style === 'drinking_fountain') {
    b.addCylinder(0, h * 0.45, 0, 0.16, 0.18, h * 0.9, 10, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.92, 0, 0.24, 0.16, 0.14, 10, 'y', 'secondary', 'body');
    b.addBox(0.08, h + 0.03, 0, 0.08, 0.06, 0.04, { materialRole: 'secondary', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'drink_water' };
    return;
  }

  if (style === 'tiered_park_fountain') {
    const r = Math.min(w, d) * 0.48;
    b.addPrismRing(0, 0.22, 0, r, r * 0.85, 0.44, 10, 'y', 'concrete', 'body');
    b.addCylinder(0, 0.08, 0, r * 0.9, r * 0.9, 0.16, 10, 'y', 'glass', 'detail');
    b.addCylinder(0, 0.72, 0, r * 0.18, r * 0.24, 0.95, 10, 'y', 'concrete', 'body');
    b.addCylinder(0, 1.16, 0, r * 0.52, r * 0.2, 0.2, 10, 'y', 'concrete', 'body');
    b.addCylinder(0, 1.56, 0, 0.08, r * 0.14, 0.65, 8, 'y', 'concrete', 'body');
    return;
  }

  if (style === 'park_entry_sign') {
    b.addBox(-w * 0.42, h * 0.5, 0, 0.12, h, 0.12, { materialRole: 'wood', layer: 'body' });
    b.addBox(w * 0.42, h * 0.5, 0, 0.12, h, 0.12, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, h * 0.74, 0, w, h * 0.42, 0.1, { materialRole: 'wood', layer: 'body' });
    objCreateSignPlane(group, 'City Park', w * 0.82, h * 0.3, '#2d573e', '#f4efe0', {
      x: 0,
      y: h * 0.74,
      z: 0.056,
      doubleSided: true,
      backOffset: 0.112
    });
    return;
  }

  // Planter box / raised timber bed
  const tubMat = style === 'raised_timber_bed' ? 'wood' : 'concrete';
  if (shape === 'circular' || shape === 'octagonal') {
    const sides = shape === 'octagonal' ? 8 : 12;
    const rad = Math.min(w, d) * 0.48;
    b.addCylinder(0, h * 0.5, 0, rad, rad * 0.94, h, sides, 'y', tubMat, 'body');
    b.addPrismRing(0, h + 0.03, 0, rad + 0.04, rad - rim, 0.06, sides, 'y', tubMat, 'detail');
    b.addCylinder(0, h - 0.05, 0, rad - rim * 0.8, rad - rim * 0.8, 0.08, sides, 'y', 'wood', 'detail');
  } else {
    b.addBox(0, h * 0.5, 0, w, h, d, { materialRole: tubMat, layer: 'body' });
    b.addBox(0, h + 0.03, d * 0.5 - rim * 0.4, w + 0.04, 0.06, rim, { materialRole: tubMat, layer: 'detail' });
    b.addBox(0, h + 0.03, -d * 0.5 + rim * 0.4, w + 0.04, 0.06, rim, { materialRole: tubMat, layer: 'detail' });
    b.addBox(-w * 0.5 + rim * 0.4, h + 0.03, 0, rim, 0.06, d - rim, { materialRole: tubMat, layer: 'detail' });
    b.addBox(w * 0.5 - rim * 0.4, h + 0.03, 0, rim, 0.06, d - rim, { materialRole: tubMat, layer: 'detail' });
    b.addBox(0, h - 0.03, 0, w - rim * 1.6, 0.06, d - rim * 1.6, { materialRole: 'wood', layer: 'detail' });
  }

  // Stylized low-poly shrubs / foliage inside planter
  if (cfg.foliageType !== 'none') {
    const density = Math.max(1, Math.round(cfg.foliageDensity || 3));
    if (cfg.foliageType === 'trimmed_hedge') {
      b.addChamferBox(0, h + 0.24, 0, w * 0.76, 0.46, d * 0.76, 0.08, { materialRole: 'foliage', layer: 'detail' });
    } else {
      for (let i = 0; i < density; i++) {
        const fx = density === 1 ? 0 : -w * 0.26 + (i / (density - 1)) * (w * 0.52);
        const fz = ((i % 2) - 0.5) * d * 0.22;
        const fr = Math.min(w, d) * 0.22;
        b.addCylinder(fx, h + 0.16, fz, fr * 0.78, fr, 0.28, 7, 'y', 'foliage', 'detail');
        if (cfg.foliageType === 'flower_mounds') {
          b.addCylinder(fx + 0.06, h + 0.28, fz + 0.04, 0.055, 0.065, 0.08, 6, 'y', 'accent', 'detail');
        }
      }
    }
  }
}

function pslrBuildEmergencySafety(group, cfg, b, mats, meta) {
  const style = cfg.safetyStyle || 'fire_hydrant';
  const w = clamp(cfg.width || 0.48, 0.35, 2.2);
  const h = clamp(cfg.height || 0.92, 0.65, 2.6);
  const d = clamp(cfg.depth || 0.48, 0.25, 1.8);

  if (style === 'fire_hydrant') {
    const r = Math.min(w, d) * 0.36;
    b.addCylinder(0, 0.04, 0, r * 1.32, r * 1.4, 0.08, 10, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.42, 0, r, r * 1.15, h * 0.68, 10, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.76, 0, r * 1.18, r * 1.18, 0.06, 10, 'y', 'primary', 'detail');
    const domeR = cfg.bonnetStyle === 'flat_cap' ? r : r * 0.52;
    b.addCylinder(0, h * 0.87, 0, domeR, r * 1.05, h * 0.18, 10, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.98, 0, 0.035, 0.04, 0.08, 6, 'y', 'secondary', 'detail');

    const nozzles = Math.max(1, Math.round(cfg.nozzleCount || 3));
    b.addCylinder(0, h * 0.56, r + 0.06, r * 0.54, r * 0.54, 0.14, 8, 'z', 'secondary', 'detail');
    if (nozzles >= 2) {
      b.addCylinder(-r - 0.05, h * 0.58, 0, r * 0.38, r * 0.38, 0.12, 8, 'x', 'secondary', 'detail');
    }
    if (nozzles >= 3) {
      b.addCylinder(r + 0.05, h * 0.58, 0, r * 0.38, r * 0.38, 0.12, 8, 'x', 'secondary', 'detail');
    }
    if (cfg.chainLoops) {
      b.addPipeSegment(-r - 0.08, h * 0.52, 0, -r * 0.4, h * 0.34, 0.06, 0.014, 6, 'frame', 'detail');
      b.addPipeSegment(r + 0.08, h * 0.52, 0, r * 0.4, h * 0.34, 0.06, 0.014, 6, 'frame', 'detail');
    }
    meta.interaction = { interactable: true, actionType: 'open_fire_hydrant' };
    return;
  }

  if (style === 'emergency_call_pillar') {
    b.addBox(0, 0.04, 0, w + 0.12, 0.08, d + 0.12, { materialRole: 'concrete', layer: 'body' });
    b.addChamferBox(0, h * 0.5 + 0.04, 0, w, h, d, 0.03, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.58, d * 0.5 + 0.015, w * 0.66, 0.34, 0.025, { materialRole: 'secondary', layer: 'detail' });
    b.addCylinder(0, h * 0.52, d * 0.5 + 0.035, 0.045, 0.045, 0.03, 8, 'z', 'safetyRed', 'detail');
    if (cfg.beaconTop) {
      b.addCylinder(0, h + 0.12, 0, 0.09, 0.11, 0.16, 8, 'y', 'holoEnergy', 'detail');
      meta.lightSources.push({ id: 'emergency_beacon', position: [0, h + 0.14, 0], color: '#3a88ff', radius: 4.0 });
    }
    objCreateSignPlane(group, 'Emergency', w * 0.8, 0.18, '#1a2736', '#ffffff', {
      x: 0,
      y: h * 0.84,
      z: d * 0.5 + 0.02
    });
    meta.interaction = { interactable: true, actionType: 'trigger_emergency_call' };
    return;
  }

  if (style === 'wall_extinguisher_cabinet') {
    b.addChamferBox(0, 0, d * 0.5, w, h, d, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.04, d + 0.01, w * 0.65, h * 0.58, 0.018, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(0, -0.02, d * 0.55, 0.075, 0.075, h * 0.55, 8, 'y', 'safetyRed', 'detail');
    return;
  }

  if (style === 'crowd_control_barrier') {
    b.addBox(-w * 0.44, 0.03, 0, 0.08, 0.06, 0.52, { materialRole: 'secondary', layer: 'body' });
    b.addBox(w * 0.44, 0.03, 0, 0.08, 0.06, 0.52, { materialRole: 'secondary', layer: 'body' });
    b.addCylinder(-w * 0.44, h * 0.5 + 0.03, 0, 0.025, 0.025, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(w * 0.44, h * 0.5 + 0.03, 0, 0.025, 0.025, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(0, h + 0.01, 0, 0.028, 0.028, w * 0.96, 8, 'x', 'secondary', 'body');
    b.addCylinder(0, 0.22, 0, 0.024, 0.024, w * 0.88, 8, 'x', 'secondary', 'body');
    const bars = 7;
    for (let i = 0; i < bars; i++) {
      const bx = -w * 0.36 + (i / (bars - 1)) * (w * 0.72);
      b.addCylinder(bx, h * 0.58, 0, 0.014, 0.014, h * 0.72, 6, 'y', 'secondary', 'detail');
    }
    return;
  }

  // Street security guard booth
  b.addBox(0, 0.05, 0, w, 0.1, d, { materialRole: 'frame', layer: 'body' });
  b.addBox(0, h * 0.28, 0, w * 0.94, h * 0.5, d * 0.94, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, h * 0.72, 0, w * 0.92, h * 0.38, d * 0.92, { materialRole: 'glass', layer: 'body' });
  b.addSupportLegs(0, h * 0.5, h * 0.92, w * 0.86, d * 0.86, 0.065, 'frame');
  b.addBox(0, h * 0.96, 0, w + 0.26, 0.12, d + 0.26, { materialRole: 'secondary', layer: 'body' });
}

function pslrBuildStreetlight(group, cfg, b, mats, meta) {
  const style = cfg.lampStyle || 'traditional_acorn_post';
  const poleH = clamp(cfg.poleHeight || 4.8, 2.4, 8.5);
  const baseH = clamp(cfg.baseHeight || 0.75, 0.45, 1.3);
  const armCount = style === 'double_arm_boulevard' ? 2 : Math.max(1, Math.round(cfg.armCount || 1));
  const armLen = clamp(cfg.armLength || 1.25, 0.45, 2.4);
  const orientRad = degToRad(clamp(cfg.lampOrientationDeg || 0, -30, 30));
  const lit = cfg.lampLit !== false;
  const glowMat = lit ? 'lampGlow' : 'glass';

  if (style === 'wall_coach_lantern') {
    b.addBox(0, 0, 0.02, 0.14, 0.32, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.06, 0.16, 0.045, 0.045, 0.28, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, -0.06, 0.28, 0.13, 0.08, 0.26, 6, 'y', glowMat, 'body');
    b.addCylinder(0, 0.11, 0.28, 0.04, 0.16, 0.12, 6, 'y', 'frame', 'body');
    meta.lightSources.push({ id: 'wall_lantern_bulb', position: [0, -0.06, 0.28], color: '#ffe394', radius: 4.5, enabled: lit });
    return;
  }

  if (style === 'wooden_utility_pole') {
    b.addCylinder(0, poleH * 0.5, 0, 0.13, 0.18, poleH, 10, 'y', 'wood', 'body');
    b.addBox(0, poleH - 0.35, 0, armLen * 1.45, 0.12, 0.12, { materialRole: 'wood', layer: 'body' });
    b.addCylinder(-armLen * 0.52, poleH - 0.2, 0, 0.04, 0.04, 0.18, 6, 'y', 'glass', 'detail');
    b.addCylinder(armLen * 0.52, poleH - 0.2, 0, 0.04, 0.04, 0.18, 6, 'y', 'glass', 'detail');
    b.addCylinder(0.24, poleH - 0.95, 0, 0.18, 0.18, 0.58, 10, 'y', 'secondary', 'detail');
    return;
  }

  // Ground pedestal base
  const baseSides = cfg.baseShape === 'octagonal_taper' ? 8 : cfg.baseShape === 'concrete_plinth' ? 4 : 10;
  b.addCylinder(0, baseH * 0.5, 0, 0.16, 0.24, baseH, baseSides, 'y', cfg.baseShape === 'concrete_plinth' ? 'concrete' : 'frame', 'body');
  b.addCylinder(0, baseH + 0.04, 0, 0.19, 0.17, 0.08, baseSides, 'y', 'frame', 'detail');

  // Main mast shaft
  const shaftH = Math.max(1.4, poleH - baseH);
  b.addCylinder(0, baseH + shaftH * 0.5, 0, 0.065, 0.11, shaftH, 10, 'y', 'primary', 'body');

  if (cfg.bannerBrackets) {
    b.addBox(0, baseH + shaftH * 0.65, 0, 0.85, 0.04, 0.04, { materialRole: 'frame', layer: 'detail' });
    b.addBox(-0.32, baseH + shaftH * 0.55, 0, 0.34, 0.56, 0.02, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0.32, baseH + shaftH * 0.55, 0, 0.34, 0.56, 0.02, { materialRole: 'accent', layer: 'detail' });
  }

  const drawFixture = (fx, fy, fz, dirSign) => {
    const fType = cfg.fixtureType || 'cobra_led';
    if (fType === 'acorn_globe') {
      b.addCylinder(fx, fy + 0.18, fz, 0.16, 0.11, 0.34, 10, 'y', glowMat, 'body');
      b.addCylinder(fx, fy + 0.39, fz, 0.05, 0.17, 0.12, 10, 'y', 'frame', 'detail');
      meta.lightSources.push({ id: `lamp_${dirSign}`, position: [fx, fy + 0.18, fz], color: '#ffe394', radius: 6.5, enabled: lit });
    } else if (fType === 'bell_pendant') {
      b.addCylinder(fx, fy - 0.04, fz, 0.1, 0.22, 0.16, 10, 'y', 'frame', 'body');
      b.addCylinder(fx, fy - 0.16, fz, 0.14, 0.08, 0.18, 10, 'y', glowMat, 'body');
      meta.lightSources.push({ id: `lamp_${dirSign}`, position: [fx, fy - 0.18, fz], color: '#ffe394', radius: 6.5, enabled: lit });
    } else {
      // Cobrahead or modern shoebox LED
      b.addBox(fx, fy, fz, 0.52, 0.11, 0.28, { materialRole: 'secondary', layer: 'body', rotY: orientRad });
      b.addBox(fx, fy - 0.06, fz, 0.38, 0.03, 0.2, { materialRole: glowMat, layer: 'detail', rotY: orientRad });
      meta.lightSources.push({ id: `lamp_${dirSign}`, position: [fx, fy - 0.09, fz], color: '#fff2c4', radius: 7.5, enabled: lit });
    }
  };

  const topY = baseH + shaftH;
  if (style === 'traditional_acorn_post' && armCount === 1) {
    drawFixture(0, topY, 0, 0);
  } else {
    for (let i = 0; i < armCount; i++) {
      const sign = armCount === 1 ? 1 : (i === 0 ? 1 : -1);
      const ax = sign * armLen * 0.5;
      const tipX = sign * armLen;
      b.addPipeSegment(0, topY - 0.18, 0, tipX, topY + 0.06, 0, 0.042, 8, 'frame', 'body');
      if (style === 'gooseneck_historic') {
        b.addBox(ax * 0.65, topY - 0.12, 0, armLen * 0.55, 0.035, 0.035, { materialRole: 'accent', layer: 'detail' });
      }
      drawFixture(tipX, topY + 0.06, 0, sign);
    }
  }
}

function pslrBuildRooftopHvac(group, cfg, b, mats, meta) {
  const style = cfg.rooftopStyle || 'packaged_hvac_rtu';
  const w = clamp(cfg.width || 1.9, 0.85, 3.8);
  const h = clamp(cfg.height || 1.35, 0.75, 4.5);
  const d = clamp(cfg.depth || 1.5, 0.85, 3.4);
  const frameH = clamp(cfg.supportFrameHeight || 0.25, 0.15, 1.2);

  if (style === 'wooden_water_tower') {
    const legH = Math.max(0.9, frameH + 0.85);
    b.addSupportLegs(0, 0, legH, w * 0.72, d * 0.72, 0.1, 'frame');
    b.addBox(0, legH + 0.05, 0, w * 0.85, 0.1, d * 0.85, { materialRole: 'frame', layer: 'body' });
    const tankH = Math.max(1.2, h - legH);
    const tankR = Math.min(w, d) * 0.42;
    b.addCylinder(0, legH + 0.1 + tankH * 0.5, 0, tankR, tankR, tankH, 12, 'y', 'wood', 'body');
    for (let band = 0; band < 3; band++) {
      const by = legH + 0.1 + tankH * (0.2 + band * 0.3);
      b.addCylinder(0, by, 0, tankR * 1.03, tankR * 1.03, 0.04, 12, 'y', 'frame', 'detail');
    }
    b.addCylinder(0, legH + 0.1 + tankH + 0.28, 0, 0.06, tankR * 1.08, 0.52, 12, 'y', 'frame', 'body');
    return;
  }

  if (style === 'satellite_dish_mount') {
    const dishR = Math.min(w, d) * 0.46;
    const elev = degToRad(clamp(cfg.dishElevationDeg || 42, 15, 75));
    const azim = degToRad(clamp(cfg.dishAzimuthDeg || 0, -90, 90));
    b.addBox(0, 0.06, 0, w * 0.75, 0.12, d * 0.75, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, h * 0.32, 0, 0.08, 0.11, h * 0.56, 8, 'y', 'frame', 'body');
    const dishY = h * 0.62;
    b.addBox(0, dishY, 0, dishR * 1.8, 0.08, dishR * 1.8, {
      materialRole: 'secondary',
      layer: 'body',
      rotX: elev,
      rotY: azim
    });
    b.addCylinder(0, dishY + 0.14, 0, dishR * 0.86, dishR * 0.22, 0.24, 12, 'y', 'whiteTrim', 'body', azim);
    b.addCylinder(0, dishY + 0.44, 0.14, 0.035, 0.035, 0.46, 8, 'y', 'frame', 'detail');
    return;
  }

  if (style === 'cellular_sector_mast') {
    const mastH = Math.max(2.2, h);
    b.addBox(0, 0.06, 0, 0.72, 0.12, 0.72, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, mastH * 0.5, 0, 0.08, 0.11, mastH, 10, 'y', 'secondary', 'body');
    const sectorY = mastH * 0.8;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const sx = Math.cos(a) * 0.28;
      const sz = Math.sin(a) * 0.28;
      b.addBox(sx, sectorY, sz, 0.2, 0.95, 0.12, { materialRole: 'whiteTrim', layer: 'body', rotY: -a + Math.PI * 0.5 });
    }
    return;
  }

  if (style === 'solar_panel_rack') {
    b.addBox(-w * 0.38, frameH * 0.5, 0, 0.1, frameH, d * 0.85, { materialRole: 'frame', layer: 'body' });
    b.addBox(w * 0.38, frameH * 0.5, 0, 0.1, frameH, d * 0.85, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, frameH + 0.18, 0, w, 0.05, d, { materialRole: 'primary', layer: 'body', rotXDeg: 24 });
    b.addBox(0, frameH + 0.2, 0, w * 0.94, 0.025, d * 0.92, { materialRole: 'glass', layer: 'detail', rotXDeg: 24 });
    return;
  }

  if (style === 'roof_access_doghouse') {
    b.addChamferBox(0, h * 0.5, 0, w, h, d, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.45, d * 0.5 + 0.015, Math.min(w * 0.52, 0.9), h * 0.82, 0.03, { materialRole: 'secondary', layer: 'detail' });
    b.addTrapezoidBox(0, h + 0.12, 0, w + 0.14, d + 0.14, w + 0.04, d + 0.04, 0.22, { materialRole: 'frame', layer: 'body' });
    return;
  }

  // Packaged HVAC RTU or Cooling Tower Fan
  b.addBox(0, frameH * 0.5, 0, w * 0.96, frameH, d * 0.96, { materialRole: 'frame', layer: 'body' });
  const bodyH = Math.max(0.55, h - frameH);
  const bodyCY = frameH + bodyH * 0.5;
  b.addChamferBox(0, bodyCY, 0, w, bodyH, d, 0.025, { materialRole: 'primary', layer: 'body' });

  const fans = Math.max(1, Math.round(cfg.fanCount || 2));
  const fanR = clamp((cfg.fanDiameter || 0.65) * 0.5, 0.18, Math.min(w / (fans * 2.1), d * 0.4));
  const topY = frameH + bodyH;
  for (let i = 0; i < fans; i++) {
    const fx = fans === 1 ? 0 : -w * 0.3 + (i / (fans - 1)) * (w * 0.6);
    b.addPrismRing(fx, topY + 0.05, 0, fanR, fanR * 0.82, 0.1, 10, 'y', 'frame', 'detail');
    b.addCylinder(fx, topY + 0.02, 0, fanR * 0.25, fanR * 0.25, 0.06, 8, 'y', 'darkMetal', 'detail');
  }
  b.addLouverGrille(0, bodyCY, d * 0.5 + 0.015, w * 0.68, bodyH * 0.58, 5, 'z', 'frame', 'detail');

  if (cfg.ductStubs) {
    b.addBox(w * 0.5 + 0.22, bodyCY, 0, 0.44, bodyH * 0.48, d * 0.44, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(w * 0.5 + 0.46, bodyCY, 0, 0.06, bodyH * 0.56, d * 0.52, { materialRole: 'frame', layer: 'detail' });
  }
}

export function registerParksSafetyLightingAndRooftopFamilies() {
  registerObjectFamily({
    id: 'park_planter',
    categoryId: '13_parks',
    subcategory: 'Planters & Tree Grates',
    subcategories: ['Planters & Tree Grates', 'Fountains', 'Park Signage'],
    label: 'Park Planter, Grate & Fountain',
    description: 'Concrete and timber street planters, tree grates with guards, and public fountains.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'ground_embedded'],
    locationContext: 'exterior',
    architecturalStyle: 'municipal',
    sizeClass: 'medium',
    functionalRole: 'decorative',
    tags: ['park', 'planter', 'tree', 'fountain', 'garden', 'shrub', 'grate'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Park Object' },
      {
        key: 'parkStyle',
        name: 'Object Type',
        type: 'select',
        options: [
          ['concrete_street_planter', 'Concrete Street Planter'],
          ['raised_timber_bed', 'Raised Timber Planter Bed'],
          ['cast_iron_tree_grate', 'Sidewalk Tree Grate & Guard'],
          ['drinking_fountain', 'Public Drinking Fountain'],
          ['tiered_park_fountain', 'Tiered Plaza Fountain'],
          ['park_entry_sign', 'Park Entrance Sign']
        ],
        default: 'concrete_street_planter'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.6, max: 2.6, step: 0.1, unit: 'm', default: 1.25 },
      { key: 'height', name: 'Height', type: 'number', min: 0.08, max: 2.1, step: 0.05, unit: 'm', default: 0.65 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.6, max: 2.6, step: 0.1, unit: 'm', default: 1.25 },
      {
        key: 'shape',
        name: 'Planter Shape',
        type: 'select',
        options: [
          ['rectangular', 'Rectangular'],
          ['octagonal', 'Octagonal'],
          ['circular', 'Circular']
        ],
        default: 'rectangular'
      },
      { key: 'rimThickness', name: 'Rim Thickness', type: 'number', min: 0.05, max: 0.18, step: 0.01, unit: 'm', default: 0.1 },
      {
        key: 'foliageType',
        name: 'Foliage Fill',
        type: 'select',
        options: [
          ['trimmed_hedge', 'Trimmed Box Hedge'],
          ['ornamental_shrubs', 'Ornamental Shrubs'],
          ['flower_mounds', 'Flowering Shrubs'],
          ['none', 'Empty Soil']
        ],
        default: 'ornamental_shrubs'
      },
      { key: 'foliageDensity', name: 'Foliage Clusters', type: 'number', min: 1, max: 5, step: 1, default: 3 },
      { key: 'treeGuardCage', name: 'Tree Guard Cage', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'architectural_concrete_planter',
        label: 'Architectural Concrete Planter',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'concrete',
        primaryColor: '#8d9298',
        concreteColor: '#8d9298',
        accentColor: '#d95b48',
        params: { parkStyle: 'concrete_street_planter', width: 1.35, height: 0.68, depth: 1.35, shape: 'rectangular', foliageType: 'ornamental_shrubs' }
      },
      {
        id: 'sidewalk_tree_grate_guard',
        label: 'Sidewalk Tree Grate & Guard',
        attachmentProfile: 'ground_embedded',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#252a30',
        frameColor: '#252a30',
        params: { parkStyle: 'cast_iron_tree_grate', width: 1.4, height: 1.0, depth: 1.4, treeGuardCage: true }
      },
      {
        id: 'park_drinking_fountain',
        label: 'Public Drinking Fountain',
        subcategory: 'Fountains',
        locationContext: 'both',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#285240',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#bcc5ce',
        params: { parkStyle: 'drinking_fountain', width: 0.6, height: 0.96, depth: 0.6 }
      },
      {
        id: 'ornamental_plaza_fountain',
        label: 'Tiered Plaza Fountain',
        subcategory: 'Fountains',
        locationContext: 'exterior',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'concrete',
        primaryColor: '#98958c',
        concreteColor: '#98958c',
        params: { parkStyle: 'tiered_park_fountain', width: 2.3, height: 1.85, depth: 2.3 }
      }
    ],
    buildGeometry: pslrBuildParkPlanter
  });

  registerObjectFamily({
    id: 'emergency_safety',
    categoryId: '14_safety',
    subcategory: 'Fire & Emergency',
    subcategories: ['Fire & Emergency', 'Crowd Barriers', 'Security Booths'],
    label: 'Fire Hydrant & Safety Prop',
    description: 'Fire hydrants, emergency call pillars, wall extinguisher cabinets, crowd barriers, and booths.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'both',
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'safety',
    tags: ['safety', 'fire', 'hydrant', 'emergency', 'police', 'barrier', 'booth'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Safety Prop' },
      {
        key: 'safetyStyle',
        name: 'Safety Equipment',
        type: 'select',
        options: [
          ['fire_hydrant', 'Municipal Fire Hydrant'],
          ['emergency_call_pillar', 'Emergency Call Box'],
          ['wall_extinguisher_cabinet', 'Wall Extinguisher Cabinet'],
          ['crowd_control_barrier', 'Metal Crowd Barrier'],
          ['security_guard_booth', 'Street Security Booth']
        ],
        default: 'fire_hydrant'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.35, max: 2.2, step: 0.05, unit: 'm', default: 0.48 },
      { key: 'height', name: 'Height', type: 'number', min: 0.65, max: 2.6, step: 0.05, unit: 'm', default: 0.92 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.25, max: 1.8, step: 0.05, unit: 'm', default: 0.48 },
      { group: 'Equipment Details' },
      { key: 'nozzleCount', name: 'Hydrant Nozzles', type: 'number', min: 1, max: 3, step: 1, default: 3 },
      {
        key: 'bonnetStyle',
        name: 'Hydrant Bonnet',
        type: 'select',
        options: [
          ['dome', 'Rounded Dome'],
          ['faceted_nut', 'Pentagon Top'],
          ['flat_cap', 'Flat Industrial Cap']
        ],
        default: 'dome'
      },
      { key: 'chainLoops', name: 'Nozzle Cap Chains', type: 'boolean', default: true },
      { key: 'beaconTop', name: 'Emergency Top Beacon', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'municipal_red_fire_hydrant',
        label: 'Municipal Red Fire Hydrant',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c2352b',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#c2cbd4',
        frameColor: '#252a30',
        params: { safetyStyle: 'fire_hydrant', width: 0.46, height: 0.88, depth: 0.46, nozzleCount: 3, chainLoops: true }
      },
      {
        id: 'campus_emergency_call_box',
        label: 'Emergency Call Box Pillar',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#244b85',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#bcc5ce',
        emissiveColor: '#3a88ff',
        params: { safetyStyle: 'emergency_call_pillar', width: 0.44, height: 2.25, depth: 0.36, beaconTop: true }
      },
      {
        id: 'steel_crowd_control_barrier',
        label: 'Steel Crowd-Control Barrier',
        subcategory: 'Crowd Barriers',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#98a3ad',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#aeb7c0',
        params: { safetyStyle: 'crowd_control_barrier', width: 2.1, height: 1.08, depth: 0.5 }
      },
      {
        id: 'checkpoint_security_booth',
        label: 'Street Security Guard Booth',
        subcategory: 'Security Booths',
        locationContext: 'exterior',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#3a4958',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a4b0',
        frameColor: '#1f262e',
        params: { safetyStyle: 'security_guard_booth', width: 1.65, height: 2.45, depth: 1.65 }
      }
    ],
    buildGeometry: pslrBuildEmergencySafety
  });

  registerObjectFamily({
    id: 'streetlight',
    categoryId: '15_lighting',
    subcategory: 'Streetlamps',
    subcategories: ['Streetlamps', 'Wall Lights', 'Utility Poles'],
    label: 'Streetlight & Utility Pole',
    description: 'Traditional streetlamps, cobrahead masts, boulevard lamps, wall lanterns, and utility poles.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'exterior',
    architecturalStyle: 'older_metropolitan',
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    tags: ['streetlight', 'lamp', 'light', 'pole', 'utility', 'lantern', 'boulevard'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Pole & Arm Form' },
      {
        key: 'lampStyle',
        name: 'Lighting Archetype',
        type: 'select',
        options: [
          ['traditional_acorn_post', 'Traditional Acorn Lamp'],
          ['cobrahead_road_lamp', 'Modern Cobrahead Mast'],
          ['double_arm_boulevard', 'Double-Head Boulevard'],
          ['gooseneck_historic', 'Historic Gooseneck Arm'],
          ['wall_coach_lantern', 'Wall-Mounted Lantern'],
          ['wooden_utility_pole', 'Street Utility Pole']
        ],
        default: 'traditional_acorn_post'
      },
      { key: 'poleHeight', name: 'Pole Height', type: 'number', min: 2.4, max: 8.5, step: 0.2, unit: 'm', default: 4.8 },
      { key: 'baseHeight', name: 'Pedestal Base Height', type: 'number', min: 0.45, max: 1.3, step: 0.05, unit: 'm', default: 0.75 },
      {
        key: 'baseShape',
        name: 'Base Shape',
        type: 'select',
        options: [
          ['fluted_cast', 'Fluted Cast Iron'],
          ['octagonal_taper', 'Octagonal Taper'],
          ['round_stepped', 'Round Stepped'],
          ['concrete_plinth', 'Concrete Plinth']
        ],
        default: 'fluted_cast'
      },
      { key: 'armCount', name: 'Fixture Arms', type: 'number', min: 1, max: 2, step: 1, default: 1 },
      { key: 'armLength', name: 'Arm Reach', type: 'number', min: 0.45, max: 2.4, step: 0.1, unit: 'm', default: 1.25 },
      { group: 'Luminaire & Lighting' },
      {
        key: 'fixtureType',
        name: 'Lamp Fixture',
        type: 'select',
        options: [
          ['acorn_globe', 'Acorn Globe'],
          ['cobra_led', 'Modern LED Housing'],
          ['bell_pendant', 'Historic Bell Pendant']
        ],
        default: 'acorn_globe'
      },
      { key: 'lampOrientationDeg', name: 'Head Yaw Angle', type: 'number', min: -30, max: 30, step: 5, unit: 'deg', default: 0 },
      { key: 'bannerBrackets', name: 'Street Banner Arms', type: 'boolean', default: false },
      { key: 'lampLit', name: 'Lamp Illuminated', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'heritage_acorn_streetlamp',
        label: 'Traditional Decorative Streetlamp',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#23302c',
        frameColor: '#1d2421',
        accentColor: '#c99a3a',
        params: { lampStyle: 'traditional_acorn_post', poleHeight: 3.8, baseHeight: 0.85, baseShape: 'fluted_cast', armCount: 1, fixtureType: 'acorn_globe', lampLit: true }
      },
      {
        id: 'modern_highway_cobrahead',
        label: 'Modern Utility Cobrahead',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#8d969f',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#aeb7c0',
        frameColor: '#48525c',
        params: { lampStyle: 'cobrahead_road_lamp', poleHeight: 6.8, baseHeight: 0.55, baseShape: 'octagonal_taper', armCount: 1, armLength: 1.85, fixtureType: 'cobra_led' }
      },
      {
        id: 'downtown_double_boulevard_lamp',
        label: 'Double-Head Boulevard Lamp',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#22282e',
        frameColor: '#1c2126',
        accentColor: '#2d588a',
        params: { lampStyle: 'double_arm_boulevard', poleHeight: 5.4, baseHeight: 0.95, armCount: 2, armLength: 1.35, fixtureType: 'bell_pendant', bannerBrackets: true }
      },
      {
        id: 'wall_mounted_coach_lantern',
        label: 'Wall-Mounted Coach Lantern',
        subcategory: 'Wall Lights',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#24292e',
        frameColor: '#1e2226',
        params: { lampStyle: 'wall_coach_lantern', poleHeight: 2.4, lampLit: true }
      },
      {
        id: 'wooden_power_utility_pole',
        label: 'Wooden Street Utility Pole',
        subcategory: 'Utility Poles',
        locationContext: 'exterior',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'wood',
        primaryColor: '#6e4e34',
        woodColor: '#6e4e34',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d969e',
        params: { lampStyle: 'wooden_utility_pole', poleHeight: 7.4, armLength: 1.4 }
      }
    ],
    buildGeometry: pslrBuildStreetlight
  });

  registerObjectFamily({
    id: 'rooftop_hvac',
    categoryId: '16_rooftop',
    subcategory: 'Hvac & Cooling',
    subcategories: ['Hvac & Cooling', 'Tanks & Headhouses', 'Antennas & Solar'],
    label: 'Rooftop HVAC, Tank & Antenna',
    description: 'Rooftop HVAC units, wooden water towers, satellite dishes, antennas, and solar racks.',
    attachmentProfile: 'roof_mounted',
    locationContext: 'exterior',
    architecturalStyle: 'industrial',
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    tags: ['roof', 'rooftop', 'hvac', 'ac', 'water', 'antenna', 'satellite', 'solar'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Rooftop Equipment' },
      {
        key: 'rooftopStyle',
        name: 'Equipment Type',
        type: 'select',
        options: [
          ['packaged_hvac_rtu', 'Packaged HVAC Unit'],
          ['wooden_water_tower', 'Rooftop Wooden Water Tank'],
          ['cooling_tower_fan', 'Cooling Fan Unit'],
          ['satellite_dish_mount', 'Satellite Dish Array'],
          ['cellular_sector_mast', 'Cellular Antenna Mast'],
          ['roof_access_doghouse', 'Roof Maintenance Hatch'],
          ['solar_panel_rack', 'Commercial Solar Rack']
        ],
        default: 'packaged_hvac_rtu'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.85, max: 3.8, step: 0.1, unit: 'm', default: 1.9 },
      { key: 'height', name: 'Height', type: 'number', min: 0.75, max: 4.5, step: 0.1, unit: 'm', default: 1.35 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.85, max: 3.4, step: 0.1, unit: 'm', default: 1.5 },
      { group: 'Mechanical Details' },
      { key: 'fanCount', name: 'Exhaust Fans', type: 'number', min: 1, max: 3, step: 1, default: 2 },
      { key: 'fanDiameter', name: 'Fan Diameter', type: 'number', min: 0.4, max: 1.1, step: 0.05, unit: 'm', default: 0.65 },
      { key: 'ductStubs', name: 'Side Duct Stub', type: 'boolean', default: true },
      { key: 'supportFrameHeight', name: 'Curb / Frame Height', type: 'number', min: 0.15, max: 1.2, step: 0.05, unit: 'm', default: 0.25 },
      { key: 'dishElevationDeg', name: 'Dish Elevation', type: 'number', min: 15, max: 75, step: 5, unit: 'deg', default: 42 },
      { key: 'dishAzimuthDeg', name: 'Dish Azimuth', type: 'number', min: -90, max: 90, step: 10, unit: 'deg', default: 0 }
    ],
    presets: [
      {
        id: 'commercial_rooftop_hvac_rtu',
        label: 'Commercial Rooftop HVAC Unit',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#98a3ad',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#aeb7c0',
        frameColor: '#2d343b',
        params: { rooftopStyle: 'packaged_hvac_rtu', width: 2.2, height: 1.4, depth: 1.6, fanCount: 2, ductStubs: true }
      },
      {
        id: 'classic_wooden_water_tank',
        label: 'Classic Rooftop Water Tower',
        subcategory: 'Tanks & Headhouses',
        paletteFamily: 'older_metropolitan',
        condition: 'weathered',
        primaryMaterial: 'wood',
        primaryColor: '#7a5234',
        woodColor: '#7a5234',
        frameColor: '#2a2f34',
        params: { rooftopStyle: 'wooden_water_tower', width: 2.3, height: 3.8, depth: 2.3, supportFrameHeight: 0.85 }
      },
      {
        id: 'rooftop_satellite_dish_array',
        label: 'Rooftop Satellite Dish',
        subcategory: 'Antennas & Solar',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd7df',
        frameColor: '#36404a',
        params: { rooftopStyle: 'satellite_dish_mount', width: 1.4, height: 1.8, depth: 1.4, dishElevationDeg: 45 }
      },
      {
        id: 'cellular_antenna_sector_mast',
        label: 'Cellular Sector Antenna Mast',
        subcategory: 'Antennas & Solar',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#9aa4ad',
        frameColor: '#2e363e',
        params: { rooftopStyle: 'cellular_sector_mast', width: 0.9, height: 3.6, depth: 0.9 }
      },
      {
        id: 'rooftop_access_stair_headhouse',
        label: 'Roof Access Hatch Enclosure',
        subcategory: 'Tanks & Headhouses',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#69727a',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#848d96',
        frameColor: '#2b3138',
        params: { rooftopStyle: 'roof_access_doghouse', width: 1.5, height: 2.1, depth: 2.2 }
      },
      {
        id: 'commercial_solar_panel_array',
        label: 'Rooftop Solar Panel Rack',
        subcategory: 'Antennas & Solar',
        paletteFamily: 'modern_downtown',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#384654',
        glassColor: '#1f3652',
        frameColor: '#2c343d',
        params: { rooftopStyle: 'solar_panel_rack', width: 2.4, height: 1.3, depth: 1.6, supportFrameHeight: 0.35 }
      }
    ],
    buildGeometry: pslrBuildRooftopHvac
  });
}
