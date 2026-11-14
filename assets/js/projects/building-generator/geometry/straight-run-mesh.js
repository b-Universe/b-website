import { box, cylinder, line, sagCable, worldRoot } from './primitives.js';
import { solid } from './materials.js';
import { computeStraightRunFireEscape } from '../core/straight-run-fire-escape.js';
import { computeDeterministicRooftopLayout } from '../core/rooftop-layout.js';

export function addStraightRunFireEscapeGeometry(parent, groundSegments, placement, cfg) {
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

  // Landings & underlying wall support brackets
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

  // Vertical railing segments along landings and stepped barrier visual rails
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

  // Straight-run stair flights, individual ~1 B unit treads, sloped stringers & handrails
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

  // Unobstructed front drop ladder (exact match to fe_ladder_drop)
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

  // Roof access gooseneck ladder reaching parapet top (exact match to fe_ladder_roof)
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

export function addDeterministicRooftopGeometry(group, topSegments, groundMain, cfg) {
  const layout = computeDeterministicRooftopLayout(cfg, topSegments, groundMain);
  if (!topSegments.length) return layout;

  const roof = solid('#697277');
  const roofDark = solid('#363d40');
  const metal = solid('#858d8e');
  const pipeMat = solid('#5b6468');
  const cableMat = solid('#1d2225');

  // Rooftop stairwell headhouse
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

  // Rooftop water tank
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

  // Chimneys
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

  // HVAC units
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

  // Exhaust vents
  for (const vent of layout.exhaustVents) {
    const lower = cylinder(group, vent.x, vent.baseY + 0.13, vent.z, vent.radius, vent.radius, 0.26, metal, 8);
    if (lower) {
      lower.name = vent.id;
      lower.userData = { rooftopColliderId: vent.id };
    }
    const upper = cylinder(group, vent.x, vent.baseY + 0.38, vent.z, 0.18, 0.18, 0.32, roofDark, 8);
    if (upper) upper.userData = { rooftopColliderId: vent.id };
  }

  // Industrial ventilation fans
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

  // Roof access hatch
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

  // Decorative antenna, thin pipes, and cables (explicitly excluded from colliders)
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
