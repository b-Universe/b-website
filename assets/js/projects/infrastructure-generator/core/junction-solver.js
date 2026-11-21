import { INFRA_DEFAULTS } from '../config.js';
import {
  infraClamp,
  infraLineIntersect2D,
  infraRound,
  infraVec2Cross,
  infraVec2Dist,
  infraVec2Dot,
  infraVec2Norm
} from '../utils.js';
import { infraFindNode, infraGetAttachedEdges } from './network-graph.js';

function juncExtractLegMetrics(edge, node, profile) {
  const isStart = edge.startNodeId === node.id;
  const otherId = isStart ? edge.endNodeId : edge.startNodeId;

  let leftDrivable = 0;
  let rightDrivable = 0;
  let leftCurb = 0;
  let rightCurb = 0;
  let leftSw = 0;
  let rightSw = 0;

  for (const s of profile.strips) {
    const c = s.xCenter;
    if (s.kind === 'vehicle_lane' || s.kind === 'bus_lane' || s.kind === 'shoulder' || s.kind === 'median' || s.kind === 'tram_embedded') {
      if (isStart) {
        if (c < 0) leftDrivable = Math.max(leftDrivable, -s.xLeft);
        else rightDrivable = Math.max(rightDrivable, s.xRight);
      } else {
        if (c > 0) leftDrivable = Math.max(leftDrivable, s.xRight);
        else rightDrivable = Math.max(rightDrivable, -s.xLeft);
      }
    } else if (s.kind === 'curb') {
      if (isStart) {
        if (c < 0) leftCurb += s.widthMeters;
        else rightCurb += s.widthMeters;
      } else {
        if (c > 0) leftCurb += s.widthMeters;
        else rightCurb += s.widthMeters;
      }
    } else if (s.kind === 'sidewalk') {
      if (isStart) {
        if (c < 0) leftSw += s.widthMeters;
        else rightSw += s.widthMeters;
      } else {
        if (c > 0) leftSw += s.widthMeters;
        else rightSw += s.widthMeters;
      }
    }
  }

  return {
    edgeId: edge.id,
    isStart,
    otherNodeId: otherId,
    leftDrivable: leftDrivable || profile.halfWidthMeters,
    rightDrivable: rightDrivable || profile.halfWidthMeters,
    leftCurb,
    rightCurb,
    leftSidewalk: leftSw,
    rightSidewalk: rightSw,
    curbHeight: profile.curbHeightMeters || 0,
    surfaceMaterial: edge.params?.surfaceMaterial || 'asphalt',
    sidewalkMaterial: edge.params?.sidewalkMaterial || 'concrete',
    wear: Number(edge.params?.wear) || 0.15
  };
}

function juncComputeOutwardDir(edge, node, doc, sampledRawByEdgeId) {
  const samp = sampledRawByEdgeId?.get(edge.id);
  const isStart = edge.startNodeId === node.id;
  if (samp && samp.startRawFrame && samp.endRawFrame) {
    const f = isStart ? samp.startRawFrame : samp.endRawFrame;
    const sign = isStart ? 1 : -1;
    return infraVec2Norm([f.tangent[0] * sign, f.tangent[2] * sign], [1, 0]);
  }
  const other = infraFindNode(doc, isStart ? edge.endNodeId : edge.startNodeId);
  if (!other) return [1, 0];
  return infraVec2Norm([other.position[0] - node.position[0], other.position[2] - node.position[2]], [1, 0]);
}

