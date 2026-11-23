import { INFRA_DEFAULTS, infraVecToBGameUnits } from '../config.js';
import { infraRound, infraVec3Cross, infraVec3Dist, infraVec3Lerp, infraVec3Norm } from '../utils.js';

export function geoPrimAddBeamBetween(batcher, p0, p1, width, height, options = {}) {
  const len = infraVec3Dist(p0, p1);
  if (len < 1e-4) return;
  const tangent = infraVec3Norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], [0, 0, 1]);
  let upHint = Math.abs(tangent[1]) < 0.92 ? [0, 1, 0] : [0, 0, 1];
  const right = infraVec3Norm(infraVec3Cross(tangent, upHint), [1, 0, 0]);
  const up = infraVec3Norm(infraVec3Cross(right, tangent), [0, 1, 0]);
  const center = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5, (p0[2] + p1[2]) * 0.5];
  batcher.addBoxOriented(center, tangent, right, up, width, height, len, {
    layer: options.layer || 'LayerA_PrimaryStructure',
    materialKey: options.materialKey || 'steel_structure',
    surfaceStratum: options.surfaceStratum || 'steel_member'
  });
}

export function geoPrimAddSagWire(batcher, p0, p1, sagMeters = 0.25, thickness = 0.032, segments = 6, options = {}) {
  const segs = Math.max(2, segments);
  let prev = p0;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const pt = infraVec3Lerp(p0, p1, t);
    const sagOffset = 4 * t * (1 - t) * sagMeters;
    const curr = [pt[0], pt[1] - sagOffset, pt[2]];
    geoPrimAddBeamBetween(batcher, prev, curr, thickness, thickness, {
      layer: options.layer || 'LayerA_PrimaryStructure',
      materialKey: options.materialKey || 'wire_copper',
      surfaceStratum: options.surfaceStratum || 'catenary_wire'
    });
    prev = curr;
  }
}

export function geoPrimAddTrussPanel(batcher, p0Bot, p0Top, p1Top, p1Bot, memberThickness = 0.14, options = {}) {
  const opts = {
    layer: options.layer || 'LayerA_PrimaryStructure',
    materialKey: options.materialKey || 'steel_structure',
    surfaceStratum: options.surfaceStratum || 'truss_member'
  };
  // Bottom chord, top chord, vertical posts, and diagonal Warren strut
  geoPrimAddBeamBetween(batcher, p0Bot, p1Bot, memberThickness, memberThickness, opts);
  geoPrimAddBeamBetween(batcher, p0Top, p1Top, memberThickness, memberThickness, opts);
  geoPrimAddBeamBetween(batcher, p0Bot, p0Top, memberThickness, memberThickness, opts);
  if (options.includeEndPost) {
    geoPrimAddBeamBetween(batcher, p1Bot, p1Top, memberThickness, memberThickness, opts);
  }
  const diagA = options.flipDiagonal ? p0Top : p0Bot;
  const diagB = options.flipDiagonal ? p1Bot : p1Top;
  geoPrimAddBeamBetween(batcher, diagA, diagB, memberThickness * 0.85, memberThickness * 0.85, opts);
}

