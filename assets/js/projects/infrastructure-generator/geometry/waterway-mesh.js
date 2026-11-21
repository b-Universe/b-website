import { infraClamp, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function geoWatPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

export function geoBuildWaterwayEdge(batcher, edge, samp, prof, doc) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const chanDepth = infraClamp(p.channelDepthMeters || 2.6, 1.2, 5.0);
  const waterDepth = infraClamp(p.waterDepthMeters || 2.1, 0.5, chanDepth - 0.15);
  const waterY = -(chanDepth - waterDepth);
  const wallMat = p.wallMaterial || 'stone_masonry';
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);

  const channelStrip = prof.strips.find((s) => s.kind === 'waterway_channel');
  const outerL = prof.strips[0].xLeft;
  const outerR = prof.strips[prof.strips.length - 1].xRight;

  // 1. Sweep strictly non-overlapping towpaths, quay copings, excavated bed, and specular water surface
  for (const strip of prof.strips) {
    if (strip.kind === 'waterway_channel') {
      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        const v0 = f0.s / 6.0;
        const v1 = f1.s / 6.0;
        // Canal floor bed at -chanDepth (distinct stratum so never conflicts)
        batcher.addQuad(
          geoWatPt(f0, strip.xLeft, -chanDepth),
          geoWatPt(f0, strip.xRight, -chanDepth),
          geoWatPt(f1, strip.xRight, -chanDepth),
          geoWatPt(f1, strip.xLeft, -chanDepth),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'gravel', surfaceStratum: 'canal_bed', expectUpwardNormals: true, uvs: [[0, v0], [2, v0], [2, v1], [0, v1]] }
        );
        // Translucent specular water ribbon at waterY
        batcher.addQuad(
          geoWatPt(f0, strip.xLeft, waterY),
          geoWatPt(f0, strip.xRight, waterY),
          geoWatPt(f1, strip.xRight, waterY),
          geoWatPt(f1, strip.xLeft, waterY),
          { layer: 'LayerC_MarkingsAndSurface', materialKey: 'water_canal', surfaceStratum: 'water_surface', expectUpwardNormals: true, uvs: [[0, v0], [2, v0], [2, v1], [0, v1]] }
        );
      }
      continue;
    }

    const topY = strip.elevationOffsetMeters;
    const uSpan = Math.max(0.25, strip.widthMeters * 0.4);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 5.0;
      const v1 = f1.s / 5.0;
      batcher.addQuad(
        geoWatPt(f0, strip.xLeft, topY),
        geoWatPt(f0, strip.xRight, topY),
        geoWatPt(f1, strip.xRight, topY),
        geoWatPt(f1, strip.xLeft, topY),
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

  // 2. Vertical / battered quay walls facing canal channel + outer embankment skirts
  if (channelStrip) {
    const wallTopY = 0.36;
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      // Left quay inner face (+right): (top@f0, bot@f0, bot@f1, top@f1)
      batcher.addQuad(
        geoWatPt(f0, channelStrip.xLeft, wallTopY),
        geoWatPt(f0, channelStrip.xLeft, -chanDepth),
        geoWatPt(f1, channelStrip.xLeft, -chanDepth),
        geoWatPt(f1, channelStrip.xLeft, wallTopY),
        { layer: 'LayerA_PrimaryStructure', materialKey: wallMat, surfaceStratum: 'quay_wall' }
      );
      // Right quay inner face (-right): (bot@f0, top@f0, top@f1, bot@f1)
      batcher.addQuad(
        geoWatPt(f0, channelStrip.xRight, -chanDepth),
        geoWatPt(f0, channelStrip.xRight, wallTopY),
        geoWatPt(f1, channelStrip.xRight, wallTopY),
        geoWatPt(f1, channelStrip.xRight, -chanDepth),
        { layer: 'LayerA_PrimaryStructure', materialKey: wallMat, surfaceStratum: 'quay_wall' }
      );
      // Outer bank skirts down to -0.35
      batcher.addQuad(geoWatPt(f0, outerL, -0.35), geoWatPt(f0, outerL, 0.22), geoWatPt(f1, outerL, 0.22), geoWatPt(f1, outerL, -0.35), { layer: 'LayerA_PrimaryStructure', materialKey: wallMat, surfaceStratum: 'deck_side' });
      batcher.addQuad(geoWatPt(f0, outerR, 0.22), geoWatPt(f0, outerR, -0.35), geoWatPt(f1, outerR, -0.35), geoWatPt(f1, outerR, 0.22), { layer: 'LayerA_PrimaryStructure', materialKey: wallMat, surfaceStratum: 'deck_side' });
    }
  }

  // Water bulkheads on open endpoint nodes
  for (const ep of [
    { node: startNode, f: frames[0], rev: true },
    { node: endNode, f: frames[frames.length - 1], rev: false }
  ]) {
    if (ep.node?.kind === 'endpoint' && channelStrip) {
      const f = ep.f;
      if (ep.rev) {
        batcher.addQuad(geoWatPt(f, channelStrip.xRight, waterY), geoWatPt(f, channelStrip.xLeft, waterY), geoWatPt(f, channelStrip.xLeft, -chanDepth), geoWatPt(f, channelStrip.xRight, -chanDepth), { layer: 'LayerC_MarkingsAndSurface', materialKey: wallMat, surfaceStratum: 'end_cap' });
      } else {
        batcher.addQuad(geoWatPt(f, channelStrip.xLeft, waterY), geoWatPt(f, channelStrip.xRight, waterY), geoWatPt(f, channelStrip.xRight, -chanDepth), geoWatPt(f, channelStrip.xLeft, -chanDepth), { layer: 'LayerC_MarkingsAndSurface', materialKey: wallMat, surfaceStratum: 'end_cap' });
      }
    }
  }

  // 3. Quay Iron Railings, Mooring Bollards, and Optional Timber Dock Pier Spurs
  if (channelStrip && frames.length >= 2) {
    if (p.includeRailings !== false) {
      for (const sSide of [-1, 1]) {
        const rx = sSide < 0 ? channelStrip.xLeft - 0.16 : channelStrip.xRight + 0.16;
        let prevTop = null;
        let nextS = frames[0].s;
        for (const f of frames) {
          if (f.s < nextS && f !== frames[frames.length - 1]) continue;
          nextS = f.s + 3.5;
          const pBot = geoWatPt(f, rx, 0.36);
          const pTop = geoWatPt(f, rx, 1.32);
          geoPrimAddBeamBetween(batcher, pBot, pTop, 0.06, 0.06, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
          if (prevTop) {
            geoPrimAddBeamBetween(batcher, prevTop, pTop, 0.05, 0.05, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
          }
          prevTop = pTop;
        }
      }
    }

    if (p.includeBollards !== false) {
      let nextBolS = frames[0].s + 4.0;
      for (const f of frames) {
        if (f.s < nextBolS) continue;
        nextBolS = f.s + 14.0;
        for (const bx of [channelStrip.xLeft - 0.45, channelStrip.xRight + 0.45]) {
          const bp = geoWatPt(f, bx, 0.36);
          batcher.addCylinderY(bp[0], bp[1], bp[2], 0.14, 0.17, 0.55, 8, {
            layer: 'LayerA_PrimaryStructure',
            materialKey: 'steel_structure',
            surfaceStratum: 'bollard'
          });
        }
      }
    }

    if (p.includePierSpurs && samp.lengthMeters >= 18) {
      const fMid = frames[Math.floor(frames.length * 0.5)];
      const pierLen = Math.min(4.2, (channelStrip.widthMeters || 10) * 0.36);
      const pierXCenter = channelStrip.xLeft + pierLen * 0.5;
      const deckPos = geoWatPt(fMid, pierXCenter, 0.25);
      batcher.addBoxOriented(deckPos, fMid.tangent, fMid.right, [0, 1, 0], pierLen, 0.18, 2.2, {
        layer: 'LayerA_PrimaryStructure',
        materialKey: 'wood_warm',
        surfaceStratum: 'pier_deck'
      });
      for (const sx of [channelStrip.xLeft + 0.5, channelStrip.xLeft + pierLen - 0.3]) {
        for (const sz of [-0.85, 0.85]) {
          const pile = infraVec3Add(geoWatPt(fMid, sx, -chanDepth - 0.2), infraVec3Scale(fMid.tangent, sz));
          batcher.addCylinderY(pile[0], pile[1], pile[2], 0.15, 0.15, chanDepth + 0.65, 8, {
            layer: 'LayerB_StructuralSupports',
            materialKey: 'sleeper_wood',
            surfaceStratum: 'structural_support'
          });
        }
      }
    }
  }
}