function juncBuildCornerFillet(nodeXZ, legA, legB, requestedRadius) {
  const u = legA.dirXZ;
  const v = legB.dirXZ;
  // Right of legA points toward legB; Left of legB points toward legA
  const nu = legA.rightXZ;
  const nv = [-legB.rightXZ[0], -legB.rightXZ[1]];

  const crossUV = infraVec2Cross(u, v);
  const dotUV = infraVec2Dot(u, v);
  const angleRad = Math.atan2(crossUV, dotUV);
  const wA = legA.metrics.rightDrivable;
  const wB = legB.metrics.leftDrivable;

  // Nearly collinear back of a T-intersection (~180 deg)
  if (Math.abs(crossUV) < 0.08 && dotUV < -0.5) {
    return {
      kind: 'collinear_back',
      tA: wB + 0.4,
      tB: wA + 0.4,
      arcPoints: [],
      curbOuterPoints: [],
      sidewalkOuterPoints: []
    };
  }

  // Reflex angle (> 180 deg) — connect straight without inverted fillet
  if (crossUV < -0.05) {
    return {
      kind: 'reflex_bevel',
      tA: Math.max(wB, wA) * 1.15,
      tB: Math.max(wB, wA) * 1.15,
      arcPoints: [],
      curbOuterPoints: [],
      sidewalkOuterPoints: []
    };
  }

  const pA = [nodeXZ[0] + nu[0] * wA, nodeXZ[1] + nu[1] * wA];
  const pB = [nodeXZ[0] + nv[0] * wB, nodeXZ[1] + nv[1] * wB];
  const apexHit = infraLineIntersect2D(pA, u, pB, v);
  if (!apexHit) {
    return {
      kind: 'collinear_back',
      tA: wB + 0.4,
      tB: wA + 0.4,
      arcPoints: [],
      curbOuterPoints: [],
      sidewalkOuterPoints: []
    };
  }

  const phi = Math.abs(angleRad) > 0.05 ? Math.abs(angleRad) : Math.PI * 0.5;
  const tanHalf = Math.max(0.15, Math.tan(phi * 0.5));
  const R = infraClamp(requestedRadius, 0.8, 12.0);
  const d = R / tanHalf;

  const sA = apexHit.t1;
  const sB = apexHit.t2;
  const tA = Math.max(0.4, sA + d);
  const tB = Math.max(0.4, sB + d);

  const tanPtA = [pA[0] + u[0] * tA, pA[1] + u[1] * tA];
  const tanPtB = [pB[0] + v[0] * tB, pB[1] + v[1] * tB];

  // Center lies toward the parcel corner along +nu from tanPtA
  const center = [tanPtA[0] + nu[0] * R, tanPtA[1] + nu[1] * R];
  const startVec = infraVec2Norm([tanPtA[0] - center[0], tanPtA[1] - center[1]], [-nu[0], -nu[1]]);
  const endVec = infraVec2Norm([tanPtB[0] - center[0], tanPtB[1] - center[1]], [-nv[0], -nv[1]]);

  let a0 = Math.atan2(startVec[1], startVec[0]);
  let a1 = Math.atan2(endVec[1], endVec[0]);
  // Ensure shortest sweep direction around center (typically negative delta in atan2)
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  const arcSteps = 6;
  const curbW = Math.max(legA.metrics.rightCurb, legB.metrics.leftCurb);
  const swW = Math.max(legA.metrics.rightSidewalk, legB.metrics.leftSidewalk);

  const pOuterA = [nodeXZ[0] + nu[0] * (wA + curbW + swW), nodeXZ[1] + nu[1] * (wA + curbW + swW)];
  const pOuterB = [nodeXZ[0] + nv[0] * (wB + curbW + swW), nodeXZ[1] + nv[1] * (wB + curbW + swW)];
  const outerApex = infraLineIntersect2D(pOuterA, u, pOuterB, v)?.point || center;

  const arcPoints = [];
  const curbOuterPoints = [];
  const sidewalkOuterPoints = [];

  for (let i = 0; i <= arcSteps; i++) {
    const f = i / arcSteps;
    const ang = a0 + delta * f;
    const radial = [Math.cos(ang), Math.sin(ang)];
    const pAsph = [center[0] + radial[0] * R, center[1] + radial[1] * R];
    arcPoints.push(pAsph);

    if (curbW > 0.01) {
      const rCurbOut = Math.max(0.05, R - curbW);
      curbOuterPoints.push([center[0] + radial[0] * rCurbOut, center[1] + radial[1] * rCurbOut]);
    }

    if (swW > 0.01) {
      const rSw = R - curbW - swW;
      if (rSw >= 0.08) {
        sidewalkOuterPoints.push([center[0] + radial[0] * rSw, center[1] + radial[1] * rSw]);
      } else {
        // Clamp cleanly to outer sidewalk intersection apex so sidewalks never self-intersect
        sidewalkOuterPoints.push([outerApex[0], outerApex[1]]);
      }
    }
  }

  return {
    kind: 'fillet',
    tA,
    tB,
    radius: R,
    center,
    tanPtA,
    tanPtB,
    arcPoints,
    curbOuterPoints,
    sidewalkOuterPoints,
    curbW,
    swW
  };
}

function juncSampleRawEnd(rawSamp, isStart, trimMeters, fallbackPosXZ, fallbackDirXZ, fallbackRightXZ) {
  const frames = rawSamp?.frames;
  if (!frames?.length) {
    return {
      endXZ: [fallbackPosXZ[0] + fallbackDirXZ[0] * trimMeters, fallbackPosXZ[1] + fallbackDirXZ[1] * trimMeters],
      rightXZ: fallbackRightXZ
    };
  }
  const targetS = isStart ? trimMeters : Math.max(0, (rawSamp.lengthMeters || frames[frames.length - 1].s) - trimMeters);
  let f = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (targetS >= a.s && targetS <= b.s) {
      const span = Math.max(1e-4, b.s - a.s);
      const t = (targetS - a.s) / span;
      const rx = a.right[0] + (b.right[0] - a.right[0]) * t;
      const rz = a.right[2] + (b.right[2] - a.right[2]) * t;
      const rl = Math.hypot(rx, rz) || 1;
      const rNorm = [rx / rl, rz / rl];
      const dotR = rNorm[0] * fallbackRightXZ[0] + rNorm[1] * fallbackRightXZ[1];
      return {
        endXZ: [
          a.position[0] + (b.position[0] - a.position[0]) * t,
          a.position[2] + (b.position[2] - a.position[2]) * t
        ],
        rightXZ: dotR >= 0 ? rNorm : [-rNorm[0], -rNorm[1]]
      };
    }
  }
  return {
    endXZ: [f.position[0], f.position[2]],
    rightXZ: fallbackRightXZ
  };
}