// Builds a B-Remastered compliant staircase (stepRise <= 0.2438m / 4 B units) from originXZ at y=0 up to targetTopY.
// Uses a 2-flight switchback with an intermediate landing when totalRise > 3.1m so footprints stay compact.
export function geoPrimAddStairFlight(batcher, basePos, forwardXZ, rightXZ, totalRise, clearWidth = 1.4, options = {}) {
  if (options.stationStyle) return geoPrimAddStationSwitchback(batcher, basePos, forwardXZ, rightXZ, totalRise, clearWidth, options);
  const rise = Math.max(0.4, Number(totalRise) || 3.4);
  const f = [forwardXZ[0], 0, forwardXZ[1]];
  const r = [rightXZ[0], 0, rightXZ[1]];
  const up = [0, 1, 0];

  const maxStepRise = Math.min(0.2125, INFRA_DEFAULTS.maxPlayerStepRiseMeters);
  const totalSteps = Math.max(3, Math.ceil(rise / maxStepRise));
  const stepRise = rise / totalSteps;
  const stepRun = 0.28;

  const useSwitchback = rise > 3.1;
  const flight1Steps = useSwitchback ? Math.ceil(totalSteps * 0.5) : totalSteps;
  const flight2Steps = totalSteps - flight1Steps;

  const steelMat = options.materialKey || 'steel_structure';
  const treadMat = options.treadMaterial || 'concrete';
  const layer = options.layer || 'LayerA_PrimaryStructure';

  const pt = (lx, ly, lz) => [
    basePos[0] + r[0] * lx + f[0] * lz,
    basePos[1] + ly,
    basePos[2] + r[2] * lx + f[2] * lz
  ];

  // Ground plinth pad
  batcher.addBoxOriented(pt(0, 0.08, 0.4), f, r, up, clearWidth + 0.5, 0.16, 1.0, {
    layer,
    materialKey: 'concrete',
    surfaceStratum: 'stair_landing'
  });

  const buildFlight = (startX, startY, startZ, dirSign, stepCount) => {
    for (let s = 0; s < stepCount; s++) {
      const sy = startY + (s + 0.5) * stepRise;
      const sz = startZ + dirSign * (s + 0.5) * stepRun;
      batcher.addBoxOriented(pt(startX, sy, sz), f, r, up, clearWidth, stepRise, stepRun + 0.02, {
        layer,
        materialKey: treadMat,
        surfaceStratum: 'stair_tread'
      });
    }
    const endY = startY + stepCount * stepRise;
    const endZ = startZ + dirSign * stepCount * stepRun;

    // Twin C-channel stringers & handrail bars along each side
    for (const sSide of [-1, 1]) {
      const lx = startX + sSide * (clearWidth * 0.5 + 0.06);
      geoPrimAddBeamBetween(batcher, pt(lx, startY + 0.1, startZ), pt(lx, endY + 0.1, endZ), 0.1, 0.22, {
        layer,
        materialKey: steelMat,
        surfaceStratum: 'stair_stringer'
      });
      geoPrimAddBeamBetween(batcher, pt(lx, startY + 1.0, startZ), pt(lx, endY + 1.0, endZ), 0.06, 0.06, {
        layer,
        materialKey: steelMat,
        surfaceStratum: 'railing'
      });
    }
    return { endY, endZ };
  };

  let finalPos;
  if (!useSwitchback) {
    const f1 = buildFlight(0, 0, 0.9, 1, flight1Steps);
    finalPos = pt(0, f1.endY, f1.endZ);
  } else {
    const laneOffset = clearWidth * 0.5 + 0.22;
    const f1 = buildFlight(-laneOffset, 0, 0.9, 1, flight1Steps);

    // Mid-height turnaround landing + support posts down to ground y=-0.25
    const landDepth = 1.6;
    const landW = clearWidth * 2 + 0.65;
    const landZ = f1.endZ + landDepth * 0.5;
    batcher.addBoxOriented(pt(0, f1.endY - 0.11, landZ), f, r, up, landW, 0.22, landDepth, {
      layer,
      materialKey: 'concrete',
      surfaceStratum: 'stair_landing'
    });
    for (const sx of [-landW * 0.44, landW * 0.44]) {
      geoPrimAddBeamBetween(batcher, pt(sx, -0.25, f1.endZ + landDepth * 0.8), pt(sx, f1.endY - 0.1, f1.endZ + landDepth * 0.8), 0.22, 0.22, {
        layer: 'LayerB_StructuralSupports',
        materialKey: steelMat,
        surfaceStratum: 'structural_support'
      });
    }

    const f2 = buildFlight(laneOffset, f1.endY, f1.endZ, -1, flight2Steps);
    finalPos = pt(laneOffset, f2.endY, f2.endZ);
  }

  return {
    id: options.id || 'stair_1',
    stepCount: totalSteps,
    stepRiseMeters: infraRound(stepRise, 4),
    stepRunMeters: stepRun,
    clearWidthMeters: clearWidth,
    landingCount: useSwitchback ? 1 : 0,
    headroomMeters: 2.25,
    startPosMeters: [infraRound(basePos[0], 3), infraRound(basePos[1], 3), infraRound(basePos[2], 3)],
    endPosMeters: [infraRound(finalPos[0], 3), infraRound(finalPos[1], 3), infraRound(finalPos[2], 3)],
    coordinatesZUp: {
      start: infraVecToBGameUnits(basePos[0], basePos[1], basePos[2]),
      end: infraVecToBGameUnits(finalPos[0], finalPos[1], finalPos[2])
    }
  };
}

