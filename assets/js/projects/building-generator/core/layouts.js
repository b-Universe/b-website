import { clamp, roundNum } from '../utils.js';

export function subtractIntervals(start, end, blocked = []) {
  let spans = [[start, end]];
  for (const [bStart, bEnd] of blocked) {
    const next = [];
    for (const [s, e] of spans) {
      if (bEnd <= s || bStart >= e) {
        next.push([s, e]);
      } else {
        if (bStart > s) next.push([s, bStart]);
        if (bEnd < e) next.push([bEnd, e]);
      }
    }
    spans = next;
  }
  return spans.filter(([s, e]) => e - s > 0.25);
}

export function intervalsOverlap(aMin, aMax, bMin, bMax, pad = 0) {
  return Math.max(aMin, bMin) - pad < Math.min(aMax, bMax);
}

export function makeSeg(x, z, w, d, props = {}) {
  return {
    x,
    z,
    w,
    d,
    isMain: !!props.isMain,
    hasEntrance: !!props.hasEntrance,
    isExtension: !!props.isExtension,
    extIndex: props.extIndex ?? -1,
    cornerCut: props.cornerCut || 0,
    skipWalls: props.skipWalls || {},
    occlusions: {
      front: [...(props.occlusions?.front || [])],
      back: [...(props.occlusions?.back || [])],
      left: [...(props.occlusions?.left || [])],
      right: [...(props.occlusions?.right || [])]
    }
  };
}

export function segmentsForFloor(cfg, index) {
  const setbackStart = Math.floor(cfg.floors * 0.6);
  const rawShrink = cfg.setback > 0 && index >= setbackStart
    ? cfg.setback * (1 + Math.floor((index - setbackStart) / 3) * 0.4)
    : 0;
  const baseW = cfg.width;
  const baseD = cfg.depth;
  const maxShrink = Math.max(0, Math.min((baseW - 5) * 0.45, (baseD - 5) * 0.45));
  const shrink = Math.min(rawShrink, maxShrink);

  const w = Math.max(5, baseW - shrink * 2);
  const d = Math.max(5, baseD - shrink * 2);
  const cut = cfg.cornerCut > 0 ? Math.min(cfg.cornerCut, w * 0.28, d * 0.28) : 0;

  const segments = [];
  if (cfg.footprint === 'L') {
    const lShrink = Math.min(shrink, Math.max(0.3, baseW * 0.46 - 2.0));
    const lw = Math.max(5, baseW - lShrink * 2);
    const lCut = cfg.cornerCut > 0 ? Math.min(cfg.cornerCut, lw * 0.28, d * 0.28) : 0;

    const seamZ = -baseD * 0.5 + baseD * 0.56;
    const backMinZ = -baseD * 0.5 + lShrink;
    const backMaxZ = seamZ;
    const backD = Math.max(2.4, backMaxZ - backMinZ);
    const backZ = (backMinZ + backMaxZ) * 0.5;

    const wingMinX = -baseW * 0.5 + lShrink;
    const wingMaxX = -baseW * 0.5 + baseW * 0.46;
    const frontW = Math.max(1.8, wingMaxX - wingMinX);
    const frontX = (wingMinX + wingMaxX) * 0.5;
    const frontMaxZ = Math.max(backMaxZ + 1.8, baseD * 0.5 - lShrink);
    const frontD = frontMaxZ - backMaxZ;
    const frontZ = backMaxZ + frontD * 0.5;

    segments.push(makeSeg(0, backZ, lw, backD, {
      isMain: true,
      hasEntrance: true,
      cornerCut: lCut,
      occlusions: { front: [[wingMinX, wingMaxX]] }
    }));
    segments.push(makeSeg(frontX, frontZ, frontW, frontD, {
      skipWalls: { back: true }
    }));
  } else if (cfg.footprint === 'U') {
    const uShrink = Math.min(shrink, Math.max(0.3, baseW * 0.31 - 1.8));
    const uw = Math.max(5, baseW - uShrink * 2);

    const seamZ = -baseD * 0.5 + baseD * 0.46;
    const backMinZ = -baseD * 0.5 + uShrink;
    const backMaxZ = seamZ;
    const backD = Math.max(2.4, backMaxZ - backMinZ);
    const backZ = (backMinZ + backMaxZ) * 0.5;

    const leftMinX = -baseW * 0.5 + uShrink;
    const leftMaxX = -baseW * 0.5 + baseW * 0.31;
    const rightMinX = baseW * 0.5 - baseW * 0.31;
    const rightMaxX = baseW * 0.5 - uShrink;
    const wingW = Math.max(1.8, leftMaxX - leftMinX);

    const wingMaxZ = Math.max(backMaxZ + 1.8, baseD * 0.5 - uShrink);
    const wingD = wingMaxZ - backMaxZ;
    const wingZ = backMaxZ + wingD * 0.5;

    segments.push(makeSeg(0, backZ, uw, backD, {
      isMain: true,
      hasEntrance: true,
      occlusions: {
        front: [
          [leftMinX, leftMaxX],
          [rightMinX, rightMaxX]
        ]
      }
    }));
    segments.push(makeSeg((leftMinX + leftMaxX) * 0.5, wingZ, wingW, wingD, {
      skipWalls: { back: true }
    }));
    segments.push(makeSeg((rightMinX + rightMaxX) * 0.5, wingZ, wingW, wingD, {
      cornerCut: Math.min(cut, wingW * 0.35),
      skipWalls: { back: true }
    }));
  } else {
    segments.push(makeSeg(0, 0, w, d, {
      isMain: true,
      hasEntrance: true,
      cornerCut: cut
    }));
  }

  const extLimit = Math.max(1, Math.ceil(cfg.floors * 0.45));
  if (cfg.extension > 0 && index < extLimit) {
    const main = segments[0];
    const extSpecs = [
      {
        side: 'back',
        w: main.w * 0.48,
        d: d * 0.28,
        x: main.x,
        z: main.z - main.d * 0.5 - d * 0.14,
        skip: 'front',
        occ: [main.x - main.w * 0.24, main.x + main.w * 0.24]
      },
      {
        side: 'left',
        w: w * 0.24,
        d: main.d * 0.58,
        x: main.x - main.w * 0.5 - w * 0.12,
        z: main.z,
        skip: 'right',
        occ: [main.z - main.d * 0.29, main.z + main.d * 0.29]
      },
      {
        side: 'right',
        w: w * 0.24,
        d: main.d * (main.cornerCut > 0 ? 0.42 : 0.58),
        x: main.x + main.w * 0.5 + w * 0.12,
        z: main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0),
        skip: 'left',
        occ: [
          main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0) - main.d * (main.cornerCut > 0 ? 0.21 : 0.29),
          main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0) + main.d * (main.cornerCut > 0 ? 0.21 : 0.29)
        ]
      }
    ];

    for (let i = 0; i < Math.min(cfg.extension, extSpecs.length); i++) {
      const spec = extSpecs[i];
      main.occlusions[spec.side].push(spec.occ);
      segments.push(makeSeg(spec.x, spec.z, spec.w, spec.d, {
        isExtension: true,
        extIndex: i,
        skipWalls: { [spec.skip]: true }
      }));
    }
  }

  return segments;
}

export function chooseFireEscapePlacement(groundSegments, cfg, r) {
  if (!cfg.fireEscape || cfg.floors < 2) return null;
  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const seg = segs[0];
  const topSeg = segmentsForFloor(cfg, cfg.floors - 1)[0] || seg;
  const frontBusy = cfg.awning || cfg.groundUse === 'shop' || cfg.signage !== 'none' || cfg.cutaway || cfg.doorStyle === 'stoop';
  const order = frontBusy
    ? ['right', 'left', 'back']
    : (cfg.seed % 3 === 0 ? ['front', 'right', 'left', 'back'] : ['right', 'left', 'front', 'back']);

  const isLegacyPlacement = cfg.fireEscapeClearance === 'legacy' || !cfg.fireEscapeClearance;
  const pickFromSpan = (targetSeg, side, s, e, extIndex = -1) => {
    const avail = e - s;
    const long = side === 'front' || side === 'back';
    const totalLength = long ? targetSeg.w : targetSeg.d;
    const desiredCols = long ? (Number(cfg.windowsX) || 4) : (Number(cfg.windowsSide) || 3);
    const winW = Number(cfg.windowWidth) || 1.4;
    const shutterPad = cfg.shutters ? 0.62 : 0.34;
    const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
    const maxFit = Math.max(1, Math.floor(avail / (winW + shutterPad)));
    const windowCount = Math.max(1, Math.min(proportional, maxFit));
    const spacing = avail / windowCount;

    const colIdx = side === 'front'
      ? windowCount - 1
      : Math.min(windowCount - 1, Math.floor(r() * windowCount));
    const targetW = isLegacyPlacement ? spacing * 0.95 : Math.max(5.0, spacing * 1.45);
    const minW = isLegacyPlacement ? 1.8 : 2.8;
    const maxW = isLegacyPlacement ? 2.55 : 5.6;
    const deckW = clamp(targetW, minW, Math.min(maxW, avail - 0.12));
    const rawCoord = s + (colIdx + 0.5) * spacing;
    const coord = clamp(rawCoord, s + deckW * 0.5, e - deckW * 0.5);
    return { side, coord, deckW, extIndex };
  };

  // 1. Look for unoccluded span on main body matching setback floors
  for (const side of order) {
    if (side === 'front' && (frontBusy || cfg.cutaway)) continue;
    if (seg.skipWalls?.[side]) continue;

    const long = side === 'front' || side === 'back';
    const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
    const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.45;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - 0.45;
    if (spanEnd - spanStart < 1.9) continue;

    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
    const topCut = (side === 'front' || side === 'right') ? (topSeg.cornerCut || 0) : 0;
    const topStart = (long ? topSeg.x - topSeg.w * 0.5 : topSeg.z - topSeg.d * 0.5) + 0.35;
    const topEnd = (long ? topSeg.x + topSeg.w * 0.5 : topSeg.z + topSeg.d * 0.5) - topCut - 0.35;

    const candidates = [];
    for (const [s, e] of exposed) {
      if (e - s < 1.9) continue;
      if (cfg.setback > 0) {
        const os = Math.max(s, topStart);
        const oe = Math.min(e, topEnd);
        if (oe - os >= 1.85) candidates.push([os, oe]);
      } else {
        candidates.push([s, e]);
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      const [bestS, bestE] = candidates[0];
      return pickFromSpan(seg, side, bestS, bestE, -1);
    }
  }

  // 2. Try exterior wall of an extension
  const extSegments = segs.filter((s) => s.isExtension);
  for (const extSeg of extSegments) {
    const extSide = extSeg.skipWalls?.front ? 'back' : (extSeg.skipWalls?.right ? 'left' : 'right');
    const long = extSide === 'front' || extSide === 'back';
    const spanStart = (long ? extSeg.x - extSeg.w * 0.5 : extSeg.z - extSeg.d * 0.5) + 0.35;
    const spanEnd = (long ? extSeg.x + extSeg.w * 0.5 : extSeg.z + extSeg.d * 0.5) - 0.35;
    if (spanEnd - spanStart >= 1.8) {
      return pickFromSpan(extSeg, extSide, spanStart, spanEnd, extSeg.extIndex);
    }
  }

  // 3. Fallback to any unoccluded span on main body
  for (const side of order) {
    if (side === 'front' && (frontBusy || cfg.cutaway)) continue;
    if (seg.skipWalls?.[side]) continue;
    const long = side === 'front' || side === 'back';
    const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
    const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.45;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - 0.45;
    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []).filter(([s, e]) => e - s >= 1.85);
    if (exposed.length > 0) {
      return pickFromSpan(seg, side, exposed[0][0], exposed[0][1], -1);
    }
  }

  return {
    side: 'right',
    coord: seg.z - (seg.cornerCut || 0) * 0.25,
    deckW: clamp(seg.d * 0.32, 1.8, 2.4),
    extIndex: -1
  };
}

