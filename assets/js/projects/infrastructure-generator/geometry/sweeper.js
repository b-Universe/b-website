import { INFRA_DEFAULTS } from '../config.js';
import { infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween, geoPrimAddPlatformAssembly, geoPrimAddSagWire } from './primitives.js';

function swOffsetPoint(frame, latX, elevY) {
  const p = infraVec3Add(frame.position, infraVec3Scale(frame.right, latX));
  return infraVec3Add(p, infraVec3Scale(frame.up, elevY));
}

function swEmitSideWall(batcher, p0Bot, p0Top, p1Top, p1Bot, normalDir, materialKey, layer = 'LayerA_PrimaryStructure') {
  // Quad facing normalDir along frame progression:
  // If normalDir points along -right (inward from +right edge), (p0Bot, p0Top, p1Top, p1Bot) faces -right.
  // If normalDir points along +right (outward from +right edge), (p0Top, p0Bot, p1Bot, p1Top) faces +right.
  batcher.addQuad(p0Bot, p0Top, p1Top, p1Bot, {
    layer,
    materialKey,
    surfaceStratum: 'side_wall',
    uvs: [[0, 0], [0, 1], [1, 1], [1, 0]]
  });
}

function swSplitEmbeddedTramBands(strip) {
  const railsCfg = strip.embeddedRails;
  if (!railsCfg) return [{ kind: 'pavement', xLeft: strip.xLeft, xRight: strip.xRight }];
  const trackCount = Math.max(1, Number(railsCfg.trackCount) || 1);
  const trackSpacing = Number(railsCfg.trackSpacing) || 3.0;
  const gauge = Number(railsCfg.gaugeMeters) || 1.435;
  const railW = Number(railsCfg.railWidthMeters) || 0.08;
  const halfRail = railW * 0.5;
  const halfGauge = gauge * 0.5;

  const railIntervals = [];
  for (let t = 0; t < trackCount; t++) {
    const cx = strip.xCenter + (trackCount === 1 ? 0 : (t - (trackCount - 1) * 0.5) * trackSpacing);
    for (const sign of [-1, 1]) {
      const rx0 = Math.max(strip.xLeft + 0.02, cx + sign * halfGauge - halfRail);
      const rx1 = Math.min(strip.xRight - 0.02, cx + sign * halfGauge + halfRail);
      if (rx1 > rx0 + 0.01) railIntervals.push([rx0, rx1]);
    }
  }
  railIntervals.sort((a, b) => a[0] - b[0]);

  const bands = [];
  let cursor = strip.xLeft;
  for (const [rx0, rx1] of railIntervals) {
    if (rx0 > cursor + 0.005) {
      bands.push({ kind: 'pavement', xLeft: cursor, xRight: rx0 });
    }
    bands.push({ kind: 'rail', xLeft: rx0, xRight: rx1 });
    cursor = Math.max(cursor, rx1);
  }
  if (strip.xRight > cursor + 0.005) {
    bands.push({ kind: 'pavement', xLeft: cursor, xRight: strip.xRight });
  }
  return bands;
}

