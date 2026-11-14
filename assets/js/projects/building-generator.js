/* B Remastered - 3D Building Generator */
(function () {
  'use strict';


const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const copy = (value) => JSON.parse(JSON.stringify(value));

const rng32 = (seed) => {
  let a = (seed >>> 0) || 1337;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randBetween = (r, a, b) => a + (b - a) * r();

const randInt = (r, a, b) => Math.floor(randBetween(r, a, b + 1));

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const colorHex = (value) => (/^#[a-f\d]{6}$/i.test(value) ? value : '#777777');

const hexToRgb = (hex) => {
  const clean = colorHex(hex).slice(1);
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const roundNum = (val, decimals = 4) => {
  const f = Math.pow(10, decimals);
  return Math.round((Number(val) || 0) * f) / f;
};

function hashBlueprintString(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
}


function subtractIntervals(start, end, blocked = []) {
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

function intervalsOverlap(aMin, aMax, bMin, bMax, pad = 0) {
  return Math.max(aMin, bMin) - pad < Math.min(aMax, bMax);
}

function makeSeg(x, z, w, d, props = {}) {
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

function segmentsForFloor(cfg, index) {
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

function chooseFireEscapePlacement(groundSegments, cfg, r) {
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

function getFireEscapeWallAnchor(seg, side, desiredCoord, deckW) {
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

const B_UNITS_PER_METER = 16.4042;

const CLEARANCE_PROFILES = {
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

function resolveClearanceProfile(profileOrFactor) {
  if (typeof profileOrFactor === 'string') {
    if (CLEARANCE_PROFILES[profileOrFactor]) return CLEARANCE_PROFILES[profileOrFactor];
    if (profileOrFactor === 'large') return CLEARANCE_PROFILES.generous;
  }
  if (typeof profileOrFactor === 'number' && profileOrFactor > 1.05) {
    return CLEARANCE_PROFILES.generous;
  }
  return CLEARANCE_PROFILES.legacy;
}

function computeFireEscapeFlights(cfg, groundSegments, placement) {
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

function computeFireEscapeMetadata(groundSegments, placement, cfg) {
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

function computeBuildingWindows(cfg, groundSegmentsInput = null, tallLayout = null) {
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


const STRAIGHT_RUN_UNITS_PER_METER = 16.404199475065617;

const STRAIGHT_RUN_PROFILE = {
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

function computeRoofDeckAndParapetTop(cfg) {
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

  // Exclude occluded spans cleanly if non-trivial
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

function computeStraightRunFireEscape(groundSegments, placement, cfg) {
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

  // Distribute slack cleanly across landings up to preferred sizes
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

function chooseTallStaircasePlacement(groundSegments, cfg, conventionalPlacement = null) {
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

function computeTallStaircaseLayout(groundSegments, cfg, conventionalPlacement = null) {
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

function isWallPointBlockedByTallStaircase(tallLayout, side, floorIndex, centerCoord, halfWidth) {
  if (!tallLayout || !tallLayout.feasible || tallLayout.side !== side) return false;
  const bands = tallLayout.floorExclusions.get(floorIndex);
  if (!bands || !bands.length) return false;
  return bands.some(([bMin, bMax]) => intervalsOverlap(centerCoord - halfWidth, centerCoord + halfWidth, bMin, bMax, 0.05));
}

function summarizeTallStaircaseMetadata(tallLayout) {
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


const ROOFTOP_B_UNITS_PER_METER = 16.404199475065617;

function buildColliderEntry({
  id,
  category,
  part = 'body',
  shape = 'box',
  x,
  y,
  z,
  width,
  height,
  depth,
  radius = null
}) {
  const rx = roundNum(x, 4);
  const ry = roundNum(y, 4);
  const rz = roundNum(z, 4);
  const rw = roundNum(width, 4);
  const rh = roundNum(height, 4);
  const rd = roundNum(depth, 4);

  const zUpX = rx;
  const zUpY = roundNum(-rz, 4);
  const zUpZ = ry;

  const minX = roundNum(zUpX - rw * 0.5, 4);
  const maxX = roundNum(zUpX + rw * 0.5, 4);
  const minY = roundNum(zUpY - rd * 0.5, 4);
  const maxY = roundNum(zUpY + rd * 0.5, 4);
  const minZ = roundNum(zUpZ - rh * 0.5, 4);
  const maxZ = roundNum(zUpZ + rh * 0.5, 4);

  const U = ROOFTOP_B_UNITS_PER_METER;
  return {
    id,
    category,
    part,
    shape,
    solid: true,
    traversal: 'barrier',
    ...(radius !== null ? { radius: roundNum(radius, 4) } : {}),
    position: { x: rx, y: ry, z: rz },
    dimensions: { width: rw, height: rh, depth: rd },
    coordinatesZUp: {
      position: { x: zUpX, y: zUpY, z: zUpZ },
      dimensions: { width: rw, depth: rd, height: rh },
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      bGameUnits: {
        position: {
          x: roundNum(zUpX * U, 3),
          y: roundNum(zUpY * U, 3),
          z: roundNum(zUpZ * U, 3)
        },
        dimensions: {
          width: roundNum(rw * U, 3),
          depth: roundNum(rd * U, 3),
          height: roundNum(rh * U, 3)
        },
        boundsMinMax: [
          roundNum(minX * U, 3),
          roundNum(minY * U, 3),
          roundNum(minZ * U, 3),
          roundNum(maxX * U, 3),
          roundNum(maxY * U, 3),
          roundNum(maxZ * U, 3)
        ]
      }
    },
    localBoxMeters: [minX, minY, minZ, maxX, maxY, maxZ]
  };
}

function computeDeterministicRooftopLayout(cfg, topSegments, groundMain = null) {
  const segs = Array.isArray(topSegments) ? topSegments : [];
  if (!segs.length) {
    return {
      roofDeckY: 0,
      colliders: [],
      fixtures: [],
      cableAnchors: [],
      hvacPositions: [],
      antenna: null,
      pipes: null,
      headhouse: null,
      waterTank: null,
      ventilationFans: [],
      roofHatch: null
    };
  }

  const baseHeight = roundNum((Number(cfg.floors) || 4) * (Number(cfg.floorHeight) || 3.4), 4);
  const r = rng32(((Number(cfg.seed) || 1337) + 7919) >>> 0);
  const mainSeg = segs[0];
  const cut = mainSeg.cornerCut || 0;
  const isPitched = cfg.roofType === 'pitched';
  const pitchedW = mainSeg.w - cut;
  const ridgeH = isPitched ? Math.min(2.6, Math.max(1.4, Math.min(pitchedW, mainSeg.d) * 0.26)) : 0;
  const roofLift = cfg.roofType === 'mansard'
    ? 0.84
    : cfg.roofType === 'stepped'
      ? 0.70
      : (isPitched ? ridgeH * 0.55 : 0);
  const roofDeckY = roundNum(baseHeight + roofLift, 4);

  const insetMargin = (cfg.roofType === 'mansard' || cfg.roofType === 'stepped') ? 1.8 : 1.4;
  const safeBounds = (seg, margin) => ({
    minX: seg.x - seg.w * 0.5 + margin,
    maxX: seg.x + seg.w * 0.5 - (seg.cornerCut || 0) - margin,
    minZ: seg.z - seg.d * 0.5 + margin,
    maxZ: seg.z + seg.d * 0.5 - (seg.cornerCut || 0) - margin
  });

  const b0 = safeBounds(mainSeg, insetMargin);
  const colliders = [];
  const fixtures = [];
  const cableAnchors = [];

  const placedFootprints = [];
  const overlapsExisting = (px, pz, halfW, halfD, pad = 0.22) => placedFootprints.some((fp) => (
    Math.abs(px - fp.x) < (halfW + fp.hw + pad) &&
    Math.abs(pz - fp.z) < (halfD + fp.hd + pad)
  ));
  const recordFootprint = (px, pz, halfW, halfD) => {
    placedFootprints.push({ x: px, z: pz, hw: halfW, hd: halfD });
  };

  // 1. Rooftop stairwell headhouse
  let headhouse = null;
  const headW = Number(cfg.roofAccessWidth) || 2.4;
  const headD = Number(cfg.roofAccessDepth) || 3.2;
  const headH = Number(cfg.roofAccessHeight) || 2.3;
  const headHx = 0;
  const headHz = clamp(-mainSeg.d * 0.15, -mainSeg.d * 0.5 + headD * 0.5 + 0.8, mainSeg.d * 0.5 - headD * 0.5 - 0.8);

  if (cfg.roofAccess) {
    headhouse = {
      id: 'roof_headhouse',
      x: headHx,
      baseY: baseHeight,
      z: headHz,
      width: headW,
      height: headH,
      depth: headD,
      roofStyle: cfg.roofAccessRoof || 'flat',
      doorSide: cfg.roofAccessDoorSide || 'front',
      style: cfg.roofAccessStyle || 'brick'
    };
    recordFootprint(headHx, headHz, headW * 0.5, headD * 0.5);
    const roofCapH = headhouse.roofStyle === 'sloped' ? 0.14 : 0.12;
    const totalHeadH = roundNum(headH + roofCapH, 4);
    const headCol = buildColliderEntry({
      id: 'roof_headhouse',
      category: 'headhouse',
      shape: 'box',
      x: headHx,
      y: baseHeight + totalHeadH * 0.5,
      z: headHz,
      width: headW,
      height: totalHeadH,
      depth: headD
    });
    colliders.push(headCol);
    fixtures.push({ id: 'roof_headhouse', category: 'headhouse', colliderIds: [headCol.id] });
  }

  const isInsideHeadhouse = (px, pz, radius = 0.5) => {
    if (!cfg.roofAccess) return false;
    return Math.abs(px - headHx) < (headW * 0.5 + radius) && Math.abs(pz - headHz) < (headD * 0.5 + radius);
  };

  // 2. Rooftop water tank
  let waterTank = null;
  if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    let tx = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
    let tz = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    if (isInsideHeadhouse(tx, tz, 1.45)) {
      const rightX = clamp(headHx + headW * 0.5 + 1.45, b0.minX, b0.maxX);
      if (rightX - (headHx + headW * 0.5) >= 1.25) tx = rightX;
      else tz = clamp(headHz + headD * 0.5 + 1.6, b0.minZ, b0.maxZ);
    }
    const legBaseH = isPitched ? 2.4 : 1.8;
    waterTank = {
      id: 'roof_water_tank',
      x: roundNum(tx, 4),
      baseY: roofDeckY,
      z: roundNum(tz, 4),
      legBaseH
    };
    recordFootprint(tx, tz, 1.22, 1.22);

    const legMinY = roofDeckY + 0.58 - legBaseH * 0.5;
    const legTopY = roofDeckY + 0.58 + legBaseH * 0.5;
    const clippedMinY = Math.max(roofDeckY, legMinY);
    const supportH = Math.max(0.2, legTopY - clippedMinY);
    const supportCol = buildColliderEntry({
      id: 'roof_water_tank_supports',
      category: 'water_tank',
      part: 'supports',
      shape: 'box',
      x: tx,
      y: clippedMinY + supportH * 0.5,
      z: tz,
      width: 1.44,
      height: supportH,
      depth: 1.44
    });

    const barrelMinY = roofDeckY + 2.22 - 1.35 * 0.5;
    const barrelMaxY = roofDeckY + 2.98 + 0.25 * 0.5;
    const barrelH = barrelMaxY - barrelMinY;
    const barrelCol = buildColliderEntry({
      id: 'roof_water_tank_barrel',
      category: 'water_tank',
      part: 'barrel',
      shape: 'cylinder_bounds',
      radius: 1.18,
      x: tx,
      y: barrelMinY + barrelH * 0.5,
      z: tz,
      width: 2.36,
      height: barrelH,
      depth: 2.36
    });
    colliders.push(supportCol, barrelCol);
    fixtures.push({ id: 'roof_water_tank', category: 'water_tank', colliderIds: [supportCol.id, barrelCol.id] });
    cableAnchors.push([tx, roofDeckY + 2.5, tz]);
  }

  // 3. Rooftop ventilation fans (explicit placement)
  const ventilationFans = [];
  if (cfg.rooftopVents) {
    for (let i = 0; i < 2; i++) {
      const vx = mainSeg.x + (i === 0 ? -1 : 1) * (mainSeg.w * 0.28);
      const vz = mainSeg.z + (i === 0 ? 1 : -1) * (mainSeg.d * 0.22);
      const id = `roof_vent_fan_${i + 1}`;
      ventilationFans.push({ id, x: roundNum(vx, 4), baseY: baseHeight, z: roundNum(vz, 4) });
      recordFootprint(vx, vz, 0.6, 0.6);
      const fanCol = buildColliderEntry({
        id,
        category: 'ventilation_fan',
        shape: 'box',
        x: vx,
        y: baseHeight + 0.545,
        z: vz,
        width: 1.15,
        height: 1.09,
        depth: 1.15
      });
      colliders.push(fanCol);
      fixtures.push({ id, category: 'ventilation_fan', colliderIds: [fanCol.id] });
    }
  }

  // 4. Maintenance roof hatch
  let roofHatch = null;
  if (cfg.rooftopHatch) {
    const hx = mainSeg.x - mainSeg.w * 0.28;
    const hz = mainSeg.z + mainSeg.d * 0.28;
    roofHatch = { id: 'roof_hatch_1', x: roundNum(hx, 4), baseY: baseHeight, z: roundNum(hz, 4) };
    recordFootprint(hx, hz, 0.6, 0.6);
    const hatchCol = buildColliderEntry({
      id: 'roof_hatch_1',
      category: 'roof_hatch',
      shape: 'box',
      x: hx,
      y: baseHeight + 0.205,
      z: hz,
      width: 1.15,
      height: 0.41,
      depth: 1.15
    });
    colliders.push(hatchCol);
    fixtures.push({ id: 'roof_hatch_1', category: 'roof_hatch', colliderIds: [hatchCol.id] });
  }

  // 5. Chimneys
  const chimneys = [];
  const chimneyCount = Math.max(0, Math.round(Number(cfg.chimneys) || 0));
  for (let i = 0; i < chimneyCount; i++) {
    const seg = pick(r, segs);
    const b = safeBounds(seg, 0.9);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    let cx = randBetween(r, b.minX, b.maxX);
    let cz = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(cx, cz, 0.65)) {
      cz = clamp(headHz + headD * 0.5 + 0.8, b.minZ, b.maxZ);
    }
    if (overlapsExisting(cx, cz, 0.41, 0.37)) {
      // Shift along Z to avoid colliding with previously placed solid fixtures
      const shifted = cz + 1.25 <= b.maxZ ? cz + 1.25 : cz - 1.25;
      cz = clamp(shifted, b.minZ, b.maxZ);
    }
    const chimH = isPitched ? 2.2 : 1.4;
    const id = `roof_chimney_${i + 1}`;
    const chimMinY = baseHeight;
    const chimCapTopY = baseHeight + chimH + 0.145;
    chimneys.push({
      id,
      x: roundNum(cx, 4),
      baseY: baseHeight,
      z: roundNum(cz, 4),
      chimH,
      shaftW: 0.62,
      shaftD: 0.55,
      capW: 0.81,
      capH: 0.15,
      capD: 0.74
    });
    recordFootprint(cx, cz, 0.41, 0.37);

    const shaftCol = buildColliderEntry({
      id: `${id}_shaft`,
      category: 'chimney',
      part: 'shaft',
      shape: 'box',
      x: cx,
      y: baseHeight + chimH * 0.5,
      z: cz,
      width: 0.62,
      height: chimH,
      depth: 0.55
    });
    const capCol = buildColliderEntry({
      id: `${id}_cap`,
      category: 'chimney',
      part: 'cap',
      shape: 'box',
      x: cx,
      y: baseHeight + chimH + 0.07,
      z: cz,
      width: 0.81,
      height: 0.15,
      depth: 0.74
    });
    colliders.push(shaftCol, capCol);
    fixtures.push({
      id,
      category: 'chimney',
      elevationRange: [roundNum(chimMinY, 4), roundNum(chimCapTopY, 4)],
      colliderIds: [shaftCol.id, capCol.id]
    });
    cableAnchors.push([cx, baseHeight + chimH * 0.85, cz]);
  }

  // 6. Rooftop HVAC / mechanical units & exhaust vents
  const hvacUnits = [];
  const exhaustVents = [];
  const hvacPositions = [];
  const units = Math.round((Number(cfg.rooftopProps) || 0) * 8);
  for (let i = 0; i < units; i++) {
    const seg = pick(r, segs);
    const b = safeBounds(seg, insetMargin);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    const x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
    let z = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(x, z, 0.8)) continue;
    const propBaseY = isPitched ? roundNum(baseHeight + ridgeH - 0.15, 4) : roofDeckY;
    if (r() < 0.67) {
      const uw = roundNum(randBetween(r, 0.7, 1.4), 4);
      const ud = roundNum(randBetween(r, 0.7, 1.2), 4);
      if (overlapsExisting(x, z, uw * 0.5, ud * 0.5, 0.15)) {
        const altZ = z - (ud + 0.5) >= b.minZ ? z - (ud + 0.5) : z + (ud + 0.5);
        z = clamp(altZ, b.minZ, b.maxZ);
      }
      const id = `roof_hvac_${hvacUnits.length + 1}`;
      hvacUnits.push({ id, x: roundNum(x, 4), baseY: propBaseY, z: roundNum(z, 4), w: uw, h: 0.8, d: ud });
      recordFootprint(x, z, uw * 0.5, ud * 0.5);
      const col = buildColliderEntry({
        id,
        category: 'hvac_unit',
        shape: 'box',
        x,
        y: propBaseY + 0.4,
        z,
        width: uw,
        height: 0.8,
        depth: ud
      });
      colliders.push(col);
      fixtures.push({ id, category: 'hvac_unit', colliderIds: [col.id] });
      hvacPositions.push([x, propBaseY, z]);
      cableAnchors.push([x, propBaseY + 0.76, z]);
    } else {
      if (overlapsExisting(x, z, 0.45, 0.45, 0.15)) {
        const altZ = z + 1.1 <= b.maxZ ? z + 1.1 : z - 1.1;
        z = clamp(altZ, b.minZ, b.maxZ);
      }
      const id = `roof_exhaust_${exhaustVents.length + 1}`;
      exhaustVents.push({ id, x: roundNum(x, 4), baseY: propBaseY, z: roundNum(z, 4), radius: 0.45, height: 0.54 });
      recordFootprint(x, z, 0.45, 0.45);
      const col = buildColliderEntry({
        id,
        category: 'exhaust_vent',
        shape: 'cylinder_bounds',
        radius: 0.45,
        x,
        y: propBaseY + 0.27,
        z,
        width: 0.90,
        height: 0.54,
        depth: 0.90
      });
      colliders.push(col);
      fixtures.push({ id, category: 'exhaust_vent', colliderIds: [col.id] });
    }
  }

  // 7. Decorative-only antenna & pipes (not emitted into solid colliders)
  let antenna = null;
  if (cfg.antennas && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const ax = isPitched ? mainSeg.x - cut * 0.5 : clamp(mainSeg.x - mainSeg.w * 0.28, b0.minX, b0.maxX);
    const az = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    const antBaseY = isPitched ? roundNum(baseHeight + ridgeH, 4) : roofDeckY;
    antenna = { x: roundNum(ax, 4), baseY: antBaseY, z: roundNum(az, 4) };
    cableAnchors.push([ax, antBaseY + 2.1, az]);
  }

  const cableSags = [];
  for (let i = 0; i < cableAnchors.length - 1; i++) {
    cableSags.push(roundNum(randBetween(r, 0.22, 0.48), 4));
  }

  return {
    baseHeight,
    roofDeckY,
    isPitched,
    ridgeH,
    mainSeg,
    groundMain,
    colliders,
    fixtures,
    headhouse,
    waterTank,
    ventilationFans,
    roofHatch,
    chimneys,
    hvacUnits,
    exhaustVents,
    antenna,
    cableAnchors,
    cableSags,
    hvacPositions
  };
}

function computeRooftopStructuresMetadata(cfg, topSegments, groundMain = null, includeColliders = false) {
  const baseSummary = {
    hasHeadhouse: Boolean(cfg.roofAccess),
    headhouseStyle: cfg.roofAccess ? cfg.roofAccessStyle : null,
    hasWaterTank: Boolean(cfg.rooftopWaterTank),
    hasVents: Boolean(cfg.rooftopVents),
    hasHatch: Boolean(cfg.rooftopHatch),
    hasWalkways: Boolean(cfg.rooftopWalkways),
    hasSafetyRailings: Boolean(cfg.safetyRailings)
  };

  if (!includeColliders) {
    return baseSummary;
  }

  const layout = computeDeterministicRooftopLayout(cfg, topSegments, groundMain);
  return {
    ...baseSummary,
    hasColliders: true,
    colliderCount: layout.colliders.length,
    fixtureCount: layout.fixtures.length,
    roofDeckElevation: layout.roofDeckY,
    excludedDecorativeDetails: [
      ...(cfg.antennas ? ['antenna_masts'] : []),
      ...(cfg.rooftopPipes ? ['thin_conduits_and_cables'] : []),
      ...(cfg.rooftopWalkways ? ['flush_walkway_planks'] : [])
    ],
    fixtures: layout.fixtures,
    colliders: layout.colliders
  };
}


function resolveDoorDimensions(cfg, wide = false) {
  const floorHeight = Number(cfg?.floorHeight) || 3.2;
  const doorScale = Number(cfg?.doorScale) > 0 ? Number(cfg.doorScale) : 1.0;
  const baseW = wide ? 1.76 : 1.06;
  const baseH = wide
    ? clamp(floorHeight * 0.60, 2.04, 2.22)
    : clamp(floorHeight * 0.57, 1.96, 2.12);
  const width = Number(cfg?.doorWidth) > 0 ? Number(cfg.doorWidth) : Number((baseW * doorScale).toFixed(4));
  const height = Number(cfg?.doorHeight) > 0 ? Number(cfg.doorHeight) : Number((baseH * doorScale).toFixed(4));
  return { baseW, baseH, doorScale, width, height };
}

function resolvePrimaryStoopMetrics(doorStyle, wideDoor, doorWidth, steps) {
  const stepH = 0.135;
  const stepD = 0.27;
  const landingD = doorStyle === 'stoop' ? 0.82 : 0.58;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor
    ? clamp(Number((doorWidth + 0.72).toFixed(3)), 2.0, 2.8)
    : clamp(Number((doorWidth + 0.66).toFixed(3)), 1.5, 2.1);
  return { stepH, stepD, landingD, totalRise, totalStepDepth, stoopW };
}

function computeDefaultEntranceGameplay(cfg) {
  const groundUse = cfg.groundUse || 'residential';
  const doorStyle = cfg.doorStyle || 'stoop';
  const rawSteps = Number.isFinite(Number(cfg.entranceSteps)) ? Number(cfg.entranceSteps) : 3;
  const wideDoor = doorStyle === 'double' || groundUse === 'lobby' || groundUse === 'shop';
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, wideDoor);
  const steps = groundUse === 'shop' ? 0 : (doorStyle === 'stoop' ? Math.max(1, rawSteps) : rawSteps);
  const { totalRise, totalStepDepth, stoopW } = resolvePrimaryStoopMetrics(doorStyle, wideDoor, doorWidth, steps);

  const triggerWidth = Number(clamp(Math.max(doorWidth + 0.72, steps > 0 ? stoopW : 2.0), 1.0, 8.0).toFixed(1));
  const triggerHeight = Number(clamp(Math.max(2.2, doorHeight + totalRise + 0.30), 1.8, 6.0).toFixed(1));
  const triggerDepth = Number(clamp(Math.max(1.6, totalStepDepth + 1.25), 1.0, 8.0).toFixed(1));

  let entranceCategory = 'apartment';
  let interactionLabel = 'Enter Building';
  if (groundUse === 'shop') {
    entranceCategory = 'shop';
    interactionLabel = 'Enter Shop';
  } else if (groundUse === 'lobby') {
    entranceCategory = 'generic';
    interactionLabel = 'Enter Lobby';
  } else if (cfg.style === 'abandoned') {
    entranceCategory = 'mission';
    interactionLabel = 'Enter Hideout';
  }

  return {
    entranceEnabled: true,
    entranceCategory,
    interactionDistance: 2.5,
    triggerWidth,
    triggerHeight,
    triggerDepth,
    entranceLocked: cfg.style === 'abandoned' && (Number(cfg.damage) || 0) >= 0.45,
    interactionLabel
  };
}

function computePrimaryEntranceLayout(seg, cfg) {
  const cut = seg.cornerCut || 0;
  const usableW = seg.w - cut;
  const cx = seg.x - cut * 0.5;
  const wallZ = seg.z + seg.d * 0.5;
  const wideDoor = cfg.doorStyle === 'double' || cfg.groundUse === 'lobby' || cfg.groundUse === 'shop';
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, wideDoor);
  const steps = cfg.groundUse === 'shop' ? 0 : (cfg.doorStyle === 'stoop' ? Math.max(1, cfg.entranceSteps) : cfg.entranceSteps);
  const { stepH, stepD, landingD, totalRise, totalStepDepth, stoopW } = resolvePrimaryStoopMetrics(
    cfg.doorStyle || 'stoop',
    wideDoor,
    doorWidth,
    steps
  );
  return {
    cut,
    usableW,
    cx,
    wallZ,
    wideDoor,
    doorWidth,
    doorHeight,
    steps,
    stepH,
    stepD,
    landingD,
    totalRise,
    totalStepDepth,
    stoopW,
    rotY: 0,
    normal: { x: 0, y: 0, z: 1 },
    facade: 'front'
  };
}

function computeCornerEntranceLayout(seg, cfg) {
  const cut = seg.cornerCut || 0;
  const cx = seg.x + seg.w * 0.5 - cut * 0.5;
  const cz = seg.z + seg.d * 0.5 - cut * 0.5;
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, false);
  const rotY = Math.PI / 4;
  const invSqrt2 = Math.SQRT1_2;
  return {
    cut,
    cx,
    wallZ: cz,
    wideDoor: false,
    doorWidth,
    doorHeight,
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0,
    totalRise: 0,
    totalStepDepth: 0,
    stoopW: 0,
    rotY,
    normal: { x: invSqrt2, y: 0, z: invSqrt2 },
    facade: 'corner_front_right'
  };
}

function computeRearEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  const rearExt = groundSegments.find((s) => s.isExtension && s.extIndex === 0);
  const targetSeg = rearExt || primary;
  const segIndex = groundSegments.indexOf(targetSeg);
  const segId = segIndex === 0 ? 'segment_0_main' : `segment_${segIndex}_ext_${targetSeg.extIndex ?? 0}`;

  let cx = targetSeg.x;
  if (!rearExt) {
    const spanStart = primary.x - primary.w * 0.5 + 0.4;
    const spanEnd = primary.x + primary.w * 0.5 - 0.4;
    const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.back || []);
    if (spans.length > 0) {
      spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      cx = (spans[0][0] + spans[0][1]) * 0.5;
    }
  }

  const wallZ = targetSeg.z - targetSeg.d * 0.5;
  const style = cfg.rearDoorStyle || 'single';
  const wideDoor = style === 'double';
  const doorWidth = wideDoor ? 1.66 : (style === 'metal' ? 1.06 : 1.04);
  const doorHeight = clamp(cfg.floorHeight * 0.57, 1.96, 2.12);
  const stepH = 0.12;
  const stepD = 0.27;
  const landingD = 0.58;
  const steps = 1;

  return {
    cut: 0,
    usableW: targetSeg.w,
    cx,
    wallZ,
    wideDoor,
    doorWidth,
    doorHeight,
    steps,
    stepH,
    stepD,
    landingD,
    totalRise: stepH,
    totalStepDepth: landingD,
    stoopW: doorWidth + 0.5,
    rotY: Math.PI,
    normal: { x: 0, y: 0, z: -1 },
    facade: 'back',
    segmentIndex: segIndex,
    segmentId: segId
  };
}

function computeSideEntranceLayout(groundSegments, cfg, side = 'left') {
  const primary = groundSegments[0];
  if (!primary) return null;
  const cut = side === 'right' ? (primary.cornerCut || 0) : 0;
  const spanStart = primary.z - primary.d * 0.5 + 0.45;
  const spanEnd = primary.z + primary.d * 0.5 - cut - 0.45;
  const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.[side] || []);
  if (spans.length === 0) return null;
  spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const cz = (spans[0][0] + spans[0][1]) * 0.5;
  const cx = side === 'left' ? primary.x - primary.w * 0.5 : primary.x + primary.w * 0.5;
  const rotY = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
  const normal = side === 'left' ? { x: -1, y: 0, z: 0 } : { x: 1, y: 0, z: 0 };
  const doorWidth = 1.35;
  const doorHeight = clamp(cfg.floorHeight * 0.65, 2.1, 2.4);
  const stepH = 0.12;
  const stepD = 0.35;
  const landingD = 0.65;

  return {
    cut: 0,
    usableW: spans[0][1] - spans[0][0],
    cx,
    wallZ: cz,
    wideDoor: false,
    doorWidth,
    doorHeight,
    steps: 1,
    stepH,
    stepD,
    landingD,
    totalRise: stepH,
    totalStepDepth: landingD,
    stoopW: doorWidth + 0.5,
    rotY,
    normal,
    facade: side,
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

function computeBasementEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  const cut = primary.cornerCut || 0;
  const mainCx = primary.x - cut * 0.5;
  const minClearX = primary.x - primary.w * 0.5 + 0.9;
  const offsetDistance = Math.max(2.4, primary.w * 0.28);
  const cx = clamp(mainCx - offsetDistance, minClearX, mainCx - 1.8);
  const wallZ = primary.z + primary.d * 0.5;

  return {
    cut: 0,
    usableW: 1.8,
    cx,
    wallZ,
    wideDoor: false,
    doorWidth: 1.6,
    doorHeight: 1.25,
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0,
    totalRise: 0,
    totalStepDepth: 1.5,
    stoopW: 1.8,
    rotY: 0,
    normal: { x: 0, y: 0, z: 1 },
    facade: 'front',
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

function computeDeliveryEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  let side = cfg.rearEntrance ? 'left' : 'back';
  if (side === 'left') {
    const spanStart = primary.z - primary.d * 0.5 + 0.6;
    const spanEnd = primary.z + primary.d * 0.5 - 0.6;
    const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.left || []);
    if (spans.length === 0 || spans[0][1] - spans[0][0] < 2.6) {
      side = 'back';
    }
  }

  let cx, cz, rotY, normal, facade;
  if (side === 'back') {
    const rearExt = groundSegments.find((s) => s.isExtension && s.extIndex === 0);
    const target = rearExt || primary;
    cx = target.x + (cfg.rearEntrance ? 1.5 : 0);
    cz = target.z - target.d * 0.5;
    rotY = Math.PI;
    normal = { x: 0, y: 0, z: -1 };
    facade = 'back';
  } else {
    cx = primary.x - primary.w * 0.5;
    cz = primary.z;
    rotY = -Math.PI / 2;
    normal = { x: -1, y: 0, z: 0 };
    facade = 'left';
  }

  return {
    cut: 0,
    usableW: 2.8,
    cx,
    wallZ: cz,
    wideDoor: true,
    doorWidth: 2.5,
    doorHeight: 2.55,
    steps: 1,
    stepH: 0.16,
    stepD: 0.45,
    landingD: 0.95,
    totalRise: 0.16,
    totalStepDepth: 0.95,
    stoopW: 3.0,
    rotY,
    normal,
    facade,
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

function computeRooftopEntranceLayout(topSegments, cfg) {
  const topSeg = topSegments[0];
  if (!topSeg) return null;
  const topRoofY = cfg.floors * cfg.floorHeight;
  const hW = Number(cfg.roofAccessWidth) || 2.4;
  const hD = Number(cfg.roofAccessDepth) || 3.2;
  const hH = Number(cfg.roofAccessHeight) || 2.3;
  const hx = 0;
  const hz = clamp(-topSeg.d * 0.15, -topSeg.d * 0.5 + hD * 0.5 + 0.8, topSeg.d * 0.5 - hD * 0.5 - 0.8);
  const doorSide = cfg.roofAccessDoorSide || 'front';

  let cx = hx;
  let wallZ = hz;
  let rotY = 0;
  let normal = { x: 0, y: 0, z: 1 };

  if (doorSide === 'front') {
    wallZ = hz + hD * 0.5;
    rotY = 0;
    normal = { x: 0, y: 0, z: 1 };
  } else if (doorSide === 'back') {
    wallZ = hz - hD * 0.5;
    rotY = Math.PI;
    normal = { x: 0, y: 0, z: -1 };
  } else if (doorSide === 'left') {
    cx = hx - hW * 0.5;
    rotY = -Math.PI / 2;
    normal = { x: -1, y: 0, z: 0 };
  } else if (doorSide === 'right') {
    cx = hx + hW * 0.5;
    rotY = Math.PI / 2;
    normal = { x: 1, y: 0, z: 0 };
  }

  return {
    cut: 0,
    usableW: hW,
    cx,
    wallZ,
    wideDoor: false,
    doorWidth: 1.15,
    doorHeight: Math.min(2.05, hH - 0.2),
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0.6,
    totalRise: 0,
    totalStepDepth: 0.6,
    stoopW: 1.4,
    rotY,
    normal,
    facade: 'roof_' + doorSide,
    elevation: topRoofY,
    segmentIndex: 0,
    segmentId: 'segment_0_roof_headhouse'
  };
}

function buildEntranceDefinition(layout, cfg, meta) {
  const autoDefaults = computeDefaultEntranceGameplay(cfg);
  const enabled = typeof cfg.entranceEnabled === 'boolean' ? cfg.entranceEnabled : autoDefaults.entranceEnabled;
  const category = meta.category || (OPTIONS.entranceCategory.some((x) => x[0] === cfg.entranceCategory)
    ? cfg.entranceCategory
    : autoDefaults.entranceCategory);
  const interactive = Boolean(enabled && category !== 'decorative');
  const decorative = !interactive;
  const lockedByDefault = typeof cfg.entranceLocked === 'boolean' ? cfg.entranceLocked : autoDefaults.entranceLocked;
  const interactionLabel = meta.interactionLabel || (String(cfg.interactionLabel ?? autoDefaults.interactionLabel).trim() || autoDefaults.interactionLabel);
  const maxDistance = roundNum(clamp(Number(cfg.interactionDistance) || autoDefaults.interactionDistance, 1.0, 8.0), 3);

  const isCorner = meta.role === 'corner_secondary';
  const trigW = roundNum(
    isCorner
      ? clamp(Math.min(Number(cfg.triggerWidth) || autoDefaults.triggerWidth, Math.max(1.8, layout.cut * Math.SQRT2)), 1.0, 8.0)
      : clamp(Number(cfg.triggerWidth) || autoDefaults.triggerWidth, 1.0, 8.0),
    3
  );
  const trigH = roundNum(
    isCorner
      ? clamp(Math.max(2.3, layout.doorHeight + 0.3), 1.8, 6.0)
      : clamp(Number(cfg.triggerHeight) || autoDefaults.triggerHeight, 1.8, 6.0),
    3
  );
  const trigD = roundNum(
    isCorner
      ? clamp(Math.min(Number(cfg.triggerDepth) || autoDefaults.triggerDepth, 2.2), 1.0, 8.0)
      : clamp(Number(cfg.triggerDepth) || autoDefaults.triggerDepth, 1.0, 8.0),
    3
  );

  const baseElev = Number(layout.elevation) || 0;
  const anchorX = roundNum(layout.cx, 4);
  const anchorY = roundNum(baseElev + layout.totalRise, 4);
  const anchorZ = roundNum(layout.wallZ, 4);
  const nx = roundNum(layout.normal.x, 4);
  const ny = roundNum(layout.normal.y, 4);
  const nz = roundNum(layout.normal.z, 4);
  const rotY = roundNum(layout.rotY, 4);
  const degreesY = roundNum((layout.rotY * 180) / Math.PI, 2);

  const doorWidth = roundNum(layout.doorWidth, 3);
  const doorHeight = roundNum(layout.doorHeight, 3);
  const thresholdElevation = roundNum(baseElev + layout.totalRise, 4);

  // Trigger center offset
  const offsetForward = roundNum(trigD * 0.5 - 0.25, 4);
  const offsetUp = roundNum(trigH * 0.5 - (thresholdElevation - baseElev), 4);
  const centerOffset = { x: 0, y: offsetUp, z: offsetForward };

  // Local trigger center
  const localCenter = {
    x: roundNum(anchorX + layout.normal.x * offsetForward, 4),
    y: roundNum(anchorY + offsetUp, 4),
    z: roundNum(anchorZ + layout.normal.z * offsetForward, 4)
  };

  // Navigation positions
  const stepFrontDist = layout.totalStepDepth;
  const approachDist = roundNum(stepFrontDist + 0.85, 4);
  const safeDist = roundNum(stepFrontDist + 1.75, 4);
  const landingDist = roundNum(layout.steps > 0 ? Math.min(layout.landingD * 0.5, 0.42) : 0.35, 4);

  const approachPosition = {
    x: roundNum(anchorX + layout.normal.x * approachDist, 4),
    y: roundNum(baseElev, 4),
    z: roundNum(anchorZ + layout.normal.z * approachDist, 4)
  };
  const safePosition = {
    x: roundNum(anchorX + layout.normal.x * safeDist, 4),
    y: roundNum(baseElev, 4),
    z: roundNum(anchorZ + layout.normal.z * safeDist, 4)
  };
  const landingPosition = {
    x: roundNum(anchorX + layout.normal.x * landingDist, 4),
    y: thresholdElevation,
    z: roundNum(anchorZ + layout.normal.z * landingDist, 4)
  };

  const enterYawRad = roundNum(Math.atan2(-layout.normal.x, -layout.normal.z), 4);
  const exitYawRad = roundNum(Math.atan2(layout.normal.x, layout.normal.z), 4);

  const playerFacing = {
    x: roundNum(-layout.normal.x, 4),
    y: 0,
    z: roundNum(-layout.normal.z, 4),
    yawRadians: enterYawRad,
    yawDegrees: roundNum((enterYawRad * 180) / Math.PI, 2)
  };
  const exitFacing = {
    x: nx,
    y: 0,
    z: nz,
    yawRadians: exitYawRad,
    yawDegrees: roundNum((exitYawRad * 180) / Math.PI, 2)
  };

  const effectiveDoorStyle = isCorner ? 'single' : (meta.doorStyle || cfg.doorStyle);

  const door = {
    position: { x: anchorX, y: anchorY, z: anchorZ },
    centerPosition: { x: anchorX, y: roundNum(anchorY + doorHeight * 0.5, 4), z: anchorZ },
    rotation: { x: 0, y: rotY, z: 0, degreesY },
    normal: { x: nx, y: ny, z: nz },
    width: doorWidth,
    height: doorHeight,
    thresholdElevation,
    segmentIndex: meta.segmentIndex,
    segmentId: meta.segmentId,
    facade: layout.facade,
    doorStyle: effectiveDoorStyle,
    isDouble: Boolean(layout.wideDoor)
  };

  const trigger = {
    shape: 'box',
    width: trigW,
    height: trigH,
    depth: trigD,
    centerOffset,
    localCenter,
    bounds: {
      min: {
        x: roundNum(-trigW * 0.5, 4),
        y: roundNum(offsetUp - trigH * 0.5, 4),
        z: roundNum(offsetForward - trigD * 0.5, 4)
      },
      max: {
        x: roundNum(trigW * 0.5, 4),
        y: roundNum(offsetUp + trigH * 0.5, 4),
        z: roundNum(offsetForward + trigD * 0.5, 4)
      }
    },
    maxDistance,
    requiresExplicitInteraction: interactive
  };

  const navigation = {
    approachPosition,
    safePosition,
    landingPosition,
    playerFacing,
    exitFacing,
    hasSteps: layout.steps > 0,
    stepCount: layout.steps,
    stepHeight: layout.steps > 0 ? roundNum(layout.stepH, 3) : 0,
    stepDepth: layout.steps > 0 ? roundNum(layout.stepD, 3) : 0,
    landingDepth: layout.steps > 0 ? roundNum(layout.landingD, 3) : 0,
    totalStepDepth: roundNum(layout.totalStepDepth, 4),
    stoopWidth: layout.steps > 0 ? roundNum(layout.stoopW, 3) : 0,
    hasElevatedLanding: thresholdElevation > 0,
    landingElevation: thresholdElevation
  };

  const gameplay = {
    category,
    enabled,
    interactive,
    decorative,
    lockedByDefault,
    interactionLabel: isCorner && interactionLabel === 'Enter Building' ? 'Enter Corner Shop' : interactionLabel,
    requiresExplicitInteraction: interactive
  };

  return {
    id: meta.id,
    label: meta.label,
    role: meta.role,
    category: gameplay.category,
    enabled: gameplay.enabled,
    interactive: gameplay.interactive,
    decorative: gameplay.decorative,
    lockedByDefault: gameplay.lockedByDefault,
    interactionLabel: gameplay.interactionLabel,
    position: door.position,
    centerPosition: door.centerPosition,
    rotation: door.rotation,
    normal: door.normal,
    width: door.width,
    height: door.height,
    thresholdElevation: door.thresholdElevation,
    segmentIndex: door.segmentIndex,
    segmentId: door.segmentId,
    facade: door.facade,
    doorStyle: door.doorStyle,
    isDouble: door.isDouble,
    triggerShape: trigger.shape,
    triggerWidth: trigger.width,
    triggerHeight: trigger.height,
    triggerDepth: trigger.depth,
    triggerCenterOffset: trigger.centerOffset,
    maxInteractionDistance: trigger.maxDistance,
    requiresExplicitInteraction: trigger.requiresExplicitInteraction,
    approachPosition: navigation.approachPosition,
    safePosition: navigation.safePosition,
    landingPosition: navigation.landingPosition,
    playerFacing: navigation.playerFacing,
    exitFacing: navigation.exitFacing,
    hasSteps: navigation.hasSteps,
    stepCount: navigation.stepCount,
    stepHeight: navigation.stepHeight,
    stepDepth: navigation.stepDepth,
    landingDepth: navigation.landingDepth,
    totalStepDepth: navigation.totalStepDepth,
    hasElevatedLanding: navigation.hasElevatedLanding,
    landingElevation: navigation.landingElevation,
    door,
    trigger,
    navigation,
    gameplay
  };
}

function computeBuildingEntrances(rawCfg, groundSegmentsInput = null) {
  const cfg = sanitisePreset(rawCfg);
  const groundSegments = groundSegmentsInput || segmentsForFloor(cfg, 0);
  const primary = groundSegments[0];
  if (!primary) return [];

  const entrances = [];
  const mainLayout = computePrimaryEntranceLayout(primary, cfg);
  entrances.push(
    buildEntranceDefinition(mainLayout, cfg, {
      id: 'entrance_main',
      label: cfg.groundUse === 'shop' ? 'Main Storefront Entrance' : cfg.groundUse === 'lobby' ? 'Main Lobby Entrance' : 'Main Building Entrance',
      role: 'main',
      segmentIndex: 0,
      segmentId: 'segment_0_main'
    })
  );

  if (cfg.groundUse === 'shop') {
    for (let j = 0; j < groundSegments.length; j++) {
      const seg = groundSegments[j];
      if ((seg.cornerCut || 0) > 0.05) {
        const cornerLayout = computeCornerEntranceLayout(seg, cfg);
        const id = j === 0 ? 'entrance_corner' : `entrance_corner_${j}`;
        entrances.push(
          buildEntranceDefinition(cornerLayout, cfg, {
            id,
            label: 'Corner Storefront Entrance',
            role: 'corner_secondary',
            segmentIndex: j,
            segmentId: j === 0 ? 'segment_0_main' : `segment_${j}_wing`
          })
        );
      }
    }
  }

  if (cfg.rearEntrance) {
    const rearLayout = computeRearEntranceLayout(groundSegments, cfg);
    if (rearLayout) {
      entrances.push(
        buildEntranceDefinition(rearLayout, cfg, {
          id: 'entrance_rear',
          label: 'Rear Service Entrance',
          role: 'rear_service',
          category: 'service',
          doorStyle: cfg.rearDoorStyle || 'single',
          segmentIndex: rearLayout.segmentIndex,
          segmentId: rearLayout.segmentId,
          interactionLabel: 'Enter Service Door'
        })
      );
    }
  }

  if (cfg.sideEntrance === 'left' || cfg.sideEntrance === 'both') {
    const sideLeftLayout = computeSideEntranceLayout(groundSegments, cfg, 'left');
    if (sideLeftLayout) {
      entrances.push(
        buildEntranceDefinition(sideLeftLayout, cfg, {
          id: 'entrance_side_left',
          label: 'Left Side Entrance',
          role: 'side_left',
          category: 'secondary',
          doorStyle: 'single',
          segmentIndex: sideLeftLayout.segmentIndex,
          segmentId: sideLeftLayout.segmentId,
          interactionLabel: 'Enter Side Door'
        })
      );
    }
  }

  if (cfg.sideEntrance === 'right' || cfg.sideEntrance === 'both') {
    const sideRightLayout = computeSideEntranceLayout(groundSegments, cfg, 'right');
    if (sideRightLayout) {
      entrances.push(
        buildEntranceDefinition(sideRightLayout, cfg, {
          id: 'entrance_side_right',
          label: 'Right Side Entrance',
          role: 'side_right',
          category: 'secondary',
          doorStyle: 'single',
          segmentIndex: sideRightLayout.segmentIndex,
          segmentId: sideRightLayout.segmentId,
          interactionLabel: 'Enter Side Door'
        })
      );
    }
  }

  if (cfg.basementEntrance) {
    const baseLayout = computeBasementEntranceLayout(groundSegments, cfg);
    if (baseLayout) {
      entrances.push(
        buildEntranceDefinition(baseLayout, cfg, {
          id: 'entrance_basement',
          label: 'Basement Cellar Entrance',
          role: 'basement_access',
          category: 'service',
          doorStyle: 'single',
          segmentIndex: baseLayout.segmentIndex,
          segmentId: baseLayout.segmentId,
          interactionLabel: 'Access Basement'
        })
      );
    }
  }

  if (cfg.deliveryEntrance) {
    const delivLayout = computeDeliveryEntranceLayout(groundSegments, cfg);
    if (delivLayout) {
      entrances.push(
        buildEntranceDefinition(delivLayout, cfg, {
          id: 'entrance_delivery',
          label: 'Commercial Delivery Bay',
          role: 'delivery_entrance',
          category: 'service',
          doorStyle: 'double',
          segmentIndex: delivLayout.segmentIndex,
          segmentId: delivLayout.segmentId,
          interactionLabel: 'Delivery Bay'
        })
      );
    }
  }

  if (cfg.roofAccess) {
    const topSegments = segmentsForFloor(cfg, Math.max(0, cfg.floors - 1));
    const roofLayout = computeRooftopEntranceLayout(topSegments, cfg);
    if (roofLayout) {
      entrances.push(
        buildEntranceDefinition(roofLayout, cfg, {
          id: 'entrance_roof',
          label: 'Rooftop Stairwell Access',
          role: 'roof_access',
          category: 'roof_access',
          doorStyle: 'single',
          segmentIndex: roofLayout.segmentIndex,
          segmentId: roofLayout.segmentId,
          interactionLabel: 'Enter Stairwell'
        })
      );
    }
  }

  return entrances;
}

function computePlayerReferenceSpots(blueprint) {
  const spots = [];
  const mainEnt = blueprint?.entrances?.find((e) => e.id === 'entrance_main' || e.role === 'main') || blueprint?.entrances?.[0];
  if (mainEnt) {
    const nrm = mainEnt.approachNormal || { x: 0, z: 1 };
    const faceWallYaw = Math.atan2(-(nrm.x || 0), -(nrm.z || 1));
    const landingPos = mainEnt.navigation?.landingPosition || mainEnt.position;
    if (landingPos) {
      spots.push({
        id: 'front_door',
        label: 'Front Door',
        position: {
          x: roundNum(landingPos.x, 3),
          y: roundNum(mainEnt.navigation?.landingElevation ?? landingPos.y ?? 0, 3),
          z: roundNum(landingPos.z, 3)
        },
        yawRadians: roundNum(faceWallYaw, 4)
      });
    }
    const approachPos = mainEnt.navigation?.approachPosition;
    if (approachPos) {
      spots.push({
        id: 'front_stoop',
        label: 'Front Stoop',
        position: {
          x: roundNum(approachPos.x, 3),
          y: 0,
          z: roundNum(approachPos.z, 3)
        },
        yawRadians: roundNum(faceWallYaw, 4)
      });
    }
  }

  const fe = blueprint?.metadata?.fireEscape;
  if (fe && Array.isArray(fe.components)) {
    const landings = fe.components.filter((c) => c.type === 'landing');
    const fl1 = landings.find((l) => l.id === 'fe_landing_f1') || landings[0];
    const topL = landings[landings.length - 1];
    const dropLadder = fe.components.find((c) => c.id === 'fe_ladder_drop');
    const roofLadder = fe.components.find((c) => c.id === 'fe_ladder_roof');
    const streetFlight = fe.components.find((c) => c.id === 'fe_flight_f0_to_f1');
    if (fl1 && fl1.position && fl1.orientation) {
      const nrm = fl1.orientation;
      const tan = { x: nrm.z, z: -nrm.x };
      const deckW = fl1.dimensions?.width || 2.8;
      const deckD = fl1.dimensions?.depth || 2.25;
      const faceLeftYaw = Math.atan2(-tan.x, -tan.z);

      if (dropLadder && dropLadder.position) {
        const ladderNrm = dropLadder.orientation || nrm;
        spots.push({
          id: 'drop_ladder',
          label: 'Drop Ladder',
          position: {
            x: roundNum(dropLadder.position.x + ladderNrm.x * 0.45, 3),
            y: 0,
            z: roundNum(dropLadder.position.z + ladderNrm.z * 0.45, 3)
          },
          yawRadians: roundNum(Math.atan2(-ladderNrm.x, -ladderNrm.z), 4)
        });
      } else if (streetFlight && streetFlight.start) {
        spots.push({
          id: 'drop_ladder',
          label: 'Street Stair Entry',
          position: {
            x: roundNum(streetFlight.start.x + tan.x * 0.45, 3),
            y: 0,
            z: roundNum(streetFlight.start.z + tan.z * 0.45, 3)
          },
          yawRadians: roundNum(faceLeftYaw, 4)
        });
      } else {
        spots.push({
          id: 'drop_ladder',
          label: 'Drop Ladder',
          position: {
            x: roundNum(fl1.position.x + nrm.x * (deckD * 0.05) + tan.x * (deckW * 0.5 + 0.55), 3),
            y: 0,
            z: roundNum(fl1.position.z + nrm.z * (deckD * 0.05) + tan.z * (deckW * 0.5 + 0.55), 3)
          },
          yawRadians: roundNum(faceLeftYaw, 4)
        });
      }

      const fl1Y = roundNum(fl1.topSurfaceElevation ?? fl1.elevation ?? 3.4, 3);
      const standSign = fe.layoutStyle === 'alternating_switchback' ? -1 : 1;
      spots.push({
        id: 'stair_landing',
        label: 'Stair Landing',
        position: {
          x: roundNum(fl1.position.x + tan.x * standSign * (deckW * 0.5 - 0.50), 3),
          y: fl1Y,
          z: roundNum(fl1.position.z + tan.z * standSign * (deckW * 0.5 - 0.50), 3)
        },
        yawRadians: roundNum(fe.layoutStyle === 'alternating_switchback' ? Math.atan2(tan.x, tan.z) : faceLeftYaw, 4)
      });

      if (topL && topL.position && fe.hasRoofAccess !== false) {
        const topY = roundNum(topL.topSurfaceElevation ?? topL.elevation ?? fl1Y, 3);
        if (roofLadder && roofLadder.position) {
          const rNrm = roofLadder.orientation || nrm;
          spots.push({
            id: 'roof_access',
            label: 'Roof Access',
            position: {
              x: roundNum(roofLadder.position.x + rNrm.x * 0.48, 3),
              y: topY,
              z: roundNum(roofLadder.position.z + rNrm.z * 0.48, 3)
            },
            yawRadians: roundNum(Math.atan2(-rNrm.x, -rNrm.z), 4)
          });
        } else {
          const roofZOff = Math.min(deckD * 0.55, 0.78) - deckD * 0.5;
          spots.push({
            id: 'roof_access',
            label: 'Roof Access',
            position: {
              x: roundNum(topL.position.x + nrm.x * roofZOff - tan.x * (deckW * 0.5 - 0.50), 3),
              y: topY,
              z: roundNum(topL.position.z + nrm.z * roofZOff - tan.z * (deckW * 0.5 - 0.50), 3)
            },
            yawRadians: roundNum(faceLeftYaw, 4)
          });
        }
      }
    }
  }

  const tall = blueprint?.metadata?.tallStaircase;
  if (blueprint?.metadata?.hasTallStaircase && tall && Array.isArray(tall.landings) && tall.landings.length) {
    const entryL = tall.landings[0];
    const topTall = tall.landings[tall.landings.length - 1];
    if (entryL?.position) {
      spots.push({
        id: 'tall_stair_entry',
        label: 'Tall Stair Entry',
        position: {
          x: roundNum(entryL.position.x, 3),
          y: roundNum(entryL.topSurfaceElevation ?? entryL.elevation ?? 0, 3),
          z: roundNum(entryL.position.z, 3)
        },
        yawRadians: 0
      });
    }
    if (topTall?.position) {
      spots.push({
        id: 'tall_stair_landing',
        label: 'Tall Stair Landing',
        position: {
          x: roundNum(topTall.position.x, 3),
          y: roundNum(topTall.topSurfaceElevation ?? topTall.elevation ?? 0, 3),
          z: roundNum(topTall.position.z, 3)
        },
        yawRadians: 0
      });
    }
  }

  return spots;
}


const STORAGE_KEY = 'b-remastered-building-presets-v1';

const BLUEPRINT_SCHEMA_VERSION = 'b.building.v1';

const GENERATOR_META = {
  id: 'b-3d-building-generator',
  name: 'B Remastered 3D Building Generator',
  version: '1.1.0',
  coordinateSystem: {
    handedness: 'right-handed',
    upAxis: '+Y',
    forwardAxis: '+Z',
    rightAxis: '+X',
    units: 'meters',
    rotationOrder: 'XYZ',
    rotationUnits: 'radians',
    origin: 'ground-level center of primary footprint (x=0, y=0, z=0); primary facade faces +Z'
  }
};

const STYLES = [
  { id: 'brick', label: 'Red Brick', icon: 'fa-building', preset: 'paragon_brick' },
  { id: 'brownstone', label: 'Brownstone', icon: 'fa-home', preset: 'kings_row' },
  { id: 'commercial', label: 'Downtown', icon: 'fa-city', preset: 'old_downtown' },
  { id: 'mixed', label: 'Mixed Use', icon: 'fa-store', preset: 'market_street' },
  { id: 'artdeco', label: 'Art Deco', icon: 'fa-landmark', preset: 'golden_age' },
  { id: 'modern', label: 'Modern', icon: 'fa-th-large', preset: 'new_harbor' },
  { id: 'abandoned', label: 'Derelict', icon: 'fa-ghost', preset: 'abandoned_flats' },
  { id: 'corner', label: 'Corner', icon: 'fa-vector-square', preset: 'corner_block' }
];

const BASE = {
  style: 'brick', seed: 1337,
  width: 13, depth: 11, floors: 5, floorHeight: 3.3, wallThickness: 0.22,
  footprint: 'rectangle', extension: 0, setback: 0, cornerCut: 0,
  roofType: 'flat', parapet: true, parapetHeight: 0.65, roofColor: '#343b43',
  wallMaterial: 'brick', wallColor: '#a64a40', secondaryWallColor: '#7c3431', mortarColor: '#c3aaa0',
  brickScale: 1.1, colorVariation: 0.24, groundFloorMaterial: 'stone', groundFloorColor: '#747576',
  trimColor: '#d6c9ad', trimAmount: 0.55, facadeAccent: 'cornice',
  windowsX: 4, windowsSide: 3, windowWidth: 1.4, windowHeight: 1.85,
  windowStyle: 'sash', windowFrameColor: '#d6cdbb', glassColor: '#384955',
  windowLighting: 0.20, shutters: false, curtains: true, balconies: 0.0, acUnits: false, fireEscape: true,
  doorStyle: 'stoop', doorColor: '#5f4134', entranceSteps: 3,
  groundUse: 'residential', awning: false, awningColor: '#8e3b3b',
  signage: 'none', signText: 'CORNER MARKET', signColor: '#f2e1aa',
  entranceEnabled: true, entranceCategory: 'apartment', interactionDistance: 2.5,
  triggerWidth: 2.4, triggerHeight: 2.9, triggerDepth: 3.0,
  entranceLocked: false, interactionLabel: 'Enter Building',
  rooftopProps: 0.65, rooftopWaterTank: true, skylights: false, chimneys: 2, antennas: true, rooftopPipes: true,
  age: 0.18, damage: 0, windowDamageStyle: 'mixed', tarPatches: false, roofPuddles: false, overgrowth: 0, grimeColor: '#282b2a',
  interiorMode: 'none', cutaway: false, inspectedFloor: 0,
  stairwell: true, elevator: false, roomsPerFloor: 4,
  accentFloor: 0, accentSide: 'front', accentFloorColor: '#b58867', floorOverrides: [],
  rearEntrance: false, rearDoorStyle: 'single', sideEntrance: 'none',
  basementEntrance: false, deliveryEntrance: false,
  roofAccess: false, roofAccessStyle: 'brick', roofAccessRoof: 'flat', roofAccessDoorSide: 'front',
  roofAccessWidth: 3.0, roofAccessDepth: 3.4, roofAccessHeight: 2.6,
  rooftopVents: false, rooftopHatch: false, rooftopWalkways: false, safetyRailings: false, rooftopCollision: false,
  fireEscapeLadder: 'raised', fireEscapeRoofAccess: true, fireEscapeTreads: true,
  fireEscapeClearance: 'one_way', fireEscapeLadderClearance: 0.0, fireEscapeStairWidth: 0.98, fireEscapeLandingDepth: 2.25,
  fireEscapeWallStandoff: 0.0, fireEscapeSupportStyle: 'columns_and_braces', fireEscapeRoofLandingSize: 0.0,
  tallStaircase: false, tallStaircaseSide: 'auto', tallStaircaseWidth: 1.0, tallStaircaseClearance: 0.34,
  tallStaircaseFloors: 0, tallStaircaseLanding: 'ground_continuous', tallStaircaseRailing: 'full',
  doorScale: 1.0, doorWidth: 0, doorHeight: 0,
  windowLightingTime: 'day', windowLightingProfile: 'auto',
  graffiti: false, graffitiDensity: 0.4, graffitiStyle: 'mixed'
};

const NEW_EXPANSION_DEFAULTS = {
  rearEntrance: false,
  rearDoorStyle: 'single',
  sideEntrance: 'none',
  basementEntrance: false,
  deliveryEntrance: false,
  roofAccess: false,
  roofAccessStyle: 'brick',
  roofAccessRoof: 'flat',
  roofAccessDoorSide: 'front',
  roofAccessWidth: 3.0,
  roofAccessDepth: 3.4,
  roofAccessHeight: 2.6,
  rooftopVents: false,
  rooftopHatch: false,
  rooftopWalkways: false,
  safetyRailings: false,
  rooftopCollision: false,
  fireEscapeLadder: 'raised',
  fireEscapeRoofAccess: true,
  fireEscapeTreads: false,
  fireEscapeClearance: 'legacy',
  fireEscapeLadderClearance: 0.0,
  fireEscapeStairWidth: 0,
  fireEscapeLandingDepth: 0,
  fireEscapeWallStandoff: 0,
  fireEscapeSupportStyle: 'columns_and_braces',
  fireEscapeRoofLandingSize: 0,
  tallStaircase: false,
  tallStaircaseSide: 'auto',
  tallStaircaseWidth: 1.0,
  tallStaircaseClearance: 0.34,
  tallStaircaseFloors: 0,
  tallStaircaseLanding: 'ground_continuous',
  tallStaircaseRailing: 'full',
  doorScale: 1.0,
  doorWidth: 0,
  doorHeight: 0,
  windowLightingTime: 'day',
  windowLightingProfile: 'auto',
  graffiti: false,
  graffitiDensity: 0.4,
  graffitiStyle: 'mixed'
};

const CONFIG_KEYS = Object.keys(BASE).filter((k) => k !== 'floorOverrides');

const PRESETS = {
  paragon_brick: { label: 'Paragon Brick', style: 'brick', seed: 1337, wallColor: '#a64a40', floors: 5, width: 13, depth: 11, curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: true, rooftopPipes: true },
  kings_row: { label: "King's Row Brownstone", style: 'brownstone', seed: 4612, width: 9, depth: 14, floors: 4, floorHeight: 3.4, roofType: 'mansard', wallColor: '#946d55', secondaryWallColor: '#6e5344', groundFloorColor: '#8b776b', roofColor: '#4a4040', wallMaterial: 'brick', trimAmount: 0.85, facadeAccent: 'ornate', windowsX: 3, windowsSide: 3, windowStyle: 'arched', windowFrameColor: '#e2c5a7', curtains: true, shutters: true, doorStyle: 'stoop', entranceSteps: 5, fireEscape: true, acUnits: false, balconies: 0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 2, rooftopProps: 0.2 },
  old_downtown: { label: 'Old Downtown', style: 'commercial', seed: 5821, floors: 7, width: 19, depth: 15, groundUse: 'shop', groundFloorMaterial: 'stone', groundFloorColor: '#777167', wallColor: '#86765e', secondaryWallColor: '#6f6250', roofType: 'flat', trimAmount: 0.85, facadeAccent: 'cornice', windowsX: 7, windowsSide: 5, windowStyle: 'tall', curtains: false, fireEscape: false, acUnits: false, rooftopWaterTank: false, rooftopPipes: true, rooftopProps: 0.75, signage: 'marquee', signText: 'DOWNTOWN' },
  market_street: { label: 'Market Street Shops', style: 'mixed', seed: 3009, width: 16, depth: 11, floors: 4, wallColor: '#a95f4b', secondaryWallColor: '#864b3f', groundUse: 'shop', groundFloorColor: '#625d62', awning: true, awningColor: '#a14248', signage: 'shop', signText: 'THE MARKET', roofType: 'flat', curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: false, rooftopPipes: true, windowsX: 5 },
  golden_age: { label: 'Golden Age Deco', style: 'artdeco', seed: 1017, floors: 8, width: 17, depth: 14, wallMaterial: 'stone', wallColor: '#bbad8d', secondaryWallColor: '#8d826b', groundFloorColor: '#746e61', trimColor: '#e1c98a', roofColor: '#615c55', facadeAccent: 'vertical', trimAmount: 0.9, windowsX: 6, windowStyle: 'tall', curtains: false, roofType: 'stepped', setback: 1.0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 0, fireEscape: false, acUnits: false, groundUse: 'lobby', doorStyle: 'double', rooftopProps: 0.2 },
  new_harbor: { label: 'New Harbor Apartments', style: 'modern', seed: 9135, floors: 9, width: 20, depth: 14, floorHeight: 3.1, wallMaterial: 'concrete', wallColor: '#9daab1', secondaryWallColor: '#71838c', groundFloorMaterial: 'concrete', groundFloorColor: '#556b78', roofColor: '#363f48', trimColor: '#d4e1e5', trimAmount: 0.2, facadeAccent: 'none', windowsX: 7, windowsSide: 4, windowStyle: 'modern', windowFrameColor: '#293d48', glassColor: '#2a526a', windowWidth: 1.8, windowHeight: 2.25, curtains: true, balconies: 0.8, acUnits: false, fireEscape: false, rooftopWaterTank: false, skylights: true, rooftopPipes: true, rooftopProps: 0.9, chimneys: 0, entranceSteps: 0, doorStyle: 'double', groundUse: 'lobby' },
  abandoned_flats: { label: 'Abandoned Flats', style: 'abandoned', seed: 6697, width: 15, depth: 12, floors: 6, wallColor: '#695e53', secondaryWallColor: '#474641', trimColor: '#827864', trimAmount: 0.2, windowFrameColor: '#554b42', glassColor: '#252d2d', windowLighting: 0, shutters: true, curtains: true, acUnits: true, fireEscape: true, age: 0.85, damage: 0.48, windowDamageStyle: 'mixed', tarPatches: true, roofPuddles: true, rooftopPipes: true, overgrowth: 0.48, chimneys: 1, rooftopWaterTank: true },
  corner_block: { label: 'Corner Block', style: 'corner', seed: 7284, width: 18, depth: 17, floors: 5, footprint: 'corner', cornerCut: 1.75, wallColor: '#ad6c56', secondaryWallColor: '#915342', groundUse: 'shop', groundFloorColor: '#786d5c', windowStyle: 'arched', windowsX: 6, windowsSide: 5, curtains: true, acUnits: true, signage: 'shop', signText: 'CORNER GOODS', awning: true, awningColor: '#45647b', fireEscape: false, rooftopWaterTank: true, rooftopPipes: true, balconies: 0.25 }
};

const OPTIONS = {
  footprint: [['rectangle', 'Rectangle'], ['L', 'L-shaped'], ['U', 'U-shaped courtyard'], ['corner', 'Corner lot']],
  roofType: [['flat', 'Flat roof'], ['pitched', 'Gabled'], ['mansard', 'Mansard'], ['stepped', 'Stepped crown']],
  wallMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
  groundFloorMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
  facadeAccent: [['none', 'None'], ['cornice', 'Classic cornices'], ['ornate', 'Ornate stonework'], ['vertical', 'Art Deco verticals']],
  windowStyle: [['sash', 'Classic sash'], ['arched', 'Arched'], ['tall', 'Tall panes'], ['modern', 'Modern glass'], ['square', 'Square']],
  windowDamageStyle: [['mixed', 'Mixed (broken & boarded)'], ['boarded', 'Fully boarded'], ['partial', 'Partially boarded'], ['broken', 'Broken glass only']],
  doorStyle: [['stoop', 'Raised stoop'], ['single', 'Single entrance'], ['double', 'Double doors']],
  groundUse: [['residential', 'Residential'], ['shop', 'Shops'], ['lobby', 'Shared lobby']],
  entranceCategory: [
    ['apartment', 'Apartment entrance'],
    ['shop', 'Shop entrance'],
    ['mission', 'Mission entrance'],
    ['generic', 'Generic entrance'],
    ['decorative', 'Decorative (non-interactive)'],
    ['custom', 'Custom entrance']
  ],
  signage: [['none', 'None'], ['shop', 'Storefront sign'], ['marquee', 'Wall marquee']],
  interiorMode: [['none', 'None'], ['basic', 'Floor plans'], ['apartments', 'Apartments & rooms']],
  accentSide: [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['all', 'All walls']],
  rearDoorStyle: [['single', 'Single steel door'], ['double', 'Double service doors'], ['metal', 'Security metal door']],
  sideEntrance: [['none', 'None'], ['left', 'Left wall'], ['right', 'Right wall'], ['both', 'Both sides']],
  roofAccessStyle: [['brick', 'Brick stairwell'], ['concrete', 'Concrete access'], ['metal', 'Metal utility enclosure'], ['decorative', 'Decorative masonry'], ['industrial', 'Industrial bulkhead']],
  roofAccessRoof: [['flat', 'Flat coping'], ['sloped', 'Sloped roof']],
  roofAccessDoorSide: [['front', 'Front (facing +Z)'], ['back', 'Back (facing -Z)'], ['left', 'Left (facing -X)'], ['right', 'Right (facing +X)']],
  fireEscapeLadder: [
    ['raised', 'Raised drop ladder (2.2m clearance)'],
    ['lowered', 'Lowered drop ladder to street'],
    ['stair', 'Fixed bottom stair flight (street entry)']
  ],
  fireEscapeClearance: [
    ['one_way', 'Classic Single-Direction Fire Escape (Default)'],
    ['standard', 'Classic Alternating Switchback'],
    ['generous', 'Large-Model Alternating Switchback'],
    ['straight_run', 'Straight-Run Vertical Stack'],
    ['legacy', 'Compact Side Escape (Legacy)']
  ],
  fireEscapeSupportStyle: [
    ['columns_and_braces', 'Columns & Diagonal Braces (Default)'],
    ['wall_brackets', 'Cantilever Wall Brackets'],
    ['columns_only', 'Vertical Support Columns']
  ],
  tallStaircaseSide: [
    ['auto', 'Automatic Opposite Wall'],
    ['left', 'Left Wall'],
    ['right', 'Right Wall'],
    ['back', 'Rear Wall'],
    ['front', 'Front Wall']
  ],
  tallStaircaseLanding: [
    ['ground_continuous', 'Street Entry + Floor Landings'],
    ['ground_and_roof', 'Street Entry + Floor + Roof Access'],
    ['elevated_roof', 'Elevated Landings + Drop/Roof Ladders']
  ],
  tallStaircaseRailing: [
    ['full', 'Full Guardrails (Both Sides)'],
    ['industrial', 'Industrial Heavy Guardrails'],
    ['open_inner', 'Outer Guardrail Only (Open Wall Side)']
  ],
  windowLightingTime: [['day', 'Sunny Day'], ['golden_hour', 'Golden Hour'], ['evening', 'Evening Twilight'], ['night', 'Night'], ['late_night', 'Late Night'], ['morning', 'Dawn / Morning']],
  windowLightingProfile: [['auto', 'Automatic by style'], ['residential', 'Residential apartments'], ['commercial', 'Offices & Commercial'], ['derelict', 'Derelict / Dark']],
  graffitiStyle: [['mixed', 'Mixed urban art & tags'], ['tags', 'Spray-paint tags'], ['stencils', 'Industrial stencils'], ['posters', 'Worn street posters']]
};

const SCHEMA = {
  form: [
    { group: 'BUILDING FORM' },
    { key: 'width', name: 'Building width', min: 6, max: 32, step: 0.5, unit: 'm' },
    { key: 'depth', name: 'Building depth', min: 6, max: 30, step: 0.5, unit: 'm' },
    { key: 'floors', name: 'Number of floors', min: 1, max: 14, step: 1 },
    { key: 'floorHeight', name: 'Floor height', min: 2.5, max: 5, step: 0.1, unit: 'm' },
    { key: 'wallThickness', name: 'Wall thickness', min: 0.12, max: 0.5, step: 0.02, unit: 'm' },
    { key: 'footprint', name: 'Building footprint', type: 'select' },
    { key: 'extension', name: 'Rear & side extensions', min: 0, max: 3, step: 1 },
    { key: 'setback', name: 'Upper-floor setbacks', min: 0, max: 2, step: 0.25, unit: 'm' },
    { key: 'cornerCut', name: 'Cut corner entrance', min: 0, max: 2.5, step: 0.25, unit: 'm', info: 'Angled front-right corner chamfer across any footprint.' },
    { group: 'ROOFLINE' },
    { key: 'roofType', name: 'Roof silhouette', type: 'select' },
    { key: 'roofColor', name: 'Roof color', type: 'color' },
    { key: 'parapet', name: 'Parapet walls', type: 'boolean' },
    { key: 'parapetHeight', name: 'Parapet height', min: 0.2, max: 1.5, step: 0.05, unit: 'm' }
  ],
  facade: [
    { group: 'WALL MATERIALS' },
    { key: 'wallMaterial', name: 'Main wall material', type: 'select' },
    { key: 'wallColor', name: 'Primary wall color', type: 'color' },
    { key: 'secondaryWallColor', name: 'Secondary wall color', type: 'color' },
    { key: 'mortarColor', name: 'Mortar / grout', type: 'color' },
    { key: 'brickScale', name: 'Brick & stone size', min: 0.5, max: 2.4, step: 0.1 },
    { key: 'colorVariation', name: 'Color variation', min: 0, max: 1, step: 0.05 },
    { key: 'groundFloorMaterial', name: 'Ground-floor material', type: 'select' },
    { key: 'groundFloorColor', name: 'Ground-floor color', type: 'color' },
    { key: 'trimColor', name: 'Trim & ledge color', type: 'color' },
    { key: 'trimAmount', name: 'Trim amount', min: 0, max: 1, step: 0.05 },
    { key: 'facadeAccent', name: 'Architectural detailing', type: 'select' },
    { group: 'WINDOWS' },
    { key: 'windowsX', name: 'Front window columns', min: 1, max: 10, step: 1 },
    { key: 'windowsSide', name: 'Side window columns', min: 1, max: 8, step: 1 },
    { key: 'windowWidth', name: 'Window width', min: 0.55, max: 2.8, step: 0.05, unit: 'm' },
    { key: 'windowHeight', name: 'Window height', min: 0.65, max: 3.15, step: 0.05, unit: 'm' },
    { key: 'windowStyle', name: 'Window style', type: 'select' },
    { key: 'windowFrameColor', name: 'Frame color', type: 'color' },
    { key: 'glassColor', name: 'Glass color', type: 'color' },
    { key: 'windowLighting', name: 'Interior lights', min: 0, max: 1, step: 0.05 },
    { key: 'curtains', name: 'Window curtains', type: 'boolean' },
    { key: 'shutters', name: 'Window shutters', type: 'boolean' }
  ],
  entrances: [
    { group: 'PRIMARY STREET ENTRANCE' },
    { key: 'groundUse', name: 'Ground-floor use', type: 'select' },
    { key: 'doorStyle', name: 'Entrance style', type: 'select' },
    { key: 'doorScale', name: 'Door scale multiplier', min: 0.7, max: 1.3, step: 0.05, unit: 'x', info: 'Modestly scales entrance door dimensions relative to player character.' },
    { key: 'doorWidth', name: 'Door width override', min: 0, max: 2.8, step: 0.05, unit: 'm', info: 'Overrides doorway opening width (0 preserves archetype standard).' },
    { key: 'doorHeight', name: 'Door height override', min: 0, max: 3.2, step: 0.05, unit: 'm', info: 'Overrides doorway opening height (0 preserves archetype standard).' },
    { key: 'doorColor', name: 'Door color', type: 'color' },
    { key: 'entranceSteps', name: 'Entrance steps', min: 0, max: 6, step: 1 },
    { key: 'awning', name: 'Shop / door awning', type: 'boolean' },
    { key: 'awningColor', name: 'Awning color', type: 'color' },
    { key: 'signage', name: 'Sign type', type: 'select' },
    { key: 'signText', name: 'Sign lettering', type: 'text' },
    { key: 'signColor', name: 'Sign color', type: 'color' },
    { group: 'ADDITIONAL BUILDING ENTRANCES' },
    { key: 'rearEntrance', name: 'Rear service entrance', type: 'boolean', info: 'Places a rear access door respecting building footprint and extensions.' },
    { key: 'rearDoorStyle', name: 'Rear door style', type: 'select' },
    { key: 'sideEntrance', name: 'Side facade entrance', type: 'select', info: 'Places entrance doors on exposed left or right exterior walls.' },
    { key: 'basementEntrance', name: 'Basement cellar doors', type: 'boolean', info: 'Ground-level angled metal cellar bulkhead access.' },
    { key: 'deliveryEntrance', name: 'Commercial delivery bay', type: 'boolean', info: 'Roll-up overhead door and loading threshold.' },
    { group: 'GAMEPLAY & INTERACTION' },
    { key: 'entranceEnabled', name: 'Enable interactive entrance', type: 'boolean', info: 'When disabled or set to Decorative, the entrance remains visually rendered but non-interactive in blueprints.' },
    { key: 'entranceCategory', name: 'Entrance category', type: 'select' },
    { key: 'interactionLabel', name: 'Interaction label', type: 'text' },
    { key: 'entranceLocked', name: 'Locked by default', type: 'boolean' },
    { key: 'interactionDistance', name: 'Interaction distance', min: 1.0, max: 8.0, step: 0.25, unit: 'm' },
    { key: 'triggerWidth', name: 'Trigger width', min: 1.0, max: 8.0, step: 0.1, unit: 'm' },
    { key: 'triggerHeight', name: 'Trigger height', min: 1.8, max: 6.0, step: 0.1, unit: 'm' },
    { key: 'triggerDepth', name: 'Trigger depth', min: 1.0, max: 8.0, step: 0.1, unit: 'm' }
  ],
  rooftop: [
    { group: 'ROOFTOP STAIRWELL HEADHOUSE' },
    { key: 'roofAccess', name: 'Rooftop stairwell headhouse', type: 'boolean', info: 'Enclosure containing the upper interior stairwell with roof access door.' },
    { key: 'roofAccessStyle', name: 'Headhouse architecture', type: 'select' },
    { key: 'roofAccessRoof', name: 'Headhouse roof style', type: 'select' },
    { key: 'roofAccessDoorSide', name: 'Access door facing', type: 'select' },
    { key: 'roofAccessWidth', name: 'Headhouse width', min: 2.0, max: 4.5, step: 0.1, unit: 'm' },
    { key: 'roofAccessDepth', name: 'Headhouse depth', min: 2.4, max: 5.5, step: 0.1, unit: 'm' },
    { key: 'roofAccessHeight', name: 'Headhouse height', min: 2.0, max: 3.5, step: 0.1, unit: 'm' },
    { group: 'ROOFTOP EQUIPMENT & DETAILS' },
    { key: 'rooftopProps', name: 'Rooftop equipment frequency', min: 0, max: 1, step: 0.1 },
    { key: 'rooftopWaterTank', name: 'Rooftop water tank', type: 'boolean' },
    { key: 'rooftopVents', name: 'Industrial ventilation fans', type: 'boolean' },
    { key: 'rooftopHatch', name: 'Maintenance roof hatch', type: 'boolean' },
    { key: 'rooftopWalkways', name: 'Roof maintenance walkways', type: 'boolean' },
    { key: 'safetyRailings', name: 'Perimeter safety railings', type: 'boolean' },
    { key: 'rooftopPipes', name: 'Exposed pipes & conduits', type: 'boolean' },
    { key: 'skylights', name: 'Rooftop skylights', type: 'boolean' },
    { key: 'chimneys', name: 'Chimneys', min: 0, max: 5, step: 1 },
    { key: 'antennas', name: 'Rooftop antenna', type: 'boolean' },
    { key: 'rooftopCollision', name: 'Rooftop semantic collision', type: 'boolean', info: 'Exports deterministic collision boxes for substantial rooftop equipment, chimneys, and structures.' }
  ],
  lighting: [
    { group: 'TIME-OF-DAY PREVIEW' },
    { key: 'windowLightingTime', name: 'Time of day mode', type: 'select', info: 'Simulates ambient lighting, sky color, and interior window illumination.' },
    { key: 'windowLightingProfile', name: 'Occupancy profile', type: 'select', info: 'Controls statistical distribution and color temperature of illuminated rooms.' },
    { group: 'WINDOW ILLUMINATION' },
    { key: 'windowLighting', name: 'Lit windows ratio', min: 0, max: 1, step: 0.05 },
    { key: 'curtains', name: 'Interior curtains', type: 'boolean' },
    { key: 'shutters', name: 'Window shutters', type: 'boolean' }
  ],
  features: [
    { group: 'Exterior Fire Escapes' },
    { key: 'fireEscape', name: 'Enable Exterior Fire Escape', type: 'boolean' },
    { key: 'fireEscapeClearance', name: 'Fire Escape Layout', type: 'select', info: 'Selects single-direction fire escape (default), alternating switchback, straight-run vertical stack, or legacy compact escape.' },
    { key: 'fireEscapeLadder', name: 'Bottom Access Mode', type: 'select', info: 'Selects counterweighted drop ladder (raised/lowered) or fixed ground stair flight.' },
    { key: 'fireEscapeSupportStyle', name: 'Support & Brace Style', type: 'select', info: 'Configures vertical support columns and underside diagonal wall braces.' },
    { key: 'fireEscapeRoofAccess', name: 'Parapet Roof Access Ladder', type: 'boolean', info: 'Gooseneck ladder connecting top arrival landing to roof deck.' },
    { key: 'fireEscapeRoofLandingSize', name: 'Roof Access Landing Size', min: 0, max: 2.0, step: 0.05, unit: 'm', info: 'Turnaround staging depth at roof ladder portal (0 uses active layout default).' },
    { key: 'fireEscapeTreads', name: 'Stair Tread Collision', type: 'boolean', info: 'Export individual physical stair tread positions, railings, and supports for player traversal.' },
    { key: 'fireEscapeWallStandoff', name: 'Wall Standoff', min: 0, max: 0.6, step: 0.02, unit: 'm', info: 'Clearance between exterior brick face and inner flight stringer (0 uses profile default).' },
    { key: 'fireEscapeStairWidth', name: 'Stair Tread Clear Width', min: 0, max: 1.3, step: 0.02, unit: 'm', info: 'Stair flight tread clear width (default 0.98m; 0 uses active profile default).' },
    { key: 'fireEscapeLandingDepth', name: 'Landing Platform Depth', min: 0, max: 3.2, step: 0.05, unit: 'm', info: 'Landing platform depth (default 2.25m; 0 uses active profile default).' },
    { key: 'fireEscapeLadderClearance', name: 'Ladder Extra Clearance', min: 0, max: 0.3, step: 0.02, unit: 'm', info: 'Additional ladder width and portal clearance for larger character models (default 0m).' },
    { key: 'tallStaircase', name: 'Enable Secondary Tall Exterior Staircase', type: 'boolean', info: 'Optional continuous 1-unit exterior staircase mounted along an unobstructed facade.' },
    { key: 'tallStaircaseSide', name: 'Staircase Placement Side', type: 'select', info: 'Chooses an unobstructed wall opposite any conventional fire escape when set to automatic.' },
    { key: 'tallStaircaseWidth', name: 'Staircase Clear Width', min: 0.8, max: 1.4, step: 0.05, unit: 'm', info: 'Walkable clear width between inner and outer stringers.' },
    { key: 'tallStaircaseClearance', name: 'Wall Offset Clearance', min: 0.24, max: 0.6, step: 0.02, unit: 'm', info: 'Standoff gap from exterior brick face to inner stair stringer.' },
    { key: 'tallStaircaseFloors', name: 'Supported Floors', type: 'floor', info: 'Highest elevated landing floor (0 spans all available floors).' },
    { key: 'tallStaircaseLanding', name: 'Landing Configuration', type: 'select', info: 'Selects street-entry plinth vs elevated drop ladder and top roof parapet ladder.' },
    { key: 'tallStaircaseRailing', name: 'Railing & Safety Option', type: 'select', info: 'Selects full double guardrails, heavy industrial guardrails, or open inner side.' },
    { group: 'FACADE ACCENTS' },
    { key: 'balconies', name: 'Balcony frequency', min: 0, max: 1, step: 0.1 },
    { key: 'acUnits', name: 'Window A/C units', type: 'boolean' },
    { group: 'STREET ART & DECALS' },
    { key: 'graffiti', name: 'Street graffiti & decals', type: 'boolean', info: 'Procedural street art and tags on lower exterior walls avoiding windows/doors.' },
    { key: 'graffitiDensity', name: 'Graffiti density', min: 0.1, max: 1.0, step: 0.05 },
    { key: 'graffitiStyle', name: 'Graffiti aesthetic', type: 'select' },
    { group: 'AGE & CHARACTER' },
    { key: 'age', name: 'Weathering / dirt', min: 0, max: 1, step: 0.05 },
    { key: 'damage', name: 'Damaged windows & walls', min: 0, max: 1, step: 0.05 },
    { key: 'windowDamageStyle', name: 'Window damage style', type: 'select' },
    { key: 'tarPatches', name: 'Tar patches & roof repairs', type: 'boolean' },
    { key: 'roofPuddles', name: 'Roof puddles & water stains', type: 'boolean' },
    { key: 'overgrowth', name: 'Vines & overgrowth', min: 0, max: 1, step: 0.05 },
    { key: 'grimeColor', name: 'Grime tone', type: 'color' }
  ],
  interior: [
    { group: 'BUILDING INTERIOR' },
    { key: 'interiorMode', name: 'Interior layout', type: 'select' },
    { key: 'cutaway', name: 'Show cutaway / hide front wall', type: 'boolean' },
    { key: 'inspectedFloor', name: 'Inspect through floor', type: 'floor' },
    { key: 'roomsPerFloor', name: 'Rooms per floor', min: 1, max: 8, step: 1 },
    { key: 'stairwell', name: 'Include stairs', type: 'boolean' },
    { key: 'elevator', name: 'Elevator shaft', type: 'boolean' },
    { group: 'CUSTOM FLOOR COLORS' },
    { key: 'accentFloor', name: 'Floor to customize', type: 'floorNumber' },
    { key: 'accentSide', name: 'Wall to customize', type: 'select' },
    { key: 'accentFloorColor', name: 'Custom wall color', type: 'color' }
  ]
};

const CATEGORIES = {
  form: SCHEMA.form.filter((x) => x.key).map((x) => x.key).filter((k) => !['roofColor'].includes(k)),
  facade: SCHEMA.facade.filter((x) => x.key).map((x) => x.key),
  entrances: SCHEMA.entrances.filter((x) => x.key).map((x) => x.key),
  rooftop: SCHEMA.rooftop.filter((x) => x.key).map((x) => x.key),
  lighting: SCHEMA.lighting.filter((x) => x.key).map((x) => x.key),
  features: SCHEMA.features.filter((x) => x.key).map((x) => x.key),
  palette: ['wallColor', 'secondaryWallColor', 'groundFloorColor', 'trimColor', 'windowFrameColor', 'doorColor', 'roofColor', 'awningColor', 'signColor']
};

const MATERIAL_CHOICES = ['#9f4b3d', '#a97455', '#9b8674', '#beb19c', '#73818b', '#817e77', '#d1bd93', '#5d675a', '#7a5661', '#bc8550', '#aeb5aa'];
const COLOR_CHOICES = ['#2c4e6a', '#425c6e', '#575753', '#8d392f', '#ab6752', '#d1b9a0', '#cdb78e', '#7e5c47', '#718580', '#5e625b'];

function getStyle(id) {
  return STYLES.find((x) => x.id === id) || STYLES[0];
}

function baseForStyle(style) {
  const descriptor = getStyle(style);
  const raw = { ...copy(BASE), ...copy(PRESETS[descriptor.preset]) };
  return { ...raw, ...computeDefaultEntranceGameplay(raw) };
}

function sanitisePreset(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid building settings');
  const style = STYLES.some((x) => x.id === data.style) ? data.style : 'brick';
  const rawBase = { ...baseForStyle(style), ...Object.fromEntries(Object.entries(data).filter(([k]) => k in BASE)), style };
  const autoEntrance = computeDefaultEntranceGameplay(rawBase);
  for (const k of Object.keys(autoEntrance)) {
    if (!(k in data) || data[k] === undefined || data[k] === null) {
      rawBase[k] = autoEntrance[k];
    }
  }
  const merged = rawBase;
  for (const [, rows] of Object.entries(SCHEMA)) {
    for (const def of rows) {
      if (!def.key) continue;
      const key = def.key;
      const fallback = baseForStyle(style)[key];
      if (key === 'fireEscapeClearance' && typeof merged[key] === 'number') {
        merged[key] = merged[key] > 1.05 ? 'generous' : 'legacy';
      }
      if (def.type === 'color') merged[key] = colorHex(merged[key]);
      else if (def.type === 'boolean') merged[key] = typeof merged[key] === 'boolean' ? merged[key] : fallback;
      else if (def.type === 'select') merged[key] = OPTIONS[key].some((x) => x[0] === merged[key]) ? merged[key] : fallback;
      else if (def.type === 'text') merged[key] = String(merged[key] ?? fallback).slice(0, 48);
      else if (typeof merged[key] !== 'number' || !Number.isFinite(merged[key])) merged[key] = fallback;
      else merged[key] = clamp(merged[key], def.min ?? (def.type === 'floorNumber' ? 0 : 0), def.max ?? (def.type === 'floorNumber' ? 14 : 14));
    }
  }
  merged.seed = clamp(Math.floor(Number(merged.seed) || 1337), 1, 99999999);
  merged.inspectedFloor = clamp(Math.floor(merged.inspectedFloor), 0, merged.floors);
  merged.accentFloor = clamp(Math.floor(merged.accentFloor), 0, merged.floors);
  merged.floorOverrides = Array.isArray(data.floorOverrides)
    ? data.floorOverrides.slice(0, 80).filter((o) => o && Number.isInteger(o.floor) && o.floor >= 1 && o.floor <= merged.floors && ['front', 'back', 'left', 'right', 'all'].includes(o.side) && /^#[a-f\d]{6}$/i.test(o.color)).map((o) => ({ floor: o.floor, side: o.side, color: o.color }))
    : [];
  if (merged.fireEscapeClearance !== 'one_way' && merged.fireEscapeClearance !== 'standard') {
    if (!Object.prototype.hasOwnProperty.call(data, 'fireEscapeStairWidth')) merged.fireEscapeStairWidth = 0;
    if (!Object.prototype.hasOwnProperty.call(data, 'fireEscapeLandingDepth')) merged.fireEscapeLandingDepth = 0;
  }
  delete merged.label;
  return merged;
}


function computeBuildingBounds(rawCfg) {
  const cfg = sanitisePreset(rawCfg);
  const groundSegments = segmentsForFloor(cfg, 0);
  const topSegments = segmentsForFloor(cfg, Math.max(0, cfg.floors - 1));
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let f = 0; f < cfg.floors; f++) {
    const segs = segmentsForFloor(cfg, f);
    for (const s of segs) {
      minX = Math.min(minX, s.x - s.w * 0.5);
      maxX = Math.max(maxX, s.x + s.w * 0.5);
      minZ = Math.min(minZ, s.z - s.d * 0.5);
      maxZ = Math.max(maxZ, s.z + s.d * 0.5);
    }
  }

  const primary = groundSegments[0];
  const mainLayout = primary ? computePrimaryEntranceLayout(primary, cfg) : null;
  const stoopFrontZ = mainLayout ? mainLayout.wallZ + mainLayout.totalStepDepth : maxZ;
  const fullMaxZ = Math.max(maxZ, stoopFrontZ);

  const wallHeight = roundNum(cfg.floors * cfg.floorHeight, 3);
  const roofExtra = cfg.roofType === 'pitched'
    ? 2.2
    : cfg.roofType === 'mansard'
      ? 1.55
      : cfg.roofType === 'stepped'
        ? 1.4
        : (cfg.parapet ? cfg.parapetHeight : 0.2);
  let totalHeightWithRoof = roundNum(wallHeight + roofExtra, 3);
  if (cfg.roofAccess) {
    const headhouseTopY = roundNum(wallHeight + (Number(cfg.roofAccessHeight) || 2.3), 3);
    totalHeightWithRoof = Math.max(totalHeightWithRoof, headhouseTopY);
  }

  const serializeSeg = (s, idx) => ({
    index: idx,
    id: idx === 0 ? 'segment_0_main' : s.isExtension ? `segment_${idx}_ext_${s.extIndex}` : `segment_${idx}_wing`,
    x: roundNum(s.x, 4),
    z: roundNum(s.z, 4),
    width: roundNum(s.w, 4),
    depth: roundNum(s.d, 4),
    isMain: Boolean(s.isMain),
    isExtension: Boolean(s.isExtension),
    cornerCut: roundNum(s.cornerCut || 0, 4),
    minX: roundNum(s.x - s.w * 0.5, 4),
    maxX: roundNum(s.x + s.w * 0.5, 4),
    minZ: roundNum(s.z - s.d * 0.5, 4),
    maxZ: roundNum(s.z + s.d * 0.5, 4)
  });

  return {
    width: roundNum(cfg.width, 3),
    depth: roundNum(cfg.depth, 3),
    wallHeight,
    totalHeightWithRoof,
    floors: cfg.floors,
    floorHeight: roundNum(cfg.floorHeight, 3),
    localBoundingBox: {
      min: { x: roundNum(minX, 4), y: 0, z: roundNum(minZ, 4) },
      max: { x: roundNum(maxX, 4), y: totalHeightWithRoof, z: roundNum(fullMaxZ, 4) },
      size: {
        x: roundNum(maxX - minX, 4),
        y: totalHeightWithRoof,
        z: roundNum(fullMaxZ - minZ, 4)
      },
      center: {
        x: roundNum((minX + maxX) * 0.5, 4),
        y: roundNum(totalHeightWithRoof * 0.5, 4),
        z: roundNum((minZ + fullMaxZ) * 0.5, 4)
      }
    },
    footprint: {
      type: cfg.footprint,
      hasExtensions: cfg.extension > 0,
      extensionCount: cfg.extension,
      hasSetbacks: cfg.setback > 0 && cfg.floors >= 2,
      setbackStartFloor: Math.floor(cfg.floors * 0.6) + 1,
      setbackAmount: roundNum(cfg.setback, 3),
      cornerCut: roundNum(primary?.cornerCut || 0, 4),
      groundSegments: groundSegments.map(serializeSeg),
      topFloorSegments: topSegments.map(serializeSeg)
    }
  };
}

function generateBuildingBlueprint(rawCfg, options = {}) {
  const settings = sanitisePreset(rawCfg);
  // Normalize preview-only inspection fields for export
  const blueprintSettings = {
    ...copy(settings),
    cutaway: false,
    inspectedFloor: 0
  };

  // Prune unmodified expansion defaults so existing registered building templates (like Brownstone #4612)
  // retain exact byte-for-byte schema and revision compatibility
  for (const [key, defaultVal] of Object.entries(NEW_EXPANSION_DEFAULTS)) {
    if (blueprintSettings[key] === defaultVal) {
      delete blueprintSettings[key];
    }
  }

  const groundSegments = segmentsForFloor(blueprintSettings, 0);
  const topSegments = segmentsForFloor(blueprintSettings, Math.max(0, (blueprintSettings.floors || 1) - 1)).filter((s) => !s.isExtension);
  const bounds = computeBuildingBounds(blueprintSettings);
  const entrances = computeBuildingEntrances(blueprintSettings, groundSegments);
  const firePlacement = chooseFireEscapePlacement(groundSegments, blueprintSettings, rng32(blueprintSettings.seed + 313));
  const isStraightRun = blueprintSettings.fireEscapeClearance === 'straight_run';
  const includeRooftopColliders = Boolean(blueprintSettings.rooftopCollision) || isStraightRun;
  const straightRunData = isStraightRun && firePlacement
    ? computeStraightRunFireEscape(groundSegments, firePlacement, blueprintSettings)
    : null;
  const tallLayout = blueprintSettings.tallStaircase
    ? computeTallStaircaseLayout(groundSegments, blueprintSettings, firePlacement)
    : null;

  // Derive stable template ID from style, seed, and geometry settings
  const templateIdentityPayload = JSON.stringify({
    style: blueprintSettings.style,
    seed: blueprintSettings.seed,
    width: blueprintSettings.width,
    depth: blueprintSettings.depth,
    floors: blueprintSettings.floors,
    floorHeight: blueprintSettings.floorHeight,
    footprint: blueprintSettings.footprint,
    extension: blueprintSettings.extension,
    setback: blueprintSettings.setback,
    cornerCut: blueprintSettings.cornerCut,
    roofType: blueprintSettings.roofType,
    groundUse: blueprintSettings.groundUse,
    doorStyle: blueprintSettings.doorStyle,
    entranceSteps: blueprintSettings.entranceSteps
  });
  const templateHash = hashBlueprintString(templateIdentityPayload).slice(0, 12);
  const templateId = options.templateId || `bldg_tpl_${blueprintSettings.style}_${blueprintSettings.seed}_${templateHash}`;

  const styleDescriptor = getStyle(blueprintSettings.style);
  const name = String(options.name || `${styleDescriptor.label} #${blueprintSettings.seed}`).trim();

  const revisionPayload = JSON.stringify({
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    settings: blueprintSettings,
    bounds,
    entrances
  });
  const templateRevision = `rev_${hashBlueprintString(revisionPayload)}`;

  const interactiveEntrances = entrances.filter((e) => e.interactive);

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: copy(GENERATOR_META),
    templateId,
    templateRevision,
    name,
    seed: blueprintSettings.seed,
    settings: blueprintSettings,
    bounds,
    entrances,
    metadata: {
      styleId: blueprintSettings.style,
      styleLabel: styleDescriptor.label,
      groundUse: blueprintSettings.groundUse,
      interiorMode: blueprintSettings.interiorMode,
      hasFireEscape: Boolean(firePlacement),
      fireEscapeSide: firePlacement ? firePlacement.side : null,
      fireEscape: firePlacement
        ? (straightRunData ? straightRunData.metadata : computeFireEscapeMetadata(groundSegments, firePlacement, blueprintSettings))
        : null,
      ...(tallLayout ? {
        hasTallStaircase: Boolean(tallLayout.feasible),
        tallStaircase: summarizeTallStaircaseMetadata(tallLayout)
      } : {}),
      windows: computeBuildingWindows(blueprintSettings, groundSegments, tallLayout),
      rooftopStructures: computeRooftopStructuresMetadata(
        blueprintSettings,
        topSegments,
        groundSegments[0],
        includeRooftopColliders
      ),
      windowLighting: {
        time: blueprintSettings.windowLightingTime || 'day',
        profile: blueprintSettings.windowLightingProfile || 'auto',
        ratio: blueprintSettings.windowLighting
      },
      totalEntranceCount: entrances.length,
      interactiveEntranceCount: interactiveEntrances.length,
      primaryEntranceId: entrances[0]?.id || null,
      damageLevel: blueprintSettings.damage,
      ageLevel: blueprintSettings.age,
      tags: [
        blueprintSettings.style,
        blueprintSettings.footprint,
        blueprintSettings.groundUse,
        ...(blueprintSettings.cornerCut > 0 ? ['corner-cut'] : []),
        ...(blueprintSettings.setback > 0 ? ['setback'] : []),
        ...(blueprintSettings.extension > 0 ? ['extensions'] : []),
        ...(blueprintSettings.roofAccess ? ['roof-access'] : []),
        ...(blueprintSettings.graffiti ? ['graffiti'] : []),
        ...(interactiveEntrances.length > 0 ? ['interactive'] : ['decorative'])
      ],
      extensions: options.metadataExtensions && typeof options.metadataExtensions === 'object'
        ? copy(options.metadataExtensions)
        : {}
    }
  };
}

function validateBuildingBlueprint(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Blueprint data must be a JSON object'] };
  }

  if ('schemaVersion' in input && input.schemaVersion !== undefined) {
    if (input.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      return {
        valid: false,
        errors: [`Unsupported blueprint schemaVersion "${String(input.schemaVersion)}". Expected "${BLUEPRINT_SCHEMA_VERSION}".`]
      };
    }
  }

  const isBlueprintV1 = input.schemaVersion === BLUEPRINT_SCHEMA_VERSION;
  const rawSettings = isBlueprintV1
    ? input.settings
    : (input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings) ? input.settings : input);

  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    return { valid: false, errors: ['Missing or invalid building settings object'] };
  }

  const hasKnownSettingKey = Object.keys(rawSettings).some((k) => k in BASE);
  if (!hasKnownSettingKey) {
    return { valid: false, errors: ['JSON does not contain any recognized building settings'] };
  }

  const mergedRaw = { ...copy(rawSettings) };
  if (isBlueprintV1 && input.seed !== undefined && mergedRaw.seed === undefined) {
    mergedRaw.seed = input.seed;
  }

  if (isBlueprintV1) {
    if (input.entrances !== undefined) {
      if (!Array.isArray(input.entrances)) {
        errors.push('Blueprint "entrances" field must be an array');
      } else {
        const seenIds = new Set();
        for (let i = 0; i < input.entrances.length; i++) {
          const ent = input.entrances[i];
          if (!ent || typeof ent !== 'object') {
            errors.push(`Entrance at index ${i} must be an object`);
            continue;
          }
          if (!ent.id || typeof ent.id !== 'string') {
            errors.push(`Entrance at index ${i} is missing a string "id"`);
          } else if (seenIds.has(ent.id)) {
            errors.push(`Duplicate entrance ID "${ent.id}"`);
          } else {
            seenIds.add(ent.id);
          }
          const pos = ent.door?.position || ent.position;
          if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y)) || !Number.isFinite(Number(pos.z))) {
            errors.push(`Entrance "${ent.id || i}" has invalid door position coordinates`);
          }
        }
        // If settings omit gameplay entrance fields, hydrate from primary entrance in blueprint
        const mainEnt = input.entrances.find((e) => e && (e.id === 'entrance_main' || e.role === 'main')) || input.entrances[0];
        if (mainEnt && typeof mainEnt === 'object') {
          if (mergedRaw.entranceEnabled === undefined && typeof mainEnt.enabled === 'boolean') mergedRaw.entranceEnabled = mainEnt.enabled;
          if (mergedRaw.entranceCategory === undefined && typeof mainEnt.category === 'string') mergedRaw.entranceCategory = mainEnt.category;
          if (mergedRaw.entranceLocked === undefined && typeof mainEnt.lockedByDefault === 'boolean') mergedRaw.entranceLocked = mainEnt.lockedByDefault;
          if (mergedRaw.interactionLabel === undefined && typeof mainEnt.interactionLabel === 'string') mergedRaw.interactionLabel = mainEnt.interactionLabel;
          const trig = mainEnt.trigger || mainEnt;
          if (mergedRaw.triggerWidth === undefined && Number.isFinite(Number(trig.width ?? trig.triggerWidth))) mergedRaw.triggerWidth = Number(trig.width ?? trig.triggerWidth);
          if (mergedRaw.triggerHeight === undefined && Number.isFinite(Number(trig.height ?? trig.triggerHeight))) mergedRaw.triggerHeight = Number(trig.height ?? trig.triggerHeight);
          if (mergedRaw.triggerDepth === undefined && Number.isFinite(Number(trig.depth ?? trig.triggerDepth))) mergedRaw.triggerDepth = Number(trig.depth ?? trig.triggerDepth);
          if (mergedRaw.interactionDistance === undefined && Number.isFinite(Number(trig.maxDistance ?? trig.maxInteractionDistance))) {
            mergedRaw.interactionDistance = Number(trig.maxDistance ?? trig.maxInteractionDistance);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  try {
    const sanitised = sanitisePreset(mergedRaw);
    const blueprint = generateBuildingBlueprint(sanitised, {
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : undefined,
      templateId: typeof input.templateId === 'string' && input.templateId.trim() ? input.templateId.trim() : undefined,
      metadataExtensions: input.metadata?.extensions
    });
    return {
      valid: true,
      isLegacySettings: !isBlueprintV1,
      errors: [],
      settings: sanitised,
      blueprint
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err.message || 'Blueprint settings could not be sanitised']
    };
  }
}


let materials = new Map();
let modelTextures = new Map();
let currentLightingMode = 'day';
let currentMaxAnisotropy = 1;

function setMaterialLightingMode(mode) {
  currentLightingMode = mode;
}

function setMaterialMaxAnisotropy(aniso) {
  currentMaxAnisotropy = aniso;
}

function solid(hex, options = {}) {
  const key = 'solid:' + hex + ':' + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color: hex, ...options }));
  return materials.get(key);
}

let gratingCanvasCache = null;

function getGratingCanvas(hex) {
  if (gratingCanvasCache && gratingCanvasCache.hex === hex) {
    return gratingCanvasCache.canvas;
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(hex);
  const highlight = base.clone().lerp(new THREE.Color('#8a9aa3'), 0.28).getStyle();
  const shadow = base.clone().lerp(new THREE.Color('#14181a'), 0.35).getStyle();
  const mid = base.getStyle();

  ctx.clearRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;
  const barW = 6;
  const crossW = 5;

  // Cross-bars (horizontal)
  for (let i = 0; i < cells; i++) {
    const y = Math.round(i * step);
    ctx.fillStyle = shadow;
    ctx.fillRect(0, y, size, crossW);
    ctx.fillStyle = mid;
    ctx.fillRect(0, y, size, crossW - 1);
  }

  // Primary bearing bars (vertical)
  for (let i = 0; i < cells; i++) {
    const x = Math.round(i * step);
    ctx.fillStyle = shadow;
    ctx.fillRect(x, 0, barW, size);
    ctx.fillStyle = mid;
    ctx.fillRect(x, 0, barW - 1, size);
    ctx.fillStyle = highlight;
    ctx.fillRect(x + 1, 0, 1, size);
  }

  gratingCanvasCache = { hex, canvas };
  return canvas;
}

function gratingMaterial(hex = '#3a4347', width = 1, depth = 1) {
  const rx = Math.max(1, Math.round(width * 2.5 * 10) / 10);
  const rz = Math.max(1, Math.round(depth * 2.5 * 10) / 10);
  const key = `grating:${hex}:${rx}:${rz}`;
  if (materials.has(key)) return materials.get(key);

  const canvas = getGratingCanvas(hex);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, rz);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(currentMaxAnisotropy || 1, 4);

  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    color: 0xffffff,
    alphaTest: 0.45,
    side: THREE.DoubleSide
  });

  materials.set(key, mat);
  modelTextures.set(key, texture);
  return mat;
}

function puddleMaterial() {
  const key = 'puddle-water';
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshPhongMaterial({
      color: '#233846',
      emissive: '#0a1620',
      emissiveIntensity: 0.25,
      specular: '#c8e6ff',
      shininess: 140
    }));
  }
  return materials.get(key);
}

function glassMaterial(hex, lit = false, options = {}) {
  const mode = options.lightingMode || currentLightingMode;
  const isDay = mode === 'day';
  const isNight = mode === 'night' || mode === 'late_night' || mode === 'evening';
  const profile = options.profile || 'auto';
  const key = 'glass:' + hex + ':' + lit + ':' + mode + ':' + profile;

  if (!materials.has(key)) {
    const color = new THREE.Color(hex);
    let emissiveHex = '#050b10';
    let emissiveIntensity = 0.08;

    if (lit) {
      if (profile === 'commercial') {
        color.lerp(new THREE.Color('#dbeafe'), isDay ? 0.45 : 0.85);
        emissiveHex = isNight ? '#93c5fd' : '#bfdbfe';
        emissiveIntensity = isNight ? 0.88 : 0.45;
      } else if (profile === 'derelict') {
        color.lerp(new THREE.Color('#a3b18a'), 0.5);
        emissiveHex = '#4a5335';
        emissiveIntensity = 0.35;
      } else {
        color.lerp(new THREE.Color('#ffd085'), isDay ? 0.58 : 0.88);
        emissiveHex = isNight ? '#d97706' : '#b45309';
        emissiveIntensity = isNight ? 0.82 : 0.42;
      }
    }

    materials.set(key, new THREE.MeshPhongMaterial({
      color,
      emissive: emissiveHex,
      emissiveIntensity,
      shininess: 90,
      specular: '#3d4f58'
    }));
  }
  return materials.get(key);
}

function graffitiMaterial(seed, style = 'mixed', variantIdx = 0) {
  const resolvedStyle = style === 'mixed'
    ? ['tags', 'stencils', 'posters'][Math.abs(variantIdx + seed) % 3]
    : style;
  const key = 'graffiti:' + seed + ':' + resolvedStyle;
  if (materials.has(key)) return materials.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const r = rng32(seed + 419);

  ctx.clearRect(0, 0, 256, 128);

  const palette = ['#ef4444', '#f8fafc', '#38bdf8', '#facc15', '#fb923c', '#ec4899', '#a855f7', '#22d3ee', '#4ade80'];
  const tagColor = palette[Math.floor(r() * palette.length)];
  const accentColor = palette[Math.floor(r() * palette.length)];

  if (resolvedStyle === 'stencils') {
    const labels = ['SECTOR 04', 'NO TRESPASS', 'HIGH VOLT', 'KEEP CLEAR', 'PARAGON PD', 'ZONE B-12'];
    const text = labels[Math.floor(r() * labels.length)];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(16, 14, 224, 100);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f87171';
    ctx.strokeRect(20, 18, 216, 92);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 66);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(36, 82, 184, 8);
  } else if (resolvedStyle === 'posters') {
    const titles = ['NIGHT CITY', 'LIVE SHOW', 'NOCTURNE', 'CLUB APEX', 'SHOWDOWN', 'METRO ART'];
    const title = titles[Math.floor(r() * titles.length)];
    // Two overlapping wheatpaste flyers
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(24, 14, 140, 100);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(24, 14, 140, 26);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 94, 33);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('TONIGHT 9PM', 94, 72);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(142, 26, 92, 84);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(142, 26, 92, 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('INFO #12', 188, 76);
  } else {
    const tagWords = ['VORTEX', 'BEHR', 'PULSE', 'NEO', 'RUSH', 'CIPHER', 'ECHO', 'APEX', 'FLUX', 'KINGS'];
    const word = tagWords[Math.floor(r() * tagWords.length)];
    // Spray-paint halo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
    ctx.beginPath();
    ctx.ellipse(128, 62, 106, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'italic bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(word, 128, 72);
    ctx.fillStyle = tagColor;
    ctx.fillText(word, 128, 72);

    ctx.fillStyle = accentColor;
    ctx.fillRect(46, 80, 164, 5);

    ctx.fillStyle = tagColor;
    for (let i = 0; i < 5; i++) {
      const dripX = 56 + r() * 144;
      const dripH = 12 + r() * 28;
      ctx.fillRect(dripX, 76, 4, dripH);
      ctx.beginPath();
      ctx.arc(dripX + 2, 76 + dripH, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    opacity: 0.96,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  materials.set(key, mat);
  modelTextures.set(key, texture);
  return mat;
}

function textureMaterial(kind, mainHex, secondaryHex, mortarHex, cfg, keySeed, width, height) {
  const n = Math.floor(cfg.brickScale * 10);
  const v = Math.floor(cfg.colorVariation * 100);
  const age = Math.floor(cfg.age * 100);
  const dmg = Math.floor(cfg.damage * 100);
  const grimeHex = colorHex(cfg.grimeColor);
  const id = [kind, mainHex, secondaryHex, mortarHex, grimeHex, n, v, age, dmg, keySeed, Math.round(width * 10), Math.round(height * 10)].join('|');
  if (materials.has(id)) return materials.get(id);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32(keySeed + 7919);
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
  const grime = hexToRgb(grimeHex);

  ctx.fillStyle = kind === 'brick' || kind === 'stone' ? mortarHex : mainHex;
  ctx.fillRect(0, 0, 256, 256);

  if (kind === 'brick' || kind === 'stone') {
    const rows = kind === 'brick' ? 12 : 7;
    const cols = kind === 'brick' ? 5 : 4;
    const bh = 256 / rows;
    const bw = 256 / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < cols + 1; x++) {
        const shift = (y % 2) * bw * 0.5;
        const px = x * bw + shift;
        const py = y * bh;
        const brightness = (r() - 0.5) * cfg.colorVariation * 1.1;
        ctx.fillStyle = mix(mainHex, secondaryHex, clamp(0.34 + brightness, 0, 1));
        const grout = kind === 'brick' ? 2.2 : 3.5;
        ctx.fillRect(px + grout, py + grout, bw - grout * 1.7, bh - grout * 1.8);
        if (cfg.age > 0.08 && r() < cfg.age * 0.55) {
          const alpha = (r() * cfg.age * 0.35).toFixed(3);
          ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
          ctx.fillRect(px + 3, py + bh * 0.52, bw - 6, bh * 0.34);
        }
      }
    }
  } else {
    ctx.strokeStyle = mix(mainHex, mortarHex, 0.38);
    ctx.lineWidth = kind === 'concrete' ? 2 : 1;
    const panelStep = kind === 'concrete' ? 64 : 128;
    for (let p = panelStep; p < 256; p += panelStep) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 240; i++) {
      const patchColor = r() > 0.5 ? secondaryHex : mortarHex;
      ctx.fillStyle = patchColor;
      ctx.globalAlpha = r() * 0.14 * (cfg.colorVariation + 0.15);
      ctx.fillRect(r() * 256, r() * 256, randBetween(r, 3, 22), randBetween(r, 2, 12));
    }
    ctx.globalAlpha = 1;
  }

  if (cfg.age > 0.05) {
    const streaks = Math.floor(95 * cfg.age);
    for (let i = 0; i < streaks; i++) {
      const alpha = (r() * cfg.age * 0.38).toFixed(3);
      ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
      ctx.fillRect(r() * 255, r() * 255, randBetween(r, 3, 42), randBetween(r, 3, 26));
    }
  }

  if (cfg.damage > 0.05) {
    const cracks = Math.ceil(cfg.damage * 14);
    for (let i = 0; i < cracks; i++) {
      ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${(0.35 + cfg.damage * 0.4).toFixed(2)})`;
      const cx = r() * 230;
      const cy = r() * 230;
      ctx.fillRect(cx, cy, randBetween(r, 8, 28), randBetween(r, 4, 16));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.repeat.set(
    Math.max(1, (width / (kind === 'brick' ? 4.5 : 6)) * cfg.brickScale),
    Math.max(0.7, (height / (kind === 'brick' ? 3 : 4)) * cfg.brickScale)
  );
  texture.anisotropy = Math.min(currentMaxAnisotropy || 1, 4);
  const mat = new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff });
  materials.set(id, mat);
  modelTextures.set(id, texture);
  return mat;
}

function registerTexture(key, tex) {
  modelTextures.set(key, tex);
  return tex;
}

function clearMaterialCache() {
  for (const mat of materials.values()) mat.dispose();
  for (const tex of modelTextures.values()) tex.dispose();
  materials.clear();
  modelTextures.clear();
}


let signCounter = 0;

function resetPrimitiveCounters() {
  signCounter = 0;
}

function box(group, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function slabBox(group, seg, y, h, inset, material, options = {}) {
  const w = seg.w - inset * 2;
  const d = seg.d - inset * 2;
  const cut = Math.max(0, Math.min(seg.cornerCut || 0, w * 0.48, d * 0.48) - inset * 0.5);
  if (w <= 0.01 || d <= 0.01 || h <= 0.001) return null;
  if (cut <= 0.01) {
    return box(group, seg.x, y, seg.z, w, h, d, material, options);
  }
  const hw = w * 0.5;
  const hd = d * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd - cut);
  shape.lineTo(hw - cut, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(seg.x, y + h * 0.5, seg.z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function cylinder(group, x, y, z, top, bottom, h, material, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function line(group, a, b, width, material) {
  const p = new THREE.Vector3(...a);
  const q = new THREE.Vector3(...b);
  const direction = q.clone().sub(p);
  const len = direction.length();
  if (len <= 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 6), material);
  mesh.position.copy(p).add(q).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function sagCable(group, a, b, sag, radius, material, segments = 6) {
  const p = new THREE.Vector3(...a);
  const q = new THREE.Vector3(...b);
  let prev = p;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(p, q, t);
    pt.y -= Math.sin(t * Math.PI) * sag;
    line(group, [prev.x, prev.y, prev.z], [pt.x, pt.y, pt.z], radius, material);
    prev = pt;
  }
}

function signboard(group, txt, w, h, base = '#302e32', fg = '#f5dea6') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px Arial';
  const text = (txt || 'CITY').toUpperCase().slice(0, 28);
  let size = 54;
  while (size > 18 && ctx.measureText(text).width > 460) {
    size -= 3;
    ctx.font = `bold ${size}px Arial`;
  }
  ctx.fillText(text, 256, 65);
  const tex = new THREE.CanvasTexture(canvas);
  signCounter++;
  registerTexture('sign-' + signCounter, tex);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  face.position.z = 0.065;
  const frame = box(group, 0, 0, 0, w + 0.14, h + 0.14, 0.11, solid('#191c20'));
  group.add(face);
  return frame;
}

function worldRoot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}


function overrideColor(cfg, floor, side, base) {
  let value = base;
  for (const item of cfg.floorOverrides || []) {
    if (item.floor === floor && (item.side === side || item.side === 'all')) value = item.color;
  }
  return value;
}

function pickWindowDamageMode(cfg, r, forceBroken = false) {
  const isDamaged = forceBroken || (cfg.damage > 0 && r() < cfg.damage * 0.72);
  if (!isDamaged) return 'none';
  const style = cfg.windowDamageStyle || 'mixed';
  if (style === 'boarded') return 'boarded';
  if (style === 'partial') return 'partial';
  if (style === 'broken') return 'broken';
  const roll = r();
  if (roll < 0.36) return 'boarded';
  if (roll < 0.7) return 'partial';
  return 'broken';
}

function addWindow(parent, side, baseX, baseY, baseZ, cfg, r, width, height, options = {}) {
  const group = worldRoot(parent, baseX, baseY, baseZ);
  if (options.windowId) {
    group.name = 'WindowGroup_' + options.windowId;
  }
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
  group.rotation.y = rotMap[side] || 0;

  const damageMode = options.damageMode || 'none';
  const frame = solid(cfg.windowFrameColor);
  const lit = options.isLit !== undefined
    ? Boolean(options.isLit)
    : (damageMode === 'none' && cfg.windowLighting > 0 && (cfg.windowLighting >= 0.99 || r() < cfg.windowLighting));
  const glass = glassMaterial(cfg.glassColor, lit, {
    lightingMode: cfg.windowLightingTime || 'day',
    profile: cfg.windowLightingProfile || 'auto'
  });
  const dark = solid('#151a1d');
  const trim = solid(cfg.trimColor);

  let w = Math.min(width, options.maxW || width);
  let h = Math.min(height, cfg.floorHeight * 0.76);
  if (cfg.windowStyle === 'square') h = Math.min(h, w * 1.02);
  if (cfg.windowStyle === 'tall') h = Math.min(cfg.floorHeight * 0.78, h * 1.14);
  if (cfg.windowStyle === 'modern') w = Math.min(w * 1.06, options.maxW || w);

  const showShutters = cfg.shutters && !options.noShutters;
  const shutterW = showShutters ? clamp(w * 0.22, 0.16, 0.28) : 0;
  if (showShutters && options.maxW && w + shutterW * 2 + 0.22 > options.maxW) {
    w = Math.max(0.48, options.maxW - shutterW * 2 - 0.22);
  }

  const isArched = cfg.windowStyle === 'arched';
  const archRadius = isArched ? w * 0.5 : 0;
  const rectH = isArched ? Math.max(0.45, h - archRadius * 0.7) : h;
  const rectY = isArched ? -archRadius * 0.35 : 0;

  // Recess plate behind glass
  box(group, 0, rectY, 0.007, w + 0.04, rectH + 0.04, 0.014, dark, { cast: false });

  // Window frame
  const frameT = 0.085;
  const frameD = 0.095;
  const frameZ = frameD * 0.5;
  box(group, -w * 0.5 - frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
  box(group, w * 0.5 + frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
  box(group, 0, rectY - rectH * 0.5 - frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);

  if (isArched) {
    const archY = rectY + rectH * 0.5;
    const archShape = new THREE.Shape();
    archShape.absarc(0, 0, archRadius + 0.01, 0, Math.PI, false);
    archShape.closePath();

    // Arch glass
    const archGlassGeo = new THREE.ExtrudeGeometry(archShape, { depth: 0.044, bevelEnabled: false, curveSegments: 16 });
    const archMat = (damageMode === 'broken' || damageMode === 'partial') ? dark : glass;
    const archGlass = new THREE.Mesh(archGlassGeo, archMat);
    archGlass.position.set(0, archY, 0.012);
    group.add(archGlass);

    // Arch muntins
    box(group, 0, archY, 0.068, w, 0.05, 0.036, frame);
    box(group, 0, archY + archRadius * 0.5, 0.068, 0.05, archRadius, 0.036, frame);

    const archFrame = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT * 0.45, frameT * 0.55, 8, 18, Math.PI), frame);
    archFrame.position.set(0, archY, frameZ);
    group.add(archFrame);

    if (cfg.trimAmount > 0.05) {
      const archTrim = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT + 0.03, 0.045, 8, 18, Math.PI), trim);
      archTrim.position.set(0, archY, frameZ + 0.015);
      group.add(archTrim);
    }
  } else {
    box(group, 0, rectY + rectH * 0.5 + frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);
    if (cfg.trimAmount > 0.12) {
      box(group, 0, rectY + rectH * 0.5 + frameT + 0.055, frameZ + 0.02, w + frameT * 2 + 0.14, 0.1, 0.13, trim);
    }
  }

  // Glass pane or damaged cavity
  if (damageMode === 'broken' || damageMode === 'partial') {
    box(group, 0, rectY, 0.025, w, rectH, 0.028, dark, { cast: false });
    const shardMat = glassMaterial(cfg.glassColor, false);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        if (r() < 0.78) {
          const sw = w * randBetween(r, 0.18, 0.34);
          const sh = rectH * randBetween(r, 0.16, 0.32);
          const shard = box(group, sx * (w * 0.5 - sw * 0.45), rectY + sy * (rectH * 0.5 - sh * 0.45), 0.045, sw, sh, 0.025, shardMat, { cast: false });
          if (shard) shard.rotation.z = sx * sy * randBetween(r, 0.15, 0.42);
        }
      }
    }
    line(group, [-w * 0.38, rectY - rectH * 0.34, 0.052], [w * 0.32, rectY + rectH * 0.32, 0.052], 0.012, frame);
  } else {
    const pane = box(group, 0, rectY, 0.034, w, rectH, 0.044, glass, { cast: false });
    if (pane && options.windowId) {
      pane.name = 'WindowPane_' + options.windowId;
      pane.userData = {
        windowId: options.windowId,
        roomId: options.roomId,
        floor: options.floor,
        facade: side,
        lit
      };
    }
  }

  // Curtains
  if (cfg.curtains && !options.noCurtains && damageMode !== 'boarded') {
    const curtainTone = lit ? '#ebd8b7' : (r() > 0.5 ? '#a39788' : '#7f8c96');
    const curtainMat = solid(curtainTone);
    const panelW = w * 0.25;
    box(group, 0, rectY + rectH * 0.5 - 0.05, 0.058, w * 0.96, 0.09, 0.012, curtainMat, { cast: false });
    for (const dir of [-1, 1]) {
      if (damageMode !== 'none' && r() < 0.35) continue;
      const cGroup = worldRoot(group, dir * (w * 0.5 - panelW * 0.54), rectY, 0.058);
      if (damageMode !== 'none') cGroup.rotation.z = dir * randBetween(r, -0.14, 0.18);
      box(cGroup, 0, rectH * 0.04, 0, panelW, rectH * 0.88, 0.012, curtainMat, { cast: false });
      box(cGroup, -dir * panelW * 0.16, -rectH * 0.18, 0.004, panelW * 0.62, rectH * 0.46, 0.012, curtainMat, { cast: false });
    }
  }

  // Muntins
  if (cfg.windowStyle === 'sash' || cfg.windowStyle === 'arched') {
    if (damageMode === 'none' || r() < 0.5) box(group, 0, rectY, 0.068, 0.052, rectH, 0.036, frame);
    box(group, 0, rectY, 0.068, w, 0.052, 0.036, frame);
  } else if (cfg.windowStyle === 'modern') {
    box(group, 0, rectY, 0.068, 0.048, rectH, 0.036, frame);
  } else if (cfg.windowStyle === 'tall') {
    box(group, 0, rectY - rectH * 0.18, 0.068, w, 0.052, 0.036, frame);
    box(group, 0, rectY + rectH * 0.22, 0.068, w, 0.045, 0.036, frame);
  }

  // Sill
  box(group, 0, rectY - rectH * 0.5 - frameT - 0.035, 0.065, w + frameT * 2 + 0.16, 0.095, 0.18, trim);

  // Shutters
  if (showShutters) {
    const shutterMat = solid(cfg.doorColor);
    const sx = w * 0.5 + frameT + 0.02 + shutterW * 0.5;
    const wearAmount = Math.max(cfg.damage, cfg.age > 0.35 ? (cfg.age - 0.35) * 0.85 : 0);
    for (const dir of [-1, 1]) {
      if (cfg.damage > 0.45 && r() < cfg.damage * 0.22) continue;
      const shGroup = worldRoot(group, dir * sx, rectY, 0.042);
      if (wearAmount > 0.06 && r() < 0.78) {
        shGroup.rotation.z = dir * randBetween(r, -0.24, 0.28) * wearAmount;
        shGroup.rotation.y = -dir * randBetween(r, 0, 0.26) * wearAmount;
      }
      box(shGroup, 0, 0, 0, shutterW, rectH + 0.04, 0.055, shutterMat);
      box(shGroup, 0, 0, 0.03, shutterW * 0.76, 0.05, 0.02, frame);
      box(shGroup, 0, rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
      box(shGroup, 0, -rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
    }
  }

  // Boarded planks
  if (damageMode === 'boarded') {
    const planks = Math.max(3, Math.min(5, Math.round(rectH / 0.38)));
    const plankColors = ['#69503c', '#5b4331', '#755a43', '#4f3a2b'];
    for (const dir of [-1, 1]) {
      box(group, dir * (w * 0.38), rectY, 0.095, 0.11, rectH * 0.94, 0.03, solid('#4e392a'));
    }
    for (let p = 0; p < planks; p++) {
      const py = rectY - rectH * 0.4 + (p / (planks - 1)) * (rectH * 0.8);
      const plank = box(group, 0, py, 0.115, w + 0.22, (rectH / planks) * 0.82, 0.038, solid(pick(r, plankColors)));
      if (plank) plank.rotation.z = randBetween(r, -0.06, 0.06);
    }
  } else if (damageMode === 'partial') {
    const plankColors = ['#69503c', '#5b4331', '#755a43'];
    const p1 = box(group, 0, rectY + rectH * 0.14, 0.105, w + 0.18, 0.17, 0.038, solid(pick(r, plankColors)));
    if (p1) p1.rotation.z = randBetween(r, 0.08, 0.24);
    if (r() < 0.78) {
      const p2 = box(group, 0, rectY - rectH * 0.18, 0.112, w + 0.16, 0.16, 0.038, solid(pick(r, plankColors)));
      if (p2) p2.rotation.z = randBetween(r, -0.22, -0.06);
    }
  }

  // AC unit
  if (options.hasAC && damageMode !== 'boarded') {
    const acW = clamp(w * 0.58, 0.52, 0.82);
    const acH = clamp(rectH * 0.28, 0.34, 0.48);
    const acD = 0.46;
    const acY = rectY - rectH * 0.5 + acH * 0.5 + 0.02;
    const acGroup = worldRoot(group, 0, acY, acD * 0.42);
    if (cfg.age > 0.3 || cfg.damage > 0.15) {
      acGroup.rotation.x = 0.065;
      acGroup.rotation.z = randBetween(r, -0.04, 0.04);
    }
    box(acGroup, 0, 0, 0, acW, acH, acD, solid(cfg.age > 0.45 ? '#787d7a' : '#8e9699'));
    box(acGroup, 0, 0, acD * 0.5 + 0.01, acW * 0.9, acH * 0.84, 0.03, solid('#343a3e'));
    box(acGroup, -acW * 0.18, 0, acD * 0.5 + 0.025, acW * 0.44, acH * 0.68, 0.02, solid('#1d2225'));
    box(acGroup, acW * 0.24, 0, acD * 0.5 + 0.025, acW * 0.28, acH * 0.68, 0.02, solid('#495156'));
    for (const sx of [-1, 1]) {
      line(acGroup, [sx * acW * 0.36, -acH * 0.5 - 0.18, -acD * 0.28], [sx * acW * 0.36, -acH * 0.5, acD * 0.35], 0.022, solid('#454b4e'));
    }
  }

  return group;
}

function addDoor(parent, side, x, y, z, cfg, wide = false) {
  const group = worldRoot(parent, x, y, z);
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
  group.rotation.y = rotMap[side] || 0;

  const { width: w, height: h } = resolveDoorDimensions(cfg, wide);
  const trim = solid(cfg.trimColor);
  const doorMat = wide ? glassMaterial(cfg.glassColor, cfg.windowLighting > 0.25) : solid(cfg.doorColor);

  // Door frame and human-scaled trim
  const jambT = 0.11;
  box(group, -w * 0.5 - jambT * 0.5, h * 0.5, 0.05, jambT, h + jambT, 0.11, trim);
  box(group, w * 0.5 + jambT * 0.5, h * 0.5, 0.05, jambT, h + jambT, 0.11, trim);
  box(group, 0, h + jambT * 0.5, 0.05, w + jambT * 2, jambT, 0.11, trim);
  box(group, 0, h * 0.5, 0.032, w, h, 0.06, doorMat);
  if (wide) {
    box(group, 0, h * 0.5, 0.068, 0.05, h, 0.035, trim);
  }
  box(group, wide ? 0.12 : w * 0.34, h * 0.47, 0.078, 0.06, 0.14, 0.05, solid('#d5b66c'));
  box(group, 0, h + jambT + 0.055, 0.075, w + 0.34, 0.11, 0.15, trim);

  if (cfg.doorStyle === 'stoop') {
    for (const dir of [-1, 1]) {
      box(group, dir * (w * 0.5 + 0.16), h * 0.5, 0.105, 0.12, h + 0.10, 0.18, trim);
    }
    box(group, 0, h + 0.17, 0.15, w + 0.52, 0.14, 0.30, trim);
  }
  return group;
}

function wallForSide(group, seg, index, side, cfg, r, cutaway, seed, firePlacement = null, tallLayout = null) {
  if (cutaway && side === 'front') return;
  if (seg.skipWalls && seg.skipWalls[side]) return;

  const floorNum = index + 1;
  const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
  const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
  const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
  const override = overrideColor(cfg, floorNum, side, main);
  const long = side === 'front' || side === 'back';
  const cut = seg.cornerCut || 0;
  const t = cfg.wallThickness;

  const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
  const spanEnd = long
    ? seg.x + seg.w * 0.5 - (side === 'front' ? cut : 0)
    : seg.z + seg.d * 0.5 - (side === 'right' ? cut : 0);
  if (spanEnd - spanStart <= 0.2) return;

  const blocked = [...(seg.occlusions?.[side] || [])];
  const exposedSpans = subtractIntervals(spanStart, spanEnd, blocked);

  for (const [s, e] of exposedSpans) {
    let ws = s;
    let we = e;
    if (!long) {
      if (Math.abs(ws - (seg.z - seg.d * 0.5)) < 0.02 && !seg.skipWalls?.back) ws += t;
      if (Math.abs(we - (seg.z + seg.d * 0.5)) < 0.02 && !seg.skipWalls?.front && (side !== 'right' || cut <= 0.01)) we -= t;
    }
    const len = we - ws;
    if (len <= 0.05) continue;
    const mid = (ws + we) * 0.5;
    const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed, len, cfg.floorHeight);

    if (side === 'front') {
      box(group, mid, y, seg.z + seg.d * 0.5 - t * 0.5, len, cfg.floorHeight, t, mat);
    } else if (side === 'back') {
      box(group, mid, y, seg.z - seg.d * 0.5 + t * 0.5, len, cfg.floorHeight, t, mat);
    } else if (side === 'left') {
      box(group, seg.x - seg.w * 0.5 + t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
    } else if (side === 'right') {
      box(group, seg.x + seg.w * 0.5 - t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
    }
  }

  const trim = solid(cfg.trimColor);

  if (index === 0 && cfg.age > 0.05) {
    const grimeMat = solid(cfg.grimeColor);
    const grimeH = 0.22 + cfg.age * 0.35;
    for (const [s, e] of exposedSpans) {
      const len = e - s;
      const mid = (s + e) * 0.5;
      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.015 : seg.z - seg.d * 0.5 - 0.015;
        box(group, mid, grimeH * 0.5, zOut, len, grimeH, 0.03, grimeMat, { cast: false });
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.015 : seg.x + seg.w * 0.5 + 0.015;
        box(group, xOut, grimeH * 0.5, mid, 0.03, grimeH, len, grimeMat, { cast: false });
      }
    }
  }

  if (index === cfg.floors - 1 && (cfg.roofPuddles || cfg.age > 0.45)) {
    const stainMat = solid(cfg.grimeColor);
    const topY = (index + 1) * cfg.floorHeight;
    for (const [s, e] of exposedSpans) {
      const drips = Math.max(1, Math.floor((e - s) / 3.2));
      for (let dIdx = 0; dIdx < drips; dIdx++) {
        const pos = randBetween(r, s + 0.35, e - 0.35);
        const dripH = randBetween(r, 0.45, 1.25);
        const dripW = randBetween(r, 0.25, 0.65);
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.014 : seg.z - seg.d * 0.5 - 0.014;
          box(group, pos, topY - dripH * 0.5 - 0.14, zOut, dripW, dripH, 0.02, stainMat, { cast: false });
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.014 : seg.x + seg.w * 0.5 + 0.014;
          box(group, xOut, topY - dripH * 0.5 - 0.14, pos, 0.02, dripH, dripW, stainMat, { cast: false });
        }
      }
    }
  }

  if (cfg.damage > 0.15) {
    const spallMat = solid(cfg.secondaryWallColor);
    const darkCore = solid('#322926');
    for (const [s, e] of exposedSpans) {
      if (e - s > 2.2 && r() < cfg.damage * 0.6) {
        const pos = randBetween(r, s + 0.6, e - 0.6);
        const sy = index * cfg.floorHeight + randBetween(r, 0.35, cfg.floorHeight - 0.35);
        const pw = randBetween(r, 0.45, 1.1);
        const ph = randBetween(r, 0.28, 0.62);
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.012 : seg.z - seg.d * 0.5 - 0.012;
          box(group, pos, sy, zOut, pw, ph, 0.025, spallMat, { cast: false });
          box(group, pos, sy, zOut + (side === 'front' ? 0.006 : -0.006), pw * 0.6, ph * 0.55, 0.02, darkCore, { cast: false });
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.012 : seg.x + seg.w * 0.5 + 0.012;
          box(group, xOut, sy, pos, 0.025, ph, pw, spallMat, { cast: false });
          box(group, xOut + (side === 'left' ? -0.006 : 0.006), sy, pos, 0.02, ph * 0.55, pw * 0.6, darkCore, { cast: false });
        }
      }
    }
  }

  if (cfg.trimAmount > 0.04) {
    const trimH = 0.11 + cfg.trimAmount * 0.11;
    const topTrimH = 0.13 + cfg.trimAmount * 0.16;
    for (const [s, e] of exposedSpans) {
      const len = e - s;
      const mid = (s + e) * 0.5;
      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.04 : seg.z - seg.d * 0.5 - 0.04;
        box(group, mid, index * cfg.floorHeight + trimH * 0.5 + 0.005, zOut, len + 0.04, trimH, 0.12, trim);
        if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
          box(group, mid, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, zOut, len + 0.08, topTrimH, 0.18, trim);
        }
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.04 : seg.x + seg.w * 0.5 + 0.04;
        box(group, xOut, index * cfg.floorHeight + trimH * 0.5 + 0.005, mid, 0.12, trimH, len + 0.04, trim);
        if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
          box(group, xOut, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, mid, 0.18, topTrimH, len + 0.08, trim);
        }
      }
    }
  }

  if (index === 0 && side === 'front' && seg.hasEntrance && cfg.groundUse === 'shop') return;
  const windowBlocked = [...blocked];
  if (index === 0 && side === 'front' && seg.hasEntrance) {
    const doorCenter = seg.x - cut * 0.5;
    windowBlocked.push([doorCenter - 1.95, doorCenter + 1.95]);
  }
  if (index === 0 && side === 'front' && cfg.basementEntrance && seg.hasEntrance) {
    const mainCx = seg.x - cut * 0.5;
    const baseCx = clamp(mainCx - Math.max(2.4, seg.w * 0.28), seg.x - seg.w * 0.5 + 0.9, mainCx - 1.8);
    windowBlocked.push([baseCx - 1.1, baseCx + 1.1]);
  }
  if (index === 0 && side === 'back' && (cfg.rearEntrance || cfg.deliveryEntrance)) {
    const rearExt = seg.isExtension && seg.extIndex === 0;
    if (rearExt || (!seg.isExtension && !seg.skipWalls?.back)) {
      windowBlocked.push([seg.x - 1.5, seg.x + 1.5]);
    }
  }
  if (index === 0 && (side === 'left' || side === 'right')) {
    if ((side === 'left' && (cfg.sideEntrance === 'left' || cfg.sideEntrance === 'both' || cfg.deliveryEntrance)) ||
        (side === 'right' && (cfg.sideEntrance === 'right' || cfg.sideEntrance === 'both'))) {
      windowBlocked.push([seg.z - 1.2, seg.z + 1.2]);
    }
  }

  const windowSpans = subtractIntervals(spanStart + 0.45, spanEnd - 0.45, windowBlocked);
  const totalLength = long ? seg.w : seg.d;
  const desiredCols = long ? cfg.windowsX : cfg.windowsSide;
  const shutterPad = cfg.shutters ? 0.62 : 0.34;
  const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
  const wy = index * cfg.floorHeight + cfg.floorHeight * 0.51;

  const fireCoordOnFloor = firePlacement && firePlacement.side === side
    ? getFireEscapeWallAnchor(seg, side, firePlacement.coord, firePlacement.deckW).coord
    : null;

  for (const [s, e] of windowSpans) {
    const avail = e - s;
    if (avail < Math.min(0.85, cfg.windowWidth * 0.7)) continue;
    const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
    const maxFit = Math.max(1, Math.floor(avail / (cfg.windowWidth + shutterPad)));
    const windowCount = Math.max(1, Math.min(proportional, maxFit));
    const spacing = avail / windowCount;
    const ww = Math.min(cfg.windowWidth, spacing * (cfg.shutters ? 0.58 : 0.74), avail - 0.16);

    for (let j = 0; j < windowCount; j++) {
      const pos = s + (j + 0.5) * spacing;
      const windowHalfBand = ww * 0.52 + (cfg.shutters ? 0.36 : 0.08);
      if (isWallPointBlockedByTallStaircase(tallLayout, side, index, pos, windowHalfBand)) {
        continue;
      }
      const x = long ? pos : (side === 'left' ? seg.x - seg.w * 0.5 : seg.x + seg.w * 0.5);
      const z = long ? (side === 'front' ? seg.z + seg.d * 0.5 : seg.z - seg.d * 0.5) : pos;

      const hasFireHere = fireCoordOnFloor !== null && Math.abs(pos - fireCoordOnFloor) < firePlacement.deckW * 0.58;
      const forceFirstDamage = cfg.damage >= 0.05 && index === Math.min(1, cfg.floors - 1) && j === 0 && side === 'front';
      const damageMode = pickWindowDamageMode(cfg, r, forceFirstDamage);

      let hasBalcony = false;
      if (!hasFireHere && cfg.balconies > 0 && (index > 0 || cfg.floors === 1)) {
        const guaranteedFront = side === 'front' && index === Math.min(1, cfg.floors - 1) && j === 0;
        const sideChance = side === 'front' ? cfg.balconies * 0.85 : cfg.balconies * 0.72;
        if (guaranteedFront || r() < sideChance) {
          addBalcony(group, side, x, wy, z, ww + 0.75, cfg);
          hasBalcony = true;
        }
      }

      const hasAC = !hasBalcony && !hasFireHere && cfg.acUnits && (index > 0 || cfg.groundUse === 'residential') && (r() < 0.38 || (index === 1 && j === windowCount - 1));
      const winId = `win_f${index}_${side}_c${j}`;
      const roomIndex = Math.floor(j / 2);
      const roomId = `room_f${index}_${side}_${roomIndex}`;

      const timeMultiplier = cfg.windowLightingTime === 'golden_hour' ? 0.45
        : cfg.windowLightingTime === 'evening' ? 0.85
        : cfg.windowLightingTime === 'night' ? 0.55
        : cfg.windowLightingTime === 'late_night' ? 0.15
        : cfg.windowLightingTime === 'morning' ? 0.4
        : (cfg.windowLightingProfile === 'commercial' ? 0.75 : 0.12);
      const baseLighting = Number.isFinite(Number(cfg.windowLighting)) ? Number(cfg.windowLighting) : 0.2;
      const litProbability = clamp(baseLighting * (timeMultiplier / 0.2), 0, 1);
      const roomHash = Math.abs((((cfg.seed || 1337) * 7919 + index * 1013 + roomIndex * 271 + side.charCodeAt(0) * 43) % 10000) / 10000);
      const isRoomLit = roomHash < litProbability;
      const isLit = damageMode === 'none' && isRoomLit && (cfg.windowLightingProfile === 'commercial' ? ((((j * 17) % 10) / 10) < 0.92) : true);

      addWindow(group, side, x, wy, z, cfg, r, ww, wh, {
        maxW: spacing * 0.88,
        damageMode,
        hasAC,
        windowId: winId,
        roomId,
        floor: index,
        isLit
      });
    }
  }
}

function addCornerChamfer(group, seg, index, cfg, r, cutaway, seed) {
  const cut = seg.cornerCut || 0;
  if (cut <= 0.05 || cutaway) return;

  const floorNum = index + 1;
  const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
  const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
  const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
  const override = overrideColor(cfg, floorNum, 'front', main);
  const diagLen = cut * Math.SQRT2;
  const t = cfg.wallThickness;
  const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed + 503, diagLen, cfg.floorHeight);

  const cx = seg.x + seg.w * 0.5 - cut * 0.5;
  const cz = seg.z + seg.d * 0.5 - cut * 0.5;
  const wedge = worldRoot(group, cx, 0, cz);
  wedge.rotation.y = Math.PI / 4;

  box(wedge, 0, y, -t * 0.5, diagLen + t * 0.5, cfg.floorHeight, t, mat);

  if (cfg.trimAmount > 0.04) {
    const trimH = 0.11 + cfg.trimAmount * 0.11;
    box(wedge, 0, index * cfg.floorHeight + trimH * 0.5 + 0.005, 0.04, diagLen + 0.12, trimH, 0.14, solid(cfg.trimColor));
    if (index === cfg.floors - 1 && cfg.trimAmount > 0.2) {
      box(wedge, 0, (index + 1) * cfg.floorHeight - 0.13, 0.1, diagLen + 0.28, 0.24, 0.3, solid(cfg.trimColor));
    }
  }

  if (index === 0 && cfg.groundUse === 'shop') {
    const cornerLayout = computeCornerEntranceLayout(seg, cfg);
    addDoor(group, 'corner', cornerLayout.cx, cornerLayout.totalRise, cornerLayout.wallZ, cfg, cornerLayout.wideDoor);
  } else if (diagLen >= 1.05) {
    const ww = Math.min(cfg.windowWidth, diagLen * 0.62);
    const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
    const damageMode = pickWindowDamageMode(cfg, r, false);
    addWindow(group, 'corner', cx, index * cfg.floorHeight + cfg.floorHeight * 0.51, cz, cfg, r, ww, wh, {
      maxW: diagLen * 0.7,
      noShutters: true,
      damageMode
    });
  }
}


let awningCounter = 0;

function resetDetailCounters() {
  awningCounter = 0;
}

function addBalcony(parent, side, x, y, z, w, cfg) {
  const group = worldRoot(parent, x, y, z);
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  group.rotation.y = rotMap[side] || 0;

  const steel = solid(cfg.windowFrameColor);
  const deck = solid('#525452');
  const depth = 1.15;
  const baseY = -cfg.floorHeight * 0.36;

  box(group, 0, baseY, depth * 0.5, w, 0.12, depth, deck);
  box(group, 0, baseY + 0.86, depth - 0.04, w + 0.04, 0.06, 0.06, steel);
  box(group, -w * 0.5 + 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);
  box(group, w * 0.5 - 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);

  const posts = Math.max(4, Math.round(w * 2.5));
  for (let j = 0; j <= posts; j++) {
    const px = -w * 0.5 + 0.03 + (j / posts) * (w - 0.06);
    box(group, px, baseY + 0.44, depth - 0.04, 0.04, 0.8, 0.04, steel);
  }
  for (const sx of [-w * 0.5 + 0.03, w * 0.5 - 0.03]) {
    box(group, sx, baseY + 0.44, depth * 0.5, 0.04, 0.8, 0.04, steel);
  }
}

function addFireEscapeSideRailing(group, xPos, y, totalDeckD, portal, steel) {
  const railY = y + 0.88;
  const addSegment = (zStart, zEnd, addStartPost, addEndPost) => {
    const len = zEnd - zStart;
    if (len <= 0.06) return;
    box(group, xPos, railY, zStart + len * 0.5, 0.06, 0.06, len, steel);
    if (addStartPost) box(group, xPos, y + 0.46, zStart + 0.025, 0.05, 0.88, 0.05, steel);
    if (addEndPost) box(group, xPos, y + 0.46, zEnd - 0.025, 0.05, 0.88, 0.05, steel);
    const nb = Math.max(1, Math.round(len * 2));
    for (let k = 1; k <= nb; k++) {
      box(group, xPos, y + 0.46, zStart + (k / (nb + 1)) * len, 0.04, 0.82, 0.04, steel);
    }
  };

  if (portal && portal.portalW > 0) {
    const zOpen1 = Math.max(0, portal.centerZ - portal.portalW * 0.5);
    const zOpen2 = Math.min(totalDeckD, portal.centerZ + portal.portalW * 0.5);
    addSegment(0, zOpen1, true, true);
    addSegment(zOpen2, totalDeckD, true, false);
  } else {
    box(group, xPos, railY, totalDeckD * 0.5, 0.06, 0.06, totalDeckD, steel);
    box(group, xPos, y + 0.46, 0.03, 0.05, 0.88, 0.05, steel);
    box(group, xPos, y + 0.46, totalDeckD - 0.03, 0.05, 0.88, 0.05, steel);
    const sideBalusters = Math.max(2, Math.round(totalDeckD * 1.8));
    for (let k = 1; k <= sideBalusters; k++) {
      box(group, xPos, y + 0.46, (k / (sideBalusters + 1)) * totalDeckD, 0.04, 0.82, 0.04, steel);
    }
  }
}

function addFireEscapeFlightMesh(group, flight, stairHW, stairTreadD, steel) {
  const { local, laneZ, treads } = flight;
  const { xStart, xEnd, yLower, yUpper } = local;
  const plateDepth = flight.treadPlateDepth || 0.24;

  for (const dz of [-stairHW, stairHW]) {
    line(group, [xStart, yLower, laneZ + dz], [xEnd, yUpper, laneZ + dz], 0.045, steel);
    line(group, [xStart, yLower + 0.84, laneZ + dz], [xEnd, yUpper + 0.84, laneZ + dz], 0.032, steel);
    line(group, [xStart, yLower, laneZ + dz], [xStart, yLower + 0.84, laneZ + dz], 0.032, steel);
    line(group, [xEnd, yUpper, laneZ + dz], [xEnd, yUpper + 0.84, laneZ + dz], 0.032, steel);
  }

  const treadMat = gratingMaterial('#3a4347', plateDepth, stairTreadD);
  const frameThick = 0.024;
  const edgeOffsetX = plateDepth * 0.5 - frameThick * 0.5;
  for (const tr of treads) {
    const treadMesh = box(group, tr.local.x, tr.local.y, tr.local.z, plateDepth, 0.045, stairTreadD, treadMat);
    box(group, tr.local.x - edgeOffsetX, tr.local.y, tr.local.z, frameThick, 0.046, stairTreadD, steel);
    box(group, tr.local.x + edgeOffsetX, tr.local.y, tr.local.z, frameThick, 0.046, stairTreadD, steel);
    treadMesh.name = tr.id;
    treadMesh.userData = {
      treadId: tr.id,
      flightId: flight.id,
      stepIndex: tr.stepIndex,
      floor: flight.floor,
      elevation: tr.elevation,
      topSurfaceElevation: tr.topSurfaceElevation
    };
  }
}

function addFireEscape(parent, seg, placement, cfg) {
  if (!placement || cfg.floors < 2) return;
  const { side, deckW } = placement;
  const steel = solid('#3a4347');
  const concrete = solid('#858b8c');
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

  const toLocalXZ = (anchor, wx, wz) => {
    const dx = wx - anchor.x;
    const dz = wz - anchor.z;
    if (side === 'front') return { x: dx, z: dz };
    if (side === 'back') return { x: -dx, z: -dz };
    if (side === 'left') return { x: dz, z: -dx };
    return { x: -dz, z: dx };
  };

  const flightData = computeFireEscapeFlights(cfg, [seg], placement);
  const {
    anchors,
    flightLanes,
    zInner,
    zOuter,
    stairHW,
    stairTreadD,
    deckD,
    xSpan,
    extraLadderClearance,
    profile,
    isLegacy,
    landingPlans,
    columnPlans
  } = flightData;

  const halfDeckW = deckW * 0.5;
  const deckT = 0.08;

  if (!isLegacy && Array.isArray(landingPlans) && landingPlans.length > 0) {
    // Render continuous vertical corner support columns & ground baseplates first
    if (Array.isArray(columnPlans) && columnPlans.length > 0) {
      const colRoot = worldRoot(parent, anchors[0].x, 0, anchors[0].z);
      colRoot.rotation.y = rotMap[side] || 0;
      for (const col of columnPlans) {
        box(colRoot, col.localX, 0.04, col.localZ, 0.24, 0.08, 0.24, concrete);
        box(colRoot, col.localX, col.topY * 0.5, col.localZ, 0.09, col.topY, 0.09, steel);
      }
    }

    // Optional ground-to-F1 street stair flight
    const streetFlight = flightData.flights.find((fl) => fl.floor === 0);
    if (streetFlight) {
      const f0Group = worldRoot(parent, anchors[0].x, 0, anchors[0].z);
      f0Group.rotation.y = rotMap[side] || 0;
      addFireEscapeFlightMesh(f0Group, streetFlight, stairHW, stairTreadD, steel);
      // Concrete entry pad at foot of ground stair
      box(f0Group, streetFlight.local.xStart + 0.35, 0.03, streetFlight.laneZ, 0.90, 0.06, stairTreadD + 0.16, concrete);
    }

    for (const lp of landingPlans) {
      const i = lp.floor;
      const y = lp.y;
      const group = worldRoot(parent, lp.anchor.x, 0, lp.anchor.z);
      group.rotation.y = rotMap[side] || 0;

      for (const panel of lp.deckPanels) {
        const deckMeshMat = gratingMaterial('#3a4347', panel.widthX, panel.depthZ);
        box(group, panel.centerX, y, panel.centerZ, panel.widthX, deckT, panel.depthZ, deckMeshMat);
      }

      // Perimeter fascia beams for crisp steel balcony silhouette
      box(group, lp.centerDeckX, y - 0.02, lp.totalDeckD - 0.03, lp.fullDeckW, 0.09, 0.05, steel);
      box(group, lp.minDeckX + 0.03, y - 0.02, lp.stepBackZ + deckD * 0.5, 0.05, 0.09, deckD, steel);
      box(group, lp.maxDeckX - 0.03, y - 0.02, lp.stepBackZ + deckD * 0.5, 0.05, 0.09, deckD, steel);

      // Cutout framing beams and stairwell safety guardrails (open at arrival turnaround)
      for (const op of lp.openings) {
        const frameT = 0.035;
        const openLen = op.xMax - op.xMin;
        const openDepth = op.zMax - op.zMin;
        box(group, (op.xMin + op.xMax) * 0.5, y, op.zMin, openLen, deckT + 0.02, frameT, steel);
        box(group, (op.xMin + op.xMax) * 0.5, y, op.zMax, openLen, deckT + 0.02, frameT, steel);
        box(group, op.xBack, y, (op.zMin + op.zMax) * 0.5, frameT, deckT + 0.02, openDepth, steel);

        const openRailY = y + 0.88;
        if (!op.skipBackRail) {
          line(group, [op.xBack, openRailY, op.zMin], [op.xBack, openRailY, op.zMax], 0.03, steel);
          line(group, [op.xBack, y + 0.04, op.zMin], [op.xBack, openRailY, op.zMin], 0.026, steel);
          line(group, [op.xBack, y + 0.04, op.zMax], [op.xBack, openRailY, op.zMax], 0.026, steel);
        }

        const railEndStopX = op.xArrive - op.dir * 0.16;
        const rX1 = Math.min(op.xBack, railEndStopX);
        const rX2 = Math.max(op.xBack, railEndStopX);
        if (rX2 - rX1 > 0.12) {
          line(group, [rX1, openRailY, op.railSideZ], [rX2, openRailY, op.railSideZ], 0.03, steel);
          line(group, [railEndStopX, y + 0.04, op.railSideZ], [railEndStopX, openRailY, op.railSideZ], 0.026, steel);
          const intermediatePosts = Math.max(2, Math.floor((rX2 - rX1) / 0.42));
          for (let p = 1; p < intermediatePosts; p++) {
            const rx = rX1 + (p / intermediatePosts) * (rX2 - rX1);
            line(group, [rx, y + 0.04, op.railSideZ], [rx, openRailY, op.railSideZ], 0.024, steel);
          }
        }
      }

      // Underside diagonal wall braces
      for (const br of lp.braces) {
        line(group, [br.localStart.x, br.localStart.y, br.localStart.z], [br.localEnd.x, br.localEnd.y, br.localEnd.z], 0.042, steel);
      }

      // Front perimeter guardrail
      const railY = y + 0.88;
      box(group, lp.centerDeckX, railY, lp.totalDeckD - 0.04, lp.fullDeckW, 0.06, 0.06, steel);
      const frontBalusters = Math.max(6, Math.round(lp.fullDeckW * 2.2));
      for (let j = 0; j < frontBalusters; j++) {
        const bx = lp.minDeckX + 0.04 + (j / (frontBalusters - 1)) * (lp.fullDeckW - 0.08);
        box(group, bx, y + 0.46, lp.totalDeckD - 0.04, 0.04, 0.82, 0.04, steel);
      }

      // Left & right end guardrails with portal openings matching ladders
      addFireEscapeSideRailing(group, lp.minDeckX + 0.03, y, lp.totalDeckD, lp.leftPortal, steel);
      addFireEscapeSideRailing(group, lp.maxDeckX - 0.03, y, lp.totalDeckD, lp.rightPortal, steel);

      // Floor stair flight rising upward from this landing
      const floorFlights = flightData.flights.filter((fl) => fl.floor === i);
      for (const flight of floorFlights) {
        addFireEscapeFlightMesh(group, flight, stairHW, stairTreadD, steel);
      }

      // Drop ladder mounted cleanly at F1 West (-X) portal
      if (i === 1 && lp.leftPortal) {
        const lx = lp.minDeckX - 0.06 - (extraLadderClearance > 0 ? extraLadderClearance * 0.5 : 0);
        const lz = lp.leftPortal.centerZ;
        const isLowered = cfg.fireEscapeLadder === 'lowered';
        const botY = isLowered ? 0.08 : 2.2;
        const topY = y + 0.88;
        const rungW = 0.42 + extraLadderClearance;
        const rungHW = rungW * 0.5;

        for (const dz of [-rungHW, rungHW]) {
          line(group, [lp.minDeckX, y, lz + dz], [lx, y, lz + dz], 0.032, steel);
          line(group, [lp.minDeckX, y + 0.88, lz + dz], [lx, y + 0.88, lz + dz], 0.032, steel);
          line(group, [lp.minDeckX, y - 0.24, lz + dz], [lx, y, lz + dz], 0.026, steel);
          line(group, [lx, botY, lz + dz], [lx, topY, lz + dz], 0.032, steel);
        }
        line(group, [lx, topY, lz - rungHW], [lx, topY, lz + rungHW], 0.032, steel);
        const rungs = Math.max(4, Math.floor((topY - botY - 0.18) / 0.30));
        for (let rIdx = 0; rIdx < rungs; rIdx++) {
          const ry = botY + 0.14 + (rIdx / Math.max(1, rungs - 1)) * Math.max(0.4, (y + 0.72) - (botY + 0.14));
          box(group, lx, ry, lz, 0.04, 0.032, rungW, steel);
        }
      }

      // Roof access gooseneck ladder mounted cleanly at top arrival turnaround end
      if (lp.isTopFloor && cfg.fireEscapeRoofAccess !== false) {
        const portal = lp.rightPortal || lp.leftPortal;
        const endSign = lp.rightPortal ? 1 : -1;
        const edgeX = endSign > 0 ? lp.maxDeckX : lp.minDeckX;
        const rx = edgeX + endSign * (0.06 + (extraLadderClearance > 0 ? extraLadderClearance * 0.5 : 0));
        const rz = portal ? portal.centerZ : (lp.stepBackZ + Math.min(zInner + 0.06, deckD * 0.42));
        const roofBotY = y;
        const roofDeckY = cfg.floors * cfg.floorHeight;
        const ph = cfg.parapet ? (cfg.parapetHeight || 0.65) : 0.15;
        const parapetTopY = roofDeckY + ph;
        const apexY = parapetTopY + 0.28;
        const zRoofLand = -0.36;
        const zMid = (rz + zRoofLand) * 0.5;
        const roofRungW = 0.42 + extraLadderClearance;
        const roofRungHW = roofRungW * 0.5;

        for (const dz of [-roofRungHW, roofRungHW]) {
          line(group, [edgeX, y, rz + dz], [rx, y, rz + dz], 0.032, steel);
          line(group, [edgeX, y + 0.88, rz + dz], [rx, y + 0.88, rz + dz], 0.032, steel);
          line(group, [edgeX, y - 0.24, rz + dz], [rx, y, rz + dz], 0.026, steel);
          line(group, [rx, roofBotY, rz + dz], [rx, parapetTopY, rz + dz], 0.032, steel);
          line(group, [rx, parapetTopY, rz + dz], [rx, apexY, zMid + dz], 0.032, steel);
          line(group, [rx, apexY, zMid + dz], [rx, apexY, zRoofLand + dz], 0.032, steel);
          line(group, [rx, apexY, zRoofLand + dz], [rx, roofDeckY, zRoofLand + dz], 0.032, steel);
          box(group, rx, roofDeckY + 0.03, zRoofLand + dz, 0.08, 0.05, 0.08, steel);
          line(group, [rx, roofDeckY - 0.25, rz + dz], [rx, roofDeckY - 0.25, 0.02], 0.028, steel);
        }
        line(group, [rx, roofDeckY + 0.14, zRoofLand - roofRungHW], [rx, roofDeckY + 0.14, zRoofLand + roofRungHW], 0.03, steel);
        const roofRungs = Math.max(5, Math.floor((parapetTopY - roofBotY) / 0.30));
        for (let rIdx = 0; rIdx < roofRungs; rIdx++) {
          const ry = roofBotY + 0.28 + (rIdx / Math.max(1, roofRungs - 1)) * Math.max(0.6, parapetTopY - roofBotY - 0.42);
          box(group, rx, ry, rz, 0.04, 0.032, roofRungW, steel);
        }
      }
    }
    return;
  }

  for (let i = 1; i < cfg.floors; i++) {
    const y = i * cfg.floorHeight + 0.12;
    const anchorBelow = anchors[i - 1];
    const anchorAbove = anchors[i];
    const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
    const stepBackZ = Math.max(0, stepOffset.z);
    const shiftX = stepOffset.x;

    const group = worldRoot(parent, anchorAbove.x, 0, anchorAbove.z);
    group.rotation.y = rotMap[side] || 0;

    const totalDeckD = stepBackZ + deckD;
    const zCenter = totalDeckD * 0.5;
    const minDeckX = Math.min(-halfDeckW, shiftX - halfDeckW);
    const maxDeckX = Math.max(halfDeckW, shiftX + halfDeckW);
    const fullDeckW = maxDeckX - minDeckX;
    const centerDeckX = (minDeckX + maxDeckX) * 0.5;

    if (i === 1) {
      // Lowest landing: complete solid floor deck
      box(group, centerDeckX, y, zCenter, fullDeckW, deckT, totalDeckD, gratingMaterial('#3a4347', fullDeckW, totalDeckD));
    } else {
      const prevDir = (i - 1) % 2 === 1 ? 1 : -1;
      const prevLaneZ = stepBackZ + flightLanes[i - 1];
      const xArrive = shiftX + prevDir * xSpan;

      const openLen = Math.min(xSpan * 1.4, 1.25);
      const xOpen1 = Math.min(xArrive, xArrive - prevDir * openLen);
      const xOpen2 = Math.max(xArrive, xArrive - prevDir * openLen);

      const zOpenMin = prevLaneZ - stairHW - 0.04;
      const zOpenMax = prevLaneZ + stairHW + 0.04;

      if (zOpenMin > 0.04) {
        box(group, centerDeckX, y, zOpenMin * 0.5, fullDeckW, deckT, zOpenMin, gratingMaterial('#3a4347', fullDeckW, zOpenMin));
      }

      const outerD = totalDeckD - zOpenMax;
      if (outerD > 0.03) {
        box(group, centerDeckX, y, zOpenMax + outerD * 0.5, fullDeckW, deckT, outerD, gratingMaterial('#3a4347', fullDeckW, outerD));
      }

      const openSpanD = zOpenMax - zOpenMin;
      if (maxDeckX - xOpen2 > 0.03) {
        const wRight = maxDeckX - xOpen2;
        box(group, xOpen2 + wRight * 0.5, y, zOpenMin + openSpanD * 0.5, wRight, deckT, openSpanD, gratingMaterial('#3a4347', wRight, openSpanD));
      }
      if (xOpen1 - minDeckX > 0.03) {
        const wLeft = xOpen1 - minDeckX;
        box(group, minDeckX + wLeft * 0.5, y, zOpenMin + openSpanD * 0.5, wLeft, deckT, openSpanD, gratingMaterial('#3a4347', wLeft, openSpanD));
      }

      const frameT = 0.035;
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMin, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMax, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      const backX = prevDir === 1 ? xOpen1 : xOpen2;
      box(group, backX, y, (zOpenMin + zOpenMax) * 0.5, frameT, deckT + 0.02, openSpanD, steel);

      const openRailY = y + 0.88;
      line(group, [backX, openRailY, zOpenMin], [backX, openRailY, zOpenMax], 0.03, steel);
      line(group, [backX, y + 0.04, zOpenMin], [backX, openRailY, zOpenMin], 0.026, steel);
      line(group, [backX, y + 0.04, zOpenMax], [backX, openRailY, zOpenMax], 0.026, steel);

      const railSideZ = prevLaneZ === zOuter ? zOpenMin : zOpenMax;
      const railEndStopX = xArrive - prevDir * 0.18;
      const rX1 = Math.min(backX, railEndStopX);
      const rX2 = Math.max(backX, railEndStopX);
      if (rX2 - rX1 > 0.10) {
        line(group, [rX1, openRailY, railSideZ], [rX2, openRailY, railSideZ], 0.03, steel);
        line(group, [railEndStopX, y + 0.04, railSideZ], [railEndStopX, openRailY, railSideZ], 0.026, steel);
        const intermediatePosts = Math.max(2, Math.floor((rX2 - rX1) / 0.35));
        for (let p = 1; p < intermediatePosts; p++) {
          const rx = rX1 + (p / intermediatePosts) * (rX2 - rX1);
          line(group, [rx, y + 0.04, railSideZ], [rx, openRailY, railSideZ], 0.024, steel);
        }
      }
    }

    for (const dx of [shiftX - deckW * 0.42, shiftX + deckW * 0.42]) {
      line(group, [dx, y - 0.58, stepBackZ + 0.02], [dx, y - 0.03, totalDeckD - 0.12], 0.04, steel);
    }

    const railY = y + 0.88;
    box(group, centerDeckX, railY, totalDeckD - 0.04, fullDeckW, 0.06, 0.06, steel);
    const frontBalusters = Math.max(6, Math.round(fullDeckW * 2.5));
    for (let j = 0; j < frontBalusters; j++) {
      const bx = minDeckX + 0.04 + (j / (frontBalusters - 1)) * (fullDeckW - 0.08);
      box(group, bx, y + 0.46, totalDeckD - 0.04, 0.04, 0.82, 0.04, steel);
    }

    addFireEscapeSideRailing(group, minDeckX + 0.03, y, totalDeckD, null, steel);
    addFireEscapeSideRailing(group, maxDeckX - 0.03, y, totalDeckD, null, steel);

    const floorFlights = flightData.flights.filter((fl) => fl.floor === i);
    for (const flight of floorFlights) {
      addFireEscapeFlightMesh(group, flight, stairHW, stairTreadD, steel);
    }

    if (i === 1 && cfg.fireEscapeLadder !== 'stair') {
      const lx = maxDeckX + 0.04 + (extraLadderClearance > 0 ? extraLadderClearance : 0);
      const lz = stepBackZ + deckD * 0.55;
      const isLowered = cfg.fireEscapeLadder === 'lowered';
      const botY = isLowered ? 0.08 : 2.2;
      const topY = y + 0.90;
      const rungW = 0.42 + extraLadderClearance;
      const rungHW = rungW * 0.5;
      for (const dz of [-rungHW, rungHW]) {
        line(group, [lx, botY, lz + dz], [lx, topY, lz + dz], 0.032, steel);
      }
      line(group, [lx, topY, lz - rungHW], [lx, topY, lz + rungHW], 0.032, steel);
      const rungs = Math.max(4, Math.floor((topY - botY) / 0.30));
      for (let rIdx = 0; rIdx < rungs; rIdx++) {
        const ry = botY + 0.14 + (rIdx / Math.max(1, rungs - 1)) * Math.max(0.4, topY - botY - 0.34);
        box(group, lx, ry, lz, 0.04, 0.032, rungW, steel);
      }
    }

    if (i === cfg.floors - 1 && cfg.fireEscapeRoofAccess !== false) {
      const rx = minDeckX - 0.04 - (extraLadderClearance > 0 ? extraLadderClearance * 0.5 : 0);
      const rz = stepBackZ + Math.min(deckD * 0.55, 0.78);
      const roofBotY = y;
      const roofDeckY = cfg.floors * cfg.floorHeight;
      const ph = cfg.parapet ? (cfg.parapetHeight || 0.65) : 0.15;
      const parapetTopY = roofDeckY + ph;
      const apexY = parapetTopY + 0.28;
      const zRoofLand = -0.36;
      const zMid = (rz + zRoofLand) * 0.5;
      const roofRungW = 0.42 + extraLadderClearance;
      const roofRungHW = roofRungW * 0.5;

      for (const dz of [-roofRungHW, roofRungHW]) {
        line(group, [rx, roofBotY, rz + dz], [rx, parapetTopY, rz + dz], 0.032, steel);
        line(group, [rx, parapetTopY, rz + dz], [rx, apexY, zMid + dz], 0.032, steel);
        line(group, [rx, apexY, zMid + dz], [rx, apexY, zRoofLand + dz], 0.032, steel);
        line(group, [rx, apexY, zRoofLand + dz], [rx, roofDeckY, zRoofLand + dz], 0.032, steel);
        box(group, rx, roofDeckY + 0.03, zRoofLand + dz, 0.08, 0.05, 0.08, steel);
        line(group, [rx, roofDeckY - 0.25, rz + dz], [rx, roofDeckY - 0.25, 0.02], 0.028, steel);
      }
      line(group, [rx, roofDeckY + 0.14, zRoofLand - roofRungHW], [rx, roofDeckY + 0.14, zRoofLand + roofRungHW], 0.03, steel);
      const roofRungs = Math.max(5, Math.floor((parapetTopY - roofBotY) / 0.30));
      for (let rIdx = 0; rIdx < roofRungs; rIdx++) {
        const ry = roofBotY + 0.28 + (rIdx / Math.max(1, roofRungs - 1)) * Math.max(0.6, parapetTopY - roofBotY - 0.42);
        box(group, rx, ry, rz, 0.04, 0.032, roofRungW, steel);
      }
    }
  }
}

function addAwning(parent, cx, wallZ, spanW, h, cfg, isDoorCanopy = false) {
  if (!cfg.awning || spanW < 1.4) return;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = cfg.awningColor;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e5d5bb';
  for (let i = 0; i < 128; i += 32) ctx.fillRect(i, 0, 14, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(isDoorCanopy ? 2 : 4, 1);
  awningCounter++;
  registerTexture('awning-' + awningCounter, tex);

  const depth = isDoorCanopy ? 1.25 : 1.45;
  const mountY = isDoorCanopy ? Math.min(h * 0.84, h - 0.35) : h * 0.74;
  const mesh = box(parent, cx, mountY, wallZ + depth * 0.5, spanW, 0.09, depth, new THREE.MeshLambertMaterial({ map: tex }));
  if (mesh) mesh.rotation.x = 0.22;
  box(parent, cx, mountY - 0.16, wallZ + depth - 0.04, spanW, 0.16, 0.06, solid(cfg.awningColor));
  for (const dx of [-spanW * 0.48, spanW * 0.48]) {
    line(parent, [cx + dx, mountY - 0.32, wallZ + 0.02], [cx + dx, mountY - 0.16, wallZ + depth - 0.06], 0.03, solid('#343a3d'));
  }
}

function addEntrance(parent, seg, cfg, r) {
  const layout = computePrimaryEntranceLayout(seg, cfg);
  const { usableW, cx, wallZ, wideDoor, steps, stepH, stepD, landingD, totalRise, stoopW } = layout;

  addDoor(parent, 'front', cx, totalRise, wallZ, cfg, wideDoor);

  if (steps > 0) {
    const stairMat = solid('#888882');
    const railMat = solid('#424749');
    for (let i = 0; i < steps; i++) {
      const levelH = (i + 1) * stepH;
      const depth = landingD + (steps - 1 - i) * stepD;
      box(parent, cx, levelH * 0.5, wallZ + depth * 0.5, stoopW, levelH, depth, stairMat);
    }
    const totalDepth = layout.totalStepDepth;
    const railH = 0.82;
    const curbH = 0.10;
    for (const dx of [-stoopW * 0.5 + 0.055, stoopW * 0.5 - 0.055]) {
      const rx = cx + dx;
      // Low concrete curb edge along landing + street newel plinth, topped by slender steel rail
      box(parent, rx, (totalRise + curbH) * 0.5, wallZ + landingD * 0.5, 0.10, totalRise + curbH, landingD, stairMat);
      box(parent, rx, (stepH + curbH) * 0.5, wallZ + totalDepth - 0.08, 0.11, stepH + curbH, 0.16, stairMat);
      line(parent, [rx, totalRise + curbH, wallZ + 0.08], [rx, totalRise + railH, wallZ + 0.08], 0.036, railMat);
      line(parent, [rx, totalRise + curbH, wallZ + landingD - 0.05], [rx, totalRise + railH, wallZ + landingD - 0.05], 0.038, railMat);
      line(parent, [rx, stepH + curbH, wallZ + totalDepth - 0.08], [rx, stepH + railH, wallZ + totalDepth - 0.08], 0.038, railMat);
      line(parent, [rx, totalRise + railH, wallZ + 0.08], [rx, totalRise + railH, wallZ + landingD - 0.05], 0.04, railMat);
      line(parent, [rx, totalRise + railH, wallZ + landingD - 0.05], [rx, stepH + railH, wallZ + totalDepth - 0.08], 0.04, railMat);
      if (steps > 1) {
        const midZ = wallZ + landingD + (totalDepth - landingD) * 0.5;
        const midBotY = totalRise * 0.5 + curbH * 0.4;
        const midTopY = (totalRise + stepH) * 0.5 + railH;
        line(parent, [rx, midBotY, midZ], [rx, midTopY, midZ], 0.028, railMat);
      }
    }
  }

  if (cfg.groundUse === 'shop') {
    const doorHalfW = layout.doorWidth * 0.5 + 0.35;
    const sideSpace = usableW * 0.5 - doorHalfW - 0.45;
    if (sideSpace >= 1.1) {
      const bayW = Math.min(3.4, sideSpace * 0.88);
      const bayOffset = doorHalfW + sideSpace * 0.5;
      const shopCfg = { ...cfg, windowStyle: 'modern', windowLighting: Math.max(0.75, cfg.windowLighting) };
      const shopDmgL = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
      const shopDmgR = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
      addWindow(parent, 'front', cx - bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgL });
      addWindow(parent, 'front', cx + bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgR });
    }
    addAwning(parent, cx, wallZ, usableW * 0.82, cfg.floorHeight, cfg, false);
  } else if (cfg.awning) {
    const canopyW = Math.min(usableW * 0.52, wideDoor ? 3.2 : 2.2);
    addAwning(parent, cx, wallZ, canopyW, cfg.floorHeight + totalRise * 0.55, cfg, true);
  }

  if (cfg.signage !== 'none') {
    const signY = cfg.awning ? cfg.floorHeight * 0.94 : cfg.floorHeight * 0.86;
    const sign = worldRoot(parent, cx, signY, wallZ + 0.08);
    signboard(sign, cfg.signText, Math.min(usableW * 0.68, 9.5), 0.62, cfg.signage === 'marquee' ? '#302b2b' : '#40322d', cfg.signColor);
  }

  if (cfg.groundUse !== 'shop') {
    const doorHalf = layout.doorWidth * 0.5;
    const plaque = worldRoot(parent, cx - doorHalf - 0.56, totalRise + 1.38, wallZ + 0.055);
    signboard(plaque, String((cfg.seed % 900) + 100), 0.42, 0.25, '#323437', '#ead6ac');
    for (const s of [-1, 1]) {
      box(parent, cx + s * (doorHalf + 0.22), totalRise + 1.50, wallZ + 0.07, 0.08, 0.28, 0.10, solid('#d8ad70'));
    }
  }
}

function addSurfaceWeathering(group, cx, surfaceY, cz, spanW, spanD, cfg, r) {
  if (spanW < 0.8 || spanD < 0.45) return;

  if (cfg.tarPatches || cfg.damage > 0.25 || cfg.age > 0.55) {
    const tarMat = solid('#1b1e20');
    const seamMat = solid('#282c2f');
    const metalPatchMat = solid('#6b6358');
    const count = Math.max(2, Math.ceil((spanW * spanD) / 18) + (cfg.tarPatches ? 3 : 0));
    for (let i = 0; i < count; i++) {
      const pw = randBetween(r, 0.55, Math.min(2.4, spanW * 0.45));
      const pd = randBetween(r, 0.38, Math.min(1.9, spanD * 0.45));
      const px = cx + randBetween(r, -spanW * 0.45 + pw * 0.5, spanW * 0.45 - pw * 0.5);
      const pz = cz + randBetween(r, -spanD * 0.45 + pd * 0.5, spanD * 0.45 - pd * 0.5);
      const patch = box(group, px, surfaceY + 0.008 + i * 0.001, pz, pw, 0.014, pd, i % 3 === 0 && cfg.damage > 0.15 ? metalPatchMat : (i % 2 === 0 ? tarMat : seamMat), { cast: false });
      if (patch) patch.rotation.y = randBetween(r, -0.35, 0.35);
    }
  }

  if (cfg.roofPuddles || cfg.age > 0.5) {
    const stainMat = solid(cfg.grimeColor);
    const waterMat = puddleMaterial();
    const puddleCount = Math.max(1, Math.min(4, Math.ceil((spanW * spanD) / 28) + (cfg.roofPuddles ? 2 : 0)));
    for (let i = 0; i < puddleCount; i++) {
      const rad = randBetween(r, 0.35, Math.min(1.35, Math.min(spanW, spanD) * 0.32));
      const px = cx + randBetween(r, -spanW * 0.42 + rad, spanW * 0.42 - rad);
      const pz = cz + randBetween(r, -spanD * 0.42 + rad, spanD * 0.42 - rad);
      const scaleZ = randBetween(r, 0.65, 1.25);

      const stain = cylinder(group, px, surfaceY + 0.006 + i * 0.001, pz, rad * 1.28, rad * 1.28, 0.008, stainMat, 14);
      stain.scale.z = scaleZ;
      stain.castShadow = false;

      const water = cylinder(group, px, surfaceY + 0.012 + i * 0.001, pz, rad, rad, 0.01, waterMat, 14);
      water.scale.z = scaleZ;
      water.castShadow = false;
    }
  }
}

function addSetbackTerrace(group, lowerSeg, upperSeg, y, cfg, r, segIdx = 0, firePlacement = null) {
  const roofMat = solid(cfg.roofColor);
  const trimMat = solid(cfg.trimColor);
  const wallMat = solid(cfg.wallColor);
  const yLift = segIdx * 0.003;
  const slabH = 0.14;
  const slabTopY = y + 0.004 + yLift;
  const slabY = slabTopY - slabH * 0.5;
  const overlap = Math.min(0.08, cfg.wallThickness * 0.45);
  const wallInset = 0.02;

  const lX1 = lowerSeg.x - lowerSeg.w * 0.5;
  const lX2 = lowerSeg.x + lowerSeg.w * 0.5;
  const lZ1 = lowerSeg.z - lowerSeg.d * 0.5;
  const lZ2 = lowerSeg.z + lowerSeg.d * 0.5;
  const lCut = Math.max(0, Math.min(lowerSeg.cornerCut || 0, lowerSeg.w * 0.45, lowerSeg.d * 0.45));

  const oX1 = lX1 + (lowerSeg.skipWalls?.left ? 0.01 : wallInset);
  const oX2 = lX2 - (lowerSeg.skipWalls?.right ? 0.01 : wallInset);
  const oZ1 = lZ1 + (lowerSeg.skipWalls?.back ? 0.01 : wallInset);
  const oZ2 = lZ2 - (lowerSeg.skipWalls?.front ? 0.01 : wallInset);
  const oCut = lCut > 0.015 ? Math.max(0, lCut - wallInset * 0.5) : 0;

  const uX1 = upperSeg.x - upperSeg.w * 0.5;
  const uX2 = upperSeg.x + upperSeg.w * 0.5;
  const uZ1 = upperSeg.z - upperSeg.d * 0.5;
  const uZ2 = upperSeg.z + upperSeg.d * 0.5;
  const uCutRaw = Math.max(0, Math.min(upperSeg.cornerCut || 0, upperSeg.w * 0.45, upperSeg.d * 0.45));

  const in_uX1 = uX1 + (uX1 > lX1 + 0.04 ? overlap : 0);
  const in_uX2 = uX2 - (uX2 < lX2 - 0.04 ? overlap : 0);
  const in_uZ1 = uZ1 + (uZ1 > lZ1 + 0.04 ? overlap : 0);
  const in_uZ2 = uZ2 - (uZ2 < lZ2 - 0.04 ? overlap : 0);
  const in_uCut = uCutRaw > 0.02 ? Math.max(0, uCutRaw - overlap * 0.5) : 0;

  const hasBack = in_uZ1 - oZ1 > 0.04;
  const hasFront = oZ2 - in_uZ2 > 0.04;
  const hasLeft = in_uX1 - oX1 > 0.04;
  const hasRight = oX2 - in_uX2 > 0.04;

  const zL1 = hasBack ? in_uZ1 : oZ1;
  const zL2 = hasFront ? in_uZ2 : oZ2;

  if (hasBack && oX2 - oX1 > 0.04) {
    box(group, (oX1 + oX2) * 0.5, slabY, (oZ1 + in_uZ1) * 0.5, oX2 - oX1, slabH, in_uZ1 - oZ1, roofMat);
  }

  if (hasLeft && zL2 - zL1 > 0.04) {
    box(group, (oX1 + in_uX1) * 0.5, slabY, (zL1 + zL2) * 0.5, in_uX1 - oX1, slabH, zL2 - zL1, roofMat);
  }

  if (oCut <= 0.02 && in_uCut <= 0.02) {
    if (hasFront && oX2 - oX1 > 0.04) {
      box(group, (oX1 + oX2) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, oX2 - oX1, slabH, oZ2 - in_uZ2, roofMat);
    }
    if (hasRight && zL2 - zL1 > 0.04) {
      box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zL2) * 0.5, oX2 - in_uX2, slabH, zL2 - zL1, roofMat);
    }
  } else {
    const xCorner = Math.min(oX2 - oCut, in_uX2 - in_uCut);
    const zCorner = Math.min(oZ2 - oCut, in_uZ2 - in_uCut);

    if (hasFront && xCorner - oX1 > 0.04) {
      box(group, (oX1 + xCorner) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, xCorner - oX1, slabH, oZ2 - in_uZ2, roofMat);
    }

    if (hasRight && zCorner - zL1 > 0.04) {
      box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zCorner) * 0.5, oX2 - in_uX2, slabH, zCorner - zL1, roofMat);
    }

    const pts = [];
    const addPt = (px, pz) => {
      if (!pts.length) { pts.push({ x: px, z: pz }); return; }
      const prev = pts[pts.length - 1];
      if (Math.hypot(px - prev.x, pz - prev.z) > 0.015) pts.push({ x: px, z: pz });
    };

    addPt(in_uX2, zCorner);
    addPt(oX2, zCorner);
    if (oZ2 - oCut > zCorner + 0.015) addPt(oX2, oZ2 - oCut);
    addPt(oX2 - oCut, oZ2);
    if (xCorner < oX2 - oCut - 0.015) addPt(xCorner, oZ2);
    addPt(xCorner, in_uZ2);
    addPt(in_uX2 - in_uCut, in_uZ2);
    addPt(in_uX2, in_uZ2 - in_uCut);

    if (pts.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].z);
      for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k].x, pts[k].z);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: slabH, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, roofMat);
      mesh.position.set(0, slabTopY, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  const ledgeH = cfg.parapet ? Math.min(0.55, Math.max(0.24, cfg.parapetHeight || 0.4)) : 0.16;
  const ledgeT = Math.max(0.18, Math.min(0.25, cfg.wallThickness));
  const ledgeMat = cfg.parapet ? wallMat : trimMat;
  const py = slabTopY + ledgeH * 0.5;
  const capY = slabTopY + ledgeH + 0.03;

  const getBlockedForSide = (side) => {
    const list = [...(lowerSeg.occlusions?.[side] || [])];
    if (firePlacement && firePlacement.side === side) {
      const fa = getFireEscapeWallAnchor(lowerSeg, side, firePlacement.coord, firePlacement.deckW);
      const ua = getFireEscapeWallAnchor(upperSeg, side, firePlacement.coord, firePlacement.deckW);
      const fMin = Math.min(fa.coord, ua.coord, firePlacement.coord) - firePlacement.deckW * 0.54;
      const fMax = Math.max(fa.coord, ua.coord, firePlacement.coord) + firePlacement.deckW * 0.54;
      list.push([fMin, fMax]);
    }
    return list;
  };

  const hasBackParapet = hasBack && !lowerSeg.skipWalls?.back;
  const hasFrontParapet = hasFront && !lowerSeg.skipWalls?.front;

  if (hasBackParapet) {
    const spans = subtractIntervals(lX1, lX2, getBlockedForSide('back'));
    for (const [s, e] of spans) {
      box(group, (s + e) * 0.5, py, lZ1 + ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, (s + e) * 0.5, capY, lZ1 + ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
      }
    }
  }
  if (hasFrontParapet) {
    const fEnd = lCut > 0.015 ? lX2 - lCut : lX2;
    const spans = subtractIntervals(lX1, fEnd, getBlockedForSide('front'));
    for (const [s, e] of spans) {
      box(group, (s + e) * 0.5, py, lZ2 - ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, (s + e) * 0.5, capY, lZ2 - ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
      }
    }
  }
  if (hasLeft && !lowerSeg.skipWalls?.left) {
    const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
    const zEnd = lZ2 - (hasFrontParapet ? ledgeT : 0);
    const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('left'));
    for (const [s, e] of spans) {
      box(group, lX1 + ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, lX1 + ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
      }
    }
  }
  if (hasRight && !lowerSeg.skipWalls?.right) {
    const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
    const zEnd = lCut > 0.015 ? lZ2 - lCut : lZ2 - (hasFrontParapet ? ledgeT : 0);
    const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('right'));
    for (const [s, e] of spans) {
      box(group, lX2 - ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, lX2 - ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
      }
    }
  }

  if (lCut > 0.015 && (hasFront || hasRight)) {
    const cx = lowerSeg.x + lowerSeg.w * 0.5 - lCut * 0.5;
    const cz = lowerSeg.z + lowerSeg.d * 0.5 - lCut * 0.5;
    const diagLen = lCut * Math.SQRT2;
    const wedge = worldRoot(group, cx, slabTopY, cz);
    wedge.rotation.y = Math.PI / 4;
    box(wedge, 0, ledgeH * 0.5, -ledgeT * 0.5, diagLen + ledgeT * 0.2, ledgeH, ledgeT, ledgeMat);
    if (cfg.trimAmount > 0.15) {
      box(wedge, 0, ledgeH + 0.03, -ledgeT * 0.5, diagLen + ledgeT * 0.3, 0.06, ledgeT + 0.04, trimMat);
    }
  }

  const frontD = oZ2 - in_uZ2;
  if (frontD > 0.65 && (cfg.tarPatches || cfg.roofPuddles || cfg.age > 0.45)) {
    const weathW = Math.max(1, (oX2 - oCut) - oX1 - 0.6);
    addSurfaceWeathering(group, (oX1 + (oX2 - oCut)) * 0.5, slabTopY, in_uZ2 + frontD * 0.5, weathW, frontD - 0.35, cfg, r);
  }
}

function addVerticalDetails(group, seg, sectionHeight, cfg) {
  if (cfg.facadeAccent === 'none' || cfg.trimAmount <= 0.02) return;
  const trim = solid(cfg.trimColor);
  const cut = seg.cornerCut || 0;
  const usableH = sectionHeight - 0.18;

  for (const side of ['front', 'back', 'left', 'right']) {
    if (seg.skipWalls?.[side]) continue;
    const long = side === 'front' || side === 'back';
    const sideCut = (side === 'front' || side === 'right') ? cut : 0;
    const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut;
    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
    if (!exposed.length) continue;

    if (cfg.facadeAccent === 'vertical' && (side === 'front' || side === 'left' || side === 'right')) {
      const spanLen = spanEnd - spanStart;
      const col = Math.max(2, Math.floor(spanLen / 3.2));
      for (let i = 0; i <= col; i++) {
        const p = spanStart + (spanLen * i) / col;
        if (exposed.some(([s, e]) => p >= s - 0.05 && p <= e + 0.05)) {
          if (long) {
            const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.025 : seg.z - seg.d * 0.5 - 0.025;
            box(group, p, usableH * 0.5, zOut, 0.15, usableH, 0.06, trim);
          } else {
            const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.025 : seg.x + seg.w * 0.5 + 0.025;
            box(group, xOut, usableH * 0.5, p, 0.06, usableH, 0.15, trim);
          }
        }
      }
    } else if (cfg.facadeAccent === 'ornate' && side === 'front') {
      for (const px of [spanStart + 0.32, spanEnd - 0.32]) {
        if (exposed.some(([s, e]) => px >= s - 0.1 && px <= e + 0.1)) {
          box(group, px, usableH * 0.5, seg.z + seg.d * 0.5 + 0.08, 0.3, usableH, 0.16, trim);
        }
      }
    }

    if (cfg.trimAmount > 0.2) {
      const depth = cfg.facadeAccent === 'cornice' ? 0.34 : 0.22;
      const corniceH = 0.22 + cfg.trimAmount * 0.16;
      const corniceY = sectionHeight - corniceH * 0.5 - 0.14;
      for (const [s, e] of exposed) {
        const len = e - s;
        const mid = (s + e) * 0.5;
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + depth * 0.42 : seg.z - seg.d * 0.5 - depth * 0.42;
          box(group, mid, corniceY, zOut, len + 0.18, corniceH, depth, trim);
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - depth * 0.42 : seg.x + seg.w * 0.5 + depth * 0.42;
          box(group, xOut, corniceY, mid, depth, corniceH, len + 0.18, trim);
        }
      }
    }
  }
}

function addInteriors(group, seg, index, cfg) {
  const inspectActive = cfg.cutaway || (cfg.inspectedFloor > 0 && cfg.inspectedFloor <= cfg.floors);
  if (cfg.interiorMode === 'none' && !inspectActive) return;

  const baseY = index * cfg.floorHeight;
  const tWall = cfg.wallThickness;
  const floorMat = solid(index % 2 ? '#746d60' : '#8c7d68');
  const yMicro = (seg.extIndex >= 0 ? (seg.extIndex + 1) : 0) * 0.002;
  slabBox(group, seg, baseY + 0.08 + yMicro, 0.15, tWall * 0.95, floorMat);

  const h = cfg.floorHeight * 0.82;
  const t = 0.09;
  const wall = solid('#c8c0ac');
  const innerW = seg.w - tWall * 2 - 0.12;
  const innerD = seg.d - tWall * 2 - 0.12;
  if (innerW <= 1.5 || innerD <= 1.5) return;

  const hasStairBay = seg.isMain && cfg.stairwell && innerW >= 4.2 && innerD >= 3.2;
  const stairBayW = hasStairBay ? Math.min(2.6, innerW * 0.32) : 0;
  const roomStartX = seg.x - innerW * 0.5 + stairBayW;
  const roomSpanW = innerW - stairBayW;

  if (cfg.interiorMode === 'apartments' && roomSpanW >= 2.2) {
    const rooms = clamp(cfg.roomsPerFloor, 1, Math.max(1, Math.floor(roomSpanW / 1.6)));
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW, h, t, wall);
    if (hasStairBay) {
      box(group, roomStartX, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.22, t, h, innerD * 0.52, wall);
    }
    for (let i = 1; i < rooms; i++) {
      const xx = roomStartX + (roomSpanW * i) / rooms;
      box(group, xx, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.25, t, h, innerD * 0.48, wall);
      box(group, xx, baseY + h * 0.5 + 0.16, seg.z + innerD * 0.25, t, h, innerD * 0.48, wall);
    }
    for (let i = 0; i < Math.min(rooms * 2, 12); i++) {
      const xx = roomStartX + (i % rooms + 0.5) * (roomSpanW / rooms);
      const zz = seg.z + (i < rooms ? -0.26 : 0.26) * innerD;
      box(group, xx, baseY + 0.3, zz, Math.min(0.64, (roomSpanW / rooms) * 0.5), 0.28, 0.8, solid(i % 3 === 0 ? '#8e5855' : '#576b79'));
    }
  } else if (cfg.interiorMode === 'basic' && roomSpanW >= 2.0) {
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW - 0.3, h, t, wall);
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.24, t, h, innerD * 0.44, wall);
  }

  if (hasStairBay) {
    const stairMat = solid('#77766d');
    const railMat = solid('#454a4d');
    const bayCenterX = seg.x - innerW * 0.5 + stairBayW * 0.5;
    const bayZ = seg.z - innerD * 0.24;
    const runW = Math.max(1.2, stairBayW - 0.55);
    const halfH = cfg.floorHeight * 0.5;
    const midY = baseY + halfH;

    box(group, seg.x - innerW * 0.5 + 0.32, midY, bayZ, 0.62, 0.12, 1.45, stairMat);

    const stepsPerFlight = 6;
    const stepW = runW / stepsPerFlight;
    for (let i = 0; i < stepsPerFlight; i++) {
      const tFrac = (i + 0.5) / stepsPerFlight;
      const x1 = bayCenterX + runW * 0.45 - tFrac * runW;
      const y1 = baseY + 0.16 + ((i + 1) / stepsPerFlight) * (halfH - 0.16);
      box(group, x1, y1, bayZ - 0.34, stepW + 0.04, 0.11, 0.62, stairMat);

      const x2 = bayCenterX - runW * 0.45 + tFrac * runW;
      const y2 = midY + ((i + 1) / stepsPerFlight) * halfH;
      box(group, x2, y2, bayZ + 0.34, stepW + 0.04, 0.11, 0.62, stairMat);
    }

    const topLandingY = baseY + cfg.floorHeight - 0.08;
    const topRailEndY = (index === cfg.floors - 1 || (cfg.setback > 0 && index + 1 >= Math.floor(cfg.floors * 0.6)))
      ? baseY + cfg.floorHeight - 0.1
      : baseY + cfg.floorHeight + 0.7;
    line(group, [bayCenterX + runW * 0.45, baseY + 0.16, bayZ - 0.34], [bayCenterX - runW * 0.45, midY, bayZ - 0.34], 0.05, stairMat);
    line(group, [bayCenterX - runW * 0.45, midY, bayZ + 0.34], [bayCenterX + runW * 0.45, topLandingY, bayZ + 0.34], 0.05, stairMat);
    line(group, [bayCenterX + runW * 0.45, baseY + 0.85, bayZ], [bayCenterX - runW * 0.45, midY + 0.7, bayZ], 0.03, railMat);
    line(group, [bayCenterX - runW * 0.45, midY + 0.7, bayZ], [bayCenterX + runW * 0.45, topRailEndY, bayZ], 0.03, railMat);
  }

  if (seg.isMain && cfg.elevator && innerW >= 3.5) {
    const cut = seg.cornerCut || 0;
    const elevH = cfg.floorHeight - 0.12;
    const x = seg.x + innerW * 0.5 - cut - 0.72;
    const z = seg.z - innerD * 0.5 + 0.72;
    box(group, x, baseY + elevH * 0.5 + 0.04, z, 1.24, elevH, 1.2, solid('#8b9194'));
    box(group, x, baseY + cfg.floorHeight * 0.42, z + 0.62, 0.9, Math.min(2.1, cfg.floorHeight * 0.68), 0.06, glassMaterial('#28383d'));
  }
}

function addVines(group, seg, totalHeight, cfg, r) {
  if (cfg.overgrowth <= 0) return;
  const ivy = solid('#415f37');
  const cut = seg.cornerCut || 0;
  const sides = ['front', 'left', 'right', 'back'];

  for (const side of sides) {
    if (seg.skipWalls?.[side]) continue;
    const long = side === 'front' || side === 'back';
    const sideCut = (side === 'front' || side === 'right') ? cut : 0;
    const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.3;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut - 0.3;
    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
    if (!exposed.length) continue;

    const clusters = Math.max(1, Math.ceil(cfg.overgrowth * (side === 'front' ? 16 : 9)));
    for (let i = 0; i < clusters; i++) {
      const span = pick(r, exposed);
      const pos = randBetween(r, span[0], span[1]);
      const pos2 = clamp(pos + randBetween(r, -0.55, 0.55), span[0], span[1]);
      const y = randBetween(r, 0.4, totalHeight * 0.88);
      const y2 = Math.min(totalHeight - 0.2, y + randBetween(r, 0.4, 1.5));

      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.06 : seg.z - seg.d * 0.5 - 0.06;
        line(group, [pos, y, zOut], [pos2, y2, zOut], 0.028, ivy);
        for (let j = 0; j < 3; j++) {
          const leaf = new THREE.Mesh(
            new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
            solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
          );
          leaf.position.set(clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]), y + j * 0.25, zOut + (side === 'front' ? 0.04 : -0.04));
          group.add(leaf);
        }
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.06 : seg.x + seg.w * 0.5 + 0.06;
        line(group, [xOut, y, pos], [xOut, y2, pos2], 0.028, ivy);
        for (let j = 0; j < 3; j++) {
          const leaf = new THREE.Mesh(
            new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
            solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
          );
          leaf.position.set(xOut + (side === 'left' ? -0.04 : 0.04), y + j * 0.25, clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]));
          group.add(leaf);
        }
      }
    }
  }
}

function addRoof(group, seg, y, cfg, r, segIdx = 0) {
  const roof = solid(cfg.roofColor);
  const trim = solid(cfg.trimColor);
  const wallMat = solid(cfg.wallColor);
  const cut = seg.cornerCut || 0;
  const yLift = segIdx * 0.003;

  slabBox(group, seg, y - 0.07 + yLift, 0.14, 0.01, roof);

  let deckTopY = y + yLift;
  const pitchedW = seg.w - cut;
  const pitchedX = seg.x - cut * 0.5;
  const ridgeH = Math.min(2.6, Math.max(1.4, Math.min(pitchedW, seg.d) * 0.26));

  if (cfg.roofType === 'pitched') {
    const overW = pitchedW + 0.24;
    const overD = seg.d + (seg.skipWalls?.back ? -0.04 : 0.24);
    const shape = new THREE.Shape();
    shape.moveTo(-overW * 0.5, 0);
    shape.lineTo(0, ridgeH);
    shape.lineTo(overW * 0.5, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: overD, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, roof);
    mesh.position.set(pitchedX, y + yLift, seg.z - overD * 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (cfg.tarPatches || cfg.damage > 0.3) {
      const slopeAngle = Math.atan2(ridgeH, overW * 0.5);
      for (const s of [-1, 1]) {
        const patch = box(group, pitchedX + s * (pitchedW * 0.24), y + ridgeH * 0.48, seg.z + randBetween(r, -seg.d * 0.22, seg.d * 0.22), pitchedW * 0.22, 0.04, seg.d * 0.28, solid(s < 0 ? '#1d2022' : '#6c6256'));
        if (patch) patch.rotation.z = -s * slopeAngle;
      }
    }
  } else if (cfg.roofType === 'mansard') {
    slabBox(group, seg, y + 0.28 + yLift, 0.56, seg.w * 0.05, roof);
    slabBox(group, seg, y + 0.70 + yLift, 0.28, seg.w * 0.12, solid(cfg.secondaryWallColor));
    deckTopY = y + 0.84 + yLift;
  } else if (cfg.roofType === 'stepped') {
    slabBox(group, seg, y + 0.22 + yLift, 0.44, seg.w * 0.06, wallMat);
    slabBox(group, seg, y + 0.57 + yLift, 0.26, seg.w * 0.16, trim);
    deckTopY = y + 0.7 + yLift;
  }

  if (cfg.roofType !== 'pitched') {
    const insetFactor = cfg.roofType === 'flat' ? 0.82 : 0.62;
    addSurfaceWeathering(group, seg.x - cut * 0.35, deckTopY, seg.z, (seg.w - cut) * insetFactor, seg.d * insetFactor, cfg, r);
  }

  if (cfg.skylights && seg.w >= 4.5 && seg.d >= 4.5) {
    if (cfg.roofType === 'pitched') {
      const slopeAngle = Math.atan2(ridgeH, pitchedW * 0.5);
      for (const s of [-1, 1]) {
        const sx = pitchedX + s * (pitchedW * 0.22);
        const sy = y + ridgeH * 0.52;
        const sky = box(group, sx, sy, seg.z, pitchedW * 0.22, 0.12, seg.d * 0.32, glassMaterial('#577d90', cfg.windowLighting > 0.3));
        if (sky) sky.rotation.z = -s * slopeAngle;
      }
    } else {
      const insetScale = cfg.roofType === 'flat' ? 1 : 0.72;
      for (const s of [-1, 1]) {
        const sx = seg.x - cut * 0.25 + s * (seg.w - cut) * 0.18 * insetScale;
        box(group, sx, deckTopY + 0.05, seg.z, seg.w * 0.19 * insetScale, 0.1, seg.d * 0.22 * insetScale, trim);
        const sky = box(group, sx, deckTopY + 0.14, seg.z, seg.w * 0.18 * insetScale, 0.14, seg.d * 0.2 * insetScale, glassMaterial('#577d90', cfg.windowLighting > 0.3));
        if (sky) sky.rotation.x = -0.08;
      }
    }
  }

  if (cfg.parapet) {
    const ph = cfg.parapetHeight;
    const pt = Math.max(0.2, cfg.wallThickness);
    const frontExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5 - cut, seg.occlusions?.front || []);
    const backExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5, seg.occlusions?.back || []);
    const leftExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5, seg.occlusions?.left || []);
    const rightExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5 - cut, seg.occlusions?.right || []);

    if (!seg.skipWalls?.front && cfg.roofType !== 'pitched') {
      for (const [s, e] of frontExposed) {
        box(group, (s + e) * 0.5, y + ph * 0.5, seg.z + seg.d * 0.5 - pt * 0.5, e - s + 0.04, ph, pt, wallMat);
        if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z + seg.d * 0.5 - pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
      }
    }
    if (!seg.skipWalls?.back && cfg.roofType !== 'pitched') {
      for (const [s, e] of backExposed) {
        box(group, (s + e) * 0.5, y + ph * 0.5, seg.z - seg.d * 0.5 + pt * 0.5, e - s + 0.04, ph, pt, wallMat);
        if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z - seg.d * 0.5 + pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
      }
    }
    if (!seg.skipWalls?.left) {
      for (const [s, e] of leftExposed) {
        box(group, seg.x - seg.w * 0.5 + pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
      }
    }
    if (!seg.skipWalls?.right) {
      for (const [s, e] of rightExposed) {
        box(group, seg.x + seg.w * 0.5 - pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
      }
    }
    if (cut > 0.05) {
      const cx = seg.x + seg.w * 0.5 - cut * 0.5;
      const cz = seg.z + seg.d * 0.5 - cut * 0.5;
      const wedge = worldRoot(group, cx, y, cz);
      wedge.rotation.y = Math.PI / 4;
      box(wedge, 0, ph * 0.5, -pt * 0.5, cut * Math.SQRT2 + pt * 0.4, ph, pt, wallMat);
    }
  }
}

function addRooftopProps(group, topSegments, groundMain, cfg, r, baseHeight) {
  if (!topSegments.length) return;
  const roof = solid('#697277');
  const roofDark = solid('#363d40');
  const metal = solid('#858d8e');
  const pipeMat = solid('#5b6468');
  const cableMat = solid('#1d2225');
  const mainSeg = topSegments[0];
  const cut = mainSeg.cornerCut || 0;
  const isPitched = cfg.roofType === 'pitched';
  const pitchedW = mainSeg.w - cut;
  const ridgeH = isPitched ? Math.min(2.6, Math.max(1.4, Math.min(pitchedW, mainSeg.d) * 0.26)) : 0;
  const roofLift = cfg.roofType === 'mansard' ? 0.84 : cfg.roofType === 'stepped' ? 0.7 : (isPitched ? ridgeH * 0.55 : 0);
  const height = baseHeight + roofLift;

  const insetMargin = (cfg.roofType === 'mansard' || cfg.roofType === 'stepped') ? 1.8 : 1.4;
  const safeBounds = (seg, margin) => ({
    minX: seg.x - seg.w * 0.5 + margin,
    maxX: seg.x + seg.w * 0.5 - (seg.cornerCut || 0) - margin,
    minZ: seg.z - seg.d * 0.5 + margin,
    maxZ: seg.z + seg.d * 0.5 - (seg.cornerCut || 0) - margin
  });

  const b0 = safeBounds(mainSeg, insetMargin);
  const cableAnchors = [];

  const headW = Number(cfg.roofAccessWidth) || 2.4;
  const headD = Number(cfg.roofAccessDepth) || 3.2;
  const headHx = 0;
  const headHz = clamp(-mainSeg.d * 0.15, -mainSeg.d * 0.5 + headD * 0.5 + 0.8, mainSeg.d * 0.5 - headD * 0.5 - 0.8);
  const isInsideHeadhouse = (px, pz, radius = 0.5) => {
    if (!cfg.roofAccess) return false;
    const hw = headW * 0.5 + radius;
    const hd = headD * 0.5 + radius;
    return Math.abs(px - headHx) < hw && Math.abs(pz - headHz) < hd;
  };

  if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    let x = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
    let z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    if (isInsideHeadhouse(x, z, 1.45)) {
      const rightX = clamp(headHx + headW * 0.5 + 1.45, b0.minX, b0.maxX);
      if (rightX - (headHx + headW * 0.5) >= 1.25) {
        x = rightX;
      } else {
        z = clamp(headHz + headD * 0.5 + 1.6, b0.minZ, b0.maxZ);
      }
    }
    const legBaseH = isPitched ? 2.4 : 1.8;
    for (const dx of [-0.66, 0.66]) {
      for (const dz of [-0.66, 0.66]) {
        box(group, x + dx, height + 0.58, z + dz, 0.12, legBaseH, 0.12, roofDark);
      }
    }
    cylinder(group, x, height + 2.22, z, 1.15, 1.12, 1.35, solid('#655449'), 10);
    cylinder(group, x, height + 2.98, z, 1.22, 1.0, 0.25, roofDark, 10);
    for (let i = 0; i < 3; i++) {
      cylinder(group, x, height + 1.8 + i * 0.4, z, 1.16, 1.16, 0.07, metal, 10);
    }
    cableAnchors.push([x, height + 2.5, z]);
  }

  for (let i = 0; i < cfg.chimneys; i++) {
    const seg = pick(r, topSegments);
    const b = safeBounds(seg, 0.9);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    let x = randBetween(r, b.minX, b.maxX);
    let z = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(x, z, 0.65)) {
      z = clamp(headHz + headD * 0.5 + 0.8, b.minZ, b.maxZ);
    }
    const chimH = isPitched ? 2.2 : 1.4;
    box(group, x, baseHeight + chimH * 0.5, z, 0.62, chimH, 0.55, solid('#676663'));
    box(group, x, baseHeight + chimH + 0.07, z, 0.81, 0.15, 0.74, roofDark);
    cableAnchors.push([x, baseHeight + chimH * 0.85, z]);
  }

  const hvacPositions = [];
  const units = Math.round(cfg.rooftopProps * 8);
  for (let i = 0; i < units; i++) {
    const seg = pick(r, topSegments);
    const b = safeBounds(seg, insetMargin);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    let x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
    let z = randBetween(r, b.minZ, b.maxZ);
    if (isInsideHeadhouse(x, z, 0.8)) continue;
    const propBaseY = isPitched ? baseHeight + ridgeH - 0.15 : height;
    if (r() < 0.67) {
      const uw = randBetween(r, 0.7, 1.4);
      const ud = randBetween(r, 0.7, 1.2);
      box(group, x, propBaseY + 0.4, z, uw, 0.8, ud, roof);
      for (let j = 0; j < 3; j++) {
        box(group, x + (j - 1) * (uw * 0.24), propBaseY + 0.4, z + ud * 0.5 + 0.02, 0.08, 0.42, 0.04, roofDark);
      }
      hvacPositions.push([x, propBaseY, z]);
      cableAnchors.push([x, propBaseY + 0.76, z]);
    } else {
      cylinder(group, x, propBaseY + 0.13, z, 0.45, 0.45, 0.26, metal, 8);
      cylinder(group, x, propBaseY + 0.38, z, 0.18, 0.18, 0.32, roofDark, 8);
    }
  }

  if (cfg.antennas && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const x = isPitched ? mainSeg.x - cut * 0.5 : clamp(mainSeg.x - mainSeg.w * 0.28, b0.minX, b0.maxX);
    const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    const antBaseY = isPitched ? baseHeight + ridgeH : height;
    line(group, [x, antBaseY, z], [x, antBaseY + 3, z], 0.055, roof);
    line(group, [x - 0.8, antBaseY + 2.15, z], [x + 0.8, antBaseY + 2.15, z], 0.045, metal);
    line(group, [x - 0.43, antBaseY + 2.55, z], [x + 0.43, antBaseY + 2.55, z], 0.045, metal);
    cableAnchors.push([x, antBaseY + 2.1, z]);
  }

  if (cfg.rooftopPipes) {
    const pipeY = height + 0.09;
    if (!isPitched && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
      const backRunZ = mainSeg.z - mainSeg.d * 0.5 + 0.42;
      const leftRunX = mainSeg.x - mainSeg.w * 0.5 + 0.42;
      const rightRunX = mainSeg.x + mainSeg.w * 0.5 - cut - 0.42;

      line(group, [leftRunX, pipeY, backRunZ], [rightRunX, pipeY, backRunZ], 0.055, pipeMat);
      line(group, [leftRunX, pipeY, backRunZ], [leftRunX, pipeY, mainSeg.z + mainSeg.d * 0.32], 0.05, pipeMat);
      if (cfg.parapet) {
        line(group, [leftRunX, pipeY, backRunZ], [leftRunX, baseHeight + cfg.parapetHeight + 0.12, backRunZ], 0.05, pipeMat);
      }

      for (let i = 0; i < Math.min(3, hvacPositions.length); i++) {
        const [hx, , hz] = hvacPositions[i];
        line(group, [hx, pipeY, hz], [hx, pipeY, backRunZ], 0.04, metal);
      }

      const postA = [leftRunX + 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, mainSeg.z + mainSeg.d * 0.38];
      const postB = [rightRunX - 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, backRunZ + 0.15];
      line(group, [postA[0], height, postA[2]], postA, 0.04, roofDark);
      line(group, [postB[0], height, postB[2]], postB, 0.04, roofDark);
      cableAnchors.push(postA, postB);
    }

    for (let i = 0; i < cableAnchors.length - 1; i++) {
      sagCable(group, cableAnchors[i], cableAnchors[i + 1], randBetween(r, 0.22, 0.48), 0.018, cableMat, 6);
    }

    if (groundMain && !cfg.cutaway) {
      const mainH = cfg.setback > 0 ? Math.floor(cfg.floors * 0.6) * cfg.floorHeight : baseHeight;
      const spoutX = groundMain.x - groundMain.w * 0.5 + 0.32;
      const spoutZ = groundMain.z - groundMain.d * 0.5 - 0.06;
      line(group, [spoutX, 0.1, spoutZ], [spoutX, mainH - 0.1, spoutZ], 0.048, pipeMat);
      const sideSpoutX = groundMain.x - groundMain.w * 0.5 - 0.06;
      const sideSpoutZ = groundMain.z + groundMain.d * 0.32;
      line(group, [sideSpoutX, 0.1, sideSpoutZ], [sideSpoutX, mainH - 0.1, sideSpoutZ], 0.045, pipeMat);
      box(group, sideSpoutX - 0.04, 1.35, sideSpoutZ - 0.45, 0.12, 0.42, 0.32, roofDark);
      line(group, [sideSpoutX, 1.56, sideSpoutZ - 0.45], [sideSpoutX, mainH * 0.65, sideSpoutZ - 0.45], 0.025, metal);
    }
  }
}

function addRooftopHeadhouse(group, topSegments, cfg, baseHeight) {
  if (!cfg.roofAccess || !topSegments.length) return;
  const mainSeg = topSegments[0];
  const w = Number(cfg.roofAccessWidth) || 2.4;
  const d = Number(cfg.roofAccessDepth) || 3.2;
  const h = Number(cfg.roofAccessHeight) || 2.3;
  const hx = 0;
  const hz = clamp(-mainSeg.d * 0.15, -mainSeg.d * 0.5 + d * 0.5 + 0.8, mainSeg.d * 0.5 - d * 0.5 - 0.8);

  const style = cfg.roofAccessStyle || 'brick';
  let wallMat;
  if (style === 'concrete') wallMat = solid('#7a858d');
  else if (style === 'metal') wallMat = solid('#434d54');
  else if (style === 'decorative') wallMat = solid(cfg.trimColor || '#c4b59d');
  else if (style === 'industrial') wallMat = solid('#384146');
  else wallMat = solid(cfg.wallColor || '#8a4b3d');

  const headhouseRoot = worldRoot(group, hx, baseHeight, hz);

  // Main structure walls
  box(headhouseRoot, 0, h * 0.5, 0, w, h, d, wallMat);

  // Roof
  const roofStyle = cfg.roofAccessRoof || 'flat';
  if (roofStyle === 'sloped') {
    box(headhouseRoot, 0, h + 0.08, 0, w + 0.2, 0.14, d + 0.2, solid('#252b2e'));
  } else {
    box(headhouseRoot, 0, h + 0.06, 0, w + 0.16, 0.12, d + 0.16, solid(cfg.trimColor || '#d5cdbd'));
  }

  // Access door
  const doorSide = cfg.roofAccessDoorSide || 'front';
  const dw = 1.15;
  const dh = Math.min(2.05, h - 0.2);
  const doorMat = solid(style === 'decorative' ? '#5a3825' : '#2b3338');
  const doorFrame = solid(cfg.trimColor || '#3a444a');

  const doorGroup = worldRoot(headhouseRoot);
  if (doorSide === 'front') {
    doorGroup.position.set(0, 0, d * 0.5);
  } else if (doorSide === 'back') {
    doorGroup.position.set(0, 0, -d * 0.5);
    doorGroup.rotation.y = Math.PI;
  } else if (doorSide === 'left') {
    doorGroup.position.set(-w * 0.5, 0, 0);
    doorGroup.rotation.y = -Math.PI / 2;
  } else if (doorSide === 'right') {
    doorGroup.position.set(w * 0.5, 0, 0);
    doorGroup.rotation.y = Math.PI / 2;
  }

  // Door pane, frame, threshold, handle
  box(doorGroup, 0, dh * 0.5, 0.02, dw, dh, 0.04, doorMat);
  box(doorGroup, -dw * 0.5 - 0.04, dh * 0.5, 0.02, 0.08, dh + 0.08, 0.06, doorFrame);
  box(doorGroup, dw * 0.5 + 0.04, dh * 0.5, 0.02, 0.08, dh + 0.08, 0.06, doorFrame);
  box(doorGroup, 0, dh + 0.04, 0.02, dw + 0.16, 0.08, 0.06, doorFrame);
  box(doorGroup, 0, 0.03, 0.06, dw + 0.2, 0.06, 0.12, solid('#5a6268'));
  box(doorGroup, dw * 0.38, dh * 0.48, 0.05, 0.05, 0.12, 0.06, solid('#e2b855'));

  // Exterior gooseneck light fixture above door
  box(doorGroup, 0, dh + 0.22, 0.15, 0.12, 0.18, 0.14, solid('#1e293b'));
  box(doorGroup, 0, dh + 0.18, 0.18, 0.08, 0.1, 0.08, solid('#ffe8a3'));
}

function addVentilationFans(group, topSegments, cfg, r, baseHeight) {
  if (!cfg.rooftopVents || !topSegments.length) return;
  const mainSeg = topSegments[0];
  const count = 2;
  for (let i = 0; i < count; i++) {
    const vx = mainSeg.x + (i === 0 ? -1 : 1) * (mainSeg.w * 0.28);
    const vz = mainSeg.z + (i === 0 ? 1 : -1) * (mainSeg.d * 0.22);
    box(group, vx, baseHeight + 0.15, vz, 1.15, 0.3, 1.15, solid('#3e484f'));
    cylinder(group, vx, baseHeight + 0.6, vz, 0.44, 0.44, 0.6, solid('#606c74'), 12);
    cylinder(group, vx, baseHeight + 0.98, vz, 0.54, 0.2, 0.22, solid('#2b3338'), 12);
    box(group, vx, baseHeight + 0.6, vz, 0.92, 0.05, 0.92, solid('#1f262b'));
  }
}

function addRoofAccessHatch(group, topSegments, cfg, r, baseHeight) {
  if (!cfg.rooftopHatch || !topSegments.length) return;
  const mainSeg = topSegments[0];
  const hx = mainSeg.x - mainSeg.w * 0.28;
  const hz = mainSeg.z + mainSeg.d * 0.28;
  box(group, hx, baseHeight + 0.18, hz, 1.05, 0.36, 1.05, solid('#475569'));
  box(group, hx, baseHeight + 0.38, hz, 1.15, 0.06, 1.15, solid('#64748b'));
  cylinder(group, hx, baseHeight + 0.38, hz - 0.55, 0.03, 0.03, 0.95, solid('#1e293b'), 8);
  box(group, hx, baseHeight + 0.44, hz + 0.42, 0.22, 0.08, 0.05, solid('#e2b855'));
}

function addRooftopWalkways(group, topSegments, cfg, baseHeight) {
  if (!cfg.rooftopWalkways || !topSegments.length) return;
  const mainSeg = topSegments[0];
  const plankMat = solid('#4a4036');
  const spanD = mainSeg.d * 0.65;
  box(group, mainSeg.x, baseHeight + 0.035, mainSeg.z, 0.85, 0.07, spanD, plankMat);
  box(group, mainSeg.x + 1.2, baseHeight + 0.035, mainSeg.z - mainSeg.d * 0.15, 2.4, 0.07, 0.85, plankMat);
}

function addSafetyRailings(group, topSegments, cfg, baseHeight) {
  if (!cfg.safetyRailings || !topSegments.length) return;
  const mainSeg = topSegments[0];
  const railMat = solid('#64748b');
  const rh = 1.05;
  const rz = mainSeg.z + mainSeg.d * 0.5 - 0.25;
  const rw = mainSeg.w - 0.8;
  line(group, [mainSeg.x - rw * 0.5, baseHeight + rh, rz], [mainSeg.x + rw * 0.5, baseHeight + rh, rz], 0.04, railMat);
  line(group, [mainSeg.x - rw * 0.5, baseHeight + rh * 0.5, rz], [mainSeg.x + rw * 0.5, baseHeight + rh * 0.5, rz], 0.03, railMat);
  const posts = Math.max(3, Math.round(rw / 1.8));
  for (let i = 0; i <= posts; i++) {
    const px = mainSeg.x - rw * 0.5 + (i / posts) * rw;
    line(group, [px, baseHeight, rz], [px, baseHeight + rh, rz], 0.04, railMat);
  }
}

function addAdditionalEntrances(parent, groundSegments, cfg) {
  if (!groundSegments.length) return;

  if (cfg.rearEntrance) {
    const layout = computeRearEntranceLayout(groundSegments, cfg);
    if (layout) {
      const group = worldRoot(parent, layout.cx, 0, layout.wallZ);
      group.rotation.y = Math.PI;
      const dw = layout.doorWidth;
      const dh = layout.doorHeight;
      const doorMat = solid(cfg.rearDoorStyle === 'metal' ? '#334155' : (cfg.doorColor || '#475569'));
      box(group, 0, dh * 0.5 + layout.totalRise, 0.02, dw, dh, 0.05, doorMat);
      box(group, 0, layout.totalRise * 0.5, layout.landingD * 0.5, dw + 0.4, layout.totalRise, layout.landingD, solid('#64748b'));
      box(group, 0, dh + layout.totalRise + 0.24, 0.16, 0.16, 0.22, 0.16, solid('#1e293b'));
      box(group, 0, dh + layout.totalRise + 0.18, 0.2, 0.08, 0.12, 0.08, solid('#ffe599'));
    }
  }

  const sides = [];
  if (cfg.sideEntrance === 'left' || cfg.sideEntrance === 'both') sides.push('left');
  if (cfg.sideEntrance === 'right' || cfg.sideEntrance === 'both') sides.push('right');
  for (const s of sides) {
    const layout = computeSideEntranceLayout(groundSegments, cfg, s);
    if (layout) {
      const group = worldRoot(parent, layout.cx, 0, layout.wallZ);
      group.rotation.y = layout.rotY;
      const dw = layout.doorWidth;
      const dh = layout.doorHeight;
      box(group, 0, dh * 0.5 + layout.totalRise, 0.02, dw, dh, 0.05, solid(cfg.doorColor || '#524338'));
      box(group, 0, layout.totalRise * 0.5, layout.landingD * 0.5, dw + 0.4, layout.totalRise, layout.landingD, solid('#64748b'));
      box(group, 0, dh + layout.totalRise + 0.22, 0.14, 0.14, 0.18, 0.14, solid('#1e293b'));
      box(group, 0, dh + layout.totalRise + 0.18, 0.18, 0.08, 0.1, 0.08, solid('#ffe599'));
    }
  }

  if (cfg.basementEntrance) {
    const layout = computeBasementEntranceLayout(groundSegments, cfg);
    if (layout) {
      const group = worldRoot(parent, layout.cx, 0, layout.wallZ);
      const dw = layout.doorWidth;
      const dd = layout.totalStepDepth;
      const cellarMat = solid('#475569');
      const stormDoor = box(group, 0, 0.52, dd * 0.5, dw, 0.08, dd, cellarMat);
      if (stormDoor) stormDoor.rotation.x = -0.38;
      box(group, -dw * 0.5 - 0.06, 0.35, dd * 0.5, 0.12, 0.7, dd, solid('#716f67'));
      box(group, dw * 0.5 + 0.06, 0.35, dd * 0.5, 0.12, 0.7, dd, solid('#716f67'));
      box(group, 0, 0.58, dd * 0.5, 0.03, 0.1, dd, solid('#1e293b'));
      box(group, -0.18, 0.62, dd * 0.65, 0.04, 0.08, 0.16, solid('#e2b855'));
      box(group, 0.18, 0.62, dd * 0.65, 0.04, 0.08, 0.16, solid('#e2b855'));
    }
  }

  if (cfg.deliveryEntrance) {
    const layout = computeDeliveryEntranceLayout(groundSegments, cfg);
    if (layout) {
      const group = worldRoot(parent, layout.cx, 0, layout.wallZ);
      group.rotation.y = layout.rotY;
      const dw = layout.doorWidth;
      const dh = layout.doorHeight;
      box(group, 0, dh * 0.5 + layout.totalRise, 0.02, dw, dh, 0.08, solid('#334155'));
      for (let rIdx = 0; rIdx < 10; rIdx++) {
        box(group, 0, (rIdx / 10) * dh + layout.totalRise + 0.1, 0.04, dw - 0.04, 0.04, 0.04, solid('#1e293b'));
      }
      box(group, 0, layout.totalRise * 0.5, layout.landingD * 0.5, dw + 0.5, layout.totalRise, layout.landingD, solid('#64748b'));
      box(group, -dw * 0.5 - 0.18, 0.45, layout.landingD + 0.06, 0.14, 0.8, 0.14, solid('#0f172a'));
      box(group, dw * 0.5 + 0.18, 0.45, layout.landingD + 0.06, 0.14, 0.8, 0.14, solid('#0f172a'));
    }
  }
}

function addGraffiti(parent, groundSegments, cfg) {
  if (!cfg.graffiti || !groundSegments.length) return;
  const primary = groundSegments[0];
  const density = clamp(Number(cfg.graffitiDensity) || 0.4, 0.1, 1.0);
  const count = Math.max(2, Math.round(density * 14));
  const style = cfg.graffitiStyle || 'mixed';
  const cut = primary.cornerCut || 0;
  const shutterHalf = cfg.shutters ? 0.36 : 0.10;
  const wy = cfg.floorHeight * 0.51;
  const wh = Math.min(cfg.windowHeight || 1.85, cfg.floorHeight * 0.66);
  const winBottom = wy - wh * 0.5 - 0.08;
  const grimeTop = (cfg.age || 0) > 0.05 ? (0.22 + (cfg.age || 0) * 0.35) : 0.18;
  const surfaceOffset = 0.048;

  // Build blocked X/Z spans per facade including occlusions, doors, and ground-floor window spans
  const collectSideSlots = (side) => {
    if (cfg.cutaway && side === 'front') return [];
    if (primary.skipWalls?.[side]) return [];
    const isLong = side === 'front' || side === 'back';
    const rawMin = (isLong ? primary.x - primary.w * 0.5 : primary.z - primary.d * 0.5) + 0.35;
    const rawMax = (isLong
      ? primary.x + primary.w * 0.5 - (side === 'front' ? cut : 0)
      : primary.z + primary.d * 0.5 - (side === 'right' ? cut : 0)) - 0.35;
    if (rawMax - rawMin < 0.8) return [];

    const blocked = [...(primary.occlusions?.[side] || [])];
    const mainDoorCx = primary.x - cut * 0.5;
    if (side === 'front' && primary.hasEntrance) {
      const primaryEntrance = computePrimaryEntranceLayout(primary, cfg);
      const halfSpan = Math.max(primaryEntrance.stoopW * 0.5, primaryEntrance.doorWidth * 0.5 + 0.35) + 0.25;
      blocked.push([mainDoorCx - halfSpan, mainDoorCx + halfSpan]);
      if (cfg.basementEntrance) {
        const baseCx = clamp(mainDoorCx - Math.max(2.4, primary.w * 0.28), primary.x - primary.w * 0.5 + 0.9, mainDoorCx - 1.8);
        blocked.push([baseCx - 1.25, baseCx + 1.25]);
      }
    } else if (side === 'back' && (cfg.rearEntrance || cfg.deliveryEntrance)) {
      blocked.push([primary.x - 1.5, primary.x + 1.5]);
    } else if (side === 'left' && (cfg.sideEntrance === 'left' || cfg.sideEntrance === 'both' || cfg.deliveryEntrance)) {
      blocked.push([primary.z - 1.3, primary.z + 1.3]);
    } else if (side === 'right' && (cfg.sideEntrance === 'right' || cfg.sideEntrance === 'both')) {
      blocked.push([primary.z - 1.3, primary.z + 1.3]);
    }

    // Also block exact window columns reproduced cleanly on Floor 1
    const withWindowBlocked = [...blocked];
    if (!(side === 'front' && primary.hasEntrance && cfg.groundUse === 'shop')) {
      const desiredCols = isLong ? (cfg.windowsX || 3) : (cfg.windowsSide || 3);
      const shutterPad = cfg.shutters ? 0.62 : 0.34;
      const totalLength = isLong ? primary.w : primary.d;
      const winSpans = subtractIntervals(rawMin + 0.1, rawMax - 0.1, blocked);
      for (const [s, e] of winSpans) {
        const avail = e - s;
        if (avail < Math.min(0.85, (cfg.windowWidth || 1.4) * 0.7)) continue;
        const prop = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
        const maxFit = Math.max(1, Math.floor(avail / ((cfg.windowWidth || 1.4) + shutterPad)));
        const wCount = Math.max(1, Math.min(prop, maxFit));
        const spacing = avail / wCount;
        const ww = Math.min(cfg.windowWidth || 1.4, spacing * (cfg.shutters ? 0.58 : 0.74), avail - 0.16);
        const halfW = ww * 0.5 + shutterHalf;
        for (let j = 0; j < wCount; j++) {
          const cx = s + (j + 0.5) * spacing;
          withWindowBlocked.push([cx - halfW, cx + halfW]);
        }
      }
    }

    const slots = [];
    const pierSpans = subtractIntervals(rawMin, rawMax, withWindowBlocked).filter(([s, e]) => e - s >= 0.48);
    for (const [s, e] of pierSpans) {
      const len = e - s;
      const dw = clamp(len - 0.08, 0.44, 1.78);
      const dh = clamp(dw * 0.56, 0.36, 0.92);
      const subCount = len >= 3.2 ? 2 : 1;
      for (let k = 0; k < subCount; k++) {
        const coord = subCount === 1
          ? (s + e) * 0.5
          : s + len * (k === 0 ? 0.28 : 0.72);
        const minY = Math.max(grimeTop + dh * 0.5 + 0.06, 0.78);
        const maxY = Math.max(minY, cfg.floorHeight - dh * 0.5 - 0.28);
        slots.push({ side, coord, dw, dh, minY, maxY });
      }
    }

    // Supplement with dado/spandrel slots above grime and below window sill when piers are scarce
    const dadoBandH = winBottom - grimeTop;
    if (slots.length < 2 && dadoBandH >= 0.34) {
      const freeSpans = subtractIntervals(rawMin, rawMax, blocked).filter(([s, e]) => e - s >= 0.95);
      for (const [s, e] of freeSpans) {
        const dw = clamp((e - s) * 0.42, 0.78, 1.5);
        const dh = clamp(dadoBandH - 0.05, 0.30, 0.52);
        const yMid = grimeTop + dh * 0.5 + 0.03;
        const coord = (s + e) * 0.5;
        if (!slots.some((sl) => Math.abs(sl.coord - coord) < 0.85)) {
          slots.push({ side, coord, dw, dh, minY: yMid, maxY: yMid });
        }
      }
    }
    return slots;
  };

  const slotsBySide = {
    front: collectSideSlots('front'),
    right: collectSideSlots('right'),
    left: collectSideSlots('left'),
    back: collectSideSlots('back')
  };
  const allSlots = [];
  const sideOrder = ['front', 'right', 'left', 'back'];
  const maxLen = Math.max(...sideOrder.map((s) => slotsBySide[s].length));
  for (let row = 0; row < maxLen; row++) {
    for (const s of sideOrder) {
      if (slotsBySide[s][row]) allSlots.push(slotsBySide[s][row]);
    }
  }
  if (!allSlots.length) return;

  const r = (seedOffset) => {
    const x = Math.sin(cfg.seed * 12.9898 + seedOffset * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const slot = allSlots[i % allSlots.length];
    const lap = Math.floor(i / allSlots.length);
    const mat = graffitiMaterial(cfg.seed + i * 179, style, i);

    let gx, gz, rotY;
    const jitter = lap === 0 ? (r(i + 1) - 0.5) * 0.14 : (r(i + 17) - 0.5) * Math.min(0.45, slot.dw * 0.25);
    const coord = slot.coord + jitter;
    if (slot.side === 'front') {
      gx = coord;
      gz = primary.z + primary.d * 0.5 + surfaceOffset + i * 0.001;
      rotY = 0;
    } else if (slot.side === 'back') {
      gx = coord;
      gz = primary.z - primary.d * 0.5 - surfaceOffset - i * 0.001;
      rotY = Math.PI;
    } else if (slot.side === 'right') {
      gx = primary.x + primary.w * 0.5 + surfaceOffset + i * 0.001;
      gz = coord;
      rotY = Math.PI / 2;
    } else {
      gx = primary.x - primary.w * 0.5 - surfaceOffset - i * 0.001;
      gz = coord;
      rotY = -Math.PI / 2;
    }

    const gy = clamp(slot.minY + r(i + 53) * Math.max(0.05, slot.maxY - slot.minY) + (lap * 0.35), slot.minY, slot.maxY);
    const decalGeo = new THREE.PlaneGeometry(slot.dw, slot.dh);
    const decalMesh = new THREE.Mesh(decalGeo, mat);
    decalMesh.position.set(gx, gy, gz);
    decalMesh.rotation.y = rotY;
    parent.add(decalMesh);
  }
}


function addStraightRunFireEscapeGeometry(parent, groundSegments, placement, cfg) {
  const layout = computeStraightRunFireEscape(groundSegments, placement, cfg);
  if (!layout || !layout.feasible) return null;

  const steel = solid('#3a4347');
  const deckMat = solid('#293035');
  const treadMat = solid('#2f383e');
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

  const feGroup = worldRoot(parent, layout.anchor.x, 0, layout.anchor.z);
  feGroup.rotation.y = rotMap[layout.side] || 0;
  feGroup.name = 'FireEscapeStraightRun';

  const {
    wallClearance,
    zWalkMin,
    zWalkMax,
    zPathCenter,
    zRailInner,
    zRailOuter,
    railHeight,
    deckThickness
  } = layout.dimensions;

  // 1. Landings & underlying wall support brackets
  for (const landing of layout.landings) {
    const loc = landing.local;
    const deckMesh = box(
      feGroup,
      loc.x,
      loc.yCenter,
      loc.zCenter,
      loc.length,
      deckThickness,
      loc.depth,
      deckMat
    );
    if (deckMesh) {
      deckMesh.name = landing.id;
      deckMesh.userData = { componentId: landing.id, type: 'landing', floor: landing.floor };
    }

    // Structural underside brackets mounted below deck slab so upper path stays 100% clear
    if (loc.zMin > 0.05) {
      const spanOut = zWalkMax + 0.04;
      const bracketY = loc.yTop - deckThickness - 0.03;
      const bxPositions = [loc.xMin + 0.14, loc.xMax - 0.14];
      for (const bx of bxPositions) {
        box(feGroup, bx, bracketY, spanOut * 0.5, 0.06, 0.06, spanOut, steel);
        line(feGroup, [bx, bracketY - 0.42, 0.02], [bx, bracketY, zWalkMin + 0.35], 0.032, steel);
      }
    }
  }

  // 2. Vertical railing segments along landings and stepped barrier visual rails
  for (const rail of layout.railings) {
    const rl = rail.local;
    const isStairRail = rail.id.includes('_stair_');
    if (isStairRail) continue; // Rendered smoothly as continuous sloped stair handrails below

    const yBot = rl.y - rl.height * 0.5;
    const yTop = yBot + rl.height;
    const isEndCross = rl.alongLen < 0.25 && rl.outThick > 0.5;

    // Top bar, mid bar, bottom curb
    box(feGroup, rl.x, yTop - 0.03, rl.z, rl.alongLen, 0.05, rl.outThick, steel);
    box(feGroup, rl.x, yBot + rl.height * 0.5, rl.z, rl.alongLen, 0.035, rl.outThick * 0.85, steel);
    box(feGroup, rl.x, yBot + 0.04, rl.z, rl.alongLen, 0.04, rl.outThick * 0.9, steel);

    const spanMajor = isEndCross ? rl.outThick : rl.alongLen;
    const posts = Math.max(2, Math.round(spanMajor / 0.55) + 1);
    for (let p = 0; p < posts; p++) {
      const t = posts === 1 ? 0.5 : p / (posts - 1);
      const px = isEndCross ? rl.x : (rl.x - rl.alongLen * 0.5 + 0.025 + t * Math.max(0.01, rl.alongLen - 0.05));
      const pz = isEndCross ? (rl.z - rl.outThick * 0.5 + 0.025 + t * Math.max(0.01, rl.outThick - 0.05)) : rl.z;
      box(feGroup, px, yBot + rl.height * 0.5, pz, 0.04, rl.height, 0.04, steel);
    }
  }

  // 3. Straight-run stair flights, individual ~1 B unit treads, sloped stringers & handrails
  for (const flight of layout.flights) {
    const fl = flight.local;
    const treadThickness = flight.treads[0]?.treadMetrics.thickness || 0.0607;
    const stairRise = fl.yUpper - fl.yLower;
    const stairRun = fl.xEnd - fl.xStart;

    for (const tread of flight.treads) {
      const tl = tread.local;
      const treadMesh = box(
        feGroup,
        tl.x,
        tl.y,
        tl.z,
        tread.treadMetrics.stepRun,
        tread.treadMetrics.thickness,
        tread.treadMetrics.width,
        treadMat
      );
      if (treadMesh) {
        treadMesh.name = tread.id;
        treadMesh.userData = {
          treadId: tread.id,
          flightId: flight.flightId,
          stepIndex: tread.stepIndex
        };
      }
    }

    // Sloped side stringer beams & handrails placed outside clear walkable [zWalkMin, zWalkMax]
    for (const zRail of [zRailInner, zRailOuter]) {
      // Lower structural stringer
      line(
        feGroup,
        [fl.xStart, fl.yLower - 0.05, zRail],
        [fl.xEnd, fl.yUpper - treadThickness * 0.5 - 0.03, zRail],
        0.045,
        steel
      );
      // Angled top handrail & mid safety rail
      line(
        feGroup,
        [fl.xStart, fl.yLower + railHeight - 0.03, zRail],
        [fl.xEnd, fl.yUpper + railHeight - 0.03, zRail],
        0.03,
        steel
      );
      line(
        feGroup,
        [fl.xStart, fl.yLower + railHeight * 0.5, zRail],
        [fl.xEnd, fl.yUpper + railHeight * 0.5, zRail],
        0.02,
        steel
      );

      // Vertical balusters spaced along stair run
      const postCount = Math.max(4, Math.round(stairRun / 0.72));
      for (let p = 0; p <= postCount; p++) {
        const t = p / postCount;
        const px = fl.xStart + t * stairRun;
        const py = fl.yLower + t * stairRise;
        line(feGroup, [px, py - 0.03, zRail], [px, py + railHeight - 0.03, zRail], 0.022, steel);
      }
    }
  }

  // 4. Unobstructed front drop ladder (exact match to fe_ladder_drop)
  if (layout.dropLadder) {
    const dl = layout.dropLadder.local;
    const zHalf = dl.width * 0.5 - 0.025;
    const topBarY = dl.maxY + railHeight;

    for (const zOff of [-zHalf, zHalf]) {
      const pz = dl.z + zOff;
      box(feGroup, dl.x, (dl.minY + topBarY) * 0.5, pz, 0.045, topBarY - dl.minY, 0.045, steel);
      // Connect top handrail smoothly back to F1 landing corner without obstructing center
      line(feGroup, [dl.x, topBarY - 0.03, pz], [dl.x + 0.14, dl.maxY + railHeight - 0.03, pz], 0.025, steel);
    }

    const rungSpacing = 0.28;
    const rungs = Math.max(2, Math.floor((dl.maxY - dl.minY) / rungSpacing));
    for (let r = 1; r <= rungs; r++) {
      const ry = dl.minY + (r / (rungs + 0.4)) * (dl.maxY - dl.minY);
      box(feGroup, dl.x, ry, dl.z, 0.035, 0.035, dl.width - 0.06, steel);
    }
  }

  // 5. Roof access gooseneck ladder reaching parapet top (exact match to fe_ladder_roof)
  if (layout.roofLadder) {
    const rl = layout.roofLadder.local;
    const xHalf = rl.width * 0.5 - 0.025;
    const wallRailZ = Math.max(0.05, Math.min(wallClearance - 0.05, 0.14));

    for (const xOff of [-xHalf, xHalf]) {
      const rx = rl.x + xOff;
      // Vertical rail from F3 portal to above roof parapet
      box(feGroup, rx, (rl.minY + rl.maxY) * 0.5, wallRailZ, 0.045, rl.maxY - rl.minY, 0.045, steel);
      // Gooseneck return curving cleanly onto roof deck
      line(feGroup, [rx, rl.maxY, wallRailZ], [rx, rl.maxY + 0.28, wallRailZ - 0.18], 0.026, steel);
      line(feGroup, [rx, rl.maxY + 0.28, wallRailZ - 0.18], [rx, rl.roofDeckTop, -0.58], 0.026, steel);
    }

    const rungCount = Math.max(4, Math.floor((rl.maxY - rl.minY) / 0.28));
    for (let r = 1; r <= rungCount; r++) {
      const ry = rl.minY + (r / (rungCount + 0.35)) * (rl.maxY - rl.minY);
      box(feGroup, rl.x, ry, wallRailZ, rl.width - 0.06, 0.035, 0.035, steel);
    }
  }

  return feGroup;
}

function addDeterministicRooftopGeometry(group, topSegments, groundMain, cfg) {
  const layout = computeDeterministicRooftopLayout(cfg, topSegments, groundMain);
  if (!topSegments.length) return layout;

  const roof = solid('#697277');
  const roofDark = solid('#363d40');
  const metal = solid('#858d8e');
  const pipeMat = solid('#5b6468');
  const cableMat = solid('#1d2225');

  // 1. Rooftop stairwell headhouse
  if (layout.headhouse) {
    const hSpec = layout.headhouse;
    let wallMat;
    if (hSpec.style === 'concrete') wallMat = solid('#7a858d');
    else if (hSpec.style === 'metal') wallMat = solid('#434d54');
    else if (hSpec.style === 'decorative') wallMat = solid(cfg.trimColor || '#c4b59d');
    else if (hSpec.style === 'industrial') wallMat = solid('#384146');
    else wallMat = solid(cfg.wallColor || '#8a4b3d');

    const headRoot = worldRoot(group, hSpec.x, hSpec.baseY, hSpec.z);
    headRoot.name = hSpec.id;
    const body = box(headRoot, 0, hSpec.height * 0.5, 0, hSpec.width, hSpec.height, hSpec.depth, wallMat);
    if (body) body.userData = { rooftopColliderId: hSpec.id };

    if (hSpec.roofStyle === 'sloped') {
      box(headRoot, 0, hSpec.height + 0.08, 0, hSpec.width + 0.2, 0.14, hSpec.depth + 0.2, solid('#252b2e'));
    } else {
      box(headRoot, 0, hSpec.height + 0.06, 0, hSpec.width + 0.16, 0.12, hSpec.depth + 0.16, solid(cfg.trimColor || '#d5cdbd'));
    }

    const dw = 1.15;
    const dh = Math.min(2.05, hSpec.height - 0.2);
    const doorMat = solid(hSpec.style === 'decorative' ? '#5a3825' : '#2b3338');
    const doorFrame = solid(cfg.trimColor || '#3a444a');
    const doorGroup = worldRoot(headRoot);

    if (hSpec.doorSide === 'front') doorGroup.position.set(0, 0, hSpec.depth * 0.5);
    else if (hSpec.doorSide === 'back') { doorGroup.position.set(0, 0, -hSpec.depth * 0.5); doorGroup.rotation.y = Math.PI; }
    else if (hSpec.doorSide === 'left') { doorGroup.position.set(-hSpec.width * 0.5, 0, 0); doorGroup.rotation.y = -Math.PI / 2; }
    else if (hSpec.doorSide === 'right') { doorGroup.position.set(hSpec.width * 0.5, 0, 0); doorGroup.rotation.y = Math.PI / 2; }

    box(doorGroup, 0, dh * 0.5, 0.02, dw, dh, 0.04, doorMat);
    box(doorGroup, -dw * 0.5 - 0.04, dh * 0.5, 0.02, 0.08, dh + 0.08, 0.06, doorFrame);
    box(doorGroup, dw * 0.5 + 0.04, dh * 0.5, 0.02, 0.08, dh + 0.08, 0.06, doorFrame);
    box(doorGroup, 0, dh + 0.04, 0.02, dw + 0.16, 0.08, 0.06, doorFrame);
    box(doorGroup, 0, 0.03, 0.06, dw + 0.2, 0.06, 0.12, solid('#5a6268'));
    box(doorGroup, dw * 0.38, dh * 0.48, 0.05, 0.05, 0.12, 0.06, solid('#e2b855'));
    box(doorGroup, 0, dh + 0.22, 0.15, 0.12, 0.18, 0.14, solid('#1e293b'));
    box(doorGroup, 0, dh + 0.18, 0.18, 0.08, 0.1, 0.08, solid('#ffe8a3'));
  }

  // 2. Rooftop water tank
  if (layout.waterTank) {
    const wt = layout.waterTank;
    for (const dx of [-0.66, 0.66]) {
      for (const dz of [-0.66, 0.66]) {
        const leg = box(group, wt.x + dx, wt.baseY + 0.58, wt.z + dz, 0.12, wt.legBaseH, 0.12, roofDark);
        if (leg) leg.userData = { rooftopColliderId: 'roof_water_tank_supports' };
      }
    }
    const barrel = cylinder(group, wt.x, wt.baseY + 2.22, wt.z, 1.15, 1.12, 1.35, solid('#655449'), 10);
    if (barrel) barrel.userData = { rooftopColliderId: 'roof_water_tank_barrel' };
    const roofCap = cylinder(group, wt.x, wt.baseY + 2.98, wt.z, 1.22, 1.0, 0.25, roofDark, 10);
    if (roofCap) roofCap.userData = { rooftopColliderId: 'roof_water_tank_barrel' };
    for (let i = 0; i < 3; i++) {
      cylinder(group, wt.x, wt.baseY + 1.8 + i * 0.4, wt.z, 1.16, 1.16, 0.07, metal, 10);
    }
  }

  // 3. Chimneys
  for (const ch of layout.chimneys) {
    const shaft = box(group, ch.x, ch.baseY + ch.chimH * 0.5, ch.z, ch.shaftW, ch.chimH, ch.shaftD, solid('#676663'));
    if (shaft) {
      shaft.name = `${ch.id}_shaft`;
      shaft.userData = { rooftopColliderId: `${ch.id}_shaft` };
    }
    const cap = box(group, ch.x, ch.baseY + ch.chimH + 0.07, ch.z, ch.capW, ch.capH, ch.capD, roofDark);
    if (cap) {
      cap.name = `${ch.id}_cap`;
      cap.userData = { rooftopColliderId: `${ch.id}_cap` };
    }
  }

  // 4. HVAC units
  for (const unit of layout.hvacUnits) {
    const body = box(group, unit.x, unit.baseY + unit.h * 0.5, unit.z, unit.w, unit.h, unit.d, roof);
    if (body) {
      body.name = unit.id;
      body.userData = { rooftopColliderId: unit.id };
    }
    for (let j = 0; j < 3; j++) {
      box(group, unit.x + (j - 1) * (unit.w * 0.24), unit.baseY + unit.h * 0.5, unit.z + unit.d * 0.5 + 0.02, 0.08, 0.42, 0.04, roofDark);
    }
  }

  // 5. Exhaust vents
  for (const vent of layout.exhaustVents) {
    const lower = cylinder(group, vent.x, vent.baseY + 0.13, vent.z, vent.radius, vent.radius, 0.26, metal, 8);
    if (lower) {
      lower.name = vent.id;
      lower.userData = { rooftopColliderId: vent.id };
    }
    const upper = cylinder(group, vent.x, vent.baseY + 0.38, vent.z, 0.18, 0.18, 0.32, roofDark, 8);
    if (upper) upper.userData = { rooftopColliderId: vent.id };
  }

  // 6. Industrial ventilation fans
  for (const vf of layout.ventilationFans) {
    const base = box(group, vf.x, vf.baseY + 0.15, vf.z, 1.15, 0.3, 1.15, solid('#3e484f'));
    if (base) {
      base.name = vf.id;
      base.userData = { rooftopColliderId: vf.id };
    }
    const drum = cylinder(group, vf.x, vf.baseY + 0.6, vf.z, 0.44, 0.44, 0.6, solid('#606c74'), 12);
    if (drum) drum.userData = { rooftopColliderId: vf.id };
    const hood = cylinder(group, vf.x, vf.baseY + 0.98, vf.z, 0.54, 0.2, 0.22, solid('#2b3338'), 12);
    if (hood) hood.userData = { rooftopColliderId: vf.id };
    box(group, vf.x, vf.baseY + 0.6, vf.z, 0.92, 0.05, 0.92, solid('#1f262b'));
  }

  // 7. Roof access hatch
  if (layout.roofHatch) {
    const rh = layout.roofHatch;
    const curb = box(group, rh.x, rh.baseY + 0.18, rh.z, 1.05, 0.36, 1.05, solid('#475569'));
    if (curb) {
      curb.name = rh.id;
      curb.userData = { rooftopColliderId: rh.id };
    }
    const lid = box(group, rh.x, rh.baseY + 0.38, rh.z, 1.15, 0.06, 1.15, solid('#64748b'));
    if (lid) lid.userData = { rooftopColliderId: rh.id };
    cylinder(group, rh.x, rh.baseY + 0.38, rh.z - 0.55, 0.03, 0.03, 0.95, solid('#1e293b'), 8);
    box(group, rh.x, rh.baseY + 0.44, rh.z + 0.42, 0.22, 0.08, 0.05, solid('#e2b855'));
  }

  // 8. Decorative antenna, thin pipes, and cables (explicitly excluded from colliders)
  if (layout.antenna) {
    const ant = layout.antenna;
    line(group, [ant.x, ant.baseY, ant.z], [ant.x, ant.baseY + 3, ant.z], 0.055, roof);
    line(group, [ant.x - 0.8, ant.baseY + 2.15, ant.z], [ant.x + 0.8, ant.baseY + 2.15, ant.z], 0.045, metal);
    line(group, [ant.x - 0.43, ant.baseY + 2.55, ant.z], [ant.x + 0.43, ant.baseY + 2.55, ant.z], 0.045, metal);
  }

  if (cfg.rooftopPipes) {
    const mainSeg = layout.mainSeg;
    const cut = mainSeg.cornerCut || 0;
    const pipeY = layout.roofDeckY + 0.09;
    const minExtentX = mainSeg.x - mainSeg.w * 0.5 + 0.42;
    const maxExtentX = mainSeg.x + mainSeg.w * 0.5 - cut - 0.42;
    const backRunZ = mainSeg.z - mainSeg.d * 0.5 + 0.42;

    if (!layout.isPitched && maxExtentX > minExtentX) {
      line(group, [minExtentX, pipeY, backRunZ], [maxExtentX, pipeY, backRunZ], 0.055, pipeMat);
      line(group, [minExtentX, pipeY, backRunZ], [minExtentX, pipeY, mainSeg.z + mainSeg.d * 0.32], 0.05, pipeMat);
      if (cfg.parapet) {
        line(group, [minExtentX, pipeY, backRunZ], [minExtentX, layout.baseHeight + cfg.parapetHeight + 0.12, backRunZ], 0.05, pipeMat);
      }
      for (let i = 0; i < Math.min(3, layout.hvacPositions.length); i++) {
        const [hx, , hz] = layout.hvacPositions[i];
        line(group, [hx, pipeY, hz], [hx, pipeY, backRunZ], 0.04, metal);
      }
      const postA = [minExtentX + 0.15, layout.baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, mainSeg.z + mainSeg.d * 0.38];
      const postB = [maxExtentX - 0.15, layout.baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, backRunZ + 0.15];
      line(group, [postA[0], layout.roofDeckY, postA[2]], postA, 0.04, roofDark);
      line(group, [postB[0], layout.roofDeckY, postB[2]], postB, 0.04, roofDark);
      layout.cableAnchors.push(postA, postB);
    }

    for (let i = 0; i < layout.cableAnchors.length - 1; i++) {
      const sag = layout.cableSags[i] ?? 0.32;
      sagCable(group, layout.cableAnchors[i], layout.cableAnchors[i + 1], sag, 0.018, cableMat, 6);
    }

    if (layout.groundMain && !cfg.cutaway) {
      const mainH = cfg.setback > 0 ? Math.floor(cfg.floors * 0.6) * cfg.floorHeight : layout.baseHeight;
      const spoutX = layout.groundMain.x - layout.groundMain.w * 0.5 + 0.32;
      const spoutZ = layout.groundMain.z - layout.groundMain.d * 0.5 - 0.06;
      line(group, [spoutX, 0.1, spoutZ], [spoutX, mainH - 0.1, spoutZ], 0.048, pipeMat);
      const sideSpoutX = layout.groundMain.x - layout.groundMain.w * 0.5 - 0.06;
      const sideSpoutZ = layout.groundMain.z + layout.groundMain.d * 0.32;
      line(group, [sideSpoutX, 0.1, sideSpoutZ], [sideSpoutX, mainH - 0.1, sideSpoutZ], 0.045, pipeMat);
      box(group, sideSpoutX - 0.04, 1.35, sideSpoutZ - 0.45, 0.12, 0.42, 0.32, roofDark);
      line(group, [sideSpoutX, 1.56, sideSpoutZ - 0.45], [sideSpoutX, mainH * 0.65, sideSpoutZ - 0.45], 0.025, metal);
    }
  }

  return layout;
}


function addTallSlopedRail(parent, p1, p2, thickness, mat) {
  line(parent, p1, p2, thickness, mat);
}

function addTallBracket(parent, xPos, yDeckTop, deckT, zWalkMin, zWalkMax, mat, heavy = false) {
  const beamH = heavy ? 0.11 : 0.085;
  const beamW = heavy ? 0.08 : 0.065;
  const beamY = yDeckTop - deckT - beamH * 0.5;
  const beamSpan = zWalkMax + 0.08;
  box(parent, xPos, beamY, beamSpan * 0.5 - 0.01, beamW, beamH, beamSpan + 0.02, mat);
  // Wall mounting plate anchored cleanly at facade surface (z=0.015)
  box(parent, xPos, beamY - 0.16, 0.015, 0.16, 0.42, 0.03, mat);
  // 45-degree diagonal knee brace from lower wall plate to outer underside of cantilever beam
  line(
    parent,
    [xPos, beamY - 0.52, 0.02],
    [xPos, beamY - beamH * 0.3, zWalkMax - 0.10],
    heavy ? 0.048 : 0.036,
    mat
  );
  // Standoff tie strut at inner stringer line
  line(
    parent,
    [xPos, beamY - 0.24, 0.02],
    [xPos, beamY - beamH * 0.3, zWalkMin + 0.08],
    0.03,
    mat
  );
}

function addTallStringerBeam(parent, xStart, yLower, xEnd, yUpper, zPos, mat, height = 0.19, thick = 0.052) {
  const dx = xEnd - xStart;
  const dy = yUpper - yLower;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const beamGroup = worldRoot(parent, (xStart + xEnd) * 0.5, (yLower + yUpper) * 0.5 - height * 0.38, zPos);
  beamGroup.rotation.z = angle;
  box(beamGroup, 0, 0, 0, len + 0.12, height, thick, mat);
}

function addTallLandingDoorway(parent, door, yTop, zWalkMin, deckT, cfg, steel, trimMat) {
  const dw = door.width;
  const dh = door.height;
  // Steel threshold apron bridging wall gap cleanly at landing surface elevation
  box(parent, door.localX, yTop - deckT * 0.5, zWalkMin * 0.5, dw + 0.16, deckT, zWalkMin + 0.04, steel);

  // Masonry/steel doorway trim and recessed door panel mounted on facade (z = 0.01..0.09)
  const jambW = 0.09;
  const jambD = 0.085;
  box(parent, door.localX - dw * 0.5 - jambW * 0.5, yTop + dh * 0.5, jambD * 0.5, jambW, dh + 0.08, jambD, trimMat);
  box(parent, door.localX + dw * 0.5 + jambW * 0.5, yTop + dh * 0.5, jambD * 0.5, jambW, dh + 0.08, jambD, trimMat);
  box(parent, door.localX, yTop + dh + 0.055, jambD * 0.5 + 0.01, dw + jambW * 2 + 0.10, 0.11, jambD + 0.02, trimMat);
  // Sill threshold plate
  box(parent, door.localX, yTop + 0.02, 0.05, dw + 0.14, 0.04, 0.10, steel);
  // Steel service door leaf
  box(parent, door.localX, yTop + dh * 0.5, 0.028, dw, dh, 0.045, solid('#252d33'));
  // Upper wire-glass door lite
  box(parent, door.localX, yTop + dh * 0.74, 0.054, dw * 0.42, dh * 0.24, 0.016, solid('#516673'));
  // Crash push bar
  box(parent, door.localX, yTop + 1.02, 0.068, dw * 0.72, 0.05, 0.04, solid('#b8c1c8'));
}

function addTallGuardRailSpan(parent, x1, x2, yBase, zPos, railH, mat, heavy = false) {
  const len = Math.abs(x2 - x1);
  if (len < 0.08) return;
  const cx = (x1 + x2) * 0.5;
  const barT = heavy ? 0.052 : 0.04;
  box(parent, cx, yBase + railH, zPos, len + barT * 0.5, barT, barT, mat);
  box(parent, cx, yBase + railH * 0.5, zPos, len, barT * 0.8, barT * 0.8, mat);
  if (heavy) {
    box(parent, cx, yBase + 0.07, zPos, len, 0.12, 0.025, mat);
  }
  const posts = Math.max(2, Math.round(len / 0.75) + 1);
  for (let p = 0; p < posts; p++) {
    const px = x1 + (p / (posts - 1)) * (x2 - x1);
    box(parent, px, yBase + railH * 0.5, zPos, barT, railH, barT, mat);
  }
}

function addTallStaircaseGeometry(parent, groundSegments, cfg, conventionalPlacement = null) {
  const layout = computeTallStaircaseLayout(groundSegments, cfg, conventionalPlacement);
  if (!layout || !layout.feasible) return null;

  const isIndustrial = layout.railingMode === 'industrial';
  const isOpenInner = layout.railingMode === 'open_inner';
  const heavy = isIndustrial;

  const steel = solid(isIndustrial ? '#353e44' : '#3d474d');
  const stringerMat = solid('#293136');
  const deckMat = solid('#2c353b');
  const treadMat = solid('#323b42');
  const plinthMat = solid('#9a968c');
  const trimMat = solid(cfg.trimColor || '#d6c9ad');

  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  const tallGroup = worldRoot(parent, layout.anchor.x, 0, layout.anchor.z);
  tallGroup.rotation.y = rotMap[layout.side] || 0;
  tallGroup.name = 'SecondaryTallStaircase';

  const {
    stairWidth,
    zWalkMin,
    zWalkMax,
    zPathCenter,
    zRailInner,
    zRailOuter,
    railHeight,
    deckThickness
  } = layout.dimensions;

  // 1. Street-level concrete approach plinth when starting at ground level
  if (layout.groundPlinth) {
    const gp = layout.groundPlinth.local;
    box(tallGroup, gp.x, -0.025, gp.zCenter, gp.length, 0.15, gp.depth + 0.16, plinthMat);
    // Ground anchor posts at entry mouth
    for (const pz of [zRailInner, zRailOuter]) {
      box(tallGroup, gp.xMin + 0.06, railHeight * 0.5, pz, 0.055, railHeight, 0.055, steel);
    }
    if (isIndustrial) {
      box(tallGroup, gp.x + 0.04, railHeight, zRailOuter, gp.length, 0.05, 0.05, steel);
    }
  }

  // 2. Elevated landings + structural wall brackets + doorway thresholds
  const doorByFloor = new Map();
  for (const d of layout.doorways) {
    doorByFloor.set(d.floor, d);
  }

  const maxLandingFloor = layout.landings.length ? layout.landings[layout.landings.length - 1].floor : 1;

  for (const landing of layout.landings) {
    const loc = landing.local;
    const deck = box(tallGroup, loc.x, loc.yCenter, loc.zCenter, loc.length, deckThickness, loc.depth, deckMat);
    if (deck) {
      deck.name = landing.id;
      deck.userData = { componentId: landing.id, type: 'landing', floor: landing.floor, tallStaircase: true };
    }

    // Steel rim channel framing outer and inner deck edges
    box(tallGroup, loc.x, loc.yCenter, zWalkMax + 0.025, loc.length, deckThickness + 0.02, 0.05, stringerMat);
    box(tallGroup, loc.x, loc.yCenter, zWalkMin - 0.025, loc.length, deckThickness + 0.02, 0.05, stringerMat);

    // Wall brackets bolted cleanly at both landing ends
    addTallBracket(tallGroup, loc.xMin + 0.14, loc.yTop, deckThickness, zWalkMin, zWalkMax, steel, heavy);
    addTallBracket(tallGroup, loc.xMax - 0.14, loc.yTop, deckThickness, zWalkMin, zWalkMax, steel, heavy);

    // Aligned doorway & apron bridge behind landing
    const door = doorByFloor.get(landing.floor);
    if (door) {
      addTallLandingDoorway(tallGroup, door, loc.yTop, zWalkMin, deckThickness, cfg, steel, trimMat);
    }

    // Outer landing guardrail
    addTallGuardRailSpan(tallGroup, loc.xMin, loc.xMax, loc.yTop, zRailOuter, railHeight, steel, heavy);

    // Inner landing guardrail flanking the doorway portal opening (except open_inner mode)
    if (!isOpenInner && door) {
      const portalHalf = door.width * 0.5 + 0.04;
      const pLeftEnd = door.localX - portalHalf;
      const pRightStart = door.localX + portalHalf;
      if (pLeftEnd - loc.xMin > 0.10) {
        addTallGuardRailSpan(tallGroup, loc.xMin, pLeftEnd, loc.yTop, zRailInner, railHeight, steel, heavy);
      }
      if (loc.xMax - pRightStart > 0.10) {
        addTallGuardRailSpan(tallGroup, pRightStart, loc.xMax, loc.yTop, zRailInner, railHeight, steel, heavy);
      }
    }

    // End guardrails on first elevated landing (if drop ladder) or topmost landing
    if (landing.floor === 1 && layout.dropLadder) {
      const dl = layout.dropLadder.local;
      // Outer ladder opening handled cleanly by keeping xMin closed and drop opening at end if needed;
      // enclose left end of elevated F1 landing
      box(tallGroup, loc.xMin, loc.yTop + railHeight * 0.5, zPathCenter, 0.05, 0.05, stairWidth + 0.06, steel);
      box(tallGroup, loc.xMin, loc.yTop + railHeight, zPathCenter, 0.05, 0.05, stairWidth + 0.06, steel);
    }
    if (landing.floor === maxLandingFloor) {
      box(tallGroup, loc.xMax, loc.yTop + railHeight, zPathCenter, 0.05, 0.05, stairWidth + 0.08, steel);
      box(tallGroup, loc.xMax, loc.yTop + railHeight * 0.5, zPathCenter, 0.04, 0.04, stairWidth + 0.08, steel);
      box(tallGroup, loc.xMax, loc.yTop + railHeight * 0.5, zPathCenter, 0.045, railHeight, 0.045, steel);
    }
  }

  // 3. Continuous 1-unit stair flights + inclined steel stringers + handrails
  for (const flight of layout.flights) {
    const { xStart, xEnd, yLower, yUpper } = flight.local;
    const midX = (xStart + xEnd) * 0.5;

    // Inclined steel C-channel stringers on both sides of stair treads
    addTallStringerBeam(tallGroup, xStart, yLower, xEnd, yUpper, zWalkMin - 0.026, stringerMat, heavy ? 0.21 : 0.18, 0.052);
    addTallStringerBeam(tallGroup, xStart, yLower, xEnd, yUpper, zWalkMax + 0.026, stringerMat, heavy ? 0.21 : 0.18, 0.052);

    // Mid-span wall cantilever brace supporting long flight stringers
    addTallBracket(tallGroup, midX, (yLower + yUpper) * 0.5, 0.10, zWalkMin, zWalkMax, steel, heavy);

    // Solid 1-unit stair treads
    for (const tread of flight.treads) {
      const tl = tread.local;
      const mesh = box(tallGroup, tl.x, tl.y, tl.z, tl.stepRun, tl.stepRise, stairWidth, treadMat);
      if (mesh) {
        mesh.name = tread.id;
        mesh.userData = { treadId: tread.id, floor: flight.floor, tallStaircase: true };
      }
    }

    // Sloped outer and inner flight handrails
    const railsZ = isOpenInner ? [zRailOuter] : [zRailOuter, zRailInner];
    for (const rz of railsZ) {
      addTallSlopedRail(tallGroup, [xStart, yLower + railHeight, rz], [xEnd, yUpper + railHeight, rz], heavy ? 0.046 : 0.038, steel);
      addTallSlopedRail(tallGroup, [xStart, yLower + railHeight * 0.5, rz], [xEnd, yUpper + railHeight * 0.5, rz], heavy ? 0.032 : 0.026, steel);
      for (let p = 0; p <= 4; p++) {
        const t = p / 4;
        const px = xStart + (xEnd - xStart) * t;
        const py = yLower + (yUpper - yLower) * t;
        box(tallGroup, px, py + railHeight * 0.5, rz, 0.042, railHeight, 0.042, steel);
      }
    }
    if (isOpenInner) {
      // Wall-mounted single grabrail at hand height even in open_inner mode
      addTallSlopedRail(tallGroup, [xStart, yLower + 0.92, zWalkMin + 0.02], [xEnd, yUpper + 0.92, zWalkMin + 0.02], 0.032, steel);
    }
  }

  // 4. Optional elevated F1 drop ladder
  if (layout.dropLadder) {
    const dl = layout.dropLadder.local;
    for (const lx of [dl.x - dl.width * 0.5, dl.x + dl.width * 0.5]) {
      box(tallGroup, lx, (dl.minY + dl.maxY) * 0.5, dl.z, 0.04, dl.maxY - dl.minY, 0.04, steel);
    }
    const rungs = Math.max(4, Math.floor((dl.maxY - dl.minY) / 0.28));
    for (let r = 1; r <= rungs; r++) {
      const ry = dl.minY + (r / (rungs + 0.35)) * (dl.maxY - dl.minY);
      box(tallGroup, dl.x, ry, dl.z, dl.width - 0.04, 0.032, 0.032, steel);
    }
  }

  // 5. Optional rooftop parapet gooseneck ladder aligned to Fk landing
  if (layout.roofLadder) {
    const rl = layout.roofLadder.local;
    const wallRailZ = rl.z;
    for (const rx of [rl.x - rl.width * 0.5, rl.x + rl.width * 0.5]) {
      box(tallGroup, rx, (rl.minY + rl.maxY) * 0.5, wallRailZ, 0.045, rl.maxY - rl.minY, 0.045, steel);
      line(tallGroup, [rx, rl.maxY, wallRailZ], [rx, rl.maxY + 0.28, wallRailZ - 0.18], 0.026, steel);
      line(tallGroup, [rx, rl.maxY + 0.28, wallRailZ - 0.18], [rx, rl.roofDeckTop, -0.58], 0.026, steel);
    }
    const rungCount = Math.max(4, Math.floor((rl.maxY - rl.minY) / 0.28));
    for (let r = 1; r <= rungCount; r++) {
      const ry = rl.minY + (r / (rungCount + 0.35)) * (rl.maxY - rl.minY);
      box(tallGroup, rl.x, ry, wallRailZ, rl.width - 0.06, 0.035, 0.035, steel);
    }
  }

  return tallGroup;
}


function createBuilding(rawCfg, options = {}) {
  const cfg = sanitisePreset(rawCfg);
  const root = new THREE.Group();
  root.name = 'B Building ' + getStyle(cfg.style).label;
  const r = rng32((cfg.seed + (options.seedOffset || 0) * 9119) >>> 0);
  const count = cfg.floors;
  const fh = cfg.floorHeight;
  const cutaway = !!cfg.cutaway;
  const selectedFloor = clamp(cfg.inspectedFloor || 0, 0, count);
  const visibleFloors = selectedFloor > 0 ? selectedFloor : count;
  const roofOn = !cutaway && selectedFloor === 0;

  const groundSegments = segmentsForFloor(cfg, 0);
  const primary = groundSegments[0];
  const firePlacement = chooseFireEscapePlacement(groundSegments, cfg, rng32(cfg.seed + 313));
  const tallLayout = cfg.tallStaircase
    ? computeTallStaircaseLayout(groundSegments, cfg, firePlacement)
    : null;

  for (let floor = 0; floor < visibleFloors; floor++) {
    const segments = segmentsForFloor(cfg, floor);
    const nextSegments = floor < visibleFloors - 1 ? segmentsForFloor(cfg, floor + 1) : null;
    const hasFireExtOnFloor = firePlacement && firePlacement.extIndex >= 0
      && segments.some((s) => s.isExtension && s.extIndex === firePlacement.extIndex);

    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const isFireTarget = firePlacement && (
        hasFireExtOnFloor
          ? (seg.isExtension && seg.extIndex === firePlacement.extIndex)
          : (j === 0)
      );
      const segFire = isFireTarget ? firePlacement : null;
      const segTall = j === 0 ? tallLayout : null;
      for (const side of ['front', 'back', 'left', 'right']) {
        wallForSide(root, seg, floor, side, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17, segFire, segTall);
      }
      addCornerChamfer(root, seg, floor, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17);
      addInteriors(root, seg, floor, cfg);

      if (floor === 0) {
        slabBox(root, seg, -0.08 - j * 0.002, 0.15, 0.01, solid('#716f67'));
      }
      if (floor === visibleFloors - 1 && selectedFloor === 0 && cfg.interiorMode !== 'none') {
        slabBox(root, seg, (floor + 1) * fh - 0.08 - j * 0.002, 0.12, cfg.wallThickness * 0.8, solid('#817b6d'));
      }

      if (nextSegments && !cutaway) {
        if (seg.isExtension) {
          const hasAbove = nextSegments.some((ns) => ns.isExtension && ns.extIndex === seg.extIndex);
          if (!hasAbove) {
            const roofSeg = segFire
              ? {
                  ...seg,
                  occlusions: {
                    ...seg.occlusions,
                    [segFire.side]: [
                      ...(seg.occlusions?.[segFire.side] || []),
                      [segFire.coord - segFire.deckW * 0.54, segFire.coord + segFire.deckW * 0.54]
                    ]
                  }
                }
              : seg;
            addRoof(root, roofSeg, (floor + 1) * fh, { ...cfg, roofType: 'flat', skylights: false, parapetHeight: Math.min(0.32, cfg.parapetHeight) }, r, j + 1);
          }
        } else if (nextSegments[j] && (nextSegments[j].w < seg.w - 0.05 || nextSegments[j].d < seg.d - 0.05)) {
          addSetbackTerrace(root, seg, nextSegments[j], (floor + 1) * fh, cfg, r, j, j === 0 ? firePlacement : segFire);
        }
      }
    }
  }

  if (!cutaway) {
    addEntrance(root, primary, cfg, r);
    addAdditionalEntrances(root, groundSegments, cfg);
    addGraffiti(root, groundSegments, cfg);
  }
  if (firePlacement) {
    if (cfg.fireEscapeClearance === 'straight_run') {
      addStraightRunFireEscapeGeometry(root, groundSegments, firePlacement, cfg);
    } else {
      addFireEscape(root, primary, firePlacement, cfg);
    }
  }
  if (tallLayout && tallLayout.feasible) {
    addTallStaircaseGeometry(root, groundSegments, cfg, firePlacement);
  }

  if (roofOn) {
    const topSegments = segmentsForFloor(cfg, count - 1).filter((s) => !s.isExtension);
    for (let j = 0; j < topSegments.length; j++) {
      addRoof(root, topSegments[j], count * fh, cfg, r, j);
    }
    if (cfg.fireEscapeClearance === 'straight_run' || cfg.rooftopCollision) {
      addDeterministicRooftopGeometry(root, topSegments, primary, cfg);
    } else {
      addRooftopProps(root, topSegments, primary, cfg, r, count * fh);
      addRooftopHeadhouse(root, topSegments, cfg, count * fh);
      addVentilationFans(root, topSegments, cfg, r, count * fh);
      addRoofAccessHatch(root, topSegments, cfg, r, count * fh);
    }
    addRooftopWalkways(root, topSegments, cfg, count * fh);
    addSafetyRailings(root, topSegments, cfg, count * fh);
  }

  if (!cutaway) {
    const setbackFloor = Math.floor(count * 0.6);
    const mainH = cfg.setback > 0 && setbackFloor > 0 ? setbackFloor * fh : count * fh;
    for (const seg of groundSegments.filter((s) => !s.isExtension)) {
      addVerticalDetails(root, seg, mainH, cfg);
      addVines(root, seg, mainH, cfg, r);
    }
  }

  const blueprint = generateBuildingBlueprint(cfg, { name: options.name });
  root.userData = {
    preset: cfg.style,
    seed: cfg.seed,
    floors: cfg.floors,
    settings: copy(cfg),
    blueprint,
    entrances: blueprint.entrances
  };
  return root;
}


function createDebugLabelSprite(title, subtitle, borderHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(7, 19, 30, 0.92)';
    ctx.fillRect(6, 6, 500, 128);
    ctx.lineWidth = 5;
    ctx.strokeStyle = borderHex;
    ctx.strokeRect(6, 6, 500, 128);
    ctx.fillStyle = '#e9fbff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(title).slice(0, 32), 256, 48);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(subtitle || '').slice(0, 36), 256, 92);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.6, 0.98, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function getEntranceCategoryColor(category, role) {
  if (role === 'main') return '#00f5d4'; // Primary entrance (cyan)
  if (category === 'secondary' || role === 'corner_secondary' || String(role).startsWith('side_')) return '#3a86ff'; // Secondary entrance (blue)
  if (category === 'service' || role === 'rear_service' || role === 'basement_access' || role === 'delivery_entrance') return '#ffbe0b'; // Service entrance (amber)
  if (category === 'roof_access' || role === 'roof_access') return '#9d4edd'; // Rooftop access (purple)
  if (category === 'mission') return '#ff006e'; // Mission entrance (magenta)
  if (category === 'decorative') return '#94a3b8'; // Decorative (slate)
  return '#00f5d4';
}

function buildEntranceDebugGizmos(parent, blueprint, view = {}) {
  if (!blueprint || !Array.isArray(blueprint.entrances)) return;

  const showVolumes = view.showEntranceVolumes !== false;
  const showDirections = view.showEntranceDirections !== false;
  const showLabels = view.showEntranceLabels !== false;
  const showApproach = view.showEntranceApproach !== false;

  for (const ent of blueprint.entrances) {
    const gizmoRoot = worldRoot(parent);
    gizmoRoot.name = 'EntranceDebug_' + ent.id;

    const isInteractive = Boolean(ent.interactive);
    const isLocked = Boolean(ent.lockedByDefault);
    const categoryColor = getEntranceCategoryColor(ent.category, ent.role);
    const primaryHex = !isInteractive ? '#94a3b8' : (isLocked ? '#fb5607' : categoryColor);
    const anchorHex = '#ff006e';
    const normalHex = '#00bbf9';
    const approachHex = '#38b000';
    const safeHex = '#80ed99';

    // Trigger box
    if (showVolumes) {
      const trig = ent.trigger;
      const trigGroup = worldRoot(gizmoRoot, trig.localCenter.x, trig.localCenter.y, trig.localCenter.z);
      trigGroup.rotation.y = ent.door.rotation.y;

      const boxGeo = new THREE.BoxGeometry(trig.width, trig.height, trig.depth);
      const boxMat = new THREE.MeshBasicMaterial({
        color: primaryHex,
        transparent: true,
        opacity: isInteractive ? 0.22 : 0.10,
        depthWrite: false
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.renderOrder = 990;
      trigGroup.add(boxMesh);

      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: primaryHex,
        transparent: true,
        opacity: 0.95
      });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesMesh.renderOrder = 991;
      trigGroup.add(edgesMesh);
    }

    // Entrance anchor
    const anchorPos = ent.door.position;
    const anchorMat = new THREE.MeshBasicMaterial({ color: anchorHex });
    const anchorMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), anchorMat);
    anchorMarker.position.set(anchorPos.x, anchorPos.y + 0.22, anchorPos.z);
    gizmoRoot.add(anchorMarker);

    const anchorRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.85 })
    );
    anchorRing.position.set(anchorPos.x, anchorPos.y + 0.025, anchorPos.z);
    gizmoRoot.add(anchorRing);

    // Normal arrow
    if (showDirections) {
      const arrowLen = 1.45;
      const arrowY = anchorPos.y + 0.45;
      const arrowGroup = worldRoot(gizmoRoot, anchorPos.x, arrowY, anchorPos.z);
      arrowGroup.rotation.y = ent.door.rotation.y;
      const arrowMat = new THREE.MeshBasicMaterial({ color: normalHex });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, arrowLen, 10), arrowMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 0, arrowLen * 0.5);
      arrowGroup.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 12), arrowMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0, arrowLen + 0.15);
      arrowGroup.add(head);
    }

    // Approach and safe position markers
    const appPos = ent.navigation.approachPosition;
    const nx = ent.door.normal.x;
    const nz = ent.door.normal.z;

    if (showApproach) {
      const appMat = new THREE.MeshBasicMaterial({ color: approachHex });
      const appDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 18), appMat);
      appDisc.position.set(appPos.x, appPos.y + 0.025, appPos.z);
      gizmoRoot.add(appDisc);
      const appBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8), appMat);
      appBeacon.position.set(appPos.x, appPos.y + 0.5, appPos.z);
      gizmoRoot.add(appBeacon);
      const appCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), appMat);
      appCap.position.set(appPos.x, appPos.y + 1.05, appPos.z);
      gizmoRoot.add(appCap);

      const safePos = ent.navigation.safePosition;
      const safeMat = new THREE.MeshBasicMaterial({ color: safeHex, transparent: true, opacity: 0.75 });
      const safeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 16), safeMat);
      safeDisc.position.set(safePos.x, safePos.y + 0.02, safePos.z);
      gizmoRoot.add(safeDisc);

      const linkMat = new THREE.MeshBasicMaterial({ color: normalHex, transparent: true, opacity: 0.55 });
      line(
        gizmoRoot,
        [anchorPos.x + nx * 0.1, anchorPos.y + 0.05, anchorPos.z + nz * 0.1],
        [appPos.x, appPos.y + 0.05, appPos.z],
        0.025,
        linkMat
      );
    }

    // Entrance label
    if (showLabels) {
      const statusTag = !isInteractive
        ? 'DECORATIVE'
        : isLocked
          ? `${(ent.category || '').toUpperCase()} • LOCKED`
          : (ent.category || '').toUpperCase();
      const elev = Number(ent.thresholdElevation ?? ent.door?.thresholdElevation ?? 0).toFixed(1);
      const title = `${ent.id} [${statusTag}]`;
      const subtitle = `${ent.width}x${ent.height}m • Y: ${elev}m • ${ent.facade || ent.door?.facade || 'front'}`;
      const sprite = createDebugLabelSprite(title, subtitle, primaryHex);
      sprite.position.set(
        anchorPos.x + nx * 0.35,
        anchorPos.y + ent.door.height + 0.95,
        anchorPos.z + nz * 0.35
      );
      gizmoRoot.add(sprite);
    }
  }
}

function buildFireEscapeDebugGizmos(parent, blueprint, view = {}) {
  const feMeta = blueprint?.metadata?.fireEscape;
  if (!feMeta || !Array.isArray(feMeta.components)) return;

  const showLandings = view.showFireEscapeLandings !== false;
  const showTreads = view.showFireEscapeTreads !== false;
  const showStairs = view.showFireEscapeStairs !== false;
  const showRailings = view.showFireEscapeRailings !== false;
  const showLadders = view.showFireEscapeLadders !== false;
  const showClearance = view.showFireEscapeClearance !== false;
  const showRoute = view.showFireEscapeRoute !== false;

  const root = worldRoot(parent);
  root.name = 'FireEscapeDebugGizmos';

  // Usable player-clearance envelopes (Requirement 10)
  if (showClearance && Array.isArray(feMeta.clearanceVolumes)) {
    for (const cv of feMeta.clearanceVolumes) {
      if (cv.type === 'landing_clearance' && cv.position && cv.dimensions) {
        const boxGeo = new THREE.BoxGeometry(cv.dimensions.width, cv.dimensions.height, cv.dimensions.depth);
        const boxMat = new THREE.MeshBasicMaterial({
          color: '#06b6d4',
          transparent: true,
          opacity: 0.12,
          depthWrite: false
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(cv.position.x, cv.position.y, cv.position.z);
        boxMesh.renderOrder = 990;
        root.add(boxMesh);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeo),
          new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.45 })
        );
        edges.position.copy(boxMesh.position);
        edges.renderOrder = 991;
        root.add(edges);
      } else if (cv.type === 'flight_clearance' && cv.startPosition && cv.endPosition) {
        const p1 = [cv.startPosition.x, cv.startPosition.y, cv.startPosition.z];
        const p2 = [cv.endPosition.x, cv.endPosition.y, cv.endPosition.z];
        const flightMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.25, depthWrite: false });
        line(root, [p1[0], p1[1] + 1.025, p1[2]], [p2[0], p2[1] + 1.025, p2[2]], cv.clearanceWidth || 0.64, flightMat);
      } else if (cv.type === 'ladder_clearance' && cv.startPosition && cv.endPosition) {
        const lh = Math.abs(cv.endPosition.y - cv.startPosition.y);
        const midY = (cv.startPosition.y + cv.endPosition.y) * 0.5;
        const rad = cv.clearanceRadius || 0.35;
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(rad, rad, lh, 16),
          new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.18, depthWrite: false })
        );
        cyl.position.set(cv.startPosition.x, midY, cv.startPosition.z);
        cyl.renderOrder = 990;
        root.add(cyl);
      }
    }
  }

  // Connected walking route line from street to rooftop (Requirement 10)
  if (showRoute && Array.isArray(feMeta.walkableRoutes)) {
    for (const rDef of feMeta.walkableRoutes) {
      const wps = rDef.waypoints || [];
      if (wps.length >= 2) {
        const isConn = rDef.connected !== false;
        const routeColor = isConn ? '#10b981' : '#f59e0b';
        const routeMat = new THREE.MeshBasicMaterial({ color: routeColor, transparent: true, opacity: 0.95 });

        for (let w = 0; w < wps.length - 1; w++) {
          const ptA = wps[w].position;
          const ptB = wps[w + 1].position;
          line(root, [ptA.x, ptA.y + 0.15, ptA.z], [ptB.x, ptB.y + 0.15, ptB.z], 0.045, routeMat);

          const beaconGeo = new THREE.SphereGeometry(0.09, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: '#6ee7b7' });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(ptA.x, ptA.y + 0.15, ptA.z);
          beacon.renderOrder = 996;
          root.add(beacon);
        }
        const lastPt = wps[wps.length - 1].position;
        const lastBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: '#34d399' }));
        lastBeacon.position.set(lastPt.x, lastPt.y + 0.15, lastPt.z);
        lastBeacon.renderOrder = 996;
        root.add(lastBeacon);
      }
    }
  }

  // Traversal status / warnings billboard (Requirement 11)
  if (view.showEntranceLabels !== false) {
    const topFloor = (blueprint?.settings?.floors || 5) - 1;
    const floorH = Number(blueprint?.settings?.floorHeight) || 3.3;
    const topY = topFloor * floorH;
    const topComp = feMeta.components.find((c) => c.floor === topFloor && c.type === 'landing');
    const labelX = topComp?.position?.x ?? 0;
    const labelZ = topComp?.position?.z ?? 0;

    if (Array.isArray(feMeta.warnings) && feMeta.warnings.length > 0) {
      const warnSprite = createDebugLabelSprite('Clearance Alert', feMeta.warnings[0], '#ef4444');
      warnSprite.position.set(labelX, topY + 2.2, labelZ);
      root.add(warnSprite);
    } else {
      const statusSprite = createDebugLabelSprite('Traversal Verified', 'Street to Rooftop Connected', '#10b981');
      statusSprite.position.set(labelX, topY + 2.2, labelZ);
      root.add(statusSprite);
    }
  }

  for (const comp of feMeta.components) {
    if (comp.traversal === 'walkable_surface' && showLandings) {
      const dims = comp.dimensions || { width: 1.5, length: 1.1, thickness: 0.08 };
      const deckGeo = new THREE.BoxGeometry(dims.width, 0.06, dims.length || dims.depth || 1.15);
      const deckMat = new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set(comp.position.x, comp.position.y + 0.03, comp.position.z);
      deckMesh.renderOrder = 992;
      root.add(deckMesh);

      const edgesGeo = new THREE.EdgesGeometry(deckGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: '#34d399', transparent: true, opacity: 0.95 });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesMesh.position.copy(deckMesh.position);
      edgesMesh.renderOrder = 993;
      root.add(edgesMesh);

      if (view.showEntranceLabels !== false) {
        const sprite = createDebugLabelSprite(`Landing F${comp.floor}`, `${comp.position.y.toFixed(1)}m elevation`, '#10b981');
        sprite.position.set(comp.position.x, comp.position.y + 0.55, comp.position.z);
        root.add(sprite);
      }
    } else if (comp.traversal === 'stair_tread' && showTreads) {
      const dims = comp.dimensions || { width: 0.36, height: 0.045, depth: 0.24 };
      const treadGeo = new THREE.BoxGeometry(dims.width, Math.max(0.04, dims.height), dims.depth);
      const treadMat = new THREE.MeshBasicMaterial({
        color: '#22c55e',
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      const treadMesh = new THREE.Mesh(treadGeo, treadMat);
      treadMesh.position.set(comp.position.x, comp.position.y, comp.position.z);
      treadMesh.renderOrder = 994;
      root.add(treadMesh);

      const treadEdgesGeo = new THREE.EdgesGeometry(treadGeo);
      const treadEdgesMat = new THREE.LineBasicMaterial({ color: '#86efac', transparent: true, opacity: 0.95 });
      const treadEdges = new THREE.LineSegments(treadEdgesGeo, treadEdgesMat);
      treadEdges.position.copy(treadMesh.position);
      treadEdges.renderOrder = 995;
      root.add(treadEdges);
    } else if ((comp.traversal === 'stair_flight' || comp.traversal === 'stair_ramp') && showStairs) {
      if (comp.startPosition && comp.endPosition) {
        const p1 = [comp.startPosition.x, comp.startPosition.y, comp.startPosition.z];
        const p2 = [comp.endPosition.x, comp.endPosition.y, comp.endPosition.z];
        const stairMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.85 });
        line(root, p1, p2, 0.08, stairMat);

        const mid = [
          (p1[0] + p2[0]) * 0.5,
          (p1[1] + p2[1]) * 0.5,
          (p1[2] + p2[2]) * 0.5
        ];
        const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), stairMat);
        beacon.position.set(mid[0], mid[1] + 0.15, mid[2]);
        root.add(beacon);
      } else if (comp.position && comp.dimensions) {
        const rampMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.35, depthWrite: false });
        const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(comp.dimensions.width, comp.dimensions.height, comp.dimensions.depth), rampMat);
        rampMesh.position.set(comp.position.x, comp.position.y, comp.position.z);
        rampMesh.renderOrder = 992;
        root.add(rampMesh);
      }
    } else if (comp.traversal === 'railing_barrier' && showRailings) {
      const dims = comp.dimensions || { length: 1.2, height: 1.0 };
      const railMat = new THREE.MeshBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.22, depthWrite: false });
      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(dims.length, dims.height, 0.05), railMat);
      railMesh.position.set(comp.position.x, comp.position.y + dims.height * 0.5, comp.position.z);
      railMesh.renderOrder = 991;
      root.add(railMesh);
    } else if (comp.traversal === 'climbable_ladder' && showLadders) {
      const startY = comp.startPosition.y;
      const endY = comp.endPosition.y;
      const lh = Math.abs(endY - startY);
      const midY = (startY + endY) * 0.5;
      const ladderColor = comp.isRoofAccess ? '#8b5cf6' : '#d946ef';

      const ladderMat = new THREE.MeshBasicMaterial({ color: ladderColor, transparent: true, opacity: 0.45, depthWrite: false });
      const ladderCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, lh, 12), ladderMat);
      ladderCyl.position.set(comp.startPosition.x, midY, comp.startPosition.z);
      ladderCyl.renderOrder = 992;
      root.add(ladderCyl);

      const ringMat = new THREE.MeshBasicMaterial({ color: ladderColor });
      for (const y of [startY, endY]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), ringMat);
        ring.position.set(comp.startPosition.x, y, comp.startPosition.z);
        root.add(ring);
      }

      if (view.showEntranceLabels !== false) {
        const tag = comp.isRoofAccess ? 'Roof Access Ladder' : `Drop Ladder [${comp.state.toUpperCase()}]`;
        const sprite = createDebugLabelSprite(tag, `${lh.toFixed(1)}m vertical climb`, ladderColor);
        sprite.position.set(comp.startPosition.x, endY + 0.45, comp.startPosition.z);
        root.add(sprite);
      }
    }
  }
}

function buildPlayerScaleReference(parent, blueprint, view = {}) {
  const spots = computePlayerReferenceSpots(blueprint);
  if (!spots.length) return null;
  const requested = view.playerRefSpot || 'front_door';
  const spot = spots.find((s) => s.id === requested) || spots[0];

  const root = worldRoot(parent, spot.position.x, spot.position.y, spot.position.z);
  root.name = 'PlayerScaleReference';
  root.rotation.y = spot.yawRadians || 0;

  const skin = solid('#d8b193');
  const shirt = solid('#1f5a6e');
  const pants = solid('#242c38');
  const boots = solid('#1c1e22');
  const visor = solid('#0ea5e9');

  // Low-poly 1.82m human figure centered at feet (y = 0)
  for (const sx of [-0.10, 0.10]) {
    box(root, sx, 0.05, 0.03, 0.11, 0.10, 0.22, boots);
    box(root, sx, 0.29, 0.0, 0.10, 0.38, 0.11, pants);
    box(root, sx, 0.68, 0.0, 0.12, 0.40, 0.13, pants);
  }
  box(root, 0, 0.91, 0, 0.34, 0.06, 0.20, boots);
  box(root, 0, 1.19, 0, 0.40, 0.50, 0.22, shirt);
  for (const sx of [-0.26, 0.26]) {
    box(root, sx, 1.38, 0, 0.12, 0.13, 0.14, shirt);
    box(root, sx, 1.13, 0.01, 0.10, 0.38, 0.10, skin);
  }
  box(root, 0, 1.48, 0, 0.11, 0.08, 0.11, skin);
  box(root, 0, 1.67, 0, 0.21, 0.28, 0.22, skin);
  box(root, 0, 1.69, 0.105, 0.15, 0.06, 0.03, visor);

  // Subtle 0.60m capsule footprint ring + 2.05m headroom halo (debug-only, unexported)
  const capMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  });
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 2.05, 16, 1, true), capMat);
  capMesh.position.y = 1.025;
  capMesh.renderOrder = 993;
  root.add(capMesh);

  const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 });
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.31, 20), ringMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.015;
  root.add(baseRing);

  if (view.showEntranceLabels !== false) {
    const label = createDebugLabelSprite(`Player Ref (${spot.label})`, '1.82m Human / 0.60m Capsule', '#38bdf8');
    label.position.set(0, 2.38, 0);
    root.add(label);
  }
  return root;
}

function rebuildDebugOverlay(debugGroup, view, buildingGroup) {
  if (!debugGroup) return;
  disposeObject(debugGroup, true);
  const showEntrances = Boolean(view.entranceDebug);
  const showFireEscape = Boolean(view.fireEscapeDebug);
  const showPlayerRef = Boolean(view.playerScaleRef);
  debugGroup.visible = showEntrances || showFireEscape || showPlayerRef;
  if (!debugGroup.visible || !buildingGroup) return;

  for (let i = 0; i < buildingGroup.children.length; i++) {
    const child = buildingGroup.children[i];
    const bp = child.userData?.blueprint || (child.userData?.settings ? generateBuildingBlueprint(child.userData.settings) : null);
    if (!bp) continue;
    const bldgDebug = worldRoot(debugGroup, child.position.x, child.position.y, child.position.z);
    bldgDebug.rotation.y = child.rotation.y;
    if (showEntrances) buildEntranceDebugGizmos(bldgDebug, bp, view);
    if (showFireEscape) buildFireEscapeDebugGizmos(bldgDebug, bp, view);
    if (showPlayerRef && i === 0) buildPlayerScaleReference(bldgDebug, bp, view);
  }
}

function addStreetlamp(parent, x, z, lighting = 'day') {
  const metal = solid('#41464a');
  cylinder(parent, x, 2.2, z, 0.1, 0.15, 4.4, metal, 7);
  line(parent, [x, 4.3, z], [x + 0.75, 4.3, z], 0.085, metal);
  const lamp = solid(lighting === 'night' ? '#fff2c4' : '#dde7db');
  box(parent, x + 0.75, 4.15, z, 0.36, 0.22, 0.44, lamp);
  if (lighting === 'night') {
    const light = new THREE.PointLight('#ffe0ab', 0.5, 8, 2);
    light.position.set(x + 0.75, 4.05, z);
    parent.add(light);
  }
}

function cityRoad(parent, central = false, depth = 11, lighting = 'day') {
  const roadway = solid('#343d43');
  const sidewalk = solid('#777b78');
  const white = solid('#d2cc9f');
  const roadZ = central ? 0 : Math.max(13, depth * 0.5 + 8);
  box(parent, 0, -0.21, roadZ, 210, 0.26, 12, roadway, { cast: false });
  box(parent, 0, -0.16, roadZ - 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
  box(parent, 0, -0.16, roadZ + 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
  for (let x = -100; x < 105; x += 9) box(parent, x, -0.062, roadZ, 4, 0.015, 0.18, white, { cast: false });
  for (let x = -65; x <= 65; x += 27) {
    addStreetlamp(parent, x, roadZ + 8.4, lighting);
    if (central) addStreetlamp(parent, x, roadZ - 8.4, lighting);
  }
  for (let x = -90; x < 91; x += 11) {
    box(parent, x, -0.1, roadZ + 5.85, 1.45, 0.028, 0.12, white, { cast: false });
    box(parent, x, -0.1, roadZ - 5.85, 1.45, 0.028, 0.12, white, { cast: false });
  }
}

function disposeObject(group, disposeMaterials = true) {
  if (!group) return;
  const geometries = new Set();
  const mats = new Set();
  const textures = new Set();
  group.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    if (obj.material) {
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) mats.add(mat);
    }
  });
  geometries.forEach((g) => g.dispose());
  if (disposeMaterials) {
    mats.forEach((m) => {
      if (m.map) textures.add(m.map);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
  }
  group.clear();
}

function rebuildEnvironment(environmentGroup, view, state) {
  if (!environmentGroup) return;
  disposeObject(environmentGroup, false);
  const plat = solid(view.environment === 'studio' ? '#40545d' : '#5d655b');
  if (view.environment !== 'none') {
    const extent = view.mode === 'single' ? 55 : 125;
    box(environmentGroup, 0, -0.41, 0, extent * 2, 0.38, extent * 2, plat, { cast: false });
    if (view.environment === 'street') {
      cityRoad(environmentGroup, view.mode === 'block', state.depth, view.lighting);
      const curb = solid('#8e928b');
      if (view.mode === 'single') {
        for (const s of [-1, 1]) box(environmentGroup, s * (state.width * 0.5 + 3), -0.06, state.depth * 0.5 + 2.5, 4, 0.12, 4, curb, { cast: false });
      }
    }
  }
  if (view.grid) {
    const size = view.mode === 'single' ? 65 : 130;
    const groundGrid = new THREE.GridHelper(size, Math.round(size / 2), 0x315663, 0x264451);
    groundGrid.position.y = -0.115;
    environmentGroup.add(groundGrid);
  }
}

const BLOCK_SIGN_TEXTS = [
  'CORNER MARKET', 'BAKERY & CAFE', 'APOTHECARY', 'HARDWARE CO.', 'BOOKSHOP',
  'DELI & GROCERY', 'CITY DINER', 'TAILOR & DRY CLEAN', 'ARCADE', 'PHARMACY',
  'BARBERSHOP', 'HARDWARE & TOOLS', 'TEA HOUSE', 'NEWSSTAND'
];

const AWNING_PALETTE = [
  '#8e3b3b', '#a14248', '#2f5d50', '#35546c', '#7a5230', '#5a3d5c', '#3d4f60', '#8c583a'
];

function createBlockVariant(baseCfg, side, n, totalOnSide = 5, locks = new Set()) {
  const seed = baseCfg.seed + side * 3001 + n * 4177;
  const r = rng32(seed);
  const cfg = { ...copy(baseCfg), seed, cutaway: false, inspectedFloor: 0, interiorMode: 'none' };
  const isEndLot = n === 0 || n === totalOnSide - 1;
  const isHero = side === 0 && n === Math.floor(totalOnSide / 2);

  if (isHero) return cfg;

  const canVary = (key) => !locks.has(key);

  if (canVary('width')) {
    const wDelta = Math.round(randBetween(r, -3.5, 4.0) * 2) * 0.5;
    cfg.width = clamp(baseCfg.width + wDelta, 7, 28);
  }
  if (canVary('depth')) {
    const dDelta = Math.round(randBetween(r, -2.5, 3.5) * 2) * 0.5;
    cfg.depth = clamp(baseCfg.depth + dDelta, 7, 26);
  }
  if (canVary('floors')) {
    cfg.floors = clamp(baseCfg.floors + randInt(r, -2, 3), 2, 14);
  }
  if (canVary('floorHeight')) {
    const fhDelta = Math.round(randBetween(r, -0.25, 0.3) * 10) / 10;
    cfg.floorHeight = clamp(Number((baseCfg.floorHeight + fhDelta).toFixed(1)), 2.8, 4.4);
  }
  if (canVary('footprint')) {
    const fpPool = isEndLot
      ? [baseCfg.footprint, 'corner', 'L', 'rectangle', 'corner']
      : [baseCfg.footprint, 'rectangle', 'L', 'U', 'rectangle', 'corner'];
    cfg.footprint = pick(r, fpPool);
  }
  if (canVary('extension')) {
    const extPool = [baseCfg.extension, 0, 0, 1, 1, 2, 3];
    cfg.extension = pick(r, extPool);
  }
  if (canVary('setback')) {
    if (cfg.floors >= 4 && r() < (baseCfg.setback > 0 ? 0.72 : 0.45)) {
      cfg.setback = pick(r, [0.5, 0.75, 1.0, 1.25, 1.5, 1.75]);
    } else {
      cfg.setback = 0;
    }
  }
  if (canVary('cornerCut')) {
    if (cfg.footprint === 'corner') {
      cfg.cornerCut = pick(r, [1.25, 1.5, 1.75, 2.0, 2.25]);
    } else if ((isEndLot && r() < 0.55) || r() < 0.28) {
      cfg.cornerCut = pick(r, [1.0, 1.25, 1.5, 1.75, 2.0]);
    } else {
      cfg.cornerCut = 0;
    }
  }

  if (canVary('roofType')) {
    const styleRoofPools = {
      brownstone: ['mansard', 'flat', 'stepped', 'pitched'],
      artdeco: ['stepped', 'flat', 'stepped'],
      modern: ['flat', 'stepped', 'flat'],
      commercial: ['flat', 'stepped', 'mansard'],
      brick: ['flat', 'stepped', 'mansard', 'pitched']
    };
    const pool = styleRoofPools[cfg.style] || ['flat', 'stepped', 'mansard', 'pitched'];
    cfg.roofType = r() < 0.45 ? baseCfg.roofType : pick(r, pool);
  }
  if (canVary('parapet')) {
    cfg.parapet = cfg.roofType === 'pitched' ? r() < 0.35 : r() < 0.82;
  }
  if (canVary('parapetHeight')) {
    cfg.parapetHeight = Number((0.3 + randInt(r, 0, 14) * 0.05).toFixed(2));
  }
  if (canVary('roofColor') && r() < 0.6) {
    cfg.roofColor = pick(r, [baseCfg.roofColor, '#343b43', '#3d3938', '#464d52', '#2f353b', '#4d443f']);
  }

  if (canVary('wallColor') && r() < 0.65) {
    cfg.wallColor = pick(r, [
      baseCfg.wallColor,
      baseCfg.secondaryWallColor,
      ...MATERIAL_CHOICES
    ]);
  }
  if (canVary('groundFloorMaterial') && r() < 0.45) {
    cfg.groundFloorMaterial = pick(r, ['stone', 'brick', 'concrete', 'painted']);
  }
  if (canVary('facadeAccent') && r() < 0.55) {
    cfg.facadeAccent = pick(r, [baseCfg.facadeAccent, 'cornice', 'ornate', 'vertical', 'none']);
  }
  if (canVary('trimAmount')) {
    cfg.trimAmount = clamp(Number((baseCfg.trimAmount + randBetween(r, -0.25, 0.25)).toFixed(2)), 0.1, 0.95);
  }
  if (canVary('windowStyle') && r() < 0.5) {
    cfg.windowStyle = pick(r, [baseCfg.windowStyle, 'sash', 'arched', 'tall', 'modern', 'square']);
  }
  if (canVary('windowsX')) {
    const idealCols = clamp(Math.round(cfg.width / 3.1) + randInt(r, -1, 1), 2, 7);
    cfg.windowsX = idealCols;
  }
  if (canVary('windowsSide')) {
    cfg.windowsSide = clamp(Math.round(cfg.depth / 3.4) + randInt(r, -1, 1), 2, 5);
  }
  if (canVary('windowLighting')) {
    cfg.windowLighting = clamp(baseCfg.windowLighting + randBetween(r, -0.12, 0.25), 0, 1);
  }
  if (canVary('shutters')) {
    cfg.shutters = r() < (baseCfg.shutters ? 0.65 : 0.28);
  }
  if (canVary('curtains')) {
    cfg.curtains = r() < (baseCfg.curtains ? 0.75 : 0.45);
  }

  if (canVary('groundUse')) {
    const groundPools = {
      brownstone: ['residential', 'residential', 'shop', 'lobby'],
      commercial: ['shop', 'shop', 'lobby', 'residential'],
      mixed: ['shop', 'residential', 'shop', 'lobby'],
      artdeco: ['lobby', 'shop', 'lobby', 'residential'],
      modern: ['lobby', 'shop', 'residential']
    };
    const gPool = groundPools[cfg.style] || [baseCfg.groundUse, 'residential', 'shop', 'lobby'];
    cfg.groundUse = pick(r, gPool);
  }
  if (canVary('doorStyle')) {
    const doorPool = cfg.groundUse === 'shop'
      ? ['double', 'single', 'double']
      : cfg.groundUse === 'lobby'
        ? ['double', 'stoop', 'single']
        : ['stoop', 'single', 'double', 'stoop'];
    cfg.doorStyle = pick(r, doorPool);
  }
  if (canVary('entranceSteps')) {
    if (cfg.groundUse === 'shop') {
      cfg.entranceSteps = 0;
    } else if (cfg.doorStyle === 'stoop') {
      cfg.entranceSteps = randInt(r, 2, 6);
    } else {
      cfg.entranceSteps = pick(r, [0, 0, 1, 2, 3, 4]);
    }
  }
  if (canVary('awning')) {
    const awningChance = cfg.groundUse === 'shop' ? 0.72 : (cfg.groundUse === 'lobby' ? 0.48 : 0.32);
    cfg.awning = r() < awningChance;
  }
  if (canVary('awningColor') && cfg.awning) {
    cfg.awningColor = pick(r, [baseCfg.awningColor, ...AWNING_PALETTE]);
  }
  if (canVary('signage')) {
    if (cfg.groundUse === 'shop') {
      cfg.signage = pick(r, ['shop', 'shop', 'marquee', 'none']);
    } else if (cfg.groundUse === 'lobby') {
      cfg.signage = pick(r, ['none', 'marquee', 'none']);
    } else {
      cfg.signage = r() < 0.15 ? 'marquee' : 'none';
    }
  }
  if (canVary('signText') && cfg.signage !== 'none') {
    cfg.signText = pick(r, [baseCfg.signText, ...BLOCK_SIGN_TEXTS]);
  }

  if (canVary('fireEscape')) {
    cfg.fireEscape = cfg.floors >= 3 && r() < (baseCfg.fireEscape ? 0.58 : 0.35);
  }
  if (canVary('balconies')) {
    cfg.balconies = r() < 0.45 ? pick(r, [0.15, 0.25, 0.4, 0.6]) : 0;
  }
  if (canVary('acUnits')) {
    cfg.acUnits = r() < (baseCfg.acUnits ? 0.68 : 0.38);
  }
  if (canVary('rooftopProps')) {
    cfg.rooftopProps = Number(randBetween(r, 0.15, 0.65).toFixed(2));
  }
  if (canVary('rooftopWaterTank')) {
    cfg.rooftopWaterTank = cfg.floors >= 4 && r() < (baseCfg.rooftopWaterTank ? 0.6 : 0.35);
  }
  if (canVary('skylights')) {
    cfg.skylights = r() < 0.35;
  }
  if (canVary('chimneys')) {
    cfg.chimneys = randInt(r, 0, 3);
  }
  if (canVary('antennas')) {
    cfg.antennas = r() < 0.55;
  }
  if (canVary('rooftopPipes')) {
    cfg.rooftopPipes = r() < 0.65;
  }

  return cfg;
}

function buildingAt(group, createBuilding, cfg, x, z, rotation, seedOffset) {
  const fresh = createBuilding({ ...cfg, seed: cfg.seed + seedOffset }, { seedOffset });
  fresh.position.set(x, 0, z);
  fresh.rotation.y = rotation;
  group.add(fresh);
  return fresh;
}

function resetCamera(camera, orbit, buildingGroup) {
  if (!camera || !buildingGroup) return null;
  const bbox = new THREE.Box3().setFromObject(buildingGroup);
  if (bbox.isEmpty()) return null;
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const dist = clamp(Math.max(size.x, size.z) * 1.4 + size.y * 0.5, 23, 135);
  camera.position.set(center.x + dist * 0.83, center.y + dist * 0.54, center.z + dist * 0.87);
  orbit.target.set(center.x, center.y * 0.83, center.z);
  camera.far = Math.max(300, dist * 5);
  camera.updateProjectionMatrix();
  orbit.update();
  return center;
}

async function snapshot(renderer, scene, camera, state, ready, toast) {
  if (!ready) {
    if (toast) toast('3D preview is not ready yet');
    return;
  }
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (blob) {
      fileDownload(blob, 'b-building-' + safeName(state) + '.png');
      if (toast) toast('Preview saved');
    }
  }, 'image/png');
}

function toggleTheatreMode(view, toast, onResize) {
  view.theatre = !view.theatre;
  const studio = $('#building-studio');
  const btn = $('#btn-theatre');
  const btnTop = $('#btn-theatre-quick');
  if (studio) studio.classList.toggle('theatre-mode', view.theatre);
  if (btn) {
    btn.classList.toggle('active', view.theatre);
    btn.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
  }
  if (btnTop) {
    btnTop.classList.toggle('active', view.theatre);
    btnTop.innerHTML = view.theatre
      ? '<i class="fas fa-columns"></i><span> Standard Layout</span>'
      : '<i class="fas fa-film"></i><span> Theatre</span>';
    btnTop.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
  }
  if (toast) toast(view.theatre ? 'Theatre mode on (T)' : 'Standard layout restored');
  if (onResize) {
    setTimeout(onResize, 40);
    setTimeout(onResize, 220);
  }
}

function isFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return !!(document.fullscreenElement || (frame && frame.classList.contains('is-fullscreen')));
}

function updateFullscreenUI(view, active, onResize) {
  view.fullscreen = active;
  const frame = $('.studio-viewport-frame');
  const btn = $('#btn-fullscreen');
  const btnTop = $('#btn-fullscreen-quick');
  if (frame) frame.classList.toggle('is-fullscreen', active);
  document.body.classList.toggle('studio-fullscreen-active', active);

  if (btn) {
    btn.classList.toggle('active', active);
    btn.innerHTML = active ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
    btn.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
    btn.setAttribute('aria-label', btn.title);
  }
  if (btnTop) {
    btnTop.classList.toggle('active', active);
    btnTop.innerHTML = active
      ? '<i class="fas fa-compress"></i><span> Exit Fullscreen</span>'
      : '<i class="fas fa-expand"></i><span> Fullscreen</span>';
    btnTop.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
  }
  if (onResize) {
    setTimeout(onResize, 40);
    setTimeout(onResize, 220);
  }
}

function enterFullscreenViewport(view, toast, onResize) {
  const frame = $('.studio-viewport-frame');
  updateFullscreenUI(view, true, onResize);
  if (frame && !document.fullscreenElement && frame.requestFullscreen) {
    frame.requestFullscreen().catch(() => {});
  }
  if (toast) toast('Full-Screen Mode active (Esc or F to exit)');
}

function exitFullscreenViewport(view, toast, onResize) {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  updateFullscreenUI(view, false, onResize);
  if (toast) toast('Exited Full-Screen Mode');
}

function toggleFullscreenViewport(view, toast, onResize) {
  if (isFullscreenActive()) {
    exitFullscreenViewport(view, toast, onResize);
  } else {
    enterFullscreenViewport(view, toast, onResize);
  }
}

function handleFullscreenChange(view, onResize) {
  const frame = $('.studio-viewport-frame');
  const isNowFull = !!document.fullscreenElement;
  if (isNowFull) {
    updateFullscreenUI(view, true, onResize);
  } else if (frame && frame.classList.contains('is-fullscreen')) {
    updateFullscreenUI(view, false, onResize);
  }
}

function handleStudioKeydown(e, actions = {}) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    if (actions.toggleFullscreen) actions.toggleFullscreen();
  } else if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    if (actions.toggleTheatre) actions.toggleTheatre();
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    if (actions.toggleEntranceDebug) actions.toggleEntranceDebug();
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (actions.snapshot) actions.snapshot();
  } else if (e.key === 'Escape') {
    if (isFullscreenActive() && actions.exitFullscreen) {
      actions.exitFullscreen();
    }
  }
}


function fileDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const safeName = (state) => String(state.style) + '-' + String(state.seed);

function exportBlueprint(state, options = {}) {
  const { customName, activeBlueprintName, activePreset, toast } = options;
  const bpName = customName || activeBlueprintName || (activePreset && PRESETS[activePreset]?.label) || `${getStyle(state.style).label} #${state.seed}`;
  const blueprint = generateBuildingBlueprint(state, { name: bpName });
  fileDownload(
    new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' }),
    'b-building-' + safeName(state) + '.building.json'
  );
  if (toast) toast('Building Blueprint (.building.json) exported');
  return blueprint;
}

function exportJSON(state, options = {}) {
  const { toast } = options;
  fileDownload(
    new Blob([JSON.stringify({ generator: 'B-3D-Building-Generator', version: 1, settings: state }, null, 2)], { type: 'application/json' }),
    'b-building-' + safeName(state) + '.json'
  );
  if (toast) toast('Building settings exported');
}

async function exportGLB(state, createBuilding, options = {}) {
  const { isReady, loadExporter, toast, setExportButtonDisabled } = options;
  if (!isReady) {
    if (toast) toast('The 3D generator is not ready');
    return;
  }
  if (setExportButtonDisabled) setExportButtonDisabled(true);
  try {
    if (loadExporter) await loadExporter();
    const group = createBuilding(state);
    group.userData = { preset: state.style, seed: state.seed, floors: state.floors };
    const exporter = new THREE.GLTFExporter();
    const data = await new Promise((resolve, reject) => {
      try {
        exporter.parse(group, resolve, { binary: true, onlyVisible: true, truncateDrawRange: true }, reject);
      } catch (e) {
        reject(e);
      }
    });
    fileDownload(new Blob([data], { type: 'model/gltf-binary' }), 'b-building-' + safeName(state) + '.glb');
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    if (toast) toast('Building model exported');
  } catch (error) {
    console.error('Building export failed', error);
    if (toast) toast('GLB export failed: ' + error.message);
  } finally {
    if (setExportButtonDisabled) setExportButtonDisabled(false);
  }
}

function applyImportedBuildingData(parsed, sourceLabel = 'Imported building', onLoadPreset) {
  const validation = validateBuildingBlueprint(parsed);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
  if (onLoadPreset) {
    onLoadPreset(validation.settings, validation.blueprint.name || sourceLabel, null, validation.blueprint.name || null);
  }
  return validation.blueprint;
}

async function handleFileImport(e, onLoadPreset, toast) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyImportedBuildingData(parsed, file.name, onLoadPreset);
  } catch (err) {
    if (toast) toast('Cannot import file: ' + err.message);
  }
  e.target.value = '';
}


function createInputControl(item, currentValue, options = {}) {
  const { maxFloors = 14 } = options;
  const key = item.key;
  let input;

  if (item.type === 'select') {
    input = document.createElement('select');
    for (const [val, title] of (OPTIONS[key] || [])) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = title;
      input.appendChild(opt);
    }
    input.value = String(currentValue);
  } else if (item.type === 'boolean') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(currentValue);
  } else if (item.type === 'color') {
    input = document.createElement('input');
    input.type = 'color';
    input.value = colorHex(currentValue);
  } else if (item.type === 'text') {
    input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 48;
    input.className = 'studio-textbox';
    input.style.width = '100%';
    input.value = String(currentValue ?? '');
  } else if (item.type === 'floor') {
    input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = maxFloors;
    input.step = 1;
    input.value = String(currentValue ?? 0);
  } else if (item.type === 'floorNumber') {
    input = document.createElement('input');
    input.type = 'range';
    input.min = 1;
    input.max = maxFloors;
    input.step = 1;
    input.value = String(currentValue || 1);
  } else {
    input = document.createElement('input');
    input.type = 'range';
    input.min = item.min;
    input.max = item.max;
    input.step = item.step || 1;
    input.value = String(currentValue);
  }

  input.id = 'control-' + key;
  input.dataset.key = key;
  return input;
}

function createLockButton(key, isLocked, onToggle) {
  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = 'studio-lock' + (isLocked ? ' locked' : '');
  lock.title = isLocked ? 'Unlock this setting' : 'Lock this setting during randomization';
  lock.setAttribute('aria-label', lock.title);
  lock.innerHTML = `<i class="fas fa-${isLocked ? 'lock' : 'lock-open'}"></i>`;
  lock.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle(key);
  });
  return lock;
}

function renderStandardFieldLayout(item, state, isLocked, input, onToggleLock) {
  const key = item.key;
  const wrap = document.createElement('div');
  wrap.className = 'studio-control-group studio-field';
  wrap.dataset.key = key;

  const head = document.createElement('div');
  head.className = 'studio-row-head';

  const label = document.createElement('label');
  label.htmlFor = 'control-' + key;
  label.textContent = item.name;

  const end = document.createElement('span');
  end.className = 'studio-row-end';

  let valueBadge = null;
  if (!item.type || ['floor', 'floorNumber'].includes(item.type)) {
    valueBadge = document.createElement('span');
    valueBadge.className = 'studio-field-value';
    const displayVal = (item.type === 'floor' && state[key] === 0) ? 'All' : state[key];
    valueBadge.textContent = displayVal + (item.unit || '');
    end.appendChild(valueBadge);
  }

  const lock = createLockButton(key, isLocked, onToggleLock);
  end.appendChild(lock);

  head.append(label, end);
  wrap.appendChild(head);
  wrap.appendChild(input);

  if (item.info) {
    const help = document.createElement('p');
    help.className = 'studio-help';
    help.textContent = item.info;
    wrap.appendChild(help);
  }

  return { wrap, valueBadge };
}

function renderInlineBooleanFieldLayout(item, state, isLocked, input, onToggleLock) {
  const key = item.key;
  const wrap = document.createElement('div');
  wrap.className = 'studio-control-group studio-field studio-field-inline';
  wrap.dataset.key = key;

  const row = document.createElement('div');
  row.className = 'studio-row-inline';

  const lock = createLockButton(key, isLocked, onToggleLock);

  const label = document.createElement('label');
  label.htmlFor = 'control-' + key;
  label.textContent = item.name;

  row.append(input, lock, label);
  wrap.appendChild(row);

  if (item.info) {
    const help = document.createElement('p');
    help.className = 'studio-help';
    help.textContent = item.info;
    wrap.appendChild(help);
  }

  return { wrap, valueBadge: null };
}

function renderFieldLayout(item, state, isLocked, input, onToggleLock, options = {}) {
  if (options.useInlineBooleans && item.type === 'boolean') {
    return renderInlineBooleanFieldLayout(item, state, isLocked, input, onToggleLock);
  }
  return renderStandardFieldLayout(item, state, isLocked, input, onToggleLock);
}

function applyDependentRules(key, value, state, locks, prevDefaults) {
  let needsRerender = false;

  if (['groundUse', 'doorStyle', 'entranceSteps', 'floorHeight'].includes(key)) {
    const nextDefaults = computeDefaultEntranceGameplay(state);
    if (!locks.has('triggerWidth') && Math.abs(state.triggerWidth - prevDefaults.triggerWidth) < 0.05) {
      state.triggerWidth = nextDefaults.triggerWidth;
    }
    if (!locks.has('triggerHeight') && Math.abs(state.triggerHeight - prevDefaults.triggerHeight) < 0.05) {
      state.triggerHeight = nextDefaults.triggerHeight;
    }
    if (!locks.has('triggerDepth') && Math.abs(state.triggerDepth - prevDefaults.triggerDepth) < 0.05) {
      state.triggerDepth = nextDefaults.triggerDepth;
    }
    if (key === 'groundUse') {
      if (!locks.has('entranceCategory') && state.entranceCategory === prevDefaults.entranceCategory) {
        state.entranceCategory = nextDefaults.entranceCategory;
      }
      if (!locks.has('interactionLabel') && state.interactionLabel === prevDefaults.interactionLabel) {
        state.interactionLabel = nextDefaults.interactionLabel;
      }
    }
  }

  if (key === 'floors') {
    state.inspectedFloor = clamp(state.inspectedFloor, 0, value);
    state.accentFloor = clamp(state.accentFloor, 1, value);
  }
  if (key === 'footprint' && value === 'corner' && state.cornerCut <= 0) {
    state.cornerCut = 1.5;
  }
  if (key === 'windowDamageStyle' && state.damage <= 0) {
    state.damage = 0.35;
    needsRerender = true;
  }
  if (key === 'signText' && state.signage === 'none' && String(value).trim().length > 0) {
    state.signage = state.groundUse === 'shop' ? 'shop' : 'marquee';
  }
  if (['roomsPerFloor', 'stairwell', 'elevator'].includes(key) && state.interiorMode === 'none') {
    state.interiorMode = key === 'roomsPerFloor' ? 'apartments' : 'basic';
    if (!state.cutaway && state.inspectedFloor === 0) state.cutaway = true;
    needsRerender = true;
  }

  if (['tallStaircase', 'fireEscape'].includes(key)) {
    needsRerender = true;
  }

  if (key === 'fireEscapeClearance') {
    if (value === 'one_way' || value === 'standard') {
      if (!locks.has('fireEscapeStairWidth')) state.fireEscapeStairWidth = 0.98;
      if (!locks.has('fireEscapeLandingDepth')) state.fireEscapeLandingDepth = 2.25;
      if (!locks.has('fireEscapeLadderClearance')) state.fireEscapeLadderClearance = 0;
      if (!locks.has('fireEscapeWallStandoff')) state.fireEscapeWallStandoff = 0;
    } else if (value === 'generous') {
      if (!locks.has('fireEscapeStairWidth')) state.fireEscapeStairWidth = 0.96;
      if (!locks.has('fireEscapeLandingDepth')) state.fireEscapeLandingDepth = 2.35;
      if (!locks.has('fireEscapeWallStandoff')) state.fireEscapeWallStandoff = 0;
    } else {
      if (!locks.has('fireEscapeStairWidth')) state.fireEscapeStairWidth = 0;
      if (!locks.has('fireEscapeLandingDepth')) state.fireEscapeLandingDepth = 0;
    }
    needsRerender = true;
  }

  if (key === 'accentFloor' || key === 'accentSide') {
    const prev = state.floorOverrides.find((o) => o.floor === (state.accentFloor || 1) && o.side === state.accentSide);
    if (prev) state.accentFloorColor = prev.color;
  }

  return needsRerender;
}

function updateTallStaircaseBanner(box, state) {
  if (!box) return;
  if (!state.tallStaircase) {
    box.style.display = 'none';
    return;
  }
  const groundSegs = segmentsForFloor(state, 0);
  const convPlacement = chooseFireEscapePlacement(groundSegs, state, rng32((state.seed || 1337) + 313));
  const layout = computeTallStaircaseLayout(groundSegs, state, convPlacement);

  box.style.display = 'block';
  box.style.marginTop = '8px';
  box.style.padding = '8px 10px';
  box.style.borderRadius = '6px';
  box.style.fontSize = '0.78rem';
  box.style.lineHeight = '1.4';

  if (!layout) {
    box.style.background = 'rgba(220, 140, 40, 0.14)';
    box.style.border = '1px solid rgba(220, 160, 50, 0.45)';
    box.style.color = '#ffd59a';
    box.textContent = 'Secondary Tall Exterior Staircase Notice: Requires at least 2 building floors.';
    return;
  }

  if (!layout.feasible) {
    box.style.background = 'rgba(215, 70, 60, 0.16)';
    box.style.border = '1px solid rgba(235, 95, 85, 0.5)';
    box.style.color = '#ffb5ad';
    box.textContent = `Secondary Tall Exterior Staircase Unavailable: ${layout.limitations.join(' ')}`;
    return;
  }

  box.style.background = 'rgba(70, 165, 110, 0.14)';
  box.style.border = '1px solid rgba(90, 200, 135, 0.42)';
  box.style.color = '#b8f0cd';
  box.textContent = `Secondary Tall Staircase Active: Placed on '${layout.side}' facade (${layout.flights.length} flight(s) up to Level ${layout.topSupportedFloor}, ${layout.availableWallSpan.toFixed(2)}m available vs ${layout.requiredWallSpan.toFixed(2)}m required).`;
}

function renderSpecializedActions(panel, key, activeTab, state, context) {
  const { view, toggleEntranceDebug, renderControls, scheduleRebuild, toast } = context;

  if (key === 'triggerDepth') {
    const bar = document.createElement('div');
    bar.className = 'studio-blueprint-bar';

    const autoFitBtn = document.createElement('button');
    autoFitBtn.type = 'button';
    autoFitBtn.className = 'studio-btn studio-btn-ghost';
    autoFitBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Auto-Fit Trigger to Door';
    autoFitBtn.onclick = () => {
      const def = computeDefaultEntranceGameplay(state);
      state.triggerWidth = def.triggerWidth;
      state.triggerHeight = def.triggerHeight;
      state.triggerDepth = def.triggerDepth;
      renderControls();
      scheduleRebuild();
      if (toast) toast('Trigger dimensions fitted to door & stoop geometry');
    };

    const debugBtn = document.createElement('button');
    debugBtn.type = 'button';
    debugBtn.className = 'studio-btn ' + (view.entranceDebug ? 'studio-btn-primary' : 'studio-btn-ghost');
    debugBtn.innerHTML = `<i class="fas fa-door-open"></i> ${view.entranceDebug ? 'Hide Entrance Debug' : 'Show Entrance Debug'}`;
    debugBtn.onclick = () => {
      toggleEntranceDebug();
      renderControls();
    };

    bar.append(autoFitBtn, debugBtn);
    panel.appendChild(bar);

    if (view.entranceDebug) {
      const subBar = document.createElement('div');
      subBar.className = 'studio-debug-subtoggles';
      subBar.style.display = 'grid';
      subBar.style.gridTemplateColumns = 'repeat(2, 1fr)';
      subBar.style.gap = '6px';
      subBar.style.marginTop = '8px';
      subBar.style.fontSize = '0.78rem';

      const toggles = [
        { label: 'Show Volumes', prop: 'showEntranceVolumes' },
        { label: 'Facing Arrows', prop: 'showEntranceDirections' },
        { label: 'Entrance Labels', prop: 'showEntranceLabels' },
        { label: 'Approach Points', prop: 'showEntranceApproach' }
      ];

      for (const t of toggles) {
        const lbl = document.createElement('label');
        lbl.style.display = 'flex';
        lbl.style.alignItems = 'center';
        lbl.style.gap = '5px';
        lbl.style.cursor = 'pointer';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = view[t.prop] !== false;
        chk.onchange = () => {
          view[t.prop] = chk.checked;
          scheduleRebuild();
        };
        lbl.append(chk, document.createTextNode(t.label));
        subBar.appendChild(lbl);
      }
      panel.appendChild(subBar);
    }
  }

  if (activeTab === 'features' && key === 'fireEscapeRoofAccess') {
    const bar = document.createElement('div');
    bar.className = 'studio-save-row';
    bar.style.marginTop = '10px';

    const feDebugBtn = document.createElement('button');
    feDebugBtn.type = 'button';
    feDebugBtn.className = 'studio-btn ' + (view.fireEscapeDebug ? 'studio-btn-primary' : 'studio-btn-ghost');
    feDebugBtn.innerHTML = `<i class="fas fa-route"></i> ${view.fireEscapeDebug ? 'Hide Traversal Debug' : 'Show Traversal Debug'}`;
    feDebugBtn.onclick = () => {
      view.fireEscapeDebug = !view.fireEscapeDebug;
      renderControls(panel, activeTab, state, locks, context);
      scheduleRebuild();
      if (toast) toast(view.fireEscapeDebug ? 'Fire escape traversal overlays shown' : 'Fire escape traversal overlays hidden');
    };
    bar.appendChild(feDebugBtn);
    panel.appendChild(bar);

    if (view.fireEscapeDebug) {
      const subBar = document.createElement('div');
      subBar.className = 'studio-debug-subtoggles';
      subBar.style.display = 'grid';
      subBar.style.gridTemplateColumns = 'repeat(2, 1fr)';
      subBar.style.gap = '6px';
      subBar.style.marginTop = '8px';
      subBar.style.fontSize = '0.78rem';

      const toggles = [
        { label: 'Walkable Landings', prop: 'showFireEscapeLandings' },
        { label: 'Clearance Volumes', prop: 'showFireEscapeClearance' },
        { label: 'Connected Route', prop: 'showFireEscapeRoute' },
        { label: 'Stair Treads', prop: 'showFireEscapeTreads' },
        { label: 'Stair Flights', prop: 'showFireEscapeStairs' },
        { label: 'Railing Boundaries', prop: 'showFireEscapeRailings' },
        { label: 'Ladder Volumes', prop: 'showFireEscapeLadders' }
      ];

      for (const t of toggles) {
        const lbl = document.createElement('label');
        lbl.style.display = 'flex';
        lbl.style.alignItems = 'center';
        lbl.style.gap = '5px';
        lbl.style.cursor = 'pointer';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = view[t.prop] !== false;
        chk.onchange = () => {
          view[t.prop] = chk.checked;
          scheduleRebuild();
        };
        lbl.append(chk, document.createTextNode(t.label));
        subBar.appendChild(lbl);
      }
      panel.appendChild(subBar);
    }
  }

  if (activeTab === 'features' && key === 'tallStaircaseRailing') {
    const statusBox = document.createElement('div');
    statusBox.id = 'tall-staircase-status';
    updateTallStaircaseBanner(statusBox, state);
    panel.appendChild(statusBox);
  }

  if (activeTab === 'interior' && key === 'accentFloorColor') {
    const actions = document.createElement('div');
    actions.className = 'studio-save-row';
    actions.style.marginTop = '12px';

    const apply = document.createElement('button');
    apply.className = 'studio-btn studio-btn-primary';
    apply.type = 'button';
    apply.textContent = 'Apply floor color';
    apply.onclick = () => {
      const floor = state.accentFloor || 1;
      const side = state.accentSide;
      colorHex(state.accentFloorColor);
      state.floorOverrides = state.floorOverrides.filter((o) => !(o.floor === floor && o.side === side));
      state.floorOverrides.push({ floor, side, color: state.accentFloorColor });
      scheduleRebuild();
      if (toast) toast('Floor color applied');
    };

    const clear = document.createElement('button');
    clear.className = 'studio-btn studio-btn-ghost';
    clear.type = 'button';
    clear.textContent = 'Clear this override';
    clear.onclick = () => {
      state.floorOverrides = state.floorOverrides.filter((o) => !(o.floor === (state.accentFloor || 1) && o.side === state.accentSide));
      scheduleRebuild();
      if (toast) toast('Floor override cleared');
    };

    actions.append(apply, clear);
    panel.appendChild(actions);

    const hint = document.createElement('p');
    hint.className = 'studio-help';
    hint.style.marginTop = '10px';
    hint.textContent = 'Choose a floor and wall, then apply its custom color. Use Cutaway or Inspect through floor to view rooms.';
    panel.appendChild(hint);
  }
}

function renderControls(panel, activeTab, state, locks, context = {}) {
  if (!panel) return;
  panel.innerHTML = '';
  const rows = SCHEMA[activeTab] || [];

  const onToggleLock = (k) => {
    if (locks.has(k)) locks.delete(k);
    else locks.add(k);
    renderControls(panel, activeTab, state, locks, context);
  };

  for (const item of rows) {
    if (item.group) {
      const group = document.createElement('div');
      group.className = 'studio-group-label';
      group.textContent = item.group;
      panel.appendChild(group);
      continue;
    }

    const key = item.key;
    const input = createInputControl(item, state[key], { maxFloors: state.floors });
    const { wrap, valueBadge } = renderFieldLayout(item, state, locks.has(key), input, onToggleLock, { useInlineBooleans: true });

    if (!state.tallStaircase && key.startsWith('tallStaircase') && key !== 'tallStaircase') {
      input.disabled = true;
      wrap.style.opacity = '0.52';
    }

    const eventName = ['color', 'text', 'select', 'boolean'].includes(item.type) ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      const prevDefaults = computeDefaultEntranceGameplay(state);
      const value = item.type === 'boolean'
        ? input.checked
        : (!item.type || item.type === 'floor' || item.type === 'floorNumber')
          ? Number(input.value)
          : input.value;
      state[key] = value;

      const needsRerender = applyDependentRules(key, value, state, locks, prevDefaults);

      if (valueBadge) {
        valueBadge.textContent = (item.type === 'floor' && value === 0 ? 'All' : value) + (item.unit || '');
      }

      if (context.onSettingChanged) {
        context.onSettingChanged(key, value);
      }

      if (needsRerender) {
        renderControls(panel, activeTab, state, locks, context);
      } else {
        const statusEl = panel.querySelector('#tall-staircase-status');
        if (statusEl) updateTallStaircaseBanner(statusEl, state);
      }

      if (['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) return;
      if (context.scheduleRebuild) context.scheduleRebuild();
    });

    if (['floors', 'footprint', 'groundUse', 'doorStyle', 'entranceSteps', 'accentFloor', 'accentSide', 'tallStaircaseSide', 'tallStaircaseLanding', 'tallStaircaseRailing', 'tallStaircaseFloors'].includes(key)) {
      input.addEventListener('change', () => renderControls(panel, activeTab, state, locks, context));
    }

    panel.appendChild(wrap);
    renderSpecializedActions(panel, key, activeTab, state, context);
  }
}

function updateStylePicker(currentStyle) {
  $$('#style-picker .style-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.style === currentStyle));
  const descriptor = getStyle(currentStyle);
  const nameEl = $('#active-style-name');
  if (nameEl) nameEl.textContent = descriptor.label;
  const labelEl = $('#scene-label');
  if (labelEl) {
    labelEl.textContent = `${String(STYLES.findIndex((x) => x.id === currentStyle) + 1).padStart(2, '0')} / ${descriptor.label.toUpperCase()}`;
  }
}

function renderStylePicker(container, currentStyle, onLoadPreset) {
  if (!container) return;
  container.innerHTML = '';
  for (const entry of STYLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'style-option';
    button.dataset.style = entry.id;
    button.innerHTML = `<i class="fas ${entry.icon}" aria-hidden="true"></i><span>${entry.label}</span>`;
    button.addEventListener('click', () => onLoadPreset(baseForStyle(entry.id), entry.label, entry.preset));
    container.appendChild(button);
  }
  updateStylePicker(currentStyle);
}

function updatePresetList(activePreset) {
  $$('#preset-list .preset-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.preset === activePreset));
}

function renderPresetList(container, activePreset, onLoadPreset) {
  if (!container) return;
  container.innerHTML = '';
  for (const entry of STYLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-item';
    button.dataset.preset = entry.preset;
    const icon = document.createElement('i');
    icon.className = 'fas ' + entry.icon;
    const label = document.createElement('span');
    label.textContent = PRESETS[entry.preset].label;
    button.append(icon, label);
    button.addEventListener('click', () => onLoadPreset(baseForStyle(entry.id), PRESETS[entry.preset].label, entry.preset));
    container.appendChild(button);
  }
  updatePresetList(activePreset);
}

function renderCustomPresets(container, savedPresets, onLoadCustom, onDeleteCustom) {
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(savedPresets);
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-help';
    empty.textContent = 'Save your custom buildings to reload them later.';
    container.appendChild(empty);
    return;
  }
  for (const [name, data] of entries) {
    const row = document.createElement('div');
    row.className = 'custom-preset-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-preset-btn';
    btn.textContent = name;
    btn.onclick = () => onLoadCustom(data, name);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'custom-preset-del';
    del.innerHTML = '&times;';
    del.title = 'Delete preset';
    del.onclick = (e) => {
      e.stopPropagation();
      onDeleteCustom(name);
    };
    row.append(btn, del);
    container.appendChild(row);
  }
}

const GAMEPLAY_ENTRANCE_KEYS = new Set([
  'entranceEnabled', 'entranceCategory', 'interactionDistance',
  'triggerWidth', 'triggerHeight', 'triggerDepth',
  'entranceLocked', 'interactionLabel'
]);

function randomizeSettings(category, state, locks, context = {}) {
  const all = category === 'all';
  const keys = all
    ? [...new Set([...CATEGORIES.form, ...CATEGORIES.facade, ...CATEGORIES.features, ...CATEGORIES.palette])]
    : (CATEGORIES[category] || []);
  const r = rng32(Math.floor(Math.random() * 0xffffffff));

  for (const key of keys) {
    if (locks.has(key) || GAMEPLAY_ENTRANCE_KEYS.has(key) || key === 'tallStaircase') continue;
    const def = Object.values(SCHEMA).flat().find((x) => x.key === key);
    if (!def) continue;

    if (def.type === 'color') {
      state[key] = pick(r, key === 'wallColor' || key === 'groundFloorColor' ? MATERIAL_CHOICES : COLOR_CHOICES);
    } else if (def.type === 'select') {
      if (['wallMaterial', 'groundFloorMaterial', 'footprint', 'roofType', 'windowStyle', 'windowDamageStyle', 'facadeAccent', 'groundUse', 'signage', 'doorStyle'].includes(key)) {
        state[key] = pick(r, OPTIONS[key])[0];
      }
    } else if (def.type === 'boolean') {
      state[key] = r() > 0.55;
    } else if (def.type === 'text' || def.type === 'floor' || def.type === 'floorNumber') {
      continue;
    } else if (typeof def.min === 'number') {
      const steps = Math.round((def.max - def.min) / def.step);
      state[key] = Number((def.min + randInt(r, 0, steps) * def.step).toFixed(3));
    }
  }

  const autoEntrance = computeDefaultEntranceGameplay(state);
  for (const [k, v] of Object.entries(autoEntrance)) {
    if (!locks.has(k)) state[k] = v;
  }

  state.seed = Math.floor(Math.random() * 99999998) + 1;
  state.inspectedFloor = clamp(state.inspectedFloor, 0, state.floors);
  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = state.seed;

  if (context.onResetActivePreset) context.onResetActivePreset();
  if (context.renderControlsUI) context.renderControlsUI();
  if (context.scheduleRebuild) context.scheduleRebuild();
  if (context.toast) context.toast(`Randomized ${all ? 'unlocked settings' : category}`);
}


// Studio State
let state = { ...copy(BASE), ...copy(PRESETS.paragon_brick) };
Object.assign(state, computeDefaultEntranceGameplay(state));
delete state.label;

let activeBlueprintName = null;
let locks = new Set();
let activeTab = 'form';
let activePreset = 'paragon_brick';
let savedPresets = {};
const view = {
  mode: 'single',
  lighting: 'day',
  environment: 'street',
  grid: true,
  autoRotate: false,
  wireframe: false,
  entranceDebug: false,
  playerScaleRef: false,
  playerRefSpot: 'front_door',
  theatre: false,
  fullscreen: false
};

let scene, camera, renderer, orbit, buildingGroup, environmentGroup, debugGroup, hemi, sun, ambient, groundGrid;
let lastCameraTarget = null;
let refocusAfterBuild = false;
let buildStats = { buildings: 1, triangles: 0 };
let renderScheduled = false;
let ready = false;

function toast(message) {
  const container = $('#studio-toasts');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'studio-toast';
  item.textContent = message;
  container.appendChild(item);
  setTimeout(() => item.remove(), 3300);
}

function loadPreset(data, name, id = null, bpName = null) {
  state = sanitisePreset(data);
  activePreset = id;
  activeBlueprintName = bpName;
  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = String(state.seed);
  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderStudioControls();
  if (ready) {
    refocusAfterBuild = true;
    scheduleRebuild();
  }
  toast('Loaded ' + name);
}

function renderStudioControls() {
  const panel = $('#tab-content');
  renderControls(panel, activeTab, state, locks, {
    view,
    toggleEntranceDebug,
    renderControls: renderStudioControls,
    scheduleRebuild,
    toast,
    onSettingChanged: (key, value) => {
      if (key === 'windowLightingTime') {
        view.lighting = value;
        updateLighting();
      }
      if (!['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) {
        activePreset = null;
        updatePresetList(activePreset);
      }
    }
  });
}

function randomize(category) {
  randomizeSettings(category, state, locks, {
    onResetActivePreset: () => {
      activePreset = null;
      activeBlueprintName = null;
      updatePresetList(activePreset);
      refocusAfterBuild = true;
    },
    renderControlsUI: () => renderStudioControls(),
    scheduleRebuild: () => scheduleRebuild(),
    toast: (msg) => toast(msg)
  });
}

function saveCustom() {
  const input = $('#custom-name');
  const name = input ? input.value.trim() : '';
  if (!name) {
    toast('Give this building a name first');
    return;
  }
  savedPresets[name] = copy(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
  } catch {
    toast('Storage unavailable - use JSON export instead');
    return;
  }
  if (input) input.value = '';
  renderCustomPresetsList();
  toast('Saved ' + name);
}

function renderCustomPresetsList() {
  const panel = $('#custom-presets');
  renderCustomPresets(
    panel,
    savedPresets,
    (presetData, name) => loadPreset(presetData, name),
    (name) => {
      delete savedPresets[name];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
      } catch {}
      renderCustomPresetsList();
    }
  );
}

function setEntranceDebug(active) {
  view.entranceDebug = Boolean(active);
  $('#btn-entrance-debug')?.classList.toggle('active', view.entranceDebug);
  const chk = $('#entrance-debug-toggle');
  if (chk) chk.checked = view.entranceDebug;
  if (activeTab === 'features' || activeTab === 'entrances') renderStudioControls();
  if (ready) {
    rebuildDebugOverlay(debugGroup, view, buildingGroup);
  }
  toast(view.entranceDebug ? 'Entrance debug gizmos enabled (E)' : 'Entrance debug gizmos hidden');
}

function toggleEntranceDebug() {
  setEntranceDebug(!view.entranceDebug);
}

function setPlayerScaleRef(active, spotId = null) {
  view.playerScaleRef = Boolean(active);
  if (spotId) view.playerRefSpot = spotId;
  $('#btn-player-ref')?.classList.toggle('active', view.playerScaleRef);
  const chk = $('#player-ref-toggle');
  if (chk) chk.checked = view.playerScaleRef;
  const sel = $('#player-ref-spot');
  if (sel && view.playerRefSpot) sel.value = view.playerRefSpot;
  if (ready) {
    rebuildDebugOverlay(debugGroup, view, buildingGroup);
  }
  toast(view.playerScaleRef ? `Player Scale Reference shown (${view.playerRefSpot})` : 'Player Scale Reference hidden');
}

function syncPlayerRefSpotOptions(blueprint) {
  const sel = $('#player-ref-spot');
  if (!sel || !blueprint) return;
  const spots = computePlayerReferenceSpots(blueprint);
  const validIds = new Set(spots.map((s) => s.id));
  for (const opt of sel.options) {
    opt.disabled = !validIds.has(opt.value);
  }
  if (!validIds.has(view.playerRefSpot) && spots[0]) {
    view.playerRefSpot = spots[0].id;
    sel.value = spots[0].id;
  }
}

function setPlayerRefSpot(spotId) {
  if (!spotId) return;
  view.playerRefSpot = spotId;
  const sel = $('#player-ref-spot');
  if (sel) sel.value = spotId;
  if (!view.playerScaleRef) {
    setPlayerScaleRef(true, spotId);
    return;
  }
  if (ready) {
    rebuildDebugOverlay(debugGroup, view, buildingGroup);
  }
}

function togglePlayerScaleRef() {
  setPlayerScaleRef(!view.playerScaleRef);
}

function scheduleRebuild() {
  if (!ready || renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    rebuild();
  });
}

function rebuild() {
  if (!ready) return;
  const wasMode = buildStats.mode;
  disposeObject(buildingGroup);
  disposeObject(environmentGroup);
  clearMaterialCache();
  const mode = view.mode;
  let count = 1;

  if (mode === 'single') {
    buildingAt(buildingGroup, createBuilding, state, 0, 0, 0, 0);
  } else if (mode === 'compare') {
    for (let i = -1; i <= 1; i++) {
      const cfg = { ...copy(state), seed: state.seed + (i + 1) * 7919 };
      cfg.width = clamp(state.width + (i === 0 ? 0 : i * 1.1), 6, 32);
      cfg.floors = clamp(state.floors + (i === 0 ? 0 : i), 1, 14);
      cfg.inspectedFloor = 0;
      buildingAt(buildingGroup, createBuilding, cfg, i * Math.max(26, state.width + 7), 0, 0, i + 1);
    }
    count = 3;
  } else {
    const perSide = 5;
    const sidewalkLineZ = 11.4;
    for (let side = 0; side < 2; side++) {
      const rowConfigs = [];
      const effWidths = [];
      for (let n = 0; n < perSide; n++) {
        const cfg = createBlockVariant(state, side, n, perSide, locks);
        const extW = cfg.width * ((cfg.extension >= 2 ? 0.24 : 0) + (cfg.extension >= 3 ? 0.24 : 0));
        rowConfigs.push(cfg);
        effWidths.push(cfg.width + extW);
      }

      const gap = 3.6;
      const totalSpan = effWidths.reduce((acc, w) => acc + w, 0) + gap * (perSide - 1);
      let cursorX = -totalSpan * 0.5;

      for (let n = 0; n < perSide; n++) {
        const cfg = rowConfigs[n];
        const wEff = effWidths[n];
        const xCenter = cursorX + wEff * 0.5;
        cursorX += wEff + gap;

        const zCenter = side === 0
          ? -(sidewalkLineZ + cfg.depth * 0.5)
          : (sidewalkLineZ + cfg.depth * 0.5);
        const rotY = side === 0 ? 0 : Math.PI;
        buildingAt(buildingGroup, createBuilding, cfg, xCenter, zCenter, rotY, side * perSide + n);
      }
    }
    count = 10;
  }

  buildStats = { mode, buildings: count };
  rebuildEnvironment(environmentGroup, view, state);
  syncPlayerRefSpotOptions(buildingGroup.children[0]?.userData?.blueprint);
  rebuildDebugOverlay(debugGroup, view, buildingGroup);

  buildingGroup.traverse((obj) => {
    if (obj.isMesh && obj.material) obj.material.wireframe = view.wireframe;
  });

  const bldgStat = $('#stat-buildings');
  if (bldgStat) bldgStat.textContent = count;
  const floorsStat = $('#stat-floors');
  if (floorsStat) floorsStat.textContent = state.floors;

  let triangles = 0;
  buildingGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      triangles += obj.geometry.index ? obj.geometry.index.count / 3 : obj.geometry.attributes.position.count / 3;
    }
  });
  const triStat = $('#stat-triangles');
  if (triStat) triStat.textContent = Math.round(triangles).toLocaleString('en-US');

  const statusEl = $('#render-status');
  if (statusEl) {
    statusEl.textContent = mode === 'block' ? 'NEIGHBORHOOD VIEW' : mode === 'compare' ? 'THREE VARIATIONS' : 'LIVE MODEL';
  }

  if (wasMode !== mode || !lastCameraTarget || refocusAfterBuild) {
    lastCameraTarget = resetCamera(camera, orbit, buildingGroup);
    refocusAfterBuild = false;
  }
  $('#studio-loading')?.classList.add('hidden');
}

function resizeRenderer() {
  if (!renderer) return;
  const area = $('#building-stage');
  if (!area) return;
  const w = Math.max(1, area.clientWidth);
  const h = Math.max(1, area.clientHeight);
  const size = new THREE.Vector2();
  renderer.getSize(size);
  if (size.x !== w || size.y !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function updateLighting() {
  if (!scene) return;
  const mode = view.lighting;
  setMaterialLightingMode(mode);
  if (mode === 'day') {
    scene.background.set('#0e2230');
    scene.fog.color.set('#0e2230');
    hemi.intensity = 0.95;
    ambient.intensity = 0.36;
    sun.intensity = 1.3;
    sun.color.set('#fff1d1');
    sun.position.set(28, 45, 20);
  } else if (mode === 'golden_hour') {
    scene.background.set('#2c1e28');
    scene.fog.color.set('#2c1e28');
    hemi.intensity = 0.75;
    ambient.intensity = 0.35;
    sun.intensity = 1.1;
    sun.color.set('#ff9e4a');
    sun.position.set(38, 16, 10);
  } else if (mode === 'evening') {
    scene.background.set('#211d2d');
    scene.fog.color.set('#211d2d');
    hemi.intensity = 0.55;
    ambient.intensity = 0.32;
    sun.intensity = 0.95;
    sun.color.set('#ffc78b');
    sun.position.set(29, 17, -14);
  } else if (mode === 'morning') {
    scene.background.set('#1a2638');
    scene.fog.color.set('#1a2638');
    hemi.intensity = 0.82;
    ambient.intensity = 0.34;
    sun.intensity = 1.15;
    sun.color.set('#ffe1b3');
    sun.position.set(25, 30, -22);
  } else if (mode === 'late_night') {
    scene.background.set('#040711');
    scene.fog.color.set('#040711');
    hemi.intensity = 0.22;
    ambient.intensity = 0.12;
    sun.intensity = 0.18;
    sun.color.set('#7888b5');
    sun.position.set(-15, 20, 10);
  } else {
    scene.background.set('#080f22');
    scene.fog.color.set('#080f22');
    hemi.intensity = 0.32;
    ambient.intensity = 0.2;
    sun.intensity = 0.35;
    sun.color.set('#9ca9ec');
    sun.position.set(-17, 25, 12);
  }
}

function initScene() {
  const canvas = $('#building-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#0c1b29', 1);

  if (renderer.capabilities?.getMaxAnisotropy) {
    setMaterialMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1b29');
  scene.fog = new THREE.Fog('#0c1b29', 70, 155);

  camera = new THREE.PerspectiveCamera(47, 1, 0.1, 500);
  camera.position.set(28, 20, 30);

  orbit = new THREE.OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.07;
  orbit.minDistance = 8;
  orbit.maxDistance = 160;
  orbit.maxPolarAngle = Math.PI * 0.49;
  orbit.target.set(0, 8, 0);

  buildingGroup = worldRoot(scene);
  environmentGroup = worldRoot(scene);
  debugGroup = worldRoot(scene);
  debugGroup.name = 'EntranceDebugOverlay';

  hemi = new THREE.HemisphereLight('#d6ecff', '#27302e', 0.85);
  scene.add(hemi);
  ambient = new THREE.AmbientLight('#ffffff', 0.4);
  scene.add(ambient);
  sun = new THREE.DirectionalLight('#ffe3b5', 1.25);
  sun.position.set(28, 46, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 190;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  updateLighting();

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(resizeRenderer);
    const stage = $('#building-stage');
    if (stage) observer.observe(stage);
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  ready = true;
  rebuild();

  function tick() {
    requestAnimationFrame(tick);
    if (!renderer || !scene) return;
    orbit.autoRotate = view.autoRotate;
    orbit.autoRotateSpeed = 0.45;
    orbit.update();
    renderer.render(scene, camera);
  }
  tick();
}

function handleKeyDownEvent(e) {
  handleStudioKeydown(e, {
    toggleFullscreen: () => toggleFullscreenViewport(view, toast, resizeRenderer),
    toggleTheatre: () => toggleTheatreMode(view, toast, resizeRenderer),
    toggleEntranceDebug,
    snapshot: () => snapshot(renderer, scene, camera, state, ready, toast),
    exitFullscreen: () => exitFullscreenViewport(view, toast, resizeRenderer)
  });
}

function handleFullscreenChangeEvent() {
  handleFullscreenChange(view, resizeRenderer);
}

function initUI() {
  renderStylePicker($('#style-picker'), state.style, (presetData, name, id) => loadPreset(presetData, name, id));
  renderPresetList($('#preset-list'), activePreset, (presetData, name, id) => loadPreset(presetData, name, id));
  renderStudioControls();

  $$('.studio-tab').forEach((btn) => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    $$('.studio-tab').forEach((t) => {
      const on = t === btn;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    renderStudioControls();
  }));

  const seedInput = $('#seed-input');
  if (seedInput) {
    seedInput.value = String(state.seed);
    seedInput.addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number(seedInput.value) || 1337), 1, 99999999);
      seedInput.value = state.seed;
      activePreset = null;
      updatePresetList(activePreset);
      scheduleRebuild();
    });
  }

  const btnNewSeed = $('#btn-new-seed');
  if (btnNewSeed) {
    btnNewSeed.onclick = () => {
      state.seed = Math.floor(Math.random() * 99999998) + 1;
      if (seedInput) seedInput.value = state.seed;
      activePreset = null;
      updatePresetList(activePreset);
      scheduleRebuild();
      toast('New seed: ' + state.seed);
    };
  }

  const btnRandomAll = $('#btn-random-all');
  if (btnRandomAll) {
    btnRandomAll.onclick = () => randomize('all');
  }

  $$('[data-random]').forEach((b) => b.addEventListener('click', () => randomize(b.dataset.random)));

  $$('.view-mode').forEach((b) => b.addEventListener('click', () => {
    view.mode = b.dataset.mode;
    $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn === b));
    scheduleRebuild();
  }));

  $('#btn-reset-camera')?.addEventListener('click', () => {
    if (ready) resetCamera(camera, orbit, buildingGroup);
  });

  $('#btn-rotate')?.addEventListener('click', () => {
    view.autoRotate = !view.autoRotate;
    if (orbit) orbit.autoRotate = view.autoRotate;
    $('#btn-rotate')?.classList.toggle('active', view.autoRotate);
    toast(view.autoRotate ? 'Turntable on' : 'Turntable off');
  });

  $('#btn-wireframe')?.addEventListener('click', () => {
    view.wireframe = !view.wireframe;
    $('#btn-wireframe')?.classList.toggle('active', view.wireframe);
    scheduleRebuild();
  });

  $('#btn-entrance-debug')?.addEventListener('click', toggleEntranceDebug);
  $('#entrance-debug-toggle')?.addEventListener('change', (e) => {
    setEntranceDebug(Boolean(e.target.checked));
  });
  $('#btn-player-ref')?.addEventListener('click', togglePlayerScaleRef);
  $('#player-ref-toggle')?.addEventListener('change', (e) => {
    setPlayerScaleRef(Boolean(e.target.checked));
  });
  $('#player-ref-spot')?.addEventListener('change', (e) => {
    setPlayerRefSpot(e.target.value);
  });

  $('#lighting-select')?.addEventListener('change', (e) => {
    view.lighting = e.target.value;
    updateLighting();
    scheduleRebuild();
  });

  $('#environment-select')?.addEventListener('change', (e) => {
    view.environment = e.target.value;
    rebuildEnvironment(environmentGroup, view, state);
  });

  $('#ground-grid')?.addEventListener('change', (e) => {
    view.grid = e.target.checked;
    rebuildEnvironment(environmentGroup, view, state);
  });

  $('#btn-save-custom')?.addEventListener('click', saveCustom);

  const doExportBlueprint = () => {
    const customName = $('#custom-name')?.value?.trim();
    exportBlueprint(state, {
      customName,
      activeBlueprintName,
      activePreset,
      toast
    });
  };
  $('#btn-export-blueprint')?.addEventListener('click', doExportBlueprint);
  $('#btn-export-blueprint-top')?.addEventListener('click', doExportBlueprint);

  const doExportJSON = () => exportJSON(state, { toast });
  $('#btn-export-json')?.addEventListener('click', doExportJSON);

  $('#btn-import-json')?.addEventListener('click', () => $('#file-import')?.click());
  $('#file-import')?.addEventListener('change', (e) => {
    handleFileImport(e, (settings, name, presetId, bpName) => {
      loadPreset(settings, name, presetId, bpName);
    }, toast);
  });

  const doExportGLB = () => exportGLB(state, createBuilding, {
    isReady: ready,
    loadExporter,
    toast,
    setExportButtonDisabled: (disabled) => {
      const btn1 = $('#btn-export-glb');
      const btn2 = $('#btn-export-glb-side');
      if (btn1) btn1.disabled = disabled;
      if (btn2) btn2.disabled = disabled;
    }
  });
  $('#btn-export-glb')?.addEventListener('click', doExportGLB);
  $('#btn-export-glb-side')?.addEventListener('click', doExportGLB);

  const doSnapshot = () => snapshot(renderer, scene, camera, state, ready, toast);
  $('#btn-screenshot')?.addEventListener('click', doSnapshot);
  $('#btn-screenshot-side')?.addEventListener('click', doSnapshot);
  $('#btn-stage-snapshot')?.addEventListener('click', doSnapshot);

  $('#btn-theatre')?.addEventListener('click', () => toggleTheatreMode(view, toast, resizeRenderer));
  $('#btn-theatre-quick')?.addEventListener('click', () => toggleTheatreMode(view, toast, resizeRenderer));
  $('#btn-fullscreen')?.addEventListener('click', () => toggleFullscreenViewport(view, toast, resizeRenderer));
  $('#btn-fullscreen-quick')?.addEventListener('click', () => toggleFullscreenViewport(view, toast, resizeRenderer));

  window.addEventListener('keydown', handleKeyDownEvent);
  document.addEventListener('fullscreenchange', handleFullscreenChangeEvent);

  try {
    savedPresets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    savedPresets = {};
  }
  renderCustomPresetsList();
}

function loadScript(url, check, timeout = 14000) {
  if (check()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    let done = false;
    const timer = setTimeout(() => finish(new Error('Timed out loading ' + url)), timeout);
    function finish(error) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    }
    script.onload = () => (check() ? finish() : finish(new Error('Library loaded but expected feature is missing')));
    script.onerror = () => finish(new Error('Unable to load ' + url));
    document.head.appendChild(script);
  });
}

async function loadOneOf(urls, check) {
  if (check()) return;
  let lastError = null;
  for (const url of urls) {
    try {
      await loadScript(url, check);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Missing 3D dependency');
}

async function loadDependencies() {
  await loadOneOf([
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ], () => !!window.THREE?.WebGLRenderer);
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
  ], () => !!window.THREE?.OrbitControls);
}

async function loadExporter() {
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
    'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js'
  ], () => !!window.THREE?.GLTFExporter);
}

function showLoadError(error) {
  console.error('Unable to start B Building Generator', error);
  const screen = $('#studio-loading');
  if (!screen) return;
  screen.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = '3D preview unavailable';
  const body = document.createElement('span');
  body.textContent = 'The Three.js library could not be loaded. Check your connection and reload this page.';
  const detail = document.createElement('span');
  detail.textContent = error.message;
  screen.append(title, body, detail);
  const statusEl = $('#render-status');
  if (statusEl) statusEl.textContent = 'LIBRARY ERROR';
}

window.BBuildingBlueprint = {
  SCHEMA_VERSION: BLUEPRINT_SCHEMA_VERSION,
  GENERATOR_META: copy(GENERATOR_META),
  computeDefaultEntranceGameplay,
  computePrimaryEntranceLayout,
  computeCornerEntranceLayout,
  computeBuildingEntrances,
  computePlayerReferenceSpots,
  computeBuildingBounds,
  generateBuildingBlueprint,
  validateBuildingBlueprint,
  applyImportedBuildingData: (parsed, sourceLabel = 'Imported building') => {
    return applyImportedBuildingData(parsed, sourceLabel, (settings, name, presetId, bpName) => {
      loadPreset(settings, name, presetId, bpName);
    });
  },
  segmentsForFloor,
  computeFireEscapeFlights,
  createBuilding
};

if (typeof document !== 'undefined') {
  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
}


})();
