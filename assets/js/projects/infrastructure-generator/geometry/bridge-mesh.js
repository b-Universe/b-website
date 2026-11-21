import { infraClamp, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween, geoPrimAddTrussPanel } from './primitives.js';

function geoBrgPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function geoBrgFindFrameAtU(frames, uTarget) {
  let best = frames[0];
  let bestDiff = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.u - uTarget);
    if (d < bestDiff) {
      bestDiff = d;
      best = f;
    }
  }
  return best;
}

export function geoBuildBridgeEdge(batcher, edge, samp, prof, doc) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const bridgeType = p.bridgeType || 'cable_stayed';
  const deckDepth = Number(prof.understructure?.deckThicknessMeters) || infraClamp(p.deckThickness, 0.5, 1.8);
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);

  // 1. Sweep non-overlapping bridge deck strips + raised parapets + soffit
  for (const strip of prof.strips) {
    const isMarkingLane = strip.kind === 'vehicle_lane' && strip.markingKey && strip.markingKey !== 'plain';
    const matKey = isMarkingLane ? `lane|${strip.surfaceMaterial}|${strip.markingKey}` : strip.surfaceMaterial;
    const isParapet = strip.kind === 'parapet';
    const topY = strip.elevationOffsetMeters;

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 6.0;
      const v1 = f1.s / 6.0;
      const uSpan = isMarkingLane ? 1.0 : Math.max(0.25, strip.widthMeters * 0.35);

      batcher.addQuad(
        geoBrgPt(f0, strip.xLeft, topY),
        geoBrgPt(f0, strip.xRight, topY),
        geoBrgPt(f1, strip.xRight, topY),
        geoBrgPt(f1, strip.xLeft, topY),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: matKey,
          surfaceStratum: isParapet ? 'barrier_top' : 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );

      if (strip.elevationOffsetMeters > 0.02) {
        batcher.addQuad(
          geoBrgPt(f0, strip.xLeft, 0),
          geoBrgPt(f0, strip.xLeft, topY),
          geoBrgPt(f1, strip.xLeft, topY),
          geoBrgPt(f1, strip.xLeft, 0),
          { layer: 'LayerA_PrimaryStructure', materialKey: strip.surfaceMaterial, surfaceStratum: 'side_wall' }
        );
        batcher.addQuad(
          geoBrgPt(f0, strip.xRight, topY),
          geoBrgPt(f0, strip.xRight, 0),
          geoBrgPt(f1, strip.xRight, 0),
          geoBrgPt(f1, strip.xRight, topY),
          { layer: 'LayerA_PrimaryStructure', materialKey: strip.surfaceMaterial, surfaceStratum: 'side_wall' }
        );
      }
    }
  }

  const outerL = prof.strips[0].xLeft;
  const outerR = prof.strips[prof.strips.length - 1].xRight;
  const deckMat = bridgeType === 'stone_viaduct' ? 'stone_masonry' : 'deck_concrete';

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    batcher.addQuad(
      geoBrgPt(f0, outerL, -deckDepth),
      geoBrgPt(f0, outerL, 0),
      geoBrgPt(f1, outerL, 0),
      geoBrgPt(f1, outerL, -deckDepth),
      { layer: 'LayerA_PrimaryStructure', materialKey: deckMat, surfaceStratum: 'deck_side' }
    );
    batcher.addQuad(
      geoBrgPt(f0, outerR, 0),
      geoBrgPt(f0, outerR, -deckDepth),
      geoBrgPt(f1, outerR, -deckDepth),
      geoBrgPt(f1, outerR, 0),
      { layer: 'LayerA_PrimaryStructure', materialKey: deckMat, surfaceStratum: 'deck_side' }
    );
    batcher.addQuad(
      geoBrgPt(f0, outerL * 0.92, -deckDepth),
      geoBrgPt(f1, outerL * 0.92, -deckDepth),
      geoBrgPt(f1, outerR * 0.92, -deckDepth),
      geoBrgPt(f0, outerR * 0.92, -deckDepth),
      { layer: 'LayerA_PrimaryStructure', materialKey: deckMat, surfaceStratum: 'deck_soffit' }
    );
  }

  // Grounded stone/concrete end abutments when open endpoint is elevated above ground
  for (const ep of [
    { node: startNode, f: frames[0] },
    { node: endNode, f: frames[frames.length - 1] }
  ]) {
    if (ep.node?.kind === 'endpoint' && ep.f.position[1] > 1.2) {
      const h = ep.f.position[1] + 0.25;
      batcher.addBoxOriented(
        [ep.f.position[0], -0.25 + h * 0.5, ep.f.position[2]],
        ep.f.tangent,
        ep.f.right,
        [0, 1, 0],
        prof.totalWidthMeters + 0.6,
        h,
        1.6,
        { layer: 'LayerB_StructuralSupports', materialKey: bridgeType === 'stone_viaduct' ? 'stone_masonry' : 'pier_concrete', surfaceStratum: 'structural_support' }
      );
    }
  }

  // 2. Superstructure by structural bridge engineering type
  const edgeX = outerR - 0.22;

  if (bridgeType === 'arch_deck') {
    const rise = infraClamp(p.archRiseMeters || 5.5, 2.5, Math.max(3.5, frames[Math.floor(frames.length * 0.5)].position[1] + 2.5));
    const archPt = (f, latSign) => {
      const u = f.u;
      const crownY = f.position[1] - deckDepth - 0.18;
      const springY = Math.max(0.25, f.position[1] - rise);
      const yVal = springY + (crownY - springY) * (4 * u * (1 - u));
      return [f.position[0] + f.right[0] * (latSign * edgeX * 0.88), yVal, f.position[2] + f.right[2] * (latSign * edgeX * 0.88)];
    };

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      for (const sSide of [-1, 1]) {
        const a0 = archPt(f0, sSide);
        const a1 = archPt(f1, sSide);
        geoPrimAddBeamBetween(batcher, a0, a1, 0.52, 0.58, {
          layer: 'LayerB_StructuralSupports',
          materialKey: 'steel_structure',
          surfaceStratum: 'arch_rib'
        });
      }
      if (i % 2 === 0 && i > 0 && i < frames.length - 1) {
        const aL = archPt(f0, -1);
        const aR = archPt(f0, 1);
        geoPrimAddBeamBetween(batcher, aL, aR, 0.22, 0.22, { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'arch_brace' });
        for (const sSide of [-1, 1]) {
          const ribPt = archPt(f0, sSide);
          const soffitPt = geoBrgPt(f0, sSide * edgeX * 0.88, -deckDepth);
          if (soffitPt[1] - ribPt[1] > 0.25) {
            geoPrimAddBeamBetween(batcher, ribPt, soffitPt, 0.34, 0.34, { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'spandrel_col' });
          }
        }
      }
    }
  } else if (bridgeType === 'through_truss') {
    const trussH = infraClamp(p.trussHeightMeters || 5.4, 4.6, 7.2);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const isEnd = i === frames.length - 2;
      geoPrimAddTrussPanel(
        batcher,
        geoBrgPt(f0, -edgeX, -0.2),
        geoBrgPt(f0, -edgeX, trussH),
        geoBrgPt(f1, -edgeX, trussH),
        geoBrgPt(f1, -edgeX, -0.2),
        0.24,
        { flipDiagonal: i % 2 === 1, includeEndPost: isEnd, materialKey: 'steel_structure' }
      );
      geoPrimAddTrussPanel(
        batcher,
        geoBrgPt(f0, edgeX, -0.2),
        geoBrgPt(f0, edgeX, trussH),
        geoBrgPt(f1, edgeX, trussH),
        geoBrgPt(f1, edgeX, -0.2),
        0.24,
        { flipDiagonal: i % 2 === 1, includeEndPost: isEnd, materialKey: 'steel_structure' }
      );
      // Overhead portal sway frames & top wind-bracing
      geoPrimAddBeamBetween(batcher, geoBrgPt(f0, -edgeX, trussH), geoBrgPt(f0, edgeX, trussH), 0.24, 0.26, { materialKey: 'steel_structure', surfaceStratum: 'truss_member' });
      geoPrimAddBeamBetween(batcher, geoBrgPt(f0, -edgeX, trussH), geoBrgPt(f1, edgeX, trussH), 0.14, 0.14, { materialKey: 'steel_structure', surfaceStratum: 'truss_member' });
      if (isEnd) {
        geoPrimAddBeamBetween(batcher, geoBrgPt(f1, -edgeX, trussH), geoBrgPt(f1, edgeX, trussH), 0.24, 0.26, { materialKey: 'steel_structure', surfaceStratum: 'truss_member' });
      }
    }
  } else if (bridgeType === 'cable_stayed' || bridgeType === 'suspension') {
    const towerH = infraClamp(p.towerHeightMeters || 16.0, 9.5, 26.0);
    const uTowers = samp.lengthMeters >= 28 ? [0.24, 0.76] : [0.5];
    const towerFrames = uTowers.map((u) => geoBrgFindFrameAtU(frames, u));

    for (const tf of towerFrames) {
      const topY = tf.position[1] + towerH;
      const baseFootY = -0.25;
      const towerLat = edgeX + 0.35;
      for (const sSide of [-1, 1]) {
        const botPt = [tf.position[0] + tf.right[0] * (sSide * towerLat), baseFootY, tf.position[2] + tf.right[2] * (sSide * towerLat)];
        const topPt = [tf.position[0] + tf.right[0] * (sSide * towerLat), topY, tf.position[2] + tf.right[2] * (sSide * towerLat)];
        geoPrimAddBeamBetween(batcher, botPt, topPt, 0.85, 0.95, {
          layer: 'LayerB_StructuralSupports',
          materialKey: 'pier_concrete',
          surfaceStratum: 'structural_support'
        });
        batcher.addBoxOriented([botPt[0], 0.2, botPt[2]], tf.tangent, tf.right, [0, 1, 0], 1.8, 0.9, 2.0, {
          layer: 'LayerB_StructuralSupports',
          materialKey: 'pier_concrete',
          surfaceStratum: 'structural_support'
        });
      }
      // Upper portal strut & deck soffit pier cap
      geoPrimAddBeamBetween(
        batcher,
        [tf.position[0] - tf.right[0] * towerLat, topY - 1.1, tf.position[2] - tf.right[2] * towerLat],
        [tf.position[0] + tf.right[0] * towerLat, topY - 1.1, tf.position[2] + tf.right[2] * towerLat],
        0.65,
        0.85,
        { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' }
      );
      geoPrimAddBeamBetween(
        batcher,
        [tf.position[0] - tf.right[0] * towerLat, tf.position[1] - deckDepth - 0.2, tf.position[2] - tf.right[2] * towerLat],
        [tf.position[0] + tf.right[0] * towerLat, tf.position[1] - deckDepth - 0.2, tf.position[2] + tf.right[2] * towerLat],
        0.75,
        0.85,
        { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' }
      );
    }

    if (bridgeType === 'cable_stayed') {
      const cableN = Math.round(infraClamp(p.cableCountPerSide || 6, 3, 10));
      for (const tf of towerFrames) {
        const anchorTopY = tf.position[1] + towerH * 0.92;
        const towerLat = edgeX + 0.35;
        for (const sSide of [-1, 1]) {
          const pylonAnchor = [
            tf.position[0] + tf.right[0] * (sSide * towerLat),
            anchorTopY,
            tf.position[2] + tf.right[2] * (sSide * towerLat)
          ];
          for (let c = 1; c <= cableN; c++) {
            const frac = (c / (cableN + 1)) * 0.28;
            for (const dir of [-1, 1]) {
              const targetU = infraClamp(tf.u + dir * frac, 0.04, 0.96);
              const df = geoBrgFindFrameAtU(frames, targetU);
              const deckPt = geoBrgPt(df, sSide * edgeX, 0.85);
              geoPrimAddBeamBetween(batcher, pylonAnchor, deckPt, 0.075, 0.075, {
                layer: 'LayerA_PrimaryStructure',
                materialKey: 'bridge_cable',
                surfaceStratum: 'stay_cable'
              });
            }
          }
        }
      }
    } else {
      // Suspension main parabolic catenary cables & vertical suspenders
      const towerU0 = towerFrames[0].u;
      const towerU1 = towerFrames[towerFrames.length - 1].u;
      const sagMid = Math.max(2.2, towerH * 0.22);
      const cableYAtU = (f) => {
        const deckTop = f.position[1];
        if (towerFrames.length === 1) {
          const d = Math.abs(f.u - 0.5) * 2;
          return deckTop + 1.2 + (towerH - 1.2) * (1 - d * d);
        }
        if (f.u <= towerU0) {
          const r = f.u / Math.max(0.05, towerU0);
          return deckTop + 1.2 + (towerH - 1.2) * r * r;
        }
        if (f.u >= towerU1) {
          const r = (1 - f.u) / Math.max(0.05, 1 - towerU1);
          return deckTop + 1.2 + (towerH - 1.2) * r * r;
        }
        const span = Math.max(0.1, towerU1 - towerU0);
        const mid = (f.u - towerU0) / span;
        return deckTop + sagMid + (towerH - sagMid) * 4 * (mid - 0.5) * (mid - 0.5);
      };

      const towerLat = edgeX + 0.35;
      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        const y0 = cableYAtU(f0);
        const y1 = cableYAtU(f1);
        for (const sSide of [-1, 1]) {
          const p0 = [f0.position[0] + f0.right[0] * (sSide * towerLat), y0, f0.position[2] + f0.right[2] * (sSide * towerLat)];
          const p1 = [f1.position[0] + f1.right[0] * (sSide * towerLat), y1, f1.position[2] + f1.right[2] * (sSide * towerLat)];
          geoPrimAddBeamBetween(batcher, p0, p1, 0.2, 0.2, {
            layer: 'LayerA_PrimaryStructure',
            materialKey: 'bridge_cable',
            surfaceStratum: 'main_cable'
          });
          if (i % 2 === 0 && y0 > f0.position[1] + 1.3) {
            const hangerBot = geoBrgPt(f0, sSide * edgeX, 0.85);
            geoPrimAddBeamBetween(batcher, p0, hangerBot, 0.06, 0.06, {
              layer: 'LayerA_PrimaryStructure',
              materialKey: 'bridge_cable',
              surfaceStratum: 'hanger_cable'
            });
          }
        }
      }
    }
  } else if (bridgeType === 'stone_viaduct') {
    const bayCount = Math.max(2, Math.min(6, Math.round(samp.lengthMeters / 12)));
    for (let b = 0; b <= bayCount; b++) {
      const f = geoBrgFindFrameAtU(frames, b / bayCount);
      const h = f.position[1] - deckDepth + 0.25;
      if (h > 0.3) {
        batcher.addBoxOriented(
          [f.position[0], -0.25 + h * 0.5, f.position[2]],
          f.tangent,
          f.right,
          [0, 1, 0],
          prof.totalWidthMeters * 0.92,
          h,
          1.45,
          { layer: 'LayerB_StructuralSupports', materialKey: 'stone_masonry', surfaceStratum: 'structural_support' }
        );
      }
    }
    // Masonry arch voussoir ribs beneath deck in each bay
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const bayPhase0 = (f0.u * bayCount) % 1;
      const bayPhase1 = (f1.u * bayCount) % 1;
      if (bayPhase1 < bayPhase0) continue;
      const archDrop0 = 2.6 * (1 - 4 * (bayPhase0 - 0.5) * (bayPhase0 - 0.5));
      const archDrop1 = 2.6 * (1 - 4 * (bayPhase1 - 0.5) * (bayPhase1 - 0.5));
      for (const sSide of [-1, 1]) {
        geoPrimAddBeamBetween(
          batcher,
          geoBrgPt(f0, sSide * outerR * 0.86, -deckDepth - Math.max(0.15, 2.8 - archDrop0)),
          geoBrgPt(f1, sSide * outerR * 0.86, -deckDepth - Math.max(0.15, 2.8 - archDrop1)),
          0.45,
          0.55,
          { layer: 'LayerB_StructuralSupports', materialKey: 'stone_masonry', surfaceStratum: 'arch_rib' }
        );
      }
    }
  }

  // 3. Optional Deck Streetlamps along outer sidewalks/parapets
  if (p.includeLighting !== false && frames.length >= 3) {
    let nextS = frames[0].s + 5.0;
    for (const f of frames) {
      if (f.s < nextS) continue;
      nextS = f.s + 16.0;
      for (const sSide of [-1, 1]) {
        const postBase = geoBrgPt(f, sSide * (outerR - 0.25), 0.9);
        const postTop = [postBase[0], postBase[1] + 3.6, postBase[2]];
        geoPrimAddBeamBetween(batcher, postBase, postTop, 0.1, 0.1, { materialKey: 'steel_structure', surfaceStratum: 'lamp_post' });
        const head = geoBrgPt(f, sSide * (outerR - 0.95), 4.4);
        geoPrimAddBeamBetween(batcher, postTop, head, 0.08, 0.08, { materialKey: 'steel_structure', surfaceStratum: 'lamp_arm' });
        batcher.addBoxOriented(head, f.tangent, f.right, [0, 1, 0], 0.35, 0.1, 0.22, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
      }
    }
  }
}
