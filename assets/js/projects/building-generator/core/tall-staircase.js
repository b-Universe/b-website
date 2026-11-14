import { clamp, roundNum } from '../utils.js';
import { segmentsForFloor, getFireEscapeWallAnchor, intervalsOverlap } from './layouts.js';
import { STRAIGHT_RUN_UNITS_PER_METER, computeRoofDeckAndParapetTop } from './straight-run-fire-escape.js';

function getTallExposedSpan(seg, side) {
  const isLong = side === 'front' || side === 'back';
  const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
  const rawMin = isLong ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
  const rawMax = (isLong ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut;
  const blocked = seg.occlusions?.[side] || [];
  let minSpan = rawMin + 0.35;
  let maxSpan = rawMax - 0.35;

  for (const [bStart, bEnd] of blocked) {
    if (bEnd <= minSpan || bStart >= maxSpan) continue;
    const leftLen = bStart - minSpan;
    const rightLen = maxSpan - bEnd;
    if (leftLen >= rightLen) {
      maxSpan = Math.min(maxSpan, bStart - 0.30);
    } else {
      minSpan = Math.max(minSpan, bEnd + 0.30);
    }
  }
  return [roundNum(minSpan, 4), roundNum(maxSpan, 4)];
}

function convOccupiedInterval(seg, side, convPlacement) {
  if (!convPlacement || convPlacement.side !== side) return null;
  const anchor = getFireEscapeWallAnchor(seg, side, convPlacement.coord, convPlacement.deckW);
  const half = (convPlacement.deckW || 2.4) * 0.5 + 0.85;
  return [roundNum(anchor.coord - half, 4), roundNum(anchor.coord + half, 4)];
}

function getWallSpanExcludingConv(seg, side, convPlacement) {
  const [rawMin, rawMax] = getTallExposedSpan(seg, side);
  const convBand = convOccupiedInterval(seg, side, convPlacement);
  if (!convBand) return [rawMin, rawMax];
  const [cMin, cMax] = convBand;
  if (cMax <= rawMin || cMin >= rawMax) return [rawMin, rawMax];

  const leftSpan = cMin - rawMin;
  const rightSpan = rawMax - cMax;
  if (leftSpan >= rightSpan) {
    return [rawMin, roundNum(Math.min(rawMax, cMin), 4)];
  }
  return [roundNum(Math.max(rawMin, cMax), 4), rawMax];
}

export function chooseTallStaircasePlacement(groundSegments, cfg, conventionalPlacement = null) {
  if (!cfg.tallStaircase || (Number(cfg.floors) || 0) < 2) return null;
  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const mainSeg = segs[0];
  if (!mainSeg) return null;

  const frontBusy = Boolean(
    cfg.awning ||
    cfg.groundUse === 'shop' ||
    cfg.signage !== 'none' ||
    cfg.cutaway ||
    cfg.doorStyle === 'stoop' ||
    (Number(cfg.entranceSteps) || 0) > 0
  );

  const convSide = conventionalPlacement ? conventionalPlacement.side : null;
  const requestedSide = cfg.tallStaircaseSide || 'auto';

  let orderedSides;
  if (requestedSide !== 'auto') {
    orderedSides = [requestedSide];
  } else {
    const baseOrder = frontBusy ? ['left', 'right', 'back'] : ['left', 'right', 'back', 'front'];
    orderedSides = [
      ...baseOrder.filter((s) => s !== convSide),
      ...baseOrder.filter((s) => s === convSide)
    ];
  }

  let fallback = null;
  for (const side of orderedSides) {
    if (mainSeg.skipWalls?.[side]) continue;
    if (requestedSide === 'auto' && side === 'front' && frontBusy) continue;

    const [sMin, sMax] = getWallSpanExcludingConv(mainSeg, side, conventionalPlacement);
    const avail = sMax > sMin ? roundNum(sMax - sMin, 4) : 0;
    const candidate = {
      side,
      spanMin: sMin,
      spanMax: sMax,
      availableSpan: avail,
      overlapsConventional: convSide === side && avail < 4.5
    };
    if (!fallback || avail > fallback.availableSpan) {
      fallback = candidate;
    }
    if (avail >= 4.5 && convSide !== side) {
      return candidate;
    }
  }

  return fallback || {
    side: requestedSide !== 'auto' ? requestedSide : 'left',
    spanMin: 0,
    spanMax: 0,
    availableSpan: 0,
    overlapsConventional: false
  };
}

export function computeTallStaircaseLayout(groundSegments, cfg, conventionalPlacement = null) {
  if (!cfg.tallStaircase || (Number(cfg.floors) || 0) < 2) return null;

  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const mainSeg = segs[0];
  if (!mainSeg) return null;

  const placement = chooseTallStaircasePlacement(segs, cfg, conventionalPlacement);
  if (!placement) return null;

  const side = placement.side;
  const floors = Number(cfg.floors) || 4;
  const floorHeight = Number(cfg.floorHeight) || 3.4;
  const isLong = side === 'front' || side === 'back';

  const landingMode = cfg.tallStaircaseLanding || 'ground_continuous';
  const railingMode = cfg.tallStaircaseRailing || 'full';
  const startsAtGround = landingMode !== 'elevated_roof';
  const hasRoofLadder = landingMode === 'ground_and_roof' || landingMode === 'elevated_roof';

  const maxElevFloor = Math.max(1, floors - 1);
  const reqFloors = Number(cfg.tallStaircaseFloors) || 0;
  const targetTopFloor = reqFloors > 0 ? clamp(Math.floor(reqFloors), 1, maxElevFloor) : maxElevFloor;
  const startFloor = startsAtGround ? 0 : 1;
  const effectiveTopFloor = Math.max(startFloor + (startsAtGround ? 1 : 0), targetTopFloor);
  const reachesRoof = effectiveTopFloor === maxElevFloor && hasRoofLadder;

  const stairWidth = clamp(Number(cfg.tallStaircaseWidth) || 1.0, 0.8, 1.4);
  const wallClearance = clamp(Number(cfg.tallStaircaseClearance) || 0.34, 0.24, 0.6);
  const railThickness = 0.06;
  const railHeight = railingMode === 'industrial' ? 1.06 : 1.0;
  const deckThickness = 0.12;

  const zWalkMin = roundNum(wallClearance, 4);
  const zWalkMax = roundNum(zWalkMin + stairWidth, 4);
  const zPathCenter = roundNum((zWalkMin + zWalkMax) * 0.5, 4);
  const zRailInner = roundNum(zWalkMin - railThickness * 0.5, 4);
  const zRailOuter = roundNum(zWalkMax + railThickness * 0.5, 4);

  // Intersect usable facade span across spanned floors and check setback alignment
  let spanMin = -Infinity;
  let spanMax = Infinity;
  let baseWallOut = null;
  let setbackMismatch = 0;

  for (let f = 0; f <= effectiveTopFloor; f++) {
    const flSeg = (segmentsForFloor(cfg, f) || [])[0] || mainSeg;
    if (!flSeg || flSeg.skipWalls?.[side]) {
      spanMin = 1;
      spanMax = -1;
      break;
    }
    const [fMin, fMax] = getWallSpanExcludingConv(flSeg, side, conventionalPlacement);
    spanMin = Math.max(spanMin, fMin);
    spanMax = Math.min(spanMax, fMax);
    const outCoord = side === 'front'
      ? flSeg.z + flSeg.d * 0.5
      : side === 'back'
        ? -(flSeg.z - flSeg.d * 0.5)
        : side === 'left'
          ? -(flSeg.x - flSeg.w * 0.5)
          : flSeg.x + flSeg.w * 0.5;
    if (baseWallOut === null) baseWallOut = outCoord;
    else setbackMismatch = Math.max(setbackMismatch, Math.abs(outCoord - baseWallOut));
  }

  const availableWallSpan = spanMax > spanMin ? roundNum(spanMax - spanMin, 4) : 0;

  // Compute approximate 1 B-unit rise/run steps within B 64-tread-per-flight cap
  const rawStepsPerFlight = Math.max(1, Math.round(floorHeight * STRAIGHT_RUN_UNITS_PER_METER));
  const stepCount = Math.min(64, rawStepsPerFlight);
  const risePerStep = roundNum(floorHeight / stepCount, 6);
  const runPerStep = roundNum(1 / STRAIGHT_RUN_UNITS_PER_METER, 6);
  const treadThickness = risePerStep;
  const flightRun = roundNum(stepCount * runPerStep, 4);

  const numFlights = Math.max(1, effectiveTopFloor - startFloor);
  const elevatedLandingCount = effectiveTopFloor - startFloor + (startsAtGround ? 0 : 1);
  const minLandingLen = 0.90;
  const prefLandingLen = 1.25;
  const entryPlinthLen = startsAtGround ? 0.32 : 0;

  const minReqSpan = roundNum(
    numFlights * flightRun + elevatedLandingCount * minLandingLen + entryPlinthLen,
    4
  );

  const estimatedComponents = elevatedLandingCount * 5 + numFlights * (stepCount + 1) + 12;
  const convConflictSameWall = Boolean(
    conventionalPlacement &&
    conventionalPlacement.side === side &&
    availableWallSpan < minReqSpan
  );

  const limitations = [];
  if (convConflictSameWall) {
    limitations.push(
      `Wall conflict: Conventional Fire Escape already occupies '${side}' facade, leaving ${availableWallSpan.toFixed(2)}m unobstructed span (need ${minReqSpan.toFixed(2)}m). Choose another placement side or disable one staircase.`
    );
  } else if (availableWallSpan < minReqSpan) {
    limitations.push(
      `Available exposed span (${availableWallSpan.toFixed(2)}m) on '${side}' wall cannot fit ${numFlights} continuous 1-unit flight(s) up to Level ${effectiveTopFloor} (requires ${minReqSpan.toFixed(2)}m). Reduce Supported Floors or choose a longer facade.`
    );
  }
  if (setbackMismatch > 0.35) {
    limitations.push(
      `Upper-floor wall setback (${setbackMismatch.toFixed(2)}m) breaks continuous exterior attachment along '${side}' facade.`
    );
  }
  if (estimatedComponents > 512) {
    limitations.push(
      `Spanning ${numFlights} tall flights exceeds the 512-component blueprint budget (~${estimatedComponents} components). Reduce Supported Floors.`
    );
  }

  const feasible = limitations.length === 0;
  const spanCenter = spanMax > spanMin ? (spanMin + spanMax) * 0.5 : 0;
  const wallAnchor = getFireEscapeWallAnchor(mainSeg, side, spanCenter, Math.min(availableWallSpan, minReqSpan));

  const localToWorld = (local) => {
    if (side === 'front') return { x: wallAnchor.x + local.x, y: local.y, z: wallAnchor.z + local.z };
    if (side === 'back') return { x: wallAnchor.x - local.x, y: local.y, z: wallAnchor.z - local.z };
    if (side === 'left') return { x: wallAnchor.x - local.z, y: local.y, z: wallAnchor.z + local.x };
    return { x: wallAnchor.x + local.z, y: local.y, z: wallAnchor.z - local.x };
  };

  const makeGenDims = (alongLen, heightVal, outDepth) => ({
    width: roundNum(isLong ? alongLen : outDepth, 4),
    height: roundNum(heightVal, 4),
    depth: roundNum(isLong ? outDepth : alongLen, 4)
  });

  const toZUpPos = (wPos) => ({
    x: roundNum(wPos.x, 4),
    y: roundNum(-wPos.z, 4),
    z: roundNum(wPos.y, 4)
  });

  const makeZUpDims = (alongLen, heightVal, outDepth) => ({
    width: roundNum(isLong ? alongLen : outDepth, 4),
    depth: roundNum(isLong ? outDepth : alongLen, 4),
    height: roundNum(heightVal, 4)
  });

  const scaleToBUnits = (zUpPos, zUpDims, topElev = null) => ({
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

  const normal = side === 'front'
    ? { x: 0, y: 0, z: 1 }
    : side === 'back'
      ? { x: 0, y: 0, z: -1 }
      : side === 'left'
        ? { x: -1, y: 0, z: 0 }
        : { x: 1, y: 0, z: 0 };
  const yawDegrees = side === 'front' ? 0 : side === 'back' ? 180 : side === 'left' ? -90 : 90;

  const landings = [];
  const flights = [];
  const doorways = [];
  const floorExclusions = new Map();
  let dropLadder = null;
  let roofLadder = null;
  let groundPlinth = null;

  const recordFloorExclusion = (flIdx, lMin, lMax) => {
    const worldA = localToWorld({ x: lMin, y: 0, z: 0 });
    const worldB = localToWorld({ x: lMax, y: 0, z: 0 });
    const coordA = isLong ? worldA.x : worldA.z;
    const coordB = isLong ? worldB.x : worldB.z;
    const band = [roundNum(Math.min(coordA, coordB) - 0.25, 4), roundNum(Math.max(coordA, coordB) + 0.25, 4)];
    if (!floorExclusions.has(flIdx)) floorExclusions.set(flIdx, []);
    floorExclusions.get(flIdx).push(band);
  };

  if (feasible) {
    const extraMargin = availableWallSpan - minReqSpan;
    const bonusPerLanding = Math.min(prefLandingLen - minLandingLen, extraMargin / Math.max(1, elevatedLandingCount));
    const landingLen = roundNum(minLandingLen + bonusPerLanding, 4);
    const totalUsedSpan = roundNum(numFlights * flightRun + elevatedLandingCount * landingLen + entryPlinthLen, 4);

    let cursorX = roundNum(-totalUsedSpan * 0.5, 4);

    if (startsAtGround) {
      groundPlinth = {
        id: 'tall_plinth_ground',
        local: {
          xMin: cursorX,
          xMax: roundNum(cursorX + entryPlinthLen, 4),
          x: roundNum(cursorX + entryPlinthLen * 0.5, 4),
          yTop: 0.04,
          yCenter: 0.02,
          zMin: zWalkMin,
          zMax: zWalkMax,
          zCenter: zPathCenter,
          length: entryPlinthLen,
          depth: stairWidth
        }
      };
      recordFloorExclusion(0, cursorX, cursorX + entryPlinthLen);
      cursorX = roundNum(cursorX + entryPlinthLen, 4);
    } else {
      // Elevated F1 landing when starting with drop ladder
      const xMin = cursorX;
      const xMax = roundNum(xMin + landingLen, 4);
      const yTop = roundNum(floorHeight, 4);
      const wPos = localToWorld({ x: (xMin + xMax) * 0.5, y: yTop, z: zPathCenter });
      const zPos = toZUpPos(wPos);
      const zDim = makeZUpDims(landingLen, deckThickness, stairWidth);
      landings.push({
        id: 'tall_landing_f1',
        type: 'landing',
        floor: 1,
        elevation: yTop,
        topSurfaceElevation: yTop,
        local: {
          xMin,
          xMax,
          x: roundNum((xMin + xMax) * 0.5, 4),
          yTop,
          yCenter: roundNum(yTop - deckThickness * 0.5, 4),
          zMin: zWalkMin,
          zMax: zWalkMax,
          zCenter: zPathCenter,
          length: landingLen,
          depth: stairWidth
        },
        position: { x: roundNum(wPos.x, 4), y: yTop, z: roundNum(wPos.z, 4) },
        dimensions: makeGenDims(landingLen, deckThickness, stairWidth),
        orientation: { ...normal, yawDegrees },
        traversal: 'walkable_surface',
        walkable: true,
        coordinatesZUp: {
          position: zPos,
          elevation: yTop,
          topElevation: yTop,
          dimensions: zDim,
          bGameUnits: scaleToBUnits(zPos, zDim, yTop)
        }
      });
      recordFloorExclusion(1, xMin, xMax);
      doorways.push({
        id: 'tall_door_f1',
        floor: 1,
        localX: roundNum((xMin + xMax) * 0.5, 4),
        yBottom: yTop,
        width: roundNum(Math.min(0.88, landingLen - 0.14), 4),
        height: 2.04
      });

      const ladderState = cfg.fireEscapeLadder === 'lowered' ? 'lowered' : 'raised';
      const ladderMinY = ladderState === 'lowered' ? 0 : 2.2;
      dropLadder = {
        id: 'tall_ladder_drop',
        local: {
          x: roundNum(xMin + landingLen * 0.45, 4),
          minY: ladderMinY,
          maxY: roundNum(yTop + 0.85, 4),
          z: zRailOuter,
          width: 0.54
        }
      };
      recordFloorExclusion(0, xMin, xMax);
      cursorX = xMax;
    }

    for (let flIdx = startFloor; flIdx < effectiveTopFloor; flIdx++) {
      const fromY = roundNum(flIdx * floorHeight, 4);
      const toY = roundNum((flIdx + 1) * floorHeight, 4);
      const fStartX = cursorX;
      const fEndX = roundNum(fStartX + flightRun, 4);
      const midX = roundNum((fStartX + fEndX) * 0.5, 4);
      const midY = roundNum((fromY + toY) * 0.5, 4);

      const treads = [];
      for (let s = 0; s < stepCount; s++) {
        const tx = roundNum(fStartX + (s + 0.5) * runPerStep, 4);
        const topY = roundNum(fromY + (s + 1) * risePerStep, 4);
        const centerY = roundNum(topY - treadThickness * 0.5, 4);
        const wT = localToWorld({ x: tx, y: centerY, z: zPathCenter });
        const zT = toZUpPos(wT);
        const tdZ = makeZUpDims(runPerStep, treadThickness, stairWidth);
        treads.push({
          id: `tall_tread_f${flIdx}_to_f${flIdx + 1}_s${s + 1}`,
          type: 'stair_tread',
          floor: flIdx,
          stepIndex: s + 1,
          stepCount,
          elevation: centerY,
          topSurfaceElevation: topY,
          position: { x: roundNum(wT.x, 4), y: centerY, z: roundNum(wT.z, 4) },
          dimensions: makeGenDims(runPerStep, treadThickness, stairWidth),
          orientation: { ...normal, yawDegrees },
          traversal: 'stair_tread',
          walkable: true,
          local: {
            x: tx,
            y: centerY,
            z: zPathCenter,
            topY,
            stepRise: risePerStep,
            stepRun: runPerStep
          },
          coordinatesZUp: {
            position: zT,
            elevation: centerY,
            topElevation: topY,
            dimensions: tdZ,
            normal,
            bGameUnits: scaleToBUnits(zT, tdZ, topY)
          }
        });
      }

      const wStart = localToWorld({ x: fStartX, y: fromY, z: zPathCenter });
      const wEnd = localToWorld({ x: fEndX, y: toY, z: zPathCenter });
      const wMid = localToWorld({ x: midX, y: midY, z: zPathCenter });
      const flDimZ = makeZUpDims(flightRun, floorHeight, stairWidth);
      const flPosZ = toZUpPos(wMid);

      flights.push({
        id: `tall_flight_f${flIdx}_to_f${flIdx + 1}`,
        type: 'stair_flight',
        floor: flIdx,
        toFloor: flIdx + 1,
        stepCount,
        totalRise: floorHeight,
        totalRun: flightRun,
        risePerStep,
        runPerStep,
        inclineDegrees: roundNum((Math.atan2(risePerStep, runPerStep) * 180) / Math.PI, 2),
        startElevation: fromY,
        endElevation: toY,
        position: { x: roundNum(wMid.x, 4), y: midY, z: roundNum(wMid.z, 4) },
        dimensions: makeGenDims(flightRun, floorHeight, stairWidth),
        startPosition: { x: roundNum(wStart.x, 4), y: fromY, z: roundNum(wStart.z, 4) },
        endPosition: { x: roundNum(wEnd.x, 4), y: toY, z: roundNum(wEnd.z, 4) },
        orientation: { ...normal, yawDegrees },
        traversal: 'stair_flight',
        local: {
          xStart: fStartX,
          xEnd: fEndX,
          yLower: fromY,
          yUpper: toY,
          zMin: zWalkMin,
          zMax: zWalkMax
        },
        treads,
        coordinatesZUp: {
          position: flPosZ,
          dimensions: flDimZ,
          bGameUnits: scaleToBUnits(flPosZ, flDimZ)
        }
      });
      recordFloorExclusion(flIdx, fStartX, fEndX);

      // Elevated arrival landing at level (flIdx + 1)
      const lMin = fEndX;
      const lMax = roundNum(lMin + landingLen, 4);
      const lMid = roundNum((lMin + lMax) * 0.5, 4);
      const lwPos = localToWorld({ x: lMid, y: toY, z: zPathCenter });
      const lzPos = toZUpPos(lwPos);
      const lzDim = makeZUpDims(landingLen, deckThickness, stairWidth);

      landings.push({
        id: `tall_landing_f${flIdx + 1}`,
        type: 'landing',
        floor: flIdx + 1,
        elevation: toY,
        topSurfaceElevation: toY,
        local: {
          xMin: lMin,
          xMax: lMax,
          x: lMid,
          yTop: toY,
          yCenter: roundNum(toY - deckThickness * 0.5, 4),
          zMin: zWalkMin,
          zMax: zWalkMax,
          zCenter: zPathCenter,
          length: landingLen,
          depth: stairWidth
        },
        position: { x: roundNum(lwPos.x, 4), y: toY, z: roundNum(lwPos.z, 4) },
        dimensions: makeGenDims(landingLen, deckThickness, stairWidth),
        orientation: { ...normal, yawDegrees },
        traversal: 'walkable_surface',
        walkable: true,
        coordinatesZUp: {
          position: lzPos,
          elevation: toY,
          topElevation: toY,
          dimensions: lzDim,
          bGameUnits: scaleToBUnits(lzPos, lzDim, toY)
        }
      });

      const doorW = roundNum(Math.min(0.86, landingLen - 0.14), 4);
      doorways.push({
        id: `tall_door_f${flIdx + 1}`,
        floor: flIdx + 1,
        localX: lMid,
        yBottom: toY,
        width: doorW,
        height: 2.04
      });
      // Exclude windows intersecting the floor behind the landing & access doorway
      recordFloorExclusion(flIdx + 1, lMin, lMax);
      cursorX = lMax;
    }

    if (reachesRoof && landings.length) {
      const topL = landings[landings.length - 1];
      const roofInfo = computeRoofDeckAndParapetTop(cfg);
      roofLadder = {
        id: 'tall_ladder_roof',
        floor: effectiveTopFloor,
        local: {
          x: roundNum(topL.local.xMax - 0.42, 4),
          minY: topL.elevation,
          maxY: roundNum(roofInfo.roofParapetTop + 0.25, 4),
          roofDeckTop: roofInfo.roofDeckTop,
          z: 0.14,
          width: 0.54
        }
      };
    }
  }

  return {
    enabled: true,
    feasible,
    side,
    extIndex: -1,
    anchor: wallAnchor,
    yawDegrees,
    landingMode,
    railingMode,
    startsAtGround,
    reachesRoof,
    startFloor,
    topSupportedFloor: effectiveTopFloor,
    floorHeight,
    availableWallSpan,
    requiredWallSpan: minReqSpan,
    limitations,
    warnings: [...limitations],
    dimensions: {
      stairWidth,
      wallClearance,
      zWalkMin,
      zWalkMax,
      zPathCenter,
      zRailInner,
      zRailOuter,
      railThickness,
      railHeight,
      deckThickness,
      risePerStep,
      runPerStep,
      stepCount
    },
    groundPlinth,
    landings,
    flights,
    doorways,
    dropLadder,
    roofLadder,
    floorExclusions
  };
}

export function isWallPointBlockedByTallStaircase(tallLayout, side, floorIndex, centerCoord, halfWidth) {
  if (!tallLayout || !tallLayout.feasible || tallLayout.side !== side) return false;
  const bands = tallLayout.floorExclusions.get(floorIndex);
  if (!bands || !bands.length) return false;
  return bands.some(([bMin, bMax]) => intervalsOverlap(centerCoord - halfWidth, centerCoord + halfWidth, bMin, bMax, 0.05));
}

export function summarizeTallStaircaseMetadata(tallLayout) {
  if (!tallLayout) return null;
  const totalTreads = tallLayout.flights.reduce((acc, f) => acc + f.treads.length, 0);
  const floorExclusionsObj = {};
  for (const [flIdx, bands] of tallLayout.floorExclusions.entries()) {
    floorExclusionsObj[String(flIdx)] = bands;
  }
  return {
    enabled: true,
    feasible: tallLayout.feasible,
    side: tallLayout.side,
    landingMode: tallLayout.landingMode,
    railingMode: tallLayout.railingMode,
    startsAtGround: tallLayout.startsAtGround,
    reachesRoof: tallLayout.reachesRoof,
    startFloor: tallLayout.startFloor,
    topSupportedFloor: tallLayout.topSupportedFloor,
    availableWallSpan: tallLayout.availableWallSpan,
    requiredWallSpan: tallLayout.requiredWallSpan,
    stairWidth: tallLayout.dimensions.stairWidth,
    wallClearance: tallLayout.dimensions.wallClearance,
    risePerStep: tallLayout.dimensions.risePerStep,
    runPerStep: tallLayout.dimensions.runPerStep,
    flightCount: tallLayout.flights.length,
    landingCount: tallLayout.landings.length,
    treadCount: totalTreads,
    doorwayCount: tallLayout.doorways.length,
    limitations: tallLayout.limitations,
    warnings: tallLayout.warnings,
    floorExclusions: floorExclusionsObj,
    landings: tallLayout.landings,
    flights: tallLayout.flights,
    doorways: tallLayout.doorways
  };
}
