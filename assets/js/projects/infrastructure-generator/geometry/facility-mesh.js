import { INFRA_DEFAULTS, infraVecToBGameUnits } from '../config.js';
import { infraRound, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function geoFacPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

export function geoBuildFacilityEdge(batcher, edge, samp, prof, doc, collectors = null) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const fType = p.facilityType || 'protected_bikeway';
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);

  // 1. Sweep strictly adjacent strips (zero horizontal overlap!)
  for (const strip of prof.strips) {
    const isLane = strip.markingKey && strip.markingKey !== 'plain';
    const matKey = isLane ? `lane|${strip.surfaceMaterial}|${strip.markingKey}` : strip.surfaceMaterial;
    const topY = strip.elevationOffsetMeters;
    const uSpan = isLane ? 1.0 : Math.max(0.3, strip.widthMeters * 0.35);

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 5.0;
      const v1 = f1.s / 5.0;
      batcher.addQuad(
        geoFacPt(f0, strip.xLeft, topY),
        geoFacPt(f0, strip.xRight, topY),
        geoFacPt(f1, strip.xRight, topY),
        geoFacPt(f1, strip.xLeft, topY),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: matKey,
          surfaceStratum: 'top_surface',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );
      if (topY > 0.04) {
        batcher.addQuad(geoFacPt(f0, strip.xLeft, 0), geoFacPt(f0, strip.xLeft, topY), geoFacPt(f1, strip.xLeft, topY), geoFacPt(f1, strip.xLeft, 0), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
        batcher.addQuad(geoFacPt(f0, strip.xRight, topY), geoFacPt(f0, strip.xRight, 0), geoFacPt(f1, strip.xRight, 0), geoFacPt(f1, strip.xRight, topY), { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'curb_face' });
      }
    }
  }

  // Outer embankment skirts & end-caps
  const leftS = prof.strips[0];
  const rightS = prof.strips[prof.strips.length - 1];
  const botY = -INFRA_DEFAULTS.embankmentSkirtDepthMeters;
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    batcher.addQuad(geoFacPt(f0, leftS.xLeft, botY), geoFacPt(f0, leftS.xLeft, leftS.elevationOffsetMeters), geoFacPt(f1, leftS.xLeft, leftS.elevationOffsetMeters), geoFacPt(f1, leftS.xLeft, botY), { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'deck_side' });
    batcher.addQuad(geoFacPt(f0, rightS.xRight, rightS.elevationOffsetMeters), geoFacPt(f0, rightS.xRight, botY), geoFacPt(f1, rightS.xRight, botY), geoFacPt(f1, rightS.xRight, rightS.elevationOffsetMeters), { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'deck_side' });
  }
  if (startNode?.kind === 'endpoint') {
    const f0 = frames[0];
    batcher.addQuad(geoFacPt(f0, rightS.xRight, rightS.elevationOffsetMeters), geoFacPt(f0, leftS.xLeft, leftS.elevationOffsetMeters), geoFacPt(f0, leftS.xLeft, botY), geoFacPt(f0, rightS.xRight, botY), { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'end_cap' });
  }
  if (endNode?.kind === 'endpoint') {
    const fE = frames[frames.length - 1];
    batcher.addQuad(geoFacPt(fE, leftS.xLeft, leftS.elevationOffsetMeters), geoFacPt(fE, rightS.xRight, rightS.elevationOffsetMeters), geoFacPt(fE, rightS.xRight, botY), geoFacPt(fE, leftS.xLeft, botY), { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'end_cap' });
  }

  // 2. Facility Furniture & Architectural Assemblies (built atop/beside swept strips with ZERO top_surface duplication!)
  if (fType === 'protected_bikeway' && p.includeBollards !== false) {
    let nextS = frames[0].s + 2.0;
    for (const f of frames) {
      if (f.s < nextS) continue;
      nextS = f.s + 7.5;
      for (const sSide of [-1, 1]) {
        const bx = sSide < 0 ? leftS.xCenter : rightS.xCenter;
        const bp = geoFacPt(f, bx, leftS.elevationOffsetMeters);
        batcher.addCylinderY(bp[0], bp[1], bp[2], 0.08, 0.08, 0.78, 8, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'stripe_white',
          surfaceStratum: 'bollard'
        });
      }
    }
  } else if (fType === 'bus_rapid_bay') {
    const swStrip = prof.strips.find((s) => s.kind === 'sidewalk');
    if (swStrip && frames.length >= 4) {
      const sub = frames.filter((f) => f.u >= 0.25 && f.u <= 0.75);
      if (sub.length >= 2) {
        const deckY = swStrip.elevationOffsetMeters;
        const roofY = deckY + 2.85;
        const roofL = swStrip.xLeft + 0.15;
        const roofR = swStrip.xRight - 0.1;
        const wallX = swStrip.xLeft + 0.22;

        for (let i = 0; i < sub.length - 1; i++) {
          const f0 = sub[i];
          const f1 = sub[i + 1];
          batcher.addQuad(geoFacPt(f0, roofL, roofY), geoFacPt(f0, roofR, roofY), geoFacPt(f1, roofR, roofY), geoFacPt(f1, roofL, roofY), { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'canopy_roof', expectUpwardNormals: true });
          batcher.addQuad(geoFacPt(f0, roofL, roofY - 0.12), geoFacPt(f1, roofL, roofY - 0.12), geoFacPt(f1, roofR, roofY - 0.12), geoFacPt(f0, roofR, roofY - 0.12), { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'canopy_soffit' });
          batcher.addQuad(geoFacPt(f0, wallX, deckY + 0.08), geoFacPt(f0, wallX, roofY - 0.12), geoFacPt(f1, wallX, roofY - 0.12), geoFacPt(f1, wallX, deckY + 0.08), { layer: 'LayerA_PrimaryStructure', materialKey: 'glass_station', surfaceStratum: 'station_glass' });
        }
        const postStep = Math.max(1, Math.floor((sub.length - 1) / 3));
        for (let i = 0; i < sub.length; i += postStep) {
          const fp = sub[i];
          geoPrimAddBeamBetween(batcher, geoFacPt(fp, wallX, deckY), geoFacPt(fp, wallX, roofY), 0.16, 0.16, { materialKey: 'steel_structure', surfaceStratum: 'canopy_post' });
          batcher.addBoxOriented(geoFacPt(fp, swStrip.xCenter, roofY - 0.18), fp.tangent, fp.right, [0, 1, 0], 0.5, 0.08, 0.2, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
        }
        // Tactile strip flush on curb edge offset +0.025m (distinct surface stratum)
        for (let i = 0; i < sub.length - 1; i++) {
          const f0 = sub[i];
          const f1 = sub[i + 1];
          batcher.addQuad(geoFacPt(f0, swStrip.xRight - 0.35, deckY + 0.025), geoFacPt(f0, swStrip.xRight, deckY + 0.025), geoFacPt(f1, swStrip.xRight, deckY + 0.025), geoFacPt(f1, swStrip.xRight - 0.35, deckY + 0.025), { layer: 'LayerC_MarkingsAndSurface', materialKey: 'platform_tactile', surfaceStratum: 'tactile_edge', expectUpwardNormals: true });
        }
        // Backlit transit route totem pylon
        const fHead = sub[0];
        const totemPos = geoFacPt(fHead, swStrip.xRight - 0.45, deckY + 1.55);
        batcher.addBoxOriented(totemPos, fHead.tangent, fHead.right, [0, 1, 0], 0.55, 3.1, 0.25, { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'fixture' });
        batcher.addBoxOriented([totemPos[0], totemPos[1] + 1.15, totemPos[2]], fHead.tangent, fHead.right, [0, 1, 0], 0.58, 0.35, 0.28, { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_accent', surfaceStratum: 'fixture' });

        const midPt = geoFacPt(sub[Math.floor(sub.length * 0.5)], swStrip.xCenter, deckY);
        collectors?.platforms?.push({
          id: `plat_${edge.id}_brt`,
          edgeId: edge.id,
          positionMeters: [infraRound(midPt[0], 3), infraRound(midPt[1], 3), infraRound(midPt[2], 3)],
          coordinatesZUp: infraVecToBGameUnits(midPt[0], midPt[1], midPt[2]),
          widthMeters: swStrip.widthMeters,
          lengthMeters: infraRound(sub[sub.length - 1].s - sub[0].s, 2),
          deckElevationMeters: infraRound(deckY, 3)
        });
      }
    }
  } else if (fType === 'surface_parking_bay') {
    const bayStrips = prof.strips.filter((s) => s.surfaceMaterial === 'parking_bay');
    let nextS = frames[0].s + 1.6;
    for (const f of frames) {
      if (f.s < nextS) continue;
      nextS = f.s + 2.65;
      for (const bs of bayStrips) {
        const stopX = bs.xCenter < 0 ? bs.xLeft + 0.75 : bs.xRight - 0.75;
        batcher.addBoxOriented(
          geoFacPt(f, stopX, 0.08),
          f.tangent,
          f.right,
          [0, 1, 0],
          0.18,
          0.16,
          1.7,
          { layer: 'LayerA_PrimaryStructure', materialKey: 'curb_stone', surfaceStratum: 'wheel_stop' }
        );
      }
    }
    if (p.includeLighting !== false) {
      let nextLitS = frames[0].s + 6.0;
      for (const f of frames) {
        if (f.s < nextLitS) continue;
        nextLitS = f.s + 18.0;
        const pBase = geoFacPt(f, leftS.xCenter, leftS.elevationOffsetMeters);
        const pTop = [pBase[0], pBase[1] + 5.2, pBase[2]];
        geoPrimAddBeamBetween(batcher, pBase, pTop, 0.14, 0.14, { materialKey: 'steel_structure', surfaceStratum: 'lamp_post' });
        batcher.addBoxOriented(geoFacPt(f, leftS.xCenter + 0.65, 5.3), f.tangent, f.right, [0, 1, 0], 1.1, 0.12, 0.35, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
      }
    }
  } else if (fType === 'freight_loading_yard') {
    const dockStrip = prof.strips.find((s) => s.kind === 'walkway_deck');
    if (dockStrip) {
      let nextB = frames[0].s + 2.5;
      for (const f of frames) {
        if (f.s < nextB) continue;
        nextB = f.s + 4.8;
        batcher.addBoxOriented(geoFacPt(f, dockStrip.xRight + 0.08, 0.65), f.tangent, f.right, [0, 1, 0], 0.16, 0.55, 0.55, { layer: 'LayerA_PrimaryStructure', materialKey: 'asphalt', surfaceStratum: 'dock_bumper' });
        const bolPos = geoFacPt(f, dockStrip.xRight - 0.3, dockStrip.elevationOffsetMeters);
        batcher.addCylinderY(bolPos[0], bolPos[1], bolPos[2], 0.11, 0.11, 0.85, 8, { layer: 'LayerA_PrimaryStructure', materialKey: 'stripe_yellow', surfaceStratum: 'bollard' });
      }
      const midF = frames[Math.floor(frames.length * 0.5)];
      const mBase = geoFacPt(midF, dockStrip.xLeft + 0.4, dockStrip.elevationOffsetMeters);
      const mTop = [mBase[0], mBase[1] + 7.5, mBase[2]];
      geoPrimAddBeamBetween(batcher, mBase, mTop, 0.22, 0.22, { materialKey: 'steel_structure', surfaceStratum: 'lamp_post' });
      batcher.addBoxOriented(mTop, midF.tangent, midF.right, [0, 1, 0], 0.45, 0.35, 1.1, { layer: 'LayerA_PrimaryStructure', materialKey: 'station_lamp', surfaceStratum: 'fixture' });
    }
  }
}
