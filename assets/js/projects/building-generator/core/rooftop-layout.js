import { clamp, pick, randBetween, rng32, roundNum } from '../utils.js';

export const ROOFTOP_B_UNITS_PER_METER = 16.404199475065617;

function buildColliderEntry({
  id,
  category,
  part = 'body',
  shape = 'box',
  x,
  y,
  z,
  width,
  height,
  depth,
  radius = null
}) {
  const rx = roundNum(x, 4);
  const ry = roundNum(y, 4);
  const rz = roundNum(z, 4);
  const rw = roundNum(width, 4);
  const rh = roundNum(height, 4);
  const rd = roundNum(depth, 4);

  const zUpX = rx;
  const zUpY = roundNum(-rz, 4);
  const zUpZ = ry;

  const minX = roundNum(zUpX - rw * 0.5, 4);
  const maxX = roundNum(zUpX + rw * 0.5, 4);
  const minY = roundNum(zUpY - rd * 0.5, 4);
  const maxY = roundNum(zUpY + rd * 0.5, 4);
  const minZ = roundNum(zUpZ - rh * 0.5, 4);
  const maxZ = roundNum(zUpZ + rh * 0.5, 4);

  const U = ROOFTOP_B_UNITS_PER_METER;
  return {
    id,
    category,
    part,
    shape,
    solid: true,
    traversal: 'barrier',
    ...(radius !== null ? { radius: roundNum(radius, 4) } : {}),
    position: { x: rx, y: ry, z: rz },
    dimensions: { width: rw, height: rh, depth: rd },
    coordinatesZUp: {
      position: { x: zUpX, y: zUpY, z: zUpZ },
      dimensions: { width: rw, depth: rd, height: rh },
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      bGameUnits: {
        position: {
          x: roundNum(zUpX * U, 3),
          y: roundNum(zUpY * U, 3),
          z: roundNum(zUpZ * U, 3)
        },
        dimensions: {
          width: roundNum(rw * U, 3),
          depth: roundNum(rd * U, 3),
          height: roundNum(rh * U, 3)
        },
        boundsMinMax: [
          roundNum(minX * U, 3),
          roundNum(minY * U, 3),
          roundNum(minZ * U, 3),
          roundNum(maxX * U, 3),
          roundNum(maxY * U, 3),
          roundNum(maxZ * U, 3)
        ]
      }
    },
    localBoxMeters: [minX, minY, minZ, maxX, maxY, maxZ]
  };
}

