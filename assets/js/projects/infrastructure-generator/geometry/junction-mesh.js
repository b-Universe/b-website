import { INFRA_DEFAULTS } from '../config.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function jmeshEmitQuadXZUp(batcher, p0, p1, p2, p3, y, options) {
  const a = p0;
  const b = p1;
  const c = p2;
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (cross <= 0) {
    batcher.addQuad([p0[0], y, p0[1]], [p1[0], y, p1[1]], [p2[0], y, p2[1]], [p3[0], y, p3[1]], {
      ...options,
      normal: [0, 1, 0],
      expectUpwardNormals: true
    });
  } else {
    batcher.addQuad([p0[0], y, p0[1]], [p3[0], y, p3[1]], [p2[0], y, p2[1]], [p1[0], y, p1[1]], {
      ...options,
      normal: [0, 1, 0],
      expectUpwardNormals: true,
      uvs: options.uvs ? [options.uvs[0], options.uvs[3], options.uvs[2], options.uvs[1]] : undefined
    });
  }
}

function jmeshEmitCurbFace(batcher, p0, p1, yBot, yTop, towardRoadXZ) {
  const dx = p1[0] - p0[0];
  const dz = p1[1] - p0[1];
  const dot = dz * towardRoadXZ[0] - dx * towardRoadXZ[1];
  const opts = { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' };
  if (dot >= 0) {
    batcher.addQuad([p0[0], yBot, p0[1]], [p0[0], yTop, p0[1]], [p1[0], yTop, p1[1]], [p1[0], yBot, p1[1]], opts);
  } else {
    batcher.addQuad([p0[0], yTop, p0[1]], [p0[0], yBot, p0[1]], [p1[0], yBot, p1[1]], [p1[0], yTop, p1[1]], opts);
  }
}

export function geoBuildJunction(batcher, junc, doc) {
  if (!junc || junc.geometryStatus === 'unsupported_reported') return;
  if (!junc.corePolygonXZ || junc.corePolygonXZ.length < 3) return;

  const y = junc.position[1];
  const roadMat = junc.primaryMaterial || 'asphalt';

  // 1. Single trimmed core intersection asphalt polygon
  batcher.addHorizontalPolygonXZ(junc.corePolygonXZ, y, {
    layer: 'LayerA_PrimaryStructure',
    materialKey: roadMat,
    surfaceStratum: 'top_surface',
    uvScale: 0.2
  });

  // 2. Non-overlapping flush crosswalk aprons per leg
  for (const cw of junc.crosswalkAprons || []) {
    const [c0, c1, c2, c3] = cw.cornersXZ;
    const edge = (doc?.edges || []).find((e) => e.id === cw.edgeId);
    const laneCount = edge?.params?.laneCount || 2;
    const cwMat = `cw|${cw.surfaceMaterial || roadMat}|${laneCount}`;
    jmeshEmitQuadXZUp(batcher, c0, c1, c2, c3, y, {
      layer: 'LayerC_MarkingsAndSurface',
      materialKey: cwMat,
      surfaceStratum: 'top_surface',
      uvs: [[0, 0], [1, 0], [1, 1], [0, 1]]
    });
  }

  // 3. Flanking curb & sidewalk aprons along [coreTrim .. edgeTrim]
  for (const ap of junc.sidewalkAprons || []) {
    const topY = y + (ap.curbHeight || 0.15);
    jmeshEmitQuadXZUp(
      batcher,
      ap.innerStart,
      ap.outerStart,
      ap.outerEnd,
      ap.innerEnd,
      topY,
      {
        layer: 'LayerA_PrimaryStructure',
        materialKey: ap.material || 'sidewalk',
        surfaceStratum: 'top_surface',
        uvs: [[0, 0], [0.5, 0], [0.5, 1], [0, 1]]
      }
    );

    if (ap.kind === 'curb' && ap.curbHeight > 0.01) {
      const dx = ap.innerEnd[0] - ap.innerStart[0];
      const dz = ap.innerEnd[1] - ap.innerStart[1];
      const towardRoad = ap.isLeft ? [-dz, dx] : [dz, -dx];
      jmeshEmitCurbFace(batcher, ap.innerStart, ap.innerEnd, y, topY, towardRoad);
    }
  }

  // 4. Curved corner curb returns & continuous corner sidewalks
  for (const cf of junc.cornerFillets || []) {
    const arc = cf.arcPoints || [];
    const curbOut = cf.curbOuterPoints || [];
    const swOut = cf.sidewalkOuterPoints || [];
    const curbH = cf.curbHeight || 0.15;
    const topY = y + curbH;

    const emitStraightExtension = (pStart, pEnd, dirOutVec, swMat) => {
      if (Math.hypot(pEnd[0] - pStart[0], pEnd[1] - pStart[1]) < 0.04) return;
      if (cf.curbW > 0.01) {
        const o0 = [pStart[0] + dirOutVec[0] * cf.curbW, pStart[1] + dirOutVec[1] * cf.curbW];
        const o1 = [pEnd[0] + dirOutVec[0] * cf.curbW, pEnd[1] + dirOutVec[1] * cf.curbW];
        jmeshEmitQuadXZUp(batcher, pStart, o0, o1, pEnd, topY, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'curb_stone',
          surfaceStratum: 'top_surface'
        });
        jmeshEmitCurbFace(batcher, pStart, pEnd, y, topY, [-dirOutVec[0], -dirOutVec[1]]);
        if (cf.swW > 0.01) {
          const s0 = [o0[0] + dirOutVec[0] * cf.swW, o0[1] + dirOutVec[1] * cf.swW];
          const s1 = [o1[0] + dirOutVec[0] * cf.swW, o1[1] + dirOutVec[1] * cf.swW];
          jmeshEmitQuadXZUp(batcher, o0, s0, s1, o1, topY, {
            layer: 'LayerA_PrimaryStructure',
            materialKey: swMat || 'sidewalk',
            surfaceStratum: 'top_surface'
          });
        }
      }
    };

    emitStraightExtension(cf.pCoreRightA, cf.tanPtA, cf.rightVecA, cf.sidewalkMaterial);
    emitStraightExtension(cf.tanPtB, cf.pCoreLeftB, cf.leftVecB, cf.sidewalkMaterial);

    for (let i = 0; i < arc.length - 1; i++) {
      const a0 = arc[i];
      const a1 = arc[i + 1];

      if (curbH > 0.01) {
        const towardRoad = curbOut.length === arc.length
          ? [a0[0] - curbOut[i][0], a0[1] - curbOut[i][1]]
          : [-a0[0], -a0[1]];
        jmeshEmitCurbFace(batcher, a0, a1, y, topY, towardRoad);
      }

      if (curbOut.length === arc.length) {
        const c0 = curbOut[i];
        const c1 = curbOut[i + 1];
        jmeshEmitQuadXZUp(batcher, a0, c0, c1, a1, topY, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'curb_stone',
          surfaceStratum: 'top_surface'
        });

        if (swOut.length === arc.length) {
          const s0 = swOut[i];
          const s1 = swOut[i + 1];
          const degTri = Math.hypot(s0[0] - s1[0], s0[1] - s1[1]) < 1e-4;
          if (degTri) {
            batcher.addHorizontalPolygonXZ([c0, c1, s0], topY, {
              layer: 'LayerA_PrimaryStructure',
              materialKey: cf.sidewalkMaterial || 'sidewalk',
              surfaceStratum: 'top_surface',
              uvScale: 0.25
            });
          } else {
            jmeshEmitQuadXZUp(batcher, c0, s0, s1, c1, topY, {
              layer: 'LayerA_PrimaryStructure',
              materialKey: cf.sidewalkMaterial || 'sidewalk',
              surfaceStratum: 'top_surface'
            });
          }
        }
      }
    }
  }

  // 5. Embedded Streetcar / Tram continuous steel rails across 4-way road junctions
  for (const tp of junc.tramPassThroughs || []) {
    const p0 = tp.pStartXZ;
    const p3 = tp.pEndXZ;
    const dx = p3[0] - p0[0];
    const dz = p3[1] - p0[1];
    const dist = Math.hypot(dx, dz);
    if (dist < 0.5) continue;
    const ctrl = dist * 0.36;
    const p1 = [p0[0] + tp.dirStartXZ[0] * ctrl, p0[1] + tp.dirStartXZ[1] * ctrl];
    const p2 = [p3[0] - tp.dirEndXZ[0] * ctrl, p3[1] - tp.dirEndXZ[1] * ctrl];
    const segs = 8;
    const gauge = tp.gaugeMeters || 1.435;
    const halfRail = 0.04;
    const railTopY = y + 0.026;

    const evalPt = (t) => {
      const omt = 1 - t;
      const omt2 = omt * omt;
      const t2 = t * t;
      return [
        omt2 * omt * p0[0] + 3 * omt2 * t * p1[0] + 3 * omt * t2 * p2[0] + t2 * t * p3[0],
        omt2 * omt * p0[1] + 3 * omt2 * t * p1[1] + 3 * omt * t2 * p2[1] + t2 * t * p3[1]
      ];
    };
    const evalTan = (t) => {
      const omt = 1 - t;
      const vx = 3 * omt * omt * (p1[0] - p0[0]) + 6 * omt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
      const vz = 3 * omt * omt * (p1[1] - p0[1]) + 6 * omt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      const l = Math.hypot(vx, vz) || 1;
      return [vx / l, vz / l];
    };

    const pts = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const xz = evalPt(t);
      const tan = evalTan(t);
      const rApprox = [
        tp.rightStartXZ[0] * (1 - t) + tp.rightEndXZ[0] * t,
        tp.rightStartXZ[1] * (1 - t) + tp.rightEndXZ[1] * t
      ];
      let r = [-tan[1], tan[0]];
      if (r[0] * rApprox[0] + r[1] * rApprox[1] < 0) r = [-r[0], -r[1]];
      pts.push({ xz, r });
    }

    for (const trackOff of tp.trackOffsets || [0]) {
      for (const sign of [-1, 1]) {
        const latCenter = trackOff + sign * gauge * 0.5;
        for (let s = 0; s < segs; s++) {
          const a = pts[s];
          const b = pts[s + 1];
          const aL = [a.xz[0] + a.r[0] * (latCenter - halfRail), a.xz[1] + a.r[1] * (latCenter - halfRail)];
          const aR = [a.xz[0] + a.r[0] * (latCenter + halfRail), a.xz[1] + a.r[1] * (latCenter + halfRail)];
          const bR = [b.xz[0] + b.r[0] * (latCenter + halfRail), b.xz[1] + b.r[1] * (latCenter + halfRail)];
          const bL = [b.xz[0] + b.r[0] * (latCenter - halfRail), b.xz[1] + b.r[1] * (latCenter - halfRail)];
          jmeshEmitQuadXZUp(batcher, aL, aR, bR, bL, railTopY, {
            layer: 'LayerC_MarkingsAndSurface',
            materialKey: 'rail_steel',
            surfaceStratum: 'rail_steel'
          });
          batcher.addQuad(
            [aL[0], y, aL[1]],
            [aL[0], railTopY, aL[1]],
            [bL[0], railTopY, bL[1]],
            [bL[0], y, bL[1]],
            { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'side_wall' }
          );
          batcher.addQuad(
            [aR[0], railTopY, aR[1]],
            [aR[0], y, aR[1]],
            [bR[0], y, bR[1]],
            [bR[0], railTopY, bR[1]],
            { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'side_wall' }
          );
        }
      }
    }
  }
}

