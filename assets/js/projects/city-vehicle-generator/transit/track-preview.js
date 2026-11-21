import { clamp, roundNum } from '../utils.js';
import { getTrackGaugeSpec } from './compatibility.js';
import { VehicleBatcher } from '../geometry/primitives.js';
import { getSolidVehicleMaterial } from '../materials/materials.js';

export function trTrackNormalizeAngle(rad) {
  let a = Number(rad) || 0;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export const TRACK_MODES = [
  'rail_straight',
  'rail_curved',
  'rail_incline',
  'tram_street',
  'monorail_straddle',
  'monorail_suspended',
  'cableway_aerial'
];

function trTrackDefaultGaugeForMode(mode) {
  switch (mode) {
    case 'tram_street':
      return 'street_tram_1435';
    case 'monorail_straddle':
      return 'monorail_beam';
    case 'monorail_suspended':
      return 'suspended_beam';
    case 'cableway_aerial':
      return 'cableway_rope';
    default:
      return 'standard_1435';
  }
}

export function createTrackRoute(options = {}) {
  const mode = TRACK_MODES.includes(options.mode) ? options.mode : 'rail_straight';
  const curved = mode === 'rail_curved' || Boolean(options.curved);
  const electrified = mode === 'tram_street' || Boolean(options.electrified);
  const curveRadius = clamp(Number(options.curveRadius) || 48, 24, 220);
  const gradePercent = clamp(Number(options.gradePercent) || 3.0, 0.5, 8.0);
  const trackGaugeId = options.trackGaugeId || trTrackDefaultGaugeForMode(mode);
  const gauge = getTrackGaugeSpec(trackGaugeId);
  const totalLength = clamp(Number(options.totalLength) || 96, 36, 280);
  const sMin = -totalLength * 0.62;
  const sMax = totalLength * 0.38;

  return {
    mode,
    curved,
    electrified,
    curveRadius,
    gradePercent,
    trackGaugeId: gauge.id,
    gauge,
    totalLength,
    sMin,
    sMax
  };
}

export function sampleRouteAtS(route, s) {
  const arcS = Number(s) || 0;
  if (!route) {
    return {
      s: arcS,
      x: 0,
      y: 0,
      z: arcS,
      tx: 0,
      ty: 0,
      tz: 1,
      rx: 1,
      ry: 0,
      rz: 0,
      yaw: 0,
      pitchRotX: 0,
      gradePercent: 0,
      curvature: 0
    };
  }

  if (route.mode === 'rail_incline') {
    const slope = (route.gradePercent || 3.0) / 100;
    const invHyp = 1 / Math.hypot(1, slope);
    const cosP = invHyp;
    const sinP = slope * invHyp;
    const pitchAngle = Math.atan(slope);
    return {
      s: arcS,
      x: 0,
      y: arcS * sinP,
      z: arcS * cosP,
      tx: 0,
      ty: sinP,
      tz: cosP,
      rx: 1,
      ry: 0,
      rz: 0,
      yaw: 0,
      pitchRotX: -pitchAngle,
      gradePercent: route.gradePercent || 3.0,
      curvature: 0
    };
  }

  if (route.curved || route.mode === 'rail_curved') {
    const R = Math.max(20, route.curveRadius || 48);
    const theta = arcS / R;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    return {
      s: arcS,
      x: R * (1 - cosT),
      y: 0,
      z: R * sinT,
      tx: sinT,
      ty: 0,
      tz: cosT,
      rx: cosT,
      ry: 0,
      rz: -sinT,
      yaw: theta,
      pitchRotX: 0,
      gradePercent: 0,
      curvature: 1 / R
    };
  }

  return {
    s: arcS,
    x: 0,
    y: 0,
    z: arcS,
    tx: 0,
    ty: 0,
    tz: 1,
    rx: 1,
    ry: 0,
    rz: 0,
    yaw: 0,
    pitchRotX: 0,
    gradePercent: 0,
    curvature: 0
  };
}

export function solveRailUnitOnRoute(unitLayout, route, sCenter = 0, reversed = false) {
  const rail = unitLayout?.rail;
  const isCurved = Boolean(route?.curved || route?.mode === 'rail_curved');
  if (!rail || !rail.bogies || rail.bogies.length < 2) {
    const pt = sampleRouteAtS(route, sCenter);
    return {
      position: [pt.x, pt.y, pt.z],
      yaw: pt.yaw + (reversed ? Math.PI : 0),
      pitchRotX: reversed ? -pt.pitchRotX : pt.pitchRotX,
      frontBogieLocalYaw: 0,
      rearBogieLocalYaw: 0,
      tramArticulationRad: 0,
      cabinSwingRad: isCurved ? clamp((pt.curvature || 0) * 2.2, -0.09, 0.09) : 0,
      centerThrowMeters: 0,
      endThrowMeters: 0,
      maxBogieYawDeg: 0
    };
  }

  const frontBogie = rail.bogies[0];
  const rearBogie = rail.bogies[rail.bogies.length - 1];
  const dirSign = reversed ? -1 : 1;
  const sFront = sCenter + dirSign * frontBogie.pivotZ;
  const sRear = sCenter + dirSign * rearBogie.pivotZ;

  const pFront = sampleRouteAtS(route, sFront);
  const pRear = sampleRouteAtS(route, sRear);
  const pMid = sampleRouteAtS(route, sCenter);

  const cx = (pFront.x + pRear.x) * 0.5;
  const cy = (pFront.y + pRear.y) * 0.5;
  const cz = (pFront.z + pRear.z) * 0.5;

  const dx = pFront.x - pRear.x;
  const dy = pFront.y - pRear.y;
  const dz = pFront.z - pRear.z;
  const horiz = Math.max(0.001, Math.hypot(dx, dz));
  const carYaw = Math.atan2(dx, dz);
  const carPitchRotX = -Math.atan2(dy, horiz);

  const worldFrontBogieYaw = pFront.yaw + (reversed ? Math.PI : 0);
  const worldRearBogieYaw = pRear.yaw + (reversed ? Math.PI : 0);
  const frontBogieLocalYaw = trTrackNormalizeAngle(worldFrontBogieYaw - carYaw);
  const rearBogieLocalYaw = trTrackNormalizeAngle(worldRearBogieYaw - carYaw);

  const chordMidDist = Math.hypot(cx - pMid.x, cz - pMid.z);
  const maxBogieYawDeg = roundNum(
    Math.max(Math.abs(frontBogieLocalYaw), Math.abs(rearBogieLocalYaw)) * (180 / Math.PI),
    2
  );
  const bogieSpacing = Math.abs(frontBogie.pivotZ - rearBogie.pivotZ);
  const maxOverhang = Math.max(unitLayout.dimensions.frontOverhang, unitLayout.dimensions.rearOverhang);
  const endThrowMeters = isCurved
    ? roundNum((maxOverhang * (bogieSpacing + maxOverhang)) / (2 * Math.max(20, route.curveRadius)), 3)
    : 0;

  return {
    position: [cx, cy, cz],
    yaw: carYaw,
    pitchRotX: carPitchRotX,
    frontBogieLocalYaw,
    rearBogieLocalYaw,
    tramArticulationRad: clamp((frontBogieLocalYaw - rearBogieLocalYaw) * 0.42, -0.32, 0.32),
    cabinSwingRad: isCurved ? clamp((pMid.curvature || 0) * 2.2, -0.09, 0.09) : 0,
    centerThrowMeters: roundNum(chordMidDist, 3),
    endThrowMeters,
    maxBogieYawDeg,
    sFront,
    sRear
  };
}

function trTrackAddCatenaryGantries(batcher, route, sMin, sMax, contactY = 5.85, singlePoleX = 0) {
  const stepLen = route.curved ? 2.5 : 6.0;
  for (let s = sMin; s < sMax; s += stepLen) {
    const sNext = Math.min(sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const my = (pA.y + pB.y) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const dz = pB.z - pA.z;
    const chord = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.max(0.001, Math.hypot(dx, dz)));

    batcher.addBox(mx, my + contactY, mz, 0.026, 0.026, chord + 0.04, {
      rotY: yaw,
      rotX: pitch,
      materialRole: 'catenaryWire',
      layer: 'track'
    });
    batcher.addBox(mx, my + contactY + 0.52, mz, 0.02, 0.02, chord + 0.04, {
      rotY: yaw,
      rotX: pitch,
      materialRole: 'railHead',
      layer: 'track'
    });
  }

  for (let s = sMin + 4; s <= sMax - 4; s += 14) {
    const p = sampleRouteAtS(route, s);
    const poleX = singlePoleX || 2.85;
    batcher.addBox(p.x + poleX * p.rx, p.y + (contactY + 0.85) * 0.5, p.z + poleX * p.rz, 0.22, contactY + 1.1, 0.22, {
      rotY: p.yaw,
      materialRole: 'steelPortal',
      layer: 'track'
    });
    if (!singlePoleX) {
      batcher.addBox(p.x - poleX * p.rx, p.y + (contactY + 0.85) * 0.5, p.z - poleX * p.rz, 0.22, contactY + 1.1, 0.22, {
        rotY: p.yaw,
        materialRole: 'steelPortal',
        layer: 'track'
      });
      batcher.addBox(p.x, p.y + contactY + 0.72, p.z, poleX * 2 + 0.24, 0.2, 0.22, {
        rotY: p.yaw,
        materialRole: 'steelPortal',
        layer: 'track'
      });
    } else {
      batcher.addBox(p.x + poleX * 0.45 * p.rx, p.y + contactY + 0.52, p.z + poleX * 0.45 * p.rz, Math.abs(poleX) + 0.35, 0.14, 0.14, {
        rotY: p.yaw,
        materialRole: 'steelPortal',
        layer: 'track'
      });
    }
    // Vertical registration dropper down to contact wire
    batcher.addBox(p.x, p.y + contactY + 0.28, p.z, 0.08, 0.52, 0.08, {
      rotY: p.yaw,
      materialRole: 'markerCap',
      layer: 'track'
    });
  }
}

function trTrackBuildConventionalRail(batcher, route, halfRailX, railW, railH, sleeperW) {
  const stepLen = route.curved ? 2.0 : 4.0;
  const sMin = route.sMin;
  const sMax = route.sMax;

  for (let s = sMin; s < sMax; s += stepLen) {
    const sNext = Math.min(sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const my = (pA.y + pB.y) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const dz = pB.z - pA.z;
    const chord = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.max(0.001, Math.hypot(dx, dz)));

    batcher.addBox(mx, my - 0.365, mz, sleeperW + 0.9, 0.23, chord + 0.14, {
      rotY: yaw,
      rotX: pitch,
      materialRole: 'ballast',
      layer: 'track'
    });
    batcher.addBox(mx, my - 0.5, mz, sleeperW + 1.5, 0.08, chord + 0.16, {
      rotY: yaw,
      rotX: pitch,
      materialRole: 'ground',
      layer: 'track'
    });

    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    for (const side of [-1, 1]) {
      const rCx = mx + side * halfRailX * rx;
      const rCz = mz + side * halfRailX * rz;
      batcher.addBox(rCx, my - railH * 0.55, rCz, railW * 0.72, railH * 0.75, chord + 0.05, {
        rotY: yaw,
        rotX: pitch,
        materialRole: 'railWeb',
        layer: 'track'
      });
      batcher.addBox(rCx, my - 0.022, rCz, railW, 0.044, chord + 0.05, {
        rotY: yaw,
        rotX: pitch,
        materialRole: 'railHead',
        layer: 'track'
      });
    }
  }

  for (let s = sMin + 0.3; s <= sMax - 0.3; s += 0.68) {
    const p = sampleRouteAtS(route, s);
    batcher.addBox(p.x, p.y - railH - 0.065, p.z, sleeperW, 0.13, 0.24, {
      rotY: p.yaw,
      rotX: p.pitchRotX,
      materialRole: 'sleeper',
      layer: 'track'
    });
    for (const side of [-1, 1]) {
      batcher.addBox(p.x + side * halfRailX * p.rx, p.y - railH + 0.008, p.z + side * halfRailX * p.rz, 0.2, 0.02, 0.24, {
        rotY: p.yaw,
        rotX: p.pitchRotX,
        materialRole: 'railWeb',
        layer: 'track'
      });
    }
  }

  for (let s = sMin + 6; s <= sMax - 6; s += 15) {
    const p = sampleRouteAtS(route, s);
    const postDist = sleeperW * 0.5 + 0.9;
    const px = p.x + postDist * p.rx;
    const pz = p.z + postDist * p.rz;
    batcher.addBox(px, p.y + 0.4, pz, 0.1, 1.1, 0.1, { rotY: p.yaw, materialRole: 'markerPost', layer: 'track' });
    batcher.addBox(px, p.y + 0.85, pz, 0.12, 0.18, 0.12, { rotY: p.yaw, materialRole: 'markerCap', layer: 'track' });
  }

  if (route.electrified) {
    trTrackAddCatenaryGantries(batcher, route, sMin, sMax, 5.85, 0);
  }
}

function trTrackBuildStreetTram(batcher, route, halfRailX, railW) {
  const stepLen = route.curved ? 2.0 : 4.0;
  for (let s = route.sMin; s < route.sMax; s += stepLen) {
    const sNext = Math.min(route.sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const dx = pB.x - pA.x;
    const dz = pB.z - pA.z;
    const chord = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    // Asphalt avenue street slab + central cobblestone tram strip + sidewalks
    batcher.addBox(mx, -0.09, mz, 8.6, 0.14, chord + 0.15, { rotY: yaw, materialRole: 'asphalt', layer: 'track' });
    batcher.addBox(mx, -0.015, mz, 2.5, 0.025, chord + 0.15, { rotY: yaw, materialRole: 'concrete', layer: 'track' });
    for (const side of [-1, 1]) {
      batcher.addBox(mx + side * 4.7, 0.04, mz, 1.4, 0.24, chord + 0.15, { rotY: yaw, materialRole: 'concrete', layer: 'track' });
      const rCx = mx + side * halfRailX * rx;
      const rCz = mz + side * halfRailX * rz;
      batcher.addBox(rCx, -0.018, rCz, railW + 0.03, 0.036, chord + 0.06, { rotY: yaw, materialRole: 'railHead', layer: 'track' });
    }
  }
  trTrackAddCatenaryGantries(batcher, route, route.sMin, route.sMax, 5.15, 3.6);
}

function trTrackBuildStraddleMonorail(batcher, route) {
  const stepLen = route.curved ? 2.0 : 4.0;
  for (let s = route.sMin; s < route.sMax; s += stepLen) {
    const sNext = Math.min(route.sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const chord = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    // Prestressed concrete guideway box beam with top riding face at y = 1.15m
    batcher.addBox(mx, 0.68, mz, 0.62, 0.94, chord + 0.14, { rotY: yaw, materialRole: 'concrete', layer: 'track' });
    batcher.addBox(mx, 1.135, mz, 0.56, 0.03, chord + 0.14, { rotY: yaw, materialRole: 'railHead', layer: 'track' });
  }
  for (let s = route.sMin + 5; s <= route.sMax - 5; s += 12) {
    const p = sampleRouteAtS(route, s);
    batcher.addBox(p.x, 0.1, p.z, 1.28, 0.36, 1.1, { rotY: p.yaw, materialRole: 'concrete', layer: 'track' });
    batcher.addBox(p.x, -1.8, p.z, 0.92, 3.6, 0.92, { rotY: p.yaw, materialRole: 'concreteDark', layer: 'track' });
    batcher.addBox(p.x, -3.65, p.z, 2.2, 0.35, 2.2, { rotY: p.yaw, materialRole: 'ground', layer: 'track' });
  }
}

function trTrackBuildSuspendedMonorail(batcher, route) {
  const stepLen = route.curved ? 2.0 : 4.0;
  for (let s = route.sMin; s < route.sMax; s += stepLen) {
    const sNext = Math.min(route.sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const chord = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    // Overhead steel running box girder (flange seats suspended wheels at y = 4.55..4.75)
    batcher.addBox(mx, 4.92, mz, 0.54, 0.58, chord + 0.14, { rotY: yaw, materialRole: 'steelPortal', layer: 'track' });
    batcher.addBox(mx, 4.6, mz, 0.72, 0.08, chord + 0.14, { rotY: yaw, materialRole: 'railHead', layer: 'track' });
    // Street surface far beneath suspended monorail
    batcher.addBox(mx, -0.65, mz, 7.2, 0.14, chord + 0.14, { rotY: yaw, materialRole: 'asphalt', layer: 'track' });
  }
  for (let s = route.sMin + 5; s <= route.sMax - 5; s += 13) {
    const p = sampleRouteAtS(route, s);
    // Portal A-frame trestles straddling wide at x = +-3.6m so cabin never hits frames
    batcher.addBox(p.x, 5.42, p.z, 7.6, 0.38, 0.42, { rotY: p.yaw, materialRole: 'steelPortal', layer: 'track' });
    for (const side of [-1, 1]) {
      batcher.addBox(p.x + side * 3.6 * p.rx, 2.38, p.z + side * 3.6 * p.rz, 0.34, 6.2, 0.38, {
        rotY: p.yaw,
        materialRole: 'steelPortal',
        layer: 'track'
      });
      batcher.addBox(p.x + side * 3.6 * p.rx, -0.68, p.z + side * 3.6 * p.rz, 0.85, 0.45, 0.85, {
        rotY: p.yaw,
        materialRole: 'concrete',
        layer: 'track'
      });
    }
  }
}

function trTrackBuildAerialCableway(batcher, route) {
  const cableY = 4.85;
  const stepLen = 4.0;
  for (let s = route.sMin; s < route.sMax; s += stepLen) {
    const sNext = Math.min(route.sMax, s + stepLen);
    if (sNext - s < 0.05) continue;
    const pA = sampleRouteAtS(route, s);
    const pB = sampleRouteAtS(route, sNext);
    const mx = (pA.x + pB.x) * 0.5;
    const mz = (pA.z + pB.z) * 0.5;
    const chord = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    // Twin parallel steel track/haul cables at y = 4.85m + faint ground shadow pad far below
    for (const cxOff of [-0.14, 0.14]) {
      batcher.addBox(mx + cxOff * Math.cos(yaw), cableY, mz - cxOff * Math.sin(yaw), 0.042, 0.042, chord + 0.06, {
        rotY: yaw,
        materialRole: 'railHead',
        layer: 'track'
      });
    }
    batcher.addBox(mx, -0.8, mz, 4.4, 0.1, chord + 0.12, { rotY: yaw, materialRole: 'ground', layer: 'track' });
  }
  // Offset gondola pylons on +X side with high cantilever sheave arms reaching x = 0 at cableY
  for (const sTower of [route.sMin + 9, route.sMax - 9]) {
    const p = sampleRouteAtS(route, sTower);
    const mastX = 3.2;
    batcher.addBox(p.x + mastX * p.rx, 2.35, p.z + mastX * p.rz, 0.45, 6.4, 0.45, {
      rotY: p.yaw,
      materialRole: 'steelPortal',
      layer: 'track'
    });
    batcher.addBox(p.x + mastX * p.rx, -0.75, p.z + mastX * p.rz, 1.5, 0.5, 1.5, {
      rotY: p.yaw,
      materialRole: 'concrete',
      layer: 'track'
    });
    batcher.addBox(p.x + mastX * 0.46 * p.rx, cableY + 0.45, p.z + mastX * 0.46 * p.rz, mastX + 0.65, 0.28, 0.34, {
      rotY: p.yaw,
      materialRole: 'steelPortal',
      layer: 'track'
    });
    // Multi-sheave roller beam cradling cables at x = 0
    batcher.addBox(p.x, cableY + 0.2, p.z, 0.42, 0.28, 1.85, { rotY: p.yaw, materialRole: 'markerCap', layer: 'track' });
  }
}

export function buildTrackFixtureGroup(route, lightingTime = 'day') {
  const grp = new THREE.Group();
  grp.name = `TrackFixture_${route.mode}`;
  const isNight = lightingTime === 'night';
  const gauge = route.gauge || getTrackGaugeSpec(route.trackGaugeId);
  const halfRailX = gauge.railCenterHalfX;
  const railW = gauge.railHeadWidth;
  const railH = gauge.railHeight;
  const sleeperW = gauge.sleeperWidth;

  const batcher = new VehicleBatcher();
  if (route.mode === 'tram_street') {
    trTrackBuildStreetTram(batcher, route, halfRailX, railW);
  } else if (route.mode === 'monorail_straddle') {
    trTrackBuildStraddleMonorail(batcher, route);
  } else if (route.mode === 'monorail_suspended') {
    trTrackBuildSuspendedMonorail(batcher, route);
  } else if (route.mode === 'cableway_aerial') {
    trTrackBuildAerialCableway(batcher, route);
  } else {
    trTrackBuildConventionalRail(batcher, route, halfRailX, railW, railH, sleeperW);
  }

  const trackMaterials = {
    ballast: getSolidVehicleMaterial(isNight ? '#282d33' : '#585d63', 8),
    ground: getSolidVehicleMaterial(isNight ? '#161c22' : '#353d44', 6),
    asphalt: getSolidVehicleMaterial(isNight ? '#181c22' : '#2d323a', 10),
    concrete: getSolidVehicleMaterial(isNight ? '#444b54' : '#8d96a0', 16),
    concreteDark: getSolidVehicleMaterial(isNight ? '#2c3239' : '#636b75', 14),
    steelPortal: getSolidVehicleMaterial(isNight ? '#2f3d4c' : '#54667a', 42),
    catenaryWire: getSolidVehicleMaterial(isNight ? '#7a8894' : '#4a5562', 60),
    sleeper: getSolidVehicleMaterial(isNight ? '#241e1a' : '#4a3d33', 10),
    railWeb: getSolidVehicleMaterial(isNight ? '#3a322d' : '#5c4b3f', 24),
    railHead: getSolidVehicleMaterial(isNight ? '#7a8896' : '#a9b5c0', 95),
    markerPost: getSolidVehicleMaterial('#d6dde6', 18),
    markerCap: getSolidVehicleMaterial('#e09e2e', 30)
  };

  batcher.finalize(grp, trackMaterials, { castShadow: false, receiveShadow: true });
  return grp;
}