export function computeDeterministicRooftopLayout(cfg, topSegments, groundMain = null) {
  const segs = Array.isArray(topSegments) ? topSegments : [];
  if (!segs.length) {
    return {
      roofDeckY: 0,
      colliders: [],
      fixtures: [],
      cableAnchors: [],
      hvacPositions: [],
      antenna: null,
      pipes: null,
      headhouse: null,
      waterTank: null,
      ventilationFans: [],
      roofHatch: null
    };
  }

  const baseHeight = roundNum((Number(cfg.floors) || 4) * (Number(cfg.floorHeight) || 3.4), 4);
  const r = rng32(((Number(cfg.seed) || 1337) + 7919) >>> 0);
  const mainSeg = segs[0];
  const cut = mainSeg.cornerCut || 0;
  const isPitched = cfg.roofType === 'pitched';
  const pitchedW = mainSeg.w - cut;
  const ridgeH = isPitched ? Math.min(2.6, Math.max(1.4, Math.min(pitchedW, mainSeg.d) * 0.26)) : 0;
  const roofLift = cfg.roofType === 'mansard'
    ? 0.84
    : cfg.roofType === 'stepped'
      ? 0.70
      : (isPitched ? ridgeH * 0.55 : 0);
  const roofDeckY = roundNum(baseHeight + roofLift, 4);

  const insetMargin = (cfg.roofType === 'mansard' || cfg.roofType === 'stepped') ? 1.8 : 1.4;
  const safeBounds = (seg, margin) => ({
    minX: seg.x - seg.w * 0.5 + margin,
    maxX: seg.x + seg.w * 0.5 - (seg.cornerCut || 0) - margin,
    minZ: seg.z - seg.d * 0.5 + margin,
    maxZ: seg.z + seg.d * 0.5 - (seg.cornerCut || 0) - margin
  });

  const b0 = safeBounds(mainSeg, insetMargin);
  const colliders = [];
  const fixtures = [];
  const cableAnchors = [];

  const placedFootprints = [];
  const overlapsExisting = (px, pz, halfW, halfD, pad = 0.22) => placedFootprints.some((fp) => (
    Math.abs(px - fp.x) < (halfW + fp.hw + pad) &&
    Math.abs(pz - fp.z) < (halfD + fp.hd + pad)
  ));
  const recordFootprint = (px, pz, halfW, halfD) => {
    placedFootprints.push({ x: px, z: pz, hw: halfW, hd: halfD });
  };

  // Rooftop stairwell headhouse
  let headhouse = null;
  const headW = Number(cfg.roofAccessWidth) || 2.4;
  const headD = Number(cfg.roofAccessDepth) || 3.2;
  const headH = Number(cfg.roofAccessHeight) || 2.3;
  const headHx = 0;
  const headHz = clamp(-mainSeg.d * 0.15, -mainSeg.d * 0.5 + headD * 0.5 + 0.8, mainSeg.d * 0.5 - headD * 0.5 - 0.8);

  if (cfg.roofAccess) {
    headhouse = {
      id: 'roof_headhouse',
      x: headHx,
      baseY: baseHeight,
      z: headHz,
      width: headW,
      height: headH,
      depth: headD,
      roofStyle: cfg.roofAccessRoof || 'flat',
      doorSide: cfg.roofAccessDoorSide || 'front',
      style: cfg.roofAccessStyle || 'brick'
    };
    recordFootprint(headHx, headHz, headW * 0.5, headD * 0.5);
    const roofCapH = headhouse.roofStyle === 'sloped' ? 0.14 : 0.12;
    const totalHeadH = roundNum(headH + roofCapH, 4);
    const headCol = buildColliderEntry({
      id: 'roof_headhouse',
      category: 'headhouse',
      shape: 'box',
      x: headHx,
      y: baseHeight + totalHeadH * 0.5,
      z: headHz,
      width: headW,
      height: totalHeadH,
      depth: headD
    });
    colliders.push(headCol);
    fixtures.push({ id: 'roof_headhouse', category: 'headhouse', colliderIds: [headCol.id] });
  }

  const isInsideHeadhouse = (px, pz, radius = 0.5) => {
    if (!cfg.roofAccess) return false;
    return Math.abs(px - headHx) < (headW * 0.5 + radius) && Math.abs(pz - headHz) < (headD * 0.5 + radius);
  };

  // Rooftop water tank
  let waterTank = null;
  if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    let tx = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
    let tz = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    if (isInsideHeadhouse(tx, tz, 1.45)) {
      const rightX = clamp(headHx + headW * 0.5 + 1.45, b0.minX, b0.maxX);
      if (rightX - (headHx + headW * 0.5) >= 1.25) tx = rightX;
      else tz = clamp(headHz + headD * 0.5 + 1.6, b0.minZ, b0.maxZ);
    }
    const legBaseH = isPitched ? 2.4 : 1.8;
    waterTank = {
      id: 'roof_water_tank',
      x: roundNum(tx, 4),
      baseY: roofDeckY,
      z: roundNum(tz, 4),
      legBaseH
    };
    recordFootprint(tx, tz, 1.22, 1.22);

    const legMinY = roofDeckY + 0.58 - legBaseH * 0.5;
    const legTopY = roofDeckY + 0.58 + legBaseH * 0.5;
    const clippedMinY = Math.max(roofDeckY, legMinY);
    const supportH = Math.max(0.2, legTopY - clippedMinY);
    const supportCol = buildColliderEntry({
      id: 'roof_water_tank_supports',
      category: 'water_tank',
      part: 'supports',
      shape: 'box',
      x: tx,
      y: clippedMinY + supportH * 0.5,
      z: tz,
      width: 1.44,
      height: supportH,
      depth: 1.44
    });

    const barrelMinY = roofDeckY + 2.22 - 1.35 * 0.5;
    const barrelMaxY = roofDeckY + 2.98 + 0.25 * 0.5;
    const barrelH = barrelMaxY - barrelMinY;
    const barrelCol = buildColliderEntry({
      id: 'roof_water_tank_barrel',
      category: 'water_tank',
      part: 'barrel',
      shape: 'cylinder_bounds',
      radius: 1.18,
      x: tx,
      y: barrelMinY + barrelH * 0.5,
      z: tz,
      width: 2.36,
      height: barrelH,
      depth: 2.36
    });
    colliders.push(supportCol, barrelCol);
    fixtures.push({ id: 'roof_water_tank', category: 'water_tank', colliderIds: [supportCol.id, barrelCol.id] });
    cableAnchors.push([tx, roofDeckY + 2.5, tz]);
  }

  // Rooftop ventilation fans (explicit placement)
  const ventilationFans = [];
  if (cfg.rooftopVents) {
    for (let i = 0; i < 2; i++) {
      const vx = mainSeg.x + (i === 0 ? -1 : 1) * (mainSeg.w * 0.28);
      const vz = mainSeg.z + (i === 0 ? 1 : -1) * (mainSeg.d * 0.22);
      const id = `roof_vent_fan_${i + 1}`;
      ventilationFans.push({ id, x: roundNum(vx, 4), baseY: baseHeight, z: roundNum(vz, 4) });
      recordFootprint(vx, vz, 0.6, 0.6);
      const fanCol = buildColliderEntry({
        id,
        category: 'ventilation_fan',
        shape: 'box',
        x: vx,
        y: baseHeight + 0.545,
        z: vz,
        width: 1.15,
        height: 1.09,
        depth: 1.15
      });
      colliders.push(fanCol);
      fixtures.push({ id, category: 'ventilation_fan', colliderIds: [fanCol.id] });
    }
  }

  // Maintenance roof hatch
  let roofHatch = null;
  if (cfg.rooftopHatch) {
    const hx = mainSeg.x - mainSeg.w * 0.28;
    const hz = mainSeg.z + mainSeg.d * 0.28;
    roofHatch = { id: 'roof_hatch_1', x: roundNum(hx, 4), baseY: baseHeight, z: roundNum(hz, 4) };
    recordFootprint(hx, hz, 0.6, 0.6);
    const hatchCol = buildColliderEntry({
      id: 'roof_hatch_1',
      category: 'roof_hatch',
      shape: 'box',
      x: hx,
      y: baseHeight + 0.205,
      z: hz,
      width: 1.15,
      height: 0.41,
      depth: 1.15
    });
    colliders.push(hatchCol);
    fixtures.push({ id: 'roof_hatch_1', category: 'roof_hatch', colliderIds: [hatchCol.id] });
  }

  // Chimneys
  const chimneys = [];
  const chimneyCount = Math.max(0, Math.round(Number(cfg.chimneys) || 0));
  for (let i = 0; i < chimneyCount; i++) {
    const seg = pick(r, segs);
    const b = safeBounds(seg, 0.9);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    let cx = randBetween(r, b.minX, b.maxX);
    let cz = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(cx, cz, 0.65)) {
      cz = clamp(headHz + headD * 0.5 + 0.8, b.minZ, b.maxZ);
    }
    if (overlapsExisting(cx, cz, 0.41, 0.37)) {
      // Shift along Z to avoid colliding with previously placed solid fixtures
      const shifted = cz + 1.25 <= b.maxZ ? cz + 1.25 : cz - 1.25;
      cz = clamp(shifted, b.minZ, b.maxZ);
    }
    const chimH = isPitched ? 2.2 : 1.4;
    const id = `roof_chimney_${i + 1}`;
    const chimMinY = baseHeight;
    const chimCapTopY = baseHeight + chimH + 0.145;
    chimneys.push({
      id,
      x: roundNum(cx, 4),
      baseY: baseHeight,
      z: roundNum(cz, 4),
      chimH,
      shaftW: 0.62,
      shaftD: 0.55,
      capW: 0.81,
      capH: 0.15,
      capD: 0.74
    });
    recordFootprint(cx, cz, 0.41, 0.37);

    const shaftCol = buildColliderEntry({
      id: `${id}_shaft`,
      category: 'chimney',
      part: 'shaft',
      shape: 'box',
      x: cx,
      y: baseHeight + chimH * 0.5,
      z: cz,
      width: 0.62,
      height: chimH,
      depth: 0.55
    });
    const capCol = buildColliderEntry({
      id: `${id}_cap`,
      category: 'chimney',
      part: 'cap',
      shape: 'box',
      x: cx,
      y: baseHeight + chimH + 0.07,
      z: cz,
      width: 0.81,
      height: 0.15,
      depth: 0.74
    });
    colliders.push(shaftCol, capCol);
    fixtures.push({
      id,
      category: 'chimney',
      elevationRange: [roundNum(chimMinY, 4), roundNum(chimCapTopY, 4)],
      colliderIds: [shaftCol.id, capCol.id]
    });
    cableAnchors.push([cx, baseHeight + chimH * 0.85, cz]);
  }

  // Rooftop HVAC / mechanical units & exhaust vents
  const hvacUnits = [];
  const exhaustVents = [];
  const hvacPositions = [];
  const units = Math.round((Number(cfg.rooftopProps) || 0) * 8);
  for (let i = 0; i < units; i++) {
    const seg = pick(r, segs);
    const b = safeBounds(seg, insetMargin);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    const x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
    let z = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(x, z, 0.8)) continue;
    const propBaseY = isPitched ? roundNum(baseHeight + ridgeH - 0.15, 4) : roofDeckY;
    if (r() < 0.67) {
      const uw = roundNum(randBetween(r, 0.7, 1.4), 4);
      const ud = roundNum(randBetween(r, 0.7, 1.2), 4);
      if (overlapsExisting(x, z, uw * 0.5, ud * 0.5, 0.15)) {
        const altZ = z - (ud + 0.5) >= b.minZ ? z - (ud + 0.5) : z + (ud + 0.5);
        z = clamp(altZ, b.minZ, b.maxZ);
      }
      const id = `roof_hvac_${hvacUnits.length + 1}`;
      hvacUnits.push({ id, x: roundNum(x, 4), baseY: propBaseY, z: roundNum(z, 4), w: uw, h: 0.8, d: ud });
      recordFootprint(x, z, uw * 0.5, ud * 0.5);
      const col = buildColliderEntry({
        id,
        category: 'hvac_unit',
        shape: 'box',
        x,
        y: propBaseY + 0.4,
        z,
        width: uw,
        height: 0.8,
        depth: ud
      });
      colliders.push(col);
      fixtures.push({ id, category: 'hvac_unit', colliderIds: [col.id] });
      hvacPositions.push([x, propBaseY, z]);
      cableAnchors.push([x, propBaseY + 0.76, z]);
    } else {
      if (overlapsExisting(x, z, 0.45, 0.45, 0.15)) {
        const altZ = z + 1.1 <= b.maxZ ? z + 1.1 : z - 1.1;
        z = clamp(altZ, b.minZ, b.maxZ);
      }
      const id = `roof_exhaust_${exhaustVents.length + 1}`;
      exhaustVents.push({ id, x: roundNum(x, 4), baseY: propBaseY, z: roundNum(z, 4), radius: 0.45, height: 0.54 });
      recordFootprint(x, z, 0.45, 0.45);
      const col = buildColliderEntry({
        id,
        category: 'exhaust_vent',
        shape: 'cylinder_bounds',
        radius: 0.45,
        x,
        y: propBaseY + 0.27,
        z,
        width: 0.90,
        height: 0.54,
        depth: 0.90
      });
      colliders.push(col);
      fixtures.push({ id, category: 'exhaust_vent', colliderIds: [col.id] });
    }
  }

  // Decorative-only antenna & pipes (not emitted into solid colliders)
  let antenna = null;
  if (cfg.antennas && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const ax = isPitched ? mainSeg.x - cut * 0.5 : clamp(mainSeg.x - mainSeg.w * 0.28, b0.minX, b0.maxX);
    const az = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    const antBaseY = isPitched ? roundNum(baseHeight + ridgeH, 4) : roofDeckY;
    antenna = { x: roundNum(ax, 4), baseY: antBaseY, z: roundNum(az, 4) };
    cableAnchors.push([ax, antBaseY + 2.1, az]);
  }

  const cableSags = [];
  for (let i = 0; i < cableAnchors.length - 1; i++) {
    cableSags.push(roundNum(randBetween(r, 0.22, 0.48), 4));
  }

  return {
    baseHeight,
    roofDeckY,
    isPitched,
    ridgeH,
    mainSeg,
    groundMain,
    colliders,
    fixtures,
    headhouse,
    waterTank,
    ventilationFans,
    roofHatch,
    chimneys,
    hvacUnits,
    exhaustVents,
    antenna,
    cableAnchors,
    cableSags,
    hvacPositions
  };
}