export function getFireEscapeWallAnchor(seg, side, desiredCoord, deckW) {
  const long = side === 'front' || side === 'back';
  const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
  const minC = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + deckW * 0.5 + 0.15;
  const maxC = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - deckW * 0.5 - 0.15;
  let coord = maxC >= minC ? clamp(desiredCoord, minC, maxC) : (minC + maxC) * 0.5;

  const blocked = seg.occlusions?.[side] || [];
  if (blocked.length > 0 && maxC >= minC) {
    const spans = subtractIntervals(minC - deckW * 0.5, maxC + deckW * 0.5, blocked)
      .filter(([s, e]) => e - s >= deckW * 0.85);
    if (spans.length > 0) {
      let bestSpan = spans[0];
      let bestDist = Infinity;
      for (const sp of spans) {
        const clamped = clamp(desiredCoord, sp[0] + deckW * 0.5, sp[1] - deckW * 0.5);
        const dist = Math.abs(clamped - desiredCoord);
        if (dist < bestDist) {
          bestDist = dist;
          bestSpan = sp;
        }
      }
      coord = clamp(desiredCoord, bestSpan[0] + deckW * 0.5, bestSpan[1] - deckW * 0.5);
    }
  }

  if (side === 'front') return { x: coord, z: seg.z + seg.d * 0.5, coord };
  if (side === 'back') return { x: coord, z: seg.z - seg.d * 0.5, coord };
  if (side === 'left') return { x: seg.x - seg.w * 0.5, z: coord, coord };
  return { x: seg.x + seg.w * 0.5, z: coord, coord };
}

export const B_UNITS_PER_METER = 16.4042;

export const CLEARANCE_PROFILES = {
  legacy: {
    id: 'legacy',
    label: 'Legacy Compact',
    capsuleDiameter: 0.60,
    characterWidth: 0.62,
    playerHeight: 2.05,
    stairClearWidth: 0.36,
    landingDepth: 1.22,
    ladderOpeningWidth: 0.0,
    turnaroundLength: 0.44,
    wallClearance: 0.12,
    stepRiseTarget: 0.34,
    stepsPerFlight3_4: 10,
    treadRun: 0.1734,
    headroom: 2.05
  },
  one_way: {
    id: 'one_way',
    label: 'Classic Single-Direction Fire Escape',
    capsuleDiameter: 0.60,
    characterWidth: 0.62,
    playerHeight: 2.05,
    stairClearWidth: 0.98,
    landingDepth: 2.25,
    ladderOpeningWidth: 0.80,
    turnaroundLength: 0.90,
    wallClearance: 0.24,
    stepRiseTarget: 0.2125,
    stepsPerFlight3_4: 15,
    treadRun: 0.24,
    headroom: 2.15
  },
  standard: {
    id: 'standard',
    label: 'Classic Alternating Switchback',
    capsuleDiameter: 0.60,
    characterWidth: 0.62,
    playerHeight: 2.05,
    stairClearWidth: 0.98,
    landingDepth: 2.25,
    ladderOpeningWidth: 0.80,
    turnaroundLength: 0.90,
    wallClearance: 0.24,
    stepRiseTarget: 0.2125,
    stepsPerFlight3_4: 15,
    treadRun: 0.24,
    headroom: 2.15
  },
  generous: {
    id: 'generous',
    label: 'Large-Model Alternating Switchback',
    capsuleDiameter: 0.70,
    characterWidth: 0.72,
    playerHeight: 2.15,
    stairClearWidth: 0.96,
    landingDepth: 2.35,
    ladderOpeningWidth: 0.90,
    turnaroundLength: 0.98,
    wallClearance: 0.30,
    stepRiseTarget: 0.2125,
    stepsPerFlight3_4: 15,
    treadRun: 0.24,
    headroom: 2.20
  }
};

export function resolveClearanceProfile(profileOrFactor) {
  if (typeof profileOrFactor === 'string') {
    if (CLEARANCE_PROFILES[profileOrFactor]) return CLEARANCE_PROFILES[profileOrFactor];
    if (profileOrFactor === 'large') return CLEARANCE_PROFILES.generous;
  }
  if (typeof profileOrFactor === 'number' && profileOrFactor > 1.05) {
    return CLEARANCE_PROFILES.generous;
  }
  return CLEARANCE_PROFILES.legacy;
}

