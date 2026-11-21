import { INFRA_DEFAULTS } from '../config.js';
import { infraClamp, infraForkRng, infraRound, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween, geoPrimAddPlatformAssembly, geoPrimAddSagWire } from './primitives.js';

function geoRailPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function geoRailSplitEmbedded(strip) {
  const rCfg = strip.embeddedRails;
  if (!rCfg) return [{ kind: 'pavement', xL: strip.xLeft, xR: strip.xRight }];
  const tc = Math.max(1, Number(rCfg.trackCount) || 1);
  const sp = Number(rCfg.trackSpacing) || 3.4;
  const gauge = Number(rCfg.gaugeMeters) || 1.435;
  const hr = (Number(rCfg.railWidthMeters) || 0.08) * 0.5;
  const intervals = [];
  for (let t = 0; t < tc; t++) {
    const cx = strip.xCenter + (tc === 1 ? 0 : (t - (tc - 1) * 0.5) * sp);
    for (const sign of [-1, 1]) {
      const a = Math.max(strip.xLeft + 0.02, cx + sign * gauge * 0.5 - hr);
      const b = Math.min(strip.xRight - 0.02, cx + sign * gauge * 0.5 + hr);
      if (b > a + 0.01) intervals.push([a, b]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const bands = [];
  let cursor = strip.xLeft;
  for (const [a, b] of intervals) {
    if (a > cursor + 0.005) bands.push({ kind: 'pavement', xL: cursor, xR: a });
    bands.push({ kind: 'rail', xL: a, xR: b });
    cursor = Math.max(cursor, b);
  }
  if (strip.xRight > cursor + 0.005) bands.push({ kind: 'pavement', xL: cursor, xR: strip.xRight });
  return bands;
}

function geoRailSampleAtS(frames, targetS) {
  if (!frames?.length) return null;
  if (targetS <= frames[0].s) return frames[0];
  if (targetS >= frames[frames.length - 1].s) return frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (targetS >= a.s && targetS <= b.s) {
      const span = Math.max(1e-4, b.s - a.s);
      const t = (targetS - a.s) / span;
      return {
        s: targetS,
        u: a.u + (b.u - a.u) * t,
        position: [
          a.position[0] + (b.position[0] - a.position[0]) * t,
          a.position[1] + (b.position[1] - a.position[1]) * t,
          a.position[2] + (b.position[2] - a.position[2]) * t
        ],
        tangent: a.tangent,
        right: a.right,
        up: a.up
      };
    }
  }
  return frames[frames.length - 1];
}

function geoRailDrawBufferStop(batcher, frame, trackCenterOffsets, gauge, baseElevY) {
  const fTan = frame.tangent;
  const fRight = frame.right;
  const up = [0, 1, 0];
  for (const tx of trackCenterOffsets) {
    const halfW = gauge * 0.52;
    const baseL = geoRailPt(frame, tx - halfW, baseElevY);
    const baseR = geoRailPt(frame, tx + halfW, baseElevY);
    const frontBeamL = infraVec3Add(baseL, [fTan[0] * 0.65, 1.02, fTan[2] * 0.65]);
    const frontBeamR = infraVec3Add(baseR, [fTan[0] * 0.65, 1.02, fTan[2] * 0.65]);
    const rearFootL = infraVec3Add(baseL, [-fTan[0] * 0.75, 0, -fTan[2] * 0.75]);
    const rearFootR = infraVec3Add(baseR, [-fTan[0] * 0.75, 0, -fTan[2] * 0.75]);

    geoPrimAddBeamBetween(batcher, baseL, frontBeamL, 0.1, 0.1, { materialKey: 'steel_structure', surfaceStratum: 'buffer_stop' });
    geoPrimAddBeamBetween(batcher, baseR, frontBeamR, 0.1, 0.1, { materialKey: 'steel_structure', surfaceStratum: 'buffer_stop' });
    geoPrimAddBeamBetween(batcher, rearFootL, frontBeamL, 0.1, 0.1, { materialKey: 'steel_structure', surfaceStratum: 'buffer_stop' });
    geoPrimAddBeamBetween(batcher, rearFootR, frontBeamR, 0.1, 0.1, { materialKey: 'steel_structure', surfaceStratum: 'buffer_stop' });
    const midBeam = [
      (frontBeamL[0] + frontBeamR[0]) * 0.5,
      frontBeamL[1],
      (frontBeamL[2] + frontBeamR[2]) * 0.5
    ];
    batcher.addBoxOriented(midBeam, fTan, fRight, up, gauge + 0.55, 0.36, 0.24, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'gate_stripe',
      surfaceStratum: 'buffer_stop'
    });
  }
}

export function geoBuildRailEdge(batcher, edge, samp, prof, doc, collectors = null, crossings = []) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const ballastMat = p.ballastMaterial || 'ballast_granite';
  const sleeperMat = p.sleeperMaterial === 'concrete'
    ? 'sleeper_concrete'
    : p.sleeperMaterial === 'steel'
      ? 'steel_structure'
      : 'sleeper_wood';
  const abandonment = infraClamp(p.abandonment || 0, 0, 1);
  const railMat = abandonment > 0.45 ? 'rail_rust' : 'rail_steel';
  const railHeight = infraClamp(p.railHeight || 0.17, 0.1, 0.24);
  const sleeperSpacing = infraClamp(p.sleeperSpacing || 0.65, 0.45, 1.35);
  const isElevated = edge.elevationMode === 'elevated';
  const deckDepth = Number(prof.understructure?.deckThicknessMeters) || INFRA_DEFAULTS.deckThicknessMeters;
  const trackOffsets = prof.trackCenterOffsets?.length ? prof.trackCenterOffsets : [0];
  const gauge = prof.trackGauge || 1.435;
  const isEmbeddedTram = prof.strips.some((s) => s.kind === 'tram_embedded');
  const bedStrip = prof.strips.find((s) => s.kind === 'rail_bed' || s.kind === 'tram_embedded');
  const bedTopY = bedStrip?.elevationOffsetMeters || 0;

  // Identify at-grade road crossings along this rail edge so sleepers don't poke through timber crossing decks
  const crossingSIntervals = [];
  for (const cross of crossings || []) {
    if (cross.crossingKind !== 'at_grade_rail_road' || cross.railEdgeId !== edge.id) continue;
    let bestS = null;
    let bestD = Infinity;
    for (const f of frames) {
      const d = Math.hypot(f.position[0] - cross.intersectionXZ[0], f.position[2] - cross.intersectionXZ[1]);
      if (d < bestD) {
        bestD = d;
        bestS = f.s;
      }
    }
    if (bestS !== null) {
      const halfRoad = (cross.roadWidthMeters || 8) * 0.5 + 0.45;
      crossingSIntervals.push([bestS - halfRoad, bestS + halfRoad]);
    }
  }

  // 1. Sweep ballast bed / slab / walkways (zero horizontal overlap)
  for (const strip of prof.strips) {
    if (strip.kind === 'tram_embedded' && strip.embeddedRails) {
      const bands = geoRailSplitEmbedded(strip);
      const railCapH = Number(strip.embeddedRails.grooveDepthMeters) || 0.025;
      for (const band of bands) {
        const ySurf = band.kind === 'rail' ? strip.elevationOffsetMeters + railCapH : strip.elevationOffsetMeters;
        const matKey = band.kind === 'rail' ? railMat : strip.surfaceMaterial;
        const strat = band.kind === 'rail' ? 'rail_steel' : 'top_surface';
        const uSpan = band.kind === 'rail' ? 0.5 : Math.max(0.25, (band.xR - band.xL) * 0.35);
        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          const v0 = f0.s / 6.0;
          const v1 = f1.s / 6.0;
          batcher.addQuad(
            geoRailPt(f0, band.xL, ySurf),
            geoRailPt(f0, band.xR, ySurf),
            geoRailPt(f1, band.xR, ySurf),
            geoRailPt(f1, band.xL, ySurf),
            {
              layer: band.kind === 'rail' ? 'LayerC_MarkingsAndSurface' : 'LayerA_PrimaryStructure',
              materialKey: matKey,
              surfaceStratum: strat,
              expectUpwardNormals: true,
              uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
            }
          );
        }
      }
      continue;
    }

    const uSpan = Math.max(0.35, strip.widthMeters * 0.4);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 5.0;
      const v1 = f1.s / 5.0;
      batcher.addQuad(
        geoRailPt(f0, strip.xLeft, strip.elevationOffsetMeters),
        geoRailPt(f0, strip.xRight, strip.elevationOffsetMeters),
        geoRailPt(f1, strip.xRight, strip.elevationOffsetMeters),
        geoRailPt(f1, strip.xLeft, strip.elevationOffsetMeters),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: strip.surfaceMaterial,
          surfaceStratum: 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );
    }
  }

  // 2. Ballast sloped embankment prism skirts OR elevated concrete viaduct deck walls + soffit
  const leftStrip = prof.strips[0];
  const rightStrip = prof.strips[prof.strips.length - 1];
  const outerL = leftStrip.xLeft;
  const outerR = rightStrip.xRight;
  const topLY = leftStrip.elevationOffsetMeters;
  const topRY = rightStrip.elevationOffsetMeters;
  const skirtOut = isElevated || isEmbeddedTram ? 0 : 0.42;
  const botY = isElevated ? -deckDepth : -INFRA_DEFAULTS.embankmentSkirtDepthMeters;
  const skirtMat = isElevated ? 'deck_concrete' : isEmbeddedTram ? 'concrete' : ballastMat;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    batcher.addQuad(
      geoRailPt(f0, outerL - skirtOut, botY),
      geoRailPt(f0, outerL, topLY),
      geoRailPt(f1, outerL, topLY),
      geoRailPt(f1, outerL - skirtOut, botY),
      { layer: 'LayerA_PrimaryStructure', materialKey: skirtMat, surfaceStratum: 'deck_side' }
    );
    batcher.addQuad(
      geoRailPt(f0, outerR, topRY),
      geoRailPt(f0, outerR + skirtOut, botY),
      geoRailPt(f1, outerR + skirtOut, botY),
      geoRailPt(f1, outerR, topRY),
      { layer: 'LayerA_PrimaryStructure', materialKey: skirtMat, surfaceStratum: 'deck_side' }
    );
    if (isElevated) {
      const soffitHalf = Math.max(1.2, (outerR - outerL) * 0.42);
      batcher.addQuad(
        geoRailPt(f0, -soffitHalf, botY),
        geoRailPt(f1, -soffitHalf, botY),
        geoRailPt(f1, soffitHalf, botY),
        geoRailPt(f0, soffitHalf, botY),
        { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'deck_soffit' }
      );
    }
  }

  // End caps on open endpoint nodes
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);
  if (startNode?.kind === 'endpoint') {
    const f0 = frames[0];
    batcher.addQuad(
      geoRailPt(f0, outerR, topRY),
      geoRailPt(f0, outerL, topLY),
      geoRailPt(f0, outerL - skirtOut, botY),
      geoRailPt(f0, outerR + skirtOut, botY),
      { layer: 'LayerA_PrimaryStructure', materialKey: skirtMat, surfaceStratum: 'end_cap' }
    );
  }
  if (endNode?.kind === 'endpoint') {
    const fE = frames[frames.length - 1];
    batcher.addQuad(
      geoRailPt(fE, outerL, topLY),
      geoRailPt(fE, outerR, topRY),
      geoRailPt(fE, outerR + skirtOut, botY),
      geoRailPt(fE, outerL - skirtOut, botY),
      { layer: 'LayerA_PrimaryStructure', materialKey: skirtMat, surfaceStratum: 'end_cap' }
    );
  }

  // 3. Sleepers & Twin Steel Rails + Third Rail (for ballasted / viaduct tracks)
  if (!isEmbeddedTram) {
    const sleeperTopOffset = bedTopY + 0.05;
    const sleeperHeight = 0.12;
    const sleeperWidth = gauge + 0.85;
    const rng = infraForkRng(doc?.seed || 2026, `rail_sleepers_${edge.id}`);
    const sStart = frames[0].s + 0.35;
    const sEnd = frames[frames.length - 1].s - 0.35;

    for (let s = sStart; s <= sEnd; s += sleeperSpacing) {
      if (crossingSIntervals.some(([a, b]) => s >= a && s <= b)) continue;
      const fr = geoRailSampleAtS(frames, s);
      if (!fr) continue;
      if (abandonment > 0.1 && rng() < abandonment * 0.52) continue;

      const skew = abandonment > 0.12 ? (rng() - 0.5) * abandonment * 0.24 : 0;
      const cosA = Math.cos(skew);
      const sinA = Math.sin(skew);
      const tan = [
        fr.tangent[0] * cosA - fr.right[0] * sinA,
        fr.tangent[1],
        fr.tangent[2] * cosA - fr.right[2] * sinA
      ];
      const rVec = [
        fr.right[0] * cosA + fr.tangent[0] * sinA,
        fr.right[1],
        fr.right[2] * cosA + fr.tangent[2] * sinA
      ];

      for (const tx of trackOffsets) {
        const cPos = geoRailPt(fr, tx, sleeperTopOffset - sleeperHeight * 0.5);
        batcher.addBoxOriented(cPos, tan, rVec, fr.up, sleeperWidth, sleeperHeight, 0.26, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: sleeperMat,
          surfaceStratum: 'rail_sleeper'
        });
      }
    }

    const railBaseY = sleeperTopOffset;
    const railTopY = railBaseY + railHeight;
    const halfRailW = 0.04;
    for (const tx of trackOffsets) {
      for (const sign of [-1, 1]) {
        const lx = tx + sign * gauge * 0.5;
        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          // Top rail running table
          batcher.addQuad(
            geoRailPt(f0, lx - halfRailW, railTopY),
            geoRailPt(f0, lx + halfRailW, railTopY),
            geoRailPt(f1, lx + halfRailW, railTopY),
            geoRailPt(f1, lx - halfRailW, railTopY),
            { layer: 'LayerC_MarkingsAndSurface', materialKey: railMat, surfaceStratum: 'rail_steel', expectUpwardNormals: true }
          );
          // Side webs
          batcher.addQuad(
            geoRailPt(f0, lx - halfRailW, railBaseY),
            geoRailPt(f0, lx - halfRailW, railTopY),
            geoRailPt(f1, lx - halfRailW, railTopY),
            geoRailPt(f1, lx - halfRailW, railBaseY),
            { layer: 'LayerC_MarkingsAndSurface', materialKey: railMat, surfaceStratum: 'rail_steel' }
          );
          batcher.addQuad(
            geoRailPt(f0, lx + halfRailW, railTopY),
            geoRailPt(f0, lx + halfRailW, railBaseY),
            geoRailPt(f1, lx + halfRailW, railBaseY),
            geoRailPt(f1, lx + halfRailW, railTopY),
            { layer: 'LayerC_MarkingsAndSurface', materialKey: railMat, surfaceStratum: 'rail_steel' }
          );
        }
      }

      if (p.includeThirdRail || p.electrification === 'third_rail') {
        const thirdX = tx + gauge * 0.5 + 0.42;
        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          geoPrimAddBeamBetween(
            batcher,
            geoRailPt(f0, thirdX, railBaseY + 0.08),
            geoRailPt(f1, thirdX, railBaseY + 0.08),
            0.12,
            0.1,
            { layer: 'LayerC_MarkingsAndSurface', materialKey: 'steel_accent', surfaceStratum: 'third_rail' }
          );
        }
      }
    }
  }

  // 4. Optional Trackside Fencing
  if (p.includeFencing && samp.lengthMeters >= 6) {
    const fXLeft = prof.halfWidthMeters + 0.25;
    const sStep = 4.2;
    let prevL = null;
    let prevR = null;
    for (let s = frames[0].s + 0.5; s <= frames[frames.length - 1].s - 0.5; s += sStep) {
      if (crossingSIntervals.some(([a, b]) => s >= a - 0.6 && s <= b + 0.6)) {
        prevL = null;
        prevR = null;
        continue;
      }
      const fr = geoRailSampleAtS(frames, s);
      if (!fr) continue;
      const pLBot = geoRailPt(fr, -fXLeft, 0);
      const pLTop = geoRailPt(fr, -fXLeft, 1.15);
      const pRBot = geoRailPt(fr, fXLeft, 0);
      const pRTop = geoRailPt(fr, fXLeft, 1.15);
      geoPrimAddBeamBetween(batcher, pLBot, pLTop, 0.08, 0.08, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
      geoPrimAddBeamBetween(batcher, pRBot, pRTop, 0.08, 0.08, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
      if (prevL) {
        geoPrimAddBeamBetween(batcher, [prevL[0], prevL[1] - 0.15, prevL[2]], [pLTop[0], pLTop[1] - 0.15, pLTop[2]], 0.04, 0.04, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
        geoPrimAddBeamBetween(batcher, [prevL[0], prevL[1] - 0.58, prevL[2]], [pLTop[0], pLTop[1] - 0.58, pLTop[2]], 0.04, 0.04, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
        geoPrimAddBeamBetween(batcher, [prevR[0], prevR[1] - 0.15, prevR[2]], [pRTop[0], pRTop[1] - 0.15, pRTop[2]], 0.04, 0.04, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
        geoPrimAddBeamBetween(batcher, [prevR[0], prevR[1] - 0.58, prevR[2]], [pRTop[0], pRTop[1] - 0.58, pRTop[2]], 0.04, 0.04, { materialKey: 'steel_structure', surfaceStratum: 'fence' });
      }
      prevL = pLTop;
      prevR = pRTop;
    }
  }

  // 5. Optional Overhead Catenary Masts / Portals & Sagging Wires
  if ((p.includeCatenary || p.electrification === 'overhead_catenary') && frames.length >= 3) {
    const wireY = bedTopY + 5.35;
    const messY = bedTopY + 6.45;
    const mastH = 6.95;
    const usePortal = trackOffsets.length >= 2;
    const mastX = prof.halfWidthMeters + 0.55;
    const mastIndices = [];
    let nextS = frames[0].s + 2.5;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].s >= nextS || (i === frames.length - 1 && samp.trimmedLengthMeters > 8 && frames[i].s - (frames[mastIndices[mastIndices.length - 1]]?.s || 0) > 5)) {
        if (!crossingSIntervals.some(([a, b]) => frames[i].s >= a - 0.6 && frames[i].s <= b + 0.6)) {
          mastIndices.push(i);
          nextS = frames[i].s + 20.0;
        }
      }
    }
    if (mastIndices.length < 2 && frames.length >= 2) {
      mastIndices.length = 0;
      mastIndices.push(0, frames.length - 1);
    }

    const prevContact = new Map();
    const prevMess = new Map();
    for (const mi of mastIndices) {
      const fr = frames[mi];
      if (usePortal) {
        const lBase = geoRailPt(fr, -mastX, 0);
        const rBase = geoRailPt(fr, mastX, 0);
        const lTop = [lBase[0], lBase[1] + mastH, lBase[2]];
        const rTop = [rBase[0], rBase[1] + mastH, rBase[2]];
        geoPrimAddBeamBetween(batcher, lBase, lTop, 0.24, 0.24, { materialKey: 'steel_structure', surfaceStratum: 'catenary_mast' });
        geoPrimAddBeamBetween(batcher, rBase, rTop, 0.24, 0.24, { materialKey: 'steel_structure', surfaceStratum: 'catenary_mast' });
        geoPrimAddBeamBetween(batcher, [lBase[0], lBase[1] + messY, lBase[2]], [rBase[0], rBase[1] + messY, rBase[2]], 0.2, 0.22, { materialKey: 'steel_structure', surfaceStratum: 'catenary_gantry' });
      } else {
        const mBase = geoRailPt(fr, -mastX, 0);
        const mTop = [mBase[0], mBase[1] + mastH, mBase[2]];
        geoPrimAddBeamBetween(batcher, mBase, mTop, 0.22, 0.22, { materialKey: 'steel_structure', surfaceStratum: 'catenary_mast' });
        geoPrimAddBeamBetween(batcher, geoRailPt(fr, -mastX, wireY + 0.15), geoRailPt(fr, (trackOffsets[0] || 0) + 0.5, wireY + 0.15), 0.08, 0.08, { materialKey: 'steel_structure', surfaceStratum: 'catenary_arm' });
        geoPrimAddBeamBetween(batcher, geoRailPt(fr, -mastX, messY + 0.15), geoRailPt(fr, (trackOffsets[0] || 0) + 0.35, wireY + 0.15), 0.06, 0.06, { materialKey: 'steel_structure', surfaceStratum: 'catenary_arm' });
      }

      for (let t = 0; t < trackOffsets.length; t++) {
        const tx = trackOffsets[t];
        const cPt = geoRailPt(fr, tx, wireY);
        const mPt = geoRailPt(fr, tx, messY);
        geoPrimAddBeamBetween(batcher, mPt, cPt, 0.05, 0.05, { materialKey: 'wire_copper', surfaceStratum: 'catenary_dropper' });
        if (prevContact.has(t)) {
          geoPrimAddSagWire(batcher, prevContact.get(t), cPt, 0.1, 0.028, 6, { materialKey: 'wire_copper' });
          geoPrimAddSagWire(batcher, prevMess.get(t), mPt, 0.28, 0.024, 6, { materialKey: 'wire_copper' });
        }
        prevContact.set(t, cPt);
        prevMess.set(t, mPt);
      }
    }
  }

  // 6. Optional Trackside Signals
  if (p.includeSignals && frames.length >= 2 && samp.trimmedLengthMeters >= 8) {
    const sigFr = frames[Math.min(frames.length - 1, Math.max(1, Math.floor(frames.length * 0.16)))];
    const sX = (trackOffsets[trackOffsets.length - 1] || 0) + gauge * 0.5 + 1.1;
    const base = geoRailPt(sigFr, sX, 0);
    const mastTop = [base[0], base[1] + 4.2, base[2]];
    geoPrimAddBeamBetween(batcher, base, mastTop, 0.16, 0.16, { materialKey: 'steel_structure', surfaceStratum: 'signal_mast' });
    batcher.addBoxOriented([mastTop[0], mastTop[1] - 0.15, mastTop[2]], sigFr.tangent, sigFr.right, sigFr.up, 0.42, 0.92, 0.28, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'steel_structure',
      surfaceStratum: 'signal_housing'
    });
    const greenPos = infraVec3Add(mastTop, [sigFr.tangent[0] * 0.16, -0.35, sigFr.tangent[2] * 0.16]);
    const redPos = infraVec3Add(mastTop, [sigFr.tangent[0] * 0.16, 0.06, sigFr.tangent[2] * 0.16]);
    batcher.addBoxOriented(greenPos, sigFr.tangent, sigFr.right, sigFr.up, 0.18, 0.18, 0.08, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'signal_green',
      surfaceStratum: 'signal_lamp'
    });
    batcher.addBoxOriented(redPos, sigFr.tangent, sigFr.right, sigFr.up, 0.18, 0.18, 0.08, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'signal_red',
      surfaceStratum: 'signal_lamp'
    });
    collectors?.signals?.push({
      id: `sig_${edge.id}_1`,
      kind: 'rail_signal',
      edgeId: edge.id,
      aspect: 'green',
      positionMeters: [infraRound(base[0], 3), infraRound(base[1], 3), infraRound(base[2], 3)]
    });
  }

  // 7. Dead-End Buffer Stops at open degree-1 endpoints
  if (p.includeBufferStop !== false && !isEmbeddedTram && samp.trimmedLengthMeters >= 4) {
    if (startNode?.kind === 'endpoint') {
      const fBuf = geoRailSampleAtS(frames, frames[0].s + Math.min(1.4, samp.trimmedLengthMeters * 0.2));
      if (fBuf) geoRailDrawBufferStop(batcher, fBuf, trackOffsets, gauge, bedTopY + 0.05);
    }
    if (endNode?.kind === 'endpoint') {
      const fBuf = geoRailSampleAtS(frames, frames[frames.length - 1].s - Math.min(1.4, samp.trimmedLengthMeters * 0.2));
      if (fBuf) {
        const revFrame = {
          ...fBuf,
          tangent: [-fBuf.tangent[0], -fBuf.tangent[1], -fBuf.tangent[2]],
          right: [-fBuf.right[0], -fBuf.right[1], -fBuf.right[2]]
        };
        geoRailDrawBufferStop(batcher, revFrame, trackOffsets, gauge, bedTopY + 0.05);
      }
    }
  }

  // 8. Optional Boarding / Freight Loading Platforms
  const platMode = p.includePlatform || 'none';
  if (platMode !== 'none' && samp.trimmedLengthMeters >= 12) {
    const platTopY = isEmbeddedTram ? 0.32 : bedTopY + 0.88;
    const platLenWidth = 2.8;
    const minTrackEdge = Math.min(...trackOffsets) - gauge * 0.5;
    const maxTrackEdge = Math.max(...trackOffsets) + gauge * 0.5;

    if (platMode === 'left' || platMode === 'both') {
      const meta = geoPrimAddPlatformAssembly(batcher, frames, -1, minTrackEdge - 0.58, platLenWidth, platTopY, 0.25, 0.75, {
        id: `plat_${edge.id}_L`,
        deckBottomY: isElevated ? 0 : -0.1,
        deckMaterial: 'concrete',
        canopyMaterial: 'steel_structure',
        includeCanopy: !p.isFreightPlatform,
        glassWalls: !p.isFreightPlatform
      });
      if (meta && collectors?.platforms) collectors.platforms.push({ ...meta, edgeId: edge.id });
    }
    if (platMode === 'right' || platMode === 'both') {
      const meta = geoPrimAddPlatformAssembly(batcher, frames, 1, maxTrackEdge + 0.58, platLenWidth, platTopY, 0.25, 0.75, {
        id: `plat_${edge.id}_R`,
        deckBottomY: isElevated ? 0 : -0.1,
        deckMaterial: 'concrete',
        canopyMaterial: 'steel_structure',
        includeCanopy: !p.isFreightPlatform,
        glassWalls: !p.isFreightPlatform
      });
      if (meta && collectors?.platforms) collectors.platforms.push({ ...meta, edgeId: edge.id });
    }
    if (platMode === 'island' && trackOffsets.length >= 2) {
      const midTrack = (trackOffsets[0] + trackOffsets[trackOffsets.length - 1]) * 0.5;
      const meta = geoPrimAddPlatformAssembly(batcher, frames, 1, midTrack - 0.85, 1.7, platTopY, 0.25, 0.75, {
        id: `plat_${edge.id}_I`,
        deckBottomY: 0,
        deckMaterial: 'concrete',
        canopyMaterial: 'steel_structure',
        includeCanopy: true,
        glassWalls: false
      });
      if (meta && collectors?.platforms) collectors.platforms.push({ ...meta, edgeId: edge.id });
    }
  }
}