export function computeRooftopStructuresMetadata(cfg, topSegments, groundMain = null, includeColliders = false) {
  const baseSummary = {
    hasHeadhouse: Boolean(cfg.roofAccess),
    headhouseStyle: cfg.roofAccess ? cfg.roofAccessStyle : null,
    hasWaterTank: Boolean(cfg.rooftopWaterTank),
    hasVents: Boolean(cfg.rooftopVents),
    hasHatch: Boolean(cfg.rooftopHatch),
    hasWalkways: Boolean(cfg.rooftopWalkways),
    hasSafetyRailings: Boolean(cfg.safetyRailings)
  };

  if (!includeColliders) {
    return baseSummary;
  }

  const layout = computeDeterministicRooftopLayout(cfg, topSegments, groundMain);
  return {
    ...baseSummary,
    hasColliders: true,
    colliderCount: layout.colliders.length,
    fixtureCount: layout.fixtures.length,
    roofDeckElevation: layout.roofDeckY,
    excludedDecorativeDetails: [
      ...(cfg.antennas ? ['antenna_masts'] : []),
      ...(cfg.rooftopPipes ? ['thin_conduits_and_cables'] : []),
      ...(cfg.rooftopWalkways ? ['flush_walkway_planks'] : [])
    ],
    fixtures: layout.fixtures,
    colliders: layout.colliders
  };
}
