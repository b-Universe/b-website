import { clamp, roundNum } from '../utils.js';
import { segmentsForFloor, getFireEscapeWallAnchor } from './layouts.js';

export const STRAIGHT_RUN_UNITS_PER_METER = 16.404199475065617;

export const STRAIGHT_RUN_PROFILE = {
  id: 'straight_run',
  label: 'Straight-Run Walkable (1.00m Width, 1-Unit Steps)',
  capsuleDiameter: roundNum(8 / STRAIGHT_RUN_UNITS_PER_METER, 4),
  characterWidth: 0.62,
  playerHeight: roundNum(26 / STRAIGHT_RUN_UNITS_PER_METER, 4),
  stairClearWidth: 1.00,
  landingDepth: 1.34,
  landingLengthPreferred: 1.50,
  landingLengthMin: 1.10,
  midLandingLengthPreferred: 1.35,
  midLandingLengthMin: 1.00,
  ladderOpeningWidth: 0.90,
  turnaroundLength: 1.35,
  wallClearance: 0.28,
  railThickness: 0.06,
  railHeight: 1.00,
  deckThickness: 0.12,
  stepRunTarget: 1 / STRAIGHT_RUN_UNITS_PER_METER,
  stepRiseTarget: 1 / STRAIGHT_RUN_UNITS_PER_METER,
  headroom: 2.20
};

export function computeRoofDeckAndParapetTop(cfg) {
  const floors = Number(cfg.floors) || 4;
  const fh = Number(cfg.floorHeight) || 3.4;
  const wallHeight = floors * fh;
  const roofType = cfg.roofType || 'flat';
  const roofLift = roofType === 'mansard'
    ? 0.84
    : roofType === 'stepped'
      ? 0.70
      : 0;
  const roofDeckTop = roundNum(wallHeight + roofLift, 4);
  const parapetH = cfg.parapet && roofType !== 'pitched' ? (Number(cfg.parapetHeight) || 0.65) : 0;
  const roofParapetTop = roundNum(roofDeckTop + parapetH, 4);
  return {
    wallHeight: roundNum(wallHeight, 4),
    roofLift: roundNum(roofLift, 4),
    roofDeckTop,
    parapetHeight: roundNum(parapetH, 4),
    roofParapetTop
  };
}