// Fill the opening between the deck and handrail so the capsule slides along
// a continuous edge instead of catching on individual posts or passing below it.
export function geoPrimGuardCollisionBox(a, b, height = 1.05) {
  const pad = 0.03;
  return [
    Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - 0.06, Math.min(a[2], b[2]) - pad,
    Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + height, Math.max(a[2], b[2]) + pad
  ];
}

function geoPrimAddStationSwitchback(batcher, base, forward, right, rise, width, options) {
  const f = [forward[0], 0, forward[1]];
  const r = [right[0], 0, right[1]];
  const up = [0, 1, 0];
  const boxRight = infraVec3Cross(up, f);
  const pt = (x, h, z) => [base[0] + r[0] * x + f[0] * z, base[1] + h, base[2] + r[2] * x + f[2] * z];
  const style = options.stationStyle;
  const treadMat = style === 'concrete' ? 'concrete' : style === 'ribbed' ? 'steel_structure' : 'steel_grating';
  const accent = style === 'concrete' ? 'rail_steel' : 'steel_accent';
  const flights = 2 * Math.max(1, Math.ceil(rise / 6.4));
  const steps = Math.ceil(rise / flights / 0.207);
  const stepRise = rise / (flights * steps);
  const run = 0.28;
  const length = steps * run;
  const lane = (width + 0.17) / 2;
  const outer = lane + width / 2;
  const landingDepth = 1.42;
  const walkingBoxes = [];
  const guardBoxes = [];
  const box = (x, h, z, w, height, d, materialKey, surfaceStratum, walkable = false) => {
    const center = pt(x, h, z);
    batcher.addBoxOriented(center, f, boxRight, up, w, height, d, { materialKey, surfaceStratum, layer: 'LayerA_PrimaryStructure' });
    if (walkable) {
      const hx = (Math.abs(r[0]) * w + Math.abs(f[0]) * d) / 2;
      const hz = (Math.abs(r[2]) * w + Math.abs(f[2]) * d) / 2;
      walkingBoxes.push([center[0] - hx, center[1] - height / 2, center[2] - hz,
        center[0] + hx, center[1] + height / 2, center[2] + hz]);
    }
  };
  const rail = (a, b, thickness, materialKey = 'steel_structure') =>
    geoPrimAddBeamBetween(batcher, pt(...a), pt(...b), thickness, thickness, { materialKey, surfaceStratum: 'stair_guard' });
  const guard = (x, z0, z1, y0, y1) => {
    for (const h of [0.48, 1.02]) rail([x, y0 + h, z0], [x, y1 + h, z1], h > 1 ? 0.055 : 0.033, h > 1 ? accent : 'steel_structure');
    const count = Math.max(1, Math.ceil(Math.abs(z1 - z0) / (style === 'ribbed' ? 0.56 : 1.05)));
    for (let i = 0; i <= count; i++) {
      const t = (i + 0.025) / (count + 0.05), z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t;
      rail([x, y, z], [x, y + 1.02, z], 0.045);
    }
  };

  for (let flight = 0; flight < flights; flight++) {
    const forwardFlight = flight % 2 === 0;
    const x = forwardFlight ? lane : -lane;
    const z0 = forwardFlight ? 0 : length;
    const dir = forwardFlight ? 1 : -1;
    const low = flight * steps * stepRise;
    const high = low + steps * stepRise;
    const z1 = z0 + dir * length;
    for (let i = 0; i < steps; i++) {
      const z = z0 + dir * (i + 0.5) * run;
      const top = low + (i + 1) * stepRise;
      box(x, top - stepRise / 2, z, width, stepRise, run, treadMat, 'stair_tread', true);
      box(x, top + 0.006, z + dir * (run / 2 - 0.035), width - 0.09, 0.012, 0.045, accent, 'stair_nosing');
    }
    for (const side of [-1, 1]) {
      const edge = x + side * (width / 2 + 0.034);
      rail([edge, low - 0.06, z0], [edge, high - 0.06, z1], 0.135);
      guard(edge, z0, z1, low, high);
      for (let i = 0; i < steps; i++) {
        const stepZ = z0 + dir * i * run;
        const stepY = low + i * stepRise;
        guardBoxes.push(geoPrimGuardCollisionBox(pt(edge, stepY, stepZ), pt(edge, stepY + stepRise, stepZ + dir * run)));
      }
    }
    const final = flight === flights - 1;
    box(final ? x : 0, high - 0.09, z1 + dir * landingDepth / 2,
      final ? width : 2 * outer, 0.18, landingDepth, treadMat, 'stair_landing', true);
    const farZ = z1 + dir * (landingDepth - 0.035);
    const left = final ? x - width / 2 : -outer;
    const right = final ? x + width / 2 : outer;
    rail([left, high + 1.02, farZ], [right, high + 1.02, farZ], 0.055, accent);
    guardBoxes.push(geoPrimGuardCollisionBox(pt(left, high, farZ), pt(right, high, farZ)));
    // The street-side landings need both side rails, but leave the inside of
    // the top landing open to the transverse bridge and boarding platform.
    for (const edge of final ? [right] : [left, right]) {
      guard(edge, z1, farZ, high, high);
      guardBoxes.push(geoPrimGuardCollisionBox(pt(edge, high, z1), pt(edge, high, farZ)));
    }
  }
  for (const x of [-outer - 0.12, outer + 0.12]) {
    for (const z of [-landingDepth + 0.18, length + landingDepth - 0.18]) {
      box(x, -0.12, z, 0.45, 0.24, 0.45, 'pier_concrete', 'stair_footing');
      rail([x, 0, z], [x, rise - 0.09, z], 0.16);
    }
    for (let i = 0; i < flights; i += 2) {
      const low = i * steps * stepRise;
      const high = low + 2 * steps * stepRise;
      rail([x, low, -landingDepth + 0.18], [x, high, length + landingDepth - 0.18], 0.095);
    }
  }
  const start = pt(lane, 0, 0);
  const end = pt(-lane, rise, -landingDepth / 2);
  return {
    id: options.id, style, stepCount: flights * steps, stepRiseMeters: infraRound(stepRise, 4), stepRunMeters: run,
    clearWidthMeters: width, landingCount: flights, flightCount: flights, headroomMeters: 2 * steps * stepRise - 0.18,
    startPosMeters: start, endPosMeters: end, walkingBoxes, guardBoxes,
    coordinatesZUp: { start: infraVecToBGameUnits(...start), end: infraVecToBGameUnits(...end) }
  };
}

