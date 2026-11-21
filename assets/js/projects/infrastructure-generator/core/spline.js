import { INFRA_DEFAULTS } from '../config.js';
import { infraClamp, infraRound, infraVec2Norm, infraVec3Cross, infraVec3Dist, infraVec3Norm } from '../utils.js';

export function infraBuildEdgeSplineSpec(edge, startNode, endNode) {
  const p0 = [...(startNode?.position || [0, 0, 0])];
  const p3 = [...(endNode?.position || [0, 0, 20])];
  const dx = p3[0] - p0[0];
  const dz = p3[2] - p0[2];
  const chordXZ = Math.hypot(dx, dz) || 1;
  const bulge = Number(edge?.curveBulge) || 0;
  const isCurved = edge?.curveType === 'arc' || edge?.curveType === 'cubic_bezier' || Math.abs(bulge) > 0.05;

  // Perpendicular right vector in XZ for symmetric quadratic/cubic curve control
  const dirXZ = infraVec2Norm([dx, dz], [0, 1]);
  const rightXZ = [-dirXZ[1], dirXZ[0]];

  let p1;
  let p2;
  if (Array.isArray(edge?.controlPoints) && edge.controlPoints.length === 4) {
    p1 = [...edge.controlPoints[1]];
    p2 = [...edge.controlPoints[2]];
  } else if (isCurved) {
    const midY = (p0[1] + p3[1]) * 0.5;
    // Quadratic control point Q lifted to cubic handles gives smooth symmetric arc
    const qx = (p0[0] + p3[0]) * 0.5 + rightXZ[0] * bulge * 1.3333;
    const qz = (p0[2] + p3[2]) * 0.5 + rightXZ[1] * bulge * 1.3333;
    p1 = [p0[0] + (2 / 3) * (qx - p0[0]), p0[1] + (2 / 3) * (midY - p0[1]), p0[2] + (2 / 3) * (qz - p0[2])];
    p2 = [p3[0] + (2 / 3) * (qx - p3[0]), p3[1] + (2 / 3) * (midY - p3[1]), p3[2] + (2 / 3) * (qz - p3[2])];
  } else {
    p1 = [p0[0] + dx / 3, p0[1], p0[2] + dz / 3];
    p2 = [p0[0] + (2 * dx) / 3, p3[1], p0[2] + (2 * dz) / 3];
  }

  return {
    type: isCurved ? 'cubic_bezier' : 'line',
    controlPoints: [p0, p1, p2, p3],
    chordXZ,
    bulge,
    verticalProfile: edge?.verticalProfile || 'smooth',
    bankingStartRad: Number(edge?.bankingStartRad) || 0,
    bankingEndRad: Number(edge?.bankingEndRad) || 0
  };
}

function splEvalCubic(spec, t) {
  const [p0, p1, p2, p3] = spec.controlPoints;
  const u = 1 - t;
  const u2 = u * u;
  const t2 = t * t;
  const b0 = u2 * u;
  const b1 = 3 * u2 * t;
  const b2 = 3 * u * t2;
  const b3 = t2 * t;

  const x = b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0];
  const z = b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2];

  // Smooth Hermite elevation interpolation keeps junctions level unless verticalProfile === 'linear'
  let y;
  if (spec.verticalProfile === 'linear') {
    y = p0[1] + (p3[1] - p0[1]) * t;
  } else {
    const smoothS = t * t * (3 - 2 * t);
    y = p0[1] + (p3[1] - p0[1]) * smoothS;
  }

  return [x, y, z];
}

function splEvalCubicDerivative(spec, t) {
  const [p0, p1, p2, p3] = spec.controlPoints;
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dz = 3 * u * u * (p1[2] - p0[2]) + 6 * u * t * (p2[2] - p1[2]) + 3 * t * t * (p3[2] - p2[2]);
  const dy = spec.verticalProfile === 'linear'
    ? (p3[1] - p0[1])
    : 6 * t * (1 - t) * (p3[1] - p0[1]);
  return [dx, dy, dz];
}

function splBuildGravityFrame(pos, rawTangent, prevUp, bankingRad = 0) {
  const tangent = infraVec3Norm(rawTangent, [0, 0, 1]);
  let right;
  let up;

  if (Math.abs(tangent[1]) < 0.95) {
    // Gravity-locked RMF: cross(T, WorldUp) gives Right in Y-up right-handed coordinates
    right = infraVec3Norm(infraVec3Cross(tangent, [0, 1, 0]), [1, 0, 0]);
    up = infraVec3Norm(infraVec3Cross(right, tangent), [0, 1, 0]);
  } else {
    // Parallel-transport fallback for near-vertical risers
    const refUp = prevUp || [0, 0, 1];
    right = infraVec3Norm(infraVec3Cross(tangent, refUp), [1, 0, 0]);
    up = infraVec3Norm(infraVec3Cross(right, tangent), [0, 0, 1]);
  }

  if (Math.abs(bankingRad) > 1e-5) {
    const c = Math.cos(bankingRad);
    const s = Math.sin(bankingRad);
    const rBank = [
      right[0] * c + up[0] * s,
      right[1] * c + up[1] * s,
      right[2] * c + up[2] * s
    ];
    const uBank = [
      up[0] * c - right[0] * s,
      up[1] * c - right[1] * s,
      up[2] * c - right[2] * s
    ];
    right = infraVec3Norm(rBank, right);
    up = infraVec3Norm(uBank, up);
  }

  return { position: pos, tangent, right, up };
}