export function geoBuildRailSwitch(batcher, junc, doc) {
  if (!junc || !junc.corePolygonXZ || junc.corePolygonXZ.length < 3) return;
  const y = junc.position[1];
  const ballastTopY = y + (junc.ballastTopY || 0.25);
  const ballastMat = junc.ballastMaterial || 'ballast_granite';
  const sleeperMat = junc.sleeperMaterial === 'concrete'
    ? 'sleeper_concrete'
    : junc.sleeperMaterial === 'steel'
      ? 'steel_structure'
      : 'sleeper_wood';
  const railHeight = junc.railHeight || 0.17;
  const gauge = junc.trackGauge || 1.435;
  const poly = junc.corePolygonXZ;

  // 1. Unified non-overlapping switch ballast polygon + side perimeter walls
  batcher.addHorizontalPolygonXZ(poly, ballastTopY, {
    layer: 'LayerA_PrimaryStructure',
    materialKey: ballastMat,
    surfaceStratum: 'top_surface',
    uvScale: 0.22
  });
  const botY = junc.elevationMode === 'elevated' ? y - 0.65 : y - 0.25;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    batcher.addQuad(
      [a[0], botY, a[1]],
      [a[0], ballastTopY, a[1]],
      [b[0], ballastTopY, b[1]],
      [b[0], botY, b[1]],
      { layer: 'LayerA_PrimaryStructure', materialKey: ballastMat, surfaceStratum: 'deck_side' }
    );
  }

  const nodeXZ = [junc.position[0], junc.position[2]];
  const sleeperTopY = ballastTopY + 0.05;
  const railCenterY = sleeperTopY + railHeight * 0.5;
  const trackOffsets = junc.trackOffsets?.length ? junc.trackOffsets : [0];

  const emitCurveRails = (lStart, lEnd, buildBearers = false) => {
    const p0 = lStart.endXZ || [nodeXZ[0] + lStart.dirXZ[0] * lStart.coreTrimMeters, nodeXZ[1] + lStart.dirXZ[1] * lStart.coreTrimMeters];
    const p2 = lEnd.endXZ || [nodeXZ[0] + lEnd.dirXZ[0] * lEnd.coreTrimMeters, nodeXZ[1] + lEnd.dirXZ[1] * lEnd.coreTrimMeters];
    const p1 = nodeXZ;
    const segs = 10;

    // Align track offset orientation from start leg to end leg cleanly
    const pts = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const omt = 1 - t;
      const x = omt * omt * p0[0] + 2 * omt * t * p1[0] + t * t * p2[0];
      const z = omt * omt * p0[1] + 2 * omt * t * p1[1] + t * t * p2[1];
      const vx = 2 * omt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
      const vz = 2 * omt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      const vl = Math.hypot(vx, vz) || 1;
      const tanXZ = [vx / vl, vz / vl];
      const rightXZ = [tanXZ[1], -tanXZ[0]];
      const refRight = [
        -lStart.rightXZ[0] * (1 - t) + lEnd.rightXZ[0] * t,
        -lStart.rightXZ[1] * (1 - t) + lEnd.rightXZ[1] * t
      ];
      const rFixed = rightXZ[0] * refRight[0] + rightXZ[1] * refRight[1] >= 0 ? rightXZ : [-rightXZ[0], -rightXZ[1]];
      pts.push({ x, z, tanXZ, rightXZ: rFixed, t });
    }

    if (buildBearers) {
      for (let s = 1; s < segs; s++) {
        const pt = pts[s];
        const spanW = (trackOffsets.length > 1 ? Math.abs(trackOffsets[trackOffsets.length - 1] - trackOffsets[0]) : 0) + gauge + 1.1;
        batcher.addBoxOriented(
          [pt.x, sleeperTopY - 0.055, pt.z],
          [pt.tanXZ[0], 0, pt.tanXZ[1]],
          [pt.rightXZ[0], 0, pt.rightXZ[1]],
          [0, 1, 0],
          spanW,
          0.11,
          0.26,
          { layer: 'LayerA_PrimaryStructure', materialKey: sleeperMat, surfaceStratum: 'rail_sleeper' }
        );
      }
    }

    for (const tx of trackOffsets) {
      for (const sign of [-1, 1]) {
        const lat = tx + sign * gauge * 0.5;
        for (let s = 0; s < segs; s++) {
          const a = pts[s];
          const b = pts[s + 1];
          geoPrimAddBeamBetween(
            batcher,
            [a.x + a.rightXZ[0] * lat, railCenterY, a.z + a.rightXZ[1] * lat],
            [b.x + b.rightXZ[0] * lat, railCenterY, b.z + b.rightXZ[1] * lat],
            0.08,
            railHeight,
            { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'rail_steel' }
          );
        }
      }
    }
    return pts;
  };

  if (junc.legs.length === 3 && junc.switchMetadata) {
    const meta = junc.switchMetadata;
    const lTrunk = junc.legs.find((l) => l.edgeId === meta.trunkEdgeId) || junc.legs[0];
    const lNormal = junc.legs.find((l) => l.edgeId === meta.normalEdgeId) || junc.legs[1];
    const lReverse = junc.legs.find((l) => l.edgeId === meta.reverseEdgeId) || junc.legs[2];

    const ptsNormal = emitCurveRails(lTrunk, lNormal, true);
    const ptsReverse = emitCurveRails(lTrunk, lReverse, false);

    // Movable point switch blades shifted by activeState ('normal' | 'reverse')
    const isReverse = meta.activeState === 'reverse';
    const bladePts = isReverse ? ptsReverse : ptsNormal;
    if (bladePts.length >= 6) {
      for (const tx of trackOffsets) {
        const toeA = bladePts[2];
        const toeB = bladePts[4];
        for (const sign of [-1, 1]) {
          const shift = isReverse ? sign * 0.04 : -sign * 0.04;
          const lat = tx + sign * (gauge * 0.5 - 0.09) + shift;
          geoPrimAddBeamBetween(
            batcher,
            [toeA.x + toeA.rightXZ[0] * lat, railCenterY + 0.01, toeA.z + toeA.rightXZ[1] * lat],
            [toeB.x + toeB.rightXZ[0] * lat, railCenterY + 0.01, toeB.z + toeB.rightXZ[1] * lat],
            0.055,
            railHeight * 0.9,
            { layer: 'LayerC_MarkingsAndSurface', materialKey: 'steel_accent', surfaceStratum: 'switch_blade' }
          );
        }
      }
    }

    // Trackside switch motor housing & glowing state lantern
    const boxPos = [
      nodeXZ[0] - lTrunk.rightXZ[0] * (gauge * 0.5 + 1.55) + lTrunk.dirXZ[0] * (lTrunk.coreTrimMeters * 0.45),
      ballastTopY + 0.22,
      nodeXZ[1] - lTrunk.rightXZ[1] * (gauge * 0.5 + 1.55) + lTrunk.dirXZ[1] * (lTrunk.coreTrimMeters * 0.45)
    ];
    batcher.addBoxOriented(
      boxPos,
      [lTrunk.dirXZ[0], 0, lTrunk.dirXZ[1]],
      [lTrunk.rightXZ[0], 0, lTrunk.rightXZ[1]],
      [0, 1, 0],
      0.56,
      0.44,
      0.68,
      { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'switch_motor' }
    );
    batcher.addBoxOriented(
      [boxPos[0], boxPos[1] + 0.45, boxPos[2]],
      [lTrunk.dirXZ[0], 0, lTrunk.dirXZ[1]],
      [lTrunk.rightXZ[0], 0, lTrunk.rightXZ[1]],
      [0, 1, 0],
      0.26,
      0.26,
      0.26,
      { layer: 'LayerA_PrimaryStructure', materialKey: isReverse ? 'signal_amber' : 'signal_green', surfaceStratum: 'switch_lantern' }
    );
  } else if (junc.legs.length === 4) {
    emitCurveRails(junc.legs[0], junc.legs[2], true);
    emitCurveRails(junc.legs[1], junc.legs[3], false);
  }
}

