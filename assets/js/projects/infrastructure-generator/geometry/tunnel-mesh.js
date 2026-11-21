import { infraClamp, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function geoTunPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function geoTunProfileRingPts(shape, innerHalfW, clearH, wallT, outerOff = 0) {
  const hw = innerHalfW + outerOff;
  const hTop = clearH + outerOff;
  if (shape === 'box') {
    return [
      [-hw, 0],
      [-hw, hTop],
      [hw, hTop],
      [hw, 0]
    ];
  }
  const steps = 6;
  const springY = shape === 'circular' ? clearH * 0.45 : clearH * 0.42;
  const crownR = Math.max(0.5, hTop - springY);
  const pts = [[-hw, 0]];
  for (let s = 0; s <= steps; s++) {
    const theta = Math.PI - (s / steps) * Math.PI;
    pts.push([-Math.cos(theta) * hw, springY + Math.sin(theta) * crownR]);
  }
  pts.push([hw, 0]);
  return pts;
}

export function geoBuildTunnelEdge(batcher, edge, samp, prof, doc) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const shape = p.tunnelShape || 'arch';
  const clearW = infraClamp(p.clearWidthMeters || 8.6, 4.4, 15.0);
  const clearH = infraClamp(p.clearHeightMeters || 5.2, 3.8, 7.5);
  const wallT = infraClamp(p.wallThicknessMeters || 0.55, 0.35, 1.2);
  const innerHalfW = clearW * 0.5;
  const isRail = p.interiorMode === 'rail' || p.interiorMode === 'metro';
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);

  // 1. Interior tunnel roadway / track slab & emergency walkways (zero horizontal overlap!)
  for (const strip of prof.strips) {
    if (strip.kind === 'parapet') continue;
    const isLane = strip.kind === 'vehicle_lane' && strip.markingKey && strip.markingKey !== 'plain';
    const matKey = isLane ? `lane|${strip.surfaceMaterial}|${strip.markingKey}` : strip.surfaceMaterial;
    const topY = strip.elevationOffsetMeters;
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 6.0;
      const v1 = f1.s / 6.0;
      const uSpan = isLane ? 1.0 : Math.max(0.25, strip.widthMeters * 0.35);
      batcher.addQuad(
        geoTunPt(f0, strip.xLeft, topY),
        geoTunPt(f0, strip.xRight, topY),
        geoTunPt(f1, strip.xRight, topY),
        geoTunPt(f1, strip.xLeft, topY),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: matKey,
          surfaceStratum: 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );
      if (topY > 0.02) {
        const faceX = strip.xCenter < 0 ? strip.xRight : strip.xLeft;
        if (strip.xCenter < 0) {
          batcher.addQuad(geoTunPt(f0, faceX, topY), geoTunPt(f0, faceX, 0), geoTunPt(f1, faceX, 0), geoTunPt(f1, faceX, topY), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
        } else {
          batcher.addQuad(geoTunPt(f0, faceX, 0), geoTunPt(f0, faceX, topY), geoTunPt(f1, faceX, topY), geoTunPt(f1, faceX, 0), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
        }
      }
    }
  }

  // Rail tracks & third rail inside underground metro / rail tunnel
  if (isRail) {
    const gauge = prof.trackGauge || 1.435;
    for (const tx of prof.trackCenterOffsets || [0]) {
      for (const sign of [-1, 1]) {
        const lx = tx + sign * gauge * 0.5;
        for (let i = 0; i < frames.length - 1; i++) {
          geoPrimAddBeamBetween(batcher, geoTunPt(frames[i], lx, 0.08), geoTunPt(frames[i + 1], lx, 0.08), 0.08, 0.16, { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
        }
      }
      for (let i = 0; i < frames.length - 1; i++) {
        geoPrimAddBeamBetween(batcher, geoTunPt(frames[i], tx + gauge * 0.5 + 0.36, 0.08), geoTunPt(frames[i + 1], tx + gauge * 0.5 + 0.36, 0.08), 0.1, 0.1, { layer: 'LayerC_MarkingsAndSurface', materialKey: 'steel_accent', surfaceStratum: 'third_rail' });
      }
    }
  }

  // 2. Interior Vault Lining (facing inward toward bore) & Exterior Structural Shell
  const innerRing = geoTunProfileRingPts(shape, innerHalfW, clearH, wallT, 0);
  const outerRing = geoTunProfileRingPts(shape, innerHalfW, clearH, wallT, wallT);
  for (let r = 0; r < innerRing.length - 1; r++) {
    const ia = innerRing[r];
    const ib = innerRing[r + 1];
    const oa = outerRing[r];
    const ob = outerRing[r + 1];
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      // Inner vault wall facing INWARD toward bore center: (ia@f1, ib@f1, ib@f0, ia@f0)
      batcher.addQuad(
        geoTunPt(f1, ia[0], ia[1]),
        geoTunPt(f1, ib[0], ib[1]),
        geoTunPt(f0, ib[0], ib[1]),
        geoTunPt(f0, ia[0], ia[1]),
        { layer: 'LayerA_PrimaryStructure', materialKey: 'tunnel_concrete', surfaceStratum: 'tunnel_lining' }
      );
      // Outer protective shell facing OUTWARD: (oa@f0, ob@f0, ob@f1, oa@f1)
      batcher.addQuad(
        geoTunPt(f0, oa[0], oa[1]),
        geoTunPt(f0, ob[0], ob[1]),
        geoTunPt(f1, ob[0], ob[1]),
        geoTunPt(f1, oa[0], oa[1]),
        { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'tunnel_shell' }
      );
    }
  }

  // Base floor slab underside for complete enclosure
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    batcher.addQuad(
      geoTunPt(f0, -innerHalfW - wallT, -0.45),
      geoTunPt(f1, -innerHalfW - wallT, -0.45),
      geoTunPt(f1, innerHalfW + wallT, -0.45),
      geoTunPt(f0, innerHalfW + wallT, -0.45),
      { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'deck_soffit' }
    );
  }

  // 3. Ceiling Lights & Ventilation Jet Fans along bore
  if (p.includeLighting !== false) {
    let nextLightS = frames[0].s + 4.0;
    for (const f of frames) {
      if (f.s < nextLightS) continue;
      nextLightS = f.s + 9.5;
      batcher.addBoxOriented(
        geoTunPt(f, 0, clearH - 0.12),
        f.tangent,
        f.right,
        f.up,
        1.2,
        0.1,
        2.6,
        { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' }
      );
      if (p.includeJetFans && Math.floor(f.s / 9.5) % 2 === 0 && !isRail) {
        batcher.addBoxOriented(
          geoTunPt(f, -1.6, clearH - 0.45),
          f.tangent,
          f.right,
          f.up,
          0.55,
          0.55,
          1.4,
          { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'fixture' }
        );
      }
    }
  }

  // 4. Concrete Tunnel Portals & Retaining Wing Walls on open endpoints
  if (p.includePortals !== false) {
    for (const ep of [
      { node: startNode, f: frames[0], dir: -1 },
      { node: endNode, f: frames[frames.length - 1], dir: 1 }
    ]) {
      if (ep.node?.kind !== 'endpoint') continue;
      const f = ep.f;
      const headH = clearH + wallT + 1.1;
      const wingSpan = innerHalfW + wallT + 1.8;
      // Overhead concrete portal lintel beam & flanking headwall piers
      batcher.addBoxOriented(
        geoTunPt(f, 0, clearH + wallT + 0.35),
        f.tangent,
        f.right,
        [0, 1, 0],
        wingSpan * 2,
        1.4,
        0.95,
        { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' }
      );
      for (const sSide of [-1, 1]) {
        const px = sSide * (innerHalfW + wallT + 0.75);
        batcher.addBoxOriented(
          geoTunPt(f, px, headH * 0.48),
          f.tangent,
          f.right,
          [0, 1, 0],
          1.5,
          headH + 0.5,
          1.1,
          { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' }
        );
        // Retaining flare wing wall extending outward into approach embankment
        const wingStart = geoTunPt(f, px, 1.4);
        const wingEnd = infraVec3Add(geoTunPt(f, sSide * (innerHalfW + wallT + 1.6), 0.75), infraVec3Scale(f.tangent, ep.dir * 3.2));
        geoPrimAddBeamBetween(batcher, wingStart, wingEnd, 0.55, 2.2, { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' });
      }
    }
  }
}