export function infraSampleSpline(spec, options = {}) {
  const preSteps = spec.type === 'line' && Math.abs(spec.controlPoints[0][1] - spec.controlPoints[3][1]) < 0.02
    ? 8
    : 48;

  // Build dense arc-length table for accurate trimStartMeters / trimEndMeters slicing
  const table = [];
  let totalLength = 0;
  let prevPos = splEvalCubic(spec, 0);
  table.push({ t: 0, s: 0, pos: prevPos });

  for (let i = 1; i <= preSteps; i++) {
    const t = i / preSteps;
    const pos = splEvalCubic(spec, t);
    totalLength += infraVec3Dist(prevPos, pos);
    table.push({ t, s: totalLength, pos });
    prevPos = pos;
  }

  const tAtS = (targetS) => {
    const sClamped = infraClamp(targetS, 0, totalLength);
    for (let i = 1; i < table.length; i++) {
      if (table[i].s >= sClamped) {
        const s0 = table[i - 1].s;
        const s1 = table[i].s;
        const span = Math.max(1e-7, s1 - s0);
        const frac = (sClamped - s0) / span;
        return table[i - 1].t + (table[i].t - table[i - 1].t) * frac;
      }
    }
    return 1;
  };

  let trimStart = Math.max(0, Number(options.trimStartMeters) || 0);
  let trimEnd = Math.max(0, Number(options.trimEndMeters) || 0);
  const minUsable = 0.4;
  if (trimStart + trimEnd > totalLength - minUsable && totalLength > minUsable) {
    const scale = (totalLength - minUsable) / (trimStart + trimEnd);
    trimStart *= scale;
    trimEnd *= scale;
  }

  const startS = Math.min(totalLength, trimStart);
  const endS = Math.max(startS, totalLength - trimEnd);
  const trimmedLength = Math.max(0, endS - startS);

  const hasSlope = Math.abs(spec.controlPoints[0][1] - spec.controlPoints[3][1]) > 0.02;
  const maxSegLen = Number(options.maxSegmentLengthMeters) || INFRA_DEFAULTS.splineMaxSegmentLengthMeters;
  const minSteps = spec.type === 'line' && !hasSlope ? 2 : 16;
  const steps = Math.max(minSteps, Math.ceil(trimmedLength / maxSegLen));

  const frames = [];
  let prevUp = [0, 1, 0];
  let maxGradeRatio = 0;
  let minCurveRadiusMeters = Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= steps; i++) {
    const u = steps === 0 ? 0 : i / steps;
    const s = startS + trimmedLength * u;
    const t = totalLength > 1e-6 ? tAtS(s) : u;
    const pos = splEvalCubic(spec, t);
    const deriv = splEvalCubicDerivative(spec, t);
    const bank = spec.bankingStartRad + (spec.bankingEndRad - spec.bankingStartRad) * t;
    const frame = splBuildGravityFrame(pos, deriv, prevUp, bank);
    prevUp = frame.up;

    const horizLen = Math.hypot(deriv[0], deriv[2]);
    if (horizLen > 1e-5) {
      const grade = Math.abs(deriv[1]) / horizLen;
      if (grade > maxGradeRatio) maxGradeRatio = grade;
    }

    minX = Math.min(minX, pos[0]);
    maxX = Math.max(maxX, pos[0]);
    minZ = Math.min(minZ, pos[2]);
    maxZ = Math.max(maxZ, pos[2]);

    frames.push({
      ...frame,
      t: infraRound(t, 5),
      s: infraRound(s, 4),
      u: infraRound(u, 5)
    });
  }

  // Estimate minimum horizontal curve radius along frames
  for (let i = 1; i < frames.length - 1; i++) {
    const a = frames[i - 1].position;
    const b = frames[i].position;
    const c = frames[i + 1].position;
    const abx = b[0] - a[0];
    const abz = b[2] - a[2];
    const bcx = c[0] - b[0];
    const bcz = c[2] - b[2];
    const acx = c[0] - a[0];
    const acz = c[2] - a[2];
    const ab = Math.hypot(abx, abz);
    const bc = Math.hypot(bcx, bcz);
    const ac = Math.hypot(acx, acz);
    const area2 = Math.abs(abx * bcz - abz * bcx);
    if (area2 > 1e-5 && ab > 0.01 && bc > 0.01 && ac > 0.01) {
      const r = (ab * bc * ac) / (2 * area2);
      if (r < minCurveRadiusMeters) minCurveRadiusMeters = r;
    }
  }

  // Evaluate exact untrimmed endpoint frames for port tangents
  const startRawFrame = splBuildGravityFrame(
    splEvalCubic(spec, 0),
    splEvalCubicDerivative(spec, 0.001),
    [0, 1, 0],
    spec.bankingStartRad
  );
  const endRawFrame = splBuildGravityFrame(
    splEvalCubic(spec, 1),
    splEvalCubicDerivative(spec, 0.999),
    [0, 1, 0],
    spec.bankingEndRad
  );

  return {
    spec,
    frames,
    startRawFrame,
    endRawFrame,
    lengthMeters: infraRound(totalLength, 4),
    trimmedLengthMeters: infraRound(trimmedLength, 4),
    trimStartMeters: infraRound(startS, 4),
    trimEndMeters: infraRound(totalLength - endS, 4),
    maxGradeRatio: infraRound(maxGradeRatio, 4),
    minCurveRadiusMeters: Number.isFinite(minCurveRadiusMeters) ? infraRound(minCurveRadiusMeters, 2) : null,
    boundsXZ: { minX, maxX, minZ, maxZ }
  };
}