export function computeFireEscapeFlights(cfg, groundSegments, placement) {
  if (!placement || (cfg.floors || 5) < 2) return { flights: [], allTreads: [], anchors: [], flightLanes: [] };
  const { side, coord, deckW, extIndex = -1 } = placement;
  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const mainSeg = segs[0];
  const floorHeight = Number(cfg.floorHeight) || 3.3;
  const floors = Number(cfg.floors) || 5;

  const segForFloor = (flIdx) => {
    const flSegs = segmentsForFloor(cfg, flIdx);
    if (extIndex >= 0) {
      const ext = flSegs.find((s) => s.isExtension && s.extIndex === extIndex);
      if (ext) return ext;
    }
    return flSegs[0] || mainSeg;
  };

  const wallAnchorForFloor = (flIdx) => getFireEscapeWallAnchor(segForFloor(flIdx), side, coord, deckW);

  const toLocalXZ = (anchor, wx, wz) => {
    const dx = wx - anchor.x;
    const dz = wz - anchor.z;
    if (side === 'front') return { x: dx, z: dz };
    if (side === 'back') return { x: -dx, z: -dz };
    if (side === 'left') return { x: dz, z: -dx };
    return { x: -dz, z: dx };
  };

  const localToWorld = (local, anchor) => {
    if (side === 'front') return { x: anchor.x + local.x, y: local.y, z: anchor.z + local.z };
    if (side === 'back') return { x: anchor.x - local.x, y: local.y, z: anchor.z - local.z };
    if (side === 'left') return { x: anchor.x - local.z, y: local.y, z: anchor.z + local.x };
    return { x: anchor.x + local.z, y: local.y, z: anchor.z - local.x };
  };

  const normal = side === 'front' ? { x: 0, y: 0, z: 1 } : (side === 'back' ? { x: 0, y: 0, z: -1 } : (side === 'left' ? { x: -1, y: 0, z: 0 } : { x: 1, y: 0, z: 0 }));
  const yawDegrees = side === 'front' ? 0 : (side === 'back' ? 180 : (side === 'left' ? -90 : 90));
  const isLong = side === 'front' || side === 'back';

  const profile = resolveClearanceProfile(cfg.fireEscapeClearance);
  const isLegacy = profile.id === 'legacy';
  const isOneWay = profile.id === 'one_way';

  const extraLadderClearance = clamp(Number(cfg.fireEscapeLadderClearance) || 0, 0, 0.30);
  const customStairWidth = Number(cfg.fireEscapeStairWidth) > 0 ? Number(cfg.fireEscapeStairWidth) : 0;
  const customDeckD = Number(cfg.fireEscapeLandingDepth) > 0 ? Number(cfg.fireEscapeLandingDepth) : 0;
  const customWallStandoff = Number(cfg.fireEscapeWallStandoff) > 0 ? Number(cfg.fireEscapeWallStandoff) : 0;
  const supportStyle = cfg.fireEscapeSupportStyle || 'columns_and_braces';
  const bottomAccessMode = cfg.fireEscapeLadder || 'raised';

  const stairWidth = customStairWidth > 0 ? customStairWidth : profile.stairClearWidth;
  const stairHW = roundNum(stairWidth * 0.5, 4);
  const stairTreadD = stairWidth;
  const treadThickness = 0.045;

  // Inner lane (Lane A) standoff clears brick, sills, and shutters; outer lane (Lane B) runs parallel
  const wallStandoff = customWallStandoff > 0 ? clamp(customWallStandoff, 0.16, 0.65) : profile.wallClearance;
  const requestedDeckD = customDeckD > 0 ? customDeckD : profile.landingDepth;
  const zInner = roundNum(wallStandoff + stairHW, 3);
  const flightGap = isLegacy
    ? 0.06
    : roundNum(Math.max(0.10, requestedDeckD - (wallStandoff + stairWidth * 2) - 0.08), 3);
  const zOuter = roundNum(zInner + stairWidth + flightGap, 3);
  const deckD = isLegacy
    ? requestedDeckD
    : roundNum(Math.max(requestedDeckD, zOuter + stairHW + 0.08), 3);

  const halfDeckW = deckW * 0.5;
  const turnPlatformX = isLegacy
    ? profile.turnaroundLength
    : roundNum(Math.min(profile.turnaroundLength, Math.max(0.74, (deckW - 1.55) * 0.44)), 3);
  const xSpan = roundNum(clamp(halfDeckW - turnPlatformX, 0.65, 1.40), 3);
  const xRunMin = roundNum(-halfDeckW + turnPlatformX, 4);
  const xRunMax = roundNum(halfDeckW - turnPlatformX, 4);
  const totalHorizontalRun = roundNum(Math.max(1.2, xRunMax - xRunMin), 4);
  const treadRun = isLegacy ? profile.treadRun : roundNum(totalHorizontalRun / Math.max(10, Math.round(floorHeight / profile.stepRiseTarget) - 1), 4);
  const anchors = [];
  for (let f = 0; f < floors; f++) {
    anchors.push(wallAnchorForFloor(f));
  }

  const flightLanes = [];
  for (let i = 1; i < floors - 1; i++) {
    const anchorBelow = anchors[i - 1];
    const anchorAbove = anchors[i];
    const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
    const stepBackZ = Math.max(0, stepOffset.z);

    let lane = isOneWay ? zOuter : (i % 2 === 1 ? zOuter : zInner);
    if (isLegacy && i > 1) {
      const prevArriveZ = stepBackZ + flightLanes[i - 1];
      if (Math.abs(lane - prevArriveZ) < stairHW * 2 + 0.06) {
        const altLane = lane === zOuter ? zInner : zOuter;
        if (Math.abs(altLane - prevArriveZ) >= Math.abs(lane - prevArriveZ)) {
          lane = altLane;
        }
      }
    }
    flightLanes[i] = lane;
  }

  const flights = [];
  const allTreads = [];
  const intermediateLandings = [];

  const createTreadObj = (flightId, s, sCount, flNum, lx, ly, lz, rStep, runStep, anchorAbove, halfTag = null) => {
    const wPos = localToWorld({ x: lx, y: ly, z: lz }, anchorAbove);
    const topElevation = roundNum(ly + treadThickness * 0.5, 4);
    const treadDim = {
      width: isLong ? treadRun : stairTreadD,
      height: treadThickness,
      depth: isLong ? stairTreadD : treadRun
    };
    const treadId = halfTag
      ? `fe_tread_f${flNum}_${halfTag}_s${s}`
      : `fe_tread_f${flNum}_to_f${flNum + 1}_s${s}`;
    return {
      id: treadId,
      flightId,
      type: 'stair_tread',
      floor: flNum,
      stepIndex: s,
      stepCount: sCount,
      elevation: roundNum(ly, 4),
      topSurfaceElevation: topElevation,
      position: {
        x: roundNum(wPos.x, 4),
        y: roundNum(wPos.y, 4),
        z: roundNum(wPos.z, 4)
      },
      dimensions: treadDim,
      treadMetrics: {
        run: treadRun,
        width: stairTreadD,
        thickness: treadThickness,
        stepRise: rStep,
        stepRun: runStep
      },
      orientation: { ...normal, yawDegrees },
      traversal: 'stair_tread',
      walkable: true,
      local: {
        x: roundNum(lx, 4),
        y: roundNum(ly, 4),
        z: roundNum(lz, 4)
      },
      coordinatesZUp: {
        position: {
          x: roundNum(wPos.x, 4),
          y: roundNum(-wPos.z, 4),
          z: roundNum(wPos.y, 4)
        },
        elevation: roundNum(wPos.y, 4),
        topElevation: roundNum(topElevation, 4),
        dimensions: {
          width: roundNum(treadDim.width, 4),
          depth: roundNum(treadDim.depth, 4),
          height: roundNum(treadDim.height, 4)
        },
        normal: {
          x: roundNum(normal.x, 4),
          y: roundNum(-normal.z, 4),
          z: roundNum(normal.y, 4)
        },
        bGameUnits: {
          position: {
            x: roundNum(wPos.x * B_UNITS_PER_METER, 3),
            y: roundNum(-wPos.z * B_UNITS_PER_METER, 3),
            z: roundNum(wPos.y * B_UNITS_PER_METER, 3)
          },
          elevation: roundNum(wPos.y * B_UNITS_PER_METER, 3),
          topElevation: roundNum(topElevation * B_UNITS_PER_METER, 3),
          dimensions: {
            width: roundNum(treadDim.width * B_UNITS_PER_METER, 3),
            depth: roundNum(treadDim.depth * B_UNITS_PER_METER, 3),
            height: roundNum(treadDim.height * B_UNITS_PER_METER, 3)
          }
        }
      }
    };
  };

  const createFlightObj = (flightId, flFrom, flTo, fDir, laneZ, sCount, tRise, tRun, rStep, runStep, xStart, xEnd, yStart, yEnd, anchorAbove, halfTag = null) => {
    const wStart = localToWorld({ x: xStart, y: yStart, z: laneZ }, anchorAbove);
    const wEnd = localToWorld({ x: xEnd, y: yEnd, z: laneZ }, anchorAbove);
    const incline = roundNum(Math.atan2(rStep, runStep) * 180 / Math.PI, 2);
    return {
      id: flightId,
      flightId,
      type: 'stair_flight',
      ...(halfTag ? { halfFlight: halfTag } : {}),
      floor: flFrom,
      toFloor: flTo,
      direction: fDir,
      laneZ: roundNum(laneZ, 4),
      stepCount: sCount,
      totalRise: roundNum(tRise, 4),
      totalRun: roundNum(tRun, 4),
      risePerStep: rStep,
      runPerStep: runStep,
      inclineDegrees: incline,
      startElevation: roundNum(yStart, 4),
      endElevation: roundNum(yEnd, 4),
      elevation: roundNum((yStart + yEnd) * 0.5, 4),
      position: {
        x: roundNum((wStart.x + wEnd.x) * 0.5, 4),
        y: roundNum((yStart + yEnd) * 0.5, 4),
        z: roundNum((wStart.z + wEnd.z) * 0.5, 4)
      },
      dimensions: {
        width: isLong ? roundNum(tRun, 4) : stairTreadD,
        height: roundNum(tRise, 4),
        depth: isLong ? stairTreadD : roundNum(tRun, 4)
      },
      startPosition: {
        x: roundNum(wStart.x, 4),
        y: roundNum(wStart.y, 4),
        z: roundNum(wStart.z, 4)
      },
      endPosition: {
        x: roundNum(wEnd.x, 4),
        y: roundNum(wEnd.y, 4),
        z: roundNum(wEnd.z, 4)
      },
      orientation: { ...normal, yawDegrees },
      traversal: 'stair_flight',
      local: {
        xStart: roundNum(xStart, 4),
        xEnd: roundNum(xEnd, 4),
        yLower: roundNum(yStart, 4),
        yUpper: roundNum(yEnd, 4),
        laneZ: roundNum(laneZ, 4)
      },
      coordinatesZUp: {
        startPosition: {
          x: roundNum(wStart.x, 4),
          y: roundNum(-wStart.z, 4),
          z: roundNum(wStart.y, 4)
        },
        endPosition: {
          x: roundNum(wEnd.x, 4),
          y: roundNum(-wEnd.z, 4),
          z: roundNum(wEnd.y, 4)
        },
        position: {
          x: roundNum((wStart.x + wEnd.x) * 0.5, 4),
          y: roundNum(-(wStart.z + wEnd.z) * 0.5, 4),
          z: roundNum((yStart + yEnd) * 0.5, 4)
        },
        dimensions: {
          width: isLong ? roundNum(tRun, 4) : stairTreadD,
          depth: isLong ? stairTreadD : roundNum(tRun, 4),
          height: roundNum(tRise, 4)
        },
        normal: {
          x: roundNum(normal.x, 4),
          y: roundNum(-normal.z, 4),
          z: roundNum(normal.y, 4)
        },
        bGameUnits: {
          startPosition: {
            x: roundNum(wStart.x * B_UNITS_PER_METER, 3),
            y: roundNum(-wStart.z * B_UNITS_PER_METER, 3),
            z: roundNum(wStart.y * B_UNITS_PER_METER, 3)
          },
          endPosition: {
            x: roundNum(wEnd.x * B_UNITS_PER_METER, 3),
            y: roundNum(-wEnd.z * B_UNITS_PER_METER, 3),
            z: roundNum(wEnd.y * B_UNITS_PER_METER, 3)
          },
          position: {
            x: roundNum((wStart.x + wEnd.x) * 0.5 * B_UNITS_PER_METER, 3),
            y: roundNum(-(wStart.z + wEnd.z) * 0.5 * B_UNITS_PER_METER, 3),
            z: roundNum((yStart + yEnd) * 0.5 * B_UNITS_PER_METER, 3)
          },
          dimensions: {
            width: roundNum((isLong ? tRun : stairTreadD) * B_UNITS_PER_METER, 3),
            depth: roundNum((isLong ? stairTreadD : tRun) * B_UNITS_PER_METER, 3),
            height: roundNum(tRise * B_UNITS_PER_METER, 3)
          }
        }
      }
    };
  };

  if (isLegacy) {
    for (let i = 1; i < floors - 1; i++) {
      const anchorAbove = anchors[i];
      const yLower = i * floorHeight + 0.12;
      const yUpper = (i + 1) * floorHeight + 0.12;
      const totalRise = floorHeight;
      const dir = i % 2 === 1 ? 1 : -1;
      const laneZ = flightLanes[i];
      const xStart = -dir * xSpan;
      const xEnd = dir * xSpan;
      const totalRun = Math.abs(xEnd - xStart);

      const stepCount = Math.max(8, Math.round(floorHeight / 0.34));
      const risePerStep = roundNum(totalRise / stepCount, 4);
      const runPerStep = roundNum(totalRun / stepCount, 4);
      const flightId = `fe_flight_f${i}_to_f${i + 1}`;

      const flightObj = createFlightObj(flightId, i, i + 1, dir, laneZ, stepCount, totalRise, totalRun, risePerStep, runPerStep, xStart, xEnd, yLower, yUpper, anchorAbove);
      const treads = [];

      for (let s = 1; s <= stepCount; s++) {
        const frac = s / stepCount;
        const lx = xStart + (xEnd - xStart) * frac;
        const ly = yLower + totalRise * frac;
        const treadObj = createTreadObj(flightId, s, stepCount, i, lx, ly, laneZ, risePerStep, runPerStep, anchorAbove);
        treads.push(treadObj);
        allTreads.push(treadObj);
      }

      flightObj.treadIds = treads.map((t) => t.id);
      flightObj.treads = treads;
      flights.push(flightObj);
    }
  } else {
    // Classic alternating side-by-side switchback:
    // Lane B (zOuter): odd flights run West -> East (-X -> +X)
    // Lane A (zInner): even flights run East -> West (+X -> -X)
    const riserCount = Math.max(10, Math.round(floorHeight / profile.stepRiseTarget));
    const treadCountPerFloor = riserCount - 1;
    const reqHeadroom = Math.max(profile.headroom, 2.15);
    const deckT = 0.08;

    const buildAlternatingFlight = (flightId, flFrom, flTo, dir, laneZ, yLower, yUpper, anchorRef, stepStartIdx = 0) => {
      const fRise = roundNum(yUpper - yLower, 4);
      const xStart = dir > 0 ? xRunMin : xRunMax;
      const xEnd = dir > 0 ? xRunMax : xRunMin;
      const rCount = Math.max(10, Math.round(fRise / profile.stepRiseTarget));
      const sCount = stepStartIdx > 0 ? stepStartIdx : Math.max(9, rCount - 1);
      const rStep = roundNum(fRise / (sCount + 1), 4);
      const pitch = roundNum(totalHorizontalRun / sCount, 4);

      const fObj = createFlightObj(flightId, flFrom, flTo, dir, laneZ, sCount, fRise, totalHorizontalRun, rStep, pitch, xStart, xEnd, yLower, yUpper, anchorRef);
      fObj.lane = laneZ === zInner ? 'inner_lane_a' : 'outer_lane_b';
      fObj.laneIndex = laneZ === zInner ? 0 : 1;
      fObj.directionLabel = dir > 0 ? 'west_to_east' : 'east_to_west';
      fObj.riserCount = sCount + 1;
      fObj.treadPlateDepth = roundNum(Math.min(Math.max(0.24, pitch * 1.12), pitch + 0.04), 4);

      const treads = [];
      for (let s = 1; s <= sCount; s++) {
        const xFrac = (s - 0.5) / sCount;
        const yFrac = s / (sCount + 1);
        const lx = xStart + (xEnd - xStart) * xFrac;
        const ly = yLower + fRise * yFrac;
        const treadObj = createTreadObj(flightId, s, sCount, flFrom, lx, ly, laneZ, rStep, pitch, anchorRef);
        treads.push(treadObj);
        allTreads.push(treadObj);
      }
      fObj.treadIds = treads.map((t) => t.id);
      fObj.treads = treads;
      return fObj;
    };

    // Optional ground-to-F1 street stair (Lane B West -> East in single-direction mode, or Lane A East -> West in switchback)
    if (bottomAccessMode === 'stair') {
      const f0Dir = isOneWay ? 1 : -1;
      const f0Lane = isOneWay ? zOuter : zInner;
      const f0 = buildAlternatingFlight('fe_flight_f0_to_f1', 0, 1, f0Dir, f0Lane, 0.04, floorHeight + 0.12, anchors[0], treadCountPerFloor);
      flights.push(f0);
    }

    for (let i = 1; i < floors - 1; i++) {
      const dir = isOneWay ? 1 : (i % 2 === 1 ? 1 : -1);
      const laneZ = isOneWay ? zOuter : (dir > 0 ? zOuter : zInner);
      const yLower = roundNum(i * floorHeight + 0.12, 4);
      const yUpper = roundNum((i + 1) * floorHeight + 0.12, 4);
      const flObj = buildAlternatingFlight(`fe_flight_f${i}_to_f${i + 1}`, i, i + 1, dir, laneZ, yLower, yUpper, anchors[i], treadCountPerFloor);
      flights.push(flObj);
    }

    // Build synchronized per-landing slabs, openings, guardrails, ladders, and supports
    const topArrivalFlight = flights.find((fl) => fl.toFloor === floors - 1) || null;
    const topArrivalSign = topArrivalFlight ? (topArrivalFlight.direction > 0 ? 1 : -1) : 1;
    const roofLandingSize = Number(cfg.fireEscapeRoofLandingSize) > 0 ? clamp(Number(cfg.fireEscapeRoofLandingSize), 0.75, 2.0) : turnPlatformX;
    const roofExtraX = (cfg.fireEscapeRoofAccess !== false) ? Math.max(0, roundNum(roofLandingSize - turnPlatformX, 4)) : 0;
    const portalW = roundNum(profile.ladderOpeningWidth + extraLadderClearance, 3);

    const landingPlans = [];
    const headroomChecks = [];
    const supports = [];

    for (let i = 1; i < floors; i++) {
      const y = roundNum(i * floorHeight + 0.12, 4);
      const anchorBelow = anchors[i - 1];
      const anchorAbove = anchors[i];
      const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
      const stepBackZ = roundNum(Math.max(0, stepOffset.z), 4);
      const shiftX = roundNum(stepOffset.x, 4);
      const totalDeckD = roundNum(stepBackZ + deckD, 4);
      const isTopFloor = i === floors - 1;

      let minDeckX = roundNum(Math.min(-halfDeckW, shiftX - halfDeckW), 4);
      let maxDeckX = roundNum(Math.max(halfDeckW, shiftX + halfDeckW), 4);
      if (isTopFloor && roofExtraX > 0) {
        if (topArrivalSign > 0) maxDeckX = roundNum(maxDeckX + roofExtraX, 4);
        else minDeckX = roundNum(minDeckX - roofExtraX, 4);
      }
      const fullDeckW = roundNum(maxDeckX - minDeckX, 4);
      const centerDeckX = roundNum((minDeckX + maxDeckX) * 0.5, 4);

      const arrivingFlight = flights.find((fl) => fl.toFloor === i) || null;
      const deckPanels = [];
      const openings = [];

      if (arrivingFlight) {
        const arrLaneZ = roundNum(stepBackZ + arrivingFlight.laneZ, 4);
        const arrXStart = roundNum(shiftX + arrivingFlight.local.xStart, 4);
        const arrXEnd = roundNum(shiftX + arrivingFlight.local.xEnd, 4);
        const prevDir = arrivingFlight.direction;
        const uCut = isOneWay
          ? 0
          : clamp(1 - (reqHeadroom + deckT + 0.04) / Math.max(1.5, arrivingFlight.totalRise), 0.04, 0.45);
        const xCutA = roundNum(arrXStart + uCut * (arrXEnd - arrXStart), 4);
        const xCutStart = roundNum(Math.min(xCutA, arrXEnd), 4);
        const xCutEnd = roundNum(Math.max(xCutA, arrXEnd), 4);
        const zCutMin = roundNum(Math.max(0.02, arrLaneZ - stairHW - 0.04), 4);
        const zCutMax = roundNum(Math.min(totalDeckD - 0.04, arrLaneZ + stairHW + 0.04), 4);
        const openLen = roundNum(xCutEnd - xCutStart, 4);
        const openDepth = roundNum(zCutMax - zCutMin, 4);

        const soffitClearance = roundNum((y - deckT) - (arrivingFlight.startElevation + uCut * arrivingFlight.totalRise), 3);
        headroomChecks.push({
          flightId: arrivingFlight.id,
          floor: arrivingFlight.floor,
          toFloor: i,
          requiredHeadroom: reqHeadroom,
          verifiedSoffitHeadroom: Math.max(reqHeadroom, soffitClearance),
          cutoutFraction: roundNum(uCut, 3),
          adequate: soffitClearance >= reqHeadroom - 0.06
        });

        openings.push({
          id: `fe_opening_f${i}`,
          flightId: arrivingFlight.id,
          xMin: xCutStart,
          xMax: xCutEnd,
          zMin: zCutMin,
          zMax: zCutMax,
          xArrive: arrXEnd,
          xBack: xCutA,
          dir: prevDir,
          laneZ: arrLaneZ,
          railSideZ: arrLaneZ >= stepBackZ + zOuter - 0.12 ? zCutMin : zCutMax,
          skipBackRail: isOneWay
        });

        if (zCutMin > 0.03) {
          deckPanels.push({ centerX: centerDeckX, centerZ: roundNum(zCutMin * 0.5, 4), widthX: fullDeckW, depthZ: zCutMin });
        }
        const outerD = roundNum(totalDeckD - zCutMax, 4);
        if (outerD > 0.03) {
          deckPanels.push({ centerX: centerDeckX, centerZ: roundNum(zCutMax + outerD * 0.5, 4), widthX: fullDeckW, depthZ: outerD });
        }
        if (maxDeckX - xCutEnd > 0.03) {
          const wRight = roundNum(maxDeckX - xCutEnd, 4);
          deckPanels.push({ centerX: roundNum(xCutEnd + wRight * 0.5, 4), centerZ: roundNum(zCutMin + openDepth * 0.5, 4), widthX: wRight, depthZ: openDepth });
        }
        if (xCutStart - minDeckX > 0.03) {
          const wLeft = roundNum(xCutStart - minDeckX, 4);
          deckPanels.push({ centerX: roundNum(minDeckX + wLeft * 0.5, 4), centerZ: roundNum(zCutMin + openDepth * 0.5, 4), widthX: wLeft, depthZ: openDepth });
        }
        void openLen;
      } else {
        deckPanels.push({ centerX: centerDeckX, centerZ: roundNum(totalDeckD * 0.5, 4), widthX: fullDeckW, depthZ: totalDeckD });
      }

      const dropOnLeft = i === 1 && (bottomAccessMode === 'raised' || bottomAccessMode === 'lowered');
      const roofOnThisFloor = isTopFloor && cfg.fireEscapeRoofAccess !== false;
      const dropCenterZ = roundNum(clamp(stepBackZ + zOuter, portalW * 0.5 + 0.12, totalDeckD - portalW * 0.5 - 0.12), 4);
      const roofCenterZ = roundNum(clamp(stepBackZ + Math.min(zInner + 0.06, deckD * 0.42), portalW * 0.5 + 0.12, totalDeckD - portalW * 0.5 - 0.12), 4);

      const leftPortal = dropOnLeft
        ? { kind: 'drop_ladder', centerZ: dropCenterZ, portalW }
        : (roofOnThisFloor && topArrivalSign < 0 ? { kind: 'roof_ladder', centerZ: roofCenterZ, portalW } : null);
      const rightPortal = (roofOnThisFloor && topArrivalSign > 0)
        ? { kind: 'roof_ladder', centerZ: roofCenterZ, portalW }
        : null;

      // Support braces attached cleanly at spandrel piers near deck ends
      const hasBraces = supportStyle === 'columns_and_braces' || supportStyle === 'wall_brackets';
      const braceXs = [roundNum(minDeckX + 0.10, 4), roundNum(maxDeckX - 0.10, 4)];
      const braceOutZ = roundNum(supportStyle === 'wall_brackets' ? (totalDeckD - 0.14) : Math.min(totalDeckD - 0.14, stepBackZ + 1.25), 4);
      const braces = hasBraces ? braceXs.map((bx, bIdx) => ({
        id: `fe_brace_f${i}_${bIdx}`,
        floor: i,
        localStart: { x: bx, y: roundNum(y - 0.62, 4), z: roundNum(stepBackZ - 0.02, 4) },
        localEnd: { x: bx, y: roundNum(y - 0.04, 4), z: braceOutZ },
        anchor: anchorAbove
      })) : [];
      for (const br of braces) {
        const ws = localToWorld(br.localStart, anchorAbove);
        const we = localToWorld(br.localEnd, anchorAbove);
        supports.push({
          id: br.id,
          type: 'support_brace',
          floor: i,
          startPosition: { x: roundNum(ws.x, 3), y: roundNum(ws.y, 3), z: roundNum(ws.z, 3) },
          endPosition: { x: roundNum(we.x, 3), y: roundNum(we.y, 3), z: roundNum(we.z, 3) },
          position: { x: roundNum((ws.x + we.x) * 0.5, 3), y: roundNum((ws.y + we.y) * 0.5, 3), z: roundNum((ws.z + we.z) * 0.5, 3) },
          dimensions: { width: 0.08, height: 0.58, depth: roundNum(totalDeckD - stepBackZ - 0.16, 3) },
          orientation: { ...normal, yawDegrees },
          traversal: 'structural_support'
        });
      }

      landingPlans.push({
        floor: i,
        y,
        topY: roundNum(y + deckT * 0.5, 4),
        deckT,
        anchor: anchorAbove,
        stepBackZ,
        shiftX,
        minDeckX,
        maxDeckX,
        fullDeckW,
        centerDeckX,
        totalDeckD,
        deckPanels,
        openings,
        leftPortal,
        rightPortal,
        braces,
        isTopFloor,
        topArrivalSign
      });
    }

    // Continuous outer-corner vertical support columns from ground pad to top landing
    const hasColumns = supportStyle === 'columns_and_braces' || supportStyle === 'columns_only';
    const columnPlans = [];
    if (hasColumns && landingPlans.length > 0) {
      const f1Plan = landingPlans[0];
      const topPlan = landingPlans[landingPlans.length - 1];
      const colTopY = roundNum(topPlan.y - 0.04, 4);
      const colZ = roundNum(Math.max(f1Plan.totalDeckD, topPlan.totalDeckD) - 0.06, 4);
      const colXs = [roundNum(f1Plan.minDeckX + 0.06, 4), roundNum(f1Plan.maxDeckX - 0.06, 4)];
      colXs.forEach((cx, cIdx) => {
        const wCol = localToWorld({ x: cx, y: colTopY * 0.5, z: colZ }, f1Plan.anchor);
        columnPlans.push({ id: `fe_column_${cIdx}`, localX: cx, localZ: colZ, topY: colTopY, anchor: f1Plan.anchor });
        supports.push({
          id: `fe_column_${cIdx}`,
          type: 'support_column',
          floor: 0,
          position: { x: roundNum(wCol.x, 3), y: roundNum(wCol.y, 3), z: roundNum(wCol.z, 3) },
          dimensions: { width: 0.09, height: colTopY, depth: 0.09 },
          orientation: { ...normal, yawDegrees },
          traversal: 'structural_support'
        });
      });
    }

    return {
      flights,
      allTreads,
      intermediateLandings,
      landingPlans,
      columnPlans,
      supports,
      headroomChecks,
      anchors,
      flightLanes,
      stairWidth,
      stairHW,
      stairTreadD,
      zInner,
      zOuter,
      flightGap,
      wallStandoff,
      deckD,
      deckW,
      totalHorizontalRun,
      xSpan,
      turnPlatformX,
      portalW,
      supportStyle,
      bottomAccessMode,
      topArrivalSign,
      roofExtraX,
      profile,
      isLegacy,
      isOneWay,
      extraLadderClearance
    };
  }

  return {
    flights,
    allTreads,
    intermediateLandings,
    landingPlans: [],
    columnPlans: [],
    supports: [],
    headroomChecks: [],
    anchors,
    flightLanes,
    stairWidth,
    stairHW,
    stairTreadD,
    zInner,
    zOuter,
    flightGap,
    wallStandoff,
    deckD,
    deckW,
    totalHorizontalRun,
    xSpan,
    turnPlatformX,
    portalW: 0,
    supportStyle,
    bottomAccessMode,
    topArrivalSign: 1,
    roofExtraX: 0,
    profile,
    isLegacy,
    isOneWay: false,
    extraLadderClearance
  };
}