function juncSolveRailSwitch(node, legs, edgeTrimMap, sampledRawByEdgeId) {
  const nodeXZ = [node.position[0], node.position[2]];
  const nodeY = node.position[1];
  const reasons = [];

  if (legs.length > 4) {
    reasons.push(`Rail switch degree ${legs.length} exceeds limit (3 or 4 legs)`);
  }
  const modes = new Set(legs.map((l) => l.edge.elevationMode || 'grade'));
  if (modes.size > 1) {
    reasons.push('Switch mixes incompatible elevation modes');
  }
  const gauges = new Set(legs.map((l) => infraRound(l.profile?.trackGauge || 1.435, 3)));
  if (gauges.size > 1) {
    reasons.push(`Switch mixes incompatible track gauges (${Array.from(gauges).join('m vs ')}m)`);
  }

  let minInterLegDeg = 180;
  for (let i = 0; i < legs.length; i++) {
    const a = legs[i];
    const b = legs[(i + 1) % legs.length];
    let dAng = (b.angle - a.angle) * (180 / Math.PI);
    if (dAng <= 0) dAng += 360;
    if (dAng < minInterLegDeg) minInterLegDeg = dAng;
  }
  if (minInterLegDeg < 8) {
    reasons.push(`Switch divergence angle ${infraRound(minInterLegDeg, 1)}deg (< 8deg minimum)`);
  }

  if (reasons.length > 0) {
    const maxHalfW = Math.max(...legs.map((l) => l.profile.halfWidthMeters));
    const safePullback = maxHalfW * 2.2;
    for (const leg of legs) {
      const trim = Math.min(safePullback, leg.chordLen * 0.45);
      const rec = edgeTrimMap.get(leg.edge.id);
      if (leg.metrics.isStart) rec.trimStartMeters = Math.max(rec.trimStartMeters, trim);
      else rec.trimEndMeters = Math.max(rec.trimEndMeters, trim);
    }
    return {
      id: `sw_${node.id}`,
      nodeId: node.id,
      domain: node.domain || 'rail',
      position: [...node.position],
      elevationMode: node.elevationMode,
      junctionType: 'unsupported_switch',
      geometryStatus: 'unsupported_reported',
      statusReason: reasons.join('; '),
      legs: legs.map((l) => ({ edgeId: l.edge.id, angleDeg: infraRound(l.angle * (180 / Math.PI), 1) })),
      corePolygonXZ: [],
      laneConnections: []
    };
  }

  // Compute pullback trim per leg based on neighboring divergence angle so ballast strips never overlap
  for (let i = 0; i < legs.length; i++) {
    const prev = legs[(i - 1 + legs.length) % legs.length];
    const curr = legs[i];
    const next = legs[(i + 1) % legs.length];
    const angPrev = Math.acos(infraClamp(infraVec2Dot(prev.dirXZ, curr.dirXZ), -1, 1));
    const angNext = Math.acos(infraClamp(infraVec2Dot(curr.dirXZ, next.dirXZ), -1, 1));
    const minNeighborRad = Math.min(angPrev, angNext);
    const halfW = curr.profile.halfWidthMeters;
    const rawTrim = halfW / Math.max(0.15, Math.tan(minNeighborRad * 0.5)) + 1.2;
    const trim = infraRound(infraClamp(rawTrim, 3.2, curr.chordLen * 0.44), 4);
    curr.coreTrim = trim;

    const rawSamp = sampledRawByEdgeId?.get(curr.edge.id);
    const snapped = juncSampleRawEnd(rawSamp, curr.metrics.isStart, trim, nodeXZ, curr.dirXZ, curr.rightXZ);
    curr.endXZ = snapped.endXZ;
    curr.endRightXZ = snapped.rightXZ;

    const rec = edgeTrimMap.get(curr.edge.id);
    if (curr.metrics.isStart) rec.trimStartMeters = Math.max(rec.trimStartMeters, trim);
    else rec.trimEndMeters = Math.max(rec.trimEndMeters, trim);
  }

  // Build single unified ballast polygon around switch throat aligned flush to each trimmed edge end
  const corePolygonXZ = [];
  for (const leg of legs) {
    const hw = leg.profile.halfWidthMeters;
    const ep = leg.endXZ || [nodeXZ[0] + leg.dirXZ[0] * leg.coreTrim, nodeXZ[1] + leg.dirXZ[1] * leg.coreTrim];
    const r = leg.endRightXZ || leg.rightXZ;
    corePolygonXZ.push(
      [ep[0] - r[0] * hw, ep[1] - r[1] * hw],
      [ep[0] + r[0] * hw, ep[1] + r[1] * hw]
    );
  }

  // Identify trunk vs normal vs reverse legs on 3-way turnout
  let trunkLeg = legs[0];
  let normalLeg = legs[1];
  let reverseLeg = legs[2] || null;
  let switchKind = legs.length === 4 ? 'diamond_crossing' : 'wye';

  if (legs.length === 3) {
    let bestOppDot = -2;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === j) continue;
        const d = infraVec2Dot([-legs[i].dirXZ[0], -legs[i].dirXZ[1]], legs[j].dirXZ);
        if (d > bestOppDot) {
          bestOppDot = d;
          trunkLeg = legs[i];
          normalLeg = legs[j];
          reverseLeg = legs.find((_, idx) => idx !== i && idx !== j);
        }
      }
    }
    const cross = infraVec2Cross([-trunkLeg.dirXZ[0], -trunkLeg.dirXZ[1]], reverseLeg.dirXZ);
    switchKind = bestOppDot > 0.85 ? (cross < 0 ? 'left_turnout' : 'right_turnout') : 'wye';
  }

  const activeState = node.params?.switchState === 'reverse' ? 'reverse' : 'normal';
  const refEdge = trunkLeg.edge;
  const refProf = trunkLeg.profile;
  const ballastTopY = refProf.strips.find((s) => s.kind === 'rail_bed')?.elevationOffsetMeters ?? 0;

  const branches = legs.length === 3
    ? [
        { state: 'normal', fromEdgeId: trunkLeg.edge.id, toEdgeId: normalLeg.edge.id, active: activeState === 'normal' },
        { state: 'reverse', fromEdgeId: trunkLeg.edge.id, toEdgeId: reverseLeg.edge.id, active: activeState === 'reverse' }
      ]
    : [
        { state: 'normal', fromEdgeId: legs[0].edge.id, toEdgeId: legs[2].edge.id, active: true },
        { state: 'cross', fromEdgeId: legs[1].edge.id, toEdgeId: legs[3].edge.id, active: true }
      ];

  return {
    id: `sw_${node.id}`,
    nodeId: node.id,
    domain: node.domain || 'rail',
    position: [nodeXZ[0], nodeY, nodeXZ[1]],
    elevationMode: node.elevationMode,
    junctionType: switchKind,
    geometryStatus: 'valid',
    statusReason: null,
    ballastMaterial: refEdge.params?.ballastMaterial || 'ballast_granite',
    sleeperMaterial: refEdge.params?.sleeperMaterial || 'wood',
    ballastTopY,
    trackGauge: refProf.trackGauge || 1.435,
    trackOffsets: refProf.trackCenterOffsets || [0],
    railHeight: refEdge.params?.railHeight || 0.17,
    wear: Number(refEdge.params?.wear) || 0.2,
    legs: legs.map((l) => ({
      edgeId: l.edge.id,
      coreTrimMeters: l.coreTrim,
      dirXZ: l.dirXZ,
      rightXZ: l.endRightXZ || l.rightXZ,
      endXZ: l.endXZ || [nodeXZ[0] + l.dirXZ[0] * l.coreTrim, nodeXZ[1] + l.dirXZ[1] * l.coreTrim],
      angleDeg: infraRound(l.angle * (180 / Math.PI), 1)
    })),
    corePolygonXZ,
    switchMetadata: {
      switchKind,
      activeState,
      trunkEdgeId: trunkLeg.edge.id,
      normalEdgeId: normalLeg.edge.id,
      reverseEdgeId: reverseLeg?.edge.id || null,
      branches
    },
    laneConnections: branches.map((b) => ({
      fromEdgeId: b.fromEdgeId,
      toEdgeId: b.toEdgeId,
      turnKind: b.state === 'reverse' ? 'branch_diverge' : 'straight',
      switchState: b.state
    }))
  };
}

