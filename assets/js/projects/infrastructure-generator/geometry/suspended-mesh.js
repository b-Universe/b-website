import { INFRA_DEFAULTS } from '../config.js';
import { infraClamp, infraVec3Add, infraVec3Cross, infraVec3Scale } from '../utils.js';
import {
  geoPrimAddBeamBetween,
  geoPrimGuardCollisionBox,
  geoPrimAddPlatformAssembly,
  geoPrimAddStairFlight,
  geoPrimAddTrussPanel
} from './primitives.js';
import { geoBuildStationLift, geoBuildStationPlatformArchitecture, geoBuildStationStairCover,
  geoStationFrameAt, geoStationPoint, INFRA_STATION_ARCHITECTURE } from './station-mesh.js';

function geoSuspPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function pushFrameBox(collectors, p0, p1) {
  if (!collectors?.frameBoxes) return;
  collectors.frameBoxes.push([
    Math.min(p0[0], p1[0]),
    Math.min(p0[1], p1[1]),
    Math.min(p0[2], p1[2]),
    Math.max(p0[0], p1[0]),
    Math.max(p0[1], p1[1]),
    Math.max(p0[2], p1[2])
  ]);
}

function geoSuspSweepCatwalks(batcher, frames, prof, isSuspended, collectors = null) {
  const catwalks = prof.strips.filter((s) => s.kind === 'walkway_deck');
  if (!catwalks.length) return;

  for (const cw of catwalks) {
    const yTop = cw.elevationOffsetMeters;
    const yBot = yTop - 0.14;
    const uSpan = Math.max(0.25, cw.widthMeters * 0.45);
    if (frames.length >= 2) {
      const fFirst = frames[0];
      const fLast = frames[frames.length - 1];
      const deckPts = [
        geoSuspPt(fFirst, cw.xLeft, yBot),
        geoSuspPt(fFirst, cw.xRight, yTop),
        geoSuspPt(fLast, cw.xLeft, yBot),
        geoSuspPt(fLast, cw.xRight, yTop)
      ];
      if (collectors?.frameBoxes) {
        collectors.frameBoxes.push([
          Math.min(...deckPts.map((p) => p[0])),
          Math.min(...deckPts.map((p) => p[1])),
          Math.min(...deckPts.map((p) => p[2])),
          Math.max(...deckPts.map((p) => p[0])),
          Math.max(...deckPts.map((p) => p[1])),
          Math.max(...deckPts.map((p) => p[2]))
        ]);
        const railX = cw.xCenter < 0 ? cw.xLeft + 0.06 : cw.xRight - 0.06;
        collectors.frameBoxes.push(geoPrimGuardCollisionBox(
          geoSuspPt(fFirst, railX, yTop),
          geoSuspPt(fLast, railX, yTop),
          1.05
        ));
      }
    }
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

function geoBuildElevatedBoardingStation(batcher, frames, samp, edge, p, collectors, opts) {
  const {
    isSuspended,
    style,
    guidewayDepth,
    trackOffsets,
    trackCount,
    hangingDrop,
    hangingW
  } = opts;
  const midF = frames[Math.floor(frames.length * 0.5)];
  const absGuideY = midF.position[1];
  const defaultOffset = isSuspended ? (-hangingDrop + 0.28) : 0.95;
  const absPlatY = Math.max(2.75, absGuideY + (p.platformOffsetMeters ?? defaultOffset));
  const relPlatY = absPlatY - absGuideY;
  const outerTrackAbsX = trackCount === 2 ? Math.max(...trackOffsets.map(Math.abs)) : 0;
  const innerEdgeX = outerTrackAbsX + hangingW * 0.5 + 0.25;
  const stationStyle = p.stationArchitecture || 'industrial_open';
  const architecture = INFRA_STATION_ARCHITECTURE[stationStyle] || INFRA_STATION_ARCHITECTURE.industrial_open;
  const platWidth = infraClamp(p.stationPlatformWidth ?? architecture.width, 3.3, 4.4);
  const firstPlatform = geoStationFrameAt(frames, frames[0].s + samp.lengthMeters * 0.02);
  const lastPlatform = geoStationFrameAt(frames, frames[0].s + samp.lengthMeters * 0.98);
  const archBounds = [firstPlatform.s, lastPlatform.s];
  const platformFrames = [firstPlatform, ...frames.filter((frame) => frame.s > archBounds[0] && frame.s < archBounds[1]), lastPlatform];
  const stAnchorF = frames.findLast((f) => f.u <= 0.74) || midF;
  const liftFrame = geoStationFrameAt(frames, samp.lengthMeters * 0.22 + frames[0].s);
  const publicName = p.stationName || (isSuspended ? 'NORTH CROSS' : 'HARBOR BEAM');

  const platLeft = geoPrimAddPlatformAssembly(
    batcher,
    platformFrames,
    -1,
    -innerEdgeX,
    platWidth,
    relPlatY,
    firstPlatform.u + 0.02,
    lastPlatform.u - 0.02,
    {
      id: `stn_${edge.id}_L`,
      distanceBounds: archBounds,
      deckBottomY: relPlatY - 0.52,
      deckMaterial: stationStyle === 'industrial_open' ? 'steel_grating' : 'concrete',
      includeCanopy: false
    }
  );
  const platRight = geoPrimAddPlatformAssembly(
    batcher,
    platformFrames,
    1,
    innerEdgeX,
    platWidth,
    relPlatY,
    firstPlatform.u + 0.02,
    lastPlatform.u - 0.02,
    {
      id: `stn_${edge.id}_R`,
      distanceBounds: archBounds,
      deckBottomY: relPlatY - 0.52,
      deckMaterial: stationStyle === 'industrial_open' ? 'steel_grating' : 'concrete',
      includeCanopy: false
    }
  );
  if (platLeft && collectors?.platforms) collectors.platforms.push({ ...platLeft, edgeId: edge.id });
  if (platRight && collectors?.platforms) collectors.platforms.push({ ...platRight, edgeId: edge.id });

  for (const [side, platform] of [[-1, platLeft], [1, platRight]]) {
    if (!platform) continue;
    const outer = side * (innerEdgeX + platWidth);
    const openings = [[stAnchorF.s - 1.47, stAnchorF.s + 0.05]];
    const liftEnabled = p.stationLift !== false;
    if (liftEnabled) openings.push([liftFrame.s - 0.84, liftFrame.s + 0.84]);
    const facade = geoBuildStationPlatformArchitecture(batcher, platformFrames, {
      side, inner: side * innerEdgeX, outer, deck: relPlatY, from: archBounds[0], to: archBounds[1],
      openings, style: stationStyle, cover: (p.stationCoverage ?? architecture.cover * 100) / 100,
      glass: (p.stationGlass ?? architecture.glass * 100) / 100,
      roof: p.stationCanopy && p.stationCanopy !== 'preset' ? p.stationCanopy : architecture.roof,
      seating: p.stationSeating ?? architecture.seating, lighting: p.stationLighting ?? 1, detail: p.stationDetail ?? 1
    });
    platform.guardBoxes = facade.guards;
    platform.walkingBoxes.push(...facade.surfaces);
    platform.signs = facade.signs;
    platform.architecture = stationStyle;
    platform.boarding = { from: geoStationPoint(firstPlatform, side * innerEdgeX, relPlatY),
      to: geoStationPoint(lastPlatform, side * innerEdgeX, relPlatY) };
    if (liftEnabled) {
      const lift = geoBuildStationLift(batcher, liftFrame, side, side * Math.max(8.1, innerEdgeX + platWidth + 1.35),
        outer, relPlatY, stationStyle);
      platform.walkingBoxes.push(...lift.walk);
      platform.guardBoxes.push(...lift.guards);
      platform.signs.push(...lift.signs);
      platform.lift = { entrance: lift.entrance, landing: lift.landing };
    }
    const entry = collectors?.platforms?.find((item) => item.id === platform.id);
    if (entry) Object.assign(entry, platform);
  }

  if (stationStyle === 'metropolitan_enclosed') {
    const crown = isSuspended ? (guidewayDepth + 0.92) : (relPlatY + 4.45);
    const hallHalf = innerEdgeX + platWidth - 0.16;
    const bays = platformFrames;
    for (let i = 0; i + 1 < bays.length; i++) {
      const a = bays[i], b = bays[i + 1];
      for (const side of [-1, 1]) {
        const points = [geoSuspPt(a, side * hallHalf, crown), geoSuspPt(a, 0, crown + 0.8),
          geoSuspPt(b, 0, crown + 0.8), geoSuspPt(b, side * hallHalf, crown)];
        batcher.addQuad(...(side < 0 ? points : points.reverse()), { materialKey: i % 3 === 0 ? 'steel_structure' : 'glass_station',
          surfaceStratum: 'station_hall', expectUpwardNormals: true });

        // Detailed 4-slice stepped colliders across the pitched cathedral hall glass roof
        const targetPlat = side < 0 ? platLeft : platRight;
        if (targetPlat) {
          const hallSlices = 4;
          for (let sIdx = 0; sIdx < hallSlices; sIdx++) {
            const t0 = sIdx / hallSlices;
            const t1 = (sIdx + 1) / hallSlices;
            const x0 = side * hallHalf * (1 - t0);
            const x1 = side * hallHalf * (1 - t1);
            const y0 = crown + 0.8 * t0;
            const y1 = crown + 0.8 * t1;
            const sPts = [geoSuspPt(a, x0, y0), geoSuspPt(a, x1, y1), geoSuspPt(b, x0, y0), geoSuspPt(b, x1, y1)];
            targetPlat.walkingBoxes.push([
              Math.min(...sPts.map((pt) => pt[0])),
              Math.min(...sPts.map((pt) => pt[1])) - 0.10,
              Math.min(...sPts.map((pt) => pt[2])),
              Math.max(...sPts.map((pt) => pt[0])),
              Math.max(...sPts.map((pt) => pt[1])) + 0.03,
              Math.max(...sPts.map((pt) => pt[2]))
            ]);
          }
        }
      }
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          geoPrimAddBeamBetween(batcher, geoSuspPt(a, side * hallHalf, relPlatY + 4.15), geoSuspPt(a, side * hallHalf, crown),
            0.16, 0.22, { materialKey: 'steel_structure' });
          geoPrimAddBeamBetween(batcher, geoSuspPt(a, side * hallHalf, crown), geoSuspPt(a, 0, crown + 0.8),
            0.17, 0.22, { materialKey: 'steel_structure' });
        }
      }
    }
  }

  // Station Portal Support Towers & Overhead Tie Frames
  const portalUs = [0.30, 0.62];
  const colLatX = Math.max(innerEdgeX + platWidth - 0.32, p.portalFootOffsetMeters || 0);
  const portalTop = isSuspended ? (guidewayDepth * 0.65) : (relPlatY + 3.45);
  const underTieY = isSuspended ? null : (relPlatY - 0.68);
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
      const topCol = geoSuspPt(bestF, colX, portalTop);
      const platform = sSide < 0 ? platLeft : platRight;
      platform?.guardBoxes.push([groundFoot[0] - 0.25, 0, groundFoot[2] - 0.25,
        groundFoot[0] + 0.25, topCol[1], groundFoot[2] + 0.25]);
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
    if (isSuspended) {
      // Overhead transverse tie frame uniting canopy roof + main guideway truss
      const tieA = geoSuspPt(bestF, -colLatX, portalTop);
      const tieB = geoSuspPt(bestF, colLatX, portalTop);
      geoPrimAddBeamBetween(batcher, tieA, tieB, 0.26, 0.26, { materialKey: 'steel_structure', surfaceStratum: 'station_truss' });
      pushFrameBox(collectors, [tieA[0] - 0.16, tieA[1] - 0.16, tieA[2] - 0.16], [tieB[0] + 0.16, tieB[1] + 0.16, tieB[2] + 0.16]);
    } else {
      // Straddle podway under-deck transverse portal crossbeam supporting both platforms + podway spine
      const tieA = geoSuspPt(bestF, -colLatX, underTieY);
      const tieB = geoSuspPt(bestF, colLatX, underTieY);
      geoPrimAddBeamBetween(batcher, tieA, tieB, 0.34, 0.38, { materialKey: 'steel_structure', surfaceStratum: 'station_truss' });
      pushFrameBox(collectors, [tieA[0] - 0.2, tieA[1] - 0.2, tieA[2] - 0.2], [tieB[0] + 0.2, tieB[1] + 0.2, tieB[2] + 0.2]);
    }
  }

  const stairOuterOffset = Math.max(innerEdgeX + platWidth + 1.64, p.stairOffsetMeters || 0);
  for (const side of [-1, 1]) {
    const outward = infraVec3Scale(stAnchorF.right, side);
    const stairBaseXZ = infraVec3Add(stAnchorF.position, infraVec3Scale(outward, stairOuterOffset));
    stairBaseXZ[1] = 0;
    const stairTopBridgePt = infraVec3Add(stAnchorF.position, infraVec3Scale(outward, innerEdgeX + platWidth - 0.15));
    stairTopBridgePt[1] = absPlatY - 0.11;
    const stairMeta = geoPrimAddStairFlight(
      batcher,
      stairBaseXZ,
      [stAnchorF.tangent[0], stAnchorF.tangent[2]],
      [outward[0], outward[2]],
      absPlatY,
      p.stairClearWidthMeters || 1.45,
      { id: `stair_${edge.id}_stn_${side}`, stationStyle: p.stationStairStyle || (style === 'industrial_truss' ? 'grated' : 'concrete') }
    );
    const stairEnd = stairMeta.endPosMeters;
    const back = (stairEnd[0] - stairTopBridgePt[0]) * stAnchorF.tangent[0] +
      (stairEnd[2] - stairTopBridgePt[2]) * stAnchorF.tangent[2];
    const start = infraVec3Add(stairTopBridgePt, infraVec3Scale(stAnchorF.tangent, back));
    const platformEdge = infraVec3Add(start, infraVec3Scale(outward, 0.15));
    const stairEdge = infraVec3Add([stairEnd[0], start[1], stairEnd[2]], infraVec3Scale(outward, -stairMeta.clearWidthMeters / 2));
    const center = infraVec3Scale(infraVec3Add(platformEdge, stairEdge), 0.5);
    const width = Math.hypot(stairEdge[0] - platformEdge[0], stairEdge[2] - platformEdge[2]);
    const depth = 1.42;
    batcher.addBoxOriented(
      center,
      stAnchorF.tangent,
      infraVec3Cross([0, 1, 0], stAnchorF.tangent),
      [0, 1, 0],
      width,
      0.22,
      depth,
      { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_grating', surfaceStratum: 'stair_landing' }
    );
    const crossX = (Math.abs(stAnchorF.right[0]) * width + Math.abs(stAnchorF.tangent[0]) * depth) / 2;
    const crossZ = (Math.abs(stAnchorF.right[2]) * width + Math.abs(stAnchorF.tangent[2]) * depth) / 2;
    stairMeta.walkingBoxes.push([center[0] - crossX, absPlatY - 0.22, center[2] - crossZ,
      center[0] + crossX, absPlatY, center[2] + crossZ]);
    const guard = { materialKey: 'steel_structure', surfaceStratum: 'railing' };
    for (const edgeSign of [-1, 1]) {
      const offset = infraVec3Scale(stAnchorF.tangent, edgeSign * 0.67);
      const a = infraVec3Add(platformEdge, offset);
      const b = infraVec3Add(stairEdge, offset);
      stairMeta.guardBoxes.push(geoPrimGuardCollisionBox(infraVec3Add(a, [0, 0.11, 0]), infraVec3Add(b, [0, 0.11, 0])));
      for (const [height, thickness, materialKey] of [[0.61, 0.035, 'steel_structure'], [1.13, 0.055, 'steel_accent']]) {
        geoPrimAddBeamBetween(batcher, infraVec3Add(a, [0, height, 0]), infraVec3Add(b, [0, height, 0]),
          thickness, thickness, { ...guard, materialKey });
      }
      const posts = Math.max(1, Math.ceil(width / 1.1));
      for (let i = 0; i <= posts; i++) {
        const post = infraVec3Add(a, infraVec3Scale(outward, width * (i + 0.035) / (posts + 0.07)));
        geoPrimAddBeamBetween(batcher, infraVec3Add(post, [0, 0.11, 0]), infraVec3Add(post, [0, 1.13, 0]), 0.048, 0.048, guard);
      }
    }
    const cover = geoBuildStationStairCover(batcher, stAnchorF, side * stairOuterOffset, side,
      stairMeta.stepCount / stairMeta.flightCount * stairMeta.stepRunMeters, absPlatY,
      p.stationStairCover && p.stationStairCover !== 'preset' ? p.stationStairCover : architecture.stairs,
      p.stationLighting ?? 1, publicName);
    if (cover.walk?.length) stairMeta.walkingBoxes.push(...cover.walk);
    stairMeta.guardBoxes.push(...cover.guards);
    collectors?.stairs?.push({ ...stairMeta, signs: cover.signs, edgeId: edge.id });
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

      // Flanged crossbeam + accent saddle clip beneath spine
      geoPrimAddBeamBetween(
        batcher,
        geoSuspPt(fr, -yokeHalfW, 0.14),
        geoSuspPt(fr, yokeHalfW, 0.14),
        0.24,
        0.16,
        { materialKey: 'steel_structure', surfaceStratum: 'hanger_yoke' }
      );
      geoPrimAddBeamBetween(
        batcher,
        geoSuspPt(fr, -yokeHalfW * 0.92, 0.04),
        geoSuspPt(fr, yokeHalfW * 0.92, 0.04),
        0.14,
        0.08,
        { materialKey: 'steel_grating', surfaceStratum: 'hanger_yoke' }
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
        // Diagonal knee gusset strut bracing hanger neck back into cross-yoke
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(fr, neckX, -0.26),
          geoSuspPt(fr, neckX - sideSign * 0.42, 0.12),
          0.09,
          0.09,
          { materialKey: 'steel_grating', surfaceStratum: 'hanger_brace' }
        );
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(fr, neckX, -0.42),
          geoSuspPt(fr, tx, -0.42),
          0.18,
          0.16,
          { materialKey: 'steel_structure', surfaceStratum: 'hanger_bracket' }
        );
        geoPrimAddBeamBetween(
          batcher,
          geoSuspPt(fr, tx - 0.12, -0.46),
          geoSuspPt(fr, tx + 0.12, -0.46),
          0.22,
          0.06,
          { materialKey: 'steel_accent', surfaceStratum: 'hanger_clip' }
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

    // Detailed structural frame colliders for the suspended guideway truss/box & running rail
    if (collectors?.frameBoxes && frames.length >= 2) {
      const f0 = frames[0];
      const fE = frames[frames.length - 1];
      const topY = guidewayDepth;
      const botY = 0.16;
      // Walkable top spine deck
      pushFrameBox(collectors, geoSuspPt(f0, -spineHalfW, topY - 0.18), geoSuspPt(fE, spineHalfW, topY + 0.08));
      // Left & right side truss / box girder walls
      pushFrameBox(collectors, geoSuspPt(f0, -spineHalfW - 0.12, botY), geoSuspPt(fE, -spineHalfW + 0.12, topY));
      pushFrameBox(collectors, geoSuspPt(f0, spineHalfW - 0.12, botY), geoSuspPt(fE, spineHalfW + 0.12, topY));
      // Lower running rail carrier beams
      for (const tx of trackOffsets) {
        pushFrameBox(collectors, geoSuspPt(f0, tx - 0.22, -0.48), geoSuspPt(fE, tx + 0.22, 0.16));
      }
    }

    // Maintenance catwalks
    if (p.includeMaintenanceWalkway) {
      geoSuspSweepCatwalks(batcher, frames, prof, true, collectors);
    }

    // Optional Elevated Suspended Boarding Station (glass + steel platforms + street switchback stairs)
    if (p.includeStation && samp.lengthMeters >= 24) {
      geoBuildElevatedBoardingStation(batcher, frames, samp, edge, p, collectors, {
        isSuspended: true,
        style,
        guidewayDepth,
        trackOffsets,
        trackCount,
        hangingDrop,
        hangingW
      });
    }

    return;
  }

  // =========================================================================
  // BRANCH 2: STRADDLE-BEAM MONORAIL & STREAMLINED SINGLE PODWAY
  // =========================================================================
  if (transitSystem === 'straddle_monorail') {
    const halfBeam = trackCount === 2 ? trackSpacing * 0.5 + 0.52 : 0.48;
    const beamH = infraClamp(guidewayDepth, 0.9, 2.2);
    const isPodway = style === 'single_podway' || style === 'futuristic_shroud';

    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      for (const tx of trackOffsets) {
        if (isPodway) {
          // Sleek chamfered aerodynamic Streamlined Single Podway beam (no bulky concrete square!)
          const topW = 0.36;
          const shoulderW = 0.48;
          const shoulderY = -0.30;
          const botW = 0.22;
          const bodyMat = 'steel_structure';
          // Top running pad
          batcher.addQuad(
            geoSuspPt(f0, tx - topW, 0),
            geoSuspPt(f0, tx + topW, 0),
            geoSuspPt(f1, tx + topW, 0),
            geoSuspPt(f1, tx - topW, 0),
            { layer: 'LayerA_PrimaryStructure', materialKey: 'deck_concrete', surfaceStratum: 'top_surface', expectUpwardNormals: true }
          );
          // Upper beveled cheeks
          batcher.addQuad(
            geoSuspPt(f0, tx - shoulderW, shoulderY),
            geoSuspPt(f0, tx - topW, 0),
            geoSuspPt(f1, tx - topW, 0),
            geoSuspPt(f1, tx - shoulderW, shoulderY),
            { layer: 'LayerA_PrimaryStructure', materialKey: bodyMat, surfaceStratum: 'deck_side' }
          );
          batcher.addQuad(
            geoSuspPt(f0, tx + topW, 0),
            geoSuspPt(f0, tx + shoulderW, shoulderY),
            geoSuspPt(f1, tx + shoulderW, shoulderY),
            geoSuspPt(f1, tx + topW, 0),
            { layer: 'LayerA_PrimaryStructure', materialKey: bodyMat, surfaceStratum: 'deck_side' }
          );
          // Tapered lower aerodynamic fairing slopes
          batcher.addQuad(
            geoSuspPt(f0, tx - botW, -beamH),
            geoSuspPt(f0, tx - shoulderW, shoulderY),
            geoSuspPt(f1, tx - shoulderW, shoulderY),
            geoSuspPt(f1, tx - botW, -beamH),
            { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_grating', surfaceStratum: 'deck_side' }
          );
          batcher.addQuad(
            geoSuspPt(f0, tx + shoulderW, shoulderY),
            geoSuspPt(f0, tx + botW, -beamH),
            geoSuspPt(f1, tx + botW, -beamH),
            geoSuspPt(f1, tx + shoulderW, shoulderY),
            { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_grating', surfaceStratum: 'deck_side' }
          );
          // Narrow sculpted belly soffit
          batcher.addQuad(
            geoSuspPt(f0, tx - botW, -beamH),
            geoSuspPt(f1, tx - botW, -beamH),
            geoSuspPt(f1, tx + botW, -beamH),
            geoSuspPt(f0, tx + botW, -beamH),
            { layer: 'LayerA_PrimaryStructure', materialKey: bodyMat, surfaceStratum: 'deck_soffit' }
          );
          // Brushed steel guide rails + illuminated cyan/teal accent strips along cheeks
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx - shoulderW - 0.04, shoulderY + 0.06), geoSuspPt(f1, tx - shoulderW - 0.04, shoulderY + 0.06), 0.07, 0.11, { materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx + shoulderW + 0.04, shoulderY + 0.06), geoSuspPt(f1, tx + shoulderW + 0.04, shoulderY + 0.06), 0.07, 0.11, { materialKey: 'rail_steel', surfaceStratum: 'rail_steel' });
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx - (shoulderW + botW) * 0.5 - 0.03, (shoulderY - beamH) * 0.5), geoSuspPt(f1, tx - (shoulderW + botW) * 0.5 - 0.03, (shoulderY - beamH) * 0.5), 0.05, 0.09, { materialKey: 'steel_accent', surfaceStratum: 'accent_trim' });
          geoPrimAddBeamBetween(batcher, geoSuspPt(f0, tx + (shoulderW + botW) * 0.5 + 0.03, (shoulderY - beamH) * 0.5), geoSuspPt(f1, tx + (shoulderW + botW) * 0.5 + 0.03, (shoulderY - beamH) * 0.5), 0.05, 0.09, { materialKey: 'steel_accent', surfaceStratum: 'accent_trim' });
        } else {
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
      }
      if (trackCount === 2) {
        geoPrimAddBeamBetween(batcher, geoSuspPt(f0, -halfBeam, -beamH * 0.72), geoSuspPt(f0, halfBeam, -beamH * 0.72), 0.3, 0.28, { materialKey: 'deck_concrete', surfaceStratum: 'cross_tie' });
      }
    }

    // Periodic architectural rib collars along streamlined podway spine
    if (isPodway) {
      let nextRibS = frames[0].s + 2.0;
      for (let i = 0; i < frames.length; i++) {
        const fr = frames[i];
        if (fr.s < nextRibS) continue;
        nextRibS = fr.s + 4.0;
        for (const tx of trackOffsets) {
          batcher.addBoxOriented(
            geoSuspPt(fr, tx, -beamH * 0.56),
            fr.tangent,
            fr.right,
            fr.up,
            1.02,
            beamH * 0.74,
            0.22,
            { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'podway_rib' }
          );
        }
      }
    }

    // Detailed walkable guideway & lower fairing colliders for the podway/straddle beam
    if (collectors?.frameBoxes && frames.length >= 2) {
      const f0 = frames[0];
      const fE = frames[frames.length - 1];
      for (const tx of trackOffsets) {
        pushFrameBox(collectors, geoSuspPt(f0, tx - 0.46, -0.34), geoSuspPt(fE, tx + 0.46, 0.02));
        pushFrameBox(collectors, geoSuspPt(f0, tx - 0.32, -beamH), geoSuspPt(fE, tx + 0.32, -0.34));
      }
    }

    if (p.includeMaintenanceWalkway) geoSuspSweepCatwalks(batcher, frames, prof, false, collectors);

    // Optional Elevated Boarding Station for Streamlined Single Podway / Straddle Monorail
    if (p.includeStation && samp.lengthMeters >= 24) {
      geoBuildElevatedBoardingStation(batcher, frames, samp, edge, p, collectors, {
        isSuspended: false,
        style,
        guidewayDepth: beamH,
        trackOffsets,
        trackCount,
        hangingDrop: 0,
        hangingW
      });
    }
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