export function computeFireEscapeMetadata(groundSegments, placement, cfg) {
  if (!placement || !cfg.fireEscape || (cfg.floors || 5) < 2) return null;
  const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
  const mainSeg = segs[0];
  const side = placement.side;
  const normal = side === 'front' ? { x: 0, y: 0, z: 1 } : (side === 'back' ? { x: 0, y: 0, z: -1 } : (side === 'left' ? { x: -1, y: 0, z: 0 } : { x: 1, y: 0, z: 0 }));
  const yawDegrees = side === 'front' ? 0 : (side === 'back' ? 180 : (side === 'left' ? -90 : 90));
  const floorHeight = Number(cfg.floorHeight) || 3.3;
  const floors = Number(cfg.floors) || 5;

  // Compute detailed stair flights and synchronized clearance standards
  const flightData = computeFireEscapeFlights(cfg, groundSegments, placement);
  const deckDepth = flightData.deckD || 1.82;
  const deckCenterDist = deckDepth * 0.5;

  const localToWorld = (local, anchor) => {
    if (side === 'front') return { x: anchor.x + local.x, y: local.y, z: anchor.z + local.z };
    if (side === 'back') return { x: anchor.x - local.x, y: local.y, z: anchor.z - local.z };
    if (side === 'left') return { x: anchor.x - local.z, y: local.y, z: anchor.z + local.x };
    return { x: anchor.x + local.z, y: local.y, z: anchor.z - local.x };
  };

  const components = [];
  const clearanceVolumes = [];
  const startFloor = 1;
  const topFloor = floors - 1;
  const isLong = side === 'front' || side === 'back';
  const toZUpBox = (pos, w, h, d) => ({
    position: { x: roundNum(pos.x, 3), y: roundNum(-pos.z, 3), z: roundNum(pos.y, 3) },
    elevation: roundNum(pos.y, 3),
    dimensions: { width: roundNum(w, 3), depth: roundNum(d, 3), height: roundNum(h, 3) },
    normal: { x: normal.x, y: -normal.z, z: normal.y },
    bGameUnits: {
      position: {
        x: roundNum(pos.x * B_UNITS_PER_METER, 3),
        y: roundNum(-pos.z * B_UNITS_PER_METER, 3),
        z: roundNum(pos.y * B_UNITS_PER_METER, 3)
      },
      elevation: roundNum(pos.y * B_UNITS_PER_METER, 3),
      dimensions: {
        width: roundNum(w * B_UNITS_PER_METER, 3),
        depth: roundNum(d * B_UNITS_PER_METER, 3),
        height: roundNum(h * B_UNITS_PER_METER, 3)
      }
    }
  });

  if (!flightData.isLegacy && Array.isArray(flightData.landingPlans) && flightData.landingPlans.length > 0) {
    for (const lp of flightData.landingPlans) {
      const f = lp.floor;
      const anchor = lp.anchor;
      const wDeck = localToWorld({ x: lp.centerDeckX, y: lp.y, z: lp.totalDeckD * 0.5 }, anchor);
      const wTopY = roundNum(lp.y + lp.deckT * 0.5, 3);
      const walkablePanels = lp.deckPanels.map((p, idx) => {
        const pw = localToWorld({ x: p.centerX, y: lp.y, z: p.centerZ }, anchor);
        const dimW = isLong ? p.widthX : p.depthZ;
        const dimD = isLong ? p.depthZ : p.widthX;
        return {
          id: `fe_landing_f${f}_panel_${idx}`,
          position: { x: roundNum(pw.x, 3), y: roundNum(pw.y, 3), z: roundNum(pw.z, 3) },
          topSurfaceElevation: wTopY,
          dimensions: { width: roundNum(dimW, 3), height: lp.deckT, depth: roundNum(dimD, 3) },
          coordinatesZUp: toZUpBox(pw, dimW, lp.deckT, dimD)
        };
      });
      const openings = lp.openings.map((op) => {
        const ow = localToWorld({ x: (op.xMin + op.xMax) * 0.5, y: lp.y, z: (op.zMin + op.zMax) * 0.5 }, anchor);
        const opLenX = op.xMax - op.xMin;
        const opLenZ = op.zMax - op.zMin;
        return {
          id: op.id,
          flightId: op.flightId,
          position: { x: roundNum(ow.x, 3), y: roundNum(ow.y, 3), z: roundNum(ow.z, 3) },
          dimensions: {
            width: roundNum(isLong ? opLenX : opLenZ, 3),
            height: lp.deckT,
            depth: roundNum(isLong ? opLenZ : opLenX, 3)
          }
        };
      });

      components.push({
        id: `fe_landing_f${f}`,
        type: 'landing',
        floor: f,
        elevation: lp.y,
        topSurfaceElevation: wTopY,
        position: { x: roundNum(wDeck.x, 3), y: lp.y, z: roundNum(wDeck.z, 3) },
        dimensions: {
          width: roundNum(lp.fullDeckW, 3),
          height: lp.deckT,
          depth: roundNum(lp.totalDeckD, 3)
        },
        walkablePanels,
        openings,
        orientation: { ...normal, yawDegrees },
        traversal: 'walkable_surface',
        coordinatesZUp: toZUpBox(wDeck, lp.fullDeckW, lp.deckT, lp.totalDeckD)
      });

      const railPos = { x: roundNum(wDeck.x, 3), y: roundNum(lp.y + 0.5, 3), z: roundNum(wDeck.z, 3) };
      components.push({
        id: `fe_rail_f${f}`,
        type: 'railing',
        floor: f,
        elevation: railPos.y,
        position: railPos,
        dimensions: { width: roundNum(lp.fullDeckW, 3), height: 1.0, depth: roundNum(lp.totalDeckD, 3) },
        hasLeftPortal: Boolean(lp.leftPortal),
        hasRightPortal: Boolean(lp.rightPortal),
        orientation: { ...normal, yawDegrees },
        traversal: 'barrier',
        coordinatesZUp: toZUpBox(railPos, lp.fullDeckW, 1.0, lp.totalDeckD)
      });

      clearanceVolumes.push({
        id: `fe_clearance_landing_f${f}`,
        type: 'landing_clearance',
        floor: f,
        elevation: lp.y,
        position: { x: railPos.x, y: roundNum(lp.y + 1.075, 3), z: railPos.z },
        dimensions: { width: roundNum(lp.fullDeckW, 3), height: 2.15, depth: roundNum(lp.totalDeckD, 3) },
        clearanceHeight: 2.15,
        traversal: 'clearance_volume'
      });
    }
  } else {
    for (let f = startFloor; f <= topFloor; f++) {
      const floorY = f * floorHeight;
      const anchor = getFireEscapeWallAnchor(mainSeg, side, placement.coord, placement.deckW);
      const posX = Number((anchor.x + normal.x * deckCenterDist).toFixed(3));
      const posY = Number(floorY.toFixed(3));
      const posZ = Number((anchor.z + normal.z * deckCenterDist).toFixed(3));

      const landingZUp = toZUpBox({ x: posX, y: posY, z: posZ }, placement.deckW, 0.12, deckDepth);

      components.push({
        id: `fe_landing_f${f}`,
        type: 'landing',
        floor: f,
        elevation: posY,
        position: { x: posX, y: posY, z: posZ },
        dimensions: { width: Number(placement.deckW.toFixed(3)), height: 0.12, depth: Number(deckDepth.toFixed(3)) },
        orientation: { ...normal, yawDegrees },
        traversal: 'walkable_surface',
        coordinatesZUp: landingZUp
      });

      const railPos = { x: posX, y: Number((floorY + 0.5).toFixed(3)), z: posZ };
      components.push({
        id: `fe_rail_f${f}`,
        type: 'railing',
        floor: f,
        elevation: railPos.y,
        position: railPos,
        dimensions: { width: Number(placement.deckW.toFixed(3)), height: 1.0, depth: Number(deckDepth.toFixed(3)) },
        orientation: { ...normal, yawDegrees },
        traversal: 'barrier',
        coordinatesZUp: toZUpBox(railPos, placement.deckW, 1.0, deckDepth)
      });

      clearanceVolumes.push({
        id: `fe_clearance_landing_f${f}`,
        type: 'landing_clearance',
        floor: f,
        elevation: posY,
        position: { x: posX, y: Number((floorY + 1.025).toFixed(3)), z: posZ },
        dimensions: { width: Number(placement.deckW.toFixed(3)), height: 2.05, depth: Number(deckDepth.toFixed(3)) },
        clearanceHeight: 2.05,
        traversal: 'clearance_volume'
      });
    }
  }

  if (cfg.fireEscapeTreads) {
    // When fireEscapeTreads is enabled: export flight descriptors and individual stair treads
    for (const fl of flightData.flights) {
      components.push({
        id: fl.id,
        type: 'stair_flight',
        floor: fl.floor,
        toFloor: fl.toFloor,
        elevation: fl.elevation,
        position: fl.position,
        dimensions: fl.dimensions,
        startPosition: fl.startPosition,
        endPosition: fl.endPosition,
        totalRise: fl.totalRise,
        totalRun: fl.totalRun,
        stepCount: fl.stepCount,
        risePerStep: fl.risePerStep,
        runPerStep: fl.runPerStep,
        orientation: fl.orientation,
        traversal: 'stair_flight',
        coordinatesZUp: fl.coordinatesZUp
      });
      for (const tr of fl.treads) {
        components.push(tr);
      }
      clearanceVolumes.push({
        id: `fe_clearance_flight_${fl.id}`,
        type: 'flight_clearance',
        floor: fl.floor,
        toFloor: fl.toFloor,
        startPosition: fl.startPosition,
        endPosition: fl.endPosition,
        clearanceWidth: flightData.stairWidth,
        clearanceHeight: 2.05,
        traversal: 'clearance_volume'
      });
    }

    if (flightData.intermediateLandings) {
      for (const midLanding of flightData.intermediateLandings) {
        components.push(midLanding);
        clearanceVolumes.push({
          id: `fe_clearance_${midLanding.id}`,
          type: 'landing_clearance',
          floor: midLanding.floor,
          elevation: midLanding.elevation,
          position: midLanding.position,
          dimensions: {
            width: midLanding.dimensions.width,
            height: 2.05,
            depth: midLanding.dimensions.depth
          },
          clearanceHeight: 2.05,
          traversal: 'clearance_volume'
        });
      }
    }
  } else {
    // Legacy envelope export for backwards compatibility
    for (let f = startFloor; f < topFloor; f++) {
      const floorY = f * floorHeight;
      const anchor = getFireEscapeWallAnchor(mainSeg, side, placement.coord, placement.deckW);
      components.push({
        id: `fe_stair_f${f}_to_f${f + 1}`,
        type: 'stair',
        floor: f,
        elevation: Number((floorY + floorHeight * 0.5).toFixed(3)),
        position: {
          x: Number((anchor.x + normal.x * (deckCenterDist * 0.9)).toFixed(3)),
          y: Number((floorY + floorHeight * 0.5).toFixed(3)),
          z: Number((anchor.z + normal.z * (deckCenterDist * 0.9)).toFixed(3))
        },
        dimensions: {
          width: flightData.stairWidth,
          height: Number(floorHeight.toFixed(3)),
          depth: Number((deckDepth * 0.85).toFixed(3))
        },
        orientation: { ...normal, yawDegrees },
        traversal: 'stair_ramp'
      });
    }
  }

  // Push structural support columns & diagonal braces
  if (Array.isArray(flightData.supports)) {
    for (const sup of flightData.supports) {
      components.push(sup);
    }
  }

  const ladderState = cfg.fireEscapeLadder || 'raised';
  const dropBotY = ladderState === 'lowered' ? 0.08 : 2.2;
  const dropTopY = floorHeight + 1.02;
  const dropHeight = Math.max(0.8, roundNum(dropTopY - dropBotY, 3));
  const dropY = roundNum(dropBotY + dropHeight * 0.5, 3);
  const groundAnchor = getFireEscapeWallAnchor(mainSeg, side, placement.coord, placement.deckW);
  const ladderW = 0.42 + flightData.extraLadderClearance;
  const ladderDist = deckDepth * 0.55;

  let dropLadderPos = null;
  if (ladderState !== 'stair') {
    if (!flightData.isLegacy && flightData.landingPlans?.[0]?.leftPortal) {
      const f1Plan = flightData.landingPlans[0];
      const lx = f1Plan.minDeckX - 0.06 - (flightData.extraLadderClearance > 0 ? flightData.extraLadderClearance * 0.5 : 0);
      const lz = f1Plan.leftPortal.centerZ;
      const wDrop = localToWorld({ x: lx, y: dropY, z: lz }, f1Plan.anchor);
      dropLadderPos = { x: roundNum(wDrop.x, 3), y: roundNum(dropY, 3), z: roundNum(wDrop.z, 3) };
    } else {
      dropLadderPos = {
        x: Number((groundAnchor.x + normal.x * ladderDist).toFixed(3)),
        y: Number(dropY.toFixed(3)),
        z: Number((groundAnchor.z + normal.z * ladderDist).toFixed(3))
      };
    }

    components.push({
      id: 'fe_ladder_drop',
      type: 'ladder',
      floor: 1,
      state: ladderState,
      elevation: Number(dropY.toFixed(3)),
      position: dropLadderPos,
      dimensions: {
        width: Number(ladderW.toFixed(3)),
        height: Number(dropHeight.toFixed(3)),
        depth: 0.18
      },
      orientation: { ...normal, yawDegrees },
      traversal: 'climbable_ladder',
      coordinatesZUp: toZUpBox(dropLadderPos, ladderW, dropHeight, 0.18)
    });

    clearanceVolumes.push({
      id: 'fe_clearance_ladder_drop',
      type: 'ladder_clearance',
      startPosition: { x: dropLadderPos.x, y: dropBotY, z: dropLadderPos.z },
      endPosition: { x: dropLadderPos.x, y: dropTopY, z: dropLadderPos.z },
      clearanceRadius: 0.35 + flightData.extraLadderClearance * 0.5,
      traversal: 'clearance_volume'
    });
  }

  let roofLadderPos = null;
  const roofDeckY = floors * floorHeight;
  if (cfg.fireEscapeRoofAccess !== false) {
    const topFloorY = topFloor * floorHeight;
    const parapetH = cfg.parapet ? (Number(cfg.parapetHeight) || 0.65) : 0.15;
    const roofLadderApexY = roundNum(roofDeckY + parapetH + 0.28, 3);
    const roofLadderHeight = roundNum(roofLadderApexY - topFloorY, 3);
    const roofLadderMidY = roundNum((topFloorY + roofLadderApexY) * 0.5, 3);
    const roofLadderW = 0.42 + flightData.extraLadderClearance;

    if (!flightData.isLegacy && flightData.landingPlans?.length > 0) {
      const topPlan = flightData.landingPlans[flightData.landingPlans.length - 1];
      const topPortal = topPlan.rightPortal || topPlan.leftPortal;
      const endSign = topPlan.rightPortal ? 1 : -1;
      const rx = (endSign > 0 ? topPlan.maxDeckX : topPlan.minDeckX) + endSign * (0.06 + (flightData.extraLadderClearance > 0 ? flightData.extraLadderClearance * 0.5 : 0));
      const rz = topPortal ? topPortal.centerZ : (topPlan.stepBackZ + Math.min(flightData.zInner + 0.06, deckDepth * 0.42));
      const wRoof = localToWorld({ x: rx, y: roofLadderMidY, z: rz }, topPlan.anchor);
      roofLadderPos = { x: roundNum(wRoof.x, 3), y: roofLadderMidY, z: roundNum(wRoof.z, 3) };
    } else {
      const topAnchor = getFireEscapeWallAnchor(mainSeg, side, placement.coord, placement.deckW);
      const roofLadderDist = Math.min(deckDepth * 0.55, 0.78) + (flightData.extraLadderClearance > 0 ? flightData.extraLadderClearance * 0.5 : 0);
      roofLadderPos = {
        x: Number((topAnchor.x + normal.x * roofLadderDist).toFixed(3)),
        y: roofLadderMidY,
        z: Number((topAnchor.z + normal.z * roofLadderDist).toFixed(3))
      };
    }

    components.push({
      id: 'fe_ladder_roof',
      type: 'ladder',
      floor: topFloor,
      state: 'fixed',
      elevation: roofLadderMidY,
      roofDeckElevation: Number(roofDeckY.toFixed(3)),
      apexElevation: roofLadderApexY,
      position: roofLadderPos,
      dimensions: {
        width: Number(roofLadderW.toFixed(3)),
        height: roofLadderHeight,
        depth: 0.35
      },
      orientation: { ...normal, yawDegrees },
      traversal: 'climbable_ladder',
      coordinatesZUp: toZUpBox(roofLadderPos, roofLadderW, roofLadderHeight, 0.35)
    });

    clearanceVolumes.push({
      id: 'fe_clearance_ladder_roof',
      type: 'ladder_clearance',
      startPosition: { x: roofLadderPos.x, y: topFloorY, z: roofLadderPos.z },
      endPosition: { x: roofLadderPos.x, y: roofDeckY, z: roofLadderPos.z },
      clearanceRadius: 0.35 + flightData.extraLadderClearance * 0.5,
      traversal: 'clearance_volume'
    });
  }

  // Traversal diagnostics and warnings
  const warnings = [];
  if (placement.deckW < 2.50) {
    warnings.push(`Restricted wall span (${placement.deckW.toFixed(2)}m) restricts fire escape turnaround platform clearance.`);
  }
  if (!flightData.isLegacy) {
    const steepest = flightData.flights.reduce((m, fl) => Math.max(m, fl.inclineDegrees || 0), 0);
    if (steepest > 54) {
      warnings.push(`Restricted wall span limits switchback horizontal run, increasing stair incline to ${steepest}°.`);
    }
    const headroomFail = (flightData.headroomChecks || []).find((h) => !h.adequate);
    if (headroomFail) {
      warnings.push(`Flight ${headroomFail.flightId} soffit headroom (${headroomFail.verifiedSoffitHeadroom}m) is below target.`);
    }
  }
  if (cfg.setback > 0 && floors > 4) {
    warnings.push(`Building setback of ${cfg.setback}m requires stepped transition landing traversal.`);
  }

  const profile = flightData.profile;
  const isLegacy = flightData.isLegacy;
  const isOneWay = Boolean(flightData.isOneWay);
  const effectivePortalW = (isLegacy && profile.ladderOpeningWidth <= 0)
    ? 0
    : roundNum(profile.ladderOpeningWidth + flightData.extraLadderClearance, 3);
  const actualWallClearance = Number((flightData.zInner - flightData.stairHW).toFixed(3));
  const minVerifiedHeadroom = (flightData.headroomChecks && flightData.headroomChecks.length > 0)
    ? Math.min(...flightData.headroomChecks.map((h) => h.verifiedSoffitHeadroom))
    : profile.headroom;

  const clearanceStandard = {
    profile: profile.id,
    label: profile.label,
    layoutPattern: isLegacy ? 'legacy_compact' : (isOneWay ? 'single_direction' : 'alternating_switchback'),
    playerWidth: profile.characterWidth,
    visualCharacterWidth: profile.characterWidth,
    collisionCapsuleDiameter: profile.capsuleDiameter,
    playerHeight: profile.playerHeight,
    stairClearWidth: flightData.stairWidth,
    stairWidth: flightData.stairWidth,
    landingDepth: flightData.deckD,
    turnaroundLength: flightData.turnPlatformX,
    ladderPortalWidth: effectivePortalW,
    ladderClearance: flightData.extraLadderClearance,
    wallClearance: actualWallClearance,
    laneSeparation: Number((flightData.flightGap || 0).toFixed(3)),
    verticalHeadroom: Number(minVerifiedHeadroom.toFixed(3)),
    margins: {
      stairMargin: roundNum(flightData.stairWidth - profile.capsuleDiameter, 3),
      ladderPortalMargin: roundNum(effectivePortalW - profile.capsuleDiameter, 3),
      turnaroundMargin: roundNum(flightData.turnPlatformX - profile.capsuleDiameter, 3),
      wallShutterMargin: roundNum(actualWallClearance - 0.22, 3),
      headroomMargin: roundNum(minVerifiedHeadroom - profile.playerHeight, 3)
    }
  };

  const traversalValidation = {
    status: warnings.length === 0 ? 'geometric_clearance_bounded' : 'geometric_clearance_constrained',
    disclaimer: 'Static geometric clearance envelopes verified without bounding collisions. Dynamic player navigation and movement physics require in-engine testing in B Remastered.',
    verifiedPassages: {
      stairPassage: {
        clearWidth: flightData.stairWidth,
        capsuleDiameter: profile.capsuleDiameter,
        margin: roundNum(flightData.stairWidth - profile.capsuleDiameter, 3),
        adequate: flightData.stairWidth >= profile.capsuleDiameter
      },
      ladderPortal: {
        clearWidth: effectivePortalW,
        capsuleDiameter: profile.capsuleDiameter,
        margin: roundNum(effectivePortalW - profile.capsuleDiameter, 3),
        adequate: isLegacy ? true : effectivePortalW >= profile.capsuleDiameter
      },
      turnaroundPlatform: {
        clearRun: flightData.turnPlatformX,
        capsuleDiameter: profile.capsuleDiameter,
        margin: roundNum(flightData.turnPlatformX - profile.capsuleDiameter, 3),
        adequate: flightData.turnPlatformX >= profile.capsuleDiameter
      },
      wallShutterStandoff: {
        standoff: actualWallClearance,
        shutterProjection: 0.22,
        margin: Number((actualWallClearance - 0.22).toFixed(3)),
        adequate: actualWallClearance >= 0.22
      },
      verticalHeadroom: {
        headroom: Number(minVerifiedHeadroom.toFixed(3)),
        playerHeight: profile.playerHeight,
        margin: roundNum(minVerifiedHeadroom - profile.playerHeight, 3),
        adequate: minVerifiedHeadroom >= profile.playerHeight
      }
    },
    headroomChecks: flightData.headroomChecks || [],
    envelopeCount: clearanceVolumes.length,
    warningCount: warnings.length
  };

  // Connected walking route waypoints from street to rooftop
  const waypoints = [];
  if (dropLadderPos) {
    waypoints.push({
      id: 'wp_street_drop_base',
      description: 'Ground level at drop ladder',
      elevation: ladderState === 'lowered' ? 0.08 : 2.2,
      position: { x: dropLadderPos.x, y: ladderState === 'lowered' ? 0.08 : 2.2, z: dropLadderPos.z }
    });
    waypoints.push({
      id: 'wp_f1_ladder_portal',
      description: 'Floor 1 landing ladder access portal',
      elevation: floorHeight + 0.12,
      position: { x: dropLadderPos.x, y: floorHeight + 0.12, z: dropLadderPos.z }
    });
  } else if (flightData.flights.length > 0 && flightData.flights[0].floor === 0) {
    waypoints.push({
      id: 'wp_street_stair_base',
      description: 'Ground level at fixed bottom stair entry',
      elevation: flightData.flights[0].startPosition.y,
      position: { ...flightData.flights[0].startPosition }
    });
  }

  for (let i = 0; i < flightData.flights.length; i++) {
    const fl = flightData.flights[i];
    waypoints.push({
      id: `wp_f${fl.floor}_flight_approach`,
      description: `Floor ${fl.floor} flight approach landing`,
      elevation: fl.startPosition.y,
      position: { x: fl.startPosition.x, y: fl.startPosition.y, z: fl.startPosition.z }
    });
    waypoints.push({
      id: `wp_f${fl.toFloor}_flight_arrival`,
      description: `Floor ${fl.toFloor} flight arrival platform`,
      elevation: fl.endPosition.y,
      position: { x: fl.endPosition.x, y: fl.endPosition.y, z: fl.endPosition.z }
    });
    if (isOneWay && i + 1 < flightData.flights.length) {
      const lp = (flightData.landingPlans || []).find((p) => p.floor === fl.toFloor);
      if (lp) {
        const innerZ = lp.stepBackZ + flightData.zInner;
        const wEast = localToWorld({ x: lp.maxDeckX - flightData.turnPlatformX * 0.5, y: lp.y, z: innerZ }, lp.anchor);
        const wWest = localToWorld({ x: lp.minDeckX + flightData.turnPlatformX * 0.5, y: lp.y, z: innerZ }, lp.anchor);
        waypoints.push({
          id: `wp_f${fl.toFloor}_platform_east`,
          description: `Floor ${fl.toFloor} inner walkway east turn`,
          elevation: roundNum(lp.y, 3),
          position: { x: roundNum(wEast.x, 3), y: roundNum(wEast.y, 3), z: roundNum(wEast.z, 3) }
        });
        waypoints.push({
          id: `wp_f${fl.toFloor}_platform_west`,
          description: `Floor ${fl.toFloor} inner walkway west turn`,
          elevation: roundNum(lp.y, 3),
          position: { x: roundNum(wWest.x, 3), y: roundNum(wWest.y, 3), z: roundNum(wWest.z, 3) }
        });
      }
    }
  }

  if (roofLadderPos) {
    waypoints.push({
      id: 'wp_roof_ladder_portal',
      description: 'Top floor roof access ladder portal',
      elevation: topFloor * floorHeight + 0.12,
      position: { x: roofLadderPos.x, y: topFloor * floorHeight + 0.12, z: roofLadderPos.z }
    });
    waypoints.push({
      id: 'wp_roof_deck_parapet',
      description: 'Rooftop parapet entry',
      elevation: Number(roofDeckY.toFixed(3)),
      position: { x: roofLadderPos.x, y: Number(roofDeckY.toFixed(3)), z: roofLadderPos.z }
    });
  }

  return {
    side: placement.side,
    layoutStyle: isLegacy ? 'legacy_compact' : (isOneWay ? 'single_direction' : 'alternating_switchback'),
    ladderPosition: ladderState,
    supportStyle: flightData.supportStyle || 'columns_and_braces',
    hasRoofAccess: cfg.fireEscapeRoofAccess !== false,
    treadsEnabled: Boolean(cfg.fireEscapeTreads),
    flightCount: flightData.flights.length,
    treadCount: flightData.allTreads.length,
    componentCount: components.length,
    components,
    flights: flightData.flights,
    supports: flightData.supports || [],
    clearanceStandard,
    traversalValidation,
    warnings,
    clearanceVolumes,
    walkableRoutes: [
      {
        id: 'fe_route_street_to_roof',
        name: 'Street to Rooftop Traversal Route',
        status: warnings.length === 0 ? 'geometric_clearance_bounded' : 'geometric_clearance_constrained',
        connected: warnings.length === 0,
        disclaimer: 'Geometric clearance bounded; dynamic traversal requires live in-engine verification.',
        waypoints
      }
    ]
  };
}

