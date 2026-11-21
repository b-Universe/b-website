import { INFRA_DEFAULTS, infraVecToBGameUnits } from '../config.js';
import { infraClamp, infraRound, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function geoPedPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

export function geoBuildPedestrianEdge(batcher, edge, samp, prof, doc, collectors = null) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const pedType = p.pedestrianType || 'walkway';
  const isElevated = edge.elevationMode === 'elevated' || pedType === 'skybridge';
  const isStairs = pedType === 'stairs_corridor';
  const walkW = infraClamp(p.walkwayWidth || 4.0, 1.6, 12.0);
  const halfW = prof.halfWidthMeters;

  // Special case: Stepped Staircase Corridor between nodes of differing elevation
  if (isStairs) {
    const startY = frames[0].position[1];
    const endY = frames[frames.length - 1].position[1];
    const dzTotal = Math.abs(endY - startY);
    if (dzTotal > 0.35) {
      const sign = endY >= startY ? 1 : -1;
      const maxRise = Math.min(Number(p.maxStepRiseMeters) || 0.19, INFRA_DEFAULTS.maxPlayerStepRiseMeters);
      const stepCount = Math.max(4, Math.ceil(dzTotal / maxRise));
      const actualRise = dzTotal / stepCount;
      const deckStrip = prof.strips.find((s) => s.kind === 'walkway_deck') || prof.strips[0];
      const treadMat = deckStrip?.surfaceMaterial || 'tile_plaza';

      for (let s = 0; s < stepCount; s++) {
        const fRatio = (s + 0.5) / stepCount;
        const idx = Math.min(frames.length - 2, Math.floor(fRatio * (frames.length - 1)));
        const f = frames[idx];
        const stepY = startY + sign * (s + 0.5) * actualRise;
        const stepLen = Math.max(0.28, (samp.lengthMeters || 12) / stepCount);
        batcher.addBoxOriented(
          [f.position[0], stepY - actualRise * 0.5, f.position[2]],
          f.tangent,
          f.right,
          [0, 1, 0],
          walkW,
          actualRise + 0.12,
          stepLen + 0.08,
          { layer: 'LayerA_PrimaryStructure', materialKey: treadMat, surfaceStratum: 'stair_tread' }
        );
      }
      // Solid sloped cheek walls + continuous twin steel handrails along stair corridor
      for (const sSide of [-1, 1]) {
        const cx = sSide * (walkW * 0.5 + 0.18);
        for (let i = 0; i < frames.length - 1; i++) {
          const f0 = frames[i];
          const f1 = frames[i + 1];
          geoPrimAddBeamBetween(batcher, geoPedPt(f0, cx, 0.18), geoPedPt(f1, cx, 0.18), 0.3, 0.65, { materialKey: 'curb_stone', surfaceStratum: 'stair_stringer' });
          geoPrimAddBeamBetween(batcher, geoPedPt(f0, cx, 1.05), geoPedPt(f1, cx, 1.05), 0.07, 0.07, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
        }
      }
      collectors?.stairs?.push({
        id: `stair_${edge.id}`,
        edgeId: edge.id,
        stepCount,
        stepRiseMeters: infraRound(actualRise, 4),
        stepRunMeters: infraRound((samp.lengthMeters || 12) / stepCount, 3),
        clearWidthMeters: walkW,
        landingCount: Math.floor(stepCount / 14),
        headroomMeters: 2.35,
        startPosMeters: [...frames[0].position],
        endPosMeters: [...frames[frames.length - 1].position],
        coordinatesZUp: {
          start: infraVecToBGameUnits(...frames[0].position),
          end: infraVecToBGameUnits(...frames[frames.length - 1].position)
        }
      });
      return;
    }
  }

  // 1. Standard Walkway / Plaza / ADA Ramp / Skybridge floor deck sweep (zero overlap)
  for (const strip of prof.strips) {
    const topY = strip.elevationOffsetMeters;
    const uSpan = Math.max(0.3, strip.widthMeters * 0.4);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 4.0;
      const v1 = f1.s / 4.0;
      batcher.addQuad(
        geoPedPt(f0, strip.xLeft, topY),
        geoPedPt(f0, strip.xRight, topY),
        geoPedPt(f1, strip.xRight, topY),
        geoPedPt(f1, strip.xLeft, topY),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: strip.surfaceMaterial,
          surfaceStratum: 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );
      if (topY > 0.02) {
        batcher.addQuad(geoPedPt(f0, strip.xLeft, 0), geoPedPt(f0, strip.xLeft, topY), geoPedPt(f1, strip.xLeft, topY), geoPedPt(f1, strip.xLeft, 0), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
        batcher.addQuad(geoPedPt(f0, strip.xRight, topY), geoPedPt(f0, strip.xRight, 0), geoPedPt(f1, strip.xRight, 0), geoPedPt(f1, strip.xRight, topY), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
      }
    }
  }

  // Side & soffit walls
  const botY = isElevated ? -(Number(prof.understructure?.deckThicknessMeters) || 0.45) : -0.25;
  const sideMat = isElevated ? 'steel_structure' : 'curb_stone';
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    batcher.addQuad(geoPedPt(f0, -halfW, botY), geoPedPt(f0, -halfW, 0.08), geoPedPt(f1, -halfW, 0.08), geoPedPt(f1, -halfW, botY), { layer: 'LayerA_PrimaryStructure', materialKey: sideMat, surfaceStratum: 'deck_side' });
    batcher.addQuad(geoPedPt(f0, halfW, 0.08), geoPedPt(f0, halfW, botY), geoPedPt(f1, halfW, botY), geoPedPt(f1, halfW, 0.08), { layer: 'LayerA_PrimaryStructure', materialKey: sideMat, surfaceStratum: 'deck_side' });
    if (isElevated) {
      batcher.addQuad(geoPedPt(f0, -halfW, botY), geoPedPt(f1, -halfW, botY), geoPedPt(f1, halfW, botY), geoPedPt(f0, halfW, botY), { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'deck_soffit' });
    }
  }

  // 2. Enclosed Steel & Glass Skybridge Superstructure + Grounded Portal Supports
  if (isElevated && pedType === 'skybridge') {
    const frameX = halfW - 0.14;
    const roofH = 2.85;
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      for (const sSide of [-1, 1]) {
        const sx = sSide * frameX;
        geoPrimAddBeamBetween(batcher, geoPedPt(f0, sx, 0.14), geoPedPt(f0, sx, roofH), 0.14, 0.14, { materialKey: 'steel_structure', surfaceStratum: 'skybridge_frame' });
        geoPrimAddBeamBetween(batcher, geoPedPt(f0, sx, roofH), geoPedPt(f1, sx, roofH), 0.16, 0.16, { materialKey: 'steel_structure', surfaceStratum: 'skybridge_frame' });
        batcher.addQuad(
          geoPedPt(f0, sx, 0.25),
          geoPedPt(f0, sx, roofH - 0.12),
          geoPedPt(f1, sx, roofH - 0.12),
          geoPedPt(f1, sx, 0.25),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'glass_station', surfaceStratum: 'station_glass' }
        );
      }
      if (p.includeCanopy !== false) {
        batcher.addQuad(geoPedPt(f0, -frameX - 0.15, roofH + 0.08), geoPedPt(f0, frameX + 0.15, roofH + 0.08), geoPedPt(f1, frameX + 0.15, roofH + 0.08), geoPedPt(f1, -frameX - 0.15, roofH + 0.08), {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_structure',
          surfaceStratum: 'canopy_roof',
          expectUpwardNormals: true
        });
        batcher.addQuad(geoPedPt(f0, -frameX - 0.15, roofH - 0.08), geoPedPt(f1, -frameX - 0.15, roofH - 0.08), geoPedPt(f1, frameX + 0.15, roofH - 0.08), geoPedPt(f0, frameX + 0.15, roofH - 0.08), {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_structure',
          surfaceStratum: 'canopy_soffit'
        });
      }
      if (i % 3 === 1) {
        batcher.addBoxOriented(geoPedPt(f0, 0, roofH - 0.18), f0.tangent, f0.right, [0, 1, 0], 0.55, 0.08, 0.22, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
      }
    }
    // Grounded end portal towers when elevated above ground
    for (const fEnd of [frames[0], frames[frames.length - 1]]) {
      if (fEnd.position[1] > 1.0) {
        for (const sSide of [-1, 1]) {
          const px = sSide * frameX;
          const groundBase = [fEnd.position[0] + fEnd.right[0] * px, -0.25, fEnd.position[2] + fEnd.right[2] * px];
          geoPrimAddBeamBetween(batcher, groundBase, geoPedPt(fEnd, px, 0.15), 0.34, 0.34, { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' });
          batcher.addBoxOriented([groundBase[0], 0.15, groundBase[2]], fEnd.tangent, fEnd.right, [0, 1, 0], 0.85, 0.75, 0.85, { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' });
        }
      }
    }
    return;
  }

  // 3. Handrails (ADA ramp) & Safety Bollards / Pedestrian Lamps (Walkway & Plaza)
  if ((pedType === 'ada_ramp' || p.includeHandrails) && frames.length >= 2) {
    const railLat = walkW * 0.5 + 0.08;
    for (const sSide of [-1, 1]) {
      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        geoPrimAddBeamBetween(batcher, geoPedPt(f0, sSide * railLat, 1.0), geoPedPt(f1, sSide * railLat, 1.0), 0.06, 0.06, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
        if (pedType === 'ada_ramp') {
          geoPrimAddBeamBetween(batcher, geoPedPt(f0, sSide * railLat, 0.68), geoPedPt(f1, sSide * railLat, 0.68), 0.05, 0.05, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
        }
        if (i % 2 === 0) {
          geoPrimAddBeamBetween(batcher, geoPedPt(f0, sSide * railLat, 0.1), geoPedPt(f0, sSide * railLat, 1.0), 0.06, 0.06, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
        }
      }
    }
  }

  if (p.includeLighting !== false && !isStairs) {
    let nextS = frames[0].s + 4.5;
    for (const f of frames) {
      if (f.s < nextS) continue;
      nextS = f.s + 14.0;
      const lx = -halfW + 0.45;
      const postBot = geoPedPt(f, lx, 0.08);
      const postTop = [postBot[0], postBot[1] + 3.1, postBot[2]];
      geoPrimAddBeamBetween(batcher, postBot, postTop, 0.11, 0.11, { materialKey: 'steel_structure', surfaceStratum: 'lamp_post' });
      batcher.addBoxOriented(postTop, f.tangent, f.right, [0, 1, 0], 0.28, 0.28, 0.28, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
    }
  }
}