export function geoSweepEdge(batcher, edge, samp, prof, doc, collectors = null) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const isElevated = edge.elevationMode === 'elevated' || edge.elevationMode === 'suspended';
  const deckDepth = Number(prof.understructure?.deckThicknessMeters) || INFRA_DEFAULTS.deckThicknessMeters;
  const skirtDepth = INFRA_DEFAULTS.embankmentSkirtDepthMeters;

  // 1. Top surface strips (strictly non-overlapping horizontally!)
  for (const strip of prof.strips) {
    if (strip.kind === 'tram_embedded' && strip.embeddedRails) {
      const bands = swSplitEmbeddedTramBands(strip);
      const topBase = strip.elevationOffsetMeters || 0;
      const railCapH = Number(strip.embeddedRails.grooveDepthMeters) || 0.024;
      for (const band of bands) {
        const wBand = band.xRight - band.xLeft;
        const uSpan = band.kind === 'rail' ? 0.5 : Math.max(0.2, wBand * 0.35);
        const ySurf = band.kind === 'rail' ? topBase + railCapH : topBase;
        const matKey = band.kind === 'rail' ? 'rail_steel' : strip.surfaceMaterial;
        const stratum = band.kind === 'rail' ? 'rail_steel' : 'top_surface';

        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          const v0 = f0.s / 6.0;
          const v1 = f1.s / 6.0;
          batcher.addQuad(
            swOffsetPoint(f0, band.xLeft, ySurf),
            swOffsetPoint(f0, band.xRight, ySurf),
            swOffsetPoint(f1, band.xRight, ySurf),
            swOffsetPoint(f1, band.xLeft, ySurf),
            {
              layer: band.kind === 'rail' ? 'LayerC_MarkingsAndSurface' : 'LayerA_PrimaryStructure',
              materialKey: matKey,
              surfaceStratum: stratum,
              expectUpwardNormals: true,
              uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
            }
          );
          if (band.kind === 'rail') {
            swEmitSideWall(
              batcher,
              swOffsetPoint(f0, band.xLeft, topBase),
              swOffsetPoint(f0, band.xLeft, ySurf),
              swOffsetPoint(f1, band.xLeft, ySurf),
              swOffsetPoint(f1, band.xLeft, topBase),
              null,
              'rail_steel',
              'LayerC_MarkingsAndSurface'
            );
            swEmitSideWall(
              batcher,
              swOffsetPoint(f0, band.xRight, ySurf),
              swOffsetPoint(f0, band.xRight, topBase),
              swOffsetPoint(f1, band.xRight, topBase),
              swOffsetPoint(f1, band.xRight, ySurf),
              null,
              'rail_steel',
              'LayerC_MarkingsAndSurface'
            );
          }
        }
      }
      continue;
    }

    const isMarkingLane = (strip.kind === 'vehicle_lane' || strip.kind === 'bus_lane' || strip.kind === 'shoulder') && strip.markingKey && strip.markingKey !== 'plain';
    const materialKey = isMarkingLane
      ? `lane|${strip.surfaceMaterial}|${strip.markingKey}`
      : strip.surfaceMaterial;
    const isParapet = strip.kind === 'parapet';
    const topOffset = strip.elevationOffsetMeters;

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 6.0;
      const v1 = f1.s / 6.0;
      const uSpan = isMarkingLane ? 1.0 : Math.max(0.25, strip.widthMeters * 0.35);

      const p0L = swOffsetPoint(f0, strip.xLeft, topOffset);
      const p0R = swOffsetPoint(f0, strip.xRight, topOffset);
      const p1R = swOffsetPoint(f1, strip.xRight, topOffset);
      const p1L = swOffsetPoint(f1, strip.xLeft, topOffset);

      batcher.addQuad(p0L, p0R, p1R, p1L, {
        layer: 'LayerA_PrimaryStructure',
        materialKey,
        surfaceStratum: isParapet ? 'barrier_top' : 'top_surface',
        expectUpwardNormals: true,
        uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
      });
    }

    // Parapet / raised median / curb vertical faces
    if (isParapet || strip.kind === 'median') {
      if (strip.elevationOffsetMeters > 0.01) {
        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          // Left vertical wall facing -right outward (p0Bot, p0Top, p1Top, p1Bot)
          swEmitSideWall(
            batcher,
            swOffsetPoint(f0, strip.xLeft, 0),
            swOffsetPoint(f0, strip.xLeft, topOffset),
            swOffsetPoint(f1, strip.xLeft, topOffset),
            swOffsetPoint(f1, strip.xLeft, 0),
            null,
            strip.surfaceMaterial
          );
          // Right vertical wall facing +right outward (p0Top, p0Bot, p1Bot, p1Top)
          swEmitSideWall(
            batcher,
            swOffsetPoint(f0, strip.xRight, topOffset),
            swOffsetPoint(f0, strip.xRight, 0),
            swOffsetPoint(f1, strip.xRight, 0),
            swOffsetPoint(f1, strip.xRight, topOffset),
            null,
            strip.surfaceMaterial
          );
        }
      }
    }
  }

  // 2. Curb vertical risers between road edge and sidewalk (zero overlap!)
  for (let sIdx = 0; sIdx < prof.strips.length; sIdx++) {
    const strip = prof.strips[sIdx];
    if (strip.kind !== 'curb' || strip.elevationOffsetMeters <= 0.01) continue;
    const isLeftSide = strip.xCenter < 0;
    const roadEdgeX = isLeftSide ? strip.xRight : strip.xLeft;
    const curbH = strip.elevationOffsetMeters;

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const p0Bot = swOffsetPoint(f0, roadEdgeX, 0);
      const p0Top = swOffsetPoint(f0, roadEdgeX, curbH);
      const p1Top = swOffsetPoint(f1, roadEdgeX, curbH);
      const p1Bot = swOffsetPoint(f1, roadEdgeX, 0);

      if (isLeftSide) {
        // Left curb face faces +right toward road: (p0Top, p0Bot, p1Bot, p1Top)
        batcher.addQuad(p0Top, p0Bot, p1Bot, p1Top, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'curb_stone',
          surfaceStratum: 'curb_face',
          uvs: [[0, 0], [0, 1], [1, 1], [1, 0]]
        });
      } else {
        // Right curb face faces -right toward road: (p0Bot, p0Top, p1Top, p1Bot)
        batcher.addQuad(p0Bot, p0Top, p1Top, p1Bot, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'curb_stone',
          surfaceStratum: 'curb_face',
          uvs: [[0, 0], [0, 1], [1, 1], [1, 0]]
        });
      }
    }
  }

  // 3. Outer understructure: embankment skirts on grade OR box-girder deck soffit on elevated
  const leftStrip = prof.strips[0];
  const rightStrip = prof.strips[prof.strips.length - 1];
  const outerLeftX = leftStrip.xLeft;
  const outerRightX = rightStrip.xRight;
  const outerLeftTopY = leftStrip.kind === 'parapet' ? 0 : leftStrip.elevationOffsetMeters;
  const outerRightTopY = rightStrip.kind === 'parapet' ? 0 : rightStrip.elevationOffsetMeters;
  const bottomY = isElevated ? -deckDepth : -skirtDepth;
  const underMat = isElevated ? 'deck_concrete' : 'concrete';

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];

    // Left outer side face facing -right: (p0Bot, p0Top, p1Top, p1Bot)
    batcher.addQuad(
      swOffsetPoint(f0, outerLeftX, bottomY),
      swOffsetPoint(f0, outerLeftX, outerLeftTopY),
      swOffsetPoint(f1, outerLeftX, outerLeftTopY),
      swOffsetPoint(f1, outerLeftX, bottomY),
      { layer: 'LayerA_PrimaryStructure', materialKey: underMat, surfaceStratum: 'deck_side' }
    );

    // Right outer side face facing +right: (p0Top, p0Bot, p1Bot, p1Top)
    batcher.addQuad(
      swOffsetPoint(f0, outerRightX, outerRightTopY),
      swOffsetPoint(f0, outerRightX, bottomY),
      swOffsetPoint(f1, outerRightX, bottomY),
      swOffsetPoint(f1, outerRightX, outerRightTopY),
      { layer: 'LayerA_PrimaryStructure', materialKey: underMat, surfaceStratum: 'deck_side' }
    );

    // Underside soffit on elevated bridges/overpasses (faces -Y downward)
    if (isElevated) {
      const soffitHalf = Math.max(1.2, (outerRightX - outerLeftX) * 0.42);
      const b0L = swOffsetPoint(f0, -soffitHalf, bottomY);
      const b0R = swOffsetPoint(f0, soffitHalf, bottomY);
      const b1R = swOffsetPoint(f1, soffitHalf, bottomY);
      const b1L = swOffsetPoint(f1, -soffitHalf, bottomY);
      // Reverse winding for -Y downward normal: (b0L, b1L, b1R, b0R)
      batcher.addQuad(b0L, b1L, b1R, b0R, {
        layer: 'LayerA_PrimaryStructure',
        materialKey: 'deck_concrete',
        surfaceStratum: 'deck_soffit'
      });
    }
  }

  // 4. Clean end-caps on open endpoint nodes (prevents hollow ends on elevated decks or raised roads)
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);
  if (startNode?.kind === 'endpoint' && frames.length >= 2) {
    const f0 = frames[0];
    const pLTop = swOffsetPoint(f0, outerLeftX, Math.max(0, outerLeftTopY));
    const pRTop = swOffsetPoint(f0, outerRightX, Math.max(0, outerRightTopY));
    const pRBot = swOffsetPoint(f0, outerRightX, bottomY);
    const pLBot = swOffsetPoint(f0, outerLeftX, bottomY);
    // Faces -T backward: (pRTop, pLTop, pLBot, pRBot)
    batcher.addQuad(pRTop, pLTop, pLBot, pRBot, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: underMat,
      surfaceStratum: 'end_cap'
    });
  }
  if (endNode?.kind === 'endpoint' && frames.length >= 2) {
    const fEnd = frames[frames.length - 1];
    const pLTop = swOffsetPoint(fEnd, outerLeftX, Math.max(0, outerLeftTopY));
    const pRTop = swOffsetPoint(fEnd, outerRightX, Math.max(0, outerRightTopY));
    const pRBot = swOffsetPoint(fEnd, outerRightX, bottomY);
    const pLBot = swOffsetPoint(fEnd, outerLeftX, bottomY);
    // Faces +T forward: (pLTop, pRTop, pRBot, pLBot)
    batcher.addQuad(pLTop, pRTop, pRBot, pLBot, {
      layer: 'LayerA_PrimaryStructure',
      materialKey: underMat,
      surfaceStratum: 'end_cap'
    });
  }

  // 5. Embedded Streetcar / Tram Overhead Catenary & Boarding Island (only on streets carrying embedded trams)
  if (prof.hasEmbeddedTram && Array.isArray(prof.tramTrackOffsets) && prof.tramTrackOffsets.length > 0) {
    const includePoles = Boolean(edge.params?.includeTramPoles);
    const includePlatform = Boolean(edge.params?.includeTramPlatform);

    if (includePoles && frames.length >= 3) {
      const wireY = 5.45;
      const mastH = 6.2;
      const spanXLeft = prof.drivableMinX - 0.35;
      const spanXRight = prof.drivableMaxX + 0.35;
      const targetIndices = [];
      let nextS = 3.0;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].s >= nextS || (i === frames.length - 1 && samp.lengthMeters > 10 && frames[i].s - (frames[targetIndices[targetIndices.length - 1]]?.s || 0) > 6)) {
          targetIndices.push(i);
          nextS = frames[i].s + 22.0;
        }
      }
      if (targetIndices.length < 2 && frames.length >= 2) {
        targetIndices.length = 0;
        targetIndices.push(0, frames.length - 1);
      }

      const prevContactPts = new Map();
      for (const fi of targetIndices) {
        const fr = frames[fi];
        const leftBase = swOffsetPoint(fr, spanXLeft, prof.curbHeightMeters || 0.15);
        const rightBase = swOffsetPoint(fr, spanXRight, prof.curbHeightMeters || 0.15);
        batcher.addCylinderY(leftBase[0], leftBase[1], leftBase[2], 0.13, 0.09, mastH, 8, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_structure',
          surfaceStratum: 'catenary_mast'
        });
        batcher.addCylinderY(rightBase[0], rightBase[1], rightBase[2], 0.13, 0.09, mastH, 8, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_structure',
          surfaceStratum: 'catenary_mast'
        });
        const leftTop = [leftBase[0], leftBase[1] + mastH - 0.15, leftBase[2]];
        const rightTop = [rightBase[0], rightBase[1] + mastH - 0.15, rightBase[2]];
        geoPrimAddSagWire(batcher, leftTop, rightTop, 0.22, 0.024, 5, { materialKey: 'wire_copper' });

        for (let t = 0; t < prof.tramTrackOffsets.length; t++) {
          const tx = prof.tramTrackOffsets[t];
          const cPt = swOffsetPoint(fr, tx, wireY);
          const supportPt = swOffsetPoint(fr, tx, wireY + 0.35);
          geoPrimAddBeamBetween(batcher, supportPt, cPt, 0.05, 0.05, { materialKey: 'steel_structure', surfaceStratum: 'fixture' });
          if (prevContactPts.has(t)) {
            geoPrimAddSagWire(batcher, prevContactPts.get(t), cPt, 0.12, 0.028, 6, { materialKey: 'wire_copper' });
          }
          prevContactPts.set(t, cPt);
        }
      }
    }

    if (includePlatform && samp.lengthMeters >= 16) {
      const centerTramStrip = prof.strips.find((s) => s.kind === 'tram_embedded');
      const isDouble = prof.tramTrackOffsets.length >= 2;
      if (isDouble && centerTramStrip) {
        const islandMeta = geoPrimAddPlatformAssembly(
          batcher,
          frames,
          1,
          centerTramStrip.xCenter - 0.56,
          1.12,
          0.28,
          0.3,
          0.7,
          {
            id: `plat_${edge.id}_tram`,
            deckBottomY: 0,
            deckMaterial: 'concrete',
            canopyMaterial: 'steel_structure',
            includeCanopy: true,
            glassWalls: false
          }
        );
        if (islandMeta && collectors?.platforms) collectors.platforms.push({ ...islandMeta, edgeId: edge.id });
      } else {
        const platMeta = geoPrimAddPlatformAssembly(
          batcher,
          frames,
          1,
          prof.drivableMaxX + 0.08,
          1.75,
          0.3,
          0.3,
          0.7,
          {
            id: `plat_${edge.id}_tram`,
            deckBottomY: 0,
            deckMaterial: 'concrete',
            canopyMaterial: 'steel_structure',
            includeCanopy: true,
            glassWalls: true
          }
        );
        if (platMeta && collectors?.platforms) collectors.platforms.push({ ...platMeta, edgeId: edge.id });
      }
    }
  }
}