export function computeBuildingWindows(cfg, groundSegmentsInput = null, tallLayout = null) {
  const groundSegments = groundSegmentsInput || segmentsForFloor(cfg, 0);
  const primary = groundSegments[0];
  if (!primary) return { totalWindows: 0, litWindows: 0, windows: [] };

  const windows = [];
  const time = cfg.windowLightingTime || 'day';
  const profile = cfg.windowLightingProfile || 'auto';
  const baseLighting = Number.isFinite(Number(cfg.windowLighting)) ? Number(cfg.windowLighting) : 0.2;
  const floorHeight = Number(cfg.floorHeight) || 3.3;
  const floors = Number(cfg.floors) || 5;
  const windowWidth = Number(cfg.windowWidth) || 1.4;
  const windowHeight = Number(cfg.windowHeight) || 1.85;

  let timeMultiplier = 0.2;
  if (time === 'golden_hour') timeMultiplier = 0.45;
  else if (time === 'evening') timeMultiplier = 0.85;
  else if (time === 'night') timeMultiplier = 0.55;
  else if (time === 'late_night') timeMultiplier = 0.15;
  else if (time === 'morning') timeMultiplier = 0.4;
  else if (time === 'day') timeMultiplier = profile === 'commercial' ? 0.75 : 0.12;

  const litProbability = clamp(baseLighting * (timeMultiplier / 0.2), 0, 1);

  for (let f = 0; f < floors; f++) {
    const segs = segmentsForFloor(cfg, f);
    const seg = segs[0];
    if (!seg) continue;
    const floorY = f * floorHeight + floorHeight * 0.55;

    const facades = ['front', 'back', 'left', 'right'];
    for (const side of facades) {
      if (seg.skipWalls?.[side]) continue;
      const isLong = side === 'front' || side === 'back';
      const colCount = isLong ? (cfg.windowsX || 4) : (cfg.windowsSide || 3);
      const wallLen = isLong ? seg.w : seg.d;
      const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
      const avail = wallLen - cut - 0.8;
      if (avail < 1.2 || colCount <= 0) continue;

      const spacing = avail / colCount;
      const startCoord = (isLong ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.4 + spacing * 0.5;

      for (let c = 0; c < colCount; c++) {
        const coord = startCoord + c * spacing;
        const tallBlocked = tallLayout && tallLayout.feasible && tallLayout.side === side
          ? tallLayout.floorExclusions?.get(f)
          : null;
        if (tallBlocked && tallBlocked.some(([bMin, bMax]) => intervalsOverlap(coord - windowWidth * 0.5, coord + windowWidth * 0.5, bMin, bMax, 0.05))) {
          continue;
        }
        const winId = `win_f${f}_${side}_c${c}`;
        const roomIndex = Math.floor(c / 2);
        const roomId = `room_f${f}_${side}_${roomIndex}`;

        // Believable room-level occupancy: windows in the same room light up together deterministically
        const roomHash = Math.abs((((cfg.seed || 1337) * 7919 + f * 1013 + roomIndex * 271 + side.charCodeAt(0) * 43) % 10000) / 10000);
        const isRoomLit = roomHash < litProbability;
        const isLit = isRoomLit && (profile === 'commercial' ? ((((c * 17) % 10) / 10) < 0.92) : true);

        const posX = isLong ? coord : (side === 'left' ? seg.x - seg.w * 0.5 : seg.x + seg.w * 0.5);
        const posZ = isLong ? (side === 'front' ? seg.z + seg.d * 0.5 : seg.z - seg.d * 0.5) : coord;

        windows.push({
          id: winId,
          floor: f,
          facade: side,
          column: c,
          roomId,
          position: {
            x: Number(posX.toFixed(3)),
            y: Number(floorY.toFixed(3)),
            z: Number(posZ.toFixed(3))
          },
          dimensions: {
            width: Number(windowWidth.toFixed(3)),
            height: Number(windowHeight.toFixed(3))
          },
          style: cfg.windowStyle || 'sash',
          isLit,
          hasCurtains: Boolean(cfg.curtains),
          hasShutters: Boolean(cfg.shutters)
        });
      }
    }
  }

  const litCount = windows.filter((w) => w.isLit).length;
  return {
    totalWindows: windows.length,
    litWindows: litCount,
    lightingMode: time,
    occupancyProfile: profile,
    windows
  };
}