export function infraSolveJunctions(doc, profilesByEdgeId, sampledRawByEdgeId) {
  const junctions = [];
  const connectorBends = [];
  const edgeTrimMap = new Map();

  for (const edge of doc.edges || []) {
    edgeTrimMap.set(edge.id, { trimStartMeters: 0, trimEndMeters: 0 });
  }

  for (const node of doc.nodes || []) {
    const attached = infraGetAttachedEdges(doc, node.id);
    if (attached.length === 2) {
      const eA = attached[0];
      const eB = attached[1];
      const skipBend =
        eA.domain === 'power' ||
        eA.domain === 'telecom' ||
        eA.domain === 'pipe' ||
        eA.domain === 'cableway' ||
        eA.domain === 'waterway' ||
        eA.elevationMode === 'underground';
      if (!skipBend && eA.domain === eB.domain && (eA.elevationMode || 'grade') === (eB.elevationMode || 'grade')) {
        const dirAOut = juncComputeOutwardDir(eA, node, doc, sampledRawByEdgeId);
        const dirBOut = juncComputeOutwardDir(eB, node, doc, sampledRawByEdgeId);
        // Incoming vector into node from eA is -dirAOut; outgoing along eB is +dirBOut
        const dotDefl = infraVec2Dot([-dirAOut[0], -dirAOut[1]], dirBOut);
        if (dotDefl < 0.99998) {
          const defl = Math.acos(infraClamp(dotDefl, -0.9999, 0.9999));
          if (defl < 2.35) {
            const profA = profilesByEdgeId.get(eA.id);
            const profB = profilesByEdgeId.get(eB.id);
            const otherA = infraFindNode(doc, eA.startNodeId === node.id ? eA.endNodeId : eA.startNodeId);
            const otherB = infraFindNode(doc, eB.startNodeId === node.id ? eB.endNodeId : eB.startNodeId);
            const nodeXZ = [node.position[0], node.position[2]];
            const lenA = otherA ? infraVec2Dist(nodeXZ, [otherA.position[0], otherA.position[2]]) : 20;
            const lenB = otherB ? infraVec2Dist(nodeXZ, [otherB.position[0], otherB.position[2]]) : 20;
            const maxHalfW = Math.max(profA?.halfWidthMeters || 3.2, profB?.halfWidthMeters || 3.2);
            const trim = Math.min(Math.min(lenA, lenB) * 0.35, maxHalfW * Math.tan(defl * 0.5) + 0.65);

            if (trim > 0.05) {
              const recA = edgeTrimMap.get(eA.id);
              const recB = edgeTrimMap.get(eB.id);
              if (eA.startNodeId === node.id) recA.trimStartMeters = Math.max(recA.trimStartMeters, trim);
              else recA.trimEndMeters = Math.max(recA.trimEndMeters, trim);
              if (eB.startNodeId === node.id) recB.trimStartMeters = Math.max(recB.trimStartMeters, trim);
              else recB.trimEndMeters = Math.max(recB.trimEndMeters, trim);

              connectorBends.push({
                id: `bend_${node.id}`,
                nodeId: node.id,
                domain: eA.domain || 'road',
                position: [...node.position],
                elevationMode: eA.elevationMode || 'grade',
                edgeAId: eA.id,
                edgeBId: eB.id,
                aEnterAtEnd: eA.endNodeId === node.id,
                bExitAtStart: eB.startNodeId === node.id,
                trimMeters: infraRound(trim, 4)
              });
            }
          }
        }
      }
      continue;
    }

    if (attached.length < 3) {
      continue;
    }

    const nodeXZ = [node.position[0], node.position[2]];
    const nodeY = node.position[1];
    const legs = attached.map((edge) => {
      const prof = profilesByEdgeId.get(edge.id);
      const dirXZ = juncComputeOutwardDir(edge, node, doc, sampledRawByEdgeId);
      const rightXZ = [-dirXZ[1], dirXZ[0]];
      const angle = Math.atan2(dirXZ[1], dirXZ[0]);
      const other = infraFindNode(doc, edge.startNodeId === node.id ? edge.endNodeId : edge.startNodeId);
      const chordLen = other ? infraVec2Dist(nodeXZ, [other.position[0], other.position[2]]) : 20;
      return {
        edge,
        profile: prof,
        dirXZ,
        rightXZ,
        angle,
        chordLen,
        otherY: other ? other.position[1] : nodeY,
        metrics: juncExtractLegMetrics(edge, node, prof)
      };
    });

    legs.sort((a, b) => a.angle - b.angle);

    // Dispatch rail & tram switch turnouts / diamond crossings to rail switch solver
    if (legs.every((l) => l.edge.domain === 'rail' || l.edge.domain === 'tram')) {
      junctions.push(juncSolveRailSwitch(node, legs, edgeTrimMap, sampledRawByEdgeId));
      continue;
    }

    // Check road junction feasibility rules transparently
    const reasons = [];
    if (legs.length > 4) {
      reasons.push(`Intersection degree ${legs.length} exceeds Milestone 1 solver limit (3 or 4 legs)`);
    }
    if (legs.some((l) => l.edge.domain !== 'road')) {
      reasons.push('Mixed non-road domain leg in road junction');
    }

    let minInterLegDeg = 180;
    for (let i = 0; i < legs.length; i++) {
      const a = legs[i];
      const b = legs[(i + 1) % legs.length];
      let dAng = (b.angle - a.angle) * (180 / Math.PI);
      if (dAng <= 0) dAng += 360;
      if (dAng < minInterLegDeg) minInterLegDeg = dAng;
    }
    if (minInterLegDeg < 38) {
      reasons.push(`Acute leg angle ${infraRound(minInterLegDeg, 1)}deg (< 38deg minimum) cannot form clean curb returns`);
    }

    const modes = new Set(legs.map((l) => l.edge.elevationMode || 'grade'));
    if (modes.size > 1) {
      reasons.push('Junction mixes incompatible elevation modes (e.g., grade and elevated)');
    }

    if (reasons.length > 0) {
      // Safe fallback: pull legs back past minimum inter-leg geometric overlap without emitting overlapping slabs
      const maxHalfW = Math.max(...legs.map((l) => l.profile.halfWidthMeters));
      const minHalfAngleRad = Math.max(0.22, ((minInterLegDeg * Math.PI) / 180) * 0.5);
      const safePullback = maxHalfW / Math.tan(minHalfAngleRad) + 0.5;
      for (const leg of legs) {
        const trim = Math.min(safePullback, leg.chordLen * 0.82);
        const rec = edgeTrimMap.get(leg.edge.id);
        if (leg.metrics.isStart) rec.trimStartMeters = Math.max(rec.trimStartMeters, trim);
        else rec.trimEndMeters = Math.max(rec.trimEndMeters, trim);
      }
      junctions.push({
        id: `junc_${node.id}`,
        nodeId: node.id,
        position: [...node.position],
        elevationMode: node.elevationMode,
        junctionType: legs.length > 4 ? 'multi' : 'skewed',
        geometryStatus: 'unsupported_reported',
        statusReason: reasons.join('; '),
        legs: legs.map((l) => ({ edgeId: l.edge.id, angleDeg: infraRound(l.angle * (180 / Math.PI), 1) })),
        corePolygonXZ: [],
        crosswalkAprons: [],
        sidewalkAprons: [],
        cornerFillets: [],
        laneConnections: []
      });
      continue;
    }

    const cornerRadius = Number.isFinite(Number(node.params?.cornerRadius))
      ? Number(node.params.cornerRadius)
      : INFRA_DEFAULTS.cornerRadiusMeters;
    const includeCrosswalks = node.params?.includeCrosswalks !== false;
    const crosswalkDepth = includeCrosswalks
      ? infraClamp(node.params?.crosswalkDepth ?? INFRA_DEFAULTS.crosswalkDepthMeters, 1.5, 4.5)
      : 0;

    // Solve corner fillets between adjacent sorted legs (leg[i].right faces leg[next].left)
    const corners = [];
    for (let i = 0; i < legs.length; i++) {
      const legA = legs[i];
      const legB = legs[(i + 1) % legs.length];
      corners.push(juncBuildCornerFillet(nodeXZ, legA, legB, cornerRadius));
    }

    let legTooShort = false;
    for (let i = 0; i < legs.length; i++) {
      const prevCorner = corners[(i - 1 + legs.length) % legs.length];
      const nextCorner = corners[i];
      const requiredCoreTrim = Math.max(prevCorner.tB, nextCorner.tA) + 0.15;
      const desiredEdgeTrim = requiredCoreTrim + crosswalkDepth;
      const maxAllowed = Math.max(0.5, legs[i].chordLen * 0.42);
      if (desiredEdgeTrim > maxAllowed) legTooShort = true;

      const clampedEdgeTrim = Math.min(desiredEdgeTrim, maxAllowed);
      const clampedCoreTrim = Math.min(requiredCoreTrim, Math.max(0.4, clampedEdgeTrim - (includeCrosswalks ? Math.min(crosswalkDepth, clampedEdgeTrim * 0.35) : 0)));

      legs[i].coreTrim = infraRound(clampedCoreTrim, 4);
      legs[i].edgeTrim = infraRound(clampedEdgeTrim, 4);

      const rec = edgeTrimMap.get(legs[i].edge.id);
      if (legs[i].metrics.isStart) rec.trimStartMeters = Math.max(rec.trimStartMeters, legs[i].edgeTrim);
      else rec.trimEndMeters = Math.max(rec.trimEndMeters, legs[i].edgeTrim);
    }

    // Build single non-overlapping core asphalt polygon around perimeter
    const corePolygonXZ = [];
    const crosswalkAprons = [];
    const sidewalkAprons = [];
    const cornerFillets = [];

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const corner = corners[i];
      const u = leg.dirXZ;
      const r = leg.rightXZ;
      const wL = leg.metrics.leftDrivable;
      const wR = leg.metrics.rightDrivable;

      const pCoreLeft = [nodeXZ[0] + u[0] * leg.coreTrim - r[0] * wL, nodeXZ[1] + u[1] * leg.coreTrim - r[1] * wL];
      const pCoreRight = [nodeXZ[0] + u[0] * leg.coreTrim + r[0] * wR, nodeXZ[1] + u[1] * leg.coreTrim + r[1] * wR];

      corePolygonXZ.push(pCoreLeft, pCoreRight);

      if (corner.kind === 'fillet' && corner.arcPoints.length) {
        for (const pt of corner.arcPoints) {
          corePolygonXZ.push(pt);
        }
        const legNext = legs[(i + 1) % legs.length];
        cornerFillets.push({
          cornerIndex: i,
          legAEdgeId: leg.edge.id,
          legBEdgeId: legNext.edge.id,
          pCoreRightA: pCoreRight,
          pCoreLeftB: [
            nodeXZ[0] + legNext.dirXZ[0] * legNext.coreTrim - legNext.rightXZ[0] * legNext.metrics.leftDrivable,
            nodeXZ[1] + legNext.dirXZ[1] * legNext.coreTrim - legNext.rightXZ[1] * legNext.metrics.leftDrivable
          ],
          tanPtA: corner.tanPtA,
          tanPtB: corner.tanPtB,
          arcPoints: corner.arcPoints,
          curbOuterPoints: corner.curbOuterPoints,
          sidewalkOuterPoints: corner.sidewalkOuterPoints,
          curbW: corner.curbW,
          swW: corner.swW,
          curbHeight: Math.max(leg.metrics.curbHeight, legNext.metrics.curbHeight),
          sidewalkMaterial: leg.metrics.sidewalkMaterial,
          rightVecA: r,
          leftVecB: [-legNext.rightXZ[0], -legNext.rightXZ[1]]
        });
      }

      // Crosswalk & flanking sidewalk aprons along [coreTrim .. edgeTrim] (zero overlap with core OR road segment!)
      if (leg.edgeTrim > leg.coreTrim + 0.05) {
        const pEdgeLeft = [nodeXZ[0] + u[0] * leg.edgeTrim - r[0] * wL, nodeXZ[1] + u[1] * leg.edgeTrim - r[1] * wL];
        const pEdgeRight = [nodeXZ[0] + u[0] * leg.edgeTrim + r[0] * wR, nodeXZ[1] + u[1] * leg.edgeTrim + r[1] * wR];

        crosswalkAprons.push({
          edgeId: leg.edge.id,
          cornersXZ: [pCoreLeft, pCoreRight, pEdgeRight, pEdgeLeft],
          widthMeters: wL + wR,
          depthMeters: leg.edgeTrim - leg.coreTrim,
          surfaceMaterial: leg.metrics.surfaceMaterial,
          wear: leg.metrics.wear
        });

        // Left flanking curb + sidewalk apron
        if (leg.metrics.leftCurb > 0.01) {
          const inner = wL;
          const outer = wL + leg.metrics.leftCurb;
          sidewalkAprons.push({
            kind: 'curb',
            curbHeight: leg.metrics.curbHeight,
            material: 'curb_stone',
            innerStart: pCoreLeft,
            innerEnd: pEdgeLeft,
            outerStart: [nodeXZ[0] + u[0] * leg.coreTrim - r[0] * outer, nodeXZ[1] + u[1] * leg.coreTrim - r[1] * outer],
            outerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim - r[0] * outer, nodeXZ[1] + u[1] * leg.edgeTrim - r[1] * outer],
            isLeft: true
          });
          if (leg.metrics.leftSidewalk > 0.01) {
            const swOut = outer + leg.metrics.leftSidewalk;
            sidewalkAprons.push({
              kind: 'sidewalk',
              curbHeight: leg.metrics.curbHeight,
              material: leg.metrics.sidewalkMaterial,
              innerStart: [nodeXZ[0] + u[0] * leg.coreTrim - r[0] * outer, nodeXZ[1] + u[1] * leg.coreTrim - r[1] * outer],
              innerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim - r[0] * outer, nodeXZ[1] + u[1] * leg.edgeTrim - r[1] * outer],
              outerStart: [nodeXZ[0] + u[0] * leg.coreTrim - r[0] * swOut, nodeXZ[1] + u[1] * leg.coreTrim - r[1] * swOut],
              outerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim - r[0] * swOut, nodeXZ[1] + u[1] * leg.edgeTrim - r[1] * swOut],
              isLeft: true
            });
          }
        }

        // Right flanking curb + sidewalk apron
        if (leg.metrics.rightCurb > 0.01) {
          const outer = wR + leg.metrics.rightCurb;
          sidewalkAprons.push({
            kind: 'curb',
            curbHeight: leg.metrics.curbHeight,
            material: 'curb_stone',
            innerStart: pCoreRight,
            innerEnd: pEdgeRight,
            outerStart: [nodeXZ[0] + u[0] * leg.coreTrim + r[0] * outer, nodeXZ[1] + u[1] * leg.coreTrim + r[1] * outer],
            outerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim + r[0] * outer, nodeXZ[1] + u[1] * leg.edgeTrim + r[1] * outer],
            isLeft: false
          });
          if (leg.metrics.rightSidewalk > 0.01) {
            const swOut = outer + leg.metrics.rightSidewalk;
            sidewalkAprons.push({
              kind: 'sidewalk',
              curbHeight: leg.metrics.curbHeight,
              material: leg.metrics.sidewalkMaterial,
              innerStart: [nodeXZ[0] + u[0] * leg.coreTrim + r[0] * outer, nodeXZ[1] + u[1] * leg.coreTrim + r[1] * outer],
              innerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim + r[0] * outer, nodeXZ[1] + u[1] * leg.edgeTrim + r[1] * outer],
              outerStart: [nodeXZ[0] + u[0] * leg.coreTrim + r[0] * swOut, nodeXZ[1] + u[1] * leg.coreTrim + r[1] * swOut],
              outerEnd: [nodeXZ[0] + u[0] * leg.edgeTrim + r[0] * swOut, nodeXZ[1] + u[1] * leg.edgeTrim + r[1] * swOut],
              isLeft: false
            });
          }
        }
      }
    }

    // Build semantic lane-to-lane connection metadata
    const laneConnections = [];
    for (let i = 0; i < legs.length; i++) {
      for (let j = 0; j < legs.length; j++) {
        if (i === j) continue;
        const a = legs[i];
        const b = legs[j];
        const cross = infraVec2Cross(a.dirXZ, b.dirXZ);
        const dot = infraVec2Dot(a.dirXZ, b.dirXZ);
        const turnKind = dot < -0.7 ? 'straight' : (cross > 0 ? 'left' : 'right');
        laneConnections.push({
          fromEdgeId: a.edge.id,
          toEdgeId: b.edge.id,
          turnKind,
          crosswalkProtected: includeCrosswalks
        });
      }
    }

    // Detect opposing legs carrying embedded streetcar/tram tracks across this road intersection
    const tramPassThroughs = [];
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        const lA = legs[i];
        const lB = legs[j];
        if (!lA.profile?.hasEmbeddedTram || !lB.profile?.hasEmbeddedTram) continue;
        if (infraVec2Dot(lA.dirXZ, lB.dirXZ) < -0.5) {
          tramPassThroughs.push({
            fromEdgeId: lA.edge.id,
            toEdgeId: lB.edge.id,
            pStartXZ: [nodeXZ[0] + lA.dirXZ[0] * lA.edgeTrim, nodeXZ[1] + lA.dirXZ[1] * lA.edgeTrim],
            dirStartXZ: [-lA.dirXZ[0], -lA.dirXZ[1]],
            rightStartXZ: [-lA.rightXZ[0], -lA.rightXZ[1]],
            pEndXZ: [nodeXZ[0] + lB.dirXZ[0] * lB.edgeTrim, nodeXZ[1] + lB.dirXZ[1] * lB.edgeTrim],
            dirEndXZ: lB.dirXZ,
            rightEndXZ: lB.rightXZ,
            trackOffsets: lA.profile.tramTrackOffsets || [0],
            gaugeMeters: lA.profile.tramGaugeMeters || 1.435
          });
        }
      }
    }

    const jType = legs.length === 4 ? 'four_way' : (minInterLegDeg > 68 ? 't' : 'y');
    junctions.push({
      id: `junc_${node.id}`,
      nodeId: node.id,
      domain: 'road',
      position: [...node.position],
      elevationMode: node.elevationMode,
      junctionType: jType,
      geometryStatus: legTooShort ? 'constrained_warning' : 'valid',
      statusReason: legTooShort ? 'One or more road legs are short; junction aprons were clamped proportionally' : null,
      primaryMaterial: legs[0].metrics.surfaceMaterial,
      wear: legs[0].metrics.wear,
      legs: legs.map((l) => ({
        edgeId: l.edge.id,
        coreTrimMeters: l.coreTrim,
        edgeTrimMeters: l.edgeTrim,
        angleDeg: infraRound(l.angle * (180 / Math.PI), 1)
      })),
      corePolygonXZ,
      crosswalkAprons,
      sidewalkAprons,
      cornerFillets,
      tramPassThroughs,
      laneConnections
    });
  }

  return { junctions, connectorBends, edgeTrimMap };
}
