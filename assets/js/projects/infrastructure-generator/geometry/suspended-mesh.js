import { INFRA_DEFAULTS } from '../config.js';
import { infraClamp, infraVec3Add, infraVec3Scale } from '../utils.js';
import {
  geoPrimAddBeamBetween,
  geoPrimAddPlatformAssembly,
  geoPrimAddStairFlight,
  geoPrimAddTrussPanel
} from './primitives.js';

function geoSuspPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function geoSuspSweepCatwalks(batcher, frames, prof, isSuspended) {
  const catwalks = prof.strips.filter((s) => s.kind === 'walkway_deck');
  if (!catwalks.length) return;

  for (const cw of catwalks) {
    const yTop = cw.elevationOffsetMeters;
    const yBot = yTop - 0.14;
    const uSpan = Math.max(0.25, cw.widthMeters * 0.45);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      const v0 = f0.s / 4.0;
      const v1 = f1.s / 4.0;
      batcher.addQuad(
        geoSuspPt(f0, cw.xLeft, yTop),
        geoSuspPt(f0, cw.xRight, yTop),
        geoSuspPt(f1, cw.xRight, yTop),
        geoSuspPt(f1, cw.xLeft, yTop),
        {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_grating',
          surfaceStratum: 'catwalk_deck',
          expectUpwardNormals: true,
          uvs: [[0, v0], [uSpan, v0], [uSpan, v1], [0, v1]]
        }
      );
      batcher.addQuad(
        geoSuspPt(f0, cw.xLeft, yBot),
        geoSuspPt(f1, cw.xLeft, yBot),
        geoSuspPt(f1, cw.xRight, yBot),
        geoSuspPt(f0, cw.xRight, yBot),
        { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'deck_soffit' }
      );
      if (isSuspended) {
        batcher.addQuad(
          geoSuspPt(f0, cw.xLeft, yBot),
          geoSuspPt(f0, cw.xLeft, yTop),
          geoSuspPt(f1, cw.xLeft, yTop),
          geoSuspPt(f1, cw.xLeft, yBot),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'deck_side' }
        );
        batcher.addQuad(
          geoSuspPt(f0, cw.xRight, yTop),
          geoSuspPt(f0, cw.xRight, yBot),
          geoSuspPt(f1, cw.xRight, yBot),
          geoSuspPt(f1, cw.xRight, yTop),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'deck_side' }
        );
      }
    }

    // Outer steel safety handrail along exposed side of catwalk
    const railX = cw.xCenter < 0 ? cw.xLeft + 0.06 : cw.xRight - 0.06;
    let prevTop = null;
    let prevMid = null;
    let nextS = frames[0].s;
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      if (fr.s < nextS && i < frames.length - 1) continue;
      nextS = fr.s + 3.2;
      const pBot = geoSuspPt(fr, railX, yTop);
      const pMid = geoSuspPt(fr, railX, yTop + 0.52);
      const pTop = geoSuspPt(fr, railX, yTop + 1.05);
      geoPrimAddBeamBetween(batcher, pBot, pTop, 0.06, 0.06, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
      if (prevTop) {
        geoPrimAddBeamBetween(batcher, prevTop, pTop, 0.045, 0.045, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
        geoPrimAddBeamBetween(batcher, prevMid, pMid, 0.035, 0.035, { materialKey: 'steel_structure', surfaceStratum: 'railing' });
      }
      prevTop = pTop;
      prevMid = pMid;
    }
  }
}

