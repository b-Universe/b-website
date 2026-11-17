import { box, line, worldRoot } from './primitives.js';
import { solid } from './materials.js';
import { computeTallStaircaseLayout } from '../core/tall-staircase.js';

function addTallSlopedRail(parent, p1, p2, thickness, mat) {
  line(parent, p1, p2, thickness, mat);
}

function addTallBracket(parent, xPos, yDeckTop, deckT, zWalkMin, zWalkMax, mat, heavy = false) {
  const beamH = heavy ? 0.11 : 0.085;
  const beamW = heavy ? 0.08 : 0.065;
  const beamY = yDeckTop - deckT - beamH * 0.5;
  const beamSpan = zWalkMax + 0.08;
  box(parent, xPos, beamY, beamSpan * 0.5 - 0.01, beamW, beamH, beamSpan + 0.02, mat);
  // Wall mounting plate at facade surface (z=0.015)
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
  // Steel threshold apron at landing elevation
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

export function addTallStaircaseGeometry(parent, groundSegments, cfg, conventionalPlacement = null) {
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

  // Street-level concrete approach plinth when starting at ground level
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

  // Elevated landings + structural wall brackets + doorway thresholds
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

    // Wall brackets at both landing ends
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
      // Enclose left end of elevated F1 landing (drop opening sits at outer end)
      box(tallGroup, loc.xMin, loc.yTop + railHeight * 0.5, zPathCenter, 0.05, 0.05, stairWidth + 0.06, steel);
      box(tallGroup, loc.xMin, loc.yTop + railHeight, zPathCenter, 0.05, 0.05, stairWidth + 0.06, steel);
    }
    if (landing.floor === maxLandingFloor) {
      box(tallGroup, loc.xMax, loc.yTop + railHeight, zPathCenter, 0.05, 0.05, stairWidth + 0.08, steel);
      box(tallGroup, loc.xMax, loc.yTop + railHeight * 0.5, zPathCenter, 0.04, 0.04, stairWidth + 0.08, steel);
      box(tallGroup, loc.xMax, loc.yTop + railHeight * 0.5, zPathCenter, 0.045, railHeight, 0.045, steel);
    }
  }

  // Continuous 1-unit stair flights + inclined steel stringers + handrails
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

  // Optional elevated F1 drop ladder
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

  // Optional rooftop parapet gooseneck ladder aligned to Fk landing
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
