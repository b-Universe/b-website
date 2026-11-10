import { clamp } from '../utils.js';

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