export function geoBuildElevatedTransitEdge(batcher, edge, samp, prof, doc, collectors = null) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const transitSystem = p.transitSystem || 'suspended_monorail';
  const style = p.structuralStyle || 'wuppertal_steel';
  const guidewayDepth = infraClamp(p.guidewayDepth || 1.75, 0.85, 2.8);
  const hangingDrop = infraClamp(p.hangingDropMeters || 3.6, 2.6, 5.0);
  const hangingW = infraClamp(p.hangingWidthMeters || 2.4, 1.8, 3.2);
  const trackOffsets = prof.trackCenterOffsets?.length ? prof.trackCenterOffsets : [0];
  const trackCount = trackOffsets.length;
  const trackSpacing = prof.trackSpacing || 3.4;
  const gStrip = prof.strips.find((s) => s.kind === 'guideway_beam');
  const spineHalfW = gStrip ? gStrip.widthMeters * 0.5 : (trackCount === 2 ? trackSpacing * 0.5 + 0.9 : 1.0);
  const startNode = (doc?.nodes || []).find((n) => n.id === edge.startNodeId);
  const endNode = (doc?.nodes || []).find((n) => n.id === edge.endNodeId);

  // =========================================================================
  // BRANCH 1: SUSPENDED MONORAIL (Wuppertal Truss, Box, Podway, Futuristic)
  // =========================================================================
  if (transitSystem === 'suspended_monorail' || edge.elevationMode === 'suspended') {
    const isTruss = style === 'wuppertal_steel' || style === 'industrial_truss';
    const isFuturistic = style === 'futuristic_shroud';
    const yokeHalfW = Math.max(spineHalfW, (trackCount === 2 ? trackSpacing * 0.5 : 0) + 0.55);

    if (isTruss) {
      const chordBottom = 0.18;
      const chordTop = guidewayDepth;
      const memberT = style === 'industrial_truss' ? 0.2 : 0.15;

      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        const includeEnd = i === frames.length - 2;
        const flipDiag = i % 2 === 1;

        // Left & right 3D Warren truss planes
        geoPrimAddTrussPanel(
          batcher,
          geoSuspPt(f0, -spineHalfW, chordBottom),
          geoSuspPt(f0, -spineHalfW, chordTop),
          geoSuspPt(f1, -spineHalfW, chordTop),
          geoSuspPt(f1, -spineHalfW, chordBottom),
          memberT,
          { flipDiagonal: flipDiag, includeEndPost: includeEnd, materialKey: 'steel_structure' }
        );
        geoPrimAddTrussPanel(
          batcher,
          geoSuspPt(f0, spineHalfW, chordBottom),
          geoSuspPt(f0, spineHalfW, chordTop),
          geoSuspPt(f1, spineHalfW, chordTop),
          geoSuspPt(f1, spineHalfW, chordBottom),
          memberT,
          { flipDiagonal: !flipDiag, includeEndPost: includeEnd, materialKey: 'steel_structure' }
        );

        // Overhead lateral cross-strut & top wind-bracing diagonal
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(f0, -spineHalfW, chordTop),
          geoSuspPt(f0, spineHalfW, chordTop),
          memberT * 0.9,
          memberT * 0.9,
          { materialKey: 'steel_structure', surfaceStratum: 'truss_member' }
        );
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(f0, -spineHalfW, chordTop),
          geoSuspPt(f1, spineHalfW, chordTop),
          memberT * 0.55,
          memberT * 0.55,
          { materialKey: 'steel_structure', surfaceStratum: 'truss_member' }
        );
        if (includeEnd) {
          geoPrimAddBeamBetween(
            batcher,
            geoSuspPt(f1, -spineHalfW, chordTop),
            geoSuspPt(f1, spineHalfW, chordTop),
            memberT * 0.9,
            memberT * 0.9,
            { materialKey: 'steel_structure', surfaceStratum: 'truss_member' }
          );
        }
      }
    } else {
      // Closed box girder / streamlined single podway / futuristic faceted shroud
      const boxMat = style === 'modern_box' || style === 'single_podway' ? 'deck_concrete' : 'steel_structure';
      const topHalfW = isFuturistic ? spineHalfW * 0.72 : (style === 'single_podway' ? spineHalfW * 0.78 : spineHalfW);
      const botY = 0.14;
      const topY = guidewayDepth;

      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        batcher.addQuad(
          geoSuspPt(f0, -topHalfW, topY),
          geoSuspPt(f0, topHalfW, topY),
          geoSuspPt(f1, topHalfW, topY),
          geoSuspPt(f1, -topHalfW, topY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'guideway_top', expectUpwardNormals: true }
        );
        batcher.addQuad(
          geoSuspPt(f0, -spineHalfW, botY),
          geoSuspPt(f1, -spineHalfW, botY),
          geoSuspPt(f1, spineHalfW, botY),
          geoSuspPt(f0, spineHalfW, botY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'deck_soffit' }
        );
        batcher.addQuad(
          geoSuspPt(f0, -spineHalfW, botY),
          geoSuspPt(f0, -topHalfW, topY),
          geoSuspPt(f1, -topHalfW, topY),
          geoSuspPt(f1, -spineHalfW, botY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'deck_side' }
        );
        batcher.addQuad(
          geoSuspPt(f0, topHalfW, topY),
          geoSuspPt(f0, spineHalfW, botY),
          geoSuspPt(f1, spineHalfW, botY),
          geoSuspPt(f1, topHalfW, topY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'deck_side' }
        );
        if (isFuturistic) {
          const midY = (botY + topY) * 0.5;
          const midX = (spineHalfW + topHalfW) * 0.5 + 0.04;
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, -midX, midY), geoSuspPt(f1, -midX, midY), 0.08, 0.14, { materialKey: 'steel_accent', surfaceStratum: 'accent_trim' });
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, midX, midY), geoSuspPt(f1, midX, midY), 0.08, 0.14, { materialKey: 'steel_accent', surfaceStratum: 'accent_trim' });
        }
      }

      if (startNode?.kind === 'endpoint') {
        const f0 = frames[0];
        batcher.addQuad(
          geoSuspPt(f0, topHalfW, topY),
          geoSuspPt(f0, -topHalfW, topY),
          geoSuspPt(f0, -spineHalfW, botY),
          geoSuspPt(f0, spineHalfW, botY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'end_cap' }
        );
      }
      if (endNode?.kind === 'endpoint') {
        const fE = frames[frames.length - 1];
        batcher.addQuad(
          geoSuspPt(fE, -topHalfW, topY),
          geoSuspPt(fE, topHalfW, topY),
          geoSuspPt(fE, spineHalfW, botY),
          geoSuspPt(fE, -spineHalfW, botY),
          { layer: 'LayerA_PrimaryStructure', materialKey: boxMat, surfaceStratum: 'end_cap' }
        );
      }
    }

    // Periodic transverse hanger cross-yokes supporting the lower running rail beams
    let nextYokeS = frames[0].s;
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      if (fr.s < nextYokeS && i < frames.length - 1) continue;
      nextYokeS = fr.s + 3.4;

      // Crossbeam beneath spine
      geoPrimAddBeamBetween(
        batcher,
        geoSuspPt(fr, -yokeHalfW, 0.12),
        geoSuspPt(fr, yokeHalfW, 0.12),
        0.24,
        0.22,
        { materialKey: 'steel_structure', surfaceStratum: 'hanger_yoke' }
      );

      for (const tx of trackOffsets) {
        const sideSign = tx < 0 ? -1 : 1;
        const neckX = trackCount === 1 ? -spineHalfW * 0.45 : tx + sideSign * 0.42;
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(fr, neckX, 0.16),
          geoSuspPt(fr, neckX, -0.44),
          0.16,
          0.18,
          { materialKey: 'steel_structure', surfaceStratum: 'hanger_neck' }
        );
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(fr, neckX, -0.42),
          geoSuspPt(fr, tx, -0.42),
          0.18,
          0.18,
          { materialKey: 'steel_structure', surfaceStratum: 'hanger_bracket' }
        );
      }
    }

    // Continuous lower running rail beams + shiny steel track surface
    for (const tx of trackOffsets) {
      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i];
        const f1 = frames[i + 1];
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(f0, tx, -0.34),
          geoSuspPt(f1, tx, -0.34),
          0.26,
          0.26,
          { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'running_beam' }
        );
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(f0, tx, -0.18),
          geoSuspPt(f1, tx, -0.18),
          0.11,
          0.1,
          { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'rail_steel' }
        );
      }
    }

    // Maintenance catwalks
    if (p.includeMaintenanceWalkway) {
      geoSuspSweepCatwalks(batcher, frames, prof, true);
    }

    // Optional Elevated Suspended Boarding Station (glass + steel platforms + street switchback stairs)
    if (p.includeStation && samp.lengthMeters >= 24) {
      const midF = frames[Math.floor(frames.length * 0.5)];
      const absGuideY = midF.position[1];
      const absPlatY = Math.max(2.75, absGuideY - hangingDrop + 0.28);
      const relPlatY = absPlatY - absGuideY;
      const outerTrackAbsX = trackCount === 2 ? Math.max(...trackOffsets.map(Math.abs)) : 0;
      const innerEdgeX = outerTrackAbsX + hangingW * 0.5 + 0.25;
      const platWidth = 2.4;

      const platLeft = geoPrimAddPlatformAssembly(
        batcher,
        frames,
        -1,
        -innerEdgeX,
        platWidth,
        relPlatY,
        0.28,
        0.72,
        {
          id: `stn_${edge.id}_L`,
          deckBottomY: relPlatY - 0.36,
          deckMaterial: 'concrete',
          canopyMaterial: 'steel_structure',
          includeCanopy: true,
          glassWalls: true
        }
      );
      const platRight = geoPrimAddPlatformAssembly(
        batcher,
        frames,
        1,
        innerEdgeX,
        platWidth,
        relPlatY,
        0.28,
        0.72,
        {
          id: `stn_${edge.id}_R`,
          deckBottomY: relPlatY - 0.36,
          deckMaterial: 'concrete',
          canopyMaterial: 'steel_structure',
          includeCanopy: true,
          glassWalls: true
        }
      );
      if (platLeft && collectors?.platforms) collectors.platforms.push({ ...platLeft, edgeId: edge.id });
      if (platRight && collectors?.platforms) collectors.platforms.push({ ...platRight, edgeId: edge.id });

      // Station Portal Support Towers & Overhead Tie Frames
      const portalUs = [0.3, 0.7];
      const colLatX = innerEdgeX + platWidth - 0.32;
      for (const tu of portalUs) {
        let bestF = frames[0];
        let bestDiff = Infinity;
        for (const fr of frames) {
          const d = Math.abs(fr.u - tu);
          if (d < bestDiff) {
            bestDiff = d;
            bestF = fr;
          }
        }
        for (const sSide of [-1, 1]) {
          const colX = sSide * colLatX;
          const groundFoot = [bestF.position[0] + bestF.right[0] * colX, -0.25, bestF.position[2] + bestF.right[2] * colX];
          const topCol = geoSuspPt(bestF, colX, relPlatY + 2.95);
          geoPrimAddBeamBetween(batcher, groundFoot, topCol, 0.38, 0.38, {
            layer: 'LayerB_StructuralSupports',
            materialKey: 'steel_structure',
            surfaceStratum: 'structural_support'
          });
          batcher.addBoxOriented([groundFoot[0], 0.12, groundFoot[2]], bestF.tangent, bestF.right, [0, 1, 0], 1.1, 0.74, 1.1, {
            layer: 'LayerB_StructuralSupports',
            materialKey: 'pier_concrete',
            surfaceStratum: 'structural_support'
          });
        }
        // Overhead transverse tie frame uniting canopy roof + main guideway truss
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(bestF, -colLatX, relPlatY + 2.9),
          geoSuspPt(bestF, colLatX, relPlatY + 2.9),
          0.26,
          0.26,
          { materialKey: 'steel_structure', surfaceStratum: 'station_truss' }
        );
      }

      // B-Remastered compliant Switchback Pedestrian Staircase descending from right platform to ground
      const stairSub = frames.filter((f) => f.u >= 0.62 && f.u <= 0.74);
      const stAnchorF = stairSub[stairSub.length - 1] || frames[Math.floor(frames.length * 0.7)];
      const stairOuterOffset = innerEdgeX + platWidth + 1.05;
      const stairBaseXZ = [
        stAnchorF.position[0] + stAnchorF.right[0] * stairOuterOffset,
        0,
        stAnchorF.position[2] + stAnchorF.right[2] * stairOuterOffset
      ];
      const stairTopBridgePt = [
        stAnchorF.position[0] + stAnchorF.right[0] * (innerEdgeX + platWidth - 0.15),
        absPlatY - 0.11,
        stAnchorF.position[2] + stAnchorF.right[2] * (innerEdgeX + platWidth - 0.15)
      ];
      const stairMeta = geoPrimAddStairFlight(
        batcher,
        stairBaseXZ,
        [stAnchorF.tangent[0], stAnchorF.tangent[2]],
        [stAnchorF.right[0], stAnchorF.right[2]],
        absPlatY,
        1.45,
        { id: `stair_${edge.id}_stn`, materialKey: 'steel_structure', treadMaterial: 'concrete' }
      );
      if (stairMeta) {
        // Bridge top step landing cleanly into outer side of right platform
        const stairEnd = stairMeta.endPosMeters;
        batcher.addBoxOriented(
          [
            (stairEnd[0] + stairTopBridgePt[0]) * 0.5,
            absPlatY - 0.11,
            (stairEnd[2] + stairTopBridgePt[2]) * 0.5
          ],
          stAnchorF.tangent,
          stAnchorF.right,
          [0, 1, 0],
          Math.max(1.4, Math.hypot(stairEnd[0] - stairTopBridgePt[0], stairEnd[2] - stairTopBridgePt[2]) + 0.8),
          0.22,
          1.75,
          { layer: 'LayerA_PrimaryStructure', materialKey: 'concrete', surfaceStratum: 'stair_landing' }
        );
        collectors?.stairs?.push({ ...stairMeta, edgeId: edge.id });
      }
    }

    return;
  }

  // =========================================================================
  // BRANCH 2: STRADDLE-BEAM MONORAIL
  // =========================================================================
  if (transitSystem === 'straddle_monorail') {
    const halfBeam = trackCount === 2 ? trackSpacing * 0.5 + 0.52 : 0.48;
    const beamH = infraClamp(guidewayDepth, 0.9, 2.2);
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      for (const tx of trackOffsets) {
        const bw = 0.44;
        batcher.addQuad(
          geoSuspPt(f0, tx - bw, 0),
          geoSuspPt(f0, tx + bw, 0),
          geoSuspPt(f1, tx + bw, 0),
          geoSuspPt(f1, tx - bw, 0),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'top_surface', expectUpwardNormals: true }
        );
        batcher.addQuad(
          geoSuspPt(f0, tx - bw, -beamH),
          geoSuspPt(f1, tx - bw, -beamH),
          geoSuspPt(f1, tx + bw, -beamH),
          geoSuspPt(f0, tx + bw, -beamH),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'deck_soffit' }
        );
        batcher.addQuad(
          geoSuspPt(f0, tx - bw, -beamH),
          geoSuspPt(f0, tx - bw, 0),
          geoSuspPt(f1, tx - bw, 0),
          geoSuspPt(f1, tx - bw, -beamH),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'deck_side' }
        );
        batcher.addQuad(
          geoSuspPt(f0, tx + bw, 0),
          geoSuspPt(f0, tx + bw, -beamH),
          geoSuspPt(f1, tx + bw, -beamH),
          geoSuspPt(f1, tx + bw, 0),
          { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'deck_side' }
        );
        // Steel guide strips along left & right beam cheeks
        geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx - bw - 0.03, -0.35), geoSuspPt(f1, tx - bw - 0.03, -0.35), 0.06, 0.14, { materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
        geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx + bw + 0.03, -0.35), geoSuspPt(f1, tx + bw + 0.03, -0.35), 0.06, 0.14, { materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
      }
      if (trackCount === 2) {
        geoPrimAddBeamBetween(batcher, geoSuspPt(f0, -halfBeam, -beamH * 0.72), geoSuspPt(f0, halfBeam, -beamH * 0.72), 0.3, 0.28, { materialKey: 'deck_concrete', surfaceStratum: 'cross_tie' });
      }
    }
    if (p.includeMaintenanceWalkway) geoSuspSweepCatwalks(batcher, frames, prof, false);
    return;
  }

  // =========================================================================
  // BRANCH 3: ELEVATED STEEL TRUSS METRO ("L" Train)
  // =========================================================================
  const halfDeck = spineHalfW;
  const girderH = 1.15;
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const includeEnd = i === frames.length - 2;
    geoPrimAddTrussPanel(
      batcher,
      geoSuspPt(f0, -halfDeck, -girderH),
      geoSuspPt(f0, -halfDeck, 0.12),
      geoSuspPt(f1, -halfDeck, 0.12),
      geoSuspPt(f1, -halfDeck, -girderH),
      0.16,
      { flipDiagonal: i % 2 === 1, includeEndPost: includeEnd, materialKey: 'steel_structure' }
    );
    geoPrimAddTrussPanel(
      batcher,
      geoSuspPt(f0, halfDeck, -girderH),
      geoSuspPt(f0, halfDeck, 0.12),
      geoSuspPt(f1, halfDeck, 0.12),
      geoSuspPt(f1, halfDeck, -girderH),
      0.16,
      { flipDiagonal: i % 2 === 0, includeEndPost: includeEnd, materialKey: 'steel_structure' }
    );
    geoPrimAddBeamBetween(batcher, geoSuspPt(f0, -halfDeck, -0.18), geoSuspPt(f0, halfDeck, -0.18), 0.24, 0.28, { materialKey: 'steel_structure', surfaceStratum: 'cross_tie' });
    geoPrimAddBeamBetween(batcher, geoSuspPt(f0, -halfDeck, -girderH), geoSuspPt(f0, halfDeck, -girderH), 0.2, 0.2, { materialKey: 'steel_structure', surfaceStratum: 'cross_tie' });
  }

  // Timber ties, twin running rails & third rail
  const gauge = INFRA_DEFAULTS.railGaugeStandardMeters;
  let nextTieS = frames[0].s;
  for (const fr of frames) {
    if (fr.s < nextTieS) continue;
    nextTieS = fr.s + 0.72;
    for (const tx of trackOffsets) {
      batcher.addBoxOriented(
        geoSuspPt(fr, tx, -0.02),
        fr.tangent,
        fr.right,
        fr.up,
        gauge + 0.75,
        0.14,
        0.24,
        { layer: 'LayerA_PrimaryStructure', materialKey: 'sleeper_wood', surfaceStratum: 'rail_sleeper' }
      );
    }
  }

  for (const tx of trackOffsets) {
    for (const sign of [-1, 1]) {
      const lx = tx + sign * gauge * 0.5;
      for (let i = 0; i < frames.length - 1; i++) {
        geoPrimAddBeamBetween(batcher, geoSuspPt(frames[i], lx, 0.13), geoSuspPt(frames[i + 1], lx, 0.13), 0.08, 0.16, { layer: 'LayerC_MarkingsAndSurface', materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
      }
    }
    const thirdX = tx + gauge * 0.5 + 0.4;
    for (let i = 0; i < frames.length - 1; i++) {
      geoPrimAddBeamBetween(batcher, geoSuspPt(frames[i], thirdX, 0.1), geoSuspPt(frames[i + 1], thirdX, 0.1), 0.11, 0.1, { layer: 'LayerC_MarkingsAndSurface', materialKey: 'steel_accent', surfaceStratum: 'third_rail' });
    }
  }

  if (p.includeMaintenanceWalkway) geoSuspSweepCatwalks(batcher, frames, prof, false);
}