function jmeshBuildEmbeddedBendBands(sA) {
  const rails = sA.embeddedRails;
  if (!rails) return [{ kind: 'pavement', xL: sA.xLeft, xR: sA.xRight }];
  const tc = Math.max(1, Number(rails.trackCount) || 1);
  const sp = Number(rails.trackSpacing) || 3.0;
  const g = Number(rails.gaugeMeters) || 1.435;
  const hr = (Number(rails.railWidthMeters) || 0.08) * 0.5;
  const xc = (sA.xLeft + sA.xRight) * 0.5;
  const intervals = [];
  for (let t = 0; t < tc; t++) {
    const cx = xc + (tc === 1 ? 0 : (t - (tc - 1) * 0.5) * sp);
    for (const sign of [-1, 1]) {
      const r0 = Math.max(sA.xLeft + 0.02, cx + sign * g * 0.5 - hr);
      const r1 = Math.min(sA.xRight - 0.02, cx + sign * g * 0.5 + hr);
      if (r1 > r0 + 0.01) intervals.push([r0, r1]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [];
  let c = sA.xLeft;
  for (const [r0, r1] of intervals) {
    if (r0 > c + 0.005) out.push({ kind: 'pavement', xL: c, xR: r0 });
    out.push({ kind: 'rail', xL: r0, xR: r1 });
    c = Math.max(c, r1);
  }
  if (sA.xRight > c + 0.005) out.push({ kind: 'pavement', xL: c, xR: sA.xRight });
  return out;
}

export function geoBuildConnectorBend(batcher, bend, sampA, profA, sampB, profB) {
  if (!bend || !sampA?.frames?.length || !sampB?.frames?.length || !profA || !profB) return;

  const rawFA = bend.aEnterAtEnd ? sampA.frames[sampA.frames.length - 1] : sampA.frames[0];
  const rawFB = bend.bExitAtStart ? sampB.frames[0] : sampB.frames[sampB.frames.length - 1];

  const fA = bend.aEnterAtEnd
    ? rawFA
    : {
        position: rawFA.position,
        tangent: [-rawFA.tangent[0], -rawFA.tangent[1], -rawFA.tangent[2]],
        right: [-rawFA.right[0], -rawFA.right[1], -rawFA.right[2]],
        up: rawFA.up
      };
  const fB = bend.bExitAtStart
    ? rawFB
    : {
        position: rawFB.position,
        tangent: [-rawFB.tangent[0], -rawFB.tangent[1], -rawFB.tangent[2]],
        right: [-rawFB.right[0], -rawFB.right[1], -rawFB.right[2]],
        up: rawFB.up
      };

  const orientStrips = (prof, flipped) => {
    const arr = prof.strips.map((s) => ({
      ...s,
      xLeft: flipped ? -s.xRight : s.xLeft,
      xRight: flipped ? -s.xLeft : s.xRight
    }));
    return flipped ? arr.reverse() : arr;
  };

  const stripsA = orientStrips(profA, !bend.aEnterAtEnd);
  const stripsB = orientStrips(profB, !bend.bExitAtStart);
  const minA = stripsA[0]?.xLeft ?? -profA.halfWidthMeters;
  const maxA = stripsA[stripsA.length - 1]?.xRight ?? profA.halfWidthMeters;
  const minB = stripsB[0]?.xLeft ?? -profB.halfWidthMeters;
  const maxB = stripsB[stripsB.length - 1]?.xRight ?? profB.halfWidthMeters;
  const spanA = Math.max(0.1, maxA - minA);
  const spanB = Math.max(0.1, maxB - minB);

  const ptOn = (f, latX, elevY) => [
    f.position[0] + f.right[0] * latX + f.up[0] * elevY,
    f.position[1] + f.right[1] * latX + f.up[1] * elevY,
    f.position[2] + f.right[2] * latX + f.up[2] * elevY
  ];

  if (
    bend.domain === 'power' ||
    bend.domain === 'telecom' ||
    bend.domain === 'pipe' ||
    bend.domain === 'cableway' ||
    bend.domain === 'waterway' ||
    bend.elevationMode === 'underground'
  ) {
    return;
  }

  // Suspended monorail / straddle monorail structural splice
  if (bend.domain === 'suspended_rail' || bend.domain === 'monorail') {
    const gDepth = Math.max(0.85, profA.strips.find((s) => s.kind === 'guideway_beam')?.elevationOffsetMeters || 1.7);
    const halfSp = (profA.halfWidthMeters || 1.8) * 0.45;
    geoPrimAddBeamBetween(batcher, ptOn(fA, -halfSp, gDepth * 0.5), ptOn(fB, -halfSp, gDepth * 0.5), 0.28, gDepth * 0.85, { materialKey: 'steel_structure', surfaceStratum: 'steel_splice' });
    geoPrimAddBeamBetween(batcher, ptOn(fA, halfSp, gDepth * 0.5), ptOn(fB, halfSp, gDepth * 0.5), 0.28, gDepth * 0.85, { materialKey: 'steel_structure', surfaceStratum: 'steel_splice' });
    const offsA = (profA.trackCenterOffsets?.length ? profA.trackCenterOffsets : [0]).map((x) => (bend.aEnterAtEnd ? x : -x));
    const offsB = (profB.trackCenterOffsets?.length ? profB.trackCenterOffsets : [0]).map((x) => (bend.bExitAtStart ? x : -x));
    for (let i = 0; i < Math.min(offsA.length, offsB.length); i++) {
      geoPrimAddBeamBetween(batcher, ptOn(fA, offsA[i], -0.35), ptOn(fB, offsB[i], -0.35), 0.24, 0.3, { materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
    }
    return;
  }

  // Railway / dedicated tramway splice + steel rail continuity
  if (bend.domain === 'rail' || bend.domain === 'tram') {
    const sA0 = stripsA[0];
    const sB0 = stripsB[0] || sA0;
    const yA = sA0?.elevationOffsetMeters || 0;
    const yB = sB0?.elevationOffsetMeters || yA;
    batcher.addQuad(
      ptOn(fA, minA, yA),
      ptOn(fA, maxA, yA),
      ptOn(fB, maxB, yB),
      ptOn(fB, minB, yB),
      { layer: 'LayerA_PrimaryStructure', materialKey: sA0?.surfaceMaterial || 'ballast_granite', surfaceStratum: 'top_surface', expectUpwardNormals: true }
    );
    const botY = bend.elevationMode === 'elevated' ? -(Number(profA.understructure?.deckThicknessMeters) || 0.7) : -0.25;
    batcher.addQuad(ptOn(fA, minA, botY), ptOn(fA, minA, yA), ptOn(fB, minB, yB), ptOn(fB, minB, botY), { layer: 'LayerA_PrimaryStructure', materialKey: sA0?.surfaceMaterial || 'ballast_granite', surfaceStratum: 'deck_side' });
    batcher.addQuad(ptOn(fA, maxA, yA), ptOn(fA, maxA, botY), ptOn(fB, maxB, botY), ptOn(fB, maxB, yB), { layer: 'LayerA_PrimaryStructure', materialKey: sA0?.surfaceMaterial || 'ballast_granite', surfaceStratum: 'deck_side' });
    const railBaseY = sA0?.kind === 'tram_embedded' ? yA : yA + 0.05;
    const railTopY = railBaseY + (sA0?.kind === 'tram_embedded' ? 0.025 : 0.16);
    const offsA = (profA.trackCenterOffsets?.length ? profA.trackCenterOffsets : [0]).map((x) => (bend.aEnterAtEnd ? x : -x)).sort((a, b) => a - b);
    const offsB = (profB.trackCenterOffsets?.length ? profB.trackCenterOffsets : [0]).map((x) => (bend.bExitAtStart ? x : -x)).sort((a, b) => a - b);
    const gauge = profA.trackGauge || 1.435;
    for (let t = 0; t < Math.min(offsA.length, offsB.length); t++) {
      for (const sign of [-1, 1]) {
        const lxA = offsA[t] + sign * gauge * 0.5;
        const lxB = offsB[t] + sign * gauge * 0.5;
        geoPrimAddBeamBetween(batcher, ptOn(fA, lxA, (railBaseY + railTopY) * 0.5), ptOn(fB, lxB, (railBaseY + railTopY) * 0.5), 0.08, railTopY - railBaseY, { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
      }
    }
    return;
  }

  const mapXToB = (xA) => minB + ((xA - minA) / spanA) * spanB;
  const sameLayout = stripsA.length === stripsB.length && stripsA.every((s, idx) => s.kind === stripsB[idx].kind);

  for (let i = 0; i < stripsA.length; i++) {
    const sA = stripsA[i];
    const sB = sameLayout ? stripsB[i] : null;
    const bLeft = sB ? sB.xLeft : mapXToB(sA.xLeft);
    const bRight = sB ? sB.xRight : mapXToB(sA.xRight);
    const bElev = sB ? sB.elevationOffsetMeters : sA.elevationOffsetMeters;

    if (sA.kind === 'tram_embedded' && sA.embeddedRails) {
      const bandsA = jmeshBuildEmbeddedBendBands(sA);
      const bandsB = sB ? jmeshBuildEmbeddedBendBands(sB) : bandsA;
      const capH = Number(sA.embeddedRails.grooveDepthMeters) || 0.024;
      for (let bi = 0; bi < bandsA.length; bi++) {
        const ba = bandsA[bi];
        const bb = bandsB[bi] || ba;
        const y0 = ba.kind === 'rail' ? sA.elevationOffsetMeters + capH : sA.elevationOffsetMeters;
        const y1 = ba.kind === 'rail' ? bElev + capH : bElev;
        batcher.addQuad(
          ptOn(fA, ba.xL, y0),
          ptOn(fA, ba.xR, y0),
          ptOn(fB, bb.xR, y1),
          ptOn(fB, bb.xL, y1),
          {
            layer: ba.kind === 'rail' ? 'LayerC_MarkingsAndSurface' : 'LayerA_PrimaryStructure',
            materialKey: ba.kind === 'rail' ? 'rail_steel' : sA.surfaceMaterial,
            surfaceStratum: ba.kind === 'rail' ? 'rail_steel' : 'top_surface',
            expectUpwardNormals: true
          }
        );
      }
      continue;
    }

    const isMarkingLane = (sA.kind === 'vehicle_lane' || sA.kind === 'bus_lane' || sA.kind === 'shoulder') && sA.markingKey && sA.markingKey !== 'plain';
    const materialKey = isMarkingLane ? `lane|${sA.surfaceMaterial}|${sA.markingKey}` : sA.surfaceMaterial;
    const uSpan = isMarkingLane ? 1.0 : Math.max(0.25, sA.widthMeters * 0.35);

    const p0L = ptOn(fA, sA.xLeft, sA.elevationOffsetMeters);
    const p0R = ptOn(fA, sA.xRight, sA.elevationOffsetMeters);
    const p1R = ptOn(fB, bRight, bElev);
    const p1L = ptOn(fB, bLeft, bElev);

    batcher.addQuad(p0L, p0R, p1R, p1L, {
      layer: 'LayerA_PrimaryStructure',
      materialKey,
      surfaceStratum: sA.kind === 'parapet' ? 'barrier_top' : 'top_surface',
      expectUpwardNormals: true,
      uvs: [[0, 0], [uSpan, 0], [uSpan, 0.45], [0, 0.45]]
    });

    if (sA.kind === 'curb' && sA.elevationOffsetMeters > 0.01) {
      const isLeft = (sA.xLeft + sA.xRight) * 0.5 < 0;
      const edgeA = isLeft ? sA.xRight : sA.xLeft;
      const edgeB = isLeft ? bRight : bLeft;
      const p0Bot = ptOn(fA, edgeA, 0);
      const p0Top = ptOn(fA, edgeA, sA.elevationOffsetMeters);
      const p1Top = ptOn(fB, edgeB, bElev);
      const p1Bot = ptOn(fB, edgeB, 0);
      if (isLeft) {
        batcher.addQuad(p0Top, p0Bot, p1Bot, p1Top, { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
      } else {
        batcher.addQuad(p0Bot, p0Top, p1Top, p1Bot, { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
      }
    }
  }

  // Outer embankment / viaduct side skirts across bend
  const isElev = bend.elevationMode === 'elevated' || bend.elevationMode === 'suspended';
  const bottomY = isElev ? -(Number(profA.understructure?.deckThicknessMeters) || INFRA_DEFAULTS.deckThicknessMeters) : -INFRA_DEFAULTS.embankmentSkirtDepthMeters;
  const underMat = isElev ? 'deck_concrete' : 'concrete';
  const sFirstA = stripsA[0];
  const sLastA = stripsA[stripsA.length - 1];
  const sFirstB = stripsB[0];
  const sLastB = stripsB[stripsB.length - 1];

  batcher.addQuad(
    ptOn(fA, minA, bottomY),
    ptOn(fA, minA, sFirstA?.kind === 'parapet' ? 0 : (sFirstA?.elevationOffsetMeters || 0)),
    ptOn(fB, minB, sFirstB?.kind === 'parapet' ? 0 : (sFirstB?.elevationOffsetMeters || 0)),
    ptOn(fB, minB, bottomY),
    { layer: 'LayerA_PrimaryStructure', materialKey: underMat, surfaceStratum: 'deck_side' }
  );
  batcher.addQuad(
    ptOn(fA, maxA, sLastA?.kind === 'parapet' ? 0 : (sLastA?.elevationOffsetMeters || 0)),
    ptOn(fA, maxA, bottomY),
    ptOn(fB, maxB, bottomY),
    ptOn(fB, maxB, sLastB?.kind === 'parapet' ? 0 : (sLastB?.elevationOffsetMeters || 0)),
    { layer: 'LayerA_PrimaryStructure', materialKey: underMat, surfaceStratum: 'deck_side' }
  );
}