export function geoBuildLevelCrossing(batcher, cross, doc, solved) {
  if (!cross || cross.crossingKind !== 'at_grade_rail_road') return;
  const center = cross.intersectionXZ;
  const roadTan = cross.roadTangentXZ || [1, 0];
  const roadRight = [-roadTan[1], roadTan[0]];
  const railEdge = (doc?.edges || []).find((e) => e.id === cross.railEdgeId);
  const railProf = solved?.profilesByEdgeId?.get(cross.railEdgeId);
  const ballastTopY = railProf?.strips?.find((s) => s.kind === 'rail_bed')?.elevationOffsetMeters ?? (railEdge?.params?.ballastDepth || 0.25);
  const lowerY = cross.lowerDatumY || 0;
  const deckY = lowerY + ballastTopY + 0.09;
  const roadHalfW = (cross.roadWidthMeters || 8) * 0.5;
  const railHalfW = (cross.railWidthMeters || 4.8) * 0.5;
  const rampLen = 2.8;

  const roadPt = (uAlongRoad, vRight, yVal) => [
    center[0] + roadTan[0] * uAlongRoad + roadRight[0] * vRight,
    yVal,
    center[1] + roadTan[1] * uAlongRoad + roadRight[1] * vRight
  ];

  // 1. Timber/rubber flush level crossing deck spanning road width over the tracks
  const plankBoxCenter = roadPt(0, 0, deckY - 0.08);
  batcher.addBoxOriented(
    plankBoxCenter,
    [roadTan[0], 0, roadTan[1]],
    [roadRight[0], 0, roadRight[1]],
    [0, 1, 0],
    cross.roadWidthMeters + 0.4,
    0.16,
    cross.railWidthMeters + 0.2,
    {
      layer: 'LayerA_PrimaryStructure',
      materialKey: 'wood_warm',
      surfaceStratum: 'level_crossing_plank'
    }
  );

  // 2. Smooth road approach ramps rising from lowerY + 0.025 (zero depth conflict) to deckY
  const rampToeY = lowerY + 0.026;
  for (const dir of [-1, 1]) {
    const uInner = dir * (railHalfW + 0.05);
    const uOuter = dir * (railHalfW + 0.05 + rampLen);
    const pInL = roadPt(uInner, -roadHalfW, deckY);
    const pInR = roadPt(uInner, roadHalfW, deckY);
    const pOutL = roadPt(uOuter, -roadHalfW, rampToeY);
    const pOutR = roadPt(uOuter, roadHalfW, rampToeY);
    if (dir > 0) {
      batcher.addQuad(pInL, pInR, pOutR, pOutL, { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'level_crossing_ramp', expectUpwardNormals: true });
    } else {
      batcher.addQuad(pOutL, pOutR, pInR, pInL, { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'level_crossing_ramp', expectUpwardNormals: true });
    }
    // Cap vertical toe edge
    batcher.addQuad(
      roadPt(uOuter, -roadHalfW, lowerY),
      pOutL,
      pOutR,
      roadPt(uOuter, roadHalfW, lowerY),
      { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'side_wall' }
    );
  }

  // 3. Striped Crossing Gate Assemblies & Crossbuck Warning Signals clear of road & tracks
  for (const dir of [-1, 1]) {
    const uPost = dir * (railHalfW + 1.45);
    const vPost = dir * (roadHalfW * 0.72 + 1.35);
    const base = roadPt(uPost, vPost, lowerY);
    const postTop = [base[0], lowerY + 3.45, base[2]];
    geoPrimAddBeamBetween(batcher, base, postTop, 0.18, 0.18, { materialKey: 'steel_structure', surfaceStratum: 'crossing_post' });

    // Striped crossing gate boom extending across half the road at y + 1.1
    const gatePivot = [base[0], lowerY + 1.15, base[2]];
    const gateTip = roadPt(uPost, vPost - dir * (roadHalfW * 0.95), lowerY + 1.28);
    geoPrimAddBeamBetween(batcher, gatePivot, gateTip, 0.11, 0.14, { materialKey: 'gate_stripe', surfaceStratum: 'crossing_gate' });

    // Counterweight box
    const counterTip = roadPt(uPost, vPost + dir * 0.95, lowerY + 1.05);
    geoPrimAddBeamBetween(batcher, gatePivot, counterTip, 0.24, 0.24, { materialKey: 'steel_structure', surfaceStratum: 'crossing_gate' });

    // X-shaped Crossbuck Sign & twin red flasher lamps facing approaching motorists
    const xCenter = [base[0], lowerY + 2.85, base[2]];
    const xOff = 0.42;
    geoPrimAddBeamBetween(
      batcher,
      roadPt(uPost + dir * 0.12, vPost - xOff, lowerY + 2.85 - xOff),
      roadPt(uPost + dir * 0.12, vPost + xOff, lowerY + 2.85 + xOff),
      0.06,
      0.16,
      { materialKey: 'stripe_white', surfaceStratum: 'crossing_sign' }
    );
    geoPrimAddBeamBetween(
      batcher,
      roadPt(uPost + dir * 0.12, vPost - xOff, lowerY + 2.85 + xOff),
      roadPt(uPost + dir * 0.12, vPost + xOff, lowerY + 2.85 - xOff),
      0.06,
      0.16,
      { materialKey: 'stripe_white', surfaceStratum: 'crossing_sign' }
    );
    for (const ls of [-0.26, 0.26]) {
      batcher.addBoxOriented(
        roadPt(uPost + dir * 0.16, vPost + ls, lowerY + 2.2),
        [roadTan[0], 0, roadTan[1]],
        [roadRight[0], 0, roadRight[1]],
        [0, 1, 0],
        0.22,
        0.22,
        0.12,
        { layer: 'LayerA_PrimaryStructure', materialKey: 'signal_red', surfaceStratum: 'signal_lamp' }
      );
    }
  }
}