// Builds a non-overlapping curved or straight transit platform with yellow tactile safety strip and shelter canopy.
export function geoPrimAddPlatformAssembly(batcher, frames, sideSign, innerEdgeX, totalWidth, deckTopY, uStart = 0.25, uEnd = 0.75, options = {}) {
  if (!frames || frames.length < 2) return null;
  const sub = options.distanceBounds
    ? frames.filter((f) => f.s >= options.distanceBounds[0] && f.s <= options.distanceBounds[1])
    : frames.filter((f) => f.u >= uStart - 0.02 && f.u <= uEnd + 0.02);
  if (sub.length < 2) return null;

  const tactileW = 0.42;
  const deckW = Math.max(0.8, totalWidth - tactileW);
  const deckBottomY = options.deckBottomY !== undefined ? options.deckBottomY : 0;
  const deckMat = options.deckMaterial || 'concrete';
  const canopyMat = options.canopyMaterial || 'steel_structure';
  const isGlass = Boolean(options.glassWalls);

  const pt = (f, latX, elevY) => [
    f.position[0] + f.right[0] * latX,
    f.position[1] + elevY,
    f.position[2] + f.right[2] * latX
  ];

  // Order horizontal strips monotonically from left to right so quads always face +Y upward!
  const xEdge = innerEdgeX;
  const xTactileEnd = xEdge + sideSign * tactileW;
  const xOuter = xEdge + sideSign * totalWidth;

  const strips = sideSign > 0
    ? [
        { xL: xEdge, xR: xTactileEnd, mat: 'platform_tactile' },
        { xL: xTactileEnd, xR: xOuter, mat: deckMat }
      ]
    : [
        { xL: xOuter, xR: xTactileEnd, mat: deckMat },
        { xL: xTactileEnd, xR: xEdge, mat: 'platform_tactile' }
      ];

  for (const st of strips) {
    for (let i = 0; i < sub.length - 1; i++) {
      const f0 = sub[i];
      const f1 = sub[i + 1];
      const v0 = f0.s * 0.35;
      const v1 = f1.s * 0.35;
      batcher.addQuad(
        pt(f0, st.xL, deckTopY),
        pt(f0, st.xR, deckTopY),
        pt(f1, st.xR, deckTopY),
        pt(f1, st.xL, deckTopY),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: st.mat,
          surfaceStratum: 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [1, v0], [1, v1], [0, v1]]
        }
      );
    }
  }

  // Side walls & end caps of platform base
  const minX = Math.min(xEdge, xOuter);
  const maxX = Math.max(xEdge, xOuter);
  for (let i = 0; i < sub.length - 1; i++) {
    const f0 = sub[i];
    const f1 = sub[i + 1];
    batcher.addQuad(pt(f0, minX, deckBottomY), pt(f0, minX, deckTopY), pt(f1, minX, deckTopY), pt(f1, minX, deckBottomY), {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'concrete',
      surfaceStratum: 'platform_wall'
    });
    batcher.addQuad(pt(f0, maxX, deckTopY), pt(f0, maxX, deckBottomY), pt(f1, maxX, deckBottomY), pt(f1, maxX, deckTopY), {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'concrete',
      surfaceStratum: 'platform_wall'
    });
  }
  const fFirst = sub[0];
  const fLast = sub[sub.length - 1];
  batcher.addQuad(pt(fFirst, maxX, deckTopY), pt(fFirst, minX, deckTopY), pt(fFirst, minX, deckBottomY), pt(fFirst, maxX, deckBottomY), {
    layer: 'LayerA_PrimaryStructure',
    materialKey: 'concrete',
    surfaceStratum: 'platform_wall'
  });
  batcher.addQuad(pt(fLast, minX, deckTopY), pt(fLast, maxX, deckTopY), pt(fLast, maxX, deckBottomY), pt(fLast, minX, deckBottomY), {
    layer: 'LayerA_PrimaryStructure',
    materialKey: 'concrete',
    surfaceStratum: 'platform_wall'
  });

  // Shelter canopy roof + support posts + glass back wall
  if (options.includeCanopy !== false) {
    const roofY = deckTopY + 2.85;
    const roofX0 = minX + (sideSign > 0 ? 0.35 : 0.05);
    const roofX1 = maxX - (sideSign > 0 ? 0.05 : 0.35);
    const cSub = sub.slice(Math.floor(sub.length * 0.15), Math.max(2, Math.ceil(sub.length * 0.85)));
    if (cSub.length >= 2) {
      for (let i = 0; i < cSub.length - 1; i++) {
        const f0 = cSub[i];
        const f1 = cSub[i + 1];
        batcher.addQuad(pt(f0, roofX0, roofY), pt(f0, roofX1, roofY), pt(f1, roofX1, roofY), pt(f1, roofX0, roofY), {
          layer: 'LayerA_PrimaryStructure',
          materialKey: canopyMat,
          surfaceStratum: 'canopy_roof',
          expectUpwardNormals: true
        });
        // Soffit underside
        batcher.addQuad(pt(f0, roofX0, roofY - 0.14), pt(f1, roofX0, roofY - 0.14), pt(f1, roofX1, roofY - 0.14), pt(f0, roofX1, roofY - 0.14), {
          layer: 'LayerA_PrimaryStructure',
          materialKey: canopyMat,
          surfaceStratum: 'canopy_soffit'
        });
        if (isGlass) {
          const wallX = sideSign > 0 ? maxX - 0.12 : minX + 0.12;
          batcher.addQuad(
            pt(f0, wallX, deckTopY + 0.1),
            pt(f0, wallX, roofY - 0.14),
            pt(f1, wallX, roofY - 0.14),
            pt(f1, wallX, deckTopY + 0.1),
            {
              layer: 'LayerA_PrimaryStructure',
              materialKey: 'glass_station',
              surfaceStratum: 'station_glass'
            }
          );
        }
      }

      const postX = sideSign > 0 ? maxX - 0.28 : minX + 0.28;
      const postStep = Math.max(1, Math.floor((cSub.length - 1) / 3));
      for (let i = 0; i < cSub.length; i += postStep) {
        const fp = cSub[i];
        geoPrimAddBeamBetween(batcher, pt(fp, postX, deckTopY), pt(fp, postX, roofY), 0.16, 0.16, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: canopyMat,
          surfaceStratum: 'canopy_post'
        });
        // Station warm overhead lamp fixture under canopy
        batcher.addBoxOriented(pt(fp, (roofX0 + roofX1) * 0.5, roofY - 0.2), fp.tangent, fp.right, [0, 1, 0], 0.45, 0.08, 0.2, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'station_lamp',
          surfaceStratum: 'fixture'
        });
      }
    }
  }

  const midF = sub[Math.floor(sub.length * 0.5)];
  const midPt = pt(midF, xTactileEnd + sideSign * deckW * 0.4, deckTopY);
  return {
    id: options.id || 'platform_1',
    walkingBoxes: sub.slice(1).map((frame, i) => {
      const points = [pt(sub[i], minX, deckTopY), pt(sub[i], maxX, deckTopY),
        pt(frame, minX, deckTopY), pt(frame, maxX, deckTopY)];
      return [Math.min(...points.map((p) => p[0])), Math.min(frame.position[1], sub[i].position[1]) + deckBottomY,
        Math.min(...points.map((p) => p[2])), Math.max(...points.map((p) => p[0])),
        Math.max(...points.map((p) => p[1])), Math.max(...points.map((p) => p[2]))];
    }),
    positionMeters: [infraRound(midPt[0], 3), infraRound(midPt[1], 3), infraRound(midPt[2], 3)],
    coordinatesZUp: infraVecToBGameUnits(midPt[0], midPt[1], midPt[2]),
    widthMeters: infraRound(totalWidth, 2),
    lengthMeters: infraRound(sub[sub.length - 1].s - sub[0].s, 2),
    deckElevationMeters: infraRound(midPt[1], 3)
  };
}