function getExposedSpanOnSide(seg, side) {
  const isLong = side === 'front' || side === 'back';
  const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
  const rawMin = isLong ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
  const rawMax = (isLong ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut;
  const blocked = seg.occlusions?.[side] || [];
  let minSpan = rawMin + 0.35;
  let maxSpan = rawMax - 0.35;

  // Exclude non-trivial occluded spans
  for (const [bStart, bEnd] of blocked) {
    if (bEnd <= minSpan || bStart >= maxSpan) continue;
    const leftLen = bStart - minSpan;
    const rightLen = maxSpan - bEnd;
    if (leftLen >= rightLen) {
      maxSpan = Math.min(maxSpan, bStart - 0.25);
    } else {
      minSpan = Math.max(minSpan, bEnd + 0.25);
    }
  }
  return [roundNum(minSpan, 4), roundNum(maxSpan, 4)];
}

export function computeStraightRunFireEscape(groundSegments, placement, cfg) {
  if (!placement || (cfg.floors || 0) < 2) {
    return null;
  }

  const { side, coord, extIndex = -1 } = placement;
  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const mainSeg = segs[0];
  if (!mainSeg) return null;

  const floors = Number(cfg.floors) || 4;
  const floorHeight = Number(cfg.floorHeight) || 3.4;
  const isLong = side === 'front' || side === 'back';
  const normal = side === 'front'
    ? { x: 0, y: 0, z: 1 }
    : side === 'back'
      ? { x: 0, y: 0, z: -1 }
      : side === 'left'
        ? { x: -1, y: 0, z: 0 }
        : { x: 1, y: 0, z: 0 };
  const yawDegrees = side === 'front' ? 0 : side === 'back' ? 180 : side === 'left' ? -90 : 90;

  const extraLadderClearance = clamp(Number(cfg.fireEscapeLadderClearance) || 0, 0, 0.30);
  const customStairWidth = Number(cfg.fireEscapeStairWidth) > 0 ? Number(cfg.fireEscapeStairWidth) : 0;
  const stairWidth = clamp(
    customStairWidth > 0 ? customStairWidth : STRAIGHT_RUN_PROFILE.stairClearWidth,
    0.72,
    1.50
  );
  const wallClearance = roundNum(STRAIGHT_RUN_PROFILE.wallClearance + extraLadderClearance * 0.5, 4);
  const railThickness = STRAIGHT_RUN_PROFILE.railThickness;
  const railHeight = STRAIGHT_RUN_PROFILE.railHeight;
  const deckThickness = STRAIGHT_RUN_PROFILE.deckThickness;

  // Walkable path zone perpendicular to facade wall: [zWalkMin, zWalkMax]
  const zWalkMin = wallClearance;
  const zWalkMax = roundNum(zWalkMin + stairWidth, 4);
  const zPathCenter = roundNum((zWalkMin + zWalkMax) * 0.5, 4);
  const zRailInner = roundNum(zWalkMin - railThickness * 0.5, 4);
  const zRailOuter = roundNum(zWalkMax + railThickness * 0.5, 4);
  const structuralOutDepth = roundNum(zWalkMax + railThickness - zWalkMin, 4);
  const deckOutDepth = stairWidth;

  const segForFloor = (flIdx) => {
    const flSegs = segmentsForFloor(cfg, flIdx);
    if (extIndex >= 0) {
      const ext = flSegs.find((s) => s.isExtension && s.extIndex === extIndex);
      if (ext) return ext;
    }
    return flSegs[0] || mainSeg;
  };

  // Intersect usable facade span across ground + upper fire escape floors
  let spanMin = -Infinity;
  let spanMax = Infinity;
  let baseWallOut = null;
  let setbackMismatch = 0;

  for (let f = 0; f < floors; f++) {
    const s = segForFloor(f);
    if (!s || s.skipWalls?.[side]) {
      spanMin = 1;
      spanMax = -1;
      break;
    }
    const [sMin, sMax] = getExposedSpanOnSide(s, side);
    spanMin = Math.max(spanMin, sMin);
    spanMax = Math.min(spanMax, sMax);
    const outCoord = side === 'front'
      ? s.z + s.d * 0.5
      : side === 'back'
        ? -(s.z - s.d * 0.5)
        : side === 'left'
          ? -(s.x - s.w * 0.5)
          : s.x + s.w * 0.5;
    if (baseWallOut === null) baseWallOut = outCoord;
    else setbackMismatch = Math.max(setbackMismatch, Math.abs(outCoord - baseWallOut));
  }

  const availableWallSpan = spanMax > spanMin ? roundNum(spanMax - spanMin, 4) : 0;

  // Step dimensions: ~1 B unit rise and ~1 B unit run
  const rawStepsPerFlight = Math.max(1, Math.round(floorHeight * STRAIGHT_RUN_UNITS_PER_METER));
  const stepCount = Math.min(64, rawStepsPerFlight);
  const risePerStep = roundNum(floorHeight / stepCount, 6);
  const runPerStep = roundNum(1 / STRAIGHT_RUN_UNITS_PER_METER, 6);
  const treadThickness = risePerStep;
  const flightRun = roundNum(stepCount * runPerStep, 4);
  const numFlights = Math.max(0, floors - 2);
  const numLandings = Math.max(1, floors - 1);

  const minReqSpan = roundNum(
    numFlights * flightRun +
    STRAIGHT_RUN_PROFILE.landingLengthMin +
    (numLandings > 1 ? STRAIGHT_RUN_PROFILE.landingLengthMin : 0) +
    Math.max(0, numLandings - 2) * STRAIGHT_RUN_PROFILE.midLandingLengthMin,
    4
  );

  const estimatedRailCount = numLandings * 4 + numFlights * 8;
  const estimatedComponents = numLandings + 1 + numFlights * (stepCount + 1) + estimatedRailCount + 2;

  const limitations = [];
  if (rawStepsPerFlight > 64) {
    limitations.push(
      `Floor height (${floorHeight}m) exceeds single-flight 64-tread B schema limit at strict 1-unit rise; clamped to 64 steps (${risePerStep.toFixed(4)}m/step).`
    );
  }
  if (availableWallSpan < minReqSpan) {
    limitations.push(
      `Available usable wall span (${availableWallSpan.toFixed(2)}m) on ${side} facade cannot fit ${numFlights} continuous 1-unit straight-run flight(s) requiring at least ${minReqSpan.toFixed(2)}m (${flightRun.toFixed(2)}m per flight plus landings).`
    );
  }
  if (setbackMismatch > 0.35) {
    limitations.push(
      `Upper-floor wall setback (${setbackMismatch.toFixed(2)}m) breaks continuous facade alignment needed for a straight-run fire escape.`
    );
  }
  if (estimatedComponents > 512) {
    limitations.push(
      `Building height (${floors} floors) requires ~${estimatedComponents} semantic components, exceeding the B Remastered 512-component blueprint limit.`
    );
  }

  const feasible = availableWallSpan >= minReqSpan && setbackMismatch <= 0.35 && estimatedComponents <= 512;

  const groundSeg = segForFloor(0);
  const spanCenter = spanMax > spanMin ? (spanMin + spanMax) * 0.5 : coord;
  const wallAnchor = getFireEscapeWallAnchor(groundSeg, side, spanCenter, Math.min(availableWallSpan, minReqSpan));

  const localToWorld = (local) => {
    if (side === 'front') return { x: wallAnchor.x + local.x, y: local.y, z: wallAnchor.z + local.z };
    if (side === 'back') return { x: wallAnchor.x - local.x, y: local.y, z: wallAnchor.z - local.z };
    if (side === 'left') return { x: wallAnchor.x - local.z, y: local.y, z: wallAnchor.z + local.x };
    return { x: wallAnchor.x + local.z, y: local.y, z: wallAnchor.z - local.x };
  };

  const toZUpPos = (wPos) => ({
    x: roundNum(wPos.x, 4),
    y: roundNum(-wPos.z, 4),
    z: roundNum(wPos.y, 4)
  });

  const makeGenDims = (alongLen, heightVal, outDepth) => ({
    width: roundNum(isLong ? alongLen : outDepth, 4),
    height: roundNum(heightVal, 4),
    depth: roundNum(isLong ? outDepth : alongLen, 4)
  });

  const makeZUpDims = (alongLen, heightVal, outDepth) => ({
    width: roundNum(isLong ? alongLen : outDepth, 4),
    depth: roundNum(isLong ? outDepth : alongLen, 4),
    height: roundNum(heightVal, 4)
  });

  const scaleZUpToBUnits = (zUpPos, zUpDims, topElev = null) => ({
    position: {
      x: roundNum(zUpPos.x * STRAIGHT_RUN_UNITS_PER_METER, 3),
      y: roundNum(zUpPos.y * STRAIGHT_RUN_UNITS_PER_METER, 3),
      z: roundNum(zUpPos.z * STRAIGHT_RUN_UNITS_PER_METER, 3)
    },
    elevation: roundNum(zUpPos.z * STRAIGHT_RUN_UNITS_PER_METER, 3),
    ...(topElev !== null ? { topElevation: roundNum(topElev * STRAIGHT_RUN_UNITS_PER_METER, 3) } : {}),
    dimensions: {
      width: roundNum(zUpDims.width * STRAIGHT_RUN_UNITS_PER_METER, 3),
      depth: roundNum(zUpDims.depth * STRAIGHT_RUN_UNITS_PER_METER, 3),
      height: roundNum(zUpDims.height * STRAIGHT_RUN_UNITS_PER_METER, 3)
    }
  });

  const ladderState = cfg.fireEscapeLadder === 'lowered' ? 'lowered' : 'raised';
  const roofInfo = computeRoofDeckAndParapetTop(cfg);
  const ladderWidth = roundNum(0.56 + extraLadderClearance, 3);
  const portalOpeningWidth = roundNum(Math.max(STRAIGHT_RUN_PROFILE.ladderOpeningWidth, ladderWidth + 0.30), 3);

  const clearanceStandard = {
    profile: STRAIGHT_RUN_PROFILE.id,
    label: STRAIGHT_RUN_PROFILE.label,
    playerWidth: STRAIGHT_RUN_PROFILE.characterWidth,
    visualCharacterWidth: STRAIGHT_RUN_PROFILE.characterWidth,
    collisionCapsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter,
    playerHeight: STRAIGHT_RUN_PROFILE.playerHeight,
    stairClearWidth: stairWidth,
    stairWidth,
    landingDepth: deckOutDepth,
    turnaroundLength: STRAIGHT_RUN_PROFILE.landingLengthPreferred,
    ladderPortalWidth: portalOpeningWidth,
    ladderClearance: extraLadderClearance,
    wallClearance,
    verticalHeadroom: STRAIGHT_RUN_PROFILE.headroom,
    stepRiseBUnits: roundNum(risePerStep * STRAIGHT_RUN_UNITS_PER_METER, 3),
    stepRunBUnits: roundNum(runPerStep * STRAIGHT_RUN_UNITS_PER_METER, 3),
    margins: {
      stairMargin: roundNum(stairWidth - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      ladderPortalMargin: roundNum(portalOpeningWidth - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      turnaroundMargin: roundNum(STRAIGHT_RUN_PROFILE.landingLengthPreferred - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      wallShutterMargin: roundNum((zRailInner - railThickness * 0.5) - 0.16, 3),
      headroomMargin: roundNum(STRAIGHT_RUN_PROFILE.headroom - STRAIGHT_RUN_PROFILE.playerHeight, 3)
    }
  };

  if (!feasible) {
    const diagValidation = {
      status: 'layout_limitation_reported',
      layoutStyle: 'straight_run',
      feasible: false,
      limitations,
      requiredWallSpan: minReqSpan,
      availableWallSpan,
      disclaimer: 'Straight-run 1-unit staircase requires sufficient continuous wall span; layout omitted to avoid creating an impassable or compressed stair structure.',
      verifiedPassages: {
        stairPassage: { clearWidth: stairWidth, capsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter, adequate: false },
        ladderPortal: { clearWidth: portalOpeningWidth, capsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter, adequate: false },
        wallShutterStandoff: { clearStandoff: wallClearance, maxShutterProjection: 0.16, adequate: true }
      }
    };
    return {
      feasible: false,
      layoutStyle: 'straight_run',
      side,
      anchor: { ...wallAnchor, normal, yawDegrees },
      ladderState,
      limitations,
      metadata: {
        side,
        layoutStyle: 'straight_run',
        feasible: false,
        limitations,
        ladderPosition: ladderState,
        hasRoofAccess: cfg.fireEscapeRoofAccess !== false,
        treadsEnabled: Boolean(cfg.fireEscapeTreads),
        flightCount: 0,
        treadCount: 0,
        componentCount: 0,
        components: [],
        flights: [],
        clearanceStandard,
        traversalValidation: diagValidation,
        warnings: [...limitations],
        clearanceVolumes: [],
        walkableRoutes: [
          {
            id: 'fe_route_street_to_roof',
            name: 'Street to Rooftop Traversal Route',
            status: 'layout_limitation_reported',
            connected: false,
            disclaimer: limitations[0] || 'Straight-run layout infeasible for building footprint.',
            waypoints: []
          }
        ]
      }
    };
  }

  // Distribute slack across landings up to preferred sizes
  const prefSpan =
    numFlights * flightRun +
    STRAIGHT_RUN_PROFILE.landingLengthPreferred +
    (numLandings > 1 ? STRAIGHT_RUN_PROFILE.landingLengthPreferred : 0) +
    Math.max(0, numLandings - 2) * STRAIGHT_RUN_PROFILE.midLandingLengthPreferred;

  const slackRatio = prefSpan > minReqSpan
    ? clamp((availableWallSpan - minReqSpan) / (prefSpan - minReqSpan), 0, 1)
    : 1;

  const startLandingLen = roundNum(
    STRAIGHT_RUN_PROFILE.landingLengthMin +
      slackRatio * (STRAIGHT_RUN_PROFILE.landingLengthPreferred - STRAIGHT_RUN_PROFILE.landingLengthMin),
    4
  );
  const midLandingLen = roundNum(
    STRAIGHT_RUN_PROFILE.midLandingLengthMin +
      slackRatio * (STRAIGHT_RUN_PROFILE.midLandingLengthPreferred - STRAIGHT_RUN_PROFILE.midLandingLengthMin),
    4
  );
  const endLandingLen = roundNum(
    numLandings > 1 ? startLandingLen : 0,
    4
  );

  const totalUsedSpan = roundNum(
    numFlights * flightRun +
      startLandingLen +
      endLandingLen +
      Math.max(0, numLandings - 2) * midLandingLen,
    4
  );

  // Build sequential landings & flights centered on wall span:
  // On 'right' side local.x < 0 is toward street (+Z_gen); flights advance +local.x
  let cursorX = -totalUsedSpan * 0.5;
  const landings = [];
  const flights = [];
  const allTreads = [];
  const railings = [];
  const components = [];
  const clearanceVolumes = [];
  const waypoints = [];

  const emitRailingStrip = (id, flNum, cx, cyBottom, cz, alongLen, outThick = railThickness, stripHeight = railHeight) => {
    const cyCenter = cyBottom + stripHeight * 0.5;
    const wPos = localToWorld({ x: cx, y: cyCenter, z: cz });
    const zPos = toZUpPos(wPos);
    const dims = makeGenDims(alongLen, stripHeight, outThick);
    const zDims = makeZUpDims(alongLen, stripHeight, outThick);
    const item = {
      id,
      type: 'railing',
      floor: flNum,
      elevation: roundNum(cyBottom, 4),
      local: { x: roundNum(cx, 4), y: roundNum(cyCenter, 4), z: roundNum(cz, 4), alongLen: roundNum(alongLen, 4), outThick: roundNum(outThick, 4), height: roundNum(stripHeight, 4) },
      position: { x: roundNum(wPos.x, 4), y: roundNum(wPos.y, 4), z: roundNum(wPos.z, 4) },
      dimensions: dims,
      orientation: { ...normal, yawDegrees },
      traversal: 'barrier',
      coordinatesZUp: {
        position: zPos,
        elevation: roundNum(cyCenter, 4),
        dimensions: zDims,
        bGameUnits: scaleZUpToBUnits(zPos, zDims)
      }
    };
    railings.push(item);
    components.push(item);
  };

  for (let idx = 0; idx < numLandings; idx++) {
    const flNum = idx + 1;
    const topY = roundNum(flNum * floorHeight, 4);
    const isFirst = idx === 0;
    const isLast = idx === numLandings - 1;
    const len = isFirst ? startLandingLen : isLast ? endLandingLen : midLandingLen;
    const xMin = roundNum(cursorX, 4);
    const xMax = roundNum(cursorX + len, 4);
    const xMid = roundNum((xMin + xMax) * 0.5, 4);
    cursorX = xMax;

    const wPos = localToWorld({ x: xMid, y: topY, z: zPathCenter });
    const zPos = toZUpPos(wPos);
    const genDims = makeGenDims(len, deckThickness, deckOutDepth);
    const zDims = makeZUpDims(len, deckThickness, deckOutDepth);

    const landingObj = {
      id: `fe_landing_f${flNum}`,
      type: 'landing',
      floor: flNum,
      elevation: topY,
      topSurfaceElevation: topY,
      local: {
        xMin,
        xMax,
        x: xMid,
        yTop: topY,
        yCenter: roundNum(topY - deckThickness * 0.5, 4),
        zMin: zWalkMin,
        zMax: zWalkMax,
        zCenter: zPathCenter,
        length: len,
        depth: deckOutDepth
      },
      position: { x: roundNum(wPos.x, 4), y: roundNum(wPos.y, 4), z: roundNum(wPos.z, 4) },
      dimensions: genDims,
      orientation: { ...normal, yawDegrees },
      traversal: 'walkable_surface',
      walkable: true,
      coordinatesZUp: {
        position: zPos,
        elevation: topY,
        topElevation: topY,
        dimensions: zDims,
        bGameUnits: scaleZUpToBUnits(zPos, zDims, topY)
      }
    };
    landings.push(landingObj);
    components.push(landingObj);

    clearanceVolumes.push({
      id: `fe_clearance_landing_f${flNum}`,
      type: 'landing_clearance',
      floor: flNum,
      position: { x: roundNum(wPos.x, 4), y: roundNum(topY + STRAIGHT_RUN_PROFILE.headroom * 0.5, 4), z: roundNum(wPos.z, 4) },
      dimensions: makeGenDims(len, STRAIGHT_RUN_PROFILE.headroom, stairWidth),
      clearanceWidth: len,
      clearanceDepth: stairWidth,
      clearanceHeight: STRAIGHT_RUN_PROFILE.headroom,
      traversal: 'clearance_volume'
    });

    // Outer side guardrail always covers full landing length (outside [zWalkMin, zWalkMax])
    emitRailingStrip(`fe_rail_f${flNum}_outer`, flNum, xMid, topY, zRailOuter, len, railThickness);

    if (isLast && cfg.fireEscapeRoofAccess !== false) {
      // Top landing inner side has a clean open portal in front of roof ladder + flush wall threshold
      const portalLen = roundNum(Math.min(len - 0.25, portalOpeningWidth), 4);
      const portalCenterX = roundNum(clamp(xMin + len * 0.58, xMin + 0.30 + portalLen * 0.5, xMax - portalLen * 0.5 - 0.08), 4);
      const portalMinX = roundNum(portalCenterX - portalLen * 0.5, 4);
      const portalMaxX = roundNum(portalCenterX + portalLen * 0.5, 4);

      if (portalMinX - xMin > 0.08) {
        const preLen = roundNum(portalMinX - xMin, 4);
        emitRailingStrip(`fe_rail_f${flNum}_inner_pre`, flNum, roundNum((xMin + portalMinX) * 0.5, 4), topY, zRailInner, preLen, railThickness);
      }
      if (xMax - portalMaxX > 0.08) {
        const postLen = roundNum(xMax - portalMaxX, 4);
        emitRailingStrip(`fe_rail_f${flNum}_inner_post`, flNum, roundNum((portalMaxX + xMax) * 0.5, 4), topY, zRailInner, postLen, railThickness);
      }

      // Bridge threshold spanning [0 .. zWalkMin] so stepping onto roof ladder has zero floor gap
      const threshDepth = wallClearance;
      const threshZCenter = roundNum(wallClearance * 0.5, 4);
      const twPos = localToWorld({ x: portalCenterX, y: topY, z: threshZCenter });
      const tzPos = toZUpPos(twPos);
      const tGenDims = makeGenDims(portalLen, deckThickness, threshDepth);
      const tzDims = makeZUpDims(portalLen, deckThickness, threshDepth);
      const portalLanding = {
        id: `fe_landing_f${flNum}_portal`,
        type: 'landing',
        floor: flNum,
        elevation: topY,
        topSurfaceElevation: topY,
        local: {
          xMin: portalMinX,
          xMax: portalMaxX,
          x: portalCenterX,
          yTop: topY,
          yCenter: roundNum(topY - deckThickness * 0.5, 4),
          zMin: 0,
          zMax: zWalkMin,
          zCenter: threshZCenter,
          length: portalLen,
          depth: threshDepth
        },
        position: { x: roundNum(twPos.x, 4), y: roundNum(twPos.y, 4), z: roundNum(twPos.z, 4) },
        dimensions: tGenDims,
        orientation: { ...normal, yawDegrees },
        traversal: 'walkable_surface',
        walkable: true,
        coordinatesZUp: {
          position: tzPos,
          elevation: topY,
          topElevation: topY,
          dimensions: tzDims,
          bGameUnits: scaleZUpToBUnits(tzPos, tzDims, topY)
        }
      };
      landings.push(portalLanding);
      components.push(portalLanding);
    } else {
      // Inner wall-side guardrail covers full landing length
      emitRailingStrip(`fe_rail_f${flNum}_inner`, flNum, xMid, topY, zRailInner, len, railThickness);
    }

    // Far end of top landing gets solid end guardrail (placed just outside walkable deck [xMax..xMax+railThickness])
    if (isLast && numLandings > 1) {
      const endRailX = roundNum(xMax + railThickness * 0.5, 4);
      const fullOut = roundNum(structuralOutDepth + railThickness, 4);
      emitRailingStrip(`fe_rail_f${flNum}_end`, flNum, endRailX, topY, zPathCenter, railThickness, fullOut);
    }

    // Record arrival waypoint on landing
    waypoints.push({
      id: `wp_landing_f${flNum}`,
      description: `Floor ${flNum} landing platform`,
      floor: flNum,
      elevation: topY,
      position: { x: roundNum(wPos.x, 4), y: topY, z: roundNum(wPos.z, 4) }
    });

    // Emit straight-run stair flight leading up to the next floor landing
    if (idx < numFlights) {
      const nextFloor = flNum + 1;
      const yLower = topY;
      const yUpper = roundNum(nextFloor * floorHeight, 4);
      const fXStart = xMax;
      const fXEnd = roundNum(xMax + flightRun, 4);
      cursorX = fXEnd;

      const flightId = `fe_flight_f${flNum}_to_f${nextFloor}`;
      const flightTreads = [];

      for (let s = 1; s <= stepCount; s++) {
        const treadTopY = roundNum(yLower + s * risePerStep, 4);
        const treadCenterY = roundNum(treadTopY - treadThickness * 0.5, 4);
        const treadCenterX = roundNum(fXStart + (s - 0.5) * runPerStep, 4);
        const tWPos = localToWorld({ x: treadCenterX, y: treadCenterY, z: zPathCenter });
        const tZPos = toZUpPos(tWPos);
        const tGenDims = makeGenDims(runPerStep, treadThickness, stairWidth);
        const tZDims = makeZUpDims(runPerStep, treadThickness, stairWidth);

        const treadObj = {
          id: `fe_tread_f${flNum}_to_f${nextFloor}_s${s}`,
          flightId,
          type: 'stair_tread',
          floor: flNum,
          stepIndex: s,
          stepCount,
          elevation: treadCenterY,
          topSurfaceElevation: treadTopY,
          position: { x: roundNum(tWPos.x, 4), y: roundNum(tWPos.y, 4), z: roundNum(tWPos.z, 4) },
          dimensions: tGenDims,
          treadMetrics: {
            run: runPerStep,
            width: stairWidth,
            thickness: treadThickness,
            stepRise: risePerStep,
            stepRun: runPerStep
          },
          orientation: { ...normal, yawDegrees },
          traversal: 'stair_tread',
          walkable: true,
          local: {
            x: treadCenterX,
            y: treadCenterY,
            z: zPathCenter,
            topY: treadTopY,
            stepRise: risePerStep,
            stepRun: runPerStep
          },
          coordinatesZUp: {
            position: tZPos,
            elevation: treadCenterY,
            topElevation: treadTopY,
            dimensions: tZDims,
            normal: { x: roundNum(normal.x, 4), y: roundNum(-normal.z, 4), z: roundNum(normal.y, 4) },
            bGameUnits: scaleZUpToBUnits(tZPos, tZDims, treadTopY)
          }
        };
        flightTreads.push(treadObj);
        allTreads.push(treadObj);
      }

      const wStart = localToWorld({ x: fXStart, y: yLower, z: zPathCenter });
      const wEnd = localToWorld({ x: fXEnd, y: yUpper, z: zPathCenter });
      const flightZPos = {
        x: roundNum((wStart.x + wEnd.x) * 0.5, 4),
        y: roundNum(-(wStart.z + wEnd.z) * 0.5, 4),
        z: roundNum((yLower + yUpper) * 0.5, 4)
      };
      const fGenDims = makeGenDims(flightRun, floorHeight, stairWidth);
      const fZDims = makeZUpDims(flightRun, floorHeight, stairWidth);

      const flightObj = {
        id: flightId,
        flightId,
        type: 'stair_flight',
        floor: flNum,
        toFloor: nextFloor,
        direction: 1,
        laneZ: zPathCenter,
        stepCount,
        totalRise: roundNum(floorHeight, 4),
        totalRun: flightRun,
        risePerStep,
        runPerStep,
        inclineDegrees: roundNum(Math.atan2(risePerStep, runPerStep) * 180 / Math.PI, 2),
        startElevation: yLower,
        endElevation: yUpper,
        elevation: roundNum((yLower + yUpper) * 0.5, 4),
        position: {
          x: roundNum((wStart.x + wEnd.x) * 0.5, 4),
          y: roundNum((yLower + yUpper) * 0.5, 4),
          z: roundNum((wStart.z + wEnd.z) * 0.5, 4)
        },
        dimensions: fGenDims,
        startPosition: { x: roundNum(wStart.x, 4), y: yLower, z: roundNum(wStart.z, 4) },
        endPosition: { x: roundNum(wEnd.x, 4), y: yUpper, z: roundNum(wEnd.z, 4) },
        orientation: { ...normal, yawDegrees },
        traversal: 'stair_flight',
        treads: flightTreads,
        local: {
          xStart: fXStart,
          xEnd: fXEnd,
          yLower,
          yUpper,
          zMin: zWalkMin,
          zMax: zWalkMax,
          laneZ: zPathCenter
        },
        coordinatesZUp: {
          startPosition: toZUpPos({ x: wStart.x, y: yLower, z: wStart.z }),
          endPosition: toZUpPos({ x: wEnd.x, y: yUpper, z: wEnd.z }),
          position: flightZPos,
          dimensions: fZDims,
          normal: { x: roundNum(normal.x, 4), y: roundNum(-normal.z, 4), z: roundNum(normal.y, 4) },
          bGameUnits: scaleZUpToBUnits(flightZPos, fZDims)
        }
      };

      flights.push(flightObj);
      components.push(flightObj);
      for (const tr of flightTreads) {
        components.push(tr);
      }

      // 4 stepped side handrail barriers per stair side keeping strict [zWalkMin, zWalkMax] clearance
      const railSegs = 4;
      const segLen = roundNum(flightRun / railSegs, 4);
      const segRise = floorHeight / railSegs;
      const stairBarrierH = roundNum(segRise + railHeight, 4);
      for (let rIdx = 0; rIdx < railSegs; rIdx++) {
        const sxCenter = roundNum(fXStart + (rIdx + 0.5) * segLen, 4);
        const syBottom = roundNum(yLower + rIdx * segRise, 4);
        emitRailingStrip(`fe_rail_f${flNum}_stair_inner_${rIdx + 1}`, flNum, sxCenter, syBottom, zRailInner, segLen, railThickness, stairBarrierH);
        emitRailingStrip(`fe_rail_f${flNum}_stair_outer_${rIdx + 1}`, flNum, sxCenter, syBottom, zRailOuter, segLen, railThickness, stairBarrierH);
      }

      clearanceVolumes.push({
        id: `fe_clearance_flight_f${flNum}_to_f${nextFloor}`,
        type: 'stair_flight_clearance',
        flightId,
        startPosition: flightObj.startPosition,
        endPosition: flightObj.endPosition,
        clearanceWidth: stairWidth,
        clearanceHeight: STRAIGHT_RUN_PROFILE.headroom,
        traversal: 'clearance_volume'
      });

      waypoints.push({
        id: `wp_stair_f${flNum}_to_f${nextFloor}`,
        description: `Straight-run 1-unit stair from floor ${flNum} to floor ${nextFloor}`,
        elevation: yLower,
        position: { x: roundNum(wStart.x, 4), y: yLower, z: roundNum(wStart.z, 4) }
      });
    }
  }

  // Drop ladder at F1 outer front end (-totalUsedSpan * 0.5) centered along path
  const firstLanding = landings[0];
  const dropMinY = ladderState === 'lowered' ? 0 : 2.2;
  const dropMaxY = firstLanding.elevation;
  const dropHeight = roundNum(dropMaxY - dropMinY, 4);
  const dropCenterY = roundNum((dropMinY + dropMaxY) * 0.5, 4);
  const dropDepthOut = 0.20;
  const dropLocalX = roundNum(firstLanding.local.xMin - dropDepthOut * 0.5, 4);
  const dropWPos = localToWorld({ x: dropLocalX, y: dropCenterY, z: zPathCenter });
  const dropZPos = toZUpPos(dropWPos);
  const dropGenDims = makeGenDims(dropDepthOut, dropHeight, ladderWidth);
  const dropZDims = makeZUpDims(dropDepthOut, dropHeight, ladderWidth);

  const dropLadder = {
    id: 'fe_ladder_drop',
    type: 'ladder',
    floor: 0,
    state: ladderState,
    elevation: roundNum(dropMinY, 4),
    local: { x: dropLocalX, minY: dropMinY, maxY: dropMaxY, z: zPathCenter, width: ladderWidth, depth: dropDepthOut },
    position: { x: roundNum(dropWPos.x, 4), y: roundNum(dropWPos.y, 4), z: roundNum(dropWPos.z, 4) },
    dimensions: dropGenDims,
    orientation: { ...normal, yawDegrees },
    traversal: 'climbable_ladder',
    coordinatesZUp: {
      position: dropZPos,
      elevation: dropCenterY,
      dimensions: dropZDims,
      bGameUnits: scaleZUpToBUnits(dropZPos, dropZDims)
    }
  };
  components.push(dropLadder);

  waypoints.unshift({
    id: 'wp_street_drop_base',
    description: `Street approach to ${ladderState} drop ladder at floor 1 entrance`,
    elevation: dropMinY,
    position: { x: roundNum(dropWPos.x, 4), y: dropMinY, z: roundNum(dropWPos.z, 4) }
  });

  // Roof access ladder on last landing portal
  let roofLadder = null;
  if (cfg.fireEscapeRoofAccess !== false) {
    const portalLanding = landings.find((l) => l.id.endsWith('_portal')) || landings[landings.length - 1];
    const roofMinY = portalLanding.elevation;
    const roofMaxY = roundNum(roofInfo.roofParapetTop + 0.25, 4);
    const roofLadderH = roundNum(roofMaxY - roofMinY, 4);
    const roofLadderCenterY = roundNum((roofMinY + roofMaxY) * 0.5, 4);
    const roofDepthOut = roundNum(wallClearance, 4);
    const roofZCenter = roundNum(roofDepthOut * 0.5, 4);
    const roofLocalX = portalLanding.local.x;
    const roofWPos = localToWorld({ x: roofLocalX, y: roofLadderCenterY, z: roofZCenter });
    const roofZPos = toZUpPos(roofWPos);
    const roofGenDims = makeGenDims(ladderWidth, roofLadderH, roofDepthOut);
    const roofZDims = makeZUpDims(ladderWidth, roofLadderH, roofDepthOut);

    roofLadder = {
      id: 'fe_ladder_roof',
      type: 'ladder',
      floor: numLandings,
      state: 'fixed',
      elevation: roofMinY,
      local: {
        x: roofLocalX,
        minY: roofMinY,
        maxY: roofMaxY,
        z: roofZCenter,
        width: ladderWidth,
        depth: roofDepthOut,
        roofDeckTop: roofInfo.roofDeckTop,
        roofParapetTop: roofInfo.roofParapetTop
      },
      position: { x: roundNum(roofWPos.x, 4), y: roundNum(roofWPos.y, 4), z: roundNum(roofWPos.z, 4) },
      dimensions: roofGenDims,
      orientation: { ...normal, yawDegrees },
      traversal: 'climbable_ladder',
      coordinatesZUp: {
        position: roofZPos,
        elevation: roofLadderCenterY,
        dimensions: roofZDims,
        bGameUnits: scaleZUpToBUnits(roofZPos, roofZDims)
      }
    };
    components.push(roofLadder);

    const roofEntryWPos = localToWorld({ x: roofLocalX, y: roofInfo.roofDeckTop, z: -0.45 });
    waypoints.push({
      id: 'wp_roof_deck_parapet',
      description: 'Rooftop parapet entry onto roof deck',
      elevation: roofInfo.roofDeckTop,
      position: { x: roundNum(roofEntryWPos.x, 4), y: roofInfo.roofDeckTop, z: roundNum(roofEntryWPos.z, 4) }
    });
  }

  const verifiedPassages = {
    stairPassage: {
      clearWidth: stairWidth,
      capsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter,
      margin: roundNum(stairWidth - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      adequate: stairWidth > STRAIGHT_RUN_PROFILE.capsuleDiameter
    },
    ladderPortal: {
      clearWidth: portalOpeningWidth,
      capsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter,
      margin: roundNum(portalOpeningWidth - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      adequate: portalOpeningWidth > STRAIGHT_RUN_PROFILE.capsuleDiameter
    },
    turnaroundPlatform: {
      clearLength: startLandingLen,
      clearDepth: deckOutDepth,
      capsuleDiameter: STRAIGHT_RUN_PROFILE.capsuleDiameter,
      margin: roundNum(Math.min(startLandingLen, deckOutDepth) - STRAIGHT_RUN_PROFILE.capsuleDiameter, 3),
      adequate: Math.min(startLandingLen, deckOutDepth) > STRAIGHT_RUN_PROFILE.capsuleDiameter
    },
    wallShutterStandoff: {
      clearStandoff: wallClearance,
      maxShutterProjection: 0.16,
      margin: roundNum((zRailInner - railThickness * 0.5) - 0.16, 3),
      adequate: (zRailInner - railThickness * 0.5) > 0.16
    },
    verticalHeadroom: {
      clearHeight: STRAIGHT_RUN_PROFILE.headroom,
      playerHeight: STRAIGHT_RUN_PROFILE.playerHeight,
      margin: roundNum(STRAIGHT_RUN_PROFILE.headroom - STRAIGHT_RUN_PROFILE.playerHeight, 3),
      adequate: STRAIGHT_RUN_PROFILE.headroom >= STRAIGHT_RUN_PROFILE.playerHeight
    }
  };

  const traversalValidation = {
    status: limitations.length === 0 ? 'geometric_clearance_bounded' : 'geometric_clearance_constrained',
    layoutStyle: 'straight_run',
    feasible: true,
    limitations,
    requiredWallSpan: minReqSpan,
    usedWallSpan: totalUsedSpan,
    availableWallSpan,
    disclaimer: 'Straight-run 1-unit staircase steps are sized for native B stair stepping (step height ~1 B unit vs 4-unit player step height). Visible geometry and collision metadata are derived from the same layout.',
    verifiedPassages
  };

  const metadata = {
    side,
    layoutStyle: 'straight_run',
    feasible: true,
    limitations,
    ladderPosition: ladderState,
    hasRoofAccess: cfg.fireEscapeRoofAccess !== false,
    treadsEnabled: Boolean(cfg.fireEscapeTreads),
    flightCount: flights.length,
    treadCount: allTreads.length,
    componentCount: components.length,
    components,
    flights,
    clearanceStandard,
    traversalValidation,
    warnings: [...limitations],
    clearanceVolumes,
    walkableRoutes: [
      {
        id: 'fe_route_street_to_roof',
        name: 'Street to Rooftop Traversal Route',
        status: limitations.length === 0 ? 'geometric_clearance_bounded' : 'geometric_clearance_constrained',
        connected: true,
        disclaimer: 'Unobstructed unidirectional straight-run path aligned directly between visible meshes and collision metadata.',
        waypoints
      }
    ]
  };

  return {
    feasible: true,
    layoutStyle: 'straight_run',
    side,
    isLong,
    normal,
    yawDegrees,
    anchor: wallAnchor,
    localToWorld,
    dimensions: {
      wallClearance,
      zWalkMin,
      zWalkMax,
      zPathCenter,
      zRailInner,
      zRailOuter,
      stairWidth,
      railThickness,
      railHeight,
      deckThickness,
      stepCount,
      risePerStep,
      runPerStep,
      treadThickness,
      flightRun,
      ladderWidth
    },
    landings,
    flights,
    allTreads,
    railings,
    dropLadder,
    roofLadder,
    roofInfo,
    metadata
  };
}
