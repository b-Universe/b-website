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

  const pickFromSpan = (targetSeg, side, s, e, extIndex = -1) => {
    const avail = e - s;
    const long = side === 'front' || side === 'back';
    const totalLength = long ? targetSeg.w : targetSeg.d;
    const desiredCols = long ? cfg.windowsX : cfg.windowsSide;
    const shutterPad = cfg.shutters ? 0.62 : 0.34;
    const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
    const maxFit = Math.max(1, Math.floor(avail / (cfg.windowWidth + shutterPad)));
    const windowCount = Math.max(1, Math.min(proportional, maxFit));
    const spacing = avail / windowCount;

    const colIdx = side === 'front'
      ? windowCount - 1
      : Math.min(windowCount - 1, Math.floor(r() * windowCount));
    const deckW = clamp(spacing * 0.95, 1.8, Math.min(2.55, avail - 0.08));
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


function computeDefaultEntranceGameplay(cfg) {
  const groundUse = cfg.groundUse || 'residential';
  const doorStyle = cfg.doorStyle || 'stoop';
  const floorHeight = Number(cfg.floorHeight) || 3.3;
  const rawSteps = Number.isFinite(Number(cfg.entranceSteps)) ? Number(cfg.entranceSteps) : 3;
  const wideDoor = doorStyle === 'double' || groundUse === 'lobby' || groundUse === 'shop';
  const doorWidth = wideDoor ? 2.5 : 1.55;
  const doorHeight = floorHeight * 0.68;
  const steps = groundUse === 'shop' ? 0 : (doorStyle === 'stoop' ? Math.max(1, rawSteps) : rawSteps);
  const stepH = 0.14;
  const stepD = 0.34;
  const landingD = doorStyle === 'stoop' ? 0.95 : 0.65;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor ? 3.2 : 2.4;

  const triggerWidth = Number(clamp(Math.max(doorWidth + 0.85, steps > 0 ? stoopW : 2.4), 1.0, 8.0).toFixed(1));
  const triggerHeight = Number(clamp(Math.max(2.4, doorHeight + totalRise + 0.35), 1.8, 6.0).toFixed(1));
  const triggerDepth = Number(clamp(Math.max(1.8, totalStepDepth + 1.35), 1.0, 8.0).toFixed(1));

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
  const doorWidth = wideDoor ? 2.5 : 1.55;
  const doorHeight = cfg.floorHeight * 0.68;
  const steps = cfg.groundUse === 'shop' ? 0 : (cfg.doorStyle === 'stoop' ? Math.max(1, cfg.entranceSteps) : cfg.entranceSteps);
  const stepH = 0.14;
  const stepD = 0.34;
  const landingD = cfg.doorStyle === 'stoop' ? 0.95 : 0.65;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor ? 3.2 : 2.4;
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
  const doorWidth = 1.55;
  const doorHeight = cfg.floorHeight * 0.68;
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

function buildEntranceDefinition(layout, cfg, meta) {
  const autoDefaults = computeDefaultEntranceGameplay(cfg);
  const enabled = typeof cfg.entranceEnabled === 'boolean' ? cfg.entranceEnabled : autoDefaults.entranceEnabled;
  const category = OPTIONS.entranceCategory.some((x) => x[0] === cfg.entranceCategory)
    ? cfg.entranceCategory
    : autoDefaults.entranceCategory;
  const interactive = Boolean(enabled && category !== 'decorative');
  const decorative = !interactive;
  const lockedByDefault = typeof cfg.entranceLocked === 'boolean' ? cfg.entranceLocked : autoDefaults.entranceLocked;
  const interactionLabel = String(cfg.interactionLabel ?? autoDefaults.interactionLabel).trim() || autoDefaults.interactionLabel;
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

  const anchorX = roundNum(layout.cx, 4);
  const anchorY = roundNum(layout.totalRise, 4);
  const anchorZ = roundNum(layout.wallZ, 4);
  const nx = roundNum(layout.normal.x, 4);
  const ny = roundNum(layout.normal.y, 4);
  const nz = roundNum(layout.normal.z, 4);
  const rotY = roundNum(layout.rotY, 4);
  const degreesY = roundNum((layout.rotY * 180) / Math.PI, 2);

  const doorWidth = roundNum(layout.doorWidth, 3);
  const doorHeight = roundNum(layout.doorHeight, 3);
  const thresholdElevation = roundNum(layout.totalRise, 4);

  // Trigger center offset
  const offsetForward = roundNum(trigD * 0.5 - 0.25, 4);
  const offsetUp = roundNum(trigH * 0.5 - thresholdElevation, 4);
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
    y: 0,
    z: roundNum(anchorZ + layout.normal.z * approachDist, 4)
  };
  const safePosition = {
    x: roundNum(anchorX + layout.normal.x * safeDist, 4),
    y: 0,
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

  const effectiveDoorStyle = isCorner ? 'single' : cfg.doorStyle;

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

  return entrances;
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
  accentFloor: 0, accentSide: 'front', accentFloorColor: '#b58867', floorOverrides: []
};

const CONFIG_KEYS = Object.keys(BASE).filter((k) => k !== 'floorOverrides');

const PRESETS = {
  paragon_brick: { label: 'Paragon Brick', style: 'brick', seed: 1337, wallColor: '#a64a40', floors: 5, width: 13, depth: 11, curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: true, rooftopPipes: true },
  kings_row: { label: "King's Row Brownstone", style: 'brownstone', seed: 4612, width: 9, depth: 14, floors: 4, floorHeight: 3.4, roofType: 'mansard', wallColor: '#946d55', secondaryWallColor: '#6e5344', groundFloorColor: '#8b776b', roofColor: '#4a4040', wallMaterial: 'brick', trimAmount: 0.85, facadeAccent: 'ornate', windowsX: 3, windowsSide: 3, windowStyle: 'arched', windowFrameColor: '#e2c5a7', curtains: true, shutters: true, doorStyle: 'stoop', entranceSteps: 5, fireEscape: false, acUnits: false, balconies: 0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 2, rooftopProps: 0.2 },
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
  accentSide: [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['all', 'All walls']]
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
  features: [
    { group: 'ENTRANCES & STREET' },
    { key: 'groundUse', name: 'Ground-floor use', type: 'select' },
    { key: 'doorStyle', name: 'Entrance style', type: 'select' },
    { key: 'doorColor', name: 'Door color', type: 'color' },
    { key: 'entranceSteps', name: 'Entrance steps', min: 0, max: 6, step: 1 },
    { key: 'awning', name: 'Shop / door awning', type: 'boolean' },
    { key: 'awningColor', name: 'Awning color', type: 'color' },
    { key: 'signage', name: 'Sign type', type: 'select' },
    { key: 'signText', name: 'Sign lettering', type: 'text' },
    { key: 'signColor', name: 'Sign color', type: 'color' },
    { group: 'GAMEPLAY / ENTRANCES' },
    { key: 'entranceEnabled', name: 'Enable interactive entrance', type: 'boolean', info: 'When disabled or set to Decorative, the entrance remains visually rendered but non-interactive in blueprints.' },
    { key: 'entranceCategory', name: 'Entrance category', type: 'select' },
    { key: 'interactionLabel', name: 'Interaction label', type: 'text' },
    { key: 'entranceLocked', name: 'Locked by default', type: 'boolean' },
    { key: 'interactionDistance', name: 'Interaction distance', min: 1.0, max: 8.0, step: 0.25, unit: 'm' },
    { key: 'triggerWidth', name: 'Trigger width', min: 1.0, max: 8.0, step: 0.1, unit: 'm' },
    { key: 'triggerHeight', name: 'Trigger height', min: 1.8, max: 6.0, step: 0.1, unit: 'm' },
    { key: 'triggerDepth', name: 'Trigger depth', min: 1.0, max: 8.0, step: 0.1, unit: 'm' },
    { group: 'EXTERIOR DETAILS' },
    { key: 'balconies', name: 'Balcony frequency', min: 0, max: 1, step: 0.1 },
    { key: 'acUnits', name: 'Window A/C units', type: 'boolean' },
    { key: 'fireEscape', name: 'Exterior fire escape', type: 'boolean' },
    { key: 'rooftopProps', name: 'Rooftop equipment', min: 0, max: 1, step: 0.1 },
    { key: 'rooftopWaterTank', name: 'Rooftop water tank', type: 'boolean' },
    { key: 'rooftopPipes', name: 'Exposed pipes & cables', type: 'boolean' },
    { key: 'skylights', name: 'Rooftop skylights', type: 'boolean' },
    { key: 'chimneys', name: 'Chimneys', min: 0, max: 5, step: 1 },
    { key: 'antennas', name: 'Rooftop antenna', type: 'boolean' },
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
  const totalHeightWithRoof = roundNum(wallHeight + roofExtra, 3);

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

  const groundSegments = segmentsForFloor(blueprintSettings, 0);
  const bounds = computeBuildingBounds(blueprintSettings);
  const entrances = computeBuildingEntrances(blueprintSettings, groundSegments);
  const firePlacement = chooseFireEscapePlacement(groundSegments, blueprintSettings, rng32(blueprintSettings.seed + 313));

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

function glassMaterial(hex, lit = false) {
  const isDay = currentLightingMode === 'day';
  const key = 'glass:' + hex + ':' + lit + ':' + isDay;
  if (!materials.has(key)) {
    const color = new THREE.Color(hex);
    if (lit) color.lerp(new THREE.Color('#ffda88'), isDay ? 0.58 : 0.85);
    materials.set(key, new THREE.MeshPhongMaterial({
      color,
      emissive: lit ? (isDay ? '#8f6f38' : '#c79e54') : '#050b10',
      emissiveIntensity: lit ? (isDay ? 0.42 : 0.72) : 0.08,
      shininess: 90,
      specular: '#3d4f58'
    }));
  }
  return materials.get(key);
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
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
  group.rotation.y = rotMap[side] || 0;

  const damageMode = options.damageMode || 'none';
  const frame = solid(cfg.windowFrameColor);
  const lit = damageMode === 'none' && cfg.windowLighting > 0 && (cfg.windowLighting >= 0.99 || r() < cfg.windowLighting);
  const glass = glassMaterial(cfg.glassColor, lit);
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
    box(group, 0, rectY, 0.034, w, rectH, 0.044, glass, { cast: false });
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

  const w = wide ? 2.5 : 1.55;
  const h = cfg.floorHeight * 0.68;
  const trim = solid(cfg.trimColor);
  const doorMat = wide ? glassMaterial(cfg.glassColor, cfg.windowLighting > 0.25) : solid(cfg.doorColor);

  // Door frame and trim
  const jambT = 0.17;
  box(group, -w * 0.5 - jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
  box(group, w * 0.5 + jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
  box(group, 0, h + jambT * 0.5, 0.06, w + jambT * 2, jambT, 0.14, trim);
  box(group, 0, h * 0.5, 0.038, w, h, 0.065, doorMat);
  if (wide) {
    box(group, 0, h * 0.5, 0.075, 0.06, h, 0.04, trim);
  }
  box(group, wide ? 0.16 : w * 0.32, h * 0.46, 0.088, 0.08, 0.16, 0.06, solid('#d5b66c'));
  box(group, 0, h + jambT + 0.08, 0.09, w + 0.56, 0.18, 0.22, trim);

  if (cfg.doorStyle === 'stoop') {
    for (const dir of [-1, 1]) {
      box(group, dir * (w * 0.5 + 0.24), h * 0.5, 0.14, 0.18, h + 0.16, 0.26, trim);
    }
    box(group, 0, h + 0.26, 0.22, w + 0.82, 0.22, 0.48, trim);
  }
  return group;
}

function wallForSide(group, seg, index, side, cfg, r, cutaway, seed, firePlacement = null) {
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
      addWindow(group, side, x, wy, z, cfg, r, ww, wh, {
        maxW: spacing * 0.88,
        damageMode,
        hasAC
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

function addFireEscape(parent, seg, placement, cfg) {
  if (!placement || cfg.floors < 2) return;
  const { side, coord, deckW, extIndex = -1 } = placement;
  const steel = solid('#3a4347');
  const deckD = 1.22;
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

  const segForFloor = (flIdx) => {
    const flSegs = segmentsForFloor(cfg, flIdx);
    if (extIndex >= 0) {
      const ext = flSegs.find((s) => s.isExtension && s.extIndex === extIndex);
      if (ext) return ext;
    }
    return flSegs[0] || seg;
  };

  const wallAnchorForFloor = (flIdx) => getFireEscapeWallAnchor(segForFloor(flIdx), side, coord, deckW);

  // Convert world (wx, wz) to local (lx, lz)
  const toLocalXZ = (anchor, wx, wz) => {
    const dx = wx - anchor.x;
    const dz = wz - anchor.z;
    if (side === 'front') return { x: dx, z: dz };
    if (side === 'back') return { x: -dx, z: -dz };
    if (side === 'left') return { x: dz, z: -dx };
    return { x: -dz, z: dx };
  };

  const zInner = 0.44;
  const zOuter = 0.86;
  const stairHW = 0.18; // Half-width of stair in Z (0.36m width)
  const stairTreadD = 0.36;

  const xSpan = deckW * 0.34;
  const halfDeckW = deckW * 0.5;
  const deckT = 0.08;

  const anchors = [];
  for (let f = 0; f < cfg.floors; f++) {
    anchors.push(wallAnchorForFloor(f));
  }

  const flightLanes = [];
  for (let i = 1; i < cfg.floors - 1; i++) {
    const anchorBelow = anchors[i - 1];
    const anchorAbove = anchors[i];
    const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
    const stepBackZ = Math.max(0, stepOffset.z);

    let lane = i % 2 === 1 ? zOuter : zInner;
    if (i > 1) {
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
      // Lowest landing
      box(group, centerDeckX, y, zCenter, fullDeckW, deckT, totalDeckD, steel);
    } else {
      const prevDir = (i - 1) % 2 === 1 ? 1 : -1;
      const prevLaneZ = stepBackZ + flightLanes[i - 1];
      const xArrive = shiftX + prevDir * xSpan;

      const openLen = Math.min(xSpan * 1.6, 1.25);
      const xOpen1 = Math.min(xArrive, xArrive - prevDir * openLen);
      const xOpen2 = Math.max(xArrive, xArrive - prevDir * openLen);

      const zOpenMin = prevLaneZ - stairHW - 0.03;
      const zOpenMax = prevLaneZ + stairHW + 0.03;

      if (zOpenMin > 0.04) {
        box(group, centerDeckX, y, zOpenMin * 0.5, fullDeckW, deckT, zOpenMin, steel);
      }

      const outerD = totalDeckD - zOpenMax;
      if (outerD > 0.03) {
        box(group, centerDeckX, y, zOpenMax + outerD * 0.5, fullDeckW, deckT, outerD, steel);
      }

      const openSpanD = zOpenMax - zOpenMin;
      if (maxDeckX - xOpen2 > 0.03) {
        const wRight = maxDeckX - xOpen2;
        box(group, xOpen2 + wRight * 0.5, y, zOpenMin + openSpanD * 0.5, wRight, deckT, openSpanD, steel);
      }
      if (xOpen1 - minDeckX > 0.03) {
        const wLeft = xOpen1 - minDeckX;
        box(group, minDeckX + wLeft * 0.5, y, zOpenMin + openSpanD * 0.5, wLeft, deckT, openSpanD, steel);
      }

      const frameT = 0.035;
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMin, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMax, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      const backX = prevDir === 1 ? xOpen1 : xOpen2;
      box(group, backX, y, (zOpenMin + zOpenMax) * 0.5, frameT, deckT + 0.02, openSpanD, steel);

      const departLaneZ = i < cfg.floors - 1 ? flightLanes[i] : -1;
      const railClearOfDepart = departLaneZ < 0 || Math.abs(zOpenMin - departLaneZ) > stairHW + 0.06;
      if (railClearOfDepart) {
        const openRailY = y + 0.88;
        const openRailZ = zOpenMin;
        line(group, [xOpen1, openRailY, openRailZ], [xOpen2, openRailY, openRailZ], 0.03, steel);
        line(group, [backX, openRailY, zOpenMin], [backX, openRailY, zOpenMax], 0.03, steel);
        const railPosts = 4;
        for (let p = 0; p <= railPosts; p++) {
          const rx = xOpen1 + (p / railPosts) * (xOpen2 - xOpen1);
          line(group, [rx, y + 0.04, openRailZ], [rx, openRailY, openRailZ], 0.024, steel);
        }
      }
    }

    for (const dx of [shiftX - deckW * 0.42, shiftX + deckW * 0.42]) {
      line(group, [dx, y - 0.58, stepBackZ + 0.02], [dx, y - 0.03, totalDeckD - 0.12], 0.04, steel);
    }

    const railY = y + 0.88;
    box(group, centerDeckX, railY, totalDeckD - 0.04, fullDeckW, 0.06, 0.06, steel);
    box(group, minDeckX + 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);
    box(group, maxDeckX - 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);

    const frontBalusters = Math.max(6, Math.round(fullDeckW * 2.5));
    for (let j = 0; j < frontBalusters; j++) {
      const bx = minDeckX + 0.04 + (j / (frontBalusters - 1)) * (fullDeckW - 0.08);
      box(group, bx, y + 0.46, totalDeckD - 0.04, 0.04, 0.82, 0.04, steel);
    }
    const sideBalusters = Math.max(2, Math.round(totalDeckD * 1.8));
    for (const sx of [minDeckX + 0.03, maxDeckX - 0.03]) {
      for (let k = 1; k <= sideBalusters; k++) {
        box(group, sx, y + 0.46, (k / (sideBalusters + 1)) * totalDeckD, 0.04, 0.82, 0.04, steel);
      }
    }

    if (i < cfg.floors - 1) {
      const nextY = (i + 1) * cfg.floorHeight + 0.12;
      const dir = i % 2 === 1 ? 1 : -1;
      const laneZ = flightLanes[i];
      const xStart = -dir * xSpan;
      const xEnd = dir * xSpan;

      for (const dz of [-stairHW, stairHW]) {
        line(group, [xStart, y, laneZ + dz], [xEnd, nextY, laneZ + dz], 0.042, steel);
        line(group, [xStart, y + 0.82, laneZ + dz], [xEnd, nextY + 0.82, laneZ + dz], 0.032, steel);
      }

      const steps = 9;
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps;
        const sx = xStart + (xEnd - xStart) * frac;
        const sy = y + cfg.floorHeight * frac;
        box(group, sx, sy, laneZ, 0.24, 0.045, stairTreadD, steel);
      }
    }

    if (i === 1) {
      const lx = maxDeckX + 0.18;
      const lz = stepBackZ + deckD * 0.55;
      const botY = 0.45;
      const topY = y + 1.05;
      box(group, maxDeckX + 0.09, y, lz, 0.18, 0.06, 0.38, steel);
      for (const dz of [-0.16, 0.16]) {
        line(group, [lx, botY, lz + dz], [lx, topY, lz + dz], 0.03, steel);
      }
      const rungs = Math.max(4, Math.floor((topY - botY) / 0.32));
      for (let rIdx = 0; rIdx <= rungs; rIdx++) {
        const ry = botY + (rIdx / rungs) * (topY - botY - 0.15);
        box(group, lx, ry, lz, 0.04, 0.035, 0.32, steel);
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
    const railH = 0.78;
    for (const dx of [-stoopW * 0.5 + 0.09, stoopW * 0.5 - 0.09]) {
      const rx = cx + dx;
      box(parent, rx, (totalRise + railH) * 0.5, wallZ + landingD * 0.5, 0.14, totalRise + railH, landingD, stairMat);
      box(parent, rx, (stepH + railH) * 0.5, wallZ + totalDepth - 0.1, 0.16, stepH + railH, 0.2, stairMat);
      line(parent, [rx, totalRise + railH, wallZ + landingD - 0.06], [rx, stepH + railH, wallZ + totalDepth - 0.1], 0.045, railMat);
    }
  }

  if (cfg.groundUse === 'shop') {
    const doorHalfW = (wideDoor ? 2.5 : 1.55) * 0.5 + 0.45;
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
    const canopyW = Math.min(usableW * 0.55, wideDoor ? 3.8 : 2.9);
    addAwning(parent, cx, wallZ, canopyW, cfg.floorHeight + totalRise * 0.6, cfg, true);
  }

  if (cfg.signage !== 'none') {
    const signY = cfg.awning ? cfg.floorHeight * 0.94 : cfg.floorHeight * 0.86;
    const sign = worldRoot(parent, cx, signY, wallZ + 0.08);
    signboard(sign, cfg.signText, Math.min(usableW * 0.68, 9.5), 0.62, cfg.signage === 'marquee' ? '#302b2b' : '#40322d', cfg.signColor);
  }

  if (cfg.groundUse !== 'shop') {
    const doorHalf = (wideDoor ? 2.5 : 1.55) * 0.5;
    const plaque = worldRoot(parent, cx - doorHalf - 0.55, totalRise + 1.45, wallZ + 0.06);
    signboard(plaque, String((cfg.seed % 900) + 100), 0.54, 0.32, '#323437', '#ead6ac');
    for (const s of [-1, 1]) {
      box(parent, cx + s * (doorHalf + 0.28), totalRise + 1.65, wallZ + 0.08, 0.1, 0.36, 0.12, solid('#d8ad70'));
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

  if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const x = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
    const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
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
    const x = randBetween(r, b.minX, b.maxX);
    const z = randBetween(r, b.minZ, b.maxZ);
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
    const x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
    const z = randBetween(r, b.minZ, b.maxZ);
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


function createBuilding(cfg, options = {}) {
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
      for (const side of ['front', 'back', 'left', 'right']) {
        wallForSide(root, seg, floor, side, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17, segFire);
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
  }
  if (firePlacement) {
    addFireEscape(root, primary, firePlacement, cfg);
  }

  if (roofOn) {
    const topSegments = segmentsForFloor(cfg, count - 1).filter((s) => !s.isExtension);
    for (let j = 0; j < topSegments.length; j++) {
      addRoof(root, topSegments[j], count * fh, cfg, r, j);
    }
    addRooftopProps(root, topSegments, primary, cfg, r, count * fh);
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


function createDebugLabelSprite(text, borderHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(7, 19, 30, 0.88)';
    ctx.fillRect(6, 6, 500, 100);
    ctx.lineWidth = 5;
    ctx.strokeStyle = borderHex;
    ctx.strokeRect(6, 6, 500, 100);
    ctx.fillStyle = '#e9fbff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text).slice(0, 32), 256, 56);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 0.75, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function buildEntranceDebugGizmos(parent, blueprint) {
  if (!blueprint || !Array.isArray(blueprint.entrances)) return;
  for (const ent of blueprint.entrances) {
    const gizmoRoot = worldRoot(parent);
    gizmoRoot.name = 'EntranceDebug_' + ent.id;

    const isInteractive = Boolean(ent.interactive);
    const isLocked = Boolean(ent.lockedByDefault);
    const primaryHex = !isInteractive ? '#94a3b8' : (isLocked ? '#ffbe0b' : '#00f5d4');
    const anchorHex = '#ff4d6d';
    const normalHex = '#00bbf9';
    const approachHex = '#38b000';
    const safeHex = '#80ed99';

    // Trigger box
    const trig = ent.trigger;
    const trigGroup = worldRoot(gizmoRoot, trig.localCenter.x, trig.localCenter.y, trig.localCenter.z);
    trigGroup.rotation.y = ent.door.rotation.y;

    const boxGeo = new THREE.BoxGeometry(trig.width, trig.height, trig.depth);
    const boxMat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: isInteractive ? 0.20 : 0.10,
      depthWrite: false
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.renderOrder = 990;
    trigGroup.add(boxMesh);

    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: 0.9
    });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    edgesMesh.renderOrder = 991;
    trigGroup.add(edgesMesh);

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
    const arrowLen = 1.45;
    const arrowY = anchorPos.y + 0.45;
    const nx = ent.door.normal.x;
    const nz = ent.door.normal.z;
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

    // Approach and safe position markers
    const appPos = ent.navigation.approachPosition;
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

    // Approach path link
    const linkMat = new THREE.MeshBasicMaterial({ color: normalHex, transparent: true, opacity: 0.55 });
    line(
      gizmoRoot,
      [anchorPos.x + nx * 0.1, anchorPos.y + 0.05, anchorPos.z + nz * 0.1],
      [appPos.x, appPos.y + 0.05, appPos.z],
      0.025,
      linkMat
    );

    // Entrance label
    const statusTag = !isInteractive
      ? 'DECORATIVE'
      : isLocked
        ? `${ent.category.toUpperCase()} • LOCKED`
        : ent.category.toUpperCase();
    const sprite = createDebugLabelSprite(`${ent.id} [${statusTag}]`, primaryHex);
    sprite.position.set(
      anchorPos.x + nx * 0.35,
      anchorPos.y + ent.door.height + 0.85,
      anchorPos.z + nz * 0.35
    );
    gizmoRoot.add(sprite);
  }
}

function rebuildDebugOverlay(debugGroup, view, buildingGroup) {
  if (!debugGroup) return;
  disposeObject(debugGroup, true);
  debugGroup.visible = Boolean(view.entranceDebug);
  if (!view.entranceDebug || !buildingGroup) return;

  for (const child of buildingGroup.children) {
    const bp = child.userData?.blueprint || (child.userData?.settings ? generateBuildingBlueprint(child.userData.settings) : null);
    if (!bp) continue;
    const bldgDebug = worldRoot(debugGroup, child.position.x, child.position.y, child.position.z);
    bldgDebug.rotation.y = child.rotation.y;
    buildEntranceDebugGizmos(bldgDebug, bp);
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

  if (key === 'accentFloor' || key === 'accentSide') {
    const prev = state.floorOverrides.find((o) => o.floor === (state.accentFloor || 1) && o.side === state.accentSide);
    if (prev) state.accentFloorColor = prev.color;
  }

  return needsRerender;
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
    const { wrap, valueBadge } = renderFieldLayout(item, state, locks.has(key), input, onToggleLock);

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
      }

      if (['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) return;
      if (context.scheduleRebuild) context.scheduleRebuild();
    });

    if (['floors', 'footprint', 'groundUse', 'doorStyle', 'entranceSteps', 'accentFloor', 'accentSide'].includes(key)) {
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
    if (locks.has(key) || GAMEPLAY_ENTRANCE_KEYS.has(key)) continue;
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
    onSettingChanged: (key) => {
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
  if (activeTab === 'features') renderStudioControls();
  if (ready) {
    rebuildDebugOverlay(debugGroup, view, buildingGroup);
  }
  toast(view.entranceDebug ? 'Entrance debug gizmos enabled (E)' : 'Entrance debug gizmos hidden');
}

function toggleEntranceDebug() {
  setEntranceDebug(!view.entranceDebug);
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
  } else if (mode === 'evening') {
    scene.background.set('#211d2d');
    scene.fog.color.set('#211d2d');
    hemi.intensity = 0.55;
    ambient.intensity = 0.32;
    sun.intensity = 0.95;
    sun.color.set('#ffc78b');
    sun.position.set(29, 17, -14);
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
  computeBuildingBounds,
  generateBuildingBlueprint,
  validateBuildingBlueprint,
  applyImportedBuildingData: (parsed, sourceLabel = 'Imported building') => {
    return applyImportedBuildingData(parsed, sourceLabel, (settings, name, presetId, bpName) => {
      loadPreset(settings, name, presetId, bpName);
    });
  },
  segmentsForFloor,
  createBuilding
};

if (typeof document !== 'undefined') {
  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
}


})();
